"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { Settings, User, Bell, Shield, Sparkles } from "lucide-react";

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />

      <div className="p-6 space-y-5">
        {/* Perfil */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-white">Meu Perfil</h3>
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
            <h3 className="text-sm font-semibold text-white">Sobre a Iasmin</h3>
          </div>
          <div className="space-y-3 text-sm text-dark-400">
            <p>
              A <strong className="text-white">Iasmin</strong> é sua assessora
              pessoal via WhatsApp. Ela registra despesas, cria lembretes, organiza
              documentos e muito mais.
            </p>
            <p>
              Para usar, envie mensagens no WhatsApp como:{" "}
              <span className="text-primary-500">
                "Iasmin, registra mercado 150 no débito"
              </span>
            </p>
            <div className="p-3 bg-dark-800 rounded-lg border border-dark-700/50">
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

        {/* Segurança */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Segurança</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-dark-800/50">
              <div>
                <p className="text-sm text-white">Alterar senha</p>
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
                <p className="text-sm text-white">Números autorizados</p>
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
