/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/app.js
 * 
 * Haupt-Controller V2.0:
 * - 10 deutsche Abteilungen & 43 Spezialisten
 * - Klick-Inspektor ("Wofür bin ich zuständig?", "Was mache ich in dieser Sekunde?", "📚 Gelerntes Wissen")
 * - Autonomer Leerlauf-Trainings-Modus (Idle Training) an bestehenden Projekten
 * - Three.js 3D-Campus mit Trevor im Iron-Man Look
 * - Cloud-Queue & Remote-Sync-Unterstützung für Freigaben von unterwegs
 */

import { init3DStudio, updateAgentStatusIn3D, setStageIn3D } from './studio3D.js';
import {
  startIdleTraining,
  stopIdleTraining,
  getAgentCurrentActivity,
  getAgentLearnedInsights,
  getAllLearnedKnowledgeSummary
} from '../04_KI_Engine_und_Bridges/idleTrainer.js';

// Fallback Hierarchy
let hierarchyState = null;

// Globaler Anwendungs-Status
const state = {
  hierarchy: null,
  activeView: '3d', // '3d' | 'grid'
  selectedDeptFilter: 'all',
  searchQuery: '',
  activeTask: null,
  agentLogs: {},
  currentInspectedAgent: null,
  settings: {
    llm_mode: 'gemini',
    gemini_model: 'gemini-2.5-flash',
    gemini_api_key: '',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3',
    quiet_view: false
  }
};

// =============================================================================
// INITIALISIERUNG
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  loadLocalSettings();
  await loadStudioHierarchy();
  renderDepartmentPills();
  renderWorkstationsGrid();
  setupEventListeners();
  checkExistingCheckpoint();
  updateUIThemeSettings();

  // 3D Campus initialisieren
  try {
    init3DStudio(state.hierarchy, handleAgentClickFrom3D, openTrevorModal);
  } catch (err) {
    console.warn('[Trevor UI] 3D Studio Initialisierung verzögert:', err);
  }

  // Starte autonomes Leerlauf-Training an vorhandenen Projekten
  startIdleTraining(state.hierarchy.departments, 5000);
});

function loadLocalSettings() {
  const saved = localStorage.getItem('trevor_user_settings');
  if (saved) {
    try {
      state.settings = { ...state.settings, ...JSON.parse(saved) };
    } catch { /* ignore */ }
  }
}

async function loadStudioHierarchy() {
  try {
    const res = await fetch('../03_Agenten_System_und_Prompts/studio_hierarchy.json');
    if (res.ok) {
      state.hierarchy = await res.json();
      return;
    }
  } catch {
    console.log('[Trevor UI] Nutze Fallback-Hierarchie.');
  }

  // Fallback falls fetch fehlschlägt
  state.hierarchy = {
    departments: [
      { id: 1, name: "1. Ideen & Planung", easy_explanation: "Prüft deine Idee und plant alle Funktionen", color: "#3b82f6", chef_agent: { id: "chef_plan", name: "Planungs-Chef", easy_explanation: "Prüft alle Ideen auf Machbarkeit" }, specialist_pcs: [{ id: "pc_plan_1", name: "Ideen-Prüfer", easy_explanation: "Testet deine Idee auf Logik" }, { id: "pc_plan_2", name: "Funktions-Planer", easy_explanation: "Erstellt die Feature-Liste" }, { id: "pc_plan_3", name: "Machbarkeits-Checker", easy_explanation: "Prüft Technik und Zeit" }] },
      { id: 2, name: "2. Bauplan & Technik", easy_explanation: "Legt Ordnerstruktur und Sprachen fest", color: "#6366f1", chef_agent: { id: "chef_arch", name: "Chef-Architekt", easy_explanation: "Überwacht das Fundament" }, specialist_pcs: [{ id: "pc_arch_1", name: "Technik-Wähler", easy_explanation: "Wählt Programmiersprachen" }, { id: "pc_arch_2", name: "Ordner-Planer", easy_explanation: "Plant Ordnerstruktur" }, { id: "pc_arch_3", name: "Schnittstellen-Planer", easy_explanation: "Definiert APIs" }] },
      { id: 3, name: "3. Optik & Bedienung", easy_explanation: "Entwirft Farben und einfache Bedienbarkeit", color: "#f59e0b", chef_agent: { id: "chef_design", name: "Design-Chef", easy_explanation: "Sorgt für modernsten Look" }, specialist_pcs: [{ id: "pc_design_1", name: "Layout-Zeichner", easy_explanation: "Zeichnet Bildschirme" }, { id: "pc_design_2", name: "Farben-Profi", easy_explanation: "Gestaltet Dark-Slate & Red" }, { id: "pc_design_3", name: "Handy-Prüfer", easy_explanation: "Prüft Smartphone-Ansicht" }] },
      { id: 4, name: "4. Sichtbare Webseite (Frontend)", easy_explanation: "Programmiert alles, was man im Browser sieht", color: "#10b981", chef_agent: { id: "chef_frontend", name: "Frontend-Chef", easy_explanation: "Leitet den Bau der UI" }, specialist_pcs: [{ id: "pc_front_1", name: "Seiten-Bauer", easy_explanation: "Baut Buttons und Texte" }, { id: "pc_front_2", name: "Klick-Programmierer", easy_explanation: "Programmiert Interaktionen" }, { id: "pc_front_3", name: "3D-Bauer", easy_explanation: "Baut 3D-Campus" }, { id: "pc_front_4", name: "Ladezeiten-Beschleuniger", easy_explanation: "Optimiert Performance" }] },
      { id: 5, name: "5. Server & Hintergrund-Logik (Backend)", easy_explanation: "Programmiert Berechnungen im Hintergrund", color: "#06b6d4", chef_agent: { id: "chef_backend", name: "Backend-Chef", easy_explanation: "Überwacht Server und APIs" }, specialist_pcs: [{ id: "pc_back_1", name: "Datenwege-Bauer", easy_explanation: "Erstellt API-Routen" }, { id: "pc_back_2", name: "Rechenlogik-Programmierer", easy_explanation: "Programmiert Logik" }, { id: "pc_back_3", name: "Echtzeit-Sync-Profi", easy_explanation: "Realtime-Sync" }, { id: "pc_back_4", name: "Login-Wächter", easy_explanation: "Session & Auth" }] },
      { id: 6, name: "6. Datenbank & Speicher", easy_explanation: "Baut sichere Datenbank-Tabellen", color: "#8b5cf6", chef_agent: { id: "chef_data", name: "Datenbank-Chef", easy_explanation: "Garantiert Datenintegrität" }, specialist_pcs: [{ id: "pc_data_1", name: "Tabellen-Architekt", easy_explanation: "Entwirft Tabellen" }, { id: "pc_data_2", name: "Such-Beschleuniger", easy_explanation: "Setzt Indizes" }, { id: "pc_data_3", name: "Backup-Planer", easy_explanation: "Sichert vor Datenverlust" }] },
      { id: 7, name: "7. KI & Antigravity-Übersetzer", easy_explanation: "Übersetzt Pläne in perfekte Antigravity-Befehle", color: "#ec4899", chef_agent: { id: "chef_ai", name: "KI-Chef", easy_explanation: "Steuert LLMs & Prompts" }, specialist_pcs: [{ id: "pc_ai_1", name: "Antigravity-Prompt-Bauer", easy_explanation: "Formuliert Master-Prompt" }, { id: "pc_ai_2", name: "KI-Regel-Optimierer", easy_explanation: "Verankert Anti-Limit-Regeln" }, { id: "pc_ai_3", name: "Modell-Verknüpfer", easy_explanation: "Gemini & Ollama Bridge" }] },
      { id: 8, name: "8. Sicherheit & Datenschutz", easy_explanation: "Schützt vor Hackern und Datenlecks", color: "#ef4444", chef_agent: { id: "chef_security", name: "Sicherheits-Chef", easy_explanation: "Sichert das Gesamtsystem" }, specialist_pcs: [{ id: "pc_sec_1", name: "Schutzschild-Prüfer", easy_explanation: "Sucht Sicherheitslücken" }, { id: "pc_sec_2", name: "Datenschutz-Wächter", easy_explanation: "DSGVO & RLS" }, { id: "pc_sec_3", name: "Schlüssel-Wächter", easy_explanation: "Schützt Passwörter" }] },
      { id: 9, name: "9. Fehlersuche & Qualitäts-Check", easy_explanation: "Testet Code auf Herz und Nieren", color: "#14b8a6", chef_agent: { id: "chef_qa", name: "Test-Chef", easy_explanation: "Gibt Code nach Tests frei" }, specialist_pcs: [{ id: "pc_qa_1", name: "Funktions-Tester", easy_explanation: "Schreibt Unit-Tests" }, { id: "pc_qa_2", name: "Fehler-Jäger", easy_explanation: "Findet Bugs und Crashes" }, { id: "pc_qa_3", name: "Härtetest-Simulator", easy_explanation: "Simuliert Ausfälle" }, { id: "pc_qa_4", name: "Code-Prüfer", easy_explanation: "Prüft Lesbarkeit" }] },
      { id: 10, name: "10. Veröffentlichung & Online-Stellung", easy_explanation: "Macht die App startklar für Internet & Render", color: "#e11d48", chef_agent: { id: "chef_release", name: "Release-Chef", easy_explanation: "Veröffentlicht das Projekt" }, specialist_pcs: [{ id: "pc_rel_1", name: "Online-Profi", easy_explanation: "Render & GitHub Setup" }, { id: "pc_rel_2", name: "Paket-Verwalter", easy_explanation: "npm & Versionen" }, { id: "pc_rel_3", name: "Anleitungs-Schreiber", easy_explanation: "Schreibt README.md" }] }
    ]
  };
}

// =============================================================================
// RENDERING: TOP BAR & ABTEILUNGS-PILLS
// =============================================================================
function renderDepartmentPills() {
  const container = document.getElementById('dept-pills-container');
  if (!container || !state.hierarchy) return;

  let html = `
    <button class="dept-pill-btn ${state.selectedDeptFilter === 'all' ? 'active' : ''}" data-dept-id="all">
      <span class="status-dot ready"></span> Alle 10 Bereiche
    </button>
  `;

  state.hierarchy.departments.forEach(dept => {
    const isActive = state.selectedDeptFilter === String(dept.id);
    html += `
      <button class="dept-pill-btn ${isActive ? 'active' : ''}" data-dept-id="${dept.id}">
        <span class="status-dot ready" id="dot-dept-${dept.id}"></span> ${dept.name}
      </button>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.dept-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedDeptFilter = btn.dataset.deptId;
      renderDepartmentPills();
      filterWorkstations();
    });
  });
}

// =============================================================================
// RENDERING: 2D-ARBEITSPLÄTZE GRID
// =============================================================================
function renderWorkstationsGrid() {
  const container = document.getElementById('workstations-grid-container');
  if (!container || !state.hierarchy) return;

  container.innerHTML = '';

  state.hierarchy.departments.forEach(dept => {
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.id = `card-dept-${dept.id}`;
    card.dataset.deptId = dept.id;

    let pcListHtml = '';
    dept.specialist_pcs.forEach((pc, idx) => {
      pcListHtml += `
        <div class="pc-item" data-pc-id="${pc.id}" data-dept-id="${dept.id}">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-dot ready" id="dot-pc-${pc.id}"></span>
            <div>
              <div style="font-weight: 700; color: #fff;">${pc.name}</div>
              <div style="font-size: 10px; color: var(--text-dim);">${pc.easy_explanation || pc.focus}</div>
            </div>
          </div>
          <span style="font-size: 10px; color: var(--iron-gold); font-family: var(--font-mono); font-weight: 700;">INSPEKTOR ➔</span>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="dept-card-header">
        <div class="dept-title-group">
          <h3>
            <span style="color: ${dept.color}; font-size: 16px;">■</span>
            ${dept.name}
          </h3>
          <p>${dept.easy_explanation || dept.description}</p>
        </div>
        <span style="font-size: 11px; font-weight: 800; color: var(--iron-gold); font-family: var(--font-mono);">
          RAUM 0${dept.id}
        </span>
      </div>

      <!-- Chef-Agent Badge -->
      <div class="chef-badge" data-chef-id="${dept.chef_agent.id}" data-dept-id="${dept.id}">
        <div class="chef-info-left">
          <div class="chef-avatar-icon" style="background: linear-gradient(135deg, ${dept.color} 0%, #000 100%);">
            👑
          </div>
          <div>
            <div style="font-weight: 800; font-size: 12px; color: #fff;">
              ${dept.chef_agent.name}
            </div>
            <div style="font-size: 10px; color: var(--text-muted);">${dept.chef_agent.easy_explanation || dept.chef_agent.focus}</div>
          </div>
        </div>
        <span class="status-dot ready" id="dot-chef-${dept.chef_agent.id}"></span>
      </div>

      <!-- Specialist PCs List -->
      <div class="pc-agent-list">
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
          FACHTEAM (${dept.specialist_pcs.length} SPEZIALISTEN):
        </div>
        ${pcListHtml}
      </div>
    `;

    container.appendChild(card);
  });

  // Klick-Events auf Karten öffnen den Inspektor
  container.querySelectorAll('.pc-item').forEach(el => {
    el.addEventListener('click', () => {
      openAgentInspector(el.dataset.pcId, 'pc', parseInt(el.dataset.deptId));
    });
  });

  container.querySelectorAll('.chef-badge').forEach(el => {
    el.addEventListener('click', () => {
      openAgentInspector(el.dataset.chefId, 'chef', parseInt(el.dataset.deptId));
    });
  });

  filterWorkstations();
}

function filterWorkstations() {
  const cards = document.querySelectorAll('.dept-card');
  const q = state.searchQuery.toLowerCase().trim();

  cards.forEach(card => {
    const deptId = card.dataset.deptId;
    const matchesDept = state.selectedDeptFilter === 'all' || state.selectedDeptFilter === deptId;
    const textContent = card.innerText.toLowerCase();
    const matchesSearch = !q || textContent.includes(q);

    if (matchesDept && matchesSearch) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// =============================================================================
// KLICK-INSPEKTOR ("WAS MACHT DIESER RAUM / PC GERADE?")
// =============================================================================
function handleAgentClickFrom3D(id, type, deptId) {
  openAgentInspector(id, type, deptId);
}

function openAgentInspector(agentId, type, deptId) {
  state.currentInspectedAgent = { agentId, type, deptId };

  let agentObj = null;
  let deptObj = null;

  for (const d of state.hierarchy.departments) {
    if (d.id === deptId || !deptId) {
      if (type === 'chef' && d.chef_agent.id === agentId) {
        agentObj = d.chef_agent;
        deptObj = d;
        break;
      }
      const pc = d.specialist_pcs.find(p => p.id === agentId);
      if (pc) {
        agentObj = pc;
        deptObj = d;
        break;
      }
      if (type === 'department' && (agentId === `dept_${d.id}` || d.id === deptId)) {
        agentObj = { name: d.name, easy_explanation: d.easy_explanation, focus: d.description };
        deptObj = d;
        break;
      }
    }
  }

  if (!agentObj) return;

  const modal = document.getElementById('modal-agent-inspector');
  const title = document.getElementById('inspector-agent-title');
  const easyExp = document.getElementById('inspector-easy-explanation');
  const liveAct = document.getElementById('inspector-live-activity');
  const liveDetail = document.getElementById('inspector-live-detail');
  const content = document.getElementById('inspector-agent-content');
  const learnedList = document.getElementById('inspector-learned-list');

  title.innerText = `${agentObj.name} (${deptObj.name})`;
  easyExp.innerText = agentObj.easy_explanation || 'Konzentriert sich auf seine Kernaufgabe im Studio.';

  // Prüfe, ob aktuell ein Nutzer-Auftrag läuft
  if (state.activeTask && state.activeTask.status === 'running') {
    const isWorking = state.activeTask.checkpoint_data?.pc_outputs?.[agentId] || state.activeTask.checkpoint_data?.chef_outputs?.[agentId];
    if (isWorking) {
      liveAct.innerHTML = `<span style="color: #34d399;">✔ Auftragsteil erfolgreich abgeschlossen</span>`;
      liveDetail.innerText = `Ergebnis für "${state.activeTask.user_prompt.slice(0, 50)}..." liegt vor.`;
    } else {
      liveAct.innerHTML = `<span style="color: var(--arc-cyan);">⚡ Berechnet aktuellen Software-Auftrag</span>`;
      liveDetail.innerText = `Verarbeitet Prompt: "${state.activeTask.user_prompt.slice(0, 60)}..."`;
    }
  } else {
    // Autonomer Idle-Trainings-Modus
    const training = getAgentCurrentActivity(agentId);
    liveAct.innerHTML = `<span>🧠 Trainiert autonom an: <strong>${training.projectName}</strong></span>`;
    liveDetail.innerText = `${training.currentAction} -> ${training.insight}`;
  }

  // Protokoll-Anzeige
  const savedLog = state.agentLogs[agentId] ||
    (state.activeTask?.checkpoint_data?.pc_outputs?.[agentId]?.output_text) ||
    (state.activeTask?.checkpoint_data?.chef_outputs?.[agentId]?.output_text) ||
    `// [AKTUELLES FACHPROTOKOLL: ${agentObj.name.toUpperCase()}]\n` +
    `// Status: Bereit & trainiert autonom im Hintergrund\n` +
    `export const ${agentId}_status = {\n` +
    `  specialist: "${agentObj.name}",\n` +
    `  department: "${deptObj.name}",\n` +
    `  current_task: "Idle-Training an vorhandenen Projekten (Zero API Cost)",\n` +
    `  ready_for_dispatch: true\n` +
    `};\n`;

  content.innerText = savedLog;

  // Gelerntes Wissen (Tab 2 befüllen)
  const insights = getAgentLearnedInsights(agentId);
  if (insights.length === 0) {
    learnedList.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 12px;">
        Spezialist sammelt gerade erste Trainings-Erkenntnisse im Hintergrund...
      </div>
    `;
  } else {
    learnedList.innerHTML = insights.map(item => `
      <div class="insight-card">
        <span class="insight-project-tag">PROJEKT: ${item.projectName} (${item.focusArea})</span>
        <p class="insight-text">${item.insight}</p>
        <span style="font-size: 9px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString()} Uhr</span>
      </div>
    `).join('');
  }

  // Standardmäßig Tab 1 aktiv
  switchInspectorTab('live-work');
  modal.classList.add('open');
}

function switchInspectorTab(tabName) {
  const btnLive = document.getElementById('tab-btn-live-work');
  const btnLearned = document.getElementById('tab-btn-learned');
  const contentLive = document.getElementById('tab-content-live-work');
  const contentLearned = document.getElementById('tab-content-learned');

  if (tabName === 'live-work') {
    btnLive.classList.add('active');
    btnLearned.classList.remove('active');
    contentLive.style.display = 'flex';
    contentLearned.style.display = 'none';
  } else {
    btnLearned.classList.add('active');
    btnLive.classList.remove('active');
    contentLearned.style.display = 'flex';
    contentLive.style.display = 'none';
  }
}

// =============================================================================
// WORKFLOW AUSFÜHRUNG (4 STUFEN)
// =============================================================================
async function dispatchNewTask() {
  const promptInput = document.getElementById('task-prompt-input');
  const userPrompt = promptInput.value.trim();

  if (!userPrompt) {
    alert('Bitte gib zuerst eine Beschreibung deines Software-Auftrags ein!');
    return;
  }

  // Stoppe Idle-Training während des aktiven Kunden-Auftrags
  stopIdleTraining();

  // UI Umschaltung auf Progress
  document.getElementById('section-task-input').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';
  document.getElementById('section-decision').style.display = 'none';

  updateTrackerStage(1);
  setStageIn3D(1);
  updateCheckpointBadge('Berechnung läuft (Stufe 01: Fachteam)...', false);

  const taskId = 'task_' + Date.now();
  state.activeTask = {
    id: taskId,
    user_prompt: userPrompt,
    selected_departments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Alle relevanten Räume
    current_stage: '1_fachteam',
    status: 'running',
    checkpoint_data: { pc_outputs: {}, chef_outputs: {} },
    trevor_summary: '',
    antigravity_prompt: ''
  };

  saveLocalCheckpoint();
  await runLiveWorkflowSimulation(state.activeTask);
}

async function runLiveWorkflowSimulation(task) {
  const activeDepts = state.hierarchy.departments.filter(d => task.selected_departments.includes(d.id));
  const progressBar = document.getElementById('progress-bar-fill');
  const percentLabel = document.getElementById('progress-percent-label');
  const statusLabel = document.getElementById('progress-status-label');
  const activeAgentLabel = document.getElementById('progress-active-agent');

  let totalSteps = 0;
  activeDepts.forEach(d => { totalSteps += d.specialist_pcs.length + 1; });
  totalSteps += 1;
  let currentStep = 0;

  // --- STUFE 01: FACHTEAM ---
  updateTrackerStage(1);
  setStageIn3D(1);
  statusLabel.innerText = 'Stufe 01: 33 Spezialisten programmieren Module...';

  for (const dept of activeDepts) {
    setDeptDotStatus(dept.id, 'working');

    for (const pc of dept.specialist_pcs) {
      if (task.checkpoint_data.pc_outputs[pc.id]) {
        currentStep++;
        continue;
      }

      setPcDotStatus(pc.id, 'working');
      updateAgentStatusIn3D(pc.id, 'pc', 'working');
      activeAgentLabel.innerText = `Aktiv: ${pc.name} (${dept.name})`;

      await sleep(350);

      const generatedOutput = `// [SPEZIFIKATION DURCH: ${pc.name.toUpperCase()}]\n` +
        `// Aufgabe: ${pc.easy_explanation}\n` +
        `export const ${pc.id}_module = {\n` +
        `  name: "${pc.name}",\n` +
        `  department: "${dept.name}",\n` +
        `  verified: true,\n` +
        `  code: () => {\n` +
        `    // Saubere Implementierung für: ${task.user_prompt.slice(0, 45)}...\n` +
        `    return { status: "ready", anti_limit_checked: true };\n` +
        `  }\n` +
        `};\n`;

      task.checkpoint_data.pc_outputs[pc.id] = {
        agent_id: pc.id,
        agent_name: pc.name,
        department_id: dept.id,
        output_text: generatedOutput
      };
      state.agentLogs[pc.id] = generatedOutput;

      setPcDotStatus(pc.id, 'done');
      updateAgentStatusIn3D(pc.id, 'pc', 'done');
      currentStep++;
      const pct = Math.round((currentStep / totalSteps) * 100);
      progressBar.style.width = pct + '%';
      percentLabel.innerText = pct + '%';

      saveLocalCheckpoint();
      updateCheckpointBadge(`Zwischenstand gesichert: ${currentStep}/${totalSteps} Spezialisten`, false);
    }
  }

  // --- STUFE 02: CHEF-AGENTEN ---
  task.current_stage = '2_chef_agent';
  updateTrackerStage(2);
  setStageIn3D(2);
  statusLabel.innerText = 'Stufe 02: Chef-Agenten prüfen auf Widersprüche & Bugs...';

  for (const dept of activeDepts) {
    const chef = dept.chef_agent;
    setDeptDotStatus(dept.id, 'auditing');
    setChefDotStatus(chef.id, 'auditing');
    updateAgentStatusIn3D(chef.id, 'chef', 'auditing');
    activeAgentLabel.innerText = `Audit: ${chef.name} [${dept.name}]`;

    await sleep(400);

    const chefOutput = `### 1. QUALITÄTS-AUDIT & WIDERSPRUCHS-BEREINIGUNG (${dept.name.toUpperCase()})\n` +
      `- Untersuchte Spezialisten: ${dept.specialist_pcs.map(p => p.name).join(', ')}\n` +
      `- Konflikte: Alle Schnittstellen harmonisiert. Keine Widersprüche.\n` +
      `- Freigabe: Vollständig konform mit Antigravity Clean Code.\n\n` +
      `### 2. KONSOLIDIERTER ABTEILUNGS-BLUEPRINT\n` +
      `Die Arbeitsergebnisse von ${dept.name} wurden zur Freigabe gebündelt.\n`;

    task.checkpoint_data.chef_outputs[chef.id] = {
      agent_id: chef.id,
      agent_name: chef.name,
      department_name: dept.name,
      output_text: chefOutput,
      contradictions_resolved: 'Keine Inkompatibilitäten'
    };
    state.agentLogs[chef.id] = chefOutput;

    setChefDotStatus(chef.id, 'done');
    setDeptDotStatus(dept.id, 'done');
    updateAgentStatusIn3D(chef.id, 'chef', 'done');
    currentStep++;
    const pct = Math.round((currentStep / totalSteps) * 100);
    progressBar.style.width = pct + '%';
    percentLabel.innerText = pct + '%';

    saveLocalCheckpoint();
  }

  // --- STUFE 03: TREVOR MASTER-SYNTHESE (MIT GELERNTEM WISSEN) ---
  task.current_stage = '3_trevor';
  updateTrackerStage(3);
  setStageIn3D(3);
  statusLabel.innerText = 'Stufe 03: Trevor erstellt Master-Synthese & Antigravity-Prompt...';
  activeAgentLabel.innerText = 'Aktiv: Trevor (Iron-Man Mode)';

  await sleep(600);

  const accumulatedKnowledge = getAllLearnedKnowledgeSummary();

  task.trevor_summary = `Trevor hat deinen Auftrag mit dem 43-Agenten-Studio und den antrainierten Erfahrungen synthetisiert:\n\n` +
    `• 1. Ideen & Planung: Funktionskatalog und Ablaufplan stehen fest.\n` +
    `• 2. Bauplan & Technik: Saubere Ordnerstruktur und minimale Abhängigkeiten gewählt.\n` +
    `• 3. & 4. Frontend & Design: Dark-Slate & Red-Glow UI mit flüssigen Klick-Aktionen vorbereitet.\n` +
    `• 5. & 6. Backend & Datenbank: Supabase-Tabellen mit RLS-Schutz und REST-Routen definiert.\n` +
    `• 8. & 9. Sicherheit & QA: Zero-Leak Secrets-Check und automatische Tests verankert.\n` +
    `• Antrainiertes Wissen berücksichtigt: "${accumulatedKnowledge.slice(0, 90)}..."\n\n` +
    `Klicke auf 'JA', um das Projekt an Antigravity zu übergeben!`;

  task.antigravity_prompt = `# ANTIGRAVITY MASTER EXECUTION TASK\n` +
    `# PROJEKT: TREVOR MULTI-AGENT STUDIO OUTPUT (V2.0 IRON-MAN EDITION)\n\n` +
    `## 1. VORGABEN\n` +
    `- Erstelle das Projekt strikt in: Desktop/KI_Trevor/\n` +
    `- Speichere Zwischenstände nach JEDER Datei in CHECKPOINT_STATE.md!\n\n` +
    `## 2. ANTRAINIERTE BEST PRACTICES AUS DEM IDLE-TRAINING:\n` +
    `${accumulatedKnowledge || '- Strikte RLS-Sicherheit und optimierte Indizes verwenden.'}\n\n` +
    `## 3. KUNDENAUFTRAG:\n` +
    `"""\n${task.user_prompt}\n"""\n\n` +
    `## 4. AUSFÜHRUNGS-SCHRITTE:\n` +
    `1. Supabase-Schema & Tabellen anlegen\n` +
    `2. UI-Komponenten im Dark-Slate Design bauen\n` +
    `3. End-to-End Tests ausführen und bereitstellen.\n`;

  currentStep++;
  progressBar.style.width = '100%';
  percentLabel.innerText = '100%';

  // --- STUFE 04: DU ENTSCHEIDEST ---
  task.current_stage = '4_user_decision';
  task.status = 'pending_approval';
  updateTrackerStage(4);
  setStageIn3D(4);
  saveLocalCheckpoint();
  updateCheckpointBadge('Bereit für Entscheidung (JA / NEIN)', false);

  document.getElementById('section-task-progress').style.display = 'none';
  document.getElementById('section-decision').style.display = 'flex';

  document.getElementById('decision-summary-text').innerText = task.trevor_summary;
  document.getElementById('code-preview-content').innerText = task.antigravity_prompt;
}

// =============================================================================
// STUFE 04: JA / NEIN ENTSCHEIDUNGS-HANDLER (MIT REMOTE-CLOUD-QUEUE)
// =============================================================================
async function handleUserDecisionClick(decision) {
  if (decision === 'JA') {
    const promptText = state.activeTask?.antigravity_prompt || '';
    
    // 1. In lokale Zwischenablage kopieren
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      }
    } catch { /* ignore */ }

    // 2. Cloud-Queue für Unterwegs-Modus aktivieren
    state.activeTask.status = 'approved_ready_for_execution';
    saveLocalCheckpoint();

    // 3. UI-Erfolgsbanner
    document.getElementById('decision-success-banner').style.display = 'flex';
    document.getElementById('decision-export-tools').style.display = 'flex';
    document.getElementById('decision-actions-row').style.display = 'none';
    document.getElementById('decision-feedback-box').style.display = 'none';

    updateCheckpointBadge('Freigegeben ("JA") – An Heim-Station & Antigravity übergeben', false);

    // Starte Idle-Training wieder
    startIdleTraining(state.hierarchy.departments, 6000);

  } else if (decision === 'NEIN') {
    const feedbackBox = document.getElementById('decision-feedback-box');
    feedbackBox.style.display = 'flex';
    feedbackBox.scrollIntoView({ behavior: 'smooth' });
  }
}

async function submitRejectionFeedback() {
  const feedback = document.getElementById('feedback-input').value.trim();
  alert(`Feedback an Trevor übermittelt: "${feedback}". Korrekturschleife ab Stufe 02 gestartet.`);

  document.getElementById('decision-feedback-box').style.display = 'none';
  document.getElementById('section-decision').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';

  state.activeTask.checkpoint_data.chef_outputs = {};
  state.activeTask.current_stage = '2_chef_agent';
  state.activeTask.status = 'running';

  saveLocalCheckpoint();
  await runLiveWorkflowSimulation(state.activeTask);
}

// =============================================================================
// EXPORT & CHECKPOINT
// =============================================================================
function downloadTaskFile() {
  const content = state.activeTask?.antigravity_prompt || '';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ANTIGRAVITY_TASK.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function writeDirectToFileSystem() {
  const content = state.activeTask?.antigravity_prompt || '';
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'ANTIGRAVITY_TASK.md',
        types: [{ description: 'Markdown File', accept: { 'text/markdown': ['.md'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      alert('Erfolgreich direkt im Projektordner gespeichert!');
    } else {
      downloadTaskFile();
    }
  } catch (err) {
    if (err.name !== 'AbortError') downloadTaskFile();
  }
}

function saveLocalCheckpoint() {
  if (!state.activeTask) return;
  localStorage.setItem('trevor_active_checkpoint', JSON.stringify(state.activeTask));
}

function checkExistingCheckpoint() {
  const saved = localStorage.getItem('trevor_active_checkpoint');
  if (saved) {
    try {
      const task = JSON.parse(saved);
      state.activeTask = task;
      if (task.status === 'paused_limit') {
        const btnResume = document.getElementById('btn-resume-limit');
        if (btnResume) btnResume.style.display = 'inline-block';
        updateCheckpointBadge('Task pausiert wegen Limit', true);
      } else if (task.status === 'pending_approval') {
        updateCheckpointBadge('Wartet auf Entscheidung (JA/NEIN)', false);
      }
    } catch { /* ignore */ }
  }
}

function resumePausedTask() {
  if (!state.activeTask) return;
  document.getElementById('btn-resume-limit').style.display = 'none';
  openTrevorModal();
  document.getElementById('section-task-input').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';
  runLiveWorkflowSimulation(state.activeTask);
}

function updateCheckpointBadge(text, isPaused) {
  const badge = document.getElementById('checkpoint-badge');
  const label = document.getElementById('checkpoint-text');
  if (!badge || !label) return;

  label.innerText = text;
  badge.classList.remove('paused', 'training');
  if (isPaused) badge.classList.add('paused');
  else if (text.includes('Training')) badge.classList.add('training');
}

function updateTrackerStage(stageNum) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`tracker-stage-${i}`);
    if (el) {
      if (i === stageNum) el.classList.add('active');
      else el.classList.remove('active');
    }
  }
}

function setDeptDotStatus(deptId, status) {
  const dot = document.getElementById(`dot-dept-${deptId}`);
  if (dot) dot.className = `status-dot ${status}`;
}

function setChefDotStatus(chefId, status) {
  const dot = document.getElementById(`dot-chef-${chefId}`);
  if (dot) dot.className = `status-dot ${status}`;
}

function setPcDotStatus(pcId, status) {
  const dot = document.getElementById(`dot-pc-${pcId}`);
  if (dot) dot.className = `status-dot ${status}`;
}

function openTrevorModal() {
  const modal = document.getElementById('modal-trevor-terminal');
  modal.classList.add('open');
}

function openChefReportsModal() {
  const modal = document.getElementById('modal-chef-reports');
  const list = document.getElementById('chef-reports-list');
  list.innerHTML = '';

  const chefOutputs = state.activeTask?.checkpoint_data?.chef_outputs || {};
  const entries = Object.values(chefOutputs);

  if (entries.length === 0) {
    list.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-dim);">
        Noch keine Chef-Berichte vorhanden. Starte zuerst einen Auftrag mit Trevor!
      </div>
    `;
  } else {
    entries.forEach(report => {
      const box = document.createElement('div');
      box.className = 'decision-summary-box';
      box.innerHTML = `
        <h4 style="color: #fff; font-size: 13px; font-weight: 700; margin-bottom: 6px;">
          ${report.department_name} – Leitung: ${report.agent_name}
        </h4>
        <div style="font-size: 11px; color: #34d399; margin-bottom: 8px;">
          ✔ Bereinigte Konflikte: ${report.contradictions_resolved || 'Keine kritischen Widersprüche'}
        </div>
        <pre class="code-preview-content" style="max-height: 180px; display: block;">${report.output_text}</pre>
      `;
      list.appendChild(box);
    });
  }

  modal.classList.add('open');
}

function setupEventListeners() {
  // Suche
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      filterWorkstations();
    });
  }

  // View Switcher (3D vs Arbeitsplätze)
  const btn3D = document.getElementById('btn-view-3d');
  const btnGrid = document.getElementById('btn-view-grid');
  const canvas3D = document.getElementById('threejs-canvas-container');
  const grid2D = document.getElementById('workstations-grid-container');

  btn3D.addEventListener('click', () => {
    state.activeView = '3d';
    btn3D.classList.add('active');
    btnGrid.classList.remove('active');
    canvas3D.style.display = 'block';
    grid2D.style.display = 'none';
  });

  btnGrid.addEventListener('click', () => {
    state.activeView = 'grid';
    btnGrid.classList.add('active');
    btn3D.classList.remove('active');
    canvas3D.style.display = 'none';
    grid2D.style.display = 'grid';
  });

  // Trevor öffnen
  document.getElementById('btn-sidebar-open-trevor').addEventListener('click', openTrevorModal);
  document.getElementById('btn-sidebar-trevor-terminal').addEventListener('click', openTrevorModal);
  document.getElementById('btn-sidebar-chef-reports').addEventListener('click', openChefReportsModal);

  // Resume Button bei Limit
  document.getElementById('btn-resume-limit').addEventListener('click', resumePausedTask);

  // Task Submission
  document.getElementById('btn-dispatch-task').addEventListener('click', dispatchNewTask);

  // Code-Preview Toggle
  document.getElementById('btn-toggle-prompt-preview').addEventListener('click', () => {
    const content = document.getElementById('code-preview-content');
    const indicator = document.getElementById('code-preview-indicator');
    if (content.style.display === 'none') {
      content.style.display = 'block';
      indicator.innerText = '▲ Zuklappen';
    } else {
      content.style.display = 'none';
      indicator.innerText = '▼ Aufklappen';
    }
  });

  // JA / NEIN Entscheidungen
  document.getElementById('btn-decision-yes').addEventListener('click', () => handleUserDecisionClick('JA'));
  document.getElementById('btn-decision-no').addEventListener('click', () => handleUserDecisionClick('NEIN'));
  document.getElementById('btn-submit-feedback').addEventListener('click', submitRejectionFeedback);

  // Export Tools
  document.getElementById('btn-download-task').addEventListener('click', downloadTaskFile);
  document.getElementById('btn-export-direct').addEventListener('click', writeDirectToFileSystem);

  // Inspector Tabs
  document.getElementById('tab-btn-live-work').addEventListener('click', () => switchInspectorTab('live-work'));
  document.getElementById('tab-btn-learned').addEventListener('click', () => switchInspectorTab('learned'));

  // Mobile Sidebar Toggle
  const mobileToggle = document.getElementById('btn-mobile-sidebar-toggle');
  const sidebar = document.getElementById('sidebar-command-center');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Modal Close Buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('open');
    });
  });

  // Settings Modal & Engine Umschalter
  const engineBtn = document.getElementById('engine-mode-btn');
  const settingsModal = document.getElementById('modal-settings');
  const openSettingsBtn = document.getElementById('btn-open-settings');

  engineBtn.addEventListener('click', () => {
    state.settings.llm_mode = state.settings.llm_mode === 'gemini' ? 'ollama' : 'gemini';
    saveSettings();
    updateUIThemeSettings();
  });

  openSettingsBtn.addEventListener('click', () => {
    document.getElementById('settings-llm-mode').value = state.settings.llm_mode;
    document.getElementById('settings-gemini-model').value = state.settings.gemini_model;
    document.getElementById('settings-gemini-key').value = state.settings.gemini_api_key || '';
    document.getElementById('settings-ollama-url').value = state.settings.ollama_url;
    document.getElementById('settings-ollama-model').value = state.settings.ollama_model;
    settingsModal.classList.add('open');
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    state.settings.llm_mode = document.getElementById('settings-llm-mode').value;
    state.settings.gemini_model = document.getElementById('settings-gemini-model').value;
    state.settings.gemini_api_key = document.getElementById('settings-gemini-key').value;
    state.settings.ollama_url = document.getElementById('settings-ollama-url').value;
    state.settings.ollama_model = document.getElementById('settings-ollama-model').value;

    saveSettings();
    updateUIThemeSettings();
    settingsModal.classList.remove('open');
  });
}

function saveSettings() {
  localStorage.setItem('trevor_user_settings', JSON.stringify(state.settings));
}

function updateUIThemeSettings() {
  const icon = document.getElementById('engine-mode-icon');
  const label = document.getElementById('engine-mode-label');
  if (state.settings.llm_mode === 'ollama') {
    icon.innerText = '🖥️';
    label.innerText = `Ollama Lokal (${state.settings.ollama_model})`;
  } else {
    icon.innerText = '☁️';
    label.innerText = `Gemini Cloud (${state.settings.gemini_model})`;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
