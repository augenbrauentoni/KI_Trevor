// 04_KI_Engine_und_Bridges/localBridgeServer.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.BRIDGE_PORT || 3001;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(__dirname, '../05_Antigravity_Outputs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'ANTIGRAVITY_TASK.md');

// CORS-Header, damit Render/Localhost Anfragen senden dürfen
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Preflight-Anfragen behandeln
  if (req.method === 'OPTIONS') {
    res.writeHead(204, HEADERS);
    return res.end();
  }

  // Health-Check / Status abfragen
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, HEADERS);
    return res.end(JSON.stringify({ status: 'online', targetPath: OUTPUT_FILE }));
  }

  // Export-Endpunkt: Nimmt Prompt-Text entgegen und speichert Datei
  if (req.method === 'POST' && req.url === '/api/export-task') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        let taskContent = '';
        if (body.trim().startsWith('{')) {
          try {
            const payload = JSON.parse(body);
            taskContent = payload.content || body;
          } catch {
            taskContent = body;
          }
        } else {
          taskContent = body;
        }

        // Ordner sicherstellen
        if (!fs.existsSync(OUTPUT_DIR)) {
          fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Markdown-Datei auf Festplatte schreiben
        fs.writeFileSync(OUTPUT_FILE, taskContent, 'utf-8');

        console.log(`[Bridge] Task erfolgreich gespeichert: ${OUTPUT_FILE}`);
        res.writeHead(200, HEADERS);
        return res.end(JSON.stringify({
          success: true,
          message: 'Task erfolgreich in 05_Antigravity_Outputs gespeichert',
          path: OUTPUT_FILE,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[Bridge] Fehler beim Verarbeiten:', err);
        res.writeHead(500, HEADERS);
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Lese-Endpunkt (Code-RAG): Liest Quellcodedateien ausgehend vom Projekt-Root
  if (req.method === 'POST' && req.url === '/api/read-files') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        let requestedFiles = [];
        if (body.trim().startsWith('{')) {
          try {
            const payload = JSON.parse(body);
            requestedFiles = Array.isArray(payload.files) ? payload.files : [];
          } catch {
            requestedFiles = [];
          }
        } else if (body.trim().startsWith('[')) {
          try {
            requestedFiles = JSON.parse(body);
          } catch {
            requestedFiles = [];
          }
        }

        const results = [];

        for (const filePath of requestedFiles) {
          if (!filePath || typeof filePath !== 'string') continue;

          let normalized = filePath.replace(/\\/g, '/').trim();
          if (normalized.startsWith('./')) normalized = normalized.slice(2);
          if (normalized.startsWith('/')) normalized = normalized.slice(1);
          if (normalized.startsWith('KI_Trevor/')) normalized = normalized.slice('KI_Trevor/'.length);
          if (normalized.startsWith('Desktop/KI_Trevor/')) normalized = normalized.slice('Desktop/KI_Trevor/'.length);

          // Auflösen und Sicherheitsprüfung gegen Directory-Traversal
          const targetPath = path.resolve(PROJECT_ROOT, normalized);
          if (!targetPath.startsWith(PROJECT_ROOT)) {
            results.push({
              path: filePath,
              content: null,
              status: 'nicht gefunden'
            });
            continue;
          }

          try {
            if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
              const fileContent = fs.readFileSync(targetPath, 'utf-8');
              results.push({
                path: filePath,
                content: fileContent,
                status: 'ok'
              });
              console.log(`[Bridge Code-RAG] Datei gelesen: ${filePath} (${fileContent.length} Zeichen)`);
            } else {
              results.push({
                path: filePath,
                content: null,
                status: 'nicht gefunden'
              });
              console.log(`[Bridge Code-RAG] Datei nicht gefunden: ${filePath}`);
            }
          } catch (fileErr) {
            results.push({
              path: filePath,
              content: null,
              status: 'nicht gefunden'
            });
            console.warn(`[Bridge Code-RAG] Lesefehler bei ${filePath}:`, fileErr.message);
          }
        }

        res.writeHead(200, HEADERS);
        return res.end(JSON.stringify(results));
      } catch (err) {
        console.error('[Bridge] Fehler beim Verarbeiten von /api/read-files:', err);
        res.writeHead(500, HEADERS);
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, HEADERS);
  res.end(JSON.stringify({ error: 'Endpoint nicht gefunden' }));
});

server.on('error', (err) => {
  console.error('[Bridge] Serverfehler:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[Bridge] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Bridge] Unhandled Rejection:', reason);
});

// Heartbeat hält den Node Event Loop dauerhaft aktiv
setInterval(() => {}, 1000 * 60 * 30);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Trevor Local Bridge aktiv auf http://localhost:${PORT}`);
  console.log(` Ziel-Datei: ${OUTPUT_FILE}`);
  console.log(`====================================================`);
});