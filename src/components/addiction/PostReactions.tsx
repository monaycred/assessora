'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PostReactionsProps {
  postId: string;
  trackerId: string;
  reactions: Record<string, number>;
  userReactions: string[];
  onReactionAdded?: () => void;
}

const REACTION_EMOJIS = ['❤️', '💪', '🔥'];

export function PostReactions({
  postId,
  trackerId,
  reactions,
  userReactions,
  onReactionAdded,
}: PostReactionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState(reactions);
  const [localUserReactions, setLocalUserReactions] = useState(userReactions);

  const handleReaction = async (reactionType: string) => {
    setLoading(reactionType);

    try {
      const isAdding = !localUserReactions.includes(reactionType);

      if (isAdding) {
        // Adicionar reação
        const res = await fetch(`/api/community/posts/${postId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tracker_id: trackerId,
            reaction_type: reactionType,
          }),
        });

        if (!res.ok) throw new Error('Erro ao adicionar reação');

        setLocalReactions({
          ...localReactions,
          [reactionType]: (localReactions[reactionType] || 0) + 1,
        });
        setLocalUserReactions([...localUserReactions, reactionType]);
      } else {
        // Remover reação
        const res = await fetch(
          `/api/community/posts/${postId}/react?tracker_id=${trackerId}&reaction_type=${reactionType}`,
          {
            method: 'DELETE',
          }
        );

        if (!res.ok) throw new Error('Erro ao remover reação');

        setLocalReactions({
          ...localReactions,
          [reactionType]: Math.max((localReactions[reactionType] || 0) - 1, 0),
        });
        setLocalUserReactions(
          localUserReactions.filter((r) => r !== reactionType)
        );
      }

      onReactionAdded?.();
    } catch (error) {
      console.error('Erro ao reagir:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {REACTION_EMOJIS.map((emoji) => {
        const count = localReactions[emoji] || 0;
        const hasUserReacted = localUserReactions.includes(emoji);

        return (
          <Button
            key={emoji}
            variant={hasUserReacted ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleReaction(emoji)}
            disabled={loading === emoji}
            className="text-xs"
          >
            {loading === emoji ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                {emoji} {count > 0 && count}
              </>
            )}
          </Button>
        );
      })}
    </div>
  );
}
