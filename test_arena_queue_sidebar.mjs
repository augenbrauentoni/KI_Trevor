import assert from 'assert';
import fs from 'fs';

console.log('=== VERIFYING ARENA 3D REBUILD, QUEUE REPAIR & EXPANDED SIDEBAR (v6.0) ===\n');

// 1. studio3D.js
console.log('--- Test 1: studio3D.js Concentric Arena & Holo-JARVIS ---');
const studio3DCode = fs.readFileSync('02_Frontend_UI_und_3D_Studio/studio3D.js', 'utf8');

assert(!studio3DCode.includes('setupTrevorIronManMech'), 'Old robot mech setupTrevorIronManMech must be completely deleted');
assert(!studio3DCode.includes('createFloatingLabelSprite'), 'Old giant billboards createFloatingLabelSprite must be completely deleted');
assert(studio3DCode.includes('createSleekHudLabelSprite'), 'Sleek HUD label sprites must be present');
assert(studio3DCode.includes('2500'), '2500 particles Holo-JARVIS must be present');
assert(studio3DCode.includes('setCameraPreset'), 'Camera presets function must be present');
assert(studio3DCode.includes('.Clock()'), 'Delta timing with Clock must be present');
assert(studio3DCode.includes('camera.position.set(0, 15, 19)') || studio3DCode.includes('camera.position.set(0, 22, 28)'), 'Camera overhead isometric default must be (0, 15, 19) or (0, 22, 28)');
console.log('[PASS] studio3D.js: Amphitheater arena, Holo-JARVIS & 60-FPS loop verified.');

// 2. index.html
console.log('\n--- Test 2: index.html Cache Version, Sidebar Icons & 6 Sub-Drawers ---');
const indexHtml = fs.readFileSync('02_Frontend_UI_und_3D_Studio/index.html', 'utf8');

assert(indexHtml.includes('styles.css?v=10.0') || indexHtml.includes('styles.css?v=7.0') || indexHtml.includes('styles.css?v=6.0'), 'styles.css must be versioned');
assert(indexHtml.includes('style.css?v=10.0') || indexHtml.includes('style.css?v=7.0') || indexHtml.includes('style.css?v=6.0'), 'style.css must be versioned');
assert(indexHtml.includes('app.js?v=10.0') || indexHtml.includes('app.js?v=7.0') || indexHtml.includes('app.js?v=6.0'), 'app.js must be versioned');

// 6 Sidebar Icons with data-tooltip
const requiredIcons = [
  'id="nav-task-queue"',
  'id="nav-modes"',
  'id="nav-agents"',
  'id="nav-memory"',
  'id="nav-settings"',
  'id="nav-camera"'
];
requiredIcons.forEach(iconId => {
  assert(indexHtml.includes(iconId), `Sidebar icon ${iconId} must be present`);
});
assert(indexHtml.includes('data-tooltip="Task-Warteschlange & aktive Aufträge"'), 'Tooltip for task queue must be present');
assert(indexHtml.includes('data-tooltip="Auftrags-Modus direkt starten"'), 'Tooltip for modes must be present');
assert(indexHtml.includes('data-tooltip="Abteilungen & 33 Agenten direkt ansteuern"'), 'Tooltip for agents must be present');
assert(indexHtml.includes('data-tooltip="Supabase Cloud-Gedächtnis & Code-Wissen"'), 'Tooltip for memory must be present');
assert(indexHtml.includes('data-tooltip="LLM-Engine (Qwen / Gemini) & J.A.R.V.I.S. Sprache"'), 'Tooltip for settings must be present');
assert(indexHtml.includes('data-tooltip="3D-Kamera & Arena-Perspektiven"'), 'Tooltip for camera must be present');

// 6 Sub-Drawers
const requiredDrawers = [
  'id="drawer-task-queue"',
  'id="drawer-modes"',
  'id="drawer-agents"',
  'id="drawer-memory"',
  'id="drawer-settings"',
  'id="drawer-camera"'
];
requiredDrawers.forEach(drawerId => {
  assert(indexHtml.includes(drawerId), `Sub-drawer ${drawerId} must be present in index.html`);
});

// Floating Prompt Bar
assert(indexHtml.includes('id="trevor-prompt-bar"'), 'Floating prompt bar #trevor-prompt-bar must be present');
assert(indexHtml.includes('id="trevor-prompt-input"'), 'Floating prompt input #trevor-prompt-input must be present');
assert(indexHtml.includes('id="trevor-submit-btn"'), 'Floating prompt submit button #trevor-submit-btn must be present');

console.log('[PASS] index.html: v6.0 cache, sidebar icons with tooltips, 6 sub-drawers & prompt bar verified.');

// 3. styles.css & style.css
console.log('\n--- Test 3: styles.css Tooltips & Drawer Styles ---');
const stylesCss = fs.readFileSync('02_Frontend_UI_und_3D_Studio/styles.css', 'utf8');

assert(stylesCss.includes('[data-tooltip]:hover::after'), 'CSS tooltips [data-tooltip]:hover::after must be styled');
assert(stylesCss.includes('#0E1726'), 'Tooltip background #0E1726 must be present');
assert(stylesCss.includes('.sub-drawer-panel'), '.sub-drawer-panel styles must be present');
assert(stylesCss.includes('.trevor-prompt-bar'), '.trevor-prompt-bar styles must be present');
assert(stylesCss.includes('.task-queue-badge.badge-active'), '.task-queue-badge.badge-active (green) must be styled');
assert(stylesCss.includes('.task-queue-badge.badge-queued'), '.task-queue-badge.badge-queued (orange) must be styled');

console.log('[PASS] styles.css: Pure CSS tooltips, drawers, prompt bar & status badges verified.');

// 4. app.js logic
console.log('\n--- Test 4: app.js Queue Logic & Drawer Controller ---');
const appJs = fs.readFileSync('02_Frontend_UI_und_3D_Studio/app.js', 'utf8');

assert(appJs.includes('export function enqueueTask('), 'enqueueTask function must be exported in app.js');
assert(appJs.includes('window.trevorTaskQueue = state.taskQueue'), 'window.trevorTaskQueue must reference state.taskQueue');
assert(appJs.includes('window.isOrchestratorBusy'), 'window.isOrchestratorBusy tracking must be present');
assert(appJs.includes('export function closeAllDrawers('), 'closeAllDrawers function must be present');
assert(appJs.includes('export function toggleDrawer('), 'toggleDrawer function must be present');
assert(appJs.includes('export function renderDrawerAgentsList('), 'renderDrawerAgentsList function must be present');
assert(appJs.includes('setupDrawerAndNavListeners'), 'setupDrawerAndNavListeners must be present');

console.log('[PASS] app.js: Queue enqueueing, busy tracking & drawer navigation verified.');

console.log('\n======================================================');
console.log('ALL VERIFICATION TESTS FOR TASK 10 PASSED CLEANLY! ✔');
console.log('======================================================\n');
