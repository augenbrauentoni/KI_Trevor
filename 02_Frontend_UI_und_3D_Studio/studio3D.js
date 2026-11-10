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

// Aufzug- & Untergeschoss (UG / Keller) State
let targetCameraY = 5;
let elevatorCabin = null;
let targetElevatorY = 1.0;
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
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.95;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 5;
    controls.maxDistance = 80;
    controls.target.set(0, 1.2, 0);
  }

  // 7. Helle & plastische Studio-Beleuchtung
  setupCampusLighting(THREE_LIB);

  // 8. Große, zusammenhängende Haupt-Büroetage (Open-Space Architektur-Floor EG)
  setupUnifiedOfficeFloor(THREE_LIB);

  // 8b. Industrielles Untergeschoss (UG auf y = -15) & Gläserner Aufzug
  setupBasementFloor(THREE_LIB);
  setupGlassElevator(THREE_LIB);

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
 * Untergeschoss (UG / Keller auf y = -15):
 * Industrieller Betonboden, tragende Stahlstützen zwischen EG und UG,
 * Server-Cluster mit pulsierenden LEDs, Core-Terminal und gedimmte Industriebeleuchtung.
 */
function setupBasementFloor(THREE_LIB) {
  const basementGroup = new THREE_LIB.Group();

  // 1. Großes industrielles Beton-Fundament (y = -15)
  const floorGeo = new THREE_LIB.CylinderGeometry(18.5, 18.8, 0.5, 48);
  const floorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x090d16, // Dunkler Industrie-Beton
    roughness: 0.85,
    metalness: 0.15
  });
  const basementFloor = new THREE_LIB.Mesh(floorGeo, floorMat);
  basementFloor.position.y = -15.25;
  basementFloor.receiveShadow = true;
  basementGroup.add(basementFloor);

  // Gitter-Optik (Cyber / Industrie-Grid auf y = -15)
  const ugGrid = new THREE_LIB.GridHelper(36, 36, 0x06b6d4, 0x1e293b);
  ugGrid.position.y = -14.98;
  basementGroup.add(ugGrid);

  // Gelb-orange Industrie-Kantenmarkierung (Warnstreifen-Effekt)
  const warningRingGeo = new THREE_LIB.TorusGeometry(18.5, 0.08, 8, 48);
  const warningRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0xd97706 });
  const warningRing = new THREE_LIB.Mesh(warningRingGeo, warningRingMat);
  warningRing.rotation.x = Math.PI / 2;
  warningRing.position.y = -14.99;
  basementGroup.add(warningRing);

  // Innere Orientierungs-Ringe im UG-Boden
  [5.5, 10.5, 15.5].forEach((r, idx) => {
    const ringGeo = new THREE_LIB.RingGeometry(r - 0.05, r + 0.05, 48);
    const ringMat = new THREE_LIB.MeshBasicMaterial({
      color: idx === 1 ? 0x06b6d4 : 0x334155,
      side: THREE_LIB.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE_LIB.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -14.98;
    basementGroup.add(ring);
  });

  // 2. 4 massive tragende Stahl-Pfeiler zwischen EG (y=0) und UG (y=-15)
  const pillarOffsets = [
    { x: 9.5, z: 9.5 },
    { x: -9.5, z: 9.5 },
    { x: 9.5, z: -9.5 },
    { x: -9.5, z: -9.5 }
  ];
  pillarOffsets.forEach(pos => {
    // Säulenschaft
    const pillarGeo = new THREE_LIB.CylinderGeometry(0.55, 0.65, 15.0, 16);
    const pillarMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.35
    });
    const pillar = new THREE_LIB.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, -7.5, pos.z);
    pillar.castShadow = true;
    basementGroup.add(pillar);

    // Fußmanschette unten (y = -15)
    const baseGeo = new THREE_LIB.CylinderGeometry(0.9, 1.0, 0.4, 16);
    const collarMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const collarBottom = new THREE_LIB.Mesh(baseGeo, collarMat);
    collarBottom.position.set(pos.x, -14.8, pos.z);
    basementGroup.add(collarBottom);

    // Kopfmanschette oben (y = 0)
    const collarTop = new THREE_LIB.Mesh(baseGeo, collarMat);
    collarTop.position.set(pos.x, -0.2, pos.z);
    basementGroup.add(collarTop);
  });

  // 3. Zentrales UG-Hardware-Terminal (Zentraler Technik-Hub)
  const coreHubGeo = new THREE_LIB.CylinderGeometry(1.6, 1.8, 0.7, 24);
  const coreHubMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.25
  });
  const coreHub = new THREE_LIB.Mesh(coreHubGeo, coreHubMat);
  coreHub.position.set(0, -14.65, 0);
  coreHub.userData = {
    type: 'ug_terminal',
    name: 'UG Central Hardware Core',
    floor: 'UG',
    role: 'Keller-Infrastruktur & Racks',
    status: 'Servercluster, Archiv & Hardware-Bridges aktiv'
  };
  interactiveObjects.push(coreHub);
  basementGroup.add(coreHub);

  // Holographischer Ring über dem Core
  const holoGeo = new THREE_LIB.TorusGeometry(1.4, 0.05, 8, 32);
  const holoMat = new THREE_LIB.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
  const holoRing = new THREE_LIB.Mesh(holoGeo, holoMat);
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.set(0, -14.15, 0);
  basementGroup.add(holoRing);

  // Schwebendes Label über UG-Hub
  const ugHubLabel = createFloatingLabelSprite(
    'UNTERGESCHOSS (UG)',
    'Archiv · Serverraum · Werkstatt · Lounge',
    '⚡ Keller-Infrastruktur online',
    '#06b6d4'
  );
  ugHubLabel.position.set(0, -11.5, 0);
  basementGroup.add(ugHubLabel);

  // 4. Industrielle Server-Racks im UG-Hintergrund mit blinkenden LEDs
  const rackCoords = [
    { x: -3.8, z: -3.5, rot: 0.3 },
    { x: 3.8, z: -3.5, rot: -0.3 },
    { x: 0, z: -5.2, rot: 0 }
  ];
  rackCoords.forEach(c => {
    const rackGeo = new THREE_LIB.BoxGeometry(1.4, 2.8, 0.7);
    const rackMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0a0f1d,
      metalness: 0.9,
      roughness: 0.2
    });
    const rack = new THREE_LIB.Mesh(rackGeo, rackMat);
    rack.position.set(c.x, -13.6, c.z);
    rack.rotation.y = c.rot;
    basementGroup.add(rack);

    // Blinking LEDs
    const ledColors = [0x10b981, 0x06b6d4, 0xf59e0b, 0xef4444];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 3; col++) {
        const ledGeo = new THREE_LIB.BoxGeometry(0.08, 0.05, 0.03);
        const colHex = ledColors[(row + col) % ledColors.length];
        const ledMat = new THREE_LIB.MeshBasicMaterial({ color: colHex });
        const led = new THREE_LIB.Mesh(ledGeo, ledMat);
        led.position.set(
          c.x + (col - 1) * 0.22,
          -13.6 + (row - 2.5) * 0.35,
          c.z + 0.36
        );
        basementGroup.add(led);
        blinkingLeds.push(led);
      }
    }
  });

  // 5. Gedimmte industrielle Keller-Beleuchtung
  const ugLight1 = new THREE_LIB.PointLight(0x06b6d4, 1.8, 22);
  ugLight1.position.set(0, -11.0, 0);
  basementGroup.add(ugLight1);
  ugLights.push(ugLight1);

  const ugLight2 = new THREE_LIB.PointLight(0xf59e0b, 1.2, 18);
  ugLight2.position.set(0, -11.5, 6.0);
  basementGroup.add(ugLight2);
  ugLights.push(ugLight2);

  const ugLight3 = new THREE_LIB.PointLight(0x38bdf8, 1.0, 16);
  ugLight3.position.set(0, -11.5, -6.0);
  basementGroup.add(ugLight3);
  ugLights.push(ugLight3);

  scene.add(basementGroup);
}

/**
 * Gläserner Aufzugsschacht & Fahrstuhlkabine (EG ⇄ UG):
 * Verbindet Erdgeschoss (y = 0) und Untergeschoss (y = -15).
 * Sanfte Kabinenfahrt und anklickbare Aufzugsteuerung.
 */
function setupGlassElevator(THREE_LIB) {
  const shaftX = -6.5;
  const shaftZ = -5.0;

  // 1. Schacht-Konstruktion
  const shaftGroup = new THREE_LIB.Group();
  shaftGroup.position.set(shaftX, 0, shaftZ);

  // 4 tragende Führungsschienen (von y = -15.5 bis y = 3.5 -> Höhe 19m)
  const railGeo = new THREE_LIB.BoxGeometry(0.12, 19.2, 0.12);
  const railMat = new THREE_LIB.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
  const railOffsets = [
    { x: -1.05, z: -1.05 },
    { x: 1.05, z: -1.05 },
    { x: -1.05, z: 1.05 },
    { x: 1.05, z: 1.05 }
  ];
  railOffsets.forEach(pos => {
    const rail = new THREE_LIB.Mesh(railGeo, railMat);
    rail.position.set(pos.x, -6.0, pos.z);
    shaftGroup.add(rail);
  });

  // Gläserne Schacht-Verkleidung (von y = 0 nach y = -15)
  const glassShaftGeo = new THREE_LIB.BoxGeometry(2.4, 15.0, 2.4);
  const glassShaftMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    side: THREE_LIB.DoubleSide
  });
  const glassShaft = new THREE_LIB.Mesh(glassShaftGeo, glassShaftMat);
  glassShaft.position.set(0, -7.5, 0); // Reicht genau von y = 0 bis y = -15
  shaftGroup.add(glassShaft);

  // EG & UG Plattform-Zugänge / Türrahmen
  [-15.0, 0.0].forEach(yLvl => {
    const frameGeo = new THREE_LIB.BoxGeometry(2.3, 2.4, 0.1);
    const frameMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const frame = new THREE_LIB.Mesh(frameGeo, frameMat);
    frame.position.set(0, yLvl + 1.2, 1.15);
    shaftGroup.add(frame);
  });

  scene.add(shaftGroup);

  // 2. Bewegliche Fahrstuhlkabine
  elevatorCabin = new THREE_LIB.Group();
  elevatorCabin.position.set(shaftX, 1.0, shaftZ); // Start im EG

  // Kabinen-Boden
  const cabFloorGeo = new THREE_LIB.BoxGeometry(1.9, 0.15, 1.9);
  const cabFloorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
  const cabFloor = new THREE_LIB.Mesh(cabFloorGeo, cabFloorMat);
  cabFloor.position.y = -0.95;
  elevatorCabin.add(cabFloor);

  // Leuchtender Bodenrand (Cyan)
  const floorGlowGeo = new THREE_LIB.BoxGeometry(1.92, 0.04, 1.92);
  const floorGlowMat = new THREE_LIB.MeshBasicMaterial({ color: 0x06b6d4 });
  const floorGlow = new THREE_LIB.Mesh(floorGlowGeo, floorGlowMat);
  floorGlow.position.y = -0.9;
  elevatorCabin.add(floorGlow);

  // Kabinen-Decke mit Innenlicht
  const cabCeilGeo = new THREE_LIB.BoxGeometry(1.9, 0.15, 1.9);
  const cabCeil = new THREE_LIB.Mesh(cabCeilGeo, cabFloorMat);
  cabCeil.position.y = 0.95;
  elevatorCabin.add(cabCeil);

  const cabLight = new THREE_LIB.PointLight(0x38bdf8, 1.8, 4);
  cabLight.position.set(0, 0.7, 0);
  elevatorCabin.add(cabLight);

  // Kabinen-Glaswände
  const cabGlassGeo = new THREE_LIB.BoxGeometry(1.85, 1.8, 1.85);
  const cabGlassMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
    transmission: 0.9,
    side: THREE_LIB.DoubleSide
  });
  const cabGlass = new THREE_LIB.Mesh(cabGlassGeo, cabGlassMat);
  elevatorCabin.add(cabGlass);

  // Interaktiver Klickbereich für den Aufzug
  const hitGeo = new THREE_LIB.BoxGeometry(2.1, 2.2, 2.1);
  const hitMat = new THREE_LIB.MeshBasicMaterial({ visible: false });
  const hitBox = new THREE_LIB.Mesh(hitGeo, hitMat);
  hitBox.userData = {
    type: 'elevator',
    name: 'Gläserner Campus-Aufzug (EG ⇄ UG)',
    role: 'Verbindet Software-Etage mit Untergeschoss',
    status: 'Klicken zum Wechseln der Etage (EG / UG)'
  };
  elevatorCabin.add(hitBox);
  interactiveObjects.push(hitBox);

  scene.add(elevatorCabin);
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
 * 14 Abteilungen:
 * - 10 Software-Abteilungen im EG (Radius ~13, y = 0)
 * - 4 Non-Code/Hardware/Archiv-Abteilungen im UG (Radius ~10.5, y = -15)
 */
function setupCompactDepartments(THREE_LIB, hierarchyData) {
  const allDepts = hierarchyData.departments || [];
  const egDepts = allDepts.filter(d => d.floor !== 'UG');
  const ugDepts = allDepts.filter(d => d.floor === 'UG');

  // 1. EG-Abteilungen kreisförmig auf Ebene y = 0 anordnen (Software-Campus)
  const egRadius = 13.0;
  egDepts.forEach((dept, idx) => {
    const angle = (idx / egDepts.length) * Math.PI * 2;
    const posX = Math.cos(angle) * egRadius;
    const posZ = Math.sin(angle) * egRadius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, 0, posZ);
    podGroup.lookAt(0, 0, 0); // Blickwinkel zur Mitte gerichtet

    buildDepartmentPod(THREE_LIB, podGroup, dept);
    scene.add(podGroup);
  });

  // 2. UG-Abteilungen im Untergeschoss auf Ebene y = -15 anordnen (Hardware / Archiv / Lounge)
  const ugRadius = 10.5;
  ugDepts.forEach((dept, idx) => {
    const angle = (idx / ugDepts.length) * Math.PI * 2 + Math.PI / 4;
    const posX = Math.cos(angle) * ugRadius;
    const posZ = Math.sin(angle) * ugRadius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, -15, posZ);
    podGroup.lookAt(0, -15, 0); // Blickwinkel zum UG-Kern

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

  // 3. Halbohe Glas-Trennwände mit schwarzem Aluminium-Rahmen
  const glassGeo = new THREE_LIB.CylinderGeometry(3.7, 3.7, 1.5, 24, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
  const glassMat = new THREE_LIB.MeshPhysicalMaterial({
    color: dept.floor === 'UG' ? 0x0b1120 : 0x0f172a,
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

  chefMeshMap[chef.id] = { screen, avatarArms: avatar.userData.arms };
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
  const dept = depts.find(d => d.id === deptId);
  if (!dept) return;

  const isUG = dept.floor === 'UG';
  const ugDepts = depts.filter(d => d.floor === 'UG');
  const egDepts = depts.filter(d => d.floor !== 'UG');
  const idx = isUG ? ugDepts.findIndex(d => d.id === deptId) : egDepts.findIndex(d => d.id === deptId);
  const radius = isUG ? 10.5 : 13.0;
  const angle = isUG ? (idx / (ugDepts.length || 1)) * Math.PI * 2 + Math.PI / 4 : (idx / (egDepts.length || 1)) * Math.PI * 2;
  const startX = Math.cos(angle) * (radius - 1.5);
  const startZ = Math.sin(angle) * (radius - 1.5);
  const startY = isUG ? -13.8 : 1.2;
  const endTarget = isUG ? new THREE_LIB.Vector3(0, -14.2, 0) : new THREE_LIB.Vector3(0, 2.2, 0);

  for (let i = 0; i < 5; i++) {
    const pGeo = new THREE_LIB.SphereGeometry(0.24, 12, 12);
    const pMat = new THREE_LIB.MeshBasicMaterial({ color: isUG ? 0x06b6d4 : 0x38bdf8 });
    const p = new THREE_LIB.Mesh(pGeo, pMat);
    p.position.set(startX, startY, startZ);
    scene.add(p);

    dynamicParticleStreams.push({
      mesh: p,
      start: new THREE_LIB.Vector3(startX, startY, startZ),
      end: endTarget,
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
        zoomToPosition(THREE_LIB, new THREE_LIB.Vector3(0, 1.2, 0), 10);
      } else if (data.type === 'elevator') {
        // Gläsernen Aufzug angeklickt -> Etage wechseln!
        switchFloor(currentFloor === 'EG' ? 'UG' : 'EG');
      } else if (data.type === 'ug_terminal') {
        zoomToPosition(THREE_LIB, new THREE_LIB.Vector3(0, -14.5, 0), 10);
      } else if (data.type === 'pc') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 11);
      } else if (data.type === 'chef') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 11);
      } else if (data.type === 'department') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 16);
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
  targetCameraY = (currentFloor === 'UG') ? -10 : 5;
  targetElevatorY = (currentFloor === 'UG') ? -14.0 : 1.0;

  const btnEg = document.getElementById('ctrl-floor-eg');
  const btnUg = document.getElementById('ctrl-floor-ug');

  if (currentFloor === 'UG') {
    if (btnEg) btnEg.classList.remove('active');
    if (btnUg) btnUg.classList.add('active');
  } else {
    if (btnUg) btnUg.classList.remove('active');
    if (btnEg) btnEg.classList.add('active');
  }
  console.log(`[Studio 3D] Etagen-Fahrt: Ziel=${currentFloor}, targetCameraY=${targetCameraY}`);
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
      switchFloor('EG');
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
  const targetY = currentFloor === 'UG' ? -14.5 : 1.2;
  camera.lookAt(0, targetY, 0);
  if (controls) controls.target.set(0, targetY, 0);
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
 * Aktualisiert den Live-Status eines Agenten in seinen 3D-Meshes und im UI-Info-Panel falls geöffnet
 * @param {string} agentName - Der Name des Agenten (z. B. "Max", "Viktor", "Trevor")
 * @param {string} statusMessage - Der aktuelle Status (z. B. "Analysiert ...", "Aufgabe abgeschlossen")
 */
export function updateAgentStatus(agentName, statusMessage) {
  if (!agentName) return;

  // 1. In allen passenden interactiveObjects das userData.currentTask aktualisieren
  let foundCount = 0;
  for (const obj of interactiveObjects) {
    if (obj && obj.userData && obj.userData.name === agentName) {
      obj.userData.currentTask = statusMessage;
      foundCount++;
    }
  }

  // 2. Falls das schwebende Agenten-Info-Panel offen ist und genau diesen Agenten anzeigt -> Text live aktualisieren
  if (typeof document !== 'undefined') {
    const panel = document.getElementById('agent-info-panel');
    const nameEl = document.getElementById('agent-info-name');
    const statusTextEl = document.getElementById('status-text');

    if (panel && panel.style.display !== 'none' && nameEl && nameEl.innerText.trim().toLowerCase() === agentName.trim().toLowerCase()) {
      if (statusTextEl) {
        statusTextEl.innerText = statusMessage;
      }
    }
  }

  console.log(`[Studio3D] updateAgentStatus: "${agentName}" -> "${statusMessage}" (${foundCount} Meshes)`);
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
    targetCameraY = (floor === 'UG') ? -10 : 5;
    currentFloor = (floor === 'UG') ? 'UG' : 'EG';
    targetElevatorY = (floor === 'UG') ? -14.0 : 1.0;
  } else if (typeof stageInput === 'string' && (stageInput.toLowerCase().includes('ug') || stageInput.toLowerCase().includes('keller') || stageInput.toLowerCase().includes('untergeschoss'))) {
    targetCameraY = -10;
    currentFloor = 'UG';
    targetElevatorY = -14.0;
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

  // Sanftes Gleiten des gläsernen Aufzugs zwischen EG und UG
  if (elevatorCabin && typeof targetElevatorY === 'number') {
    elevatorCabin.position.y += (targetElevatorY - elevatorCabin.position.y) * 0.06;
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

  // Native zustandsbasierte Kamera-Animation laut Anforderung (ohne GSAP / TWEEN)
  if (typeof targetCameraY === 'number') {
    camera.position.y += (targetCameraY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
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
  window.getCurrentFloor = () => currentFloor;
  window.dispose3DStudio = dispose3DStudio;
}
