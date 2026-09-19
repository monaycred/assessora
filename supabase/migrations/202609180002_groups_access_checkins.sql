-- Iasmin: acesso por módulo, grupos privados e acompanhamento diário.
-- Execute uma vez no SQL Editor do Supabase antes de publicar as páginas novas.

CREATE TABLE IF NOT EXISTS user_module_access (
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN (
    'addiction', 'financeiro', 'lembretes', 'agenda', 'projetos',
    'documentos', 'listas', 'desejos', 'viagens', 'integracoes'
  )),
  enabled BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('free', 'admin', 'paid', 'legacy')),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (user_profile_id, module_key)
);

-- Quem já foi aprovado recebe o módulo gratuito. Admins têm acesso total no servidor.
INSERT INTO user_module_access (user_profile_id, module_key, enabled, source)
SELECT id, 'addiction', true, 'free' FROM user_profiles WHERE is_active = true
ON CONFLICT (user_profile_id, module_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS support_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 80),
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'club' CHECK (group_type IN ('club', 'challenge')),
  starts_on DATE,
  ends_on DATE,
  join_policy TEXT NOT NULL DEFAULT 'approval' CHECK (join_policy IN ('approval', 'link')),
  ranking_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (group_type = 'club' OR (starts_on IS NOT NULL AND ends_on IS NOT NULL AND ends_on >= starts_on))
);

CREATE TABLE IF NOT EXISTS support_group_members (
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  nickname TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_support_group_members_profile ON support_group_members(user_profile_id, status);

CREATE TABLE IF NOT EXISTS support_group_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 25 CHECK (max_uses > 0),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_group_shares (
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  show_streak BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, tracker_id)
);

CREATE TABLE IF NOT EXISTS support_group_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_group_posts_group ON support_group_posts(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS addiction_daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'lapse', 'support')),
  reply_code TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  source TEXT CHECK (source IN ('app', 'whatsapp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tracker_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS idx_addiction_daily_checkins_pending ON addiction_daily_checkins(status, checkin_date);

-- Registra a resposta e, em caso de recaída, reinicia o contador na mesma transação.
CREATE OR REPLACE FUNCTION record_addiction_checkin(
  p_tracker_id UUID, p_date DATE, p_status TEXT, p_source TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tracker addiction_trackers%ROWTYPE;
  v_checkin_id UUID;
  v_days INTEGER;
BEGIN
  IF p_status NOT IN ('success', 'lapse', 'support') OR p_source NOT IN ('app', 'whatsapp') THEN
    RAISE EXCEPTION 'Resposta inválida';
  END IF;
  SELECT * INTO v_tracker FROM addiction_trackers WHERE id = p_tracker_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rastreador não encontrado'; END IF;
  INSERT INTO addiction_daily_checkins (tracker_id, checkin_date, reply_code)
  VALUES (p_tracker_id, p_date, upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 12)))
  ON CONFLICT (tracker_id, checkin_date) DO NOTHING;
  UPDATE addiction_daily_checkins
    SET status = p_status, responded_at = NOW(), source = p_source
    WHERE tracker_id = p_tracker_id AND checkin_date = p_date AND status = 'pending'
    RETURNING id INTO v_checkin_id;
  IF v_checkin_id IS NULL THEN RETURN false; END IF;
  IF p_status = 'lapse' THEN
    v_days := greatest(0, floor(extract(epoch FROM (NOW() - v_tracker.started_at)) / 86400)::integer);
    INSERT INTO addiction_resets (tracker_id, streak_before, reason)
    VALUES (p_tracker_id, v_days, 'checkin');
    UPDATE addiction_trackers SET
      started_at = NOW(), current_streak_days = 0,
      best_streak_days = greatest(best_streak_days, v_days),
      attempt_count = attempt_count + 1, updated_at = NOW()
      WHERE id = p_tracker_id;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION record_addiction_checkin(UUID, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_addiction_checkin(UUID, DATE, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION reset_addiction_tracker(p_tracker_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tracker addiction_trackers%ROWTYPE; v_days INTEGER;
BEGIN
  SELECT * INTO v_tracker FROM addiction_trackers WHERE id = p_tracker_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  v_days := greatest(0, floor(extract(epoch FROM (NOW() - v_tracker.started_at)) / 86400)::integer);
  INSERT INTO addiction_resets (tracker_id, streak_before, reason)
    VALUES (p_tracker_id, v_days, 'manual');
  UPDATE addiction_trackers SET started_at = NOW(), current_streak_days = 0,
    best_streak_days = greatest(best_streak_days, v_days), attempt_count = attempt_count + 1,
    updated_at = NOW() WHERE id = p_tracker_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION reset_addiction_tracker(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_addiction_tracker(UUID) TO service_role;

ALTER TABLE user_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_group_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE addiction_daily_checkins ENABLE ROW LEVEL SECURITY;
-- Todas as operações desses dados passam pelas rotas autenticadas do servidor.
ALTER TABLE addiction_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addiction_milestones_reached ENABLE ROW LEVEL SECURITY;
ALTER TABLE addiction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE addiction_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS module_access_select_own ON user_module_access;
CREATE POLICY module_access_select_own ON user_module_access FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles p
  WHERE p.id = user_module_access.user_profile_id AND p.user_id = auth.uid()
));
