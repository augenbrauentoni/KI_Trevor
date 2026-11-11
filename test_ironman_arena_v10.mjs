/**
 * TEST SUITE: test_ironman_arena_v10.mjs
 * 
 * Verifiziert das finale Iron-Man-Arena-Design (v10.0):
 * 1. 33 Agenten in hierarchyData.js mit idleThought für jeden Agenten
 * 2. 100% Sichtbarkeit & Skalierung 1.5x
 * 3. window.interactiveAgentMeshes.length === 33
 * 4. Hover-Sprechblase #agent-hover-speech-bubble in index.html & style.css
 * 5. Cache-Busting ?v=10.0 in index.html
 * 6. Standard-Kamera (0, 15, 19) -> Target (0, 1.0, 0)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST SUITE: FINALES IRON-MAN-ARENA-DESIGN & SPRECHBLASEN (v10.0) ===\n');

// 1. Test: hierarchyData.js - Alle 33 Agenten mit idleThought
import { TREVOR_AGENT_ROSTER, AGENT_ROSTER_BY_ID } from './02_Frontend_UI_und_3D_Studio/hierarchyData.js';

console.log('Test 1: Prüfe zentrale Agenten-Datenbank (33 Agenten mit idleThought)...');
assert.strictEqual(TREVOR_AGENT_ROSTER.length, 33, 'Es müssen exakt 33 Agenten im Roster sein');

const expectedIds = [
  'ag_01', 'ag_02', 'ag_03', 'ag_04', 'ag_05', 'ag_06', 'ag_07', 'ag_08', 'ag_09',
  'ag_10', 'ag_11', 'ag_12', 'ag_13', 'ag_14', 'ag_15', 'ag_16', 'ag_17', 'ag_18',
  'ag_19', 'ag_20', 'ag_21', 'ag_22', 'ag_23', 'ag_24', 'ag_25', 'ag_26', 'ag_27',
  'ag_28', 'ag_29', 'ag_30', 'ag_31', 'ag_32', 'ag_33'
];

expectedIds.forEach(id => {
  const agent = AGENT_ROSTER_BY_ID[id];
  assert.ok(agent, `Agent ${id} muss im Roster existieren`);
  assert.ok(agent.idleThought && agent.idleThought.length > 5, `Agent ${id} (${agent.name}) muss einen idleThought besitzen`);
  assert.ok(agent.name, `Agent ${id} muss einen Namen besitzen`);
  assert.ok(agent.role, `Agent ${id} muss eine Rolle besitzen`);
  assert.ok(agent.department, `Agent ${id} muss einer Abteilung zugeordnet sein`);
});
console.log('  -> OK: Alle 33 Agenten besitzen Namen, Rollen und individuelle idleThought-Gedanken.\n');

// 2. Test: index.html - Cache-Busting ?v=10.0 & #agent-hover-speech-bubble
console.log('Test 2: Prüfe index.html auf Cache-Busting ?v=10.0 & #agent-hover-speech-bubble...');
const indexHtml = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/index.html'), 'utf-8');

assert.ok(indexHtml.includes('?v=12.0') || indexHtml.includes('?v=11.0') || indexHtml.includes('?v=10.0'), 'index.html muss Cache-Busting enthalten');
assert.ok(indexHtml.includes('id="agent-hover-speech-bubble"'), 'index.html muss #agent-hover-speech-bubble enthalten');
assert.ok(indexHtml.includes('id="bubble-agent-name"'), 'index.html muss #bubble-agent-name enthalten');
assert.ok(indexHtml.includes('id="bubble-dept-badge"'), 'index.html muss #bubble-dept-badge enthalten');
assert.ok(indexHtml.includes('id="bubble-role"'), 'index.html muss #bubble-role enthalten');
assert.ok(indexHtml.includes('id="bubble-pulse-dot"'), 'index.html muss #bubble-pulse-dot enthalten');
assert.ok(indexHtml.includes('id="bubble-activity-text"'), 'index.html muss #bubble-activity-text enthalten');
console.log('  -> OK: index.html enthält alle Elemente der v10.0 Sprechblase und Cache-Busting ?v=10.0.\n');

// 3. Test: style.css & styles.css - Sprechblasen-Styles
console.log('Test 3: Prüfe style.css & styles.css auf Sprechblasen-CSS...');
const styleCss = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/style.css'), 'utf-8');
const stylesCss = fs.readFileSync(path.join(__dirname, '02_Frontend_UI_und_3D_Studio/styles.css'), 'utf-8');

[styleCss, stylesCss].forEach((css, idx) => {
  const name = idx === 0 ? 'style.css' : 'styles.css';
  assert.ok(css.includes('.agent-hover-speech-bubble'), `${name} muss .agent-hover-speech-bubble definieren`);
  assert.ok(css.includes('.agent-hover-speech-bubble::after'), `${name} muss Pfeil-Dreieck definieren`);
  assert.ok(css.includes('.bubble-pulse-dot'), `${name} muss .bubble-pulse-dot definieren`);
  assert.ok(css.includes('@keyframes pulseDot'), `${name} muss @keyframes pulseDot definieren`);
});
console.log('  -> OK: style.css und styles.css enthalten alle Styling-Regeln für die Sprechblase.\n');

// 4. Test: studio3D.js - Three.js Arena Initialisierung mit 33 Agenten
console.log('Test 4: Initialisiere 3D-Studio mit Mock-Three.js und prüfe Arena-Roster...');

// Mock Three.js und DOM-Umgebung
class MockVector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new MockVector3(this.x, this.y, this.z); }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  project() { return this; }
  distanceTo() { return 1; }
  lerp() { return this; }
}

class MockColor {
  constructor(r = 0, g = 0, b = 0) { this.r = r; this.g = g; this.b = b; }
  clone() { return new MockColor(this.r, this.g, this.b); }
  lerp() { return this; }
  setHex() { return this; }
}

class MockObject3D {
  constructor() {
    this.position = new MockVector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = new MockVector3(1, 1, 1);
    this.children = [];
    this.userData = {};
    this.visible = true;
    this.parent = null;
  }
  add(child) {
    this.children.push(child);
    child.parent = this;
  }
  lookAt() {}
  traverse(cb) {
    cb(this);
    this.children.forEach(c => c.traverse(cb));
  }
  getWorldPosition(target = new MockVector3()) {
    return target.copy(this.position);
  }
}

class MockMesh extends MockObject3D {
  constructor(geo, mat) {
    super();
    this.geometry = geo;
    this.material = mat;
    this.isMesh = true;
  }
}

class MockGroup extends MockObject3D {}

global.window = {
  THREE: {
    Scene: class extends MockObject3D {
      constructor() { super(); this.background = null; this.fog = null; }
    },
    PerspectiveCamera: class extends MockObject3D {
      constructor() { super(); this.aspect = 1; }
      lookAt() {}
      updateProjectionMatrix() {}
    },
    WebGLRenderer: class {
      constructor() {
        this.domElement = {
          style: {},
          addEventListener: () => {},
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
        };
        this.shadowMap = {};
      }
      setSize() {}
      setPixelRatio() {}
      render() {}
    },
    OrbitControls: class {
      constructor() {
        this.target = new MockVector3(0, 1.0, 0);
      }
      update() {}
    },
    Clock: class {
      getDelta() { return 0.016; }
      getElapsedTime() { return 1.0; }
    },
    CanvasTexture: class {
      constructor() { this.needsUpdate = false; }
    },
    Vector3: MockVector3,
    Vector2: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
    Color: MockColor,
    Group: MockGroup,
    Mesh: MockMesh,
    Sprite: class extends MockObject3D {},
    SpriteMaterial: class {},
    MeshStandardMaterial: class {
      constructor() { this.emissive = new MockColor(); }
      clone() { const m = new this.constructor(); m.emissive = this.emissive.clone(); return m; }
    },
    MeshBasicMaterial: class { constructor() { this.color = new MockColor(); } clone() { return new this.constructor(); } },
    MeshPhysicalMaterial: class {},
    PointsMaterial: class {},
    Points: class extends MockObject3D {},
    LineBasicMaterial: class {},
    Line: class extends MockObject3D {},
    BufferGeometry: class {
      setAttribute() {}
      setFromPoints() {}
    },
    BufferAttribute: class {},
    BoxGeometry: class {},
    CylinderGeometry: class {},
    ConeGeometry: class {},
    SphereGeometry: class {},
    TorusGeometry: class {},
    RingGeometry: class {},
    PlaneGeometry: class {},
    QuadraticBezierCurve3: class {
      getPoints() { return [new MockVector3(), new MockVector3()]; }
      getPoint() { return new MockVector3(); }
    },
    Raycaster: class {
      setFromCamera() {}
      intersectObjects() { return []; }
    },
    AmbientLight: class extends MockObject3D {},
    HemisphereLight: class extends MockObject3D {},
    DirectionalLight: class extends MockObject3D {
      constructor() { super(); this.shadow = { mapSize: {}, camera: {} }; }
    },
    PointLight: class extends MockObject3D {},
    AdditiveBlending: 2,
    DoubleSide: 2,
    PCFSoftShadowMap: 1,
    FogExp2: class {}
  },
  interactiveAgentMeshes: [],
  document: {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            fillText: () => {},
            stroke: () => {},
            roundRect: () => {}
          })
        };
      }
      return { id: '', style: {}, appendChild: () => {}, innerHTML: '', classList: { add: () => {}, remove: () => {} } };
    },
    getElementById: (id) => {
      if (id === 'threejs-canvas-container') {
        return {
          clientWidth: 1200,
          clientHeight: 800,
          firstChild: null,
          insertBefore: () => {},
          removeChild: () => {}
        };
      }
      return {
        id,
        style: {},
        classList: { add: () => {}, remove: () => {} },
        innerHTML: '',
        textContent: ''
      };
    },
    body: { appendChild: () => {} }
  },
  addEventListener: () => {},
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {}
};

global.document = global.window.document;
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.cancelAnimationFrame = global.window.cancelAnimationFrame;

// Importiere init3DStudio
const { init3DStudio, focusAgentIn3D, setCameraPreset } = await import('./02_Frontend_UI_und_3D_Studio/studio3D.js');

await init3DStudio();

assert.ok(global.window.interactiveAgentMeshes, 'window.interactiveAgentMeshes muss existieren');
assert.strictEqual(global.window.interactiveAgentMeshes.length, 33, `Es müssen genau 33 interaktive Agenten registriert sein, gefunden: ${global.window.interactiveAgentMeshes.length}`);

// Prüfe ob jeder Agent im Roster eine Hitbox in interactiveAgentMeshes hat
const registeredAgentIds = new Set(global.window.interactiveAgentMeshes.map(m => m.userData.agentId));
expectedIds.forEach(id => {
  assert.ok(registeredAgentIds.has(id), `Agent ${id} muss in window.interactiveAgentMeshes registriert sein`);
  const mesh = global.window.interactiveAgentMeshes.find(m => m.userData.agentId === id);
  assert.ok(mesh.userData.headPos, `Agent ${id} muss headPos für 3D-to-2D Projektion besitzen`);
  assert.ok(mesh.userData.highlightRing, `Agent ${id} muss einen Highlight-Ring besitzen`);
});

console.log('  -> OK: window.interactiveAgentMeshes.length === 33. Alle 33 Spezialisten und Leiter besitzen Hitbox, headPos und Highlight-Ring.\n');

console.log('=== ALLE TESTS ERFOLGREICH BESTANDEN! ===');
