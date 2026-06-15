// ============================================================
// API - Tracker Reset
// POST /api/addiction/trackers/[id]/reset
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTracker,
  resetTracker,
} from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/addiction/trackers/[id]/reset
 * Reseta o tracker (marcar recaída)
 * Body: { reason?: string }
 */
export async function POST(
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
    const { reason } = body;

    const success = await resetTracker(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao resetar tracker' },
        { status: 500 }
      );
    }

    // Buscar tracker atualizado
    const updated = await getTracker(params.id);

    return NextResponse.json(
      {
        tracker: updated,
        message: 'Tracker resetado. Você pode recomeçar agora!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/addiction/trackers/[id]/reset:', error);
    return NextResponse.json(
      { error: 'Erro ao resetar tracker' },
      { status: 500 }
    );
  }
}
