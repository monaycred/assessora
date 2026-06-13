"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Sparkles, Save, RotateCcw, ChevronDown } from "lucide-react";

const ANTHROPIC_MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku (rápido, barato)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet (equilibrado)" },
  { value: "claude-opus-4-8", label: "Claude Opus (mais inteligente)" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (rápido, barato)" },
  { value: "gpt-4o", label: "GPT-4o (equilibrado)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (mais inteligente)" },
];

export default function IAConfigPage() {
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState("claude-haiku-4-5-20251001");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ia-config")
      .then((r) => r.json())
      .then(({ config }) => {
        if (config) {
          setProvider(config.provider);
          setModel(config.model);
          setSystemPrompt(config.system_prompt);
          setOriginalPrompt(config.system_prompt);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const models = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;

  const handleProviderChange = (p: string) => {
    setProvider(p);
    setModel(p === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5-20251001");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ia-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, system_prompt: systemPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOriginalPrompt(systemPrompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = systemPrompt !== originalPrompt;

  return (
    <div>
      <Header
        title="Configuração da IA"
        subtitle="Defina a personalidade e capacidades da Iasmin"
      />

      <div className="p-6 space-y-5 max-w-4xl">
        {/* Provider + Model */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-white">Provedor de IA</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Anthropic */}
            <button
              onClick={() => handleProviderChange("anthropic")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                provider === "anthropic"
                  ? "border-primary-500 bg-primary-500/10"
                  : "border-dark-700 bg-dark-800/40 hover:border-dark-600"
              }`}
            >
              <p className="text-sm font-semibold text-white mb-1">Anthropic</p>
              <p className="text-xs text-dark-400">Claude — melhor para português e contexto longo</p>
            </button>

            {/* OpenAI */}
            <button
              onClick={() => handleProviderChange("openai")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                provider === "openai"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-dark-700 bg-dark-800/40 hover:border-dark-600"
              }`}
            >
              <p className="text-sm font-semibold text-white mb-1">OpenAI</p>
              <p className="text-xs text-dark-400">GPT — mais barato, boa capacidade geral</p>
            </button>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-2">Modelo</label>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 text-white text-sm rounded-lg px-3 py-2.5 pr-8 appearance-none focus:outline-none focus:border-primary-500"
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>
          </div>
        </Card>

        {/* System Prompt */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Inteligência da Iasmin</h3>
              <p className="text-xs text-dark-400 mt-0.5">
                Define o que ela faz, como responde e quais comandos reconhece
              </p>
            </div>
            {isDirty && (
              <button
                onClick={() => setSystemPrompt(originalPrompt)}
                className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Desfazer
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-10 text-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={24}
              className="w-full bg-dark-900 border border-dark-700 text-white text-sm font-mono rounded-lg px-4 py-3 focus:outline-none focus:border-primary-500 resize-none leading-relaxed"
              placeholder="Descreva aqui a personalidade, capacidades e regras da Iasmin..."
            />
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-dark-500">
              {systemPrompt.length.toLocaleString()} caracteres •{" "}
              {systemPrompt.split("\n").length} linhas
            </p>
            <div className="flex items-center gap-3">
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button
                onClick={handleSave}
                loading={saving}
                variant={saved ? "secondary" : "primary"}
                size="sm"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saved ? "✓ Salvo!" : "Salvar configuração"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Dicas */}
        <Card className="border-dark-700/30 bg-dark-900/30">
          <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-3">Dicas</h4>
          <ul className="space-y-2 text-xs text-dark-500">
            <li>• As alterações entram em vigor imediatamente (sem necessidade de deploy)</li>
            <li>• O cache é limpo automaticamente ao salvar — próximas mensagens usam a nova config</li>
            <li>• Para adicionar uma nova intenção, liste-a e dê exemplos de uso</li>
            <li>• Modelos mais caros são mais precisos; use Haiku/Mini para economizar</li>
            <li>• Para usar OpenAI, adicione <code className="text-dark-300">OPENAI_API_KEY</code> nas variáveis do Vercel</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
