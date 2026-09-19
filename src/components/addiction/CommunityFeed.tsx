'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import { ReportModal } from './ReportModal';

interface FeedPost {
  id: string;
  title?: string | null;
  image_url?: string | null;
  audience_scope?: 'global' | 'groups';
  target_groups?: string[];
  content: string;
  post_type: 'victory' | 'challenge' | 'tip' | 'general';
  community_name: string;
  avatar_url?: string | null;
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
  refreshKey?: number;
}

const typeEmojis: Record<string, string> = {
  victory: '✨',
  challenge: '💔',
  tip: '💡',
  general: '💬',
};

const typeColors: Record<string, string> = {
  victory: 'bg-gradient-to-br from-emerald-50 to-lime-50 border-emerald-300',
  challenge: 'bg-gradient-to-br from-orange-50 to-rose-50 border-orange-300',
  tip: 'bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-300',
  general: 'bg-gradient-to-br from-fuchsia-50 to-violet-50 border-fuchsia-300',
};

export function CommunityFeed({
  type = 'all',
  limit = 50,
  userTrackerId,
  onReactionAdded,
  refreshKey = 0
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
  }, [type, limit, refreshKey]);

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
    <div className="space-y-5">
      {posts.map((post) => (
        <Card key={post.id} className={`overflow-hidden rounded-3xl border-2 shadow-sm transition hover:shadow-lg ${typeColors[post.post_type]}`}>
          <CardContent className="space-y-4 pb-5 pt-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {post.avatar_url ? <img src={post.avatar_url} alt="" className="h-11 w-11 rounded-full border-2 border-white object-cover shadow" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow">{typeEmojis[post.post_type]}</span>}
                  <p className="text-base font-extrabold text-slate-950">{post.community_name}</p>
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

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">{post.audience_scope === 'groups' ? '👥 ' + (post.target_groups?.join(', ') || 'Grupo') : '🌎 Global'}</span>
            </div>
            {post.title && <h2 className="text-xl font-black leading-tight text-slate-950">{post.title}</h2>}
            {post.image_url && <img src={post.image_url} alt={post.title || 'Foto da publicação'} className="max-h-[520px] w-full rounded-2xl bg-white object-cover shadow-sm" />}
            <p className="whitespace-pre-wrap text-base leading-7 text-slate-900">{post.content}</p>

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
                  initialCount={post.comment_count}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
