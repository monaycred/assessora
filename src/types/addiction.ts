// ============================================================
// TIPOS - Addiction Tracker
// ============================================================

export interface AddictionTracker {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  started_at: string; // ISO date
  current_streak_days: number;
  best_streak_days: number;
  attempt_count: number;
  notification_time: string; // HH:MM
  custom_milestones: number[]; // segundos
  goal_days?: number;
  is_public: boolean;
  community_name: string;
  community_name_custom?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddictionMilestoneReached {
  id: string;
  tracker_id: string;
  milestone_days: number;
  reached_at: string;
  confirmed_at?: string;
  user_confirmed: boolean;
  created_at: string;
}

export interface AddictionEntry {
  id: string;
  tracker_id: string;
  entry_date: string; // YYYY-MM-DD
  notes?: string;
  metrics?: Record<string, any>;
  mood?: number; // 1-5
  created_at: string;
  updated_at: string;
}

export interface AddictionReset {
  id: string;
  tracker_id: string;
  streak_before: number;
  reset_at: string;
  reason?: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  tracker_id: string;
  content: string;
  post_type: 'victory' | 'challenge' | 'tip' | 'general';
  community_name: string;
  current_streak_days: number;
  is_deleted: boolean;
  deleted_reason?: string;
  deleted_by?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Denormalized (computed)
  reaction_count?: number;
  comment_count?: number;
  user_reactions?: string[];
}

export interface CommunityReaction {
  id: string;
  post_id: string;
  tracker_id: string;
  reaction_type: '❤️' | '💪' | '🔥';
  created_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  tracker_id: string;
  parent_comment_id?: string;
  content: string;
  community_name: string;
  current_streak_days: number;
  is_deleted: boolean;
  deleted_reason?: string;
  deleted_by?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Nested replies
  replies?: CommunityComment[];
}

export interface CommunityReport {
  id: string;
  post_id?: string;
  comment_id?: string;
  reported_by_tracker_id: string;
  reason: 'spam' | 'harmful' | 'bullying' | 'other';
  reason_details?: string;
  status: 'pending' | 'reviewed' | 'deleted' | 'false_report';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface CommunityWarning {
  id: string;
  tracker_id: string;
  reason: 'spam' | 'harmful_content' | 'bullying';
  action: 'warning' | 'post_restriction' | 'full_ban';
  warning_count: number;
  restriction_until?: string;
  issued_by: string;
  issued_at: string;
  can_appeal: boolean;
  created_at: string;
}

// ============================================================
// DTOs (Data Transfer Objects)
// ============================================================

export interface CreateTrackerDTO {
  name: string;
  description?: string;
  goal_days?: number;
  custom_milestones?: number[];
}

export interface UpdateTrackerDTO {
  name?: string;
  description?: string;
  goal_days?: number;
  custom_milestones?: number[];
  notification_time?: string;
  is_public?: boolean;
  community_name_custom?: string;
}

export interface CreateEntryDTO {
  entry_date: string;
  notes?: string;
  metrics?: Record<string, any>;
  mood?: number;
}

export interface CreatePostDTO {
  content: string;
  post_type: 'victory' | 'challenge' | 'tip' | 'general';
}

export interface CreateCommentDTO {
  content: string;
  parent_comment_id?: string;
}

export interface CreateReportDTO {
  reason: 'spam' | 'harmful' | 'bullying' | 'other';
  reason_details?: string;
}

export interface MilestoneConfirmationDTO {
  confirmed: boolean; // true = continuar, false = recaí
}

// ============================================================
// View Models (para o frontend)
// ============================================================

export interface TrackerDashboard {
  tracker: AddictionTracker;
  currentDays: number;
  daysUntilGoal?: number;
  progressPercentage?: number;
  nextMilestone?: number;
  milestonesReached: AddictionMilestoneReached[];
  recentEntries: AddictionEntry[];
  recentResets: AddictionReset[];
}

export interface RankingEntry {
  position: number;
  community_name: string;
  current_streak_days: number;
  best_streak_days: number;
  recent_reset?: AddictionReset;
}

export interface CommunityFeedPost extends CommunityPost {
  reactions: Record<string, number>; // {"❤️": 23, "💪": 45}
  comments: CommunityComment[];
}

// ============================================================
// Constants
// ============================================================

export const REACTIONS = ['❤️', '💪', '🔥'] as const;
export const POST_TYPES = ['victory', 'challenge', 'tip', 'general'] as const;
export const REPORT_REASONS = ['spam', 'harmful', 'bullying', 'other'] as const;

// Cidades para nomes aleatórios
export const RANDOM_CITIES = [
  'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza',
  'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre',
  'New York', 'Los Angeles', 'Chicago', 'London', 'Paris',
  'Tokyo', 'Beijing', 'Mumbai', 'Dubai', 'Sydney',
  'Berlin', 'Barcelona', 'Rome', 'Madrid', 'Amsterdam',
  'Bangkok', 'Singapore', 'Hong Kong', 'Seoul', 'Istanbul',
  'Cairo', 'Lagos', 'Johannesburg', 'Nairobi', 'Mexico City',
  'Toronto', 'Vancouver', 'Buenos Aires', 'São Paulo', 'Lima'
];
