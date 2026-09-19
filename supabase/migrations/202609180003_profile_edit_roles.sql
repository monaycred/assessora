-- Edição segura do perfil: CPF e cargo são controlados apenas pelo servidor.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS emergency_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS emergency_relationship TEXT;
UPDATE public.user_profiles
SET nickname = split_part(btrim(full_name), ' ', 1)
WHERE nickname IS NULL;

-- A página passa a salvar por uma rota autenticada; revoga a edição genérica via REST.
REVOKE UPDATE ON TABLE public.user_profiles FROM anon, authenticated;

-- Nome e WhatsApp precisam mudar juntos no perfil e no contato da Evolution.
CREATE OR REPLACE FUNCTION public.update_profile_details(
  p_profile_id UUID, p_full_name TEXT, p_nickname TEXT, p_phone TEXT,
  p_birth_date DATE, p_emergency_name TEXT, p_emergency_phone TEXT,
  p_emergency_relationship TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_auth_user_id UUID;
BEGIN
  UPDATE public.user_profiles
  SET full_name = p_full_name, nickname = p_nickname, phone = p_phone,
      birth_date = p_birth_date, emergency_name = p_emergency_name,
      emergency_phone = p_emergency_phone,
      emergency_relationship = p_emergency_relationship, updated_at = NOW()
  WHERE id = p_profile_id
  RETURNING user_id INTO v_auth_user_id;
  IF v_auth_user_id IS NULL THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;

  UPDATE public.contacts
  SET name = p_full_name, phone_number = p_phone
  WHERE user_id = v_auth_user_id AND status = 'aprovado';

  UPDATE public.support_group_members SET nickname = p_nickname
  WHERE user_profile_id = p_profile_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_profile_details(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_profile_details(UUID, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', true, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- O Supabase Auth confirma a troca de e-mail; só então espelhamos no perfil.
CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.user_profiles SET email = NEW.email, updated_at = NOW()
    WHERE user_id = NEW.id;
    UPDATE public.contacts SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_profile_email_from_auth ON auth.users;
CREATE TRIGGER sync_profile_email_from_auth
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email_from_auth();
