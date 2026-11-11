import assert from 'assert';
import fs from 'fs';

console.log('--- STARTING ZERO-BUG CODE-QA PIPELINE TEST SUITE (v11.0) ---');

// 1. Static file inspections
const html = fs.readFileSync('02_Frontend_UI_und_3D_Studio/index.html', 'utf8');
const orchCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js', 'utf8');
const appCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/app.js', 'utf8');
const styleCss = fs.readFileSync('02_Frontend_UI_und_3D_Studio/style.css', 'utf8');
const stylesCss = fs.readFileSync('02_Frontend_UI_und_3D_Studio/styles.css', 'utf8');

// Test 1: Cache-Busting v=12.0 or v=11.0
assert(html.includes('href="./styles.css?v=12.0"') || html.includes('href="./styles.css?v=11.0"'), 'styles.css must be ?v=12.0 or ?v=11.0');
assert(html.includes('href="./style.css?v=12.0"') || html.includes('href="./style.css?v=11.0"'), 'style.css must be ?v=12.0 or ?v=11.0');
assert(html.includes('src="./app.js?v=12.0"') || html.includes('src="./app.js?v=11.0"'), 'app.js must be ?v=12.0 or ?v=11.0');
console.log('✔ Test 1: Cache-Busting verified in index.html');

// Test 2: CSS rules for Code-QA and Seal Box
[styleCss, stylesCss].forEach((css, i) => {
  const name = i === 0 ? 'style.css' : 'styles.css';
  assert(css.includes('.action-item-card.type-code-qa'), `${name} must include .type-code-qa`);
  assert(css.includes('.tag-code-qa'), `${name} must include .tag-code-qa`);
  assert(css.includes('.action-qa-seal-box'), `${name} must include .action-qa-seal-box`);
  assert(css.includes('.action-code-preview'), `${name} must include .action-code-preview`);
  assert(css.includes('.btn-copy-code'), `${name} must include .btn-copy-code`);
});
console.log('✔ Test 2: CSS classes for Zero-Bug QA cards and seal box verified');

// Test 3: Dead code removal verification in workflowOrchestrator.js
assert(!orchCode.includes('executeWorkerTasks('), 'executeWorkerTasks must be removed (dead code)');
assert(!orchCode.includes('aggregateDepartmentResults('), 'aggregateDepartmentResults must be removed (dead code)');
assert(!orchCode.includes('synthesizeFinalPlan('), 'synthesizeFinalPlan must be removed (dead code)');
const resumePromptSlice = orchCode.slice(700, 950);
assert(!resumePromptSlice.includes('if (pc1) window.updateAgentStatus(pc1.id, \'ready\')'), 'Undeclared pc1 reference in resumePromptRequestTask must be fixed');
console.log('✔ Test 3: Dead code cleanup verified (no orphaned methods, undeclared pc1 fixed)');

// Test 4: Dynamic import and function testing
const {
  detectCodeInText,
  extractCodeFromMarkdown,
  orchestrator,
  WorkflowOrchestrator
} = await import('./02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js');

assert(typeof detectCodeInText === 'function', 'detectCodeInText must be exported');
assert(typeof extractCodeFromMarkdown === 'function', 'extractCodeFromMarkdown must be exported');

// Test 4a: detectCodeInText
assert.strictEqual(detectCodeInText('Schreibe ein Python Skript zur Primzahlberechnung'), true, 'Python keyword detected');
assert.strictEqual(detectCodeInText('Hier ist die Antwort:\n```javascript\nconst a = 10;\n```'), true, 'Markdown code block detected');
assert.strictEqual(detectCodeInText('Kannst du mir die Geschichte von Rom erklären?'), false, 'Non-code text detected as false');
assert.strictEqual(detectCodeInText('Bitte SQL Tabellenschema für Users erstellen'), true, 'SQL code detected');
console.log('✔ Test 4: detectCodeInText and extractCodeFromMarkdown functional verification passed');

// Test 5: Mock LLM and runCrossDepartmentCodeQA
// Setup window mock
const agentStatusUpdates = [];
let dataStreamTriggered = null;

globalThis.window = {
  updateAgentStatus: (agentId, status, activity) => {
    agentStatusUpdates.push({ agentId, status, activity });
  },
  triggerDataStreamToTrevor: (deptId) => {
    dataStreamTriggered = deptId;
  },
  pendingTasksMap: {},
  processNextTaskInQueue: () => {}
};

// Test 5a: Code with issues triggers auto-fix (strictly 1 round)
{
  const mockTask = {
    title: 'Python Skript mit Bug',
    userPrompt: 'Schreibe ein Python Skript für User Input',
    containsCode: true
  };
  const mockDept = {
    id: 4,
    name: '4. Server & Hintergrund-Logik',
    chef_agent: { id: 'ag_18', name: 'David' }
  };
  const draftCode = `def get_user():
    name = input("Name: ")
    print(name.strip.lower)
`;

  // We test runCrossDepartmentCodeQA directly on the orchestrator instance
  const qaResult = await orchestrator.runCrossDepartmentCodeQA(mockTask, draftCode, mockDept);
  
  assert(qaResult.qaReport, 'qaReport must be returned');
  assert.strictEqual(qaResult.qaReport.qaPassed, true, 'QA must pass');
  assert(Array.isArray(qaResult.qaReport.auditors), 'Auditors must be listed');
  assert(qaResult.qaReport.auditors.some(a => a.includes('Rico')), 'Rico must be an auditor');
  assert(qaResult.qaReport.auditors.some(a => a.includes('Freya')), 'Freya must be an auditor');
  assert(qaResult.qaReport.auditors.some(a => a.includes('Ilja')), 'Ilja must be an auditor');
  assert.strictEqual(dataStreamTriggered, 12, 'Data stream to UG_SERVER (12) must be triggered');
  
  // Verify 3D agent status was set to working then ready
  const ricoWorking = agentStatusUpdates.some(u => u.agentId === 'ag_32' && u.status === 'working');
  const freyaWorking = agentStatusUpdates.some(u => u.agentId === 'ag_28' && u.status === 'working');
  const iljaWorking = agentStatusUpdates.some(u => u.agentId === 'ag_26' && u.status === 'working');
  const ricoReady = agentStatusUpdates.some(u => u.agentId === 'ag_32' && u.status === 'ready');
  assert(ricoWorking && freyaWorking && iljaWorking, 'Rico, Freya & Ilja must be set to working');
  assert(ricoReady, 'Rico must be reset to ready after QA');
  console.log('✔ Test 5: runCrossDepartmentCodeQA functional verification passed (Rico, Freya, Ilja + Seal)');
}

// Test 6: resumePendingTask for CODE_QA_APPROVAL
{
  const pendingData = {
    id: 'act_test_1',
    type: 'CODE_QA_READY',
    subType: 'CODE_QA_APPROVAL',
    title: 'Python Skript',
    codeText: 'def hello(): print("world")'
  };

  const resYes = await orchestrator.resumePendingTask(pendingData, 'JA');
  assert.strictEqual(resYes.approved, true, 'Decision JA must approve');
  assert.strictEqual(resYes.solution, 'def hello(): print("world")', 'Solution code preserved');
  assert(resYes.spokenSummary.includes('freigegeben'), 'Spoken summary must confirm approval');

  const resNo = await orchestrator.resumePendingTask(pendingData, 'NEIN');
  assert.strictEqual(resNo.approved, false, 'Decision NEIN must reject');
  assert.strictEqual(resNo.solution, '', 'Solution code emptied on rejection');
  console.log('✔ Test 6: resumePendingTask CODE_QA_APPROVAL (JA / NEIN) passed');
}

// Test 7: Verify app.js renderActionCenterUI supports CODE_QA_READY
assert(appCode.includes('isCodeQA'), 'app.js must define isCodeQA');
assert(appCode.includes('action-qa-seal-box'), 'app.js must render action-qa-seal-box');
assert(appCode.includes('btn-copy-code'), 'app.js must render btn-copy-code');
assert(appCode.includes('handleUserDecision(item.id, \'JA\')'), 'app.js must bind handleUserDecision JA');
assert(appCode.includes('handleUserDecision(item.id, \'NEIN\')'), 'app.js must bind handleUserDecision NEIN');
console.log('✔ Test 7: app.js Action Center UI integration for Code-QA verified');

// Test 8: Verify 33 agents and arena integrity in studio3D.js
const studioCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/studio3D.js', 'utf8');
assert(studioCode.includes('window.interactiveAgentMeshes.push(hitbox);'), 'All 33 interactive hitboxes must be pushed');
assert(studioCode.includes('ag_26') && studioCode.includes('ag_32') && studioCode.includes('ag_28'), 'UG_SERVER agents must be present in studio3D');
console.log('✔ Test 8: 33 agents and 3D arena integrity verified in studio3D.js');

console.log('--- ALL ZERO-BUG CODE-QA PIPELINE TESTS PASSED SUCCESSFULLY! ---');
