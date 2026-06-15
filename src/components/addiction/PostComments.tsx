'use client';

import { useEffect, useState } from 'react';
import { CommunityComment } from '@/types/addiction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send } from 'lucide-react';

interface PostCommentsProps {
  postId: string;
  trackerId: string;
  initialComments?: CommunityComment[];
}

export function PostComments({
  postId,
  trackerId,
  initialComments = [],
}: PostCommentsProps) {
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [fetchingComments, setFetchingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showComments && comments.length === 0) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    setFetchingComments(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      if (!res.ok) throw new Error('Erro ao buscar comentários');
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setFetchingComments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracker_id: trackerId,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao comentar');
      }

      const data = await res.json();
      setComments([...comments, data.comment]);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="text-xs w-full justify-start"
      >
        💬 {comments.length} comentários
      </Button>

      {/* Comments section */}
      {showComments && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Escreva um comentário..."
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 280))}
                maxLength={280}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!content.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            {error && (
              <div className="text-xs text-red-600">{error}</div>
            )}

            {/* Comments list */}
            {fetchingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">
                Nenhum comentário ainda. Seja o primeiro!
              </p>
            ) : (
              <div className="space-y-2 border-t pt-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {comment.community_name}
                        </span>
                        <Badge variant="secondary" className="text-xs px-1.5">
                          {comment.current_streak_days}d
                        </Badge>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-gray-800">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
