import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/evolution/client";

// PATCH /api/approvals/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json();

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Busca a solicitação
    const { data: approval, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !approval) {
      return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
    }

    const status = action === "approve" ? "approved" : "rejected";

    // Atualiza status
    await supabase
      .from("approval_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", id);

    // Notifica o número no WhatsApp
    if (action === "approve") {
      await sendTextMessage(
        approval.phone_number,
        "✅ Seu número foi aprovado! Agora você pode usar a Iasmin.\n\nExemplo: _Iasmin, registra mercado 150 no débito_"
      );
    } else {
      await sendTextMessage(
        approval.phone_number,
        "❌ Infelizmente seu número não foi autorizado. Entre em contato com o administrador."
      );
    }

    // Log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: `approval_${status}`,
      entity_type: "approval_request",
      entity_id: id,
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[Approvals]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
