// ============================================================
// PÁGINA - Addiction Tracker Dashboard
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { AddictionTracker } from '@/types/addiction';
import Button from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Plus } from 'lucide-react';
import { TrackerCard } from '@/components/addiction/TrackerCard';
import { CommunityRanking } from '@/components/addiction/CommunityRanking';
import { CommunityFeed } from '@/components/addiction/CommunityFeed';
import { CreatePostModal } from '@/components/addiction/CreatePostModal';
import Link from 'next/link';
import MotivationalQuote from '@/components/addiction/MotivationalQuote';

export default function AddictionTrackerPage() {
  const [trackers, setTrackers] = useState<AddictionTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('meus-trackers');
  const [checkins, setCheckins] = useState<Record<string, string>>({});
  const [checkinError, setCheckinError] = useState('');

  useEffect(() => {
    fetchTrackers();
    fetch('/api/addiction/checkins').then((response) => response.json()).then((data) => {
      setCheckins(Object.fromEntries((data.checkins || []).map((item: { tracker_id: string; status: string }) => [item.tracker_id, item.status])));
    }).catch(() => undefined);
  }, []);

  const answerCheckin = async (trackerId: string, status: string) => {
    setCheckinError('');
    const response = await fetch('/api/addiction/checkins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracker_id: trackerId, status }),
    });
    const result = await response.json();
    if (!response.ok) return setCheckinError(result.error || 'Não foi possível registrar sua resposta');
    setCheckins((previous) => ({ ...previous, [trackerId]: status }));
    if (status === 'lapse') fetchTrackers();
  };

  const fetchTrackers = async () => {
    try {
      const res = await fetch('/api/addiction/trackers');
      if (!res.ok) throw new Error('Erro ao buscar trackers');
      const data = await res.json();
      setTrackers(data.trackers || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl flex-1 space-y-8 p-4 sm:p-6">
      <MotivationalQuote />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Minhas jornadas</h1>
          <p className="text-gray-600 mt-1">
            Rastreie seu progresso na jornada de recuperação
          </p>
        </div>
        <Link href="/addiction/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova jornada
          </Button>
        </Link>
      </div>
      <Link href="/addiction/grupos" className="inline-flex rounded-md border border-green-500 px-4 py-2 text-sm text-green-700 hover:bg-green-50">
        Meus grupos e desafios →
      </Link>
      <p className="text-sm text-gray-600">O check-in diário também chega pelo WhatsApp no horário configurado em cada rastreador. Sua resposta é privada.</p>
      {checkinError && <p role="alert" className="text-sm text-red-600">{checkinError}</p>}

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">🏆 Destaques da comunidade</h2><button type="button" onClick={() => setActiveTab('ranking')} className="text-sm font-semibold text-emerald-700">Ver ranking completo →</button></div>
        <CommunityRanking limit={3} />
      </section>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="meus-trackers">Minhas jornadas</TabsTrigger>
          <TabsTrigger value="comunidade">Comunidade</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        {/* Tab 1: Meus Trackers */}
        <TabsContent value="meus-trackers" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Carregando...</div>
          ) : trackers.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">Você ainda não começou uma jornada</p>
              <Link href="/addiction/novo">
                <Button>Começar minha primeira jornada</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trackers.map((tracker) => (
                <div key={tracker.id} className="space-y-2">
                <TrackerCard
                  key={tracker.id}
                  tracker={tracker}
                  onEdit={() => {
                    // TODO: Implementar edição
                  }}
                  onShare={() => {
                    // TODO: Implementar nota
                  }}
                  showActions={true}
                />
                {checkins[tracker.id] && checkins[tracker.id] !== 'pending' ? (
                  <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">Resposta de hoje registrada: {checkins[tracker.id] === 'success' ? 'segui minha meta' : checkins[tracker.id] === 'lapse' ? 'não consegui hoje' : 'preciso de apoio'}.</p>
                ) : (
                  <div className="flex flex-wrap gap-2" aria-label={`Check-in de ${tracker.name}`}>
                    <Button size="sm" onClick={() => answerCheckin(tracker.id, 'success')}>Hoje consegui</Button>
                    <Button size="sm" variant="outline" onClick={() => answerCheckin(tracker.id, 'lapse')}>Hoje não consegui</Button>
                    <Button size="sm" variant="outline" onClick={() => answerCheckin(tracker.id, 'support')}>Preciso de apoio</Button>
                  </div>
                )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Comunidade */}
        <TabsContent value="comunidade" className="space-y-4">
          <div className="space-y-4">
            {/* Header com botão novo post */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Compartilhe com a comunidade</p>
              {trackers.length > 0 && (
                <CreatePostModal
                  trackerId={trackers[0].id}
                  onSuccess={() => window.location.reload()}
                />
              )}
            </div>

            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button variant="outline" size="sm">
                Tudo
              </Button>
              <Button variant="outline" size="sm">
                ✨ Vitórias
              </Button>
              <Button variant="outline" size="sm">
                💔 Desafios
              </Button>
              <Button variant="outline" size="sm">
                💡 Dicas
              </Button>
            </div>

            {/* Feed */}
            <CommunityFeed
              type="all"
              limit={20}
              userTrackerId={trackers.length > 0 ? trackers[0].id : undefined}
            />
          </div>
        </TabsContent>

        {/* Tab 3: Ranking */}
        <TabsContent value="ranking" className="space-y-4">
          <CommunityRanking limit={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
