'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowRight, CircleCheck, Clock3, HeartHandshake, Link2, Plus, Users } from 'lucide-react';

type Group = {
  id: string; name: string; description: string | null; group_type: 'club' | 'challenge';
  membership: { role: string; status: string };
  pending_count: number;
};
type FeaturedGroup = { id: string; name: string; description: string | null; category_slug: string; member_count: number; best_days: number; joined: boolean };
const communityStyle: Record<string,{emoji:string;card:string;button:string}> = {
  acucar:{emoji:'🍬',card:'from-pink-50 to-rose-100 border-rose-300',button:'bg-rose-600 hover:bg-rose-700'},
  alcool:{emoji:'🌿',card:'from-emerald-50 to-teal-100 border-emerald-300',button:'bg-emerald-600 hover:bg-emerald-700'},
  cigarro:{emoji:'🫁',card:'from-sky-50 to-cyan-100 border-sky-300',button:'bg-sky-600 hover:bg-sky-700'},
  maconha:{emoji:'🌱',card:'from-lime-50 to-green-100 border-lime-300',button:'bg-lime-600 hover:bg-lime-700'},
  instagram:{emoji:'📵',card:'from-fuchsia-50 to-purple-100 border-fuchsia-300',button:'bg-fuchsia-600 hover:bg-fuchsia-700'},
  pornografia:{emoji:'🛡️',card:'from-violet-50 to-indigo-100 border-violet-300',button:'bg-violet-600 hover:bg-violet-700'},
  delivery:{emoji:'🥡',card:'from-orange-50 to-amber-100 border-orange-300',button:'bg-orange-600 hover:bg-orange-700'},
  'guardar-dinheiro':{emoji:'💰',card:'from-yellow-50 to-emerald-100 border-emerald-300',button:'bg-emerald-600 hover:bg-emerald-700'},
};

export default function GruposPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [featuredGroups, setFeaturedGroups] = useState<FeaturedGroup[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<'club' | 'challenge'>('club');
  const [joinPolicy, setJoinPolicy] = useState<'approval' | 'link'>('approval');
  const [rankingEnabled, setRankingEnabled] = useState(true);
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [token, setToken] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('convite') || '');
    fetch('/api/addiction/groups').then((response) => response.json())
      .then((data) => { setGroups(data.groups || []); setFeaturedGroups(data.featured_groups || []); })
      .catch(() => setError('Não foi possível carregar os grupos'))
      .finally(() => setLoadingGroups(false));
    fetch('/api/profile').then((response) => response.json())
      .then((data) => setNickname(data.profile?.nickname || ''))
      .catch(() => undefined);
  }, []);

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/addiction/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, group_type: groupType, join_policy: joinPolicy,
          starts_on: startsOn, ends_on: endsOn, ranking_enabled: rankingEnabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar grupo');
      router.push(`/addiction/grupos/${data.group.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao criar grupo'); }
    finally { setBusy(false); }
  }

  async function joinGroup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/addiction/groups/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), loyalty_accepted: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao entrar no grupo');
      router.push(`/addiction/grupos/${data.group_id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Convite inválido'); }
    finally { setBusy(false); }
  }

  async function joinFeatured(groupId: string) {
    setBusy(true); setError('');
    try {
      const accepted = window.confirm('Compromisso do grupo: registrarei meu progresso com honestidade para respeitar os demais participantes. Deseja entrar?');
      if (!accepted) { setBusy(false); return; }
      const response = await fetch('/api/addiction/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, loyalty_accepted: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar');
      router.push(`/addiction/grupos/${data.group_id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar'); }
    finally { setBusy(false); }
  }

  const pendingTotal = groups.reduce((total, group) => total + (group.pending_count || 0), 0);
  const discoverGroups = featuredGroups.filter((group) => !group.joined);
  return <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 pb-12 sm:p-6">
    <Link href="/addiction" className="order-0 inline-flex min-h-10 items-center text-sm font-semibold text-blue-700 hover:underline">← Jornadas</Link>
    <header className="order-0 rounded-3xl bg-gradient-to-br from-blue-700 via-cyan-500 to-emerald-400 p-5 text-white shadow-xl sm:p-8">
      <div className="flex items-start gap-4"><div className="rounded-2xl bg-white/20 p-3"><HeartHandshake className="h-7 w-7" /></div>
        <div><h1 className="text-2xl font-bold sm:text-3xl">Grupos de apoio</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/90 sm:text-base">Convide pessoas, acompanhe pedidos de entrada e compartilhe seu progresso no seu ritmo.</p>
        </div></div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section className="order-3 space-y-3">
      <div><h2 className="text-xl font-black text-slate-950">Descobrir novas comunidades</h2><p className="text-sm text-slate-600">Aqui aparecem somente comunidades das quais você ainda não participa.</p></div>
      {discoverGroups.length === 0 ? <div className="rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm font-semibold text-blue-900">Você já participa de todas as comunidades sugeridas 🎉</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{discoverGroups.map((group) => {const style=communityStyle[group.category_slug]||{emoji:'💪',card:'from-blue-50 to-indigo-100 border-blue-300',button:'bg-blue-600 hover:bg-blue-700'};return <article key={group.id} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-md transition hover:-translate-y-1 hover:shadow-xl ${style.card}`}>
        <div className="absolute -right-4 -top-4 text-7xl opacity-15">{style.emoji}</div><div className="relative"><span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm">{style.emoji}</span><h3 className="text-lg font-extrabold text-slate-950">{group.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-slate-700">{group.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white p-2"><strong className="block text-lg text-emerald-800">{group.member_count}</strong><span className="text-xs text-slate-600">participantes</span></div><div className="rounded-xl bg-white p-2"><strong className="block text-lg text-blue-800">{group.best_days}</strong><span className="text-xs text-slate-600">melhor sequência</span></div></div>
        <Button type="button" onClick={() => joinFeatured(group.id)} disabled={busy} className={`mt-3 w-full ${style.button}`}>Entrar nesta comunidade</Button></div>
      </article>})}</div>}
    </section>
    {pendingTotal > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
      <div className="flex items-center gap-3"><Clock3 className="h-6 w-6 text-amber-700" /><p className="font-semibold">{pendingTotal} {pendingTotal === 1 ? 'pessoa aguarda' : 'pessoas aguardam'} sua aprovação</p></div>
      <a href="#meus-grupos" className="font-semibold text-amber-800 underline">Ver pedidos ↓</a>
    </div>}
    <section id="meus-grupos" className="order-1 scroll-mt-20 space-y-3">
      <div className="flex items-center gap-2"><Users className="h-6 w-6 text-blue-700" /><h2 className="text-xl font-black text-slate-950">Minhas comunidades</h2></div>
      {loadingGroups ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Carregando seus grupos...</p> : groups.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Você ainda não participa de um grupo. Crie um abaixo ou entre com um convite.</p> :
        <div className="grid gap-3 sm:grid-cols-2">{groups.map((group) => <Link key={group.id} href={`/addiction/grupos/${group.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold text-slate-900 break-words">{group.name}</h3><ArrowRight className="h-5 w-5 shrink-0 text-emerald-700 transition group-hover:translate-x-1" /></div>
          <p className="mt-2 text-sm text-slate-600">{group.group_type === 'club' ? 'Grupo contínuo' : 'Desafio com prazo'}</p>
          <div className="mt-3 flex flex-wrap gap-2">{group.pending_count > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{group.pending_count} {group.pending_count === 1 ? 'pedido para aprovar' : 'pedidos para aprovar'}</span>}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${group.membership.status === 'pending' ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'}`}>{group.membership.status === 'pending' ? 'Sua entrada aguarda o responsável' : group.membership.role === 'owner' ? 'Você é responsável' : 'Acesso liberado'}</span></div>
          {group.description && <p className="mt-3 text-sm text-slate-600">{group.description}</p>}
        </Link>)}</div>}
    </section>
    <div className="order-4 grid gap-5 lg:grid-cols-2">
      <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-800"><Plus className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-900">Criar um grupo</h2><p className="text-sm text-slate-600">Você escolhe como as pessoas entram.</p></div></div>
        <form onSubmit={createGroup} className="space-y-4">
          <Input label="Nome do grupo" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={80} />
          <Input label="Descrição (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
          <label className="block text-sm font-medium text-slate-800">Tipo de grupo
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900" value={groupType} onChange={(event) => setGroupType(event.target.value as 'club' | 'challenge')}>
              <option value="club">Grupo contínuo</option><option value="challenge">Desafio com prazo</option>
            </select>
          </label>
          {groupType === 'challenge' && <div className="grid gap-3 sm:grid-cols-2"><Input label="Data de início" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required /><Input label="Data de término" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required /></div>}
          <label className="block text-sm font-medium text-slate-800">Como funciona a entrada
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900" value={joinPolicy} onChange={(event) => setJoinPolicy(event.target.value as 'approval' | 'link')}>
              <option value="approval">Eu aprovo cada pessoa</option><option value="link">Entra automaticamente pelo convite</option>
            </select>
          </label>
          <p className="rounded-lg bg-white p-3 text-sm text-slate-600">{joinPolicy === 'approval' ? 'Quando alguém usar seu convite, um pedido aparecerá aqui para você aprovar.' : 'Quem usar o convite entra imediatamente no grupo.'}</p>
          <label className="flex items-start gap-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-950"><input type="checkbox" checked={rankingEnabled} onChange={e=>setRankingEnabled(e.target.checked)} className="mt-1"/><span><b>Ativar ranking</b><span className="block font-normal">Use em desafios e jornadas. Comunidades de filmes, dicas e interesses podem ficar sem ranking.</span></span></label>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">Criar grupo</Button>
        </form>
      </Card>
      <Card className="border-blue-200 bg-blue-50/60 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-100 p-2 text-blue-800"><Link2 className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-slate-900">Recebeu um convite?</h2><p className="text-sm text-slate-600">Use o código ou abra o link recebido.</p></div></div>
        <form onSubmit={joinGroup} className="space-y-4">
          <Input label="Código do convite" value={token} onChange={(event) => setToken(event.target.value)} required />
          <p className="rounded-lg bg-white p-3 text-sm text-slate-700">Seu nome no grupo será <strong>{nickname || 'seu primeiro nome'}</strong>. Para mudar, acesse <Link href="/configuracoes" className="font-semibold text-blue-700 underline">Configurações</Link>.</p>
          <p className="flex items-start gap-2 text-sm text-slate-600"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />Você precisa ter cadastro completo e aprovado na Iasmin. Alguns grupos também pedem aprovação do responsável.</p>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">Solicitar entrada</Button>
        </form>
      </Card>
    </div>
  </div>;
}
