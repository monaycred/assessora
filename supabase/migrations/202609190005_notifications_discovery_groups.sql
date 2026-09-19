CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_notifications_dedupe ON public.app_notifications(recipient_profile_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_notifications_recipient ON public.app_notifications(recipient_profile_id,read_at,created_at DESC);
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.discovery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('tip','movie','series','course','event')),
  title TEXT NOT NULL,
  description TEXT,
  provider TEXT,
  external_url TEXT,
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','archived')),
  submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS discovery_items_status_type ON public.discovery_items(status,item_type,created_at DESC);
ALTER TABLE public.discovery_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_group_members ADD COLUMN IF NOT EXISTS loyalty_accepted_at TIMESTAMPTZ;
ALTER TABLE public.support_groups ALTER COLUMN ranking_enabled SET DEFAULT false;

INSERT INTO public.discovery_items(item_type,title,description,provider,external_url,metadata,status)
SELECT * FROM (VALUES
 ('course','Estratégia de Negócios','Curso online gratuito.','Fundação Bradesco','https://www.ev.org.br/curso/administracao/fundamentos-da-administracao/estrategia-de-negocios?return=/cursos/administracao','{"format":"Online","price":"Gratuito"}'::jsonb,'published'),
 ('course','Contabilidade Empresarial','Curso online gratuito.','Fundação Bradesco','https://www.ev.org.br/curso/contabilidade-e-financas/contabilidade-empresarial?return=/cursos/contabilidade-e-financas','{"format":"Online","price":"Gratuito"}'::jsonb,'published'),
 ('course','Comunicação Escrita','Curso online gratuito.','Fundação Bradesco','https://www.ev.org.br/curso/educacao-e-pedagogia/apoio-a-estudantes/comunicacao-escrita?return=/cursos/educacao-e-pedagogia','{"format":"Online","price":"Gratuito"}'::jsonb,'published'),
 ('course','Atendimento ao Cliente','Curso online informado como gratuito na lista enviada.','Prime Cursos','https://www.primecursos.com.br/atendimento-ao-cliente/','{"format":"Online","price":"Gratuito"}'::jsonb,'published'),
 ('tip','Como criar hábitos que realmente duram','Defina uma ação pequena, um horário e uma forma simples de acompanhar.','Iasmin',NULL,'{"reading_minutes":3}'::jsonb,'published')
) AS seed(item_type,title,description,provider,external_url,metadata,status)
WHERE NOT EXISTS (SELECT 1 FROM public.discovery_items d WHERE d.title=seed.title AND d.provider IS NOT DISTINCT FROM seed.provider);
