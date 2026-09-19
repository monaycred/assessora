ALTER TABLE public.support_groups ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.discovery_items ADD COLUMN IF NOT EXISTS event_starts_at TIMESTAMPTZ;
ALTER TABLE public.discovery_items ADD COLUMN IF NOT EXISTS event_ends_at TIMESTAMPTZ;
ALTER TABLE public.discovery_items ADD COLUMN IF NOT EXISTS event_location TEXT;

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  description TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  google_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  linkedin_url TEXT,
  whatsapp_url TEXT,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  street_number TEXT NOT NULL,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo_url TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','published','rejected','archived')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cnpj)
);
CREATE INDEX IF NOT EXISTS business_profiles_status_name ON public.business_profiles(status,trade_name);
CREATE INDEX IF NOT EXISTS business_profiles_owner ON public.business_profiles(owner_profile_id,created_at DESC);
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
