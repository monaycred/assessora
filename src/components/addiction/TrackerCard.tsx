'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AddictionTracker } from '@/types/addiction';
import {
  calculateDaysSince,
  formatTimeSince,
  createProgressBar,
  getNextMilestone,
  milestonesToDays,
  timeUntilNextMilestone,
} from '@/lib/addiction/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit2, Share2, Trash2 } from 'lucide-react';

interface TrackerCardProps {
  tracker: AddictionTracker;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function TrackerCard({
  tracker,
  onEdit,
  onShare,
  onDelete,
  showActions = true,
}: TrackerCardProps) {
  const [displayDays, setDisplayDays] = useState(tracker.current_streak_days);
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    // Atualizar cronômetro a cada minuto
    const interval = setInterval(() => {
      const days = calculateDaysSince(tracker.started_at);
      setDisplayDays(days);
      setFormattedTime(formatTimeSince(tracker.started_at));
    }, 60000); // 1 minuto

    // Calcular inicial
    setFormattedTime(formatTimeSince(tracker.started_at));

    return () => clearInterval(interval);
  }, [tracker.started_at]);

  const milestoneDays = milestonesToDays(tracker.custom_milestones || []);
  const nextMilestone = getNextMilestone(displayDays, tracker.custom_milestones || []);

  const progressPercentage = tracker.goal_days
    ? Math.min((displayDays / tracker.goal_days) * 100, 100)
    : null;

  const daysUntilGoal = tracker.goal_days ? tracker.goal_days - displayDays : null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{tracker.name}</CardTitle>
            {tracker.description && (
              <CardDescription>{tracker.description}</CardDescription>
            )}
          </div>
          {showActions && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Display - Dias */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-blue-600">{displayDays}</div>
          <div className="text-sm text-gray-600">dias</div>
        </div>

        {/* Progress Bar */}
        {progressPercentage !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Meta: {tracker.goal_days} dias</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {daysUntilGoal && daysUntilGoal > 0 && (
              <p className="text-xs text-center text-gray-600">
                Faltam {daysUntilGoal} dias para sua meta! 💪
              </p>
            )}
            {daysUntilGoal && daysUntilGoal <= 0 && (
              <p className="text-xs text-center text-green-600 font-bold">
                🏆 Meta atingida!
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-600">Melhor marca</p>
            <p className="text-lg font-semibold">{tracker.best_streak_days} dias</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Tentativas</p>
            <p className="text-lg font-semibold">{tracker.attempt_count}</p>
          </div>
        </div>

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-xs text-blue-700 font-semibold">
              ⏳ Próximo marco: {nextMilestone} dias
            </p>
            <p className="text-xs text-blue-600">
              {timeUntilNextMilestone(displayDays, nextMilestone)}
            </p>
          </div>
        )}

        {/* Public Status */}
        {tracker.is_public && (
          <div className="bg-purple-50 p-3 rounded-md text-xs text-purple-700">
            👁️ Você aparece na comunidade como <strong>{tracker.community_name_custom || tracker.community_name}</strong>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4">
            <Link href={`/addiction/${tracker.id}/notas`}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                📝 Notas
              </Button>
            </Link>
            <Link href={`/addiction/${tracker.id}/editar`}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                ⚙️ Config
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
