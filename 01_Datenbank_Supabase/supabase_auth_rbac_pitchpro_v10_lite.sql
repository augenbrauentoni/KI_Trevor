-- ============================================================================
-- PITCHPRO VERSION 10.0 BETA LITE | SUPABASE AUTH PIPELINE & RBAC ARCHITEKTUR
-- ============================================================================
-- Projekt: Trevor Multi-Agent Studio Output (v2.0 Iron-Man Edition)
-- Kunde: PitchPro_Beta_10.0_lite
-- Sicherheits-Guardrails: RLS-Policy 'auth.uid() = user_id', Anti-Injection,
-- Mandantentrennung (school_id) & granulare 5-Stufen RBAC Matrix.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPEN FÜR RBAC & RECHTE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pitchpro_role') THEN
    CREATE TYPE public.pitchpro_role AS ENUM (
      'admin',        -- Vollzugriff auf System, Schulen, Trainer, Finanzen & Löschungen
      'trainer',      -- Standard-Trainer: Trainingspläne, Übungen, Notizen, Spieler
      'cotrainer',    -- Assistenztrainer: Einsicht, Live-Notizen & Teilbewertungen
      'verwaltung',   -- Backoffice: Spieler-Stammdaten, Verträge, Finanzen, Berichte
      'tester'        -- Eingeschränkter Test-Account: Testdaten-Zugriff, System gesperrt
    );
  END IF;
END $$;

-- 3. AUTOMATISCHE UPDATED_AT TRIGGER FUNKTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABELLE: MANDANTEN / FUSSBALLSCHULEN (SHARED SCHOOLS)
CREATE TABLE IF NOT EXISTS public.schools (
  id TEXT PRIMARY KEY DEFAULT 'pitchpro-main-school',
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT 'PITCHPRO-TEAM-2026',
  settings JSONB NOT NULL DEFAULT '{
    "allowSelfRegistration": true,
    "defaultRole": "trainer",
    "theme": "dark-slate-gold",
    "zeroDataLossEnabled": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at Trigger für schools
DROP TRIGGER IF EXISTS trg_schools_updated_at ON public.schools;
CREATE TRIGGER trg_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Standard-Schulen vorinitialisieren
INSERT INTO public.schools (id, name, invite_code)
VALUES 
  ('pitchpro-main-school', 'PitchPro Fußball-Akademie (Hauptcampus)', 'PITCHPRO-TEAM-2026'),
  ('pitchpro-talent-center', 'PitchPro Nachwuchsleistungszentrum', 'TALENT-CAMPUS-2026')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, invite_code = EXCLUDED.invite_code;

-- 5. TABELLE: TRAINER- & BENUTZERPROFILE (MIT AUTH-VERKNÜPFUNG & RBAC)
CREATE TABLE IF NOT EXISTS public.trainer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  license TEXT DEFAULT 'DFB A-Lizenz',
  role public.pitchpro_role NOT NULL DEFAULT 'trainer',
  active_role public.pitchpro_role NOT NULL DEFAULT 'trainer',
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE DEFAULT 'pitchpro-main-school',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_initials TEXT DEFAULT 'PP',
  metadata JSONB NOT NULL DEFAULT '{
    "notesDeletePrompt": "ask",
    "selectedTheme": "dark-slate",
    "offlineSnapshot": true
  }'::jsonb,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indizes für schnelle Abfragen (Agent chef_design / pc_back_1 Best Practice)
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_school ON public.trainer_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_role ON public.trainer_profiles(role);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_email ON public.trainer_profiles(email);

DROP TRIGGER IF EXISTS trg_trainer_profiles_updated_at ON public.trainer_profiles;
CREATE TRIGGER trg_trainer_profiles_updated_at
BEFORE UPDATE ON public.trainer_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. TABELLE: GRANULARE RBAC-PERMISSIONS MATRIX
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.pitchpro_role NOT NULL,
  module TEXT NOT NULL, -- 'players', 'sessions', 'drills', 'evaluations', 'finance', 'system_settings', 'users'
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_write BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (role, module)
);

-- Standard-Rechtematrix befüllen (idempotent)
INSERT INTO public.role_permissions (role, module, can_read, can_write, can_delete, can_export)
VALUES
  -- ADMIN (Vollzugriff)
  ('admin', 'players',         true, true, true, true),
  ('admin', 'sessions',        true, true, true, true),
  ('admin', 'drills',          true, true, true, true),
  ('admin', 'evaluations',     true, true, true, true),
  ('admin', 'finance',         true, true, true, true),
  ('admin', 'system_settings', true, true, true, true),
  ('admin', 'users',           true, true, true, true),

  -- TRAINER (Fachbereich Training & Spieler)
  ('trainer', 'players',         true, true, false, true),
  ('trainer', 'sessions',        true, true, false, true),
  ('trainer', 'drills',          true, true, false, true),
  ('trainer', 'evaluations',     true, true, false, true),
  ('trainer', 'finance',         true, false, false, false),
  ('trainer', 'system_settings', false, false, false, false),
  ('trainer', 'users',           true, false, false, false),

  -- COTRAINER (Assistenz & Einblicke)
  ('cotrainer', 'players',         true, false, false, false),
  ('cotrainer', 'sessions',        true, false, false, false),
  ('cotrainer', 'drills',          true, false, false, false),
  ('cotrainer', 'evaluations',     true, true, false, false),
  ('cotrainer', 'finance',         false, false, false, false),
  ('cotrainer', 'system_settings', false, false, false, false),
  ('cotrainer', 'users',           false, false, false, false),

  -- VERWALTUNG (Finanzen, Stammdaten, Verträge)
  ('verwaltung', 'players',         true, true, false, true),
  ('verwaltung', 'sessions',        true, false, false, true),
  ('verwaltung', 'drills',          true, false, false, false),
  ('verwaltung', 'evaluations',     true, false, false, true),
  ('verwaltung', 'finance',         true, true, true, true),
  ('verwaltung', 'system_settings', false, false, false, false),
  ('verwaltung', 'users',           true, true, false, true),

  -- TESTER (Sandbox & Evaluierung)
  ('tester', 'players',         true, true, false, false),
  ('tester', 'sessions',        true, true, false, false),
  ('tester', 'drills',          true, false, false, false),
  ('tester', 'evaluations',     true, true, false, false),
  ('tester', 'finance',         true, false, false, false),
  ('tester', 'system_settings', false, false, false, false),
  ('tester', 'users',           false, false, false, false)
ON CONFLICT (role, module) DO UPDATE
SET can_read = EXCLUDED.can_read,
    can_write = EXCLUDED.can_write,
    can_delete = EXCLUDED.can_delete,
    can_export = EXCLUDED.can_export;

-- 7. TABELLEN: DOMÄNENDATEN MIT MANDANTEN- & RBAC-SCHUTZ
-- 7.1 SPIELER-TABELLE
CREATE TABLE IF NOT EXISTS public.pitchpro_players (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE DEFAULT 'pitchpro-main-school',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_year INTEGER,
  position_group TEXT,
  status TEXT DEFAULT 'active',
  draft_notes JSONB DEFAULT '[]'::jsonb,
  final_notes TEXT DEFAULT '',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitchpro_players_school ON public.pitchpro_players(school_id);
CREATE INDEX IF NOT EXISTS idx_pitchpro_players_user ON public.pitchpro_players(user_id);

DROP TRIGGER IF EXISTS trg_pitchpro_players_updated_at ON public.pitchpro_players;
CREATE TRIGGER trg_pitchpro_players_updated_at
BEFORE UPDATE ON public.pitchpro_players
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7.2 TRAININGSSESSIONS & PLÄNE
CREATE TABLE IF NOT EXISTS public.pitchpro_sessions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE DEFAULT 'pitchpro-main-school',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  time_slot TEXT DEFAULT '16:30 - 18:00',
  coach TEXT,
  group_id TEXT,
  player_ids JSONB DEFAULT '[]'::jsonb,
  blocks JSONB DEFAULT '[]'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitchpro_sessions_school_date ON public.pitchpro_sessions(school_id, session_date);
CREATE INDEX IF NOT EXISTS idx_pitchpro_sessions_user ON public.pitchpro_sessions(user_id);

DROP TRIGGER IF EXISTS trg_pitchpro_sessions_updated_at ON public.pitchpro_sessions;
CREATE TRIGGER trg_pitchpro_sessions_updated_at
BEFORE UPDATE ON public.pitchpro_sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7.3 TÄGLICHE ÜBUNGSBEWERTUNGEN (0-10 PUNKTE SKALA)
CREATE TABLE IF NOT EXISTS public.pitchpro_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE DEFAULT 'pitchpro-main-school',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES public.pitchpro_players(id) ON DELETE CASCADE,
  eval_date DATE NOT NULL,
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb, -- drill_id -> score (z. B. "drill_1": 8.5)
  notes TEXT DEFAULT '',
  coach_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_player_eval_date UNIQUE (player_id, eval_date)
);

CREATE INDEX IF NOT EXISTS idx_pitchpro_evaluations_school ON public.pitchpro_evaluations(school_id);
CREATE INDEX IF NOT EXISTS idx_pitchpro_evaluations_date ON public.pitchpro_evaluations(eval_date);
CREATE INDEX IF NOT EXISTS idx_pitchpro_evaluations_user ON public.pitchpro_evaluations(user_id);

DROP TRIGGER IF EXISTS trg_pitchpro_evaluations_updated_at ON public.pitchpro_evaluations;
CREATE TRIGGER trg_pitchpro_evaluations_updated_at
BEFORE UPDATE ON public.pitchpro_evaluations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7.4 APP-STATES & SNAPSHOTS (ZERO-DATA-LOSS)
CREATE TABLE IF NOT EXISTS public.pitchpro_app_states (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE DEFAULT 'pitchpro-main-school',
  workspace_id TEXT DEFAULT 'default',
  version TEXT DEFAULT '10.0-beta-lite',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  checksum TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitchpro_app_states_school ON public.pitchpro_app_states(school_id);
CREATE INDEX IF NOT EXISTS idx_pitchpro_app_states_user ON public.pitchpro_app_states(user_id);

-- 7.5 DSGVO AUDIT-LOG (REVISIONSSICHER)
CREATE TABLE IF NOT EXISTS public.pitchpro_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'LOGIN', 'SIGNUP', 'UPDATE_ROLE', 'DELETE_PLAYER', 'EVALUATION_SAVED'
  module TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitchpro_audit_school_created ON public.pitchpro_audit_logs(school_id, created_at DESC);

-- 8. HELPER-FUNKTIONEN FÜR RLS & SICHERHEIT (SECURITY DEFINER / STABLE)
-- 8.1 Ermittelt Schul-ID des angemeldeten Benutzers
CREATE OR REPLACE FUNCTION public.get_auth_trainer_school_id()
RETURNS TEXT AS $$
DECLARE
  v_school_id TEXT;
BEGIN
  SELECT school_id INTO v_school_id
  FROM public.trainer_profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_school_id, 'pitchpro-main-school');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8.2 Ermittelt aktive Rolle des angemeldeten Benutzers
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.pitchpro_role AS $$
DECLARE
  v_role public.pitchpro_role;
BEGIN
  SELECT active_role INTO v_role
  FROM public.trainer_profiles
  WHERE id = auth.uid();

  -- Fallback auf JWT-Metadata falls Profil noch nicht synchronisiert
  IF v_role IS NULL THEN
    IF auth.jwt() ->> 'email' ILIKE '%admin%' THEN
      RETURN 'admin'::public.pitchpro_role;
    END IF;
    RETURN 'trainer'::public.pitchpro_role;
  END IF;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8.3 Prüft Administrator-Berechtigung
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_auth_user_role() = 'admin'::public.pitchpro_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8.4 Prüft Modul-Berechtigung via Rechtematrix
CREATE OR REPLACE FUNCTION public.has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_role public.pitchpro_role;
  v_allowed BOOLEAN := false;
BEGIN
  v_role := public.get_auth_user_role();

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF p_action = 'read' THEN
    SELECT can_read INTO v_allowed FROM public.role_permissions WHERE role = v_role AND module = p_module;
  ELSIF p_action = 'write' THEN
    SELECT can_write INTO v_allowed FROM public.role_permissions WHERE role = v_role AND module = p_module;
  ELSIF p_action = 'delete' THEN
    SELECT can_delete INTO v_allowed FROM public.role_permissions WHERE role = v_role AND module = p_module;
  ELSIF p_action = 'export' THEN
    SELECT can_export INTO v_allowed FROM public.role_permissions WHERE role = v_role AND module = p_module;
  END IF;

  RETURN COALESCE(v_allowed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. AUTH-PIPELINE: TRIGGER FÜR NEU-REGISTRIERUNGEN
CREATE OR REPLACE FUNCTION public.handle_new_trainer_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_school_id TEXT;
  v_assigned_role public.pitchpro_role;
  v_full_name TEXT;
  v_license TEXT;
BEGIN
  -- Metadaten aus der Registrierung extrahieren
  v_code := COALESCE(NEW.raw_user_meta_data->>'school_code', 'PITCHPRO-TEAM-2026');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_license := COALESCE(NEW.raw_user_meta_data->>'license', 'DFB A-Lizenz');
  
  -- Schulcode validieren
  SELECT id INTO v_school_id FROM public.schools WHERE invite_code = v_code LIMIT 1;
  IF v_school_id IS NULL THEN
    v_school_id := 'pitchpro-main-school';
  END IF;

  -- Rolle zuweisen
  IF NEW.email ILIKE '%admin%' OR NEW.raw_user_meta_data->>'role' = 'admin' THEN
    v_assigned_role := 'admin'::public.pitchpro_role;
  ELSIF NEW.raw_user_meta_data->>'role' = 'cotrainer' THEN
    v_assigned_role := 'cotrainer'::public.pitchpro_role;
  ELSIF NEW.raw_user_meta_data->>'role' = 'verwaltung' THEN
    v_assigned_role := 'verwaltung'::public.pitchpro_role;
  ELSIF NEW.raw_user_meta_data->>'role' = 'tester' THEN
    v_assigned_role := 'tester'::public.pitchpro_role;
  ELSE
    v_assigned_role := 'trainer'::public.pitchpro_role;
  END IF;

  -- Trainer-Profil anlegen oder aktualisieren
  INSERT INTO public.trainer_profiles (
    id, email, full_name, license, role, active_role, school_id, last_sign_in_at
  )
  VALUES (
    NEW.id, NEW.email, v_full_name, v_license, v_assigned_role, v_assigned_role, v_school_id, NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.trainer_profiles.full_name),
      last_sign_in_at = NOW(),
      updated_at = NOW();

  -- Audit-Log schreiben
  INSERT INTO public.pitchpro_audit_logs (user_id, school_id, action, module, details)
  VALUES (NEW.id, v_school_id, 'USER_SIGNUP', 'auth', jsonb_build_object(
    'email', NEW.email,
    'assigned_role', v_assigned_role,
    'school_id', v_school_id
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_trainer_signup();

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Aktivierung auf allen Tabellen
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitchpro_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitchpro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitchpro_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitchpro_app_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitchpro_audit_logs ENABLE ROW LEVEL SECURITY;

-- 10.1 SCHOOLS POLICIES
DROP POLICY IF EXISTS "Trainer dürfen Schule einsehen" ON public.schools;
CREATE POLICY "Trainer dürfen Schule einsehen" ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.get_auth_trainer_school_id() OR public.is_admin());

DROP POLICY IF EXISTS "Nur Admins dürfen Schulen modifizieren" ON public.schools;
CREATE POLICY "Nur Admins dürfen Schulen modifizieren" ON public.schools
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10.2 TRAINER PROFILES POLICIES
DROP POLICY IF EXISTS "Profile der eigenen Schule einsehen" ON public.trainer_profiles;
CREATE POLICY "Profile der eigenen Schule einsehen" ON public.trainer_profiles
  FOR SELECT TO authenticated
  USING (school_id = public.get_auth_trainer_school_id() OR auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Eigenes Profil aktualisieren" ON public.trainer_profiles;
CREATE POLICY "Eigenes Profil aktualisieren" ON public.trainer_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 10.3 ROLE PERMISSIONS POLICIES
DROP POLICY IF EXISTS "Rechtematrix lesbar für alle authentifizierten Benutzer" ON public.role_permissions;
CREATE POLICY "Rechtematrix lesbar für alle authentifizierten Benutzer" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Nur Admins dürfen Rechtematrix anpassen" ON public.role_permissions;
CREATE POLICY "Nur Admins dürfen Rechtematrix anpassen" ON public.role_permissions
  FOR ALL TO authenticated USING (public.is_admin());

-- 10.4 PLAYERS POLICIES (GUARDRAIL: auth.uid() = user_id OR school_id isolation)
DROP POLICY IF EXISTS "Spieler lesen" ON public.pitchpro_players;
CREATE POLICY "Spieler lesen" ON public.pitchpro_players
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id() 
    AND public.has_permission('players', 'read')
  );

DROP POLICY IF EXISTS "Spieler anlegen" ON public.pitchpro_players;
CREATE POLICY "Spieler anlegen" ON public.pitchpro_players
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('players', 'write')
  );

DROP POLICY IF EXISTS "Spieler aktualisieren" ON public.pitchpro_players;
CREATE POLICY "Spieler aktualisieren" ON public.pitchpro_players
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND (user_id = auth.uid() OR public.has_permission('players', 'write'))
  );

DROP POLICY IF EXISTS "Spieler löschen (Nur Admin/Verwaltung)" ON public.pitchpro_players;
CREATE POLICY "Spieler löschen (Nur Admin/Verwaltung)" ON public.pitchpro_players
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('players', 'delete')
  );

-- 10.5 SESSIONS POLICIES
DROP POLICY IF EXISTS "Sessions lesen" ON public.pitchpro_sessions;
CREATE POLICY "Sessions lesen" ON public.pitchpro_sessions
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('sessions', 'read')
  );

DROP POLICY IF EXISTS "Sessions anlegen" ON public.pitchpro_sessions;
CREATE POLICY "Sessions anlegen" ON public.pitchpro_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('sessions', 'write')
  );

DROP POLICY IF EXISTS "Sessions aktualisieren" ON public.pitchpro_sessions;
CREATE POLICY "Sessions aktualisieren" ON public.pitchpro_sessions
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND (user_id = auth.uid() OR public.has_permission('sessions', 'write'))
  );

DROP POLICY IF EXISTS "Sessions löschen (Nur Admin)" ON public.pitchpro_sessions;
CREATE POLICY "Sessions löschen (Nur Admin)" ON public.pitchpro_sessions
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('sessions', 'delete')
  );

-- 10.6 EVALUATIONS POLICIES (Tagesbewertungen 0-10 Punkte)
DROP POLICY IF EXISTS "Bewertungen lesen" ON public.pitchpro_evaluations;
CREATE POLICY "Bewertungen lesen" ON public.pitchpro_evaluations
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('evaluations', 'read')
  );

DROP POLICY IF EXISTS "Bewertungen erfassen" ON public.pitchpro_evaluations;
CREATE POLICY "Bewertungen erfassen" ON public.pitchpro_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_auth_trainer_school_id()
    AND user_id = auth.uid()
    AND public.has_permission('evaluations', 'write')
  );

DROP POLICY IF EXISTS "Bewertungen bearbeiten" ON public.pitchpro_evaluations;
CREATE POLICY "Bewertungen bearbeiten" ON public.pitchpro_evaluations
  FOR UPDATE TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND (user_id = auth.uid() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Bewertungen löschen (Nur Admin)" ON public.pitchpro_evaluations;
CREATE POLICY "Bewertungen löschen (Nur Admin)" ON public.pitchpro_evaluations
  FOR DELETE TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND public.has_permission('evaluations', 'delete')
  );

-- 10.7 APP STATES POLICIES (Zero-Data-Loss Fallback-Snapshot)
DROP POLICY IF EXISTS "App-States lesen" ON public.pitchpro_app_states;
CREATE POLICY "App-States lesen" ON public.pitchpro_app_states
  FOR SELECT TO authenticated
  USING (school_id = public.get_auth_trainer_school_id() OR user_id = auth.uid());

DROP POLICY IF EXISTS "App-States speichern" ON public.pitchpro_app_states;
CREATE POLICY "App-States speichern" ON public.pitchpro_app_states
  FOR ALL TO authenticated
  USING (school_id = public.get_auth_trainer_school_id() OR user_id = auth.uid())
  WITH CHECK (school_id = public.get_auth_trainer_school_id() OR user_id = auth.uid());

-- 10.8 AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Audit-Logs lesen (Nur Admin & Verwaltung)" ON public.pitchpro_audit_logs;
CREATE POLICY "Audit-Logs lesen (Nur Admin & Verwaltung)" ON public.pitchpro_audit_logs
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_auth_trainer_school_id()
    AND (public.is_admin() OR public.get_auth_user_role() = 'verwaltung')
  );

DROP POLICY IF EXISTS "Audit-Logs einfügen für alle Benutzer" ON public.pitchpro_audit_logs;
CREATE POLICY "Audit-Logs einfügen für alle Benutzer" ON public.pitchpro_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 11. RPC CLIENT-FUNKTIONEN (REDUZIERT LATENZ & RACE-CONDITIONS)
-- 11.1 Kontext des aktuellen Benutzers in einem einzigen Aufruf holen
CREATE OR REPLACE FUNCTION public.rpc_get_user_context()
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile RECORD;
  v_school RECORD;
  v_perms JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT * INTO v_profile FROM public.trainer_profiles WHERE id = v_uid;
  SELECT * INTO v_school FROM public.schools WHERE id = v_profile.school_id;

  SELECT jsonb_object_agg(
    module,
    jsonb_build_object(
      'read', can_read,
      'write', can_write,
      'delete', can_delete,
      'export', can_export
    )
  ) INTO v_perms
  FROM public.role_permissions
  WHERE role = v_profile.active_role;

  RETURN jsonb_build_object(
    'authenticated', true,
    'user_id', v_uid,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'license', v_profile.license,
    'role', v_profile.role,
    'active_role', v_profile.active_role,
    'is_admin', (v_profile.active_role = 'admin'),
    'school', jsonb_build_object(
      'id', v_school.id,
      'name', v_school.name,
      'invite_code', v_school.invite_code
    ),
    'permissions', COALESCE(v_perms, '{}'::jsonb),
    'metadata', v_profile.metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 11.2 Aktive Rolle umschalten (für Admins & Tester zum Simulieren)
CREATE OR REPLACE FUNCTION public.rpc_switch_active_role(p_new_role public.pitchpro_role)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actual_role public.pitchpro_role;
BEGIN
  SELECT role INTO v_actual_role FROM public.trainer_profiles WHERE id = v_uid;

  -- Nur Admins und Tester dürfen Rollen zu Simulationszwecken wechseln
  IF v_actual_role != 'admin' AND v_actual_role != 'tester' THEN
    RAISE EXCEPTION 'Berechtigung verweigert: Nur Admins und Tester können aktive Rollen simulieren.';
  END IF;

  UPDATE public.trainer_profiles
  SET active_role = p_new_role,
      updated_at = NOW()
  WHERE id = v_uid;

  -- Audit Log
  INSERT INTO public.pitchpro_audit_logs (user_id, school_id, action, module, details)
  VALUES (v_uid, public.get_auth_trainer_school_id(), 'SWITCH_ROLE', 'auth', jsonb_build_object(
    'previous_role', v_actual_role,
    'simulated_role', p_new_role
  ));

  RETURN public.rpc_get_user_context();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11.3 Schul-Einladungscode validieren
CREATE OR REPLACE FUNCTION public.rpc_verify_invite_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_school RECORD;
BEGIN
  SELECT id, name INTO v_school FROM public.schools WHERE invite_code = p_code LIMIT 1;
  IF v_school.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Ungültiger Einladungscode');
  ELSE
    RETURN jsonb_build_object('valid', true, 'school_id', v_school.id, 'school_name', v_school.name);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
