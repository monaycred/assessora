import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteEvolutionInstance } from "@/lib/evolution/client";

// DELETE /api/whatsapp/instances/[name] — remove instância
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;
    const supabase = createAdminClient();

    // Não permite deletar instância ativa
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("is_active")
      .eq("instance_name", name)
      .single();

    if (inst?.is_active) {
      return NextResponse.json(
        { error: "Não é possível deletar a instância ativa. Desconecte-a primeiro." },
        { status: 400 }
      );
    }

    // Deleta no Evolution
    await deleteEvolutionInstance(name);

    // Remove do banco
    const { error } = await supabase
      .from("whatsapp_instances")
      .delete()
      .eq("instance_name", name);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Erro ao deletar instância:", error);
    return NextResponse.json({ error: "Erro ao deletar instância" }, { status: 500 });
  }
}
