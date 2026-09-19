// ============================================================
// API - Admin: Denúncias
// GET /api/admin/addiction/reports
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAccessUser } from '@/lib/access';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/addiction/reports
 * Busca denúncias pendentes (admin only)
 * Query: status=pending (padrão)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAccessUser();
    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    const { data: reports, error } = await supabase
      .from('community_reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const postIds = (reports || []).map((r: any) => r.post_id).filter(Boolean);
    const commentIds = (reports || []).map((r: any) => r.comment_id).filter(Boolean);
    const { data: posts } = postIds.length ? await supabase.from('community_posts').select('id,title,content,image_url,community_name').in('id', postIds) : { data: [] };
    const { data: comments } = commentIds.length ? await supabase.from('community_comments').select('id,content,community_name').in('id', commentIds) : { data: [] };
    const enriched = (reports || []).map((report: any) => ({ ...report,
      reported_content: report.post_id ? (posts || []).find((p: any) => p.id === report.post_id) : (comments || []).find((c: any) => c.id === report.comment_id),
    }));
    return NextResponse.json({ reports: enriched }, { status: 200 });
  } catch (error) {
    console.error('Error in GET reports:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar denúncias' },
      { status: 500 }
    );
  }
}
