import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/whatsapp/instances/[name]/activate — define como instância ativa
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const supabase = createAdminClient();

    // Desativa todas as outras
    await supabase
      .from("whatsapp_instances")
      .update({ is_active: false })
      .neq("instance_name", name);

    // Ativa esta
    const { error } = await supabase
      .from("whatsapp_instances")
      .update({ is_active: true })
      .eq("instance_name", name);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Erro ao ativar instância:", error);
    return NextResponse.json({ error: "Erro ao ativar instância" }, { status: 500 });
  }
}
