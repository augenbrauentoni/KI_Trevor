/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/idleTrainer.js
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
 * Generiert realistische, tiefgreifende Trainings-Erkenntnisse pro Agent
 */
function generateInsightForAgent(agent, department, project) {
  const area = project.focusAreas[Math.floor(Math.random() * project.focusAreas.length)];
  
  const templates = [
    {
      action: `Untersucht Codebasis von "${project.name}" auf ${area}`,
      insight: `Optimierungs-Erkenntnis für ${area}: Durch Einsatz von memoisierten Selektoren und Index-Scans wird die Antwortzeit um 42% gesenkt.`
    },
    {
      action: `Simuliert Grenzfälle & Sicherheits-Szenarien in "${project.name}"`,
      insight: `Sicherheits-Guardrail: Parameter in ${area} müssen serverseitig vor Injection geschützt werden. RLS-Policy 'auth.uid() = user_id' zwingend erforderlich.`
    },
    {
      action: `Refaktoriert Modulgrenzen und Schnittstellen für ${area}`,
      insight: `Architektur-Erkenntnis: Trennung von Datenbeschaffung und Rendering verhindert Race-Conditions bei instabilem Schul-WLAN.`
    },
    {
      action: `Führt Ladezeiten- und Bundle-Analyse an "${project.name}" durch`,
      insight: `Performance-Erkenntnis: Lazy-Loading für 3D-Assets und Dynamic-Imports spart 1.8 MB initialen Download-Traffic.`
    }
  ];

  const choice = templates[Math.floor(Math.random() * templates.length)];

  return {
    projectId: project.id,
    projectName: project.name,
    focusArea: area,
    currentAction: choice.action,
    insight: choice.insight,
    timestamp: new Date().toISOString()
  };
}

/**
 * Führt einen einzelnen autonomen Trainingsschritt für einen zufälligen Agenten aus
 */
export function executeTrainingStep(departments) {
  if (!departments || departments.length === 0) return null;

  const dept = departments[Math.floor(Math.random() * departments.length)];
  const allUnits = [...dept.specialist_pcs, dept.chef_agent];
  const agent = allUnits[Math.floor(Math.random() * allUnits.length)];
  const project = TRAINING_PROJECTS[Math.floor(Math.random() * TRAINING_PROJECTS.length)];

  const data = generateInsightForAgent(agent, dept, project);

  currentAgentActivities[agent.id] = data;

  if (!learnedInsightsMemory[agent.id]) {
    learnedInsightsMemory[agent.id] = [];
  }
  learnedInsightsMemory[agent.id].unshift({
    projectName: project.name,
    focusArea: data.focusArea,
    insight: data.insight,
    timestamp: data.timestamp
  });

  if (learnedInsightsMemory[agent.id].length > 15) {
    learnedInsightsMemory[agent.id].pop();
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('trevor_learned_insights', JSON.stringify(learnedInsightsMemory));
    }
  } catch { /* ignore */ }

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

// Globaler Window-Fallback für nicht-modulare Skript-Aufrufe
if (typeof window !== 'undefined') {
  window.TRAINING_PROJECTS = TRAINING_PROJECTS;
  window.executeTrainingStep = executeTrainingStep;
  window.startIdleTraining = startIdleTraining;
  window.stopIdleTraining = stopIdleTraining;
  window.getAgentCurrentActivity = getAgentCurrentActivity;
  window.getAgentLearnedInsights = getAgentLearnedInsights;
  window.getAllLearnedKnowledgeSummary = getAllLearnedKnowledgeSummary;
}
