// ============================================================
// CRON JOB - Check Milestones
// GET /api/addiction/cron/check-milestones
// Deve ser chamado a cada hora por um job externo (Vercel, n8n, etc)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateDaysSince,
  milestonesToDays,
  generateMilestoneMessage,
} from '@/lib/addiction/utils';
import { createMilestoneReached } from '@/lib/addiction/database';
import { sendMilestoneNotification } from '@/lib/addiction/whatsapp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/addiction/cron/check-milestones
 * Protegido por Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (token secreto)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar todos os trackers ativos
    const { data: trackers, error: trackersError } = await supabase
      .from('addiction_trackers')
      .select('*')
      .eq('is_active', true);

    if (trackersError) {
      throw trackersError;
    }

    let processedCount = 0;
    let milestonesCreated = 0;

    // Para cada tracker, verificar se atingiu novos marcos
    for (const tracker of trackers || []) {
      const currentDays = calculateDaysSince(tracker.started_at);
      const milestoneDays = milestonesToDays(tracker.custom_milestones || []);

      // Buscar milestones já alcançados
      const { data: reachedMilestones } = await supabase
        .from('addiction_milestones_reached')
        .select('milestone_days')
        .eq('tracker_id', tracker.id);

      const reachedDays = reachedMilestones?.map((m) => m.milestone_days) || [];

      // Verificar se há novos marcos atingidos
      for (const milestoneDayValue of milestoneDays) {
        // Se atingiu marco E ainda não foi criado registro
        if (currentDays >= milestoneDayValue && !reachedDays.includes(milestoneDayValue)) {
          // Criar registro de milestone
          await createMilestoneReached(tracker.id, milestoneDayValue);
          milestonesCreated++;

          // Tentar enviar notificação via WhatsApp
          // Nota: requer número de telefone armazenado
          const notificationSent = await sendMilestoneNotification({
            trackerId: tracker.id,
            userPhone: tracker.user_id, // TODO: buscar número real
            milestoneDays: milestoneDayValue,
          });

          console.log(
            `[Milestone] Tracker ${tracker.id} atingiu ${milestoneDayValue} dias`,
            notificationSent ? '(notificação enviada)' : '(sem notificação)'
          );
        }
      }

      processedCount++;
    }

    return NextResponse.json(
      {
        message: 'Verificação de marcos concluída',
        processed: processedCount,
        milestones_created: milestonesCreated,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in check-milestones cron:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar marcos', details: String(error) },
      { status: 500 }
    );
  }
}
