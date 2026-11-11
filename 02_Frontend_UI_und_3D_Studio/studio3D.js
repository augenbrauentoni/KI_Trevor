/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * V10.0: FINALES IRON-MAN-ARENA-DESIGN & INTERAKTIVE HOVER-SPRECHBLASEN
 * - 100% Sichtbarkeit aller 33 Agenten (Amphitheater ohne versteckten Keller!)
 * - Standard-Kameraposition: camera.position.set(0, 15, 19) -> target (0, 1.0, 0)
 * - Zentrum: Schwebende 3D-Hologramm-Figur von Iron Man (J.A.R.V.I.S.) mit Brust-Arc-Reactor
 *   und Trevor Command Station (ag_01) davor bei y = 0.0
 * - Innenring (y = 0.0, r = 3.2..6.2): Offenes Becken mit Cyan-Glasgeländer, Server-Racks &
 *   allen 8 UG_SERVER-Spezialisten (Ilja [LEAD] + Milan, Freya, Anton, Kian, Nora, Rico, Yuna)
 * - 4 Amphitheater-Stufenringe (r = 6.2..9.5, ansteigend y = 0.0..1.0) mit Cyan/Gold-Lichtlinien
 * - Äußere Galerie (y = 1.0, r = 9.8..14.5):
 *   - Links: EG_BACKEND (David [LEAD] + 7 Spezialisten)
 *   - Hinten-Rechts: EG_ARCHITEKTUR (Marcus [LEAD] + 7 Spezialisten)
 *   - Vorne-Rechts: EG_FRONTEND (Daria [LEAD] + 7 Spezialisten)
 * - Alle 33 Arbeitsplätze skaliert auf 1.5x, visible = true
 * - window.interactiveAgentMeshes = [] (Länge exakt 33)
 * - 3D-zu-2D Raycaster-Hover (#agent-hover-speech-bubble) auf pointermove
 * - 60-FPS Animations-Loop via THREE.Clock
 */

import { STUDIO_HIERARCHY, TREVOR_AGENT_ROSTER, AGENT_ROSTER_BY_ID } from './hierarchyData.js';

// Sicheres globales Three.js Handle
const getTHREE = () => (typeof window !== 'undefined' ? window.THREE : null);

let scene, camera, renderer, controls;
let containerEl;
let animationFrameId = null;
let clock = null;

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

// Hover Mini-Badge (Fallback)
let hoverBadgeEl = null;

// Aktuell hervorgehobener Bodenring
let activeHighlightedHitbox = null;

// Kamera-Status & Lerp
let targetCameraPos = null;
let targetLookAt = null;
let currentFloor = 'EG';
let autoRotateActive = false;

// Globales Handle für interaktive Agenten-Meshes
if (typeof window !== 'undefined') {
  window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
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
      const bx = 10 + b * 23;
      const bh = 14 + Math.sin(b * 1.5) * 8;
      ctx.fillStyle = b % 2 === 0 ? '#38bdf8' : '#10b981';
      ctx.fillRect(bx, 140 - bh, 18, bh);
    }
  }

  const THREE = getTHREE();
  if (!THREE) return null;
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Schlichtes, kleines HUD-Label (192x48 px mit dezentem Rahmen)
 */
function createSleekHudLabelSprite(text, colorHex = '#00F0FF') {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(11, 16, 27, 0.88)';
  ctx.roundRect ? ctx.roundRect(2, 2, 188, 44, 6) : ctx.fillRect(2, 2, 188, 44);
  ctx.fill();

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.arc(16, 24, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 15px "Inter", "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 28, 24);

  const THREE = getTHREE();
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.45, 1);
  return sprite;
}

/**
 * HAUPTINITIALISIERUNG DES 3D-STUDIOS (v10.0)
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
  scene.fog = new THREE_LIB.FogExp2(0x0B101B, 0.014);

  const aspect = containerEl.clientWidth / (containerEl.clientHeight || 1);
  camera = new THREE_LIB.PerspectiveCamera(45, aspect, 0.1, 250);

  // V10.0: Exakte Standard-Kameraposition laut Spezifikation
  camera.position.set(0, 15, 19);
  camera.lookAt(0, 1.0, 0);

  // 2. WEBGL RENDERER
  renderer = new THREE_LIB.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE_LIB.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  containerEl.insertBefore(renderer.domElement, containerEl.firstChild);

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
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 5;
    controls.maxDistance = 85;
    controls.target.set(0, 1.0, 0);
  }

  // 4. BELEUCHTUNG
  setupLighting(THREE_LIB);

  // 5. OFFENES AMPHITHEATER: INNEN-BECKEN (y=0.0) + 4 STUFENRINGE (y=0.0..1.0) + AUSSENGALERIE (y=1.0)
  setupConcentricTerraceArena(THREE_LIB);

  // 6. SCHWEBENDE 3D-HOLOGRAMM-FIGUR VON IRON MAN (J.A.R.V.I.S.) MIT BRUST-ARC-REACTOR
  setupHolographicIronManFigure(THREE_LIB);

  // 7. ARBEITSPLÄTZE & ABTEILUNGEN: ALLE 33 AGENTEN RENDERN (1.5x SKALIERUNG)
  setupArenaWorkstations(THREE_LIB, hierarchyDataParam || STUDIO_HIERARCHY);

  // 8. RAYCASTING, HOVER-SPRECHBLASE (#agent-hover-speech-bubble) & KLICK-INTERAKTION
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
  console.log('[Studio 3D] Rebuild v10.0 erfolgreich: 33 Agenten in offener Iron-Man-Arena registriert! (window.interactiveAgentMeshes.length =', window.interactiveAgentMeshes ? window.interactiveAgentMeshes.length : 0, ')');
}

/**
 * Beleuchtung: Schieferblaues Umgebungslicht, gerichtetes Keylight & Akzentlichter
 */
function setupLighting(THREE_LIB) {
  const ambient = new THREE_LIB.AmbientLight(0x0E1726, 1.8);
  scene.add(ambient);

  const hemi = new THREE_LIB.HemisphereLight(0x00F0FF, 0x0B101B, 0.9);
  scene.add(hemi);

  const keyLight = new THREE_LIB.DirectionalLight(0xE2E8F0, 1.4);
  keyLight.position.set(15, 30, 20);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE_LIB.DirectionalLight(0x00F0FF, 0.7);
  fillLight.position.set(-20, 18, -15);
  scene.add(fillLight);
}

/**
 * 1. OFFENES AMPHITHEATER (KEIN VERSTECKTER KELLER MEHR!)
 */
function setupConcentricTerraceArena(THREE_LIB) {
  // A. EBENE GRUNDFLÄCHE / ÄUSSERE GALERIE (Radius 16.5, flach auf y = 1.0)
  const egFloorGeo = new THREE_LIB.CylinderGeometry(16.5, 16.5, 0.2, 64);
  const egFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0B101B,
    roughness: 0.6,
    metalness: 0.5
  });
  const egFloor = new THREE_LIB.Mesh(egFloorGeo, egFloorMat);
  egFloor.position.y = 0.9;
  egFloor.receiveShadow = true;
  scene.add(egFloor);

  // Äußerer feiner Neon-Lichtring (r = 16.2 auf y = 1.02)
  const outerRingGeo = new THREE_LIB.TorusGeometry(16.2, 0.04, 8, 64);
  const outerRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const outerRing = new THREE_LIB.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 1.02;
  scene.add(outerRing);

  // B. INNERER ARENA-RING (OFFENES BECKEN: RADIUS 6.2, HÖHE y = 0.0)
  // Hier befindet sich die UG_SERVER-Abteilung vollkommen offen und sichtbar!
  const innerFloorGeo = new THREE_LIB.CylinderGeometry(6.2, 6.2, 0.2, 48);
  const innerFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x070B14,
    roughness: 0.35,
    metalness: 0.8
  });
  const innerFloor = new THREE_LIB.Mesh(innerFloorGeo, innerFloorMat);
  innerFloor.position.y = -0.1;
  innerFloor.receiveShadow = true;
  scene.add(innerFloor);

  // Feiner Cyan-Ring auf dem Beckenboden (r = 6.1)
  const pitRimGeo = new THREE_LIB.TorusGeometry(6.1, 0.03, 8, 48);
  const pitRimMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const pitRim = new THREE_LIB.Mesh(pitRimGeo, pitRimMat);
  pitRim.rotation.x = Math.PI / 2;
  pitRim.position.y = 0.02;
  scene.add(pitRim);

  // C. 4 KONZENTRISCHE AMPHITHEATER-STUFEN (r = 6.2 bis 9.5, ansteigend von y = 0.0 bis y = 1.0)
  const stepCount = 4;
  const innerR = 6.2;
  const outerR = 9.5;
  for (let i = 0; i < stepCount; i++) {
    const t = i / stepCount;
    const rCurrent = innerR + t * (outerR - innerR);
    const rNext = rCurrent + (outerR - innerR) / stepCount;
    const yStep = (i + 1) * 0.25; // 0.25, 0.50, 0.75, 1.00

    const ringGeo = new THREE_LIB.RingGeometry(rCurrent, rNext, 48);
    const ringMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0E1726,
      roughness: 0.45,
      metalness: 0.6,
      side: THREE_LIB.DoubleSide
    });
    const stepMesh = new THREE_LIB.Mesh(ringGeo, ringMat);
    stepMesh.rotation.x = -Math.PI / 2;
    stepMesh.position.y = yStep;
    stepMesh.receiveShadow = true;
    scene.add(stepMesh);

    // Cyan & Gold leuchtende Stufenkante
    const edgeCol = (i % 2 === 0) ? 0x00F0FF : 0xF59E0B;
    const edgeGeo = new THREE_LIB.TorusGeometry(rNext, 0.025, 6, 48);
    const edgeMat = new THREE_LIB.MeshBasicMaterial({ color: edgeCol });
    const edge = new THREE_LIB.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = yStep + 0.01;
    scene.add(edge);
  }

  // D. TRANSPARENTES CYAN-GLASGELÄNDER UM DEN INNENRING (Radius 6.2, Höhe 0.75 auf y = 0.0)
  const glassGeo = new THREE_LIB.CylinderGeometry(6.2, 6.2, 0.75, 48, 1, true);
  const glassMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.20,
    roughness: 0.1,
    transmission: 0.90,
    thickness: 0.15,
    side: THREE_LIB.DoubleSide
  });
  const glassRail = new THREE_LIB.Mesh(glassGeo, glassMat);
  glassRail.position.y = 0.375;
  scene.add(glassRail);

  // Metallener Handlauf oben auf dem Geländer
  const handrailGeo = new THREE_LIB.TorusGeometry(6.2, 0.035, 8, 48);
  const handrailMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xE2E8F0,
    metalness: 0.9,
    roughness: 0.2
  });
  const handrail = new THREE_LIB.Mesh(handrailGeo, handrailMat);
  handrail.rotation.x = Math.PI / 2;
  handrail.position.y = 0.75;
  scene.add(handrail);

  // E. SERVER-RACKS IM ZENTRUM DES INNENRINGS (Cluster hinter dem Holo-Projektor)
  setupServerRacksInCenterRing(THREE_LIB);
}

/**
 * 4 Server-Racks im Innenring (Radius ~ 1.8..2.2) mit animierten Status-LEDs
 */
function setupServerRacksInCenterRing(THREE_LIB) {
  const rackPositions = [
    { x: -1.8, z: -1.4, rot: 0.4 },
    { x: 1.8, z: -1.4, rot: -0.4 },
    { x: -2.3, z: 0.0, rot: Math.PI * 0.5 },
    { x: 2.3, z: 0.0, rot: -Math.PI * 0.5 }
  ];

  rackPositions.forEach(cfg => {
    const rackGroup = new THREE_LIB.Group();
    rackGroup.position.set(cfg.x, 0.0, cfg.z);
    rackGroup.rotation.y = cfg.rot;

    // Schrank-Gehäuse
    const housingGeo = new THREE_LIB.BoxGeometry(0.7, 1.4, 0.55);
    const housingMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0A0F1D,
      roughness: 0.3,
      metalness: 0.85
    });
    const housing = new THREE_LIB.Mesh(housingGeo, housingMat);
    housing.position.y = 0.7;
    housing.castShadow = true;
    rackGroup.add(housing);

    // Front mit Server-Slots
    const frontGeo = new THREE_LIB.PlaneGeometry(0.62, 1.3);
    const frontMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x050811,
      roughness: 0.2,
      map: serverScreenTexture || null
    });
    const front = new THREE_LIB.Mesh(frontGeo, frontMat);
    front.position.set(0, 0.7, 0.28);
    rackGroup.add(front);

    // Status-LEDs
    const ledCols = [0x00F0FF, 0x10B981, 0xF59E0B];
    for (let l = 0; l < 4; l++) {
      const ledGeo = new THREE_LIB.BoxGeometry(0.04, 0.03, 0.01);
      const ledMat = new THREE_LIB.MeshBasicMaterial({
        color: ledCols[l % ledCols.length],
        transparent: true,
        opacity: 0.8
      });
      const led = new THREE_LIB.Mesh(ledGeo, ledMat);
      led.position.set(-0.22 + l * 0.14, 1.25, 0.285);
      rackGroup.add(led);

      blinkingLeds.push({
        mesh: led,
        phase: Math.random() * Math.PI * 2,
        freq: 2 + Math.random() * 3
      });
    }

    scene.add(rackGroup);
  });
}

/**
 * 2. SCHWEBENDE 3D-HOLOGRAMM-FIGUR VON IRON MAN (J.A.R.V.I.S.) MIT BRUST-ARC-REACTOR
 */
function setupHolographicIronManFigure(THREE_LIB) {
  holoJarvisGroup = new THREE_LIB.Group();
  holoJarvisGroup.position.set(0, 2.8, 0);

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
    opacity: 0.7,
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
    opacity: 0.75,
    blending: THREE_LIB.AdditiveBlending
  });

  const coreGlowMat = new THREE_LIB.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.95
  });

  ironManFigureGroup = new THREE_LIB.Group();

  // A. HELM & KOPF (Stylische Iron-Man Maske mit Visier-Schlitz)
  const helmetGroup = new THREE_LIB.Group();
  helmetGroup.position.y = 1.15;

  const headGeo = new THREE_LIB.BoxGeometry(0.32, 0.38, 0.34);
  const headMesh = new THREE_LIB.Mesh(headGeo, armorMat);
  helmetGroup.add(headMesh);
  const headWire = new THREE_LIB.Mesh(headGeo, wireMat);
  helmetGroup.add(headWire);

  // Glowing Eye Visor
  const visorGeo = new THREE_LIB.BoxGeometry(0.24, 0.04, 0.06);
  const visorMesh = new THREE_LIB.Mesh(visorGeo, coreGlowMat);
  visorMesh.position.set(0, 0.02, 0.175);
  helmetGroup.add(visorMesh);

  // Stirn-Goldplatte
  const browGeo = new THREE_LIB.BoxGeometry(0.26, 0.08, 0.04);
  const browMesh = new THREE_LIB.Mesh(browGeo, goldAccentMat);
  browMesh.position.set(0, 0.12, 0.172);
  helmetGroup.add(browMesh);

  // Kinn
  const jawGeo = new THREE_LIB.ConeGeometry(0.18, 0.16, 4);
  const jawMesh = new THREE_LIB.Mesh(jawGeo, armorMat);
  jawMesh.rotation.x = Math.PI;
  jawMesh.position.set(0, -0.22, 0.05);
  helmetGroup.add(jawMesh);

  ironManFigureGroup.add(helmetGroup);

  // B. BRUSTKORB & TORSO
  const chestGroup = new THREE_LIB.Group();
  chestGroup.position.y = 0.65;

  const chestGeo = new THREE_LIB.BoxGeometry(0.58, 0.52, 0.36);
  const chestMesh = new THREE_LIB.Mesh(chestGeo, armorMat);
  chestGroup.add(chestMesh);
  const chestWire = new THREE_LIB.Mesh(chestGeo, wireMat);
  chestGroup.add(chestWire);

  // Goldene Brustplatten
  const pecGeo = new THREE_LIB.BoxGeometry(0.24, 0.22, 0.08);
  const pecLeft = new THREE_LIB.Mesh(pecGeo, goldAccentMat);
  pecLeft.position.set(-0.14, 0.1, 0.19);
  pecLeft.rotation.z = -0.1;
  chestGroup.add(pecLeft);
  const pecRight = new THREE_LIB.Mesh(pecGeo, goldAccentMat);
  pecRight.position.set(0.14, 0.1, 0.19);
  pecRight.rotation.z = 0.1;
  chestGroup.add(pecRight);

  // PULSIERENDER ARC-REACTOR IM BRUSTKORB
  const arcOuterGeo = new THREE_LIB.CylinderGeometry(0.09, 0.09, 0.04, 24);
  const arcOuterMesh = new THREE_LIB.Mesh(arcOuterGeo, goldAccentMat);
  arcOuterMesh.rotation.x = Math.PI / 2;
  arcOuterMesh.position.set(0, 0.08, 0.19);
  chestGroup.add(arcOuterMesh);

  const arcCoreGeo = new THREE_LIB.CylinderGeometry(0.065, 0.065, 0.05, 24);
  holoJarvisCore = new THREE_LIB.Mesh(arcCoreGeo, coreGlowMat);
  holoJarvisCore.rotation.x = Math.PI / 2;
  holoJarvisCore.position.set(0, 0.08, 0.20);
  holoJarvisCore.userData = {
    type: 'holo_jarvis',
    name: 'J.A.R.V.I.S. (Iron-Man Armor)',
    role: 'Central AI Engine & Voice Matrix',
    department: 'ZENTRALE'
  };
  chestGroup.add(holoJarvisCore);
  interactiveObjects.push(holoJarvisCore);

  ironManFigureGroup.add(chestGroup);

  // C. SCHULTERN & ARME MIT HAND-REPULSOREN
  const armSides = [-1, 1];
  armSides.forEach(side => {
    const shoulderGroup = new THREE_LIB.Group();
    shoulderGroup.position.set(side * 0.42, 0.85, 0.0);

    const pauldronGeo = new THREE_LIB.BoxGeometry(0.24, 0.18, 0.26);
    const pauldronMesh = new THREE_LIB.Mesh(pauldronGeo, goldAccentMat);
    pauldronMesh.rotation.z = side * 0.2;
    shoulderGroup.add(pauldronMesh);

    const upperArmGeo = new THREE_LIB.CylinderGeometry(0.08, 0.07, 0.38, 12);
    const upperArmMesh = new THREE_LIB.Mesh(upperArmGeo, armorMat);
    upperArmMesh.position.set(side * 0.06, -0.24, 0.0);
    upperArmMesh.rotation.z = side * 0.15;
    shoulderGroup.add(upperArmMesh);

    const forearmGeo = new THREE_LIB.CylinderGeometry(0.07, 0.06, 0.34, 12);
    const forearmMesh = new THREE_LIB.Mesh(forearmGeo, armorMat);
    forearmMesh.position.set(side * 0.12, -0.56, 0.06);
    forearmMesh.rotation.x = -0.2;
    shoulderGroup.add(forearmMesh);

    // Hand Repulsor
    const repulsorGeo = new THREE_LIB.CylinderGeometry(0.045, 0.045, 0.02, 16);
    const repulsor = new THREE_LIB.Mesh(repulsorGeo, coreGlowMat);
    repulsor.rotation.x = Math.PI / 2;
    repulsor.position.set(side * 0.14, -0.74, 0.12);
    shoulderGroup.add(repulsor);

    ironManFigureGroup.add(shoulderGroup);
  });

  // D. TAILLE & GÜRTEL
  const waistGroup = new THREE_LIB.Group();
  waistGroup.position.y = 0.28;
  const waistGeo = new THREE_LIB.BoxGeometry(0.42, 0.28, 0.3);
  const waistMesh = new THREE_LIB.Mesh(waistGeo, armorMat);
  waistGroup.add(waistMesh);
  ironManFigureGroup.add(waistGroup);

  // E. BEINE (Schwebende Flugpose)
  armSides.forEach(side => {
    const legGroup = new THREE_LIB.Group();
    legGroup.position.set(side * 0.18, 0.1, 0.0);

    const thighGeo = new THREE_LIB.CylinderGeometry(0.11, 0.09, 0.48, 12);
    const thighMesh = new THREE_LIB.Mesh(thighGeo, armorMat);
    thighMesh.position.set(0, -0.24, 0.02);
    thighMesh.rotation.x = 0.08;
    legGroup.add(thighMesh);

    const calfGeo = new THREE_LIB.CylinderGeometry(0.09, 0.075, 0.46, 12);
    const calfMesh = new THREE_LIB.Mesh(calfGeo, armorMat);
    calfMesh.position.set(0, -0.66, -0.04);
    calfMesh.rotation.x = -0.12;
    legGroup.add(calfMesh);

    const bootGeo = new THREE_LIB.BoxGeometry(0.14, 0.1, 0.24);
    const bootMesh = new THREE_LIB.Mesh(bootGeo, goldAccentMat);
    bootMesh.position.set(0, -0.92, 0.02);
    legGroup.add(bootMesh);

    // Sohlen-Thruster
    const thrusterGeo = new THREE_LIB.CylinderGeometry(0.04, 0.04, 0.02, 16);
    const thruster = new THREE_LIB.Mesh(thrusterGeo, coreGlowMat);
    thruster.position.set(0, -0.98, 0.02);
    legGroup.add(thruster);

    ironManFigureGroup.add(legGroup);
  });

  holoJarvisCoreGroup.add(ironManFigureGroup);

  // F. 2500 PARTIKEL-AURA (FIBONACCI SPHÄRE)
  const particleCount = 2500;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const radius = 1.95;
  const cyanCol = new THREE_LIB.Color(0x00F0FF);
  const whiteCol = new THREE_LIB.Color(0xFFFFFF);
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < particleCount; i++) {
    const y = 1 - (i / (particleCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    positions[i * 3] = Math.cos(theta) * radiusAtY * radius;
    positions[i * 3 + 1] = y * radius + 0.4;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;

    const mixed = cyanCol.clone().lerp(whiteCol, Math.random() * 0.4);
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  const pGeo = new THREE_LIB.BufferGeometry();
  pGeo.setAttribute('position', new THREE_LIB.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE_LIB.BufferAttribute(colors, 3));

  const pMat = new THREE_LIB.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false
  });
  holoJarvisPoints = new THREE_LIB.Points(pGeo, pMat);
  holoJarvisCoreGroup.add(holoJarvisPoints);

  // G. 3 GYROSKOPISCHE ORBITAL-SCANRINGE
  const ringParams = [
    { radius: 2.15, tube: 0.015, rotX: 0.8, rotY: 0.3, speed: 0.45 },
    { radius: 2.35, tube: 0.013, rotX: -0.6, rotY: 0.9, speed: -0.35 },
    { radius: 2.55, tube: 0.011, rotX: 0.3, rotY: -0.7, speed: 0.28 }
  ];

  holoJarvisRings = [];
  ringParams.forEach(p => {
    const rGeo = new THREE_LIB.TorusGeometry(p.radius, p.tube, 8, 64);
    const rMat = new THREE_LIB.MeshBasicMaterial({
      color: 0x00F0FF,
      transparent: true,
      opacity: 0.55,
      blending: THREE_LIB.AdditiveBlending
    });
    const ringMesh = new THREE_LIB.Mesh(rGeo, rMat);
    ringMesh.position.y = 0.4;
    ringMesh.rotation.x = p.rotX;
    ringMesh.rotation.y = p.rotY;
    ringMesh.userData = { speed: p.speed };
    holoJarvisCoreGroup.add(ringMesh);
    holoJarvisRings.push(ringMesh);
  });

  // H. AUDIO-REAKTIVES PUNKTLICHT
  holoJarvisLight = new THREE_LIB.PointLight(0x00F0FF, 3.5, 20, 1.2);
  holoJarvisLight.position.set(0, 0.65, 0.3);
  holoJarvisGroup.add(holoJarvisLight);

  // I. PROJEKTOR-RING AM BODEN
  const projRingGeo = new THREE_LIB.TorusGeometry(1.6, 0.04, 8, 48);
  const projRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const projRing = new THREE_LIB.Mesh(projRingGeo, projRingMat);
  projRing.rotation.x = Math.PI / 2;
  projRing.position.set(0, -2.75, 0);
  holoJarvisGroup.add(projRing);

  // Projektionsstrahl-Kegel
  const beamGeo = new THREE_LIB.CylinderGeometry(0.2, 1.6, 2.8, 24, 1, true);
  const beamMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.10,
    blending: THREE_LIB.AdditiveBlending,
    side: THREE_LIB.DoubleSide,
    depthWrite: false
  });
  const beam = new THREE_LIB.Mesh(beamGeo, beamMat);
  beam.position.y = -1.35;
  holoJarvisGroup.add(beam);

  scene.add(holoJarvisGroup);
}

/**
 * 3. ARBEITSPLÄTZE & ABTEILUNGEN: ALLE 33 AGENTEN RENDERN (1.5x SKALIERUNG)
 */
function setupArenaWorkstations(THREE_LIB, hierarchyData) {
  // Maps leeren
  Object.keys(agentMeshMap).forEach(k => delete agentMeshMap[k]);
  Object.keys(pcMeshMap).forEach(k => delete pcMeshMap[k]);
  Object.keys(chefMeshMap).forEach(k => delete chefMeshMap[k]);
  interactiveObjects.length = 0;

  // Interaktive Agenten-Meshes Liste für schnelles Raycasting leeren
  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = [];
  }

  // Holo-Jarvis Core wieder als interaktiv registrieren
  if (holoJarvisCore) interactiveObjects.push(holoJarvisCore);

  // 1. ZENTRALE: TREVOR (ag_01) am Holo-Kern
  setupTrevorCommandStation(THREE_LIB);

  // 2. INNENRING: UG_SERVER (Ilja ag_26 [LEAD] + 7 Spezialisten ag_27..ag_33) bei y = 0.0
  setupServerSector(THREE_LIB);

  // 3. GALERIE LINKS: EG_BACKEND (David ag_18 [LEAD] + 7 Spezialisten ag_19..ag_25) bei y = 1.0
  setupBackendSector(THREE_LIB);

  // 4. GALERIE HINTEN-RECHTS: EG_ARCHITEKTUR (Marcus ag_02 [LEAD] + 7 Spezialisten ag_03..ag_09) bei y = 1.0
  setupArchitectureSector(THREE_LIB);

  // 5. GALERIE VORNE-RECHTS: EG_FRONTEND (Daria ag_10 [LEAD] + 7 Spezialisten ag_11..ag_17) bei y = 1.0
  setupFrontendSector(THREE_LIB);

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

  // Command Desk (Gebogen, Slate & Gold)
  const deskGeo = new THREE_LIB.BoxGeometry(1.4, 0.58, 0.7);
  const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.35, metalness: 0.7 });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.29;
  trevorGroup.add(desk);

  // Ultrawide Curved Monitor
  const screenGeo = new THREE_LIB.BoxGeometry(0.88, 0.42, 0.035);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0F172A,
    emissive: 0x00F0FF,
    emissiveIntensity: 0.65,
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
    department: trevorAgent.department,
    deptCode: trevorAgent.deptCode,
    deptName: trevorAgent.deptName,
    status: 'Bereit',
    currentTask: null,
    idleThought: trevorAgent.idleThought || 'Koordiniere Studio-Ressourcen & überwache J.A.R.V.I.S.-Kern...',
    easy_explanation: trevorAgent.easy_explanation
  };
  screen.userData = trevorUserData;
  trevorGroup.add(screen);

  // Trevor Iron-Man Avatar mit Arc-Reactor
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, '#DC2626', true, true);
  avatar.position.set(0, 0.22, 0.48);
  avatar.userData = trevorUserData;
  trevorGroup.add(avatar);

  // Boden-Highlight-Ring
  const hlGeo = new THREE_LIB.TorusGeometry(0.85, 0.025, 8, 32);
  const hlMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.85 });
  const hlRing = new THREE_LIB.Mesh(hlGeo, hlMat);
  hlRing.rotation.x = Math.PI / 2;
  hlRing.position.y = 0.02;
  hlRing.visible = false;
  trevorGroup.add(hlRing);

  // Unsichtbare Zylinder-Hitbox für zuverlässiges Raycasting
  const hitboxGeo = new THREE_LIB.CylinderGeometry(0.8, 0.8, 2.0, 16);
  const hitboxMat = new THREE_LIB.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE_LIB.Mesh(hitboxGeo, hitboxMat);
  hitbox.position.y = 1.0;
  hitbox.userData = {
    ...trevorUserData,
    highlightRing: hlRing,
    headPos: new THREE_LIB.Vector3(0, 0.0 + 1.4 * 1.5, 2.4)
  };
  trevorGroup.add(hitbox);

  // Registrierung
  const mapEntry = {
    agent: trevorAgent,
    group: trevorGroup,
    mesh: screen,
    screen,
    screens: [screen],
    avatar,
    hitbox,
    isLead: true
  };
  agentMeshMap['ag_01'] = mapEntry;
  chefMeshMap['ag_01'] = mapEntry;
  chefMeshMap['trevor_core'] = mapEntry;

  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
    window.interactiveAgentMeshes.push(hitbox);
  }
  interactiveObjects.push(hitbox);
  interactiveObjects.push(screen);

  scene.add(trevorGroup);
}

/**
 * ABTEILUNG 4: UG_SERVER (Im offenen Innenring bei y = 0.0, r = 3.8..5.0)
 * Ilja [LEAD] (ag_26) + 7 Spezialisten (ag_27..ag_33)
 */
function setupServerSector(THREE_LIB) {
  const deptCode = 'UG_SERVER';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(0, 0.0, 0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('UG_SERVER', '#F59E0B');
  hudSprite.position.set(0, 1.8, -4.8);
  sectorGroup.add(hudSprite);
  deptHudSprites[12] = hudSprite;

  // Ilja [LEAD] (ag_26) am Lead-Desk im Innenring
  const ilja = AGENT_ROSTER_BY_ID['ag_26'];
  const leadDesk = createLeadWorkstation(THREE_LIB, ilja, '#F59E0B', new THREE_LIB.Vector3(0, 0.0, -4.5));
  leadDesk.lookAt(0, 0.0, 0);
  sectorGroup.add(leadDesk);

  // 7 Spezialisten (ag_27..ag_33) im Halbkreis des Innenrings
  const serverSpecialists = [
    { spec: AGENT_ROSTER_BY_ID['ag_27'], pos: new THREE_LIB.Vector3(-2.8, 0.0, -3.8) }, // Milan
    { spec: AGENT_ROSTER_BY_ID['ag_28'], pos: new THREE_LIB.Vector3(2.8, 0.0, -3.8) },  // Freya
    { spec: AGENT_ROSTER_BY_ID['ag_29'], pos: new THREE_LIB.Vector3(-4.5, 0.0, -1.8) }, // Anton
    { spec: AGENT_ROSTER_BY_ID['ag_30'], pos: new THREE_LIB.Vector3(4.5, 0.0, -1.8) },  // Kian
    { spec: AGENT_ROSTER_BY_ID['ag_31'], pos: new THREE_LIB.Vector3(-4.8, 0.0, 0.8) },  // Nora
    { spec: AGENT_ROSTER_BY_ID['ag_32'], pos: new THREE_LIB.Vector3(4.8, 0.0, 0.8) },   // Rico
    { spec: AGENT_ROSTER_BY_ID['ag_33'], pos: new THREE_LIB.Vector3(-3.2, 0.0, 3.2) }   // Yuna
  ];

  serverSpecialists.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#F59E0B', item.pos);
    ws.lookAt(0, 0.0, 0);
    sectorGroup.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(0, 0.2, -4.5), new THREE_LIB.Vector3(0, 2.8, 0), '#F59E0B');
  scene.add(sectorGroup);
}

/**
 * ABTEILUNG 3: EG_BACKEND (Äußere Galerie Links / West bei y = 1.0)
 * David [LEAD] (ag_18) + 7 Spezialisten (ag_19..ag_25)
 */
function setupBackendSector(THREE_LIB) {
  const deptCode = 'EG_BACKEND';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(-11.5, 1.0, 0.0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('EG_BACKEND', '#10B981');
  hudSprite.position.set(0, 1.8, 0);
  sectorGroup.add(hudSprite);
  deptHudSprites[5] = hudSprite;

  // David [LEAD] (ag_18)
  const david = AGENT_ROSTER_BY_ID['ag_18'];
  const leadDesk = createLeadWorkstation(THREE_LIB, david, '#10B981', new THREE_LIB.Vector3(1.3, 0.0, 0.0));
  leadDesk.lookAt(0, 1.0, 0);
  sectorGroup.add(leadDesk);

  // 7 Spezialisten im Bogen dahinter
  const beSpecialists = [
    { spec: AGENT_ROSTER_BY_ID['ag_19'], pos: new THREE_LIB.Vector3(-0.3, 0.0, -3.6) }, // Sarah
    { spec: AGENT_ROSTER_BY_ID['ag_20'], pos: new THREE_LIB.Vector3(-0.9, 0.0, -2.4) }, // Malik
    { spec: AGENT_ROSTER_BY_ID['ag_21'], pos: new THREE_LIB.Vector3(-1.3, 0.0, -1.2) }, // Jonas
    { spec: AGENT_ROSTER_BY_ID['ag_22'], pos: new THREE_LIB.Vector3(-1.5, 0.0, 0.0) },  // Kiara
    { spec: AGENT_ROSTER_BY_ID['ag_23'], pos: new THREE_LIB.Vector3(-1.3, 0.0, 1.2) },  // Tarek
    { spec: AGENT_ROSTER_BY_ID['ag_24'], pos: new THREE_LIB.Vector3(-0.9, 0.0, 2.4) },  // Hannah
    { spec: AGENT_ROSTER_BY_ID['ag_25'], pos: new THREE_LIB.Vector3(-0.3, 0.0, 3.6) }   // Tim
  ];

  beSpecialists.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#10B981', item.pos);
    ws.lookAt(0, 1.0, 0);
    sectorGroup.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-11.5, 1.2, 0.0), new THREE_LIB.Vector3(0, 2.8, 0), '#10B981');
  scene.add(sectorGroup);
}

/**
 * ABTEILUNG 1: EG_ARCHITEKTUR (Äußere Galerie Hinten-Rechts / Nord-Ost bei y = 1.0)
 * Marcus [LEAD] (ag_02) + 7 Spezialisten (ag_03..ag_09)
 */
function setupArchitectureSector(THREE_LIB) {
  const deptCode = 'EG_ARCHITEKTUR';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(9.5, 1.0, -9.0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('EG_ARCHITEKTUR', '#3B82F6');
  hudSprite.position.set(0, 1.8, 0);
  sectorGroup.add(hudSprite);
  deptHudSprites[2] = hudSprite;

  // Marcus [LEAD] (ag_02)
  const marcus = AGENT_ROSTER_BY_ID['ag_02'];
  const leadDesk = createLeadWorkstation(THREE_LIB, marcus, '#3B82F6', new THREE_LIB.Vector3(-1.3, 0.0, 1.5));
  leadDesk.lookAt(0, 1.0, 0);
  sectorGroup.add(leadDesk);

  // 7 Spezialisten im Bogen dahinter
  const archSpecialists = [
    { spec: AGENT_ROSTER_BY_ID['ag_03'], pos: new THREE_LIB.Vector3(-2.7, 0.0, -1.5) }, // Elena
    { spec: AGENT_ROSTER_BY_ID['ag_04'], pos: new THREE_LIB.Vector3(-1.3, 0.0, -2.4) }, // Viktor
    { spec: AGENT_ROSTER_BY_ID['ag_05'], pos: new THREE_LIB.Vector3(0.3, 0.0, -3.0) },  // Svenja
    { spec: AGENT_ROSTER_BY_ID['ag_06'], pos: new THREE_LIB.Vector3(1.9, 0.0, -2.8) },  // Lukas
    { spec: AGENT_ROSTER_BY_ID['ag_07'], pos: new THREE_LIB.Vector3(3.3, 0.0, -1.8) },  // Nadia
    { spec: AGENT_ROSTER_BY_ID['ag_08'], pos: new THREE_LIB.Vector3(4.1, 0.0, -0.2) },  // Henrik
    { spec: AGENT_ROSTER_BY_ID['ag_09'], pos: new THREE_LIB.Vector3(4.3, 0.0, 1.6) }    // Clara
  ];

  archSpecialists.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#3B82F6', item.pos);
    ws.lookAt(0, 1.0, 0);
    sectorGroup.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(9.5, 1.2, -9.0), new THREE_LIB.Vector3(0, 2.8, 0), '#3B82F6');
  scene.add(sectorGroup);
}

/**
 * ABTEILUNG 2: EG_FRONTEND (Äußere Galerie Vorne-Rechts / Süd-Ost bei y = 1.0)
 * Daria [LEAD] (ag_10) + 7 Spezialisten (ag_11..ag_17)
 */
function setupFrontendSector(THREE_LIB) {
  const deptCode = 'EG_FRONTEND';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(10.5, 1.0, 7.0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('EG_FRONTEND', '#00F0FF');
  hudSprite.position.set(0, 1.8, 0);
  sectorGroup.add(hudSprite);
  deptHudSprites[3] = hudSprite;

  // Daria [LEAD] (ag_10)
  const daria = AGENT_ROSTER_BY_ID['ag_10'];
  const leadDesk = createLeadWorkstation(THREE_LIB, daria, '#00F0FF', new THREE_LIB.Vector3(-2.0, 0.0, -1.5));
  leadDesk.lookAt(0, 1.0, 0);
  sectorGroup.add(leadDesk);

  // 7 Spezialisten im Bogen dahinter
  const feSpecialists = [
    { spec: AGENT_ROSTER_BY_ID['ag_11'], pos: new THREE_LIB.Vector3(3.3, 0.0, -1.6) }, // Liam
    { spec: AGENT_ROSTER_BY_ID['ag_12'], pos: new THREE_LIB.Vector3(3.1, 0.0, 0.2) },  // Maya
    { spec: AGENT_ROSTER_BY_ID['ag_13'], pos: new THREE_LIB.Vector3(2.3, 0.0, 1.8) },  // Noah
    { spec: AGENT_ROSTER_BY_ID['ag_14'], pos: new THREE_LIB.Vector3(0.9, 0.0, 3.2) },  // Zoe
    { spec: AGENT_ROSTER_BY_ID['ag_15'], pos: new THREE_LIB.Vector3(-0.7, 0.0, 4.2) }, // Finn
    { spec: AGENT_ROSTER_BY_ID['ag_16'], pos: new THREE_LIB.Vector3(-2.3, 0.0, 4.6) }, // Lea
    { spec: AGENT_ROSTER_BY_ID['ag_17'], pos: new THREE_LIB.Vector3(-3.9, 0.0, 4.2) }  // Ben
  ];

  feSpecialists.forEach(item => {
    const ws = createSpecialistWorkstation(THREE_LIB, item.spec, '#00F0FF', item.pos);
    ws.lookAt(0, 1.0, 0);
    sectorGroup.add(ws);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(10.5, 1.2, 7.0), new THREE_LIB.Vector3(0, 2.8, 0), '#00F0FF');
  scene.add(sectorGroup);
}

/**
 * Erzeugt den Arbeitsplatz eines Abteilungsleiters ([LEAD])
 * Skaliert auf 1.5x, visible = true, registriert in window.interactiveAgentMeshes
 */
function createLeadWorkstation(THREE_LIB, agent, colorHex, position) {
  const group = new THREE_LIB.Group();
  group.position.copy(position);
  group.scale.set(1.5, 1.5, 1.5);
  group.visible = true;

  // Größerer Schreibtisch
  const deskGeo = new THREE_LIB.BoxGeometry(1.2, 0.55, 0.6);
  const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.4, metalness: 0.6 });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.28;
  group.add(desk);

  // Curved Widescreen
  const screenGeo = new THREE_LIB.BoxGeometry(0.72, 0.36, 0.03);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0F172A,
    emissive: parseInt(colorHex.replace('#', '0x'), 16),
    emissiveIntensity: 0.5,
    roughness: 0.2,
    map: serverScreenTexture || null
  });
  const screen = new THREE_LIB.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.72, 0.06);

  const userData = {
    type: 'chef',
    agentId: agent.id,
    chefId: agent.id,
    isLead: true,
    name: agent.name,
    role: agent.role,
    department: agent.department,
    deptCode: agent.deptCode,
    deptName: agent.deptName,
    status: 'Bereit',
    currentTask: null,
    idleThought: agent.idleThought || 'Auditiere Abteilungsstandards...',
    easy_explanation: agent.easy_explanation
  };
  screen.userData = userData;
  group.add(screen);

  // Lead-Avatar mit Gold/Cyan-Schulterring
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, colorHex, true, false);
  avatar.position.set(0, 0.18, 0.42);
  avatar.userData = userData;
  group.add(avatar);

  // Boden-Highlight-Ring
  const hlGeo = new THREE_LIB.TorusGeometry(0.75, 0.025, 8, 32);
  const hlMat = new THREE_LIB.MeshBasicMaterial({
    color: parseInt(colorHex.replace('#', '0x'), 16),
    transparent: true,
    opacity: 0.85
  });
  const hlRing = new THREE_LIB.Mesh(hlGeo, hlMat);
  hlRing.rotation.x = Math.PI / 2;
  hlRing.position.y = 0.02;
  hlRing.visible = false;
  group.add(hlRing);

  // Zylinder-Hitbox für schnelles und exaktes Raycasting
  const hitboxGeo = new THREE_LIB.CylinderGeometry(0.75, 0.75, 1.8, 16);
  const hitboxMat = new THREE_LIB.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE_LIB.Mesh(hitboxGeo, hitboxMat);
  hitbox.position.y = 0.9;
  hitbox.userData = {
    ...userData,
    highlightRing: hlRing,
    headPos: new THREE_LIB.Vector3(position.x, position.y + 1.4 * 1.5, position.z)
  };
  group.add(hitbox);

  const entry = {
    agent,
    group,
    mesh: screen,
    screen,
    screens: [screen],
    avatar,
    hitbox,
    isLead: true
  };
  agentMeshMap[agent.id] = entry;
  chefMeshMap[agent.id] = entry;

  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
    window.interactiveAgentMeshes.push(hitbox);
  }
  interactiveObjects.push(hitbox);
  interactiveObjects.push(screen);

  return group;
}

/**
 * Erzeugt den Arbeitsplatz eines Fach-Spezialisten
 * Skaliert auf 1.5x, visible = true, registriert in window.interactiveAgentMeshes
 */
function createSpecialistWorkstation(THREE_LIB, agent, colorHex, position, rotY = 0) {
  const group = new THREE_LIB.Group();
  group.position.copy(position);
  group.rotation.y = rotY;
  group.scale.set(1.5, 1.5, 1.5);
  group.visible = true;

  // Schreibtisch
  const deskGeo = new THREE_LIB.BoxGeometry(0.85, 0.52, 0.45);
  const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.26;
  group.add(desk);

  // Dual-Monitore mit Code
  const screenGeo = new THREE_LIB.BoxGeometry(0.36, 0.25, 0.025);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0F172A,
    emissive: parseInt(colorHex.replace('#', '0x'), 16),
    emissiveIntensity: 0.45,
    map: codeScreenTexture || null
  });

  const userData = {
    type: 'pc',
    agentId: agent.id,
    pcId: agent.id,
    isLead: false,
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

  const screenLeft = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
  screenLeft.position.set(-0.2, 0.64, 0.03);
  screenLeft.rotation.y = 0.12;
  screenLeft.userData = userData;
  group.add(screenLeft);

  const screenRight = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
  screenRight.position.set(0.2, 0.64, 0.03);
  screenRight.rotation.y = -0.12;
  screenRight.userData = userData;
  group.add(screenRight);

  // Avatar
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, colorHex, false, false);
  avatar.position.set(0, 0.16, 0.35);
  avatar.userData = userData;
  group.add(avatar);
  developerAvatars.push(avatar);

  // Boden-Highlight-Ring
  const hlGeo = new THREE_LIB.TorusGeometry(0.65, 0.02, 8, 32);
  const hlMat = new THREE_LIB.MeshBasicMaterial({
    color: parseInt(colorHex.replace('#', '0x'), 16),
    transparent: true,
    opacity: 0.8
  });
  const hlRing = new THREE_LIB.Mesh(hlGeo, hlMat);
  hlRing.rotation.x = Math.PI / 2;
  hlRing.position.y = 0.02;
  hlRing.visible = false;
  group.add(hlRing);

  // Zylinder-Hitbox für schnelles und exaktes Raycasting
  const hitboxGeo = new THREE_LIB.CylinderGeometry(0.65, 0.65, 1.8, 16);
  const hitboxMat = new THREE_LIB.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE_LIB.Mesh(hitboxGeo, hitboxMat);
  hitbox.position.y = 0.9;
  hitbox.userData = {
    ...userData,
    highlightRing: hlRing,
    headPos: new THREE_LIB.Vector3(position.x, position.y + 1.35 * 1.5, position.z)
  };
  group.add(hitbox);

  const entry = {
    agent,
    group,
    mesh: screenLeft,
    screenLeft,
    screenRight,
    screens: [screenLeft, screenRight],
    avatar,
    hitbox,
    isLead: false
  };
  agentMeshMap[agent.id] = entry;
  pcMeshMap[agent.id] = entry;

  if (typeof window !== 'undefined') {
    window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
    window.interactiveAgentMeshes.push(hitbox);
  }
  interactiveObjects.push(hitbox);
  interactiveObjects.push(screenLeft);
  interactiveObjects.push(screenRight);

  return group;
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

  // BESONDERHEIT FÜR ABTEILUNGSLEITER: GOLD/CYAN SCHULTERRING ([LEAD])
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

  // BESONDERHEIT FÜR TREVOR: ARC-REACTOR IM BRUSTKORB
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
  const points = curve.getPoints(32);
  const geo = new THREE_LIB.BufferGeometry().setFromPoints(points);
  const mat = new THREE_LIB.LineBasicMaterial({
    color: parseInt(colorHex.replace('#', '0x'), 16),
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
 * 4. RAYCASTING, HOVER-SPRECHBLASE (#agent-hover-speech-bubble) & KLICK-INTERAKTION
 */
function setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick) {
  const raycaster = new THREE_LIB.Raycaster();
  const mouse = new THREE_LIB.Vector2();

  // A. POINTERMOVE: 3D-TO-2D PROJEKTION FÜR DIE HOVER-SPRECHBLASE
  renderer.domElement.addEventListener('pointermove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Priorisiere Suche in window.interactiveAgentMeshes
    const targets = (window.interactiveAgentMeshes && window.interactiveAgentMeshes.length > 0)
      ? window.interactiveAgentMeshes
      : interactiveObjects;

    const intersects = raycaster.intersectObjects(targets, true);
    const speechBubble = document.getElementById('agent-hover-speech-bubble');

    if (intersects.length > 0) {
      // Finde Zielobjekt mit agentId
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

        // Vorherigen Ring abblenden falls gewechselt
        if (activeHighlightedHitbox && activeHighlightedHitbox !== hit && activeHighlightedHitbox.userData.highlightRing) {
          activeHighlightedHitbox.userData.highlightRing.visible = false;
        }

        // Bodenring hervorheben
        if (data.highlightRing) {
          data.highlightRing.visible = true;
          activeHighlightedHitbox = hit;
        }

        // Sprechblase aktualisieren und positionieren
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
              actEl.textContent = `Ich prüfe gerade die API-Endpunkte und Datenbank-Abfragen für deinen Auftrag: ${currentTask}`;
            } else {
              actEl.textContent = agent.idleThought || 'Überwache Subnetz-Routing & Latenzzeiten...';
            }
          }

          // 3D-zu-2D Bildschirmkoordinaten-Projektion (über dem Kopf des Agenten)
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

    // Kein Agent getroffen
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

  // B. KLICK-INTERAKTION
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
        zoomToPosition(worldPos, 6.0);

        if (typeof onAgentClick === 'function') {
          onAgentClick(agentId, agent.isLead ? 'chef' : 'pc', agent.deptCode || data.deptId);
        }
      } else if (data.type === 'holo_jarvis' && typeof onTrevorClick === 'function') {
        onTrevorClick();
        zoomToPosition(new THREE_LIB.Vector3(0, 2.8, 0), 8.5);
      } else if (data.type === 'department') {
        zoomToPosition(hit.getWorldPosition(new THREE_LIB.Vector3()), 11);
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
 * KAMERA PRESETS (v10.0 Standard: arena = 0, 15, 19 -> 0, 1.0, 0)
 */
export function setCameraPreset(presetName) {
  const THREE = getTHREE();
  if (!THREE || !camera || !controls) return;

  autoRotateActive = false;
  controls.autoRotate = false;

  switch (presetName) {
    case 'arena': // Gesamt-Arena Überblick
      targetCameraPos = new THREE.Vector3(0, 15, 19);
      targetLookAt = new THREE.Vector3(0, 1.0, 0);
      currentFloor = 'EG';
      break;

    case 'jarvis': // Zentrum / Holo Iron-Man & Trevor Nahansicht
      targetCameraPos = new THREE.Vector3(0, 4.0, 6.5);
      targetLookAt = new THREE.Vector3(0, 2.0, 0);
      break;

    case 'eg': // Äußere Galerie
      targetCameraPos = new THREE.Vector3(0, 13, 18);
      targetLookAt = new THREE.Vector3(0, 1.0, 0);
      currentFloor = 'EG';
      break;

    case 'ug': // Innenring UG_SERVER
      targetCameraPos = new THREE.Vector3(0, 7.0, 8.5);
      targetLookAt = new THREE.Vector3(0, 0.0, 0);
      currentFloor = 'UG';
      break;

    case 'autorotate': // Drehung an/aus
      autoRotateActive = !autoRotateActive;
      controls.autoRotate = autoRotateActive;
      controls.autoRotateSpeed = 0.8;
      console.log(`[Studio 3D] Auto-Rotation: ${autoRotateActive}`);
      return;

    default:
      targetCameraPos = new THREE.Vector3(0, 15, 19);
      targetLookAt = new THREE.Vector3(0, 1.0, 0);
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
  const THREE = getTHREE();
  if (!THREE) return;

  const id = Number(deptId);
  if (id === 2 || id === 1) { // EG_ARCHITEKTUR
    zoomToPosition(new THREE.Vector3(9.5, 1.0, -9.0), 9);
  } else if (id === 3 || id === 4) { // EG_FRONTEND
    zoomToPosition(new THREE.Vector3(10.5, 1.0, 7.0), 9);
  } else if (id === 5) { // EG_BACKEND
    zoomToPosition(new THREE.Vector3(-11.5, 1.0, 0.0), 9);
  } else if (id === 12 || id === 11) { // UG_SERVER
    zoomToPosition(new THREE.Vector3(0.0, 0.0, -2.0), 8);
  } else {
    const sprite = deptHudSprites[deptId];
    if (sprite) {
      const pos = sprite.getWorldPosition(new THREE.Vector3());
      zoomToPosition(pos, 9);
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
    zoomToPosition(new THREE.Vector3(0, 0.4, 2.4), 5.5);
    return;
  }

  const entry = agentMeshMap[agentId] || pcMeshMap[agentId] || chefMeshMap[agentId];
  if (entry) {
    const targetMesh = entry.hitbox || entry.mesh || entry.screen || entry.screenLeft || entry.avatar;
    if (targetMesh) {
      const worldPos = targetMesh.getWorldPosition(new THREE.Vector3());
      zoomToPosition(worldPos, 5.5);
      return;
    }
  }

  // Suche nach Name falls Name übergeben wurde
  const found = TREVOR_AGENT_ROSTER.find(a => a.name.toLowerCase() === String(agentId).toLowerCase());
  if (found && found.id !== agentId) {
    focusAgentIn3D(found.id);
  }
}

/**
 * 5. FLÜSSIGE 60-FPS ANIMATIONS-LOOP MIT THREE.Clock
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;
  const elapsed = clock ? clock.getElapsedTime() : performance.now() * 0.001;

  // A. HOLO IRON-MAN & J.A.R.V.I.S. DYNAMISCHE ANIMATIONEN
  if (holoJarvisCoreGroup) {
    // Sanftes Schweben (Levitation)
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
      holoJarvisLight.intensity = isSpeaking ? 5.0 + Math.sin(elapsed * 8.0) * 1.8 : 3.0 + pulseBase * 0.5;
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
