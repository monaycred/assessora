// ============================================================
// API - Post Comments
// GET /api/community/posts/[id]/comments
// POST /api/community/posts/[id]/comments
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createComment,
  getPostComments,
  getTracker,
} from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/community/posts/[id]/comments
 * Busca comentários de um post
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await getPostComments(params.id);

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    console.error('Error in GET comments:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar comentários' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/posts/[id]/comments
 * Cria novo comentário
 * Body: { tracker_id, content, parent_comment_id? }
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
    const { tracker_id, content, parent_comment_id } = body;

    if (!tracker_id || !content) {
      return NextResponse.json(
        { error: 'tracker_id e content são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar conteúdo
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 || trimmedContent.length > 280) {
      return NextResponse.json(
        { error: 'Comentário deve ter entre 1 e 280 caracteres' },
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

    const communityName = tracker.community_name_custom || tracker.community_name;

    const comment = await createComment(
      params.id,
      tracker_id,
      communityName,
      tracker.current_streak_days,
      trimmedContent,
      parent_comment_id
    );

    if (!comment) {
      return NextResponse.json(
        { error: 'Erro ao criar comentário' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { comment, message: 'Comentário adicionado!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST comment:', error);
    return NextResponse.json(
      { error: 'Erro ao criar comentário' },
      { status: 500 }
    );
  }
}
