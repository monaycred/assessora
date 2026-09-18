import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessUser } from '@/lib/access';

export async function GET() {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const db = createAdminClient();
  const { data: memberships, error } = await db.from('support_group_members')
    .select('group_id, role, status').eq('user_profile_id', user.id).neq('status', 'removed');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (memberships || []).map((membership: any) => membership.group_id);
  if (!ids.length) return NextResponse.json({ groups: [] });
  const { data: groups } = await db.from('support_groups').select('*').in('id', ids).order('created_at', { ascending: false });
  return NextResponse.json({ groups: (groups || []).map((group: any) => ({
    ...group,
    membership: memberships?.find((member: any) => member.group_id === group.id),
  })) });
}

export async function POST(request: NextRequest) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await request.json();
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const groupType = body.group_type === 'challenge' ? 'challenge' : 'club';
  if (name.length < 3 || name.length > 80 || description.length > 500) {
    return NextResponse.json({ error: 'Nome ou descrição inválidos' }, { status: 400 });
  }
  if (groupType === 'challenge' && (!/^\d{4}-\d{2}-\d{2}$/.test(body.starts_on || '') || !/^\d{4}-\d{2}-\d{2}$/.test(body.ends_on || '') || body.ends_on < body.starts_on)) {
    return NextResponse.json({ error: 'Informe início e fim do desafio' }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: group, error } = await db.from('support_groups').insert({
    owner_profile_id: user.id,
    name,
    description: description || null,
    group_type: groupType,
    starts_on: groupType === 'challenge' ? body.starts_on : null,
    ends_on: groupType === 'challenge' ? body.ends_on : null,
    join_policy: body.join_policy === 'link' ? 'link' : 'approval',
    ranking_enabled: body.ranking_enabled === true,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { error: memberError } = await db.from('support_group_members').insert({
    group_id: group.id, user_profile_id: user.id, role: 'owner', status: 'active',
    nickname: user.fullName.split(' ')[0],
  });
  if (memberError) {
    await db.from('support_groups').delete().eq('id', group.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
  return NextResponse.json({ group }, { status: 201 });
}
