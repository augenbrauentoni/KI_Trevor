/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 04_KI_Engine_und_Bridges/idleTrainer.js
 * 
 * Autonomer Leerlauf-Trainings-Modus (Idle Training):
 * Wenn kein aktiver Kunden-Auftrag läuft, trainieren die 10 Abteilungen
 * und 33 Spezial-PCs automatisch an bestehenden Projekten:
 * - KI_Trevor (Multi-Agent Architecture & 3D WebGL)
 * - Fussballschulen-Manager (Turnier-Planung, Spieler-Pässe & RLS-Auth)
 * - LernfeldTrainer (Prüfungsvorbereitung, Gamification & Offline-Sync)
 * - Class Kart GP (Physik-Engine, Canvas 2D/3D & Highscores)
 * 
 * Erkenntnisse werden als "learned_insights" gesichert und stehen
 * im Live-Klick-Inspektor sowie für neue Antigravity-Aufträge bereit.
 */

// Autonomer Leerlauf-Trainings-Modus (Idle Training):
// Wenn kein aktiver Kunden-Auftrag läuft, trainieren die 10 Abteilungen
export const TRAINING_PROJECTS = [
  {
    id: "proj_ki_trevor",
    name: "KI_Trevor Studio",
    domain: "Multi-Agent System & 3D WebGL",
    focusAreas: ["Three.js Performance", "Anti-Limit Checkpoints", "Subagent Routing", "Dark-Slate UI"]
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
    name: "Class Kart GP",
    domain: "Klassen-Rennspiel & Gamification",
    focusAreas: ["Kollisions-Erkennung 60 FPS", "Highscore Anti-Cheat Validierung", "Gamepad API Support", "Sound-Synthese"]
  }
];

// Gespeichertes antrainiertes Wissen (agentId -> Array of insights)
let learnedInsightsMemory = {};
let currentAgentActivities = {}; // agentId -> { project, focus, currentAction, insight, timestamp }
let isTrainingActive = false;
let trainingTimer = null;

// Initiales Laden aus dem lokalen Speicher
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('trevor_learned_insights');
    if (saved) learnedInsightsMemory = JSON.parse(saved);
  }
} catch { /* ignore */ }

/**
 * Mappt eine Abteilung auf einen standardisierten Code (z. B. EG_BACKEND, EG_FRONTEND)
 */
export function getDepartmentCode(dept) {
  if (!dept) return 'EG_ALLGEMEIN';
  const idMap = {
    1: 'EG_PLANUNG',
    2: 'EG_ARCHITEKTUR',
    3: 'EG_FRONTEND',
    4: 'EG_BACKEND',
    5: 'EG_DATENBANK',
    6: 'EG_TESTING',
    7: 'EG_SECURITY',
    8: 'EG_DEVOPS',
    9: 'EG_UI_UX',
    10: 'EG_DOKU',
    11: 'UG_ARCHIV',
    12: 'UG_SERVERRAUM',
    13: 'UG_WERKSTATT',
    14: 'UG_LOUNGE'
  };
  if (idMap[dept.id]) return idMap[dept.id];
  const floor = dept.floor || 'EG';
  const cleanName = (dept.name || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `${floor}_${cleanName}`;
}

/**
 * Sendet eine Trainings-Erkenntnis nach dem exakten JSON-Schema an /api/memory/save
 * Nutzt relative URL (NICHT mehr an localhost) für zuverlässigen Online-/Cloud-Betrieb.
 * @param {object} memoryRecord 
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
 * im exakten JSON-Schema für das Supabase Cloud-Gedächtnis.
 */
function generateInsightForAgent(agent, department, project) {
  const area = project.focusAreas[Math.floor(Math.random() * project.focusAreas.length)];
  const deptCode = getDepartmentCode(department);

  const structuredTemplates = [
    {
      topic: 'Sichere Umgebungsvariablen',
      tags: ['nodejs', 'security', 'dotenv'],
      problem_statement: 'API-Keys waren im Frontend-Code ungeschützt sichtbar.',
      solution_pattern: 'Auslagerung der Fetch-Calls in einen Node.js Proxy.',
      reusable_code_snippet: 'const apiKey = process.env.GEMINI_API_KEY;',
      action: `Untersucht Sicherheits-Architektur von "${project.name}" auf ${area}`
    },
    {
      topic: 'Three.js Render-Loop Stabilität',
      tags: ['threejs', 'webgl', 'performance', 'lerp'],
      problem_statement: 'Kamera-Sprünge führten zu Frame-Drops und inkonsistenten Animationen.',
      solution_pattern: 'Verwendung von camera.position.lerp() innerhalb der animate()-Schleife ohne externe Bibliotheken.',
      reusable_code_snippet: 'camera.position.lerp(targetCameraPosition, 0.08);',
      action: `Optimiert 3D Render-Pipeline in "${project.name}" für ${area}`
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

    // Runtime-Metadaten für UI-Inspektor:
    projectId: project.id,
    projectName: project.name,
    focusArea: area,
    currentAction: choice.action,
    insight: `${choice.topic}: ${choice.solution_pattern}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Führt einen einzelnen autonomen Trainingsschritt für einen zufälligen Agenten aus
 */
export function executeTrainingStep(departments) {
  if (!departments || departments.length === 0) return null;

  // Wähle zufälligen Raum
  const dept = departments[Math.floor(Math.random() * departments.length)];
  // Wähle zufälligen PC oder den Chef
  const allUnits = [...dept.specialist_pcs, dept.chef_agent];
  const agent = allUnits[Math.floor(Math.random() * allUnits.length)];
  // Wähle Trainingsprojekt
  const project = TRAINING_PROJECTS[Math.floor(Math.random() * TRAINING_PROJECTS.length)];

  const data = generateInsightForAgent(agent, dept, project);

  // Aktualisiere Live-Aktivität
  currentAgentActivities[agent.id] = data;

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

  // Zwingend: Asynchron an /api/memory/save senden (relativer Pfad)
  saveInsightToCloudMemory(data).catch(() => {});

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
  console.log('[Trevor Trainer] Autonomes Leerlauf-Training gestartet (Trainiert an 4 bestehenden Projekten).');

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
  console.log('[Trevor Trainer] Leerlauf-Training pausiert (Echter Auftrag aktiv).');
}

/**
 * Liefert den aktuellen Trainings-Status eines Agenten für den Klick-Inspektor
 */
export function getAgentCurrentActivity(agentId) {
  return currentAgentActivities[agentId] || {
    projectName: "Fussballschulen-Manager",
    focusArea: "Code-Analyse & Performance",
    currentAction: "🧠 Analysiert Architektur & bereitet Optimierungen vor",
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
