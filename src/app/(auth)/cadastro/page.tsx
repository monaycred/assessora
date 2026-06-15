"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCPF, cleanCPF, validateCPF } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Eye, EyeOff, Sparkles, Lock, User, Mail, Phone,
} from "lucide-react";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCPFChange = (value: string) => {
    const cleaned = cleanCPF(value);
    if (cleaned.length <= 11) {
      setForm((f) => ({ ...f, cpf: formatCPF(cleaned) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateCPF(cleanCPF(form.cpf))) {
      setError("CPF inválido.");
      return;
    }

    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          cpf: cleanCPF(form.cpf),
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao criar conta.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-dark-100 mb-2">Cadastro enviado!</h2>
          <p className="text-dark-400 text-sm">
            Seu cadastro foi recebido e está aguardando aprovação. Você receberá uma mensagem no WhatsApp quando for liberado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100">Iasmin</h1>
          <p className="text-sm text-dark-400 mt-1">Crie sua conta</p>
        </div>

        <div className="bg-dark-900 border border-dark-700/50 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold text-dark-100 mb-1">Cadastro</h2>
          <p className="text-sm text-dark-400 mb-6">
            Preencha seus dados para criar sua conta
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome completo"
              type="text"
              placeholder="Seu nome"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="CPF"
              type="text"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => handleCPFChange(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              leftIcon={<Mail className="w-4 h-4" />}
              hint="Usado para recuperação de acesso"
              required
            />

            <Input
              label="WhatsApp (opcional)"
              type="text"
              placeholder="55119xxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              leftIcon={<Phone className="w-4 h-4" />}
              hint="Formato: 5511999999999"
            />

            <Input
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Input
              label="Confirmar senha"
              type={showPassword ? "text" : "password"}
              placeholder="Repita a senha"
              value={form.confirm_password}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirm_password: e.target.value }))
              }
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              required
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              className="mt-2"
            >
              Criar conta
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-sm text-dark-400 hover:text-primary-500 transition-colors"
            >
              Já tem conta?{" "}
              <span className="text-primary-500">Entrar</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
