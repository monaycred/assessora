import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAccessUser();
  if (admin?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== 'member' && role !== 'admin') {
    return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: target } = await db.from('user_profiles').select('id, role, is_active')
    .eq('id', id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  if (target.id === admin.id && role !== 'admin') {
    return NextResponse.json({ error: 'Você não pode remover seu próprio cargo de administrador' }, { status: 400 });
  }
  if (!target.is_active && role === 'admin') {
    return NextResponse.json({ error: 'Aprove a conta antes de torná-la administradora' }, { status: 400 });
  }
  if (target.role === role) return NextResponse.json({ ok: true, role });
  const { error } = await db.from('user_profiles').update({ role }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Não foi possível alterar o cargo' }, { status: 500 });
  await db.from('audit_logs').insert({
    user_id: admin.id, action: 'user_role_changed', entity_type: 'user_profiles',
    old_data: { role: target.role }, new_data: { user_profile_id: id, role },
  });
  return NextResponse.json({ ok: true, role });
}
