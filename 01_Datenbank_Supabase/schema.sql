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
-- 5. TABLE: system_optimizations (Backlog für System-Neuerungen & Optimierungen)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_optimizations (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    department_id INT NOT NULL,
    title TEXT NOT NULL,
    target_file TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 6. TABLE: task_decisions (Interaktive [JA]/[NEIN] Entscheidungen pro Schritt)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_title TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('JA', 'NEIN', 'APPROVED', 'REJECTED')),
    target_file TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 7. TABLE: department_metrics (Monitoring für alle 14 Abteilungen EG & UG)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS department_metrics (
    department_id INT PRIMARY KEY,
    department_name TEXT NOT NULL,
    floor TEXT NOT NULL DEFAULT 'EG' CHECK (floor IN ('EG', 'UG')),
    total_tasks_assigned INT NOT NULL DEFAULT 0,
    total_tasks_completed INT NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 8. TABLE: trevor_memory (Cloud-Gedächtnis & Supabase RAG-Archiv)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trevor_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department TEXT NOT NULL,
    topic TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    problem_statement TEXT NOT NULL,
    solution_pattern TEXT NOT NULL,
    reusable_code_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
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
CREATE INDEX IF NOT EXISTS idx_optimizations_status ON system_optimizations(status);
CREATE INDEX IF NOT EXISTS idx_optimizations_dept ON system_optimizations(department_id);
CREATE INDEX IF NOT EXISTS idx_task_decisions_task ON task_decisions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_decisions_step ON task_decisions(step_id);
CREATE INDEX IF NOT EXISTS idx_dept_metrics_floor ON department_metrics(floor);
CREATE INDEX IF NOT EXISTS idx_trevor_memory_dept ON trevor_memory(department);
CREATE INDEX IF NOT EXISTS idx_trevor_memory_created_at ON trevor_memory(created_at DESC);

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

DROP TRIGGER IF EXISTS tr_system_optimizations_updated_at ON system_optimizations;
CREATE TRIGGER tr_system_optimizations_updated_at
    BEFORE UPDATE ON system_optimizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_trevor_memory_updated_at ON trevor_memory;
CREATE TRIGGER tr_trevor_memory_updated_at
    BEFORE UPDATE ON trevor_memory
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
ALTER TABLE system_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trevor_memory ENABLE ROW LEVEL SECURITY;

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

    DROP POLICY IF EXISTS "Public access system_optimizations" ON system_optimizations;
    CREATE POLICY "Public access system_optimizations" ON system_optimizations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access task_decisions" ON task_decisions;
    CREATE POLICY "Public access task_decisions" ON task_decisions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access department_metrics" ON department_metrics;
    CREATE POLICY "Public access department_metrics" ON department_metrics FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access trevor_memory" ON trevor_memory;
    CREATE POLICY "Public access trevor_memory" ON trevor_memory FOR ALL USING (true) WITH CHECK (true);
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

-- Seed Freigegebene Master-Optimierungen (Roadmap)
INSERT INTO system_optimizations (id, category, department_id, title, target_file, description, priority, status)
VALUES
    ('OPT-01', 'Frontend', 3, 'Interaktive Benutzeroberfläche & Checkliste', '02_Frontend_UI_und_3D_Studio/app.js', 'Dark-Slate [JA]/[NEIN] Entscheidungsliste mit Multi-Filter & Live-Counter', 'HIGH', 'completed'),
    ('OPT-02', 'Backend', 5, 'Dual-Engine REST-Endpunkte & Task-Router', '06_Deployment_und_Config/server.js', 'Absicherung der API-Endpunkte für Gemini und Ollama Inferenz sowie Task-Historie', 'HIGH', 'completed'),
    ('OPT-03', 'Database', 6, 'Supabase Schema & Row-Level-Security Policies', '01_Datenbank_Supabase/schema.sql', 'Tabellenstrukturen, relationale Indizes und RLS-Sicherheitsregeln absichern', 'HIGH', 'completed'),
    ('OPT-04', '3D-Campus', 4, 'Three.js 3D-Campus Render-Loop & State-Sync', '02_Frontend_UI_und_3D_Studio/studio3D.js', 'Optimierung des OrbitControls Damping, 60 FPS Animation-Frames und Raum-Statusanzeigen', 'HIGH', 'in_progress')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- Seed 14 Abteilungen (10 EG, 4 UG)
INSERT INTO department_metrics (department_id, department_name, floor)
VALUES
    (1, 'Ideen & Planung', 'EG'),
    (2, 'Bauplan & Technik', 'EG'),
    (3, 'Aussehen & Bedienung (Frontend)', 'EG'),
    (4, '3D-Campus & Grafiken', 'EG'),
    (5, 'Server & Hintergrund-Logik (Backend)', 'EG'),
    (6, 'Datenbank & Speicher', 'EG'),
    (7, 'Verbindungen & Schnittstellen (APIs)', 'EG'),
    (8, 'Qualitäts- & Fehlerprüfung (QA)', 'EG'),
    (9, 'Absicherung & Passwörter (Security)', 'EG'),
    (10, 'Bereitstellung & Wartung (DevOps)', 'EG'),
    (11, 'Das Archiv', 'UG'),
    (12, 'Der Serverraum', 'UG'),
    (13, 'Die Werkstatt', 'UG'),
    (14, 'Die Lounge', 'UG')
ON CONFLICT (department_id) DO NOTHING;

-- Seed Cloud-Gedächtnis (trevor_memory)
INSERT INTO trevor_memory (department, topic, tags, problem_statement, solution_pattern, reusable_code_snippet)
VALUES
    (
        'EG_BACKEND',
        'Sichere Umgebungsvariablen',
        ARRAY['nodejs', 'security', 'dotenv'],
        'API-Keys waren im Frontend-Code ungeschützt sichtbar.',
        'Auslagerung der Fetch-Calls in einen Node.js Proxy.',
        'const apiKey = process.env.GEMINI_API_KEY;'
    ),
    (
        'EG_FRONTEND',
        'Three.js Render-Loop Stabilität',
        ARRAY['threejs', 'webgl', 'performance', 'lerp'],
        'Kamera-Sprünge führten zu Frame-Drops und inkonsistenten Animationen.',
        'Verwendung von camera.position.lerp() innerhalb der animate()-Schleife ohne externe Bibliotheken.',
        'camera.position.lerp(targetCameraPosition, 0.08);'
    ),
    (
        'EG_DATENBANK',
        'Supabase RLS-Richtlinien & Multi-Tenant Isolation',
        ARRAY['supabase', 'sql', 'rls', 'security'],
        'Direkter Datenbankzugriff ohne Autorisierungsprüfung gefährdet Mandanten-Daten.',
        'Aktivierung von ROW LEVEL SECURITY mit strikten Policies für auth.uid().',
        'CREATE POLICY "Users access own rows" ON tasks FOR ALL USING (auth.uid() = user_id);'
    );
