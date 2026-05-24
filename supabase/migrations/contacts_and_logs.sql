-- Execute no SQL Editor do Supabase (projeto: mijahjrxckrofqoujjba)

-- 1. Tabela de contatos (pré-cadastro via WhatsApp)
CREATE TABLE IF NOT EXISTS contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phone_number      TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'onboarding',
  -- status: onboarding | aguardando_aprovacao | aprovado | bloqueado
  onboarding_step   INT NOT NULL DEFAULT 0,
  -- steps: 0=nome, 1=cpf, 2=nascimento, 3=email, 4=cep, 5=confirmacao_endereco
  name              TEXT,
  cpf               TEXT,
  birth_date        TEXT,
  email             TEXT,
  cep               TEXT,
  address_json      JSONB DEFAULT '{}',
  instance_name     TEXT,
  first_message     TEXT,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID
);

-- Index para busca por telefone
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts(status);

-- 2. Tabela de logs do webhook (debug)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instance_name   TEXT,
  from_number     TEXT,
  event_type      TEXT,
  message_content TEXT,
  step_before     INT,
  step_after      INT,
  result          TEXT,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS webhook_logs_created_idx ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_logs_phone_idx ON webhook_logs(from_number);
