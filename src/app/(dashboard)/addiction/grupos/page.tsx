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

export default function GruposPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<'club' | 'challenge'>('club');
  const [joinPolicy, setJoinPolicy] = useState<'approval' | 'link'>('approval');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [rankingEnabled, setRankingEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('convite') || '');
    fetch('/api/addiction/groups').then((response) => response.json())
      .then((data) => setGroups(data.groups || []))
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
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao entrar no grupo');
      router.push(`/addiction/grupos/${data.group_id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Convite inválido'); }
    finally { setBusy(false); }
  }

  const pendingTotal = groups.reduce((total, group) => total + (group.pending_count || 0), 0);
  return <div className="mx-auto max-w-6xl space-y-6 p-4 pb-12 sm:p-6">
    <Link href="/addiction" className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-700 hover:underline">← Controle de Vícios</Link>
    <header className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 p-5 text-white shadow-lg sm:p-8">
      <div className="flex items-start gap-4"><div className="rounded-2xl bg-white/20 p-3"><HeartHandshake className="h-7 w-7" /></div>
        <div><h1 className="text-2xl font-bold sm:text-3xl">Grupos de apoio</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/90 sm:text-base">Convide pessoas, acompanhe pedidos de entrada e compartilhe seu progresso no seu ritmo.</p>
        </div></div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {pendingTotal > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
      <div className="flex items-center gap-3"><Clock3 className="h-6 w-6 text-amber-700" /><p className="font-semibold">{pendingTotal} {pendingTotal === 1 ? 'pessoa aguarda' : 'pessoas aguardam'} sua aprovação</p></div>
      <a href="#meus-grupos" className="font-semibold text-amber-800 underline">Ver pedidos ↓</a>
    </div>}
    <section id="meus-grupos" className="scroll-mt-20 space-y-3">
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-700" /><h2 className="text-xl font-bold text-slate-900">Meus grupos</h2></div>
      {loadingGroups ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Carregando seus grupos...</p> : groups.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Você ainda não participa de um grupo. Crie um abaixo ou entre com um convite.</p> :
        <div className="grid gap-3 sm:grid-cols-2">{groups.map((group) => <Link key={group.id} href={`/addiction/grupos/${group.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
          <div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold text-slate-900 break-words">{group.name}</h3><ArrowRight className="h-5 w-5 shrink-0 text-emerald-700 transition group-hover:translate-x-1" /></div>
          <p className="mt-2 text-sm text-slate-600">{group.group_type === 'club' ? 'Grupo contínuo' : 'Desafio com prazo'}</p>
          <div className="mt-3 flex flex-wrap gap-2">{group.pending_count > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{group.pending_count} {group.pending_count === 1 ? 'pedido para aprovar' : 'pedidos para aprovar'}</span>}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${group.membership.status === 'pending' ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'}`}>{group.membership.status === 'pending' ? 'Sua entrada aguarda o responsável' : group.membership.role === 'owner' ? 'Você é responsável' : 'Acesso liberado'}</span></div>
          {group.description && <p className="mt-3 text-sm text-slate-600">{group.description}</p>}
        </Link>)}</div>}
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
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
          <label className="flex items-center gap-3 text-sm font-medium text-slate-800"><input type="checkbox" checked={rankingEnabled} onChange={(event) => setRankingEnabled(event.target.checked)} className="h-4 w-4 accent-emerald-600" /> Mostrar ranking opcional</label>
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
