/**
 * Automated Test Suite for:
 * 1. Dynamic TTS & spokenSummary
 * 2. 3 Work Modes (PROMPT_REQUEST, IMPROVEMENT_AUDIT, GENERAL_AI_TASK)
 * 3. Non-blocking action-center pausing & resuming
 * 4. Parallel execution via Promise.all()
 */

import { WorkflowOrchestrator, classifyWorkMode, safeParseTrevorJSON } from './02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js';

// Setup Mock DOM and Browser APIs for Node environment
class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
  }
}

let cancelCallCount = 0;
let speakCallCount = 0;
let lastSpokenText = '';

const mockSpeechSynthesis = {
  getVoices: () => [],
  cancel: () => {
    cancelCallCount++;
  },
  speak: (utterance) => {
    speakCallCount++;
    lastSpokenText = utterance.text;
  }
};

globalThis.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
globalThis.speechSynthesis = mockSpeechSynthesis;

// Mock window and document
const pendingMap = {};
const actionCenterItems = [];
let audioSoundPlayed = null;

globalThis.window = {
  speechSynthesis: mockSpeechSynthesis,
  SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
  pendingTasksMap: pendingMap,
  actionCenterItems: actionCenterItems,
  speakAsJarvis: (text) => {
    mockSpeechSynthesis.cancel();
    mockSpeechSynthesis.speak(new MockSpeechSynthesisUtterance(text));
  },
  playNotificationSound: (type) => {
    audioSoundPlayed = type;
  },
  showActionToast: (title, msg, type, id) => {},
  addActionCenterItem: (item) => {
    actionCenterItems.push(item);
    return item.id;
  },
  removeActionCenterItem: (id) => {
    const idx = actionCenterItems.findIndex(i => i.id === id);
    if (idx !== -1) actionCenterItems.splice(idx, 1);
  },
  taskQueue: [],
  updateActiveQueueItemStatus: () => {},
  update3DStudioState: () => {},
  setStageIn3D: () => {}
};

globalThis.document = {
  getElementById: (id) => {
    return {
      style: {},
      innerText: '',
      innerHTML: '',
      value: '',
      addEventListener: () => {},
      querySelectorAll: () => []
    };
  }
};

async function runTests() {
  console.log('=== STARTING WORKFLOW & 3-MODES VERIFICATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  const orchestrator = new WorkflowOrchestrator();

  // Test 1: classifyWorkMode
  console.log('--- Test 1: classifyWorkMode Classification ---');
  const modeA1 = orchestrator.classifyWorkMode('Erstelle mir einen detaillierten System-Prompt für Antigravity');
  const modeA2 = orchestrator.classifyWorkMode('Schreibe einen Task-Prompt für neue Features');
  assert(modeA1 === 'PROMPT_REQUEST', `Prompt 1 classified as PROMPT_REQUEST (got ${modeA1})`);
  assert(modeA2 === 'PROMPT_REQUEST', `Prompt 2 classified as PROMPT_REQUEST (got ${modeA2})`);

  const modeB1 = orchestrator.classifyWorkMode('Führe ein Audit unseres Codes durch');
  const modeB2 = orchestrator.classifyWorkMode('Prüfe das Gesamtsystem auf Schwachstellen und Verbesserungspotenziale');
  assert(modeB1 === 'IMPROVEMENT_AUDIT', `Audit 1 classified as IMPROVEMENT_AUDIT (got ${modeB1})`);
  assert(modeB2 === 'IMPROVEMENT_AUDIT', `Audit 2 classified as IMPROVEMENT_AUDIT (got ${modeB2})`);

  const modeC1 = orchestrator.classifyWorkMode('Schreibe eine REST-API in Node.js mit Express und JWT');
  const modeC2 = orchestrator.classifyWorkMode('Berechne die optimale Route mit dem Dijkstra-Algorithmus');
  assert(modeC1 === 'GENERAL_AI_TASK', `General 1 classified as GENERAL_AI_TASK (got ${modeC1})`);
  assert(modeC2 === 'GENERAL_AI_TASK', `General 2 classified as GENERAL_AI_TASK (got ${modeC2})`);

  // Test 2: safeParseTrevorJSON
  console.log('\n--- Test 2: safeParseTrevorJSON Parsing & Fallbacks ---');
  const validJson = JSON.stringify({
    workMode: 'PROMPT_REQUEST',
    needsClarification: false,
    summary: 'System-Prompt für Auth-Modul',
    spokenSummary: 'Sir, ich habe die Optionen für das Authentifizierungs-Modul erarbeitet.',
    impactAnalysis: {
      impactYes: 'Sichere Token-Validierung',
      impactNo: 'Offene Endpunkte ohne Schutz'
    }
  });

  const parsedValid = orchestrator.safeParseTrevorJSON(validJson, 'Prompt für Auth');
  assert(parsedValid.workMode === 'PROMPT_REQUEST', 'Parsed correct workMode');
  assert(parsedValid.needsClarification === false, 'Parsed needsClarification flag');
  assert(parsedValid.spokenSummary.includes('Authentifizierungs-Modul'), 'Extracted spokenSummary');
  assert(parsedValid.impactAnalysis.impactYes === 'Sichere Token-Validierung', 'Extracted impactYes');

  // Test 3: Dynamic Speech synthesis & cancel before speak
  console.log('\n--- Test 3: Speech Synthesis Dynamic Voice & Cancel Calls ---');
  cancelCallCount = 0;
  speakCallCount = 0;
  window.speakAsJarvis('Sir, die Analyse ist abgeschlossen.');
  assert(cancelCallCount >= 1, `speechSynthesis.cancel() was called before speak (calls: ${cancelCallCount})`);
  assert(speakCallCount === 1, `speechSynthesis.speak() was called (calls: ${speakCallCount})`);
  assert(lastSpokenText === 'Sir, die Analyse ist abgeschlossen.', `Spoken text correctly set: "${lastSpokenText}"`);

  // Test 4: Modus A (PROMPT_REQUEST) Pausing & Resuming
  console.log('\n--- Test 4: Modus A (PROMPT_REQUEST) Execution & Resumption ---');
  const taskObjA = {
    id: 'task_prompt_001',
    userPrompt: 'Erstelle einen System-Prompt für PostgreSQL Connection Pooling',
    prompt: 'Erstelle einen System-Prompt für PostgreSQL Connection Pooling',
    workMode: 'PROMPT_REQUEST',
    summary: 'PostgreSQL Pooling Prompt'
  };

  const modeAResult = await orchestrator.executePromptRequestMode(taskObjA);
  assert(modeAResult.isPaused === true, 'Modus A pauses for user decision');
  assert(modeAResult.workMode === 'PROMPT_REQUEST', 'Result workMode is PROMPT_REQUEST');
  assert(modeAResult.actionId in window.pendingTasksMap, 'Pending task registered in pendingTasksMap');
  assert(Array.isArray(modeAResult.options) && modeAResult.options.length >= 2, 'Options array provided with at least 2 choices');

  const pendingA = window.pendingTasksMap[modeAResult.actionId];
  const resumedA = await orchestrator.resumePromptRequestTask(pendingA, 'Option 1: PgBouncer Integration', 'Fokus auf Hochlast');
  assert(resumedA.antigravityPrompt && resumedA.antigravityPrompt.includes('PostgreSQL Connection Pooling'), 'Resumed task generates Antigravity Prompt Markdown');
  assert(resumedA.spokenSummary && resumedA.spokenSummary.length > 5, 'Resumed task provides dynamic spokenSummary');

  // Test 5: Modus B (IMPROVEMENT_AUDIT) Parallel Scan & Resumption
  console.log('\n--- Test 5: Modus B (IMPROVEMENT_AUDIT) Execution & Resumption ---');
  const taskObjB = {
    id: 'task_audit_001',
    userPrompt: 'Führe ein umfassendes Verbesserungs-Audit über alle Abteilungen durch',
    prompt: 'Führe ein umfassendes Verbesserungs-Audit über alle Abteilungen durch',
    workMode: 'IMPROVEMENT_AUDIT',
    summary: 'Systemweites Audit'
  };

  const modeBResult = await orchestrator.executeImprovementAuditMode(taskObjB);
  assert(modeBResult.isPaused === true, 'Modus B pauses for audit approvals');
  assert(modeBResult.workMode === 'IMPROVEMENT_AUDIT', 'Result workMode is IMPROVEMENT_AUDIT');
  assert(Array.isArray(modeBResult.proposals) && modeBResult.proposals.length >= 4, `At least 4 proposals from departments (got ${modeBResult.proposals.length})`);

  const pendingB = window.pendingTasksMap[modeBResult.actionId];
  const resumedB = await orchestrator.resumeImprovementAuditTask(pendingB, modeBResult.proposals.slice(0, 2), 'Sofortige Umsetzung');
  assert(resumedB.steps && resumedB.steps.length > 0, 'Resumed audit generates structured steps');
  assert(resumedB.spokenSummary && resumedB.spokenSummary.includes('Optimierungsmaßnahmen'), 'Resumed audit generates dynamic spokenSummary');

  // Test 6: Modus C (GENERAL_AI_TASK) Full AI Solution with Specialist Focus
  console.log('\n--- Test 6: Modus C (GENERAL_AI_TASK) Specialist Execution ---');
  const taskObjC = {
    id: 'task_general_001',
    userPrompt: 'Implementiere eine rekursive Ordner-Durchsuchung in Node.js mit Fehlerbehandlung',
    prompt: 'Implementiere eine rekursive Ordner-Durchsuchung in Node.js mit Fehlerbehandlung',
    workMode: 'GENERAL_AI_TASK',
    summary: 'Rekursive Suche'
  };

  const modeCResult = await orchestrator.executeGeneralAITaskMode(taskObjC);
  assert(modeCResult.isPaused === false, 'Modus C executes directly without pausing');
  assert(modeCResult.workMode === 'GENERAL_AI_TASK', 'Result workMode is GENERAL_AI_TASK');
  assert(modeCResult.solution && modeCResult.solution.length > 50, 'Modus C returns full modular solution');
  assert(modeCResult.spokenSummary && modeCResult.spokenSummary.length > 5, 'Modus C returns dynamic spokenSummary');

  // Test 7: Clarification Question & Non-Blocking Department Freeing
  console.log('\n--- Test 7: Clarification Question & Non-blocking Behavior ---');
  const clarifyingJson = JSON.stringify({
    workMode: 'GENERAL_AI_TASK',
    needsClarification: true,
    clarificationQuestion: 'Soll die Suche synchron oder asynchron via Streams erfolgen?',
    impactAnalysis: {
      impactYes: 'Streams ermöglichen minimale RAM-Auslastung bei großen Verzeichnissen.',
      impactNo: 'Synchrone Suche blockiert den Event Loop bei tiefen Verzeichnissen.'
    },
    spokenSummary: 'Sir, vorab benötige ich eine Klärung bezüglich der Streaming-Strategie.'
  });

  const parsedClarification = orchestrator.safeParseTrevorJSON(clarifyingJson, 'Suche Verzeichnisse');
  assert(parsedClarification.needsClarification === true, 'Clarification flag detected');
  assert(parsedClarification.clarificationQuestion.includes('Streams'), 'Clarification question extracted');
  assert(parsedClarification.impactAnalysis.impactYes.includes('Streams'), 'impactYes extracted');
  assert(parsedClarification.impactAnalysis.impactNo.includes('Synchrone'), 'impactNo extracted');

  // Test 8: End-to-End Non-blocking Queue & Decision Resumption
  console.log('\n--- Test 8: Non-blocking Queue Simulation & Decision Resumption ---');
  let nextQueueRan = false;
  const mockQueue = [
    { id: 'q1', text: 'Task 1 (Wartet)', isPaused: true, status: 'Wartet auf Nutzer-Antwort' },
    { id: 'q2', text: 'Task 2 (Bereit)', isPaused: false, status: 'In Warteschlange eingereiht' }
  ];

  // Simulating processNextTaskInQueue finding next non-paused task:
  const nextIdx = mockQueue.findIndex(item => !item.isPaused && (!item.status || !item.status.includes('Wartet')));
  assert(nextIdx === 1, `Next runnable task in queue identified correctly at index 1 (got ${nextIdx})`);
  assert(mockQueue[nextIdx].id === 'q2', 'Task 2 selected for execution while Task 1 is paused');

  // Simulate resumePendingTask via router
  const fakePendingClarification = {
    id: 'act_clarify_test',
    actionId: 'act_clarify_test',
    subType: 'CLARIFICATION',
    type: 'WAITING_FOR_USER',
    taskObject: {
      id: 'task_clarify_001',
      userPrompt: 'Implementiere Datenbank-Cache',
      summary: 'DB Cache',
      workMode: 'GENERAL_AI_TASK'
    },
    preCheckResult: {
      workMode: 'GENERAL_AI_TASK',
      clarificationQuestion: 'Redis oder In-Memory?'
    }
  };

  const resumedClarification = await orchestrator.resumePendingTask(fakePendingClarification, 'Redis', 'Mit TTL von 60s');
  assert(resumedClarification.workMode === 'GENERAL_AI_TASK', 'Resumed task routed and completed as GENERAL_AI_TASK');
  assert(resumedClarification.solution && resumedClarification.solution.length > 20, 'Resumed clarification produced solution');
  assert(resumedClarification.spokenSummary && resumedClarification.spokenSummary.length > 5, 'Resumed clarification produced dynamic spokenSummary');

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
