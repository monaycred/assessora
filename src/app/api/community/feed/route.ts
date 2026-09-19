import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';
import { getPostComments, getPostReactions, getTracker } from '@/lib/addiction/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getAccessUser('addiction');
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const db = createAdminClient();
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';
    const groupId = url.searchParams.get('group_id');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);
    const { data: memberships } = await db.from('support_group_members').select('group_id').eq('user_profile_id', user.id).eq('status', 'active');
    const groupIds = (memberships || []).map((m: any) => m.group_id);
    const { data: targets } = groupIds.length ? await db.from('community_post_groups').select('post_id,group_id').in('group_id', groupIds) : { data: [] };
    const visibleIds = [...new Set((targets || []).map((t: any) => t.post_id))];
    let query = db.from('community_posts').select('*').eq('is_deleted', false);
    if (type !== 'all') query = query.eq('post_type', type);
    if (groupId) {
      if (!groupIds.includes(groupId)) return NextResponse.json({ error: 'Você não participa deste grupo' }, { status: 403 });
      const ids = (targets || []).filter((t: any) => t.group_id === groupId).map((t: any) => t.post_id);
      if (!ids.length) return NextResponse.json({ posts: [] });
      query = query.in('id', ids);
    } else if (visibleIds.length) query = query.or(`audience_scope.eq.global,id.in.(${visibleIds.join(',')})`);
    else query = query.eq('audience_scope', 'global');
    const { data: posts, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    const trackerIds = [...new Set((posts || []).map((p: any) => p.tracker_id))];
    const { data: trackers } = trackerIds.length ? await db.from('addiction_trackers').select('id,user_id').in('id', trackerIds) : { data: [] };
    const userIds = [...new Set((trackers || []).map((t: any) => t.user_id))];
    const { data: profiles } = userIds.length ? await db.from('user_profiles').select('id,nickname,avatar_url').in('id', userIds) : { data: [] };
    const postIds = (posts || []).map((p: any) => p.id);
    const { data: postTargets } = postIds.length ? await db.from('community_post_groups').select('post_id,group_id').in('post_id', postIds) : { data: [] };
    const targetGroupIds = [...new Set((postTargets || []).map((t: any) => t.group_id))];
    const { data: groups } = targetGroupIds.length ? await db.from('support_groups').select('id,name').in('id', targetGroupIds) : { data: [] };
    const enriched = await Promise.all((posts || []).map(async (post: any) => {
      const tracker = (trackers || []).find((t: any) => t.id === post.tracker_id);
      const profile = (profiles || []).find((p: any) => p.id === tracker?.user_id);
      const reactions = await getPostReactions(post.id);
      const comments = await getPostComments(post.id);
      const names = (postTargets || []).filter((t: any) => t.post_id === post.id).map((t: any) => (groups || []).find((g: any) => g.id === t.group_id)?.name).filter(Boolean);
      return { ...post, community_name: profile?.nickname || post.community_name, avatar_url: profile?.avatar_url || null,
        target_groups: names, reactions, comment_count: comments.length,
        reactions_total: Object.values(reactions).reduce((a: number, b: any) => a + Number(b), 0) };
    }));
    return NextResponse.json({ posts: enriched });
  } catch (error) {
    console.error('GET community feed:', error);
    return NextResponse.json({ error: 'Erro ao buscar feed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAccessUser('addiction');
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const body = await request.json();
    const tracker = await getTracker(String(body.tracker_id || ''));
    if (!tracker || tracker.user_id !== user.id) return NextResponse.json({ error: 'Jornada inválida' }, { status: 403 });
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const postType = String(body.post_type || 'general');
    const audience = body.audience === 'groups' ? 'groups' : 'global';
    const groupIds: string[] = Array.isArray(body.group_ids) ? [...new Set(body.group_ids.map(String))] as string[] : [];
    if (!title || title.length > 100 || !content || content.length > 2000) return NextResponse.json({ error: 'Informe um título e um texto de até 2.000 caracteres' }, { status: 400 });
    if (!['victory','challenge','tip','general'].includes(postType)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    const db = createAdminClient();
    if (audience === 'groups' && user.role !== 'admin') {
      const { data: memberships } = await db.from('support_group_members').select('group_id').eq('user_profile_id', user.id).eq('status', 'active').in('group_id', groupIds);
      if (!groupIds.length || (memberships || []).length !== groupIds.length) return NextResponse.json({ error: 'Escolha ao menos um grupo do qual você participa' }, { status: 400 });
    }
    const { data: post, error } = await db.from('community_posts').insert({
      tracker_id: tracker.id, community_name: user.nickname || tracker.community_name_custom || tracker.community_name,
      current_streak_days: tracker.current_streak_days, title, content, post_type: postType,
      image_url: body.image_url || null, audience_scope: audience,
    }).select('*').single();
    if (error) throw error;
    if (audience === 'groups') {
      const { error: targetError } = await db.from('community_post_groups').insert(groupIds.map(group_id => ({ post_id: post.id, group_id })));
      if (targetError) { await db.from('community_posts').delete().eq('id', post.id); throw targetError; }
    }
    return NextResponse.json({ post, message: 'Publicação criada!' }, { status: 201 });
  } catch (error) {
    console.error('POST community feed:', error);
    return NextResponse.json({ error: 'Erro ao publicar' }, { status: 500 });
  }
}
