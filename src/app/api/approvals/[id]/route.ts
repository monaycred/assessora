import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
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
      return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Busca o contato
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });
    }

    // ── APROVAR ───────────────────────────────────────────────────────────
    if (action === "approve") {
      // Cria usuario no Supabase Auth via invite (envia email automatico com link de acesso)
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        contact.email,
        {
          data: {
            phone: contact.phone_number,
            name: contact.name,
            cpf: contact.cpf,
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        }
      );

      if (inviteError) {
        console.error("[Approvals] Erro ao criar usuario:", inviteError);
        return NextResponse.json({ error: `Erro ao criar usuario: ${inviteError.message}` }, { status: 500 });
      }

      const userId = inviteData?.user?.id;

      // Atualiza contato para aprovado
      await supabase.from("contacts").update({
        status: "aprovado",
        user_id: userId || null,
        approved_at: new Date().toISOString(),
      }).eq("id", id);

      // Notifica pelo WhatsApp
      await sendTextMessage(
        contact.phone_number,
        `✅ *Parabens, ${contact.name?.split(" ")[0]}!*\n\nSua conta na Iasmin foi aprovada!\n\nVerifique seu email *${contact.email}* — enviamos um link para voce criar sua senha e acessar o painel.\n\nDepois de criar sua senha, pode me chamar aqui mesmo pelo WhatsApp 😊`,
        contact.instance_name
      );

      // Log de auditoria
      await supabase.from("webhook_logs").insert({
        instance_name: contact.instance_name,
        from_number: contact.phone_number,
        event_type: "approved",
        result: `user_id: ${userId}`,
      });

      return NextResponse.json({ success: true, status: "aprovado", user_id: userId });
    }

    // ── REJEITAR ──────────────────────────────────────────────────────────
    if (action === "reject") {
      await supabase.from("contacts").update({
        status: "bloqueado",
      }).eq("id", id);

      // Notifica pelo WhatsApp
      await sendTextMessage(
        contact.phone_number,
        "Infelizmente seu cadastro nao foi aprovado. Entre em contato com o suporte para mais informacoes.",
        contact.instance_name
      );

      await supabase.from("webhook_logs").insert({
        instance_name: contact.instance_name,
        from_number: contact.phone_number,
        event_type: "rejected",
        result: "bloqueado",
      });

      return NextResponse.json({ success: true, status: "bloqueado" });
    }

  } catch (error) {
    console.error("[Approvals]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
