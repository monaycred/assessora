import { createAdminClient, createClient } from '@/lib/supabase/server';

export const MODULE_KEYS = [
  'addiction', 'financeiro', 'lembretes', 'agenda', 'projetos',
  'documentos', 'listas', 'desejos', 'viagens', 'integracoes',
] as const;

export type ModuleKey = typeof MODULE_KEYS[number];

export interface AccessUser {
  id: string; // user_profiles.id, used by application tables
  authUserId: string; // auth.users.id
  role: 'admin' | 'member';
  fullName: string;
  phone: string | null;
}

export async function getAccessUser(moduleKey?: ModuleKey): Promise<AccessUser | null> {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return null;

  const db = createAdminClient();
  const { data: profile } = await db.from('user_profiles')
    .select('id, user_id, role, is_active, full_name, phone')
    .eq('user_id', user.id).maybeSingle();
  if (!profile?.is_active) return null;

  if (moduleKey && profile.role !== 'admin') {
    const { data: access } = await db.from('user_module_access')
      .select('enabled, expires_at')
      .eq('user_profile_id', profile.id).eq('module_key', moduleKey).maybeSingle();
    if (!access?.enabled || (access.expires_at && new Date(access.expires_at) <= new Date())) {
      return null;
    }
  }

  return {
    id: profile.id,
    authUserId: user.id,
    role: profile.role,
    fullName: profile.full_name,
    phone: profile.phone,
  };
}
