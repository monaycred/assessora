"use client";

import { useEffect, useState } from "react";
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
    full_name: "", nickname: "", birth_date: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    cep: "", address_street: "", address_number: "", address_complement: "",
    address_neighborhood: "", address_city: "", address_state: "",
    emergency_name: "", emergency_phone: "", emergency_relationship: "",
    referral_code: "", referral_relationship: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => { setForm((current) => ({ ...current, referral_code: new URLSearchParams(window.location.search).get('ref') || '' })); }, []);

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) setForm((current) => ({ ...current, address_street: data.logradouro || '', address_neighborhood: data.bairro || '', address_city: data.localidade || '', address_state: data.uf || '' }));
    } catch { /* A pessoa pode preencher o endereço manualmente. */ }
  };

  const handleCPFChange = (value: string) => {
    const cleaned = cleanCPF(value);
    if (cleaned.length <= 11) {
      setForm((f) => ({ ...f, cpf: formatCPF(cleaned) }));
    }
  };

  const handlePhoneChange = (value: string) => {
    // Remove non-numeric characters
    const cleaned = value.replace(/\D/g, "");

    // If starts with 55 (Brazil code), remove it to avoid duplication
    let phone = cleaned.startsWith("55") ? cleaned.slice(2) : cleaned;

    // Limit to 11 digits (2 DDD + 9 number)
    if (phone.length > 11) {
      phone = phone.slice(0, 11);
    }

    // Format: (XX) XXXXX-XXXX
    let formatted = "";
    if (phone.length > 0) {
      if (phone.length <= 2) {
        formatted = `(${phone}`;
      } else if (phone.length <= 7) {
        formatted = `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
      } else {
        formatted = `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
      }
    }

    setForm((f) => ({ ...f, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.full_name.trim()) {
      setError("Nome completo é obrigatório.");
      return;
    }
    if (!form.nickname.trim() || !form.birth_date || !/^\d{8}$/.test(form.cep.replace(/\D/g, '')) ||
      !form.address_street.trim() || !form.address_number.trim() || !form.address_neighborhood.trim() ||
      !form.address_city.trim() || !form.address_state.trim() || !form.emergency_name.trim() ||
      !form.emergency_phone.trim() || !form.emergency_relationship.trim()) {
      setError('Preencha todos os dados obrigatórios.'); return;
    }
    if (form.referral_code && !form.referral_relationship) { setError('Informe seu vínculo com quem indicou.'); return; }

    if (!validateCPF(cleanCPF(form.cpf))) {
      setError("CPF inválido.");
      return;
    }

    if (!form.email.trim()) {
      setError("E-mail é obrigatório.");
      return;
    }

    if (!form.phone.trim()) {
      setError("WhatsApp é obrigatório.");
      return;
    }

    // Validate phone has at least 10 digits (DDD + number)
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("WhatsApp inválido. Digite um número válido (DDD + número).");
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
    if (!privacyAccepted) {
      setError("Leia e aceite a Política de Privacidade para continuar.");
      return;
    }

    setLoading(true);
    try {
      // Format phone with Brazil country code (55)
      const phoneDigits = form.phone.replace(/\D/g, "");
      const phoneWithCountryCode = `55${phoneDigits}`;

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          cpf: cleanCPF(form.cpf),
          email: form.email,
          phone: phoneWithCountryCode,
          password: form.password,
          nickname: form.nickname.trim(), birth_date: form.birth_date,
          cep: form.cep.replace(/\D/g, ''), address_street: form.address_street.trim(),
          address_number: form.address_number.trim(), address_complement: form.address_complement.trim(),
          address_neighborhood: form.address_neighborhood.trim(), address_city: form.address_city.trim(), address_state: form.address_state.toUpperCase(),
          emergency_name: form.emergency_name.trim(), emergency_phone: `55${form.emergency_phone.replace(/\D/g, '').replace(/^55/, '')}`,
          emergency_relationship: form.emergency_relationship.trim(), referral_code: form.referral_code || null,
          referral_relationship: form.referral_relationship || null,
          privacy_accepted: privacyAccepted,
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

      <div className="w-full max-w-xl relative animate-fade-in py-6">
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
            <Input label="Apelido" value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} placeholder="Como você quer aparecer nas comunidades" required />
            <Input label="Data de nascimento" type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} required />

            <Input
              label="CPF"
              type="text"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => handleCPFChange(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <div className="border-t border-slate-200 pt-4"><h3 className="mb-3 font-semibold text-slate-900">Endereço</h3><div className="space-y-3">
              <Input label="CEP" value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value.replace(/\D/g, '').slice(0, 8) }))} onBlur={lookupCep} placeholder="00000000" required />
              <Input label="Rua ou avenida" value={form.address_street} onChange={(e) => setForm((f) => ({ ...f, address_street: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-3"><Input label="Número" value={form.address_number} onChange={(e) => setForm((f) => ({ ...f, address_number: e.target.value }))} required /><Input label="Complemento" value={form.address_complement} onChange={(e) => setForm((f) => ({ ...f, address_complement: e.target.value }))} /></div>
              <Input label="Bairro" value={form.address_neighborhood} onChange={(e) => setForm((f) => ({ ...f, address_neighborhood: e.target.value }))} required />
              <div className="grid grid-cols-[1fr_80px] gap-3"><Input label="Cidade" value={form.address_city} onChange={(e) => setForm((f) => ({ ...f, address_city: e.target.value }))} required /><Input label="UF" value={form.address_state} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, address_state: e.target.value.toUpperCase() }))} required /></div>
            </div></div>

            <div className="border-t border-slate-200 pt-4"><h3 className="mb-1 font-semibold text-slate-900">Contato de apoio</h3><p className="mb-3 text-sm text-slate-600">Após sua aprovação, você poderá enviar um convite para esse contato aceitar receber pedidos de apoio.</p><div className="space-y-3">
              <Input label="Nome do contato" value={form.emergency_name} onChange={(e) => setForm((f) => ({ ...f, emergency_name: e.target.value }))} required />
              <Input label="WhatsApp do contato" value={form.emergency_phone} onChange={(e) => setForm((f) => ({ ...f, emergency_phone: e.target.value }))} required />
              <Input label="Qual é a relação?" value={form.emergency_relationship} onChange={(e) => setForm((f) => ({ ...f, emergency_relationship: e.target.value }))} placeholder="Ex.: mãe, esposo, amiga" required />
            </div></div>

            {form.referral_code && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-950">Você chegou por uma indicação</p><label className="mt-3 block text-sm text-blue-900">Qual é seu vínculo com quem indicou?
              <select value={form.referral_relationship} onChange={(e) => setForm((f) => ({ ...f, referral_relationship: e.target.value }))} className="mt-1 w-full rounded-lg border border-blue-200 bg-white p-3 text-slate-900" required><option value="">Selecione</option><option>Familiar</option><option>Amigo</option><option>Colega de trabalho</option><option>Líder ou mentor</option><option>Profissional de saúde</option><option>Comunidade ou igreja</option><option>Outro</option></select>
            </label></div>}

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
              label="WhatsApp 🇧🇷"
              type="text"
              placeholder="(11) 9XXXX-XXXX"
              value={form.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              hint="Digite seu DDD e número (sem o 55)"
              required
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

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
              <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} required className="mt-1 h-4 w-4 accent-emerald-600" />
              <span>Li e aceito a <Link href="/privacidade" target="_blank" className="font-semibold text-emerald-700 underline">Política de Privacidade da Iasmin</Link>.</span>
            </label>

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
