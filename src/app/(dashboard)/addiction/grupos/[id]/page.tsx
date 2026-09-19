'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CircleCheck, Clock3, HeartHandshake, Link2, MessageCircle, Trophy, Users } from 'lucide-react';

interface GroupData {
  group: { id: string; name: string; description: string | null; image_url: string | null; group_type: string; join_policy: string; ranking_enabled: boolean; starts_on: string | null; ends_on: string | null };
  membership: { role: string; status: string };
  pending?: boolean;
  members?: { user_profile_id: string; nickname: string | null; avatar_url: string | null; role: string; status: string }[];
  posts?: { id: string; nickname: string; avatar_url: string | null; content: string; created_at: string; comments: { id: string; nickname: string; avatar_url: string | null; content: string; created_at: string }[] }[];
  own_trackers?: { id: string; name: string; shared: boolean; show_streak: boolean }[];
  ranking?: { nickname: string; avatar_url: string | null; days: number }[];
}

export default function GrupoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<GroupData | null>(null);
  const [content, setContent] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch(`/api/addiction/groups/${id}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Erro ao carregar grupo');
    setData(body);
  }
  useEffect(() => { load().catch((cause) => setError(cause.message)); }, [id]);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/addiction/groups/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar');
      if (body.action === 'invite') setInvite(`${window.location.origin}/addiction/grupos?convite=${result.token}`);
      else if (body.action === 'leave') router.push('/addiction');
      else { setContent(''); await load(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro inesperado'); }
    finally { setBusy(false); }
  }

  if (!data) return <div className="p-4 sm:p-6 text-slate-700"><Link href="/addiction/grupos" className="font-semibold text-emerald-700">← Grupos</Link><p className="mt-4">{error || 'Carregando...'}</p></div>;
  const manager = ['owner', 'moderator', 'admin'].includes(data.membership.role);
  const pendingMembers = data.members?.filter((member) => member.status === 'pending') || [];
  const activeMembers = data.members?.filter((member) => member.status === 'active') || [];
  const dateLabel = data.group.group_type === 'club' ? 'Grupo contínuo' :
    data.group.starts_on && data.group.ends_on ? `Desafio de ${new Date(`${data.group.starts_on}T12:00:00`).toLocaleDateString('pt-BR')} até ${new Date(`${data.group.ends_on}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Desafio com prazo';
  return <div className="mx-auto max-w-6xl space-y-5 p-4 pb-12 sm:p-6">
    <Link href="/addiction/grupos" className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-700 hover:underline">← Meus grupos</Link>
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-cyan-500 to-emerald-400 p-5 text-white shadow-lg sm:p-8">
      {data.group.image_url&&<><img src={data.group.image_url} alt="" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/65 to-slate-900/20"/></>}
      <div className="relative flex items-start gap-3"><div className="rounded-2xl bg-white/20 p-3"><HeartHandshake className="h-6 w-6" /></div><div className="min-w-0"><p className="text-sm font-medium text-white/90">{dateLabel}</p><h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">{data.group.name}</h1>{data.group.description && <p className="mt-2 text-sm leading-6 text-white/90">{data.group.description}</p>}</div></div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {data.pending ? <Card className="border-blue-300 bg-blue-50 p-5 sm:p-6"><div className="flex items-start gap-3"><Clock3 className="mt-1 h-6 w-6 shrink-0 text-blue-700" /><div><h2 className="text-lg font-bold text-blue-950">Seu pedido foi enviado</h2><p className="mt-1 text-sm leading-6 text-blue-900">O responsável precisa aprovar sua entrada. Assim que aprovar, você poderá ver as pessoas e publicações deste grupo.</p><p className="mt-3 text-sm text-blue-800">Você já tem cadastro aprovado na Iasmin. Esta é apenas a aprovação para entrar neste grupo.</p></div></div></Card> : <>
      {manager && <Card className={`space-y-4 shadow-sm ${pendingMembers.length ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2"><Clock3 className={`h-5 w-5 ${pendingMembers.length ? 'text-amber-700' : 'text-slate-600'}`} /><h2 className="text-lg font-bold text-slate-900">Pedidos para entrar {pendingMembers.length > 0 && `(${pendingMembers.length})`}</h2></div>
        {pendingMembers.length ? <div className="space-y-3">{pendingMembers.map((member) => <div key={member.user_profile_id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-900">{(member.nickname || 'P')[0]}</div>}<div><p className="font-bold text-slate-900">{member.nickname || 'Participante'}</p><p className="text-sm text-slate-600">Usou seu convite e aguarda sua decisão</p></div></div>
          <div className="grid grid-cols-2 gap-2 sm:flex"><Button onClick={() => act({ action: 'member', user_profile_id: member.user_profile_id, status: 'active' })} disabled={busy}>Aprovar</Button><Button variant="danger" onClick={() => act({ action: 'member', user_profile_id: member.user_profile_id, status: 'removed' })} disabled={busy} className="text-red-700">Recusar</Button></div>
        </div>)}</div> : <p className="text-sm text-slate-600">Nenhum pedido pendente. Quando alguém aceitar um convite com aprovação, aparecerá aqui.</p>}
      </Card>}
      <Card className="space-y-3 border-emerald-200 bg-emerald-50/60 shadow-sm">
        <div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-bold text-slate-900">Convidar pessoas</h2></div>
        <p className="text-sm leading-6 text-slate-700">O convite vale por 30 dias. Cada pessoa precisa de cadastro completo e aprovado na Iasmin. {data.group.join_policy === 'approval' ? 'Neste grupo, você aprova cada pedido de entrada.' : 'Neste grupo, quem usa o link entra imediatamente.'}</p>
        <Button onClick={() => act({ action: 'invite' })} disabled={busy} className="w-full sm:w-auto">Gerar link de convite</Button>
        {invite && <div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Link de convite" readOnly value={invite} className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white p-3 text-xs text-slate-800" /><Button variant="secondary" onClick={() => navigator.clipboard.writeText(invite)}>Copiar link</Button></div>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-blue-200 bg-blue-50/50"><h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><Users className="h-5 w-5 text-blue-700" />Membros ({activeMembers.length})</h2>
          <div className="space-y-2">{activeMembers.map((member) => <div key={member.user_profile_id} className="flex items-center gap-2 border-b border-blue-100 py-2 text-sm text-slate-800">
            {member.avatar_url && <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />}{member.nickname || 'Participante'} {member.role === 'owner' && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900">Responsável</span>}
          </div>)}</div>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50"><h2 className="mb-3 text-lg font-bold text-slate-900">Meu progresso no grupo</h2>
          <p className="text-sm leading-6 text-slate-700">Ao participar, sua melhor sequência ativa entra automaticamente no ranking. Seu diário e suas anotações continuam privados.</p>
        </Card>
      </div>

      {data.group.ranking_enabled && <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"><h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900"><Trophy className="h-6 w-6 text-amber-600"/>Ranking do grupo</h2>
        {data.ranking?.length ? data.ranking.map((entry, index) => <p key={`${entry.nickname}-${index}`} className="flex items-center gap-3 border-b border-amber-200 py-3 text-base font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-950">{index + 1}</span>{entry.avatar_url && <img src={entry.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />}<span className="min-w-0 flex-1 truncate">{entry.nickname}</span><strong>{entry.days} dias</strong></p>) : <p className="text-sm text-slate-700">Ninguém compartilhou o contador ainda.</p>}
      </Card>}

      <Card className="border-slate-200 bg-white"><h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><CircleCheck className="h-5 w-5 text-emerald-700" />Publicações do grupo</h2>
        <form onSubmit={(event) => { event.preventDefault(); act({ action: 'post', content }); }} className="mb-5 space-y-2">
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} placeholder="Compartilhe uma vitória ou peça apoio" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900" rows={3} />
          <Button type="submit" disabled={busy || !content.trim()}>Publicar</Button>
        </form>
        <div className="space-y-4">{data.posts?.map((post) => <div key={post.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">{post.avatar_url && <img src={post.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />}{post.nickname}<span className="font-normal text-slate-500">· {new Date(post.created_at).toLocaleDateString('pt-BR')}</span></p>
          <p className="mt-3 whitespace-pre-wrap text-base leading-6 text-slate-800">{post.content}</p>
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">{post.comments?.map(comment=><div key={comment.id} className="rounded-xl bg-white p-3 text-sm text-slate-800"><strong className="text-slate-950">{comment.nickname}</strong><p className="mt-1">{comment.content}</p></div>)}</div>
          <form className="mt-3 flex gap-2" onSubmit={async event=>{event.preventDefault();const value=(comments[post.id]||'').trim();if(!value)return;await act({action:'comment',post_id:post.id,content:value});setComments(current=>({...current,[post.id]:''}));}}><input aria-label="Escrever comentário" value={comments[post.id]||''} onChange={event=>setComments(current=>({...current,[post.id]:event.target.value}))} maxLength={300} placeholder="Comentar..." className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900"/><Button type="submit" size="sm" disabled={busy||!(comments[post.id]||'').trim()} aria-label="Enviar comentário"><MessageCircle className="h-4 w-4"/></Button></form>
        </div>)}</div>
      </Card>
      {!manager && <Button variant="outline" className="w-full border-red-200 text-red-700" onClick={()=>{if(confirm('Deseja sair deste grupo? Você deixará de ver as publicações e o ranking.'))void act({action:'leave'})}}>Sair do grupo</Button>}
    </>}
  </div>;
}
