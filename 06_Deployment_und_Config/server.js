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
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  // CORS-Header & Tunnel-Bypass für mobiles Arbeiten von unterwegs
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning');
  res.setHeader('Bypass-Tunnel-Reminder', 'true');
  res.setHeader('ngrok-skip-browser-warning', 'true');

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
  if (pathname === '/api/llm/query' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { provider = 'gemini', systemPrompt = '', userPrompt = '', apiKey = '', model, expectJson = false } = body;

      if (!userPrompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'userPrompt erforderlich.' }));
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
        const resp = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ollamaPayload),
          signal: controller.signal
        });
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
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Gemini API Fehler (${resp.status}): ${errText.slice(0, 150)}`);
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

  // Checkpoint sicher speichern
  if (pathname === '/api/task/checkpoint' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const cpFile = path.join(ROOT_DIR, '00_Checkpoints_und_Status', 'active_checkpoint.json');
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

  // Task-Historie abfragen (mit strikter Parameter-Validierung)
  if (pathname === '/api/task/history' && req.method === 'GET') {
    try {
      const rawLimit = parseInt(url.searchParams.get('limit') || '20', 10);
      const limit = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
      const history = await getTaskHistory(limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, tasks: history, limit }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // Task-Export-Endpunkt (schreibt direkt in 05_Antigravity_Outputs/ANTIGRAVITY_TASK.md)
  if (pathname === '/api/export-task' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const taskContent = body.content || '';
      const outputDir = path.join(ROOT_DIR, '05_Antigravity_Outputs');
      const outputFile = path.join(outputDir, 'ANTIGRAVITY_TASK.md');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputFile, taskContent, 'utf-8');
      console.log(`[Server] Task erfolgreich exportiert nach: ${outputFile}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Task erfolgreich in 05_Antigravity_Outputs gespeichert',
        path: outputFile,
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

  // Benutzerentscheidung verarbeiten (JA / NEIN)
  if (pathname === '/api/task/decision' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { taskId, decision, feedback } = body;

      if (!taskId || !decision) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'taskId und decision (JA/NEIN) erforderlich.' }));
        return;
      }

      const result = await handleUserDecision(taskId, decision, feedback || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, result }));
      return;
    } catch (err) {
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
