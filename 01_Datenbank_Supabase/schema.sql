-- =============================================================================
-- TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
-- SUPABASE DATABASE SCHEMA MIGRATION
-- File: 01_Datenbank_Supabase/schema.sql
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLE: projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_prompt TEXT NOT NULL,
    selected_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_stage TEXT NOT NULL DEFAULT '1_fachteam' 
        CHECK (current_stage IN ('1_fachteam', '2_chef_agent', '3_trevor', '4_user_decision')),
    last_completed_agent TEXT,
    checkpoint_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'running' 
        CHECK (status IN ('running', 'paused_limit', 'pending_approval', 'approved', 'rejected')),
    trevor_summary TEXT,
    antigravity_prompt TEXT,
    rejection_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. TABLE: agent_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    department_id INT NOT NULL,
    department_name TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('pc_agent', 'chef_agent', 'trevor')),
    output_text TEXT NOT NULL,
    contradictions_resolved TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 4. TABLE: user_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    id INT PRIMARY KEY DEFAULT 1,
    llm_mode TEXT NOT NULL DEFAULT 'gemini' CHECK (llm_mode IN ('gemini', 'ollama')),
    ollama_url TEXT NOT NULL DEFAULT 'http://localhost:11434',
    ollama_model TEXT NOT NULL DEFAULT 'llama3',
    gemini_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    quiet_view BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_current_stage ON tasks(current_stage);
CREATE INDEX IF NOT EXISTS idx_agent_logs_task_id ON agent_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_department_id ON agent_logs(department_id);

-- -----------------------------------------------------------------------------
-- AUTO-UPDATE TRIGGER FOR updated_at COLUMNS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_projects_updated_at ON projects;
CREATE TRIGGER tr_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_tasks_updated_at ON tasks;
CREATE TRIGGER tr_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_user_settings_updated_at ON user_settings;
CREATE TRIGGER tr_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Default: Enable RLS and grant full access for authenticated and anon users
-- for local studio control / school prototyping.
-- -----------------------------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access projects" ON projects;
    CREATE POLICY "Public access projects" ON projects FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access tasks" ON tasks;
    CREATE POLICY "Public access tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access agent_logs" ON agent_logs;
    CREATE POLICY "Public access agent_logs" ON agent_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access user_settings" ON user_settings;
    CREATE POLICY "Public access user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);
END $$;

-- -----------------------------------------------------------------------------
-- INITIAL SEED DATA
-- -----------------------------------------------------------------------------
INSERT INTO user_settings (id, llm_mode, ollama_url, ollama_model, gemini_model, quiet_view)
VALUES (1, 'gemini', 'http://localhost:11434', 'llama3', 'gemini-2.5-flash', false)
ON CONFLICT (id) DO UPDATE SET
    llm_mode = EXCLUDED.llm_mode,
    ollama_url = EXCLUDED.ollama_url,
    ollama_model = EXCLUDED.ollama_model,
    gemini_model = EXCLUDED.gemini_model,
    quiet_view = EXCLUDED.quiet_view;

INSERT INTO projects (id, name, description, status)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Trevor Studio Default Project',
    'Standard-Workspace für automatisierte Software-Architektur und Multi-Agenten-Ausführung',
    'active'
)
ON CONFLICT (id) DO NOTHING;
