import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// PATCH /api/whatsapp/instances/[name] — atualiza campos da instância
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    // Se está ativando, desativa todas as outras primeiro
    if (body.is_active === true || body.ativo === true) {
      await supabase
        .from("whatsapp_instances")
        .update({ is_active: false, ativo: false })
        .neq("instance_name", name);
    }

    const { error } = await supabase
      .from("whatsapp_instances")
      .update(body)
      .eq("instance_name", name);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[API] Erro ao atualizar instância:", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar instância" }, { status: 500 });
  }
}

// DELETE /api/whatsapp/instances/[name]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("whatsapp_instances")
      .delete()
      .eq("instance_name", name);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[API] Erro ao deletar instância:", error);
    return NextResponse.json({ error: error.message || "Erro ao deletar instância" }, { status: 500 });
  }
}
