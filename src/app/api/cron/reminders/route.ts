import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/evolution/client";

// GET /api/cron/reminders
// Chamado a cada minuto por um cron externo (cron-job.org ou Vercel Cron)
export async function GET(req: NextRequest) {
  // Valida secret para evitar chamadas não autorizadas
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Busca lembretes que devem ser disparados agora (atrasados ou exatamente no horário)
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select(`
      id,
      user_id,
      title,
      description,
      remind_at,
      user_profiles!inner(
        id,
        full_name,
        contacts!inner(
          phone_number,
          instance_name,
          status
        )
      )
    `)
    .eq("status", "pending")
    .lte("remind_at", new Date().toISOString())
    .limit(50);

  if (error) {
    console.error("[Cron/Reminders] Erro ao buscar lembretes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ ok: true, fired: 0 });
  }

  let fired = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      const profile = reminder.user_profiles as any;
      const contact = profile?.contacts?.find(
        (c: any) => c.status === "aprovado"
      ) || profile?.contacts?.[0];

      if (!contact?.phone_number) {
        console.warn(`[Cron/Reminders] Sem telefone para lembrete ${reminder.id}`);
        // Marca como enviado para não ficar tentando infinitamente
        await supabase.from("reminders").update({ status: "sent" }).eq("id", reminder.id);
        continue;
      }

      const instanceName = contact.instance_name || process.env.EVOLUTION_INSTANCE_NAME || "IASMIN";
      const firstName = profile?.full_name?.split(" ")[0] || "você";

      const msg = `⏰ *Lembrete, ${firstName}!*\n\n${reminder.title}${reminder.description && reminder.description !== reminder.title ? `\n\n_${reminder.description}_` : ""}`;

      await sendTextMessage(contact.phone_number, msg, instanceName);

      await supabase
        .from("reminders")
        .update({ status: "sent" })
        .eq("id", reminder.id);

      fired++;
    } catch (err) {
      console.error(`[Cron/Reminders] Erro ao disparar lembrete ${reminder.id}:`, err);
      failed++;
    }
  }

  console.log(`[Cron/Reminders] Disparados: ${fired}, Falhas: ${failed}`);
  return NextResponse.json({ ok: true, fired, failed });
}
