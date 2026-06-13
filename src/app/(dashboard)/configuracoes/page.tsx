"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { Settings, User, Bell, Shield, Sparkles, Clock } from "lucide-react";

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [savingBriefing, setSavingBriefing] = useState(false);
  const [savedBriefing, setSavedBriefing]   = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("user_profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq("id", profile.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveBriefing = async () => {
    if (!profile) return;
    setSavingBriefing(true);

    await supabase
      .from("user_profiles")
      .update({
        briefing_enabled: profile.briefing_enabled ?? false,
        briefing_time:    profile.briefing_time    ?? "08:00",
      })
      .eq("id", profile.id);

    setSavingBriefing(false);
    setSavedBriefing(true);
    setTimeout(() => setSavedBriefing(false), 3000);
  };

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />

      <div className="p-6 space-y-5">
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
              <Input
                label="Nome completo"
                value={profile.full_name || ""}
                onChange={(e) =>
                  setProfile((p: any) => ({ ...p, full_name: e.target.value }))
                }
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
                disabled
                hint="O e-mail não pode ser alterado aqui"
              />
              <Input
                label="WhatsApp"
                value={profile.phone || ""}
                placeholder="5511999999999"
                onChange={(e) =>
                  setProfile((p: any) => ({ ...p, phone: e.target.value }))
                }
              />
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
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-dark-100">Números autorizados</p>
                <p className="text-xs text-dark-400">
                  Gerencie seus números de WhatsApp
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/whatsapp")}>
                Gerenciar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
