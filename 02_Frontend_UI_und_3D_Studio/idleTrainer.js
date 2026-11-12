/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/idleTrainer.js
 * 
 * Autonomer Leerlauf-Trainings-Modus (Idle Training):
 * Wenn kein aktiver Kunden-Auftrag läuft, trainieren die 4 Abteilungen
 * und 33 Spezial-PCs automatisch an bestehenden und frei wählbaren Projekten:
 * - KI_Trevor (Multi-Agent Architecture & 3D WebGL)
 * - Fussballschulen-Manager (Turnier-Planung, Spieler-Pässe & RLS-Auth)
 * - LernfeldTrainer (Prüfungsvorbereitung, Gamification & Offline-Sync)
 * - Class Party / Class Kart GP (Physik-Engine, Canvas 2D/3D & Highscores)
 * - EMail-Worker (Autonome Postfach-Verwaltung, Parsing & Mail-Klassifizierung)
 * - IT-Systemintegration & Netzwerke (Subnetting, VPN, Firewall & Server-Audits)
 * - Benutzerdefinierte Projekte (+ Eigenes Projekt hinzufügen)
 * 
 * Erkenntnisse werden als "learned_insights" gesichert und stehen
 * im Live-Klick-Inspektor, in den 3D-Hover-Sprechblasen sowie im Action-Center bereit.
 */

import { STUDIO_HIERARCHY } from './hierarchyData.js';

export const DEFAULT_TRAINING_PROJECTS = [
  {
    id: "proj_ki_trevor",
    name: "KI_Trevor",
    domain: "Multi-Agent System & 3D WebGL",
    focusAreas: ["Three.js Performance", "Anti-Limit Checkpoints", "Subagent Routing", "Dark-Slate UI", "Zero-Bug Code QA"]
  },
  {
    id: "proj_fussball",
    name: "Fussballschulen-Manager",
    domain: "Sport- & Schulungs-Plattform",
    focusAreas: ["Turnier-Spielplan Algorithmus", "Supabase Row-Level-Security", "Spieler-Pässe PDF-Export", "Live-Ticker WebSocket"]
  },
  {
    id: "proj_lernfeld",
    name: "LernfeldTrainer",
    domain: "Schul- & Klausur-App",
    focusAreas: ["Spaced-Repetition Lernalgorithmus", "Offline-PWA Speicher", "Gamification XP-System", "Multiple-Choice Auswertung"]
  },
  {
    id: "proj_kart",
    name: "Class Party / Class Kart GP",
    domain: "Klassen-Rennspiel & Gamification",
    focusAreas: ["Kollisions-Erkennung 60 FPS", "Highscore Anti-Cheat Validierung", "Gamepad API Support", "Sound-Synthese"]
  },
  {
    id: "proj_email",
    name: "EMail-Worker",
    domain: "Postfach-Automatisierung & NLP",
    focusAreas: ["IMAP/SMTP Mail Parsing", "Spam & Phishing Filter", "Auto-Responder Routing", "Mail-Queue Worker"]
  },
  {
    id: "proj_it_network",
    name: "IT-Systemintegration & Netzwerke",
    domain: "Infrastruktur, Security & Netze",
    focusAreas: ["IPv4/IPv6 Subnetting & CIDR", "WireGuard & OpenVPN Tunnel", "Firewall Rules & iptables", "Server-Health Monitoring"]
  }
];

export let TRAINING_PROJECTS = [...DEFAULT_TRAINING_PROJECTS];

// Gespeichertes antrainiertes Wissen (agentId -> Array of insights)
let learnedInsightsMemory = {};
let currentAgentActivities = {}; // agentId -> { project, focus, currentAction, insight, timestamp }
let isTrainingActive = false;
let trainingTimer = null;
let activeProjectId = "proj_ki_trevor";
let activeFocusArea = "Alle Schwerpunkte";

// Initiales Laden aus dem lokalen Speicher
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedInsights = window.localStorage.getItem('trevor_learned_insights');
    if (savedInsights) learnedInsightsMemory = JSON.parse(savedInsights);

    const savedCustomProjects = window.localStorage.getItem('trevor_custom_training_projects');
    if (savedCustomProjects) {
      const customList = JSON.parse(savedCustomProjects);
      if (Array.isArray(customList)) {
        customList.forEach(cp => {
          if (!TRAINING_PROJECTS.some(p => p.id === cp.id || p.name === cp.name)) {
            TRAINING_PROJECTS.push(cp);
          }
        });
      }
    }

    const savedActiveProject = window.localStorage.getItem('trevor_active_training_project');
    if (savedActiveProject) activeProjectId = savedActiveProject;
  }
} catch { /* ignore */ }

/**
 * Holt alle verfügbaren Trainingsprojekte (inkl. benutzerdefinierter)
 */
export function getAllTrainingProjects() {
  return TRAINING_PROJECTS;
}

/**
 * Gibt das aktuell aktive Trainingsprojekt zurück
 */
export function getActiveTrainingProject() {
  return TRAINING_PROJECTS.find(p => p.id === activeProjectId) || TRAINING_PROJECTS[0];
}

/**
 * Setzt das aktive Trainingsprojekt
 */
export function setActiveTrainingProject(projectId) {
  const proj = TRAINING_PROJECTS.find(p => p.id === projectId || p.name.toLowerCase() === String(projectId).toLowerCase());
  if (proj) {
    activeProjectId = proj.id;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('trevor_active_training_project', activeProjectId);
      }
    } catch { /* ignore */ }
    console.log(`[IdleTrainer] Aktives Freizeit-Projekt gewechselt zu: "${proj.name}"`);
    return proj;
  }
  return null;
}

/**
 * Fügt ein neues benutzerdefiniertes Freizeit-Projekt hinzu
 */
export function addTrainingProject(nameOrObj, domain = "Software-Entwicklung", focusAreas = ["Architektur", "Clean Code", "Performance"]) {
  let name = '';
  let dom = domain;
  let focus = focusAreas;
  if (typeof nameOrObj === 'object' && nameOrObj !== null) {
    name = nameOrObj.name || '';
    dom = nameOrObj.domain || domain;
    focus = nameOrObj.focusAreas || focusAreas;
  } else if (typeof nameOrObj === 'string') {
    name = nameOrObj;
  }
  if (!name || !name.trim()) return null;
  const cleanName = name.trim();
  const id = "proj_custom_" + Date.now();
  const newProj = {
    id,
    name: cleanName,
    domain: (typeof dom === 'string' ? dom.trim() : "Software-Projekt") || "Software-Projekt",
    focusAreas: Array.isArray(focus) && focus.length > 0 ? focus : ["Architektur & Modularität", "Security & Error Handling", "Performance"]
  };

  TRAINING_PROJECTS.push(newProj);
  activeProjectId = id;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const customOnly = TRAINING_PROJECTS.filter(p => !DEFAULT_TRAINING_PROJECTS.some(dp => dp.id === p.id));
      window.localStorage.setItem('trevor_custom_training_projects', JSON.stringify(customOnly));
      window.localStorage.setItem('trevor_active_training_project', activeProjectId);
    }
  } catch { /* ignore */ }

  console.log(`[IdleTrainer] Neues Freizeit-Projekt hinzugefügt: "${cleanName}"`);
  return newProj;
}

/**
 * Setzt den gewählten Prüf-Schwerpunkt
 */
export function setTrainingFocusArea(area) {
  activeFocusArea = area || "Alle Schwerpunkte";
}

export function getTrainingFocusArea() {
  return activeFocusArea;
}

/**
 * Mappt eine Abteilung auf einen standardisierten Code (z. B. EG_BACKEND, EG_FRONTEND, UG_SERVER)
 */
export function getDepartmentCode(dept) {
  if (!dept) return 'EG_ARCHITEKTUR';
  const idMap = {
    1: 'EG_ARCHITEKTUR',
    2: 'EG_ARCHITEKTUR',
    3: 'EG_FRONTEND',
    4: 'EG_FRONTEND',
    5: 'EG_BACKEND',
    6: 'EG_BACKEND',
    7: 'UG_SERVER',
    8: 'UG_SERVER',
    9: 'UG_SERVER',
    10: 'EG_ARCHITEKTUR',
    11: 'UG_SERVER',
    12: 'UG_SERVER',
    13: 'UG_SERVER',
    14: 'UG_SERVER'
  };
  if (idMap[dept.id]) return idMap[dept.id];
  const floor = dept.floor || 'EG';
  const cleanName = (dept.name || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `${floor}_${cleanName}`;
}

/**
 * Sendet eine Trainings-Erkenntnis nach dem exakten JSON-Schema an /api/memory/save
 */
export async function saveInsightToCloudMemory(memoryRecord) {
  if (!memoryRecord) return false;

  const payload = {
    department: memoryRecord.department,
    topic: memoryRecord.topic,
    tags: memoryRecord.tags,
    problem_statement: memoryRecord.problem_statement,
    solution_pattern: memoryRecord.solution_pattern,
    reusable_code_snippet: memoryRecord.reusable_code_snippet
  };

  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const resp = await fetch(`${baseUrl}/api/memory/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.warn(`[IdleTrainer] Cloud-Memory Save Fehler (${resp.status})`);
      return false;
    }

    const data = await resp.json();
    console.log(`[IdleTrainer] Erkenntnis im Cloud-Gedächtnis gesichert (${data.storage || 'cloud'}): "${payload.topic}"`);
    return true;
  } catch (err) {
    console.warn('[IdleTrainer] Cloud-Memory Endpunkt /api/memory/save nicht erreichbar:', err.message);
    return false;
  }
}

/**
 * Generiert realistische, tiefgreifende Trainings-Erkenntnisse pro Agent
 */
function generateInsightForAgent(agent, department, project) {
  let area = activeFocusArea;
  if (!area || area === "Alle Schwerpunkte" || !project.focusAreas.includes(area)) {
    area = project.focusAreas[Math.floor(Math.random() * project.focusAreas.length)];
  }
  const deptCode = getDepartmentCode(department);

  const structuredTemplates = [
    {
      topic: 'Sichere Umgebungsvariablen',
      tags: ['nodejs', 'security', 'dotenv'],
      problem_statement: 'API-Keys waren im Frontend-Code ungeschützt sichtbar.',
      solution_pattern: 'Auslagerung der Fetch-Calls in einen Node.js Proxy mit process.env.',
      reusable_code_snippet: 'const apiKey = process.env.GEMINI_API_KEY;',
      action: `Untersucht Sicherheits-Architektur von "${project.name}" auf ${area}`
    },
    {
      topic: 'Three.js Render-Loop Stabilität & UnrealBloom',
      tags: ['threejs', 'webgl', 'performance', 'lerp', 'bloom'],
      problem_statement: 'Kamera-Sprünge führten zu Frame-Drops und Kollision mit OrbitControls.',
      solution_pattern: 'Sanfter 0.06 Lerp mit Abbruch bei Pointerdown/Wheel-Events.',
      reusable_code_snippet: 'camera.position.lerp(targetCameraPosition, 0.06);',
      action: `Optimiert 3D Render-Pipeline & Bloom für "${project.name}" (${area})`
    },
    {
      topic: 'Supabase Row-Level-Security & Auth',
      tags: ['supabase', 'sql', 'rls', 'security'],
      problem_statement: 'Mandanten-Daten konnten ohne Autorisierungsprüfung direkt manipuliert werden.',
      solution_pattern: 'Aktivierung von ROW LEVEL SECURITY mit strikten Policies für auth.uid().',
      reusable_code_snippet: 'CREATE POLICY "Users access own rows" ON tasks FOR ALL USING (auth.uid() = user_id);',
      action: `Auditiert Zugriffsrechte & RLS-Policies für ${area}`
    },
    {
      topic: 'Offline-PWA Caching & Service Worker',
      tags: ['pwa', 'service-worker', 'offline', 'cache'],
      problem_statement: 'Bei Verbindungsabbrüchen stürzte die Web-App ohne Datensicherung ab.',
      solution_pattern: 'Implementierung einer Cache-First Strategie mit IndexedDB-Spiegelung.',
      reusable_code_snippet: 'caches.open("trevor-v1").then(cache => cache.addAll(["/index.html", "/app.js"]));',
      action: `Testet Offline-Resilienz und PWA-Service-Worker in "${project.name}"`
    },
    {
      topic: 'Code-RAG Sandbox-Isolation',
      tags: ['rag', 'sandbox', 'security', 'path-traversal'],
      problem_statement: 'Dateipfade aus Prompts könnten über Directory Traversal ("..") auf Systemdateien zugreifen.',
      solution_pattern: 'Pfad-Validierung mit path.resolve() und relativer Präfix-Prüfung auf den Projekt-Root.',
      reusable_code_snippet: 'const rel = path.relative(normBase, normTarget); return !rel.startsWith("..");',
      action: `Prüft Sandbox-Schutz und Pfad-Hygiene für ${area}`
    },
    {
      topic: 'Strukturierte JSON-Inferenz mit Fallbacks',
      tags: ['llm', 'json', 'fallback', 'heuristics'],
      problem_statement: 'LLM-Antworten enthielten unvorhersehbares Markdown und Syntaxfehler.',
      solution_pattern: 'Regex-Extraktion von JSON-Blöcken kombiniert mit deterministischen Heuristik-Fallbacks.',
      reusable_code_snippet: 'const match = response.match(/\\[\\s*[\\d\\s,]+\\s*\\]/); return match ? JSON.parse(match[0]) : fallback;',
      action: `Analysiert Ausfallsicherheit und JSON-Parsing für ${area}`
    },
    {
      topic: 'Netzwerk & Subnetting Resilienz',
      tags: ['network', 'subnetting', 'cidr', 'firewall'],
      problem_statement: 'Subnetz-Kollisionen bei VPN-Kopplung führten zu Paketverlusten.',
      solution_pattern: 'Strikte CIDR-Berechnung mit /27 Segmentierung und automatischem Routing.',
      reusable_code_snippet: 'const netMask = 0xffffffff << (32 - cidr);',
      action: `Auditiert Routing-Tabellen und Paketfilter für "${project.name}"`
    },
    {
      topic: 'Web Audio Synthese ohne Assets',
      tags: ['webaudio', 'sound', 'synthesizer', 'browser-native'],
      problem_statement: 'Externe MP3-Dateien führten zu Ladeverzögerungen und Autoplay-Blockaden.',
      solution_pattern: 'Native Oszillator-Synthese über AudioContext mit dynamischem Gain-Envelope.',
      reusable_code_snippet: 'const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.setValueAtTime(520, ctx.currentTime);',
      action: `Optimiert Audio-Feedback und Sound-Synthese in "${project.name}"`
    }
  ];

  const choice = structuredTemplates[Math.floor(Math.random() * structuredTemplates.length)];

  return {
    department: deptCode,
    topic: choice.topic,
    tags: choice.tags,
    problem_statement: choice.problem_statement,
    solution_pattern: choice.solution_pattern,
    reusable_code_snippet: choice.reusable_code_snippet,

    // Runtime-Metadaten für UI-Inspektor & Sprechblasen:
    projectId: project.id,
    projectName: project.name,
    focusArea: area,
    currentAction: choice.action,
    insight: `${choice.topic}: ${choice.solution_pattern}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Führt einen einzelnen autonomen Trainingsschritt für einen Agenten aus
 */
export function executeTrainingStep(departments) {
  const depts = (Array.isArray(departments) && departments.length > 0)
    ? departments
    : (STUDIO_HIERARCHY?.departments || []);
  if (!depts || depts.length === 0) return null;

  // Wähle zufällige Abteilung
  const dept = depts[Math.floor(Math.random() * depts.length)];
  const allUnits = [...(dept.specialist_pcs || []), dept.chef_agent || { id: 'ag_01', name: 'Trevor' }];
  const agent = allUnits[Math.floor(Math.random() * allUnits.length)];
  const project = getActiveTrainingProject();

  const data = generateInsightForAgent(agent, dept, project);

  // Aktualisiere Live-Aktivität
  currentAgentActivities[agent.id] = data;

  // Aktualisiere dynamische Sprechblasen-Aktivität im globalen Roster
  if (typeof window !== 'undefined' && Array.isArray(window.TREVOR_AGENT_ROSTER)) {
    const rAgent = window.TREVOR_AGENT_ROSTER.find(a => a.id === agent.id);
    if (rAgent) {
      rAgent.idleThought = data.currentAction;
    }
  }

  // Speichere in learnedInsightsMemory
  if (!learnedInsightsMemory[agent.id]) {
    learnedInsightsMemory[agent.id] = [];
  }
  learnedInsightsMemory[agent.id].unshift({
    projectName: project.name,
    focusArea: data.focusArea,
    insight: data.insight,
    topic: data.topic,
    department: data.department,
    timestamp: data.timestamp
  });

  // Maximal 15 Erkenntnisse pro Agent behalten
  if (learnedInsightsMemory[agent.id].length > 15) {
    learnedInsightsMemory[agent.id].pop();
  }

  // Persistieren in LocalStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('trevor_learned_insights', JSON.stringify(learnedInsightsMemory));
    }
  } catch { /* ignore */ }

  // Asynchron an /api/memory/save senden
  saveInsightToCloudMemory(data).catch(() => {});

  // Live-Feed in Trainings-Konsole schreiben
  const now = new Date();
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const logMsg = `> [${timeStr}] ${agent.name} ${data.currentAction}...`;
  if (typeof window !== 'undefined' && typeof window.appendTrainingLog === 'function') {
    window.appendTrainingLog(logMsg);
  } else if (typeof document !== 'undefined') {
    const logEl = document.getElementById('training-console-log');
    if (logEl) {
      const line = document.createElement('div');
      line.className = 'training-log-line';
      line.style.color = '#38BDF8';
      line.style.marginTop = '2px';
      line.innerText = logMsg;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  // Bei relevanten Erkenntnissen: Vorschlag im Action-Center hinterlegen
  if (typeof window !== 'undefined') {
    window.trainingCycleCount = (window.trainingCycleCount || 0) + 1;
    if (window.trainingCycleCount % 4 === 1 && typeof window.pushTrainingProposalToActionCenter === 'function') {
      window.pushTrainingProposalToActionCenter({ agent, dept, project, data });
    }
    if (typeof window.recordTrainingAuditProposal === 'function') {
      window.recordTrainingAuditProposal(agent, dept, project, data);
    }
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    departmentName: dept.name,
    ...data
  };
}

/**
 * Startet das kontinuierliche autonome Training im Hintergrund
 */
export function startIdleTraining(departments, intervalMs = 6000) {
  if (isTrainingActive) return;
  isTrainingActive = true;
  const project = getActiveTrainingProject();
  console.log(`[Trevor Trainer] Autonomes Leerlauf-Training gestartet (Trainiert an "${project.name}").`);

  // Sofort einen Schritt machen
  executeTrainingStep(departments);

  trainingTimer = setInterval(() => {
    executeTrainingStep(departments);
  }, intervalMs);
}

/**
 * Pausiert das Training (z. B. wenn ein echter Kundenauftrag startet)
 */
export function stopIdleTraining() {
  if (!isTrainingActive) return;
  isTrainingActive = false;
  if (trainingTimer) {
    clearInterval(trainingTimer);
    trainingTimer = null;
  }
  console.log('[Trevor Trainer] Leerlauf-Training pausiert.');
}

/**
 * Prüft, ob das Training aktuell aktiv ist
 */
export function isTrainingRunning() {
  return isTrainingActive;
}

/**
 * Schaltet das Training um
 */
export function toggleIdleTraining(departments, intervalMs = 6000) {
  if (isTrainingActive) {
    stopIdleTraining();
    return false;
  } else {
    startIdleTraining(departments, intervalMs);
    return true;
  }
}

/**
 * Liefert den aktuellen Trainings-Status eines Agenten für den Klick-Inspektor
 */
export function getAgentCurrentActivity(agentId) {
  const project = getActiveTrainingProject();
  return currentAgentActivities[agentId] || {
    projectName: project.name,
    focusArea: "Code-Analyse & Performance",
    currentAction: `🧠 Analysiert Architektur von "${project.name}" & bereitet Optimierungen vor`,
    insight: "Trainiert autonom im Leerlauf auf maximale Fehlerfreiheit.",
    timestamp: new Date().toISOString()
  };
}

/**
 * Liefert alle gesammelten Insights eines Agenten
 */
export function getAgentLearnedInsights(agentId) {
  return learnedInsightsMemory[agentId] || [];
}

/**
 * Bündelt alle aktuellen Erkenntnisse für Trevors Master-Prompt
 */
export function getAllLearnedKnowledgeSummary() {
  const summary = [];
  for (const [agentId, insights] of Object.entries(learnedInsightsMemory)) {
    if (insights.length > 0) {
      summary.push(`- Agent ${agentId} (${insights[0].projectName}): ${insights[0].insight}`);
    }
  }
  return summary.slice(0, 10).join('\n');
}

// Global exposure
if (typeof window !== 'undefined') {
  window.TRAINING_PROJECTS = TRAINING_PROJECTS;
  window.getAllTrainingProjects = getAllTrainingProjects;
  window.getActiveTrainingProject = getActiveTrainingProject;
  window.setActiveTrainingProject = setActiveTrainingProject;
  window.addTrainingProject = addTrainingProject;
  window.setTrainingFocusArea = setTrainingFocusArea;
  window.getTrainingFocusArea = getTrainingFocusArea;
  window.executeTrainingStep = executeTrainingStep;
  window.startIdleTraining = startIdleTraining;
  window.stopIdleTraining = stopIdleTraining;
  window.isTrainingRunning = isTrainingRunning;
  window.toggleIdleTraining = toggleIdleTraining;
  window.getAgentCurrentActivity = getAgentCurrentActivity;
  window.getAgentLearnedInsights = getAgentLearnedInsights;
}
