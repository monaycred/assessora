import { NextRequest, NextResponse } from 'next/server';
import { dispatchDailyCheckins } from '@/lib/addiction/dispatch-checkins';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await dispatchDailyCheckins()) });
  } catch (error) {
    console.error('[DailyCheckin] Cron falhou:', error);
    return NextResponse.json({ error: 'Falha ao enviar check-ins' }, { status: 500 });
  }
}
