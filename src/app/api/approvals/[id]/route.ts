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
      let userId: string | null = contact.user_id || null;
      let isExistingUser = !!contact.user_id;

      if (isExistingUser && userId) {
        // Cadastro veio do site — só ativa o perfil, não manda invite
        await supabase
          .from("user_profiles")
          .update({ is_active: true, phone: contact.phone_number || undefined })
          .eq("user_id", userId);
      } else {
        // Cadastro veio do WhatsApp — cria/convida usuário
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          contact.email,
          {
            data: { phone: contact.phone_number, name: contact.name, cpf: contact.cpf },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          }
        );

        if (inviteError) {
          const alreadyExists =
            inviteError.message?.toLowerCase().includes("already been registered") ||
            inviteError.message?.toLowerCase().includes("already registered") ||
            inviteError.code === "email_exists";

          if (!alreadyExists) {
            console.error("[Approvals] Erro ao criar usuario:", inviteError);
            return NextResponse.json({ error: `Erro ao criar usuario: ${inviteError.message}` }, { status: 500 });
          }

          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          if (!listError) {
            const existing = users.find((u: { email?: string; id: string }) => u.email === contact.email);
            if (existing) { userId = existing.id; isExistingUser = true; }
          }
        } else {
          userId = inviteData?.user?.id ?? null;
        }

        if (isExistingUser && userId) {
          await supabase.from("user_profiles").update({ phone: contact.phone_number }).eq("user_id", userId);
        }
      }

      // Atualiza contato para aprovado
      await supabase.from("contacts").update({
        status: "aprovado",
        user_id: userId || null,
        approved_at: new Date().toISOString(),
      }).eq("id", id);

      // Mensagem WhatsApp
      const firstName = contact.name?.split(" ")[0] || "você";
      const whatsappMsg = contact.user_id
        ? `✅ *${firstName}, sua conta foi aprovada!*\n\nAgora você pode acessar o painel e me chamar aqui pelo WhatsApp 😊\n\nExemplo: _Iasmin, me lembra de tomar remédio amanhã às 9h_`
        : `✅ *Parabens, ${firstName}!*\n\nSua conta na Iasmin foi aprovada!\n\nVerifique seu email *${contact.email}* — enviamos um link para voce criar sua senha e acessar o painel.\n\nDepois de criar sua senha, pode me chamar aqui mesmo pelo WhatsApp 😊`;

      // Notifica pelo WhatsApp (só se tem telefone)
      if (contact.phone_number) {
        await sendTextMessage(contact.phone_number, whatsappMsg, contact.instance_name);
      }

      // Log de auditoria
      await supabase.from("webhook_logs").insert({
        instance_name: contact.instance_name,
        from_number: contact.phone_number,
        event_type: "approved",
        result: `user_id: ${userId} | existing: ${isExistingUser}`,
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
