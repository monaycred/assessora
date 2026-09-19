import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessUser } from '@/lib/access';
import { dateInSaoPaulo, type CheckinStatus } from '@/lib/addiction/checkins';

export async function GET() {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const db = createAdminClient();
  const { data: trackers } = await db.from('addiction_trackers').select('id')
    .eq('user_id', user.id).eq('is_active', true);
  const ids = (trackers || []).map((tracker: any) => tracker.id);
  if (!ids.length) return NextResponse.json({ checkins: [] });
  const { data: checkins, error } = await db.from('addiction_daily_checkins')
    .select('tracker_id, checkin_date, status, responded_at')
    .in('tracker_id', ids).eq('checkin_date', dateInSaoPaulo());
  return error ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ checkins: checkins || [] });
}

export async function POST(request: NextRequest) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { tracker_id, status } = await request.json();
  if (!['success', 'lapse', 'support'].includes(status) || typeof tracker_id !== 'string') {
    return NextResponse.json({ error: 'Resposta inválida' }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: tracker } = await db.from('addiction_trackers').select('id,started_at')
    .eq('id', tracker_id).eq('user_id', user.id).eq('is_active', true).maybeSingle();
  if (!tracker) return NextResponse.json({ error: 'Rastreador não encontrado' }, { status: 404 });
  const unlockAt = new Date(tracker.started_at).getTime() + 24 * 60 * 60 * 1000;
  if (Date.now() < unlockAt) return NextResponse.json({ error: 'O primeiro check-in será liberado 24 horas após a criação da jornada' }, { status: 409 });
  const { data: recorded, error } = await db.rpc('record_addiction_checkin', {
    p_tracker_id: tracker.id, p_date: dateInSaoPaulo(),
    p_status: status as CheckinStatus, p_source: 'app',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!recorded) return NextResponse.json({ error: 'Você já respondeu hoje' }, { status: 409 });
  return NextResponse.json({ ok: true, status });
}
