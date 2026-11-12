/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 06_Deployment_und_Config/server.js
 * 
 * Standalone Web- & API-Server für Trevor:
 * - Serviert das Dark-Slate/Red 3D Frontend & alle Abteilungs-Daten
 * - Unterstützt Bypass-Tunnel-Header für Localtunnel & Ngrok (Unterwegs-Zugriff)
 * - Erkennt lokale WLAN-IPs für sofortigen Smartphone-Zugriff im Netzwerk
 * - REST-APIs für Tasks, Direktanweisungen an Abteilungen, Historie & Freigaben
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import {
  startTask,
  startDepartmentInstruction,
  handleUserDecision,
  getTaskHistory
} from '../04_KI_Engine_und_Bridges/workflowOrchestrator.js';
import { dbBridge } from '../04_KI_Engine_und_Bridges/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalNetworkIp();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { 
      body += chunk; 
      // DoS-Schutz: Maximale Payload-Größe 10 MB
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        resolve({});
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * Maskiert vertrauliche API-Schlüssel für sichere Logs und Error-Payloads
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '[NONE]';
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * Bereinigt Dateinamen für den sicheren Export gegen Directory-Traversal
 */
function sanitizeExportFilename(rawFilename) {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return 'ANTIGRAVITY_TASK.md';
  }
  let base = path.basename(rawFilename.trim());
  let ext = path.extname(base);
  let nameWithoutExt = ext ? base.slice(0, -ext.length) : base;
  let clean = nameWithoutExt.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
  if (!clean || clean === '_') clean = 'ANTIGRAVITY_TASK';
  return `${clean}.md`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  // CORS-Header & Sicherheits-Header (CORS-Hardening)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning');
  res.setHeader('Bypass-Tunnel-Reminder', 'true');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTEN ---
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let checkpointSnapshot = null;
    try {
      const cpFile = path.join(ROOT_DIR, '00_Checkpoints_und_Status', 'active_checkpoint.json');
      if (fs.existsSync(cpFile)) {
        checkpointSnapshot = JSON.parse(fs.readFileSync(cpFile, 'utf-8'));
      }
    } catch { /* ignore */ }

    res.end(JSON.stringify({
      status: 'ok',
      service: 'Trevor AI Software Studio & Command Center',
      version: '2.5.0 (Phase 7 Modern Office Edition)',
      timestamp: new Date().toISOString(),
      departments_count: 10,
      total_units: 44,
      local_wifi_url: `http://${localIp}:${PORT}`,
      current_checkpoint: checkpointSnapshot
    }, null, 2));
    return;
  }

  if (pathname === '/api/hierarchy') {
    const hierarchyFile = path.join(ROOT_DIR, '03_Agenten_System_und_Prompts', 'studio_hierarchy.json');
    if (fs.existsSync(hierarchyFile)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      fs.createReadStream(hierarchyFile).pipe(res);
      return;
    }
  }

  // --- DUAL-ENGINE LLM REST-ENDPUNKTE ---

  // LLM Health & Status Check
  if (pathname === '/api/llm/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let ollamaStatus = { online: false, models: [] };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const ollamaResp = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (ollamaResp.ok) {
        const data = await ollamaResp.json();
        ollamaStatus = { online: true, models: (data.models || []).map(m => m.name) };
      }
    } catch {
      ollamaStatus = { online: false, error: 'Ollama offline oder nicht erreichbar' };
    }

    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      engines: {
        gemini: { available: true, defaultModel: 'gemini-2.5-flash' },
        ollama: ollamaStatus
      }
    }, null, 2));
    return;
  }

  // Dual-Engine Inferenz-Proxy (Gemini Cloud / Ollama Lokal)
  if ((pathname === '/api/llm/query' || pathname === '/api/generate') && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { provider = 'gemini', systemPrompt = '', userPrompt = '', apiKey = '', model, expectJson = false } = body;

      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'userPrompt ist erforderlich und darf nicht leer sein.' }));
        return;
      }

      // Payload-Größenbegrenzung für Inferenz-Prompts (500.000 Zeichen)
      if (userPrompt.length > 500000 || (systemPrompt && systemPrompt.length > 200000)) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Payload zu groß (maximal 500.000 Zeichen erlaubt).' }));
        return;
      }

      // 1. Ollama Lokal Inferenz
      if (provider === 'ollama') {
        const ollamaModel = model || 'qwen2.5-coder:3b';
        const ollamaPayload = {
          model: ollamaModel,
          system: systemPrompt,
          prompt: userPrompt,
          stream: false,
          ...(expectJson ? { format: 'json' } : {})
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        let resp;
        try {
          resp = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ollamaPayload),
            signal: controller.signal
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            provider: 'ollama',
            model: ollamaModel,
            error: 'Ollama-Server ist lokal nicht erreichbar oder hat das Zeitlimit überschritten (Port 11434).'
          }));
          return;
        }
        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`Ollama Inferenz fehlgeschlagen mit Status ${resp.status}`);
        }

        const data = await resp.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          provider: 'ollama',
          model: ollamaModel,
          text: data.response || '',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // 2. Google Gemini Cloud Inferenz
      else {
        const geminiKey = apiKey || process.env.GEMINI_API_KEY || '';
        if (!geminiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Kein Gemini API-Key übergeben oder konfiguriert.' }));
          return;
        }

        const geminiModel = model || 'gemini-2.5-flash';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
        const contents = [];

        const combinedPrompt = systemPrompt
          ? `[SYSTEM ANWEISUNG]\n${systemPrompt}\n\n[USER AUFTRAG]\n${userPrompt}`
          : userPrompt;

        contents.push({
          role: 'user',
          parts: [{ text: combinedPrompt }]
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        let resp;
        try {
          resp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
            signal: controller.signal
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            provider: 'gemini',
            model: geminiModel,
            error: 'Google Gemini API-Aufruf hat das Zeitlimit überschritten (Gateway Timeout).'
          }));
          return;
        }
        clearTimeout(timeoutId);

        if (!resp.ok) {
          const rawErr = await resp.text();
          // API-Key in Fehlerausgaben maskieren
          const sanitizedErr = rawErr.replace(new RegExp(geminiKey, 'g'), maskApiKey(geminiKey));
          throw new Error(`Gemini API Fehler (${resp.status}): ${sanitizedErr.slice(0, 150)}`);
        }

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          provider: 'gemini',
          model: geminiModel,
          text,
          timestamp: new Date().toISOString()
        }));
        return;
      }
    } catch (err) {
      console.error('[Server LLM Router] Fehler:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // --- TASK-ROUTER & HISTORIE ---

  // Aktiven Checkpoint abrufen
  if (pathname === '/api/task/active' && req.method === 'GET') {
    try {
      const cpFile = path.join(ROOT_DIR, '00_Checkpoints_und_Status', 'active_checkpoint.json');
      if (fs.existsSync(cpFile)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        fs.createReadStream(cpFile).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, activeTask: null }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Checkpoint sicher mit Backup speichern
  if (pathname === '/api/task/checkpoint' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const cpDir = path.join(ROOT_DIR, '00_Checkpoints_und_Status');
      const cpFile = path.join(cpDir, 'active_checkpoint.json');
      const cpBackup = path.join(cpDir, 'active_checkpoint.backup.json');

      if (!fs.existsSync(cpDir)) {
        fs.mkdirSync(cpDir, { recursive: true });
      }

      // Vorhandenen Checkpoint vor Überschreiben als Backup sichern
      if (fs.existsSync(cpFile)) {
        try {
          fs.copyFileSync(cpFile, cpBackup);
        } catch { /* ignore backup failure */ }
      }

      fs.writeFileSync(cpFile, JSON.stringify(body, null, 2), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Checkpoint erfolgreich gespeichert.' }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Task-Historie abfragen (mit Status-Filter & strikter Validierung)
  if (pathname === '/api/task/history' && req.method === 'GET') {
    try {
      const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
      const limit = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
      const requestedStatus = url.searchParams.get('status');

      let history = await getTaskHistory(limit);

      if (requestedStatus) {
        history = history.filter(t => {
          if (requestedStatus === 'completed') {
            return t.status === 'approved' || t.status === 'completed';
          }
          return t.status === requestedStatus;
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, tasks: history, limit, total: history.length }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Dedizierter Endpunkt für abgeschlossene Tasks (Task-Historie Klick-Inspektion)
  if (pathname === '/api/task/completed' && req.method === 'GET') {
    try {
      const history = await getTaskHistory(50);
      const completed = history.filter(t => t.status === 'approved' || t.status === 'completed');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: completed.length, tasks: completed }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Master-Optimierungs-Katalog abfragen (OPT-01 bis OPT-08)
  if (pathname === '/api/optimizations' && req.method === 'GET') {
    try {
      const optFile = path.join(ROOT_DIR, '00_Checkpoints_und_Status', 'OPTIMIERUNGEN_UND_NEUERUNGEN.md');
      let markdownContent = '';
      if (fs.existsSync(optFile)) {
        markdownContent = fs.readFileSync(optFile, 'utf-8');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        catalog_version: '1.0',
        master_steps: 4,
        total_optimizations: 8,
        markdown: markdownContent
      }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

// Task-Export-Endpunkt (mit dynamischen Dateinamen & striktem Sandbox-Schutz)
  if (pathname === '/api/export-task' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const taskContent = body.content || '';
      const requestedFilename = body.filename || 'ANTIGRAVITY_TASK.md';
      const safeFilename = sanitizeExportFilename(requestedFilename);
      const outputDir = path.join(ROOT_DIR, '05_Antigravity_Outputs');
      const targetFilePath = path.resolve(outputDir, safeFilename);

      // Strikte Sandbox-Prüfung gegen Directory Traversal (../)
      if (!targetFilePath.startsWith(outputDir) || !targetFilePath.startsWith(ROOT_DIR)) {
        console.warn(`[Server Security] 403 Forbidden: Pfadausbruch bei Export abgewiesen: ${requestedFilename}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: '403 Forbidden: Pfad liegt außerhalb der KI_Trevor Sandbox' }));
        return;
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(targetFilePath, taskContent, 'utf-8');

      // Auch Standard-Master-Datei aktualisieren
      const masterFile = path.join(outputDir, 'ANTIGRAVITY_TASK.md');
      if (targetFilePath !== masterFile) {
        try {
          fs.writeFileSync(masterFile, taskContent, 'utf-8');
        } catch { /* ignore fallback */ }
      }

      console.log(`[Server] Task erfolgreich exportiert nach: ${targetFilePath}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Task erfolgreich gespeichert als ${safeFilename}`,
        path: targetFilePath,
        filename: safeFilename,
        timestamp: new Date().toISOString()
      }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Direkte Abteilungs-Anweisung starten (Bottom-Up)
  if (pathname === '/api/task/department-instruction' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { departmentId, pcId, instruction, targetProject } = body;

      if (!departmentId || !instruction) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'departmentId und instruction erforderlich.' }));
        return;
      }

      const result = await startDepartmentInstruction({
        departmentId: parseInt(departmentId, 10),
        pcId: pcId || null,
        instruction,
        targetProject: targetProject || 'KI_Trevor'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, task: result }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Regulären Studio-Task starten (Top-Down)
  if (pathname === '/api/task/start' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { prompt, projectId } = body;

      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'prompt erforderlich.' }));
        return;
      }

      const result = await startTask(prompt, projectId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, task: result }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Benutzerentscheidung verarbeiten (JA / NEIN mit strikter Validierung)
  if (pathname === '/api/task/decision' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { taskId, decision, feedback } = body;

      if (!taskId || !decision) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'taskId und decision (JA/NEIN) erforderlich.' }));
        return;
      }

      const upperDecision = String(decision).trim().toUpperCase();
      if (upperDecision !== 'JA' && upperDecision !== 'NEIN') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Ungültige Entscheidung. Nur "JA" oder "NEIN" zulässig.' }));
        return;
      }

      const sanitizedFeedback = typeof feedback === 'string' ? feedback.slice(0, 5000).trim() : '';
      const result = await handleUserDecision(taskId, upperDecision, sanitizedFeedback);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        taskId, 
        decision: upperDecision, 
        result,
        timestamp: new Date().toISOString()
      }));
      return;
    } catch (err) {
      console.error('[Server Decision API] Fehler:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Projekt-Liste
  if (pathname === '/api/projects' && req.method === 'GET') {
    try {
      const projects = await dbBridge.getProjects();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, projects }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // --- STATISCHE DATEIEN AUSLIEFERN ---
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', 'index.html');
  } else if (pathname.startsWith('/02_Frontend_UI_und_3D_Studio/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/03_Agenten_System_und_Prompts/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/04_KI_Engine_und_Bridges/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/00_Checkpoints_und_Status/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/05_Antigravity_Outputs/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else {
    filePath = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(ROOT_DIR, pathname);
    }
  }

  // Sandbox-Prüfung gegen Directory Traversal (../)
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Zugriff außerhalb des Projekt-Roots verweigert.');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: Die Datei "${pathname}" existiert nicht.`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=============================================================================`);
  console.log(`  TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER (V2.5.0)`);
  console.log(`=============================================================================`);
  console.log(`  [OK] Lokaler Zugriff:    http://localhost:${PORT}`);
  console.log(`  [OK] Lokales WLAN:       http://${localIp}:${PORT}`);
  console.log(`  [OK] API Status:         http://localhost:${PORT}/api/status`);
  console.log(`  [OK] 10 Abteilungen & 33 Spezial-PCs & Trevor Core bereit`);
  console.log(`=============================================================================\n`);
});
