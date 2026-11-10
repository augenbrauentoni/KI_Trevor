/**
 * Test Suite: WORKFLOW-EXECUTION FIX (STUFE 1 -> STUFE 2), LIVE-STATUS & JARVIS START-BEGRÜSSUNG
 */
import assert from 'node:assert';
import { safeParseTrevorJSON, detectPrimaryDepartment, getDepartmentByCodeOrId, WorkflowOrchestrator } from './02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js';
import { STUDIO_HIERARCHY } from './02_Frontend_UI_und_3D_Studio/hierarchyData.js';
import { playJarvisWelcomeGreeting } from './02_Frontend_UI_und_3D_Studio/jarvisVoice.js';
import { updateAgentStatus, updateAgentStatusIn3D } from './02_Frontend_UI_und_3D_Studio/studio3D.js';

console.log('--- TEST SUITE: WORKFLOW-EXECUTION & LIVE-STATUS FIX ---');

// Mock browser environment for Node.js
globalThis.SpeechSynthesisUtterance = class {
  constructor(text) {
    this.text = text;
  }
};

let spokenText = null;
let badgeText = null;
let toastTitle = null;

globalThis.window = {
  hasGreetedUser: false,
  initAudioContext: () => {},
  speechSynthesis: {
    speak: (utterance) => { spokenText = utterance.text; },
    getVoices: () => [],
    cancel: () => {}
  },
  updateCheckpointBadge: (text) => { badgeText = text; },
  showActionToast: (title) => { toastTitle = title; }
};

// 1. TEST: J.A.R.V.I.S. Welcome Greeting
console.log('\n[1/5] Testing J.A.R.V.I.S. Welcome Greeting...');

// First call should trigger greeting
playJarvisWelcomeGreeting();
assert.strictEqual(globalThis.window.hasGreetedUser, true, 'hasGreetedUser should be set to true');
assert.ok(badgeText && badgeText.includes('Hallo Sir'), 'Badge should show welcome greeting');
assert.strictEqual(toastTitle, 'J.A.R.V.I.S. bereit', 'Toast should show J.A.R.V.I.S. ready');
assert.ok(spokenText && spokenText.includes('Hallo Sir'), 'Speech synthesis should be called with greeting');

// Second call should NOT re-trigger (once per session)
badgeText = null;
spokenText = null;
playJarvisWelcomeGreeting();
assert.strictEqual(badgeText, null, 'Greeting should only run once per session');
console.log('✔ J.A.R.V.I.S. Welcome Greeting passed cleanly.');

// 2. TEST: safeParseTrevorJSON
console.log('\n[2/5] Testing safeParseTrevorJSON...');

// Test 2a: Valid JSON in markdown code fence
const markdownJson = `Hier ist meine Einschätzung:
\`\`\`json
{
  "needsClarification": false,
  "summary": "Erstelle ein 3D-Büro mit animierten Kameras",
  "executionMode": "FULL_DEPARTMENT",
  "primaryDepartment": "EG_FRONTEND",
  "targetFloor": "EG"
}
\`\`\``;

const parsed1 = safeParseTrevorJSON(markdownJson, "Baue ein 3D Frontend");
assert.strictEqual(parsed1.needsClarification, false);
assert.strictEqual(parsed1.primaryDepartment, 'EG_FRONTEND');
assert.strictEqual(parsed1.summary, 'Erstelle ein 3D-Büro mit animierten Kameras');

// Test 2b: Raw text with NO JSON (Fallback-Garantie: kein Verschlucken des Tasks!)
const rawTextOnly = `Ich erstelle den Express API Endpunkt mit Node.js und Middleware Routing.`;
const parsed2 = safeParseTrevorJSON(rawTextOnly, "Erstelle Express API Route");
assert.strictEqual(parsed2.needsClarification, false, 'Fallback must guarantee needsClarification: false');
assert.strictEqual(parsed2.executionMode, 'FULL_DEPARTMENT');
assert.strictEqual(parsed2.primaryDepartment, 'EG_BACKEND', 'Should detect backend/server/express keywords');
assert.ok(parsed2.summary.includes('Express API Endpunkt'), 'Summary should capture raw text');

// Test 2c: Clarification Needed
const clarifyJson = `{
  "needsClarification": true,
  "clarificationQuestion": "Welchen Port soll der Express-Server nutzen, Sir?"
}`;
const parsed3 = safeParseTrevorJSON(clarifyJson, "Starte Server");
assert.strictEqual(parsed3.needsClarification, true);
assert.strictEqual(parsed3.clarificationQuestion, 'Welchen Port soll der Express-Server nutzen, Sir?');

console.log('✔ safeParseTrevorJSON passed all cases (Markdown, Fallback Guarantee, Clarification).');

// 3. TEST: Department Detection & Routing
console.log('\n[3/5] Testing Department Keyword Routing & Hierarchy Lookup...');
assert.strictEqual(detectPrimaryDepartment('Erstelle 3D Three.js Shader und Button Animationen'), 'EG_FRONTEND');
assert.strictEqual(detectPrimaryDepartment('Optimiere Node.js Express API und Middleware Routen'), 'EG_BACKEND');
assert.strictEqual(detectPrimaryDepartment('Plane Systemarchitektur und Refaktorisierung'), 'EG_ARCHITEKTUR');
assert.strictEqual(detectPrimaryDepartment('Konfiguriere Linux Serverraum Netzwerk Router und Switch'), 'UG_SERVER');

const deptEG = getDepartmentByCodeOrId('EG_FRONTEND', STUDIO_HIERARCHY.departments);
assert.strictEqual(deptEG.id, 3, 'EG_FRONTEND should resolve to department 3 (Optik/Frontend)');

const deptUG = getDepartmentByCodeOrId('UG_SERVER', STUDIO_HIERARCHY.departments);
assert.strictEqual(deptUG.id, 12, 'UG_SERVER should resolve to department 12 (Der Serverraum)');
console.log('✔ Department detection and lookup passed.');

// 4. TEST: Department Busy Tracking & Queue Dispatch
console.log('\n[4/5] Testing Department Busy Tracking & Queue Dispatch...');
const orchestrator = new WorkflowOrchestrator(STUDIO_HIERARCHY);

// Initial state: not busy
assert.strictEqual(orchestrator.isDepartmentBusy(deptEG.id), false);

// Set busy
orchestrator.setDepartmentBusy(deptEG.id, true);
assert.strictEqual(orchestrator.isDepartmentBusy(deptEG.id), true);

// When busy, dispatchTaskToDepartment stays in queue
const statusUpdates = [];
const busyTask = {
  title: 'Test Busy Handling',
  userPrompt: '3D Test Task',
  summary: '3D Task',
  primaryDepartment: 'EG_FRONTEND'
};

const busyResult = await orchestrator.dispatchTaskToDepartment(busyTask, (stage, agent, msg) => {
  statusUpdates.push({ stage, agent, msg });
});

assert.strictEqual(busyResult.isQueued, true);
assert.ok(busyResult.status.includes('ausgelastet'), 'Status should indicate department is busy');
assert.ok(statusUpdates.some(u => u.stage.includes('ausgelastet')), 'Should emit busy status update');

// Free department
orchestrator.setDepartmentBusy(deptEG.id, false);
assert.strictEqual(orchestrator.isDepartmentBusy(deptEG.id), false);
console.log('✔ Department busy-tracking & queue suspension passed.');

// 5. TEST: 3D Agent Status Update & Color Glow
console.log('\n[5/5] Testing 3D Agent Status Update...');

// Test updateAgentStatus with (id, status, message)
updateAgentStatus(101, 'working', 'Bearbeitet: 3D-Büro');
updateAgentStatus(10, 'auditing', 'Prüft Bericht');
updateAgentStatus('Max', 'Aufgabe abgeschlossen');

console.log('✔ 3D Agent status function handled all overloads without errors.');

console.log('\n======================================================');
console.log('ALL 5 TESTS PASSED SUCCESSFULLY! WORKFLOW FIX VERIFIED.');
console.log('======================================================\n');
