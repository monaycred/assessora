import { createAdminClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/lib/evolution/client';
import { dateInSaoPaulo } from './checkins';

export async function dispatchDailyCheckins(now = new Date()) {
  const db = createAdminClient();
  const today = dateInSaoPaulo(now);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now);
  const { data: trackers, error } = await db.from('addiction_trackers')
    .select('id, user_id, name, notification_time')
    .eq('is_active', true).lte('notification_time', time).limit(500);
  if (error) throw error;
  if (!trackers?.length) return { due: 0, sent: 0, failed: 0 };

  const ids = trackers.map((tracker: any) => tracker.id);
  const { data: existing } = await db.from('addiction_daily_checkins')
    .select('tracker_id').eq('checkin_date', today).in('tracker_id', ids);
  const completed = new Set((existing || []).map((row: any) => row.tracker_id));
  const due = trackers.filter((tracker: any) => !completed.has(tracker.id));
  const profileIds = [...new Set(due.map((tracker: any) => tracker.user_id))];
  if (!profileIds.length) return { due: 0, sent: 0, failed: 0 };
  const { data: profiles } = await db.from('user_profiles').select('id, user_id, role, is_active')
    .in('id', profileIds);
  const authIds = (profiles || []).map((profile: any) => profile.user_id);
  const { data: contacts } = authIds.length
    ? await db.from('contacts').select('user_id, phone_number, instance_name').in('user_id', authIds).eq('status', 'aprovado')
    : { data: [] };
  let sent = 0;
  let failed = 0;

  for (const tracker of due) {
    const profile = profiles?.find((item: any) => item.id === tracker.user_id);
    if (!profile?.is_active) continue;
    const contact = contacts?.find((item: any) => item.user_id === profile.user_id);
    if (!contact?.phone_number) continue;

    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    const { data: checkin, error: insertError } = await db.from('addiction_daily_checkins').insert({
      tracker_id: tracker.id, checkin_date: today, reply_code: code,
    }).select('id').maybeSingle();
    if (insertError || !checkin) continue; // outra execução já criou o check-in

    const message = `🎯 *Check-in diário: ${tracker.name}*\n\nHoje você conseguiu seguir sua meta?\n\nResponda:\n*1 ${code}* — Sim\n*2 ${code}* — Não\n*3 ${code}* — Preciso de apoio\n\nSua resposta é privada. Sem resposta, o dia fica sem confirmação.`;
    try {
      await sendTextMessage(contact.phone_number, message, contact.instance_name || undefined);
      await db.from('addiction_daily_checkins').update({ sent_at: new Date().toISOString() }).eq('id', checkin.id);
      sent++;
    } catch (cause) {
      console.error('[DailyCheckin] Envio falhou:', cause);
      await db.from('addiction_daily_checkins').delete().eq('id', checkin.id).eq('status', 'pending');
      failed++;
    }
  }
  return { due: due.length, sent, failed };
}
