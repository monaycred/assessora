ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ;
