import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessUser } from '@/lib/access';
import { sendTextMessage } from '@/lib/evolution/client';

export async function POST(request: NextRequest) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Faça login com sua conta aprovada' }, { status: 401 });
  const { token, group_id, loyalty_accepted } = await request.json();
  const displayName = user.nickname || user.fullName.split(' ')[0];
  if (!group_id && (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{20,100}$/.test(token))) {
    return NextResponse.json({ error: 'Convite inválido' }, { status: 400 });
  }
  const db = createAdminClient();
  let invite: any = null;
  if (!group_id) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await db.from('support_group_invites').select('*').eq('token_hash', tokenHash).maybeSingle();
    invite = result.data;
    if (!invite || invite.revoked_at || new Date(invite.expires_at) <= new Date() || invite.uses >= invite.max_uses) {
      return NextResponse.json({ error: 'Convite expirado ou inválido' }, { status: 400 });
    }
  }
  const { data: group } = await db.from('support_groups').select('id, name, join_policy, is_featured, ranking_enabled, owner_profile_id')
    .eq('id', group_id || invite.group_id).single();
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
  if (group_id && !group.is_featured) return NextResponse.json({ error: 'Este grupo exige convite' }, { status: 403 });
  if (group.ranking_enabled && loyalty_accepted !== true) return NextResponse.json({ error: 'Aceite o compromisso de honestidade para participar do ranking' }, { status: 400 });
  const { data: existing } = await db.from('support_group_members').select('status')
    .eq('group_id', group.id).eq('user_profile_id', user.id).maybeSingle();
  if (existing?.status === 'active' || existing?.status === 'pending') {
    return NextResponse.json({ group_id: group.id, status: existing.status });
  }
  const status = group.join_policy === 'link' ? 'active' : 'pending';
  const { error } = await db.from('support_group_members').upsert({
    group_id: group.id, user_profile_id: user.id, role: 'member', status, nickname: displayName,
    loyalty_accepted_at: group.ranking_enabled ? new Date().toISOString() : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (invite) await db.from('support_group_invites').update({ uses: invite.uses + 1 }).eq('id', invite.id);
  if (status === 'pending') {
    await db.from('app_notifications').insert({recipient_profile_id:group.owner_profile_id,type:'group_request',title:'Pedido para entrar no grupo',message:`${displayName} quer entrar em ${group.name}`,entity_type:'group_request',entity_id:group.id,dedupe_key:`group-request:${group.id}:${user.id}`});
    const {data:owner}=await db.from('user_profiles').select('phone').eq('id',group.owner_profile_id).maybeSingle();
    if(owner?.phone) await sendTextMessage(owner.phone,`👥 *Pedido de entrada*\n\n${displayName} quer entrar em *${group.name}*.\n\nRevise no painel: https://assessora.gedaias.com/addiction/grupos/${group.id}`).catch(()=>false);
  }
  return NextResponse.json({ group_id: group.id, group_name: group.name, status });
}
