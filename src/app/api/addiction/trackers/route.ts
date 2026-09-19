import { getAccessUser } from '@/lib/access';
// ============================================================
// API - Addiction Trackers
// GET /api/addiction/trackers
// POST /api/addiction/trackers
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createTracker,
  getUserTrackers,
} from '@/lib/addiction/database';
import { sendTextMessage } from '@/lib/evolution/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/addiction/trackers
 * Retorna todos os trackers do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const user = await getAccessUser('addiction');
    const authError = !user;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const trackers = await getUserTrackers(user.id);

    return NextResponse.json({ trackers }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/addiction/trackers:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar trackers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addiction/trackers
 * Cria um novo tracker
 * Body: { name, description?, goal_days?, custom_milestones? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAccessUser('addiction');
    const authError = !user;

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, goal_days, custom_milestones } = body;

    // Validação básica
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome do tracker é obrigatório' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Nome não pode ter mais de 100 caracteres' },
        { status: 400 }
      );
    }

    // Obter workspace padrão do usuário (se existir)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, phone')
      .eq('id', user.id)
      .single();

    let workspaceId: string | undefined;
    if (userProfile) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', userProfile.id)
        .limit(1)
        .single();

      workspaceId = workspace?.id;
    }

    const tracker = await createTracker(user.id, workspaceId, {
      name,
      description,
      goal_days,
      custom_milestones,
    });

    if (!tracker) {
      return NextResponse.json(
        { error: 'Erro ao criar tracker' },
        { status: 500 }
      );
    }

    // Confirma a criação no WhatsApp. A jornada permanece criada mesmo se o
    // provedor estiver temporariamente indisponível.
    let whatsappSent = false;
    try {
      const { data: contact } = await supabase
        .from('contacts')
        .select('phone_number, instance_name')
        .eq('user_id', user.id)
        .eq('status', 'aprovado')
        .maybeSingle();

      const phone = contact?.phone_number || userProfile?.phone;
      if (phone) {
        const milestoneDays = Array.from(
          new Set(
            ((tracker.custom_milestones || []) as number[])
              .map((seconds) => Math.round(Number(seconds) / 86400))
              .filter((days) => days > 0 && (!tracker.goal_days || days <= tracker.goal_days))
          )
        ).sort((a, b) => a - b);

        const milestoneText = milestoneDays.length
          ? milestoneDays.length === 1
            ? `${milestoneDays[0]} dia`
            : `${milestoneDays.slice(0, -1).join(', ')} e ${milestoneDays.at(-1)} dias`
          : 'momentos importantes da sua jornada';
        const goalText = tracker.goal_days
          ? `por *${tracker.goal_days} dias*`
          : '*sem prazo definido*';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assessora.gedaias.com';

        await sendTextMessage(
          phone,
          `✅ *Jornada criada: ${tracker.name}*\n\nVocê se desafiou ${goalText}.\n\nVamos acompanhar você em *${milestoneText}*. O contador começou agora e continuará marcando seus dias automaticamente.\n\nPara editar sua jornada, acesse o portal:\n${appUrl}/addiction/${tracker.id}/editar`,
          contact?.instance_name || undefined
        );
        whatsappSent = true;
      }
    } catch (whatsappError) {
      console.error('[Addiction] Não foi possível enviar a confirmação da jornada:', whatsappError);
    }

    return NextResponse.json(
      { tracker, whatsapp_sent: whatsappSent, message: 'Jornada criada com sucesso!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/addiction/trackers:', error);
    return NextResponse.json(
      { error: 'Erro ao criar tracker' },
      { status: 500 }
    );
  }
}
