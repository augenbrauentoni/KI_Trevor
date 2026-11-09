/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 04_KI_Engine_und_Bridges/supabaseClient.js
 * 
 * Isomorpher Supabase-Client mit automatischem Offline- & Schulnetz-Fallback.
 * Unterstützt Node.js und Browser-Umgebungen.
 * Wenn Supabase nicht erreichbar ist (z. B. Schul-WLAN oder fehlende Keys),
 * wird automatisch der lokale Speicher (localStorage / lokales Dateisystem) genutzt.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let createClient = null;
try {
  const supabaseMod = await import('@supabase/supabase-js');
  createClient = supabaseMod.createClient;
} catch {
  // @supabase/supabase-js optional: Zero-Dependency-Fallback aktiv
}

const __filename = typeof import.meta.url === 'string' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : '';
const ROOT_DIR = __dirname ? path.resolve(__dirname, '..') : process.cwd();

// Standard-Konfiguration (über Environment-Variablen oder Schul-Defaults anpassbar)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mock-school-supabase.internal';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

let supabaseInstance = null;
let isOfflineFallbackActive = false;

// Lokaler Dateipfad für Offline-Fallback in Node.js
const LOCAL_STORAGE_DIR = path.join(ROOT_DIR, '00_Checkpoints_und_Status');
const LOCAL_DB_FILE = path.join(LOCAL_STORAGE_DIR, 'local_db_fallback.json');

// In-Memory & File-Backed Mock Database
let localDbState = {
  projects: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Trevor Studio Default Project',
      description: 'Standard-Workspace für automatisierte Software-Architektur',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  tasks: [],
  agent_logs: [],
  user_settings: {
    id: 1,
    llm_mode: 'gemini',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3',
    gemini_model: 'gemini-2.5-flash',
    quiet_view: false,
    updated_at: new Date().toISOString()
  }
};

// Initiales Laden des lokalen DB-Zustands falls vorhanden
try {
  if (typeof window === 'undefined' && fs.existsSync(LOCAL_DB_FILE)) {
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    localDbState = JSON.parse(raw);
  } else if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem('trevor_local_db');
    if (raw) localDbState = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[Trevor DB] Lokale DB-Datei konnte nicht geladen werden, verwende Init-State.', e.message);
}

function persistLocalDb() {
  try {
    if (typeof window === 'undefined') {
      if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
        fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localDbState, null, 2), 'utf-8');
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('trevor_local_db', JSON.stringify(localDbState));
    }
  } catch (err) {
    console.error('[Trevor DB] Fehler beim Schreiben der lokalen DB:', err);
  }
}

// Initialisiere Supabase Client
try {
  if (SUPABASE_URL && !SUPABASE_URL.includes('mock-school')) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    isOfflineFallbackActive = true;
    console.log('[Trevor DB] Kein externer Supabase-Endpunkt konfiguriert. Offline-Fallback aktiviert.');
  }
} catch (err) {
  isOfflineFallbackActive = true;
  console.warn('[Trevor DB] Supabase-Verbindung fehlgeschlagen. Nutze Offline-Fallback:', err.message);
}

export const supabase = supabaseInstance;

/**
 * Universeller Datenbank-Wrapper mit automatischer Fallback-Logik
 */
export const dbBridge = {
  isOffline: () => isOfflineFallbackActive,

  // --- PROJECTS ---
  async getProjects() {
    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('projects').select('*').order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Trevor DB] Supabase getProjects fehlgeschlagen, wechsle auf Fallback:', e.message);
      }
    }
    return localDbState.projects;
  },

  // --- TASKS ---
  async createTask(taskData) {
    const newTask = {
      id: taskData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'task_' + Date.now()),
      project_id: taskData.project_id || 'a0000000-0000-0000-0000-000000000001',
      user_prompt: taskData.user_prompt,
      selected_departments: taskData.selected_departments || [],
      current_stage: taskData.current_stage || '1_fachteam',
      last_completed_agent: taskData.last_completed_agent || null,
      checkpoint_data: taskData.checkpoint_data || {},
      status: taskData.status || 'running',
      trevor_summary: taskData.trevor_summary || null,
      antigravity_prompt: taskData.antigravity_prompt || null,
      rejection_feedback: taskData.rejection_feedback || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('tasks').insert([newTask]).select().single();
        if (!error && data) {
          localDbState.tasks.push(data);
          persistLocalDb();
          return data;
        }
      } catch (e) {
        console.warn('[Trevor DB] Supabase createTask fehlgeschlagen, sichere lokal:', e.message);
      }
    }

    localDbState.tasks.push(newTask);
    persistLocalDb();
    return newTask;
  },

  async getTask(taskId) {
    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('tasks').select('*').eq('id', taskId).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Trevor DB] Supabase getTask fehlgeschlagen, suche lokal:', e.message);
      }
    }
    return localDbState.tasks.find(t => t.id === taskId) || null;
  },

  async listTasks(limit = 20) {
    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('tasks').select('*').order('created_at', { ascending: false }).limit(limit);
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Trevor DB] Supabase listTasks fehlgeschlagen, nutze lokal:', e.message);
      }
    }
    return [...localDbState.tasks].reverse().slice(0, limit);
  },

  async updateTask(taskId, updates) {
    const patch = { ...updates, updated_at: new Date().toISOString() };

    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('tasks').update(patch).eq('id', taskId).select().single();
        if (!error && data) {
          const idx = localDbState.tasks.findIndex(t => t.id === taskId);
          if (idx !== -1) localDbState.tasks[idx] = data;
          else localDbState.tasks.push(data);
          persistLocalDb();
          return data;
        }
      } catch (e) {
        console.warn('[Trevor DB] Supabase updateTask fehlgeschlagen, speichere lokal:', e.message);
      }
    }

    const idx = localDbState.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      localDbState.tasks[idx] = { ...localDbState.tasks[idx], ...patch };
      persistLocalDb();
      return localDbState.tasks[idx];
    }
    return null;
  },

  // --- AGENT LOGS ---
  async saveAgentLog(logData) {
    const newLog = {
      id: logData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'log_' + Date.now()),
      task_id: logData.task_id,
      department_id: logData.department_id,
      department_name: logData.department_name,
      agent_id: logData.agent_id,
      agent_name: logData.agent_name,
      role: logData.role,
      output_text: logData.output_text,
      contradictions_resolved: logData.contradictions_resolved || null,
      created_at: new Date().toISOString()
    };

    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('agent_logs').insert([newLog]).select().single();
        if (!error && data) {
          localDbState.agent_logs.push(data);
          persistLocalDb();
          return data;
        }
      } catch (e) {
        console.warn('[Trevor DB] Supabase saveAgentLog fehlgeschlagen, sichere lokal:', e.message);
      }
    }

    localDbState.agent_logs.push(newLog);
    persistLocalDb();
    return newLog;
  },

  async getAgentLogs(taskId) {
    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('agent_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Trevor DB] Supabase getAgentLogs fehlgeschlagen, suche lokal:', e.message);
      }
    }
    return localDbState.agent_logs.filter(l => l.task_id === taskId);
  },

  // --- USER SETTINGS ---
  async getUserSettings() {
    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('user_settings').select('*').eq('id', 1).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Trevor DB] Supabase getUserSettings fehlgeschlagen, lade lokale Settings:', e.message);
      }
    }
    return localDbState.user_settings;
  },

  async updateUserSettings(newSettings) {
    const patch = { ...newSettings, updated_at: new Date().toISOString() };

    if (!isOfflineFallbackActive && supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from('user_settings').update(patch).eq('id', 1).select().single();
        if (!error && data) {
          localDbState.user_settings = data;
          persistLocalDb();
          return data;
        }
      } catch (e) {
        console.warn('[Trevor DB] Supabase updateUserSettings fehlgeschlagen, sichere lokal:', e.message);
      }
    }

    localDbState.user_settings = { ...localDbState.user_settings, ...patch };
    persistLocalDb();
    return localDbState.user_settings;
  }
};
