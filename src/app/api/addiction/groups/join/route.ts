import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessUser } from '@/lib/access';

export async function POST(request: NextRequest) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Faça login com sua conta aprovada' }, { status: 401 });
  const { token, nickname } = await request.json();
  const displayName = String(nickname || '').trim();
  if (displayName.length < 2 || displayName.length > 24) {
    return NextResponse.json({ error: 'Escolha um apelido de 2 a 24 caracteres' }, { status: 400 });
  }
  if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{20,100}$/.test(token)) {
    return NextResponse.json({ error: 'Convite inválido' }, { status: 400 });
  }
  const db = createAdminClient();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data: invite } = await db.from('support_group_invites').select('*')
    .eq('token_hash', tokenHash).maybeSingle();
  if (!invite || invite.revoked_at || new Date(invite.expires_at) <= new Date() || invite.uses >= invite.max_uses) {
    return NextResponse.json({ error: 'Convite expirado ou inválido' }, { status: 400 });
  }
  const { data: group } = await db.from('support_groups').select('id, name, join_policy').eq('id', invite.group_id).single();
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
  const { data: existing } = await db.from('support_group_members').select('status')
    .eq('group_id', group.id).eq('user_profile_id', user.id).maybeSingle();
  if (existing?.status === 'active' || existing?.status === 'pending') {
    return NextResponse.json({ group_id: group.id, status: existing.status });
  }
  const status = group.join_policy === 'link' ? 'active' : 'pending';
  const { error } = await db.from('support_group_members').upsert({
    group_id: group.id, user_profile_id: user.id, role: 'member', status, nickname: displayName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from('support_group_invites').update({ uses: invite.uses + 1 }).eq('id', invite.id);
  return NextResponse.json({ group_id: group.id, group_name: group.name, status });
}
