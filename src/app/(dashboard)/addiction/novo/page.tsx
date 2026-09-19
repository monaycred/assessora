'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const GOAL_PRESETS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: '1 ano', value: 365 },
  { label: 'Sem limite', value: null },
];

const DEFAULT_MILESTONES = [
  { days: 1, label: '24 horas' },
  { days: 3, label: '3 dias' },
  { days: 7, label: '7 dias' },
  { days: 10, label: '10 dias' },
  { days: 15, label: '15 dias' },
  { days: 20, label: '20 dias' },
  { days: 30, label: '30 dias' },
  { days: 45, label: '45 dias' },
  { days: 60, label: '60 dias' },
];

const JOURNEY_PRESETS = [
  { emoji: '🍺', label: 'Álcool', name: 'Sem álcool', description: 'Quero viver com mais clareza e saúde.' },
  { emoji: '🚭', label: 'Cigarro', name: 'Sem cigarro', description: 'Quero respirar melhor e recuperar minha saúde.' },
  { emoji: '🌿', label: 'Maconha', name: 'Sem maconha', description: 'Quero mais presença, autonomia e constância.' },
  { emoji: '📱', label: 'Instagram', name: 'Menos Instagram', description: 'Quero usar meu tempo com mais intenção.' },
  { emoji: '🍬', label: 'Açúcar', name: 'Sem açúcar', description: 'Quero melhorar minha alimentação e energia.' },
  { emoji: '🛡️', label: 'Pornografia', name: 'Sem pornografia', description: 'Quero retomar o controle dos meus hábitos.' },
  { emoji: '🥡', label: 'Delivery', name: 'Menos delivery', description: 'Quero cozinhar mais e reduzir pedidos por impulso.' },
  { emoji: '💰', label: 'Guardar dinheiro', name: 'Guardar dinheiro', description: 'Quero construir uma reserva e cuidar melhor das finanças.' },
];

export default function NovoTrackerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_days: 30 as number | null,
    custom_milestones: DEFAULT_MILESTONES.map((m) => m.days * 86400), // em segundos
  });

  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [customGoalDays, setCustomGoalDays] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/addiction/trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          goal_days: formData.goal_days,
          custom_milestones: formData.custom_milestones,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar tracker');
      }

      const data = await res.json();
      router.push(`/addiction?created=${data.tracker.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (value: number | null) => {
    setFormData({ ...formData, goal_days: value });
    setShowCustomGoal(false);
    setCustomGoalDays('');
  };

  const handleCustomGoalSubmit = () => {
    const days = parseInt(customGoalDays);
    if (isNaN(days) || days <= 0) {
      setError('Por favor, insira um número válido');
      return;
    }
    handleGoalChange(days);
  };

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
        <h1 className="text-3xl font-bold">🎯 Nova jornada</h1>
        <p className="text-gray-600 mt-2">
          Escolha o que você quer superar e acompanhe seu progresso
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Nome e Descrição */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              O que você quer superar?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">Escolha uma sugestão ou escreva a sua:</p>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {JOURNEY_PRESETS.map((preset) => <button key={preset.label} type="button"
                  onClick={() => setFormData({ ...formData, name: preset.name, description: preset.description })}
                  className={`rounded-xl border p-3 text-left transition ${formData.name === preset.name ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                  <span className="text-xl">{preset.emoji}</span><span className="mt-1 block text-sm font-semibold text-slate-900">{preset.label}</span>
                </button>)}
              </div>
              <Label htmlFor="name">Nome da jornada *</Label>
              <Input
                id="name"
                placeholder="Ex: Sem álcool, Sem cigarro, Sem açúcar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Parei de beber para melhorar minha saúde"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Meta */}
        <Card>
          <CardHeader>
            <CardTitle>Qual é sua meta inicial?</CardTitle>
            <CardDescription>
              Você pode mudar depois, sem problema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOAL_PRESETS.map((preset) => (
                <Button
                  key={preset.value ?? 'unlimited'}
                  type="button"
                  variant={
                    formData.goal_days === preset.value ? 'default' : 'outline'
                  }
                  onClick={() => handleGoalChange(preset.value)}
                  className="justify-center"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom Goal */}
            {!showCustomGoal && formData.goal_days && !GOAL_PRESETS.find((p) => p.value === formData.goal_days) ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold">
                  Sua meta customizada: {formData.goal_days} dias
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomGoal(true)}
                >
                  Mudar meta customizada
                </Button>
              </div>
            ) : null}

            {showCustomGoal && (
              <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                <div>
                  <Label htmlFor="customGoal">Quantos dias? (número)</Label>
                  <Input
                    id="customGoal"
                    type="number"
                    min="1"
                    placeholder="Ex: 100"
                    value={customGoalDays}
                    onChange={(e) => setCustomGoalDays(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCustomGoalSubmit}
                  >
                    Confirmar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomGoal(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Marcos */}
        <Card>
          <CardHeader>
            <CardTitle>Marcos Motivadores</CardTitle>
            <CardDescription>
              Você receberá notificações nesses momentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900 mb-3 font-semibold">
                Marcos padrão:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_MILESTONES.map((m) => (
                  <div key={m.days} className="bg-white p-2 rounded text-center text-xs font-medium">
                    {m.label}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-3">
                Você pode customizar marcos depois nas configurações
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
            disabled={!formData.name.trim() || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Criando...' : 'Começar minha jornada'}
          </Button>
        </div>
      </form>
    </div>
  );
}
