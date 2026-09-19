ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS audience_scope TEXT NOT NULL DEFAULT 'global';

DO $$ BEGIN
  ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_audience_scope_check
    CHECK (audience_scope IN ('global','groups'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.community_post_groups (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.support_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_groups_group ON public.community_post_groups(group_id);
ALTER TABLE public.community_post_groups ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-posts', 'community-posts', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif'];

UPDATE public.support_groups
SET name='Menos Delivery',
    description='Apoio para cozinhar mais, pedir menos e cuidar do bolso e da saúde.',
    category_slug='delivery'
WHERE category_slug='cocaina';

INSERT INTO public.support_groups(owner_profile_id,name,description,group_type,join_policy,ranking_enabled,category_slug,is_featured)
SELECT owner_profile_id,'Guardar Dinheiro','Uma comunidade para criar constância financeira e comemorar cada valor guardado.','club','link',true,'guardar-dinheiro',true
FROM public.support_groups WHERE is_featured=true LIMIT 1
ON CONFLICT (category_slug) WHERE category_slug IS NOT NULL
DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, is_featured=true, ranking_enabled=true;

