import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validateCPF } from "@/lib/utils";
import { sendTextMessage } from "@/lib/evolution/client";

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, nickname, cpf, email, phone, password, birth_date, cep,
      address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state, emergency_name, emergency_phone,
      emergency_relationship, referral_code, referral_relationship } = body;

    // Validações
    if (!full_name?.trim() || !nickname?.trim() || !cpf || !email?.trim() || !password ||
      !/^55\d{10,11}$/.test(String(phone || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(birth_date || '')) ||
      !/^\d{8}$/.test(String(cep || '')) || !address_street?.trim() || !address_number?.trim() ||
      !address_neighborhood?.trim() || !address_city?.trim() || !/^[A-Z]{2}$/.test(String(address_state || '')) ||
      !emergency_name?.trim() || !/^55\d{10,11}$/.test(String(emergency_phone || '')) || !emergency_relationship?.trim()) {
      return NextResponse.json(
        { error: "Preencha todos os dados obrigatórios com informações válidas" },
        { status: 400 }
      );
    }

    if (!validateCPF(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: referrer } = referral_code ? await supabase.from('user_profiles')
      .select('id').eq('referral_code', String(referral_code).toUpperCase()).maybeSingle() : { data: null };
    if (referral_code && !referrer) return NextResponse.json({ error: 'Link de indicação inválido' }, { status: 400 });

    // Verifica se CPF já existe
    const { data: existingCPF } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("cpf", cpf)
      .single();

    if (existingCPF) {
      return NextResponse.json(
        { error: "CPF já cadastrado no sistema" },
        { status: 409 }
      );
    }

    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      if (authError?.message?.includes("already registered")) {
        return NextResponse.json(
          { error: "E-mail já cadastrado" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError?.message || "Erro ao criar conta" },
        { status: 500 }
      );
    }

    // Cria perfil do usuário (inativo até aprovação)
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: authData.user.id,
        full_name,
        nickname,
        cpf,
        email,
        phone: phone || null,
        role: "member",
        is_active: false,
        birth_date, cep, address_street, address_number,
        address_complement: address_complement?.trim() || null,
        address_neighborhood, address_city, address_state,
        emergency_name, emergency_phone, emergency_relationship,
        referred_by: referrer?.id || null,
        referral_relationship: referrer ? String(referral_relationship || '').trim() : null,
      });

    if (profileError) {
      // Rollback: exclui usuário Auth se falhou o perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Erro ao salvar perfil" },
        { status: 500 }
      );
    }

    // Cria contato pendente de aprovação (aparece em Aprovações)
    const { error: contactError } = await supabase.from("contacts").insert({
      phone_number: phone || "",
      name: full_name,
      cpf,
      email,
      birth_date,
      cep,
      address_json: { logradouro: address_street, numero: address_number, complemento: address_complement || '', bairro: address_neighborhood, localidade: address_city, uf: address_state },
      status: "aguardando_aprovacao",
      user_id: authData.user.id,
      onboarding_step: 6,
    });
    if (contactError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Erro ao enviar cadastro para aprovação" }, { status: 500 });
    }

    // Registra log
    await supabase.from("audit_logs").insert({
      user_id: authData.user.id,
      action: "user_registered",
      entity_type: "user",
      new_data: { cpf, email, full_name, referred_by: referrer?.id || null, referral_relationship: referrer ? referral_relationship : null },
    });

    return NextResponse.json(
      { message: "Conta criada com sucesso!", user_id: authData.user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Auth/Register]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
