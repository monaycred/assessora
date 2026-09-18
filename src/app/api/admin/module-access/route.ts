import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAccessUser, MODULE_KEYS } from '@/lib/access';

export async function PATCH(request: NextRequest) {
  const admin = await getAccessUser();
  if (admin?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { user_profile_id, module_key, enabled, expires_at } = await request.json();
  if (!user_profile_id || !MODULE_KEYS.includes(module_key) || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  if (expires_at && Number.isNaN(Date.parse(expires_at))) {
    return NextResponse.json({ error: 'Validade inválida' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: target } = await db.from('user_profiles')
    .select('id, role').eq('id', user_profile_id).maybeSingle();
  if (!target || target.role === 'admin') {
    return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 });
  }
  const { error } = await db.from('user_module_access').upsert({
    user_profile_id,
    module_key,
    enabled,
    source: module_key === 'addiction' ? 'free' : 'admin',
    expires_at: expires_at || null,
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from('audit_logs').insert({
    user_id: admin.id,
    action: enabled ? 'module_granted' : 'module_revoked',
    entity_type: 'user_module_access',
    new_data: { user_profile_id, module_key, enabled, expires_at: expires_at || null },
  });
  return NextResponse.json({ ok: true });
}
