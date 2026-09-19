import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { dateInSaoPaulo } from '@/lib/addiction/checkins';

const fields = 'id, cpf, email, full_name, nickname, phone, avatar_url, birth_date, emergency_name, emergency_phone, emergency_relationship, role, briefing_enabled, briefing_time, referral_code, cep, address_street, address_number, address_complement, address_neighborhood, address_city, address_state';

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  if (/^55\d{10,11}$/.test(digits)) return digits;
  return null;
}

export async function GET() {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { data, error } = await createAdminClient().from('user_profiles')
    .select(fields).eq('id', user.id).single();
  return error ? NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    : NextResponse.json({ profile: data });
}

export async function PATCH(request: NextRequest) {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }
  const db = createAdminClient();

  if (body.action === 'details') {
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
    const phone = normalizePhone(body.phone);
    const birthDate = typeof body.birth_date === 'string' && body.birth_date ? body.birth_date : null;
    const emergencyName = typeof body.emergency_name === 'string' ? body.emergency_name.trim() : '';
    const emergencyPhone = body.emergency_phone ? normalizePhone(body.emergency_phone) : null;
    const emergencyRelationship = typeof body.emergency_relationship === 'string' ? body.emergency_relationship.trim() : '';
    const address = {
      cep: String(body.cep || '').replace(/\D/g, ''), address_street: String(body.address_street || '').trim(),
      address_number: String(body.address_number || '').trim(), address_complement: String(body.address_complement || '').trim() || null,
      address_neighborhood: String(body.address_neighborhood || '').trim(), address_city: String(body.address_city || '').trim(),
      address_state: String(body.address_state || '').trim().toUpperCase(),
    };
    if (fullName.length < 2 || fullName.length > 120 || nickname.length < 2 || nickname.length > 32 || !phone) {
      return NextResponse.json({ error: 'Confira nome, apelido e WhatsApp com DDD' }, { status: 400 });
    }
    if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T12:00:00Z`)) || new Date(`${birthDate}T12:00:00Z`).toISOString().slice(0, 10) !== birthDate || birthDate > dateInSaoPaulo() || birthDate < '1900-01-01')) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 });
    }
    if (emergencyName.length > 120 || emergencyRelationship.length > 60 || Boolean(emergencyName) !== Boolean(emergencyPhone) || (body.emergency_phone && !emergencyPhone)) {
      return NextResponse.json({ error: 'Informe nome e telefone válidos do contato de emergência' }, { status: 400 });
    }
    if (!birthDate || !emergencyName || !emergencyPhone || !emergencyRelationship || !/^\d{8}$/.test(address.cep) || !address.address_street || !address.address_number || !address.address_neighborhood || !address.address_city || !/^[A-Z]{2}$/.test(address.address_state)) {
      return NextResponse.json({ error: 'Preencha data de nascimento, contato de emergência e endereço completo' }, { status: 400 });
    }
    const { error } = await db.rpc('update_profile_details', {
      p_profile_id: user.id, p_full_name: fullName, p_nickname: nickname, p_phone: phone,
      p_birth_date: birthDate, p_emergency_name: emergencyName || null,
      p_emergency_phone: emergencyPhone, p_emergency_relationship: emergencyRelationship || null,
    });
    if (error) {
      return NextResponse.json({ error: error.code === '23505' ? 'Este WhatsApp já está cadastrado' : 'Não foi possível salvar o perfil' }, { status: 400 });
    }
    const { error: addressError } = await db.from('user_profiles').update(address).eq('id', user.id);
    if (addressError) return NextResponse.json({ error: 'Perfil salvo, mas não foi possível atualizar o endereço' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'email') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }
    const session = await createClient();
    const { error } = await session.auth.updateUser({ email });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: 'Confira seu e-mail para confirmar a alteração.' });
  }

  if (body.action === 'briefing') {
    if (typeof body.briefing_enabled !== 'boolean' || typeof body.briefing_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.briefing_time)) {
      return NextResponse.json({ error: 'Preferências inválidas' }, { status: 400 });
    }
    const { error } = await db.from('user_profiles').update({
      briefing_enabled: body.briefing_enabled, briefing_time: body.briefing_time,
    }).eq('id', user.id);
    return error ? NextResponse.json({ error: 'Não foi possível salvar o briefing' }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
