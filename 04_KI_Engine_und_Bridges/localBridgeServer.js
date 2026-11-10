// 04_KI_Engine_und_Bridges/localBridgeServer.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.BRIDGE_PORT || 3001;
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
        const payload = JSON.parse(body);
        const taskContent = payload.content || body;

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

  res.writeHead(404, HEADERS);
  res.end(JSON.stringify({ error: 'Endpoint nicht gefunden' }));
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Trevor Local Bridge aktiv auf http://localhost:${PORT}`);
  console.log(` Ziel-Datei: ${OUTPUT_FILE}`);
  console.log(`====================================================`);
});