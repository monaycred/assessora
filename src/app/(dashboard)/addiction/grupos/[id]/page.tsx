'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface GroupData {
  group: { id: string; name: string; description: string | null; group_type: string; ranking_enabled: boolean; starts_on: string | null; ends_on: string | null };
  membership: { role: string; status: string };
  pending?: boolean;
  members?: { user_profile_id: string; nickname: string | null; role: string; status: string }[];
  posts?: { id: string; nickname: string; content: string; created_at: string }[];
  own_trackers?: { id: string; name: string; shared: boolean; show_streak: boolean }[];
  ranking?: { nickname: string; days: number }[];
}

export default function GrupoPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GroupData | null>(null);
  const [content, setContent] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      else { setContent(''); await load(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro inesperado'); }
    finally { setBusy(false); }
  }

  if (!data) return <div className="p-6 text-dark-300"><Link href="/addiction/grupos" className="text-primary-500">← Grupos</Link><p className="mt-4">{error || 'Carregando...'}</p></div>;
  const manager = data.membership.role === 'owner' || data.membership.role === 'moderator';
  return <div className="space-y-6 p-6">
    <div><Link href="/addiction/grupos" className="text-sm text-primary-500">← Meus grupos</Link>
      <h1 className="mt-3 text-3xl font-bold">{data.group.name}</h1>
      <p className="text-sm text-dark-400">{data.group.group_type === 'club' ? 'Grupo contínuo' : `Desafio de ${data.group.starts_on} até ${data.group.ends_on}`}</p>
      {data.group.description && <p className="mt-2 text-dark-300">{data.group.description}</p>}
    </div>
    {error && <p className="rounded-lg border border-red-500/40 p-3 text-sm text-red-400">{error}</p>}
    {data.pending ? <Card><p>Sua entrada aguarda aprovação do responsável pelo grupo.</p></Card> : <>
      {manager && <Card className="space-y-3">
        <h2 className="font-semibold">Convidar pessoas</h2>
        <p className="text-sm text-dark-400">O convite vale por 30 dias. Cada pessoa precisa do cadastro completo e aprovação da Iasmin.</p>
        <Button onClick={() => act({ action: 'invite' })} disabled={busy}>Gerar link</Button>
        {invite && <div className="flex flex-wrap gap-2"><input readOnly value={invite} className="min-w-0 flex-1 rounded-lg border border-dark-700 bg-dark-900 p-2 text-xs" /><Button variant="secondary" onClick={() => navigator.clipboard.writeText(invite)}>Copiar</Button></div>}
      </Card>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-semibold">Membros</h2>
          <div className="space-y-2">{data.members?.map((member) => <div key={member.user_profile_id} className="flex items-center justify-between gap-2 border-b border-dark-700/40 py-2 text-sm">
            <span>{member.nickname || 'Participante'} {member.role === 'owner' && '· responsável'} {member.status === 'pending' && '· aguardando'}</span>
            {manager && member.status === 'pending' && <div className="flex gap-2"><Button size="sm" onClick={() => act({ action: 'member', user_profile_id: member.user_profile_id, status: 'active' })} disabled={busy}>Aprovar</Button><Button size="sm" variant="danger" onClick={() => act({ action: 'member', user_profile_id: member.user_profile_id, status: 'removed' })} disabled={busy}>Recusar</Button></div>}
          </div>)}</div>
        </Card>
        <Card><h2 className="mb-3 font-semibold">Meu progresso no grupo</h2>
          <p className="mb-3 text-xs text-dark-400">O diário permanece privado. Compartilhe apenas o contador que escolher.</p>
          {data.own_trackers?.map((tracker) => <div key={tracker.id} className="border-b border-dark-700/40 py-2 text-sm">
            <p className="font-medium">{tracker.name}</p>
            <label className="mr-4 inline-flex items-center gap-2"><input type="checkbox" checked={tracker.shared} disabled={busy} onChange={(event) => act({ action: 'share', tracker_id: tracker.id, enabled: event.target.checked, show_streak: false })} /> Participar</label>
            {tracker.shared && <label className="inline-flex items-center gap-2"><input type="checkbox" checked={tracker.show_streak} disabled={busy} onChange={(event) => act({ action: 'share', tracker_id: tracker.id, enabled: true, show_streak: event.target.checked })} /> Mostrar dias no ranking</label>}
          </div>)}
        </Card>
      </div>

      {data.group.ranking_enabled && <Card><h2 className="mb-3 font-semibold">Ranking do grupo</h2>
        {data.ranking?.length ? data.ranking.map((entry, index) => <p key={`${entry.nickname}-${index}`} className="border-b border-dark-700/40 py-2 text-sm">{index + 1}. {entry.nickname} · {entry.days} dias</p>) : <p className="text-sm text-dark-400">Ninguém compartilhou o contador ainda.</p>}
      </Card>}

      <Card><h2 className="mb-3 font-semibold">Publicações do grupo</h2>
        <form onSubmit={(event) => { event.preventDefault(); act({ action: 'post', content }); }} className="mb-5 space-y-2">
          <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} placeholder="Compartilhe uma vitória ou peça apoio" className="w-full rounded-lg border border-dark-700 bg-dark-900 p-3 text-sm" rows={3} />
          <Button type="submit" disabled={busy || !content.trim()}>Publicar</Button>
        </form>
        <div className="space-y-3">{data.posts?.map((post) => <div key={post.id} className="rounded-lg border border-dark-700/50 p-3">
          <p className="text-xs text-dark-400">{post.nickname} · {new Date(post.created_at).toLocaleDateString('pt-BR')}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{post.content}</p>
        </div>)}</div>
      </Card>
    </>}
  </div>;
}
