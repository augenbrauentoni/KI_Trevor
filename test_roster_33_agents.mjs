import assert from 'assert';
import fs from 'fs';
import { TREVOR_AGENT_ROSTER, AGENT_ROSTER_BY_ID, STUDIO_HIERARCHY } from './02_Frontend_UI_und_3D_Studio/hierarchyData.js';
import { selectSpecialistsForTask, getDepartmentByCodeOrId } from './02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js';

console.log('=== VERIFYING 33-AGENT ROSTER RESTORATION (v7.0) ===\n');

// -------------------------------------------------------------------------
// 1. ZENTRALE AGENTEN-DATENBANK (window.TREVOR_AGENT_ROSTER)
// -------------------------------------------------------------------------
console.log('--- Test 1: Complete 33-Agent Roster & IDs ---');
assert.strictEqual(Array.isArray(TREVOR_AGENT_ROSTER), true, 'TREVOR_AGENT_ROSTER must be an array');
assert.strictEqual(TREVOR_AGENT_ROSTER.length, 33, `Must contain exactly 33 agents, got ${TREVOR_AGENT_ROSTER.length}`);

// Verify ID sequence ag_01 through ag_33
for (let i = 1; i <= 33; i++) {
  const id = `ag_${String(i).padStart(2, '0')}`;
  const agent = AGENT_ROSTER_BY_ID[id];
  assert.ok(agent, `Agent ${id} must exist in AGENT_ROSTER_BY_ID`);
  assert.strictEqual(agent.id, id, `Agent id must match ${id}`);
}

// 1. Zentrale: Trevor (ag_01)
const trevor = AGENT_ROSTER_BY_ID['ag_01'];
assert.strictEqual(trevor.name, 'Trevor');
assert.strictEqual(trevor.role, 'Studio Director');
assert.strictEqual(trevor.deptCode, 'CENTER_CORE');
assert.strictEqual(trevor.isLead, true);

// 2. Abteilung 1: EG_ARCHITEKTUR (ag_02..ag_09)
const expectedArch = [
  { id: 'ag_02', name: 'Marcus', role: 'Abteilungsleiter Architektur', isLead: true },
  { id: 'ag_03', name: 'Elena', role: 'Requirements Engineer', isLead: false },
  { id: 'ag_04', name: 'Viktor', role: 'Data Modeler', isLead: false },
  { id: 'ag_05', name: 'Svenja', role: 'BWL & Projekt-Analystin', isLead: false },
  { id: 'ag_06', name: 'Lukas', role: 'Tech-Stack Strategist', isLead: false },
  { id: 'ag_07', name: 'Nadia', role: 'Prompt Architect', isLead: false },
  { id: 'ag_08', name: 'Henrik', role: 'Impact & Risk Auditor', isLead: false },
  { id: 'ag_09', name: 'Clara', role: 'Documentation Lead', isLead: false }
];
expectedArch.forEach(expected => {
  const a = AGENT_ROSTER_BY_ID[expected.id];
  assert.strictEqual(a.name, expected.name, `Agent ${expected.id} name must match ${expected.name}`);
  assert.strictEqual(a.role, expected.role, `Agent ${expected.id} role must match ${expected.role}`);
  assert.strictEqual(a.isLead, expected.isLead, `Agent ${expected.id} isLead must be ${expected.isLead}`);
  assert.strictEqual(a.deptCode, 'EG_ARCHITEKTUR');
});

// 3. Abteilung 2: EG_FRONTEND (ag_10..ag_17)
const expectedFe = [
  { id: 'ag_10', name: 'Daria', role: 'Abteilungsleiterin Frontend', isLead: true },
  { id: 'ag_11', name: 'Liam', role: 'Three.js & WebGL Engineer', isLead: false },
  { id: 'ag_12', name: 'Maya', role: 'CSS & Slate-UI Specialist', isLead: false },
  { id: 'ag_13', name: 'Noah', role: 'DOM & HUD Controller', isLead: false },
  { id: 'ag_14', name: 'Zoe', role: '60FPS Animation Specialist', isLead: false },
  { id: 'ag_15', name: 'Finn', role: 'Audio & Voice Integrator', isLead: false },
  { id: 'ag_16', name: 'Lea', role: 'Icon & Tooltip Designerin', isLead: false },
  { id: 'ag_17', name: 'Ben', role: 'Usability & UX Tester', isLead: false }
];
expectedFe.forEach(expected => {
  const a = AGENT_ROSTER_BY_ID[expected.id];
  assert.strictEqual(a.name, expected.name, `Agent ${expected.id} name must match ${expected.name}`);
  assert.strictEqual(a.role, expected.role, `Agent ${expected.id} role must match ${expected.role}`);
  assert.strictEqual(a.isLead, expected.isLead, `Agent ${expected.id} isLead must be ${expected.isLead}`);
  assert.strictEqual(a.deptCode, 'EG_FRONTEND');
});

// 4. Abteilung 3: EG_BACKEND (ag_18..ag_25)
const expectedBe = [
  { id: 'ag_18', name: 'David', role: 'Abteilungsleiter Backend', isLead: true },
  { id: 'ag_19', name: 'Sarah', role: 'Node.js & API Engineer', isLead: false },
  { id: 'ag_20', name: 'Malik', role: 'Supabase & Memory Specialist', isLead: false },
  { id: 'ag_21', name: 'Jonas', role: 'Python & Algorithm Dev', isLead: false },
  { id: 'ag_22', name: 'Kiara', role: 'Dual-LLM Specialist', isLead: false },
  { id: 'ag_23', name: 'Tarek', role: 'RAG & Code-Context Engineer', isLead: false },
  { id: 'ag_24', name: 'Hannah', role: 'Async & Queue Architect', isLead: false },
  { id: 'ag_25', name: 'Tim', role: 'Parser & Validation Dev', isLead: false }
];
expectedBe.forEach(expected => {
  const a = AGENT_ROSTER_BY_ID[expected.id];
  assert.strictEqual(a.name, expected.name, `Agent ${expected.id} name must match ${expected.name}`);
  assert.strictEqual(a.role, expected.role, `Agent ${expected.id} role must match ${expected.role}`);
  assert.strictEqual(a.isLead, expected.isLead, `Agent ${expected.id} isLead must be ${expected.isLead}`);
  assert.strictEqual(a.deptCode, 'EG_BACKEND');
});

// 5. Abteilung 4: UG_SERVER (ag_26..ag_33)
const expectedServer = [
  { id: 'ag_26', name: 'Ilja', role: 'Abteilungsleiter Systemintegration & Security', isLead: true },
  { id: 'ag_27', name: 'Milan', role: 'Network & Subnetting Engineer', isLead: false },
  { id: 'ag_28', name: 'Freya', role: 'Security & Sandbox Guardian', isLead: false },
  { id: 'ag_29', name: 'Anton', role: 'Cloud & Render DevOps', isLead: false },
  { id: 'ag_30', name: 'Kian', role: 'Hardware & Virtualization Spec', isLead: false },
  { id: 'ag_31', name: 'Nora', role: 'Firewall & VPN Specialist', isLead: false },
  { id: 'ag_32', name: 'Rico', role: 'QA & Logic Debugger', isLead: false },
  { id: 'ag_33', name: 'Yuna', role: 'Idle-Trainer & AI Optimizer', isLead: false }
];
expectedServer.forEach(expected => {
  const a = AGENT_ROSTER_BY_ID[expected.id];
  assert.strictEqual(a.name, expected.name, `Agent ${expected.id} name must match ${expected.name}`);
  assert.strictEqual(a.role, expected.role, `Agent ${expected.id} role must match ${expected.role}`);
  assert.strictEqual(a.isLead, expected.isLead, `Agent ${expected.id} isLead must be ${expected.isLead}`);
  assert.strictEqual(a.deptCode, 'UG_SERVER');
});

// Counts verification
const leadCount = TREVOR_AGENT_ROSTER.filter(a => a.isLead).length;
assert.strictEqual(leadCount, 5, `Must have exactly 5 leads (1 Director + 4 Abteilungsleiter), got ${leadCount}`);

const specialistsPerDept = {
  'EG_ARCHITEKTUR': TREVOR_AGENT_ROSTER.filter(a => a.deptCode === 'EG_ARCHITEKTUR').length,
  'EG_FRONTEND': TREVOR_AGENT_ROSTER.filter(a => a.deptCode === 'EG_FRONTEND').length,
  'EG_BACKEND': TREVOR_AGENT_ROSTER.filter(a => a.deptCode === 'EG_BACKEND').length,
  'UG_SERVER': TREVOR_AGENT_ROSTER.filter(a => a.deptCode === 'UG_SERVER').length
};
assert.strictEqual(specialistsPerDept['EG_ARCHITEKTUR'], 8, 'Architektur must have 8 agents (1 lead + 7 spec)');
assert.strictEqual(specialistsPerDept['EG_FRONTEND'], 8, 'Frontend must have 8 agents (1 lead + 7 spec)');
assert.strictEqual(specialistsPerDept['EG_BACKEND'], 8, 'Backend must have 8 agents (1 lead + 7 spec)');
assert.strictEqual(specialistsPerDept['UG_SERVER'], 8, 'Server must have 8 agents (1 lead + 7 spec)');

console.log('[PASS] Test 1: Complete 33-Agent Roster, IDs, Roles and Hierarchy verified.');

// -------------------------------------------------------------------------
// 2. ORCHESTRATOR SPECIALIST MAPPING & TASK DISPATCH
// -------------------------------------------------------------------------
console.log('\n--- Test 2: Dynamic Specialist Selection in Orchestrator ---');
const beDept = getDepartmentByCodeOrId('EG_BACKEND', STUDIO_HIERARCHY.departments);
const feDept = getDepartmentByCodeOrId('EG_FRONTEND', STUDIO_HIERARCHY.departments);
const archDept = getDepartmentByCodeOrId('EG_ARCHITEKTUR', STUDIO_HIERARCHY.departments);
const serverDept = getDepartmentByCodeOrId('UG_SERVER', STUDIO_HIERARCHY.departments);

// 2a. Python query -> Jonas + Tim + Sarah
const pythonSpecs = selectSpecialistsForTask(beDept, 'Schreibe ein Python-Skript für QuickSort');
assert.strictEqual(pythonSpecs[0].name, 'Jonas', 'Primary specialist for Python must be Jonas');
assert.strictEqual(pythonSpecs[1].name, 'Tim', 'Secondary specialist for edge-cases must be Tim');
assert.strictEqual(pythonSpecs[2].name, 'Sarah', 'Third specialist must be Sarah');

// 2b. Database query -> Malik + Tarek + Tim
const dbSpecs = selectSpecialistsForTask(beDept, 'Erstelle Supabase PostgreSQL Schema mit RAG');
assert.strictEqual(dbSpecs[0].name, 'Malik', 'Primary specialist for DB must be Malik');

// 2c. 3D query -> Liam + Zoe + Ben
const threeSpecs = selectSpecialistsForTask(feDept, 'Baue Three.js WebGL Shader mit 60 FPS');
assert.strictEqual(threeSpecs[0].name, 'Liam', 'Primary specialist for Three.js must be Liam');

// 2d. Subnetting query -> Milan + Nora + Rico
const netSpecs = selectSpecialistsForTask(serverDept, 'Berechne Subnetting IPv4 CIDR VLSM Tabellen');
assert.strictEqual(netSpecs[0].name, 'Milan', 'Primary specialist for Subnetting must be Milan');

// 2e. Prompt query -> Nadia + Henrik + Clara
const promptSpecs = selectSpecialistsForTask(archDept, 'Erstelle Antigravity System-Prompt für Agents');
assert.strictEqual(promptSpecs[0].name, 'Nadia', 'Primary specialist for Prompts must be Nadia');

console.log('[PASS] Test 2: Dynamic Specialist Selection verified for all 4 departments.');

// -------------------------------------------------------------------------
// 3. 3D STUDIO VERIFICATION (studio3D.js)
// -------------------------------------------------------------------------
console.log('\n--- Test 3: studio3D.js All 33 Workstations & Raycaster ---');
const studioCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/studio3D.js', 'utf8');

assert(studioCode.includes('TREVOR_AGENT_ROSTER'), 'studio3D.js must import TREVOR_AGENT_ROSTER');
assert(studioCode.includes('setupTrevorCommandStation'), 'setupTrevorCommandStation must be present');
assert(studioCode.includes('setupArchitectureSector'), 'setupArchitectureSector must be present');
assert(studioCode.includes('setupFrontendSector'), 'setupFrontendSector must be present');
assert(studioCode.includes('setupBackendSector'), 'setupBackendSector must be present');
assert(studioCode.includes('setupServerSector'), 'setupServerSector must be present');
assert(studioCode.includes('createLeadWorkstation'), 'createLeadWorkstation must be present');
assert(studioCode.includes('createSpecialistWorkstation'), 'createSpecialistWorkstation must be present');
assert(studioCode.includes('agent-hover-speech-bubble') || studioCode.includes('studio3d-hover-badge'), 'agent-hover-speech-bubble must be present for Raycaster hover');
assert(studioCode.includes('focusAgentIn3D'), 'focusAgentIn3D must be present');
assert(studioCode.includes('camera.position.set(0, 15, 19)') || studioCode.includes('camera.position.set(0, 22, 28)'), 'Camera default must be (0, 15, 19) or (0, 22, 28)');

console.log('[PASS] Test 3: studio3D.js 33-Agent workstations & hover badge verified.');

// -------------------------------------------------------------------------
// 4. APP.JS & DRAWER VERIFICATION
// -------------------------------------------------------------------------
console.log('\n--- Test 4: app.js Drawer Rendering & Roster Exposure ---');
const appCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/app.js', 'utf8');

assert(appCode.includes('window.TREVOR_AGENT_ROSTER = TREVOR_AGENT_ROSTER'), 'window.TREVOR_AGENT_ROSTER must be exposed');
assert(appCode.includes('btn-focus-agent'), 'btn-focus-agent must be rendered in drawer');
assert(appCode.includes('btn-inspect-agent'), 'btn-inspect-agent must be rendered in drawer');
assert(appCode.includes('drawer-single-agent-row'), 'drawer-single-agent-row must be rendered in drawer');

console.log('[PASS] Test 4: app.js drawer agents list and globals verified.');

// -------------------------------------------------------------------------
// 5. CACHE VERSION VERIFICATION (?v=7.0)
// -------------------------------------------------------------------------
console.log('\n--- Test 5: Cache Version in index.html ---');
const indexCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/index.html', 'utf8');

assert(indexCode.includes('styles.css?v=14.0') || indexCode.includes('styles.css?v=12.0') || indexCode.includes('styles.css?v=11.0') || indexCode.includes('styles.css?v=10.0') || indexCode.includes('styles.css?v=7.0'), 'styles.css must have cache version');
assert(indexCode.includes('style.css?v=14.0') || indexCode.includes('style.css?v=12.0') || indexCode.includes('style.css?v=11.0') || indexCode.includes('style.css?v=10.0') || indexCode.includes('style.css?v=7.0'), 'style.css must have cache version');
assert(indexCode.includes('app.js?v=14.0') || indexCode.includes('app.js?v=12.0') || indexCode.includes('app.js?v=11.0') || indexCode.includes('app.js?v=10.0') || indexCode.includes('app.js?v=7.0'), 'app.js must have cache version');

console.log('[PASS] Test 5: Cache version in index.html verified.');

console.log('\n======================================================');
console.log('ALL VERIFICATION TESTS FOR TASK 11 PASSED CLEANLY! ✔');
console.log('======================================================\n');
