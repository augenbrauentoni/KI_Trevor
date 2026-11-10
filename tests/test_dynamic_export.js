/**
 * Test für dynamischen Export ausgewählter Schritte
 */
import { buildAntigravityPromptForSteps } from '../02_Frontend_UI_und_3D_Studio/app.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const mockTask = {
  id: 'test-task-dynamic-123',
  user_prompt: 'Baue ein Supabase Auth System mit RBAC',
  checkpoint_data: {
    structured_steps: [
      {
        id: 'STEP-01',
        title: 'Supabase Schema & RLS',
        description: 'Tabellen und Row Level Security für Auth anlegen.',
        target_file: '01_Datenbank_Supabase/schema.sql',
        department: '6. Datenbank & Speicher',
        enabled: true // JA
      },
      {
        id: 'STEP-02',
        title: 'Experimentelle 3D Animation',
        description: 'Optionale 3D Partikel-Animation im Canvas.',
        target_file: '02_Frontend_UI_und_3D_Studio/studio3D.js',
        department: '4. 3D-Campus & Grafiken',
        enabled: false // NEIN (vom Nutzer abgewählt!)
      },
      {
        id: 'STEP-03',
        title: 'Backend JWT Endpunkte',
        description: 'REST Routen zur Token-Validierung.',
        target_file: '06_Deployment_und_Config/server.js',
        department: '5. Server & Hintergrund-Logik (Backend)',
        enabled: true // JA
      }
    ]
  }
};

const selectedSteps = mockTask.checkpoint_data.structured_steps.filter(s => s.enabled);
const promptMarkdown = buildAntigravityPromptForSteps(selectedSteps, mockTask);

console.log('--- Generierter Prompt für ausgewählte Schritte ---');
console.log(promptMarkdown.slice(0, 350) + '...\n');

// Verifiziere: STEP-01 und STEP-03 müssen drin sein, STEP-02 darf NICHT drin sein!
if (!promptMarkdown.includes('STEP-01') || !promptMarkdown.includes('Supabase Schema & RLS')) {
  throw new Error('STEP-01 fehlt im gefilterten Prompt!');
}
if (promptMarkdown.includes('STEP-02') || promptMarkdown.includes('Experimentelle 3D Animation')) {
  throw new Error('STEP-02 (abgewählt mit NEIN) ist fälschlicherweise im Prompt enthalten!');
}
if (!promptMarkdown.includes('STEP-03') || !promptMarkdown.includes('Backend JWT Endpunkte')) {
  throw new Error('STEP-03 fehlt im gefilterten Prompt!');
}

console.log('✔ Nur die mit [JA] aktivierten Schritte (2 von 3) wurden in den Prompt aufgenommen!');

// Teste HTTP-Export an die lokale Bridge auf Port 3001
const resp = await fetch('http://localhost:3001/api/export-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: promptMarkdown })
});

const resData = await resp.json();
console.log('✔ Bridge-Export Status:', resData.success, 'Datei:', resData.path);

const exportedFileContent = fs.readFileSync(path.join(ROOT_DIR, '05_Antigravity_Outputs', 'ANTIGRAVITY_TASK.md'), 'utf-8');
if (!exportedFileContent.includes('FREIGEGEBENE SCHRITTE: 2 von 3')) {
  throw new Error('Dateiinhalt stimmt nicht überein!');
}

console.log('\n=============================================================');
console.log(' DYNAMISCHER EXPORT-TEST ZU 100% ERFOLGREICH BESTANDEN! ✔');
console.log('=============================================================\n');
