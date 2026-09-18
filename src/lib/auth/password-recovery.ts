import { createAdminClient } from '@/lib/supabase/server';

export async function sendPasswordRecovery(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assessora.gedaias.com';
  const redirectTo = new URL('/redefinir-senha', appUrl).toString();
  const supabase = createAdminClient();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
