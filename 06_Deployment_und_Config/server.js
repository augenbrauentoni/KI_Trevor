/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 06_Deployment_und_Config/server.js
 * 
 * Standalone Web- & API-Server für Trevor:
 * - Benötigt KEINE externen Abhängigkeiten zum Start (nutzt native Node.js Module)
 * - Startet sofort lokal mit: node 06_Deployment_und_Config/server.js oder npm start
 * - Serviert das Dark-Slate/Red 3D Frontend unter http://localhost:3000
 * - Bietet Healthcheck-Routen für Render (/api/status)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

// MIME-Type Mapping
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  // CORS-Header für flexible Dev-Verbindungen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      departments_count: 10,
      total_units: 44, // 1 Trevor + 10 Chefs + 33 PCs
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

  // --- STATISCHE DATEIEN AUSLIEFERN ---
  // Default: Weiterleitung von "/" auf index.html im Frontend-Ordner
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', 'index.html');
  } else if (pathname.startsWith('/02_Frontend_UI_und_3D_Studio/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/03_Agenten_System_und_Prompts/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/00_Checkpoints_und_Status/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else if (pathname.startsWith('/05_Antigravity_Outputs/')) {
    filePath = path.join(ROOT_DIR, pathname);
  } else {
    // Suche primär im Frontend-Ordner
    filePath = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', pathname);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(ROOT_DIR, pathname);
    }
  }

  // Prüfe Existenz der angeforderten Datei
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

server.listen(PORT, () => {
  console.log(`\n=============================================================================`);
  console.log(`🚀 TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER`);
  console.log(`=============================================================================`);
  console.log(`• Web-Studio & 3D Campus:   http://localhost:${PORT}`);
  console.log(`• Healthcheck API:          http://localhost:${PORT}/api/status`);
  console.log(`• Studio-Struktur:          10 Abteilungen | 43 Agenten + Trevor (44 Einheiten)`);
  console.log(`• Status:                   Bereit für Software-Aufträge (Gemini & Ollama)`);
  console.log(`=============================================================================\n`);
});
