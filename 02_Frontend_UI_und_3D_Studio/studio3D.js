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

  // 2. Szene
  scene = new THREE_LIB.Scene();
  scene.background = new THREE_LIB.Color(0x06080e);
  scene.fog = new THREE_LIB.FogExp2(0x06080e, 0.008);

  // 3. Abmessungen
  const width = containerEl.clientWidth || Math.round(window.innerWidth * 0.72) || 1200;
  const height = containerEl.clientHeight || Math.max(window.innerHeight - 170, 580) || 650;

  // 4. Kamera: Isometrisch schräg direkt auf den kompakten Campus
  camera = new THREE_LIB.PerspectiveCamera(42, width / height, 0.5, 500);
  camera.position.set(0, 24, 25);
  camera.lookAt(0, 1.2, 0);

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
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 6;
    controls.maxDistance = 75;
    controls.target.set(0, 1.2, 0);
  }

  // 7. Helle & plastische Studio-Beleuchtung
  setupCampusLighting(THREE_LIB);

  // 8. Große, zusammenhängende Haupt-Büroetage (Open-Space Architektur-Floor)
  setupUnifiedOfficeFloor(THREE_LIB);

  // 9. Trevor im Iron-Man Look (Zentrale Glas-Rotunde)
  setupTrevorIronManMech(THREE_LIB);

  // 10. Die 10 kompakten Abteilungen mit Schreibtischen, Monitoren & Pflanzen
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
  console.log('[Studio 3D] Kompakter Open-Space Tech-Campus V2.6 erfolgreich gerendert!');
}

/**
 * Helle, moderne Studio-Beleuchtung (Warmes Licht + weiche Schatten)
 */
function setupCampusLighting(THREE_LIB) {
  // Weißes Umgebungslicht
  const ambientLight = new THREE_LIB.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  // Hemisphere-Licht für plastische Raumtiefe (Himmel: hellweiß, Boden: Schiefer)
  const hemiLight = new THREE_LIB.HemisphereLight(0xffffff, 0x1e293b, 1.1);
  scene.add(hemiLight);

  // Warmes Haupt-Spotlicht von schräg oben
  const keyLight = new THREE_LIB.DirectionalLight(0xffedd5, 1.8);
  keyLight.position.set(24, 38, 24);
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

  // Kühles Cyan-Aufhelllicht
  const fillLight = new THREE_LIB.DirectionalLight(0x38bdf8, 0.9);
  fillLight.position.set(-24, 25, -24);
  scene.add(fillLight);
}

/**
 * Großer zusammenhängender Architektur-Hauptboden (Radius ~21)
 */
function setupUnifiedOfficeFloor(THREE_LIB) {
  const floorGroup = new THREE_LIB.Group();

  // 1. Großes zusammenhängendes Haupt-Deck (Schiefer / Dunkler warmer Beton)
  const mainFloorGeo = new THREE_LIB.CylinderGeometry(21.5, 21.8, 0.4, 64);
  const mainFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0f1523,
    roughness: 0.45,
    metalness: 0.2
  });
  const mainFloor = new THREE_LIB.Mesh(mainFloorGeo, mainFloorMat);
  mainFloor.position.y = -0.2;
  mainFloor.receiveShadow = true;
  floorGroup.add(mainFloor);

  // 2. Äußere rahmenlose Glasfassade mit schwarzer Aluleiste
  const glassPerimeterGeo = new THREE_LIB.CylinderGeometry(21.5, 21.5, 1.6, 64, 1, true);
  const glassPerimeterMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    roughness: 0.1,
    transmission: 0.85,
    side: THREE_LIB.DoubleSide
  });
  const glassPerimeter = new THREE_LIB.Mesh(glassPerimeterGeo, glassPerimeterMat);
  glassPerimeter.position.y = 0.8;
  floorGroup.add(glassPerimeter);

  const topRailGeo = new THREE_LIB.TorusGeometry(21.5, 0.08, 8, 64);
  const topRailMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const topRail = new THREE_LIB.Mesh(topRailGeo, topRailMat);
  topRail.rotation.x = Math.PI / 2;
  topRail.position.y = 1.6;
  floorGroup.add(topRail);

  // 3. Konzentrische Orientierungsringe im Boden
  [6.5, 13.0, 19.5].forEach((r, idx) => {
    const ringGeo = new THREE_LIB.RingGeometry(r - 0.06, r + 0.06, 64);
    const ringMat = new THREE_LIB.MeshBasicMaterial({
      color: idx === 1 ? 0xfbbf24 : 0x1e293b,
      side: THREE_LIB.DoubleSide,
      transparent: true,
      opacity: idx === 1 ? 0.45 : 0.25
    });
    const ring = new THREE_LIB.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    floorGroup.add(ring);
  });

  scene.add(floorGroup);
}

/**
 * Trevor im Iron-Man Look in der zentralen Rotunde
 */
function setupTrevorIronManMech(THREE_LIB) {
  trevorGroup = new THREE_LIB.Group();
  trevorGroup.position.set(0, 0, 0);

  // 1. Erhöhtes zentrales Kommando-Podest (Radius 4.2)
  const podestGeo = new THREE_LIB.CylinderGeometry(4.2, 4.5, 0.5, 32);
  const podestMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.35,
    metalness: 0.75
  });
  const podest = new THREE_LIB.Mesh(podestGeo, podestMat);
  podest.position.y = 0.25;
  podest.receiveShadow = true;
  trevorGroup.add(podest);

  // Leuchtender Gold-Karmesin Ring um Trevors Podest
  const edgeGeo = new THREE_LIB.TorusGeometry(4.2, 0.08, 12, 32);
  const edgeMat = new THREE_LIB.MeshBasicMaterial({ color: 0xfbbf24 });
  const edge = new THREE_LIB.Mesh(edgeGeo, edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.51;
  trevorGroup.add(edge);

  // Halboffene Glas-Rotunde um Trevors Bereich
  const rotundaGeo = new THREE_LIB.CylinderGeometry(4.0, 4.0, 1.5, 32, 1, true, -Math.PI / 1.3, Math.PI * 1.55);
  const rotundaMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    transmission: 0.8,
    side: THREE_LIB.DoubleSide
  });
  const rotunda = new THREE_LIB.Mesh(rotundaGeo, rotundaMat);
  rotunda.position.y = 1.25;
  trevorGroup.add(rotunda);

  // Holografischer Runder Taktik-Tisch vor Trevor
  const tableGeo = new THREE_LIB.CylinderGeometry(1.4, 1.4, 0.12, 32);
  const tableMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0284c7,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.65
  });
  const holoTable = new THREE_LIB.Mesh(tableGeo, tableMat);
  holoTable.position.set(0, 1.6, 1.1);
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

  const arcCoreGeo = new THREE_LIB.CircleGeometry(0.16, 24);
  const arcCoreMat = new THREE_LIB.MeshBasicMaterial({ color: 0xe0f2fe });
  const arcCore = new THREE_LIB.Mesh(arcCoreGeo, arcCoreMat);
  arcCore.position.set(0, 0.2, 0.45);
  mechBody.add(arcCore);

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

  mechBody.userData = { type: 'trevor', name: 'Trevor (Director)' };
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

  // SpotLight direkt über Trevors CEO-Schreibtisch (Workflow Stage 1 & 4 Fokus)
  trevorSpotlight = new THREE_LIB.SpotLight(0xfbbf24, 0.4, 28, Math.PI / 3.8, 0.35, 1.2);
  trevorSpotlight.position.set(0, 14, 1.5);
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
 * 10 Abteilungen kompakt und nah am Zentrum (Radius ~13)
 */
function setupCompactDepartments(THREE_LIB, hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 13.0; // Kompakter Radius: Alles sofort sichtbar!

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, 0, posZ);
    podGroup.lookAt(0, 0, 0); // Blickwinkel zur Mitte gerichtet

    // 1. Schwebendes 3D-Billboard Label mit Live-Sprechblase (Micro-Status)
    const microStatus = dept.micro_status || '💬 Bereit für Anweisungen';
    const roomLabel = createFloatingLabelSprite(dept.name, dept.chef_agent.name, microStatus, dept.color);
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
    } else {
      floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.2 });
    }

    const plateGeo = new THREE_LIB.CylinderGeometry(3.8, 4.0, 0.2, 24);
    const plate = new THREE_LIB.Mesh(plateGeo, floorMat);
    plate.position.y = 0.1;
    plate.receiveShadow = true;
    plate.userData = { type: 'department', deptId: dept.id, name: dept.name, easy_explanation: dept.easy_explanation };
    interactiveObjects.push(plate);
    podGroup.add(plate);

    // Akzent-Kantenring
    const borderGeo = new THREE_LIB.TorusGeometry(3.8, 0.05, 8, 32);
    const borderMat = new THREE_LIB.MeshBasicMaterial({ color: deptColor });
    const border = new THREE_LIB.Mesh(borderGeo, borderMat);
    border.rotation.x = Math.PI / 2;
    border.position.y = 0.21;
    podGroup.add(border);

    // 3. Halbohe Glas-Trennwände mit schwarzem Aluminium-Rahmen
    const glassGeo = new THREE_LIB.CylinderGeometry(3.7, 3.7, 1.5, 24, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
    const glassMat = new THREE_LIB.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      transmission: 0.75,
      side: THREE_LIB.DoubleSide
    });
    const glass = new THREE_LIB.Mesh(glassGeo, glassMat);
    glass.position.y = 0.95;
    podGroup.add(glass);

    // 4. Raum-Ausstattung: Requisiten, Pflanzen & Server
    setupRoomProps(THREE_LIB, podGroup, dept);

    // 5. Chef-Station mit Amber-Audit Monitor
    setupChefStation(THREE_LIB, podGroup, dept);

    // 6. Spezial-PCs mit leuchtenden Monitoren & Entwicklern
    setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept);

    scene.add(podGroup);
  });
}

function setupRoomProps(THREE_LIB, podGroup, dept) {
  // Moderner Pflanzentopf (Grüne Akzente im Open-Space Büro)
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

  // Server-Racks mit blinkenden LEDs in Backend, DB & Security
  if (dept.id === 5 || dept.id === 6 || dept.id === 8) {
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
  const screen = new THREE_LIB.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.85, -0.05);
  screen.userData = {
    type: 'chef',
    chefId: chef.id,
    deptId: dept.id,
    name: chef.name,
    easy_explanation: chef.easy_explanation
  };
  chefGroup.add(screen);
  interactiveObjects.push(screen);

  // Chef-Avatar
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, true);
  avatar.position.set(0, 0.1, 0.45);
  chefGroup.add(avatar);

  chefMeshMap[chef.id] = { screen, avatarArms: avatar.userData.arms };
  allChefScreenMeshes.push({
    mesh: screen,
    chefId: chef.id,
    deptId: dept.id,
    deptColor: dept.color
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

    const screenLeft = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenLeft.position.set(-0.25, 0.8, 0.04);
    screenLeft.rotation.y = 0.14;
    screenLeft.userData = { type: 'pc', pcId: pc.id, deptId: dept.id, name: pc.name, easy_explanation: pc.easy_explanation };
    pcGroup.add(screenLeft);
    interactiveObjects.push(screenLeft);

    const screenRight = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenRight.position.set(0.25, 0.8, 0.04);
    screenRight.rotation.y = -0.14;
    screenRight.userData = { type: 'pc', pcId: pc.id, deptId: dept.id, name: pc.name, easy_explanation: pc.easy_explanation };
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
    pcGroup.add(avatar);
    developerAvatars.push(avatar);

    pcMeshMap[pc.id] = {
      screenLeft,
      screenRight,
      avatarArms: avatar.userData.arms
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
  const idx = depts.findIndex(d => d.id === deptId);
  if (idx === -1) return;

  const angle = (idx / depts.length) * Math.PI * 2;
  const startX = Math.cos(angle) * 11.5;
  const startZ = Math.sin(angle) * 11.5;

  for (let i = 0; i < 5; i++) {
    const pGeo = new THREE_LIB.SphereGeometry(0.24, 12, 12);
    const pMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8 });
    const p = new THREE_LIB.Mesh(pGeo, pMat);
    p.position.set(startX, 1.2, startZ);
    scene.add(p);

    dynamicParticleStreams.push({
      mesh: p,
      start: new THREE_LIB.Vector3(startX, 1.2, startZ),
      end: new THREE_LIB.Vector3(0, 2.2, 0), // Trevors Arc-Reactor
      progress: -(i * 0.18),
      speed: 0.022
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
      const data = hit.userData;

      if (!data) return;

      if (data.type === 'trevor' || data.type === 'decision_terminal') {
        if (onTrevorClick) onTrevorClick();
      } else if (data.type === 'pc') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 11);
        if (onAgentClick) onAgentClick(data.pcId, 'pc', data.deptId);
      } else if (data.type === 'chef') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 11);
        if (onAgentClick) onAgentClick(data.chefId, 'chef', data.deptId);
      } else if (data.type === 'department') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 16);
        if (onAgentClick) onAgentClick(`dept_${data.deptId}`, 'department', data.deptId);
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

function setupCameraButtons() {
  const btnRotLeft = document.getElementById('ctrl-rot-left');
  const btnRotRight = document.getElementById('ctrl-rot-right');
  const btnZoomIn = document.getElementById('ctrl-zoom-in');
  const btnZoomOut = document.getElementById('ctrl-zoom-out');
  const btnReset = document.getElementById('ctrl-reset-cam');
  const btnQuiet = document.getElementById('ctrl-quiet-toggle');

  if (btnRotLeft) btnRotLeft.addEventListener('click', () => rotateCameraAroundCenter(0.25));
  if (btnRotRight) btnRotRight.addEventListener('click', () => rotateCameraAroundCenter(-0.25));
  if (btnZoomIn && controls) btnZoomIn.addEventListener('click', () => camera.position.multiplyScalar(0.85));
  if (btnZoomOut && controls) btnZoomOut.addEventListener('click', () => camera.position.multiplyScalar(1.15));
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const THREE = getTHREE();
      if (!THREE) return;
      targetCameraPos = new THREE.Vector3(0, 24, 25);
      targetLookAt = new THREE.Vector3(0, 1.2, 0);
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
  camera.lookAt(0, 1.2, 0);
  if (controls) controls.target.set(0, 1.2, 0);
}

export function updateAgentStatusIn3D(agentId, type, status) {
  if (type === 'pc' && pcMeshMap[agentId]) {
    const { screenLeft, screenRight, avatarArms } = pcMeshMap[agentId];
    if (status === 'working') {
      screenLeft.material.emissive.setHex(0x06b6d4);
      screenLeft.material.emissiveIntensity = 2.4;
      screenRight.material.emissive.setHex(0x06b6d4);
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
    const { screen } = chefMeshMap[agentId];
    if (status === 'auditing') {
      screen.material.emissive.setHex(0xf59e0b);
      screen.material.emissiveIntensity = 2.6;
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
 * Passt das Aussehen der 3D-Objekte abhängig vom Workflow-Status dynamisch an
 * @param {string|number} stageInput - 'idle', 'stage1', 'stage2', 'stage3', 'stage4'
 */
export function update3DStudioState(stageInput) {
  const THREE = getTHREE();
  if (!THREE || !scene) return;

  let stage = 'idle';
  if (typeof stageInput === 'number') {
    stage = `stage${stageInput}`;
  } else if (typeof stageInput === 'string') {
    const s = stageInput.toLowerCase();
    if (s.includes('1') || s.includes('dispatch') || s.includes('ceo')) stage = 'stage1';
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

  console.log(`[Studio 3D] Workflow-Zustand gewechselt zu: "${stage}"`);

  // --- ZUSTAND: IDLE ---
  if (stage === 'idle') {
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
  }

  // --- ZUSTAND: STAGE 1 (DISPATCHER / TREVOR) ---
  else if (stage === 'stage1') {
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

    // Materialien der PC-Bildschirme an den 33 Arbeitsplätzen leuchten auf
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.emissive = new THREE.Color(0x00ff88); // Strahlendes Matrix-Grün/Cyan
        mesh.material.emissiveIntensity = 2.8;
      }
    });

    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive.setHex(0x0f172a);
        item.mesh.material.emissiveIntensity = 0.3;
      }
    });
  }

  // --- ZUSTAND: STAGE 3 (ABTEILUNGSLEITER / AUDIT) ---
  else if (stage === 'stage3') {
    if (trevorSpotlight) {
      trevorSpotlight.intensity = 1.2;
    }

    // Bildschirme der Fach-Agenten dimmen wieder ab
    allPcScreenMeshes.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.emissive.setHex(0x0f172a);
        mesh.material.emissiveIntensity = 0.3;
      }
    });

    // Bereiche der Abteilungsleiter leuchten auf (Audit Orange / Gold / Violett)
    allChefScreenMeshes.forEach(item => {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive = new THREE.Color(0xf59e0b); // Strahlendes Amber-Gold
        item.mesh.material.emissiveIntensity = 3.2;
      }
    });

    // Visuelle Datenströme zu Trevor triggern
    STUDIO_HIERARCHY.departments.forEach((dept, i) => {
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

    // Sanfter Übergang zurück zu idle nach Erfolgs-Feedback
    stageTransitionTimeout = setTimeout(() => {
      if (currentWorkflowStage === 'stage4') {
        update3DStudioState('idle');
      }
    }, 4500);
  }
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  if (trevorGroup && !isQuietMode) {
    trevorGroup.position.y = Math.sin(time * 2.2) * 0.05;

    // Dynamisches Pulsieren je nach Workflow-Stufe
    if (currentWorkflowStage === 'stage1') {
      if (trevorArcLight) trevorArcLight.intensity = 6.0 + Math.sin(time * 8.0) * 2.0;
      if (trevorStageAuraLight) trevorStageAuraLight.intensity = 3.5 + Math.sin(time * 8.0) * 1.5;
      if (trevorSpotlight) trevorSpotlight.intensity = 5.5 + Math.sin(time * 6.0) * 1.2;
    } else if (currentWorkflowStage === 'stage4') {
      if (trevorArcLight) trevorArcLight.intensity = 7.0 + Math.sin(time * 6.0) * 2.0;
      if (trevorStageAuraLight) trevorStageAuraLight.intensity = 5.0 + Math.sin(time * 6.0) * 1.5;
    } else {
      if (trevorArcLight) {
        trevorArcLight.intensity = 3.5 + Math.sin(time * 5.0) * 0.8;
      }
      if (trevorStageAuraLight) {
        trevorStageAuraLight.intensity = 0.6 + Math.sin(time * 3.0) * 0.2;
      }
    }

    trevorHands.forEach(h => {
      h.material.opacity = 0.7 + Math.sin(time * 4) * 0.3;
    });
  }

  if (!isQuietMode && blinkingLeds.length > 0) {
    blinkingLeds.forEach((led, i) => {
      led.visible = Math.sin(time * 6 + i) > 0;
    });
  }

  // Animierte Daten-Partikel zu Trevor
  if (!isQuietMode && dynamicParticleStreams.length > 0) {
    for (let i = dynamicParticleStreams.length - 1; i >= 0; i--) {
      const stream = dynamicParticleStreams[i];
      stream.progress += stream.speed;
      if (stream.progress >= 0 && stream.progress <= 1) {
        stream.mesh.visible = true;
        stream.mesh.position.lerpVectors(stream.start, stream.end, stream.progress);
      } else if (stream.progress > 1) {
        scene.remove(stream.mesh);
        dynamicParticleStreams.splice(i, 1);
      } else {
        stream.mesh.visible = false;
      }
    }
  }

  if (targetCameraPos && targetLookAt) {
    camera.position.lerp(targetCameraPos, 0.06);
    if (controls) controls.target.lerp(targetLookAt, 0.06);
    if (camera.position.distanceTo(targetCameraPos) < 0.2) {
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

// Globale Fenster-Exporte für maximale Interoperabilität
if (typeof window !== 'undefined') {
  window.update3DStudioState = update3DStudioState;
  window.setStageIn3D = setStageIn3D;
  window.triggerDataStreamToTrevor = triggerDataStreamToTrevor;
  window.updateRoomMicroStatus = updateRoomMicroStatus;
}
