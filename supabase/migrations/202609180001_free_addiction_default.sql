-- Controle de Vícios é gratuito para todas as contas aprovadas.
INSERT INTO public.user_module_access (user_profile_id, module_key, enabled, source, expires_at)
SELECT id, 'addiction', true, 'free', NULL
FROM public.user_profiles WHERE is_active = true
ON CONFLICT (user_profile_id, module_key)
DO UPDATE SET enabled = true, source = 'free', expires_at = NULL, updated_at = NOW();

CREATE OR REPLACE FUNCTION public.grant_free_addiction_on_activation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    INSERT INTO public.user_module_access (user_profile_id, module_key, enabled, source, expires_at)
    VALUES (NEW.id, 'addiction', true, 'free', NULL)
    ON CONFLICT (user_profile_id, module_key)
    DO UPDATE SET enabled = true, source = 'free', expires_at = NULL, updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS grant_free_addiction_on_insert ON public.user_profiles;
DROP TRIGGER IF EXISTS grant_free_addiction_on_activation ON public.user_profiles;
CREATE TRIGGER grant_free_addiction_on_insert
AFTER INSERT ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_free_addiction_on_activation();
CREATE TRIGGER grant_free_addiction_on_activation
AFTER UPDATE OF is_active ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_free_addiction_on_activation();
