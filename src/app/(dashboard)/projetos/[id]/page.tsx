"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Loader2, ChevronLeft, Lightbulb, X,
  Calendar, DollarSign, MapPin, User, HelpCircle,
  Target, Wrench, LayoutDashboard, Grid2X2,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type KanbanStatus = "todo" | "in_progress" | "waiting" | "done";
type ViewMode = "kanban" | "eisenhower";

interface Task {
  id: string;
  title: string;
  description: string | null;
  kanban_status: KanbanStatus;
  kanban_order: number;
  is_urgent: boolean;
  is_important: boolean;
  what: string | null;
  why: string | null;
  where_field: string | null;
  when_field: string | null;
  who_field: string | null;
  how: string | null;
  how_much: number | null;
  due_date: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  life_area: string;
  context: string;
  color: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const KANBAN_COLS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: "todo",        label: "📥 A Fazer",     color: "text-dark-400"   },
  { id: "in_progress", label: "🔄 Em Andamento", color: "text-blue-400"   },
  { id: "waiting",     label: "⏳ Aguardando",   color: "text-yellow-400" },
  { id: "done",        label: "✅ Concluído",    color: "text-green-400"  },
];

const EISENHOWER_QUADS = [
  { urgent: true,  important: true,  label: "🔴 Urgente + Importante",      sub: "Fazer agora",    bg: "bg-red-950/60    border-red-900/50"    },
  { urgent: false, important: true,  label: "🟠 Importante, não urgente",   sub: "Agendar",         bg: "bg-orange-950/60 border-orange-900/50" },
  { urgent: true,  important: false, label: "🟡 Urgente, não importante",   sub: "Delegar",         bg: "bg-yellow-950/60 border-yellow-900/50" },
  { urgent: false, important: false, label: "⚪ Baixa prioridade",           sub: "Arquivar",        bg: "bg-dark-900      border-dark-800"       },
];

const EMPTY_FORM = {
  title: "", description: "",
  kanban_status: "todo" as KanbanStatus,
  is_urgent: false, is_important: false,
  what: "", why: "", where_field: "",
  when_field: "", who_field: "", how: "", how_much: "",
  due_date: "",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ProjectBoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject]     = useState<Project | null>(null);
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
  const [viewMode, setViewMode]   = useState<ViewMode>("eisenhower");
  const [kaizen, setKaizen]       = useState<{ id: string; suggestion: string }[]>([]);

  // Painel lateral
  const [panelOpen, setPanelOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_FORM });

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return;
    setUserId(profile.id);

    const [{ data: proj }, { data: tasksData }, { data: kaizenData }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("project_tasks").select("*").eq("project_id", id).order("kanban_order"),
      supabase.from("kaizen_suggestions")
        .select("id, suggestion").eq("project_id", id).eq("is_applied", false).limit(3),
    ]);

    setProject(proj);
    setTasks(tasksData || []);
    setKaizen(kaizenData || []);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Painel ────────────────────────────────────────────────────────────────

  const openNew = (opts?: Partial<typeof EMPTY_FORM>) => {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, ...opts });
    setPanelOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title:        task.title,
      description:  task.description || "",
      kanban_status: task.kanban_status,
      is_urgent:    task.is_urgent,
      is_important: task.is_important,
      what:         task.what || "",
      why:          task.why || "",
      where_field:  task.where_field || "",
      when_field:   task.when_field || "",
      who_field:    task.who_field || "",
      how:          task.how || "",
      how_much:     task.how_much?.toString() || "",
      due_date:     task.due_date || "",
    });
    setPanelOpen(true);
  };

  const closePanel = () => { setPanelOpen(false); setEditingTask(null); };

  // ── Salvar ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim() || !userId) return;
    setSaving(true);

    const payload = {
      project_id:   id,
      user_id:      userId,
      title:        form.title.trim(),
      description:  form.description.trim() || null,
      kanban_status: form.kanban_status,
      is_urgent:    form.is_urgent,
      is_important: form.is_important,
      what:         form.what.trim() || null,
      why:          form.why.trim() || null,
      where_field:  form.where_field.trim() || null,
      when_field:   form.when_field || null,
      who_field:    form.who_field.trim() || null,
      how:          form.how.trim() || null,
      how_much:     form.how_much ? parseFloat(form.how_much) : null,
      due_date:     form.due_date || null,
    };

    if (editingTask) {
      await supabase.from("project_tasks").update(payload).eq("id", editingTask.id);
    } else {
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.kanban_order)) : 0;
      await supabase.from("project_tasks").insert({ ...payload, kanban_order: maxOrder + 1 });
    }

    setSaving(false);
    closePanel();
    load();
  };

  const handleDelete = async () => {
    if (!editingTask) return;
    await supabase.from("project_tasks").delete().eq("id", editingTask.id);
    closePanel();
    load();
  };

  const handleMoveStatus = async (taskId: string, status: KanbanStatus) => {
    await supabase.from("project_tasks").update({ kanban_status: status }).eq("id", taskId);
    load();
  };

  const dismissKaizen = async (kId: string) => {
    await supabase.from("kaizen_suggestions").update({ is_applied: true }).eq("id", kId);
    setKaizen((k) => k.filter((s) => s.id !== kId));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const eisenhowerOf = (t: Task) => {
    if (t.is_urgent && t.is_important)   return { emoji: "🔴", color: "bg-red-500/15 border-red-500/30" };
    if (!t.is_urgent && t.is_important)  return { emoji: "🟠", color: "bg-orange-500/10 border-orange-500/20" };
    if (t.is_urgent && !t.is_important)  return { emoji: "🟡", color: "bg-yellow-500/10 border-yellow-500/20" };
    return { emoji: "⚪", color: "bg-dark-900 border-dark-800" };
  };

  const show5W2H = form.is_urgent && form.is_important || (!form.is_urgent && form.is_important);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-dark-500" />
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <p className="text-dark-400 text-sm">Projeto não encontrado.</p>
    </div>
  );

  const tasksByStatus = (status: KanbanStatus) => tasks.filter((t) => t.kanban_status === status);
  const tasksByQuad   = (u: boolean, i: boolean) => tasks.filter((t) => t.is_urgent === u && t.is_important === i);

  return (
    <div className="min-h-screen bg-dark-950">
      <Header title={project.name} subtitle={project.description || "Board do projeto"} />

      <div className="p-6">
        {/* Breadcrumb + toggle */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.push("/projetos")}
            className="flex items-center gap-1.5 text-xs text-dark-500 hover:text-dark-300 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Projetos
          </button>

          <div className="flex items-center gap-3">
            {/* Toggle view */}
            <div className="flex bg-dark-900 border border-dark-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode("eisenhower")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "eisenhower"
                    ? "bg-dark-700 text-white"
                    : "text-dark-500 hover:text-dark-300"
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" /> Eisenhower
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "kanban"
                    ? "bg-dark-700 text-white"
                    : "text-dark-500 hover:text-dark-300"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Kanban
              </button>
            </div>

            <Button size="sm" onClick={() => openNew()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Tarefa
            </Button>
          </div>
        </div>

        {/* Kaizen */}
        {kaizen.length > 0 && (
          <div className="mb-5 space-y-2">
            {kaizen.map((k) => (
              <div key={k.id} className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3">
                <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/80 flex-1">{k.suggestion}</p>
                <button onClick={() => dismissKaizen(k.id)} className="text-dark-600 hover:text-dark-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── EISENHOWER VIEW ── */}
        {viewMode === "eisenhower" && (
          <div className="grid grid-cols-2 gap-3">
            {EISENHOWER_QUADS.map((q) => {
              const qTasks = tasksByQuad(q.urgent, q.important);
              return (
                <div key={`${q.urgent}-${q.important}`} className={`rounded-xl border p-4 min-h-[220px] ${q.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-bold text-white">{q.label}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5">{q.sub}</p>
                    </div>
                    <button
                      onClick={() => openNew({ is_urgent: q.urgent, is_important: q.important })}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-dark-800/60 hover:bg-dark-700 text-dark-500 hover:text-white transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {qTasks.map((t) => (
                      <TaskCard key={t.id} task={t} onEdit={openEdit} onMove={handleMoveStatus} />
                    ))}
                    {qTasks.length === 0 && (
                      <div
                        className="border border-dashed border-dark-700/50 rounded-lg p-3 text-center cursor-pointer hover:border-dark-600 transition-colors"
                        onClick={() => openNew({ is_urgent: q.urgent, is_important: q.important })}
                      >
                        <p className="text-[10px] text-dark-700">+ adicionar tarefa</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {KANBAN_COLS.map((col) => {
              const colTasks = tasksByStatus(col.id);
              return (
                <div key={col.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                      <span className="text-[10px] bg-dark-800 text-dark-500 rounded-full px-1.5 py-0.5">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => openNew({ kanban_status: col.id })}
                      className="w-5 h-5 flex items-center justify-center rounded text-dark-600 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 min-h-[180px]">
                    {colTasks.map((t) => (
                      <TaskCard key={t.id} task={t} onEdit={openEdit} onMove={handleMoveStatus} compact />
                    ))}
                    {colTasks.length === 0 && (
                      <div
                        className="border-2 border-dashed border-dark-800 rounded-xl p-4 text-center cursor-pointer hover:border-dark-700 transition-colors"
                        onClick={() => openNew({ kanban_status: col.id })}
                      >
                        <p className="text-[10px] text-dark-700">+ adicionar</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PAINEL LATERAL ── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-80 bg-dark-950 border-l border-dark-800 z-50 flex flex-col shadow-2xl">
            {/* Header painel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-800">
              <p className="text-sm font-bold text-white">
                {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
              </p>
              <button onClick={closePanel} className="text-dark-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do painel */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Título */}
              <Input
                label="Título *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="O que precisa ser feito?"
              />

              {/* Status Kanban */}
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-2">Status</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {KANBAN_COLS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setForm((f) => ({ ...f, kanban_status: col.id }))}
                      className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold transition-all ${
                        form.kanban_status === col.id
                          ? "border-primary-500/60 bg-primary-500/10 text-primary-300"
                          : "border-dark-700 text-dark-500 hover:border-dark-600"
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridade Eisenhower */}
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-2">Prioridade — Eisenhower</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {EISENHOWER_QUADS.map((q) => (
                    <button
                      key={`${q.urgent}-${q.important}`}
                      onClick={() => setForm((f) => ({ ...f, is_urgent: q.urgent, is_important: q.important }))}
                      className={`p-2.5 rounded-lg border text-left transition-all ${q.bg} ${
                        form.is_urgent === q.urgent && form.is_important === q.important
                          ? "ring-2 ring-primary-500"
                          : "opacity-60 hover:opacity-90"
                      }`}
                    >
                      <p className="text-[10px] font-bold text-white leading-tight">{q.label}</p>
                      <p className="text-[9px] text-dark-500 mt-0.5">{q.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vencimento */}
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1.5">Vencimento</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/50"
                />
              </div>

              {/* 5W2H — só para urgente+importante ou importante */}
              {show5W2H && (
                <div className="border-t border-dark-800 pt-4">
                  <p className="text-xs font-bold text-primary-400 mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> 5W2H
                  </p>
                  <div className="space-y-3">
                    {[
                      { field: "what",        label: "O que? (What)",     icon: <Target className="w-3 h-3" />,      type: "text",   ph: "O que precisa ser feito?" },
                      { field: "why",         label: "Por quê? (Why)",    icon: <HelpCircle className="w-3 h-3" />,  type: "text",   ph: "Qual o motivo?" },
                      { field: "where_field", label: "Onde? (Where)",     icon: <MapPin className="w-3 h-3" />,      type: "text",   ph: "Onde acontece?" },
                      { field: "when_field",  label: "Quando? (When)",    icon: <Calendar className="w-3 h-3" />,    type: "date",   ph: "" },
                      { field: "who_field",   label: "Quem? (Who)",       icon: <User className="w-3 h-3" />,        type: "text",   ph: "Responsável" },
                      { field: "how",         label: "Como? (How)",       icon: <Wrench className="w-3 h-3" />,      type: "text",   ph: "Como será feito?" },
                      { field: "how_much",    label: "Quanto? (How Much)",icon: <DollarSign className="w-3 h-3" />,  type: "number", ph: "0,00" },
                    ].map(({ field, label, icon, type, ph }) => (
                      <div key={field}>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-dark-500 uppercase tracking-wide mb-1">
                          {icon} {label}
                        </label>
                        <input
                          type={type}
                          value={(form as any)[field]}
                          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                          placeholder={ph}
                          className="w-full bg-dark-900 border border-dark-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-600 focus:outline-none focus:border-primary-500/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="px-5 py-4 border-t border-dark-800 space-y-2">
              <Button className="w-full" onClick={handleSave} disabled={!form.title.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTask ? "Salvar alterações" : "Criar tarefa"}
              </Button>
              {editingTask && (
                <button
                  onClick={handleDelete}
                  className="w-full py-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  Excluir tarefa
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Card de tarefa ───────────────────────────────────────────────────────────

function TaskCard({
  task, onEdit, onMove, compact = false,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onMove: (id: string, status: KanbanStatus) => void;
  compact?: boolean;
}) {
  const e = task.is_urgent && task.is_important ? "🔴"
    : !task.is_urgent && task.is_important ? "🟠"
    : task.is_urgent && !task.is_important ? "🟡"
    : "⚪";

  const has5W2H = task.what || task.why || task.who_field || task.how_much;

  return (
    <div
      className="bg-dark-900/80 border border-dark-800 rounded-xl p-3 cursor-pointer hover:border-dark-600 transition-all group"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs mt-0.5">{e}</span>
        <p className="text-xs font-semibold text-white flex-1 leading-snug">{task.title}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {task.due_date && (
          <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            new Date(task.due_date) <= new Date()
              ? "bg-red-500/15 text-red-400"
              : "bg-dark-800 text-dark-400"
          }`}>
            <Calendar className="w-2.5 h-2.5" />
            {new Date(task.due_date).toLocaleDateString("pt-BR")}
          </span>
        )}
        {task.who_field && (
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-dark-800 text-dark-400 font-medium">
            <User className="w-2.5 h-2.5" /> {task.who_field}
          </span>
        )}
        {task.how_much != null && (
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
            R$ {task.how_much.toLocaleString("pt-BR")}
          </span>
        )}
        {has5W2H && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 font-bold">
            5W2H
          </span>
        )}
      </div>

      {/* Mover rápido entre status */}
      {!compact && (
        <div
          className="flex gap-1 mt-2 pt-2 border-t border-dark-800 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {(["todo","in_progress","waiting","done"] as KanbanStatus[])
            .filter((s) => s !== task.kanban_status)
            .map((s) => {
              const labels: Record<KanbanStatus, string> = {
                todo: "📥", in_progress: "🔄", waiting: "⏳", done: "✅"
              };
              return (
                <button
                  key={s}
                  onClick={() => onMove(task.id, s)}
                  className="flex-1 text-[9px] py-1 bg-dark-800 hover:bg-dark-700 rounded text-dark-400 hover:text-white transition-all"
                  title={s}
                >
                  {labels[s]}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
