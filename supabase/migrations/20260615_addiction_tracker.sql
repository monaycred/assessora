-- ============================================================
-- ADDICTION TRACKER - Criação de tabelas
-- Data: 2026-06-15
-- ============================================================

-- 1. Trackers de vício/comportamento
CREATE TABLE IF NOT EXISTS addiction_trackers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Tracker info
  name TEXT NOT NULL,
  description TEXT,

  -- Cronômetro
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  best_streak_days INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,

  -- Configurações
  notification_time TIME NOT NULL DEFAULT '07:00',
  custom_milestones JSONB DEFAULT '[86400, 259200, 604800, 864000, 1296000, 1728000, 2592000, 3888000, 5184000]',
  goal_days INTEGER,

  -- Comunidade
  is_public BOOLEAN NOT NULL DEFAULT false,
  community_name TEXT NOT NULL,
  community_name_custom TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addiction_trackers_user_id ON addiction_trackers(user_id);
CREATE INDEX idx_addiction_trackers_is_public ON addiction_trackers(is_public);
CREATE INDEX idx_addiction_trackers_created_at ON addiction_trackers(created_at DESC);

-- 2. Marcos alcançados
CREATE TABLE IF NOT EXISTS addiction_milestones_reached (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  milestone_days INTEGER NOT NULL,
  reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  user_confirmed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_tracker_id ON addiction_milestones_reached(tracker_id);

-- 3. Notas/diário
CREATE TABLE IF NOT EXISTS addiction_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  entry_date DATE NOT NULL,
  notes TEXT,
  metrics JSONB,
  mood INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entries_tracker_id ON addiction_entries(tracker_id);
CREATE INDEX idx_entries_date ON addiction_entries(entry_date);

-- 4. Histórico de resets/falhas
CREATE TABLE IF NOT EXISTS addiction_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  streak_before INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resets_tracker_id ON addiction_resets(tracker_id);

-- 5. Posts na comunidade
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('victory', 'challenge', 'tip', 'general')),

  -- Denormalizado para ranking
  community_name TEXT NOT NULL,
  current_streak_days INTEGER NOT NULL,

  -- Moderação
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_reason TEXT,
  deleted_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_tracker_id ON community_posts(tracker_id);
CREATE INDEX idx_posts_is_deleted ON community_posts(is_deleted);
CREATE INDEX idx_posts_created_at ON community_posts(created_at DESC);

-- 6. Reações nos posts
CREATE TABLE IF NOT EXISTS community_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('❤️', '💪', '🔥')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(post_id, tracker_id, reaction_type)
);

CREATE INDEX idx_reactions_post_id ON community_reactions(post_id);

-- 7. Comentários
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  -- Denormalizado
  community_name TEXT NOT NULL,
  current_streak_days INTEGER NOT NULL,

  -- Moderação
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_reason TEXT,
  deleted_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_comments_parent_id ON community_comments(parent_comment_id);

-- 8. Denúncias
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,

  reported_by_tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harmful', 'bullying', 'other')),
  reason_details TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'deleted', 'false_report')),

  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON community_reports(status);
CREATE INDEX idx_reports_post_id ON community_reports(post_id);
CREATE INDEX idx_reports_comment_id ON community_reports(comment_id);

-- 9. Avisos disciplinares
CREATE TABLE IF NOT EXISTS community_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,

  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harmful_content', 'bullying')),
  action TEXT NOT NULL CHECK (action IN ('warning', 'post_restriction', 'full_ban')),

  warning_count INTEGER NOT NULL DEFAULT 1,

  restriction_until TIMESTAMPTZ,

  issued_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  can_appeal BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warnings_tracker_id ON community_warnings(tracker_id);
CREATE INDEX idx_warnings_restriction_until ON community_warnings(restriction_until);

-- RLS (Row Level Security) - opcional, pode ativar depois
-- ALTER TABLE addiction_trackers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
