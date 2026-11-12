/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * V12.0: HIGH-END 3D-ARENA MIT UNREAL-BLOOM POST-PROCESSING,
 * DETAILLIERTER IRON-MAN-HOLOFIGUR & BUTTERWEICHEM KAMERA-LERP-SYSTEM
 * 
 * - UnrealBloomPass Post-Processing: strength 0.85, radius 0.5, threshold 0.25
 *   (Glow für Arc-Reactor, Hologramme, Neon-Stufen und Multi-Monitore)
 * - Durchgängiges 360°-Amphitheater mit 5 Schiefer-Terrassenringen (#0D1322, metalness 0.75)
 * - 6 High-Tech Server-Racks im Kreis mit animierten Multi-Color Status-LEDs
 * - Schutzbrüstung aus transparentem Cyan-Glas (transmission 0.85) mit Leucht-Handlauf
 * - Anatomisch proportionierte, imposante Iron-Man Hologramm-Figur bei (0, 1.8, 0)
 *   mit strahlend weiß/cyan leuchtenden Augen und pulsierendem Arc-Reactor
 * - Symmetrische 360°-Verteilung aller 33 Agenten (1 Zentrale + 8 Server-Spezialisten
 *   im Innenring + 24 EG-Spezialisten auf 8 High-Tech-Inseln der oberen Galerie)
 * - Butterweiches Kamera-Lerp-System via window.flyCameraTo(pos, lookAt)
 *   mit Sofort-Abbruch bei Benutzerinteraktion (pointerdown, wheel)
 */

import { STUDIO_HIERARCHY, TREVOR_AGENT_ROSTER, AGENT_ROSTER_BY_ID } from './hierarchyData.js';

const getTHREE = () => (typeof window !== 'undefined' ? window.THREE : null);

// Three.js Kernobjekte
let scene, camera, renderer, controls;
let composer = null;
let bloomPass = null;
let containerEl;
let animationFrameId = null;
let clock = null;

// Post-Processing Klassen (dynamisch oder über globales THREE)
let EffectComposerClass = null;
let RenderPassClass = null;
let UnrealBloomPassClass = null;

export const interactiveObjects = [];
export const agentMeshMap = {};
export const pcMeshMap = {};
export const chefMeshMap = {};
export const deptHudSprites = {};
const blinkingLeds = [];
const developerAvatars = [];
const connectionCurves = [];

// Screen Texturen
let codeScreenTexture = null;
let serverScreenTexture = null;

// Holo-JARVIS Iron Man Objekte
let holoJarvisGroup = null;
let holoJarvisCoreGroup = null;
let holoJarvisPoints = null;
let holoJarvisRings = [];
let holoJarvisCore = null;
let holoJarvisLight = null;
let ironManFigureGroup = null;

// Hover & Interaktion
let hoverBadgeEl = null;
let activeHighlightedHitbox = null;

// Kamera-Status & butterweiches Lerp-System (v12.0)
let currentFloor = 'EG';
let autoRotateActive = false;

// Globales Kamera-Flight-Handle
if (typeof window !== 'undefined') {
  window.cameraTargetPos = null;
  window.cameraTargetLookAt = null;
  window.isCameraFlying = false;
  window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
}

/**
 * Lädt die Three.js Post-Processing Klassen mit Fallback
 */
async function loadPostProcessingClasses() {
  if (typeof window === 'undefined') return false;

  // 1. Prüfe window.THREE globals (durch CDN-Scripts im <head>)
  const T = window.THREE;
  if (T && T.EffectComposer && T.RenderPass && T.UnrealBloomPass) {
    EffectComposerClass = T.EffectComposer;
    RenderPassClass = T.RenderPass;
    UnrealBloomPassClass = T.UnrealBloomPass;
    return true;
  }

  // 2. Prüfe globale Window-Referenzen
  if (window.EffectComposer && window.RenderPass && window.UnrealBloomPass) {
    EffectComposerClass = window.EffectComposer;
    RenderPassClass = window.RenderPass;
    UnrealBloomPassClass = window.UnrealBloomPass;
    return true;
  }

  // 3. Versuche dynamischen Import über Importmap
  try {
    const [ecMod, rpMod, ubMod] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js')
    ]);
    EffectComposerClass = ecMod.EffectComposer;
    RenderPassClass = rpMod.RenderPass;
    UnrealBloomPassClass = ubMod.UnrealBloomPass;
    return true;
  } catch (err) {
    console.warn('[Studio 3D] Post-Processing Module nicht geladen (Fallback auf Standard-Renderer):', err.message);
  }
  return false;
}

/**
 * Erzeugt dynamische Monitor-Texturen mit echtem Code- und Terminal-Look
 */
function createScreenCanvasTexture(type = 'code', colorHex = '#00F0FF') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#080d1a';
  ctx.fillRect(0, 0, 256, 160);

  // Titelleiste
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 22);

  // Fenster-Buttons
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(10, 11, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(20, 11, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(30, 11, 3.5, 0, Math.PI * 2); ctx.fill();

  if (type === 'code') {
    const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#94a3b8'];
    for (let i = 0; i < 7; i++) {
      const y = 34 + i * 16;
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, y + 2, 7, 7);

      let curX = 22;
      const numTokens = 3 + Math.floor(Math.sin(i * 1.7) * 2 + 2);
      for (let t = 0; t < numTokens; t++) {
        const w = 18 + ((i * 7 + t * 13) % 36);
        ctx.fillStyle = colors[(i + t) % colors.length];
        ctx.fillRect(curX, y + 2, w, 6);
        curX += w + 6;
        if (curX > 230) break;
      }
    }
  } else {
    // Server / Dashboard Look
    ctx.fillStyle = colorHex;
    ctx.fillRect(8, 28, 70, 20);
    ctx.fillRect(86, 28, 70, 20);
    ctx.fillRect(164, 28, 70, 20);

    for (let i = 0; i < 5; i++) {
      const y = 58 + i * 18;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fillRect(8, y, 240, 12);
      const fillW = 40 + ((i * 37) % 180);
      ctx.fillStyle = colorHex;
      ctx.fillRect(8, y, fillW, 12);
    }
  }

  const THREE = getTHREE();
  if (!THREE) return null;
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Erzeugt schwebende Sleek-HUD-Schilder für die Abteilungen mit feiner vertikaler Boden-Verbindungslinie
 */
function createSleekHudLabelSprite(text, colorHex = '#00F0FF') {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  // Glassmorphismus-Panel Hintergrund (Dunkel schieferblau)
  ctx.fillStyle = 'rgba(7, 11, 19, 0.94)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(4, 4, 412, 92, 10);
  } else {
    ctx.rect(4, 4, 412, 92);
  }
  ctx.fill();

  // Feiner 1px Akzentrahmen im Original-Look
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Äußerer Glow-Ring des Status-Dots
  ctx.fillStyle = colorHex;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(30, 50, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Kern des Status-Dots
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.arc(30, 50, 7, 0, Math.PI * 2);
  ctx.fill();

  // Typografie mit feiner Linienführung
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 56, 50);

  const THREE = getTHREE();
  if (!THREE) return new (class { constructor() { this.position = { set: () => {} }; } })();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    depthTest: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3.4, 0.82, 1);
  return sprite;
}

/**
 * HAUPTINITIALISIERUNG DES 3D-STUDIOS (v12.0)
 */
export async function init3DStudio(hierarchyDataParam, onAgentClick, onTrevorClick) {
  const THREE_LIB = getTHREE();
  if (!THREE_LIB) {
    console.error('[Studio 3D] Three.js nicht im globalen Scope gefunden!');
    return;
  }

  containerEl = document.getElementById('threejs-canvas-container');
  if (!containerEl) {
    console.warn('[Studio 3D] #threejs-canvas-container nicht im DOM gefunden.');
    return;
  }

  // Bestehenden Renderer bereinigen
  while (containerEl.firstChild) {
    if (containerEl.firstChild.id === 'agent-info-panel') break;
    containerEl.removeChild(containerEl.firstChild);
  }

  clock = new THREE_LIB.Clock();
  codeScreenTexture = createScreenCanvasTexture('code');
  serverScreenTexture = createScreenCanvasTexture('server');

  // 1. SZENE & KAMERA
  scene = new THREE_LIB.Scene();
  scene.background = new THREE_LIB.Color(0x0B101B);
  scene.fog = new THREE_LIB.FogExp2(0x0B101B, 0.012);

  const aspect = containerEl.clientWidth / (containerEl.clientHeight || 1);
  camera = new THREE_LIB.PerspectiveCamera(45, aspect, 0.1, 250);

  // Exakte Standard-Kameraposition laut Spezifikation: (0, 15, 19) bzw. (0, 14, 21)
  camera.position.set(0, 15, 19);
  camera.lookAt(0, 1.0, 0);

  // 2. WEBGL RENDERER MIT METALLIC-TONEMAPPING
  renderer = new THREE_LIB.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE_LIB.PCFSoftShadowMap;
  if (THREE_LIB.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE_LIB.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  }
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  containerEl.insertBefore(renderer.domElement, containerEl.firstChild);

  // 3. ORBIT CONTROLS MIT WEICHEM DAMPING
  if (THREE_LIB.OrbitControls) {
    controls = new THREE_LIB.OrbitControls(camera, renderer.domElement);
  } else if (window.THREE && window.THREE.OrbitControls) {
    controls = new window.THREE.OrbitControls(camera, renderer.domElement);
  }

  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.7;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 4;
    controls.maxDistance = 90;
    controls.target.set(0, 1.0, 0);
  }

  // 4. POST-PROCESSING: UNREALBLOOMPASS AKTIVIEREN
  await loadPostProcessingClasses();

  if (EffectComposerClass && RenderPassClass && UnrealBloomPassClass) {
    try {
      const renderPass = new RenderPassClass(scene, camera);
      bloomPass = new UnrealBloomPassClass(
        new THREE_LIB.Vector2(containerEl.clientWidth, containerEl.clientHeight),
        0.85, // strength
        0.5,  // radius
        0.25  // threshold
      );
      composer = new EffectComposerClass(renderer);
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      console.log('[Studio 3D] UnrealBloomPass aktiviert: strength=0.85, radius=0.5, threshold=0.25');
    } catch (err) {
      console.warn('[Studio 3D] Post-Processing Setup übersprungen:', err.message);
      composer = null;
      bloomPass = null;
    }
  }

  // 5. BELEUCHTUNG
  setupLighting(THREE_LIB);

  // 6. 5-STUFIGE KONZENTRISCHE AMPHITHEATER-ARENA MIT RADIALEN LICHTFUGEN
  setupConcentricTerraceArena(THREE_LIB);

  // 7. DETAILLIERTE IRON-MAN-HOLOFIGUR (J.A.R.V.I.S.) BEI (0, 1.8, 0)
  setupHolographicIronManFigure(THREE_LIB);

  // 8. ARBEITSPLÄTZE & ABTEILUNGEN: ALLE 33 AGENTEN IM 360°-KREIS VERTEILEN
  setupArenaWorkstations(THREE_LIB, hierarchyDataParam || STUDIO_HIERARCHY);

  // 9. RAYCASTING, HOVER-SPRECHBLASE & KLICK-INTERAKTION
  setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick);

  // 10. SOFORT-ABBRUCH BEI BENUTZER-EINGRIFF (POINTERDOWN / WHEEL)
  const cancelCameraFlight = () => {
    if (window.isCameraFlying) {
      window.isCameraFlying = false;
      window.cameraTargetPos = null;
      window.cameraTargetLookAt = null;
    }
  };
  renderer.domElement.addEventListener('pointerdown', cancelCameraFlight, { passive: true });
  renderer.domElement.addEventListener('wheel', cancelCameraFlight, { passive: true });

  // 11. RESIZE-OBSERVER
  window.addEventListener('resize', onWindowResize);
  if (window.ResizeObserver) {
    new ResizeObserver(() => onWindowResize()).observe(containerEl);
  }

  // 12. 60-FPS ANIMATIONS-LOOP STARTEN
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  animate();
  console.log(`[Studio 3D] v12.0 High-End Rebuild erfolgreich: 33 Agenten in 360°-Amphitheater registriert!`);
}

/**
 * Beleuchtung: Schieferblaues Umgebungslicht, Keylight & Center Glow
 */
function setupLighting(THREE_LIB) {
  const ambient = new THREE_LIB.AmbientLight(0x1E293B, 0.85);
  scene.add(ambient);

  const keyLight = new THREE_LIB.DirectionalLight(0xE2E8F0, 1.4);
  keyLight.position.set(16, 26, 18);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.camera.left = -20;
  keyLight.shadow.camera.right = 20;
  keyLight.shadow.camera.top = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE_LIB.DirectionalLight(0x00F0FF, 0.65);
  fillLight.position.set(-18, 14, -14);
  scene.add(fillLight);

  const centerPoint = new THREE_LIB.PointLight(0x00F0FF, 3.2, 28);
  centerPoint.position.set(0, 2.5, 0);
  scene.add(centerPoint);
}

/**
 * 5-stufiges konzentrisches Amphitheater mit radialen Lichtfugen und gläserner Server-Senke
 */
function setupConcentricTerraceArena(THREE_LIB) {
  // A. ÄUSSERE GALERIE (Radius 16.5, flach auf y = 1.20)
  const egFloorGeo = new THREE_LIB.CylinderGeometry(16.5, 16.5, 0.2, 64);
  const egFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0D1322,
    roughness: 0.25,
    metalness: 0.75
  });
  const egFloor = new THREE_LIB.Mesh(egFloorGeo, egFloorMat);
  egFloor.position.y = 1.1;
  egFloor.receiveShadow = true;
  scene.add(egFloor);

  // Äußerer feiner Neon-Lichtring (r = 16.3 auf y = 1.22)
  const outerRingGeo = new THREE_LIB.TorusGeometry(16.3, 0.045, 8, 64);
  const outerRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const outerRing = new THREE_LIB.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 1.22;
  scene.add(outerRing);

  // B. RADIALE LICHTFUGEN AM BODEN (12 Linien vom Zentrum zur Außenkante)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const lineGeo = new THREE_LIB.PlaneGeometry(0.04, 5.5);
    const lineMat = new THREE_LIB.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.45,
      side: THREE_LIB.DoubleSide
    });
    const lineMesh = new THREE_LIB.Mesh(lineGeo, lineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.rotation.z = angle;
    lineMesh.position.set(Math.cos(angle) * 13.5, 1.21, Math.sin(angle) * 13.5);
    scene.add(lineMesh);
  }

  // C. INNERER ARENA-RING (ZENTRALE SERVER-SENKE: RADIUS 5.8, HÖHE y = 0.0)
  const innerFloorGeo = new THREE_LIB.CylinderGeometry(5.8, 5.8, 0.2, 48);
  const innerFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x070B14,
    roughness: 0.25,
    metalness: 0.85
  });
  const innerFloor = new THREE_LIB.Mesh(innerFloorGeo, innerFloorMat);
  innerFloor.position.y = -0.1;
  innerFloor.receiveShadow = true;
  scene.add(innerFloor);

  // Feiner Bodenring im Becken (r = 5.7)
  const pitRimGeo = new THREE_LIB.TorusGeometry(5.7, 0.035, 8, 48);
  const pitRimMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const pitRim = new THREE_LIB.Mesh(pitRimGeo, pitRimMat);
  pitRim.rotation.x = Math.PI / 2;
  pitRim.position.y = 0.02;
  scene.add(pitRim);

  // D. 5 KONZENTRISCHE AMPHITHEATER-STUFEN (r = 5.8 bis 10.8, ansteigend von y = 0.0 bis y = 1.20)
  const stepCount = 5;
  const innerR = 5.8;
  const outerR = 10.8;
  for (let i = 0; i < stepCount; i++) {
    const t = i / stepCount;
    const rCurrent = innerR + t * (outerR - innerR);
    const rNext = rCurrent + (outerR - innerR) / stepCount;
    const yStep = (i + 1) * 0.24; // 0.24, 0.48, 0.72, 0.96, 1.20

    const ringGeo = new THREE_LIB.RingGeometry(rCurrent, rNext, 48);
    const ringMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0D1322,
      roughness: 0.25,
      metalness: 0.75,
      side: THREE_LIB.DoubleSide
    });
    const stepMesh = new THREE_LIB.Mesh(ringGeo, ringMat);
    stepMesh.rotation.x = -Math.PI / 2;
    stepMesh.position.y = yStep;
    stepMesh.receiveShadow = true;
    scene.add(stepMesh);

    // Cyan & Gold leuchtende Lichtkante an jeder Stufe
    const edgeCol = (i % 2 === 0) ? 0x00F0FF : 0xF59E0B;
    const edgeGeo = new THREE_LIB.TorusGeometry(rNext, 0.028, 6, 48);
    const edgeMat = new THREE_LIB.MeshBasicMaterial({ color: edgeCol });
    const edge = new THREE_LIB.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = yStep + 0.01;
    scene.add(edge);
  }

  // E. GLÄSERNE SCHUTZBRÜSTUNG MIT LEUCHTENDEM CYAN-HANDLAUF (r = 5.8, Höhe 0.75)
  const glassGeo = new THREE_LIB.CylinderGeometry(5.8, 5.8, 0.75, 48, 1, true);
  const glassMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.40,
    roughness: 0.1,
    transmission: 0.85,
    thickness: 0.15,
    side: THREE_LIB.DoubleSide
  });
  const glassRail = new THREE_LIB.Mesh(glassGeo, glassMat);
  glassRail.position.y = 0.375;
  scene.add(glassRail);

  // Metallener Cyan-Handlauf oben auf der Brüstung
  const handrailGeo = new THREE_LIB.TorusGeometry(5.8, 0.038, 8, 48);
  const handrailMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x00F0FF,
    emissive: 0x00F0FF,
    emissiveIntensity: 0.4,
    metalness: 0.9,
    roughness: 0.2
  });
  const handrail = new THREE_LIB.Mesh(handrailGeo, handrailMat);
  handrail.rotation.x = Math.PI / 2;
  handrail.position.y = 0.75;
  scene.add(handrail);

  // F. 6 HOHE HIGH-TECH SERVER-SCHRÄNKE IM KREIS
  setupServerRacksInCenterRing(THREE_LIB);
}

/**
 * 6 Server-Racks im Kreis (Radius 2.2) mit animierten Status-LEDs
 */
function setupServerRacksInCenterRing(THREE_LIB) {
  const rackCount = 6;
  const radius = 2.2;

  for (let i = 0; i < rackCount; i++) {
    const angle = (i / rackCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const rackGroup = new THREE_LIB.Group();
    rackGroup.position.set(x, 0.0, z);
    rackGroup.lookAt(0, 0.0, 0);

    // Schrank-Gehäuse
    const housingGeo = new THREE_LIB.BoxGeometry(0.75, 1.6, 0.58);
    const housingMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0A0F1D,
      roughness: 0.25,
      metalness: 0.9
    });
    const housing = new THREE_LIB.Mesh(housingGeo, housingMat);
    housing.position.y = 0.8;
    rackGroup.add(housing);

    // Front-Glasplatte
    const frontGeo = new THREE_LIB.BoxGeometry(0.68, 1.48, 0.04);
    const frontMat = new THREE_LIB.MeshPhysicalMaterial({
      color: 0x00F0FF,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.7,
      transparent: true,
      opacity: 0.35
    });
    const frontMesh = new THREE_LIB.Mesh(frontGeo, frontMat);
    frontMesh.position.set(0, 0.8, 0.3);
    rackGroup.add(frontMesh);

    // Animierte vertikale LED-Reihen
    const ledCols = [0x00F0FF, 0x10B981, 0xF59E0B];
    for (let r = 0; r < 5; r++) {
      const ledGeo = new THREE_LIB.BoxGeometry(0.045, 0.035, 0.03);
      const ledMat = new THREE_LIB.MeshBasicMaterial({
        color: ledCols[r % ledCols.length],
        transparent: true,
        opacity: 0.9
      });
      const ledLeft = new THREE_LIB.Mesh(ledGeo, ledMat);
      ledLeft.position.set(-0.24, 0.35 + r * 0.22, 0.31);
      rackGroup.add(ledLeft);

      blinkingLeds.push({
        mesh: ledLeft,
        freq: 1.5 + (i * 0.7 + r * 0.5),
        phase: (i + r) * 0.8
      });

      const ledMatRight = (typeof ledMat.clone === 'function')
        ? ledMat.clone()
        : new THREE_LIB.MeshBasicMaterial({ color: ledCols[r % ledCols.length], transparent: true, opacity: 0.9 });
      const ledRight = new THREE_LIB.Mesh(ledGeo, ledMatRight);
      ledRight.position.set(0.24, 0.35 + r * 0.22, 0.31);
      rackGroup.add(ledRight);

      blinkingLeds.push({
        mesh: ledRight,
        freq: 2.1 + (i * 0.5 + r * 0.6),
        phase: (i + r + 1) * 0.6
      });
    }

    scene.add(rackGroup);
  }
}

/**
 * Hochdetaillierte Iron-Man-Hologramm-Figur (J.A.R.V.I.S.) im Zentrum bei (0, 1.8, 0)
 */
function setupHolographicIronManFigure(THREE_LIB) {
  holoJarvisGroup = new THREE_LIB.Group();
  holoJarvisGroup.position.set(0, 1.8, 0);

  holoJarvisCoreGroup = new THREE_LIB.Group();
  holoJarvisGroup.add(holoJarvisCoreGroup);

  // Hologramm-Materialien mit AdditiveBlending
  const holoColor = 0x00F0FF;
  const armorMat = new THREE_LIB.MeshPhysicalMaterial({
    color: holoColor,
    roughness: 0.15,
    metalness: 0.3,
    transmission: 0.75,
    transparent: true,
    opacity: 0.72,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false,
    side: THREE_LIB.DoubleSide
  });

  const wireMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x80FFFF,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE_LIB.AdditiveBlending
  });

  const goldAccentMat = new THREE_LIB.MeshBasicMaterial({
    color: 0xF59E0B,
    transparent: true,
    opacity: 0.8,
    blending: THREE_LIB.AdditiveBlending
  });

  const coreGlowMat = new THREE_LIB.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.98
  });

  ironManFigureGroup = new THREE_LIB.Group();

  // A. HELM & KOPF (Markante Maske mit leuchtendem Visier)
  const helmetGroup = new THREE_LIB.Group();
  helmetGroup.position.y = 1.15;

  const headGeo = new THREE_LIB.BoxGeometry(0.34, 0.40, 0.36);
  const headMesh = new THREE_LIB.Mesh(headGeo, armorMat);
  helmetGroup.add(headMesh);
  const headWire = new THREE_LIB.Mesh(headGeo, wireMat);
  helmetGroup.add(headWire);

  // Strahlendes Visier (Leuchtende Augen)
  const visorGeo = new THREE_LIB.BoxGeometry(0.24, 0.045, 0.07);
  const visorMesh = new THREE_LIB.Mesh(visorGeo, coreGlowMat);
  visorMesh.position.set(0, 0.02, 0.185);
  helmetGroup.add(visorMesh);

  // Goldene Stirnplatte
  const browGeo = new THREE_LIB.BoxGeometry(0.28, 0.09, 0.04);
  const browMesh = new THREE_LIB.Mesh(browGeo, goldAccentMat);
  browMesh.position.set(0, 0.13, 0.182);
  helmetGroup.add(browMesh);

  // Kinn- und Wangenpanzerung
  const jawGeo = new THREE_LIB.ConeGeometry(0.2, 0.18, 4);
  const jawMesh = new THREE_LIB.Mesh(jawGeo, armorMat);
  jawMesh.rotation.x = Math.PI;
  jawMesh.position.set(0, -0.23, 0.06);
  helmetGroup.add(jawMesh);

  ironManFigureGroup.add(helmetGroup);

  // B. BRUSTKORB & TORSO
  const chestGroup = new THREE_LIB.Group();
  chestGroup.position.y = 0.65;

  const chestGeo = new THREE_LIB.BoxGeometry(0.62, 0.54, 0.38);
  const chestMesh = new THREE_LIB.Mesh(chestGeo, armorMat);
  chestGroup.add(chestMesh);
  const chestWire = new THREE_LIB.Mesh(chestGeo, wireMat);
  chestGroup.add(chestWire);

  // Goldene Brustplatten
  const pecGeo = new THREE_LIB.BoxGeometry(0.25, 0.23, 0.08);
  const pecLeft = new THREE_LIB.Mesh(pecGeo, goldAccentMat);
  pecLeft.position.set(-0.15, 0.11, 0.20);
  pecLeft.rotation.z = -0.12;
  chestGroup.add(pecLeft);

  const pecRight = new THREE_LIB.Mesh(pecGeo, goldAccentMat);
  pecRight.position.set(0.15, 0.11, 0.20);
  pecRight.rotation.z = 0.12;
  chestGroup.add(pecRight);

  // PULSIERENDER ARC-REACTOR IM BRUSTZENTRUM
  const arcOuterGeo = new THREE_LIB.CylinderGeometry(0.10, 0.10, 0.045, 24);
  const arcOuterMesh = new THREE_LIB.Mesh(arcOuterGeo, goldAccentMat);
  arcOuterMesh.rotation.x = Math.PI / 2;
  arcOuterMesh.position.set(0, 0.09, 0.20);
  chestGroup.add(arcOuterMesh);

  const arcMidGeo = new THREE_LIB.CylinderGeometry(0.08, 0.08, 0.05, 24);
  const arcMidMesh = new THREE_LIB.Mesh(arcMidGeo, new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF }));
  arcMidMesh.rotation.x = Math.PI / 2;
  arcMidMesh.position.set(0, 0.09, 0.21);
  chestGroup.add(arcMidMesh);

  const arcCoreGeo = new THREE_LIB.CylinderGeometry(0.065, 0.065, 0.06, 24);
  holoJarvisCore = new THREE_LIB.Mesh(arcCoreGeo, coreGlowMat);
  holoJarvisCore.rotation.x = Math.PI / 2;
  holoJarvisCore.position.set(0, 0.09, 0.22);
  holoJarvisCore.userData = {
    type: 'holo_jarvis',
    name: 'J.A.R.V.I.S. Core',
    description: 'Holographischer Studio-Assistent & KI-Kern'
  };
  chestGroup.add(holoJarvisCore);
  interactiveObjects.push(holoJarvisCore);

  // PointLight im Arc-Reactor für Bloom-Leuchteffekt
  holoJarvisLight = new THREE_LIB.PointLight(0x00F0FF, 3.8, 14);
  holoJarvisLight.position.set(0, 0.09, 0.35);
  chestGroup.add(holoJarvisLight);

  ironManFigureGroup.add(chestGroup);

  // C. SCHULTERN & OBERARME
  const shoulderGeo = new THREE_LIB.SphereGeometry(0.18, 16, 16);
  const shoulderLeft = new THREE_LIB.Mesh(shoulderGeo, armorMat);
  shoulderLeft.position.set(-0.46, 0.85, 0);
  shoulderLeft.scale.set(1.2, 0.85, 1);
  ironManFigureGroup.add(shoulderLeft);

  const shoulderRight = new THREE_LIB.Mesh(shoulderGeo, armorMat);
  shoulderRight.position.set(0.46, 0.85, 0);
  shoulderRight.scale.set(1.2, 0.85, 1);
  ironManFigureGroup.add(shoulderRight);

  // Arm-Segmente
  const armGeo = new THREE_LIB.CylinderGeometry(0.10, 0.08, 0.52, 12);
  const armLeft = new THREE_LIB.Mesh(armGeo, armorMat);
  armLeft.position.set(-0.52, 0.48, 0.08);
  armLeft.rotation.z = 0.28;
  armLeft.rotation.x = -0.22;
  ironManFigureGroup.add(armLeft);

  const armRight = new THREE_LIB.Mesh(armGeo, armorMat);
  armRight.position.set(0.52, 0.48, 0.08);
  armRight.rotation.z = -0.28;
  armRight.rotation.x = -0.22;
  ironManFigureGroup.add(armRight);

  // D. HORIZONTALE HOLOGRAMM-SCAN-SCHICHTEN (10 Discs)
  for (let s = 0; s < 10; s++) {
    const scanGeo = new THREE_LIB.CylinderGeometry(0.42 - Math.abs(s - 5) * 0.035, 0.42 - Math.abs(s - 5) * 0.035, 0.015, 24);
    const scanMat = new THREE_LIB.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.25 + (s % 2) * 0.15,
      blending: THREE_LIB.AdditiveBlending
    });
    const scanMesh = new THREE_LIB.Mesh(scanGeo, scanMat);
    scanMesh.position.y = 0.2 + s * 0.13;
    ironManFigureGroup.add(scanMesh);
  }

  holoJarvisCoreGroup.add(ironManFigureGroup);

  // E. ROTIERENDE HOLOGRAMM-RINGE UM DIE FIGUR
  holoJarvisRings = [];
  const ringConfigs = [
    { r: 1.15, tube: 0.018, rotX: Math.PI / 2, color: 0x00F0FF, speed: 0.6 },
    { r: 1.35, tube: 0.015, rotX: Math.PI / 3, color: 0xF59E0B, speed: -0.45 },
    { r: 1.55, tube: 0.012, rotX: -Math.PI / 4, color: 0x00F0FF, speed: 0.3 }
  ];

  ringConfigs.forEach(cfg => {
    const rGeo = new THREE_LIB.TorusGeometry(cfg.r, cfg.tube, 8, 48);
    const rMat = new THREE_LIB.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.7,
      blending: THREE_LIB.AdditiveBlending
    });
    const ringMesh = new THREE_LIB.Mesh(rGeo, rMat);
    ringMesh.rotation.x = cfg.rotX;
    ringMesh.userData = { speed: cfg.speed };
    holoJarvisCoreGroup.add(ringMesh);
    holoJarvisRings.push(ringMesh);
  });

  // F. PARTIKEL-AURA (2500 Partikel)
  const pCount = 2500;
  const pGeo = new THREE_LIB.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const rad = 0.85 + Math.random() * 0.95;
    pPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    pPos[i * 3 + 1] = rad * Math.cos(phi) + 0.65;
    pPos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
  }
  pGeo.setAttribute('position', new THREE_LIB.BufferAttribute(pPos, 3));
  const pMat = new THREE_LIB.PointsMaterial({
    color: 0x00F0FF,
    size: 0.045,
    transparent: true,
    opacity: 0.75,
    blending: THREE_LIB.AdditiveBlending
  });
  holoJarvisPoints = new THREE_LIB.Points(pGeo, pMat);
  holoJarvisCoreGroup.add(holoJarvisPoints);

  scene.add(holoJarvisGroup);
}

/**
 * Baut alle 33 Agenten in symmetrischer 360°-Amphitheater-Anordnung auf
 */
function setupArenaWorkstations(THREE_LIB, hierarchyData) {
  // Maps leeren
  Object.keys(agentMeshMap).forEach(k => delete agentMeshMap[k]);
  Object.keys(pcMeshMap).forEach(k => delete pcMeshMap[k]);
  Object.keys(chefMeshMap).forEach(k => delete chefMeshMap[k]);
  interactiveObjects.length = 0;

  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = [];
  }

  if (holoJarvisCore) interactiveObjects.push(holoJarvisCore);

  // 1. ZENTRALE: TREVOR (ag_01) Studio Director bei y = 0.0 vor dem Holo-Projektor
  setupTrevorCommandStation(THREE_LIB);

  // 2. INNENRING (y = 0.0): UG_SERVER (Ilja [LEAD] + 7 Spezialisten) kreisförmig um die Server-Racks
  setupServerSector(THREE_LIB);

  // 3. OBERE GALERIE (y = 1.20, r = 11.5..13.5): 24 EG-Agenten auf 8 High-Tech-Inseln im 360°-Kreis
  setupArchitectureSectors(THREE_LIB);
  setupFrontendSectors(THREE_LIB);
  setupBackendSectors(THREE_LIB);

  // 4. SICHTBARE NETZWERK- & DATENFÄDEN (CONSTELLATION LINES)
  setupConstellationNetwork(THREE_LIB);

  console.log(`[Studio 3D] Workstations aufgebaut: ${window.interactiveAgentMeshes.length} Agenten registriert`);
}

/**
 * ZENTRALE: Trevor (ag_01) Studio Director
 */
function setupTrevorCommandStation(THREE_LIB) {
  const trevorAgent = AGENT_ROSTER_BY_ID['ag_01'] || TREVOR_AGENT_ROSTER[0];
  const trevorGroup = new THREE_LIB.Group();
  trevorGroup.position.set(0, 0.0, 2.4);
  trevorGroup.lookAt(0, 0.0, 0); // Blick nach Norden zum Holo-JARVIS
  trevorGroup.scale.set(1.5, 1.5, 1.5);
  trevorGroup.visible = true;

  // Gebogener Metallic Command Desk
  const deskGeo = new THREE_LIB.BoxGeometry(1.4, 0.58, 0.7);
  const deskMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0F172A,
    roughness: 0.25,
    metalness: 0.8
  });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.29;
  trevorGroup.add(desk);

  // Ultrawide Curved Monitor
  const screenGeo = new THREE_LIB.BoxGeometry(0.88, 0.42, 0.035);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0F172A,
    emissive: 0x00F0FF,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    map: serverScreenTexture || null
  });
  const screen = new THREE_LIB.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.78, 0.08);

  const trevorUserData = {
    type: 'agent',
    agentId: 'ag_01',
    chefId: 'ag_01',
    isLead: true,
    name: trevorAgent.name,
    role: trevorAgent.role,
    department: 'ZENTRALE',
    deptCode: 'CENTER_CORE',
    status: 'Bereit',
    currentTask: null,
    idleThought: trevorAgent.idleThought || 'Koordiniere alle 33 Agenten...',
    easy_explanation: trevorAgent.easy_explanation
  };
  screen.userData = trevorUserData;
  trevorGroup.add(screen);

  // Beleuchtete Tastatur
  const kbGeo = new THREE_LIB.PlaneGeometry(0.5, 0.2);
  const kbMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.7 });
  const kb = new THREE_LIB.Mesh(kbGeo, kbMat);
  kb.rotation.x = -Math.PI / 2;
  kb.position.set(0, 0.585, 0.2);
  trevorGroup.add(kb);

  // Trevor Avatar mit Arc-Reactor
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, '#00F0FF', true, true);
  avatar.position.set(0, 0.2, 0.52);
  avatar.userData = trevorUserData;
  trevorGroup.add(avatar);

  // Status-Sphäre
  const orbGeo = new THREE_LIB.SphereGeometry(0.045, 16, 16);
  const orbMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const orb = new THREE_LIB.Mesh(orbGeo, orbMat);
  orb.position.set(0.48, 0.62, 0.2);
  trevorGroup.add(orb);

  // Boden-Highlight-Ring
  const hlGeo = new THREE_LIB.TorusGeometry(0.85, 0.03, 8, 32);
  const hlMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.85 });
  const hlRing = new THREE_LIB.Mesh(hlGeo, hlMat);
  hlRing.rotation.x = Math.PI / 2;
  hlRing.position.y = 0.02;
  hlRing.visible = false;
  trevorGroup.add(hlRing);

  // Zylinder-Hitbox
  const hitboxGeo = new THREE_LIB.CylinderGeometry(0.85, 0.85, 1.8, 16);
  const hitboxMat = new THREE_LIB.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE_LIB.Mesh(hitboxGeo, hitboxMat);
  hitbox.position.y = 0.9;
  hitbox.userData = {
    ...trevorUserData,
    highlightRing: hlRing,
    headPos: new THREE_LIB.Vector3(0, 1.45 * 1.5, 2.4)
  };
  trevorGroup.add(hitbox);

  const entry = {
    agent: trevorAgent,
    group: trevorGroup,
    mesh: screen,
    screen,
    screens: [screen],
    avatar,
    hitbox,
    isLead: true
  };
  agentMeshMap['ag_01'] = entry;
  chefMeshMap['ag_01'] = entry;

  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
    window.interactiveAgentMeshes.push(hitbox);
  }
  interactiveObjects.push(hitbox);
  interactiveObjects.push(screen);

  scene.add(trevorGroup);
}

/**
 * INNENRING (y = 0.0): UG_SERVER (Ilja ag_26 [LEAD] + 7 Spezialisten ag_27..ag_33)
 */
function setupServerSector(THREE_LIB) {
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(0, 0.0, 0);

  const hudSprite = createSleekHudLabelSprite('UG_SERVER · Infrastruktur & Security', '#F59E0B');
  hudSprite.position.set(0, 2.0, -4.8);
  sectorGroup.add(hudSprite);
  deptHudSprites[12] = hudSprite;

  // Feine vertikale Verbindungslinie zum Sektor-Boden
  const stemGeo = new THREE_LIB.BufferGeometry().setFromPoints([
    new THREE_LIB.Vector3(0, 0.0, -4.8),
    new THREE_LIB.Vector3(0, 1.7, -4.8)
  ]);
  const stemMat = new THREE_LIB.LineBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.65 });
  const stemLine = new THREE_LIB.Line(stemGeo, stemMat);
  sectorGroup.add(stemLine);

  // Ilja [LEAD] (ag_26) bei x=0, z=-4.6
  const ilja = AGENT_ROSTER_BY_ID['ag_26'];
  const leadDesk = createLeadWorkstation(THREE_LIB, ilja, '#F59E0B', new THREE_LIB.Vector3(0, 0.0, -4.6));
  leadDesk.lookAt(0, 0.0, 0);
  sectorGroup.add(leadDesk);

  // 7 Server-Spezialisten kreisförmig im Innenring (r = 4.2 .. 4.8)
  const serverSpecialists = [
    { spec: AGENT_ROSTER_BY_ID['ag_27'], pos: new THREE_LIB.Vector3(-2.3, 0.0, -3.9) }, // Milan
    { spec: AGENT_ROSTER_BY_ID['ag_28'], pos: new THREE_LIB.Vector3(2.3, 0.0, -3.9) },  // Freya
    { spec: AGENT_ROSTER_BY_ID['ag_29'], pos: new THREE_LIB.Vector3(-4.2, 0.0, -1.9) }, // Anton
    { spec: AGENT_ROSTER_BY_ID['ag_30'], pos: new THREE_LIB.Vector3(4.2, 0.0, -1.9) },  // Kian
    { spec: AGENT_ROSTER_BY_ID['ag_31'], pos: new THREE_LIB.Vector3(-4.3, 0.0, 1.8) },  // Nora
    { spec: AGENT_ROSTER_BY_ID['ag_32'], pos: new THREE_LIB.Vector3(4.3, 0.0, 1.8) },   // Rico
    { spec: AGENT_ROSTER_BY_ID['ag_33'], pos: new THREE_LIB.Vector3(-2.8, 0.0, 3.6) }   // Yuna
  ];

  serverSpecialists.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#F59E0B', item.pos);
    ws.lookAt(0, 0.0, 0);
    sectorGroup.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(0, 0.2, -4.6), new THREE_LIB.Vector3(0, 1.8, 0), '#F59E0B');
  scene.add(sectorGroup);
}

/**
 * OBERE GALERIE (y = 1.20): EG_ARCHITEKTUR (Marcus ag_02 [LEAD] + 7 Spezialisten ag_03..ag_09)
 * Verteilt auf 3 symmetrische Inseln im Nord-West- & Nord-Sektor
 */
function setupArchitectureSectors(THREE_LIB) {
  const group = new THREE_LIB.Group();

  const hudSprite = createSleekHudLabelSprite('EG_ARCHITEKTUR · Planung & Konzept', '#38BDF8');
  hudSprite.position.set(-6.5, 3.2, -9.5);
  group.add(hudSprite);
  deptHudSprites[2] = hudSprite;

  // Feine vertikale Verbindungslinie zum Sektor-Boden
  const stemGeo = new THREE_LIB.BufferGeometry().setFromPoints([
    new THREE_LIB.Vector3(-6.5, 1.2, -9.5),
    new THREE_LIB.Vector3(-6.5, 2.8, -9.5)
  ]);
  const stemMat = new THREE_LIB.LineBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.65 });
  const stemLine = new THREE_LIB.Line(stemGeo, stemMat);
  group.add(stemLine);

  // Marcus [LEAD] (ag_02)
  const marcus = AGENT_ROSTER_BY_ID['ag_02'];
  const leadDesk = createLeadWorkstation(THREE_LIB, marcus, '#38BDF8', new THREE_LIB.Vector3(-11.0, 1.2, -4.0));
  leadDesk.lookAt(0, 1.2, 0);
  group.add(leadDesk);

  // Spezialisten
  const archSpecs = [
    { spec: AGENT_ROSTER_BY_ID['ag_03'], pos: new THREE_LIB.Vector3(-11.8, 1.2, -2.4) }, // Selin
    { spec: AGENT_ROSTER_BY_ID['ag_04'], pos: new THREE_LIB.Vector3(-8.5, 1.2, -8.5) },   // Viktor
    { spec: AGENT_ROSTER_BY_ID['ag_05'], pos: new THREE_LIB.Vector3(-9.8, 1.2, -7.2) },   // Mira
    { spec: AGENT_ROSTER_BY_ID['ag_06'], pos: new THREE_LIB.Vector3(-7.2, 1.2, -9.8) },   // Leo
    { spec: AGENT_ROSTER_BY_ID['ag_07'], pos: new THREE_LIB.Vector3(-2.2, 1.2, -12.0) },  // Nadia
    { spec: AGENT_ROSTER_BY_ID['ag_08'], pos: new THREE_LIB.Vector3(-3.8, 1.2, -11.5) },  // Henrik
    { spec: AGENT_ROSTER_BY_ID['ag_09'], pos: new THREE_LIB.Vector3(-0.6, 1.2, -12.2) }   // Clara
  ];

  archSpecs.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#38BDF8', item.pos);
    ws.lookAt(0, 1.2, 0);
    group.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-6.5, 1.4, -9.5), new THREE_LIB.Vector3(0, 1.8, 0), '#38BDF8');
  scene.add(group);
}

/**
 * OBERE GALERIE (y = 1.20): EG_FRONTEND (Daria ag_10 [LEAD] + 7 Spezialisten ag_11..ag_17)
 * Verteilt auf 3 symmetrische Inseln im Nord-Ost- & Ost-Sektor
 */
function setupFrontendSectors(THREE_LIB) {
  const group = new THREE_LIB.Group();

  const hudSprite = createSleekHudLabelSprite('EG_FRONTEND · 3D Canvas & UI/UX', '#00F0FF');
  hudSprite.position.set(7.5, 3.2, -7.5);
  group.add(hudSprite);
  deptHudSprites[3] = hudSprite;

  // Feine vertikale Verbindungslinie zum Sektor-Boden
  const stemGeo = new THREE_LIB.BufferGeometry().setFromPoints([
    new THREE_LIB.Vector3(7.5, 1.2, -7.5),
    new THREE_LIB.Vector3(7.5, 2.8, -7.5)
  ]);
  const stemMat = new THREE_LIB.LineBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.65 });
  const stemLine = new THREE_LIB.Line(stemGeo, stemMat);
  group.add(stemLine);

  // Daria [LEAD] (ag_10)
  const daria = AGENT_ROSTER_BY_ID['ag_10'];
  const leadDesk = createLeadWorkstation(THREE_LIB, daria, '#00F0FF', new THREE_LIB.Vector3(5.2, 1.2, -11.0));
  leadDesk.lookAt(0, 1.2, 0);
  group.add(leadDesk);

  // Spezialisten
  const feSpecs = [
    { spec: AGENT_ROSTER_BY_ID['ag_11'], pos: new THREE_LIB.Vector3(3.6, 1.2, -11.6) }, // Liam
    { spec: AGENT_ROSTER_BY_ID['ag_12'], pos: new THREE_LIB.Vector3(9.8, 1.2, -7.0) },  // Maya
    { spec: AGENT_ROSTER_BY_ID['ag_13'], pos: new THREE_LIB.Vector3(11.2, 1.2, -5.0) }, // Noah
    { spec: AGENT_ROSTER_BY_ID['ag_14'], pos: new THREE_LIB.Vector3(8.5, 1.2, -8.5) },  // Zoe
    { spec: AGENT_ROSTER_BY_ID['ag_15'], pos: new THREE_LIB.Vector3(12.2, 1.2, -1.2) }, // Finn
    { spec: AGENT_ROSTER_BY_ID['ag_16'], pos: new THREE_LIB.Vector3(12.0, 1.2, 0.8) },  // Lea
    { spec: AGENT_ROSTER_BY_ID['ag_17'], pos: new THREE_LIB.Vector3(11.5, 1.2, 2.8) }   // Ben
  ];

  feSpecs.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#00F0FF', item.pos);
    ws.lookAt(0, 1.2, 0);
    group.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(7.5, 1.4, -7.5), new THREE_LIB.Vector3(0, 1.8, 0), '#00F0FF');
  scene.add(group);
}

/**
 * OBERE GALERIE (y = 1.20): EG_BACKEND (David ag_18 [LEAD] + 7 Spezialisten ag_19..ag_25)
 * Verteilt auf 2 symmetrische Inseln im Süd-West- & West-Sektor
 */
function setupBackendSectors(THREE_LIB) {
  const group = new THREE_LIB.Group();

  const hudSprite = createSleekHudLabelSprite('EG_BACKEND · Server & Logik', '#10B981');
  hudSprite.position.set(-8.5, 3.2, 8.5);
  group.add(hudSprite);
  deptHudSprites[5] = hudSprite;

  // Feine vertikale Verbindungslinie zum Sektor-Boden
  const stemGeo = new THREE_LIB.BufferGeometry().setFromPoints([
    new THREE_LIB.Vector3(-8.5, 1.2, 8.5),
    new THREE_LIB.Vector3(-8.5, 2.8, 8.5)
  ]);
  const stemMat = new THREE_LIB.LineBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0.65 });
  const stemLine = new THREE_LIB.Line(stemGeo, stemMat);
  group.add(stemLine);

  // David [LEAD] (ag_18)
  const david = AGENT_ROSTER_BY_ID['ag_18'];
  const leadDesk = createLeadWorkstation(THREE_LIB, david, '#10B981', new THREE_LIB.Vector3(-8.5, 1.2, 8.5));
  leadDesk.lookAt(0, 1.2, 0);
  group.add(leadDesk);

  // Spezialisten
  const beSpecs = [
    { spec: AGENT_ROSTER_BY_ID['ag_19'], pos: new THREE_LIB.Vector3(-9.8, 1.2, 7.0) },  // Sarah
    { spec: AGENT_ROSTER_BY_ID['ag_20'], pos: new THREE_LIB.Vector3(-7.0, 1.2, 9.8) },  // Malik
    { spec: AGENT_ROSTER_BY_ID['ag_21'], pos: new THREE_LIB.Vector3(-5.2, 1.2, 11.0) }, // Jonas
    { spec: AGENT_ROSTER_BY_ID['ag_22'], pos: new THREE_LIB.Vector3(-11.2, 1.2, 4.8) }, // Kiara
    { spec: AGENT_ROSTER_BY_ID['ag_23'], pos: new THREE_LIB.Vector3(-12.0, 1.2, 2.8) }, // Tarek
    { spec: AGENT_ROSTER_BY_ID['ag_24'], pos: new THREE_LIB.Vector3(-12.2, 1.2, 0.8) }, // Hannah
    { spec: AGENT_ROSTER_BY_ID['ag_25'], pos: new THREE_LIB.Vector3(-11.8, 1.2, -1.0) } // Tim
  ];

  beSpecs.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#10B981', item.pos);
    ws.lookAt(0, 1.2, 0);
    group.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-8.5, 1.4, 8.5), new THREE_LIB.Vector3(0, 1.8, 0), '#10B981');
  scene.add(group);
}

/**
 * Sichtbare Netzwerk- & Datenfäden (Constellation Lines) zwischen Holo-JARVIS,
 * dem inneren UG_SERVER-Ring und den äußeren EG-Galerie-Inseln
 */
function setupConstellationNetwork(THREE_LIB) {
  const centerHoloPos = new THREE_LIB.Vector3(0, 1.8, 0);
  const trevorPos = new THREE_LIB.Vector3(0, 0.4, 2.4);

  // 1. Primärstrahlen vom Holo-JARVIS zur Zentrale und den Abteilungs-Inseln
  createConnectionCurve(THREE_LIB, trevorPos, centerHoloPos, '#00F0FF');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(0, 0.3, -4.6), centerHoloPos, '#F59E0B');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(4.3, 0.3, 1.8), centerHoloPos, '#F59E0B');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-4.2, 0.3, 1.6), centerHoloPos, '#F59E0B');

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-11.0, 1.4, -4.0), centerHoloPos, '#38BDF8');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(5.2, 1.4, -11.0), centerHoloPos, '#00F0FF');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-8.5, 1.4, 8.5), centerHoloPos, '#10B981');

  // 2. Inter-Sektor Netzwerk-Verbindungen (Constellation Mesh)
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-6.5, 1.3, -9.5), new THREE_LIB.Vector3(7.5, 1.3, -7.5), '#00F0FF');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(7.5, 1.3, -7.5), new THREE_LIB.Vector3(-8.5, 1.3, 8.5), '#38BDF8');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-8.5, 1.3, 8.5), new THREE_LIB.Vector3(0, 0.3, -4.6), '#F59E0B');
  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-6.5, 1.3, -9.5), new THREE_LIB.Vector3(0, 0.3, -4.6), '#F59E0B');
}

/**
 * Erzeugt einen hochdetaillierten 3D-Arbeitsplatz für Agenten (High-Fidelity)
 * - Sci-Fi Schreibtisch: BoxGeometry mit MeshPhysicalMaterial (color: 0x111928, metalness: 0.8, roughness: 0.2), Cyan-Leuchtkante (emissive: 0x00f0ff)
 * - Curved Multi-Monitor-Setup: CylinderGeometry (openEnded: true, kleines thetaLength)
 *   Vorderseite leuchtet hellblau (MeshBasicMaterial, color: 0x0ea5e9), Rückseite dunkelgrau
 * - PC & Peripherie: Dunkler Tower-PC (BoxGeometry) mit vertikalen Leuchtstreifen neben Tisch, flache Tastatur
 * - Bürostuhl: Sitzfläche, gebogene Rückenlehne und 5-Stern-Fußkreuz mit Rollen
 * - Agenten-Figur: Sichtbar im Stuhl / am Tisch mit Kopf, Torso in Abteilungsfarbe (Gold für Leads)
 */
export function createHighDetailWorkstation(THREE_LIB, agentOrOptions, colorHexParam, positionParam, rotYParam = 0, isLeadParam = false) {
  let agent, colorHex, position, rotY, isLead;
  if (agentOrOptions && agentOrOptions.agent) {
    agent = agentOrOptions.agent;
    colorHex = agentOrOptions.colorHex || colorHexParam || '#00F0FF';
    position = agentOrOptions.position || positionParam || new THREE_LIB.Vector3(0, 0, 0);
    rotY = agentOrOptions.rotY ?? rotYParam ?? 0;
    isLead = agentOrOptions.isLead ?? isLeadParam ?? false;
  } else {
    agent = agentOrOptions;
    colorHex = colorHexParam || '#00F0FF';
    position = positionParam || new THREE_LIB.Vector3(0, 0, 0);
    rotY = rotYParam || 0;
    isLead = isLeadParam || false;
  }

  const group = new THREE_LIB.Group();
  group.position.copy(position);
  group.rotation.y = rotY;
  const scale = isLead ? 1.6 : 1.45;
  group.scale.set(scale, scale, scale);
  group.visible = true;

  const accentColorInt = parseInt((colorHex || '#00F0FF').replace('#', '0x'), 16);
  const cyanGlowInt = 0x00F0FF;
  const leadGoldInt = 0xF59E0B;

  // ---------------------------------------------------------------------------
  // 1. SCI-FI SCHREIBTISCH: Flacher, abgerundeter Tisch mit leuchtender Cyan-Kante
  // THREE.BoxGeometry mit MeshPhysicalMaterial, color: 0x111928, metalness: 0.8, roughness: 0.2
  // ---------------------------------------------------------------------------
  const deskWidth = isLead ? 1.25 : 0.98;
  const deskDepth = isLead ? 0.62 : 0.52;
  const deskHeight = 0.52;
  const topThickness = 0.045;

  const deskMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x111928,
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2
  });

  // Haupt-Tischplatte
  const deskTopGeo = new THREE_LIB.BoxGeometry(deskWidth, topThickness, deskDepth);
  const deskTop = new THREE_LIB.Mesh(deskTopGeo, deskMat);
  deskTop.position.set(0, deskHeight, 0);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  group.add(deskTop);

  // Leuchtende Cyan-Kante an der Vorderseite (emissive: 0x00f0ff)
  const edgeMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    emissive: 0x00F0FF,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.1
  });
  const edgeGeo = new THREE_LIB.BoxGeometry(deskWidth + 0.01, 0.016, 0.02);
  const edgeMesh = new THREE_LIB.Mesh(edgeGeo, edgeMat);
  edgeMesh.position.set(0, deskHeight, deskDepth * 0.5);
  group.add(edgeMesh);

  // Titan-verstärkte Schrägstützen / Tischbeine
  const legMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x1E293B,
    metalness: 0.9,
    roughness: 0.25
  });
  [-1, 1].forEach(side => {
    const legGeo = new THREE_LIB.BoxGeometry(0.045, deskHeight, deskDepth * 0.75);
    const leg = new THREE_LIB.Mesh(legGeo, legMat);
    leg.position.set(side * (deskWidth * 0.44), deskHeight * 0.5, 0);
    leg.castShadow = true;
    group.add(leg);

    // Kufe / Bodenfuß
    const footGeo = new THREE_LIB.BoxGeometry(0.07, 0.02, deskDepth * 0.85);
    const foot = new THREE_LIB.Mesh(footGeo, legMat);
    foot.position.set(side * (deskWidth * 0.44), 0.01, 0);
    group.add(foot);
  });

  // ---------------------------------------------------------------------------
  // 2. CURVED MULTI-MONITOR-SETUP
  // THREE.CylinderGeometry (openEnded: true, kleines thetaLength), 2-3 gebogene Monitore
  // Vorderseite hellblau (MeshBasicMaterial, color: 0x0ea5e9), Rückseite dunkelgrau
  // ---------------------------------------------------------------------------
  const monitorGroup = new THREE_LIB.Group();
  monitorGroup.position.set(0, deskHeight + topThickness * 0.5, 0);

  const screenRadius = 0.85;
  const screenHeight = isLead ? 0.36 : 0.28;
  const screenSegments = 16;
  const monitorY = screenHeight * 0.5 + 0.12;

  // Vorderseiten-Material: Hellblau leuchtend (MeshBasicMaterial, color: 0x0ea5e9)
  const screenFrontMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x0EA5E9,
    side: THREE_LIB.DoubleSide
  });

  // Rückseiten-Gehäuse-Material: Dunkelgrau
  const screenBackMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.7,
    metalness: 0.3,
    side: THREE_LIB.DoubleSide
  });

  // 3 Monitore: Center, Left (-25°), Right (+25°)
  const monitorSlices = [
    { thetaStart: -0.19, thetaLength: 0.38, name: 'center' },
    { thetaStart: -0.62, thetaLength: 0.38, name: 'left' },
    { thetaStart: 0.24, thetaLength: 0.38, name: 'right' }
  ];

  const screenMeshes = [];
  const cylinderCenterZ = screenRadius * 0.85; // Bogen wölbt sich sanft um den Sitzplatz bei z > 0

  monitorSlices.forEach(slice => {
    // 1. Hellblauer Screen (Vorderseite)
    const screenGeo = new THREE_LIB.CylinderGeometry(
      screenRadius, screenRadius, screenHeight,
      screenSegments, 1, true,
      slice.thetaStart, slice.thetaLength
    );
    const screenMesh = new THREE_LIB.Mesh(screenGeo, screenFrontMat.clone());
    screenMesh.position.set(0, monitorY, cylinderCenterZ);

    // 2. Dunkelgraues Außengehäuse (Rückseite)
    const backGeo = new THREE_LIB.CylinderGeometry(
      screenRadius * 1.012, screenRadius * 1.012, screenHeight + 0.015,
      screenSegments, 1, true,
      slice.thetaStart - 0.01, slice.thetaLength + 0.02
    );
    const backMesh = new THREE_LIB.Mesh(backGeo, screenBackMat);
    backMesh.position.set(0, monitorY, cylinderCenterZ);

    monitorGroup.add(backMesh);
    monitorGroup.add(screenMesh);
    screenMeshes.push(screenMesh);
  });

  // Monitor-Tischhalterung: Dual-Pole Ständer & Querträger
  const poleMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8, roughness: 0.3 });
  [-0.22, 0.22].forEach(px => {
    const poleGeo = new THREE_LIB.CylinderGeometry(0.012, 0.012, 0.32, 10);
    const pole = new THREE_LIB.Mesh(poleGeo, poleMat);
    pole.position.set(px, 0.16, -0.08);
    monitorGroup.add(pole);
  });
  const crossbarGeo = new THREE_LIB.BoxGeometry(0.68, 0.018, 0.018);
  const crossbar = new THREE_LIB.Mesh(crossbarGeo, poleMat);
  crossbar.position.set(0, monitorY, -0.06);
  monitorGroup.add(crossbar);

  group.add(monitorGroup);

  // ---------------------------------------------------------------------------
  // 3. PC & PERIPHERIE
  // Dunkler Tower-PC (BoxGeometry) mit vertikalen Leuchtstreifen neben dem Tisch, flache Tastatur
  // ---------------------------------------------------------------------------
  const towerW = 0.16;
  const towerH = 0.44;
  const towerD = 0.42;
  const towerGeo = new THREE_LIB.BoxGeometry(towerW, towerH, towerD);
  const towerMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0B0F19,
    metalness: 0.75,
    roughness: 0.25
  });
  const tower = new THREE_LIB.Mesh(towerGeo, towerMat);
  tower.position.set(deskWidth * 0.5 + 0.13, towerH * 0.5, 0.04);
  tower.castShadow = true;
  group.add(tower);

  // Vertikale Leuchtstreifen auf der Frontseite des Tower-PCs
  [-0.035, 0.035].forEach(sx => {
    const stripeGeo = new THREE_LIB.BoxGeometry(0.008, towerH * 0.82, 0.01);
    const stripeMat = new THREE_LIB.MeshBasicMaterial({
      color: isLead ? leadGoldInt : accentColorInt
    });
    const stripe = new THREE_LIB.Mesh(stripeGeo, stripeMat);
    stripe.position.set(deskWidth * 0.5 + 0.13 + sx, towerH * 0.5, 0.04 + towerD * 0.5 + 0.004);
    group.add(stripe);
  });

  // Flache Tastatur auf dem Tisch
  const kbGeo = new THREE_LIB.BoxGeometry(0.36, 0.012, 0.14);
  const kbMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0B1120, roughness: 0.6, metalness: 0.4 });
  const kb = new THREE_LIB.Mesh(kbGeo, kbMat);
  kb.position.set(0, deskHeight + topThickness * 0.5 + 0.006, 0.16);
  group.add(kb);

  // Beleuchtete Tastenfläche / RGB Underglow
  const kbGlowGeo = new THREE_LIB.PlaneGeometry(0.34, 0.12);
  const kbGlowMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.75 });
  const kbGlow = new THREE_LIB.Mesh(kbGlowGeo, kbGlowMat);
  kbGlow.rotation.x = -Math.PI / 2;
  kbGlow.position.set(0, deskHeight + topThickness * 0.5 + 0.013, 0.16);
  group.add(kbGlow);

  // Ergonomische Maus & Mauspad
  const mousepadGeo = new THREE_LIB.BoxGeometry(0.18, 0.004, 0.20);
  const mousepadMat = new THREE_LIB.MeshStandardMaterial({ color: 0x070B14, roughness: 0.8 });
  const mousepad = new THREE_LIB.Mesh(mousepadGeo, mousepadMat);
  mousepad.position.set(0.28, deskHeight + topThickness * 0.5 + 0.002, 0.16);
  group.add(mousepad);

  const mouseGeo = new THREE_LIB.BoxGeometry(0.045, 0.018, 0.075);
  const mouseMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.3, metalness: 0.8 });
  const mouse = new THREE_LIB.Mesh(mouseGeo, mouseMat);
  mouse.position.set(0.28, deskHeight + topThickness * 0.5 + 0.012, 0.16);
  group.add(mouse);

  // Schreibtisch-Arbeitsplatzlicht (PointLight)
  if (typeof THREE_LIB.PointLight === 'function') {
    const deskLight = new THREE_LIB.PointLight(accentColorInt || 0x00F0FF, 0.85, 2.4);
    deskLight.position.set(0, deskHeight + 0.65, 0.1);
    group.add(deskLight);
  }

  // ---------------------------------------------------------------------------
  // 4. BÜROSTUHL
  // Detaillierter Stuhl aus Sitzfläche, gebogener Rückenlehne und Fußkreuz (5-Stern)
  // ---------------------------------------------------------------------------
  const chairGroup = new THREE_LIB.Group();
  chairGroup.position.set(0, 0, 0.44);

  const chairSeatY = 0.32;
  const chairMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.35,
    metalness: 0.65
  });

  // Sitzfläche
  const seatGeo = new THREE_LIB.BoxGeometry(0.38, 0.05, 0.38);
  const seat = new THREE_LIB.Mesh(seatGeo, chairMat);
  seat.position.set(0, chairSeatY, 0);
  seat.castShadow = true;
  chairGroup.add(seat);

  // Gebogene Rückenlehne (CylinderGeometry für geschwungene Ergonomie)
  const backGeo = new THREE_LIB.CylinderGeometry(0.24, 0.24, 0.44, 16, 1, true, -Math.PI * 0.32, Math.PI * 0.64);
  const backMesh = new THREE_LIB.Mesh(backGeo, chairMat);
  backMesh.position.set(0, chairSeatY + 0.24, -0.05);
  backMesh.rotation.y = Math.PI;
  chairGroup.add(backMesh);

  // Kopfstütze
  const headrestGeo = new THREE_LIB.BoxGeometry(0.22, 0.08, 0.06);
  const headrest = new THREE_LIB.Mesh(headrestGeo, chairMat);
  headrest.position.set(0, chairSeatY + 0.48, 0.14);
  chairGroup.add(headrest);

  // Armlehnen (Links / Rechts)
  [-0.21, 0.21].forEach(ax => {
    const armGeo = new THREE_LIB.BoxGeometry(0.04, 0.14, 0.26);
    const arm = new THREE_LIB.Mesh(armGeo, chairMat);
    arm.position.set(ax, chairSeatY + 0.10, 0.02);
    chairGroup.add(arm);
  });

  // Fußkreuz: Verchromte Mittelsäule + 5-Stern Ausleger mit Rollen
  const chromeMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xE2E8F0,
    metalness: 0.95,
    roughness: 0.1
  });
  const pillarGeo = new THREE_LIB.CylinderGeometry(0.02, 0.02, chairSeatY - 0.04, 12);
  const pillar = new THREE_LIB.Mesh(pillarGeo, chromeMat);
  pillar.position.set(0, (chairSeatY - 0.04) * 0.5 + 0.04, 0);
  chairGroup.add(pillar);

  // 5-Stern Fußkreuz (5 Ausleger-Arme)
  const armLen = 0.21;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5;
    const baseArmGeo = new THREE_LIB.BoxGeometry(0.022, 0.022, armLen);
    const baseArm = new THREE_LIB.Mesh(baseArmGeo, chairMat);
    baseArm.position.set(Math.sin(angle) * (armLen * 0.5), 0.035, Math.cos(angle) * (armLen * 0.5));
    baseArm.rotation.y = angle;
    chairGroup.add(baseArm);

    // Rolle am Ende des Arms
    const casterGeo = new THREE_LIB.SphereGeometry(0.016, 8, 8);
    const casterMat = new THREE_LIB.MeshStandardMaterial({ color: 0x050811, roughness: 0.9 });
    const caster = new THREE_LIB.Mesh(casterGeo, casterMat);
    caster.position.set(Math.sin(angle) * armLen, 0.016, Math.cos(angle) * armLen);
    chairGroup.add(caster);
  }

  group.add(chairGroup);

  // ---------------------------------------------------------------------------
  // 5. AGENTEN-FIGUR
  // Setze den Agenten sichtbar in den Stuhl / direkt an den Tisch
  // Kopf, Torso mit Akzentfarben für die jeweilige Abteilung (Gold für Leads)
  // ---------------------------------------------------------------------------
  const userData = {
    type: isLead ? 'chef' : 'pc',
    agentId: agent.id,
    pcId: agent.id,
    chefId: agent.id,
    isLead: isLead,
    name: agent.name,
    role: agent.role,
    department: agent.department,
    deptCode: agent.deptCode,
    deptName: agent.deptName,
    status: 'Bereit',
    currentTask: null,
    idleThought: agent.idleThought || 'Überwache Fachroutinen...',
    easy_explanation: agent.easy_explanation
  };

  const avatar = createStylizedDeveloperAvatar(THREE_LIB, colorHex, isLead, false);
  avatar.position.set(0, 0.22, 0.40);
  avatar.userData = userData;
  group.add(avatar);
  developerAvatars.push(avatar);

  // Boden-Highlight-Ring (wird bei Klick / Hover aktiv)
  const hlGeo = new THREE_LIB.TorusGeometry(0.72, 0.022, 8, 32);
  const hlMat = new THREE_LIB.MeshBasicMaterial({
    color: isLead ? leadGoldInt : accentColorInt,
    transparent: true,
    opacity: 0.85
  });
  const hlRing = new THREE_LIB.Mesh(hlGeo, hlMat);
  hlRing.rotation.x = Math.PI / 2;
  hlRing.position.y = 0.02;
  hlRing.visible = false;
  group.add(hlRing);

  // Zylinder-Hitbox für schnelles und exaktes Raycasting
  const hitboxGeo = new THREE_LIB.CylinderGeometry(0.72, 0.72, 1.8, 16);
  const hitboxMat = new THREE_LIB.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE_LIB.Mesh(hitboxGeo, hitboxMat);
  hitbox.position.y = 0.9;
  hitbox.userData = {
    ...userData,
    highlightRing: hlRing,
    headPos: new THREE_LIB.Vector3(position.x, position.y + 1.4 * scale, position.z)
  };
  group.add(hitbox);

  // Registrierung im System
  screenMeshes.forEach(sm => { sm.userData = userData; });
  const primaryScreen = screenMeshes[0] || deskTop;

  const entry = {
    agent,
    group,
    mesh: primaryScreen,
    screens: screenMeshes,
    avatar,
    hitbox,
    isLead
  };
  agentMeshMap[agent.id] = entry;
  if (isLead) chefMeshMap[agent.id] = entry;
  else pcMeshMap[agent.id] = entry;

  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
    window.interactiveAgentMeshes.push(hitbox);
  }
  interactiveObjects.push(hitbox);
  screenMeshes.forEach(sm => interactiveObjects.push(sm));

  return group;
}

/**
 * Erzeugt den High-Tech-Arbeitsplatz eines Abteilungsleiters (Lead)
 */
function createLeadWorkstation(THREE_LIB, agent, colorHex, position, rotY = 0) {
  return createHighDetailWorkstation(THREE_LIB, agent, colorHex, position, rotY, true);
}

/**
 * Erzeugt den High-Tech-Arbeitsplatz eines Fach-Spezialisten
 */
function createSpecialistWorkstation(THREE_LIB, agent, colorHex, position, rotY = 0) {
  return createHighDetailWorkstation(THREE_LIB, agent, colorHex, position, rotY, false);
}

/**
 * Erzeugt den stylischen Entwickler-Avatar (mit Lead-Akzent bzw. Trevor Arc-Reactor)
 */
function createStylizedDeveloperAvatar(THREE_LIB, deptColorHex, isChef = false, isTrevor = false) {
  const avatarGroup = new THREE_LIB.Group();
  const torsoColor = isTrevor ? 0x991B1B : (isChef ? 0x0F172A : parseInt(deptColorHex.replace('#', '0x'), 16));

  // Oberkörper
  const torsoGeo = new THREE_LIB.BoxGeometry(0.24, 0.34, 0.16);
  const torsoMat = new THREE_LIB.MeshStandardMaterial({
    color: torsoColor,
    roughness: isTrevor ? 0.2 : 0.6,
    metalness: isTrevor ? 0.8 : 0.2
  });
  const torso = new THREE_LIB.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.42;
  avatarGroup.add(torso);

  // Kopf
  const headGeo = new THREE_LIB.SphereGeometry(0.1, 16, 16);
  const headMat = new THREE_LIB.MeshStandardMaterial({
    color: isTrevor ? 0x991B1B : 0xF8FAFC,
    roughness: 0.3,
    metalness: isTrevor ? 0.7 : 0.1
  });
  const head = new THREE_LIB.Mesh(headGeo, headMat);
  head.position.y = 0.66;
  avatarGroup.add(head);

  // Tech-Visier
  const visorGeo = new THREE_LIB.BoxGeometry(0.14, 0.04, 0.06);
  const visorColor = isTrevor ? 0x00F0FF : (isChef ? 0xF59E0B : 0x00F0FF);
  const visorMat = new THREE_LIB.MeshBasicMaterial({ color: visorColor });
  const visor = new THREE_LIB.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.66, -0.09);
  avatarGroup.add(visor);
  avatarGroup.userData.visor = visor;

  // Goldener Schulterring für Abteilungsleiter
  if (isChef && !isTrevor) {
    const ringGeo = new THREE_LIB.TorusGeometry(0.15, 0.022, 8, 24);
    const ringMat = new THREE_LIB.MeshStandardMaterial({
      color: 0xF59E0B,
      emissive: 0x00F0FF,
      emissiveIntensity: 0.4,
      metalness: 0.85,
      roughness: 0.2
    });
    const leadRing = new THREE_LIB.Mesh(ringGeo, ringMat);
    leadRing.rotation.x = Math.PI / 2;
    leadRing.position.set(0, 0.54, 0);
    avatarGroup.add(leadRing);
  }

  // Arc-Reactor für Trevor
  if (isTrevor) {
    const reactorGeo = new THREE_LIB.CylinderGeometry(0.045, 0.045, 0.02, 16);
    const reactorMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
    const reactor = new THREE_LIB.Mesh(reactorGeo, reactorMat);
    reactor.rotation.x = Math.PI / 2;
    reactor.position.set(0, 0.44, 0.082);
    avatarGroup.add(reactor);

    const reactorLight = new THREE_LIB.PointLight(0x00F0FF, 1.2, 2.5);
    reactorLight.position.set(0, 0.44, 0.12);
    avatarGroup.add(reactorLight);
  }

  return avatarGroup;
}

/**
 * Feine Lichtimpuls-Verbindungslinien von den Abteilungen zum Holo-JARVIS
 */
function createConnectionCurve(THREE_LIB, startVec, endVec, colorHex) {
  const midPoint = new THREE_LIB.Vector3(
    (startVec.x + endVec.x) * 0.5,
    Math.max(startVec.y, endVec.y) + 1.2,
    (startVec.z + endVec.z) * 0.5
  );

  const curve = new THREE_LIB.QuadraticBezierCurve3(startVec, midPoint, endVec);
  const points = curve.getPoints(36);
  const lineGeo = new THREE_LIB.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE_LIB.LineBasicMaterial({
    color: parseInt(colorHex.replace('#', '0x'), 16),
    transparent: true,
    opacity: 0.28
  });
  const line = new THREE_LIB.Line(lineGeo, lineMat);
  scene.add(line);

  // Leuchtender Datenimpuls
  const pulseGeo = new THREE_LIB.SphereGeometry(0.07, 8, 8);
  const pulseMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.95
  });
  const pulseMesh = new THREE_LIB.Mesh(pulseGeo, pulseMat);
  scene.add(pulseMesh);

  connectionCurves.push({
    curve,
    mesh: pulseMesh,
    progress: Math.random()
  });
}

/**
 * Butterweicher Kamera-Tween-Mechanismus (window.flyCameraTo)
 * @param {THREE.Vector3|Object} targetPos - Ziel-Kameraposition
 * @param {THREE.Vector3|Object} targetLookAt - Ziel-Fokuspunkt (controls.target)
 */
export function flyCameraTo(targetPos, targetLookAt) {
  const THREE = getTHREE();
  if (!THREE) return;

  const tPos = (targetPos instanceof THREE.Vector3)
    ? targetPos.clone()
    : new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

  const tLook = (targetLookAt instanceof THREE.Vector3)
    ? targetLookAt.clone()
    : new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);

  window.cameraTargetPos = tPos;
  window.cameraTargetLookAt = tLook;
  window.isCameraFlying = true;
  console.log(`[Studio 3D] flyCameraTo -> Pos: (${tPos.x.toFixed(1)}, ${tPos.y.toFixed(1)}, ${tPos.z.toFixed(1)}), Target: (${tLook.x.toFixed(1)}, ${tLook.y.toFixed(1)}, ${tLook.z.toFixed(1)})`);
}

/**
 * Raycasting & Sprechblasen-Hover
 */
function setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick) {
  const raycaster = new THREE_LIB.Raycaster();
  const mouse = new THREE_LIB.Vector2();

  // POINTERMOVE: 3D-TO-2D PROJEKTION FÜR DIE HOVER-SPRECHBLASE
  renderer.domElement.addEventListener('pointermove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const targets = (window.interactiveAgentMeshes && window.interactiveAgentMeshes.length > 0)
      ? window.interactiveAgentMeshes
      : interactiveObjects;

    const intersects = raycaster.intersectObjects(targets, true);
    const speechBubble = document.getElementById('agent-hover-speech-bubble');

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      let data = hit.userData || {};

      while (hit && (!data || !data.agentId) && hit.parent) {
        hit = hit.parent;
        data = hit.userData || {};
      }

      data = data.agentId ? data : (intersects[0].object.userData || {});

      if (data.agentId || data.type === 'agent' || data.type === 'pc' || data.type === 'chef') {
        const agentId = data.agentId || data.pcId || data.chefId;
        const agent = AGENT_ROSTER_BY_ID[agentId] || data;

        if (activeHighlightedHitbox && activeHighlightedHitbox !== hit && activeHighlightedHitbox.userData.highlightRing) {
          activeHighlightedHitbox.userData.highlightRing.visible = false;
        }

        if (data.highlightRing) {
          data.highlightRing.visible = true;
          activeHighlightedHitbox = hit;
        }

        if (speechBubble) {
          const isLead = agent.isLead || data.isLead || data.type === 'chef';
          const nameEl = document.getElementById('bubble-agent-name');
          const deptEl = document.getElementById('bubble-dept-badge');
          const roleEl = document.getElementById('bubble-role');
          const dotEl = document.getElementById('bubble-pulse-dot');
          const actEl = document.getElementById('bubble-activity-text');

          if (nameEl) {
            nameEl.innerHTML = `${isLead ? '<span style="color:#F59E0B;font-weight:800;margin-right:4px;">[LEAD]</span>' : ''}${agent.name || data.name}`;
          }
          if (deptEl) {
            deptEl.textContent = agent.deptCode || agent.department || data.department || '';
          }
          if (roleEl) {
            roleEl.textContent = agent.role || data.role || '';
          }

          const isWorking = (agent.status === 'working' || data.status === 'working' || Boolean(agent.currentTask || data.currentTask));
          if (dotEl) {
            if (isWorking) {
              dotEl.classList.add('working');
            } else {
              dotEl.classList.remove('working');
            }
          }

          if (actEl) {
            if (isWorking) {
              const currentTask = agent.currentTask || data.currentTask || 'Auftrag wird bearbeitet...';
              actEl.textContent = `Ich prüfe gerade die Spezifikationen und Code-Logik für: ${currentTask}`;
            } else {
              actEl.textContent = agent.idleThought || 'Überwache Fachroutinen & Systemintegrität...';
            }
          }

          const headPos = data.headPos 
            ? data.headPos.clone() 
            : hit.getWorldPosition(new THREE_LIB.Vector3()).add(new THREE_LIB.Vector3(0, 1.8, 0));

          const projected = headPos.clone().project(camera);
          const screenX = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
          const screenY = rect.top + (-projected.y * 0.5 + 0.5) * rect.height;

          speechBubble.style.left = `${Math.round(screenX)}px`;
          speechBubble.style.top = `${Math.round(screenY)}px`;
          speechBubble.style.display = 'block';

          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
    }

    if (speechBubble) {
      speechBubble.style.display = 'none';
    }
    if (activeHighlightedHitbox && activeHighlightedHitbox.userData.highlightRing) {
      activeHighlightedHitbox.userData.highlightRing.visible = false;
      activeHighlightedHitbox = null;
    }
    renderer.domElement.style.cursor = 'default';
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    const speechBubble = document.getElementById('agent-hover-speech-bubble');
    if (speechBubble) speechBubble.style.display = 'none';
    if (activeHighlightedHitbox && activeHighlightedHitbox.userData.highlightRing) {
      activeHighlightedHitbox.userData.highlightRing.visible = false;
      activeHighlightedHitbox = null;
    }
  });

  // KLICK-INTERAKTION: FLY CAMERA TO AGENT
  renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const targets = (window.interactiveAgentMeshes && window.interactiveAgentMeshes.length > 0)
      ? [...window.interactiveAgentMeshes, ...interactiveObjects]
      : interactiveObjects;

    const intersects = raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      let data = hit.userData || {};

      while (hit && (!data || !data.agentId) && hit.parent) {
        hit = hit.parent;
        data = hit.userData || {};
      }

      data = data.agentId ? data : (intersects[0].object.userData || {});

      if (data.type === 'agent' || data.type === 'pc' || data.type === 'chef' || data.agentId) {
        const agentId = data.agentId || data.pcId || data.chefId;
        const agent = AGENT_ROSTER_BY_ID[agentId] || data;
        const worldPos = hit.getWorldPosition(new THREE_LIB.Vector3());

        // Butterweicher Kameraflug zum Agenten
        const ax = worldPos.x;
        const ay = worldPos.y;
        const az = worldPos.z;
        flyCameraTo(
          new THREE_LIB.Vector3(ax * 1.25, ay + 4, az * 1.25 + 5),
          new THREE_LIB.Vector3(ax, ay + 1, az)
        );

        if (typeof onAgentClick === 'function') {
          onAgentClick(agentId, agent.isLead ? 'chef' : 'pc', agent.deptCode || data.deptId);
        }
      } else if (data.type === 'holo_jarvis') {
        flyCameraTo(new THREE_LIB.Vector3(0, 4.0, 6.5), new THREE_LIB.Vector3(0, 2.0, 0));
        if (typeof onTrevorClick === 'function') {
          onTrevorClick();
        }
      }
    }
  });
}

/**
 * Kamera-Presets mit butterweichem Kameraflug (flyCameraTo)
 */
export function setCameraPreset(presetName) {
  const THREE = getTHREE();
  if (!THREE || !camera || !controls) return;

  autoRotateActive = false;
  controls.autoRotate = false;

  const key = String(presetName).toLowerCase();
  switch (key) {
    case 'zentrale':
    case 'arena': // Gesamt-Arena Überblick
      flyCameraTo(new THREE.Vector3(0, 14, 21), new THREE.Vector3(0, 1.5, 0));
      currentFloor = 'EG';
      break;

    case 'jarvis': // Holo-JARVIS Nahaufnahme
      flyCameraTo(new THREE.Vector3(0, 4.0, 6.5), new THREE.Vector3(0, 2.0, 0));
      break;

    case 'eg': // Galerie-Terrassen-Fokus
      flyCameraTo(new THREE.Vector3(0, 18, 15), new THREE.Vector3(0, 1.2, 0));
      currentFloor = 'EG';
      break;

    case 'ug': // Nahaufnahme Server-Grube & Iron-Man-Kern
      flyCameraTo(new THREE.Vector3(0, 7.0, 10.0), new THREE.Vector3(0, 0.8, 0));
      currentFloor = 'UG';
      break;

    case 'autorotate':
      autoRotateActive = !autoRotateActive;
      controls.autoRotate = autoRotateActive;
      controls.autoRotateSpeed = 0.8;
      console.log(`[Studio 3D] Auto-Rotation: ${autoRotateActive}`);
      return;

    default:
      flyCameraTo(new THREE.Vector3(0, 14, 21), new THREE.Vector3(0, 1.5, 0));
  }

  const btnEg = document.getElementById('ctrl-floor-eg');
  const btnUg = document.getElementById('ctrl-floor-ug');
  if (btnEg && btnUg) {
    if (currentFloor === 'UG') {
      btnEg.classList.remove('active');
      btnUg.classList.add('active');
    } else {
      btnUg.classList.remove('active');
      btnEg.classList.add('active');
    }
  }

  console.log(`[Studio 3D] Kamera-Preset aktiviert: ${presetName}`);
}

export function reset3DCamera() {
  setCameraPreset('arena');
}

export function switchFloor(targetFloor) {
  if (targetFloor === 'UG') {
    setCameraPreset('ug');
  } else {
    setCameraPreset('eg');
  }
}

export function toggleAutoRotate() {
  setCameraPreset('autorotate');
}

export function focusDepartmentIn3D(deptId) {
  const THREE = getTHREE();
  if (!THREE) return;

  const id = Number(deptId);
  if (id === 2 || id === 1) { // EG_ARCHITEKTUR
    flyCameraTo(new THREE.Vector3(-8.0, 6.0, -11.0), new THREE.Vector3(-6.5, 1.2, -9.5));
  } else if (id === 3 || id === 4) { // EG_FRONTEND
    flyCameraTo(new THREE.Vector3(9.5, 6.0, -9.5), new THREE.Vector3(7.5, 1.2, -7.5));
  } else if (id === 5) { // EG_BACKEND
    flyCameraTo(new THREE.Vector3(-10.5, 6.0, 10.5), new THREE.Vector3(-8.5, 1.2, 8.5));
  } else if (id === 12 || id === 11) { // UG_SERVER
    flyCameraTo(new THREE.Vector3(0.0, 7.0, 10.0), new THREE.Vector3(0.0, 0.8, 0.0));
  } else {
    const sprite = deptHudSprites[deptId];
    if (sprite) {
      const pos = sprite.getWorldPosition(new THREE.Vector3());
      flyCameraTo(new THREE.Vector3(pos.x * 1.25, pos.y + 4, pos.z * 1.25 + 5), pos);
    }
  }
}

/**
 * Fokussiert die 3D-Kamera direkt auf einen der 33 Agenten
 */
export function focusAgentIn3D(agentId) {
  const THREE = getTHREE();
  if (!THREE) return;

  if (agentId === 'ag_01' || agentId === 'trevor' || agentId === 'trevor_core') {
    flyCameraTo(new THREE.Vector3(0, 3.5, 6.0), new THREE.Vector3(0, 0.8, 2.4));
    return;
  }

  const entry = agentMeshMap[agentId] || pcMeshMap[agentId] || chefMeshMap[agentId];
  if (entry) {
    const targetMesh = entry.hitbox || entry.mesh || entry.screen || entry.screenLeft || entry.avatar;
    if (targetMesh) {
      const worldPos = targetMesh.getWorldPosition(new THREE.Vector3());
      const ax = worldPos.x;
      const ay = worldPos.y;
      const az = worldPos.z;
      flyCameraTo(
        new THREE.Vector3(ax * 1.25, ay + 4, az * 1.25 + 5),
        new THREE.Vector3(ax, ay + 1, az)
      );
      return;
    }
  }

  const found = TREVOR_AGENT_ROSTER.find(a => a.name.toLowerCase() === String(agentId).toLowerCase());
  if (found && found.id !== agentId) {
    focusAgentIn3D(found.id);
  }
}

/**
 * 60-FPS ANIMATIONS-LOOP MIT POST-PROCESSING & BUTTERWEICHEM LERPING
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;
  const elapsed = clock ? clock.getElapsedTime() : performance.now() * 0.001;

  // A. HOLO IRON-MAN & J.A.R.V.I.S. ANIMATIONEN
  if (holoJarvisCoreGroup) {
    const hoverOffset = Math.sin(elapsed * 2.2) * 0.08;
    if (ironManFigureGroup) {
      ironManFigureGroup.position.y = hoverOffset;
    }

    if (holoJarvisPoints) {
      holoJarvisPoints.rotation.y += delta * 0.22;
      holoJarvisPoints.rotation.x += delta * 0.08;
    }

    holoJarvisRings.forEach(ring => {
      const spd = ring.userData.speed || 0.5;
      ring.rotation.z += delta * spd;
    });

    const isSpeaking = (typeof window !== 'undefined' && window.isJarvisSpeaking === true);
    const pulseBase = Math.sin(elapsed * 2.0);
    const currentScale = 1.0 + 0.04 * pulseBase + (isSpeaking ? 0.12 * Math.sin(elapsed * 7.0) : 0);
    holoJarvisCoreGroup.scale.set(currentScale, currentScale, currentScale);

    if (holoJarvisLight) {
      holoJarvisLight.intensity = isSpeaking ? 5.2 + Math.sin(elapsed * 8.0) * 2.0 : 3.4 + pulseBase * 0.6;
    }
  }

  // B. ANIMIERTE BLINK-LEDS IN DEN SERVER-RACKS
  blinkingLeds.forEach(led => {
    const isLit = Math.sin(elapsed * led.freq + led.phase) > 0.2;
    led.mesh.material.opacity = isLit ? 0.95 : 0.2;
  });

  // C. LICHT-IMPULSE AUF DEN VERBINDUNGSLINIEN
  connectionCurves.forEach(item => {
    item.progress = (item.progress + delta * 0.35) % 1.0;
    const pt = item.curve.getPoint(item.progress);
    item.mesh.position.copy(pt);
  });

  // D. BUTTERWEICHER KAMERA-FLUG (window.flyCameraTo)
  if (window.isCameraFlying && window.cameraTargetPos && window.cameraTargetLookAt && camera && controls) {
    camera.position.lerp(window.cameraTargetPos, 0.06);
    controls.target.lerp(window.cameraTargetLookAt, 0.06);

    const distPos = camera.position.distanceTo(window.cameraTargetPos);
    const distTarget = controls.target.distanceTo(window.cameraTargetLookAt);

    if (distPos < 0.15 && distTarget < 0.15) {
      window.isCameraFlying = false;
      window.cameraTargetPos = null;
      window.cameraTargetLookAt = null;
    }
  }

  // E. ORBITCONTROLS DAMPING UPDATEN
  if (controls) {
    controls.update();
  }

  // F. POST-PROCESSING (UNREALBLOOMPASS) ODER STANDARD RENDERER
  if (composer) {
    composer.render();
  } else if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/**
 * Dynamischer Status-Updater für die 33 Agenten
 */
export function updateAgentStatus(agentIdOrName, statusOrState, message) {
  const THREE = getTHREE();
  if (!THREE) return;

  let targetId = null;
  if (typeof agentIdOrName === 'string') {
    if (agentIdOrName.startsWith('ag_') || pcMeshMap[agentIdOrName] || chefMeshMap[agentIdOrName]) {
      targetId = agentIdOrName;
    } else {
      const match = TREVOR_AGENT_ROSTER.find(a => 
        a.name.toLowerCase() === agentIdOrName.toLowerCase() ||
        a.id.toLowerCase() === agentIdOrName.toLowerCase()
      );
      if (match) targetId = match.id;
    }
  } else if (agentIdOrName && agentIdOrName.id) {
    targetId = agentIdOrName.id;
  }

  if (!targetId) return;

  const entry = agentMeshMap[targetId] || pcMeshMap[targetId] || chefMeshMap[targetId];
  if (!entry) return;

  const isWorking = (statusOrState === 'working' || statusOrState === 'busy' || statusOrState === 'auditing');
  const isDone = (statusOrState === 'done' || statusOrState === 'ready' || statusOrState === 'idle');
  const statusStr = isWorking ? 'working' : (isDone ? 'Bereit' : String(statusOrState));
  const currentTaskStr = isWorking ? (message || 'Arbeitet an Auftrag...') : null;

  if (entry.agent) {
    entry.agent.status = statusStr;
    entry.agent.currentTask = currentTaskStr;
  }

  if (entry.hitbox && entry.hitbox.userData) {
    entry.hitbox.userData.status = statusStr;
    entry.hitbox.userData.currentTask = currentTaskStr;
  }

  const glowColor = isWorking ? 0xF59E0B : (isDone ? 0x00F0FF : 0x10B981);
  if (entry.screens && Array.isArray(entry.screens)) {
    entry.screens.forEach(s => {
      if (s.material && s.material.emissive) {
        s.material.emissive.setHex(glowColor);
        s.material.emissiveIntensity = isWorking ? 0.75 : 0.45;
      }
    });
  }
}

export function updateAgentStatusIn3D(agentId, type, status) {
  updateAgentStatus(agentId, status);
}

export function setStageIn3D(stageNum) {
  console.log(`[Studio 3D] Stage gesetzt: ${stageNum}`);
}

export function update3DStudioState(stageInput, floor) {
  if (floor === 'UG') {
    switchFloor('UG');
  } else if (floor === 'EG') {
    switchFloor('EG');
  }
}

export function triggerDataStreamToTrevor(deptId) {
  console.log(`[Studio 3D] Datenimpuls von Dept #${deptId} zum Holo-JARVIS ausgelöst`);
}

export function updateRoomMicroStatus(deptId, statusText) {
  // Dezent
}

function onWindowResize() {
  if (!containerEl || !camera || !renderer) return;
  const width = containerEl.clientWidth || window.innerWidth;
  const height = containerEl.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  if (composer) {
    composer.setSize(width, height);
  }
  if (bloomPass && bloomPass.resolution) {
    bloomPass.resolution.set(width, height);
  }
}

export function zoom3DCamera(delta) {
  if (!camera || !controls) return;
  const THREE = getTHREE();
  if (!THREE) return;
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  const factor = delta > 0 ? 0.85 : 1.15;
  dir.multiplyScalar(factor);
  camera.position.copy(controls.target).add(dir);
  controls.update();
}

export function rotate3DCamera(angleDelta) {
  if (!camera || !controls) return;
  const THREE = getTHREE();
  if (!THREE) return;
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
  let theta = Math.atan2(offset.x, offset.z);
  theta += angleDelta;
  camera.position.x = controls.target.x + radius * Math.sin(theta);
  camera.position.z = controls.target.z + radius * Math.cos(theta);
  camera.lookAt(controls.target);
  controls.update();
}

export function dispose3DStudio() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  if (hoverBadgeEl && hoverBadgeEl.parentNode) {
    hoverBadgeEl.parentNode.removeChild(hoverBadgeEl);
    hoverBadgeEl = null;
  }
}

// Globale Fenster-Exporte
if (typeof window !== 'undefined') {
  window.flyCameraTo = flyCameraTo;
  window.setCameraPreset = setCameraPreset;
  window.reset3DCamera = reset3DCamera;
  window.switchFloor = switchFloor;
  window.toggleAutoRotate = toggleAutoRotate;
  window.focusDepartmentIn3D = focusDepartmentIn3D;
  window.focusAgentIn3D = focusAgentIn3D;
  window.update3DStudioState = update3DStudioState;
  window.updateAgentStatusIn3D = updateAgentStatusIn3D;
  window.updateAgentStatus = updateAgentStatus;
  window.setStageIn3D = setStageIn3D;
  window.zoom3DCamera = zoom3DCamera;
  window.rotate3DCamera = rotate3DCamera;
}
