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
import { Loader2, Plus } from 'lucide-react';

interface CreatePostModalProps {
  trackerId: string;
  onSuccess?: () => void;
}

const POST_TYPES = [
  { type: 'victory', emoji: '✨', label: 'Vitória' },
  { type: 'challenge', emoji: '💔', label: 'Desafio' },
  { type: 'tip', emoji: '💡', label: 'Dica' },
  { type: 'general', emoji: '💬', label: 'Geral' },
];

export function CreatePostModal({ trackerId, onSuccess }: CreatePostModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'victory' | 'challenge' | 'tip' | 'general'>('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/community/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracker_id: trackerId,
          content: content.trim(),
          post_type: postType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar post');
      }

      setContent('');
      setPostType('general');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Post
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhe com a comunidade</DialogTitle>
          <DialogDescription>
            Inspire outras pessoas com sua história
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de post */}
          <div>
            <Label>Tipo de post</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {POST_TYPES.map((pt) => (
                <Button
                  key={pt.type}
                  type="button"
                  variant={postType === pt.type ? 'default' : 'outline'}
                  onClick={() => setPostType(pt.type as any)}
                  className="justify-start"
                >
                  {pt.emoji} {pt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Conteúdo */}
          <div>
            <Label htmlFor="content">Sua mensagem</Label>
            <Textarea
              id="content"
              placeholder="Escreva o que você quer compartilhar... (máx 280 caracteres)"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 280))}
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length}/280
            </p>
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
              className="flex-1"
              disabled={!content.trim() || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Postando...' : 'Postar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
