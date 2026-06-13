"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, ChevronRight, Briefcase, Home } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Context = "business" | "personal";

type LifeArea =
  | "financeiro" | "familia" | "viagens" | "saude" | "compras" | "documentos"
  | "equipe" | "fin_empresarial" | "marketing" | "operacoes" | "clientes" | "juridico"
  | "outros";

interface Project {
  id: string;
  name: string;
  description: string | null;
  life_area: LifeArea;
  context: Context;
  color: string;
  task_counts?: { todo: number; in_progress: number; waiting: number; done: number; urgent: number };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const AREAS: Record<Context, Record<string, { label: string; emoji: string; color: string }>> = {
  business: {
    equipe:          { label: "Equipe / RH",       emoji: "👥", color: "#3b82f6" },
    fin_empresarial: { label: "Financeiro",         emoji: "💼", color: "#22c55e" },
    marketing:       { label: "Marketing / Vendas", emoji: "📣", color: "#f59e0b" },
    operacoes:       { label: "Operações",          emoji: "⚙️", color: "#8b5cf6" },
    clientes:        { label: "Clientes",           emoji: "🤝", color: "#ec4899" },
    juridico:        { label: "Jurídico",           emoji: "⚖️", color: "#64748b" },
    outros:          { label: "Outros",             emoji: "📦", color: "#78716c" },
  },
  personal: {
    financeiro:  { label: "Financeiro",  emoji: "💰", color: "#22c55e" },
    familia:     { label: "Família",     emoji: "👨‍👩‍👧", color: "#f59e0b" },
    viagens:     { label: "Viagens",     emoji: "✈️", color: "#06b6d4" },
    saude:       { label: "Saúde",       emoji: "🏥", color: "#ef4444" },
    compras:     { label: "Compras",     emoji: "🛒", color: "#a855f7" },
    documentos:  { label: "Documentos", emoji: "📄", color: "#64748b" },
    outros:      { label: "Outros",     emoji: "📦", color: "#78716c" },
  },
};

const PROJECT_COLORS = [
  "#6366f1", "#3b82f6", "#22c55e", "#f59e0b",
  "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444",
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ctx, setCtx] = useState<Context>("business");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    life_area: "" as LifeArea,
    color: PROJECT_COLORS[0],
  });

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async (context: Context) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return;
    setUserId(profile.id);

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", profile.id)
      .eq("context", context)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const enriched = await Promise.all(
      data.map(async (p) => {
        const { data: tasks } = await supabase
          .from("project_tasks")
          .select("kanban_status, is_urgent, is_important")
          .eq("project_id", p.id);

        const counts = { todo: 0, in_progress: 0, waiting: 0, done: 0, urgent: 0 };
        (tasks || []).forEach((t) => {
          if (t.kanban_status in counts)
            counts[t.kanban_status as keyof typeof counts]++;
          if (t.is_urgent && t.is_important) counts.urgent++;
        });
        return { ...p, task_counts: counts };
      })
    );

    setProjects(enriched);
    setLoading(false);
  };

  useEffect(() => { load(ctx); }, [ctx]);

  // ── Criar projeto ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim() || !form.life_area || !userId) return;
    setSaving(true);

    await supabase.from("projects").insert({
      user_id: userId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      context: ctx,
      life_area: form.life_area,
      color: form.color,
    });

    setForm({ name: "", description: "", life_area: "" as LifeArea, color: PROJECT_COLORS[0] });
    setModalOpen(false);
    setSaving(false);
    load(ctx);
  };

  // ── Agrupar por área ───────────────────────────────────────────────────────

  const areas = AREAS[ctx];
  const grouped = Object.keys(areas).reduce((acc, area) => {
    const items = projects.filter((p) => p.life_area === area);
    if (items.length > 0) acc[area] = items;
    return acc;
  }, {} as Record<string, Project[]>);

  const filteredProjects = selectedArea
    ? projects.filter((p) => p.life_area === selectedArea)
    : null;

  // ── Stats por área ─────────────────────────────────────────────────────────

  const areaStats = (areaKey: string) => {
    const ps = projects.filter((p) => p.life_area === areaKey);
    const total = ps.reduce((s, p) => s + (p.task_counts?.todo || 0) + (p.task_counts?.in_progress || 0) + (p.task_counts?.waiting || 0) + (p.task_counts?.done || 0), 0);
    const done  = ps.reduce((s, p) => s + (p.task_counts?.done || 0), 0);
    const urgent = ps.reduce((s, p) => s + (p.task_counts?.urgent || 0), 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, urgent, progress, projects: ps.length };
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-950">
      <Header title="Projetos" subtitle={ctx === "business" ? "Empresarial" : "Pessoal"} />

      <div className="p-6 max-w-6xl">

        {/* Seletor de contexto */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => { setCtx("business"); setSelectedArea(null); }}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${
              ctx === "business"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                : "border-dark-700 bg-dark-900 text-dark-400 hover:border-dark-600 hover:text-dark-300"
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-bold">Empresarial</p>
              <p className="text-xs opacity-60">Equipe · Financeiro · Marketing</p>
            </div>
          </button>

          <button
            onClick={() => { setCtx("personal"); setSelectedArea(null); }}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${
              ctx === "personal"
                ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                : "border-dark-700 bg-dark-900 text-dark-400 hover:border-dark-600 hover:text-dark-300"
            }`}
          >
            <Home className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-bold">Pessoal</p>
              <p className="text-xs opacity-60">Família · Saúde · Viagens</p>
            </div>
          </button>

          <div className="flex-1" />
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Projeto
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-dark-500" />
          </div>
        ) : (
          <>
            {/* Grid de áreas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {Object.entries(areas).map(([key, meta]) => {
                const stats = areaStats(key);
                const isSelected = selectedArea === key;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedArea(isSelected ? null : key)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-opacity-60 bg-opacity-10"
                        : "border-dark-700 bg-dark-900 hover:border-dark-600"
                    }`}
                    style={isSelected ? {
                      borderColor: meta.color + "80",
                      backgroundColor: meta.color + "15",
                    } : {}}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="text-xs font-bold text-dark-200">{meta.label}</span>
                    </div>
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {stats.urgent > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-semibold">
                          🔴 {stats.urgent}
                        </span>
                      )}
                      {stats.total > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-dark-800 text-dark-400 font-semibold">
                          {stats.projects} proj
                        </span>
                      )}
                    </div>
                    <div className="h-1 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${stats.progress}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Lista de projetos */}
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-dark-500 text-sm">Nenhum projeto neste contexto.</p>
                <p className="text-dark-700 text-xs mt-1">Crie o primeiro projeto para começar.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-dark-500 mb-3">
                  {selectedArea
                    ? `${areas[selectedArea]?.emoji} ${areas[selectedArea]?.label} — ${filteredProjects?.length} projeto(s)`
                    : `Todos os projetos — ${projects.length}`}
                </p>
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
                  {(filteredProjects || projects).map((p, i, arr) => {
                    const area = areas[p.life_area] || areas["outros"];
                    const counts = p.task_counts!;
                    const total = counts.todo + counts.in_progress + counts.waiting + counts.done;
                    const progress = total > 0 ? Math.round((counts.done / total) * 100) : 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/projetos/${p.id}`)}
                        className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-dark-800/50 transition-colors ${
                          i < arr.length - 1 ? "border-b border-dark-800" : ""
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          <p className="text-xs text-dark-500 mt-0.5">
                            {area.emoji} {area.label}
                            {p.description && ` · ${p.description}`}
                          </p>
                        </div>

                        {/* Contadores Kanban */}
                        <div className="hidden sm:flex items-center gap-3 text-xs">
                          {counts.urgent > 0 && (
                            <span className="text-red-400 font-semibold">🔴 {counts.urgent}</span>
                          )}
                          <span className="text-dark-500">{total} tarefas</span>
                          <div className="flex items-center gap-1.5 w-20">
                            <div className="flex-1 h-1 bg-dark-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${progress}%`, backgroundColor: p.color }}
                              />
                            </div>
                            <span className="text-[10px] text-dark-600 w-7 text-right">{progress}%</span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-dark-700 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal novo projeto */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Projeto">
        <div className="space-y-4">
          <Input
            label="Nome do projeto"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={ctx === "business" ? "Ex: Onboarding novo colaborador" : "Ex: Viagem para SP"}
          />
          <Input
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Breve descrição..."
          />

          {/* Área */}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-2">Área</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(areas).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setForm((f) => ({ ...f, life_area: key as LifeArea }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                    form.life_area === key
                      ? "border-primary-500 bg-primary-500/10 text-primary-400"
                      : "border-dark-700 text-dark-400 hover:border-dark-500"
                  }`}
                >
                  <span className="text-lg">{meta.emoji}</span>
                  <span className="text-center leading-tight">{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-2">Cor</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    form.color === c ? "scale-125 ring-2 ring-white/30" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.life_area || saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Projeto"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
