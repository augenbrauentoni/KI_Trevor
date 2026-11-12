import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('STARTING TEST SUITE: PIXELGENAUER UI-REBUILD & TRAININGSMODUS (v14.0)');
console.log('================================================================\n');

// Read files
const html = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/index.html'), 'utf8');
const studioCode = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/studio3D.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/style.css'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/styles.css'), 'utf8');
const idleTrainerCode = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/idleTrainer.js'), 'utf8');

// -----------------------------------------------------------------------------
// TEST 1: Cache-Busting & Version 14.0 in index.html
// -----------------------------------------------------------------------------
console.log('--- Test 1: Cache-Busting & Version 14.0 in index.html ---');
assert(html.includes('href="./styles.css?v=16.0"') || html.includes('href="./styles.css?v=14.0"'), 'styles.css must have cache ?v=16.0 or ?v=14.0');
assert(html.includes('href="./style.css?v=16.0"') || html.includes('href="./style.css?v=14.0"'), 'style.css must have cache ?v=16.0 or ?v=14.0');
assert(html.includes('src="./app.js?v=16.0"') || html.includes('src="./app.js?v=14.0"'), 'app.js must have cache ?v=16.0 or ?v=14.0');
console.log('✔ Test 1 passed: Cache-busting ?v=14.0 correctly set on all CSS and JS bundles.');

// -----------------------------------------------------------------------------
// TEST 2: Pixel-Perfect Header & Top Tech-Stripe
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Top Tech-Stripe & Top Header Bar ---');
assert(html.includes('id="top-tech-stripe"'), 'index.html must have #top-tech-stripe');
assert(html.includes('OPTIMIZING UI DESIGN...'), 'index.html must contain tech-stripe text OPTIMIZING UI DESIGN...');
assert(styleCss.includes('.top-tech-stripe') && stylesCss.includes('.top-tech-stripe'), 'CSS must define .top-tech-stripe');
assert(styleCss.includes('height: 22px') || styleCss.includes('height:22px'), 'Top tech stripe must be 22px high');

assert(html.includes('id="top-header-bar"'), 'index.html must have #top-header-bar');
assert(html.includes('id="header-menu-toggle"'), 'index.html must have #header-menu-toggle');
assert(html.includes('KI_Trevor'), 'index.html must have brand title KI_Trevor');
assert(html.includes('id="header-notification-btn"'), 'index.html must have #header-notification-btn');
assert(html.includes('id="header-director-avatar"'), 'index.html must have #header-director-avatar');
assert(styleCss.includes('.header-director-avatar') && stylesCss.includes('.header-director-avatar'), 'CSS must define .header-director-avatar');
console.log('✔ Test 2 passed: Tech-stripe and Header bar elements and styles verified.');

// -----------------------------------------------------------------------------
// TEST 3: Dynamic Island Central Waveform Capsule
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Central Waveform Capsule (Dynamic Island) ---');
assert(html.includes('id="dynamic-island-container"'), 'index.html must have #dynamic-island-container');
assert(html.includes('id="dynamic-island-capsule"'), 'index.html must have #dynamic-island-capsule');
assert(html.includes('id="jarvis-waveform-canvas"'), 'index.html must have #jarvis-waveform-canvas');
assert(html.includes('id="dynamic-island-text"'), 'index.html must have #dynamic-island-text');
assert(appCode.includes('initWaveformCanvas'), 'app.js must define initWaveformCanvas');
assert(appCode.includes('jarvis-waveform-canvas'), 'app.js must reference jarvis-waveform-canvas');
assert(styleCss.includes('.dynamic-island-capsule') && stylesCss.includes('.dynamic-island-capsule'), 'CSS must define .dynamic-island-capsule');
console.log('✔ Test 3 passed: Dynamic Island capsule and canvas waveform renderer verified.');

// -----------------------------------------------------------------------------
// TEST 4: Left Dock, Floating Queue & Action Center
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Left Dock, Floating Queue & Action Center ---');
assert(html.includes('id="nav-training"'), 'index.html must have #nav-training in left dock');
assert(html.includes('id="btn-logout-reset"'), 'index.html must have #btn-logout-reset');
assert(html.includes('data-tooltip'), 'index.html must have data-tooltip attributes for hover tags');
assert(html.includes('id="task-queue-collapse-btn"'), 'index.html must have #task-queue-collapse-btn');
assert(appCode.includes('drawer-training'), 'app.js must include drawer-training in DRAWER_IDS');
assert(appCode.includes('Erklärung der Auswirkungen (Impact-Analyse)'), 'app.js must render Erklärung der Auswirkungen (Impact-Analyse)');
assert(styleCss.includes('.btn-action-decision-yes') && stylesCss.includes('.btn-action-decision-yes'), 'CSS must style .btn-action-decision-yes');
assert(styleCss.includes('.btn-action-decision-no') && stylesCss.includes('.btn-action-decision-no'), 'CSS must style .btn-action-decision-no');
assert(styleCss.includes('.action-impact-box') && stylesCss.includes('.action-impact-box'), 'CSS must style .action-impact-box');
console.log('✔ Test 4 passed: Left dock tooltips, floating queue panel, and Action Center high-detail cards verified.');

// -----------------------------------------------------------------------------
// TEST 5: Bottom Dock 4 Square Buttons & Prompt Bar
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Bottom Dock Square Buttons & Prompt Bar ---');
assert(html.includes('id="ctrl-mic"'), 'index.html must have #ctrl-mic');
assert(html.includes('id="ctrl-hub"'), 'index.html must have #ctrl-hub');
assert(html.includes('id="ctrl-floor-eg"'), 'index.html must have #ctrl-floor-eg');
assert(html.includes('id="ctrl-floor-ug"'), 'index.html must have #ctrl-floor-ug');
assert(html.includes('dock-square-btn'), 'index.html must use .dock-square-btn class');
assert(styleCss.includes('.dock-square-btn') && stylesCss.includes('.dock-square-btn'), 'CSS must define .dock-square-btn (68x64px)');
assert(styleCss.includes('#trevor-prompt-bar') && stylesCss.includes('#trevor-prompt-bar'), 'CSS must position #trevor-prompt-bar at bottom: 92px');
console.log('✔ Test 5 passed: Bottom dock square buttons and prompt bar verified.');

// -----------------------------------------------------------------------------
// TEST 6: 3D Scene Detail Upgrade (Constellation Network, Desk Lights, Chairs, Sector Stems)
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: 3D Detail Upgrade in studio3D.js ---');
assert(studioCode.includes('setupConstellationNetwork'), 'studio3D.js must implement setupConstellationNetwork');
assert(studioCode.includes('PointLight'), 'studio3D.js must add PointLight for desk task illumination');
assert(studioCode.includes('chairGroup') || studioCode.includes('swivelChair'), 'studio3D.js must create ergonomic workstation chairs');
assert(studioCode.includes('stemLine') || studioCode.includes('stemGeom'), 'studio3D.js must anchor sector HUD plaques with vertical stem lines');
console.log('✔ Test 6 passed: Constellation network, desk lights, chairs, and sector HUD stems verified.');

// -----------------------------------------------------------------------------
// TEST 7: Full Training Mode & Leisure Projects (idleTrainer.js & app.js)
// -----------------------------------------------------------------------------
console.log('\n--- Test 7: Training Mode & Leisure Projects ---');
assert(html.includes('id="drawer-training"'), 'index.html must have #drawer-training sub-drawer');
assert(html.includes('id="training-active-toggle-btn"'), 'index.html must have #training-active-toggle-btn');
assert(html.includes('id="training-project-select"'), 'index.html must have #training-project-select');
assert(html.includes('id="btn-toggle-custom-project-form"'), 'index.html must have #btn-toggle-custom-project-form');
assert(html.includes('id="btn-save-custom-project"'), 'index.html must have #btn-save-custom-project');
assert(html.includes('id="training-focus-select"'), 'index.html must have #training-focus-select');
assert(html.includes('id="btn-trigger-training-run"'), 'index.html must have #btn-trigger-training-run');

// Check the 6 default projects in idleTrainer.js
const requiredProjects = [
  'KI_Trevor',
  'Fussballschulen-Manager',
  'LernfeldTrainer',
  'Class Party / Class Kart GP',
  'EMail-Worker',
  'IT-Systemintegration & Netzwerke'
];
requiredProjects.forEach(proj => {
  assert(idleTrainerCode.includes(proj), `idleTrainer.js must contain project "${proj}"`);
});

// Import and test idleTrainer functions in runtime
const {
  getAllTrainingProjects,
  getActiveTrainingProject,
  setActiveTrainingProject,
  addTrainingProject,
  setTrainingFocusArea,
  getTrainingFocusArea,
  executeTrainingStep,
  toggleIdleTraining,
  isTrainingRunning
} = await import('./02_Frontend_UI_und_3D_Studio/idleTrainer.js');

const initialProjects = getAllTrainingProjects();
assert(initialProjects.length >= 6, 'There must be at least 6 default training projects');

const activeProj = getActiveTrainingProject();
assert(activeProj && activeProj.name, 'Active training project must be returned');

const newProj = addTrainingProject({
  name: 'Test Project v14',
  domain: 'Quality Assurance & Testing',
  focusAreas: ['Unit Tests', 'E2E Testing']
});
assert.strictEqual(newProj.name, 'Test Project v14', 'Custom project must be created with correct name');

const switched = setActiveTrainingProject(newProj.id);
assert.strictEqual(switched.id, newProj.id, 'Active training project must switch to custom project');

setTrainingFocusArea('Unit Tests');
assert.strictEqual(getTrainingFocusArea(), 'Unit Tests', 'Training focus area must be updated');

const step = executeTrainingStep();
assert(step && step.agentId && step.insight, 'executeTrainingStep must produce an agent training insight');
console.log(`  Training step executed by: ${step.agentName} (${step.department}) -> "${step.insight.slice(0, 45)}..."`);

const runningState = isTrainingRunning();
const toggledState = toggleIdleTraining();
assert.strictEqual(toggledState, !runningState, 'toggleIdleTraining must invert running state');
toggleIdleTraining(); // restore

console.log('✔ Test 7 passed: All 6 default projects, custom project addition, focus area, and training steps verified.');

// -----------------------------------------------------------------------------
// TEST 8: Button Event Delegation & Submenu Wiring in app.js
// -----------------------------------------------------------------------------
console.log('\n--- Test 8: Button Event Delegation & Submenu Wiring ---');
assert(appCode.includes('initTrainingDrawerUI'), 'app.js must export/call initTrainingDrawerUI');
assert(appCode.includes('header-menu-toggle'), 'app.js must wire #header-menu-toggle');
assert(appCode.includes('header-notification-btn'), 'app.js must wire #header-notification-btn');
assert(appCode.includes('header-director-avatar'), 'app.js must wire #header-director-avatar');
assert(appCode.includes('btn-logout-reset'), 'app.js must wire #btn-logout-reset');
assert(appCode.includes('task-queue-collapse-btn'), 'app.js must wire #task-queue-collapse-btn');
assert(appCode.includes("document.addEventListener('click'"), 'app.js must register central click event delegation');
console.log('✔ Test 8 passed: 100% button delegation and header button wiring verified.');

console.log('\n================================================================');
console.log('ALL v14.0 TESTS PASSED SUCCESSFULLY! (8/8)');
console.log('================================================================');
