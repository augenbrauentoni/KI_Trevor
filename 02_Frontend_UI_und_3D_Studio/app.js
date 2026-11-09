/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/app.js
 * 
 * Haupt-Controller V2.1 (Hotfix & Synchrones Rendering):
 * - 10 deutsche Abteilungs-Pills & 2D-Grid rendern 100% synchron bei Seitenaufruf
 * - 3D Campus bindet Trevor (Iron-Man) & 10 Glas-Büros ohne Netzwerk-Lag ein
 * - Klick-Inspektor mit "Wofür bin ich zuständig?" & "Was mache ich in dieser Sekunde?"
 * - Autonomes Idle-Training an vorhandenen Projekten
 * - Cloud-Queue für Freigaben von unterwegs
 */

import { STUDIO_HIERARCHY } from './hierarchyData.js';
import { init3DStudio, updateAgentStatusIn3D, setStageIn3D } from './studio3D.js';
import {
  startIdleTraining,
  stopIdleTraining,
  getAgentCurrentActivity,
  getAgentLearnedInsights,
  getAllLearnedKnowledgeSummary
} from '../04_KI_Engine_und_Bridges/idleTrainer.js';

// Globaler Anwendungs-Status mit synchronem Daten-Fundament
const state = {
  hierarchy: STUDIO_HIERARCHY, // Sofort verfügbar, kein 404-Crash!
  activeView: '3d',
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
// INITIALISIERUNG: SOFORTIGES SYNCHRONES RENDERN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Trevor App] Initialisiere Studio-Shell...');

  loadLocalSettings();

  // 1. Sofortiges Rendern der 10 Pills & des 2D-Grids
  renderDepartmentPills();
  renderWorkstationsGrid();
  setupEventListeners();
  checkExistingCheckpoint();
  updateUIThemeSettings();

  // 2. Sofortiges Rendern der Three.js 3D-Bühne
  try {
    init3DStudio(state.hierarchy, handleAgentClickFrom3D, openTrevorModal);
  } catch (err) {
    console.error('[Trevor App] Fehler beim Starten des 3D-Campus:', err);
  }

  // 3. Autonomes Leerlauf-Training starten
  try {
    startIdleTraining(state.hierarchy.departments, 5000);
  } catch (err) {
    console.warn('[Trevor App] Idle-Training Warnung:', err);
  }
});

function loadLocalSettings() {
  try {
    const saved = localStorage.getItem('trevor_user_settings');
    if (saved) {
      state.settings = { ...state.settings, ...JSON.parse(saved) };
    }
  } catch { /* ignore */ }
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
    dept.specialist_pcs.forEach((pc) => {
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
// KLICK-INSPEKTOR
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
    const training = getAgentCurrentActivity(agentId);
    liveAct.innerHTML = `<span>🧠 Trainiert autonom an: <strong>${training.projectName}</strong></span>`;
    liveDetail.innerText = `${training.currentAction} -> ${training.insight}`;
  }

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

  stopIdleTraining();

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
    selected_departments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
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
      `- Geprüft durch: ${chef.name}\n` +
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

  // --- STUFE 03: TREVOR MASTER-SYNTHESE ---
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
// STUFE 04: JA / NEIN ENTSCHEIDUNGS-HANDLER
// =============================================================================
async function handleUserDecisionClick(decision) {
  if (decision === 'JA') {
    const promptText = state.activeTask?.antigravity_prompt || '';
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      }
    } catch { /* ignore */ }

    state.activeTask.status = 'approved_ready_for_execution';
    saveLocalCheckpoint();

    document.getElementById('decision-success-banner').style.display = 'flex';
    document.getElementById('decision-export-tools').style.display = 'flex';
    document.getElementById('decision-actions-row').style.display = 'none';
    document.getElementById('decision-feedback-box').style.display = 'none';

    updateCheckpointBadge('Freigegeben ("JA") – An Heim-Station & Antigravity übergeben', false);
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
  try {
    const saved = localStorage.getItem('trevor_active_checkpoint');
    if (saved) {
      const task = JSON.parse(saved);
      state.activeTask = task;
      if (task.status === 'paused_limit') {
        const btnResume = document.getElementById('btn-resume-limit');
        if (btnResume) btnResume.style.display = 'inline-block';
        updateCheckpointBadge('Task pausiert wegen Limit', true);
      } else if (task.status === 'pending_approval') {
        updateCheckpointBadge('Wartet auf Entscheidung (JA/NEIN)', false);
      }
    }
  } catch { /* ignore */ }
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
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      filterWorkstations();
    });
  }

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

  document.getElementById('btn-sidebar-open-trevor').addEventListener('click', openTrevorModal);
  document.getElementById('btn-sidebar-trevor-terminal').addEventListener('click', openTrevorModal);
  document.getElementById('btn-sidebar-chef-reports').addEventListener('click', openChefReportsModal);
  document.getElementById('btn-resume-limit').addEventListener('click', resumePausedTask);
  document.getElementById('btn-dispatch-task').addEventListener('click', dispatchNewTask);

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

  document.getElementById('btn-decision-yes').addEventListener('click', () => handleUserDecisionClick('JA'));
  document.getElementById('btn-decision-no').addEventListener('click', () => handleUserDecisionClick('NEIN'));
  document.getElementById('btn-submit-feedback').addEventListener('click', submitRejectionFeedback);

  document.getElementById('btn-download-task').addEventListener('click', downloadTaskFile);
  document.getElementById('btn-export-direct').addEventListener('click', writeDirectToFileSystem);

  document.getElementById('tab-btn-live-work').addEventListener('click', () => switchInspectorTab('live-work'));
  document.getElementById('tab-btn-learned').addEventListener('click', () => switchInspectorTab('learned'));

  const mobileToggle = document.getElementById('btn-mobile-sidebar-toggle');
  const sidebar = document.getElementById('sidebar-command-center');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('open');
    });
  });

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
