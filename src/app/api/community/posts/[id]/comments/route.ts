import { getAccessUser } from '@/lib/access';
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const comments = await getPostComments((await params).id);
    const trackerIds = [...new Set(comments.map((comment) => comment.tracker_id))];
    const { data: trackers } = trackerIds.length
      ? await supabase.from('addiction_trackers').select('id, user_id').in('id', trackerIds)
      : { data: [] };
    const userIds = [...new Set((trackers || []).map((tracker: any) => tracker.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('user_profiles').select('id, nickname, avatar_url').in('id', userIds)
      : { data: [] };
    return NextResponse.json({ comments: comments.map((comment) => {
      const tracker = trackers?.find((item: any) => item.id === comment.tracker_id);
      const profile = profiles?.find((item: any) => item.id === tracker?.user_id);
      return { ...comment, community_name: profile?.nickname || comment.community_name,
        avatar_url: profile?.avatar_url || null };
    }) }, { status: 200 });
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
  { params }: { params: Promise<{ id: string }> }
) {
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

    const communityName = user.nickname || tracker.community_name_custom || tracker.community_name;

    const postId = (await params).id;
    const comment = await createComment(
      postId,
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
    const {data:post}=await supabase.from('community_posts').select('tracker_id').eq('id',postId).maybeSingle();
    const {data:ownerTracker}=post?await supabase.from('addiction_trackers').select('user_id').eq('id',post.tracker_id).maybeSingle():{data:null};
    if(ownerTracker?.user_id&&ownerTracker.user_id!==user.id)await supabase.from('app_notifications').insert({recipient_profile_id:ownerTracker.user_id,type:'comment',title:'Novo comentário',message:`${communityName} comentou em sua publicação`,entity_type:'post',entity_id:postId,dedupe_key:`comment:${comment.id}`});

    return NextResponse.json(
      { comment: { ...comment, community_name: communityName, avatar_url: user.avatarUrl }, message: 'Comentário adicionado!' },
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
