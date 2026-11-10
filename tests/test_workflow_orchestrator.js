/**
 * Test für hierarchische Agenten-Orchestrierung & Roadmap-Extraktion
 */
import { WorkflowOrchestrator, orchestrator, extractStructuredPlanSteps } from '../04_KI_Engine_und_Bridges/workflowOrchestrator.js';

console.log('--- Test 1: Instantiierung & Methoden-Präsenz ---');
if (typeof orchestrator.dispatchTask !== 'function') throw new Error('dispatchTask fehlt');
if (typeof orchestrator.executeWorkerTasks !== 'function') throw new Error('executeWorkerTasks fehlt');
if (typeof orchestrator.aggregateDepartmentResults !== 'function') throw new Error('aggregateDepartmentResults fehlt');
if (typeof orchestrator.synthesizeFinalPlan !== 'function') throw new Error('synthesizeFinalPlan fehlt');
console.log('✔ Alle 4 Kernmethoden der Orchestrierungs-Klasse vorhanden.');

console.log('--- Test 2: dispatchTask Ausführung ---');
const subTasks = await orchestrator.dispatchTask('Erstelle eine Supabase Auth-Pipeline mit React UI und 3D Visualisierung');
console.log(`✔ subTasks generiert: ${subTasks.length} Abteilungs-Aufgaben.`);
if (subTasks.length === 0) throw new Error('subTasks leer');

const firstSubTask = subTasks[0];
console.log(`  Erster Task: [${firstSubTask.departmentCode}] ${firstSubTask.departmentName} -> Lead: ${firstSubTask.leadAgent.name}`);
if (!firstSubTask.leadAgent || !firstSubTask.workerAgents) throw new Error('Lead oder Worker fehlen in subTask');

console.log('--- Test 3: extractStructuredPlanSteps Validierung ---');
const sampleAntigravityPrompt = `# ANTIGRAVITY MASTER TASK EXECUTION
### 1. Supabase Schema Definition & RLS Policies
Ziel-Datei: 01_Datenbank_Supabase/schema.sql
Erstelle Tabellen für users, roles und permissions mit Row Level Security.

### 2. Frontend React Dark-Slate Dashboard
Ziel-Datei: 02_Frontend_UI_und_3D_Studio/app.js
Baue die interaktive Benutzeroberfläche und die Event-Handler.

### 3. Server API Authentication Endpoints
Ziel-Datei: 06_Deployment_und_Config/server.js
Richte REST Endpoints für Login, Session Refresh und Logout ein.
`;

const steps = extractStructuredPlanSteps(sampleAntigravityPrompt, {}, 'Sample Prompt');
console.log(`✔ Extrahierte Schritte: ${steps.length}`);
if (steps.length < 3) throw new Error('Nicht genügend Schritte extrahiert');

steps.forEach(s => {
  console.log(`  > [${s.id}] ${s.title} -> Ziel: ${s.target_file} (${s.department}) [Aktiv: ${s.enabled}]`);
  if (!s.id || !s.title || !s.description || !s.target_file || !s.department || s.enabled === undefined) {
    throw new Error(`Schritt unvollständig: ${JSON.stringify(s)}`);
  }
});

console.log('\n=============================================================');
console.log(' ALLE ORCHESTRATOR- & ROADMAP-TESTS ERFOLGREICH BESTANDEN! ✔');
console.log('=============================================================\n');
