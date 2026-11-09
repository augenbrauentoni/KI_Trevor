/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * High-End 3D-Architektur-Campus (Three.js):
 * - 10 realistische Büro-Pods im Ring mit warmen Holzböden & Glaswänden
 * - Schwebende 3D-Billboard-Labels ("1. Ideen & Planung", "2. Bauplan & Technik" etc.)
 * - Trevor im Iron-Man Look (Hot-Rod-Rot, Gold-Titan, hell strahlender Arc-Reactor & Repulsoren)
 * - 33 Spezial-PCs mit sitzenden, animierten 3D-Entwicklern & Dual-Widescreen Monitoren
 * - 10 Chef-Terminals mit Amber-Audit-Leuchten
 * - Kräftige Studio-Beleuchtung (Ambient 1.4 + Directional 2.0)
 * - 100% robuster Fallback für Hierarchy & Three.js-Loading
 */

import { STUDIO_HIERARCHY } from './hierarchyData.js';

let scene, camera, renderer, controls;
let containerEl;
let trevorGroup, trevorHead, trevorArcLight, trevorHands = [];
let decisionTerminalScreen;
const interactiveObjects = [];
const pcMeshMap = {};
const chefMeshMap = {};
const dataParticleStreams = [];
const blinkingLeds = [];
const developerAvatars = [];

let isQuietMode = false;
let targetCameraPos = null;
let targetLookAt = null;

/**
 * Erzeugt schwebende 3D-Billboard-Labels über Räumen und Trevor
 */
function createFloatingLabelSprite(title, subtitle, colorHexStr) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Hintergrund-Pill
  ctx.fillStyle = 'rgba(11, 16, 26, 0.92)';
  ctx.strokeStyle = colorHexStr || '#fbbf24';
  ctx.lineWidth = 6;

  // Abgerundetes Rechteck
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 140, 24);
  ctx.fill();
  ctx.stroke();

  // Status-Punkt
  ctx.fillStyle = colorHexStr || '#fbbf24';
  ctx.beginPath();
  ctx.arc(45, 80, 14, 0, Math.PI * 2);
  ctx.fill();

  // Titel-Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillText(title, 75, 70);

  // Untertitel-Text
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillText(subtitle, 75, 115);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(6.4, 2.0, 1.0);
  return sprite;
}

/**
 * Initialisiert die Three.js Szene mit garantierten Abmessungen & Beleuchtung
 */
export async function init3DStudio(hierarchyDataParam, onAgentClick, onTrevorClick) {
  containerEl = document.getElementById('threejs-canvas-container');
  if (!containerEl) {
    console.warn('[Studio 3D] Container #threejs-canvas-container nicht gefunden.');
    return;
  }

  // Löse THREE auf (Global oder ESM)
  let THREE_LIB = window.THREE;
  if (!THREE_LIB) {
    try {
      THREE_LIB = await import('three');
      window.THREE = THREE_LIB;
    } catch (e) {
      console.error('[Studio 3D] Three.js konnte weder global noch per Import geladen werden:', e);
      return;
    }
  }

  // Fester Daten-Fallback
  const effectiveHierarchy = (hierarchyDataParam && hierarchyDataParam.departments && hierarchyDataParam.departments.length > 0)
    ? hierarchyDataParam
    : STUDIO_HIERARCHY;

  // 1. Szene
  scene = new THREE_LIB.Scene();
  scene.background = new THREE_LIB.Color(0x06080e);
  scene.fog = new THREE_LIB.FogExp2(0x06080e, 0.009);

  // 2. Abmessungen mit garantiertem Fallback
  const width = containerEl.clientWidth || Math.round(window.innerWidth * 0.72) || 1200;
  const height = containerEl.clientHeight || Math.max(window.innerHeight - 170, 600) || 700;

  // 3. Kamera (Sichtbar schräg über dem Campus)
  camera = new THREE_LIB.PerspectiveCamera(44, width / height, 0.5, 600);
  camera.position.set(0, 38, 48);
  camera.lookAt(0, 1.2, 0);

  // 4. Renderer
  renderer = new THREE_LIB.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE_LIB.PCFSoftShadowMap;
  renderer.toneMapping = THREE_LIB.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Vorherige Canvas entfernen
  const oldCanvas = containerEl.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  containerEl.appendChild(renderer.domElement);

  // 5. OrbitControls
  if (window.THREE && window.THREE.OrbitControls) {
    controls = new window.THREE.OrbitControls(camera, renderer.domElement);
  } else {
    try {
      const controlsMod = await import('three/addons/controls/OrbitControls.js');
      controls = new controlsMod.OrbitControls(camera, renderer.domElement);
    } catch {
      console.warn('[Studio 3D] OrbitControls nicht geladen, Szene bleibt statisch bedienbar.');
    }
  }

  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 8;
    controls.maxDistance = 110;
    controls.target.set(0, 1.2, 0);
  }

  // 6. Kräftige Beleuchtung (Kein dunkler Raum!)
  setupCampusLighting(THREE_LIB);

  // 7. Campus-Boden & Cyber-Plaza
  setupCampusFloor(THREE_LIB);

  // 8. Trevor im Iron-Man Look (Zentrum)
  setupTrevorIronManMech(THREE_LIB);

  // 9. Die 10 realistischen Büro-Pods
  setupCampusDepartments(THREE_LIB, effectiveHierarchy);

  // 10. Datenpipelines & Partikel
  setupDataPipelines(THREE_LIB, effectiveHierarchy);

  // 11. Raycasting & Klicks
  setupRaycasting(THREE_LIB, onAgentClick, onTrevorClick);

  // 12. UI-Kamera-Buttons
  setupCameraButtons();

  // 13. Resize-Observer
  window.addEventListener('resize', onWindowResize);
  if (window.ResizeObserver) {
    new ResizeObserver(() => onWindowResize()).observe(containerEl);
  }

  // 14. Render-Loop starten
  animate();
  console.log('[Studio 3D] 3D-Campus mit schwebenden Labels & Iron-Man Trevor aktiv!');
}

/**
 * Kräftige Beleuchtung (AmbientLight 1.4 + DirectionalLight 2.0)
 */
function setupCampusLighting(THREE_LIB) {
  // Kräftiges weißes Umgebungslicht
  const ambientLight = new THREE_LIB.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  // Haupt-Licht schräg von oben
  const keySpot = new THREE_LIB.DirectionalLight(0xffffff, 2.0);
  keySpot.position.set(30, 50, 35);
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.width = 2048;
  keySpot.shadow.mapSize.height = 2048;
  scene.add(keySpot);

  // Blau-Cyan Akzentlicht von der Gegenseite
  const fillLight = new THREE_LIB.DirectionalLight(0x38bdf8, 0.8);
  fillLight.position.set(-30, 25, -30);
  scene.add(fillLight);
}

/**
 * Campus-Boden (Edle Schiefer-Plaza mit konzentrischen Leuchtringen)
 */
function setupCampusFloor(THREE_LIB) {
  const floorGeo = new THREE_LIB.CylinderGeometry(44, 44, 0.4, 64);
  const floorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.65,
    metalness: 0.25
  });
  const floor = new THREE_LIB.Mesh(floorGeo, floorMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Konzentrische Leuchtringe
  for (let r = 7; r <= 40; r += 7) {
    const ringGeo = new THREE_LIB.RingGeometry(r - 0.05, r + 0.05, 64);
    const ringMat = new THREE_LIB.MeshBasicMaterial({
      color: 0x1f2937,
      side: THREE_LIB.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    const ring = new THREE_LIB.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
  }

  // Dezent rote Plaza-Gitterlinie
  const grid = new THREE_LIB.GridHelper(84, 42, 0xdc2626, 0x1e293b);
  grid.position.y = 0.01;
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);
}

/**
 * Trevor als detailreicher 3D-Hero-Mech im Iron-Man Look
 */
function setupTrevorIronManMech(THREE_LIB) {
  trevorGroup = new THREE_LIB.Group();
  trevorGroup.position.set(0, 0, 0);

  // 1. Achteckiges Kommando-Podest (Dunkelgrau mit Gold-Kante)
  const podestGeo = new THREE_LIB.CylinderGeometry(5.2, 5.6, 0.7, 8);
  const podestMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.7
  });
  const podest = new THREE_LIB.Mesh(podestGeo, podestMat);
  podest.position.y = 0.35;
  podest.receiveShadow = true;
  trevorGroup.add(podest);

  // Karmesinrot-Goldener Leuchtring um das Podest
  const edgeGeo = new THREE_LIB.TorusGeometry(5.2, 0.08, 8, 8);
  const edgeMat = new THREE_LIB.MeshBasicMaterial({ color: 0xfbbf24 });
  const edge = new THREE_LIB.Mesh(edgeGeo, edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.71;
  trevorGroup.add(edge);

  // Holografischer runder Steuerungstisch vor Trevor
  const tableGeo = new THREE_LIB.CylinderGeometry(1.6, 1.6, 0.1, 32);
  const tableMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6
  });
  const holoTable = new THREE_LIB.Mesh(tableGeo, tableMat);
  holoTable.position.set(0, 1.8, 1.2);
  trevorGroup.add(holoTable);

  // --- IRON-MAN RÜSTUNG (HOT-ROD-ROT & GOLD) ---
  const redArmorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.2,
    metalness: 0.88
  });

  const goldArmorMat = new THREE_LIB.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.92
  });

  // Mech-Torso
  const mechBody = new THREE_LIB.Group();
  mechBody.position.set(0, 2.5, 0);

  const chestGeo = new THREE_LIB.BoxGeometry(1.2, 1.4, 0.9);
  const chest = new THREE_LIB.Mesh(chestGeo, redArmorMat);
  chest.castShadow = true;
  mechBody.add(chest);

  // Goldene Rippen
  const ribLeftGeo = new THREE_LIB.BoxGeometry(0.2, 0.9, 0.85);
  const ribLeft = new THREE_LIB.Mesh(ribLeftGeo, goldArmorMat);
  ribLeft.position.set(-0.55, 0, 0);
  mechBody.add(ribLeft);

  const ribRight = new THREE_LIB.Mesh(ribLeftGeo, goldArmorMat);
  ribRight.position.set(0.55, 0, 0);
  mechBody.add(ribRight);

  // ARC-REACTOR (Hell strahlend Cyan/Weiß)
  const arcRingGeo = new THREE_LIB.TorusGeometry(0.22, 0.04, 16, 32);
  const arcRingMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8 });
  const arcRing = new THREE_LIB.Mesh(arcRingGeo, arcRingMat);
  arcRing.position.set(0, 0.22, 0.47);
  mechBody.add(arcRing);

  const arcCoreGeo = new THREE_LIB.CircleGeometry(0.18, 24);
  const arcCoreMat = new THREE_LIB.MeshBasicMaterial({ color: 0xe0f2fe });
  const arcCore = new THREE_LIB.Mesh(arcCoreGeo, arcCoreMat);
  arcCore.position.set(0, 0.22, 0.48);
  mechBody.add(arcCore);

  trevorArcLight = new THREE_LIB.PointLight(0x38bdf8, 4.0, 16);
  trevorArcLight.position.set(0, 0.22, 0.8);
  mechBody.add(trevorArcLight);

  // IRON-MAN HELM
  trevorHead = new THREE_LIB.Group();
  trevorHead.position.set(0, 0.95, 0);

  const helmetBaseGeo = new THREE_LIB.BoxGeometry(0.7, 0.8, 0.75);
  const helmetBase = new THREE_LIB.Mesh(helmetBaseGeo, redArmorMat);
  trevorHead.add(helmetBase);

  // Goldene Gesichtsplatte
  const faceplateGeo = new THREE_LIB.BoxGeometry(0.55, 0.65, 0.1);
  const faceplate = new THREE_LIB.Mesh(faceplateGeo, goldArmorMat);
  faceplate.position.set(0, -0.05, 0.36);
  trevorHead.add(faceplate);

  // Leuchtende Augen
  const eyeGeo = new THREE_LIB.PlaneGeometry(0.14, 0.035);
  const eyeMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8, side: THREE_LIB.DoubleSide });

  const eyeLeft = new THREE_LIB.Mesh(eyeGeo, eyeMat);
  eyeLeft.position.set(-0.15, -0.02, 0.42);
  eyeLeft.rotation.z = -0.05;
  trevorHead.add(eyeLeft);

  const eyeRight = new THREE_LIB.Mesh(eyeGeo, eyeMat);
  eyeRight.position.set(0.15, -0.02, 0.42);
  eyeRight.rotation.z = 0.05;
  trevorHead.add(eyeRight);

  mechBody.add(trevorHead);

  // Schultern & Repulsor-Hände
  [-1, 1].forEach((side) => {
    const shoulderGeo = new THREE_LIB.SphereGeometry(0.35, 16, 16);
    const shoulder = new THREE_LIB.Mesh(shoulderGeo, goldArmorMat);
    shoulder.position.set(side * 0.85, 0.45, 0);
    mechBody.add(shoulder);

    const armGeo = new THREE_LIB.CylinderGeometry(0.14, 0.12, 0.7, 12);
    const arm = new THREE_LIB.Mesh(armGeo, redArmorMat);
    arm.position.set(side * 0.95, 0.05, 0.2);
    arm.rotation.x = Math.PI / 4;
    mechBody.add(arm);

    const handGeo = new THREE_LIB.BoxGeometry(0.2, 0.1, 0.25);
    const hand = new THREE_LIB.Mesh(handGeo, goldArmorMat);
    hand.position.set(side * 0.6, -0.4, 0.8);
    mechBody.add(hand);

    const repulsorGeo = new THREE_LIB.CircleGeometry(0.08, 16);
    const repulsorMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8, side: THREE_LIB.DoubleSide });
    const repulsor = new THREE_LIB.Mesh(repulsorGeo, repulsorMat);
    repulsor.rotation.x = Math.PI / 2;
    repulsor.position.set(side * 0.6, -0.46, 0.8);
    mechBody.add(repulsor);
    trevorHands.push(repulsor);
  });

  // Beine
  [-1, 1].forEach((side) => {
    const legGeo = new THREE_LIB.CylinderGeometry(0.18, 0.16, 1.4, 12);
    const leg = new THREE_LIB.Mesh(legGeo, redArmorMat);
    leg.position.set(side * 0.4, -1.2, 0);
    mechBody.add(leg);

    const kneeGeo = new THREE_LIB.BoxGeometry(0.26, 0.26, 0.26);
    const knee = new THREE_LIB.Mesh(kneeGeo, goldArmorMat);
    knee.position.set(side * 0.4, -1.1, 0.1);
    mechBody.add(knee);
  });

  mechBody.userData = { type: 'trevor', name: 'Trevor (Director)' };
  interactiveObjects.push(chest);
  interactiveObjects.push(helmetBase);
  trevorGroup.add(mechBody);

  // Schwebendes Label über Trevor
  const trevorLabel = createFloatingLabelSprite("TREVOR (MK-VII)", "Studio Director", "#fbbf24");
  trevorLabel.position.set(0, 4.8, 0);
  trevorGroup.add(trevorLabel);

  // 3D Terminal "Deine Entscheidungen"
  const terminalGroup = new THREE_LIB.Group();
  terminalGroup.position.set(0, 0.7, 3.8);

  const standGeo = new THREE_LIB.BoxGeometry(0.9, 1.1, 0.4);
  const standMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const stand = new THREE_LIB.Mesh(standGeo, standMat);
  stand.position.y = 0.55;
  terminalGroup.add(stand);

  const screenGeo = new THREE_LIB.BoxGeometry(1.5, 0.85, 0.1);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
    roughness: 0.2
  });
  decisionTerminalScreen = new THREE_LIB.Mesh(screenGeo, screenMat);
  decisionTerminalScreen.position.set(0, 1.2, 0);
  decisionTerminalScreen.rotation.x = -Math.PI / 6;
  decisionTerminalScreen.userData = { type: 'decision_terminal', name: 'Deine Entscheidungen' };
  interactiveObjects.push(decisionTerminalScreen);
  terminalGroup.add(decisionTerminalScreen);

  trevorGroup.add(terminalGroup);
  scene.add(trevorGroup);
}

/**
 * 10 realistische Architektur-Büros mit Schwebenden 3D-Labels & Avataren
 */
function setupCampusDepartments(THREE_LIB, hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 28;

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    const podGroup = new THREE_LIB.Group();
    podGroup.position.set(posX, 0, posZ);
    podGroup.lookAt(0, 0, 0);

    // 1. Schwebendes 3D-Billboard Label über dem Raum
    const roomLabel = createFloatingLabelSprite(dept.name, dept.chef_agent.name, dept.color);
    roomLabel.position.set(0, 4.6, 0);
    podGroup.add(roomLabel);

    // Eigene dezente Raumbeleuchtung in Abteilungsfarbe
    const deptColor = parseInt(dept.color.replace('#', '0x'), 16);
    const roomLight = new THREE_LIB.PointLight(deptColor, 1.6, 14);
    roomLight.position.set(0, 3.2, 0);
    podGroup.add(roomLight);

    // 2. Bodenplatte (Holz, Stein, Tech-Server)
    let floorMat;
    if (dept.floor_type === 'wood') {
      floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.4, metalness: 0.1 });
    } else if (dept.floor_type === 'tech_servers') {
      floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.6 });
    } else {
      floorMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 });
    }

    const plateGeo = new THREE_LIB.CylinderGeometry(5.2, 5.5, 0.35, 24);
    const plate = new THREE_LIB.Mesh(plateGeo, floorMat);
    plate.position.y = 0.17;
    plate.receiveShadow = true;
    plate.userData = { type: 'department', deptId: dept.id, name: dept.name, easy_explanation: dept.easy_explanation };
    interactiveObjects.push(plate);
    podGroup.add(plate);

    // Farbige Kantenleiste
    const borderGeo = new THREE_LIB.TorusGeometry(5.2, 0.06, 8, 32);
    const borderMat = new THREE_LIB.MeshBasicMaterial({ color: deptColor });
    const border = new THREE_LIB.Mesh(borderGeo, borderMat);
    border.rotation.x = Math.PI / 2;
    border.position.y = 0.36;
    podGroup.add(border);

    // 3. Glas-Trennwände mit schwarzem Aluminium-Rahmen
    const glassGeo = new THREE_LIB.CylinderGeometry(5.0, 5.0, 2.0, 24, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
    const glassMat = new THREE_LIB.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.7,
      ior: 1.4,
      side: THREE_LIB.DoubleSide
    });
    const glass = new THREE_LIB.Mesh(glassGeo, glassMat);
    glass.position.y = 1.25;
    podGroup.add(glass);

    // Requisiten (Pflanzen, Server-Racks, Whiteboards)
    setupRoomProps(THREE_LIB, podGroup, dept);

    // Chef-Terminal
    setupChefStation(THREE_LIB, podGroup, dept);

    // Spezial-PCs mit 3D-Avataren
    setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept);

    scene.add(podGroup);
  });
}

function setupRoomProps(THREE_LIB, podGroup, dept) {
  // Pflanzentopf
  const potGeo = new THREE_LIB.CylinderGeometry(0.35, 0.25, 0.6, 12);
  const potMat = new THREE_LIB.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const pot = new THREE_LIB.Mesh(potGeo, potMat);
  pot.position.set(-3.6, 0.5, 1.8);
  podGroup.add(pot);

  const plantGeo = new THREE_LIB.DodecahedronGeometry(0.55, 1);
  const plantMat = new THREE_LIB.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const plant = new THREE_LIB.Mesh(plantGeo, plantMat);
  plant.position.set(-3.6, 0.95, 1.8);
  podGroup.add(plant);

  // Server-Racks im Backend & DB
  if (dept.id === 5 || dept.id === 6 || dept.id === 8) {
    const rackGeo = new THREE_LIB.BoxGeometry(0.9, 2.2, 0.7);
    const rackMat = new THREE_LIB.MeshStandardMaterial({ color: 0x020617, metalness: 0.8, roughness: 0.3 });
    const rack = new THREE_LIB.Mesh(rackGeo, rackMat);
    rack.position.set(3.6, 1.2, 1.5);
    podGroup.add(rack);

    for (let i = 0; i < 4; i++) {
      const ledGeo = new THREE_LIB.CircleGeometry(0.04, 8);
      const ledMat = new THREE_LIB.MeshBasicMaterial({ color: i % 2 === 0 ? 0x10b981 : 0x06b6d4 });
      const led = new THREE_LIB.Mesh(ledGeo, ledMat);
      led.position.set(3.6 - 0.2 + (i * 0.12), 1.8, 1.86);
      led.rotation.y = -Math.PI / 2;
      podGroup.add(led);
      blinkingLeds.push(led);
    }
  }

  // Whiteboard in Design & Ideen
  if (dept.id === 1 || dept.id === 3) {
    const boardGeo = new THREE_LIB.BoxGeometry(1.6, 1.2, 0.05);
    const boardMat = new THREE_LIB.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const board = new THREE_LIB.Mesh(boardGeo, boardMat);
    board.position.set(3.4, 1.5, 1.5);
    board.rotation.y = -Math.PI / 3;
    podGroup.add(board);
  }
}

function setupChefStation(THREE_LIB, podGroup, dept) {
  const chef = dept.chef_agent;
  const chefGroup = new THREE_LIB.Group();
  chefGroup.position.set(0, 0.35, 3.2);

  const deskGeo = new THREE_LIB.BoxGeometry(1.8, 0.8, 0.7);
  const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
  desk.position.y = 0.4;
  chefGroup.add(desk);

  const screenGeo = new THREE_LIB.BoxGeometry(1.3, 0.65, 0.08);
  const screenMat = new THREE_LIB.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x1e293b,
    emissiveIntensity: 0.6,
    roughness: 0.2
  });
  const screen = new THREE_LIB.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.98, -0.1);
  screen.userData = {
    type: 'chef',
    chefId: chef.id,
    deptId: dept.id,
    name: chef.name,
    easy_explanation: chef.easy_explanation
  };
  chefGroup.add(screen);
  interactiveObjects.push(screen);

  const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, true);
  avatar.position.set(0, 0.1, 0.55);
  chefGroup.add(avatar);

  chefMeshMap[chef.id] = { screen, avatarArms: avatar.userData.arms };
  podGroup.add(chefGroup);
}

function setupSpecialistPcWorkstations(THREE_LIB, podGroup, dept) {
  const pcCount = dept.specialist_pcs.length;

  dept.specialist_pcs.forEach((pc, idx) => {
    const pcGroup = new THREE_LIB.Group();
    const angle = -Math.PI * 0.4 + (idx / (pcCount - 1 || 1)) * (Math.PI * 0.8);
    const dist = 2.65;
    const posX = Math.sin(angle) * dist;
    const posZ = -Math.cos(angle) * dist;

    pcGroup.position.set(posX, 0.35, posZ);
    pcGroup.rotation.y = angle + Math.PI;

    // Schreibtisch
    const deskGeo = new THREE_LIB.BoxGeometry(1.3, 0.7, 0.65);
    const deskMat = new THREE_LIB.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const desk = new THREE_LIB.Mesh(deskGeo, deskMat);
    desk.position.y = 0.35;
    pcGroup.add(desk);

    // Dual-Monitore
    const monStandGeo = new THREE_LIB.CylinderGeometry(0.04, 0.08, 0.28, 8);
    const monStand = new THREE_LIB.Mesh(monStandGeo, deskMat);
    monStand.position.set(0, 0.75, 0);
    pcGroup.add(monStand);

    const screenGeo = new THREE_LIB.BoxGeometry(0.55, 0.38, 0.04);
    const screenMat = new THREE_LIB.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0f172a,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });

    const screenLeft = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenLeft.position.set(-0.3, 0.98, 0.05);
    screenLeft.rotation.y = 0.15;
    screenLeft.userData = { type: 'pc', pcId: pc.id, deptId: dept.id, name: pc.name, easy_explanation: pc.easy_explanation };
    pcGroup.add(screenLeft);
    interactiveObjects.push(screenLeft);

    const screenRight = new THREE_LIB.Mesh(screenGeo, screenMat.clone());
    screenRight.position.set(0.3, 0.98, 0.05);
    screenRight.rotation.y = -0.15;
    screenRight.userData = { type: 'pc', pcId: pc.id, deptId: dept.id, name: pc.name, easy_explanation: pc.easy_explanation };
    pcGroup.add(screenRight);
    interactiveObjects.push(screenRight);

    // Tastatur
    const kbGeo = new THREE_LIB.BoxGeometry(0.45, 0.02, 0.18);
    const kbMat = new THREE_LIB.MeshStandardMaterial({ color: 0x334155 });
    const kb = new THREE_LIB.Mesh(kbGeo, kbMat);
    kb.position.set(0, 0.71, 0.15);
    pcGroup.add(kb);

    // Bürostuhl
    const chairGeo = new THREE_LIB.CylinderGeometry(0.28, 0.28, 0.45, 12);
    const chairMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    const chair = new THREE_LIB.Mesh(chairGeo, chairMat);
    chair.position.set(0, 0.23, 0.55);
    pcGroup.add(chair);

    // Entwickler-Avatar
    const avatar = createStylizedDeveloperAvatar(THREE_LIB, dept.color, false);
    avatar.position.set(0, 0.23, 0.55);
    pcGroup.add(avatar);
    developerAvatars.push(avatar);

    pcMeshMap[pc.id] = {
      screenLeft,
      screenRight,
      avatarArms: avatar.userData.arms
    };

    podGroup.add(pcGroup);
  });
}

function createStylizedDeveloperAvatar(THREE_LIB, deptColorHex, isChef = false) {
  const avatarGroup = new THREE_LIB.Group();

  const torsoColor = isChef ? 0x0f172a : parseInt(deptColorHex.replace('#', '0x'), 16);
  const torsoGeo = new THREE_LIB.BoxGeometry(0.42, 0.55, 0.28);
  const torsoMat = new THREE_LIB.MeshStandardMaterial({ color: torsoColor, roughness: 0.7 });
  const torso = new THREE_LIB.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.5;
  avatarGroup.add(torso);

  const headGeo = new THREE_LIB.SphereGeometry(0.18, 16, 16);
  const headMat = new THREE_LIB.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 });
  const head = new THREE_LIB.Mesh(headGeo, headMat);
  head.position.y = 0.9;
  avatarGroup.add(head);

  const hairGeo = new THREE_LIB.BoxGeometry(0.38, 0.15, 0.38);
  const hairMat = new THREE_LIB.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const hair = new THREE_LIB.Mesh(hairGeo, hairMat);
  hair.position.y = 1.0;
  avatarGroup.add(hair);

  const armsGroup = new THREE_LIB.Group();
  [-1, 1].forEach((side) => {
    const armGeo = new THREE_LIB.CylinderGeometry(0.06, 0.05, 0.35, 8);
    const arm = new THREE_LIB.Mesh(armGeo, torsoMat);
    arm.position.set(side * 0.24, 0.42, -0.15);
    arm.rotation.x = Math.PI / 2.8;
    armsGroup.add(arm);
  });
  avatarGroup.add(armsGroup);
  avatarGroup.userData = { arms: armsGroup, isChef };

  return avatarGroup;
}

function setupDataPipelines(THREE_LIB, hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 28;

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const endX = Math.cos(angle) * (radius - 5.2);
    const endZ = Math.sin(angle) * (radius - 5.2);
    const startX = Math.cos(angle) * 5.2;
    const startZ = Math.sin(angle) * 5.2;

    const points = [
      new THREE_LIB.Vector3(startX, 0.06, startZ),
      new THREE_LIB.Vector3(endX, 0.06, endZ)
    ];
    const lineGeo = new THREE_LIB.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE_LIB.LineBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.5
    });
    const line = new THREE_LIB.Line(lineGeo, lineMat);
    scene.add(line);

    const pGeo = new THREE_LIB.SphereGeometry(0.22, 12, 12);
    const pMat = new THREE_LIB.MeshBasicMaterial({ color: 0x38bdf8 });
    const p = new THREE_LIB.Mesh(pGeo, pMat);
    p.position.set(startX, 0.1, startZ);
    scene.add(p);

    dataParticleStreams.push({
      mesh: p,
      start: new THREE_LIB.Vector3(startX, 0.1, startZ),
      end: new THREE_LIB.Vector3(endX, 0.1, endZ),
      progress: Math.random(),
      speed: 0.005 + Math.random() * 0.004
    });
  });
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
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 14);
        if (onAgentClick) onAgentClick(data.pcId, 'pc', data.deptId);
      } else if (data.type === 'chef') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 14);
        if (onAgentClick) onAgentClick(data.chefId, 'chef', data.deptId);
      } else if (data.type === 'department') {
        zoomToPosition(THREE_LIB, hit.getWorldPosition(new THREE_LIB.Vector3()), 20);
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

function zoomToPosition(THREE_LIB, targetVec, distance = 15) {
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
      targetCameraPos = new THREE.Vector3(0, 38, 48);
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
      screenLeft.material.emissive.setHex(0x1e3a8a);
      screenLeft.material.emissiveIntensity = 0.5;
      screenRight.material.emissive.setHex(0x1e3a8a);
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
  if (decisionTerminalScreen) {
    if (stageNum === 4) {
      decisionTerminalScreen.material.emissive.setHex(0x10b981);
      decisionTerminalScreen.material.emissiveIntensity = 2.8;
    } else {
      decisionTerminalScreen.material.emissive.setHex(0x06b6d4);
      decisionTerminalScreen.material.emissiveIntensity = 0.8;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  if (trevorGroup && !isQuietMode) {
    trevorGroup.position.y = Math.sin(time * 2.2) * 0.06;
    if (trevorArcLight) {
      trevorArcLight.intensity = 3.5 + Math.sin(time * 5.0) * 0.8;
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

  if (!isQuietMode) {
    dataParticleStreams.forEach(stream => {
      stream.progress += stream.speed;
      if (stream.progress > 1) stream.progress = 0;
      stream.mesh.position.lerpVectors(stream.start, stream.end, stream.progress);
    });
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
  const height = containerEl.clientHeight || Math.max(window.innerHeight - 170, 600) || 700;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
