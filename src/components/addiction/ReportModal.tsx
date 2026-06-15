'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Flag, Loader2 } from 'lucide-react';

interface ReportModalProps {
  postId: string;
  trackerId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou conteúdo repetitivo' },
  { value: 'harmful', label: 'Conteúdo prejudicial ou perigoso' },
  { value: 'bullying', label: 'Assédio ou bullying' },
  { value: 'other', label: 'Outro motivo' },
];

export function ReportModal({ postId, trackerId }: ReportModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    reason: '',
    details: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/community/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracker_id: trackerId,
          reason: formData.reason,
          reason_details: formData.details.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao denunciar');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setFormData({ reason: '', details: '' });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar Conteúdo</DialogTitle>
          <DialogDescription>
            Ajude-nos a manter a comunidade segura
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-semibold">
              ✓ Denúncia enviada com sucesso!
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Obrigado por ajudar a manter a comunidade segura.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Motivo */}
            <div>
              <Label>Motivo da denúncia *</Label>
              <div className="space-y-2 mt-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={formData.reason === r.value}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Detalhes */}
            <div>
              <Label htmlFor="details">Detalhes adicionais (opcional)</Label>
              <Textarea
                id="details"
                placeholder="Explique por que você está denunciando este conteúdo..."
                value={formData.details}
                onChange={(e) =>
                  setFormData({ ...formData, details: e.target.value })
                }
                rows={4}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                disabled={!formData.reason || loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? 'Enviando...' : 'Denunciar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
