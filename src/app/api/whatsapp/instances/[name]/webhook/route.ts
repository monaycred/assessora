import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/whatsapp/instances/[name]/webhook — configura webhook na Evolution
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const supabase = createAdminClient();

    // Busca credenciais da instância
    const { data: inst, error: dbErr } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("instance_name", name)
      .single();

    if (dbErr || !inst) {
      return NextResponse.json({ ok: false, erro: "Instância não encontrada" }, { status: 404 });
    }

    const apiUrl = inst.api_url || process.env.EVOLUTION_API_URL || "";
    const apiKey = inst.api_key || process.env.EVOLUTION_API_KEY || "";
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/evolution`;

    if (!apiUrl) {
      return NextResponse.json({ ok: false, erro: "URL da API não configurada nesta instância" }, { status: 400 });
    }

    // Configura webhook na Evolution API
    const res = await fetch(`${apiUrl}/webhook/set/${name}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          base64: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "CONNECTION_UPDATE",
          ],
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[API] Erro ao configurar webhook Evolution:", errText);
      return NextResponse.json({
        ok: false,
        erro: `Evolution retornou ${res.status}: ${errText.slice(0, 200)}`,
      });
    }

    // Salva webhook_url e atualiza status no DB
    await supabase
      .from("whatsapp_instances")
      .update({
        webhook_url: webhookUrl,
        status_conexao: "online",
        config_json: { ...(inst.config_json || {}), webhook_configurado: true },
      })
      .eq("instance_name", name);

    return NextResponse.json({ ok: true, webhook_url: webhookUrl });
  } catch (error: any) {
    console.error("[API] Erro ao configurar webhook:", error);
    return NextResponse.json({ ok: false, erro: error.message || "Erro interno" }, { status: 500 });
  }
}
