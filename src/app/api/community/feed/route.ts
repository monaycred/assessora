import { getAccessUser } from '@/lib/access';
// ============================================================
// API - Community Feed
// GET /api/community/feed
// POST /api/community/feed (create post)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCommunityFeed,
  createPost,
  getTracker,
  getPostReactions,
  getPostComments,
} from '@/lib/addiction/database';
import { truncateText } from '@/lib/addiction/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/community/feed
 * Query params: type=(victory|challenge|tip|general|all), limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const posts = await getCommunityFeed(type === 'all' ? null : type, limit);
    const trackerIds = [...new Set(posts.map((post) => post.tracker_id))];
    const { data: trackers } = trackerIds.length
      ? await supabase.from('addiction_trackers').select('id, user_id').in('id', trackerIds)
      : { data: [] };
    const userIds = [...new Set((trackers || []).map((tracker: any) => tracker.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('user_profiles').select('id, nickname, avatar_url').in('id', userIds)
      : { data: [] };

    // Enriquecer posts com reações e comentários
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const reactions = await getPostReactions(post.id);
        const comments = await getPostComments(post.id);
        const tracker = trackers?.find((item: any) => item.id === post.tracker_id);
        const profile = profiles?.find((item: any) => item.id === tracker?.user_id);

        return {
          ...post,
          community_name: profile?.nickname || post.community_name,
          avatar_url: profile?.avatar_url || null,
          reactions,
          comment_count: comments.length,
          reactions_total: Object.values(reactions).reduce((a, b) => a + b, 0),
        };
      })
    );

    return NextResponse.json({ posts: enriched }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/community/feed:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar feed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/feed
 * Criar novo post
 * Body: { tracker_id, content, post_type }
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
    const { tracker_id, content, post_type } = body;

    if (!tracker_id || !content || !post_type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: tracker_id, content, post_type' },
        { status: 400 }
      );
    }

    // Validar que o tracker pertence ao usuário
    const tracker = await getTracker(tracker_id);

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

    // Validar conteúdo
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 || trimmedContent.length > 280) {
      return NextResponse.json(
        { error: 'Post deve ter entre 1 e 280 caracteres' },
        { status: 400 }
      );
    }

    // Validar tipo de post
    const validTypes = ['victory', 'challenge', 'tip', 'general'];
    if (!validTypes.includes(post_type)) {
      return NextResponse.json(
        { error: 'Tipo de post inválido' },
        { status: 400 }
      );
    }

    const communityName = user.nickname || tracker.community_name_custom || tracker.community_name;

    const post = await createPost(
      tracker_id,
      communityName,
      tracker.current_streak_days,
      trimmedContent,
      post_type
    );

    if (!post) {
      return NextResponse.json(
        { error: 'Erro ao criar post' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { post, message: 'Post criado com sucesso!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/community/feed:', error);
    return NextResponse.json(
      { error: 'Erro ao criar post' },
      { status: 500 }
    );
  }
}
