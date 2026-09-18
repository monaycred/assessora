import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { cleanCPF, validateCPF } from '@/lib/utils';
import { sendPasswordRecovery } from '@/lib/auth/password-recovery';

const genericMessage = 'Se houver uma conta ativa com esse CPF, enviaremos um link ao e-mail cadastrado.';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const cpf = cleanCPF(String(body?.cpf || ''));
  if (!validateCPF(cpf)) return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 });

  const db = createAdminClient();
  const { data: profile, error: lookupError } = await db.from('user_profiles')
    .select('email, is_active').eq('cpf', cpf).maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'Não foi possível consultar o cadastro.' }, { status: 500 });
  if (!profile?.is_active || !profile.email) return NextResponse.json({ message: genericMessage });

  const { error } = await sendPasswordRecovery(profile.email);
  if (error) {
    console.error('[Password recovery] Failed to send:', error.message);
    return NextResponse.json({ error: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.' }, { status: 503 });
  }
  return NextResponse.json({ message: genericMessage });
}
