/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * High-End 3D-Architektur-Campus (Three.js):
 * - Trevor als detailreicher Hero-Mech im Iron-Man-Stil (Hot-Rod-Rot, Gold, Arc-Reactor & leuchtende Augen)
 * - 10 realistische Büro-Pods mit Holz-/Stein-Böden, Glas-Trennwänden, Grünpflanzen & Server-Racks
 * - 33 Schreibtisch-Inseln mit ergonomischen Stühlen, Dual-Widescreen-Monitoren und sitzenden 3D-Entwickler-Avataren
 * - 10 Chef-Terminals mit Amber-Audit-Beleuchtung
 * - Fließende Boden-Datenströme & pulsierende Monitore im Idle-Training (Blau/Gold) & Inferenz (Cyan)
 * - Raycaster-Klick auf PCs, Chefs oder Trevor mit sanftem Kamera-Flug
 */

let scene, camera, renderer, controls;
let containerEl;
let trevorGroup, trevorHead, trevorArcLight, trevorHands = [];
let decisionTerminalScreen;
const interactiveObjects = [];
const pcMeshMap = {};     // pcId -> { screenLeft, screenRight, avatarArms }
const chefMeshMap = {};   // chefId -> { screen, avatarArms }
const dataParticleStreams = [];
const blinkingLeds = [];
const developerAvatars = [];

let isQuietMode = false;
let targetCameraPos = null;
let targetLookAt = null;
let activeTaskStage = 0; // 0 = idle training, 1 = pc, 2 = chef, 3 = trevor, 4 = decision

/**
 * Initialisiert den fotorealistischen 3D-Campus
 */
export function init3DStudio(hierarchyData, onAgentClick, onTrevorClick) {
  containerEl = document.getElementById('threejs-canvas-container');
  if (!containerEl || !window.THREE) {
    console.warn('[Studio 3D] Container oder Three.js nicht bereit.');
    return;
  }

  // 1. Szene & Cyber-Nebel
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080e);
  scene.fog = new THREE.FogExp2(0x06080e, 0.010);

  // 2. Kamera (Isometrische Studio-Perspektive)
  const width = containerEl.clientWidth || 800;
  const height = containerEl.clientHeight || 600;
  camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 600);
  camera.position.set(0, 42, 58);

  // 3. Renderer mit sanften Schatten & Tone-Mapping
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const oldCanvas = containerEl.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  containerEl.appendChild(renderer.domElement);

  // 4. OrbitControls
  if (window.THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.target.set(0, 1.2, 0);
  }

  // 5. Studio-Beleuchtung
  setupCampusLighting();

  // 6. Campus-Boden & Cyber-Plaza
  setupCampusFloor();

  // 7. Trevor im Iron-Man Look (Zentrum)
  setupTrevorIronManMech();

  // 8. Die 10 realistischen Büro-Pods
  setupCampusDepartments(hierarchyData);

  // 9. Datenpipelines & Partikel
  setupDataPipelines(hierarchyData);

  // 10. Raycasting & Klicks
  setupRaycasting(onAgentClick, onTrevorClick);

  // 11. UI-Kamera-Buttons
  setupCameraButtons();

  // 12. Resize-Handler
  window.addEventListener('resize', onWindowResize);
  if (window.ResizeObserver) {
    new ResizeObserver(() => onWindowResize()).observe(containerEl);
  }

  // 13. Render-Loop starten
  animate();
  console.log('[Studio 3D] Realistischer Campus & Iron-Man Trevor erfolgreich initialisiert.');
}

/**
 * Beleuchtung: Warmes Studio-Licht gemischt mit Neon-Akzenten
 */
function setupCampusLighting() {
  const ambientLight = new THREE.AmbientLight(0x1e293b, 1.3);
  scene.add(ambientLight);

  const keySpot = new THREE.SpotLight(0xf8fafc, 2.2);
  keySpot.position.set(30, 50, 35);
  keySpot.angle = Math.PI / 3.2;
  keySpot.penumbra = 0.8;
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.width = 2048;
  keySpot.shadow.mapSize.height = 2048;
  scene.add(keySpot);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
  fillLight.position.set(-30, 20, -30);
  scene.add(fillLight);
}

/**
 * Campus-Boden (Edle Schiefer-Plaza mit konzentrischen Leuchtringen)
 */
function setupCampusFloor() {
  const floorGeo = new THREE.CylinderGeometry(44, 44, 0.4, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.65,
    metalness: 0.25
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Feine, leuchtende Boden-Ringe
  for (let r = 7; r <= 40; r += 7) {
    const ringGeo = new THREE.RingGeometry(r - 0.04, r + 0.04, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x1f2937,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
  }

  // Dezent rote Plaza-Gitterlinie
  const grid = new THREE.GridHelper(84, 42, 0xdc2626, 0x1e293b);
  grid.position.y = 0.01;
  grid.material.opacity = 0.16;
  grid.material.transparent = true;
  scene.add(grid);
}

/**
 * Trevor als detailreicher 3D-Hero-Mech im Iron-Man Look
 */
function setupTrevorIronManMech() {
  trevorGroup = new THREE.Group();
  trevorGroup.position.set(0, 0, 0);

  // 1. Achteckiges Kommando-Podest (Dunkelgrau mit Gold-Kante)
  const podestGeo = new THREE.CylinderGeometry(5.2, 5.6, 0.7, 8);
  const podestMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.7
  });
  const podest = new THREE.Mesh(podestGeo, podestMat);
  podest.position.y = 0.35;
  podest.receiveShadow = true;
  trevorGroup.add(podest);

  // Karmesinrot-Goldener Leuchtring um das Podest
  const edgeGeo = new THREE.TorusGeometry(5.2, 0.07, 8, 8);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.71;
  trevorGroup.add(edge);

  // Holografischer runder Steuerungstisch vor Trevor
  const tableGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32);
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6
  });
  const holoTable = new THREE.Mesh(tableGeo, tableMat);
  holoTable.position.set(0, 1.8, 1.2);
  trevorGroup.add(holoTable);

  // --- IRON-MAN RÜSTUNGS-MATERIALIEN ---
  const redArmorMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.2,
    metalness: 0.85
  });

  const goldArmorMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.25,
    metalness: 0.9
  });

  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.5,
    metalness: 0.8
  });

  // Mech-Torso (Brustpanzer)
  const mechBody = new THREE.Group();
  mechBody.position.set(0, 2.5, 0);

  const chestGeo = new THREE.BoxGeometry(1.2, 1.4, 0.9);
  const chest = new THREE.Mesh(chestGeo, redArmorMat);
  chest.castShadow = true;
  mechBody.add(chest);

  // Goldene Rippen / Seitenplatten
  const ribLeftGeo = new THREE.BoxGeometry(0.2, 0.9, 0.85);
  const ribLeft = new THREE.Mesh(ribLeftGeo, goldArmorMat);
  ribLeft.position.set(-0.55, 0, 0);
  mechBody.add(ribLeft);

  const ribRight = new THREE.Mesh(ribLeftGeo, goldArmorMat);
  ribRight.position.set(0.55, 0, 0);
  mechBody.add(ribRight);

  // ARC-REACTOR in der Brust (Hell strahlend Cyan/Weiß)
  const arcRingGeo = new THREE.TorusGeometry(0.22, 0.04, 16, 32);
  const arcRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const arcRing = new THREE.Mesh(arcRingGeo, arcRingMat);
  arcRing.position.set(0, 0.22, 0.47);
  mechBody.add(arcRing);

  const arcCoreGeo = new THREE.CircleGeometry(0.18, 24);
  const arcCoreMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const arcCore = new THREE.Mesh(arcCoreGeo, arcCoreMat);
  arcCore.position.set(0, 0.22, 0.48);
  mechBody.add(arcCore);

  trevorArcLight = new THREE.PointLight(0x38bdf8, 3.5, 12);
  trevorArcLight.position.set(0, 0.22, 0.8);
  mechBody.add(trevorArcLight);

  // IRON-MAN HELM
  trevorHead = new THREE.Group();
  trevorHead.position.set(0, 0.95, 0);

  const helmetBaseGeo = new THREE.BoxGeometry(0.7, 0.8, 0.75);
  const helmetBase = new THREE.Mesh(helmetBaseGeo, redArmorMat);
  trevorHead.add(helmetBase);

  // Goldene Gesichtsplatte
  const faceplateGeo = new THREE.BoxGeometry(0.55, 0.65, 0.1);
  const faceplate = new THREE.Mesh(faceplateGeo, goldArmorMat);
  faceplate.position.set(0, -0.05, 0.36);
  trevorHead.add(faceplate);

  // Leuchtende blaue Augen-Schlitze
  const eyeGeo = new THREE.PlaneGeometry(0.14, 0.035);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });

  const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
  eyeLeft.position.set(-0.15, -0.02, 0.42);
  eyeLeft.rotation.z = -0.05;
  trevorHead.add(eyeLeft);

  const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeRight.position.set(0.15, -0.02, 0.42);
  eyeRight.rotation.z = 0.05;
  trevorHead.add(eyeRight);

  mechBody.add(trevorHead);

  // Schultern & Arme mit Repulsoren über dem Tisch
  [-1, 1].forEach((side) => {
    // Schulter-Panzerung (Gold/Rot)
    const shoulderGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const shoulder = new THREE.Mesh(shoulderGeo, goldArmorMat);
    shoulder.position.set(side * 0.85, 0.45, 0);
    mechBody.add(shoulder);

    // Oberarm & Unterarm (abgewinkelt zum Tisch)
    const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.7, 12);
    const arm = new THREE.Mesh(armGeo, redArmorMat);
    arm.position.set(side * 0.95, 0.05, 0.2);
    arm.rotation.x = Math.PI / 4;
    mechBody.add(arm);

    // Repulsor-Handfläche (Leuchtend über Tisch)
    const handGeo = new THREE.BoxGeometry(0.2, 0.1, 0.25);
    const hand = new THREE.Mesh(handGeo, goldArmorMat);
    hand.position.set(side * 0.6, -0.4, 0.8);
    mechBody.add(hand);

    const repulsorGeo = new THREE.CircleGeometry(0.08, 16);
    const repulsorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const repulsor = new THREE.Mesh(repulsorGeo, repulsorMat);
    repulsor.rotation.x = Math.PI / 2;
    repulsor.position.set(side * 0.6, -0.46, 0.8);
    mechBody.add(repulsor);
    trevorHands.push(repulsor);
  });

  // Beine / Standfestigkeit auf dem Podest
  [-1, 1].forEach((side) => {
    const legGeo = new THREE.CylinderGeometry(0.18, 0.16, 1.4, 12);
    const leg = new THREE.Mesh(legGeo, redArmorMat);
    leg.position.set(side * 0.4, -1.2, 0);
    mechBody.add(leg);

    const kneeGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const knee = new THREE.Mesh(kneeGeo, goldArmorMat);
    knee.position.set(side * 0.4, -1.1, 0.1);
    mechBody.add(knee);
  });

  // Klick-Target für Trevor
  mechBody.userData = { type: 'trevor', name: 'Trevor (Director)' };
  interactiveObjects.push(chest);
  interactiveObjects.push(helmetBase);
  trevorGroup.add(mechBody);

  // 3D Terminal "Deine Entscheidungen"
  const terminalGroup = new THREE.Group();
  terminalGroup.position.set(0, 0.7, 3.8);

  const standGeo = new THREE.BoxGeometry(0.9, 1.1, 0.4);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.y = 0.55;
  terminalGroup.add(stand);

  const screenGeo = new THREE.BoxGeometry(1.5, 0.85, 0.1);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  decisionTerminalScreen = new THREE.Mesh(screenGeo, screenMat);
  decisionTerminalScreen.position.set(0, 1.2, 0);
  decisionTerminalScreen.rotation.x = -Math.PI / 6;
  decisionTerminalScreen.userData = { type: 'decision_terminal', name: 'Deine Entscheidungen' };
  interactiveObjects.push(decisionTerminalScreen);
  terminalGroup.add(decisionTerminalScreen);

  trevorGroup.add(terminalGroup);
  scene.add(trevorGroup);
}

/**
 * 10 realistische Architektur-Büros mit Arbeitsplätzen & Avataren
 */
function setupCampusDepartments(hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 28;

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    const podGroup = new THREE.Group();
    podGroup.position.set(posX, 0, posZ);
    podGroup.lookAt(0, 0, 0);

    // 1. Büro-Bodenplatte je nach Raum-Typ (Wood, Stone, Tech-Server)
    let floorMat;
    if (dept.floor_type === 'wood') {
      // Warmes Edelholz-Parkett
      floorMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.4, metalness: 0.1 });
    } else if (dept.floor_type === 'tech_servers') {
      // High-Tech Fliese mit schwarzem Rahmen
      floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.6 });
    } else {
      // Eleganter Schiefer-Steinboden
      floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 });
    }

    const plateGeo = new THREE.CylinderGeometry(5.2, 5.5, 0.35, 24);
    const plate = new THREE.Mesh(plateGeo, floorMat);
    plate.position.y = 0.17;
    plate.receiveShadow = true;
    plate.userData = { type: 'department', deptId: dept.id, name: dept.name, easy_explanation: dept.easy_explanation };
    interactiveObjects.push(plate);
    podGroup.add(plate);

    // Kantenleiste in Abteilungsfarbe
    const deptColor = parseInt(dept.color.replace('#', '0x'), 16);
    const borderGeo = new THREE.TorusGeometry(5.2, 0.06, 8, 32);
    const borderMat = new THREE.MeshBasicMaterial({ color: deptColor });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = Math.PI / 2;
    border.position.y = 0.36;
    podGroup.add(border);

    // 2. Schwarze Aluminium-Rahmen & transparente Glas-Wände
    const glassGeo = new THREE.CylinderGeometry(5.0, 5.0, 2.0, 24, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.7,
      ior: 1.4,
      side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 1.25;
    podGroup.add(glass);

    // 3. Raum-Spezifische Requisiten (Pflanzen, Server-Racks, Design-Boards)
    setupRoomProps(podGroup, dept);

    // 4. Chef-Agenten Terminal (Stufe 02) am Eingang
    setupChefStation(podGroup, dept);

    // 5. 3 bis 4 Spezial-PCs mit sitzenden 3D-Entwickler-Avataren (Stufe 01)
    setupSpecialistPcWorkstations(podGroup, dept);

    scene.add(podGroup);
  });
}

/**
 * Erzeugt Büro-Requisiten (Pflanzen, Server-Racks mit LEDs, Whiteboards)
 */
function setupRoomProps(podGroup, dept) {
  // Grünpflanze in der Ecke
  const potGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.6, 12);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(-3.6, 0.5, 1.8);
  podGroup.add(pot);

  const plantGeo = new THREE.DodecahedronGeometry(0.55, 1);
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const plant = new THREE.Mesh(plantGeo, plantMat);
  plant.position.set(-3.6, 0.95, 1.8);
  podGroup.add(plant);

  // Server-Racks im Backend (Raum 5) und Datenbank-Raum (Raum 6)
  if (dept.id === 5 || dept.id === 6 || dept.id === 8) {
    const rackGeo = new THREE.BoxGeometry(0.9, 2.2, 0.7);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.8, roughness: 0.3 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(3.6, 1.2, 1.5);
    podGroup.add(rack);

    // Blinkende LEDs auf dem Server-Rack
    for (let i = 0; i < 4; i++) {
      const ledGeo = new THREE.CircleGeometry(0.04, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x10b981 : 0x06b6d4 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(3.6 - 0.2 + (i * 0.12), 1.8, 1.86);
      led.rotation.y = -Math.PI / 2;
      podGroup.add(led);
      blinkingLeds.push(led);
    }
  }

  // Design-Whiteboard in Raum 3 (Optik) und Raum 1 (Planung)
  if (dept.id === 1 || dept.id === 3) {
    const boardGeo = new THREE.BoxGeometry(1.6, 1.2, 0.05);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(3.4, 1.5, 1.5);
    board.rotation.y = -Math.PI / 3;
    podGroup.add(board);
  }
}

/**
 * Chef-Agenten Station mit Schreibtisch & Monitor
 */
function setupChefStation(podGroup, dept) {
  const chef = dept.chef_agent;
  const chefGroup = new THREE.Group();
  chefGroup.position.set(0, 0.35, 3.2);

  // Schreibtisch
  const deskGeo = new THREE.BoxGeometry(1.8, 0.8, 0.7);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.y = 0.4;
  chefGroup.add(desk);

  // Monitor (Amber Audit Leuchte)
  const screenGeo = new THREE.BoxGeometry(1.3, 0.65, 0.08);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x1e293b,
    emissiveIntensity: 0.5,
    roughness: 0.2
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
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

  // Chef-Avatar (Stilisierter Charakter hinter dem Schreibtisch)
  const avatar = createStylizedDeveloperAvatar(dept.color, true);
  avatar.position.set(0, 0.1, 0.55);
  chefGroup.add(avatar);

  chefMeshMap[chef.id] = { screen, avatarArms: avatar.userData.arms };
  podGroup.add(chefGroup);
}

/**
 * Spezial-PC Arbeitsplätze mit Dual-Monitoren & sitzendem 3D-Entwickler
 */
function setupSpecialistPcWorkstations(podGroup, dept) {
  const pcCount = dept.specialist_pcs.length;

  dept.specialist_pcs.forEach((pc, idx) => {
    const pcGroup = new THREE.Group();
    const angle = -Math.PI * 0.4 + (idx / (pcCount - 1 || 1)) * (Math.PI * 0.8);
    const dist = 2.65;
    const posX = Math.sin(angle) * dist;
    const posZ = -Math.cos(angle) * dist;

    pcGroup.position.set(posX, 0.35, posZ);
    pcGroup.rotation.y = angle + Math.PI;

    // 1. Schreibtisch
    const deskGeo = new THREE.BoxGeometry(1.3, 0.7, 0.65);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.y = 0.35;
    pcGroup.add(desk);

    // 2. Dual-Widescreen-Monitore (leicht zueinander angewinkelt)
    const monStandGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.28, 8);
    const monStand = new THREE.Mesh(monStandGeo, deskMat);
    monStand.position.set(0, 0.75, 0);
    pcGroup.add(monStand);

    const screenGeo = new THREE.BoxGeometry(0.55, 0.38, 0.04);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0f172a,
      emissiveIntensity: 0.4,
      roughness: 0.2
    });

    const screenLeft = new THREE.Mesh(screenGeo, screenMat.clone());
    screenLeft.position.set(-0.3, 0.98, 0.05);
    screenLeft.rotation.y = 0.15;
    screenLeft.userData = { type: 'pc', pcId: pc.id, deptId: dept.id, name: pc.name, easy_explanation: pc.easy_explanation };
    pcGroup.add(screenLeft);
    interactiveObjects.push(screenLeft);

    const screenRight = new THREE.Mesh(screenGeo, screenMat.clone());
    screenRight.position.set(0.3, 0.98, 0.05);
    screenRight.rotation.y = -0.15;
    screenRight.userData = { type: 'pc', pcId: pc.id, deptId: dept.id, name: pc.name, easy_explanation: pc.easy_explanation };
    pcGroup.add(screenRight);
    interactiveObjects.push(screenRight);

    // Tastatur auf Schreibtisch
    const kbGeo = new THREE.BoxGeometry(0.45, 0.02, 0.18);
    const kbMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const kb = new THREE.Mesh(kbGeo, kbMat);
    kb.position.set(0, 0.71, 0.15);
    pcGroup.add(kb);

    // 3. Ergonomischer Bürostuhl mit Entwickler-Avatar
    const chairGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.45, 12);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    const chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(0, 0.23, 0.55);
    pcGroup.add(chair);

    // 3D-Entwickler-Avatar
    const avatar = createStylizedDeveloperAvatar(dept.color, false);
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

/**
 * Erzeugt einen stilisierten 3D-Entwickler-Charakter (Kopf, Torso mit Hoodie/Shirt, Arme)
 */
function createStylizedDeveloperAvatar(deptColorHex, isChef = false) {
  const avatarGroup = new THREE.Group();

  // Torso / Kleidung
  const torsoColor = isChef ? 0x0f172a : parseInt(deptColorHex.replace('#', '0x'), 16);
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.55, 0.28);
  const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.7 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.5;
  avatarGroup.add(torso);

  // Kopf / Gesicht
  const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 }); // Soft avatar skin
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.9;
  avatarGroup.add(head);

  // Haare / Mütze
  const hairGeo = new THREE.BoxGeometry(0.38, 0.15, 0.38);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.y = 1.0;
  avatarGroup.add(hair);

  // Arme auf dem Schreibtisch (zum Animieren beim Tippen)
  const armsGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8);
    const arm = new THREE.Mesh(armGeo, torsoMat);
    arm.position.set(side * 0.24, 0.42, -0.15);
    arm.rotation.x = Math.PI / 2.8;
    armsGroup.add(arm);
  });
  avatarGroup.add(armsGroup);
  avatarGroup.userData = { arms: armsGroup, isChef };

  return avatarGroup;
}

/**
 * Boden-Datenleitungen & Partikelströme
 */
function setupDataPipelines(hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 28;

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const endX = Math.cos(angle) * (radius - 5.2);
    const endZ = Math.sin(angle) * (radius - 5.2);
    const startX = Math.cos(angle) * 5.2;
    const startZ = Math.sin(angle) * 5.2;

    const points = [
      new THREE.Vector3(startX, 0.06, startZ),
      new THREE.Vector3(endX, 0.06, endZ)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.45
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Fließende Datenpaket-Kugel
    const pGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(startX, 0.1, startZ);
    scene.add(p);

    dataParticleStreams.push({
      mesh: p,
      start: new THREE.Vector3(startX, 0.1, startZ),
      end: new THREE.Vector3(endX, 0.1, endZ),
      progress: Math.random(),
      speed: 0.005 + Math.random() * 0.004
    });
  });
}

/**
 * Raycasting Klick-Events
 */
function setupRaycasting(onAgentClick, onTrevorClick) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

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
        zoomToPosition(hit.getWorldPosition(new THREE.Vector3()), 14);
        if (onAgentClick) onAgentClick(data.pcId, 'pc', data.deptId);
      } else if (data.type === 'chef') {
        zoomToPosition(hit.getWorldPosition(new THREE.Vector3()), 14);
        if (onAgentClick) onAgentClick(data.chefId, 'chef', data.deptId);
      } else if (data.type === 'department') {
        zoomToPosition(hit.getWorldPosition(new THREE.Vector3()), 20);
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

function zoomToPosition(targetVec, distance = 15) {
  targetLookAt = targetVec.clone();
  targetCameraPos = targetVec.clone().add(new THREE.Vector3(0, distance * 0.7, distance));
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
      targetCameraPos = new THREE.Vector3(0, 42, 58);
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

/**
 * Status-Updates in Echtzeit
 */
export function updateAgentStatusIn3D(agentId, type, status) {
  if (type === 'pc' && pcMeshMap[agentId]) {
    const { screenLeft, screenRight, avatarArms } = pcMeshMap[agentId];
    if (status === 'working') {
      screenLeft.material.emissive.setHex(0x06b6d4); // Cyan Leuchten
      screenLeft.material.emissiveIntensity = 2.2;
      screenRight.material.emissive.setHex(0x06b6d4);
      screenRight.material.emissiveIntensity = 2.2;
      if (avatarArms) avatarArms.position.y = 0.05; // Tipp-Aktivität
    } else if (status === 'done') {
      screenLeft.material.emissive.setHex(0x10b981); // Smaragdgrün
      screenLeft.material.emissiveIntensity = 1.0;
      screenRight.material.emissive.setHex(0x10b981);
      screenRight.material.emissiveIntensity = 1.0;
    } else {
      // Idle / Training
      screenLeft.material.emissive.setHex(0x1e3a8a); // Blau
      screenLeft.material.emissiveIntensity = 0.5;
      screenRight.material.emissive.setHex(0x1e3a8a);
      screenRight.material.emissiveIntensity = 0.5;
    }
  } else if (type === 'chef' && chefMeshMap[agentId]) {
    const { screen, avatarArms } = chefMeshMap[agentId];
    if (status === 'auditing') {
      screen.material.emissive.setHex(0xf59e0b); // Amber Audit
      screen.material.emissiveIntensity = 2.5;
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
  activeTaskStage = stageNum;
  if (decisionTerminalScreen) {
    if (stageNum === 4) {
      decisionTerminalScreen.material.emissive.setHex(0x10b981); // Grün
      decisionTerminalScreen.material.emissiveIntensity = 2.8;
    } else {
      decisionTerminalScreen.material.emissive.setHex(0x06b6d4);
      decisionTerminalScreen.material.emissiveIntensity = 0.8;
    }
  }
}

/**
 * Render Loop mit flüssigen Animationen
 */
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // 1. Trevor Iron-Man Atmen & Arc-Reactor Pulsieren
  if (trevorGroup && !isQuietMode) {
    trevorGroup.position.y = Math.sin(time * 2.2) * 0.06;
    if (trevorArcLight) {
      trevorArcLight.intensity = 3.0 + Math.sin(time * 5.0) * 0.8;
    }
    // Repulsor-Hände leicht pulsieren
    trevorHands.forEach(h => {
      h.material.opacity = 0.7 + Math.sin(time * 4) * 0.3;
    });
  }

  // 2. Blinkende Server-LEDs
  if (!isQuietMode && blinkingLeds.length > 0) {
    blinkingLeds.forEach((led, i) => {
      led.visible = Math.sin(time * 6 + i) > 0;
    });
  }

  // 3. Fließende Datenströme
  if (!isQuietMode) {
    dataParticleStreams.forEach(stream => {
      stream.progress += stream.speed;
      if (stream.progress > 1) stream.progress = 0;
      stream.mesh.position.lerpVectors(stream.start, stream.end, stream.progress);
    });
  }

  // 4. Sanfter Kameraflug bei Klick
  if (targetCameraPos && targetLookAt) {
    camera.position.lerp(targetCameraPos, 0.06);
    if (controls) controls.target.lerp(targetLookAt, 0.06);
    if (camera.position.distanceTo(targetCameraPos) < 0.2) {
      targetCameraPos = null;
      targetLookAt = null;
    }
  }

  if (controls) controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  if (!containerEl || !camera || !renderer) return;
  const width = containerEl.clientWidth || 800;
  const height = containerEl.clientHeight || 600;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
