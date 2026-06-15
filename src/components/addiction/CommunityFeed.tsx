'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import { ReportModal } from './ReportModal';

interface FeedPost {
  id: string;
  content: string;
  post_type: 'victory' | 'challenge' | 'tip' | 'general';
  community_name: string;
  current_streak_days: number;
  reactions: Record<string, number>;
  comment_count: number;
  reactions_total: number;
  created_at: string;
  user_reactions?: string[];
}

interface CommunityFeedProps {
  type?: 'all' | 'victory' | 'challenge' | 'tip';
  limit?: number;
  userTrackerId?: string;
  onReactionAdded?: () => void;
}

const typeEmojis: Record<string, string> = {
  victory: '✨',
  challenge: '💔',
  tip: '💡',
  general: '💬',
};

const typeColors: Record<string, string> = {
  victory: 'bg-green-50 border-green-200',
  challenge: 'bg-orange-50 border-orange-200',
  tip: 'bg-blue-50 border-blue-200',
  general: 'bg-gray-50 border-gray-200',
};

export function CommunityFeed({
  type = 'all',
  limit = 50,
  userTrackerId,
  onReactionAdded
}: CommunityFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const typeParam = type === 'all' ? 'all' : type;
        const res = await fetch(
          `/api/community/feed?type=${typeParam}&limit=${limit}`
        );
        if (!res.ok) throw new Error('Erro ao buscar feed');
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [type, limit]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>Nenhum post encontrado nesta categoria</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id} className={`border ${typeColors[post.post_type]}`}>
          <CardContent className="pt-6 pb-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{post.community_name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {post.current_streak_days}d
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {typeEmojis[post.post_type]}
                </Badge>
                {userTrackerId && (
                  <ReportModal postId={post.id} trackerId={userTrackerId} />
                )}
              </div>
            </div>

            {/* Content */}
            <p className="text-gray-800 text-sm leading-relaxed">{post.content}</p>

            {/* Reactions */}
            <div className="pt-2">
              {userTrackerId ? (
                <PostReactions
                  postId={post.id}
                  trackerId={userTrackerId}
                  reactions={post.reactions}
                  userReactions={post.user_reactions || []}
                  onReactionAdded={onReactionAdded}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(post.reactions).map(([emoji, count]) => (
                    <Badge key={emoji} variant="outline" className="text-xs">
                      {emoji} {count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            {userTrackerId && (
              <div className="pt-2 border-t">
                <PostComments
                  postId={post.id}
                  trackerId={userTrackerId}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
