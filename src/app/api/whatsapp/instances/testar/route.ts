import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/whatsapp/instances/testar
// Body: { id } OU { provider, api_url, api_key, instance_name }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let apiUrl: string;
    let apiKey: string;
    let instanceName: string;

    if (body.id) {
      // Testa instância já cadastrada — busca credenciais do DB
      const supabase = createAdminClient();
      const { data: inst, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("id", body.id)
        .single();

      if (error || !inst) {
        return NextResponse.json({ ok: false, erro: "Instância não encontrada" });
      }

      apiUrl = inst.api_url || process.env.EVOLUTION_API_URL || "";
      apiKey = inst.api_key || process.env.EVOLUTION_API_KEY || "";
      instanceName = inst.instance_name;
    } else {
      // Testa com dados do formulário (antes de salvar)
      apiUrl = body.api_url || process.env.EVOLUTION_API_URL || "";
      apiKey = body.api_key || process.env.EVOLUTION_API_KEY || "";
      instanceName = body.instance_name || "";
    }

    if (!apiUrl || !instanceName) {
      return NextResponse.json({ ok: false, erro: "URL da API e instance name são obrigatórios" });
    }

    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    // Tenta connectionState primeiro
    try {
      const r1 = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, { headers });
      if (r1.ok) {
        const d1 = await r1.json();
        const state = d1?.instance?.state || d1?.state || "unknown";
        const numero = d1?.instance?.number || d1?.number || null;

        // Atualiza status no DB se veio por id
        if (body.id) {
          const supabase = createAdminClient();
          await supabase
            .from("whatsapp_instances")
            .update({
              status_conexao: state === "open" ? "online" : state,
              numero: numero || undefined,
            })
            .eq("id", body.id);
        }

        return NextResponse.json({
          ok: true,
          status: state,
          instance_name: instanceName,
          numero,
        });
      }
    } catch (_) {/* tenta próximo */}

    // Fallback: fetchInstances
    const r2 = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${instanceName}`, { headers });
    if (r2.ok) {
      const d2 = await r2.json();
      const inst = Array.isArray(d2) ? d2[0] : d2;
      const state = inst?.instance?.state || inst?.state || "unknown";
      const numero = inst?.instance?.number || inst?.owner || null;

      if (body.id) {
        const supabase = createAdminClient();
        await supabase
          .from("whatsapp_instances")
          .update({
            status_conexao: state === "open" ? "online" : state,
            numero: numero || undefined,
          })
          .eq("id", body.id);
      }

      return NextResponse.json({
        ok: true,
        status: state,
        instance_name: instanceName,
        numero,
      });
    }

    return NextResponse.json({ ok: false, erro: "Não foi possível conectar na Evolution API" });
  } catch (error: any) {
    console.error("[API] Erro ao testar instância:", error);
    return NextResponse.json({ ok: false, erro: error.message || "Erro interno" });
  }
}
