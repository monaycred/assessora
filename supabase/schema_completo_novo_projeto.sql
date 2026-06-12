-- ============================================================
-- IASMIN - Schema Completo (novo projeto Supabase)
-- Execute no SQL Editor: supabase.com/dashboard/project/onrxfprvbswnlocwdqos/sql
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABELAS
-- ============================================================

-- 1. Perfis de usuários
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Membros do workspace
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 4. Números WhatsApp autorizados
CREATE TABLE IF NOT EXISTS authorized_whatsapp_numbers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  authorized_at TIMESTAMPTZ,
  authorized_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, user_id)
);

-- 5. Solicitações de aprovação
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL
);

-- 6. Mensagens recebidas
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  whatsapp_number TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
  media_url TEXT,
  raw_payload JSONB,
  action_taken TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Métodos de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit_card' CHECK (type IN ('credit_card', 'debit_card', 'pix', 'cash', 'other')),
  last_four TEXT,
  owner_name TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Despesas
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros' CHECK (category IN ('mercado', 'restaurante', 'saude', 'transporte', 'lazer', 'casa', 'outros')),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Eventos da agenda
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  google_event_id TEXT,
  event_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  doc_type TEXT NOT NULL DEFAULT 'other' CHECK (doc_type IN ('pdf', 'image', 'doc', 'spreadsheet', 'other')),
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  google_drive_id TEXT,
  folder TEXT,
  tags TEXT[],
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Listas de compras
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Itens das listas de compras
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit TEXT,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Lista de desejos
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  estimated_price DECIMAL(10,2),
  url TEXT,
  image_url TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Viagens
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  total_budget DECIMAL(10,2),
  notes TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Registros de saúde
CREATE TABLE IF NOT EXISTS health_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'consulta' CHECK (record_type IN ('consulta', 'exame', 'medicamento', 'cabelo', 'outro')),
  title TEXT NOT NULL,
  description TEXT,
  doctor_name TEXT,
  clinic TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_appointment DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Conexões Google
CREATE TABLE IF NOT EXISTS google_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('calendar', 'drive', 'gmail', 'docs', 'sheets')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- 18. Logs de uso da IA
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Contatos (onboarding via WhatsApp)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phone_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'onboarding',
  onboarding_step INT NOT NULL DEFAULT 0,
  name TEXT,
  cpf TEXT,
  birth_date TEXT,
  email TEXT,
  cep TEXT,
  address_json JSONB DEFAULT '{}',
  instance_name TEXT,
  first_message TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- 21. Logs do webhook
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instance_name TEXT,
  from_number TEXT,
  event_type TEXT,
  message_content TEXT,
  step_before INT,
  step_after INT,
  result TEXT,
  error TEXT
);

-- 22. Instâncias WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_name TEXT NOT NULL,
  instance_name TEXT NOT NULL UNIQUE,
  numero TEXT,
  tipo_canal TEXT NOT NULL DEFAULT 'whatsapp',
  provider TEXT NOT NULL DEFAULT 'evolution',
  api_url TEXT,
  api_key TEXT,
  webhook_url TEXT,
  cor TEXT NOT NULL DEFAULT '#25D366',
  is_active BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT false,
  status_conexao TEXT NOT NULL DEFAULT 'desconectado',
  config_json JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_authorized_whatsapp_phone ON authorized_whatsapp_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_approval_requests_phone ON approval_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp ON messages(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts(status);
CREATE INDEX IF NOT EXISTS webhook_logs_created_idx ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_logs_phone_idx ON webhook_logs(from_number);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Funções helper
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID AS $$
  SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ---- user_profiles ----
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_profiles_insert_service" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- ---- authorized_whatsapp_numbers ----
CREATE POLICY "whatsapp_select_own" ON authorized_whatsapp_numbers
  FOR SELECT USING (user_id = get_user_profile_id() OR is_admin());
CREATE POLICY "whatsapp_insert_own" ON authorized_whatsapp_numbers
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "whatsapp_update_own" ON authorized_whatsapp_numbers
  FOR UPDATE USING (user_id = get_user_profile_id() OR is_admin());
CREATE POLICY "whatsapp_delete_own" ON authorized_whatsapp_numbers
  FOR DELETE USING (user_id = get_user_profile_id() OR is_admin());

-- ---- approval_requests ----
CREATE POLICY "approvals_select_admin" ON approval_requests
  FOR SELECT USING (is_admin());
CREATE POLICY "approvals_update_admin" ON approval_requests
  FOR UPDATE USING (is_admin());
CREATE POLICY "approvals_insert_service" ON approval_requests
  FOR INSERT WITH CHECK (true);

-- ---- messages ----
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT USING (user_id = get_user_profile_id() OR is_admin());
CREATE POLICY "messages_insert_service" ON messages
  FOR INSERT WITH CHECK (true);

-- ---- expenses ----
CREATE POLICY "expenses_select_own" ON expenses
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "expenses_insert_own" ON expenses
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "expenses_delete_own" ON expenses
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- reminders ----
CREATE POLICY "reminders_select_own" ON reminders
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "reminders_insert_own" ON reminders
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "reminders_update_own" ON reminders
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "reminders_delete_own" ON reminders
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- calendar_events ----
CREATE POLICY "events_select_own" ON calendar_events
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "events_insert_own" ON calendar_events
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "events_update_own" ON calendar_events
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "events_delete_own" ON calendar_events
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- documents ----
CREATE POLICY "docs_select_own" ON documents
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "docs_insert_own" ON documents
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "docs_delete_own" ON documents
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- shopping_lists ----
CREATE POLICY "lists_select_own" ON shopping_lists
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "lists_insert_own" ON shopping_lists
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "lists_update_own" ON shopping_lists
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "lists_delete_own" ON shopping_lists
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- shopping_list_items ----
CREATE POLICY "list_items_select" ON shopping_list_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = get_user_profile_id()));
CREATE POLICY "list_items_insert" ON shopping_list_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = get_user_profile_id()));
CREATE POLICY "list_items_update" ON shopping_list_items
  FOR UPDATE USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = get_user_profile_id()));
CREATE POLICY "list_items_delete" ON shopping_list_items
  FOR DELETE USING (EXISTS (SELECT 1 FROM shopping_lists WHERE id = shopping_list_items.list_id AND user_id = get_user_profile_id()));

-- ---- wishlist_items ----
CREATE POLICY "wishlist_select_own" ON wishlist_items
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "wishlist_insert_own" ON wishlist_items
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "wishlist_update_own" ON wishlist_items
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "wishlist_delete_own" ON wishlist_items
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- trips ----
CREATE POLICY "trips_select_own" ON trips
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "trips_insert_own" ON trips
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "trips_update_own" ON trips
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "trips_delete_own" ON trips
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- health_records ----
CREATE POLICY "health_select_own" ON health_records
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "health_insert_own" ON health_records
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "health_update_own" ON health_records
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "health_delete_own" ON health_records
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- google_connections ----
CREATE POLICY "google_select_own" ON google_connections
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "google_insert_own" ON google_connections
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "google_update_own" ON google_connections
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "google_delete_own" ON google_connections
  FOR DELETE USING (user_id = get_user_profile_id());

-- ---- ai_usage_logs ----
CREATE POLICY "ai_logs_select_own" ON ai_usage_logs
  FOR SELECT USING (user_id = get_user_profile_id() OR is_admin());
CREATE POLICY "ai_logs_insert_service" ON ai_usage_logs
  FOR INSERT WITH CHECK (true);

-- ---- audit_logs ----
CREATE POLICY "audit_select_admin" ON audit_logs
  FOR SELECT USING (user_id = get_user_profile_id() OR is_admin());
CREATE POLICY "audit_insert_service" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ---- payment_methods ----
CREATE POLICY "payment_select_own" ON payment_methods
  FOR SELECT USING (user_id = get_user_profile_id());
CREATE POLICY "payment_insert_own" ON payment_methods
  FOR INSERT WITH CHECK (user_id = get_user_profile_id());
CREATE POLICY "payment_update_own" ON payment_methods
  FOR UPDATE USING (user_id = get_user_profile_id());
CREATE POLICY "payment_delete_own" ON payment_methods
  FOR DELETE USING (user_id = get_user_profile_id());

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Instância IASMIN
-- ============================================================

INSERT INTO whatsapp_instances (display_name, instance_name, api_url, api_key, webhook_url, status_conexao, ativo, is_active)
VALUES (
  'IASMIN',
  'IASMIN',
  'https://evolution-evolution-api.k4ezzu.easypanel.host',
  '429683C4C977415CAAFCCE10F7D57E11',
  'https://assessora.gedaias.com/api/webhook/evolution',
  'online',
  true,
  true
)
ON CONFLICT (instance_name) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  api_key = EXCLUDED.api_key,
  webhook_url = EXCLUDED.webhook_url,
  status_conexao = EXCLUDED.status_conexao,
  ativo = EXCLUDED.ativo,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- Após rodar este script, promova seu usuário a admin:
-- UPDATE user_profiles SET role = 'admin' WHERE cpf = '42238217843';
-- ============================================================
