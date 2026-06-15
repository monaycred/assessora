'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddictionTracker } from '@/types/addiction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { isValidCommunityName, milestonesToDays } from '@/lib/addiction/utils';

interface EditTrackerPageProps {
  params: { id: string };
}

export default function EditTrackerPage({ params }: EditTrackerPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState<AddictionTracker | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_days: null as number | null,
    notification_time: '07:00',
    is_public: false,
    community_name_custom: '',
  });

  const [milestonesText, setMilestonesText] = useState('');

  useEffect(() => {
    fetchTracker();
  }, [params.id]);

  const fetchTracker = async () => {
    try {
      const res = await fetch(`/api/addiction/trackers/${params.id}`);
      if (!res.ok) throw new Error('Tracker não encontrado');
      const data = await res.json();
      const t = data.tracker;
      setTracker(t);

      // Preencher form
      setFormData({
        name: t.name,
        description: t.description || '',
        goal_days: t.goal_days,
        notification_time: t.notification_time,
        is_public: t.is_public,
        community_name_custom: t.community_name_custom || '',
      });

      // Marcos em dias (legível)
      const milestoneDays = milestonesToDays(t.custom_milestones || []);
      setMilestonesText(milestoneDays.join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tracker');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validar nome comunidade
      if (formData.is_public && formData.community_name_custom) {
        const validation = isValidCommunityName(formData.community_name_custom);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      const res = await fetch(`/api/addiction/trackers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          goal_days: formData.goal_days,
          notification_time: formData.notification_time,
          is_public: formData.is_public,
          community_name_custom: formData.community_name_custom || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar');
      }

      router.push(`/addiction`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza? Todos os dados deste tracker serão deletados permanentemente.')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/addiction/trackers/${params.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao deletar');
      }

      router.push('/addiction');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <p className="text-red-600">Tracker não encontrado</p>
        <Link href="/addiction">
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/addiction">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">⚙️ Configurações</h1>
        <p className="text-gray-600 mt-2">{tracker.name}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Básico */}
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Meta e Notificações */}
        <Card>
          <CardHeader>
            <CardTitle>Meta e Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="goal">Meta (dias)</Label>
              <Input
                id="goal"
                type="number"
                min="1"
                value={formData.goal_days || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goal_days: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Deixe vazio para sem limite"
              />
            </div>
            <div>
              <Label htmlFor="notificationTime">Hora de notificação</Label>
              <Input
                id="notificationTime"
                type="time"
                value={formData.notification_time}
                onChange={(e) =>
                  setFormData({ ...formData, notification_time: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Comunidade */}
        <Card>
          <CardHeader>
            <CardTitle>Comunidade</CardTitle>
            <CardDescription>
              Apareça no ranking e feed da comunidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) =>
                  setFormData({ ...formData, is_public: e.target.checked })
                }
              />
              <span className="text-sm">Aparecer na comunidade</span>
            </label>

            {formData.is_public && (
              <div>
                <Label htmlFor="communityName">Seu nome na comunidade</Label>
                <Input
                  id="communityName"
                  placeholder={tracker.community_name}
                  value={formData.community_name_custom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      community_name_custom: e.target.value,
                    })
                  }
                  maxLength={20}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Deixe vazio para usar: <strong>{tracker.community_name}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Marcos (readonly) */}
        <Card>
          <CardHeader>
            <CardTitle>Marcos</CardTitle>
            <CardDescription>Seus marcos customizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                {milestonesText || 'Nenhum marco configurado'}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Para mudar marcos, delete este tracker e crie um novo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/addiction" className="flex-1">
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1"
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar Mudanças'}
          </Button>
        </div>

        {/* Delete */}
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar Tracker
        </Button>
      </form>
    </div>
  );
}
