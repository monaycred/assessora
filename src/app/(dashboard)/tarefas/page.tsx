'use client';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CheckCircle2, ListTodo, Plus } from 'lucide-react';

type Task = { id: string; title: string; description: string | null; due_at: string | null; priority: string; status: 'pending'|'done' };
export default function TasksPage() {
  const [tasks,setTasks]=useState<Task[]>([]); const [title,setTitle]=useState(''); const [description,setDescription]=useState(''); const [dueAt,setDueAt]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const load=()=>fetch('/api/tasks').then(r=>r.json()).then(d=>setTasks(d.tasks||[])).catch(()=>setError('Não foi possível carregar as tarefas'));
  useEffect(()=>{void load();},[]);
  async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');const r=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description,due_at:dueAt?new Date(dueAt).toISOString():null})});const d=await r.json();if(!r.ok)setError(d.error);else{setTitle('');setDescription('');setDueAt('');load();}setBusy(false);}
  async function toggle(task:Task){await fetch('/api/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:task.id,status:task.status==='done'?'pending':'done'})});load();}
  return <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6"><header className="rounded-3xl bg-gradient-to-br from-blue-600 to-violet-700 p-6 text-white"><h1 className="flex items-center gap-3 text-2xl font-bold"><ListTodo/>Minhas tarefas</h1><p className="mt-2 text-white/85">Crie, organize e conclua o que precisa ser feito.</p></header>
    <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-slate-900"><Plus className="h-5 w-5"/>Nova tarefa</h2><Input label="O que precisa ser feito?" value={title} onChange={e=>setTitle(e.target.value)} required/><Input label="Detalhes" value={description} onChange={e=>setDescription(e.target.value)}/><Input label="Prazo" type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}/>{error&&<p className="text-sm text-red-700">{error}</p>}<Button type="submit" loading={busy}>Criar tarefa</Button></form>
    <section className="space-y-3">{tasks.length===0?<p className="rounded-xl border border-dashed p-6 text-center text-slate-600">Nenhuma tarefa criada.</p>:tasks.map(task=><article key={task.id} className={`flex items-start gap-3 rounded-xl border p-4 ${task.status==='done'?'bg-emerald-50 border-emerald-200':'bg-white border-slate-200'}`}><button onClick={()=>toggle(task)} className="mt-0.5 text-emerald-700"><CheckCircle2 className="h-6 w-6"/></button><div><p className={`font-semibold text-slate-900 ${task.status==='done'?'line-through':''}`}>{task.title}</p>{task.description&&<p className="text-sm text-slate-600">{task.description}</p>}{task.due_at&&<p className="mt-1 text-xs text-slate-500">Prazo: {new Date(task.due_at).toLocaleString('pt-BR')}</p>}</div></article>)}</section></div>;
}
