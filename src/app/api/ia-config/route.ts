import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { clearConfigCache } from "@/lib/ai/classifier";

// GET — retorna config ativa
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ai_config")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}

// POST — salva nova config
export async function POST(req: NextRequest) {
  const { provider, model, system_prompt } = await req.json();

  if (!provider || !model || !system_prompt) {
    return NextResponse.json({ error: "Campos obrigatórios: provider, model, system_prompt" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Desativa config anterior
  await supabase.from("ai_config").update({ is_active: false }).eq("is_active", true);

  // Insere nova
  const { data, error } = await supabase
    .from("ai_config")
    .insert({ provider, model, system_prompt, is_active: true, name: "principal" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Limpa cache para que o webhook use a nova config imediatamente
  clearConfigCache();

  return NextResponse.json({ success: true, config: data });
}
