'use client';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import Modal from '@/components/ui/Modal';
import { Camera, Globe2, Loader2, Plus, Users } from 'lucide-react';

interface Props { trackerId: string; onSuccess?: () => void }
interface Group { id: string; name: string; membership?: { status: string } }
const TYPES = [{type:'victory',emoji:'✨',label:'Vitória'},{type:'challenge',emoji:'🌱',label:'Desafio'},{type:'tip',emoji:'💡',label:'Dica'},{type:'general',emoji:'💬',label:'Geral'}] as const;

export function CreatePostModal({ trackerId, onSuccess }: Props) {
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const [title,setTitle]=useState(''),[content,setContent]=useState(''),[postType,setPostType]=useState('general');
  const [audience,setAudience]=useState<'global'|'groups'>('global'),[groups,setGroups]=useState<Group[]>([]),[selected,setSelected]=useState<string[]>([]);
  const [image,setImage]=useState<File|null>(null); const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(open) fetch('/api/addiction/groups').then(r=>r.json()).then(d=>setGroups((d.groups||[]).filter((g:Group)=>g.membership?.status==='active')))},[open]);
  const chooseAll=()=>setSelected(selected.length===groups.length?[]:groups.map(g=>g.id));
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setError(null);try{
    let imageUrl:string|null=null;
    if(image){const form=new FormData();form.append('image',image);const upload=await fetch('/api/community/upload',{method:'POST',body:form});const data=await upload.json();if(!upload.ok)throw new Error(data.error);imageUrl=data.url}
    const res=await fetch('/api/community/feed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tracker_id:trackerId,title:title.trim(),content:content.trim(),post_type:postType,audience,group_ids:selected,image_url:imageUrl})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Erro ao publicar');
    setTitle('');setContent('');setImage(null);setAudience('global');setSelected([]);setOpen(false);onSuccess?.();
  }catch(err){setError(err instanceof Error?err.message:'Erro ao publicar')}finally{setLoading(false)}}
  return <><Button onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Novo post</Button>
  <Modal open={open} onClose={()=>setOpen(false)} title="Criar publicação"><form onSubmit={submit} className="space-y-5">
    <div><Label>Onde publicar?</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={()=>setAudience('global')} className={`rounded-2xl border-2 p-3 text-left ${audience==='global'?'border-blue-500 bg-blue-50':'border-slate-200'}`}><Globe2 className="mb-1 h-5 w-5 text-blue-600"/><b>Global</b><small className="block text-slate-600">Todos na Iasmin podem ver</small></button>
      <button type="button" onClick={()=>setAudience('groups')} className={`rounded-2xl border-2 p-3 text-left ${audience==='groups'?'border-purple-500 bg-purple-50':'border-slate-200'}`}><Users className="mb-1 h-5 w-5 text-purple-600"/><b>Meus grupos</b><small className="block text-slate-600">Escolha um ou vários</small></button>
    </div></div>
    {audience==='groups'&&<div className="rounded-2xl bg-purple-50 p-3"><button type="button" onClick={chooseAll} className="mb-2 text-sm font-bold text-purple-800">{selected.length===groups.length&&groups.length?'Desmarcar todos':'Selecionar todos os meus grupos'}</button>{groups.length?<div className="space-y-2">{groups.map(g=><label key={g.id} className="flex min-h-11 items-center gap-3 rounded-xl bg-white px-3"><input type="checkbox" checked={selected.includes(g.id)} onChange={()=>setSelected(s=>s.includes(g.id)?s.filter(id=>id!==g.id):[...s,g.id])}/><span className="font-semibold">{g.name}</span></label>)}</div>:<p className="text-sm text-slate-600">Você ainda não participa de um grupo.</p>}</div>}
    <div><Label>Tipo</Label><div className="mt-2 grid grid-cols-4 gap-2">{TYPES.map(t=><button key={t.type} type="button" onClick={()=>setPostType(t.type)} className={`rounded-xl border p-2 text-xs font-bold ${postType===t.type?'border-emerald-500 bg-emerald-100':'border-slate-200'}`}><span className="block text-xl">{t.emoji}</span>{t.label}</button>)}</div></div>
    <div><Label htmlFor="post-title">Título</Label><input id="post-title" value={title} onChange={e=>setTitle(e.target.value.slice(0,100))} placeholder="Ex.: Minha primeira semana" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"/><p className="mt-1 text-right text-xs text-slate-500">{title.length}/100</p></div>
    <div><Label htmlFor="post-content">Conte sua história</Label><Textarea id="post-content" value={content} onChange={e=>setContent(e.target.value.slice(0,2000))} placeholder="Escreva com detalhes, compartilhe uma vitória ou peça apoio..." rows={7}/><p className="mt-1 text-right text-xs text-slate-500">{content.length}/2000</p></div>
    <div><input ref={fileRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setImage(e.target.files?.[0]||null)}/><button type="button" onClick={()=>fileRef.current?.click()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 font-bold text-sky-800"><Camera className="h-5 w-5"/>{image?image.name:'Adicionar foto (opcional)'}</button></div>
    {error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" className="flex-1" disabled={!title.trim()||!content.trim()||loading||(audience==='groups'&&!selected.length)}>{loading&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{loading?'Publicando...':'Publicar'}</Button></div>
  </form></Modal></>;
}
