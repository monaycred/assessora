// ============================================================
// API - Tracker Details
// GET /api/addiction/trackers/[id]
// PATCH /api/addiction/trackers/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTracker,
  updateTracker,
  getTrackerMilestones,
  getTrackerEntries,
  getTrackerResets,
} from '@/lib/addiction/database';
import { calculateDaysSince } from '@/lib/addiction/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/addiction/trackers/[id]
 * Retorna detalhe do tracker com histórico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const tracker = await getTracker(params.id);

    if (!tracker) {
      return NextResponse.json(
        { error: 'Tracker não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissão (proprietário)
    if (tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    // Calcular dias atuais
    const currentDays = calculateDaysSince(tracker.started_at);

    // Buscar histórico
    const milestones = await getTrackerMilestones(params.id);
    const recentEntries = await getTrackerEntries(params.id, 10);
    const resets = await getTrackerResets(params.id);

    return NextResponse.json(
      {
        tracker: {
          ...tracker,
          currentDays, // atualizado em tempo real
        },
        milestones,
        recentEntries,
        resets,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/addiction/trackers/[id]:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tracker' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/addiction/trackers/[id]
 * Deleta um tracker
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const tracker = await getTracker(params.id);

    if (!tracker) {
      return NextResponse.json(
        { error: 'Tracker não encontrado' },
        { status: 404 }
      );
    }

    if (tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    // Delete tracker (cascata deleta tudo)
    const { error: deleteError } = await supabase
      .from('addiction_trackers')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      { message: 'Tracker deletado com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE tracker:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar tracker' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/addiction/trackers/[id]
 * Atualiza tracker (nome, goal, milestones, privacidade, etc)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const tracker = await getTracker(params.id);

    if (!tracker) {
      return NextResponse.json(
        { error: 'Tracker não encontrado' },
        { status: 404 }
      );
    }

    if (tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validações
    if (body.name && body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome não pode estar vazio' },
        { status: 400 }
      );
    }

    if (body.notification_time) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(body.notification_time)) {
        return NextResponse.json(
          { error: 'Formato de hora inválido (HH:MM)' },
          { status: 400 }
        );
      }
    }

    if (body.community_name_custom) {
      if (body.community_name_custom.length > 20) {
        return NextResponse.json(
          { error: 'Nome na comunidade não pode ter mais de 20 caracteres' },
          { status: 400 }
        );
      }

      // Validar nome (sem palavrões, dados pessoais, etc)
      const badWords = ['puta', 'caralho', 'merda'];
      if (badWords.some((w) => body.community_name_custom.toLowerCase().includes(w))) {
        return NextResponse.json(
          { error: 'Nome contém linguagem inapropriada' },
          { status: 400 }
        );
      }
    }

    const updated = await updateTracker(params.id, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Erro ao atualizar tracker' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { tracker: updated, message: 'Tracker atualizado com sucesso!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/addiction/trackers/[id]:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar tracker' },
      { status: 500 }
    );
  }
}
