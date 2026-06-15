import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validateCPF } from "@/lib/utils";
import { sendTextMessage } from "@/lib/evolution/client";

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const { full_name, cpf, email, phone, password } = await req.json();

    // Validações
    if (!full_name || !cpf || !email || !password) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, CPF, email e senha" },
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
        cpf,
        email,
        phone: phone || null,
        role: "member",
        is_active: false,
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
    await supabase.from("contacts").insert({
      phone_number: phone || "",
      name: full_name,
      cpf,
      email,
      status: "aguardando_aprovacao",
      user_id: authData.user.id,
      onboarding_step: 6,
    });

    // Registra log
    await supabase.from("audit_logs").insert({
      user_id: authData.user.id,
      action: "user_registered",
      entity_type: "user",
      new_data: { cpf, email, full_name },
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
