-- Jornada, cadastro completo, indicações, tarefas e cofre familiar.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_relationship TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_referral_code_key ON public.user_profiles(referral_code) WHERE referral_code IS NOT NULL;
UPDATE public.user_profiles SET referral_code = upper(substr(replace(id::text, '-', ''), 1, 10)) WHERE referral_code IS NULL;

ALTER TABLE public.support_groups ADD COLUMN IF NOT EXISTS category_slug TEXT;
ALTER TABLE public.support_groups ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS support_groups_category_slug_key ON public.support_groups(category_slug) WHERE category_slug IS NOT NULL;

DO $$
DECLARE v_owner UUID;
BEGIN
  SELECT id INTO v_owner FROM public.user_profiles WHERE role='admin' AND is_active=true ORDER BY created_at LIMIT 1;
  IF v_owner IS NULL THEN RETURN; END IF;
  INSERT INTO public.support_groups(owner_profile_id,name,description,group_type,join_policy,ranking_enabled,category_slug,is_featured)
  VALUES
    (v_owner,'Sem Álcool','Apoio para quem decidiu viver sem álcool.','club','link',true,'alcool',true),
    (v_owner,'Sem Cigarro','Um dia de cada vez, respirando melhor.','club','link',true,'cigarro',true),
    (v_owner,'Sem Maconha','Comunidade reservada para apoio e constância.','club','link',true,'maconha',true),
    (v_owner,'Uso Consciente do Instagram','Mais presença, menos rolagem automática.','club','link',true,'instagram',true),
    (v_owner,'Sem Açúcar','Apoio para reduzir ou eliminar o açúcar.','club','link',true,'acucar',true),
    (v_owner,'Sem Pornografia','Grupo reservado com uso de apelido.','club','link',true,'pornografia',true),
    (v_owner,'Sem Cocaína','Apoio reservado para recuperação e constância.','club','link',true,'cocaina',true)
  ON CONFLICT (category_slug) WHERE category_slug IS NOT NULL DO UPDATE SET is_featured=true, ranking_enabled=true;
  INSERT INTO public.support_group_members(group_id,user_profile_id,role,status,nickname)
  SELECT g.id,v_owner,'owner','active',COALESCE(p.nickname,split_part(p.full_name,' ',1))
  FROM public.support_groups g JOIN public.user_profiles p ON p.id=v_owner
  WHERE g.is_featured=true ON CONFLICT DO NOTHING;
END $$;

CREATE TABLE IF NOT EXISTS public.personal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  description TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS personal_tasks_owner_idx ON public.personal_tasks(owner_profile_id,status,due_at);
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.family_vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (char_length(service_name) BETWEEN 2 AND 80),
  account_login TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.family_vault_access (
  item_id UUID NOT NULL REFERENCES public.family_vault_items(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY(item_id,user_profile_id)
);
ALTER TABLE public.family_vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_vault_access ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_group_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.support_group_posts(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_group_post_comments_post_idx ON public.support_group_post_comments(post_id,created_at);
ALTER TABLE public.support_group_post_comments ENABLE ROW LEVEL SECURITY;
