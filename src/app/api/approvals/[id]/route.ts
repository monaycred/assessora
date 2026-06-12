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
      let userId: string | null = null;
      let isExistingUser = false;

      // Tenta criar via invite
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
        // Se ja existe, busca o usuario pelo email
        const alreadyExists =
          inviteError.message?.toLowerCase().includes("already been registered") ||
          inviteError.message?.toLowerCase().includes("already registered") ||
          inviteError.code === "email_exists";

        if (!alreadyExists) {
          console.error("[Approvals] Erro ao criar usuario:", inviteError);
          return NextResponse.json({ error: `Erro ao criar usuario: ${inviteError.message}` }, { status: 500 });
        }

        // Busca usuario existente pelo email
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError) {
          const existing = users.find((u: { email?: string; id: string }) => u.email === contact.email);
          if (existing) {
            userId = existing.id;
            isExistingUser = true;
          }
        }
      } else {
        userId = inviteData?.user?.id ?? null;
      }

      // Se usuario ja existia, atualiza o phone no perfil em vez de enviar invite
      if (isExistingUser && userId) {
        await supabase
          .from("user_profiles")
          .update({ phone: contact.phone_number })
          .eq("user_id", userId);
      }

      // Atualiza contato para aprovado
      await supabase.from("contacts").update({
        status: "aprovado",
        user_id: userId || null,
        approved_at: new Date().toISOString(),
      }).eq("id", id);

      // Mensagem diferente se usuario ja existia
      const whatsappMsg = isExistingUser
        ? `✅ *${contact.name?.split(" ")[0]}, seu numero foi vinculado!*\n\nSeu WhatsApp foi associado à sua conta na Iasmin.\n\nPode me chamar por aqui quando quiser 😊`
        : `✅ *Parabens, ${contact.name?.split(" ")[0]}!*\n\nSua conta na Iasmin foi aprovada!\n\nVerifique seu email *${contact.email}* — enviamos um link para voce criar sua senha e acessar o painel.\n\nDepois de criar sua senha, pode me chamar aqui mesmo pelo WhatsApp 😊`;

      // Notifica pelo WhatsApp
      await sendTextMessage(contact.phone_number, whatsappMsg, contact.instance_name);

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
