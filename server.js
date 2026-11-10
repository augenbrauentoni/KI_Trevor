/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: server.js (Root Web Service & Cloud LLM Proxy for Render Deployment)
 * 
 * Node.js Web Service:
 * - Serviert das statische 3D Studio Frontend (02_Frontend_UI_und_3D_Studio)
 * - Sicherer Backend Cloud-LLM Proxy (/api/cloud-llm) für Gemini & Copilot
 * - Keine API-Keys im Client/Browser: Secrets verbleiben strikt in process.env
 * - Integrierte Code-RAG Endpunkte (/api/list-files, /api/read-files)
 * - Dynamischer Task-Export (/api/export-task) mit Sandbox-Absicherung
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio');
const OUTPUT_DIR = path.join(ROOT_DIR, '05_Antigravity_Outputs');

// Sicherstellen, dass Ausgabeverzeichnis existiert
if (!fs.existsSync(OUTPUT_DIR)) {
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch {}
}

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Client Initialisierung (Cloud-Gedächtnis)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[Supabase] Client erfolgreich initialisiert mit SUPABASE_URL.');
  } catch (err) {
    console.warn('[Supabase] Initialisierungsfehler:', err.message);
  }
} else {
  console.log('[Supabase] SUPABASE_URL oder SUPABASE_ANON_KEY nicht gesetzt. Lokales In-Memory-Gedächtnis aktiv.');
}

// In-Memory Speicher als robuster Ausfallschutz & Seed-Gedächtnis
const inMemoryStore = [
  {
    id: 'seed_mem_1',
    department: 'EG_BACKEND',
    topic: 'Sichere Umgebungsvariablen',
    tags: ['nodejs', 'security', 'dotenv'],
    problem_statement: 'API-Keys waren im Frontend-Code ungeschützt sichtbar.',
    solution_pattern: 'Auslagerung der Fetch-Calls in einen Node.js Proxy.',
    reusable_code_snippet: 'const apiKey = process.env.GEMINI_API_KEY;',
    created_at: new Date().toISOString()
  },
  {
    id: 'seed_mem_2',
    department: 'EG_FRONTEND',
    topic: 'Three.js Render-Loop Stabilität',
    tags: ['threejs', 'webgl', 'performance', 'lerp'],
    problem_statement: 'Kamera-Sprünge führten zu Frame-Drops und inkonsistenten Animationen.',
    solution_pattern: 'Verwendung von camera.position.lerp() innerhalb der animate()-Schleife ohne externe Bibliotheken.',
    reusable_code_snippet: 'camera.position.lerp(targetCameraPosition, 0.08);',
    created_at: new Date().toISOString()
  },
  {
    id: 'seed_mem_3',
    department: 'EG_DATENBANK',
    topic: 'Supabase RLS-Richtlinien & Multi-Tenant Isolation',
    tags: ['supabase', 'sql', 'rls', 'security'],
    problem_statement: 'Direkter Datenbankzugriff ohne Autorisierungsprüfung gefährdet Mandanten-Daten.',
    solution_pattern: 'Aktivierung von ROW LEVEL SECURITY mit strikten Policies für auth.uid().',
    reusable_code_snippet: 'CREATE POLICY "Users access own rows" ON tasks FOR ALL USING (auth.uid() = user_id);',
    created_at: new Date().toISOString()
  }
];

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Statische Dateien aus 02_Frontend_UI_und_3D_Studio bereitstellen
app.use(express.static(FRONTEND_DIR));

/**
 * Strikte Sandbox-Prüfung: Stellt sicher, dass ein Zielpfad ausnahmslos
 * innerhalb des Basis-Verzeichnisses liegt.
 */
function isPathInsideSandbox(targetPath, baseDir = ROOT_DIR) {
  const normTarget = path.resolve(targetPath).toLowerCase();
  const normBase = path.resolve(baseDir).toLowerCase();
  const rel = path.relative(normBase, normTarget);
  return !rel.startsWith('..') && !path.isAbsolute(rel) && (normTarget === normBase || normTarget.startsWith(normBase + path.sep));
}

/**
 * Bereinigt Dateinamen für den Export (.md Zwang, keine Traversal-Zeichen)
 */
function sanitizeExportFilename(rawFilename) {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return `ANTIGRAVITY_TASK_${Date.now().toString().slice(-6)}.md`;
  }
  const baseOnly = path.basename(rawFilename);
  const withoutExt = baseOnly.replace(/\.[^/.]+$/, '');
  const cleanCore = withoutExt.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').trim();
  const validCore = cleanCore.length > 0 ? cleanCore : 'ANTIGRAVITY_TASK';
  return `${validCore}.md`;
}

// =============================================================================
// 1. CLOUD-LLM PROXY ENDPUNKT (/api/cloud-llm) - GOOGLE GEMINI MIT SECURE KEY
// =============================================================================
app.post('/api/cloud-llm', async (req, res) => {
  try {
    const { provider = 'gemini', prompt = '', systemInstruction = '', model, expectJson = false } = req.body || {};

    if (!prompt && !systemInstruction) {
      return res.status(400).json({ error: 'Kein Prompt oder SystemInstruction übergeben.' });
    }

    const prov = String(provider).toLowerCase();

    if (prov === 'ollama') {
      return res.status(400).json({
        error: 'Ollama läuft lokal auf dem Rechner des Benutzers (http://localhost:11434) und erfordert keinen Cloud-Proxy.'
      });
    }

    // Google Gemini API Proxy mit Backend-Secret
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length < 10) {
      console.warn('[Cloud LLM Proxy] GEMINI_API_KEY nicht in Umgebungsvariablen gesetzt.');
      return res.status(500).json({
        error: 'GEMINI_API_KEY nicht im Server-Environment hinterlegt. Bitte Secret auf Render setzen.',
        missingKey: true
      });
    }

    const targetModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (expectJson) {
      payload.generationConfig = {
        responseMimeType: 'application/json',
        temperature: 0.2
      };
    } else {
      payload.generationConfig = {
        temperature: 0.3
      };
    }

    const fetchRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      console.error(`[Cloud LLM Proxy] Gemini API HTTP-Fehler (${fetchRes.status}):`, errText);
      return res.status(fetchRes.status).json({
        error: `Gemini API Fehler (${fetchRes.status})`,
        details: errText
      });
    }

    const data = await fetchRes.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({
      success: true,
      provider: 'gemini',
      model: targetModel,
      text: textOutput,
      response: textOutput
    });

  } catch (err) {
    console.error('[Cloud LLM Proxy] Schwerwiegender Inferenzfehler:', err);
    return res.status(500).json({ error: 'Interner Cloud-Proxy Fehler', message: err.message });
  }
});

// =============================================================================
// 2. STATUS & HEALTH ENDPUNKT
// =============================================================================
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'Trevor AI Software Studio & Multi-Agent Command Center',
    version: '2.6.0',
    mode: 'node-web-service',
    cloudProxy: true,
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10),
    supabaseConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
    memoryItemsCount: inMemoryStore.length
  });
});

// =============================================================================
// 3. CODE-RAG DATEIEN LISTEN (/api/list-files)
// =============================================================================
app.get('/api/list-files', (req, res) => {
  try {
    const ALLOWED_FOLDERS = [
      '02_Frontend_UI_und_3D_Studio',
      '03_Agenten_System_und_Prompts',
      '04_KI_Engine_und_Bridges'
    ];
    const ALLOWED_EXTENSIONS = ['.js', '.html', '.css', '.md'];
    const fileList = [];

    function scanDir(currentDir) {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const resolved = path.resolve(fullPath);
        if (!isPathInsideSandbox(resolved)) continue;

        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ALLOWED_EXTENSIONS.includes(ext)) {
            const relPath = path.relative(ROOT_DIR, resolved).replace(/\\/g, '/');
            fileList.push(relPath);
          }
        }
      }
    }

    ALLOWED_FOLDERS.forEach(folder => {
      const folderPath = path.resolve(ROOT_DIR, folder);
      if (isPathInsideSandbox(folderPath) && fs.existsSync(folderPath)) {
        scanDir(folderPath);
      }
    });

    fileList.sort();
    return res.json(fileList);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Durchsuchen der Sandbox: ' + err.message });
  }
});

// =============================================================================
// 4. CODE-RAG DATEIEN LESEN (/api/read-files)
// =============================================================================
app.post('/api/read-files', (req, res) => {
  try {
    const { files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Ungültige Anfrage: "files" muss ein nicht-leeres Array von Dateipfaden sein.' });
    }

    const results = [];
    for (const relPath of files) {
      if (typeof relPath !== 'string') continue;
      if (relPath.includes('..')) {
        results.push({ path: relPath, content: null, status: '403 Forbidden: Pfad-Ausbruch mit ".." blockiert' });
        continue;
      }
      const absoluteTarget = path.resolve(ROOT_DIR, relPath);
      if (!isPathInsideSandbox(absoluteTarget, ROOT_DIR)) {
        results.push({ path: relPath, content: null, status: '403 Forbidden: Pfad außerhalb der Projekt-Sandbox' });
        continue;
      }

      if (fs.existsSync(absoluteTarget) && fs.statSync(absoluteTarget).isFile()) {
        try {
          const content = fs.readFileSync(absoluteTarget, 'utf-8');
          results.push({ path: relPath, content, status: 'ok' });
        } catch (readErr) {
          results.push({ path: relPath, content: null, status: `Lesefehler: ${readErr.message}` });
        }
      } else {
        results.push({ path: relPath, content: null, status: 'nicht gefunden' });
      }
    }

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Lesen der Dateien: ' + err.message });
  }
});

// =============================================================================
// 5. TASK-EXPORT (/api/export-task)
// =============================================================================
app.post('/api/export-task', (req, res) => {
  try {
    const { content, filename } = req.body || {};
    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Fehlendes Pflichtfeld: "content"' });
    }

    const cleanFilename = sanitizeExportFilename(filename);
    const targetFilePath = path.resolve(OUTPUT_DIR, cleanFilename);

    if (!isPathInsideSandbox(targetFilePath, ROOT_DIR) || !targetFilePath.toLowerCase().startsWith(path.resolve(OUTPUT_DIR).toLowerCase())) {
      return res.status(403).json({ error: '403 Forbidden: Pfadausbruch blockiert' });
    }

    fs.writeFileSync(targetFilePath, String(content), 'utf-8');
    console.log(`[Export] Task erfolgreich gespeichert: ${cleanFilename}`);

    return res.json({
      success: true,
      message: `Task erfolgreich in 05_Antigravity_Outputs gespeichert als ${cleanFilename}`,
      path: targetFilePath,
      filePath: targetFilePath,
      filename: cleanFilename,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 6. CLOUD-GEDÄCHTNIS: SPEICHERN (/api/memory/save)
// =============================================================================
app.post('/api/memory/save', async (req, res) => {
  try {
    const rawData = req.body || {};
    const item = rawData.memory || rawData;

    if (!item || typeof item !== 'object') {
      return res.status(400).json({ error: 'Ungültiger Request-Body: JSON-Objekt erwartet.' });
    }

    const tags = Array.isArray(item.tags)
      ? item.tags
      : (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : []);

    const memoryRecord = {
      department: String(item.department || 'EG_ALLGEMEIN').trim(),
      topic: String(item.topic || 'Allgemeine Erkenntnis').trim(),
      tags: tags,
      problem_statement: String(item.problem_statement || '').trim(),
      solution_pattern: String(item.solution_pattern || '').trim(),
      reusable_code_snippet: String(item.reusable_code_snippet || '').trim(),
      created_at: new Date().toISOString()
    };

    // Stets im lokalen In-Memory-Speicher ablegen (Ausfallsicherheit & Sofort-Cache)
    inMemoryStore.unshift({ ...memoryRecord, id: 'mem_' + Date.now() });
    if (inMemoryStore.length > 200) inMemoryStore.pop();

    // In Supabase persistieren, falls Client konfiguriert ist
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('trevor_memory')
          .insert([memoryRecord])
          .select();

        if (error) {
          console.warn('[Supabase Memory] Fehler beim Insert in trevor_memory:', error.message);
          return res.status(200).json({
            success: true,
            storage: 'in_memory_fallback',
            warning: error.message,
            saved: memoryRecord
          });
        }

        console.log(`[Supabase Memory] Erfolgreich gespeichert: "${memoryRecord.topic}" (${memoryRecord.department})`);
        return res.json({
          success: true,
          storage: 'supabase',
          data: data?.[0] || memoryRecord
        });
      } catch (dbErr) {
        console.warn('[Supabase Memory] Exception beim Speichern:', dbErr.message);
        return res.status(200).json({
          success: true,
          storage: 'in_memory_fallback',
          warning: dbErr.message,
          saved: memoryRecord
        });
      }
    } else {
      console.log(`[In-Memory Memory] Gespeichert: "${memoryRecord.topic}" (${memoryRecord.department})`);
      return res.json({
        success: true,
        storage: 'in_memory',
        message: 'SUPABASE_URL/SUPABASE_ANON_KEY nicht gesetzt. In-Memory gespeichert.',
        saved: memoryRecord
      });
    }
  } catch (err) {
    console.error('[Memory Save] Schwerwiegender Fehler:', err);
    return res.status(500).json({ error: 'Fehler beim Speichern im Cloud-Gedächtnis: ' + err.message });
  }
});

// =============================================================================
// 7. CLOUD-GEDÄCHTNIS: DURCHSUCHEN (/api/memory/search)
// =============================================================================
const handleMemorySearch = async (req, res) => {
  try {
    const rawQ = req.body?.q || req.query?.q || req.body?.query || '';
    const q = String(rawQ).trim();

    // 1. Suche via Supabase falls Client verfügbar
    if (supabase) {
      try {
        let query = supabase.from('trevor_memory').select('*');
        if (q) {
          const words = q.split(/\s+/).map(w => w.replace(/[%_,()]/g, '').trim()).filter(w => w.length > 2);
          if (words.length > 0) {
            const filterConditions = words.slice(0, 3).map(w => 
              `topic.ilike.%${w}%,problem_statement.ilike.%${w}%,solution_pattern.ilike.%${w}%,department.ilike.%${w}%`
            ).join(',');
            query = query.or(filterConditions);
          }
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(3);
        if (!error && Array.isArray(data) && data.length > 0) {
          return res.json({
            success: true,
            storage: 'supabase',
            query: q,
            count: data.length,
            results: data
          });
        }
      } catch (err) {
        console.warn('[Supabase Memory Search] Fehler bei Supabase-Abfrage:', err.message);
      }
    }

    // 2. In-Memory Suche (Fallback & Standard bei lokalem Modus)
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let matchedResults = [];

    if (words.length === 0) {
      matchedResults = inMemoryStore.slice(0, 3);
    } else {
      const scored = inMemoryStore.map(item => {
        let score = 0;
        const textToSearch = [
          item.topic,
          item.problem_statement,
          item.solution_pattern,
          item.department,
          ...(Array.isArray(item.tags) ? item.tags : [])
        ].join(' ').toLowerCase();

        for (const w of words) {
          if (textToSearch.includes(w)) score += 2;
        }
        return { item, score };
      });

      matchedResults = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.item)
        .slice(0, 3);

      if (matchedResults.length === 0 && inMemoryStore.length > 0) {
        matchedResults = inMemoryStore.slice(0, 3);
      }
    }

    return res.json({
      success: true,
      storage: supabase ? 'in_memory_fallback' : 'in_memory',
      query: q,
      count: matchedResults.length,
      results: matchedResults
    });
  } catch (err) {
    console.error('[Memory Search] Fehler bei der Suche:', err);
    return res.status(500).json({ error: 'Fehler bei der Suche im Cloud-Gedächtnis: ' + err.message });
  }
};

app.post('/api/memory/search', handleMemorySearch);
app.get('/api/memory/search', handleMemorySearch);

// Fallback für alle anderen Routen -> index.html (SPA Fallback)
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log('=============================================================================');
  console.log(` TREVOR AI SOFTWARE STUDIO – CLOUD NODE.JS WEB SERVICE (PORT ${PORT})`);
  console.log('=============================================================================');
  console.log(` [OK] Statisches Frontend: ${FRONTEND_DIR}`);
  console.log(` [OK] Cloud LLM Proxy:    POST http://localhost:${PORT}/api/cloud-llm`);
  console.log(` [OK] Gemini API-Key:     ${process.env.GEMINI_API_KEY ? '✔ Konfiguriert' : '❌ Nicht gesetzt'}`);
  console.log('=============================================================================');
});
