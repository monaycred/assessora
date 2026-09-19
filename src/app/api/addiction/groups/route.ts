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
  const { data: featured } = await db.from('support_groups')
    .select('id,name,description,category_slug').eq('is_featured', true).order('name');
  const featuredIds = (featured || []).map((group: any) => group.id);
  const { data: featuredMembers } = featuredIds.length ? await db.from('support_group_members')
    .select('group_id,user_profile_id').in('group_id', featuredIds).eq('status', 'active') : { data: [] };
  const { data: featuredShares } = featuredIds.length ? await db.from('support_group_shares')
    .select('group_id,tracker_id').in('group_id', featuredIds).eq('show_streak', true) : { data: [] };
  const sharedTrackerIds = (featuredShares || []).map((share: any) => share.tracker_id);
  const { data: featuredTrackers } = sharedTrackerIds.length ? await db.from('addiction_trackers')
    .select('id,started_at').in('id', sharedTrackerIds).eq('is_active', true) : { data: [] };
  const featuredGroups = (featured || []).map((group: any) => {
    const trackerIds = (featuredShares || []).filter((share: any) => share.group_id === group.id).map((share: any) => share.tracker_id);
    const days = (featuredTrackers || []).filter((tracker: any) => trackerIds.includes(tracker.id))
      .map((tracker: any) => Math.max(0, Math.floor((Date.now() - new Date(tracker.started_at).getTime()) / 86400000)));
    return { ...group,
      member_count: (featuredMembers || []).filter((member: any) => member.group_id === group.id).length,
      best_days: days.length ? Math.max(...days) : 0,
      joined: ids.includes(group.id),
    };
  });
  if (!ids.length && user.role !== 'admin') return NextResponse.json({ groups: [], featured_groups: featuredGroups });
  let groupQuery = db.from('support_groups').select('*').order('created_at', { ascending: false });
  if (user.role !== 'admin') groupQuery = groupQuery.in('id', ids);
  const { data: groups, error: groupsError } = await groupQuery;
  if (groupsError) return NextResponse.json({ error: 'Não foi possível carregar os grupos' }, { status: 500 });
  const managedIds = (groups || []).filter((group: any) => user.role === 'admin' ||
    memberships?.some((member: any) => member.group_id === group.id && ['owner', 'moderator'].includes(member.role)))
    .map((group: any) => group.id);
  const { data: pendingMembers } = managedIds.length
    ? await db.from('support_group_members').select('group_id').in('group_id', managedIds).eq('status', 'pending')
    : { data: [] };
  const groupIds=(groups||[]).map((group:any)=>group.id);
  const{data:activeGroupMembers}=groupIds.length?await db.from('support_group_members').select('group_id,user_profile_id,nickname').in('group_id',groupIds).eq('status','active'):{data:[]};
  const memberProfileIds=[...new Set((activeGroupMembers||[]).map((member:any)=>member.user_profile_id))];
  const[{data:groupProfiles},{data:groupTrackers}]=await Promise.all([
    memberProfileIds.length?db.from('user_profiles').select('id,nickname,avatar_url').in('id',memberProfileIds):Promise.resolve({data:[]}),
    memberProfileIds.length?db.from('addiction_trackers').select('user_id,current_streak_days').in('user_id',memberProfileIds).eq('is_active',true):Promise.resolve({data:[]}),
  ]);
  return NextResponse.json({ groups: (groups || []).map((group: any) => ({
    ...group,
    membership: user.role === 'admin'
      ? (memberships?.find((member: any) => member.group_id === group.id && member.role === 'owner') || { role: 'admin', status: 'active' })
      : memberships?.find((member: any) => member.group_id === group.id),
    pending_count: (pendingMembers || []).filter((member: any) => member.group_id === group.id).length,
    member_count:(activeGroupMembers||[]).filter((member:any)=>member.group_id===group.id).length,
    ...(()=>{const ranking=(activeGroupMembers||[]).filter((member:any)=>member.group_id===group.id).map((member:any)=>{const profile=(groupProfiles||[]).find((p:any)=>p.id===member.user_profile_id);const days=Math.max(0,...(groupTrackers||[]).filter((tracker:any)=>tracker.user_id===member.user_profile_id).map((tracker:any)=>tracker.current_streak_days||0));return{user_profile_id:member.user_profile_id,nickname:profile?.nickname||member.nickname||'Participante',avatar_url:profile?.avatar_url||null,days}}).sort((a:any,b:any)=>b.days-a.days);const ownIndex=ranking.findIndex((entry:any)=>entry.user_profile_id===user.id);return{best_days:ranking[0]?.days||0,ranking_preview:ranking.slice(0,3),leader:ranking[0]||null,own_days:ownIndex>=0?ranking[ownIndex].days:0,own_position:ownIndex>=0?ownIndex+1:null}})(),
  })), featured_groups: featuredGroups });
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
    image_url: /^https:\/\//i.test(String(body.image_url || '')) ? String(body.image_url) : null,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { error: memberError } = await db.from('support_group_members').insert({
    group_id: group.id, user_profile_id: user.id, role: 'owner', status: 'active',
    nickname: user.nickname || user.fullName.split(' ')[0],
  });
  if (memberError) {
    await db.from('support_groups').delete().eq('id', group.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }
  return NextResponse.json({ group }, { status: 201 });
}
