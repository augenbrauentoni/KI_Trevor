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

/**
 * Strikte Sandbox-Prüfung: Stellt sicher, dass ein Zielpfad ausnahmslos
 * innerhalb des KI_Trevor Hauptverzeichnisses liegt.
 */
function isPathInsideSandbox(targetPath, rootPath = PROJECT_ROOT) {
  const normTarget = path.resolve(targetPath).toLowerCase();
  const normRoot = path.resolve(rootPath).toLowerCase();
  const rel = path.relative(normRoot, normTarget);
  // Verhindert jedes Ausbrechen aus dem KI_Trevor Root
  return !rel.startsWith('..') && !path.isAbsolute(rel) && (normTarget === normRoot || normTarget.startsWith(normRoot + path.sep));
}

const server = http.createServer((req, res) => {
  // Strikter Sandbox-Schutz vor jeder Routen-Verarbeitung: Pfadausbruch mit '..' blockieren
  if (req.url && (req.url.includes('..') || decodeURIComponent(req.url).includes('..'))) {
    console.warn(`[Bridge Security] 403 Forbidden: Pfadausbruch mit '..' in URL abgewiesen: ${req.url}`);
    res.writeHead(403, HEADERS);
    return res.end(JSON.stringify({ error: '403 Forbidden: Pfad liegt außerhalb der KI_Trevor Sandbox' }));
  }

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

  // =========================================================================
  // ENDPUNKT 1: /api/list-files (SANDBOX DATEI-LISTE FÜR CODE-RAG)
  // =========================================================================
  if (req.method === 'GET' && req.url.startsWith('/api/list-files')) {
    try {
      // 1. Sicherheits-Check gegen URL Traversal
      if (req.url.includes('..')) {
        console.warn(`[Bridge Security] 403 Forbidden: Pfadausbruch mit '..' in URL abgewiesen: ${req.url}`);
        res.writeHead(403, HEADERS);
        return res.end(JSON.stringify({ error: '403 Forbidden: Pfad liegt außerhalb der KI_Trevor Sandbox' }));
      }

      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const folderParam = parsedUrl.searchParams.get('folder');

      if (folderParam) {
        if (folderParam.includes('..')) {
          console.warn(`[Bridge Security] 403 Forbidden: Pfadausbruch im folder-Parameter: ${folderParam}`);
          res.writeHead(403, HEADERS);
          return res.end(JSON.stringify({ error: '403 Forbidden: Pfad liegt außerhalb der KI_Trevor Sandbox' }));
        }
        const resolvedFolder = path.resolve(PROJECT_ROOT, folderParam);
        if (!isPathInsideSandbox(resolvedFolder)) {
          console.warn(`[Bridge Security] 403 Forbidden: Ordner außerhalb der Sandbox: ${folderParam}`);
          res.writeHead(403, HEADERS);
          return res.end(JSON.stringify({ error: '403 Forbidden: Pfad liegt außerhalb der KI_Trevor Sandbox' }));
        }
      }

      // Erlaubt-Ordner & erlaubte Endungen für die RAG-Sandbox
      const ALLOWED_FOLDERS = [
        '02_Frontend_UI_und_3D_Studio',
        '03_Agenten_System_und_Prompts',
        '04_KI_Engine_und_Bridges'
      ];
      const ALLOWED_EXTENSIONS = ['.js', '.html', '.css', '.md'];

      let fileList = [];

      function scanDir(currentDir) {
        if (!fs.existsSync(currentDir)) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const resolved = path.resolve(fullPath);

          // Strikte Sandbox-Prüfung bei jedem einzelnen Element
          if (!isPathInsideSandbox(resolved)) {
            continue;
          }

          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            scanDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ALLOWED_EXTENSIONS.includes(ext)) {
              const relPath = path.relative(PROJECT_ROOT, resolved).replace(/\\/g, '/');
              fileList.push(relPath);
            }
          }
        }
      }

      if (folderParam) {
        const targetDir = path.resolve(PROJECT_ROOT, folderParam);
        scanDir(targetDir);
      } else {
        for (const folder of ALLOWED_FOLDERS) {
          const folderDir = path.resolve(PROJECT_ROOT, folder);
          if (isPathInsideSandbox(folderDir)) {
            scanDir(folderDir);
          }
        }
      }

      fileList.sort();
      console.log(`[Bridge Sandbox] /api/list-files: ${fileList.length} Sandbox-Dateien gelistet.`);

      res.writeHead(200, HEADERS);
      return res.end(JSON.stringify(fileList));
    } catch (err) {
      console.error('[Bridge] Fehler bei /api/list-files:', err);
      res.writeHead(500, HEADERS);
      return res.end(JSON.stringify({ error: err.message }));
    }
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

          // Auflösen und strikte Sicherheitsprüfung gegen Directory-Traversal / Sandbox-Ausbruch
          const targetPath = path.resolve(PROJECT_ROOT, normalized);
          if (!isPathInsideSandbox(targetPath) || normalized.includes('..')) {
            console.warn(`[Bridge Security] 403 Forbidden: Lese-Versuch außerhalb der KI_Trevor Sandbox verweigert: ${filePath}`);
            results.push({
              path: filePath,
              content: null,
              status: 'error: 403 Forbidden (Zugriff außerhalb der KI_Trevor Sandbox verweigert)'
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