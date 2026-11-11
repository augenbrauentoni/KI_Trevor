/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * Phase 7: Kompakter, moderner Open-Space Büro-Campus (Three.js):
 * - Ein großer, zusammenhängender Architektur-Floor (Schiefer-/Holz-/Beton-Struktur)
 * - 10 Abteilungen kompakt und nah am Zentrum (Radius ~13) auf einer gemeinsamen Etage
 * - Trevor (MK-VII) im Iron-Man Look (Rot/Gold/Arc-Reactor) in der zentralen Rotunde
 * - Halboffene Glaswände mit schwarzen Aluminium-Rahmen & Durchgängen
 * - Realistische Schreibtische, Bürostühle, Pflanzentöpfe, Whiteboards & Server-Racks
 * - Leuchtende Dual-Monitore mit sichtbaren Code- & Terminal-Texturen
 * - Schwebende 3D-Billboard-Labels mit Live-Sprechblasen (Micro-Status-Toasts)
 * - Interaktive Datenstrahlen von jeder Abteilung zu Trevor
 * - Vollständig synchrones Rendern & ResizeObserver
 */

import { STUDIO_HIERARCHY } from './hierarchyData.js';

// Sicheres globales Three.js Handle (Verhindert doppelte Importe)
const getTHREE = () => (typeof window !== 'undefined' ? window.THREE : null);

let scene, camera, renderer, controls;
let containerEl;
let animationFrameId = null;
let trevorGroup, trevorHead, trevorArcLight, trevorHands = [];
let trevorArcCoreMesh = null, trevorArcRingMesh = null;
let decisionTerminalScreen;
const interactiveObjects = [];
const pcMeshMap = {};
const chefMeshMap = {};
const deptBillboards = {};
const dynamicParticleStreams = [];
const blinkingLeds = [];
const developerAvatars = [];

// Referenzen für performante dynamische Workflow-Beleuchtung (Code-RAG & Stage-API)
const allPcScreenMeshes = [];
const allChefScreenMeshes = [];
let trevorSpotlight = null;
let trevorStageAuraLight = null;
let currentWorkflowStage = 'idle';
let stageTransitionTimeout = null;

let isQuietMode = false;
let targetCameraPos = null;
let targetLookAt = null;

// Holographischer J.A.R.V.I.S. (Zentraler Mittelpunkt der Terrassen-Arena)
let holoJarvisGroup = null;
let holoJarvisCore = null;
let holoJarvisInnerSphere = null;
let holoJarvisRings = [];
let holoJarvisParticles = null;
let holoJarvisLight = null;
let holoJarvisBeam = null;

// Etagen-Status & Beleuchtung
let targetCameraY = 5;
let currentFloor = 'EG';
const ugLights = [];

// Geteilte Texturen für realistische Monitore
let codeScreenTexture = null;
let serverScreenTexture = null;

/**
 * Erzeugt dynamische Monitor-Texturen mit echtem Code- und Terminal-Look
 */
function createScreenCanvasTexture(type = 'code', colorHex = '#06b6d4') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Bildschirm-Hintergrund
  ctx.fillStyle = '#080d1a';
  ctx.fillRect(0, 0, 256, 160);

  // Titelleiste
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 24);

  // Fenster-Buttons
  ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(12, 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(24, 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(36, 12, 4, 0, Math.PI * 2); ctx.fill();

  if (type === 'code') {
    // Codezeilen
    const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#94a3b8'];
    for (let i = 0; i < 7; i++) {
      const y = 38 + i * 16;
      ctx.fillStyle = '#475569';
      ctx.fillRect(10, y + 2, 8, 8); // Zeilennummer

      let curX = 26;
      const spans = Math.floor(Math.random() * 3) + 2;
      for (let s = 0; s < spans; s++) {
        const w = 18 + Math.floor(Math.random() * 45);
        ctx.fillStyle = colors[(i + s) % colors.length];
        ctx.fillRect(curX, y + 3, w, 6);
        curX += w + 8;
        if (curX > 230) break;
      }
    }
  } else {
    // Server / Dashboard Ansicht
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('STATUS: ONLINE 24/7', 12, 45);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('MEMORY: 42% | CPU: 18%', 12, 65);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('ACTIVE SESSIONS: 142', 12, 85);
    
    // Kleiner Balken-Graph
    for (let b = 0; b < 10; b++) {
      const h = 10 + Math.random() * 35;
      ctx.fillStyle = b % 2 === 0 ? colorHex : '#38bdf8';
      ctx.fillRect(14 + b * 22, 145 - h, 14, h);
    }
  }

  // Scanline Effekt
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let y = 0; y < 160; y += 4) {
    ctx.fillRect(0, y, 256, 2);
  }

  return canvas;
}

/**
 * Erzeugt schwebende 3D-Billboard-Labels mit Live-Sprechblase (Micro-Status Toast)
 */
function createFloatingLabelSprite(title, subtitle, microStatusText, colorHexStr) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 190;
  const ctx = canvas.getContext('2d');

  drawLabelOnCanvas(ctx, title, subtitle, microStatusText, colorHexStr);

  const THREE = getTHREE();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(7.5, 2.8, 1);
  sprite.userData = { canvas, ctx, title, subtitle, microStatusText, colorHexStr, texture };

  return sprite;
}

function drawLabelOnCanvas(ctx, title, subtitle, microStatusText, colorHexStr) {
  ctx.clearRect(0, 0, 512, 190);

  // 1. Haupt-Panel
  ctx.fillStyle = 'rgba(9, 14, 24, 0.94)';
  ctx.strokeStyle = colorHexStr || '#fbbf24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 170, 22);
  ctx.fill();
  ctx.stroke();

  // 2. Akzent-Kopfleiste
  ctx.fillStyle = colorHexStr || '#fbbf24';
  ctx.beginPath();
  ctx.roundRect(18, 18, 476, 6, 3);
  ctx.fill();

  // 3. Titel (Raumname)
  ctx.font = 'bold 30px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, 26, 62);

  // 4. Untertitel (Chef / Funktion)
  ctx.font = '600 20px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(subtitle, 26, 96);

  // 5. Live-Sprechblase (Micro-Status Toast)
  if (microStatusText) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(24, 116, 464, 46, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 19px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(microStatusText, 38, 146);
  }
}

/**
 * Aktualisiert den schwebenden Micro-Status-Text (Sprechblase) im 3D-Büro
 */
export function updateRoomMicroStatus(deptId, statusText) {
  const sprite = deptBillboards[deptId];
  if (!sprite || !sprite.userData) return;

  const { ctx, title, subtitle, colorHexStr, texture } = sprite.userData;
  sprite.userData.microStatusText = statusText;
  drawLabelOnCanvas(ctx, title, subtitle, statusText, colorHexStr);
  texture.needsUpdate = true;
}

/**
 * Haupt-Initialisierung der 3D-Szene
 */
export async function init3DStudio(hierarchyDataParam, onAgentClick, onTrevorClick) {
  containerEl = document.getElementById('threejs-canvas-container');
  if (!containerEl) {
    console.error('[Studio 3D] Container #threejs-canvas-container nicht im DOM gefunden.');
    return;
  }

  const THREE_LIB = window.THREE;
  if (!THREE_LIB) {
    console.error('[Studio 3D] Three.js Library nicht global verfügbar!');
    return;
  }

  const effectiveHierarchy = hierarchyDataParam && hierarchyDataParam.departments
    ? hierarchyDataParam
    : STUDIO_HIERARCHY;

  // 1. Texturen für Monitore initialisieren
  try {
    const codeCanvas = createScreenCanvasTexture('code', '#38bdf8');
    codeScreenTexture = new THREE_LIB.CanvasTexture(codeCanvas);
    const serverCanvas = createScreenCanvasTexture('server', '#10b981');
    serverScreenTexture = new THREE_LIB.CanvasTexture(serverCanvas);
  } catch (e) {
    console.warn('[Studio 3D] Bildschirm-Texturen Fallback aktiv');
  }

  // 2. Szene (Slate J.A.R.V.I.S. Matte Farbpalette)
  scene = new THREE_LIB.Scene();
  scene.background = new THREE_LIB.Color(0x0B101B);
  scene.fog = new THREE_LIB.FogExp2(0x0B101B, 0.012);

  // 3. Abmessungen
  const width = containerEl.clientWidth || Math.round(window.innerWidth * 0.72) || 1200;
  const height = containerEl.clientHeight || Math.max(window.innerHeight - 170, 580) || 650;

  // 4. Kamera: Isometrisch schräg auf die gesamte Terrassen-Arena (Amphitheater-Blick)
  camera = new THREE_LIB.PerspectiveCamera(44, width / height, 0.5, 500);
  camera.position.set(0, 17, 26);
  camera.lookAt(0, 0.8, 0);

  // 5. Renderer
  renderer = new THREE_LIB.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE_LIB.PCFSoftShadowMap;
  renderer.toneMapping = THREE_LIB.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const oldCanvas = containerEl.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  containerEl.appendChild(renderer.domElement);

  // 6. OrbitControls (einzig über verifizierten CDN-Import)
  if (THREE_LIB && THREE_LIB.OrbitControls) {
    controls = new THREE_LIB.OrbitControls(camera, renderer.domElement);
  } else if (window.THREE && window.THREE.OrbitControls) {
    controls = new window.THREE.OrbitControls(camera, renderer.domElement);
  } else {
    console.warn('[Studio 3D] OrbitControls nicht geladen.');
  }

  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.95;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 5;
    controls.maxDistance = 85;
    controls.target.set(0, 0.8, 0);
  }

  // 7. Moderne Slate & Hologram Beleuchtung
  setupCampusLighting(THREE_LIB);

  // 8. Terrassen-Arena (Sunken Basin UG auf y = -2.4 & Erhöhte Galerie EG auf y = +2.4)
  setupTerraceArena(THREE_LIB);

  // 8b. Holographischer J.A.R.V.I.S. über dem Arenazentrum bei (0, 1.8, 0)
  setupHolographicJarvis(THREE_LIB);

  // 9. Trevor im Iron-Man Look auf dem Kommando-Balkon
  setupTrevorIronManMech(THREE_LIB);

  // 10. Die 14 Abteilungen (10 EG Galerie, 4 UG Arena) mit 33 Spezial-PCs & 10 Chefs
  setupCompactDepartments(THREE_LIB, effectiveHierarchy);

  // 11. Raycasting & Klicks
  setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick);

  // 12. UI-Kamera-Buttons
  setupCameraButtons();

  // 13. Automatischer Resize-Observer
  window.addEventListener('resize', onWindowResize);
  if (window.ResizeObserver) {
    new ResizeObserver(() => onWindowResize()).observe(containerEl);
  }

  // 14. Render-Loop starten (verhindert doppelt gestapelte Loops)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  animate();
  console.log('[Studio 3D] Terrassen-Arena & Holo-JARVIS 3D Studio erfolgreich gerendert!');
}

/**
 * Moderne Slate & Hologram Studio-Beleuchtung (Deep Slate & Hologram-Cyan)
 */
function setupCampusLighting(THREE_LIB) {
  // Tiefes Slate Umgebungslicht
  const ambientLight = new THREE_LIB.AmbientLight(0x0E1726, 1.6);
  scene.add(ambientLight);

  // Hemisphere-Licht für plastische Raumtiefe (Himmel: Hologramm-Cyan, Boden: Tiefes Schieferblau)
  const hemiLight = new THREE_LIB.HemisphereLight(0x00F0FF, 0x0B101B, 0.9);
  scene.add(hemiLight);

  // Warmweißes Haupt-Keylight von schräg oben
  const keyLight = new THREE_LIB.DirectionalLight(0xE2E8F0, 1.5);
  keyLight.position.set(22, 34, 22);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 5;
  keyLight.shadow.camera.far = 100;
  keyLight.shadow.camera.left = -25;
  keyLight.shadow.camera.right = 25;
  keyLight.shadow.camera.top = 25;
  keyLight.shadow.camera.bottom = -25;
  scene.add(keyLight);

  // Kühles Hologramm-Cyan Rim-Light
  const fillLight = new THREE_LIB.DirectionalLight(0x00F0FF, 0.85);
  fillLight.position.set(-22, 26, -22);
  scene.add(fillLight);
}

/**
 * Terrassen-Arena (Sunken Basin UG auf y = -2.4 & Erhöhte Galerie EG auf y = +2.4)
 * Vollständig offenes Amphitheater-Design: Alle 14 Abteilungen und 33 PCs direkt sichtbar!
 */
function setupTerraceArena(THREE_LIB) {
  const arenaGroup = new THREE_LIB.Group();

  // 1. ZENTRALES TIEFGESCHOSS / SUNKEN ARENA BASIN (UG-Ebene: y = -2.5, Radius 8.8)
  const sunkenFloorGeo = new THREE_LIB.CylinderGeometry(8.8, 9.0, 0.4, 64);
  const sunkenFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x090D16,
    roughness: 0.55,
    metalness: 0.25
  });
  const sunkenFloor = new THREE_LIB.Mesh(sunkenFloorGeo, sunkenFloorMat);
  sunkenFloor.position.y = -2.7;
  sunkenFloor.receiveShadow = true;
  arenaGroup.add(sunkenFloor);

  // Holographisches Cyber-Grid im Sunken Basin
  const arenaGrid = new THREE_LIB.GridHelper(17.6, 22, 0x00F0FF, 0x1E293B);
  arenaGrid.position.y = -2.49;
  arenaGroup.add(arenaGrid);

  // Konzentrische cyanfarbene Leuchtringe im Arenaboden
  [2.8, 5.5, 8.2].forEach((r, idx) => {
    const ringGeo = new THREE_LIB.RingGeometry(r - 0.05, r + 0.05, 64);
    const ringMat = new THREE_LIB.MeshBasicMaterial({
      color: 0x00F0FF,
      side: THREE_LIB.DoubleSide,
      transparent: true,
      opacity: idx === 1 ? 0.6 : 0.3
    });
    const ring = new THREE_LIB.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.48;
    arenaGroup.add(ring);
  });

  // Niedrige transparente Glasbrüstung um das Tieffeld mit Metall-Handlauf
  const arenaBalustradeGeo = new THREE_LIB.CylinderGeometry(8.8, 8.8, 0.8, 64, 1, true);
  const arenaBalustradeMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    transmission: 0.85,
    side: THREE_LIB.DoubleSide
  });
  const arenaBalustrade = new THREE_LIB.Mesh(arenaBalustradeGeo, arenaBalustradeMat);
  arenaBalustrade.position.y = -2.1;
  arenaGroup.add(arenaBalustrade);

  const arenaHandrailGeo = new THREE_LIB.TorusGeometry(8.8, 0.06, 8, 64);
  const arenaHandrailMat = new THREE_LIB.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  const arenaHandrail = new THREE_LIB.Mesh(arenaHandrailGeo, arenaHandrailMat);
  arenaHandrail.rotation.x = Math.PI / 2;
  arenaHandrail.position.y = -1.7;
  arenaGroup.add(arenaHandrail);

  // 4 radiale Treppenaufgänge zwischen Tieffeld (y = -2.4) und Galerie (y = 2.4)
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(rot => {
    const stairGroup = new THREE_LIB.Group();
    stairGroup.rotation.y = rot;
    for (let step = 0; step < 6; step++) {
      const stepGeo = new THREE_LIB.BoxGeometry(2.0, 0.2, 0.65);
      const stepMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.4, metalness: 0.6 });
      const stepMesh = new THREE_LIB.Mesh(stepGeo, stepMat);
      stepMesh.position.set(0, -2.2 + step * 0.75, 8.6 + step * 0.65);
      stairGroup.add(stepMesh);
    }
    arenaGroup.add(stairGroup);
  });

  // 2. ERHÖHTE GALERIE-TERRASSE (EG-Ebene: y = 2.4, Innenradius ~12.5, Außenradius ~22.0)
  const galleryRingGeo = new THREE_LIB.RingGeometry(12.5, 22.0, 64);
  const galleryRingMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0E1726,
    roughness: 0.5,
    metalness: 0.3,
    side: THREE_LIB.DoubleSide
  });
  const galleryFloor = new THREE_LIB.Mesh(galleryRingGeo, galleryRingMat);
  galleryFloor.rotation.x = -Math.PI / 2;
  galleryFloor.position.y = 2.4;
  galleryFloor.receiveShadow = true;
  arenaGroup.add(galleryFloor);

  // Galerie-Plattenfundament (Dicke der Terrasse)
  const gallerySlabGeo = new THREE_LIB.CylinderGeometry(22.0, 22.2, 0.4, 64);
  const gallerySlabMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0B101B, roughness: 0.7, metalness: 0.2 });
  const gallerySlab = new THREE_LIB.Mesh(gallerySlabGeo, gallerySlabMat);
  gallerySlab.position.y = 2.2;
  arenaGroup.add(gallerySlab);

  // Innere Glasbrüstung der Galerie (Blick nach unten ins Tieffeld, 100% transparent)
  const innerBalustradeGeo = new THREE_LIB.CylinderGeometry(12.5, 12.5, 0.9, 64, 1, true);
  const innerBalustradeMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    transmission: 0.88,
    side: THREE_LIB.DoubleSide
  });
  const innerBalustrade = new THREE_LIB.Mesh(innerBalustradeGeo, innerBalustradeMat);
  innerBalustrade.position.y = 2.85;
  arenaGroup.add(innerBalustrade);

  // Leuchtender Handlauf der Galerie (Cyan)
  const galleryRailGeo = new THREE_LIB.TorusGeometry(12.5, 0.07, 8, 64);
  const galleryRailMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const galleryRail = new THREE_LIB.Mesh(galleryRailGeo, galleryRailMat);
  galleryRail.rotation.x = Math.PI / 2;
  galleryRail.position.y = 3.3;
  arenaGroup.add(galleryRail);

  // Äußerer Kantenring
  const outerRailGeo = new THREE_LIB.TorusGeometry(22.0, 0.08, 8, 64);
  const outerRailMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8 });
  const outerRail = new THREE_LIB.Mesh(outerRailGeo, outerRailMat);
  outerRail.rotation.x = Math.PI / 2;
  outerRail.position.y = 3.3;
  arenaGroup.add(outerRail);

  scene.add(arenaGroup);
}

/**
 * Holographischer J.A.R.V.I.S. (Zentraler Mittelpunkt über der Tieffeld-Arena bei (0, 1.5, 0))
 */
function setupHolographicJarvis(THREE_LIB) {
  holoJarvisGroup = new THREE_LIB.Group();
  holoJarvisGroup.position.set(0, 1.5, 0);

  // 1. Projektions-Basis & Lichtkegel aus der Tieffeld-Arena (World y = -2.2)
  const pedestalGeo = new THREE_LIB.CylinderGeometry(1.6, 1.9, 0.5, 32);
  const pedestalMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0B101B,
    metalness: 0.9,
    roughness: 0.2
  });
  const pedestal = new THREE_LIB.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.set(0, -4.0, 0); // 1.8 - 4.0 = -2.2
  holoJarvisGroup.add(pedestal);

  const pedestalRimGeo = new THREE_LIB.TorusGeometry(1.6, 0.05, 8, 32);
  const pedestalRimMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const pedestalRim = new THREE_LIB.Mesh(pedestalRimGeo, pedestalRimMat);
  pedestalRim.rotation.x = Math.PI / 2;
  pedestalRim.position.set(0, -3.75, 0);
  holoJarvisGroup.add(pedestalRim);

  // Holographischer Projektionsstrahl (Beam cylinder)
  const beamGeo = new THREE_LIB.CylinderGeometry(0.35, 1.5, 3.8, 32, 1, true);
  const beamMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.16,
    blending: THREE_LIB.AdditiveBlending,
    side: THREE_LIB.DoubleSide,
    depthWrite: false
  });
  holoJarvisBeam = new THREE_LIB.Mesh(beamGeo, beamMat);
  holoJarvisBeam.position.set(0, -1.9, 0);
  holoJarvisGroup.add(holoJarvisBeam);

  // 2. Rotierender Quantum Wireframe Core
  const coreGeo = new THREE_LIB.IcosahedronGeometry(0.85, 1);
  const coreMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    wireframe: true,
    transparent: true,
    opacity: 0.9
  });
  holoJarvisCore = new THREE_LIB.Mesh(coreGeo, coreMat);
  holoJarvisCore.userData = {
    type: 'holo_jarvis',
    name: 'J.A.R.V.I.S. (Quantum AI Core)',
    role: 'Zentraler holographischer KI-Assistent',
    status: 'Holographische Matrix online'
  };
  interactiveObjects.push(holoJarvisCore);
  holoJarvisGroup.add(holoJarvisCore);

  // 3. Innerer pulsierender Arc-Core
  const innerSphereGeo = new THREE_LIB.SphereGeometry(0.38, 24, 24);
  const innerSphereMat = new THREE_LIB.MeshBasicMaterial({
    color: 0xE0F2FE,
    transparent: true,
    opacity: 0.95
  });
  holoJarvisInnerSphere = new THREE_LIB.Mesh(innerSphereGeo, innerSphereMat);
  holoJarvisGroup.add(holoJarvisInnerSphere);

  // 4. Drei gegenläufige gyroskopische Orbital-Scanringe
  holoJarvisRings = [];
  const ringConfigs = [
    { radius: 1.35, tube: 0.032, color: 0x00F0FF, rotX: Math.PI / 4, rotY: 0, rotZ: 0 },
    { radius: 1.68, tube: 0.028, color: 0x38BDF8, rotX: 0, rotY: Math.PI / 3, rotZ: Math.PI / 6 },
    { radius: 2.05, tube: 0.024, color: 0x00F0FF, rotX: -Math.PI / 3, rotY: Math.PI / 4, rotZ: 0 }
  ];

  ringConfigs.forEach(cfg => {
    const ringGeo = new THREE_LIB.TorusGeometry(cfg.radius, cfg.tube, 8, 48);
    const ringMat = new THREE_LIB.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.85
    });
    const ringMesh = new THREE_LIB.Mesh(ringGeo, ringMat);
    ringMesh.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
    holoJarvisGroup.add(ringMesh);
    holoJarvisRings.push(ringMesh);
  });

  // 5. Dynamische Partikel-Wolke (Spherical Swarm mit 700 Partikeln)
  const particleCount = 700;
  const particleGeo = new THREE_LIB.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 2.1 + (Math.random() - 0.5) * 0.6;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  particleGeo.setAttribute('position', new THREE_LIB.BufferAttribute(positions, 3));
  const particleMat = new THREE_LIB.PointsMaterial({
    color: 0x00F0FF,
    size: 0.075,
    transparent: true,
    opacity: 0.75,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false
  });
  holoJarvisParticles = new THREE_LIB.Points(particleGeo, particleMat);
  holoJarvisGroup.add(holoJarvisParticles);

  // 6. Zentrales Holo-PointLight
  holoJarvisLight = new THREE_LIB.PointLight(0x00F0FF, 2.4, 22);
  holoJarvisLight.position.set(0, 0, 0);
  holoJarvisGroup.add(holoJarvisLight);

  // Schwebendes J.A.R.V.I.S. Label
  const jarvisLabel = createFloatingLabelSprite(
    "J.A.R.V.I.S. (HOLO-CORE)",
    "Quantum AI Studio Core",
    "⚡ Holographische Matrix online",
    "#00F0FF"
  );
  jarvisLabel.position.set(0, 2.9, 0);
  holoJarvisGroup.add(jarvisLabel);

  scene.add(holoJarvisGroup);
}

/**
 * Trevor im Iron-Man Look in der zentralen Rotunde
 */
function setupTrevorIronManMech(THREE_LIB) {
  trevorGroup = new THREE_LIB.Group();
  trevorGroup.position.set(0, 2.5, 17.5);
  trevorGroup.rotation.y = Math.PI; // Blickrichtung nach Norden zur Arena & Holo-JARVIS

  // 1. Erhöhtes Kommando-Podest auf der Galerie (Radius 3.2)
  const podestGeo = new THREE_LIB.CylinderGeometry(3.2, 3.5, 0.4, 32);
  const podestMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x090D16,
    roughness: 0.35,
    metalness: 0.75
  });
  const podest = new THREE_LIB.Mesh(podestGeo, podestMat);
  podest.position.y = 0.2;
  podest.receiveShadow = true;
  trevorGroup.add(podest);

  // Leuchtender Gold-Karmesin Ring um Trevors Podest
  const edgeGeo = new THREE_LIB.TorusGeometry(3.2, 0.06, 12, 32);
  const edgeMat = new THREE_LIB.MeshBasicMaterial({ color: 0xF59E0B });
  const edge = new THREE_LIB.Mesh(edgeGeo, edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.41;
  trevorGroup.add(edge);

  // Halboffene niedrige Glas-Brüstung um Trevors Balkon (100% transparent, Blick ins Zentrum)
  const rotundaGeo = new THREE_LIB.CylinderGeometry(3.1, 3.1, 1.0, 32, 1, true, -Math.PI / 1.3, Math.PI * 1.55);
  const rotundaMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.2,
    roughness: 0.08,
    transmission: 0.88,
    side: THREE_LIB.DoubleSide
  });
  const rotunda = new THREE_LIB.Mesh(rotundaGeo, rotundaMat);
  rotunda.position.y = 0.9;
  trevorGroup.add(rotunda);

  // Holografischer Runder Taktik-Tisch vor Trevor
  const tableGeo = new THREE_LIB.CylinderGeometry(1.2, 1.2, 0.1, 32);
  const tableMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x00F0FF,
    emissive: 0x00F0FF,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.65
  });
  const holoTable = new THREE_LIB.Mesh(tableGeo, tableMat);
  holoTable.position.set(0, 1.3, 1.1);
  trevorGroup.add(holoTable);

  // --- IRON-MAN ARMOR (METALLIC-ROT & GOLD) ---
  const redArmorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.18,
    metalness: 0.9
  });
  const goldArmorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.94
  });

  const mechBody = new THREE_LIB.Group();
  mechBody.position.set(0, 2.2, 0);

  // Brustpanzer
  const chestGeo = new THREE_LIB.BoxGeometry(1.1, 1.3, 0.85);
  const chest = new THREE_LIB.Mesh(chestGeo, redArmorMat);
  chest.castShadow = true;
  mechBody.add(chest);

  // Goldene Rippen
  [-1, 1].forEach(side => {
    const ribGeo = new THREE_LIB.BoxGeometry(0.18, 0.85, 0.8);
    const rib = new THREE_LIB.Mesh(ribGeo, goldArmorMat);
    rib.position.set(side * 0.52, 0, 0);
    mechBody.add(rib);
  });

  // ARC-REACTOR (Hell strahlend Cyan/Weiß auf Brust)
  const arcRingGeo = new THREE_LIB.TorusGeometry(0.2, 0.04, 16, 32);
  const arcRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8 });
  const arcRing = new THREE_LIB.Mesh(arcRingGeo, arcRingMat);
  arcRing.position.set(0, 0.2, 0.44);
  mechBody.add(arcRing);
  trevorArcRingMesh = arcRing;

  const arcCoreGeo = new THREE_LIB.CircleGeometry(0.16, 24);
  const arcCoreMat = new THREE_LIB.MeshBasicMaterial({ color: 0xe0f2fe });
  const arcCore = new THREE_LIB.Mesh(arcCoreGeo, arcCoreMat);
  arcCore.position.set(0, 0.2, 0.45);
  mechBody.add(arcCore);
  trevorArcCoreMesh = arcCore;

  trevorArcLight = new THREE_LIB.PointLight(0x38bdf8, 4.0, 14);
  trevorArcLight.position.set(0, 0.2, 0.8);
  mechBody.add(trevorArcLight);

  // IRON-MAN HELM
  trevorHead = new THREE_LIB.Group();
  trevorHead.position.set(0, 0.9, 0);

  const helmetGeo = new THREE_LIB.BoxGeometry(0.65, 0.75, 0.7);
  const helmet = new THREE_LIB.Mesh(helmetGeo, redArmorMat);
  trevorHead.add(helmet);

  const faceplateGeo = new THREE_LIB.BoxGeometry(0.5, 0.6, 0.1);
  const faceplate = new THREE_LIB.Mesh(faceplateGeo, goldArmorMat);
  faceplate.position.set(0, -0.04, 0.33);
  trevorHead.add(faceplate);

  // Leuchtende Augen
  const eyeGeo = new THREE_LIB.PlaneGeometry(0.13, 0.035);
  const eyeMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8, side: THREE_LIB.DoubleSide });
  [-1, 1].forEach(side => {
    const eye = new THREE_LIB.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.14, -0.02, 0.39);
    eye.rotation.z = side * 0.05;
    trevorHead.add(eye);
  });

  mechBody.add(trevorHead);

  // Schultern & Arme mit Repulsor-Händen
  [-1, 1].forEach(side => {
    const shoulderGeo = new THREE_LIB.SphereGeometry(0.32, 16, 16);
    const shoulder = new THREE_LIB.Mesh(shoulderGeo, goldArmorMat);
    shoulder.position.set(side * 0.78, 0.4, 0);
    mechBody.add(shoulder);

    const armGeo = new THREE_LIB.CylinderGeometry(0.13, 0.11, 0.65, 12);
    const arm = new THREE_LIB.Mesh(armGeo, redArmorMat);
    arm.position.set(side * 0.88, 0.05, 0.18);
    arm.rotation.x = Math.PI / 4;
    mechBody.add(arm);

    const handGeo = new THREE_LIB.BoxGeometry(0.18, 0.09, 0.22);
    const hand = new THREE_LIB.Mesh(handGeo, goldArmorMat);
    hand.position.set(side * 0.55, -0.38, 0.75);
    mechBody.add(hand);

    const repulsorGeo = new THREE_LIB.CircleGeometry(0.07, 16);
    const repulsorMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8, side: THREE_LIB.DoubleSide });
    const repulsor = new THREE_LIB.Mesh(repulsorGeo, repulsorMat);
    repulsor.rotation.x = Math.PI / 2;
    repulsor.position.set(side * 0.55, -0.43, 0.75);
    mechBody.add(repulsor);
    trevorHands.push(repulsor);
  });

  // Beine
  [-1, 1].forEach(side => {
    const legGeo = new THREE_LIB.CylinderGeometry(0.16, 0.14, 1.3, 12);
    const leg = new THREE_LIB.Mesh(legGeo, redArmorMat);
    leg.position.set(side * 0.35, -1.15, 0);
    mechBody.add(leg);

    const kneeGeo = new THREE_LIB.BoxGeometry(0.24, 0.24, 0.24);
    const knee = new THREE_LIB.Mesh(kneeGeo, goldArmorMat);
    knee.position.set(side * 0.35, -1.05, 0.1);
    mechBody.add(knee);
  });

  const trevorUserData = {
    type: 'trevor',
    name: 'Trevor (Director)',
    role: 'Studio Director & CEO Dispatcher',
    department: 'Command Core (Zentrale)',
    easy_explanation: 'Koordiniert alle 10 Abteilungen, 43 Spezialisten und Antigravity-Outputs.',
    status: 'MK-VII Iron-Man Armor aktiv & wachsam'
  };
  mechBody.userData = trevorUserData;
  chest.userData = trevorUserData;
  helmet.userData = trevorUserData;
  interactiveObjects.push(chest);
  interactiveObjects.push(helmet);
  trevorGroup.add(mechBody);

  // Schwebendes Label über Trevor
  const trevorLabel = createFloatingLabelSprite("TREVOR (MK-VII)", "Studio Director", "⚡ Befehlszentrale bereit", "#fbbf24");
  trevorLabel.position.set(0, 4.6, 0);
  trevorGroup.add(trevorLabel);

  // 3D Terminal "Deine Entscheidungen"
  const terminalGroup = new THREE_LIB.Group();
  terminalGroup.position.set(0, 0.5, 3.2);

  const standGeo = new THREE_LIB.BoxGeometry(0.8, 1.0, 0.35);
  const standMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const stand = new THREE_LIB.Mesh(standGeo, standMat);
  stand.position.y = 0.5;
  terminalGroup.add(stand);

  const screenGeo = new THREE_LIB.BoxGeometry(1.4, 0.8, 0.08);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
    roughness: 0.2
  });
  decisionTerminalScreen = new THREE_LIB.Mesh(screenGeo, screenMat);
  decisionTerminalScreen.position.set(0, 1.1, 0);
  decisionTerminalScreen.rotation.x = -Math.PI / 6;
  decisionTerminalScreen.userData = { type: 'decision_terminal', name: 'Deine Entscheidungen' };
  interactiveObjects.push(decisionTerminalScreen);
  terminalGroup.add(decisionTerminalScreen);

  trevorGroup.add(terminalGroup);

  // SpotLight direkt über Trevors Kommando-Balkon (Workflow Stage 1 & 4 Fokus)
  trevorSpotlight = new THREE_LIB.SpotLight(0xfbbf24, 0.4, 28, Math.PI / 3.8, 0.35, 1.2);
  trevorSpotlight.position.set(0, 14, 17.5);
  trevorSpotlight.target = trevorGroup;
  scene.add(trevorSpotlight);
  scene.add(trevorSpotlight.target);

  // Pulsierendes rotes/goldenes Aura-Licht für Trevor
  trevorStageAuraLight = new THREE_LIB.PointLight(0xef4444, 0.6, 12);
  trevorStageAuraLight.position.set(0, 3.2, 0);
  trevorGroup.add(trevorStageAuraLight);

  scene.add(trevorGroup);
}

/**
 * 14 Abteilungen in der Terrassen-Arena:
 * - 10 Software-Abteilungen auf der erhöhten Galerie-Terrasse (Radius ~17.0, y = 2.5)
 * - 4 Non-Code/Hardware/Archiv-Abteilungen in der Tieffeld-Arena (Radius ~5.2, y = -2.4)
 */
function setupCompactDepartments(THREE_LIB, hierarchyData) {
  const allDepts = hierarchyData.departments || [];
  const egDepts = allDepts.filter(d => d.floor !== 'UG');
  const ugDepts = allDepts.filter(d => d.floor === 'UG');

  // 1. EG-Abteilungen hufeisenförmig auf der erhöhten Galerie (y = 2.5, Radius ~17.0)
  const egRadius = 17.0;
  const startAngle = Math.PI * 0.22;
  const endAngle = Math.PI * 1.78;
  egDepts.forEach((dept, idx) => {
    const t = idx / (egDepts.length - 1 || 1);
    const angle = startAngle + t * (endAngle - startAngle);
    const posX = Math.sin(angle) * egRadius;
    const posZ = Math.cos(angle) * egRadius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, 2.5, posZ);
    podGroup.lookAt(0, 1.5, 0); // Ausrichtung direkt zum zentralen Holo-JARVIS

    buildDepartmentPod(THREE_LIB, podGroup, dept);
    scene.add(podGroup);
  });

  // 2. UG-Abteilungen im zentralen Tieffeld / Sunken Arena (y = -2.4, Radius ~5.2)
  const ugRadius = 5.2;
  ugDepts.forEach((dept, idx) => {
    const angle = (idx / (ugDepts.length || 1)) * Math.PI * 2 + Math.PI / 4;
    const posX = Math.sin(angle) * ugRadius;
    const posZ = Math.cos(angle) * ugRadius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, -2.4, posZ);
    podGroup.lookAt(0, -2.4, 0); // Blickwinkel zum Arenazentrum

    buildDepartmentPod(THREE_LIB, podGroup, dept);
    scene.add(podGroup);
  });
}

function buildDepartmentPod(THREE_LIB, podGroup, dept) {
  // 1. Schwebendes 3D-Billboard Label mit Live-Sprechblase (Micro-Status)
  const microStatus = dept.micro_status || '💬 Bereit für Anweisungen';
  const floorBadge = dept.floor === 'UG' ? ' [UG]' : '';
  const roomLabel = createFloatingLabelSprite(`${dept.name}${floorBadge}`, dept.chef_agent ? dept.chef_agent.name : '', microStatus, dept.color);
  roomLabel.position.set(0, 4.4, 0);
  podGroup.add(roomLabel);
  deptBillboards[dept.id] = roomLabel;

  // Eigene dezente Raumbeleuchtung in Abteilungsfarbe
  const deptColor = parseInt(dept.color.replace('#', '0x'), 16);
  const roomLight = new THREE_LIB.PointLight(deptColor, 1.4, 10);
  roomLight.position.set(0, 2.8, 0);
  podGroup.add(roomLight);

  // 2. Abteilungs-Teppich / Bodenplatte (abgerundet, edel)
  let floorMat;
  if (dept.floor_type === 'wood') {
    floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45, metalness: 0.1 });
  } else if (dept.floor_type === 'tech_servers') {
    floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x020617, roughness: 0.25, metalness: 0.6 });
  } else if (dept.floor_type === 'concrete' || dept.floor === 'UG') {
    floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.3 });
  } else {
    floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.2 });
  }

  const plateGeo = new THREE_LIB.CylinderGeometry(3.8, 4.0, 0.2, 24);
  const plate = new THREE_LIB.Mesh(plateGeo, floorMat);
  plate.position.y = 0.1;
  plate.receiveShadow = true;
  plate.userData = {
    type: 'department',
    deptId: dept.id,
    floor: dept.floor || 'EG',
    name: dept.name,
    easy_explanation: dept.easy_explanation
  };
  interactiveObjects.push(plate);
  podGroup.add(plate);

  // Akzent-Kantenring
  const borderGeo = new THREE_LIB.TorusGeometry(3.8, 0.05, 8, 32);
  const borderMat = new THREE_LIB.MeshBasicMaterial({ color: deptColor });
  const border = new THREE_LIB.Mesh(borderGeo, borderMat);
  border.rotation.x = Math.PI / 2;
  border.position.y = 0.21;
  podGroup.add(border);

  // 3. Niedrige, halboffene Glas-Trennwände (100% ungehinderte Sichtbarkeit & Raycasting)
  const glassGeo = new THREE_LIB.CylinderGeometry(3.7, 3.7, 1.1, 24, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
  const glassMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    transmission: 0.88,
    side: THREE_LIB.DoubleSide
  });
  const glass = new THREE_LIB.Mesh(glassGeo, glassMat);
  glass.position.y = 0.8;
  podGroup.add(glass);

  // 4. Raum-Ausstattung: Requisiten, Pflanzen & Server
  setupRoomProps(THREE_LIB, podGroup, dept);

  // 5. Chef-Station mit Amber-Audit Monitor
  setupChefStation(THREE_LIB, podGroup, dept);

  // 6. Spezial-PCs mit leuchtenden Monitoren & Entwicklern
  setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept);
}

function setupRoomProps(THREE_LIB, podGroup, dept) {
  // Pflanzentopf im EG (im UG dezentere Deko)
  if (dept.floor !== 'UG') {
    const potGeo = new THREE_LIB.CylinderGeometry(0.28, 0.2, 0.45, 12);
    const potMat = new THREE_LIB.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const pot = new THREE_LIB.Mesh(potGeo, potMat);
    pot.position.set(-2.8, 0.42, 1.2);
    podGroup.add(pot);

    const plantGeo = new THREE_LIB.DodecahedronGeometry(0.42, 1);
    const plantMat = new THREE_LIB.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
    const plant = new THREE_LIB.Mesh(plantGeo, plantMat);
    plant.position.set(-2.8, 0.8, 1.2);
    podGroup.add(plant);
  }

  // Server-Racks mit blinkenden LEDs in Backend, DB, Security & Serverraum
  if (dept.id === 5 || dept.id === 6 || dept.id === 8 || dept.id === 12) {
    const rackGeo = new THREE_LIB.BoxGeometry(0.7, 1.8, 0.55);
    const rackMat = new THREE_LIB.MeshStandardMaterial({ color: 0x020617, metalness: 0.85, roughness: 0.25 });
    const rack = new THREE_LIB.Mesh(rackGeo, rackMat);
    rack.position.set(2.8, 1.0, 1.0);
    podGroup.add(rack);

    for (let i = 0; i < 4; i++) {
      const ledGeo = new THREE_LIB.CircleGeometry(0.035, 8);
      const ledMat = new THREE_LIB.MeshBasicMaterial({ color: i % 2 === 0 ? 0x10b981 : 0x06b6d4 });
      const led = new THREE_LIB.Mesh(ledGeo, ledMat);
      led.position.set(2.8 - 0.15 + (i * 0.1), 1.5, 1.29);
      led.rotation.y = -Math.PI / 2;
      podGroup.add(led);
      blinkingLeds.push(led);
    }
  }

  // Whiteboard / Kanban-Board in Planung & Design
  if (dept.id === 1 || dept.id === 3 || dept.id === 10) {
    const boardGeo = new THREE_LIB.BoxGeometry(1.2, 0.9, 0.04);
    const boardMat = new THREE_LIB.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const board = new THREE_LIB.Mesh(boardGeo, boardMat);
    board.position.set(2.6, 1.2, 1.0);
    board.rotation.y = -Math.PI / 3;
    podGroup.add(board);
  }

  // Archiv (id: 11): Bücherregal & Wissens-Schrank
  if (dept.id === 11) {
    const shelfGeo = new THREE_LIB.BoxGeometry(0.5, 1.8, 1.3);
    const shelfMat = new THREE_LIB.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const shelf = new THREE_LIB.Mesh(shelfGeo, shelfMat);
    shelf.position.set(2.6, 1.0, 0.8);
    shelf.rotation.y = -Math.PI / 4;
    podGroup.add(shelf);
  }

  // Werkstatt (id: 13): Werkbank & Toolbox
  if (dept.id === 13) {
    const benchGeo = new THREE_LIB.BoxGeometry(0.6, 0.8, 1.2);
    const benchMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
    const bench = new THREE_LIB.Mesh(benchGeo, benchMat);
    bench.position.set(2.6, 0.5, 0.8);
    bench.rotation.y = -Math.PI / 4;
    podGroup.add(bench);

    const toolboxGeo = new THREE_LIB.BoxGeometry(0.3, 0.25, 0.45);
    const toolboxMat = new THREE_LIB.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
    const toolbox = new THREE_LIB.Mesh(toolboxGeo, toolboxMat);
    toolbox.position.set(2.6, 1.05, 0.8);
    podGroup.add(toolbox);
  }

  // Lounge (id: 14): Sofa & Tisch
  if (dept.id === 14) {
    const sofaGeo = new THREE_LIB.BoxGeometry(0.7, 0.6, 1.5);
    const sofaMat = new THREE_LIB.MeshStandardMaterial({ color: 0x4338ca, roughness: 0.8 });
    const sofa = new THREE_LIB.Mesh(sofaGeo, sofaMat);
    sofa.position.set(2.6, 0.4, 0.8);
    sofa.rotation.y = -Math.PI / 4;
    podGroup.add(sofa);
  }
}

function setupChefStation(THREE_LIB, podGroup, dept) {
  const chef = dept.chef_agent;
  const chefGroup = new THREE_LIB.Group();
  chefGroup.position.set(0, 0.2, 2.4);

  // Chef-Schreibtisch
  const deskGeo = new THREE_LIB.BoxGeometry(1.4, 0.65, 0.6);
  const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.32;
  chefGroup.add(desk);

  // Widescreen Chef-Monitor
  const screenGeo = new THREE_LIB.BoxGeometry(1.1, 0.55, 0.06);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x1e293b,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    map: serverScreenTexture || null
  });
  const chefUserData = {
    type: 'chef',
    chefId: chef.id,
    deptId: dept.id,
    floor: dept.floor || 'EG',
    name: chef.name,
    role: chef.focus || `Chef-Agent (${dept.name})`,
    department: dept.name,
    easy_explanation: chef.easy_explanation,
    status: 'Leitet die Abteilung, prüft Logik & Schnittstellen'
  };
  const screen = new THREE_LIB.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.85, -0.05);
  screen.userData = chefUserData;
  chefGroup.add(screen);
  interactiveObjects.push(screen);

  // Chef-Avatar
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, true);
  avatar.position.set(0, 0.1, 0.45);
  avatar.userData = chefUserData;
  avatar.traverse(child => {
    if (child.isMesh) {
      child.userData = chefUserData;
      interactiveObjects.push(child);
    }
  });
  chefGroup.add(avatar);

  chefMeshMap[chef.id] = { screen, avatarArms: avatar.userData.arms, name: chef.name };
  allChefScreenMeshes.push({
    mesh: screen,
    chefId: chef.id,
    deptId: dept.id,
    deptColor: dept.color,
    floor: dept.floor || 'EG'
  });
  podGroup.add(chefGroup);
}

function setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept) {
  const pcCount = dept.specialist_pcs.length;

  dept.specialist_pcs.forEach((pc, idx) => {
    const pcGroup = new THREE_LIB.Group();
    const angle = -Math.PI * 0.38 + (idx / (pcCount - 1 || 1)) * (Math.PI * 0.76);
    const dist = 2.1;
    const posX = Math.sin(angle) * dist;
    const posZ = -Math.cos(angle) * dist;

    pcGroup.position.set(posX, 0.2, posZ);
    pcGroup.rotation.y = angle + Math.PI;

    // Schreibtisch
    const deskGeo = new THREE_LIB.BoxGeometry(1.05, 0.6, 0.55);
    const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
    desk.position.y = 0.3;
    pcGroup.add(desk);

    // Dual-Monitore mit Code-Textur
    const screenGeo = new THREE_LIB.BoxGeometry(0.46, 0.32, 0.035);
    const screenMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0f172a,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      map: codeScreenTexture || null
    });

    const pcUserData = {
      type: 'pc',
      pcId: pc.id,
      deptId: dept.id,
      floor: dept.floor || 'EG',
      name: pc.name,
      role: pc.title || pc.focus || 'Senior Software Engineer',
      department: dept.name,
      easy_explanation: pc.easy_explanation,
      status: 'Entwickelt Fachmodule & Code'
    };

    const screenLeft = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenLeft.position.set(-0.25, 0.8, 0.04);
    screenLeft.rotation.y = 0.14;
    screenLeft.userData = pcUserData;
    pcGroup.add(screenLeft);
    interactiveObjects.push(screenLeft);

    const screenRight = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenRight.position.set(0.25, 0.8, 0.04);
    screenRight.rotation.y = -0.14;
    screenRight.userData = pcUserData;
    pcGroup.add(screenRight);
    interactiveObjects.push(screenRight);

    // Bürostuhl
    const chairGeo = new THREE_LIB.CylinderGeometry(0.24, 0.24, 0.38, 12);
    const chairMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    const chair = new THREE_LIB.Mesh(chairGeo, chairMat);
    chair.position.set(0, 0.19, 0.45);
    pcGroup.add(chair);

    // Entwickler-Avatar
    const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, false);
    avatar.position.set(0, 0.19, 0.45);
    avatar.userData = pcUserData;
    avatar.traverse(child => {
      if (child.isMesh) {
        child.userData = pcUserData;
        interactiveObjects.push(child);
      }
    });
    pcGroup.add(avatar);
    developerAvatars.push(avatar);

    pcMeshMap[pc.id] = {
      screenLeft,
      screenRight,
      avatarArms: avatar.userData.arms,
      name: pc.name
    };
    allPcScreenMeshes.push(screenLeft);
    allPcScreenMeshes.push(screenRight);

    podGroup.add(pcGroup);
  });
}

function createStylizedDeveloperAvatar(THREE_LIB, deptColorHex, isChef = false) {
  const avatarGroup = new THREE_LIB.Group();

  const torsoColor = isChef ? 0x0f172a : parseInt(deptColorHex.replace('#', '0x'), 16);
  const torsoGeo = new THREE_LIB.BoxGeometry(0.36, 0.46, 0.24);
  const torsoMat = new THREE_LIB.MeshStandardMaterial({ color: torsoColor, roughness: 0.7 });
  const torso = new THREE_LIB.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.42;
  avatarGroup.add(torso);

  const headGeo = new THREE_LIB.SphereGeometry(0.15, 16, 16);
  const headMat = new THREE_LIB.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 });
  const head = new THREE_LIB.Mesh(headGeo, headMat);
  head.position.y = 0.76;
  avatarGroup.add(head);

  const armsGroup = new THREE_LIB.Group();
  [-1, 1].forEach((side) => {
    const armGeo = new THREE_LIB.CylinderGeometry(0.05, 0.045, 0.3, 8);
    const arm = new THREE_LIB.Mesh(armGeo, torsoMat);
    arm.position.set(side * 0.2, 0.36, -0.12);
    arm.rotation.x = Math.PI / 2.8;
    armsGroup.add(arm);
  });
  avatarGroup.add(armsGroup);
  avatarGroup.userData = { arms: armsGroup, isChef };

  return avatarGroup;
}

/**
 * Schießt leuchtende Datenpartikel von einer Abteilung zu Trevor in die Mitte
 */
export function triggerDataStreamToTrevor(deptId) {
  const THREE_LIB = window.THREE;
  if (!THREE_LIB || !scene) return;

  const depts = STUDIO_HIERARCHY.departments;
  const dept = depts.find(d => d.id === deptId);
  if (!dept) return;

  const isUG = dept.floor === 'UG';
  const ugDepts = depts.filter(d => d.floor === 'UG');
  const egDepts = depts.filter(d => d.floor !== 'UG');
  
  let startX, startY, startZ;
  if (isUG) {
    const idx = ugDepts.findIndex(d => d.id === deptId);
    const angle = (idx / (ugDepts.length || 1)) * Math.PI * 2 + Math.PI / 4;
    startX = Math.sin(angle) * 4.2;
    startZ = Math.cos(angle) * 4.2;
    startY = -1.8;
  } else {
    const idx = egDepts.findIndex(d => d.id === deptId);
    const startAngle = Math.PI * 0.22;
    const endAngle = Math.PI * 1.78;
    const t = idx / (egDepts.length - 1 || 1);
    const angle = startAngle + t * (endAngle - startAngle);
    startX = Math.sin(angle) * 15.5;
    startZ = Math.cos(angle) * 15.5;
    startY = 3.2;
  }

  // Zielpunkt: Zentral schwebender Holo-JARVIS bei (0, 1.8, 0)
  const target = new THREE_LIB.Vector3(0, 1.8, 0);

  for (let i = 0; i < 6; i++) {
    const pGeo = new THREE_LIB.SphereGeometry(0.22, 10, 10);
    const pMat = new THREE_LIB.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.95
    });
    const p = new THREE_LIB.Mesh(pGeo, pMat);
    p.position.set(startX, startY, startZ);
    scene.add(p);

    dynamicParticleStreams.push({
      mesh: p,
      start: new THREE_LIB.Vector3(startX, startY, startZ),
      mid: new THREE_LIB.Vector3(startX * 0.5, Math.max(startY, 1.8) + 2.5, startZ * 0.5),
      end: target,
      progress: -(i * 0.16),
      speed: 0.025
    });
  }
}

function setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick) {
  const raycaster = new THREE_LIB.Raycaster();
  const mouse = new THREE_LIB.Vector2();

  renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      let data = hit.userData;
      if ((!data || !data.name) && hit.parent && hit.parent.userData) {
        data = hit.parent.userData;
      }

      if (!data) return;

      // 1. Schwebendes Agenten-Info-Panel aufrufen & Event aussenden
      if (typeof window !== 'undefined') {
        if (typeof window.showAgentInfo === 'function') {
          window.showAgentInfo(data);
        }
        window.dispatchEvent(new CustomEvent('agentSelected', { detail: data }));
      }

      // 2. 3D-Kamera sanft auf das anvisierte Ziel ausrichten & zoomen
      if (data.type === 'trevor' || data.type === 'decision_terminal') {
        zoomToPosition(THREE_LIB, new THREE_LIB.Vector3(0, 2.5, 17.5), 10);
      } else if (data.type === 'holo_jarvis' || data.type === 'ug_terminal') {
        zoomToPosition(THREE_LIB, new THREE_LIB.Vector3(0, 1.5, 0), 10);
      } else if (data.type === 'pc') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 10);
      } else if (data.type === 'chef') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 10);
      } else if (data.type === 'department') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 15);
      }
    }
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  });
}

function zoomToPosition(THREE_LIB, targetVec, distance = 12) {
  targetLookAt = targetVec.clone();
  targetCameraPos = targetVec.clone().add(new THREE_LIB.Vector3(0, distance * 0.7, distance));
}

export function switchFloor(targetFloor) {
  const THREE = getTHREE();
  if (!THREE) return;
  currentFloor = targetFloor === 'UG' ? 'UG' : 'EG';

  const btnEg = document.getElementById('ctrl-floor-eg');
  const btnUg = document.getElementById('ctrl-floor-ug');

  if (currentFloor === 'UG') {
    if (btnEg) btnEg.classList.remove('active');
    if (btnUg) btnUg.classList.add('active');
    // Sanfter Kamera-Flug in die Tieffeld-Arena (Sunken Basin)
    targetCameraPos = new THREE.Vector3(0, 5.5, 11);
    targetLookAt = new THREE.Vector3(0, -2.0, 0);
  } else {
    if (btnUg) btnUg.classList.remove('active');
    if (btnEg) btnEg.classList.add('active');
    // Sanfter Kamera-Flug zur Terrassen-Galerie
    targetCameraPos = new THREE.Vector3(0, 15, 21);
    targetLookAt = new THREE.Vector3(0, 2.6, -3.5);
  }
  console.log(`[Studio 3D] Etagen-Fahrt: Ziel=${currentFloor}`);
}

/**
 * Setzt die Kamera via lerp in der render-Schleife (animate) zwingend auf die Standard-Koordinaten
 * zurück, um aus jedem Zoom und jeder Neigung herauszukommen.
 */
export function reset3DCamera() {
  const THREE = getTHREE();
  if (!THREE || !camera) return;

  currentFloor = 'EG';
  targetCameraPos = new THREE.Vector3(0, 17, 26);
  targetLookAt = new THREE.Vector3(0, 0.8, 0);

  const btnEg = document.getElementById('ctrl-floor-eg');
  const btnUg = document.getElementById('ctrl-floor-ug');
  if (btnUg) btnUg.classList.remove('active');
  if (btnEg) btnEg.classList.add('active');

  console.log('[Studio 3D] reset3DCamera aktiviert: lerp zurück zum Amphitheater-Blick');
}

function setupCameraButtons() {
  const btnRotLeft = document.getElementById('ctrl-rot-left');
  const btnRotRight = document.getElementById('ctrl-rot-right');
  const btnZoomIn = document.getElementById('ctrl-zoom-in');
  const btnZoomOut = document.getElementById('ctrl-zoom-out');
  const btnReset = document.getElementById('ctrl-reset-cam');
  const btnQuiet = document.getElementById('ctrl-quiet-toggle');
  const btnFloorEg = document.getElementById('ctrl-floor-eg');
  const btnFloorUg = document.getElementById('ctrl-floor-ug');

  if (btnRotLeft) btnRotLeft.addEventListener('click', () => rotateCameraAroundCenter(0.25));
  if (btnRotRight) btnRotRight.addEventListener('click', () => rotateCameraAroundCenter(-0.25));
  if (btnZoomIn && controls) btnZoomIn.addEventListener('click', () => camera.position.multiplyScalar(0.85));
  if (btnZoomOut && controls) btnZoomOut.addEventListener('click', () => camera.position.multiplyScalar(1.15));
  if (btnFloorEg) btnFloorEg.addEventListener('click', () => switchFloor('EG'));
  if (btnFloorUg) btnFloorUg.addEventListener('click', () => switchFloor('UG'));
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      reset3DCamera();
    });
  }
  if (btnQuiet) {
    btnQuiet.addEventListener('click', () => {
      isQuietMode = !isQuietMode;
      btnQuiet.classList.toggle('active', isQuietMode);
      btnQuiet.innerText = isQuietMode ? 'Ruhige Ansicht: AN' : 'Ruhige Ansicht';
    });
  }
}

function rotateCameraAroundCenter(angleDelta) {
  const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
  const currentAngle = Math.atan2(camera.position.z, camera.position.x);
  const newAngle = currentAngle + angleDelta;
  camera.position.x = Math.cos(newAngle) * radius;
  camera.position.z = Math.sin(newAngle) * radius;
  const targetY = currentFloor === 'UG' ? -2.0 : 0.8;
  camera.lookAt(0, targetY, 0);
  if (controls) controls.target.set(0, targetY, 0);
}

export function updateAgentStatusIn3D(agentId, type, status) {
  if (type === 'pc' && pcMeshMap[agentId]) {
    const { screenLeft, screenRight, avatarArms } = pcMeshMap[agentId];
    if (status === 'working') {
      // Grünes Aufleuchten der Bildschirme & tippen der Arme
      screenLeft.material.emissive.setHex(0x00ff88);
      screenLeft.material.emissiveIntensity = 2.4;
      screenRight.material.emissive.setHex(0x00ff88);
      screenRight.material.emissiveIntensity = 2.4;
      if (avatarArms) avatarArms.position.y = 0.05;
    } else if (status === 'done') {
      screenLeft.material.emissive.setHex(0x10b981);
      screenLeft.material.emissiveIntensity = 1.2;
      screenRight.material.emissive.setHex(0x10b981);
      screenRight.material.emissiveIntensity = 1.2;
    } else {
      screenLeft.material.emissive.setHex(0x0f172a);
      screenLeft.material.emissiveIntensity = 0.5;
      screenRight.material.emissive.setHex(0x0f172a);
      screenRight.material.emissiveIntensity = 0.5;
    }
  } else if (type === 'chef' && chefMeshMap[agentId]) {
    const { screen, avatarArms } = chefMeshMap[agentId];
    if (status === 'auditing' || status === 'working') {
      screen.material.emissive.setHex(0xf59e0b);
      screen.material.emissiveIntensity = 2.6;
      if (avatarArms) avatarArms.position.y = 0.05;
    } else if (status === 'done') {
      screen.material.emissive.setHex(0x10b981);
      screen.material.emissiveIntensity = 1.2;
    } else {
      screen.material.emissive.setHex(0x1e293b);
      screen.material.emissiveIntensity = 0.5;
    }
  }
}

export function setStageIn3D(stageNum) {
  update3DStudioState(stageNum);
}

/**
 * Aktualisiert den Live-Status eines Agenten in seinen 3D-Meshes und im UI-Info-Panel falls geöffnet.
 * Unterstützt Aufrufe mit:
 * - (agentName, statusMessage)
 * - (agentId, statusOrState, message)
 * 
 * @param {string|number} agentIdOrName - ID oder Name des Agenten (z. B. 101, "Max", "Viktor", "Trevor")
 * @param {string} [statusOrState] - 'working', 'auditing', 'done', 'idle' oder direkt Statusnachricht
 * @param {string} [message] - Optionale detaillierte Statusnachricht
 */
export function updateAgentStatus(agentIdOrName, statusOrState, message) {
  if (agentIdOrName === undefined || agentIdOrName === null) return;

  let stateType = null;
  let statusMessage = '';

  if (message !== undefined) {
    stateType = statusOrState;
    statusMessage = message;
  } else if (typeof statusOrState === 'string' && ['working', 'auditing', 'done', 'idle'].includes(statusOrState.toLowerCase())) {
    stateType = statusOrState.toLowerCase();
    statusMessage = statusOrState;
  } else {
    statusMessage = statusOrState || '';
  }

  // 1. In allen passenden interactiveObjects das userData.currentTask aktualisieren
  let foundCount = 0;
  for (const obj of interactiveObjects) {
    if (!obj || !obj.userData) continue;
    const match = obj.userData.id === agentIdOrName || 
                  String(obj.userData.id) === String(agentIdOrName) ||
                  (obj.userData.name && obj.userData.name.toLowerCase() === String(agentIdOrName).toLowerCase());
    if (match) {
      if (statusMessage) obj.userData.currentTask = statusMessage;
      foundCount++;
    }
  }

  // 2. 3D Meshes aktualisieren (PC / Chef)
  const idStr = String(agentIdOrName);
  if (pcMeshMap[agentIdOrName] || pcMeshMap[idStr]) {
    updateAgentStatusIn3D(pcMeshMap[agentIdOrName] ? agentIdOrName : idStr, 'pc', stateType || 'working');
  } else if (chefMeshMap[agentIdOrName] || chefMeshMap[idStr]) {
    updateAgentStatusIn3D(chefMeshMap[agentIdOrName] ? agentIdOrName : idStr, 'chef', stateType || 'auditing');
  } else {
    // Check ob agentIdOrName einem Namen entspricht
    for (const [id, pc] of Object.entries(pcMeshMap)) {
      if (pc.name && pc.name.toLowerCase() === String(agentIdOrName).toLowerCase()) {
        updateAgentStatusIn3D(id, 'pc', stateType || 'working');
        break;
      }
    }
    for (const [id, chef] of Object.entries(chefMeshMap)) {
      if (chef.name && chef.name.toLowerCase() === String(agentIdOrName).toLowerCase()) {
        updateAgentStatusIn3D(id, 'chef', stateType || 'auditing');
        break;
      }
    }
  }

  // 3. Falls das schwebende Agenten-Info-Panel offen ist und genau diesen Agenten anzeigt -> Text live aktualisieren
  if (typeof document !== 'undefined') {
    const panel = document.getElementById('agent-info-panel');
    const nameEl = document.getElementById('agent-info-name');
    const statusTextEl = document.getElementById('status-text');

    if (panel && panel.style.display !== 'none' && nameEl) {
      const currentPanelName = nameEl.innerText.trim().toLowerCase();
      if (currentPanelName === String(agentIdOrName).trim().toLowerCase() ||
          (pcMeshMap[agentIdOrName] && pcMeshMap[agentIdOrName].name && pcMeshMap[agentIdOrName].name.toLowerCase() === currentPanelName)) {
        if (statusTextEl && statusMessage) {
          statusTextEl.innerText = statusMessage;
        }
      }
    }
  }

  console.log(`[Studio3D] updateAgentStatus: "${agentIdOrName}" (${stateType || 'status'}) -> "${statusMessage}" (${foundCount} Meshes)`);
}

/**
 * Passt das Aussehen der 3D-Objekte abhängig vom Workflow-Status dynamisch an
 * @param {string|number} stageInput - 'idle', 'stage1', 'stage2', 'stage3', 'stage4', 'routing'
 * @param {string} [floor] - 'EG' | 'UG'
 */
export function update3DStudioState(stageInput, floor) {
  const THREE = getTHREE();
  if (!THREE || !scene) return;

  // Zustandsbasierte native Kamera-Animation laut Anforderung
  if (floor !== undefined && floor !== null) {
    currentFloor = (floor === 'UG') ? 'UG' : 'EG';
    switchFloor(currentFloor);
  } else if (typeof stageInput === 'string' && (stageInput.toLowerCase().includes('ug') || stageInput.toLowerCase().includes('keller') || stageInput.toLowerCase().includes('untergeschoss'))) {
    currentFloor = 'UG';
    switchFloor('UG');
  }

  const btnEg = document.getElementById('ctrl-floor-eg');
  const btnUg = document.getElementById('ctrl-floor-ug');
  if (currentFloor === 'UG') {
    if (btnEg) btnEg.classList.remove('active');
    if (btnUg) btnUg.classList.add('active');
  } else {
    if (btnUg) btnUg.classList.remove('active');
    if (btnEg) btnEg.classList.add('active');
  }

  let stage = 'idle';
  if (typeof stageInput === 'number') {
    stage = `stage${stageInput}`;
  } else if (typeof stageInput === 'string') {
    const s = stageInput.toLowerCase();
    if (s.includes('ug') || s.includes('keller') || s.includes('untergeschoss') || s.includes('hardware')) stage = 'ug_active';
    else if (s.includes('1') || s.includes('dispatch') || s.includes('ceo')) stage = 'stage1';
    else if (s.includes('2') || s.includes('fach') || s.includes('worker') || s.includes('spezialist')) stage = 'stage2';
    else if (s.includes('3') || s.includes('chef') || s.includes('audit') || s.includes('lead')) stage = 'stage3';
    else if (s.includes('4') || s.includes('synth') || s.includes('decision') || s.includes('freigabe')) stage = 'stage4';
    else if (s.includes('idle') || s.includes('bereit') || s.includes('training')) stage = 'idle';
    else stage = stageInput;
  }

  currentWorkflowStage = stage;
  if (stageTransitionTimeout) {
    clearTimeout(stageTransitionTimeout);
    stageTransitionTimeout = null;
  }

  console.log(`[Studio 3D] Workflow-Zustand gewechselt zu: "${stage}" (targetCameraY: ${targetCameraY}, Floor: ${currentFloor})`);

  // --- ZUSTAND: UG ACTIVE (UNTERGESCHOSS / HARDWARE- & NON-CODE-TASKS) ---
  if (stage === 'ug_active') {
    switchFloor('UG');

    ugLights.forEach(l => { if (l) l.intensity = 2.4; });

    // UG Monitore bringen
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        if (mesh.userData && mesh.userData.floor === 'UG') {
          mesh.material.emissive = new THREE.Color(0x06b6d4);
          mesh.material.emissiveIntensity = 2.8;
        } else {
          mesh.material.emissive.setHex(0x0a0f1d);
          mesh.material.emissiveIntensity = 0.25;
        }
      }
    });

    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        if (item.floor === 'UG') {
          item.mesh.material.emissive = new THREE.Color(0xf59e0b);
          item.mesh.material.emissiveIntensity = 2.8;
        } else {
          item.mesh.material.emissive.setHex(0x0f172a);
          item.mesh.material.emissiveIntensity = 0.25;
        }
      }
    });
    return;
  }

  // --- ZUSTAND: IDLE ---
  if (stage === 'idle') {
    if (currentFloor === 'UG') {
      switchFloor('EG');
    }

    if (trevorSpotlight) {
      trevorSpotlight.intensity = 0.4;
      trevorSpotlight.color.setHex(0xfbbf24);
    }
    if (trevorStageAuraLight) {
      trevorStageAuraLight.intensity = 0.6;
      trevorStageAuraLight.color.setHex(0xef4444);
    }
    if (trevorArcLight) {
      trevorArcLight.color.setHex(0x38bdf8);
      trevorArcLight.intensity = 3.5;
    }

    // Bildschirme leicht gedimmt
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.emissive.setHex(0x0f172a);
        mesh.material.emissiveIntensity = 0.4;
      }
    });

    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive.setHex(0x1e293b);
        item.mesh.material.emissiveIntensity = 0.5;
      }
    });

    if (decisionTerminalScreen && decisionTerminalScreen.material) {
      decisionTerminalScreen.material.emissive.setHex(0x06b6d4);
      decisionTerminalScreen.material.emissiveIntensity = 0.8;
    }

    if (STUDIO_HIERARCHY?.departments) {
      STUDIO_HIERARCHY.departments.forEach(d => updateRoomMicroStatus(d.id, 'Online 24/7'));
    }
  }

  // --- ZUSTAND: STAGE 1 (DISPATCHER / TREVOR) ---
  else if (stage === 'stage1') {
    if (currentFloor === 'UG') {
      switchFloor('EG');
    }

    if (STUDIO_HIERARCHY?.departments) {
      STUDIO_HIERARCHY.departments.forEach(d => updateRoomMicroStatus(d.id, 'Bereit für Auftrag'));
    }

    // Spotlight über Trevors CEO-Schreibtisch wird aktiviert
    if (trevorSpotlight) {
      trevorSpotlight.intensity = 6.5;
      trevorSpotlight.color.setHex(0xfbbf24);
    }
    // Helligkeit um seinen Avatar herum pulsiert
    if (trevorStageAuraLight) {
      trevorStageAuraLight.intensity = 4.5;
      trevorStageAuraLight.color.setHex(0xef4444);
    }
    if (trevorArcLight) {
      trevorArcLight.color.setHex(0x38bdf8);
      trevorArcLight.intensity = 7.0;
    }

    // Bildschirme im Standby
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.emissive.setHex(0x0f172a);
        mesh.material.emissiveIntensity = 0.3;
      }
    });
    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive.setHex(0x1e293b);
        item.mesh.material.emissiveIntensity = 0.3;
      }
    });
  }

  // --- ZUSTAND: STAGE 2 (FACH-AGENTEN / WORKER) ---
  else if (stage === 'stage2') {
    if (trevorSpotlight) {
      trevorSpotlight.intensity = 1.0;
    }
    if (trevorStageAuraLight) {
      trevorStageAuraLight.intensity = 1.0;
    }

    // Materialien der PC-Bildschirme der aktiven Etage leuchten auf
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        const isCurrentFloor = (currentFloor === 'UG' && mesh.userData && mesh.userData.floor === 'UG') ||
                               (currentFloor === 'EG' && (!mesh.userData || mesh.userData.floor !== 'UG'));
        if (isCurrentFloor) {
          mesh.material.emissive = new THREE.Color(currentFloor === 'UG' ? 0x06b6d4 : 0x00ff88);
          mesh.material.emissiveIntensity = 2.8;
        } else {
          mesh.material.emissive.setHex(0x0a0f1d);
          mesh.material.emissiveIntensity = 0.25;
        }
      }
    });

    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive.setHex(0x0f172a);
        item.mesh.material.emissiveIntensity = 0.3;
      }
    });

    if (STUDIO_HIERARCHY?.departments) {
      STUDIO_HIERARCHY.departments.forEach(d => {
        const isCurrentFloor = (currentFloor === 'UG' && d.floor === 'UG') || (currentFloor === 'EG' && d.floor !== 'UG');
        updateRoomMicroStatus(d.id, isCurrentFloor ? 'Arbeitet an Modul... 💻' : 'Standby');
      });
    }
  }

  // --- ZUSTAND: STAGE 3 (ABTEILUNGSLEITER / AUDIT) ---
  else if (stage === 'stage3') {
    if (trevorSpotlight) {
      trevorSpotlight.intensity = 1.2;
    }

    if (STUDIO_HIERARCHY?.departments) {
      STUDIO_HIERARCHY.departments.forEach(d => {
        const isCurrentFloor = (currentFloor === 'UG' && d.floor === 'UG') || (currentFloor === 'EG' && d.floor !== 'UG');
        updateRoomMicroStatus(d.id, isCurrentFloor ? 'Lead-Audit aktiv 🔍' : 'Standby');
      });
    }

    // Bildschirme der Fach-Agenten dimmen wieder ab
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.emissive.setHex(0x0f172a);
        mesh.material.emissiveIntensity = 0.3;
      }
    });

    // Bereiche der Abteilungsleiter leuchten auf
    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        const isCurrentFloor = (currentFloor === 'UG' && item.floor === 'UG') ||
                               (currentFloor === 'EG' && item.floor !== 'UG');
        if (isCurrentFloor) {
          item.mesh.material.emissive = new THREE.Color(0xf59e0b); // Strahlendes Amber-Gold
          item.mesh.material.emissiveIntensity = 3.2;
        } else {
          item.mesh.material.emissive.setHex(0x0f172a);
          item.mesh.material.emissiveIntensity = 0.25;
        }
      }
    });

    // Visuelle Datenströme triggern
    const activeDepts = STUDIO_HIERARCHY.departments.filter(d => (currentFloor === 'UG' ? d.floor === 'UG' : d.floor !== 'UG'));
    activeDepts.forEach((dept, i) => {
      setTimeout(() => triggerDataStreamToTrevor(dept.id), i * 120);
    });
  }

  // --- ZUSTAND: STAGE 4 (SYNTHESE / TREVOR) ---
  else if (stage === 'stage4') {
    // Alles dimmt ab
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.emissive.setHex(0x0a0f1d);
        mesh.material.emissiveIntensity = 0.2;
      }
    });

    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive.setHex(0x0f172a);
        item.mesh.material.emissiveIntensity = 0.3;
      }
    });

    // Trevors Bereich leuchtet kurz auf (Erfolgs-Feedback)
    if (trevorSpotlight) {
      trevorSpotlight.intensity = 9.0;
      trevorSpotlight.color.setHex(0xfbbf24);
    }
    if (trevorStageAuraLight) {
      trevorStageAuraLight.intensity = 7.0;
      trevorStageAuraLight.color.setHex(0x10b981); // Smaragd-Grüner Erfolgs-Glow
    }
    if (trevorArcLight) {
      trevorArcLight.intensity = 9.0;
      trevorArcLight.color.setHex(0x38bdf8);
    }
    if (decisionTerminalScreen && decisionTerminalScreen.material) {
      decisionTerminalScreen.material.emissive.setHex(0x10b981);
      decisionTerminalScreen.material.emissiveIntensity = 3.6;
    }

    if (STUDIO_HIERARCHY?.departments) {
      STUDIO_HIERARCHY.departments.forEach(d => updateRoomMicroStatus(d.id, 'Geprüft & Freigegeben ✔'));
    }

    // Sanfter Übergang zurück zu idle nach Erfolgs-Feedback (und zurück ins EG falls im UG)
    stageTransitionTimeout = setTimeout(() => {
      if (currentWorkflowStage === 'stage4') {
        if (currentFloor === 'UG') {
          switchFloor('EG');
        }
        update3DStudioState('idle');
      }
    }, 4500);
  }
}

let lastFrameTime = performance.now();

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) * 0.001, 0.1);
  lastFrameTime = now;
  const time = now * 0.001;

  // 1. ZENTRALER HOLOGRAPHISCHER J.A.R.V.I.S. (Quantum-Matrix Animation)
  if (holoJarvisGroup && !isQuietMode) {
    // Rotation des Quantum-Wireframe-Kerns
    if (holoJarvisCore) {
      holoJarvisCore.rotation.x += 0.012;
      holoJarvisCore.rotation.y += 0.018;
    }
    // Gegenläufige Gyroskop-Orbitalringe
    if (holoJarvisRings.length === 3) {
      holoJarvisRings[0].rotation.x += 0.022;
      holoJarvisRings[0].rotation.y += 0.015;
      holoJarvisRings[1].rotation.y -= 0.026;
      holoJarvisRings[1].rotation.z += 0.018;
      holoJarvisRings[2].rotation.z += 0.020;
      holoJarvisRings[2].rotation.x -= 0.016;
    }
    // Partikel-Swarm rotieren & leicht oscillieren
    if (holoJarvisParticles) {
      holoJarvisParticles.rotation.y += 0.006;
      holoJarvisParticles.rotation.x = Math.sin(time * 0.8) * 0.08;
    }

    // Audio-reaktives Pulsieren mit J.A.R.V.I.S. Sprachausgabe
    const isJarvisSpeaking = typeof window !== 'undefined' && Boolean(window.isJarvisSpeaking);
    if (isJarvisSpeaking) {
      const speechPulse = Math.sin(time * 24.0) * 0.4 + Math.cos(time * 16.0) * 0.6;
      const coreScale = 1.0 + Math.abs(speechPulse) * 0.35;
      if (holoJarvisCore) holoJarvisCore.scale.set(coreScale, coreScale, coreScale);
      if (holoJarvisInnerSphere) holoJarvisInnerSphere.scale.set(coreScale * 1.1, coreScale * 1.1, coreScale * 1.1);
      if (holoJarvisLight) holoJarvisLight.intensity = 3.8 + Math.abs(speechPulse) * 3.5;
    } else {
      if (holoJarvisCore && holoJarvisCore.scale.x !== 1) holoJarvisCore.scale.set(1, 1, 1);
      if (holoJarvisInnerSphere && holoJarvisInnerSphere.scale.x !== 1) holoJarvisInnerSphere.scale.set(1, 1, 1);
      if (holoJarvisLight) holoJarvisLight.intensity = 2.4 + Math.sin(time * 3.5) * 0.5;
    }
  }

  // 2. TREVOR (MK-VII) ANIMATION
  if (trevorGroup && !isQuietMode) {
    trevorGroup.position.y = 2.5 + Math.sin(time * 2.2) * 0.05;

    // J.A.R.V.I.S. Sprach-Synchronisation: Arc-Reactor Audio-Puls im 3D-Raum
    const isJarvisSpeaking = typeof window !== 'undefined' && Boolean(window.isJarvisSpeaking);

    if (isJarvisSpeaking) {
      // Schneller, lebendiger Sprachwellen-Puls (Cyan/Hellblau 0x00F0FF)
      const speechPulse = Math.sin(time * 26.0) * 0.45 + Math.cos(time * 17.0) * 0.55;
      const coreScale = 1.0 + Math.abs(speechPulse) * 0.38;

      if (trevorArcCoreMesh) {
        trevorArcCoreMesh.scale.set(coreScale, coreScale, coreScale);
        if (trevorArcCoreMesh.material && trevorArcCoreMesh.material.color) {
          trevorArcCoreMesh.material.color.setHex(0x00F0FF);
        }
      }
      if (trevorArcRingMesh) {
        trevorArcRingMesh.scale.set(coreScale * 1.12, coreScale * 1.12, coreScale * 1.12);
      }
      if (trevorArcLight) {
        trevorArcLight.color.setHex(0x00F0FF);
        trevorArcLight.intensity = 8.0 + Math.abs(speechPulse) * 6.5;
      }
      if (trevorStageAuraLight) {
        trevorStageAuraLight.color.setHex(0x00F0FF);
        trevorStageAuraLight.intensity = 4.5 + Math.abs(speechPulse) * 3.0;
      }
    } else {
      // Normale Rückstellung bei Sprechpause / Idle
      if (trevorArcCoreMesh && trevorArcCoreMesh.scale.x !== 1) {
        trevorArcCoreMesh.scale.set(1, 1, 1);
        if (trevorArcCoreMesh.material && trevorArcCoreMesh.material.color) {
          trevorArcCoreMesh.material.color.setHex(0xE0F2FE);
        }
      }
      if (trevorArcRingMesh && trevorArcRingMesh.scale.x !== 1) {
        trevorArcRingMesh.scale.set(1, 1, 1);
      }

      // Dynamisches Pulsieren je nach Workflow-Stufe
      if (currentWorkflowStage === 'stage1') {
        if (trevorArcLight) {
          trevorArcLight.color.setHex(0x00F0FF);
          trevorArcLight.intensity = 6.0 + Math.sin(time * 8.0) * 2.0;
        }
        if (trevorStageAuraLight) {
          trevorStageAuraLight.color.setHex(0xEF4444);
          trevorStageAuraLight.intensity = 3.5 + Math.sin(time * 8.0) * 1.5;
        }
        if (trevorSpotlight) trevorSpotlight.intensity = 5.5 + Math.sin(time * 6.0) * 1.2;
      } else if (currentWorkflowStage === 'stage4') {
        if (trevorArcLight) {
          trevorArcLight.color.setHex(0x00F0FF);
          trevorArcLight.intensity = 7.0 + Math.sin(time * 6.0) * 2.0;
        }
        if (trevorStageAuraLight) {
          trevorStageAuraLight.color.setHex(0x10B981);
          trevorStageAuraLight.intensity = 5.0 + Math.sin(time * 6.0) * 1.5;
        }
      } else {
        if (trevorArcLight) {
          trevorArcLight.color.setHex(0x00F0FF);
          trevorArcLight.intensity = 3.5 + Math.sin(time * 5.0) * 0.8;
        }
        if (trevorStageAuraLight) {
          trevorStageAuraLight.color.setHex(0xEF4444);
          trevorStageAuraLight.intensity = 0.6 + Math.sin(time * 3.0) * 0.2;
        }
      }
    }

    trevorHands.forEach(h => {
      h.material.opacity = 0.7 + Math.sin(time * 4) * 0.3;
    });
  }

  // 3. Blinking LEDs in Server-Racks
  if (!isQuietMode && blinkingLeds.length > 0) {
    blinkingLeds.forEach((led, i) => {
      led.visible = Math.sin(time * 6 + i) > 0;
    });
  }

  // 4. Parabolische Daten-Partikel zu Holo-JARVIS
  if (!isQuietMode && dynamicParticleStreams.length > 0) {
    for (let i = dynamicParticleStreams.length - 1; i >= 0; i--) {
      const stream = dynamicParticleStreams[i];
      stream.progress += stream.speed;
      if (stream.progress >= 0 && stream.progress <= 1) {
        stream.mesh.visible = true;
        const t = stream.progress;
        const p0 = stream.start;
        const p1 = stream.mid || stream.start;
        const p2 = stream.end;
        stream.mesh.position.x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        stream.mesh.position.y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        stream.mesh.position.z = (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z;
      } else if (stream.progress > 1) {
        if (holoJarvisLight) holoJarvisLight.intensity = Math.min(holoJarvisLight.intensity + 0.35, 5.5);
        scene.remove(stream.mesh);
        dynamicParticleStreams.splice(i, 1);
      } else {
        stream.mesh.visible = false;
      }
    }
  }

  // 5. Native zustandsbasierte Kamera-Animation & Lerp
  if (targetCameraPos && targetLookAt) {
    camera.position.lerp(targetCameraPos, 0.08);
    if (controls) {
      controls.target.lerp(targetLookAt, 0.08);
    } else {
      camera.lookAt(targetLookAt);
    }
    if (camera.position.distanceTo(targetCameraPos) < 0.15) {
      camera.position.copy(targetCameraPos);
      if (controls) controls.target.copy(targetLookAt);
      targetCameraPos = null;
      targetLookAt = null;
    }
  }

  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function onWindowResize() {
  if (!containerEl || !camera || !renderer) return;
  const width = containerEl.clientWidth || Math.round(window.innerWidth * 0.72) || 1200;
  const height = containerEl.clientHeight || Math.max(window.innerHeight - 170, 580) || 650;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

/**
 * Ressourcen-Freigabe für saubere Speicherverwaltung & Prevents Memory Leaks
 */
export function dispose3DStudio() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (stageTransitionTimeout) {
    clearTimeout(stageTransitionTimeout);
    stageTransitionTimeout = null;
  }
  if (controls) {
    controls.dispose();
  }
  if (renderer && renderer.domElement && renderer.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement);
  }
  console.log('[Studio 3D] Ressourcen erfolgreich freigegeben.');
}

// Globale Fenster-Exporte für maximale Interoperabilität
if (typeof window !== 'undefined') {
  window.update3DStudioState = update3DStudioState;
  window.setStageIn3D = setStageIn3D;
  window.updateAgentStatus = updateAgentStatus;
  window.triggerDataStreamToTrevor = triggerDataStreamToTrevor;
  window.updateRoomMicroStatus = updateRoomMicroStatus;
  window.switchFloor = switchFloor;
  window.reset3DCamera = reset3DCamera;
  window.getCurrentFloor = () => currentFloor;
  window.dispose3DStudio = dispose3DStudio;
}
