'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface RankingEntry {
  position: number;
  community_name: string;
  current_streak_days: number;
  best_streak_days: number;
}

interface CommunityRankingProps {
  limit?: number;
}

export function CommunityRanking({ limit = 10 }: CommunityRankingProps) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const res = await fetch(`/api/community/ranking?limit=${limit}`);
        if (!res.ok) throw new Error('Erro ao buscar ranking');
        const data = await res.json();
        setRanking(data.ranking || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [limit]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-red-600 text-sm">{error}</CardContent>
      </Card>
    );
  }

  if (ranking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 Ranking da Comunidade</CardTitle>
          <CardDescription>Ninguém na comunidade ainda</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Seja o primeiro a compartilhar sua jornada!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏆 Ranking da Comunidade</CardTitle>
        <CardDescription>Pessoas inspirando pessoas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ranking.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                {/* Posição */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">
                  {entry.position === 1 && <span className="text-yellow-600">🥇</span>}
                  {entry.position === 2 && <span className="text-gray-400">🥈</span>}
                  {entry.position === 3 && <span className="text-orange-600">🥉</span>}
                  {entry.position > 3 && <span className="text-gray-600 text-sm">{entry.position}</span>}
                </div>

                {/* Nome e detalhes */}
                <div>
                  <p className="font-semibold text-gray-900">{entry.community_name}</p>
                  <p className="text-xs text-gray-600">
                    Melhor: {entry.best_streak_days} dias
                  </p>
                </div>
              </div>

              {/* Dias atuais */}
              <div className="text-right">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  {entry.current_streak_days}d
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
