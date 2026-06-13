-- ============================================================
-- IASMIN - Módulo de Projetos v2
-- Kanban + Eisenhower + 5W2H + Kaizen + Colunas customizáveis + Anexos
-- Execute no SQL Editor: supabase.com/dashboard/project/onrxfprvbswnlocwdqos/sql
-- ============================================================

-- 1. Projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  context TEXT NOT NULL DEFAULT 'personal' CHECK (context IN ('personal', 'business')),
  life_area TEXT NOT NULL DEFAULT 'outros' CHECK (life_area IN (
    'financeiro', 'familia', 'viagens', 'saude', 'compras', 'documentos',
    'equipe', 'fin_empresarial', 'marketing', 'operacoes', 'clientes', 'juridico',
    'outros'
  )),
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Colunas customizáveis do Kanban (criadas por projeto)
CREATE TABLE IF NOT EXISTS project_columns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tarefas do Projeto
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  kanban_status TEXT NOT NULL DEFAULT 'todo',  -- slug da coluna (sem CHECK para suportar colunas customizadas)
  kanban_order INTEGER NOT NULL DEFAULT 0,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,
  -- 5W2H disponível para todas as tarefas
  what TEXT,
  why TEXT,
  where_field TEXT,
  when_field DATE,
  who_field TEXT,
  how TEXT,
  how_much DECIMAL(10,2),
  due_date DATE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Anexos e Links por tarefa
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'link' CHECK (type IN ('link', 'file')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Sugestões Kaizen
CREATE TABLE IF NOT EXISTS kaizen_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'improvement' CHECK (type IN ('improvement', 'reminder', 'pattern')),
  is_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_context ON projects(context);
CREATE INDEX IF NOT EXISTS idx_project_columns_project_id ON project_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id ON project_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(kanban_status);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_kaizen_user_id ON kaizen_suggestions(user_id);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaizen_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_projects" ON projects
  FOR ALL USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "users_own_columns" ON project_columns
  FOR ALL USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "users_own_tasks" ON project_tasks
  FOR ALL USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "users_own_attachments" ON task_attachments
  FOR ALL USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "users_own_kaizen" ON kaizen_suggestions
  FOR ALL USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at();

CREATE TRIGGER trg_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at();
