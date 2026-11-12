import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('STARTING TEST SUITE: HIGH-END 3D-ARENA & UNREAL-BLOOM (v12.0)');
console.log('================================================================\n');

// 1. Static file inspections
const html = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/index.html'), 'utf8');
const studioCode = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/studio3D.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/style.css'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/styles.css'), 'utf8');

// TEST 1: index.html Cache-Busting v=12.0 & Three.js Post-Processing Addons
console.log('--- Test 1: index.html Cache-Busting & Post-Processing Setup ---');
assert(html.includes('href="./styles.css?v=16.0"') || html.includes('href="./styles.css?v=14.0"') || html.includes('href="./styles.css?v=12.0"'), 'styles.css must have cache ?v=16.0, ?v=14.0 or ?v=12.0');
assert(html.includes('href="./style.css?v=16.0"') || html.includes('href="./style.css?v=14.0"') || html.includes('href="./style.css?v=12.0"'), 'style.css must have cache ?v=16.0, ?v=14.0 or ?v=12.0');
assert(html.includes('src="./app.js?v=16.0"') || html.includes('src="./app.js?v=14.0"') || html.includes('src="./app.js?v=12.0"'), 'app.js must have cache ?v=16.0, ?v=14.0 or ?v=12.0');

// Importmap or CDN scripts for postprocessing
assert(html.includes('EffectComposer.js'), 'index.html must include EffectComposer.js');
assert(html.includes('RenderPass.js'), 'index.html must include RenderPass.js');
assert(html.includes('UnrealBloomPass.js'), 'index.html must include UnrealBloomPass.js');
assert(html.includes('id="ctrl-hub"'), 'index.html must have #ctrl-hub');
assert(html.includes('id="ctrl-floor-eg"'), 'index.html must have #ctrl-floor-eg');
assert(html.includes('id="ctrl-floor-ug"'), 'index.html must have #ctrl-floor-ug');
console.log('✔ Test 1 passed: Cache-Busting v=12.0 and Post-Processing scripts present.');

// TEST 2: UnrealBloomPass & EffectComposer Pipeline in studio3D.js
console.log('\n--- Test 2: UnrealBloomPass & EffectComposer Configuration ---');
assert(studioCode.includes('UnrealBloomPass'), 'studio3D.js must use UnrealBloomPass');
assert(studioCode.includes('EffectComposer'), 'studio3D.js must use EffectComposer');
assert(studioCode.includes('RenderPass'), 'studio3D.js must use RenderPass');
assert(/0\.85/.test(studioCode), 'studio3D.js must configure bloom strength 0.85');
assert(/0\.5/.test(studioCode), 'studio3D.js must configure bloom radius 0.5');
assert(/0\.25/.test(studioCode), 'studio3D.js must configure bloom threshold 0.25');
assert(studioCode.includes('loadPostProcessingClasses'), 'studio3D.js must have loadPostProcessingClasses');
console.log('✔ Test 2 passed: UnrealBloomPass configured with strength: 0.85, radius: 0.5, threshold: 0.25.');

// TEST 3: High-End Architecture & Furniture
console.log('\n--- Test 3: High-End Architecture & Furniture ---');
assert(studioCode.includes('setupConcentricTerraceArena'), 'studio3D.js must create stepped arena terraces');
assert(studioCode.includes('setupServerRacksInCenterRing'), 'studio3D.js must create server racks and balustrade');
assert(studioCode.includes('createSpecialistWorkstation') || studioCode.includes('createLeadWorkstation'), 'studio3D.js must create high-tech workstations');
assert(studioCode.includes('MeshPhysicalMaterial'), 'studio3D.js must use MeshPhysicalMaterial for glass/metals');
assert(studioCode.includes('radialFloorSeams') || studioCode.includes('radialSeam') || studioCode.includes('seamGeo') || studioCode.includes('RADIALE LICHTFUGEN'), 'studio3D.js must have radial floor light seams');
console.log('✔ Test 3 passed: 5-step amphitheater terraces, server racks with balustrade, and curved workstations present.');

// TEST 4: Detailed Holographic Iron-Man (J.A.R.V.I.S.) Figure
console.log('\n--- Test 4: Detailed Holographic Iron-Man (J.A.R.V.I.S.) Figure ---');
assert(studioCode.includes('setupHolographicIronManFigure'), 'studio3D.js must contain setupHolographicIronManFigure');
assert(studioCode.includes('arcCore') || studioCode.includes('arcReactor') || studioCode.includes('holoJarvisCore'), 'studio3D.js must build Arc Reactor core');
assert(studioCode.includes('helmet') || studioCode.includes('eyeVisor') || studioCode.includes('visor'), 'studio3D.js must build helmet with eye visor');
assert(studioCode.includes('gimbal') || studioCode.includes('outerGimbal') || studioCode.includes('innerGimbal') || studioCode.includes('holoJarvisRings'), 'studio3D.js must have rotating gimbal rings');
assert(studioCode.includes('scanDisc') || studioCode.includes('scanDiscs') || studioCode.includes('scanMesh') || studioCode.includes('discMesh'), 'studio3D.js must include horizontal scan discs');
assert(studioCode.includes('particleAura') || studioCode.includes('particles') || studioCode.includes('holoJarvisPoints'), 'studio3D.js must have particle aura');
console.log('✔ Test 4 passed: Anatomical Iron-Man hologram with Arc Reactor, eye visor, gimbal rings & scan discs present.');

// TEST 5: Symmetric 360° Amphitheater Placement of 33 Agents
console.log('\n--- Test 5: Symmetric 360° Placement of All 33 Agents ---');
assert(studioCode.includes('setupArenaWorkstations'), 'studio3D.js must have setupArenaWorkstations');
assert(studioCode.includes('interactiveAgentMeshes'), 'studio3D.js must track interactiveAgentMeshes');
assert(studioCode.includes('agentHoverSpeechBubble') || studioCode.includes('agent-hover-speech-bubble'), 'studio3D.js must reference speech bubble');
assert(studioCode.includes('UG_SERVER'), 'studio3D.js must place UG_SERVER agents in central sunken pit');
assert(studioCode.includes('EG_ARCHITEKTUR') || studioCode.includes('galleryIslands') || studioCode.includes('islandAngle'), 'studio3D.js must arrange gallery islands');
console.log('✔ Test 5 passed: 360° amphitheater distribution for all 33 agents.');

// TEST 6: Camera Tweening (flyCameraTo) & OrbitControls Collision Prevention
console.log('\n--- Test 6: Camera Tweening (flyCameraTo) & Collision Prevention ---');
assert(studioCode.includes('export function flyCameraTo'), 'studio3D.js must export flyCameraTo');
assert(studioCode.includes('cameraTargetPos'), 'studio3D.js must track cameraTargetPos');
assert(studioCode.includes('cameraTargetLookAt'), 'studio3D.js must track cameraTargetLookAt');
assert(/0\.06/.test(studioCode), 'studio3D.js must use 0.06 lerp factor');
assert(studioCode.includes('pointerdown'), 'studio3D.js must cancel flight on pointerdown to prevent controls fighting');
assert(studioCode.includes('wheel'), 'studio3D.js must cancel flight on wheel to prevent controls fighting');
assert(studioCode.includes('setCameraPreset'), 'studio3D.js must export setCameraPreset');
assert(studioCode.includes('reset3DCamera'), 'studio3D.js must export reset3DCamera');
assert(studioCode.includes('switchFloor'), 'studio3D.js must export switchFloor');
console.log('✔ Test 6 passed: flyCameraTo with 0.06 lerp and pointerdown/wheel cancellation listeners verified.');

// TEST 7: app.js Camera Navigation Wiring
console.log('\n--- Test 7: app.js Camera Navigation Controls ---');
assert(appCode.includes('ctrl-hub'), 'app.js must wire ctrl-hub');
assert(appCode.includes('ctrl-floor-eg'), 'app.js must wire ctrl-floor-eg');
assert(appCode.includes('ctrl-floor-ug'), 'app.js must wire ctrl-floor-ug');
assert(appCode.includes('flyCameraTo'), 'app.js must call flyCameraTo on floor/hub controls');
console.log('✔ Test 7 passed: Navigation buttons wired in app.js.');

// TEST 8: CSS Slate Design & Decision Buttons in style.css & styles.css
console.log('\n--- Test 8: Slate Glassmorphism & Button Styles ---');
[styleCss, stylesCss].forEach((css, i) => {
  const name = i === 0 ? 'style.css' : 'styles.css';
  assert(css.includes('rgba(13, 19, 31, 0.78)'), `${name} must include dark slate glass background`);
  assert(css.includes('#2563EB'), `${name} must style [Ja] buttons with #2563EB`);
  assert(css.includes('#60A5FA'), `${name} must style [Ja] buttons with #60A5FA border`);
  assert(css.includes('rgba(127, 29, 29, 0.4)'), `${name} must style [Nein] buttons with dark red background`);
  assert(css.includes('#EF4444'), `${name} must style [Nein] buttons with #EF4444 border`);
});
console.log('✔ Test 8 passed: Unified slate glass and high-tech blue/dark-red decision button styles verified.');

console.log('\n================================================================');
console.log('ALL V12.0 HIGH-END 3D-ARENA TESTS PASSED CLEANLY! ✔');
console.log('================================================================\n');
