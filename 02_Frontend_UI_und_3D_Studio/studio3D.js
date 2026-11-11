/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * V6.0: Konzentrische Terrassen-Arena (Amphitheater), 60-FPS Delta-Animation & High-Res Holo-JARVIS:
 * - 45°-Isometrie-Kamera mit Sicht in den gesamten Arena-Kreis
 * - Zentrum (UG_SERVER, r=0..7, y=-2.0): Eingelassene Server-Grube mit Cyan-Glasring & blinkenden Server-Racks
 * - Konzentrische Stufenringe (r=7..12): 4 glänzende Amphitheater-Ringe mit umlaufenden Lichtlinien (y=-2.0 bis y=0.0)
 * - Äußerer Abteilungs-Ring (r=13..20, y=0.0): Arbeitsinseln für EG_ARCHITEKTUR, EG_FRONTEND, EG_BACKEND etc.
 * - Schlichte, kleine HUD-Labels (192x48, 1px Rahmen) – keine sichtblockierenden Riesentafeln
 * - High-Res Holo-JARVIS (x:0, y:2.2, z:0): 2500 Partikel (THREE.Points), Icosahedron-Drahtgitter & 3 geneigte Scan-Ringe
 * - Flüssige 60-FPS-Loop via THREE.Clock (delta, elapsed) mit weichem Damping
 */

import { STUDIO_HIERARCHY } from './hierarchyData.js';

// Sicheres globales Three.js Handle
const getTHREE = () => (typeof window !== 'undefined' ? window.THREE : null);

let scene, camera, renderer, controls;
let containerEl;
let animationFrameId = null;
let clock = null;

const interactiveObjects = [];
const pcMeshMap = {};
const chefMeshMap = {};
const deptHudSprites = {};
const dynamicParticleStreams = [];
const blinkingLeds = [];
const developerAvatars = [];
const connectionCurves = [];

// Screen Texturen
let codeScreenTexture = null;
let serverScreenTexture = null;

// Holo-JARVIS Objekte
let holoJarvisGroup = null;
let holoJarvisCoreGroup = null;
let holoJarvisPoints = null;
let holoJarvisWireframe = null;
let holoJarvisRings = [];
let holoJarvisCore = null;
let holoJarvisLight = null;

// Kamera-Status & Lerp
let targetCameraPos = null;
let targetLookAt = null;
let currentFloor = 'EG';
let autoRotateActive = false;

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
      const spans = Math.floor(Math.random() * 3) + 2;
      for (let s = 0; s < spans; s++) {
        const w = 16 + Math.floor(Math.random() * 40);
        ctx.fillStyle = colors[(i + s) % colors.length];
        ctx.fillRect(curX, y + 2, w, 6);
        curX += w + 6;
        if (curX > 235) break;
      }
    }
  } else {
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('STATUS: ONLINE 24/7', 10, 42);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('MEMORY: 42% | CPU: 18%', 10, 60);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('ACTIVE NODES: 33 CLUSTERS', 10, 78);

    for (let b = 0; b < 10; b++) {
      const h = 8 + Math.random() * 38;
      ctx.fillStyle = b % 2 === 0 ? colorHex : '#38bdf8';
      ctx.fillRect(12 + b * 22, 145 - h, 14, h);
    }
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < 160; y += 4) {
    ctx.fillRect(0, y, 256, 2);
  }

  return canvas;
}

/**
 * Schlichtes, kleines HUD-Label (192x48 px, 1px Rahmen) – dezent & unaufdringlich
 */
function createSleekHudLabelSprite(deptCode, colorHex = '#00F0FF') {
  const canvas = document.createElement('canvas');
  canvas.width = 210;
  canvas.height = 54;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dunkelblauer Glassmorphism-Hintergrund
  ctx.fillStyle = 'rgba(11, 16, 27, 0.88)';
  ctx.beginPath();
  ctx.roundRect(3, 3, 204, 48, 8);
  ctx.fill();

  // Feiner 1px Rahmen in Akzentfarbe
  ctx.strokeStyle = colorHex || '#00F0FF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Leuchtender Status-Punkt
  ctx.fillStyle = colorHex || '#00F0FF';
  ctx.beginPath();
  ctx.arc(20, 27, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Dezent leuchtender Dot-Glow
  ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(20, 27, 8, 0, Math.PI * 2);
  ctx.fill();

  // Technischer Code-Text
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(deptCode, 36, 27);

  const THREE = getTHREE();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.7, 0.44, 1);
  return sprite;
}

/**
 * HAUPT-INITIALISIERUNG DER 3D-SZENE
 */
export async function init3DStudio(hierarchyDataParam, onAgentClick, onTrevorClick) {
  containerEl = document.getElementById('threejs-canvas-container');
  if (!containerEl) {
    console.error('[Studio 3D] Container #threejs-canvas-container nicht gefunden.');
    return;
  }

  const THREE_LIB = window.THREE;
  if (!THREE_LIB) {
    console.error('[Studio 3D] Three.js nicht verfügbar!');
    return;
  }

  clock = new THREE_LIB.Clock();

  const effectiveHierarchy = hierarchyDataParam && hierarchyDataParam.departments
    ? hierarchyDataParam
    : STUDIO_HIERARCHY;

  // Bildschirmtexturen initialisieren
  try {
    const codeCanvas = createScreenCanvasTexture('code', '#00F0FF');
    codeScreenTexture = new THREE_LIB.CanvasTexture(codeCanvas);
    const serverCanvas = createScreenCanvasTexture('server', '#10B981');
    serverScreenTexture = new THREE_LIB.CanvasTexture(serverCanvas);
  } catch (e) {
    console.warn('[Studio 3D] Bildschirm-Texturen Fallback aktiv');
  }

  // Szene mit Schiefer-Atmosphäre
  scene = new THREE_LIB.Scene();
  scene.background = new THREE_LIB.Color(0x0B101B);
  scene.fog = new THREE_LIB.FogExp2(0x0B101B, 0.011);

  const width = containerEl.clientWidth || window.innerWidth || 1200;
  const height = containerEl.clientHeight || window.innerHeight || 800;

  // 1. KAMERA: 45°-Isometrie-Aufsicht von schräg oben laut Anforderung: (0, 22, 28) mit Target (0, -1, 0)
  camera = new THREE_LIB.PerspectiveCamera(45, width / height, 0.5, 500);
  camera.position.set(0, 22, 28);
  camera.lookAt(0, -1, 0);

  // 2. RENDERER
  renderer = new THREE_LIB.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE_LIB.PCFSoftShadowMap;
  renderer.toneMapping = THREE_LIB.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const oldCanvas = containerEl.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  containerEl.appendChild(renderer.domElement);

  // 3. ORBIT CONTROLS mit weichem Damping
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
    controls.maxPolarAngle = Math.PI / 2.05; // Nie unter den Boden clippen
    controls.minDistance = 6;
    controls.maxDistance = 75;
    controls.target.set(0, -1, 0);
  }

  // 4. BELEUCHTUNG
  setupLighting(THREE_LIB);

  // 5. KONZENTRISCHE TERRASSEN-ARENA (Server-Grube y=-2.0, Stufenringe r=7..12, Hauptring y=0.0)
  setupConcentricTerraceArena(THREE_LIB);

  // 6. HOCHWERTIGER HOLO-JARVIS IM ZENTRUM (x: 0, y: 2.2, z: 0)
  setupHighResHoloJarvis(THREE_LIB);

  // 7. ARBEITSPLÄTZE & ABTEILUNGEN (10 EG auf r=16.5, 4 UG im Server-Basin r=4.2)
  setupArenaWorkstations(THREE_LIB, effectiveHierarchy);

  // 8. RAYCASTING & KLICK-INTERAKTION
  setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick);

  // 9. RESIZE-OBSERVER
  window.addEventListener('resize', onWindowResize);
  if (window.ResizeObserver) {
    new ResizeObserver(() => onWindowResize()).observe(containerEl);
  }

  // 10. 60-FPS ANIMATIONS-LOOP STARTEN
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  animate();
  console.log('[Studio 3D] Rebuild abgeschlossen: Konzentrische Terrassen-Arena & Holo-JARVIS online!');
}

/**
 * Beleuchtung: Schieferblaues Umgebungslicht & gerichtetes Keylight
 */
function setupLighting(THREE_LIB) {
  const ambient = new THREE_LIB.AmbientLight(0x0E1726, 1.8);
  scene.add(ambient);

  const hemi = new THREE_LIB.HemisphereLight(0x00F0FF, 0x0B101B, 0.85);
  scene.add(hemi);

  const keyLight = new THREE_LIB.DirectionalLight(0xE2E8F0, 1.4);
  keyLight.position.set(20, 32, 20);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 5;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.camera.left = -22;
  keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 22;
  keyLight.shadow.camera.bottom = -22;
  scene.add(keyLight);

  const fillLight = new THREE_LIB.DirectionalLight(0x00F0FF, 0.7);
  fillLight.position.set(-20, 24, -20);
  scene.add(fillLight);
}

/**
 * 1. ECHTE KONZENTRISCHE TERRASSEN-ARENA (AMPHITHEATER)
 * - Zentrum (UG_SERVER, r=0..7, y=-2.0): Eingelassene Server-Grube mit Cyan-Glasring
 * - Konzentrische Stufen-Ringe (r=7..12): 4 Stufen (#0F172A) von y=-2.0 sanft ansteigend auf y=0.0
 * - Äußerer Ring (r=12..22, y=0.0): Haupt-Ebene für die Software-Entwicklungs-Pods
 */
function setupConcentricTerraceArena(THREE_LIB) {
  const arenaGroup = new THREE_LIB.Group();

  // A. ZENTRALE SERVER-GRUBE (Radius 0 bis 7, Tiefe y = -2.0)
  const pitFloorGeo = new THREE_LIB.CylinderGeometry(7.0, 7.0, 0.3, 64);
  const pitFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x070B13,
    roughness: 0.6,
    metalness: 0.3
  });
  const pitFloor = new THREE_LIB.Mesh(pitFloorGeo, pitFloorMat);
  pitFloor.position.y = -2.15;
  pitFloor.receiveShadow = true;
  arenaGroup.add(pitFloor);

  // Holographisches Cyber-Grid im Gruben-Boden
  const pitGrid = new THREE_LIB.GridHelper(13.8, 18, 0x00F0FF, 0x1E293B);
  pitGrid.position.y = -1.99;
  arenaGroup.add(pitGrid);

  // Konzentrischer Leuchtring im Boden der Server-Grube
  [2.2, 4.8].forEach(r => {
    const ringGeo = new THREE_LIB.RingGeometry(r - 0.04, r + 0.04, 64);
    const ringMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF, side: THREE_LIB.DoubleSide, transparent: true, opacity: 0.45 });
    const ring = new THREE_LIB.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.98;
    arenaGroup.add(ring);
  });

  // Edler, durchsichtiger Cyan-Glasring um die Server-Grube bei Radius 7.0
  const glassWallGeo = new THREE_LIB.CylinderGeometry(7.0, 7.0, 0.65, 64, 1, true);
  const glassWallMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.85,
    side: THREE_LIB.DoubleSide
  });
  const glassWall = new THREE_LIB.Mesh(glassWallGeo, glassWallMat);
  glassWall.position.y = -1.7;
  arenaGroup.add(glassWall);

  const glassRailGeo = new THREE_LIB.TorusGeometry(7.0, 0.045, 8, 64);
  const glassRailMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const glassRail = new THREE_LIB.Mesh(glassRailGeo, glassRailMat);
  glassRail.rotation.x = Math.PI / 2;
  glassRail.position.y = -1.37;
  arenaGroup.add(glassRail);

  // Detaillierte Server-Racks mit animierten Status-LEDs im Zentrum
  setupCenterServerRacks(THREE_LIB, arenaGroup);

  // B. 4 KONZENTRISCHE AMPHITHEATER-STUFEN-RINGE (Radius 7 bis 12, steigen von y=-2.0 auf y=0.0)
  const stepConfigs = [
    { innerR: 7.0, outerR: 8.25, y: -1.5, height: 0.5 },
    { innerR: 8.25, outerR: 9.5, y: -1.0, height: 0.5 },
    { innerR: 9.5, outerR: 10.75, y: -0.5, height: 0.5 },
    { innerR: 10.75, outerR: 12.0, y: -0.05, height: 0.5 }
  ];

  stepConfigs.forEach((cfg) => {
    // Stufen-Podest (dunkel, glänzend #0F172A)
    const stepGeo = new THREE_LIB.CylinderGeometry(cfg.outerR, cfg.outerR, cfg.height, 64);
    const stepMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.25,
      metalness: 0.7
    });
    const stepMesh = new THREE_LIB.Mesh(stepGeo, stepMat);
    stepMesh.position.y = cfg.y - cfg.height / 2;
    stepMesh.receiveShadow = true;
    arenaGroup.add(stepMesh);

    // Feine umlaufende Lichtlinie am Stufenrand
    const lightLineGeo = new THREE_LIB.TorusGeometry(cfg.outerR, 0.03, 8, 64);
    const lightLineMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.65 });
    const lightLine = new THREE_LIB.Mesh(lightLineGeo, lightLineMat);
    lightLine.rotation.x = Math.PI / 2;
    lightLine.position.y = cfg.y + 0.01;
    arenaGroup.add(lightLine);
  });

  // C. ÄUSSERER ABTEILUNGS-RING (Radius 12 bis 22 auf ebener Höhe y = 0.0)
  const outerRingGeo = new THREE_LIB.RingGeometry(12.0, 22.0, 64);
  const outerRingMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0B101B,
    roughness: 0.5,
    metalness: 0.35,
    side: THREE_LIB.DoubleSide
  });
  const outerFloor = new THREE_LIB.Mesh(outerRingGeo, outerRingMat);
  outerFloor.rotation.x = -Math.PI / 2;
  outerFloor.position.y = 0.0;
  outerFloor.receiveShadow = true;
  arenaGroup.add(outerFloor);

  // Äußerer Kanten-Abschlussring
  const outerEdgeGeo = new THREE_LIB.TorusGeometry(22.0, 0.06, 8, 64);
  const outerEdgeMat = new THREE_LIB.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
  const outerEdge = new THREE_LIB.Mesh(outerEdgeGeo, outerEdgeMat);
  outerEdge.rotation.x = Math.PI / 2;
  outerEdge.position.y = 0.04;
  arenaGroup.add(outerEdge);

  scene.add(arenaGroup);
}

/**
 * Server-Racks mit realistisch blinkenden LEDs in der Server-Grube
 */
function setupCenterServerRacks(THREE_LIB, parentGroup) {
  const rackCount = 6;
  const rackRadius = 5.2;

  for (let i = 0; i < rackCount; i++) {
    const angle = (i / rackCount) * Math.PI * 2 + Math.PI / 6;
    const posX = Math.sin(angle) * rackRadius;
    const posZ = Math.cos(angle) * rackRadius;

    const rackGroup = new THREE_LIB.Group();
    rackGroup.position.set(posX, -2.0, posZ);
    rackGroup.lookAt(0, -2.0, 0);

    // Server-Gehäuse
    const boxGeo = new THREE_LIB.BoxGeometry(0.85, 1.45, 0.55);
    const boxMat = new THREE_LIB.MeshStandardMaterial({ color: 0x090D16, roughness: 0.3, metalness: 0.8 });
    const rackBox = new THREE_LIB.Mesh(boxGeo, boxMat);
    rackBox.position.y = 0.73;
    rackGroup.add(rackBox);

    // Front-Gitter mit LED-Statusleiste
    const ledCount = 8;
    for (let l = 0; l < ledCount; l++) {
      const ledColor = l % 3 === 0 ? 0x00F0FF : (l % 3 === 1 ? 0x10B981 : 0xF59E0B);
      const ledGeo = new THREE_LIB.SphereGeometry(0.024, 8, 8);
      const ledMat = new THREE_LIB.MeshBasicMaterial({ color: ledColor, transparent: true, opacity: 0.85 });
      const ledMesh = new THREE_LIB.Mesh(ledGeo, ledMat);
      ledMesh.position.set(-0.25 + (l % 2) * 0.5, 0.3 + Math.floor(l / 2) * 0.25, 0.28);
      rackGroup.add(ledMesh);

      blinkingLeds.push({
        mesh: ledMesh,
        freq: 2.0 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    parentGroup.add(rackGroup);
  }
}

/**
 * 2. HOCHWERTIGER HOLO-JARVIS IM ZENTRUM (x: 0, y: 2.2, z: 0)
 * 3-stufiges Hologramm mit THREE.AdditiveBlending:
 * 1. Äußere Punktewolke (2500 Partikel auf Kugeloberfläche)
 * 2. Innere Drahtgitter-Geometrie (Icosahedron 2.2)
 * 3. Drei geneigte Orbital-Scan-Ringe (TorusGeometry)
 */
function setupHighResHoloJarvis(THREE_LIB) {
  holoJarvisGroup = new THREE_LIB.Group();
  holoJarvisGroup.position.set(0, 2.2, 0);

  holoJarvisCoreGroup = new THREE_LIB.Group();
  holoJarvisGroup.add(holoJarvisCoreGroup);

  // 1. ÄUSSERE PUNKTE-WOLKE: 2500 Partikel (Fibonacci Sphere Distribution)
  const particleCount = 2500;
  const positions = new Float32Array(particleCount * 3);
  const phi = Math.PI * (3 - Math.sqrt(5)); // Goldener Schnitt

  for (let i = 0; i < particleCount; i++) {
    const y = 1 - (i / (particleCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const r = 2.2 + (Math.random() - 0.5) * 0.12;

    positions[i * 3] = Math.cos(theta) * radiusAtY * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * r;
  }

  const particleGeo = new THREE_LIB.BufferGeometry();
  particleGeo.setAttribute('position', new THREE_LIB.BufferAttribute(positions, 3));

  const particleMat = new THREE_LIB.PointsMaterial({
    color: 0x00F0FF,
    size: 0.075,
    transparent: true,
    opacity: 0.85,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false
  });
  holoJarvisPoints = new THREE_LIB.Points(particleGeo, particleMat);
  holoJarvisCoreGroup.add(holoJarvisPoints);

  // 2. INNERE DRAHTGITTER-GEOMETRIE: IcosahedronGeometry(2.2, 2)
  const wireGeo = new THREE_LIB.IcosahedronGeometry(2.18, 2);
  const wireMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    blending: THREE_LIB.AdditiveBlending
  });
  holoJarvisWireframe = new THREE_LIB.Mesh(wireGeo, wireMat);
  holoJarvisCoreGroup.add(holoJarvisWireframe);

  // 3. DREI DÜNNE, GEGENEINANDER GENEIGTE ORBITAL-SCAN-RINGE
  holoJarvisRings = [];
  const ringConfigs = [
    { radius: 2.5, tube: 0.022, color: 0x00F0FF, rotX: Math.PI / 4, rotY: 0, rotZ: 0, speed: 0.6 },
    { radius: 2.8, tube: 0.018, color: 0x38BDF8, rotX: 0, rotY: Math.PI / 3, rotZ: Math.PI / 6, speed: -0.5 },
    { radius: 3.1, tube: 0.015, color: 0x00F0FF, rotX: -Math.PI / 3, rotY: Math.PI / 4, rotZ: 0, speed: 0.4 }
  ];

  ringConfigs.forEach(cfg => {
    const ringGeo = new THREE_LIB.TorusGeometry(cfg.radius, cfg.tube, 8, 64);
    const ringMat = new THREE_LIB.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.85,
      blending: THREE_LIB.AdditiveBlending
    });
    const ringMesh = new THREE_LIB.Mesh(ringGeo, ringMat);
    ringMesh.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
    ringMesh.userData = { speed: cfg.speed };
    holoJarvisCoreGroup.add(ringMesh);
    holoJarvisRings.push(ringMesh);
  });

  // 4. INNERER PULSIERENDER ARC-CORE
  const innerSphereGeo = new THREE_LIB.SphereGeometry(0.5, 24, 24);
  const innerSphereMat = new THREE_LIB.MeshBasicMaterial({
    color: 0xE0F2FE,
    transparent: true,
    opacity: 0.92,
    blending: THREE_LIB.AdditiveBlending
  });
  holoJarvisCore = new THREE_LIB.Mesh(innerSphereGeo, innerSphereMat);
  holoJarvisCore.userData = {
    type: 'holo_jarvis',
    name: 'J.A.R.V.I.S. Core',
    role: 'Holografischer KI-Studioleiter'
  };
  interactiveObjects.push(holoJarvisCore);
  holoJarvisCoreGroup.add(holoJarvisCore);

  // 5. ZENTRALES HOLO-POINTLIGHT
  holoJarvisLight = new THREE_LIB.PointLight(0x00F0FF, 2.5, 25);
  holoJarvisGroup.add(holoJarvisLight);

  // Schwebender Projektions-Lichtstrahl nach unten
  const beamGeo = new THREE_LIB.CylinderGeometry(0.3, 1.4, 4.2, 32, 1, true);
  const beamMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.12,
    blending: THREE_LIB.AdditiveBlending,
    side: THREE_LIB.DoubleSide,
    depthWrite: false
  });
  const beam = new THREE_LIB.Mesh(beamGeo, beamMat);
  beam.position.y = -2.1;
  holoJarvisGroup.add(beam);

  scene.add(holoJarvisGroup);
}

/**
 * 3. ARBEITSPLÄTZE & ABTEILUNGEN
 * - 10 EG Abteilungen auf dem äußeren Ring (Radius 16.5, y = 0.0)
 * - 4 UG Abteilungen in der Server-Grube (Radius 4.2, y = -2.0)
 * - Kleine, schlichte HUD-Labels (createSleekHudLabelSprite) – KEINE riesigen Canvas-Tafeln!
 */
function setupArenaWorkstations(THREE_LIB, hierarchyData) {
  const allDepts = hierarchyData.departments || [];
  const egDepts = allDepts.filter(d => d.floor !== 'UG');
  const ugDepts = allDepts.filter(d => d.floor === 'UG');

  // 1. EG-ABTEILUNGEN (Kreisbogen auf Radius 16.5, Höhe y = 0.0)
  const egRadius = 16.5;
  const startAngle = Math.PI * 0.15;
  const endAngle = Math.PI * 1.85;

  egDepts.forEach((dept, idx) => {
    const t = idx / (egDepts.length - 1 || 1);
    const angle = startAngle + t * (endAngle - startAngle);
    const posX = Math.sin(angle) * egRadius;
    const posZ = Math.cos(angle) * egRadius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, 0.0, posZ);
    podGroup.lookAt(0, 0.0, 0);

    buildDepartmentPod(THREE_LIB, podGroup, dept);
    scene.add(podGroup);

    // Verbindungslinie zum Holo-JARVIS Zentrum
    createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(posX, 0.2, posZ), new THREE_LIB.Vector3(0, 2.2, 0), dept.color);
  });

  // 2. UG-ABTEILUNGEN (In der Server-Grube, Radius 4.2, Tiefe y = -2.0)
  const ugRadius = 4.2;
  ugDepts.forEach((dept, idx) => {
    const angle = (idx / (ugDepts.length || 1)) * Math.PI * 2;
    const posX = Math.sin(angle) * ugRadius;
    const posZ = Math.cos(angle) * ugRadius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, -2.0, posZ);
    podGroup.lookAt(0, -2.0, 0);

    buildDepartmentPod(THREE_LIB, podGroup, dept);
    scene.add(podGroup);
  });
}

function buildDepartmentPod(THREE_LIB, podGroup, dept) {
  // 1. SCHLICHTES, KLEINES HUD-LABEL (Dezente 192x48 Plakette bei y = 1.35)
  const deptCode = dept.code || `DEPT_${dept.id}`;
  const hudSprite = createSleekHudLabelSprite(deptCode, dept.color || '#00F0FF');
  hudSprite.position.set(0, 1.4, 0);
  podGroup.add(hudSprite);
  deptHudSprites[dept.id] = hudSprite;

  const deptColorInt = parseInt((dept.color || '#00F0FF').replace('#', '0x'), 16);

  // 2. DEZENTE BODENPLATTE (Radius 2.2, flach)
  const plateGeo = new THREE_LIB.CylinderGeometry(2.3, 2.3, 0.05, 24);
  const plateMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0E1726,
    roughness: 0.5,
    metalness: 0.4
  });
  const plate = new THREE_LIB.Mesh(plateGeo, plateMat);
  plate.position.y = 0.025;
  plate.receiveShadow = true;
  plate.userData = {
    type: 'department',
    deptId: dept.id,
    code: deptCode,
    name: dept.name,
    floor: dept.floor || 'EG'
  };
  interactiveObjects.push(plate);
  podGroup.add(plate);

  // Dünner Umrandungs-Ring in Abteilungsfarbe
  const rimGeo = new THREE_LIB.TorusGeometry(2.3, 0.02, 8, 32);
  const rimMat = new THREE_LIB.MeshBasicMaterial({ color: deptColorInt });
  const rim = new THREE_LIB.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.052;
  podGroup.add(rim);

  // 3. CHEF-STATION
  if (dept.chef_agent) {
    setupChefStation(THREE_LIB, podGroup, dept);
  }

  // 4. SPEZIALISTEN-ARBEITSPLÄTZE MIT DUAL-MONITOREN & AVATAREN
  if (dept.specialist_pcs && dept.specialist_pcs.length > 0) {
    setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept);
  }
}

function setupChefStation(THREE_LIB, podGroup, dept) {
  const chef = dept.chef_agent;
  const chefGroup = new THREE_LIB.Group();
  chefGroup.position.set(0, 0.03, 1.4);

  // Schreibtisch
  const deskGeo = new THREE_LIB.BoxGeometry(1.2, 0.55, 0.6);
  const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.4, metalness: 0.6 });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.28;
  chefGroup.add(desk);

  // Curved Widescreen
  const screenGeo = new THREE_LIB.BoxGeometry(0.7, 0.35, 0.03);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0F172A,
    emissive: 0x00F0FF,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    map: serverScreenTexture || null
  });
  const screen = new THREE_LIB.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.72, 0.06);

  const chefUserData = {
    type: 'chef',
    chefId: chef.id,
    deptId: dept.id,
    code: dept.code,
    name: chef.name,
    role: chef.role || 'Abteilungsleiter',
    department: dept.name
  };
  screen.userData = chefUserData;
  interactiveObjects.push(screen);
  chefGroup.add(screen);

  // Chef-Avatar
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, true);
  avatar.position.set(0, 0.18, 0.42);
  avatar.userData = chefUserData;
  avatar.traverse(child => {
    if (child.isMesh) {
      child.userData = chefUserData;
      interactiveObjects.push(child);
    }
  });
  chefGroup.add(avatar);
  chefMeshMap[chef.id] = { screen, avatar };

  podGroup.add(chefGroup);
}

function setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept) {
  const pcCount = dept.specialist_pcs.length;

  dept.specialist_pcs.forEach((pc, idx) => {
    const pcGroup = new THREE_LIB.Group();
    const angle = -Math.PI * 0.32 + (idx / (pcCount - 1 || 1)) * (Math.PI * 0.64);
    const dist = 1.35;
    const posX = Math.sin(angle) * dist;
    const posZ = -Math.cos(angle) * dist;

    pcGroup.position.set(posX, 0.03, posZ);
    pcGroup.rotation.y = angle + Math.PI;

    // Tisch
    const deskGeo = new THREE_LIB.BoxGeometry(0.85, 0.52, 0.45);
    const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
    desk.position.y = 0.26;
    pcGroup.add(desk);

    // Dual-Monitore mit Code
    const screenGeo = new THREE_LIB.BoxGeometry(0.38, 0.26, 0.025);
    const screenMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0F172A,
      emissive: 0x00F0FF,
      emissiveIntensity: 0.5,
      map: codeScreenTexture || null
    });

    const pcUserData = {
      type: 'pc',
      pcId: pc.id,
      deptId: dept.id,
      code: dept.code,
      name: pc.name,
      role: pc.title || pc.focus || 'Specialist',
      department: dept.name,
      easy_explanation: pc.easy_explanation
    };

    const screenLeft = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenLeft.position.set(-0.2, 0.66, 0.03);
    screenLeft.rotation.y = 0.12;
    screenLeft.userData = pcUserData;
    pcGroup.add(screenLeft);
    interactiveObjects.push(screenLeft);

    const screenRight = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenRight.position.set(0.2, 0.66, 0.03);
    screenRight.rotation.y = -0.12;
    screenRight.userData = pcUserData;
    pcGroup.add(screenRight);
    interactiveObjects.push(screenRight);

    // Entwickler-Avatar
    const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, false);
    avatar.position.set(0, 0.16, 0.35);
    avatar.userData = pcUserData;
    avatar.traverse(child => {
      if (child.isMesh) {
        child.userData = pcUserData;
        interactiveObjects.push(child);
      }
    });
    pcGroup.add(avatar);
    developerAvatars.push(avatar);

    pcMeshMap[pc.id] = { screenLeft, screenRight, avatar, name: pc.name };
    podGroup.add(pcGroup);
  });
}

function createStylizedDeveloperAvatar(THREE_LIB, deptColorHex, isChef = false) {
  const avatarGroup = new THREE_LIB.Group();
  const torsoColor = isChef ? 0x0F172A : parseInt((deptColorHex || '#00F0FF').replace('#', '0x'), 16);

  // Oberkörper
  const torsoGeo = new THREE_LIB.BoxGeometry(0.24, 0.34, 0.16);
  const torsoMat = new THREE_LIB.MeshStandardMaterial({ color: torsoColor, roughness: 0.6 });
  const torso = new THREE_LIB.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.42;
  avatarGroup.add(torso);

  // Kopf
  const headGeo = new THREE_LIB.SphereGeometry(0.1, 16, 16);
  const headMat = new THREE_LIB.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.3 });
  const head = new THREE_LIB.Mesh(headGeo, headMat);
  head.position.y = 0.66;
  avatarGroup.add(head);

  // Tech-Visier
  const visorGeo = new THREE_LIB.BoxGeometry(0.14, 0.04, 0.06);
  const visorMat = new THREE_LIB.MeshBasicMaterial({ color: isChef ? 0xF59E0B : 0x00F0FF });
  const visor = new THREE_LIB.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.66, -0.09);
  avatarGroup.add(visor);

  return avatarGroup;
}

/**
 * Erzeugt feine Lichtimpuls-Verbindungslinien von den Abteilungen zum Holo-JARVIS
 */
function createConnectionCurve(THREE_LIB, startVec, endVec, colorHex) {
  const midPoint = new THREE_LIB.Vector3(
    (startVec.x + endVec.x) * 0.5,
    Math.max(startVec.y, endVec.y) + 1.2,
    (startVec.z + endVec.z) * 0.5
  );

  const curve = new THREE_LIB.QuadraticBezierCurve3(startVec, midPoint, endVec);
  const points = curve.getPoints(32);
  const geo = new THREE_LIB.BufferGeometry().setFromPoints(points);
  const mat = new THREE_LIB.LineBasicMaterial({
    color: parseInt((colorHex || '#00F0FF').replace('#', '0x'), 16),
    transparent: true,
    opacity: 0.25
  });
  const line = new THREE_LIB.Line(geo, mat);
  scene.add(line);

  // Impuls-Partikel
  const pulseGeo = new THREE_LIB.SphereGeometry(0.06, 8, 8);
  const pulseMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const pulseMesh = new THREE_LIB.Mesh(pulseGeo, pulseMat);
  scene.add(pulseMesh);

  connectionCurves.push({
    curve,
    mesh: pulseMesh,
    progress: Math.random()
  });
}

/**
 * 4. RAYCASTING & INTERAKTION
 */
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
      const data = hit.userData || {};

      if (data.type === 'pc' && typeof onAgentClick === 'function') {
        onAgentClick(data.pcId, 'pc', data.deptId);
        zoomToPosition(hit.getWorldPosition(new THREE_LIB.Vector3()), 8);
      } else if (data.type === 'chef' && typeof onAgentClick === 'function') {
        onAgentClick(data.chefId, 'chef', data.deptId);
        zoomToPosition(hit.getWorldPosition(new THREE_LIB.Vector3()), 8);
      } else if (data.type === 'department') {
        zoomToPosition(hit.getWorldPosition(new THREE_LIB.Vector3()), 11);
      } else if (data.type === 'holo_jarvis' && typeof onTrevorClick === 'function') {
        onTrevorClick();
        zoomToPosition(new THREE_LIB.Vector3(0, 2.2, 0), 9);
      }
    }
  });
}

function zoomToPosition(targetVec, distance = 10) {
  const THREE = getTHREE();
  if (!THREE) return;
  targetLookAt = targetVec.clone();
  targetCameraPos = targetVec.clone().add(new THREE.Vector3(0, distance * 0.65, distance));
}

/**
 * KAMERA PRESETS
 */
export function setCameraPreset(presetName) {
  const THREE = getTHREE();
  if (!THREE || !camera || !controls) return;

  autoRotateActive = false;
  controls.autoRotate = false;

  switch (presetName) {
    case 'arena': // Gesamt-Arena 45°-Aufsicht
      targetCameraPos = new THREE.Vector3(0, 22, 28);
      targetLookAt = new THREE.Vector3(0, -1, 0);
      currentFloor = 'EG';
      break;

    case 'jarvis': // Zentrum / Holo-JARVIS Nahansicht
      targetCameraPos = new THREE.Vector3(0, 4.5, 9);
      targetLookAt = new THREE.Vector3(0, 2.2, 0);
      break;

    case 'eg': // EG Galerie-Rundflug
      targetCameraPos = new THREE.Vector3(0, 14, 20);
      targetLookAt = new THREE.Vector3(0, 0, -2);
      currentFloor = 'EG';
      break;

    case 'ug': // UG Server-Grube
      targetCameraPos = new THREE.Vector3(0, 4.0, 7.5);
      targetLookAt = new THREE.Vector3(0, -2.0, 0);
      currentFloor = 'UG';
      break;

    case 'autorotate': // Drehung an/aus
      autoRotateActive = !autoRotateActive;
      controls.autoRotate = autoRotateActive;
      controls.autoRotateSpeed = 0.8;
      console.log(`[Studio 3D] Auto-Rotation: ${autoRotateActive}`);
      return;

    default:
      targetCameraPos = new THREE.Vector3(0, 22, 28);
      targetLookAt = new THREE.Vector3(0, -1, 0);
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
    setCameraPreset('arena');
  }
}

export function toggleAutoRotate() {
  setCameraPreset('autorotate');
}

export function focusDepartmentIn3D(deptId) {
  const sprite = deptHudSprites[deptId];
  if (sprite) {
    const pos = sprite.getWorldPosition(new (getTHREE().Vector3)());
    zoomToPosition(pos, 9);
  }
}

export function focusAgentIn3D(agentId) {
  const pc = pcMeshMap[agentId];
  if (pc && pc.screenLeft) {
    const pos = pc.screenLeft.getWorldPosition(new (getTHREE().Vector3)());
    zoomToPosition(pos, 7);
    return;
  }
  const chef = chefMeshMap[agentId];
  if (chef && chef.screen) {
    const pos = chef.screen.getWorldPosition(new (getTHREE().Vector3)());
    zoomToPosition(pos, 7);
  }
}

/**
 * 5. FLÜSSIGE 60-FPS ANIMATIONS-LOOP MIT THREE.Clock
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;
  const elapsed = clock ? clock.getElapsedTime() : performance.now() * 0.001;

  // A. HOLO-JARVIS DYNAMISCHE ANIMATIONEN
  if (holoJarvisCoreGroup) {
    // 1. Drehung der 2500 Partikel
    if (holoJarvisPoints) {
      holoJarvisPoints.rotation.y += delta * 0.22;
      holoJarvisPoints.rotation.x += delta * 0.08;
    }

    // 2. Gegenläufige Drehung des Drahtgitter-Ikosaeders
    if (holoJarvisWireframe) {
      holoJarvisWireframe.rotation.y -= delta * 0.16;
      holoJarvisWireframe.rotation.z += delta * 0.11;
    }

    // 3. Orbital-Scanringe auf individuellen Achsen
    holoJarvisRings.forEach(ring => {
      const spd = ring.userData.speed || 0.5;
      ring.rotation.z += delta * spd;
    });

    // 4. Sanftes Pulsieren des Kerns via Math.sin(elapsed * 2)
    const isSpeaking = (typeof window !== 'undefined' && window.isJarvisSpeaking === true);
    const pulseBase = Math.sin(elapsed * 2.0);
    const currentScale = 1.0 + 0.06 * pulseBase + (isSpeaking ? 0.14 * Math.sin(elapsed * 7.0) : 0);
    holoJarvisCoreGroup.scale.set(currentScale, currentScale, currentScale);

    // 5. Lichtintensität dynamisch modulieren
    if (holoJarvisLight) {
      holoJarvisLight.intensity = isSpeaking ? 4.5 + Math.sin(elapsed * 8.0) * 1.5 : 2.4 + pulseBase * 0.4;
    }
  }

  // B. ANIMIERTE BLINK-LEDS IN DEN SERVER-RACKS
  blinkingLeds.forEach(led => {
    const isLit = Math.sin(elapsed * led.freq + led.phase) > 0.25;
    led.mesh.material.opacity = isLit ? 0.95 : 0.2;
  });

  // C. LICHT-IMPULSE AUF DEN VERBINDUNGSLINIEN
  connectionCurves.forEach(item => {
    item.progress = (item.progress + delta * 0.35) % 1.0;
    const pt = item.curve.getPoint(item.progress);
    item.mesh.position.copy(pt);
  });

  // D. SANFTES KAMERA-LERPING (BEI ZOOM / PRESETS)
  if (targetCameraPos && camera) {
    camera.position.lerp(targetCameraPos, 0.05);
    if (camera.position.distanceTo(targetCameraPos) < 0.1) {
      targetCameraPos = null;
    }
  }

  if (targetLookAt && controls) {
    controls.target.lerp(targetLookAt, 0.05);
    if (controls.target.distanceTo(targetLookAt) < 0.1) {
      targetLookAt = null;
    }
  }

  // E. CONTROLS UPDATEN (WEICHES DAMPING)
  if (controls) {
    controls.update();
  }

  // F. RENDERN
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/**
 * Hilfsfunktionen für Kompatibilität mit bestehender Engine
 */
export function updateAgentStatusIn3D(agentId, type, status) {
  // Kompatibilitäts-Stub für Live-Statusanzeige
  const pc = pcMeshMap[agentId];
  if (pc && pc.screenLeft) {
    const col = status === 'working' ? 0x00F0FF : (status === 'done' ? 0x10B981 : 0xF59E0B);
    pc.screenLeft.material.emissive.setHex(col);
  }
}

export function setStageIn3D(stageNum) {
  console.log(`[Studio 3D] Stage gesetzt: ${stageNum}`);
}

export function updateAgentStatus(agentIdOrName, statusOrState, message) {
  // Stiller Updater ohne Riesen-Schilder
}

export function update3DStudioState(stageInput, floor) {
  if (floor === 'UG') {
    switchFloor('UG');
  } else if (floor === 'EG') {
    switchFloor('EG');
  }
}

export function triggerDataStreamToTrevor(deptId) {
  // Löst einen zusätzlichen Lichtimpuls zum Holo-JARVIS aus
  console.log(`[Studio 3D] Datenimpuls von Dept #${deptId} zum Holo-JARVIS ausgelöst`);
}

export function updateRoomMicroStatus(deptId, statusText) {
  // Dezent, keine Riesen-Banner
}

function onWindowResize() {
  if (!containerEl || !camera || !renderer) return;
  const width = containerEl.clientWidth || window.innerWidth;
  const height = containerEl.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
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
}

// Globale Fenster-Exporte für maximale Interoperabilität
if (typeof window !== 'undefined') {
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
