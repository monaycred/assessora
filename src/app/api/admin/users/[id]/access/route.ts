import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPasswordRecovery } from '@/lib/auth/password-recovery';
import { sendTextMessage } from '@/lib/evolution/client';
import { recoveryErrorMessage } from '@/lib/auth/recovery-error';
import { formatPhone } from '@/lib/utils';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAccessUser();
  if (admin?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== 'activate' && action !== 'deactivate' && action !== 'send_recovery' && action !== 'send_recovery_whatsapp') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: target, error: lookupError } = await db.from('user_profiles')
    .select('id, user_id, email, is_active, role').eq('id', id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'Erro ao consultar usuário' }, { status: 500 });
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  if (action === 'send_recovery' || action === 'send_recovery_whatsapp') {
    if (!target.is_active) return NextResponse.json({ error: 'Ative a conta antes de enviar o link' }, { status: 400 });
    if (!target.email) return NextResponse.json({ error: 'Usuário sem e-mail cadastrado' }, { status: 400 });
    let recoveryDestination = target.email;
    if (action === 'send_recovery') {
      const { error } = await sendPasswordRecovery(target.email);
      if (error) {
        console.error('[Admin recovery] Failed to send:', error.message);
        return NextResponse.json({ error: recoveryErrorMessage(error.message) }, { status: error.status === 429 ? 429 : 503 });
      }
    } else {
      const { data: contact } = await db.from('contacts')
        .select('phone_number, status').eq('user_id', target.user_id).eq('status', 'aprovado').maybeSingle();
      if (!contact?.phone_number) return NextResponse.json({ error: 'Não há WhatsApp aprovado para esta conta' }, { status: 400 });
      recoveryDestination = formatPhone(contact.phone_number);
      const redirectTo = new URL('/redefinir-senha', process.env.NEXT_PUBLIC_APP_URL || 'https://assessora.gedaias.com').toString();
      const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email: target.email, options: { redirectTo } });
      if (error || !data?.properties?.action_link) {
        console.error('[Admin recovery] Failed to generate link:', error?.message);
        return NextResponse.json({ error: 'Não foi possível gerar o link de recuperação' }, { status: 503 });
      }
      try {
        await sendTextMessage(contact.phone_number, `Iasmin: use este link para criar uma nova senha. Ele é pessoal; não o compartilhe.\n\n${data.properties.action_link}`);
      } catch {
        return NextResponse.json({ error: 'Não foi possível enviar pelo WhatsApp' }, { status: 503 });
      }
    }
    await db.from('audit_logs').insert({ user_id: admin.id, action: 'password_recovery_sent', entity_type: 'user_profiles', new_data: { user_profile_id: id, channel: action === 'send_recovery' ? 'email' : 'whatsapp' } });
    return NextResponse.json({ ok: true, message: `Link enviado para ${recoveryDestination}.` });
  }

  if (target.id === admin.id && action === 'deactivate') {
    return NextResponse.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 });
  }
  const activate = action === 'activate';
  if (target.is_active === activate && !activate) return NextResponse.json({ ok: true, is_active: activate });
  const { error: updateError } = await db.from('user_profiles').update({ is_active: activate }).eq('id', id);
  if (updateError) return NextResponse.json({ error: 'Não foi possível alterar o acesso' }, { status: 500 });

  if (activate) {
    const { error: contactError } = await db.from('contacts').update({ status: 'aprovado', approved_at: new Date().toISOString() }).eq('user_id', target.user_id);
    const { error: accessError } = await db.from('user_module_access').upsert({
      user_profile_id: id, module_key: 'addiction', enabled: true, source: 'free', updated_by: admin.id,
    });
    if (contactError || accessError) {
      console.error('[User access] Activation partially failed:', contactError?.message, accessError?.message);
      return NextResponse.json({ error: 'Conta ativada, mas houve falha ao liberar o acesso. Tente novamente.' }, { status: 500 });
    }
  }
  await db.from('audit_logs').insert({
    user_id: admin.id, action: activate ? 'user_activated' : 'user_deactivated',
    entity_type: 'user_profiles', new_data: { user_profile_id: id },
  });
  return NextResponse.json({ ok: true, is_active: activate });
}
