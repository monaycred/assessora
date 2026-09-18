import { createAdminClient } from '@/lib/supabase/server';
import { checkinReply, dateInSaoPaulo, type CheckinStatus } from './checkins';

// Returns null for messages unrelated to a daily check-in.
export async function processWhatsAppCheckin(authUserId: string, message: string): Promise<string | null> {
  const match = /^\s*([123])\s+([A-F0-9]{12})\s*$/i.exec(message);
  if (!match) return null;
  const status: CheckinStatus = match[1] === '1' ? 'success' : match[1] === '2' ? 'lapse' : 'support';
  const db = createAdminClient();
  const { data: profile } = await db.from('user_profiles').select('id, is_active')
    .eq('user_id', authUserId).maybeSingle();
  if (!profile?.is_active) return 'Sua conta precisa estar aprovada para responder ao check-in.';
  const { data: checkin } = await db.from('addiction_daily_checkins')
    .select('tracker_id, checkin_date, status').eq('reply_code', match[2].toUpperCase()).maybeSingle();
  if (!checkin) return 'Código de check-in inválido ou expirado.';
  if (checkin.checkin_date !== dateInSaoPaulo()) return 'Esse check-in já expirou. Aguarde a mensagem de hoje.';
  const { data: tracker } = await db.from('addiction_trackers').select('id, user_id, name')
    .eq('id', checkin.tracker_id).maybeSingle();
  if (!tracker || tracker.user_id !== profile.id) return 'Código de check-in inválido.';
  if (checkin.status !== 'pending') return 'Você já respondeu a esse check-in.';
  const { data: recorded, error } = await db.rpc('record_addiction_checkin', {
    p_tracker_id: tracker.id, p_date: checkin.checkin_date,
    p_status: status, p_source: 'whatsapp',
  });
  if (error) {
    console.error('[WhatsAppCheckin] Erro:', error);
    return 'Não foi possível registrar a resposta. Tente pelo aplicativo.';
  }
  return recorded ? checkinReply(status, tracker.name) : 'Você já respondeu a esse check-in.';
}
