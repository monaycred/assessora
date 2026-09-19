"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Settings, User, Bell, Shield, Sparkles, Clock } from "lucide-react";

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [saved, setSaved]             = useState(false);
  const [savingBriefing, setSavingBriefing] = useState(false);
  const [savedBriefing, setSavedBriefing]   = useState(false);

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

    setProfile((p: any) => ({ ...p, phone: formatted }));
  };

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/profile');
      const result = await response.json();
      const data = result.profile;

      // Format phone for display (remove country code 55 if present)
      if (data?.phone) {
        const phoneDigits = data.phone.replace(/\D/g, "");
        let displayPhone = phoneDigits.startsWith("55")
          ? phoneDigits.slice(2)
          : phoneDigits;

        // Format to (XX) XXXXX-XXXX
        if (displayPhone.length === 11) {
          displayPhone = `(${displayPhone.slice(0, 2)}) ${displayPhone.slice(2, 7)}-${displayPhone.slice(7)}`;
        }

        data.phone = displayPhone;
      }
      if (data?.emergency_phone) {
        const digits = data.emergency_phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
        data.emergency_phone = digits.length === 11
          ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
          : digits.length === 10 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` : digits;
      }

      setProfile(data);
      setLoading(false);
    };
    load().catch(() => { setError('Não foi possível carregar o perfil'); setLoading(false); });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(''); setNotice('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'details', full_name: profile.full_name,
          nickname: profile.nickname, phone: profile.phone, birth_date: profile.birth_date,
          emergency_name: profile.emergency_name, emergency_phone: profile.emergency_phone,
          emergency_relationship: profile.emergency_relationship }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar');
      setSaved(true); setNotice('Perfil salvo. O novo WhatsApp já está vinculado à sua conta.');
      setTimeout(() => setSaved(false), 3000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file) return;
    setSavingAvatar(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.set('photo', file);
      const response = await fetch('/api/profile/avatar', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao enviar foto');
      setProfile((current: any) => ({ ...current, avatar_url: result.avatar_url }));
      setNotice('Foto atualizada. Ela poderá aparecer nas comunidades.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao enviar foto'); }
    finally { setSavingAvatar(false); }
  };

  const handleAvatarRemove = async () => {
    setSavingAvatar(true); setError('');
    try {
      const response = await fetch('/api/profile/avatar', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao remover foto');
      setProfile((current: any) => ({ ...current, avatar_url: null }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao remover foto'); }
    finally { setSavingAvatar(false); }
  };

  const handleSaveEmail = async () => {
    if (!profile) return;
    setSavingEmail(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'email', email: profile.email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao alterar e-mail');
      setNotice(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao alterar e-mail'); }
    finally { setSavingEmail(false); }
  };

  const handleSaveBriefing = async () => {
    if (!profile) return;
    setSavingBriefing(true); setError('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'briefing', briefing_enabled: profile.briefing_enabled ?? false,
          briefing_time: profile.briefing_time?.slice(0, 5) || '08:00' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar briefing');
      setSavedBriefing(true);
      setTimeout(() => setSavedBriefing(false), 3000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao salvar briefing'); }
    finally { setSavingBriefing(false); }
  };

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />

      <div className="p-6 space-y-5">
        {error && <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-400">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-primary-500/40 p-3 text-sm text-primary-400">{notice}</p>}
        {profile?.referral_code && <Card className="border-blue-200 bg-blue-50">
          <h3 className="font-bold text-blue-950">Seu elo de indicação</h3>
          <p className="mt-1 text-sm text-blue-800">Quem se cadastrar por este link ficará identificado como sua indicação e informará qual é o vínculo com você.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={`https://assessora.gedaias.com/cadastro?ref=${profile.referral_code}`} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-3 text-xs text-slate-800"/><Button type="button" onClick={() => navigator.clipboard.writeText(`https://assessora.gedaias.com/cadastro?ref=${profile.referral_code}`)}>Copiar convite</Button></div>
        </Card>}
        {/* Perfil */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-dark-100">Meu Perfil</h3>
          </div>

          {loading ? (
            <div className="py-6 text-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-16 w-16 rounded-full object-cover" />
                  : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-400"><User className="h-7 w-7" /></div>}
                <div className="space-y-2">
                  <label className="block cursor-pointer text-sm text-primary-400">
                    {savingAvatar ? 'Enviando foto...' : 'Escolher foto'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={savingAvatar}
                      className="sr-only" onChange={(event) => handleAvatarUpload(event.target.files?.[0])} />
                  </label>
                  {profile.avatar_url && <button type="button" onClick={handleAvatarRemove} disabled={savingAvatar}
                    className="block text-xs text-dark-400 hover:text-dark-200">Remover foto</button>}
                  <p className="text-xs text-dark-500">Opcional · JPG, PNG ou WebP · até 2 MB</p>
                </div>
              </div>
              <Input
                label="Nome completo"
                value={profile.full_name || ""}
                onChange={(e) =>
                  setProfile((p: any) => ({ ...p, full_name: e.target.value }))
                }
              />
              <Input
                label="Apelido"
                value={profile.nickname || ""}
                maxLength={32}
                onChange={(e) => setProfile((p: any) => ({ ...p, nickname: e.target.value }))}
                hint="Como você quer ser chamado na Iasmin"
              />
              <Input
                label="CPF"
                value={profile.cpf || ""}
                disabled
                hint="O CPF não pode ser alterado"
              />
              <Input
                label="E-mail"
                value={profile.email || ""}
                type="email"
                onChange={(e) => setProfile((p: any) => ({ ...p, email: e.target.value }))}
                hint="A troca de e-mail precisa ser confirmada pelo link enviado pelo Supabase"
              />
              <Button onClick={handleSaveEmail} loading={savingEmail} variant="outline">Alterar e-mail</Button>
              <Input
                label="WhatsApp 🇧🇷"
                value={profile.phone || ""}
                placeholder="(11) 9XXXX-XXXX"
                onChange={(e) => handlePhoneChange(e.target.value)}
                hint="Digite seu DDD e número (sem o 55)"
              />
              <Input label="Data de nascimento" type="date" value={profile.birth_date || ''}
                onChange={(e) => setProfile((p: any) => ({ ...p, birth_date: e.target.value }))} />
              <div className="space-y-3 rounded-lg border border-dark-700 p-4">
                <p className="text-sm font-medium text-dark-200">Contato de emergência (privado)</p>
                <Input label="Nome do contato" value={profile.emergency_name || ''} maxLength={120}
                  onChange={(e) => setProfile((p: any) => ({ ...p, emergency_name: e.target.value }))} />
                <Input label="WhatsApp do contato" value={profile.emergency_phone || ''} placeholder="(11) 9XXXX-XXXX"
                  onChange={(e) => setProfile((p: any) => ({ ...p, emergency_phone: e.target.value }))} />
                <Input label="Relação (opcional)" value={profile.emergency_relationship || ''} maxLength={60}
                  onChange={(e) => setProfile((p: any) => ({ ...p, emergency_relationship: e.target.value }))} />
              </div>
              <Button
                onClick={handleSave}
                loading={saving}
                variant={saved ? "secondary" : "primary"}
              >
                {saved ? "✓ Salvo!" : "Salvar alterações"}
              </Button>
            </div>
          ) : null}
        </Card>

        {/* Iasmin */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-dark-100">Sobre a Iasmin</h3>
          </div>
          <div className="space-y-3 text-sm text-dark-400">
            <p>
              A <strong className="text-dark-100">Iasmin</strong> é sua assessora
              pessoal via WhatsApp. Ela registra despesas, cria lembretes, organiza
              documentos e muito mais.
            </p>
            <p>
              Para usar, envie mensagens no WhatsApp como:{" "}
              <span className="text-primary-500">
                "Iasmin, registra mercado 150 no débito"
              </span>
            </p>
            <div className="p-3 bg-dark-800 rounded-lg border border-dark-700">
              <p className="text-xs font-semibold text-dark-300 mb-2">
                Exemplos de comandos:
              </p>
              <ul className="space-y-1 text-xs text-dark-500">
                <li>• "Iasmin, me lembra de cortar cabelo daqui 20 dias"</li>
                <li>• "Iasmin, agenda consulta médica dia 25 às 14h"</li>
                <li>• "Iasmin, adiciona Air Fryer na minha lista de desejos"</li>
                <li>• "Iasmin, cria lista de compras: arroz, café e leite"</li>
                <li>• "Iasmin, fecha a conta da casa"</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Briefing Diário */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-dark-100">Briefing Diário</h3>
          </div>
          <p className="text-xs text-dark-400 mb-4">
            A Iasmin manda no seu WhatsApp as tarefas urgentes e vencimentos do dia no horário que você escolher.
          </p>

          {loading ? (
            <div className="py-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <div className="space-y-4">
              {/* Toggle ativo */}
              <div className="flex items-center justify-between py-3 px-4 bg-dark-900 rounded-xl border border-dark-700">
                <div>
                  <p className="text-sm font-medium text-dark-100">Ativar briefing</p>
                  <p className="text-xs text-dark-400 mt-0.5">Receber resumo diário via WhatsApp</p>
                </div>
                <button
                  onClick={() => setProfile((p: any) => ({ ...p, briefing_enabled: !p.briefing_enabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    profile.briefing_enabled ? "bg-primary-500" : "bg-dark-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      profile.briefing_enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Horário */}
              {profile.briefing_enabled && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-dark-200 block">
                    Horário de envio
                  </label>
                  <p className="text-xs text-dark-400">
                    Horário de Brasília (UTC-3). O servidor funciona em UTC, então será ajustado automaticamente.
                  </p>
                  <input
                    type="time"
                    value={profile.briefing_time?.slice(0, 5) || "08:00"}
                    onChange={(e) => {
                      // Converte horário de Brasília → UTC (+3h)
                      const [h, m] = e.target.value.split(":").map(Number);
                      const utcH = ((h + 3) % 24).toString().padStart(2, "0");
                      setProfile((p: any) => ({ ...p, briefing_time: `${utcH}:${m.toString().padStart(2, "0")}` }));
                    }}
                    className="bg-dark-900 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                  />
                  <p className="text-xs text-dark-500">
                    Horário salvo (UTC): {profile.briefing_time?.slice(0, 5) || "08:00"}
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveBriefing}
                loading={savingBriefing}
                variant={savedBriefing ? "secondary" : "primary"}
              >
                {savedBriefing ? "✓ Salvo!" : "Salvar briefing"}
              </Button>
            </div>
          ) : null}
        </Card>

        {/* Segurança */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-dark-100">Segurança</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-dark-700">
              <div>
                <p className="text-sm text-dark-100">Alterar senha</p>
                <p className="text-xs text-dark-400">
                  Você receberá um link por e-mail
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enviar e-mail
              </Button>
            </div>
            {profile?.role === 'admin' && <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-dark-100">Números autorizados</p>
                <p className="text-xs text-dark-400">
                  Gerencie seus números de WhatsApp
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/whatsapp")}>
                Gerenciar
              </Button>
            </div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
