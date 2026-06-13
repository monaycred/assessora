"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Loader2, ChevronLeft, Lightbulb, X,
  Calendar, DollarSign, MapPin, User, HelpCircle,
  Target, Wrench, LayoutDashboard, Grid2X2,
  Link as LinkIcon, Trash2, ExternalLink, Paperclip,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProjectColumn {
  id: string;
  name: string;
  slug: string;
  color: string;
  order_index: number;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  kanban_status: string;
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

type ViewMode = "kanban" | "eisenhower";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS: Omit<ProjectColumn, "id">[] = [
  { slug: "todo",        name: "📥 A Fazer",      color: "#6b7280", order_index: 0 },
  { slug: "in_progress", name: "🔄 Em Andamento",  color: "#3b82f6", order_index: 1 },
  { slug: "waiting",     name: "⏳ Aguardando",    color: "#eab308", order_index: 2 },
  { slug: "done",        name: "✅ Concluído",     color: "#22c55e", order_index: 3 },
];

const EISENHOWER_QUADS = [
  { urgent: true,  important: true,  label: "🔴 Urgente + Importante",    sub: "Fazer agora", bg: "bg-red-950/40 border-red-900/40"        },
  { urgent: false, important: true,  label: "🟠 Importante, não urgente", sub: "Agendar",     bg: "bg-orange-950/40 border-orange-900/40"  },
  { urgent: true,  important: false, label: "🟡 Urgente, não importante", sub: "Delegar",     bg: "bg-yellow-950/40 border-yellow-900/40"  },
  { urgent: false, important: false, label: "⚪ Baixa prioridade",        sub: "Arquivar",    bg: "bg-dark-800/60 border-dark-700/40"      },
];

const EMPTY_FORM = {
  title: "", description: "",
  kanban_status: "todo",
  is_urgent: false, is_important: false,
  what: "", why: "", where_field: "",
  when_field: "", who_field: "", how: "", how_much: "",
  due_date: "",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ProjectBoardPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [project, setProject]   = useState<Project | null>(null);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [columns, setColumns]   = useState<ProjectColumn[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("eisenhower");
  const [kaizen, setKaizen]     = useState<{ id: string; suggestion: string }[]>([]);

  // Painel
  const [panelOpen, setPanelOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_FORM });

  // Anexos
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newLink, setNewLink]         = useState({ name: "", url: "" });
  const [addingLink, setAddingLink]   = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);

  // Nova coluna
  const [addingCol, setAddingCol]   = useState(false);
  const [newColName, setNewColName] = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return;
    setUserId(profile.id);

    const [{ data: proj }, { data: tasksData }, { data: kaizenData }, { data: colsData }] =
      await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("project_tasks").select("*").eq("project_id", id).order("kanban_order"),
        supabase.from("kaizen_suggestions")
          .select("id, suggestion").eq("project_id", id).eq("is_applied", false).limit(3),
        supabase.from("project_columns")
          .select("*").eq("project_id", id).order("order_index"),
      ]);

    setProject(proj);
    setTasks(tasksData || []);
    setKaizen(kaizenData || []);

    // Cria colunas padrão se o projeto ainda não tiver
    if (!colsData || colsData.length === 0) {
      const toInsert = DEFAULT_COLUMNS.map((c) => ({
        ...c, project_id: id, user_id: profile.id,
      }));
      const { data: created } = await supabase
        .from("project_columns").insert(toInsert).select();
      setColumns(created || []);
    } else {
      setColumns(colsData);
    }

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Anexos ────────────────────────────────────────────────────────────────

  const loadAttachments = async (taskId: string) => {
    const { data } = await supabase
      .from("task_attachments")
      .select("id, name, url, type")
      .eq("task_id", taskId)
      .order("created_at");
    setAttachments(data || []);
  };

  // ── Painel ────────────────────────────────────────────────────────────────

  const openNew = (opts?: Partial<typeof EMPTY_FORM>) => {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, kanban_status: columns[0]?.slug || "todo", ...opts });
    setAttachments([]);
    setAddingLink(false);
    setPanelOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title:         task.title,
      description:   task.description || "",
      kanban_status: task.kanban_status,
      is_urgent:     task.is_urgent,
      is_important:  task.is_important,
      what:          task.what || "",
      why:           task.why || "",
      where_field:   task.where_field || "",
      when_field:    task.when_field || "",
      who_field:     task.who_field || "",
      how:           task.how || "",
      how_much:      task.how_much?.toString() || "",
      due_date:      task.due_date || "",
    });
    setAttachments([]);
    setAddingLink(false);
    loadAttachments(task.id);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingTask(null);
    setAttachments([]);
    setAddingLink(false);
  };

  // ── Salvar tarefa ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim() || !userId) return;
    setSaving(true);

    const payload = {
      project_id:    id,
      user_id:       userId,
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      kanban_status: form.kanban_status,
      is_urgent:     form.is_urgent,
      is_important:  form.is_important,
      what:          form.what.trim() || null,
      why:           form.why.trim() || null,
      where_field:   form.where_field.trim() || null,
      when_field:    form.when_field || null,
      who_field:     form.who_field.trim() || null,
      how:           form.how.trim() || null,
      how_much:      form.how_much ? parseFloat(form.how_much) : null,
      due_date:      form.due_date || null,
    };

    if (editingTask) {
      await supabase.from("project_tasks").update(payload).eq("id", editingTask.id);
      setSaving(false);
      closePanel();
      load();
    } else {
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.kanban_order)) : 0;
      const { data: newTask } = await supabase
        .from("project_tasks")
        .insert({ ...payload, kanban_order: maxOrder + 1 })
        .select()
        .single();
      setSaving(false);
      load();
      // Abre o painel de edição da nova tarefa para permitir anexar arquivos imediatamente
      if (newTask) openEdit(newTask);
      else closePanel();
    }
  };

  const handleDelete = async () => {
    if (!editingTask) return;
    await supabase.from("project_tasks").delete().eq("id", editingTask.id);
    closePanel();
    load();
  };

  const handleMoveStatus = async (taskId: string, slug: string) => {
    await supabase.from("project_tasks").update({ kanban_status: slug }).eq("id", taskId);
    load();
  };

  const dismissKaizen = async (kId: string) => {
    await supabase.from("kaizen_suggestions").update({ is_applied: true }).eq("id", kId);
    setKaizen((k) => k.filter((s) => s.id !== kId));
  };

  // ── Anexos ────────────────────────────────────────────────────────────────

  const handleAddLink = async () => {
    if (!newLink.url.trim() || !editingTask || !userId) return;
    const { data } = await supabase.from("task_attachments").insert({
      task_id: editingTask.id,
      user_id: userId,
      type:    "link",
      name:    newLink.name.trim() || newLink.url,
      url:     newLink.url.trim(),
    }).select().single();
    if (data) setAttachments((a) => [...a, data]);
    setNewLink({ name: "", url: "" });
    setAddingLink(false);
  };

  const handleDeleteAttachment = async (attId: string) => {
    await supabase.from("task_attachments").delete().eq("id", attId);
    setAttachments((a) => a.filter((x) => x.id !== attId));
  };

  const handleFileUpload = async (file: File) => {
    if (!editingTask || !userId) return;
    setUploadingFile(true);
    try {
      const ext  = file.name.split(".").pop() || "bin";
      const path = `${userId}/${editingTask.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("task-attachments")
        .upload(path, file, { upsert: false });
      if (upErr) { alert("Erro ao enviar arquivo. Verifique se o bucket 'task-attachments' foi criado no Supabase Storage."); return; }
      const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path);
      const { data } = await supabase.from("task_attachments").insert({
        task_id: editingTask.id, user_id: userId,
        type: "file", name: file.name, url: urlData.publicUrl,
      }).select().single();
      if (data) setAttachments((a) => [...a, data]);
    } finally {
      setUploadingFile(false);
    }
  };

  // ── Colunas customizadas ──────────────────────────────────────────────────

  const handleAddColumn = async () => {
    if (!newColName.trim() || !userId) return;
    const raw  = newColName.trim();
    const slug = raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || `col_${Date.now()}`;
    const { data } = await supabase.from("project_columns").insert({
      project_id:  id,
      user_id:     userId,
      name:        raw,
      slug,
      color:       "#6366f1",
      order_index: columns.length,
    }).select().single();
    if (data) setColumns((c) => [...c, data]);
    setNewColName("");
    setAddingCol(false);
  };

  const handleDeleteColumn = async (colId: string, colSlug: string) => {
    const firstCol = columns.find((c) => c.id !== colId);
    if (firstCol) {
      await supabase.from("project_tasks")
        .update({ kanban_status: firstCol.slug })
        .eq("project_id", id)
        .eq("kanban_status", colSlug);
    }
    await supabase.from("project_columns").delete().eq("id", colId);
    setColumns((c) => c.filter((x) => x.id !== colId));
    load();
  };

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

  const tasksByStatus = (slug: string) => tasks.filter((t) => t.kanban_status === slug);
  const tasksByQuad   = (u: boolean, i: boolean) =>
    tasks.filter((t) => t.is_urgent === u && t.is_important === i);

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
            <div className="flex bg-dark-900 border border-dark-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode("eisenhower")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "eisenhower" ? "bg-dark-700 text-dark-100" : "text-dark-500 hover:text-dark-300"
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" /> Eisenhower
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "kanban" ? "bg-dark-700 text-dark-100" : "text-dark-500 hover:text-dark-300"
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
                      <p className="text-xs font-bold text-dark-100">{q.label}</p>
                      <p className="text-[10px] text-dark-500 mt-0.5">{q.sub}</p>
                    </div>
                    <button
                      onClick={() => openNew({ is_urgent: q.urgent, is_important: q.important })}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-dark-800/60 hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {qTasks.map((t) => (
                      <TaskCard key={t.id} task={t} columns={columns} onEdit={openEdit} onMove={handleMoveStatus} />
                    ))}
                    {qTasks.length === 0 && (
                      <div
                        className="border border-dashed border-dark-700/40 rounded-lg p-3 text-center cursor-pointer hover:border-dark-600 transition-colors"
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
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((col) => {
              const colTasks = tasksByStatus(col.slug);
              return (
                <div key={col.id} className="flex-shrink-0 w-64">
                  <div className="flex items-center justify-between mb-3 group">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="text-xs font-semibold text-dark-300">{col.name}</span>
                      <span className="text-[10px] bg-dark-800 text-dark-500 rounded-full px-1.5 py-0.5">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openNew({ kanban_status: col.slug })}
                        className="w-5 h-5 flex items-center justify-center rounded text-dark-600 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {columns.length > 1 && (
                        <button
                          onClick={() => handleDeleteColumn(col.id, col.slug)}
                          className="w-5 h-5 flex items-center justify-center rounded text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 min-h-[180px]">
                    {colTasks.map((t) => (
                      <TaskCard key={t.id} task={t} columns={columns} onEdit={openEdit} onMove={handleMoveStatus} compact />
                    ))}
                    {colTasks.length === 0 && (
                      <div
                        className="border-2 border-dashed border-dark-800 rounded-xl p-4 text-center cursor-pointer hover:border-dark-700 transition-colors"
                        onClick={() => openNew({ kanban_status: col.slug })}
                      >
                        <p className="text-[10px] text-dark-700">+ adicionar</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Adicionar nova etapa */}
            <div className="flex-shrink-0 w-52">
              {addingCol ? (
                <div className="bg-dark-900 border border-dark-700 rounded-xl p-3 space-y-2">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") setAddingCol(false);
                    }}
                    placeholder="Nome da etapa..."
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-dark-100 placeholder-dark-600 focus:outline-none focus:border-primary-500/50"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleAddColumn}
                      className="flex-1 py-1.5 bg-primary-500/20 text-primary-300 rounded-lg text-[10px] font-bold hover:bg-primary-500/30 transition-colors"
                    >
                      Criar
                    </button>
                    <button
                      onClick={() => setAddingCol(false)}
                      className="flex-1 py-1.5 bg-dark-800 text-dark-500 rounded-lg text-[10px] hover:bg-dark-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="w-full py-3 border-2 border-dashed border-dark-800 rounded-xl text-[10px] text-dark-600 hover:border-dark-700 hover:text-dark-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> Nova etapa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── PAINEL LATERAL ── */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">
                {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
              </p>
              <button onClick={closePanel} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Título *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="O que precisa ser feito?"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white"
                />
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Anotações</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Escreva detalhes, observações, contexto da tarefa..."
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white resize-none"
                />
              </div>

              {/* Etapa Kanban */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Etapa</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {columns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setForm((f) => ({ ...f, kanban_status: col.slug }))}
                      className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold transition-all ${
                        form.kanban_status === col.slug
                          ? "border-primary-500 bg-primary-50 text-primary-600"
                          : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridade Eisenhower */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Prioridade</label>
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
                      <p className="text-[10px] font-bold text-dark-100 leading-tight">{q.label}</p>
                      <p className="text-[9px] text-dark-100/60 mt-0.5">{q.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vencimento */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vencimento</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary-500/60 focus:bg-white"
                />
              </div>

              {/* 5W2H */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-primary-500 mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> 5W2H
                </p>
                <div className="space-y-3">
                  {[
                    { field: "what",        label: "O que? (What)",      icon: <Target className="w-3 h-3" />,     type: "text",   ph: "O que precisa ser feito?" },
                    { field: "why",         label: "Por quê? (Why)",     icon: <HelpCircle className="w-3 h-3" />, type: "text",   ph: "Qual o motivo?" },
                    { field: "where_field", label: "Onde? (Where)",      icon: <MapPin className="w-3 h-3" />,     type: "text",   ph: "Onde acontece?" },
                    { field: "when_field",  label: "Quando? (When)",     icon: <Calendar className="w-3 h-3" />,   type: "date",   ph: "" },
                    { field: "who_field",   label: "Quem? (Who)",        icon: <User className="w-3 h-3" />,       type: "text",   ph: "Responsável" },
                    { field: "how",         label: "Como? (How)",        icon: <Wrench className="w-3 h-3" />,     type: "text",   ph: "Como será feito?" },
                    { field: "how_much",    label: "Quanto? (How Much)", icon: <DollarSign className="w-3 h-3" />, type: "number", ph: "0,00" },
                  ].map(({ field, label, icon, type, ph }) => (
                    <div key={field}>
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        {icon} {label}
                      </label>
                      <input
                        type={type}
                        value={(form as unknown as Record<string, string>)[field]}
                        onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                        placeholder={ph}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Anexos — só ao editar tarefa existente */}
              {editingTask && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                    <Paperclip className="w-3.5 h-3.5" /> Anexos
                  </p>

                  {/* Lista de anexos */}
                  {attachments.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 group">
                          {att.type === "file"
                            ? <Paperclip className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            : <LinkIcon  className="w-3 h-3 text-primary-400 flex-shrink-0" />
                          }
                          <a href={att.url} target="_blank" rel="noopener noreferrer"
                            className="flex-1 text-[11px] text-gray-600 hover:text-primary-600 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {att.name}
                          </a>
                          <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button onClick={() => handleDeleteAttachment(att.id)}
                            className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botões Link / Arquivo */}
                  {addingLink ? (
                    <div className="space-y-1.5">
                      <input
                        autoFocus
                        value={newLink.url}
                        onChange={(e) => setNewLink((l) => ({ ...l, url: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newLink.url.trim()) handleAddLink();
                          if (e.key === "Escape") { setAddingLink(false); setNewLink({ name: "", url: "" }); }
                        }}
                        placeholder="Cole o link (ex: https://drive.google.com/...)"
                        className="w-full bg-gray-50 border border-primary-300 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white"
                      />
                      <div className="flex gap-1.5">
                        <input
                          value={newLink.name}
                          onChange={(e) => setNewLink((l) => ({ ...l, name: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newLink.url.trim()) handleAddLink();
                            if (e.key === "Escape") { setAddingLink(false); setNewLink({ name: "", url: "" }); }
                          }}
                          placeholder="Nome (opcional)"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500/60"
                        />
                        <button onClick={handleAddLink} disabled={!newLink.url.trim()}
                          className="px-3 py-1.5 bg-primary-500 text-dark-100 rounded-lg text-[10px] font-bold hover:bg-primary-600 disabled:opacity-40 transition-colors"
                        >OK</button>
                        <button onClick={() => { setAddingLink(false); setNewLink({ name: "", url: "" }); }}
                          className="px-2 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                        ><X className="w-3 h-3" /></button>
                      </div>
                      <p className="text-[10px] text-gray-400">Enter para salvar · Esc para cancelar</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAddingLink(true)}
                        className="flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 hover:border-primary-400 rounded-lg text-[11px] text-gray-400 hover:text-primary-500 transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Adicionar link
                      </button>
                      <label className="flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 hover:border-primary-400 rounded-lg text-[11px] text-gray-400 hover:text-primary-500 transition-colors cursor-pointer">
                        {uploadingFile
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <><Paperclip className="w-3.5 h-3.5" /> Anexar arquivo</>
                        }
                        <input type="file" className="hidden" disabled={uploadingFile}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <Button className="w-full" onClick={handleSave} disabled={!form.title.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTask ? "Salvar alterações" : "Criar tarefa →"}
              </Button>
              {editingTask && (
                <button onClick={handleDelete}
                  className="w-full py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
  task, columns, onEdit, onMove, compact = false,
}: {
  task: Task;
  columns: ProjectColumn[];
  onEdit: (t: Task) => void;
  onMove: (id: string, slug: string) => void;
  compact?: boolean;
}) {
  const emoji = task.is_urgent && task.is_important  ? "🔴"
    : !task.is_urgent && task.is_important            ? "🟠"
    : task.is_urgent  && !task.is_important           ? "🟡"
    : "⚪";

  const borderColor = task.is_urgent && task.is_important  ? "border-red-500/25"
    : !task.is_urgent && task.is_important                  ? "border-orange-500/20"
    : task.is_urgent  && !task.is_important                 ? "border-yellow-500/20"
    : "border-dark-600/50";

  const has5W2H = task.what || task.why || task.who_field || task.how_much;

  return (
    <div
      className={`bg-dark-800 border ${borderColor} rounded-xl p-3 cursor-pointer hover:border-dark-500 hover:bg-dark-750 transition-all group`}
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs mt-0.5 flex-shrink-0">{emoji}</span>
        <p className="text-xs font-semibold text-dark-100 flex-1 leading-snug">{task.title}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {task.due_date && (
          <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            new Date(task.due_date) <= new Date()
              ? "bg-red-500/15 text-red-400"
              : "bg-dark-700 text-dark-400"
          }`}>
            <Calendar className="w-2.5 h-2.5" />
            {new Date(task.due_date).toLocaleDateString("pt-BR")}
          </span>
        )}
        {task.who_field && (
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-dark-700 text-dark-400 font-medium">
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

      {/* Mover entre colunas (hover) */}
      {!compact && columns.length > 1 && (
        <div
          className="flex gap-1 mt-2 pt-2 border-t border-dark-700 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {columns
            .filter((c) => c.slug !== task.kanban_status)
            .slice(0, 3)
            .map((c) => (
              <button
                key={c.slug}
                onClick={() => onMove(task.id, c.slug)}
                className="flex-1 text-[9px] py-1 bg-dark-700 hover:bg-dark-600 rounded text-dark-400 hover:text-dark-200 transition-all truncate px-1"
                title={c.name}
              >
                {c.name.split(" ")[0]}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
