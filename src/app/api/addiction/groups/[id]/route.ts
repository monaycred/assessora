import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessUser } from '@/lib/access';
import { calculateDaysSince } from '@/lib/addiction/utils';

type Context = { params: Promise<{ id: string }> };

async function contextFor(id: string, profileId: string) {
  const db = createAdminClient();
  const { data: group } = await db.from('support_groups').select('*').eq('id', id).maybeSingle();
  const { data: membership } = await db.from('support_group_members').select('*')
    .eq('group_id', id).eq('user_profile_id', profileId).maybeSingle();
  return { db, group, membership };
}

export async function GET(_request: NextRequest, { params }: Context) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { id } = await params;
  const { db, group, membership } = await contextFor(id, user.id);
  if (!group || ((!membership || membership.status === 'removed') && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
  }
  if (membership?.status === 'pending' && user.role !== 'admin') {
    return NextResponse.json({ group, membership, pending: true });
  }

  const isManager = membership?.role === 'owner' || membership?.role === 'moderator' || user.role === 'admin';
  const { data: allMembers } = await db.from('support_group_members').select('user_profile_id, role, status, nickname')
    .eq('group_id', id).in('status', isManager ? ['active', 'pending'] : ['active']);
  const memberIds = (allMembers || []).map((member: any) => member.user_profile_id);
  const { data: publicProfiles } = memberIds.length
    ? await db.from('user_profiles').select('id, nickname, avatar_url').in('id', memberIds)
    : { data: [] };
  const members = (allMembers || []).map((member: any) => {
    const profile = publicProfiles?.find((item: any) => item.id === member.user_profile_id);
    return { ...member, nickname: profile?.nickname || member.nickname, avatar_url: profile?.avatar_url || null };
  });
  const activeMembers = members.filter((member: any) => member.status === 'active');
  const { data: posts } = await db.from('support_group_posts').select('id, author_profile_id, content, created_at')
    .eq('group_id', id).order('created_at', { ascending: false }).limit(50);
  const postIds = (posts || []).map((post: any) => post.id);
  const { data: comments } = postIds.length
    ? await db.from('support_group_post_comments').select('id, post_id, author_profile_id, content, created_at').in('post_id', postIds).order('created_at')
    : { data: [] };
  const { data: ownTrackers } = await db.from('addiction_trackers').select('id, name, started_at')
    .eq('user_id', user.id).eq('is_active', true);
  const { data: shares } = await db.from('support_group_shares').select('tracker_id, show_streak').eq('group_id', id);

  let ranking: { nickname: string; avatar_url: string | null; days: number }[] = [];
  if (group.ranking_enabled && memberIds.length) {
    const { data: trackers } = await db.from('addiction_trackers').select('id, user_id, started_at').in('user_id', memberIds).eq('is_active', true);
    ranking = activeMembers.map((member: any) => {
      const days = (trackers || []).filter((tracker: any) => tracker.user_id === member.user_profile_id).map((tracker: any) => calculateDaysSince(tracker.started_at));
      return { nickname: member.nickname || 'Participante', avatar_url: member.avatar_url || null, days: days.length ? Math.max(...days) : 0 };
    }).sort((a: { days: number }, b: { days: number }) => b.days - a.days);
  }

  return NextResponse.json({
    group,
    membership: user.role === 'admin' && membership?.role !== 'owner' ? { role: 'admin', status: 'active' } : membership,
    members,
    posts: (posts || []).map((post: any) => ({ ...post,
      nickname: activeMembers.find((member: any) => member.user_profile_id === post.author_profile_id)?.nickname || 'Participante',
      avatar_url: activeMembers.find((member: any) => member.user_profile_id === post.author_profile_id)?.avatar_url || null,
      comments: (comments || []).filter((comment: any) => comment.post_id === post.id).map((comment: any) => ({
        ...comment,
        nickname: activeMembers.find((member: any) => member.user_profile_id === comment.author_profile_id)?.nickname || 'Participante',
        avatar_url: activeMembers.find((member: any) => member.user_profile_id === comment.author_profile_id)?.avatar_url || null,
      })),
    })),
    own_trackers: (ownTrackers || []).map((tracker: any) => ({ ...tracker,
      shared: !!shares?.some((share: any) => share.tracker_id === tracker.id),
      show_streak: !!shares?.find((share: any) => share.tracker_id === tracker.id)?.show_streak,
    })),
    ranking,
  });
}

export async function POST(request: NextRequest, { params }: Context) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { id } = await params;
  const { db, group, membership } = await contextFor(id, user.id);
  if (!group || (membership?.status !== 'active' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Sem permissão no grupo' }, { status: 403 });
  }
  const body = await request.json();
  const isManager = membership?.role === 'owner' || membership?.role === 'moderator' || user.role === 'admin';

  if (body.action === 'post') {
    const content = String(body.content || '').trim();
    if (!content || content.length > 500) return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 });
    const { error } = await db.from('support_group_posts').insert({
      group_id: id, author_profile_id: user.id, content,
    });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body.action === 'comment') {
    const content = String(body.content || '').trim();
    if (!content || content.length > 300) return NextResponse.json({ error: 'Comentário inválido' }, { status: 400 });
    const { data: post } = await db.from('support_group_posts').select('id').eq('id', body.post_id).eq('group_id', id).maybeSingle();
    if (!post) return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 });
    const { error } = await db.from('support_group_post_comments').insert({ post_id: post.id, author_profile_id: user.id, content });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body.action === 'share') {
    const { data: tracker } = await db.from('addiction_trackers').select('id')
      .eq('id', body.tracker_id).eq('user_id', user.id).maybeSingle();
    if (!tracker) return NextResponse.json({ error: 'Rastreador não encontrado' }, { status: 404 });
    const { error } = body.enabled
      ? await db.from('support_group_shares').upsert({ group_id: id, tracker_id: tracker.id, show_streak: body.show_streak === true })
      : await db.from('support_group_shares').delete().eq('group_id', id).eq('tracker_id', tracker.id);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (body.action === 'invite') {
    const token = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { error } = await db.from('support_group_invites').insert({
      group_id: id, token_hash: tokenHash, created_by: user.id,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ token });
  }

  if (body.action === 'member' && isManager) {
    if (!['active', 'removed'].includes(body.status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    const { data: target } = await db.from('support_group_members').select('role, status')
      .eq('group_id', id).eq('user_profile_id', body.user_profile_id).maybeSingle();
    if (!target || target.role === 'owner') return NextResponse.json({ error: 'Membro inválido' }, { status: 400 });
    const { error } = await db.from('support_group_members').update({ status: body.status })
      .eq('group_id', id).eq('user_profile_id', body.user_profile_id);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
