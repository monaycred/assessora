import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { data, error } = await createAdminClient().from('personal_tasks').select('*')
    .or(`owner_profile_id.eq.${user.id},assigned_profile_id.eq.${user.id}`).order('status').order('due_at');
  return error ? NextResponse.json({ error: 'Erro ao carregar tarefas' }, { status: 500 }) : NextResponse.json({ tasks: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const title = String(body?.title || '').trim();
  if (title.length < 2 || title.length > 160) return NextResponse.json({ error: 'Informe o título da tarefa' }, { status: 400 });
  const offsets=Array.isArray(body?.reminder_offsets_minutes)?body.reminder_offsets_minutes.map(Number).filter((n:number)=>[0,15,30,60,180,1440].includes(n)):[];
  if(body?.whatsapp_enabled&&(!body?.due_at||!offsets.length))return NextResponse.json({error:'Escolha o prazo e quando avisar'},{status:400});
  const { data, error } = await createAdminClient().from('personal_tasks').insert({
    owner_profile_id: user.id, title, description: String(body?.description || '').trim() || null,
    due_at: body?.due_at || null, priority: ['low','normal','high'].includes(body?.priority) ? body.priority : 'normal',whatsapp_enabled:body?.whatsapp_enabled===true,reminder_offsets_minutes:offsets,
  }).select('*').single();
  return error ? NextResponse.json({ error: 'Não foi possível criar a tarefa' }, { status: 500 }) : NextResponse.json({ task: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.id || !['pending','done'].includes(body?.status)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const db = createAdminClient();
  const { data: task } = await db.from('personal_tasks').select('owner_profile_id,assigned_profile_id').eq('id', body.id).maybeSingle();
  if (!task || (task.owner_profile_id !== user.id && task.assigned_profile_id !== user.id)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { error } = await db.from('personal_tasks').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.id);
  return error ? NextResponse.json({ error: 'Não foi possível atualizar' }, { status: 500 }) : NextResponse.json({ ok: true });
}
