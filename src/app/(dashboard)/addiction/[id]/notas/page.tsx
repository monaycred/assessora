'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddictionTracker, AddictionEntry } from '@/types/addiction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatDateBR } from '@/lib/addiction/utils';

interface NotasPageProps {
  params: { id: string };
}

export default function NotasPage({ params }: NotasPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState<AddictionTracker | null>(null);
  const [entries, setEntries] = useState<AddictionEntry[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    notes: '',
    metrics: {
      saved_money: '',
      not_consumed: '',
      custom: '',
    },
    mood: 3,
  });

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/addiction/trackers/${params.id}`);
      if (!res.ok) throw new Error('Tracker não encontrado');
      const data = await res.json();
      setTracker(data.tracker);
      setEntries(data.recentEntries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const metrics: Record<string, any> = {};

      if (formData.metrics.saved_money) {
        metrics.saved_money = parseFloat(formData.metrics.saved_money);
      }
      if (formData.metrics.not_consumed) {
        metrics.not_consumed = parseInt(formData.metrics.not_consumed);
      }
      if (formData.metrics.custom) {
        metrics.custom = formData.metrics.custom;
      }

      const res = await fetch(`/api/addiction/trackers/${params.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: today,
          notes: formData.notes.trim() || undefined,
          metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
          mood: formData.mood,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      // Recarregar entries
      await fetchData();
      setShowForm(false);
      setFormData({ notes: '', metrics: { saved_money: '', not_consumed: '', custom: '' }, mood: 3 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-red-600">Tracker não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/addiction">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">📝 Diário</h1>
        <p className="text-gray-600 mt-2">{tracker.name}</p>
      </div>

      {/* New Entry Form */}
      {showForm ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Adicionar Nota Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notas */}
              <div>
                <Label htmlFor="notes">Como você se sentiu? (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Passei por um gatilho no trabalho mas consegui resistir..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.notes.length}/500
                </p>
              </div>

              {/* Humor */}
              <div>
                <Label>Como está seu humor?</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={
                        formData.mood === num ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setFormData({ ...formData, mood: num })}
                    >
                      {[
                        '😢',
                        '😕',
                        '😐',
                        '🙂',
                        '😄',
                      ][num - 1]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Métricas */}
              <div className="space-y-3 border-t pt-4">
                <p className="font-semibold text-sm">Métricas (opcional)</p>

                <div>
                  <Label htmlFor="savedMoney">Economizou dinheiro? (R$)</Label>
                  <Input
                    id="savedMoney"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.00"
                    value={formData.metrics.saved_money}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metrics: {
                          ...formData.metrics,
                          saved_money: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="notConsumed">Quantos não consumidos?</Label>
                  <Input
                    id="notConsumed"
                    type="number"
                    placeholder="Ex: 5 cigarros, 1 bebida"
                    value={formData.metrics.not_consumed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metrics: {
                          ...formData.metrics,
                          not_consumed: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="custom">Outra métrica?</Label>
                  <Input
                    id="custom"
                    placeholder="Ex: Bebi 2 litros de água, fiz exercício"
                    value={formData.metrics.custom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metrics: {
                          ...formData.metrics,
                          custom: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {saving ? 'Salvando...' : 'Salvar Nota'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button className="mb-8 w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Nota Hoje
        </Button>
      )}

      {/* Entries List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Histórico de Notas</h2>

        {entries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-600">
              Nenhuma nota registrada ainda
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {formatDateBR(entry.entry_date)}
                      </CardTitle>
                      {entry.mood && (
                        <CardDescription className="mt-1">
                          Humor:{' '}
                          {
                            ['😢', '😕', '😐', '🙂', '😄'][
                              entry.mood - 1
                            ]
                          }
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {entry.notes && (
                    <div>
                      <p className="text-sm text-gray-700">{entry.notes}</p>
                    </div>
                  )}

                  {entry.metrics && Object.keys(entry.metrics).length > 0 && (
                    <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
                      {entry.metrics.saved_money && (
                        <p>💰 Economizou R$ {entry.metrics.saved_money}</p>
                      )}
                      {entry.metrics.not_consumed && (
                        <p>🚫 Não consumidos: {entry.metrics.not_consumed}</p>
                      )}
                      {entry.metrics.custom && (
                        <p>📊 {entry.metrics.custom}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
