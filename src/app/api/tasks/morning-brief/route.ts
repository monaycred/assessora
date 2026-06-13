import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendTextMessage } from "@/lib/evolution/client";

// GET /api/tasks/morning-brief?secret=XXX
// Chamado de hora em hora por cron externo (cron-job.org).
// Envia para cada usuário cujo briefing_time bate com a hora atual (UTC).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Hora atual UTC no formato HH:MM para comparar com briefing_time
  const now = new Date();
  const currentHour   = now.getUTCHours().toString().padStart(2, "0");
  const currentMinute = now.getUTCMinutes().toString().padStart(2, "0");
  const currentTime   = `${currentHour}:${currentMinute}`;

  // Busca perfis com briefing ativo e horário compatível (ignora segundos)
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, user_id, full_name")
    .eq("briefing_enabled", true)
    .like("briefing_time", `${currentTime}%`); // '08:00%' cobre '08:00:00'

  if (error) {
    console.error("[morning-brief] Erro ao buscar perfis:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "Nenhum briefing para agora" });
  }

  let sent    = 0;
  let skipped = 0;

  for (const profile of profiles) {
    try {
      // Busca contato WhatsApp aprovado
      const { data: contact } = await supabase
        .from("contacts")
        .select("phone_number, instance_name")
        .eq("user_id", profile.user_id)
        .eq("status", "aprovado")
        .maybeSingle();

      if (!contact?.phone_number) { skipped++; continue; }

      const firstName    = profile.full_name?.split(" ")[0] || "você";
      const instanceName = contact.instance_name || process.env.EVOLUTION_INSTANCE_NAME || "IASMIN";

      // Tarefas urgentes ou importantes de projetos (não arquivadas)
      const { data: urgentTasks } = await supabase
        .from("project_tasks")
        .select("title, due_date, is_urgent, is_important, kanban_status")
        .eq("user_id", profile.user_id)
        .neq("kanban_status", "done")
        .or("is_urgent.eq.true,is_important.eq.true")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);

      // Tarefas com vencimento hoje ou atrasadas
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      const { data: dueTasks } = await supabase
        .from("project_tasks")
        .select("title, due_date, kanban_status")
        .eq("user_id", profile.user_id)
        .neq("kanban_status", "done")
        .lte("due_date", tomorrow.toISOString().split("T")[0])
        .order("due_date", { ascending: true })
        .limit(5);

      // Monta a mensagem
      const lines: string[] = [];
      lines.push(`☀️ *Bom dia, ${firstName}!* Aqui está seu briefing de hoje:\n`);

      // Tarefas vencendo hoje/atrasadas
      const dueLine: string[] = [];
      for (const t of dueTasks || []) {
        const d = t.due_date ? new Date(t.due_date + "T00:00:00Z") : null;
        const isOverdue = d && d < today;
        const label = isOverdue ? "⚠️ Atrasada" : "📅 Vence hoje";
        dueLine.push(`  ${label}: *${t.title}*`);
      }
      if (dueLine.length > 0) {
        lines.push("*🗓️ Vencimentos:*");
        lines.push(...dueLine);
        lines.push("");
      }

      // Tarefas urgentes/importantes
      const urgentLine: string[] = [];
      for (const t of urgentTasks || []) {
        // evita duplicar com as de vencimento
        if ((dueTasks || []).some((d: { title: string }) => d.title === t.title)) continue;
        const emoji = t.is_urgent && t.is_important ? "🔴" : t.is_important ? "🟠" : "🟡";
        urgentLine.push(`  ${emoji} *${t.title}*`);
      }
      if (urgentLine.length > 0) {
        lines.push("*🎯 Prioridades:*");
        lines.push(...urgentLine);
        lines.push("");
      }

      if (dueLine.length === 0 && urgentLine.length === 0) {
        lines.push("✅ Nenhuma tarefa urgente ou vencendo hoje. Bom trabalho!");
      } else {
        lines.push("_Para ver tudo: assessora.gedaias.com/projetos_");
      }

      const message = lines.join("\n");
      await sendTextMessage(contact.phone_number, message, instanceName);
      sent++;
    } catch (err) {
      console.error(`[morning-brief] Erro para perfil ${profile.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
