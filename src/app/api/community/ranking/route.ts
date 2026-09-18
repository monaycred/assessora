// ============================================================
// API - Community Ranking
// GET /api/community/ranking
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCommunityRanking } from '@/lib/addiction/database';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/community/ranking
 * Query params: limit=10
 * Retorna top trackers públicos por dias atuais
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    const ranking = await getCommunityRanking(limit);
    const ids = [...new Set(ranking.map((entry) => entry.user_id))];
    const { data: profiles } = ids.length
      ? await createAdminClient().from('user_profiles').select('id, nickname, avatar_url').in('id', ids)
      : { data: [] };

    // Formatar resposta com posições
    const formatted = ranking.map((entry, index) => ({
      position: index + 1,
      community_name: profiles?.find((profile: any) => profile.id === entry.user_id)?.nickname || entry.community_name_custom || entry.community_name,
      avatar_url: profiles?.find((profile: any) => profile.id === entry.user_id)?.avatar_url || null,
      current_streak_days: entry.current_streak_days,
      best_streak_days: entry.best_streak_days,
    }));

    return NextResponse.json(
      {
        ranking: formatted,
        total: formatted.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/community/ranking:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar ranking' },
      { status: 500 }
    );
  }
}
