// ============================================================
// PÁGINA - Addiction Tracker Dashboard
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { AddictionTracker } from '@/types/addiction';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { TrackerCard } from '@/components/addiction/TrackerCard';
import { CommunityRanking } from '@/components/addiction/CommunityRanking';
import { CommunityFeed } from '@/components/addiction/CommunityFeed';
import { CreatePostModal } from '@/components/addiction/CreatePostModal';
import Link from 'next/link';

export default function AddictionTrackerPage() {
  const [trackers, setTrackers] = useState<AddictionTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('meus-trackers');

  useEffect(() => {
    fetchTrackers();
  }, []);

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
    <div className="flex-1 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Controle de Vícios</h1>
          <p className="text-gray-600 mt-1">
            Rastreie seu progresso na jornada de recuperação
          </p>
        </div>
        <Link href="/addiction/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Rastreador
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="meus-trackers">Meus Trackers</TabsTrigger>
          <TabsTrigger value="comunidade">Comunidade</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        {/* Tab 1: Meus Trackers */}
        <TabsContent value="meus-trackers" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Carregando...</div>
          ) : trackers.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600">Você ainda não tem nenhum tracker</p>
              <Link href="/addiction/novo">
                <Button>Criar Seu Primeiro Tracker</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trackers.map((tracker) => (
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
