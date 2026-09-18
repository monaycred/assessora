'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

type Group = {
  id: string; name: string; description: string | null; group_type: 'club' | 'challenge';
  membership: { role: string; status: string };
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

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('convite') || '');
    fetch('/api/addiction/groups').then((response) => response.json())
      .then((data) => setGroups(data.groups || []))
      .catch(() => setError('Não foi possível carregar os grupos'));
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

  return <div className="space-y-6 p-6">
    <div><Link href="/addiction" className="text-sm text-primary-500">← Controle de Vícios</Link>
      <h1 className="mt-3 text-3xl font-bold text-dark-100">Meus grupos</h1>
      <p className="text-sm text-dark-400">Cada grupo tem seus próprios membros, publicações e progresso.</p>
    </div>
    {error && <p className="rounded-lg border border-red-500/40 p-3 text-sm text-red-400">{error}</p>}
    <div className="grid gap-3 md:grid-cols-2">
      {groups.map((group) => <Link key={group.id} href={`/addiction/grupos/${group.id}`}>
        <Card className="h-full hover:border-primary-500/50">
          <h2 className="font-semibold text-dark-100">{group.name}</h2>
          <p className="mt-1 text-xs text-dark-400">{group.group_type === 'club' ? 'Grupo contínuo' : 'Desafio'} · {group.membership.status === 'pending' ? 'Aguardando aprovação' : 'Membro ativo'}</p>
          {group.description && <p className="mt-2 text-sm text-dark-300">{group.description}</p>}
        </Card>
      </Link>)}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><h2 className="mb-4 text-lg font-semibold">Criar grupo</h2>
        <form onSubmit={createGroup} className="space-y-3">
          <Input label="Nome do grupo" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={80} />
          <Input label="Descrição (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
          <label className="block text-sm">Tipo
            <select className="mt-1 w-full rounded-lg border border-dark-700 bg-dark-900 p-2" value={groupType} onChange={(event) => setGroupType(event.target.value as 'club' | 'challenge')}>
              <option value="club">Grupo contínuo</option><option value="challenge">Desafio com prazo</option>
            </select>
          </label>
          {groupType === 'challenge' && <div className="grid grid-cols-2 gap-2">
            <Input label="Início" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required />
            <Input label="Fim" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required />
          </div>}
          <label className="block text-sm">Entrada por convite
            <select className="mt-1 w-full rounded-lg border border-dark-700 bg-dark-900 p-2" value={joinPolicy} onChange={(event) => setJoinPolicy(event.target.value as 'approval' | 'link')}>
              <option value="approval">Responsável aprova cada membro</option><option value="link">Entra ao usar o link</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rankingEnabled} onChange={(event) => setRankingEnabled(event.target.checked)} /> Mostrar ranking opcional</label>
          <Button type="submit" disabled={busy}>Criar grupo</Button>
        </form>
      </Card>
      <Card><h2 className="mb-4 text-lg font-semibold">Entrar com convite</h2>
        <form onSubmit={joinGroup} className="space-y-3">
          <Input label="Código do convite" value={token} onChange={(event) => setToken(event.target.value)} required />
          <p className="text-sm text-dark-300">Seu apelido no grupo: <strong>{nickname || 'seu primeiro nome'}</strong>. Você pode alterá-lo em <Link href="/configuracoes" className="text-primary-400">Configurações</Link>.</p>
          <p className="text-xs text-dark-400">É necessário ter cadastro completo e aprovado na Iasmin.</p>
          <Button type="submit" disabled={busy}>Entrar no grupo</Button>
        </form>
      </Card>
    </div>
  </div>;
}
