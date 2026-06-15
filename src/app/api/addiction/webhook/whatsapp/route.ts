// ============================================================
// Webhook - WhatsApp Callbacks para Addiction Tracker
// Recebe confirmações de marcos (✅ Continuar / ❌ Recaí)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTracker,
  confirmMilestone,
  resetTracker,
  updateTrackerStreak,
} from '@/lib/addiction/database';
import { calculateDaysSince } from '@/lib/addiction/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/addiction/webhook/whatsapp
 * Webhook da Evolution API para processar callbacks de botões
 * Payload: {
 *   trackerId: string,
 *   action: 'continue' | 'relapse',
 *   userId: string,
 *   milestoneId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackerId, action, milestoneId } = body;

    if (!trackerId || !action || !milestoneId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios faltando' },
        { status: 400 }
      );
    }

    const tracker = await getTracker(trackerId);
    if (!tracker) {
      return NextResponse.json(
        { error: 'Tracker não encontrado' },
        { status: 404 }
      );
    }

    if (action === 'continue') {
      // Usuário confirmou que continuou no compromisso
      const milestone = await confirmMilestone(milestoneId);

      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: 'Confirmação registrada! Próximo marco em breve! 💪',
          action: 'continue',
          milestone,
        },
        { status: 200 }
      );
    } else if (action === 'relapse') {
      // Usuário marcou que não conseguiu manter
      const currentDays = calculateDaysSince(tracker.started_at);
      const success = await resetTracker(trackerId);

      if (!success) {
        return NextResponse.json(
          { error: 'Erro ao processar recaída' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message: `Tudo bem! Você conseguiu ${currentDays} dias. Vamos recomeçar! 💪`,
          action: 'relapse',
          streak_before: currentDays,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in whatsapp webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/addiction/webhook/whatsapp
 * Health check do webhook
 */
export async function GET() {
  return NextResponse.json(
    { status: 'OK', message: 'Webhook pronto para receber eventos' },
    { status: 200 }
  );
}
