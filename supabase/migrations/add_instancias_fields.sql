-- Migration: adicionar campos de instâncias estilo CRM-Raiz
-- Execute no SQL Editor do Supabase (projeto: mijahjrxckrofqoujjba)

ALTER TABLE whatsapp_instances
  ADD COLUMN IF NOT EXISTS api_url        TEXT,
  ADD COLUMN IF NOT EXISTS api_key        TEXT,
  ADD COLUMN IF NOT EXISTS provider       TEXT NOT NULL DEFAULT 'evolution',
  ADD COLUMN IF NOT EXISTS tipo_canal     TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS numero         TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url    TEXT,
  ADD COLUMN IF NOT EXISTS status_conexao TEXT NOT NULL DEFAULT 'desconectado',
  ADD COLUMN IF NOT EXISTS cor            TEXT NOT NULL DEFAULT '#25D366',
  ADD COLUMN IF NOT EXISTS config_json    JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ativo          BOOLEAN NOT NULL DEFAULT true;

-- Garante que is_active e ativo fiquem sincronizados (opcional — ativo é o novo campo principal)
UPDATE whatsapp_instances SET ativo = is_active WHERE ativo IS DISTINCT FROM is_active;
