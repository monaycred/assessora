// ============================================================
// SUPABASE CLIENT - Addiction Tracker
// ============================================================

import { createClient } from '@supabase/supabase-js';
import {
  AddictionTracker,
  AddictionEntry,
  AddictionMilestoneReached,
  AddictionReset,
  CommunityPost,
  CommunityComment,
  CommunityReaction,
  CommunityReport,
  CommunityWarning,
  CreateTrackerDTO,
  CreateEntryDTO,
  UpdateTrackerDTO,
} from '@/types/addiction';
import { generateRandomCity, milestonesToSeconds } from './utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// TRACKERS
// ============================================================

export async function createTracker(
  userId: string,
  workspaceId: string | undefined,
  data: CreateTrackerDTO
): Promise<AddictionTracker | null> {
  const customMilestones = data.custom_milestones || [
    86400, 259200, 604800, 864000, 1296000, 1728000, 2592000, 3888000, 5184000,
  ];

  const { data: tracker, error } = await supabase
    .from('addiction_trackers')
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      name: data.name,
      description: data.description,
      goal_days: data.goal_days,
      custom_milestones: customMilestones,
      community_name: generateRandomCity(),
      is_public: false,
      notification_time: '07:00',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating tracker:', error);
    return null;
  }

  return tracker;
}

export async function getTracker(trackerId: string): Promise<AddictionTracker | null> {
  const { data, error } = await supabase
    .from('addiction_trackers')
    .select('*')
    .eq('id', trackerId)
    .single();

  if (error) {
    console.error('Error fetching tracker:', error);
    return null;
  }

  return data;
}

export async function getUserTrackers(userId: string): Promise<AddictionTracker[]> {
  const { data, error } = await supabase
    .from('addiction_trackers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user trackers:', error);
    return [];
  }

  return data || [];
}

export async function updateTracker(
  trackerId: string,
  data: UpdateTrackerDTO
): Promise<AddictionTracker | null> {
  const { data: tracker, error } = await supabase
    .from('addiction_trackers')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tracker:', error);
    return null;
  }

  return tracker;
}

export async function updateTrackerStreak(
  trackerId: string,
  currentDays: number,
  bestDays: number
): Promise<boolean> {
  const { error } = await supabase
    .from('addiction_trackers')
    .update({
      current_streak_days: currentDays,
      best_streak_days: Math.max(bestDays, currentDays),
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackerId);

  if (error) {
    console.error('Error updating streak:', error);
    return false;
  }

  return true;
}

export async function resetTracker(trackerId: string): Promise<boolean> {
  const tracker = await getTracker(trackerId);
  if (!tracker) return false;

  // Criar reset record
  await supabase.from('addiction_resets').insert({
    tracker_id: trackerId,
    streak_before: tracker.current_streak_days,
  });

  // Resetar streak
  return updateTrackerStreak(trackerId, 0, tracker.best_streak_days);
}

// ============================================================
// ENTRIES (NOTAS/DIÁRIO)
// ============================================================

export async function createEntry(
  trackerId: string,
  data: CreateEntryDTO
): Promise<AddictionEntry | null> {
  const { data: entry, error } = await supabase
    .from('addiction_entries')
    .insert({
      tracker_id: trackerId,
      entry_date: data.entry_date,
      notes: data.notes,
      metrics: data.metrics,
      mood: data.mood,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating entry:', error);
    return null;
  }

  return entry;
}

export async function getTrackerEntries(
  trackerId: string,
  limit: number = 50
): Promise<AddictionEntry[]> {
  const { data, error } = await supabase
    .from('addiction_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('entry_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return data || [];
}

export async function getEntryByDate(
  trackerId: string,
  date: string
): Promise<AddictionEntry | null> {
  const { data, error } = await supabase
    .from('addiction_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('entry_date', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching entry:', error);
  }

  return data || null;
}

// ============================================================
// MILESTONES
// ============================================================

export async function createMilestoneReached(
  trackerId: string,
  milestoneDays: number
): Promise<AddictionMilestoneReached | null> {
  const { data, error } = await supabase
    .from('addiction_milestones_reached')
    .insert({
      tracker_id: trackerId,
      milestone_days: milestoneDays,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating milestone:', error);
    return null;
  }

  return data;
}

export async function confirmMilestone(
  milestoneId: string
): Promise<AddictionMilestoneReached | null> {
  const { data, error } = await supabase
    .from('addiction_milestones_reached')
    .update({
      confirmed_at: new Date().toISOString(),
      user_confirmed: true,
    })
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) {
    console.error('Error confirming milestone:', error);
    return null;
  }

  return data;
}

export async function getTrackerMilestones(
  trackerId: string
): Promise<AddictionMilestoneReached[]> {
  const { data, error } = await supabase
    .from('addiction_milestones_reached')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('milestone_days', { ascending: true });

  if (error) {
    console.error('Error fetching milestones:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// RESETS
// ============================================================

export async function getTrackerResets(
  trackerId: string
): Promise<AddictionReset[]> {
  const { data, error } = await supabase
    .from('addiction_resets')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('reset_at', { ascending: false });

  if (error) {
    console.error('Error fetching resets:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// COMMUNITY - POSTS
// ============================================================

export async function createPost(
  trackerId: string,
  communityName: string,
  currentStreakDays: number,
  content: string,
  postType: string
): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      tracker_id: trackerId,
      community_name: communityName,
      current_streak_days: currentStreakDays,
      content,
      post_type: postType,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data;
}

export async function getCommunityFeed(
  postType: string | null = null,
  limit: number = 50
): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts')
    .select('*')
    .eq('is_deleted', false);

  if (postType && postType !== 'all') {
    query = query.eq('post_type', postType);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching feed:', error);
    return [];
  }

  return data || [];
}

export async function deletePost(
  postId: string,
  deletedBy: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase
    .from('community_posts')
    .update({
      is_deleted: true,
      deleted_reason: reason,
      deleted_by: deletedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }

  return true;
}

// ============================================================
// COMMUNITY - REACTIONS
// ============================================================

export async function addReaction(
  postId: string,
  trackerId: string,
  reactionType: string
): Promise<boolean> {
  const { error } = await supabase.from('community_reactions').insert({
    post_id: postId,
    tracker_id: trackerId,
    reaction_type: reactionType,
  });

  if (error) {
    console.error('Error adding reaction:', error);
    return false;
  }

  return true;
}

export async function removeReaction(
  postId: string,
  trackerId: string,
  reactionType: string
): Promise<boolean> {
  const { error } = await supabase
    .from('community_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('tracker_id', trackerId)
    .eq('reaction_type', reactionType);

  if (error) {
    console.error('Error removing reaction:', error);
    return false;
  }

  return true;
}

export async function getPostReactions(postId: string) {
  const { data, error } = await supabase
    .from('community_reactions')
    .select('reaction_type')
    .eq('post_id', postId);

  if (error) {
    console.error('Error fetching reactions:', error);
    return [];
  }

  // Agrupar reações
  const grouped: Record<string, number> = {};
  data?.forEach((r) => {
    grouped[r.reaction_type] = (grouped[r.reaction_type] || 0) + 1;
  });

  return grouped;
}

// ============================================================
// COMMUNITY - COMMENTS
// ============================================================

export async function createComment(
  postId: string,
  trackerId: string,
  communityName: string,
  currentStreakDays: number,
  content: string,
  parentCommentId?: string
): Promise<CommunityComment | null> {
  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      tracker_id: trackerId,
      community_name: communityName,
      current_streak_days: currentStreakDays,
      content,
      parent_comment_id: parentCommentId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    return null;
  }

  return data;
}

export async function getPostComments(postId: string): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

export async function deleteComment(
  commentId: string,
  deletedBy: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase
    .from('community_comments')
    .update({
      is_deleted: true,
      deleted_reason: reason,
      deleted_by: deletedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    return false;
  }

  return true;
}

// ============================================================
// COMMUNITY - RANKING
// ============================================================

export async function getCommunityRanking(limit: number = 10) {
  const { data, error } = await supabase
    .from('addiction_trackers')
    .select('community_name_custom, community_name, current_streak_days, best_streak_days')
    .eq('is_public', true)
    .eq('is_active', true)
    .order('current_streak_days', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching ranking:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// REPORTS
// ============================================================

export async function reportContent(
  reportedBy: string,
  postId: string | undefined,
  commentId: string | undefined,
  reason: string,
  details?: string
): Promise<CommunityReport | null> {
  const { data, error } = await supabase
    .from('community_reports')
    .insert({
      reported_by_tracker_id: reportedBy,
      post_id: postId,
      comment_id: commentId,
      reason,
      reason_details: details,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    return null;
  }

  return data;
}

export async function getPendingReports() {
  const { data, error } = await supabase
    .from('community_reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// EXPORT SUPABASE CLIENT
// ============================================================

export { supabase };
