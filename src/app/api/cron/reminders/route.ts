import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/evolution/client";

// GET /api/cron/reminders
// Chamado a cada minuto por cron externo (cron-job.org)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Busca lembretes pendentes que já passaram do horário
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("id, user_id, title, description, remind_at")
    .eq("status", "pending")
    .lte("remind_at", new Date().toISOString())
    .limit(50);

  if (error) {
    console.error("[Cron/Reminders] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ ok: true, fired: 0 });
  }

  let fired = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      // 2. Busca o profile (user_id do reminder → user_profiles.id)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, full_name, user_id")
        .eq("id", reminder.user_id)
        .single();

      if (!profile) {
        await supabase.from("reminders").update({ status: "sent" }).eq("id", reminder.id);
        continue;
      }

      // 3. Busca o contato pelo auth user_id (contacts.user_id = auth.users.id)
      const { data: contact } = await supabase
        .from("contacts")
        .select("phone_number, instance_name, status")
        .eq("user_id", profile.user_id)
        .eq("status", "aprovado")
        .maybeSingle();

      if (!contact?.phone_number) {
        await supabase.from("reminders").update({ status: "sent" }).eq("id", reminder.id);
        continue;
      }

      const instanceName = contact.instance_name || process.env.EVOLUTION_INSTANCE_NAME || "IASMIN";
      const firstName = profile.full_name?.split(" ")[0] || "você";

      const msg = `⏰ *Lembrete, ${firstName}!*\n\n${reminder.title}`;

      await sendTextMessage(contact.phone_number, msg, instanceName);

      await supabase
        .from("reminders")
        .update({ status: "sent" })
        .eq("id", reminder.id);

      fired++;
    } catch (err) {
      console.error(`[Cron/Reminders] Erro no lembrete ${reminder.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, fired, failed });
}
