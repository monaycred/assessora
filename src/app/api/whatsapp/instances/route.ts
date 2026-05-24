import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/whatsapp/instances — lista todas as instâncias do DB
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("[API] Erro ao listar instâncias:", error);
    return NextResponse.json({ error: "Erro ao listar instâncias" }, { status: 500 });
  }
}

// POST /api/whatsapp/instances — cadastra nova instância
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      display_name,
      instance_name,
      numero,
      tipo_canal,
      provider,
      api_url,
      api_key,
      cor,
    } = body;

    if (!instance_name && !display_name) {
      return NextResponse.json({ error: "Nome ou instance_name obrigatório" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verifica duplicata
    const finalInstanceName = instance_name || display_name;
    const { data: existente } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("instance_name", finalInstanceName)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ error: `Instância "${finalInstanceName}" já cadastrada` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("whatsapp_instances")
      .insert({
        display_name: display_name || instance_name,
        instance_name: finalInstanceName,
        numero: numero || null,
        tipo_canal: tipo_canal || "whatsapp",
        provider: provider || "evolution",
        api_url: api_url || null,
        api_key: api_key || null,
        cor: cor || "#25D366",
        is_active: false,
        ativo: false,
        status_conexao: "desconectado",
        config_json: {},
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("[API] Erro ao criar instância:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar instância" }, { status: 500 });
  }
}
