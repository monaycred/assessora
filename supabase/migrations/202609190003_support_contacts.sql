CREATE TABLE IF NOT EXISTS public.support_contacts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
 name TEXT NOT NULL, phone TEXT NOT NULL, relationship TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
 token_hash TEXT, accepted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(owner_profile_id,phone)
);
ALTER TABLE public.support_contacts ENABLE ROW LEVEL SECURITY;
