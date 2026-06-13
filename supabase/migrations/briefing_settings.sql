-- Adiciona configurações de briefing diário ao perfil do usuário
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS briefing_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS briefing_time    TIME    NOT NULL DEFAULT '08:00:00';

COMMENT ON COLUMN user_profiles.briefing_enabled IS 'Ativa/desativa o envio do briefing diário via WhatsApp';
COMMENT ON COLUMN user_profiles.briefing_time    IS 'Horário de envio do briefing (fuso do servidor = UTC)';
