// ============================================================
// API - Report Post/Comment
// POST /api/community/posts/[id]/report
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { reportContent, getTracker } from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/community/posts/[id]/report
 * Denunciar um post
 * Body: { tracker_id, reason, reason_details? }
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

    const body = await request.json();
    const { tracker_id, reason, reason_details } = body;

    if (!tracker_id || !reason) {
      return NextResponse.json(
        { error: 'tracker_id e reason são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar motivo
    const validReasons = ['spam', 'harmful', 'bullying', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Motivo de denúncia inválido' },
        { status: 400 }
      );
    }

    // Verificar tracker
    const tracker = await getTracker(tracker_id);
    if (!tracker || tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const report = await reportContent(
      tracker_id,
      params.id,
      undefined,
      reason,
      reason_details
    );

    if (!report) {
      return NextResponse.json(
        { error: 'Erro ao criar denúncia' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { report, message: 'Denúncia enviada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST report:', error);
    return NextResponse.json(
      { error: 'Erro ao denunciar' },
      { status: 500 }
    );
  }
}
