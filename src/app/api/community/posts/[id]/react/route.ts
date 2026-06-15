// ============================================================
// API - Post Reactions
// POST /api/community/posts/[id]/react
// DELETE /api/community/posts/[id]/react
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  addReaction,
  removeReaction,
  getTracker,
} from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/community/posts/[id]/react
 * Adiciona reação a um post
 * Body: { tracker_id, reaction_type }
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
    const { tracker_id, reaction_type } = body;

    if (!tracker_id || !reaction_type) {
      return NextResponse.json(
        { error: 'tracker_id e reaction_type são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar reação
    const validReactions = ['❤️', '💪', '🔥'];
    if (!validReactions.includes(reaction_type)) {
      return NextResponse.json(
        { error: 'Tipo de reação inválido' },
        { status: 400 }
      );
    }

    // Verificar que tracker pertence ao usuário
    const tracker = await getTracker(tracker_id);
    if (!tracker || tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const success = await addReaction(params.id, tracker_id, reaction_type);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao adicionar reação' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Reação adicionada' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST react:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar reação' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/posts/[id]/react
 * Remove reação de um post
 * Query: tracker_id, reaction_type
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

    const url = new URL(request.url);
    const tracker_id = url.searchParams.get('tracker_id');
    const reaction_type = url.searchParams.get('reaction_type');

    if (!tracker_id || !reaction_type) {
      return NextResponse.json(
        { error: 'tracker_id e reaction_type são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar permissão
    const tracker = await getTracker(tracker_id);
    if (!tracker || tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const success = await removeReaction(params.id, tracker_id, reaction_type);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao remover reação' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Reação removida' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE react:', error);
    return NextResponse.json(
      { error: 'Erro ao remover reação' },
      { status: 500 }
    );
  }
}
