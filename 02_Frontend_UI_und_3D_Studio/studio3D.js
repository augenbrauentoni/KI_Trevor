/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/studio3D.js
 * 
 * Interaktiver Three.js 3D-Campus:
 * - 10 kreisförmig angeordnete Abteilungs-Pods (Hexagon-Boden, Glaswände, leuchtende Kanten)
 * - 33 Spezial-PCs mit Schreibtischen, Stühlen und Status-Monitoren (Cyan bei Berechnung)
 * - 10 Chef-Terminals mit Amber-Audit-Leuchten
 * - Trevors Command Core im Zentrum (Crimson-Red Energiekern, rotierende Ringe)
 * - Interaktives 3D-Terminal "Deine Entscheidungen"
 * - Animierte Boden-Datenleitungen & fließende Lichtpakete
 * - Raycaster Klick-Events mit sanftem Kamera-Zoom & Agent-Log-Aufruf
 * - Ruhige Ansicht (Quiet Mode) & vollständige UI-Kamerasteuerung
 */

// Globale 3D-Zustände & Referenzen
let scene, camera, renderer, controls;
let containerEl;
let trevorCoreMesh, trevorRings = [];
let decisionTerminalScreen;
const interactiveObjects = [];
const pcMeshMap = {}; // pcId -> screenMesh
const chefMeshMap = {}; // chefId -> consoleMesh
const dataParticleStreams = [];

let isQuietMode = false;
let targetCameraPos = null;
let targetLookAt = null;

/**
 * Initialisiert die Three.js Szene
 */
export function init3DStudio(hierarchyData, onAgentClick, onTrevorClick) {
  containerEl = document.getElementById('threejs-canvas-container');
  if (!containerEl || !window.THREE) {
    console.warn('[Studio 3D] Container oder THREE.js nicht verfügbar.');
    return;
  }

  // 1. Szene & Nebel
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090e);
  scene.fog = new THREE.FogExp2(0x07090e, 0.012);

  // 2. Kamera
  const width = containerEl.clientWidth || 800;
  const height = containerEl.clientHeight || 600;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
  camera.position.set(0, 38, 54);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Lösche vorherige Canvas-Elemente
  const existingCanvas = containerEl.querySelector('canvas');
  if (existingCanvas) existingCanvas.remove();
  containerEl.appendChild(renderer.domElement);

  // 4. OrbitControls
  if (window.THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Boden nicht von unten sehen
    controls.minDistance = 8;
    controls.maxDistance = 110;
    controls.target.set(0, 1, 0);
  }

  // 5. Beleuchtung
  setupStudioLighting();

  // 6. Cybernetic Floor & Grid
  setupStudioFloor();

  // 7. Trevors Central Command Core (Zentrum)
  setupTrevorCommandCore();

  // 8. Die 10 Abteilungen (Stern-/Ringförmig)
  setupDepartmentPods(hierarchyData);

  // 9. Boden-Datenleitungen & Partikel-Streams
  setupDataPipelines(hierarchyData);

  // 10. Raycasting & Klick-Interaktion
  setupRaycasting(onAgentClick, onTrevorClick);

  // 11. UI-Kamera-Buttons verknüpfen
  setupCameraButtons();

  // 12. Resize-Observer
  window.addEventListener('resize', onWindowResize);
  if (window.ResizeObserver) {
    new ResizeObserver(() => onWindowResize()).observe(containerEl);
  }

  // 13. Render-Loop starten
  animate();

  console.log('[Studio 3D] Three.js Campus erfolgreich initialisiert (10 Pods, 33 PCs, Trevor Core).');
}

/**
 * Beleuchtungs-Setup: Dark Cyber Command
 */
function setupStudioLighting() {
  // Weiches Slate-Umgebungslicht
  const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
  scene.add(ambientLight);

  // Haupt-Spotlight schräg von oben
  const mainSpot = new THREE.SpotLight(0xe2e8f0, 2.0);
  mainSpot.position.set(25, 45, 30);
  mainSpot.angle = Math.PI / 3.5;
  mainSpot.penumbra = 0.8;
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.width = 2048;
  mainSpot.shadow.mapSize.height = 2048;
  scene.add(mainSpot);

  // Trevors zentrales karmesinrotes Punktlicht
  const trevorPointLight = new THREE.PointLight(0xef4444, 4.0, 30);
  trevorPointLight.position.set(0, 3.5, 0);
  scene.add(trevorPointLight);
}

/**
 * High-Tech Cyber Grid & Floor
 */
function setupStudioFloor() {
  // Dunkle Boden-Basis
  const floorGeo = new THREE.CylinderGeometry(42, 42, 0.4, 48);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.7,
    metalness: 0.3
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Konzentrische Cyber-Ringe
  for (let r = 8; r <= 38; r += 7) {
    const ringGeo = new THREE.RingGeometry(r - 0.05, r + 0.05, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x1f2937,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.02;
    scene.add(ringMesh);
  }

  // Dezent leuchtendes Cyber-Hexagon-Raster
  const gridHelper = new THREE.GridHelper(80, 40, 0xef4444, 0x1f2937);
  gridHelper.position.y = 0.01;
  gridHelper.material.opacity = 0.18;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);
}

/**
 * Trevors Command Core im Zentrum (Achteck-Plattform, Energiekern, Terminal)
 */
function setupTrevorCommandCore() {
  const coreGroup = new THREE.Group();

  // 1. Erhöhte achteckige Plattform
  const platGeo = new THREE.CylinderGeometry(5.2, 5.8, 0.6, 8);
  const platMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.6
  });
  const platform = new THREE.Mesh(platGeo, platMat);
  platform.position.y = 0.3;
  platform.receiveShadow = true;
  coreGroup.add(platform);

  // Leuchtende Podest-Kante (Karmesinrot)
  const edgeGeo = new THREE.TorusGeometry(5.2, 0.08, 8, 8);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.61;
  coreGroup.add(edge);

  // 2. Trevors schwebender Energiekern
  const sphereGeo = new THREE.SphereGeometry(1.1, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.8
  });
  trevorCoreMesh = new THREE.Mesh(sphereGeo, sphereMat);
  trevorCoreMesh.position.y = 2.4;
  trevorCoreMesh.castShadow = true;
  trevorCoreMesh.userData = { type: 'trevor', name: 'Trevor Core' };
  interactiveObjects.push(trevorCoreMesh);
  coreGroup.add(trevorCoreMesh);

  // 3. Rotierende Hologramm-Ringe
  const ring1Geo = new THREE.TorusGeometry(1.8, 0.04, 16, 64);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.85 });
  const ring1 = new THREE.Mesh(ring1Geo, ringMat1);
  ring1.position.y = 2.4;
  coreGroup.add(ring1);
  trevorRings.push({ mesh: ring1, rotX: 0.015, rotY: 0.02, rotZ: 0.005 });

  const ring2Geo = new THREE.TorusGeometry(2.3, 0.03, 16, 64);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 });
  const ring2 = new THREE.Mesh(ring2Geo, ringMat2);
  ring2.position.y = 2.4;
  ring2.rotation.x = Math.PI / 3;
  coreGroup.add(ring2);
  trevorRings.push({ mesh: ring2, rotX: -0.01, rotY: 0.012, rotZ: 0.018 });

  // 4. Interaktives 3D-Terminal "Deine Entscheidungen"
  const terminalGroup = new THREE.Group();
  terminalGroup.position.set(0, 0.6, 3.8);

  const standGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.y = 0.5;
  terminalGroup.add(stand);

  // Schräger Terminal-Monitor
  const screenGeo = new THREE.BoxGeometry(1.4, 0.8, 0.1);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.8,
    roughness: 0.3
  });
  decisionTerminalScreen = new THREE.Mesh(screenGeo, screenMat);
  decisionTerminalScreen.position.set(0, 1.1, 0);
  decisionTerminalScreen.rotation.x = -Math.PI / 6;
  decisionTerminalScreen.userData = { type: 'decision_terminal', name: 'Deine Entscheidungen' };
  interactiveObjects.push(decisionTerminalScreen);
  terminalGroup.add(decisionTerminalScreen);

  coreGroup.add(terminalGroup);
  scene.add(coreGroup);
}

/**
 * 10 kreisförmige Abteilungs-Pods mit Arbeitsplätzen & Chef-Terminals
 */
function setupDepartmentPods(hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 28;

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    const podGroup = new THREE.Group();
    podGroup.position.set(posX, 0, posZ);

    // Ausrichtung des Raums zur Mitte (Trevor)
    podGroup.lookAt(0, 0, 0);

    // 1. Pod-Bodenplatte (Dark Glass Plate mit abgerundeter Kontur)
    const plateGeo = new THREE.CylinderGeometry(5.2, 5.5, 0.3, 16);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0d131f,
      roughness: 0.6,
      metalness: 0.4
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.15;
    plate.receiveShadow = true;
    plate.userData = { type: 'department', deptId: dept.id, name: dept.name };
    interactiveObjects.push(plate);
    podGroup.add(plate);

    // Leuchtender Außenrand im Farbcode der Abteilung
    const deptColorHex = parseInt(dept.color.replace('#', '0x'), 16);
    const borderGeo = new THREE.TorusGeometry(5.2, 0.05, 8, 32);
    const borderMat = new THREE.MeshBasicMaterial({ color: deptColorHex });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = Math.PI / 2;
    border.position.y = 0.31;
    podGroup.add(border);

    // 2. Halbtransparente Glas-Trennwände
    const wallGeo = new THREE.CylinderGeometry(5.0, 5.0, 1.8, 16, 1, true, -Math.PI / 1.5, Math.PI * 1.33);
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.4,
      side: THREE.DoubleSide
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 1.05;
    podGroup.add(wall);

    // 3. Chef-Agenten Terminal (Stufe 02) am Pod-Eingang Richtung Zentrum
    const chefConsoleGroup = new THREE.Group();
    chefConsoleGroup.position.set(0, 0.3, 3.2);

    const chefDeskGeo = new THREE.BoxGeometry(1.6, 0.8, 0.6);
    const chefDeskMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7 });
    const chefDesk = new THREE.Mesh(chefDeskGeo, chefDeskMat);
    chefDesk.position.y = 0.4;
    chefConsoleGroup.add(chefDesk);

    const chefScreenGeo = new THREE.BoxGeometry(1.2, 0.6, 0.08);
    const chefScreenMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x1e293b,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    const chefScreen = new THREE.Mesh(chefScreenGeo, chefScreenMat);
    chefScreen.position.set(0, 0.95, -0.1);
    chefScreen.userData = {
      type: 'chef',
      chefId: dept.chef_agent.id,
      deptId: dept.id,
      name: dept.chef_agent.name
    };
    chefConsoleGroup.add(chefScreen);
    interactiveObjects.push(chefScreen);
    chefMeshMap[dept.chef_agent.id] = chefScreen;

    // Chef-Krone / Icon als kleiner Marker
    const crownGeo = new THREE.ConeGeometry(0.2, 0.25, 4);
    const crownMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.rotation.x = Math.PI;
    crown.position.set(0, 1.4, -0.1);
    chefConsoleGroup.add(crown);

    podGroup.add(chefConsoleGroup);

    // 4. 3 bis 4 Spezial-PCs (Stufe 01: Fachteam)
    const pcCount = dept.specialist_pcs.length;
    dept.specialist_pcs.forEach((pc, pcIdx) => {
      const pcDeskGroup = new THREE.Group();
      
      // Gleichmäßige Fächerung im hinteren Bereich des Pods
      const pcAngle = -Math.PI * 0.4 + (pcIdx / (pcCount - 1 || 1)) * (Math.PI * 0.8);
      const pcDist = 2.6;
      const deskX = Math.sin(pcAngle) * pcDist;
      const deskZ = -Math.cos(pcAngle) * pcDist;

      pcDeskGroup.position.set(deskX, 0.3, deskZ);
      pcDeskGroup.rotation.y = pcAngle + Math.PI;

      // Schreibtisch
      const deskGeo = new THREE.BoxGeometry(1.1, 0.65, 0.5);
      const deskMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.y = 0.32;
      pcDeskGroup.add(desk);

      // Stuhl
      const chairGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.45, 12);
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
      const chair = new THREE.Mesh(chairGeo, chairMat);
      chair.position.set(0, 0.22, 0.45);
      pcDeskGroup.add(chair);

      // PC-Monitor
      const monStandGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.25, 8);
      const monStand = new THREE.Mesh(monStandGeo, deskMat);
      monStand.position.set(0, 0.72, 0);
      pcDeskGroup.add(monStand);

      const monScreenGeo = new THREE.BoxGeometry(0.7, 0.42, 0.05);
      const monScreenMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0f172a,
        emissiveIntensity: 0.4,
        roughness: 0.2
      });
      const monScreen = new THREE.Mesh(monScreenGeo, monScreenMat);
      monScreen.position.set(0, 0.95, 0);
      monScreen.userData = {
        type: 'pc',
        pcId: pc.id,
        deptId: dept.id,
        name: pc.name
      };
      pcDeskGroup.add(monScreen);
      interactiveObjects.push(monScreen);
      pcMeshMap[pc.id] = monScreen;

      podGroup.add(pcDeskGroup);
    });

    scene.add(podGroup);
  });
}

/**
 * Leuchtende Datenleitungen vom Zentrum zu den 10 Pods + Partikel-Streams
 */
function setupDataPipelines(hierarchyData) {
  const depts = hierarchyData.departments;
  const radius = 28;

  depts.forEach((dept, idx) => {
    const angle = (idx / depts.length) * Math.PI * 2;
    const endX = Math.cos(angle) * (radius - 5.5);
    const endZ = Math.sin(angle) * (radius - 5.5);
    const startX = Math.cos(angle) * 5.2;
    const startZ = Math.sin(angle) * 5.2;

    // Linie am Boden
    const points = [
      new THREE.Vector3(startX, 0.05, startZ),
      new THREE.Vector3(endX, 0.05, endZ)
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.4
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Fließende Datenpaket-Partikel
    const particleGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const particle = new THREE.Mesh(particleGeo, particleMat);
    particle.position.set(startX, 0.1, startZ);
    scene.add(particle);

    dataParticleStreams.push({
      mesh: particle,
      start: new THREE.Vector3(startX, 0.1, startZ),
      end: new THREE.Vector3(endX, 0.1, endZ),
      progress: Math.random(),
      speed: 0.006 + Math.random() * 0.004
    });
  });
}

/**
 * Raycasting: Klick auf 3D-Objekte öffnet Agenten-Logs oder Trevors Terminal
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
        // Trevor Terminal öffnen
        if (onTrevorClick) onTrevorClick();
      } else if (data.type === 'pc') {
        // Zoom zu PC & Log öffnen
        zoomToPosition(hit.getWorldPosition(new THREE.Vector3()), 14);
        if (onAgentClick) onAgentClick(data.pcId, 'pc');
      } else if (data.type === 'chef') {
        // Zoom zu Chef & Log öffnen
        zoomToPosition(hit.getWorldPosition(new THREE.Vector3()), 14);
        if (onAgentClick) onAgentClick(data.chefId, 'chef');
      } else if (data.type === 'department') {
        zoomToPosition(hit.getWorldPosition(new THREE.Vector3()), 20);
      }
    }
  });

  // Cursor-Wechsel bei Hover
  renderer.domElement.addEventListener('mousemove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  });
}

/**
 * Sanfter Kamera-Zoom auf einen Zielpunkt
 */
function zoomToPosition(targetVec, distance = 16) {
  targetLookAt = targetVec.clone();
  targetCameraPos = targetVec.clone().add(new THREE.Vector3(0, distance * 0.7, distance));
}

/**
 * UI-Buttons unten rechts mit 3D-Kamera verknüpfen
 */
function setupCameraButtons() {
  const btnRotLeft = document.getElementById('ctrl-rot-left');
  const btnRotRight = document.getElementById('ctrl-rot-right');
  const btnZoomIn = document.getElementById('ctrl-zoom-in');
  const btnZoomOut = document.getElementById('ctrl-zoom-out');
  const btnReset = document.getElementById('ctrl-reset-cam');
  const btnQuiet = document.getElementById('ctrl-quiet-toggle');

  if (btnRotLeft) {
    btnRotLeft.addEventListener('click', () => {
      rotateCameraAroundCenter(0.25);
    });
  }
  if (btnRotRight) {
    btnRotRight.addEventListener('click', () => {
      rotateCameraAroundCenter(-0.25);
    });
  }
  if (btnZoomIn && controls) {
    btnZoomIn.addEventListener('click', () => {
      camera.position.multiplyScalar(0.85);
    });
  }
  if (btnZoomOut && controls) {
    btnZoomOut.addEventListener('click', () => {
      camera.position.multiplyScalar(1.15);
    });
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      targetCameraPos = new THREE.Vector3(0, 38, 54);
      targetLookAt = new THREE.Vector3(0, 1, 0);
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
  camera.lookAt(0, 1, 0);
  if (controls) controls.target.set(0, 1, 0);
}

/**
 * Status-Updates in Echtzeit für Monitore und Chef-Terminals
 */
export function updateAgentStatusIn3D(agentId, type, status) {
  if (type === 'pc' && pcMeshMap[agentId]) {
    const mesh = pcMeshMap[agentId];
    if (status === 'working') {
      mesh.material.emissive.setHex(0x06b6d4); // Cyan Leuchten
      mesh.material.emissiveIntensity = 2.0;
    } else if (status === 'done') {
      mesh.material.emissive.setHex(0x10b981); // Smaragdgrün
      mesh.material.emissiveIntensity = 1.0;
    } else {
      mesh.material.emissive.setHex(0x0f172a); // Ruhezustand
      mesh.material.emissiveIntensity = 0.4;
    }
  } else if (type === 'chef' && chefMeshMap[agentId]) {
    const mesh = chefMeshMap[agentId];
    if (status === 'auditing') {
      mesh.material.emissive.setHex(0xf59e0b); // Amber Audit
      mesh.material.emissiveIntensity = 2.2;
    } else if (status === 'done') {
      mesh.material.emissive.setHex(0x10b981); // Grün
      mesh.material.emissiveIntensity = 1.2;
    } else {
      mesh.material.emissive.setHex(0x1e293b);
      mesh.material.emissiveIntensity = 0.5;
    }
  }
}

/**
 * Aktiviert das Blinken des Terminals "Deine Entscheidungen" bei Stufe 04
 */
export function setStageIn3D(stageNum) {
  if (decisionTerminalScreen) {
    if (stageNum === 4) {
      decisionTerminalScreen.material.emissive.setHex(0x10b981);
      decisionTerminalScreen.material.emissiveIntensity = 2.5;
    } else {
      decisionTerminalScreen.material.emissive.setHex(0x06b6d4);
      decisionTerminalScreen.material.emissiveIntensity = 0.8;
    }
  }
}

/**
 * Render-Loop & Animationen
 */
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // 1. Trevors Energiekern Schweben & Hologramm-Ringe rotieren
  if (trevorCoreMesh) {
    trevorCoreMesh.position.y = 2.4 + (isQuietMode ? 0 : Math.sin(time * 2) * 0.12);
  }

  if (!isQuietMode) {
    trevorRings.forEach(r => {
      r.mesh.rotation.x += r.rotX;
      r.mesh.rotation.y += r.rotY;
      r.mesh.rotation.z += r.rotZ;
    });

    // 2. Fließende Datenpaket-Partikel entlang der Bodenleitungen
    dataParticleStreams.forEach(stream => {
      stream.progress += stream.speed;
      if (stream.progress > 1) stream.progress = 0;
      stream.mesh.position.lerpVectors(stream.start, stream.end, stream.progress);
    });
  }

  // 3. Weicher Kamera-Flug bei Klick
  if (targetCameraPos && targetLookAt) {
    camera.position.lerp(targetCameraPos, 0.06);
    if (controls) {
      controls.target.lerp(targetLookAt, 0.06);
    }
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
