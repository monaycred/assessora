-- ============================================================
-- IASMIN - Módulo de Projetos
-- Kanban + Eisenhower + 5W2H + Kaizen + Pessoal/Empresarial
-- Execute no SQL Editor: supabase.com/dashboard/project/onrxfprvbswnlocwdqos/sql
-- ============================================================

-- 1. Projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Contexto: pessoal ou empresarial
  context TEXT NOT NULL DEFAULT 'personal' CHECK (context IN ('personal', 'business')),

  -- Área da vida (pessoal)
  -- Área empresarial
  life_area TEXT NOT NULL DEFAULT 'outros' CHECK (life_area IN (
    -- Pessoal
    'financeiro', 'familia', 'viagens', 'saude', 'compras', 'documentos',
    -- Empresarial
    'equipe', 'fin_empresarial', 'marketing', 'operacoes', 'clientes', 'juridico',
    -- Genérico
    'outros'
  )),

  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tarefas do Projeto
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Básico
  title TEXT NOT NULL,
  description TEXT,

  -- Kanban
  kanban_status TEXT NOT NULL DEFAULT 'todo' CHECK (kanban_status IN (
    'todo', 'in_progress', 'waiting', 'done'
  )),
  kanban_order INTEGER NOT NULL DEFAULT 0,

  -- Eisenhower
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,

  -- 5W2H (disponível para tarefas urgente+importante e importante)
  what TEXT,
  why TEXT,
  where_field TEXT,
  when_field DATE,
  who_field TEXT,
  how TEXT,
  how_much DECIMAL(10,2),

  -- Meta
  due_date DATE,
  is_private BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sugestões Kaizen
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
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id ON project_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(kanban_status);
CREATE INDEX IF NOT EXISTS idx_kaizen_user_id ON kaizen_suggestions(user_id);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaizen_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_projects" ON projects
  FOR ALL USING (user_id = (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "users_own_tasks" ON project_tasks
  FOR ALL USING (user_id = (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "users_own_kaizen" ON kaizen_suggestions
  FOR ALL USING (user_id = (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ));

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
