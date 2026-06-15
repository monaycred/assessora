"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCPF, cleanCPF, validateCPF } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Eye, EyeOff, Sparkles, Lock, User } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const searchParams = useSearchParams();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get("pendente") === "1"
      ? "Seu cadastro ainda está aguardando aprovação. Você receberá uma mensagem no WhatsApp quando for liberado."
      : ""
  );

  const handleCPFChange = (value: string) => {
    const cleaned = cleanCPF(value);
    if (cleaned.length <= 11) {
      setCpf(formatCPF(cleaned));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanedCPF = cleanCPF(cpf);
    if (!validateCPF(cleanedCPF)) {
      setError("CPF inválido.");
      return;
    }

    setLoading(true);
    try {
      // Busca o e-mail associado ao CPF
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cleanedCPF, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login.");
        return;
      }

      // Faz login com o e-mail retornado
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });

      if (authError) {
        setError("CPF ou senha incorretos.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100">Iasmin</h1>
          <p className="text-sm text-dark-400 mt-1">Sua assessora virtual</p>
        </div>

        {/* Card */}
        <div className="bg-dark-900 border border-dark-700/50 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold text-dark-100 mb-1">Entrar</h2>
          <p className="text-sm text-dark-400 mb-6">
            Use seu CPF para acessar o painel
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="CPF"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => handleCPFChange(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              Entrar
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/cadastro"
              className="text-sm text-dark-400 hover:text-primary-500 transition-colors"
            >
              Não tem conta?{" "}
              <span className="text-primary-500">Cadastre-se</span>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-dark-600 mt-6">
          assessora.gedaias.com
        </p>
      </div>
    </div>
  );
}
