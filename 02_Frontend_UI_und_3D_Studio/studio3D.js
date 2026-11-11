/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * V7.0: KONZENTRISCHE TERRASSEN-ARENA MIT ALLEN 33 AGENTEN & HOLO-JARVIS
 * - 45°-Isometrie-Kamera mit freier Sicht auf alle 33 Arbeitsplätze (0, 22, 28)
 * - Zentrum: Holo-JARVIS (x:0, y:2.2, z:0) & Trevor Core Command Station (ag_01)
 * - UG Server-Grube (y=-2.0, r=4.2): Ilja [LEAD] (ag_26) + 7 UG_SERVER-Spezialisten
 * - EG Nord-West (y=0.0): Marcus [LEAD] (ag_02) + 7 EG_ARCHITEKTUR-Spezialisten
 * - EG Nord-Ost (y=0.0): Daria [LEAD] (ag_10) + 7 EG_FRONTEND-Spezialisten
 * - EG Süd (y=0.0): David [LEAD] (ag_18) + 7 EG_BACKEND-Spezialisten
 * - Abteilungsleiter mit dezentem Gold/Cyan-Schulterring ([LEAD])
 * - Raycaster Hover: Kompaktes schwebendes Mini-Badge: Name – Rolle (Abteilung) | Status
 * - Raycaster Klick & focusAgentIn3D(agentId): Sanfter Kamera-Zoom auf jeden Agenten
 * - 60-FPS Delta-Loop via THREE.Clock & sanftes Damping
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

// Holo-JARVIS Objekte
let holoJarvisGroup = null;
let holoJarvisCoreGroup = null;
let holoJarvisPoints = null;
let holoJarvisWireframe = null;
let holoJarvisRings = [];
let holoJarvisCore = null;
let holoJarvisLight = null;

// Hover Mini-Badge
let hoverBadgeEl = null;

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
 * Schlichtes, kleines HUD-Label (192x48 px mit 1px dezentem Rahmen)
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
  ctx.font = 'bold 16px "Inter", "Segoe UI", sans-serif';
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
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}

/**
 * Liefert oder erzeugt das HTML-Overlay für das Hover-Mini-Badge
 */
function getHoverBadgeEl() {
  if (!hoverBadgeEl && typeof document !== 'undefined') {
    hoverBadgeEl = document.getElementById('studio3d-hover-badge');
    if (!hoverBadgeEl) {
      hoverBadgeEl = document.createElement('div');
      hoverBadgeEl.id = 'studio3d-hover-badge';
      hoverBadgeEl.style.cssText = `
        position: fixed;
        display: none;
        pointer-events: none;
        z-index: 9990;
        background: rgba(14, 23, 38, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid #00F0FF;
        border-radius: 6px;
        padding: 5px 11px;
        box-shadow: 0 4px 18px rgba(0, 240, 255, 0.32);
        font-family: 'Inter', system-ui, sans-serif;
        color: #F8FAFC;
        font-size: 11px;
        white-space: nowrap;
        transform: translate(-50%, -125%);
        transition: opacity 0.12s ease;
      `;
      document.body.appendChild(hoverBadgeEl);
    }
  }
  return hoverBadgeEl;
}

/**
 * HAUPTINITIALISIERUNG DES 3D-STUDIOS
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
  scene.fog = new THREE_LIB.FogExp2(0x0B101B, 0.016);

  const aspect = containerEl.clientWidth / (containerEl.clientHeight || 1);
  camera = new THREE_LIB.PerspectiveCamera(45, aspect, 0.1, 200);

  // 45°-Isometrie-Überblick: Standard-Kameraposition
  camera.position.set(0, 22, 28);
  camera.lookAt(0, -1, 0);

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
    controls.minDistance = 6;
    controls.maxDistance = 80;
    controls.target.set(0, -1, 0);
  }

  // 4. BELEUCHTUNG
  setupLighting(THREE_LIB);

  // 5. KONZENTRISCHE TERRASSEN-ARENA (Server-Grube y=-2.0, Stufenringe r=7..12, Hauptring y=0.0)
  setupConcentricTerraceArena(THREE_LIB);

  // 6. HOCHWERTIGER HOLO-JARVIS IM ZENTRUM (x: 0, y: 2.2, z: 0)
  setupHighResHoloJarvis(THREE_LIB);

  // 7. ARBEITSPLÄTZE & ABTEILUNGEN: ALLE 33 AGENTEN RENDERN
  setupArenaWorkstations(THREE_LIB, hierarchyDataParam || STUDIO_HIERARCHY);

  // 8. RAYCASTING & KLICK-INTERAKTION + HOVER-MINI-BADGE
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
  console.log('[Studio 3D] Rebuild v7.0 abgeschlossen: 33 Agenten in Terrassen-Arena & Holo-JARVIS online!');
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
  keyLight.position.set(15, 30, 20);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const fillLight = new THREE_LIB.DirectionalLight(0x00F0FF, 0.65);
  fillLight.position.set(-20, 18, -15);
  scene.add(fillLight);
}

/**
 * 1. KONZENTRISCHE TERRASSEN-ARENA (AMPHITHEATER)
 */
function setupConcentricTerraceArena(THREE_LIB) {
  // A. EBENE GRUNDFLÄCHE DES ERDGESCHOSSES (Radius 24, flach auf y = 0.0)
  const egFloorGeo = new THREE_LIB.CylinderGeometry(24, 24, 0.2, 64);
  const egFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0B101B,
    roughness: 0.6,
    metalness: 0.5
  });
  const egFloor = new THREE_LIB.Mesh(egFloorGeo, egFloorMat);
  egFloor.position.y = -0.1;
  egFloor.receiveShadow = true;
  scene.add(egFloor);

  // Äußerer feiner Neon-Lichtring (r = 23.5)
  const outerRingGeo = new THREE_LIB.TorusGeometry(23.5, 0.04, 8, 64);
  const outerRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
  const outerRing = new THREE_LIB.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 0.02;
  scene.add(outerRing);

  // B. ZENTRALE TIEFERGELEGTE SERVER-GRUBE (Radius 6.5, Tiefe y = -2.0)
  const pitFloorGeo = new THREE_LIB.CylinderGeometry(6.6, 6.6, 0.2, 48);
  const pitFloorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x070B14,
    roughness: 0.35,
    metalness: 0.8
  });
  const pitFloor = new THREE_LIB.Mesh(pitFloorGeo, pitFloorMat);
  pitFloor.position.y = -2.1;
  pitFloor.receiveShadow = true;
  scene.add(pitFloor);

  // C. 4 KONZENTRISCHE STUFENRINGE (r = 6.8 bis 12.8, Stufenhöhe 0.5)
  const stepCount = 4;
  const innerR = 6.8;
  const outerR = 12.8;
  for (let i = 0; i < stepCount; i++) {
    const t = i / stepCount;
    const rCurrent = innerR + t * (outerR - innerR);
    const rNext = rCurrent + (outerR - innerR) / stepCount;
    const yStep = -2.0 + t * 2.0;

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

    // Feine leuchtende Stufenkante
    const edgeGeo = new THREE_LIB.TorusGeometry(rNext, 0.02, 6, 48);
    const edgeMat = new THREE_LIB.MeshBasicMaterial({ color: 0x00F0FF });
    const edge = new THREE_LIB.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = yStep + 0.01;
    scene.add(edge);
  }

  // D. TRANSPARENTES CYAN-GLASGELÄNDER UM DIE GRUBE (Radius 6.8, Höhe 0.9)
  const glassGeo = new THREE_LIB.CylinderGeometry(6.8, 6.8, 0.9, 48, 1, true);
  const glassMat = new THREE_LIB.MeshPhysicalMaterial({
    color: 0x00F0FF,
    transparent: true,
    opacity: 0.28,
    roughness: 0.1,
    transmission: 0.85,
    thickness: 0.2,
    side: THREE_LIB.DoubleSide
  });
  const glassRail = new THREE_LIB.Mesh(glassGeo, glassMat);
  glassRail.position.y = 0.45;
  scene.add(glassRail);

  // Metallener Handlauf oben auf dem Geländer
  const handrailGeo = new THREE_LIB.TorusGeometry(6.8, 0.035, 8, 48);
  const handrailMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xE2E8F0,
    metalness: 0.9,
    roughness: 0.2
  });
  const handrail = new THREE_LIB.Mesh(handrailGeo, handrailMat);
  handrail.rotation.x = Math.PI / 2;
  handrail.position.y = 0.9;
  scene.add(handrail);

  // E. SERVER-RACKS IN DER TIEFERGELEGTEN GRUBE
  setupServerRacksInPit(THREE_LIB);
}

/**
 * 6 Server-Racks im inneren Ring der Grube mit animierten LED-Arrays
 */
function setupServerRacksInPit(THREE_LIB) {
  const rackCount = 6;
  const rackRadius = 5.2;

  for (let i = 0; i < rackCount; i++) {
    const angle = (i / rackCount) * Math.PI * 2;
    const rx = Math.sin(angle) * rackRadius;
    const rz = Math.cos(angle) * rackRadius;

    const rackGroup = new THREE_LIB.Group();
    rackGroup.position.set(rx, -2.0, rz);
    rackGroup.lookAt(0, -2.0, 0);

    // Schrank-Gehäuse
    const housingGeo = new THREE_LIB.BoxGeometry(0.7, 1.5, 0.6);
    const housingMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0A0F1D,
      roughness: 0.3,
      metalness: 0.85
    });
    const housing = new THREE_LIB.Mesh(housingGeo, housingMat);
    housing.position.y = 0.75;
    housing.castShadow = true;
    rackGroup.add(housing);

    // Front-Gitter mit Server-Einschüben
    const frontGeo = new THREE_LIB.PlaneGeometry(0.62, 1.4);
    const frontMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x050811,
      roughness: 0.2,
      map: serverScreenTexture || null
    });
    const front = new THREE_LIB.Mesh(frontGeo, frontMat);
    front.position.set(0, 0.75, 0.305);
    rackGroup.add(front);

    // Animierte Status-LEDs
    const ledCols = [0x00F0FF, 0x10B981, 0xF59E0B];
    for (let l = 0; l < 4; l++) {
      const ledGeo = new THREE_LIB.BoxGeometry(0.04, 0.03, 0.01);
      const ledMat = new THREE_LIB.MeshBasicMaterial({
        color: ledCols[l % ledCols.length],
        transparent: true,
        opacity: 0.8
      });
      const led = new THREE_LIB.Mesh(ledGeo, ledMat);
      led.position.set(-0.24 + l * 0.16, 1.35, 0.31);
      rackGroup.add(led);

      blinkingLeds.push({
        mesh: led,
        phase: Math.random() * Math.PI * 2,
        freq: 2 + Math.random() * 3
      });
    }

    scene.add(rackGroup);
  }
}

/**
 * 2. HOCHWERTIGER HOLO-JARVIS IM ZENTRUM (x: 0, y: 2.2, z: 0)
 */
function setupHighResHoloJarvis(THREE_LIB) {
  holoJarvisGroup = new THREE_LIB.Group();
  holoJarvisGroup.position.set(0, 2.2, 0);

  holoJarvisCoreGroup = new THREE_LIB.Group();
  holoJarvisGroup.add(holoJarvisCoreGroup);

  // A. 2500 PARTIKEL MIT FIBONACCI-VERTEILUNG AUF DER SPHÄRE
  const particleCount = 2500;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const radius = 1.35;

  const cyanCol = new THREE_LIB.Color(0x00F0FF);
  const whiteCol = new THREE_LIB.Color(0xFFFFFF);

  const phi = Math.PI * (3 - Math.sqrt(5)); // Goldener Schnitt
  for (let i = 0; i < particleCount; i++) {
    const y = 1 - (i / (particleCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    positions[i * 3] = Math.cos(theta) * radiusAtY * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;

    const mixed = cyanCol.clone().lerp(whiteCol, Math.random() * 0.35);
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  const pGeo = new THREE_LIB.BufferGeometry();
  pGeo.setAttribute('position', new THREE_LIB.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE_LIB.BufferAttribute(colors, 3));

  const pMat = new THREE_LIB.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE_LIB.AdditiveBlending,
    depthWrite: false
  });
  holoJarvisPoints = new THREE_LIB.Points(pGeo, pMat);
  holoJarvisCoreGroup.add(holoJarvisPoints);

  // B. ROTIERENDES DRAHTGITTER-IKOSAEDER
  const icoGeo = new THREE_LIB.IcosahedronGeometry(1.48, 1);
  const icoMat = new THREE_LIB.MeshBasicMaterial({
    color: 0x00F0FF,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE_LIB.AdditiveBlending
  });
  holoJarvisWireframe = new THREE_LIB.Mesh(icoGeo, icoMat);
  holoJarvisCoreGroup.add(holoJarvisWireframe);

  // C. 3 GYROSKOPISCHE ORBITAL-SCANRINGE
  const ringParams = [
    { radius: 1.85, tube: 0.016, rotX: 0.8, rotY: 0.3, speed: 0.45 },
    { radius: 2.05, tube: 0.014, rotX: -0.6, rotY: 0.9, speed: -0.35 },
    { radius: 2.25, tube: 0.012, rotX: 0.3, rotY: -0.7, speed: 0.28 }
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
    ringMesh.rotation.x = p.rotX;
    ringMesh.rotation.y = p.rotY;
    ringMesh.userData = { speed: p.speed };
    holoJarvisCoreGroup.add(ringMesh);
    holoJarvisRings.push(ringMesh);
  });

  // D. PULSIERENDER ARC-CORE IM KERN
  const coreGeo = new THREE_LIB.SphereGeometry(0.38, 24, 24);
  const coreMat = new THREE_LIB.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.95
  });
  holoJarvisCore = new THREE_LIB.Mesh(coreGeo, coreMat);
  holoJarvisCore.userData = {
    type: 'holo_jarvis',
    name: 'J.A.R.V.I.S. Core',
    role: 'Central AI Engine & Voice Matrix',
    department: 'ZENTRALE'
  };
  holoJarvisCoreGroup.add(holoJarvisCore);
  interactiveObjects.push(holoJarvisCore);

  // E. AUDIO-REAKTIVES PUNKTLICHT
  holoJarvisLight = new THREE_LIB.PointLight(0x00F0FF, 3.2, 18, 1.2);
  holoJarvisLight.position.set(0, 0, 0);
  holoJarvisGroup.add(holoJarvisLight);

  // F. VERTIKALER HOLOGRAMM-PROJEKTIONSSTRAHL
  const beamGeo = new THREE_LIB.CylinderGeometry(0.1, 1.6, 4.2, 24, 1, true);
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
 * 3. ARBEITSPLÄTZE & ABTEILUNGEN: ALLE 33 AGENTEN AN GEORDNETEN POSITIONEN
 */
function setupArenaWorkstations(THREE_LIB, hierarchyData) {
  // Maps leeren
  Object.keys(agentMeshMap).forEach(k => delete agentMeshMap[k]);
  Object.keys(pcMeshMap).forEach(k => delete pcMeshMap[k]);
  Object.keys(chefMeshMap).forEach(k => delete chefMeshMap[k]);
  interactiveObjects.length = 0;

  // Holo-Jarvis Core wieder als interaktiv registrieren
  if (holoJarvisCore) interactiveObjects.push(holoJarvisCore);

  // 1. ZENTRALE: TREVOR (ag_01) am Holo-Kern
  setupTrevorCommandStation(THREE_LIB);

  // 2. ABTEILUNG 1: EG_ARCHITEKTUR (Marcus ag_02 [LEAD] + 7 Spezialisten ag_03..ag_09)
  setupArchitectureSector(THREE_LIB);

  // 3. ABTEILUNG 2: EG_FRONTEND (Daria ag_10 [LEAD] + 7 Spezialisten ag_11..ag_17)
  setupFrontendSector(THREE_LIB);

  // 4. ABTEILUNG 3: EG_BACKEND (David ag_18 [LEAD] + 7 Spezialisten ag_19..ag_25)
  setupBackendSector(THREE_LIB);

  // 5. ABTEILUNG 4: UG_SERVER (Ilja ag_26 [LEAD] + 7 Spezialisten ag_27..ag_33)
  setupServerSector(THREE_LIB);
}

/**
 * ZENTRALE: Trevor (ag_01) Studio Director
 */
function setupTrevorCommandStation(THREE_LIB) {
  const trevorAgent = AGENT_ROSTER_BY_ID['ag_01'] || TREVOR_AGENT_ROSTER[0];
  const trevorGroup = new THREE_LIB.Group();
  trevorGroup.position.set(0, 0.02, 3.8);
  trevorGroup.lookAt(0, 0.02, 0); // Blick nach Norden zum Holo-JARVIS

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
    easy_explanation: trevorAgent.easy_explanation
  };
  screen.userData = trevorUserData;
  interactiveObjects.push(screen);
  trevorGroup.add(screen);

  // Trevor Iron-Man Avatar mit Arc-Reactor
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, '#DC2626', true, true);
  avatar.position.set(0, 0.22, 0.48);
  avatar.userData = trevorUserData;
  avatar.traverse(child => {
    if (child.isMesh) {
      child.userData = trevorUserData;
      interactiveObjects.push(child);
    }
  });
  trevorGroup.add(avatar);

  // Registrierung
  const mapEntry = {
    agent: trevorAgent,
    group: trevorGroup,
    mesh: screen,
    screen,
    screens: [screen],
    avatar,
    isLead: true
  };
  agentMeshMap['ag_01'] = mapEntry;
  chefMeshMap['ag_01'] = mapEntry;
  chefMeshMap['trevor_core'] = mapEntry;

  scene.add(trevorGroup);
}

/**
 * ABTEILUNG 1: EG_ARCHITEKTUR (Nord-West Sektor)
 * Marcus [LEAD] (ag_02) + 7 Spezialisten (ag_03..ag_09)
 */
function setupArchitectureSector(THREE_LIB) {
  const deptCode = 'EG_ARCHITEKTUR';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(-12.0, 0.0, -10.0);
  sectorGroup.lookAt(0, 0, 0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('EG_ARCHITEKTUR', '#3B82F6');
  hudSprite.position.set(0, 1.45, 0);
  sectorGroup.add(hudSprite);
  deptHudSprites[2] = hudSprite;

  // Bodenplatte mit blauem Rand
  const plate = createSectorPlate(THREE_LIB, 2, deptCode, '1. Architektur & Planung', '#3B82F6', 3.6);
  sectorGroup.add(plate);

  // Marcus [LEAD] (ag_02) am Lead-Desk
  const marcus = AGENT_ROSTER_BY_ID['ag_02'];
  const leadDesk = createLeadWorkstation(THREE_LIB, marcus, '#3B82F6', new THREE_LIB.Vector3(0, 0.03, 1.6));
  sectorGroup.add(leadDesk);

  // 7 Spezialisten (ag_03..ag_09) im Bogen hinter Marcus
  const archSpecialists = [
    AGENT_ROSTER_BY_ID['ag_03'], // Elena
    AGENT_ROSTER_BY_ID['ag_04'], // Viktor
    AGENT_ROSTER_BY_ID['ag_05'], // Svenja
    AGENT_ROSTER_BY_ID['ag_06'], // Lukas
    AGENT_ROSTER_BY_ID['ag_07'], // Nadia
    AGENT_ROSTER_BY_ID['ag_08'], // Henrik
    AGENT_ROSTER_BY_ID['ag_09']  // Clara
  ];

  archSpecialists.forEach((spec, idx) => {
    const angle = -Math.PI * 0.42 + (idx / (archSpecialists.length - 1)) * (Math.PI * 0.84);
    const dist = 1.95;
    const pos = new THREE_LIB.Vector3(Math.sin(angle) * dist, 0.03, -Math.cos(angle) * dist);
    const workstation = createSpecialistWorkstation(THREE_LIB, spec, '#3B82F6', pos, angle + Math.PI);
    sectorGroup.add(workstation);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(-12.0, 0.2, -10.0), new THREE_LIB.Vector3(0, 2.2, 0), '#3B82F6');
  scene.add(sectorGroup);
}

/**
 * ABTEILUNG 2: EG_FRONTEND (Nord-Ost Sektor)
 * Daria [LEAD] (ag_10) + 7 Spezialisten (ag_11..ag_17)
 */
function setupFrontendSector(THREE_LIB) {
  const deptCode = 'EG_FRONTEND';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(12.0, 0.0, -10.0);
  sectorGroup.lookAt(0, 0, 0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('EG_FRONTEND', '#00F0FF');
  hudSprite.position.set(0, 1.45, 0);
  sectorGroup.add(hudSprite);
  deptHudSprites[3] = hudSprite;

  // Bodenplatte mit cyan Rand
  const plate = createSectorPlate(THREE_LIB, 3, deptCode, '2. Frontend, 3D & UI/UX', '#00F0FF', 3.6);
  sectorGroup.add(plate);

  // Daria [LEAD] (ag_10)
  const daria = AGENT_ROSTER_BY_ID['ag_10'];
  const leadDesk = createLeadWorkstation(THREE_LIB, daria, '#00F0FF', new THREE_LIB.Vector3(0, 0.03, 1.6));
  sectorGroup.add(leadDesk);

  // 7 Spezialisten (ag_11..ag_17)
  const feSpecialists = [
    AGENT_ROSTER_BY_ID['ag_11'], // Liam
    AGENT_ROSTER_BY_ID['ag_12'], // Maya
    AGENT_ROSTER_BY_ID['ag_13'], // Noah
    AGENT_ROSTER_BY_ID['ag_14'], // Zoe
    AGENT_ROSTER_BY_ID['ag_15'], // Finn
    AGENT_ROSTER_BY_ID['ag_16'], // Lea
    AGENT_ROSTER_BY_ID['ag_17']  // Ben
  ];

  feSpecialists.forEach((spec, idx) => {
    const angle = -Math.PI * 0.42 + (idx / (feSpecialists.length - 1)) * (Math.PI * 0.84);
    const dist = 1.95;
    const pos = new THREE_LIB.Vector3(Math.sin(angle) * dist, 0.03, -Math.cos(angle) * dist);
    const workstation = createSpecialistWorkstation(THREE_LIB, spec, '#00F0FF', pos, angle + Math.PI);
    sectorGroup.add(workstation);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(12.0, 0.2, -10.0), new THREE_LIB.Vector3(0, 2.2, 0), '#00F0FF');
  scene.add(sectorGroup);
}

/**
 * ABTEILUNG 3: EG_BACKEND (Süd-Sektor)
 * David [LEAD] (ag_18) + 7 Spezialisten (ag_19..ag_25)
 */
function setupBackendSector(THREE_LIB) {
  const deptCode = 'EG_BACKEND';
  const sectorGroup = new THREE_LIB.Group();
  sectorGroup.position.set(0.0, 0.0, 15.5);
  sectorGroup.lookAt(0, 0, 0);

  // Sleek HUD Label Sprite
  const hudSprite = createSleekHudLabelSprite('EG_BACKEND', '#10B981');
  hudSprite.position.set(0, 1.45, 0);
  sectorGroup.add(hudSprite);
  deptHudSprites[5] = hudSprite;

  // Bodenplatte mit grünem Rand
  const plate = createSectorPlate(THREE_LIB, 5, deptCode, '3. Backend & Algorithmen', '#10B981', 3.6);
  sectorGroup.add(plate);

  // David [LEAD] (ag_18)
  const david = AGENT_ROSTER_BY_ID['ag_18'];
  const leadDesk = createLeadWorkstation(THREE_LIB, david, '#10B981', new THREE_LIB.Vector3(0, 0.03, 1.6));
  sectorGroup.add(leadDesk);

  // 7 Spezialisten (ag_19..ag_25)
  const beSpecialists = [
    AGENT_ROSTER_BY_ID['ag_19'], // Sarah
    AGENT_ROSTER_BY_ID['ag_20'], // Malik
    AGENT_ROSTER_BY_ID['ag_21'], // Jonas
    AGENT_ROSTER_BY_ID['ag_22'], // Kiara
    AGENT_ROSTER_BY_ID['ag_23'], // Tarek
    AGENT_ROSTER_BY_ID['ag_24'], // Hannah
    AGENT_ROSTER_BY_ID['ag_25']  // Tim
  ];

  beSpecialists.forEach((spec, idx) => {
    const angle = -Math.PI * 0.42 + (idx / (beSpecialists.length - 1)) * (Math.PI * 0.84);
    const dist = 1.95;
    const pos = new THREE_LIB.Vector3(Math.sin(angle) * dist, 0.03, -Math.cos(angle) * dist);
    const workstation = createSpecialistWorkstation(THREE_LIB, spec, '#10B981', pos, angle + Math.PI);
    sectorGroup.add(workstation);
  });

  createConnectionCurve(THREE_LIB, new THREE_LIB.Vector3(0.0, 0.2, 15.5), new THREE_LIB.Vector3(0, 2.2, 0), '#10B981');
  scene.add(sectorGroup);
}

/**
 * ABTEILUNG 4: UG_SERVER (Zentrales Tieffeld / Arena-Grube im UG bei y = -2.0)
 * Ilja [LEAD] (ag_26) + 7 Spezialisten (ag_27..ag_33)
 */
function setupServerSector(THREE_LIB) {
  const deptCode = 'UG_SERVER';
  const ugGroup = new THREE_LIB.Group();
  ugGroup.position.set(0, -2.0, 0);

  // Sleek HUD Label Sprite über dem UG
  const hudSprite = createSleekHudLabelSprite('UG_SERVER', '#F59E0B');
  hudSprite.position.set(0, 0.9, -3.2);
  ugGroup.add(hudSprite);
  deptHudSprites[12] = hudSprite;

  // Ilja [LEAD] (ag_26)
  const ilja = AGENT_ROSTER_BY_ID['ag_26'];
  const leadDesk = createLeadWorkstation(THREE_LIB, ilja, '#F59E0B', new THREE_LIB.Vector3(0, 0.03, -3.4));
  leadDesk.lookAt(0, 0.03, 0);
  ugGroup.add(leadDesk);

  // 7 Spezialisten (ag_27..ag_33) im Kreis um die Server-Racks
  const serverSpecialists = [
    AGENT_ROSTER_BY_ID['ag_27'], // Milan
    AGENT_ROSTER_BY_ID['ag_28'], // Freya
    AGENT_ROSTER_BY_ID['ag_29'], // Anton
    AGENT_ROSTER_BY_ID['ag_30'], // Kian
    AGENT_ROSTER_BY_ID['ag_31'], // Nora
    AGENT_ROSTER_BY_ID['ag_32'], // Rico
    AGENT_ROSTER_BY_ID['ag_33']  // Yuna
  ];

  const ugRadius = 4.2;
  serverSpecialists.forEach((spec, idx) => {
    // Verteile die 7 Spezialisten auf den restlichen Kreis
    const angle = (idx + 1) * ((Math.PI * 1.8) / serverSpecialists.length) - Math.PI * 0.9;
    const posX = Math.sin(angle) * ugRadius;
    const posZ = Math.cos(angle) * ugRadius;
    const pos = new THREE_LIB.Vector3(posX, 0.03, posZ);

    const workstation = createSpecialistWorkstation(THREE_LIB, spec, '#F59E0B', pos, angle + Math.PI);
    ugGroup.add(workstation);
  });

  scene.add(ugGroup);
}

/**
 * Erzeugt eine schlichte Sektor-Bodenplatte mit farbigem Neon-Ring
 */
function createSectorPlate(THREE_LIB, deptId, deptCode, name, colorHex, radius = 3.6) {
  const group = new THREE_LIB.Group();
  const plateGeo = new THREE_LIB.CylinderGeometry(radius, radius, 0.04, 32);
  const plateMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0E1726,
    roughness: 0.5,
    metalness: 0.4
  });
  const plate = new THREE_LIB.Mesh(plateGeo, plateMat);
  plate.position.y = 0.02;
  plate.receiveShadow = true;
  plate.userData = {
    type: 'department',
    deptId,
    code: deptCode,
    name,
    floor: 'EG'
  };
  interactiveObjects.push(plate);
  group.add(plate);

  const rimGeo = new THREE_LIB.TorusGeometry(radius, 0.02, 8, 32);
  const rimMat = new THREE_LIB.MeshBasicMaterial({ color: parseInt(colorHex.replace('#', '0x'), 16) });
  const rim = new THREE_LIB.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.042;
  group.add(rim);

  return group;
}

/**
 * Erzeugt den Arbeitsplatz eines Abteilungsleiters ([LEAD])
 */
function createLeadWorkstation(THREE_LIB, agent, colorHex, position) {
  const group = new THREE_LIB.Group();
  group.position.copy(position);

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
    easy_explanation: agent.easy_explanation
  };
  screen.userData = userData;
  interactiveObjects.push(screen);
  group.add(screen);

  // Lead-Avatar mit Gold/Cyan-Schulterring
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, colorHex, true, false);
  avatar.position.set(0, 0.18, 0.42);
  avatar.userData = userData;
  avatar.traverse(child => {
    if (child.isMesh) {
      child.userData = userData;
      interactiveObjects.push(child);
    }
  });
  group.add(avatar);

  const entry = {
    agent,
    group,
    mesh: screen,
    screen,
    screens: [screen],
    avatar,
    isLead: true
  };
  agentMeshMap[agent.id] = entry;
  chefMeshMap[agent.id] = entry;

  return group;
}

/**
 * Erzeugt den Arbeitsplatz eines Fach-Spezialisten
 */
function createSpecialistWorkstation(THREE_LIB, agent, colorHex, position, rotY = 0) {
  const group = new THREE_LIB.Group();
  group.position.copy(position);
  group.rotation.y = rotY;

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
    easy_explanation: agent.easy_explanation
  };

  const screenLeft = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
  screenLeft.position.set(-0.2, 0.64, 0.03);
  screenLeft.rotation.y = 0.12;
  screenLeft.userData = userData;
  group.add(screenLeft);
  interactiveObjects.push(screenLeft);

  const screenRight = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
  screenRight.position.set(0.2, 0.64, 0.03);
  screenRight.rotation.y = -0.12;
  screenRight.userData = userData;
  group.add(screenRight);
  interactiveObjects.push(screenRight);

  // Avatar
  const avatar = createStylizedDeveloperAvatar(THREE_LIB, colorHex, false, false);
  avatar.position.set(0, 0.16, 0.35);
  avatar.userData = userData;
  avatar.traverse(child => {
    if (child.isMesh) {
      child.userData = userData;
      interactiveObjects.push(child);
    }
  });
  group.add(avatar);
  developerAvatars.push(avatar);

  const entry = {
    agent,
    group,
    mesh: screenLeft,
    screenLeft,
    screenRight,
    screens: [screenLeft, screenRight],
    avatar,
    isLead: false
  };
  agentMeshMap[agent.id] = entry;
  pcMeshMap[agent.id] = entry;

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
 * 4. RAYCASTING, HOVER-MINI-BADGE & KLICK-INTERAKTION
 */
function setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick) {
  const raycaster = new THREE_LIB.Raycaster();
  const mouse = new THREE_LIB.Vector2();

  // A. HOVER MINI-BADGE AUF POINTERMOVE
  renderer.domElement.addEventListener('pointermove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData || {};

      if (data.type === 'agent' || data.type === 'pc' || data.type === 'chef' || data.agentId) {
        const agentId = data.agentId || data.pcId || data.chefId;
        const agent = AGENT_ROSTER_BY_ID[agentId] || data;
        const badge = getHoverBadgeEl();
        if (badge) {
          const isLead = agent.isLead || data.isLead || data.type === 'chef';
          const leadBadge = isLead ? '<span style="color:#F59E0B;font-weight:bold;margin-right:4px;">[LEAD]</span>' : '';
          const currentStatus = data.status || agent.status || 'Bereit';
          const taskInfo = data.currentTask ? `Arbeitet an: ${data.currentTask}` : currentStatus;
          const statusColor = (taskInfo === 'Bereit' || taskInfo.includes('Bereit')) ? '#10B981' : '#F59E0B';

          badge.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${statusColor};box-shadow:0 0 6px ${statusColor};"></span>
              <span style="font-weight:700;color:#FFFFFF;">${leadBadge}${agent.name || data.name}</span>
              <span style="color:#64748B;">–</span>
              <span style="color:#38BDF8;">${agent.role || data.role}</span>
              <span style="color:#94A3B8;font-size:10px;">(${agent.deptCode || agent.department || data.department || ''})</span>
            </div>
            <div style="margin-top:2px;font-size:10px;color:${statusColor};display:flex;align-items:center;gap:4px;">
              <span>●</span> <span>${taskInfo}</span>
            </div>
          `;
          badge.style.left = `${event.clientX}px`;
          badge.style.top = `${event.clientY - 12}px`;
          badge.style.display = 'block';
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
    }

    if (hoverBadgeEl) {
      hoverBadgeEl.style.display = 'none';
    }
    renderer.domElement.style.cursor = 'default';
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    if (hoverBadgeEl) hoverBadgeEl.style.display = 'none';
  });

  // B. KLICK-INTERAKTION
  renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData || {};

      if (data.type === 'agent' || data.type === 'pc' || data.type === 'chef' || data.agentId) {
        const agentId = data.agentId || data.pcId || data.chefId;
        const agent = AGENT_ROSTER_BY_ID[agentId] || data;
        const worldPos = hit.getWorldPosition(new THREE_LIB.Vector3());
        zoomToPosition(worldPos, 6.5);

        if (typeof onAgentClick === 'function') {
          onAgentClick(agentId, agent.isLead ? 'chef' : 'pc', agent.deptCode || data.deptId);
        }
      } else if (data.type === 'holo_jarvis' && typeof onTrevorClick === 'function') {
        onTrevorClick();
        zoomToPosition(new THREE_LIB.Vector3(0, 2.2, 0), 9);
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

    case 'jarvis': // Zentrum / Holo-JARVIS & Trevor Nahansicht
      targetCameraPos = new THREE.Vector3(0, 4.5, 9);
      targetLookAt = new THREE.Vector3(0, 2.2, 0);
      break;

    case 'eg': // EG Galerie
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
  const THREE = getTHREE();
  if (!THREE) return;

  const id = Number(deptId);
  if (id === 2 || id === 1) { // EG_ARCHITEKTUR
    zoomToPosition(new THREE.Vector3(-12.0, 0.0, -10.0), 9);
  } else if (id === 3 || id === 4) { // EG_FRONTEND
    zoomToPosition(new THREE.Vector3(12.0, 0.0, -10.0), 9);
  } else if (id === 5) { // EG_BACKEND
    zoomToPosition(new THREE.Vector3(0.0, 0.0, 15.5), 9);
  } else if (id === 12 || id === 11) { // UG_SERVER
    zoomToPosition(new THREE.Vector3(0, -2.0, 0), 8);
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
    zoomToPosition(new THREE.Vector3(0, 0.4, 3.8), 5.5);
    return;
  }

  const entry = agentMeshMap[agentId] || pcMeshMap[agentId] || chefMeshMap[agentId];
  if (entry) {
    const targetMesh = entry.mesh || entry.screen || entry.screenLeft || entry.avatar;
    if (targetMesh) {
      const worldPos = targetMesh.getWorldPosition(new THREE.Vector3());
      zoomToPosition(worldPos, 6.0);
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

  // A. HOLO-JARVIS DYNAMISCHE ANIMATIONEN
  if (holoJarvisCoreGroup) {
    if (holoJarvisPoints) {
      holoJarvisPoints.rotation.y += delta * 0.22;
      holoJarvisPoints.rotation.x += delta * 0.08;
    }

    if (holoJarvisWireframe) {
      holoJarvisWireframe.rotation.y -= delta * 0.16;
      holoJarvisWireframe.rotation.z += delta * 0.11;
    }

    holoJarvisRings.forEach(ring => {
      const spd = ring.userData.speed || 0.5;
      ring.rotation.z += delta * spd;
    });

    const isSpeaking = (typeof window !== 'undefined' && window.isJarvisSpeaking === true);
    const pulseBase = Math.sin(elapsed * 2.0);
    const currentScale = 1.0 + 0.06 * pulseBase + (isSpeaking ? 0.14 * Math.sin(elapsed * 7.0) : 0);
    holoJarvisCoreGroup.scale.set(currentScale, currentScale, currentScale);

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
