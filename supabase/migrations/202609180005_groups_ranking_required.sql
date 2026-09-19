ALTER TABLE public.support_groups ALTER COLUMN ranking_enabled SET DEFAULT true;
UPDATE public.support_groups SET ranking_enabled = true WHERE ranking_enabled = false;
