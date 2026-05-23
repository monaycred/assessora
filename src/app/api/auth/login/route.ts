import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/auth/login
// Recebe CPF, retorna email associado para login com Supabase
export async function POST(req: NextRequest) {
  try {
    const { cpf, password } = await req.json();

    if (!cpf) {
      return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Busca o perfil pelo CPF
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("email, is_active")
      .eq("cpf", cpf)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: "CPF não encontrado. Verifique seu cadastro." },
        { status: 404 }
      );
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { error: "Conta inativa. Entre em contato com o administrador." },
        { status: 403 }
      );
    }

    // Registra log de login
    await supabase.from("audit_logs").insert({
      action: "login_attempt",
      entity_type: "user",
      new_data: { cpf },
    });

    return NextResponse.json({ email: profile.email });
  } catch (error) {
    console.error("[Auth/Login]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
