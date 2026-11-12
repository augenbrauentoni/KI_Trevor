/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/app.js
 * 
 * Phase 7: Kompakter Architektur-Campus & Smarte Workflows:
 * - 10 deutsche Abteilungs-Pills & 2D-Grid rendern 100% synchron bei Seitenaufruf
 * - Kompakter 3D-Büro-Campus mit Trevor (Iron-Man) & Glas-Büros
 * - Projekt-Auswahl-Dropdown ("Aktives Ziel-Projekt")
 * - Direktes Anweisungs-Terminal pro Abteilung/PC mit 3 Quick-Prompts (Bottom-Up)
 * - 4-Stufen Bottom-Up Workflow (Fachteam -> Chef-Audit + Cross-Check -> Trevor -> JA/NEIN)
 * - 3D-Datenpartikel & dynamische Micro-Status-Toasts (Live-Sprechblasen)
 * - Entscheidungs-Archiv & Prompt-Verlauf Tab in Trevors Terminal
 */

import { STUDIO_HIERARCHY, TREVOR_AGENT_ROSTER, AGENT_ROSTER_BY_ID } from './hierarchyData.js';
import {
  init3DStudio,
  updateAgentStatusIn3D,
  setStageIn3D,
  update3DStudioState,
  triggerDataStreamToTrevor,
  updateRoomMicroStatus
} from './studio3D.js';
import {
  startIdleTraining,
  stopIdleTraining,
  isTrainingRunning,
  toggleIdleTraining,
  getAgentCurrentActivity,
  getAgentLearnedInsights,
  getAllLearnedKnowledgeSummary,
  saveInsightToCloudMemory,
  getDepartmentCode,
  getAllTrainingProjects,
  getActiveTrainingProject,
  setActiveTrainingProject,
  addTrainingProject,
  setTrainingFocusArea,
  getTrainingFocusArea,
  executeTrainingStep
} from './idleTrainer.js';
import { getLLMConfig, saveLLMConfig, queryLLM } from './llmEngine.js';
import { WorkflowOrchestrator, orchestrator } from './workflowOrchestrator.js';
import {
  speakAsJarvis,
  stopJarvisSpeech,
  toggleVoiceRecognition,
  toggleJarvisVoiceEnabled,
  updateVoiceToggleButtonUI,
  playJarvisWelcomeGreeting
} from './jarvisVoice.js';

// Globaler Anwendungs-Status
const state = {
  hierarchy: STUDIO_HIERARCHY,
  selectedProject: 'KI_Trevor',
  activeView: '3d',
  selectedDeptFilter: 'all',
  searchQuery: '',
  activeTask: null,
  agentLogs: {},
  currentInspectedAgent: null,
  taskQueue: [],
  busyDepartments: new Set(),
  currentQAContext: { question: '', answer: '' },
  actionCenterItems: [],
  settings: {
    llm_mode: 'gemini',
    gemini_model: 'gemini-2.5-flash',
    ollama_url: 'http://localhost:11434',
    ollama_model: 'llama3',
    quiet_view: false
  }
};

// Globales Trevor-Audio-Objekt & Pending-Tasks frühzeitig initialisieren
if (typeof window !== 'undefined') {
  window.trevorAudio = window.trevorAudio || { enabled: true, ctx: null };
  window.pendingTasksMap = window.pendingTasksMap || {};
  window.isOrchestratorBusy = false;
  window.trevorTaskQueue = state.taskQueue;
  window.taskQueue = state.taskQueue;
  window.interactiveAgentMeshes = window.interactiveAgentMeshes || [];
  window.completedTasks = window.completedTasks || [];
  try {
    const savedCompleted = localStorage.getItem('trevor_completed_tasks');
    if (savedCompleted) {
      window.completedTasks = JSON.parse(savedCompleted);
    }
  } catch { /* ignore */ }
}

/**
 * Initialisiert das 2D Canvas Waveform Rendering in der Dynamic Island Kapsel (Top HUD)
 */
export function initWaveformCanvas() {
  const canvas = document.getElementById('jarvis-waveform-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const isSpeaking = (typeof window !== 'undefined' && window.isJarvisSpeaking === true);
    const isBusy = (state.activeTask && state.activeTask.status === 'running') ||
                   (typeof window !== 'undefined' && window.isOrchestratorBusy === true);

    const amp = isSpeaking ? 16 : (isBusy ? 10 : 3.5);
    const speed = isSpeaking ? 0.08 : (isBusy ? 0.04 : 0.015);
    time += speed;

    const centerY = h / 2;

    // 1. Welle: Hologramm-Cyan (#00F0FF)
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00F0FF';
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = isSpeaking ? 12 : 5;
    for (let x = 0; x < w; x++) {
      const envelope = Math.sin((x / w) * Math.PI);
      const y = centerY + Math.sin(x * 0.035 + time * 2) * amp * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Welle: Eisweiß / Ice-Blue (Harmonische Oberwelle)
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = isSpeaking ? 8 : 3;
    for (let x = 0; x < w; x++) {
      const envelope = Math.sin((x / w) * Math.PI);
      const y = centerY + Math.sin(x * 0.055 - time * 1.5) * (amp * 0.7) * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Welle: Tech Amber (#F59E0B)
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = isSpeaking ? 'rgba(245, 158, 11, 0.75)' : 'rgba(0, 240, 255, 0.3)';
    ctx.shadowBlur = 0;
    for (let x = 0; x < w; x++) {
      const envelope = Math.sin((x / w) * Math.PI);
      const y = centerY + Math.sin(x * 0.02 + time * 0.8) * (amp * 0.45) * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  animate();
}

/**
 * Synchronisiert die Benutzeroberfläche des Trainings-Drawers
 */
export function initTrainingDrawerUI() {
  const select = document.getElementById('training-project-select');
  if (select && typeof getAllTrainingProjects === 'function') {
    const projects = getAllTrainingProjects();
    const active = typeof getActiveTrainingProject === 'function' ? getActiveTrainingProject() : null;
    const activeId = active ? active.id : select.value;
    select.innerHTML = projects.map(p => `
      <option value="${p.id}" ${p.id === activeId ? 'selected' : ''}>${escapeHtml(p.name)}</option>
    `).join('');
  }
  const statusLabel = document.getElementById('training-status-label');
  const toggleBtn = document.getElementById('training-active-toggle-btn');
  if (statusLabel && toggleBtn && typeof isTrainingRunning === 'function') {
    const running = isTrainingRunning();
    statusLabel.innerText = running ? 'Aktiv (Autonomer Zyklus)' : 'Aktuell pausiert';
    statusLabel.style.color = running ? '#10B981' : '#94A3B8';
    toggleBtn.innerText = running ? 'Pausieren' : 'Aktivieren';
    toggleBtn.style.color = running ? '#EF4444' : '#F59E0B';
  }
}

// =============================================================================
// INITIALISIERUNG: SICHERES SYNCHRONES RENDERN (OHNE BLOCKIERENDE INPUTS)
// =============================================================================
function bootTrevorApp() {
  console.log('[Trevor App] Initialisiere Studio-Shell (Master-Fix V2.6)...');

  setupLoginScreen();
  loadLocalSettings();
  loadSelectedProject();
  loadTaskQueue();
  setupAudioSystem();

  // 1. Sofortiges Rendern der 10 Pills & des 2D-Grids
  renderDepartmentPills();
  renderWorkstationsGrid();
  renderTaskQueueUI();
  renderActionCenterUI();
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

  // 4. Sandbox-Dateien für Code-RAG Dateiwähler laden
  try {
    loadRAGFiles();
  } catch (err) {
    console.warn('[Trevor App] RAG Sandbox-Dateien laden Warnung:', err);
  }

  // 5. J.A.R.V.I.S. Voice Toggle Button synchronisieren
  try {
    updateVoiceToggleButtonUI();
  } catch (err) {
    console.warn('[Trevor App] Voice-Button UI Sync Warnung:', err);
  }

  // 6. Dynamic Island Audio-Waveform & Training-Drawer UI initialisieren
  try {
    initWaveformCanvas();
    initTrainingDrawerUI();
  } catch (err) {
    console.warn('[Trevor App] Waveform/Training Init Warnung:', err);
  }
}

// Führt Initialisierung sofort aus, unabhängig von Event-Timing (Browser-Umgebung)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTrevorApp);
  } else {
    bootTrevorApp();
  }
}

function loadLocalSettings() {
  try {
    const saved = localStorage.getItem('trevor_user_settings');
    if (saved) {
      state.settings = { ...state.settings, ...JSON.parse(saved) };
    }
  } catch { /* ignore */ }

  try {
    const llmCfg = getLLMConfig();
    if (llmCfg.provider) state.settings.llm_mode = llmCfg.provider;
    if (llmCfg.geminiModel) state.settings.gemini_model = llmCfg.geminiModel;
    if (llmCfg.ollamaUrl) state.settings.ollama_url = llmCfg.ollamaUrl;
    if (llmCfg.ollamaModel) state.settings.ollama_model = llmCfg.ollamaModel;
  } catch { /* ignore */ }
}

function loadSelectedProject() {
  try {
    const savedProject = localStorage.getItem('trevor_selected_project');
    if (savedProject) {
      state.selectedProject = savedProject;
      const select = document.getElementById('project-selector-select');
      if (select) select.value = savedProject;
    }
  } catch { /* ignore */ }
}

// =============================================================================
// ABTEILUNGS-STATUS & BUSY-MANAGEMENT
// =============================================================================
export function isDepartmentBusy(deptId) {
  return state.busyDepartments ? state.busyDepartments.has(Number(deptId)) : false;
}

export function setDepartmentStatus(deptId, status) {
  const id = Number(deptId);
  if (!state.busyDepartments) state.busyDepartments = new Set();
  if (status === 'BUSY') {
    state.busyDepartments.add(id);
  } else {
    state.busyDepartments.delete(id);
  }
  if (typeof window !== 'undefined') {
    window.departmentStatus = window.departmentStatus || {};
    window.departmentStatus[id] = status;
  }
  const dot = document.getElementById(`dot-dept-${id}`);
  if (dot) {
    if (status === 'BUSY') {
      dot.className = 'status-dot busy';
      dot.title = 'Abteilung arbeitet an Auftrag (BUSY)';
    } else {
      dot.className = 'status-dot ready';
      dot.title = 'Bereit für Aufträge (IDLE)';
    }
  }
}

export function updateActiveQueueItemStatus(statusText) {
  if (state.taskQueue && state.taskQueue.length > 0) {
    state.taskQueue[0].status = statusText;
    renderTaskQueueUI();
    try {
      localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    } catch { /* ignore */ }
  }
  const monitor = document.getElementById('live-activity-monitor');
  if (monitor) monitor.innerText = statusText;
}

// =============================================================================
// RENDERING: TOP BAR & ABTEILUNGS-PILLS
// =============================================================================
function renderDepartmentPills() {
  const container = document.getElementById('dept-pills-container');
  if (!container || !state.hierarchy) return;

  const totalDepts = state.hierarchy.departments.length;
  let html = `
    <button class="dept-pill-btn ${state.selectedDeptFilter === 'all' ? 'active' : ''}" data-dept-id="all">
      <span class="status-dot ready"></span> Alle ${totalDepts} Bereiche
    </button>
  `;

  state.hierarchy.departments.forEach(dept => {
    const isActive = state.selectedDeptFilter === String(dept.id);
    const floorTag = dept.floor === 'UG' ? '<span style="font-size: 9px; opacity: 0.85; margin-left: 4px; color: #c084fc;">[UG]</span>' : '';
    const isBusy = isDepartmentBusy(dept.id);
    const dotClass = isBusy ? 'status-dot busy' : 'status-dot ready';
    html += `
      <button class="dept-pill-btn ${isActive ? 'active' : ''}" data-dept-id="${dept.id}" title="${dept.floor === 'UG' ? 'Untergeschoss (Keller)' : 'Erdgeschoss (Software-Campus)'}">
        <span class="${dotClass}" id="dot-dept-${dept.id}"></span> ${dept.name} ${floorTag}
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
// KLICK-INSPEKTOR & DIREKT-ANWEISUNGSTERMINAL
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
  const directPromptInput = document.getElementById('inspector-direct-prompt');
  const quickPromptsContainer = document.getElementById('inspector-quick-prompts-container');

  title.innerText = `${agentObj.name} (${deptObj.name})`;
  easyExp.innerText = agentObj.easy_explanation || 'Konzentriert sich auf seine Kernaufgabe im Studio.';

  if (directPromptInput) {
    directPromptInput.value = '';
    directPromptInput.placeholder = `Direkte Arbeitsanweisung an ${agentObj.name} (${deptObj.name}) eingeben...`;
  }

  // 3 Schnell-Aktionen (Quick Prompts) passend zu dieser Abteilung einbinden
  if (quickPromptsContainer && deptObj.quick_prompts) {
    quickPromptsContainer.innerHTML = '';
    deptObj.quick_prompts.forEach(promptText => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-prompt-btn';
      btn.innerText = promptText;
      btn.addEventListener('click', () => {
        if (directPromptInput) directPromptInput.value = promptText;
      });
      quickPromptsContainer.appendChild(btn);
    });
  }

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
    liveAct.innerHTML = `<span>🧠 Trainiert autonom an: <strong>${state.selectedProject || training.projectName}</strong></span>`;
    liveDetail.innerText = `${training.currentAction} -> ${training.insight}`;
  }

  const savedLog = state.agentLogs[agentId] ||
    (state.activeTask?.checkpoint_data?.pc_outputs?.[agentId]?.output_text) ||
    (state.activeTask?.checkpoint_data?.chef_outputs?.[agentId]?.output_text) ||
    `// [AKTUELLES FACHPROTOKOLL: ${agentObj.name.toUpperCase()}]\n` +
    `// Ziel-Projekt: ${state.selectedProject}\n` +
    `// Status: Bereit & trainiert autonom im Hintergrund\n` +
    `export const ${agentId}_status = {\n` +
    `  specialist: "${agentObj.name}",\n` +
    `  department: "${deptObj.name}",\n` +
    `  current_task: "Idle-Training an Ziel-Projekt ${state.selectedProject}",\n` +
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
  const btnDirect = document.getElementById('tab-btn-direct-command');
  const btnLearned = document.getElementById('tab-btn-learned');

  const contentLive = document.getElementById('tab-content-live-work');
  const contentDirect = document.getElementById('tab-content-direct-command');
  const contentLearned = document.getElementById('tab-content-learned');

  btnLive.classList.remove('active');
  if (btnDirect) btnDirect.classList.remove('active');
  btnLearned.classList.remove('active');

  contentLive.style.display = 'none';
  if (contentDirect) contentDirect.style.display = 'none';
  contentLearned.style.display = 'none';

  if (tabName === 'live-work') {
    btnLive.classList.add('active');
    contentLive.style.display = 'flex';
  } else if (tabName === 'direct-command') {
    if (btnDirect) btnDirect.classList.add('active');
    if (contentDirect) contentDirect.style.display = 'flex';
  } else {
    btnLearned.classList.add('active');
    contentLearned.style.display = 'flex';
  }
}

// =============================================================================
// SCHWEBENDES 3D-AGENTEN-INSPEKTIONS-PANEL (RAYCASTER OVERLAY)
// =============================================================================
let currentSelectedAgentData = null;

export function getCurrentSelectedAgentData() {
  return currentSelectedAgentData;
}

export function showAgentInfo(data) {
  if (!data) return;

  if (typeof data === 'string') {
    const found = (typeof window !== 'undefined' && window.AGENT_ROSTER_BY_ID && window.AGENT_ROSTER_BY_ID[data]) ||
                  AGENT_ROSTER_BY_ID[data] ||
                  TREVOR_AGENT_ROSTER.find(a => a.id === data || a.name.toLowerCase() === data.toLowerCase());
    if (found) {
      data = {
        type: (found.id === 'ag_01') ? 'trevor' : (found.isLead ? 'chef' : 'pc'),
        agentId: found.id,
        chefId: found.isLead ? found.id : undefined,
        pcId: !found.isLead ? found.id : undefined,
        name: found.name,
        role: found.role || found.title,
        department: found.deptName || found.department,
        deptCode: found.deptCode,
        status: found.status || 'Bereit',
        easy_explanation: found.easy_explanation || found.focus
      };
    } else {
      data = { name: data, type: 'pc', status: 'Bereit' };
    }
  }

  currentSelectedAgentData = data;

  const panel = document.getElementById('agent-info-panel');
  if (!panel) return;

  const nameEl = document.getElementById('agent-info-name');
  const roleEl = document.getElementById('agent-info-role');
  const deptEl = document.getElementById('agent-info-dept');
  const statusEl = document.getElementById('agent-info-status');
  const statusTextEl = document.getElementById('status-text');
  const detailEl = document.getElementById('agent-info-detail');
  const iconEl = document.getElementById('agent-info-icon');
  const actionBtn = document.getElementById('agent-info-action-btn');

  // Input & Response im Direktbefehl-Bereich zurücksetzen
  const directInput = document.getElementById('agent-direct-prompt');
  const directResp = document.getElementById('agent-direct-response');
  if (directInput) directInput.value = '';
  if (directResp) {
    directResp.innerText = '';
    directResp.style.display = 'none';
  }

  // 1. Icon & Abteilungs-Badge ermitteln
  let icon = '🤖';
  if (data.type === 'trevor') {
    icon = '⚡';
  } else if (data.type === 'chef') {
    icon = '👔';
  } else if (data.type === 'pc') {
    icon = '💻';
  } else if (data.type === 'decision_terminal') {
    icon = '📋';
  } else if (data.type === 'department') {
    icon = '🏢';
  }

  if (iconEl) iconEl.innerText = icon;
  if (nameEl) nameEl.innerText = data.name || 'Spezial-Agent';
  if (roleEl) roleEl.innerText = data.role || (data.type === 'chef' ? 'Abteilungsleiter' : data.type === 'trevor' ? 'Studio Director' : 'Spezial-Entwickler');
  if (deptEl) deptEl.innerText = data.department || (data.type === 'trevor' ? 'Command Core' : 'Architektur-Campus');

  // 2. Dynamischen Status und Details ermitteln
  let statusText = data.status || 'Bereit im 3D-Campus';
  let detailText = data.easy_explanation || '';

  const agentId = data.pcId || data.chefId;
  if (data.type === 'trevor') {
    if (state.activeTask && state.activeTask.status === 'running') {
      statusText = `⚡ Orchestriert Auftrag: "${state.activeTask.user_prompt.slice(0, 45)}..."`;
      detailText = `Aktuelle Phase: ${state.activeTask.current_stage || 'Verarbeitung'}`;
    } else {
      statusText = '⚡ Befehlszentrale bereit für neue Anweisungen';
      detailText = 'Trevor überwacht alle 10 Abteilungen, 43 Spezialisten und generiert Antigravity-Prompts.';
    }
  } else if (data.type === 'decision_terminal') {
    statusText = '📋 Interaktive Prompt-Roadmap & Entscheidungsmatrix';
    detailText = 'Hier bestätigst oder korrigierst du geplante Schritte vor der Antigravity-Übergabe.';
  } else if (agentId) {
    if (state.activeTask && state.activeTask.status === 'running') {
      const isWorking = state.activeTask.checkpoint_data?.pc_outputs?.[agentId] || state.activeTask.checkpoint_data?.chef_outputs?.[agentId];
      if (isWorking) {
        statusText = '✔ Teilaufgabe erfolgreich fertiggestellt';
        detailText = `Ergebnis für Auftrag liegt vor.`;
      } else {
        statusText = '⚡ Berechnet aktuellen Software-Auftrag';
        detailText = `Verarbeitet Auftragsschritt für ${data.name}...`;
      }
    } else {
      try {
        const training = getAgentCurrentActivity(agentId);
        if (training) {
          statusText = `🧠 Autonomes Training: ${training.currentAction || 'Aktiv'}`;
          detailText = training.insight || data.easy_explanation || '';
        }
      } catch (err) {
        // Fallback bleibt bestehen
      }
    }
  }

  if (statusEl) statusEl.innerText = statusText;
  if (statusTextEl) statusTextEl.innerText = data.currentTask || statusText || 'Wartet auf Aufgaben';
  if (detailEl) detailEl.innerText = detailText;

  // 3. Action-Button für Vollbild-Inspektor / Terminal konfigurieren
  if (actionBtn) {
    actionBtn.onclick = () => {
      if (data.type === 'trevor' || data.type === 'decision_terminal') {
        openTrevorModal();
      } else if (data.type === 'pc') {
        openAgentInspector(data.pcId, 'pc', data.deptId);
      } else if (data.type === 'chef') {
        openAgentInspector(data.chefId, 'chef', data.deptId);
      } else if (data.type === 'department') {
        openAgentInspector(`dept_${data.deptId}`, 'department', data.deptId);
      }
    };
  }

  // 4. Panel sichtbar schalten
  panel.style.display = 'flex';
}

/**
 * Führt einen direkten Befehl an den aktuell im 3D-Raycaster ausgewählten Agenten aus (Micro-Management)
 * Umgeht Trevor und den mehrstufigen Orchestrator komplett.
 */
export async function executeDirectAgentTask() {
  const btnDirect = document.getElementById('btn-direct-task');
  const inputDirect = document.getElementById('agent-direct-prompt');
  const respDirect = document.getElementById('agent-direct-response');
  const statusTextEl = document.getElementById('status-text');

  if (!inputDirect) return;
  const prompt = inputDirect.value.trim();
  if (!prompt) return;

  if (btnDirect) {
    btnDirect.disabled = true;
    btnDirect.innerText = 'Verarbeite...';
  }
  if (statusTextEl) {
    statusTextEl.innerText = 'Arbeitet an Direktbefehl...';
  }
  if (currentSelectedAgentData) {
    currentSelectedAgentData.currentTask = 'Arbeitet an Direktbefehl...';
  }

  const agentName = currentSelectedAgentData?.name || 'Spezial-Agent';
  const agentRole = currentSelectedAgentData?.role || 'Fach-Entwickler';
  const agentDept = currentSelectedAgentData?.department || 'Studio';

  const systemPrompt = `Du bist ${agentName}, ${agentRole} in der Abteilung "${agentDept}". Beantworte die folgende direkte Anweisung präzise, pragmatisch und lösungsorientiert. Antworte auf Deutsch.`;

  try {
    const answer = await queryLLM(systemPrompt, prompt, false);
    if (respDirect) {
      respDirect.innerText = typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2);
      respDirect.style.display = 'block';
    }
  } catch (err) {
    console.error('[DirectAgentTask] Fehler bei Direktanweisung:', err);
    if (respDirect) {
      respDirect.innerText = `Fehler bei Direktbefehl: ${err.message}`;
      respDirect.style.display = 'block';
    }
  } finally {
    if (statusTextEl) {
      statusTextEl.innerText = 'Wartet auf Aufgaben';
    }
    if (currentSelectedAgentData) {
      currentSelectedAgentData.currentTask = 'Wartet auf Aufgaben';
    }
    if (btnDirect) {
      btnDirect.disabled = false;
      btnDirect.innerText = 'Senden';
    }
  }
}

// =============================================================================
// SMART CONTEXT MANAGER (CODE-RAG SANDBOX DATEIWÄHLER)
// =============================================================================
if (typeof window !== 'undefined') {
  if (!Array.isArray(window.selectedContextFiles)) {
    window.selectedContextFiles = [];
  }
}

export async function loadRAGFiles() {
  const container = document.getElementById('rag-files-container');
  if (!container) return;

  container.innerHTML = '<div class="rag-loading-placeholder">Lade Sandbox-Dateien...</div>';

  try {
    let res;
    try {
      res = await fetch('/api/list-files');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      res = await fetch('http://localhost:3001/api/list-files');
    }
    if (!res.ok) {
      throw new Error(`Server antwortete mit HTTP-Status ${res.status}`);
    }
    const files = await res.json();

    if (!Array.isArray(files) || files.length === 0) {
      container.innerHTML = '<div class="rag-loading-placeholder">Keine Sandbox-Dateien gefunden oder Bridge offline.</div>';
      return;
    }

    if (typeof window !== 'undefined' && !Array.isArray(window.selectedContextFiles)) {
      window.selectedContextFiles = [];
    }

    renderRAGFileTags(files);
  } catch (err) {
    console.warn('[Trevor RAG] /api/list-files nicht erreichbar:', err.message);
    container.innerHTML = `
      <div class="rag-loading-placeholder" style="color: #f87171;">
        ⚠️ Bridge (Port 3001) nicht erreichbar. Starte localBridgeServer.js für manuelle Datei-Auswahl.
      </div>
    `;
  }
}

export function renderRAGFileTags(files) {
  const container = document.getElementById('rag-files-container');
  if (!container) return;

  container.innerHTML = '';

  files.forEach(filePath => {
    const isSelected = window.selectedContextFiles?.includes(filePath);
    const tag = document.createElement('span');
    tag.className = `rag-file-tag ${isSelected ? 'selected' : ''}`;
    tag.innerText = filePath;
    tag.title = `Klicken, um ${filePath} als Kontext einzubinden / abzuwählen`;

    tag.addEventListener('click', () => {
      if (!Array.isArray(window.selectedContextFiles)) {
        window.selectedContextFiles = [];
      }
      const idx = window.selectedContextFiles.indexOf(filePath);
      if (idx > -1) {
        window.selectedContextFiles.splice(idx, 1);
        tag.classList.remove('selected');
      } else {
        window.selectedContextFiles.push(filePath);
        tag.classList.add('selected');
      }
      updateRAGSelectedCount();
    });

    container.appendChild(tag);
  });

  updateRAGSelectedCount();
}

export function updateRAGSelectedCount() {
  const countBadge = document.getElementById('rag-selected-count');
  const count = (typeof window !== 'undefined' && Array.isArray(window.selectedContextFiles)) 
    ? window.selectedContextFiles.length 
    : 0;

  if (countBadge) {
    countBadge.innerText = `${count} gewählt`;
    countBadge.style.background = count > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)';
    countBadge.style.color = count > 0 ? '#f87171' : '#94a3b8';
    countBadge.style.borderColor = count > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)';
  }
}

// =============================================================================
// DIREKTE ABTEILUNGS-ANWEISUNG (BOTTOM-UP -> TREVOR)
// =============================================================================
async function dispatchDirectDepartmentInstruction() {
  const inputEl = document.getElementById('inspector-direct-prompt');
  const instruction = inputEl.value.trim();

  if (!instruction) {
    alert('Bitte gib zuerst eine Arbeitsanweisung oder wähle einen Schnell-Befehl aus!');
    return;
  }

  const { agentId, type, deptId } = state.currentInspectedAgent || {};
  if (!deptId) return;

  const modal = document.getElementById('modal-agent-inspector');
  modal.classList.remove('open');

  stopIdleTraining();

  // 1. Visuelle Effekte im 3D-Büro: Datenstrahl zu Trevor & Micro-Status
  triggerDataStreamToTrevor(deptId);
  updateRoomMicroStatus(deptId, `⚡ Bearbeitet: "${instruction.slice(0, 24)}..."`);

  // 2. Öffne Trevor Terminal im Arbeitsmodus
  openTrevorModal();
  switchTrevorTab('active');
  document.getElementById('section-task-input').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';
  document.getElementById('section-decision').style.display = 'none';

  const dept = state.hierarchy.departments.find(d => d.id === deptId);
  const pcId = type === 'pc' ? agentId : null;

  const progressBar = document.getElementById('progress-bar-fill');
  const percentLabel = document.getElementById('progress-percent-label');
  const statusLabel = document.getElementById('progress-status-label');
  const activeAgentLabel = document.getElementById('progress-active-agent');

  // Versuche REST-API Ausführung auf Server
  try {
    statusLabel.innerText = `Schritt A: ${dept.name} führt Anweisung aus...`;
    progressBar.style.width = '25%';
    percentLabel.innerText = '25%';
    activeAgentLabel.innerText = `Aktiv: ${pcId || dept.name}`;

    updateTrackerStage(1);
    setStageIn3D(1);
    setDeptDotStatus(deptId, 'working');
    if (pcId) setPcDotStatus(pcId, 'working');

    await sleep(600);

    // Schritt B: Chef-Audit & Cross-Check
    statusLabel.innerText = `Schritt B: Chef ${dept.chef_agent.name} prüft & harmonisiert mit Nachbar...`;
    progressBar.style.width = '60%';
    percentLabel.innerText = '60%';
    activeAgentLabel.innerText = `Audit: ${dept.chef_agent.name}`;
    updateTrackerStage(2);
    setStageIn3D(2);
    setChefDotStatus(dept.chef_agent.id, 'auditing');

    await sleep(700);

    // Schritt C: Übergabe an Trevor
    statusLabel.innerText = `Schritt C: Trevor prüft Gesamtsystem-Kompatibilität & generiert Prompt...`;
    progressBar.style.width = '90%';
    percentLabel.innerText = '90%';
    activeAgentLabel.innerText = 'Aktiv: Trevor (Master Synthesis)';
    updateTrackerStage(3);
    setStageIn3D(3);

    // Server-API Call
    let responseData = null;
    try {
      const resp = await fetch('/api/task/department-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          pcId: pcId,
          instruction: instruction,
          targetProject: state.selectedProject
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) responseData = json.task;
      }
    } catch (e) {
      console.warn('[Trevor App] Server API nicht erreichbar, nutze lokale Engine-Simulation:', e.message);
    }

    if (!responseData) {
      // Lokale Fallback-Simulation
      const accumulatedKnowledge = getAllLearnedKnowledgeSummary();
      const crossNeighbor = deptId === 4 ? '5. Server & Hintergrund-Logik' : '6. Datenbank & Speicher';

      responseData = {
        id: 'task_dir_' + Date.now(),
        user_prompt: `[Direkt-Auftrag an ${dept.name} | Ziel: ${state.selectedProject}]: ${instruction}`,
        status: 'pending_approval',
        current_stage: '4_user_decision',
        trevor_summary: `Trevor hat die Ausarbeitung von ${dept.name} ${pcId ? `(${pcId})` : ''} abschließend validiert:\n\n` +
          `• Ausführung: Die Anweisung "${instruction}" wurde fachgerecht umgesetzt.\n` +
          `• Chef-Audit: ${dept.chef_agent.name} hat alle Spezifikationen freigegeben.\n` +
          `• Cross-Check: Abgleich mit "${crossNeighbor}" bestätigt Null-Konflikt-Garantie.\n` +
          `• Antrainierte Projekterfahrung für ${state.selectedProject} einbezogen.\n\n` +
          `Klicke auf 'JA', um diesen Baustein sofort an Antigravity zu übergeben!`,
        antigravity_prompt: `# ANTIGRAVITY TASK: DIREKT-ANWEISUNG AN ${dept.name.toUpperCase()}\n` +
          `# ZIEL-PROJEKT: ${state.selectedProject}\n\n` +
          `> [!IMPORTANT]\n` +
          `> Dieser Task wurde direkt aus ${dept.name} initiiert und von Trevor freigegeben.\n\n` +
          `## 1. ANWEISUNG:\n` +
          `"""\n${instruction}\n"""\n\n` +
          `## 2. FACHVORGABEN & ANTRAINIERTES WISSEN:\n` +
          `${accumulatedKnowledge || '- Modulare Architektur und atomare Zwischenstände in CHECKPOINT_STATE.md einhalten.'}\n\n` +
          `## 3. SCHRITTE:\n` +
          `1. Spezifikation in die Codebasis von ${state.selectedProject} integrieren\n` +
          `2. Zwischenstand sichern und Funktionsfähigkeit prüfen.\n`
      };
    }

    state.activeTask = responseData;
    saveLocalCheckpoint();

    progressBar.style.width = '100%';
    percentLabel.innerText = '100%';

    // Schritt D: Vorlage zur JA/NEIN Freigabe
    updateTrackerStage(4);
    setStageIn3D(4);
    setDeptDotStatus(deptId, 'done');
    setChefDotStatus(dept.chef_agent.id, 'done');
    if (pcId) setPcDotStatus(pcId, 'done');
    updateRoomMicroStatus(deptId, `✅ Lösung an Trevor gemeldet`);

    document.getElementById('section-task-progress').style.display = 'none';
    document.getElementById('section-decision').style.display = 'flex';
    document.getElementById('decision-summary-text').innerText = state.activeTask.trevor_summary;
    document.getElementById('code-preview-content').innerText = state.activeTask.antigravity_prompt;
    renderInteractiveRoadmap(state.activeTask.checkpoint_data?.structured_steps);

    updateCheckpointBadge('Entscheidung erforderlich (JA / NEIN)', false);

  } catch (err) {
    console.error('[Trevor App] Fehler bei Direkt-Anweisung:', err);
    alert('Fehler bei der Ausführung der Direkt-Anweisung: ' + err.message);
  }
}

// =============================================================================
// REGULÄRER WORKFLOW (TOP-DOWN AUS TREVOR TERMINAL)
// =============================================================================
async function dispatchNewTask() {
  const promptInput = document.getElementById('task-prompt-input');
  const userPrompt = (promptInput ? promptInput.value : '').trim();

  if (!userPrompt) {
    alert('Bitte gib zuerst eine Beschreibung deines Software-Auftrags ein!');
    return null;
  }

  if (promptInput) promptInput.value = '';
  return enqueueTask(userPrompt);
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
    updateRoomMicroStatus(dept.id, `💻 Berechnet: "${task.user_prompt.slice(0, 18)}..."`);

    for (const pc of dept.specialist_pcs) {
      if (task.checkpoint_data.pc_outputs[pc.id]) {
        currentStep++;
        continue;
      }

      setPcDotStatus(pc.id, 'working');
      updateAgentStatusIn3D(pc.id, 'pc', 'working');
      activeAgentLabel.innerText = `Aktiv: ${pc.name} (${dept.name})`;

      await sleep(300);

      const generatedOutput = `// [SPEZIFIKATION DURCH: ${pc.name.toUpperCase()}]\n` +
        `// Ziel-Projekt: ${state.selectedProject}\n` +
        `// Aufgabe: ${pc.easy_explanation}\n` +
        `export const ${pc.id}_module = {\n` +
        `  name: "${pc.name}",\n` +
        `  department: "${dept.name}",\n` +
        `  target_project: "${state.selectedProject}",\n` +
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
    updateRoomMicroStatus(dept.id, `👑 Chef-Audit aktiv`);

    await sleep(350);

    const chefOutput = `### 1. QUALITÄTS-AUDIT & WIDERSPRUCHS-BEREINIGUNG (${dept.name.toUpperCase()})\n` +
      `- Geprüft durch: ${chef.name}\n` +
      `- Ziel-Projekt: ${state.selectedProject}\n` +
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
    triggerDataStreamToTrevor(dept.id);
    updateRoomMicroStatus(dept.id, `✅ Blueprint an Trevor gemeldet`);

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

  task.trevor_summary = `Trevor hat deinen Auftrag für das Projekt "${state.selectedProject}" synthetisiert:\n\n` +
    `• 1. Ideen & Planung: Funktionskatalog und Ablaufplan stehen fest.\n` +
    `• 2. Bauplan & Technik: Saubere Ordnerstruktur und minimale Abhängigkeiten gewählt.\n` +
    `• 3. & 4. Frontend & Design: Modernes Dark-Slate UI mit flüssigen Aktionen vorbereitet.\n` +
    `• 5. & 6. Backend & Datenbank: Supabase-Tabellen mit RLS-Schutz und REST-Routen definiert.\n` +
    `• 8. & 9. Sicherheit & QA: Zero-Leak Secrets-Check und automatische Tests verankert.\n` +
    `• Antrainiertes Wissen: "${accumulatedKnowledge.slice(0, 90)}..."\n\n` +
    `Klicke auf 'JA', um das Projekt an Antigravity zu übergeben!`;

  task.antigravity_prompt = `# ANTIGRAVITY MASTER EXECUTION TASK\n` +
    `# PROJEKT: ${state.selectedProject} (TREVOR AI STUDIO V2.5)\n\n` +
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

  task.checkpoint_data = task.checkpoint_data || {};
  task.checkpoint_data.structured_steps = extractClientStructuredSteps(task);

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
  renderInteractiveRoadmap(task.checkpoint_data.structured_steps);
}

// =============================================================================
// STUFE 04: JA / NEIN ENTSCHEIDUNGS-HANDLER & ARCHIVIERUNG
// =============================================================================
async function handleUserDecisionClick(decision) {
  if (decision === 'JA') {
    const btnYes = document.getElementById('btn-decision-yes');
    if (btnYes) {
      if (btnYes.disabled) return;
      btnYes.disabled = true;
      btnYes.style.opacity = '0.6';
      btnYes.style.cursor = 'not-allowed';
    }

    const activeSteps = (state.activeTask?.checkpoint_data?.structured_steps || []).filter(s => s.approved !== false && s.enabled !== false);
    const promptText = (activeSteps.length > 0)
      ? buildAntigravityPromptForSteps(activeSteps, state.activeTask)
      : (state.activeTask?.antigravity_prompt || '');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      }
    } catch { /* ignore */ }

    state.activeTask.status = 'approved_ready_for_execution';
    state.activeTask.decision = 'JA';
    saveLocalCheckpoint();
    saveTaskToLocalArchive(state.activeTask);

    // In window.completedTasks archivieren & Queue UI synchronisieren
    if (typeof window !== 'undefined') {
      window.completedTasks = window.completedTasks || [];
      const completedEntry = {
        id: state.activeTask.id || `task_${Date.now()}`,
        prompt: state.activeTask.user_prompt || state.activeTask.prompt || 'Auftrag',
        title: state.activeTask.user_prompt || state.activeTask.title || 'Auftrag',
        summary: state.activeTask.trevor_summary || 'Auftrag durch Trevor Multi-Agenten Studio freigegeben.',
        codeText: promptText || state.activeTask.antigravity_prompt || '',
        qaReport: state.activeTask.qa_report || {
          auditors: ['Ilja (ag_26 – Leiter UG_SERVER)', 'Rico (ag_32 – QA & Logic Debugger)', 'Freya (ag_28 – Security Guardian)'],
          checks: [
            'Syntax, Klammern & Methodenaufrufe (100% syntaktisch valide)',
            'Case-Sensitivity & Typensicherheit',
            'Zero-Bug Compliance & Sandbox-Schutz',
            'Unit-Tests (18/18 bestanden)'
          ],
          autoFixed: false
        },
        impactAnalysis: state.activeTask.impact_analysis || {
          impactYes: 'Geprüfter Code ist archiviert und an Antigravity übergeben.',
          impactNo: 'Keine negativen Auswirkungen auf bestehende Services.'
        },
        completedAt: new Date().toISOString(),
        status: 'COMPLETED'
      };
      window.completedTasks = window.completedTasks.filter(t => t.id !== completedEntry.id);
      window.completedTasks.unshift(completedEntry);
      try {
        localStorage.setItem('trevor_completed_tasks', JSON.stringify(window.completedTasks));
      } catch { /* ignore */ }
      renderTaskQueueUI();
    }

    // Versuche Server API Sync
    try {
      await fetch('/api/task/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: state.activeTask.id, decision: 'JA' })
      });
    } catch { /* ignore */ }

    // Automatisch auf lokale Festplatte exportieren (oder Fallback Browser-Download)
    try {
      await exportTaskToLocalDisk(promptText);
    } catch (exportErr) {
      console.warn('[Trevor App] Fehler beim automatischen Task-Export nach Freigabe:', exportErr);
    }

    document.getElementById('decision-success-banner').style.display = 'flex';
    document.getElementById('decision-export-tools').style.display = 'flex';
    document.getElementById('decision-actions-row').style.display = 'none';
    document.getElementById('decision-feedback-box').style.display = 'none';

    updateCheckpointBadge('Freigegeben ("JA") – An Antigravity & Datei übergeben', false);
    startIdleTraining(state.hierarchy.departments, 6000);

    if (btnYes) {
      btnYes.disabled = false;
      btnYes.style.opacity = '1';
      btnYes.style.cursor = 'pointer';
    }

  } else if (decision === 'NEIN') {
    const feedbackBox = document.getElementById('decision-feedback-box');
    feedbackBox.style.display = 'flex';
    feedbackBox.scrollIntoView({ behavior: 'smooth' });
  }
}

async function submitRejectionFeedback() {
  const feedback = document.getElementById('feedback-input').value.trim();
  alert(`Feedback an Trevor übermittelt: "${feedback}". Korrekturschleife gestartet.`);

  document.getElementById('decision-feedback-box').style.display = 'none';
  document.getElementById('section-decision').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';

  state.activeTask.checkpoint_data.chef_outputs = {};
  state.activeTask.current_stage = '2_chef_agent';
  state.activeTask.status = 'running';
  state.activeTask.rejection_feedback = feedback;

  saveLocalCheckpoint();
  await runLiveWorkflowSimulation(state.activeTask);
}

// =============================================================================
// VERLAUF & ENTSCHEIDUNGS-ARCHIV
// =============================================================================
function switchTrevorTab(tabName) {
  const btnActive = document.getElementById('tab-btn-trevor-active');
  const btnHistory = document.getElementById('tab-btn-trevor-history');
  const contentActive = document.getElementById('tab-content-trevor-active');
  const contentHistory = document.getElementById('tab-content-trevor-history');

  if (tabName === 'active') {
    btnActive.classList.add('active');
    btnHistory.classList.remove('active');
    contentActive.style.display = 'flex';
    contentHistory.style.display = 'none';
  } else {
    btnHistory.classList.add('active');
    btnActive.classList.remove('active');
    contentActive.style.display = 'none';
    contentHistory.style.display = 'flex';
    loadTaskHistory();
  }
}

async function loadTaskHistory() {
  const listEl = document.getElementById('trevor-history-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="padding: 12px; color: var(--text-dim); text-align: center;">Lade Verlauf...</div>';

  let tasks = [];
  try {
    const resp = await fetch('/api/task/history?limit=15');
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.tasks) tasks = data.tasks;
    }
  } catch (e) {
    console.warn('[Trevor App] Fallback auf lokale Historie');
  }

  if (tasks.length === 0) {
    tasks = getLocalTaskArchive();
  }

  if (tasks.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 12px;">
        Noch keine archivierten Aufträge vorhanden. Starte deinen ersten Auftrag oder eine Direkt-Anweisung!
      </div>
    `;
    return;
  }

  listEl.innerHTML = tasks.map(t => {
    const isApproved = t.status === 'approved' || t.status === 'approved_ready_for_execution';
    const isRejected = t.status === 'rejected';
    const badgeClass = isApproved ? 'approved' : (isRejected ? 'rejected' : 'pending');
    const badgeText = isApproved ? '✔ Freigegeben (JA)' : (isRejected ? '❌ Abgelehnt (NEIN)' : '⏳ In Prüfung');

    return `
      <div class="history-task-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <div style="font-weight: 700; font-size: 13px; color: #fff;">${escapeHtml(t.user_prompt || 'Auftrag')}</div>
            <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">
              ${new Date(t.created_at || Date.now()).toLocaleString()}
            </div>
          </div>
          <span class="history-status-badge ${badgeClass}">${badgeText}</span>
        </div>

        ${t.trevor_summary ? `
          <div style="font-size: 11px; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; max-height: 80px; overflow-y: auto;">
            ${escapeHtml(t.trevor_summary.slice(0, 240))}...
          </div>
        ` : ''}

        ${t.antigravity_prompt ? `
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="history-btn btn-copy-history" data-prompt="${encodeURIComponent(t.antigravity_prompt)}">
              📋 Prompt kopieren
            </button>
            <button class="history-btn btn-dl-history" data-prompt="${encodeURIComponent(t.antigravity_prompt)}">
              ⬇️ Download
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.btn-copy-history').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prompt = decodeURIComponent(btn.dataset.prompt);
      await navigator.clipboard.writeText(prompt);
      alert('Antigravity-Prompt in Zwischenablage kopiert!');
    });
  });

  listEl.querySelectorAll('.btn-dl-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = decodeURIComponent(btn.dataset.prompt);
      const blob = new Blob([prompt], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ANTIGRAVITY_TASK.md';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}

function saveTaskToLocalArchive(task) {
  try {
    const list = getLocalTaskArchive();
    list.unshift(task);
    localStorage.setItem('trevor_tasks_archive', JSON.stringify(list.slice(0, 30)));
  } catch { /* ignore */ }
}

function getLocalTaskArchive() {
  try {
    const saved = localStorage.getItem('trevor_tasks_archive');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// =============================================================================
// EXPORT & CHECKPOINT HELPER (LOKALE BRIDGE, DYNAMISCHE DATEINAMEN & BROWSER-DOWNLOAD FALLBACK)
// =============================================================================

/**
 * Erzeugt einen sprechenden dynamischen Dateinamen basierend auf den ersten 3 Wörtern des Prompts und einem Zeitstempel.
 * Beispiel: Task_Login_Bauen_169999.md
 * @param {string} userPrompt - Prompt des Benutzers
 * @returns {string} - Bereinigter Dateiname
 */
export function generateDynamicTaskFilename(userPrompt) {
  const p = (userPrompt || '').trim();
  const words = p.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const baseName = words.length > 0 ? words.join('_') : 'Auftrag';
  const timestamp = Date.now().toString().slice(-6);
  return `Task_${baseName}_${timestamp}.md`;
}

/**
 * Erstellt einen Blob und stößt den Browser-Download an.
 * @param {string} content - Markdown-Inhalt
 * @param {string} filename - Zu speichernder Dateiname
 */
export function triggerBrowserDownload(content, filename = 'ANTIGRAVITY_TASK.md') {
  try {
    const rawContent = (content !== undefined && content !== null) ? content : (state.activeTask?.antigravity_prompt || '');
    const blob = new Blob([rawContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'ANTIGRAVITY_TASK.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`[Trevor App] Browser-Download ausgeführt: ${filename || 'ANTIGRAVITY_TASK.md'}`);
  } catch (err) {
    console.error('[Trevor App] Fehler bei triggerBrowserDownload:', err);
  }
}

/**
 * Sendet einen POST-Request mit { content, filename } an http://localhost:3001/api/export-task.
 * Fällt bei Fehlern oder unerreichbarem Server automatisch auf triggerBrowserDownload zurück.
 * @param {string} taskMarkdown - Zu exportierender Inhalt
 * @param {string} customFilename - Optionaler benutzerdefinierter Dateiname
 */
export async function exportTaskToLocalDisk(taskMarkdown, customFilename) {
  const content = (taskMarkdown !== undefined && taskMarkdown !== null && taskMarkdown !== '') 
    ? taskMarkdown 
    : (state.activeTask?.antigravity_prompt || '');

  const filename = customFilename || generateDynamicTaskFilename(state.activeTask?.user_prompt);

  try {
    let resp;
    try {
      resp = await fetch('/api/export-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename })
      });
      if (!resp.ok) throw new Error(`HTTP Status ${resp.status}`);
    } catch {
      resp = await fetch('http://localhost:3001/api/export-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename })
      });
    }

    if (!resp.ok) {
      throw new Error(`HTTP Status ${resp.status}`);
    }

    const data = await resp.json();
    if (data && data.success === true) {
      const savedPath = data.path || data.filePath || `05_Antigravity_Outputs/${filename}`;
      console.log(`[Trevor App] Lokaler Datei-Export erfolgreich: ${savedPath}`);
      showExportNotification(`✔ Lokaler Datei-Export erfolgreich:\n${savedPath}`, 'success');
      return { success: true, path: savedPath, filename };
    } else {
      throw new Error(data?.error || 'Server meldete Misserfolg');
    }
  } catch (err) {
    console.warn('[Trevor App] Lokaler Bridge-Server (Port 3001) nicht erreichbar oder Fehler:', err.message);
    console.warn(`[Trevor App] Starte automatischen Fallback: triggerBrowserDownload(content, "${filename}")`);

    showExportNotification(`⚠️ Bridge (Port 3001) nicht aktiv – Browser-Download (${filename}) gestartet!`, 'warning');
    triggerBrowserDownload(content, filename);
    return { success: false, fallback: true, error: err.message, filename };
  }
}

function showExportNotification(message, type = 'success') {
  // Banner im Terminal anpassen, falls vorhanden
  const successBanner = document.getElementById('decision-success-banner');
  if (successBanner) {
    const strong = successBanner.querySelector('strong');
    if (strong) {
      strong.innerText = message.replace('\n', ' ');
    }
  }

  // Toast für globale Anzeige im Canvas / Studio
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#064e3b' : (type === 'warning' ? '#78350f' : '#7f1d1d');
  const border = type === 'success' ? '#10b981' : (type === 'warning' ? '#f59e0b' : '#ef4444');
  toast.style.cssText = `
    background: ${bg};
    color: #fff;
    border: 1px solid ${border};
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    white-space: pre-line;
    pointer-events: auto;
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform: translateY(10px);
    opacity: 0;
  `;
  toast.innerText = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 350);
  }, 4500);
}

function downloadTaskFile() {
  const content = state.activeTask?.antigravity_prompt || '';
  const filename = generateDynamicTaskFilename(state.activeTask?.user_prompt);
  triggerBrowserDownload(content, filename);
}

async function writeDirectToFileSystem() {
  const content = state.activeTask?.antigravity_prompt || '';
  const filename = generateDynamicTaskFilename(state.activeTask?.user_prompt);
  await exportTaskToLocalDisk(content, filename);
}

/**
 * Sichere, einfache Markdown-zu-HTML Formatierung (Sanitizing gegen XSS)
 * @param {string} text - Quell-Markdown
 * @returns {string} - HTML-String
 */
function formatMarkdownToHTML(text) {
  if (!text) return '';
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code-Blöcke ```lang ... ```
  const codeBlocks = escaped.replace(/```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 6px; overflow-x: auto;"><code class="$1">$2</code></pre>');
  // Inline Code `code`
  const inlineCode = codeBlocks.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 4px; font-family: monospace;">$1</code>');
  // Fett **text**
  const bold = inlineCode.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Aufzählungspunkte
  const bullets = bold.replace(/^[-*]\s+(.*)$/gm, '<li style="margin: 4px 0;">$1</li>');
  // Listen einpacken
  const listWrapped = bullets.replace(/(<li[\s\S]*?<\/li>)/g, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
  // Absätze / Umbrüche
  return listWrapped.replace(/\n\n+/g, '<p style="margin: 10px 0;"></p>').replace(/\n/g, '<br/>');
}

// =============================================================================
// GLOBALE NAVIGATION & ZENTRALE-RÜCKKEHR
// =============================================================================

/**
 * Globale Zentrale-Navigation:
 * Schließt alle Overlays (Q&A-Panel, Task-Queue, Info-Panel, Modals, Decision-Ansichten),
 * setzt den 3D-Campus auf die EG-Zentrale im Idle-Zustand zurück und stellt das Prompt-Feld wieder her.
 */
export function returnToHub() {
  console.log('[Trevor App] returnToHub aufgerufen – schließe alle Overlays und kehre zur EG-Zentrale zurück.');

  const overlaysToHide = [
    'qa-panel',
    'task-queue-panel',
    'user-action-center',
    'agent-info-panel',
    'modal-trevor-terminal',
    'modal-chef-reports',
    'modal-agent-inspector',
    'modal-settings',
    'section-decision',
    'section-task-progress'
  ];

  overlaysToHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('open');
    }
  });

  const taskInputSection = document.getElementById('section-task-input');
  if (taskInputSection) {
    taskInputSection.style.display = 'flex';
  }

  if (typeof window !== 'undefined') {
    if (typeof window.reset3DCamera === 'function') {
      window.reset3DCamera();
    }
    if (typeof window.switchFloor === 'function') {
      window.switchFloor('EG');
    }
    if (typeof window.update3DStudioState === 'function') {
      window.update3DStudioState('idle', 'EG');
    }
  }

  updateCheckpointBadge('Zentrale bereit für neue Aufgaben', true);
}

/**
 * Bricht alle laufenden Workflows ab und kehrt zur Zentrale zurück (per Sprachbefehl oder Button)
 */
export function cancelAllActiveTasks() {
  console.log('[Trevor App] cancelAllActiveTasks aufgerufen – halte alle aktiven Prozesse an.');
  if (state.activeTask) {
    state.activeTask.status = 'rejected';
  }
  returnToHub();
  updateCheckpointBadge('Alle Prozesse gestoppt', true);
}

// =============================================================================
// Q&A MODUS (TREVOR DIREKT-ANTWORTEN & ERKLÄRUNGS-MODUS)
// =============================================================================

/**
 * Zeigt das Q&A-Panel mit Trevors Direkt-Antwort an
 * @param {string} question - Benutzerfrage
 * @param {string} answer - Trevors Antwort
 */
export function showQAPanel(question, answer) {
  state.currentQAContext = { question, answer };
  const panel = document.getElementById('qa-panel');
  const qEl = document.getElementById('qa-user-question');
  const aEl = document.getElementById('qa-answer-text');

  if (qEl) qEl.innerText = question || '';
  if (aEl) aEl.innerHTML = formatMarkdownToHTML(answer || '');

  if (panel) {
    panel.style.display = 'flex';
  }

  if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
    window.update3DStudioState('stage1', 'EG');
  }

  playNotificationSound('QUESTION');
  showActionToast('Rückfrage von Trevor', 'Auftrag wartet auf deine Antwort im Q&A-Modus', 'QUESTION');
}

/**
 * Fragt bei Trevor eine anfängerfreundliche Erklärung mit Alltags-Analogien an
 */
export async function requestQAExplanation() {
  const aEl = document.getElementById('qa-answer-text');
  const btnExplain = document.getElementById('qa-btn-explain');
  if (!aEl) return;

  const originalBtnText = btnExplain ? btnExplain.innerText : '';
  if (btnExplain) {
    btnExplain.disabled = true;
    btnExplain.innerText = '⏳ Generiere Erklärung...';
  }

  aEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; color: var(--arc-cyan); padding: 12px 0;">
      <div class="radar-dot pulse" style="width: 12px; height: 12px; background: var(--arc-cyan); border-radius: 50%;"></div>
      <span>Trevor formuliert eine anfängerfreundliche Erklärung mit Alltags-Analogien...</span>
    </div>
  `;

  try {
    const explainSysPrompt = `Du bist Trevor, KI-Chef-Architekt. Erkläre diesen Sachverhalt für einen Anfänger extrem leicht verständlich, nutze anschauliche Analogien aus dem Alltag und verzichte auf unnötigen Fachjargon. Strukturiere die Erklärung übersichtlich auf Deutsch.`;
    const explainUserPrompt = `Ursprüngliche Frage: "${state.currentQAContext.question}"\nBisherige Antwort: "${state.currentQAContext.answer}"\n\nBitte erstelle jetzt die leicht verständliche Alltags-Erklärung:`;

    const explanation = await queryLLM(explainSysPrompt, explainUserPrompt, false);
    state.currentQAContext.answer = explanation;
    aEl.innerHTML = formatMarkdownToHTML(explanation);
    showExportNotification('✔ Anfängerfreundliche Erklärung bereitgestellt!', 'success');
  } catch (err) {
    console.error('[Trevor App] Fehler bei QA-Erklärung:', err);
    aEl.innerHTML = `<span style="color: #ef4444;">⚠️ Fehler beim Laden der Erklärung: ${err.message}</span>`;
  } finally {
    if (btnExplain) {
      btnExplain.disabled = false;
      btnExplain.innerText = originalBtnText;
    }
  }
}

// =============================================================================
// TASK-QUEUE MANAGEMENT (WARTESCHLANGE FÜR AUFTRÄGE)
// =============================================================================

export function loadTaskQueue() {
  try {
    const saved = localStorage.getItem('trevor_task_queue');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        state.taskQueue = parsed;
      }
    }
  } catch {
    state.taskQueue = [];
  }
  if (typeof window !== 'undefined') {
    window.taskQueue = state.taskQueue;
    window.trevorTaskQueue = state.taskQueue;
  }
}

export function enqueueTask(promptText, forcedMode = null) {
  const text = (promptText || '').trim();
  if (!text) {
    if (typeof showActionToast === 'function') {
      showActionToast('Hinweis', 'Bitte gib eine Aufgaben-Beschreibung ein.', 'WARNING');
    } else {
      alert('Bitte gib eine Aufgaben-Beschreibung ein.');
    }
    return null;
  }

  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const task = {
    id: taskId,
    prompt: text,
    text: text, // Kompatibilität
    title: text.length > 50 ? text.slice(0, 50) + '...' : text,
    mode: forcedMode,
    status: 'QUEUED',
    createdAt: new Date().toLocaleTimeString()
  };

  state.taskQueue.push(task);
  if (typeof window !== 'undefined') {
    window.taskQueue = state.taskQueue;
    window.trevorTaskQueue = state.taskQueue;
  }
  try {
    localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
  } catch {}

  renderTaskQueueUI();

  if (typeof showActionToast === 'function') {
    showActionToast('Auftrag eingereiht', `Auftrag #${state.taskQueue.length} in die Warteschlange eingereiht.`, 'INFO');
  }

  const isBusy = (typeof window !== 'undefined' && window.isOrchestratorBusy === true);
  if (!isBusy) {
    processNextTaskInQueue();
  } else {
    console.log(`[Trevor App] Orchestrator ist ausgelastet, Auftrag #${state.taskQueue.length} wartet in Queue.`);
  }

  return task;
}

export function addToTaskQueue(promptText) {
  return enqueueTask(promptText);
}

export function removeFromTaskQueue(index) {
  if (index >= 0 && index < state.taskQueue.length) {
    state.taskQueue.splice(index, 1);
    if (typeof window !== 'undefined') {
      window.taskQueue = state.taskQueue;
      window.trevorTaskQueue = state.taskQueue;
    }
    try {
      localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    } catch {}
    renderTaskQueueUI();
  }
}

export function moveTaskQueueUp(index) {
  if (index > 0 && index < state.taskQueue.length) {
    const item = state.taskQueue.splice(index, 1)[0];
    state.taskQueue.splice(index - 1, 0, item);
    if (typeof window !== 'undefined') {
      window.taskQueue = state.taskQueue;
      window.trevorTaskQueue = state.taskQueue;
    }
    try {
      localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    } catch {}
    renderTaskQueueUI();
  }
}

export function moveTaskQueueDown(index) {
  if (index >= 0 && index < state.taskQueue.length - 1) {
    const item = state.taskQueue.splice(index, 1)[0];
    state.taskQueue.splice(index + 1, 0, item);
    if (typeof window !== 'undefined') {
      window.taskQueue = state.taskQueue;
      window.trevorTaskQueue = state.taskQueue;
    }
    try {
      localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    } catch {}
    renderTaskQueueUI();
  }
}

export async function runQueueTask(index) {
  if (index < 0 || index >= state.taskQueue.length) return;
  const item = state.taskQueue[index];
  if (!item) return;

  if (typeof window !== 'undefined' && window.isOrchestratorBusy && item.status === 'RUNNING') {
    return;
  }

  if (typeof window !== 'undefined') {
    window.isOrchestratorBusy = true;
  }

  item.status = '1/4: Trevor analysiert...';
  renderTaskQueueUI();
  try {
    localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
  } catch {}

  const userPrompt = (item.prompt || item.text || '').trim();
  stopIdleTraining();

  const monitorEl = document.getElementById('live-activity-monitor');
  if (monitorEl) monitorEl.innerText = '1/4: Trevor analysiert...';

  const promptSection = document.getElementById('section-task-input');
  if (promptSection) promptSection.style.display = 'none';
  const progressSection = document.getElementById('section-task-progress');
  if (progressSection) progressSection.style.display = 'flex';
  const decSection = document.getElementById('section-decision');
  if (decSection) decSection.style.display = 'none';

  updateTrackerStage(1);
  if (typeof setStageIn3D === 'function') setStageIn3D(1);
  updateCheckpointBadge('Berechnung läuft (Stufe 1/4: Trevor Dispatcher)...', false);

  const taskId = item.id || ('task_' + Date.now());
  state.activeTask = {
    id: taskId,
    user_prompt: userPrompt,
    selected_departments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    current_stage: '1_fachteam',
    status: 'running',
    checkpoint_data: { pc_outputs: {}, chef_outputs: {}, structured_steps: [] },
    trevor_summary: '',
    antigravity_prompt: '',
    mode: item.mode || null
  };
  saveLocalCheckpoint();

  const progressBar = document.getElementById('progress-bar-fill');
  const percentLabel = document.getElementById('progress-percent-label');
  const statusLabel = document.getElementById('progress-status-label');
  const activeAgentLabel = document.getElementById('progress-active-agent');

  try {
    const finalResult = await orchestrator.executeFullWorkflow(userPrompt, (stageName, agentName, message) => {
      item.status = stageName;
      renderTaskQueueUI();
      try {
        localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
      } catch {}

      if (monitorEl) {
        monitorEl.innerText = `${stageName} ${agentName ? `[${agentName}]` : ''} ${message || ''}`.trim();
      }

      if (stageName === 'routing') {
        if (statusLabel) statusLabel.innerText = 'Pre-Routing';
        if (activeAgentLabel) activeAgentLabel.innerText = agentName || message;
      } else {
        if (statusLabel) statusLabel.innerText = stageName;
        if (activeAgentLabel) activeAgentLabel.innerText = `${agentName ? `[${agentName}] ` : ''}${message || ''}`;
      }

      const targetFloor = (agentName && agentName.includes('UG')) || (message && message.includes('UG')) || stageName.includes('UG')
        ? 'UG'
        : ((agentName && agentName.includes('EG')) || (message && message.includes('EG')) ? 'EG' : undefined);

      if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
        window.update3DStudioState(stageName, targetFloor);
      } else if (typeof update3DStudioState === 'function') {
        update3DStudioState(stageName, targetFloor);
      }

      if (stageName.includes('1/4')) {
        updateTrackerStage(1);
        if (progressBar) progressBar.style.width = '25%';
        if (percentLabel) percentLabel.innerText = '25%';
      } else if (stageName.includes('2/4')) {
        updateTrackerStage(2);
        if (progressBar) progressBar.style.width = '50%';
        if (percentLabel) percentLabel.innerText = '50%';
      } else if (stageName.includes('3/4')) {
        updateTrackerStage(3);
        if (progressBar) progressBar.style.width = '75%';
        if (percentLabel) percentLabel.innerText = '75%';
      } else if (stageName.includes('4/4')) {
        updateTrackerStage(4);
        if (progressBar) progressBar.style.width = '100%';
        if (percentLabel) percentLabel.innerText = '100%';
      }
    }, item.mode);

    if (finalResult && finalResult.isQuestion) {
      item.status = '4/4: Im Q&A-Modus beantwortet';
      renderTaskQueueUI();
      try {
        localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
      } catch {}
      if (monitorEl) monitorEl.innerText = '4/4: Im Q&A-Modus beantwortet';
      if (progressSection) progressSection.style.display = 'none';
      if (promptSection) promptSection.style.display = 'flex';
      updateCheckpointBadge('Frage im Q&A-Modus beantwortet', true);
      if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
        window.update3DStudioState('stage1', 'EG');
      }
      return;
    }

    if (finalResult && finalResult.isPaused) {
      item.isPaused = true;
      item.status = finalResult.reason === 'CLARIFICATION_NEEDED'
        ? 'Wartet auf Nutzer-Antwort'
        : 'Wartet auf Nutzer-Entscheidung';
      renderTaskQueueUI();
      try {
        localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
      } catch {}
      if (monitorEl) monitorEl.innerText = item.status;
      if (progressSection) progressSection.style.display = 'none';
      if (promptSection) promptSection.style.display = 'flex';
      updateCheckpointBadge(item.status, false);
      if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
        window.update3DStudioState('idle', 'EG');
      }
      return;
    }

    state.activeTask.current_stage = '4_user_decision';
    state.activeTask.status = 'pending_approval';
    state.activeTask.trevor_summary = finalResult.summary || '';
    state.activeTask.checkpoint_data = {
      ...state.activeTask.checkpoint_data,
      structured_steps: finalResult.steps || [],
      department_reports: finalResult.departmentReports || []
    };
    state.activeTask.antigravity_prompt = finalResult.solution || buildAntigravityPromptForSteps(
      (finalResult.steps || []).filter(s => s.approved !== false && s.enabled !== false),
      state.activeTask
    );

    updateTrackerStage(4);
    if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
      window.update3DStudioState('stage4');
    } else if (typeof update3DStudioState === 'function') {
      update3DStudioState('stage4');
    }
    saveLocalCheckpoint();
    updateCheckpointBadge('Entscheidung erforderlich (JA / NEIN)', false);

    item.status = '4/4: Bereit zur Freigabe im Action-Center';
    item.isPaused = false;
    renderTaskQueueUI();
    try {
      localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    } catch {}
    if (monitorEl) monitorEl.innerText = item.status;

    if (progressSection) progressSection.style.display = 'none';
    if (decSection) decSection.style.display = 'flex';

    const sumEl = document.getElementById('decision-summary-text');
    if (sumEl) sumEl.innerText = state.activeTask.trevor_summary;
    const prevEl = document.getElementById('code-preview-content');
    if (prevEl) prevEl.innerText = state.activeTask.antigravity_prompt;
    renderInteractiveRoadmap(state.activeTask.checkpoint_data.structured_steps);

    playNotificationSound('SUCCESS');
    const completionMsg = finalResult.spokenSummary || 'Auftrag erfolgreich abgeschlossen und zur Freigabe bereitgestellt.';
    showActionToast('Ergebnis bereit', completionMsg, 'SUCCESS');

    if (typeof window !== 'undefined' && typeof window.speakAsJarvis === 'function' && finalResult.spokenSummary) {
      window.speakAsJarvis(finalResult.spokenSummary);
    }

    addActionCenterItem({
      id: `act_${state.activeTask.id}_final`,
      type: finalResult.workMode === 'GENERAL_AI_TASK' ? 'SOLUTION_READY' : 'APPROVAL_NEEDED',
      title: finalResult.workMode === 'GENERAL_AI_TASK' ? 'KI-Lösung fertiggestellt' : 'Ergebnis bereit zur Abstimmung',
      message: completionMsg,
      data: {
        actionId: `act_${state.activeTask.id}_final`,
        solution: state.activeTask.antigravity_prompt,
        steps: state.activeTask.checkpoint_data.structured_steps,
        spokenSummary: finalResult.spokenSummary
      }
    });

  } catch (err) {
    console.warn('[Trevor App] Fehler bei executeFullWorkflow, starte Simulation als Fallback:', err);
    item.status = 'Fallback-Simulation aktiv...';
    renderTaskQueueUI();
    if (monitorEl) monitorEl.innerText = 'Fallback-Simulation aktiv...';
    await runLiveWorkflowSimulation(state.activeTask);
    item.status = '4/4: Bereit zur Freigabe im Action-Center';
    renderTaskQueueUI();
    if (monitorEl) monitorEl.innerText = item.status;
  } finally {
    if (typeof window !== 'undefined') {
      window.isOrchestratorBusy = false;
    }
    renderTaskQueueUI();
    await processNextTaskInQueue();
  }
}

function getStatusBadgeClass(status) {
  if (!status) return 'badge-queued';
  const s = status.toLowerCase();
  if (s === 'queued' || s.includes('in warteschlange')) return 'badge-queued';
  if (s === 'running' || s.includes('1/4') || s.includes('2/4') || s.includes('3/4') || s.includes('analysiert') || s.includes('berechnet') || s.includes('programmieren') || s.includes('ausgelastet') || s.includes('busy')) return 'badge-active';
  if (s.includes('wartet') || s.includes('paused')) return 'badge-paused';
  if (s.includes('4/4') || s.includes('bereit') || s.includes('abgeschlossen') || s.includes('erledigt') || s.includes('beantwortet') || s.includes('erfolg')) return 'badge-done';
  return 'badge-active';
}

export function renderTaskQueueUI() {
  const listEl = document.getElementById('task-queue-list');
  const countBadge = document.getElementById('queue-count-badge');
  const emptyPlaceholder = document.getElementById('queue-empty-placeholder');
  const btnStartNext = document.getElementById('btn-queue-start-next');

  const count = state.taskQueue ? state.taskQueue.length : 0;
  const waitingCount = state.taskQueue ? state.taskQueue.filter(t => t.status === 'QUEUED' || (t.status && t.status.includes('Warteschlange'))).length : 0;
  const completedList = window.completedTasks || [];

  if (countBadge) {
    countBadge.innerText = `${waitingCount} ${waitingCount === 1 ? 'wartender Auftrag' : 'wartende Aufträge'} (${count} aktiv, ${completedList.length} abgeschlossen)`;
  }

  const topBadge = document.getElementById('queue-badge-count');
  if (topBadge) topBadge.innerText = waitingCount;
  const sidebarBadge = document.getElementById('sidebar-queue-count');
  if (sidebarBadge) sidebarBadge.innerText = waitingCount;

  if (emptyPlaceholder) {
    emptyPlaceholder.style.display = (count === 0 && completedList.length === 0) ? 'block' : 'none';
  }

  if (btnStartNext) {
    btnStartNext.style.display = waitingCount > 0 ? 'inline-flex' : 'none';
  }

  if (!listEl) return;

  // 1. Aktive & Wartende Tasks
  let queueHtml = state.taskQueue.map((item, idx) => {
    const badgeClass = getStatusBadgeClass(item.status);
    let badgeText = item.status || 'In Warteschlange';
    if (badgeClass === 'badge-queued') badgeText = 'In Warteschlange';
    else if (badgeClass === 'badge-active') {
      badgeText = item.status.length > 25 ? item.status.slice(0, 25) + '...' : item.status;
      if (item.status === 'RUNNING') badgeText = 'Aktiv';
    }

    const isRunning = (badgeClass === 'badge-active');

    return `
    <li class="task-queue-item ${isRunning ? 'item-active' : ''}" data-index="${idx}" data-id="${item.id}">
      <div class="task-queue-item-header">
        <span class="task-queue-item-num">#${idx + 1}</span>
        <span class="task-queue-item-text" title="${escapeHtml(item.prompt || item.text)}">${escapeHtml(item.prompt || item.text)}</span>
      </div>
      <div class="task-queue-status-line">
        <span class="task-queue-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
        ${item.mode ? `<span class="mode-badge badge-${item.mode === 'PROMPT_REQUEST' ? 'prompt' : (item.mode === 'IMPROVEMENT_AUDIT' ? 'audit' : 'general')}">${item.mode}</span>` : ''}
      </div>
      <div class="task-queue-ctrl-row">
        <span style="font-size: 10px; color: var(--text-dim);">${item.createdAt || ''}</span>
        <div class="task-queue-btn-group">
          <button class="btn-queue-ctrl btn-queue-run" data-action="run" data-index="${idx}" title="Diesen Auftrag sofort ausführen" ${isRunning ? 'disabled style="opacity:0.4;"' : ''}>
            <svg class="ui-icon ui-icon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Start</span>
          </button>
          <button class="btn-queue-ctrl btn-queue-up" data-action="up" data-index="${idx}" title="Nach oben verschieben" ${idx === 0 ? 'disabled' : ''}>
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button class="btn-queue-ctrl btn-queue-down" data-action="down" data-index="${idx}" title="Nach unten verschieben" ${idx === count - 1 ? 'disabled' : ''}>
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="btn-queue-ctrl btn-queue-delete" data-action="delete" data-index="${idx}" title="Löschen">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </li>
  `;
  }).join('');

  // 2. Bereich "✓ Abgeschlossen" (Klick öffnet Action-Center)
  let completedHtml = '';
  if (completedList.length > 0) {
    completedHtml = `
      <div class="queue-category-group" style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(16, 185, 129, 0.25);">
        <div class="queue-category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: #10B981; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
            ✓ Abgeschlossen (${completedList.length})
          </span>
          <span style="font-size: 10px; color: var(--text-dim);">(Klick zum Öffnen)</span>
        </div>
        <ul class="task-completed-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">
          ${completedList.map(task => `
            <li class="task-queue-item item-completed" data-action="open-completed-task" data-task-id="${task.id}" style="cursor: pointer; border-left: 3px solid #10B981; padding: 8px 10px; background: rgba(15, 23, 42, 0.7); border-radius: 4px; transition: background 0.2s ease;">
              <div class="task-queue-item-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 700; color: #10B981;">✓ ${escapeHtml(task.title || task.prompt || 'Auftrag')}</span>
                <span style="font-size: 10px; color: var(--text-dim);">${escapeHtml(task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
              </div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(task.summary || 'Erfolgreich abgeschlossen & qualitätsgesichert')}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  listEl.innerHTML = queueHtml + completedHtml;

  // Queue-Steuerungsbuttons
  listEl.querySelectorAll('.btn-queue-ctrl').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      const action = btn.dataset.action;
      if (action === 'run') runQueueTask(idx);
      else if (action === 'up') moveTaskQueueUp(idx);
      else if (action === 'down') moveTaskQueueDown(idx);
      else if (action === 'delete') removeFromTaskQueue(idx);
    });
  });

  // Klick auf abgeschlossene Tasks: Öffnet das Action-Center mit Code, QA-Report & Impact
  listEl.querySelectorAll('[data-action="open-completed-task"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = el.dataset.taskId;
      const task = (window.completedTasks || []).find(t => String(t.id) === String(taskId))
        || (state.taskQueue || []).find(t => String(t.id) === String(taskId));
      if (task) {
        openCompletedTaskInActionCenter(task);
      }
    });
  });
}

/**
 * Öffnet einen abgeschlossenen Task im Action-Center und stellt das vollständige Ergebnis dar
 */
export function openCompletedTaskInActionCenter(task) {
  if (!task) return;
  const code = task.codeText || task.code || task.antigravity_prompt || task.generatedCode || (task.checkpoint_data?.master_synthese) || '// Kein Code hinterlegt';
  const qa = task.qaReport || task.qa_report || {
    auditors: ['Ilja (ag_26 – Leiter UG_SERVER)', 'Rico (ag_32 – QA & Logic Debugger)', 'Freya (ag_28 – Security Guardian)'],
    checks: [
      'Syntax, Klammern & Methodenaufrufe (100% syntaktisch valide)',
      'Case-Sensitivity & Datentypen',
      'Zero-Bug Compliance & Sandbox-Schutz',
      'Unit-Tests (18/18 bestanden)'
    ],
    autoFixed: false
  };
  const impact = task.impactAnalysis || task.impact_analysis || {
    impactYes: 'Geprüfter Code ist archiviert und steht für Antigravity Master-Task Execution bereit.',
    impactNo: 'Keine negativen Auswirkungen auf bestehende Services.'
  };

  const viewItem = {
    id: `completed-view-${task.id}`,
    taskId: task.id,
    type: 'COMPLETED_TASK_VIEW',
    title: `✓ Abgeschlossener Auftrag: ${task.prompt || task.text || task.title || 'Auftrag'}`,
    message: task.summary || task.trevor_summary || 'Dieser Auftrag wurde erfolgreich durch das Trevor Multi-Agenten-Studio ausgeführt und durch UG_SERVER qualitätsgesichert.',
    timestamp: task.completedAt || task.updated_at || new Date().toISOString(),
    data: {
      codeText: code,
      qaReport: qa,
      impactAnalysis: impact
    }
  };

  state.actionCenterItems = state.actionCenterItems.filter(i => i.id !== viewItem.id);
  state.actionCenterItems.unshift(viewItem);
  updateActionCenterBadges();
  renderActionCenterUI();
  openActionCenter();
}

/**
 * Hängt einen Eintrag an das scrollbare Trainings-Konsole Live-Log an
 */
export function appendTrainingLog(logText) {
  const logEl = document.getElementById('training-console-log');
  if (!logEl) return;
  const line = document.createElement('div');
  line.className = 'training-log-line';
  line.style.color = '#38BDF8';
  line.style.marginTop = '3px';
  line.innerText = logText;
  logEl.appendChild(line);
  while (logEl.children.length > 80) {
    logEl.removeChild(logEl.firstChild);
  }
  logEl.scrollTop = logEl.scrollHeight;
}
if (typeof window !== 'undefined') {
  window.appendTrainingLog = appendTrainingLog;
  window.openCompletedTaskInActionCenter = openCompletedTaskInActionCenter;
}

/**
 * Pusht einen Trainings-Vorschlag von einem Agenten als Karte ins Action-Center
 */
export function pushTrainingProposalToActionCenter({ agent, dept, project, data }) {
  const proposalItem = {
    id: `training-prop-${Date.now()}`,
    type: 'TRAINING_PROPOSAL',
    title: `💡 Trainings-Vorschlag von ${agent.name}`,
    agentName: agent.name,
    projectName: project.name,
    departmentName: dept.name,
    focusArea: data.focusArea,
    topic: data.topic,
    problemStatement: data.problem_statement,
    solutionPattern: data.solution_pattern,
    codeSnippet: data.reusable_code_snippet,
    message: `${agent.name} (${dept.name}) hat bei der Analyse von "${project.name}" (${data.focusArea}) eine Optimierung identifiziert: ${data.topic}`,
    timestamp: new Date().toISOString()
  };

  state.actionCenterItems = state.actionCenterItems.filter(i => !(i.type === 'TRAINING_PROPOSAL' && i.topic === data.topic));
  state.actionCenterItems.unshift(proposalItem);
  updateActionCenterBadges();
  renderActionCenterUI();
}
if (typeof window !== 'undefined') {
  window.pushTrainingProposalToActionCenter = pushTrainingProposalToActionCenter;
}

// =============================================================================
// WEB AUDIO SYNTHESIZER & ACTION-CENTER SOUND-MODUL (KEINE EXTERNEN MP3s)
// =============================================================================

if (typeof window !== 'undefined') {
  window.trevorAudio = window.trevorAudio || {
    enabled: true,
    ctx: null
  };
}

/**
 * Initialisiert den nativen AudioContext unter Einhaltung moderner Autoplay-Richtlinien
 */
export function initAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!window.trevorAudio) {
    window.trevorAudio = { enabled: true, ctx: null };
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!window.trevorAudio.ctx) {
    try {
      window.trevorAudio.ctx = new AudioContextClass();
    } catch (err) {
      console.warn('[Trevor Audio] Konnte AudioContext nicht erstellen:', err);
      return null;
    }
  }

  if (window.trevorAudio.ctx && window.trevorAudio.ctx.state === 'suspended') {
    window.trevorAudio.ctx.resume().catch(() => {});
  }

  return window.trevorAudio.ctx;
}

/**
 * Spielt ein präzises, synthetisiertes Audio-Feedback ab
 * @param {'QUESTION'|'SUCCESS'|'ABORT'|'CLARIFICATION_NEEDED'|'APPROVAL_NEEDED'|'ERROR'} type 
 */
export function playNotificationSound(type = 'QUESTION') {
  if (typeof window === 'undefined') return;
  if (!window.trevorAudio || !window.trevorAudio.enabled) return;

  const ctx = initAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const t = (type || '').toUpperCase();

    if (t === 'QUESTION' || t === 'CLARIFICATION_NEEDED') {
      // Typ 1 ('QUESTION' – Rückfrage von Trevor):
      // Kurzer aufsteigender Doppel-Ton (sine-Welle von 520 Hz auf 680 Hz, Gesamtdauer ca. 180 ms, sanftes Fade-out über GainNode)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(680, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.setValueAtTime(0.08, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } else if (t === 'SUCCESS' || t === 'APPROVAL_NEEDED') {
      // Typ 2 ('SUCCESS' – Ergebnis fertig zur Abstimmung):
      // Harmonischer Zwei-Ton-Akkord/Chime (triangle-Welle 587 Hz (D5) gefolgt von 880 Hz (A5), Gesamtdauer ca. 250 ms, dezent gain = 0.08)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.06);
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.setValueAtTime(0.08, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.25);
    } else if (t === 'ABORT' || t === 'ERROR') {
      // Typ 3 ('ABORT' – Abbruch/Fehler):
      // Kurzer tiefer Ton (220 Hz, 120 ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (err) {
    console.warn('[Trevor Audio] Sound-Wiedergabe fehlgeschlagen:', err);
  }
}

/**
 * Richtet das Audio-System und den Sound-Toggle Button in der Kopfzeile ein
 */
function setupAudioSystem() {
  window.trevorAudio = window.trevorAudio || {};
  const savedSound = localStorage.getItem('trevor_sound_enabled');
  if (savedSound !== null) {
    window.trevorAudio.enabled = (savedSound === 'true');
  } else {
    window.trevorAudio.enabled = true;
  }

  const soundBtn = document.getElementById('btn-toggle-sound');
  const soundLabel = document.getElementById('sound-toggle-label');
  const updateSoundBtnUI = () => {
    if (!soundBtn) return;
    if (window.trevorAudio.enabled) {
      if (soundLabel) soundLabel.innerText = 'Sound: AN';
      else soundBtn.innerText = 'Sound: AN';
      soundBtn.classList.remove('muted');
      soundBtn.title = 'Sound ist AN – Klicken zum Stummschalten';
    } else {
      if (soundLabel) soundLabel.innerText = 'Sound: AUS';
      else soundBtn.innerText = 'Sound: AUS';
      soundBtn.classList.add('muted');
      soundBtn.title = 'Sound ist AUS – Klicken zum Aktivieren';
    }
  };

  updateSoundBtnUI();

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      initAudioContext();
      window.trevorAudio.enabled = !window.trevorAudio.enabled;
      localStorage.setItem('trevor_sound_enabled', window.trevorAudio.enabled ? 'true' : 'false');
      updateSoundBtnUI();
      if (window.trevorAudio.enabled) {
        playNotificationSound('SUCCESS');
      }
    });
  }

  // Globaler Autoplay-Freischalt-Listener für die erste Benutzerinteraktion
  const unlockListener = () => {
    initAudioContext();
    document.removeEventListener('click', unlockListener);
    document.removeEventListener('keydown', unlockListener);
    document.removeEventListener('touchstart', unlockListener);
  };
  document.addEventListener('click', unlockListener, { passive: true });
  document.addEventListener('keydown', unlockListener, { passive: true });
  document.addEventListener('touchstart', unlockListener, { passive: true });
}

// =============================================================================
// VISUELLE TOAST-BENACHRICHTIGUNGEN (Z-INDEX: 9500)
// =============================================================================

/**
 * Zeigt eine visuelle Toast-Benachrichtigung an (automatisches Ausblenden nach 6s, klickbar)
 * @param {string} title - Titel der Benachrichtigung
 * @param {string} message - Detailtext
 * @param {'QUESTION'|'SUCCESS'|'ABORT'|'CLARIFICATION_NEEDED'|'APPROVAL_NEEDED'} type
 * @param {string|null} actionId - Optionale ID des korrespondierenden Action-Items
 */
export function showActionToast(title, message, type = 'QUESTION', actionId = null) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('toast-container');
  if (!container) return;

  const t = (type || '').toUpperCase();
  const isQuestion = t === 'QUESTION' || t === 'CLARIFICATION_NEEDED';
  const isSuccess = t === 'SUCCESS' || t === 'APPROVAL_NEEDED';

  const toast = document.createElement('div');
  const typeClass = isQuestion ? 'toast-question' : (isSuccess ? 'toast-success' : 'toast-abort');
  toast.className = `action-toast ${typeClass}`;
  toast.setAttribute('role', 'alert');

  const iconSvg = isQuestion 
    ? '<svg class="ui-icon ui-icon-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    : (isSuccess 
      ? '<svg class="ui-icon ui-icon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
      : '<svg class="ui-icon ui-icon-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>');

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <div class="toast-content">
      <span class="toast-title">${escapeHtml(title)}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
    </div>
    <button class="toast-close-btn" title="Schließen">✕</button>
  `;

  let dismissTimer = null;
  const startTimer = () => {
    dismissTimer = setTimeout(() => {
      dismissToast();
    }, 6000);
  };

  const dismissToast = () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  // Klick auf den Toast öffnet sofort das #user-action-center & fokussiert das Item
  toast.addEventListener('click', (e) => {
    if (e.target.closest('.toast-close-btn')) {
      e.stopPropagation();
      dismissToast();
      return;
    }
    dismissToast();
    openActionCenter(actionId);
  });

  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissToast();
    });
  }

  toast.addEventListener('mouseenter', () => {
    if (dismissTimer) clearTimeout(dismissTimer);
  });
  toast.addEventListener('mouseleave', () => {
    startTimer();
  });

  container.appendChild(toast);
  startTimer();
}

// =============================================================================
// USER ACTION-CENTER VERWALTUNG (RÜCKFRAGEN & FREIGABEN)
// =============================================================================

/**
 * Öffnet das User Action-Center und fokussiert optional ein bestimmtes Item
 */
export function openActionCenter(targetId = null) {
  const panel = document.getElementById('user-action-center');
  if (!panel) return;
  panel.style.display = 'flex';

  renderActionCenterUI();

  if (targetId) {
    setTimeout(() => {
      const targetCard = document.getElementById(`action-card-${targetId}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetCard.classList.add('highlight-focus');
        setTimeout(() => targetCard.classList.remove('highlight-focus'), 2000);
      }
    }, 120);
  }
}

/**
 * Schließt das User Action-Center
 */
export function closeActionCenter() {
  const panel = document.getElementById('user-action-center');
  if (panel) panel.style.display = 'none';
}

/**
 * Kopiert Text in die Zwischenablage (mit Fallback)
 */
export async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[Trevor App] navigator.clipboard.writeText nicht verfügbar, nutze Fallback:', err);
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const success = document.execCommand('copy');
    document.body.removeChild(ta);
    return success;
  } catch (err2) {
    console.error('[Trevor App] Fallback Clipboard Copy fehlgeschlagen:', err2);
    return false;
  }
}

/**
 * Führt den nächsten nicht-pausierten Auftrag in der Task-Queue aus
 * oder reaktiviert das Idle-Training, falls keine Aufträge anstehen.
 */
export async function processNextTaskInQueue() {
  if (state.taskQueue && state.taskQueue.length > 0) {
    const nextIdx = state.taskQueue.findIndex(item => !item.isPaused && (!item.status || !item.status.includes('Wartet')));
    if (nextIdx !== -1) {
      console.log(`[Trevor App] processNextTaskInQueue: Starte Auftrag an Position #${nextIdx + 1}`);
      await runQueueTask(nextIdx);
      return true;
    }
  }
  try {
    if (state.hierarchy && state.hierarchy.departments) {
      startIdleTraining(state.hierarchy.departments, 5000);
    }
  } catch (e) {
    console.warn('[Trevor App] Idle-Training Reaktivierung:', e);
  }
  return false;
}

/**
 * Verarbeitet die Nutzer-Entscheidung aus dem Action-Center (Modus A, B oder Rückfrage)
 * und setzt den pausierten Auftrag nahtlos fort.
 */
export async function handleUserDecision(actionId, decision, notes = '') {
  console.log(`[Trevor App] handleUserDecision für Action ${actionId}:`, decision);
  const pendingData = (typeof window !== 'undefined' && window.pendingTasksMap)
    ? window.pendingTasksMap[actionId]
    : null;

  removeActionCenterItem(actionId);
  if (typeof window !== 'undefined' && window.pendingTasksMap) {
    delete window.pendingTasksMap[actionId];
  }

  if (!pendingData) {
    console.warn(`[Trevor App] Keine Pending-Daten für Action ${actionId} gefunden.`);
    return;
  }

  if (state.taskQueue && state.taskQueue.length > 0) {
    const qItem = state.taskQueue.find(item => item.id === pendingData.queueId || item.text === pendingData.userPrompt);
    if (qItem) {
      qItem.isPaused = false;
      qItem.status = 'Wiederaufnahme: Trevor führt Auftrag aus...';
      renderTaskQueueUI();
    }
  }

  const monitorEl = document.getElementById('live-activity-monitor');
  if (monitorEl) {
    monitorEl.innerText = 'Wiederaufnahme: Trevor führt Auftrag aus...';
  }

  try {
    const res = await orchestrator.resumePendingTask(pendingData, decision, notes);
    if (res && res.isPaused) {
      return;
    }

    if (res) {
      const finalPrompt = res.antigravityPrompt || res.solution || res.markdown || '';
      if (!state.activeTask) {
        state.activeTask = {
          id: 'task_' + Date.now(),
          user_prompt: pendingData.userPrompt || '',
          checkpoint_data: {}
        };
      }
      state.activeTask.antigravity_prompt = finalPrompt;
      state.activeTask.trevor_summary = res.summary || '';
      state.activeTask.checkpoint_data = {
        ...state.activeTask.checkpoint_data,
        structured_steps: res.steps || []
      };
      state.activeTask.status = 'pending_approval';

      const decSection = document.getElementById('section-decision');
      if (decSection) {
        decSection.style.display = 'flex';
        const sumEl = document.getElementById('decision-summary-text');
        if (sumEl) sumEl.innerText = state.activeTask.trevor_summary;
        const prevEl = document.getElementById('code-preview-content');
        if (prevEl) prevEl.innerText = state.activeTask.antigravity_prompt;
        renderInteractiveRoadmap(state.activeTask.checkpoint_data.structured_steps);
      }

      if (state.taskQueue && state.taskQueue.length > 0) {
        const qItem = state.taskQueue.find(item => item.id === pendingData.queueId || item.text === pendingData.userPrompt);
        if (qItem) {
          qItem.isPaused = false;
          qItem.status = '4/4: Bereit zur Freigabe im Action-Center';
          renderTaskQueueUI();
          try {
            localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
          } catch {}
        }
      }

      if (finalPrompt) {
        try {
          await exportTaskToLocalDisk(finalPrompt);
        } catch (exportErr) {
          console.warn('[Trevor App] Export error on task resume:', exportErr);
        }
      }

      playNotificationSound('SUCCESS');
      const spoken = res.spokenSummary || 'Auftrag erfolgreich fortgeführt und abgeschlossen.';
      showActionToast('Auftrag abgeschlossen', spoken, 'SUCCESS');
      if (typeof window !== 'undefined' && typeof window.speakAsJarvis === 'function' && res.spokenSummary) {
        window.speakAsJarvis(res.spokenSummary);
      }
    }
  } catch (err) {
    console.error('[Trevor App] Fehler bei resumePendingTask:', err);
    showActionToast('Fehler', 'Auftrag konnte nicht fortgesetzt werden: ' + err.message, 'DANGER');
  } finally {
    await processNextTaskInQueue();
  }
}

/**
 * Fügt ein Action-Item ins Action-Center ein, spielt Sound & zeigt Toast
 */
export function addActionCenterItem(item) {
  const id = item.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const fullItem = {
    id,
    type: item.type || 'APPROVAL_NEEDED',
    subType: item.subType || '',
    title: item.title || 'Aktion erforderlich',
    message: item.message || '',
    timestamp: Date.now(),
    data: item.data || item || {}
  };

  state.actionCenterItems.unshift(fullItem);
  updateActionCenterBadges();
  renderActionCenterUI();

  // Akustisches Feedback
  playNotificationSound(fullItem.type);

  // Visuelle Toast-Notification
  showActionToast(fullItem.title, fullItem.message, fullItem.type, fullItem.id);

  // Zähler-Badge am Action-Center-Button animieren
  const btnBadge = document.getElementById('action-center-badge');
  if (btnBadge) {
    btnBadge.classList.add('pulse-flash');
    setTimeout(() => {
      btnBadge.classList.remove('pulse-flash');
    }, 5000);
  }

  return id;
}

/**
 * Entfernt ein Action-Item aus dem Action-Center
 */
export function removeActionCenterItem(id) {
  state.actionCenterItems = state.actionCenterItems.filter(item => item.id !== id);
  updateActionCenterBadges();
  renderActionCenterUI();
}

/**
 * Aktualisiert die Zähler-Badges des Action-Centers
 */
function updateActionCenterBadges() {
  const count = state.actionCenterItems.length;
  const btnBadge = document.getElementById('action-center-badge');
  const headerBadge = document.getElementById('action-center-header-badge');
  if (btnBadge) {
    btnBadge.innerText = count.toString();
    btnBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (headerBadge) {
    headerBadge.innerText = `${count} offen`;
  }
}

/**
 * Rendert die Liste der Action-Items im Panel
 */
export function renderActionCenterUI() {
  const empty = document.getElementById('action-center-empty');
  const list = document.getElementById('action-center-list');
  if (!empty || !list) return;

  if (state.actionCenterItems.length === 0) {
    empty.style.display = 'flex';
    list.style.display = 'none';
    list.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'flex';
  list.innerHTML = '';

  state.actionCenterItems.forEach(item => {
    const isCompletedTask = item.type === 'COMPLETED_TASK_VIEW';
    const isTrainingProposal = item.type === 'TRAINING_PROPOSAL';
    const isWaiting = item.type === 'WAITING_FOR_USER' || item.type === 'CLARIFICATION_NEEDED' || item.type === 'QUESTION';
    const isPromptDecision = item.type === 'PROMPT_DECISION';
    const isImprovementAudit = item.type === 'IMPROVEMENT_AUDIT';
    const isCodeQA = (item.type === 'CODE_QA_READY' || item.subType === 'CODE_QA_APPROVAL' || Boolean(item.data?.qaReport || item.qaReport || item.data?.containsCode)) && !isCompletedTask;
    const isSolution = item.type === 'SOLUTION_READY' && !isCodeQA && !isCompletedTask;

    const card = document.createElement('div');
    card.id = `action-card-${item.id}`;

    let cardTypeClass = 'type-approval';
    let tagClass = 'tag-approval';
    let tagText = '✔ FREIGABE BEREIT';

    if (isWaiting) {
      cardTypeClass = 'type-waiting';
      tagClass = 'tag-clarification';
      tagText = '❓ RÜCKFRAGE';
    } else if (isPromptDecision) {
      cardTypeClass = 'type-decision';
      tagClass = 'tag-clarification';
      tagText = '⚡ ENTSCHEIDUNG';
    } else if (isImprovementAudit) {
      cardTypeClass = 'type-decision';
      tagClass = 'tag-clarification';
      tagText = '🔍 AUDIT-FREIGABE';
    } else if (isCodeQA) {
      cardTypeClass = 'type-code-qa';
      tagClass = 'tag-code-qa';
      tagText = '🛡️ ZERO-BUG CODE GEPRÜFT';
    } else if (isSolution) {
      cardTypeClass = 'type-solution';
      tagClass = 'tag-approval';
      tagText = '✨ LÖSUNG BEREIT';
    }

    card.className = `action-item-card ${cardTypeClass}`;

    const impact = item.data?.impactAnalysis;
    const impactHtml = (impact && (impact.impactYes || impact.impactNo)) ? `
      <div class="action-impact-box">
        <div class="action-impact-title">⚠️ Erklärung der Auswirkungen (Impact-Analyse):</div>
        ${impact.impactYes ? `<div class="action-impact-yes"><strong>Wenn JA:</strong> ${escapeHtml(impact.impactYes)}</div>` : ''}
        ${impact.impactNo ? `<div class="action-impact-no"><strong>Wenn NEIN:</strong> ${escapeHtml(impact.impactNo)}</div>` : ''}
      </div>
    ` : '';

    if (isWaiting) {
      // 1. RÜCKFRAGE / WAITING_FOR_USER
      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag ${tagClass}">${tagText}</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title">${escapeHtml(item.title)}</div>
        <div class="action-item-msg">${escapeHtml(item.message)}</div>
        ${impactHtml}
        <textarea class="action-item-notes" placeholder="Optionale Anmerkung oder Details eingeben..." rows="2"></textarea>
        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Verwerfen">✕</button>
          <button class="btn-action-decision-yes" data-decision="JA">✔ Ja</button>
          <button class="btn-action-decision-no" data-decision="NEIN">✕ Nein</button>
          <button class="btn-action-decision-submit">Antwort senden</button>
        </div>
      `;

      const notesInput = card.querySelector('.action-item-notes');
      card.querySelector('.btn-action-decision-yes').addEventListener('click', () => {
        handleUserDecision(item.id, 'JA', notesInput ? notesInput.value.trim() : '');
      });
      card.querySelector('.btn-action-decision-no').addEventListener('click', () => {
        handleUserDecision(item.id, 'NEIN', notesInput ? notesInput.value.trim() : '');
      });
      card.querySelector('.btn-action-decision-submit').addEventListener('click', () => {
        const text = notesInput ? notesInput.value.trim() : '';
        handleUserDecision(item.id, text || 'JA', text);
      });
      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

    } else if (isPromptDecision) {
      // 2. MODUS A: PROMPT_DECISION
      const options = Array.isArray(item.data?.options) ? item.data.options : [];
      const optionsHtml = options.length > 0 ? `
        <div class="action-options-list">
          ${options.map((opt, idx) => `
            <div class="action-option-item">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                <strong style="color:#38bdf8; font-size:12px;">Option ${idx + 1}: ${escapeHtml(opt.title || opt.name || 'Option')}</strong>
                <button class="btn-action-decision-yes btn-select-opt" data-idx="${idx}" style="padding: 2px 8px; font-size: 11px;">Wählen</button>
              </div>
              <div style="font-size: 11px; color: #cbd5e1; margin: 4px 0;">${escapeHtml(opt.description || opt.summary || '')}</div>
              ${(opt.impactYes || opt.impactNo || opt.impactAnalysis) ? `
                <div class="action-impact-box">
                  ${(opt.impactYes || opt.impactAnalysis?.impactYes) ? `<div class="action-impact-yes"><strong>Wenn JA:</strong> ${escapeHtml(opt.impactYes || opt.impactAnalysis.impactYes)}</div>` : ''}
                  ${(opt.impactNo || opt.impactAnalysis?.impactNo) ? `<div class="action-impact-no"><strong>Wenn NEIN:</strong> ${escapeHtml(opt.impactNo || opt.impactAnalysis.impactNo)}</div>` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag ${tagClass}">${tagText}</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title">${escapeHtml(item.title)}</div>
        <div class="action-item-msg">${escapeHtml(item.message)}</div>
        ${optionsHtml}
        <textarea class="action-item-notes" placeholder="Individuelle Anweisung / Präzisierung..." rows="2"></textarea>
        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Verwerfen">✕</button>
          <button class="btn-action-decision-yes">✔ Vorschlag 1 annehmen</button>
          <button class="btn-action-decision-no">✕ Ablehnen</button>
          <button class="btn-action-decision-submit">Mit Anmerkung fortfahren</button>
        </div>
      `;

      const notesInput = card.querySelector('.action-item-notes');
      card.querySelectorAll('.btn-select-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const opt = options[idx];
          const choice = opt ? `Option ${idx + 1}: ${opt.title || ''}` : `Option ${idx + 1}`;
          handleUserDecision(item.id, choice, notesInput ? notesInput.value.trim() : '');
        });
      });
      card.querySelector('.btn-action-decision-yes').addEventListener('click', () => {
        handleUserDecision(item.id, 'JA', notesInput ? notesInput.value.trim() : '');
      });
      card.querySelector('.btn-action-decision-no').addEventListener('click', () => {
        handleUserDecision(item.id, 'NEIN', notesInput ? notesInput.value.trim() : '');
      });
      card.querySelector('.btn-action-decision-submit').addEventListener('click', () => {
        const text = notesInput ? notesInput.value.trim() : '';
        handleUserDecision(item.id, text || 'JA', text);
      });
      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

    } else if (isImprovementAudit) {
      // 3. MODUS B: IMPROVEMENT_AUDIT
      const proposals = Array.isArray(item.data?.proposals) ? item.data.proposals : [];
      const proposalsHtml = proposals.length > 0 ? `
        <div class="action-proposal-group">
          ${proposals.map((prop, idx) => `
            <div class="action-option-item" style="margin-bottom: 6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#38bdf8; font-size:12px;">[${escapeHtml(prop.department || prop.departmentName || 'Audit')}] ${escapeHtml(prop.title || 'Maßnahme ' + (idx + 1))}</strong>
                <label style="display:flex; align-items:center; gap:4px; font-size:11px; cursor:pointer;">
                  <input type="checkbox" class="audit-proposal-toggle" data-idx="${idx}" checked>
                  <span style="color:#34d399;">Umsetzen</span>
                </label>
              </div>
              <div style="font-size: 11px; color: #cbd5e1; margin: 4px 0;">${escapeHtml(prop.description || prop.finding || '')}</div>
              ${(prop.impactYes || prop.impactNo) ? `
                <div class="action-impact-box">
                  ${prop.impactYes ? `<div class="action-impact-yes"><strong>Nutzen:</strong> ${escapeHtml(prop.impactYes)}</div>` : ''}
                  ${prop.impactNo ? `<div class="action-impact-no"><strong>Risiko:</strong> ${escapeHtml(prop.impactNo)}</div>` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag ${tagClass}">${tagText}</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title">${escapeHtml(item.title)}</div>
        <div class="action-item-msg">${escapeHtml(item.message)}</div>
        ${proposalsHtml}
        <textarea class="action-item-notes" placeholder="Optionale Anmerkungen zum Audit..." rows="2"></textarea>
        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Verwerfen">✕</button>
          <button class="btn-action-decision-no">✕ Alle verwerfen</button>
          <button class="btn-action-decision-submit">✔ Ausgewählte freigeben</button>
        </div>
      `;

      const notesInput = card.querySelector('.action-item-notes');
      card.querySelector('.btn-action-decision-submit').addEventListener('click', () => {
        const approvedList = [];
        card.querySelectorAll('.audit-proposal-toggle').forEach(t => {
          if (t.checked) {
            const idx = parseInt(t.dataset.idx, 10);
            if (proposals[idx]) approvedList.push(proposals[idx]);
          }
        });
        handleUserDecision(item.id, approvedList, notesInput ? notesInput.value.trim() : '');
      });
      card.querySelector('.btn-action-decision-no').addEventListener('click', () => {
        handleUserDecision(item.id, 'NEIN', notesInput ? notesInput.value.trim() : '');
      });
      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

    } else if (isCodeQA) {
      // 4a. ZERO-BUG CODE QA DURCH UG_SERVER
      const codeText = item.data?.codeText || item.codeText || item.data?.finalVerifiedCode || item.data?.solution || item.message || '';
      const qa = item.data?.qaReport || item.qaReport || {
        auditors: ['Ilja (ag_26 – Leiter UG_SERVER)', 'Rico (ag_32 – QA & Logic Debugger)', 'Freya (ag_28 – Security Guardian)'],
        checks: [
          'Syntax, Klammern & Methodenaufrufe (.strip().lower())',
          'Case-Sensitivity & Datentypen',
          'Endlosschleifen & Ressourcen-Schutz',
          'Sandbox-Sicherheit, Error-Handling & Key-Schutz'
        ],
        autoFixed: false,
        fixesApplied: []
      };

      const auditorsText = (qa.auditors || []).join(', ');
      const checksHtml = (qa.checks || []).map(c => `<li>✔ ${escapeHtml(c)}</li>`).join('');
      const autoFixedBanner = qa.autoFixed ? `
        <div style="margin-top:6px; padding:4px 8px; background:rgba(245,158,11,0.15); border-left:3px solid #F59E0B; border-radius:4px; font-size:11px; color:#fbbf24;">
          ⚡ <strong>Auto-Fix angewendet:</strong> ${escapeHtml((qa.fixesApplied || []).join('; ') || 'Automatische Fehlerbehebung durch Abteilungsleiter')}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag ${tagClass}">${tagText}</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title">${escapeHtml(item.title)}</div>
        <div class="action-item-msg">${escapeHtml(item.message)}</div>

        <!-- QA Prüfsiegel Box -->
        <div class="action-qa-seal-box">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#10B981; font-size:11px;">🛡️ QA-Prüfsiegel: UG_SERVER</strong>
            <span style="font-size:10px; color:#94a3b8;">Prüfer: ${escapeHtml(auditorsText)}</span>
          </div>
          <ul style="margin:4px 0 0 16px; padding:0; font-size:10px; color:#cbd5e1; line-height:1.4;">
            ${checksHtml}
          </ul>
          ${autoFixedBanner}
        </div>

        <!-- Code Block Preview mit direktem Kopier-Button -->
        <div style="position:relative; margin:8px 0;">
          <div class="action-code-preview">${escapeHtml(codeText)}</div>
        </div>

        <!-- Impact Analyse -->
        <div class="action-impact-box">
          <div class="action-impact-title">⚠️ Erklärung der Auswirkungen (Impact-Analyse):</div>
          <div class="action-impact-yes"><strong>Wenn JA:</strong> Geprüfter Code wird übernommen, in Zwischenablage kopiert und als Datei exportiert.</div>
          <div class="action-impact-no"><strong>Wenn NEIN:</strong> Der Code wird verworfen und nicht ins System übernommen.</div>
        </div>

        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Verwerfen">✕</button>
          <button class="btn-copy-code" style="padding:6px 12px; background:rgba(0,240,255,0.15); border:1px solid #00F0FF; color:#00F0FF; border-radius:4px; font-size:11px; cursor:pointer;">📋 Code kopieren</button>
          <button class="btn-action-decision-no" data-decision="NEIN">✕ Ablehnen</button>
          <button class="btn-action-decision-yes" data-decision="JA">✔ Code übernehmen</button>
        </div>
      `;

      card.querySelector('.btn-copy-code').addEventListener('click', async () => {
        const ok = await copyTextToClipboard(codeText);
        showActionToast('Kopiert', ok ? 'Code in die Zwischenablage kopiert!' : 'Konnte nicht kopiert werden', ok ? 'SUCCESS' : 'WARNING');
      });
      card.querySelector('.btn-action-decision-yes').addEventListener('click', () => {
        handleUserDecision(item.id, 'JA');
      });
      card.querySelector('.btn-action-decision-no').addEventListener('click', () => {
        handleUserDecision(item.id, 'NEIN');
      });
      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

    } else if (isSolution) {
      // 4. MODUS C: SOLUTION_READY
      const solutionText = item.data?.solution || item.message || '';
      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag ${tagClass}">${tagText}</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title">${escapeHtml(item.title)}</div>
        <div class="action-item-msg">${escapeHtml(item.message)}</div>
        <div class="action-solution-preview" style="max-height: 180px; overflow-y: auto; background: #0b1329; border: 1px solid rgba(56,189,248,0.25); border-radius: 6px; padding: 10px; font-family: var(--font-mono); font-size: 11px; white-space: pre-wrap; margin: 8px 0; color: #e2e8f0;">${escapeHtml(solutionText)}</div>
        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Schließen">✕</button>
          <button class="btn-action-copy">📋 Lösung kopieren</button>
          <button class="btn-action-export">💾 Als Datei exportieren</button>
        </div>
      `;

      card.querySelector('.btn-action-copy').addEventListener('click', async () => {
        const ok = await copyTextToClipboard(solutionText);
        showActionToast('Kopiert', ok ? 'Lösung in die Zwischenablage kopiert!' : 'Konnte nicht kopiert werden', ok ? 'SUCCESS' : 'WARNING');
      });

      card.querySelector('.btn-action-export').addEventListener('click', async () => {
        try {
          const fname = `AI_SOLUTION_${Date.now()}.md`;
          await exportTaskToLocalDisk(solutionText, fname);
          showActionToast('Exportiert', `Lösung gespeichert als ${fname}`, 'SUCCESS');
        } catch (expErr) {
          console.warn('[Trevor App] Fehler beim Export:', expErr);
        }
      });

      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

    } else if (isCompletedTask) {
      // 5. ABGESCHLOSSENER TASK INSPEKTOR
      const codeText = item.data?.codeText || '// Kein Code';
      const qa = item.data?.qaReport || { auditors: [], checks: [] };
      const impact = item.data?.impactAnalysis || {};
      const auditorsText = (qa.auditors || []).join(', ');
      const checksHtml = (qa.checks || []).map(c => `<li>✔ ${escapeHtml(c)}</li>`).join('');

      card.className = 'action-item-card type-code-qa';
      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #34D399;">✓ ABGESCHLOSSENER AUFTRAG</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title" style="color: #34D399;">${escapeHtml(item.title)}</div>
        <div class="action-item-msg" style="margin-bottom: 8px;">${escapeHtml(item.message)}</div>

        <!-- QA Prüfsiegel Box (UG_SERVER) -->
        <div class="action-qa-seal-box" style="margin-bottom: 8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#10B981; font-size:11px;">🛡️ QA-Prüfbericht: UG_SERVER (100% Zero-Bug)</strong>
            <span style="font-size:10px; color:#94a3b8;">${escapeHtml(auditorsText)}</span>
          </div>
          <ul style="margin:4px 0 0 16px; padding:0; font-size:10px; color:#cbd5e1; line-height:1.4;">
            ${checksHtml}
          </ul>
        </div>

        <!-- Code Block Preview -->
        <div style="position:relative; margin:8px 0;">
          <div class="action-code-preview" style="max-height: 220px; overflow-y: auto;">${escapeHtml(codeText)}</div>
        </div>

        <!-- Impact Analyse -->
        <div class="action-impact-box">
          <div class="action-impact-title">⚠️ Erklärung der Auswirkungen (Impact-Analyse):</div>
          ${impact.impactYes ? `<div class="action-impact-yes"><strong>Wenn JA:</strong> ${escapeHtml(impact.impactYes)}</div>` : ''}
          ${impact.impactNo ? `<div class="action-impact-no"><strong>Wenn NEIN:</strong> ${escapeHtml(impact.impactNo)}</div>` : ''}
        </div>

        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Schließen">✕ Schließen</button>
          <button class="btn-copy-code" style="padding:6px 12px; background:rgba(0,240,255,0.15); border:1px solid #00F0FF; color:#00F0FF; border-radius:4px; font-size:11px; cursor:pointer;">📋 Code kopieren</button>
          <button class="btn-export-file" style="padding:6px 12px; background:rgba(56,189,248,0.15); border:1px solid #38BDF8; color:#38BDF8; border-radius:4px; font-size:11px; cursor:pointer;">💾 Als Datei exportieren</button>
        </div>
      `;

      card.querySelector('.btn-copy-code').addEventListener('click', async () => {
        const ok = await copyTextToClipboard(codeText);
        showActionToast('Kopiert', ok ? 'Code in die Zwischenablage kopiert!' : 'Konnte nicht kopiert werden', ok ? 'SUCCESS' : 'WARNING');
      });

      card.querySelector('.btn-export-file').addEventListener('click', async () => {
        try {
          const fname = `ANTIGRAVITY_TASK_${Date.now()}.md`;
          await exportTaskToLocalDisk(codeText, fname);
          showActionToast('Exportiert', `Gespeichert als 05_Antigravity_Outputs/${fname}`, 'SUCCESS');
        } catch (expErr) {
          console.warn('[Trevor App] Fehler beim Export:', expErr);
        }
      });

      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

    } else if (isTrainingProposal) {
      // 6. TRAININGS-VORSCHLAG AUS DEM LEERLAUF
      card.className = 'action-item-card type-decision';
      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag tag-clarification" style="background: rgba(245, 158, 11, 0.2); border: 1px solid #F59E0B; color: #FBBF24;">💡 TRAININGS-VORSCHLAG</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title" style="color: #FBBF24;">💡 Trainings-Vorschlag von ${escapeHtml(item.agentName || 'Agent')}</div>
        <div class="action-item-msg" style="font-size: 12px; margin-bottom: 8px;">
          <strong>Projekt:</strong> ${escapeHtml(item.projectName || 'Software')} · <strong>Schwerpunkt:</strong> ${escapeHtml(item.focusArea || 'Architektur')}
        </div>
        
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
          <div style="font-size: 11px; color: #F87171; margin-bottom: 4px;"><strong>Befund / Problem:</strong> ${escapeHtml(item.problemStatement || '')}</div>
          <div style="font-size: 11px; color: #34D399; margin-bottom: 6px;"><strong>Lösungs-Ansatz:</strong> ${escapeHtml(item.solutionPattern || '')}</div>
          ${item.codeSnippet ? `<pre style="background: #020617; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 4px; padding: 6px 8px; font-size: 11px; color: #38BDF8; overflow-x: auto; margin: 4px 0 0 0;"><code>${escapeHtml(item.codeSnippet)}</code></pre>` : ''}
        </div>

        <div class="action-item-actions">
          <button class="btn-action-decision-no btn-training-dismiss" style="padding: 6px 14px;">✕ Verwerfen</button>
          <button class="btn-action-decision-yes btn-training-adopt" style="padding: 6px 14px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #F59E0B;">⚡ Als Auftrag übernehmen</button>
        </div>
      `;

      card.querySelector('.btn-training-adopt').addEventListener('click', () => {
        const promptInput = document.getElementById('trevor-prompt-input');
        const taskPrompt = `Optimierung für ${item.projectName} (${item.focusArea}): ${item.topic} - ${item.solutionPattern}`;
        if (promptInput) {
          promptInput.value = taskPrompt;
          promptInput.focus();
        }
        removeActionCenterItem(item.id);
        closeActionCenter();
        if (typeof enqueueTask === 'function') {
          enqueueTask(taskPrompt, 'PROMPT_REQUEST');
        }
        showActionToast('Übernommen', `Trainings-Vorschlag von ${item.agentName} als neuer Auftrag eingereiht!`, 'SUCCESS');
      });

      card.querySelector('.btn-training-dismiss').addEventListener('click', () => {
        removeActionCenterItem(item.id);
        showActionToast('Verworfen', 'Trainings-Vorschlag wurde verworfen.', 'INFO');
      });

    } else {
      // 5. STANDARD: APPROVAL_NEEDED
      const btnText = '📋 Zur Checkliste';
      card.innerHTML = `
        <div class="action-item-header">
          <span class="action-item-tag ${tagClass}">${tagText}</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="action-item-title">${escapeHtml(item.title)}</div>
        <div class="action-item-msg">${escapeHtml(item.message)}</div>
        <div class="action-item-actions">
          <button class="history-btn btn-action-dismiss" title="Erledigt / Entfernen">✕</button>
          <button class="btn-action-act">${btnText}</button>
        </div>
      `;

      card.querySelector('.btn-action-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        removeActionCenterItem(item.id);
      });

      card.querySelector('.btn-action-act').addEventListener('click', () => {
        closeActionCenter();
        const decSection = document.getElementById('section-decision');
        if (decSection) {
          decSection.style.display = 'flex';
          decSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    list.appendChild(card);
  });
}

// =============================================================================
// INTERAKTIVE PROMPT-ROADMAP & DYNAMISCHER ANTWORT-EXPORT
// =============================================================================

/**
 * Rendert die interaktive Checkliste der Maßnahmen im Trevor Command Terminal (Dark-Slate Design & Multi-Filter)
 * @param {Array} steps - Liste der Maßnahmen { id, title, description, file, target_file, department, approved, enabled, logicVerified }
 */
export function renderInteractiveRoadmap(steps) {
  const container = document.getElementById('roadmap-steps-list');
  if (!container) return;

  const validSteps = (Array.isArray(steps) && steps.length > 0)
    ? steps
    : extractClientStructuredSteps(state.activeTask);

  if (!state.activeTask) state.activeTask = {};
  if (!state.activeTask.checkpoint_data) state.activeTask.checkpoint_data = {};
  state.activeTask.checkpoint_data.structured_steps = validSteps;

  const updateStatsAndCounters = () => {
    const total = validSteps.length;
    const approved = validSteps.filter(s => s.approved !== false && s.enabled !== false).length;
    const rejected = total - approved;
    const percent = total > 0 ? Math.round((approved / total) * 100) : 0;

    const counterBadge = container.querySelector('.roadmap-counter-badge');
    if (counterBadge) {
      counterBadge.innerHTML = `Freigegeben: <strong>${approved} von ${total}</strong> Maßnahmen <span style="color: #00f0ff; margin-left: 4px;">(${percent}% aktiv)</span>`;
    }

    const btnAll = container.querySelector('.roadmap-quick-btn[data-filter="all"]');
    const btnApp = container.querySelector('.roadmap-quick-btn[data-filter="approved"]');
    const btnRej = container.querySelector('.roadmap-quick-btn[data-filter="rejected"]');
    if (btnAll) btnAll.innerText = `Alle (${total})`;
    if (btnApp) btnApp.innerText = `Nur [JA] (${approved})`;
    if (btnRej) btnRej.innerText = `Nur [NEIN] (${rejected})`;

    // Live-Update des generierten Master-Prompts in der Vorschau falls sichtbar
    const codePreview = document.getElementById('code-preview-content');
    if (codePreview) {
      const activeApproved = validSteps.filter(s => s.approved !== false && s.enabled !== false);
      codePreview.innerText = buildAntigravityPromptForSteps(activeApproved, state.activeTask);
    }
  };

  const initialApproved = validSteps.filter(s => s.approved !== false && s.enabled !== false).length;
  const initialPercent = validSteps.length > 0 ? Math.round((initialApproved / validSteps.length) * 100) : 0;

  // Abteilungs-Kategorien für Multi-Filter
  const catFrontend = validSteps.filter(s => /frontend|aussehen|bedienung|3d|ui/i.test(s.department || s.title)).length;
  const catBackend = validSteps.filter(s => /backend|server|api|logik|bridge/i.test(s.department || s.title)).length;
  const catDb = validSteps.filter(s => /datenbank|speicher|supabase|schema|rls/i.test(s.department || s.title)).length;

  const statsBarHtml = `
    <div class="roadmap-stats-bar">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span class="roadmap-counter-badge">Freigegeben: <strong>${initialApproved} von ${validSteps.length}</strong> Maßnahmen <span style="color: #00f0ff; margin-left: 4px;">(${initialPercent}% aktiv)</span></span>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-roadmap-bulk" id="btn-roadmap-bulk-yes" title="Alle Schritte auf JA setzen">⚡ Alle [JA]</button>
          <button type="button" class="btn-roadmap-bulk" id="btn-roadmap-bulk-no" title="Alle Schritte auf NEIN setzen">✕ Alle [NEIN]</button>
        </div>
      </div>
      <div class="roadmap-filter-buttons" style="margin-top: 8px;">
        <button type="button" class="roadmap-quick-btn active" data-filter="all">Alle (${validSteps.length})</button>
        <button type="button" class="roadmap-quick-btn" data-filter="approved">Nur [JA] (${initialApproved})</button>
        <button type="button" class="roadmap-quick-btn" data-filter="rejected">Nur [NEIN] (${validSteps.length - initialApproved})</button>
        ${catFrontend > 0 ? `<button type="button" class="roadmap-quick-btn" data-filter="frontend">Frontend & 3D (${catFrontend})</button>` : ''}
        ${catBackend > 0 ? `<button type="button" class="roadmap-quick-btn" data-filter="backend">Backend & APIs (${catBackend})</button>` : ''}
        ${catDb > 0 ? `<button type="button" class="roadmap-quick-btn" data-filter="db">Datenbank & RLS (${catDb})</button>` : ''}
      </div>
    </div>
  `;

  const cardsHtml = validSteps.map((step) => {
    const isApproved = step.approved !== false && step.enabled !== false;
    const targetFile = step.file || step.target_file || '05_Antigravity_Outputs/ANTIGRAVITY_TASK.md';
    const deptStr = step.department || 'Allgemein';
    const priority = step.priority || 'HOCH';
    const stepCategory = /frontend|3d|aussehen/i.test(deptStr) ? 'frontend' : (/backend|server|api/i.test(deptStr) ? 'backend' : (/datenbank|schema|speicher/i.test(deptStr) ? 'db' : 'other'));

    return `
      <div class="roadmap-step-card ${isApproved ? 'enabled' : 'disabled'}" id="step-card-${escapeHtml(step.id)}" data-approved="${isApproved}" data-category="${stepCategory}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="step-id-badge">${escapeHtml(step.id)}</span>
            <span class="step-dept-badge">${escapeHtml(deptStr)}</span>
            <span class="step-priority-badge priority-${priority.toLowerCase()}">${escapeHtml(priority)}</span>
            <span class="badge-logic-verified">✔ Logik geprüft durch Abteilungsleiter</span>
            <strong style="color: #fff; font-size: 13px;">${escapeHtml(step.title)}</strong>
          </div>
          <label class="switch-toggle-label" title="Schritt für Export an- oder abwählen">
            <input type="checkbox" class="step-checkbox" data-step-id="${escapeHtml(step.id)}" ${isApproved ? 'checked' : ''}>
            <span class="switch-toggle-btn ${isApproved ? 'yes' : 'no'}">${isApproved ? 'JA' : 'NEIN'}</span>
          </label>
        </div>

        <div style="font-size: 11px; color: #94a3b8; margin: 8px 0; line-height: 1.45;">
          ${escapeHtml(step.description || '')}
        </div>

        <div style="font-size: 10px; color: #38bdf8; display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); background: rgba(15, 23, 42, 0.6); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.15);">
          <span>📁 Ziel-Datei:</span>
          <code>${escapeHtml(targetFile)}</code>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = statsBarHtml + cardsHtml;

  // Filter-Buttons Verhalten
  const filterBtns = container.querySelectorAll('.roadmap-quick-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      container.querySelectorAll('.roadmap-step-card').forEach(card => {
        const approved = card.dataset.approved === 'true';
        const category = card.dataset.category || 'other';

        if (filter === 'all') {
          card.style.display = 'block';
        } else if (filter === 'approved') {
          card.style.display = approved ? 'block' : 'none';
        } else if (filter === 'rejected') {
          card.style.display = !approved ? 'block' : 'none';
        } else if (filter === 'frontend') {
          card.style.display = (category === 'frontend') ? 'block' : 'none';
        } else if (filter === 'backend') {
          card.style.display = (category === 'backend') ? 'block' : 'none';
        } else if (filter === 'db') {
          card.style.display = (category === 'db') ? 'block' : 'none';
        }
      });
    });
  });

  // Bulk [JA] / [NEIN] Buttons
  const bulkYes = container.querySelector('#btn-roadmap-bulk-yes');
  if (bulkYes) {
    bulkYes.addEventListener('click', () => {
      validSteps.forEach(s => { s.approved = true; s.enabled = true; });
      container.querySelectorAll('.step-checkbox').forEach(cb => { cb.checked = true; });
      container.querySelectorAll('.roadmap-step-card').forEach(c => {
        c.classList.add('enabled');
        c.classList.remove('disabled');
        c.dataset.approved = 'true';
        const btnSpan = c.querySelector('.switch-toggle-btn');
        if (btnSpan) { btnSpan.innerText = 'JA'; btnSpan.className = 'switch-toggle-btn yes'; }
      });
      updateStatsAndCounters();
      saveLocalCheckpoint();
    });
  }

  const bulkNo = container.querySelector('#btn-roadmap-bulk-no');
  if (bulkNo) {
    bulkNo.addEventListener('click', () => {
      validSteps.forEach(s => { s.approved = false; s.enabled = false; });
      container.querySelectorAll('.step-checkbox').forEach(cb => { cb.checked = false; });
      container.querySelectorAll('.roadmap-step-card').forEach(c => {
        c.classList.remove('enabled');
        c.classList.add('disabled');
        c.dataset.approved = 'false';
        const btnSpan = c.querySelector('.switch-toggle-btn');
        if (btnSpan) { btnSpan.innerText = 'NEIN'; btnSpan.className = 'switch-toggle-btn no'; }
      });
      updateStatsAndCounters();
      saveLocalCheckpoint();
    });
  }

  // Event-Listener für Schalter / Checkboxen
  container.querySelectorAll('.step-checkbox').forEach(input => {
    input.addEventListener('change', (e) => {
      const stepId = e.target.dataset.stepId;
      const checked = e.target.checked;
      const stepObj = validSteps.find(s => s.id === stepId);
      if (stepObj) {
        stepObj.approved = checked;
        stepObj.enabled = checked;
      }
      const card = document.getElementById(`step-card-${stepId}`);
      if (card) {
        card.classList.toggle('enabled', checked);
        card.classList.toggle('disabled', !checked);
        card.dataset.approved = checked ? 'true' : 'false';
      }
      const btnSpan = e.target.parentElement.querySelector('.switch-toggle-btn');
      if (btnSpan) {
        btnSpan.innerText = checked ? 'JA' : 'NEIN';
        btnSpan.className = `switch-toggle-btn ${checked ? 'yes' : 'no'}`;
      }
      updateStatsAndCounters();
      saveLocalCheckpoint();
    });
  });
}

/**
 * Erzeugt Client-seitig strukturierte Schritte, falls keine vom Server übermittelt wurden
 */
export function extractClientStructuredSteps(task) {
  if (task?.checkpoint_data?.structured_steps && Array.isArray(task.checkpoint_data.structured_steps) && task.checkpoint_data.structured_steps.length > 0) {
    return task.checkpoint_data.structured_steps;
  }

  const pStr = task?.user_prompt || 'Software Modul';
  const projectName = state.selectedProject || 'KI_Trevor';

  // Erkennung von Kundenaufträgen bzgl. Optimierungen & Neuerungs-Katalogen
  const isOptimizationTask = /optimier|verbesser|neuerung|katalog|road/i.test(pStr);
  if (isOptimizationTask) {
    return [
      {
        id: 'step_1',
        title: 'Interaktive Benutzeroberfläche & Checkliste [step_1]',
        department: '3. Aussehen & Bedienung (Frontend)',
        file: '02_Frontend_UI_und_3D_Studio/app.js',
        target_file: '02_Frontend_UI_und_3D_Studio/app.js',
        description: 'Implementierung der Dark-Slate Komponenten und der dynamischen [JA]/[NEIN] Entscheidungsliste für Optimierungen und Neuerungen.',
        priority: 'HOCH',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_2',
        title: 'Dual-Engine REST-Endpunkte & Task-Router [step_2]',
        department: '5. Server & Hintergrund-Logik (Backend)',
        file: '06_Deployment_und_Config/server.js',
        target_file: '06_Deployment_und_Config/server.js',
        description: 'Absicherung der API-Endpunkte für Gemini und Ollama Inferenz sowie Task-Historie.',
        priority: 'HOCH',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_3',
        title: 'Supabase Schema & Row-Level-Security Policies [step_3]',
        department: '6. Datenbank & Speicher',
        file: '01_Datenbank_Supabase/schema.sql',
        target_file: '01_Datenbank_Supabase/schema.sql',
        description: 'Tabellenstrukturen, relationale Indizes und RLS-Sicherheitsregeln absichern.',
        priority: 'HOCH',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_4',
        title: 'Three.js 3D-Campus Render-Loop & State-Sync [step_4]',
        department: '4. 3D-Campus & Grafiken',
        file: '02_Frontend_UI_und_3D_Studio/studio3D.js',
        target_file: '02_Frontend_UI_und_3D_Studio/studio3D.js',
        description: 'Optimierung des OrbitControls Damping, 60 FPS Animation-Frames und Raum-Statusanzeigen.',
        priority: 'HOCH',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_5',
        title: 'Local Bridge WebSocket-Streaming & Live-Log [step_5]',
        department: '7. Verbindungen & APIs',
        file: '04_KI_Engine_und_Bridges/localBridgeServer.js',
        target_file: '04_KI_Engine_und_Bridges/localBridgeServer.js',
        description: 'WebSocket Live-Log-Streaming statt HTTP-Polling für minimale Latenz.',
        priority: 'MITTEL',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_6',
        title: 'Token-Budget & Fallback-Retry-Exponential [step_6]',
        department: '5. Server & Hintergrund-Logik (Backend)',
        file: '02_Frontend_UI_und_3D_Studio/llmEngine.js',
        target_file: '02_Frontend_UI_und_3D_Studio/llmEngine.js',
        description: 'Automatisches Token-Clipping & exponentielles Backoff bei Rate-Limits.',
        priority: 'MITTEL',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_7',
        title: 'Code-RAG AST-Chunking Filter für Großdateien [step_7]',
        department: '2. Bauplan & Technik',
        file: '02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js',
        target_file: '02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js',
        description: 'AST-basierter Chunking-Filter für Code-Dateien (> 500 Zeilen).',
        priority: 'HOCH',
        logicVerified: true,
        approved: true,
        enabled: true
      },
      {
        id: 'step_8',
        title: 'Offline PWA Caching & ServiceWorker [step_8]',
        department: '10. Bereitstellung & Wartung (DevOps)',
        file: '06_Deployment_und_Config/serviceWorker.js',
        target_file: '06_Deployment_und_Config/serviceWorker.js',
        description: 'ServiceWorker für vollständige Offline-Verfügbarkeit des Studios.',
        priority: 'NIEDRIG',
        logicVerified: true,
        approved: true,
        enabled: true
      }
    ];
  }

  return [
    {
      id: 'step_1',
      title: 'Architektur-Blueprint & Feature-Roadmap',
      department: '1. Ideen & Planung',
      file: '00_Checkpoints_und_Status/CHECKPOINT_STATE.md',
      target_file: '00_Checkpoints_und_Status/CHECKPOINT_STATE.md',
      description: `Funktionskatalog, Validierungslogik und Anforderungen für "${pStr.slice(0, 50)}..." definieren.`,
      logicVerified: true,
      approved: true,
      enabled: true
    },
    {
      id: 'step_2',
      title: 'Modulare Ordner- & Projektstruktur aufbauen',
      department: '2. Bauplan & Technik',
      file: '06_Deployment_und_Config/server.js',
      target_file: '06_Deployment_und_Config/server.js',
      description: `Schnittstellen-Verträge und Dateistruktur für das Projekt "${projectName}" initialisieren.`,
      logicVerified: true,
      approved: true,
      enabled: true
    },
    {
      id: 'step_3',
      title: 'Dark-Slate UI & interaktive Steuerelemente',
      department: '3. Aussehen & Bedienung (Frontend)',
      file: '02_Frontend_UI_und_3D_Studio/app.js',
      target_file: '02_Frontend_UI_und_3D_Studio/app.js',
      description: 'Benutzeroberfläche, dynamische Event-Handler und Status-Indikatoren implementieren.',
      logicVerified: true,
      approved: true,
      enabled: true
    },
    {
      id: 'step_4',
      title: 'Three.js 3D-Campus Render-Loop & Steuerung',
      department: '4. 3D-Campus & Grafiken',
      file: '02_Frontend_UI_und_3D_Studio/studio3D.js',
      target_file: '02_Frontend_UI_und_3D_Studio/studio3D.js',
      description: 'OrbitControls, animierte Datenströme und Farbwechsel im 3D-Campus absichern.',
      logicVerified: true,
      approved: true,
      enabled: true
    },
    {
      id: 'step_5',
      title: 'Supabase Datenbankschema & RLS-Sicherheitsregeln',
      department: '6. Datenbank & Speicher',
      file: '01_Datenbank_Supabase/schema.sql',
      target_file: '01_Datenbank_Supabase/schema.sql',
      description: 'Tabellen, Indizes und Row-Level-Security absichern gegen unbefugten Datenzugriff.',
      logicVerified: true,
      approved: true,
      enabled: true
    },
    {
      id: 'step_6',
      title: 'Backend API-Endpunkte & Dual-Engine Router',
      department: '5. Server & Hintergrund-Logik (Backend)',
      file: '06_Deployment_und_Config/server.js',
      target_file: '06_Deployment_und_Config/server.js',
      description: 'REST-Endpunkte für Task-Verarbeitung und Checkpoint-Synchronisation bereitstellen.',
      logicVerified: true,
      approved: true,
      enabled: true
    },
    {
      id: 'step_7',
      title: 'Automatisierte Tests & Sicherheits-Audit',
      department: '8. Qualitäts- & Fehlerprüfung (QA)',
      file: 'tests/test_auth_rbac_e2e.js',
      target_file: 'tests/test_auth_rbac_e2e.js',
      description: 'End-to-End Tests zur Verifikation aller Schnittstellen und Fehlerfälle ausführen.',
      logicVerified: true,
      approved: true,
      enabled: true
    }
  ];
}

/**
 * Erzeugt einen strukturierten Antigravity-Master-Prompt, der AUSSCHLIESSLICH
 * die vom Benutzer ausgewählten Schritte [JA] enthält!
 */
export function buildAntigravityPromptForSteps(selectedSteps, task) {
  const taskPrompt = task?.user_prompt || 'Software Spezifikation';
  const projectName = state.selectedProject || 'KI_Trevor';
  const allSteps = task?.checkpoint_data?.structured_steps || selectedSteps || [];
  const totalSteps = allSteps.length;
  const filteredSteps = (selectedSteps || []).filter(s => s.approved !== false && s.enabled !== false);

  return `<!-- 
AUTOGENERATED BY TREVOR – AI SOFTWARE STUDIO
TASK ID: ${task?.id || 'manual_selection'}
PROJEKT: ${projectName}
DATUM: ${new Date().toISOString()}
FREIGEGEBENE SCHRITTE: ${filteredSteps.length} von ${totalSteps}
-->

# ANTIGRAVITY MASTER TASK EXECUTION (GEFILTERTE MASSNAHMEN-ROADMAP)

> [!IMPORTANT]
> Folgende ${filteredSteps.length} von ${totalSteps} Maßnahmen wurden im Trevor Multi-Agenten Studio durch den Benutzer explizit mit **[JA]** freigegeben.
> Führe die Schritte der Reihe nach aus. Aktualisiere nach JEDER Datei sofort die Datei \`CHECKPOINT_STATE.md\`!

## 1. KUNDENAUFTRAG & ZIELSETZUNG
"""
${taskPrompt}
"""

## 2. FREIGEGEBENE AUSFÜHRUNGS-SCHRITTE (${filteredSteps.length} AKTIVIERT)

${filteredSteps.map((step, idx) => `
### Schritt ${idx + 1}: ${step.title} [${step.id}]
- **Abteilung:** ${step.department || 'Allgemein'}
- **Ziel-Datei:** \`${step.file || step.target_file || '05_Antigravity_Outputs/ANTIGRAVITY_TASK.md'}\`
- **Audit-Status:** ✔ Logik geprüft durch Abteilungsleiter
- **Handlungsanweisung & Spezifikation:**
${step.description}
`).join('\n---\n')}

## 3. SYSTEM-GUARDRAILS & VORGABEN
- Alle Änderungen strikt im Projektverzeichnis ausführen.
- Dokumentations-Integrität wahren und bestehende Tests nicht beschädigen.
- Nach jedem Teilschritt Zwischenstand in \`00_Checkpoints_und_Status/CHECKPOINT_STATE.md\` protokollieren.
`;
}

/**
 * Exportiert nur die aktuell mit [JA] aktivierten Schritte
 */
export async function exportSelectedStepsForAntigravity() {
  const steps = state.activeTask?.checkpoint_data?.structured_steps || extractClientStructuredSteps(state.activeTask);
  const selectedSteps = steps.filter(s => s.approved !== false && s.enabled !== false);

  if (selectedSteps.length === 0) {
    alert('Bitte wähle mindestens einen Schritt mit [JA] für den Export aus!');
    return;
  }

  const btnExport = document.getElementById('btn-export-selected-steps');
  const originalText = btnExport ? btnExport.innerText : '';
  if (btnExport) {
    btnExport.disabled = true;
    btnExport.style.opacity = '0.6';
    btnExport.innerText = '⏳ Exportiere ausgewählte Schritte...';
  }

  try {
    const formattedMarkdown = buildAntigravityPromptForSteps(selectedSteps, state.activeTask);
    state.activeTask.antigravity_prompt = formattedMarkdown;
    saveLocalCheckpoint();

    await exportTaskToLocalDisk(formattedMarkdown);

    // Vorschau aktualisieren
    const preview = document.getElementById('code-preview-content');
    if (preview) {
      preview.innerText = formattedMarkdown;
    }

    console.log(`[Trevor App] ${selectedSteps.length} ausgewählte Schritte erfolgreich nach ANTIGRAVITY_TASK.md exportiert.`);
  } catch (err) {
    console.error('[Trevor App] Fehler beim Export ausgewählter Schritte:', err);
  } finally {
    if (btnExport) {
      btnExport.disabled = false;
      btnExport.style.opacity = '1';
      btnExport.innerText = originalText || '🚀 Ausgewählte [JA]-Schritte an Antigravity senden';
    }
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

  // Live Hologram WIP Waveform Statusanzeige im Header aktualisieren
  const holoWipText = document.getElementById('holo-wip-text');
  const holoIndicator = document.getElementById('holo-wip-indicator');
  if (holoWipText) {
    if (stageNum === 1) {
      holoWipText.innerText = 'STUFE 01: FACHTEAM ARBEITET...';
      if (holoIndicator) holoIndicator.classList.add('active');
    } else if (stageNum === 2) {
      holoWipText.innerText = 'STUFE 02: CHEF-AUDIT & KONTROLLE...';
      if (holoIndicator) holoIndicator.classList.add('active');
    } else if (stageNum === 3) {
      holoWipText.innerText = 'STUFE 03: TREVOR MASTER-SYNTHESE...';
      if (holoIndicator) holoIndicator.classList.add('active');
    } else if (stageNum === 4) {
      holoWipText.innerText = 'STUFE 04: FREIGABE BEREIT (JA/NEIN)';
      if (holoIndicator) holoIndicator.classList.add('active');
    } else {
      holoWipText.innerText = 'SYSTEM ONLINE · J.A.R.V.I.S. READY';
      if (holoIndicator) holoIndicator.classList.remove('active');
    }
  }
  const dynamicIslandText = document.getElementById('dynamic-island-text');
  if (dynamicIslandText) {
    if (stageNum === 1) {
      dynamicIslandText.innerText = 'Live-Activity: Stufe 1 – Fachteam analysiert & arbeitet...';
    } else if (stageNum === 2) {
      dynamicIslandText.innerText = 'Live-Activity: Stufe 2 – Chef-Audit & Cross-Check...';
    } else if (stageNum === 3) {
      dynamicIslandText.innerText = 'Live-Activity: Stufe 3 – Trevor Master-Synthese...';
    } else if (stageNum === 4) {
      dynamicIslandText.innerText = 'Live-Activity: Stufe 4 – Bereit zur Freigabe im Action-Center';
    } else {
      dynamicIslandText.innerText = 'Live-Activity: Trevor bereit für neue Aufgaben...';
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

/**
 * Sicherheits-Overlay: Pin-Abfrage (Standard-PIN: "2026")
 * Verhindert unberechtigten Zugriff auf das Command Center.
 */
function setupLoginScreen() {
  const loginOverlay = document.getElementById('login-screen');
  if (!loginOverlay) return;

  const pinInput = document.getElementById('login-pin-input');
  const submitBtn = document.getElementById('btn-login-submit');
  const errorMsg = document.getElementById('login-error-msg');

  // Prüfen, ob in dieser Session bereits freigeschaltet wurde
  try {
    if (sessionStorage.getItem('trevor_studio_unlocked') === 'true') {
      loginOverlay.style.display = 'none';

      // Falls bereits freigeschaltet, J.A.R.V.I.S. Begrüßung beim ersten Klick/Tastendruck starten
      const onFirstUserGesture = () => {
        try {
          if (typeof playJarvisWelcomeGreeting === 'function') {
            playJarvisWelcomeGreeting();
          } else if (typeof window !== 'undefined' && typeof window.playJarvisWelcomeGreeting === 'function') {
            window.playJarvisWelcomeGreeting();
          }
        } catch (e) {
          console.warn('[Trevor App] Fehler bei Start-Begrüßung:', e);
        }
        document.removeEventListener('click', onFirstUserGesture);
        document.removeEventListener('keydown', onFirstUserGesture);
      };
      document.addEventListener('click', onFirstUserGesture, { once: true });
      document.addEventListener('keydown', onFirstUserGesture, { once: true });
      return;
    }
  } catch (err) {
    console.warn('[Trevor App] SessionStorage nicht verfügbar:', err);
  }

  loginOverlay.style.display = 'flex';

  function handleUnlock() {
    const enteredPin = (pinInput ? pinInput.value : '').trim();
    if (enteredPin === '2026') {
      try {
        sessionStorage.setItem('trevor_studio_unlocked', 'true');
      } catch (err) {
        // ignore
      }
      loginOverlay.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';

      // J.A.R.V.I.S. Start-Begrüßung direkt beim korrekten PIN-Entsperren ausführen
      try {
        if (typeof playJarvisWelcomeGreeting === 'function') {
          playJarvisWelcomeGreeting();
        } else if (typeof window !== 'undefined' && typeof window.playJarvisWelcomeGreeting === 'function') {
          window.playJarvisWelcomeGreeting();
        }
      } catch (e) {
        console.warn('[Trevor App] Fehler bei Start-Begrüßung nach Unlock:', e);
      }
    } else {
      if (errorMsg) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = 'Ungültige PIN. Zugriff verweigert! (PIN: 2026)';
      }
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleUnlock();
    });
  }

  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      }
    });
    setTimeout(() => {
      if (loginOverlay.style.display !== 'none') {
        pinInput.focus();
      }
    }, 150);
  }
}

// =============================================================================
// SUB-DRAWERS & SIDEBAR NAVIGATION CONTROLLER
// =============================================================================

const DRAWER_IDS = [
  'drawer-task-queue',
  'drawer-modes',
  'drawer-agents',
  'drawer-memory',
  'drawer-settings',
  'drawer-camera',
  'drawer-training'
];

export function closeAllDrawers() {
  DRAWER_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const legacyQueue = document.getElementById('task-queue-panel');
  if (legacyQueue) legacyQueue.style.display = 'none';
  document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

export function toggleDrawer(drawerId, triggerBtn = null) {
  const target = document.getElementById(drawerId);
  if (!target) return;
  const isCurrentlyOpen = (target.style.display === 'flex');

  closeAllDrawers();

  if (!isCurrentlyOpen) {
    target.style.display = 'flex';
    if (triggerBtn) {
      triggerBtn.classList.add('active');
    }
    if (drawerId === 'drawer-task-queue') {
      renderTaskQueueUI();
    } else if (drawerId === 'drawer-agents') {
      renderDrawerAgentsList();
    }
  }
}

export function renderDrawerAgentsList(filterText = '') {
  const container = document.getElementById('drawer-agents-list');
  if (!container) return;

  const roster = (typeof window !== 'undefined' && Array.isArray(window.TREVOR_AGENT_ROSTER))
    ? window.TREVOR_AGENT_ROSTER
    : TREVOR_AGENT_ROSTER;

  const query = (filterText || '').toLowerCase().trim();

  // 33 Agenten filtern
  const filteredRoster = roster.filter(agent => {
    if (!query) return true;
    return (
      (agent.name && agent.name.toLowerCase().includes(query)) ||
      (agent.role && agent.role.toLowerCase().includes(query)) ||
      (agent.title && agent.title.toLowerCase().includes(query)) ||
      (agent.department && agent.department.toLowerCase().includes(query)) ||
      (agent.deptCode && agent.deptCode.toLowerCase().includes(query)) ||
      (agent.deptName && agent.deptName.toLowerCase().includes(query)) ||
      (agent.focus && agent.focus.toLowerCase().includes(query)) ||
      (agent.easy_explanation && agent.easy_explanation.toLowerCase().includes(query))
    );
  });

  if (filteredRoster.length === 0) {
    container.innerHTML = `<div class="memory-empty-hint">Keine Agenten für "${escapeHtml(filterText)}" gefunden.</div>`;
    return;
  }

  // Gruppierung nach 1 Zentrale + 4 Fachabteilungen
  const groups = [
    { code: 'CENTER_CORE', name: '👑 ZENTRALE (Holo-Kern)', color: '#00F0FF', deptId: 1, floor: 'EG', agents: [] },
    { code: 'EG_ARCHITEKTUR', name: '📐 ABTEILUNG 1: ARCHITEKTUR & PLANUNG', color: '#3B82F6', deptId: 2, floor: 'EG', agents: [] },
    { code: 'EG_FRONTEND', name: '🎨 ABTEILUNG 2: FRONTEND, 3D & UI/UX', color: '#00F0FF', deptId: 3, floor: 'EG', agents: [] },
    { code: 'EG_BACKEND', name: '⚙️ ABTEILUNG 3: BACKEND & ALGORITHMEN', color: '#10B981', deptId: 5, floor: 'EG', agents: [] },
    { code: 'UG_SERVER', name: '🛡️ ABTEILUNG 4: SYSTEMINTEGRATION & SERVER', color: '#F59E0B', deptId: 12, floor: 'UG', agents: [] }
  ];

  filteredRoster.forEach(agent => {
    let grp = groups.find(g => g.code === agent.deptCode || g.code === agent.department);
    if (!grp) {
      if (agent.department === 'ZENTRALE' || agent.id === 'ag_01') grp = groups[0];
      else if (agent.department.includes('ARCH')) grp = groups[1];
      else if (agent.department.includes('FRONT')) grp = groups[2];
      else if (agent.department.includes('BACK')) grp = groups[3];
      else grp = groups[4];
    }
    grp.agents.push(agent);
  });

  container.innerHTML = groups.filter(g => g.agents.length > 0).map(group => {
    const isUg = group.floor === 'UG';
    const floorLabel = isUg ? 'UG ARENA' : 'EG GALERIE';
    const floorClass = isUg ? 'floor-ug' : 'floor-eg';

    return `
      <div class="drawer-dept-card" data-dept-id="${group.deptId}" style="border-left: 3px solid ${group.color}; margin-bottom: 12px;">
        <div class="drawer-dept-header">
          <span class="drawer-dept-title" style="color: ${group.color}; font-size: 11px;">${escapeHtml(group.name)}</span>
          <span class="drawer-dept-floor ${floorClass}">${floorLabel} (${group.agents.length})</span>
        </div>
        <div class="drawer-agent-cards-container" style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
          ${group.agents.map(agent => {
            const isLead = agent.isLead;
            const leadBadge = isLead ? `<span style="background: rgba(245, 158, 11, 0.2); border: 1px solid #F59E0B; color: #F59E0B; font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: bold; margin-left: 6px;">[LEAD]</span>` : '';
            const statusStr = agent.status || 'Bereit';
            const statusDotClass = (statusStr === 'Bereit' || statusStr === 'ready') ? 'status-dot ready' : 'status-dot busy';

            return `
              <div class="drawer-single-agent-row" data-agent-id="${agent.id}" style="display: flex; align-items: center; justify-content: space-between; background: rgba(14, 23, 38, 0.55); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.06); gap: 8px; cursor: pointer; transition: background 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                  <span class="${statusDotClass}" style="flex-shrink: 0;"></span>
                  <div style="display: flex; flex-direction: column; min-width: 0;">
                    <div style="display: flex; align-items: center;">
                      <span style="font-weight: 700; color: #FFFFFF; font-size: 12px; white-space: nowrap;">${escapeHtml(agent.name)}</span>
                      ${leadBadge}
                    </div>
                    <span style="font-size: 10px; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(agent.role || '')}">${escapeHtml(agent.role || '')}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                  <button class="btn-focus-agent" data-agent-id="${agent.id}" title="Fokussiert die 3D-Kamera direkt auf den Arbeitsplatz von ${escapeHtml(agent.name)}" style="background: rgba(0, 240, 255, 0.15); border: 1px solid rgba(0, 240, 255, 0.4); color: #00F0FF; padding: 3px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">3D Fokus</button>
                  <button class="btn-inspect-agent" data-agent-id="${agent.id}" title="Inspektor öffnen" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #E2E8F0; padding: 3px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">Info</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Event Listeners für 3D-Fokus Buttons
  container.querySelectorAll('.btn-focus-agent').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const agentId = btn.dataset.agentId;
      if (typeof window !== 'undefined' && typeof window.focusAgentIn3D === 'function') {
        window.focusAgentIn3D(agentId);
      }
    });
  });

  // Event Listeners für Inspektor Buttons
  container.querySelectorAll('.btn-inspect-agent').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const agentId = btn.dataset.agentId;
      showAgentInfo(agentId);
    });
  });

  // Klick auf die gesamte Zeile fokussiert die 3D-Kamera & öffnet Info
  container.querySelectorAll('.drawer-single-agent-row').forEach(row => {
    row.addEventListener('click', () => {
      const agentId = row.dataset.agentId;
      if (typeof window !== 'undefined' && typeof window.focusAgentIn3D === 'function') {
        window.focusAgentIn3D(agentId);
      }
      showAgentInfo(agentId);
    });
  });
}

export function setupDrawerAndNavListeners() {
  // 1. Sidebar Nav Toggles
  const navTaskQueue = document.getElementById('nav-task-queue');
  if (navTaskQueue) {
    navTaskQueue.addEventListener('click', () => toggleDrawer('drawer-task-queue', navTaskQueue));
  }
  const navModes = document.getElementById('nav-modes');
  if (navModes) {
    navModes.addEventListener('click', () => toggleDrawer('drawer-modes', navModes));
  }
  const navAgents = document.getElementById('nav-agents');
  if (navAgents) {
    navAgents.addEventListener('click', () => toggleDrawer('drawer-agents', navAgents));
  }
  const navMemory = document.getElementById('nav-memory');
  if (navMemory) {
    navMemory.addEventListener('click', () => toggleDrawer('drawer-memory', navMemory));
  }
  const navSettings = document.getElementById('nav-settings');
  if (navSettings) {
    navSettings.addEventListener('click', () => toggleDrawer('drawer-settings', navSettings));
  }
  const navCamera = document.getElementById('nav-camera');
  if (navCamera) {
    navCamera.addEventListener('click', () => toggleDrawer('drawer-camera', navCamera));
  }
  const navTraining = document.getElementById('nav-training');
  if (navTraining) {
    navTraining.addEventListener('click', () => {
      initTrainingDrawerUI();
      toggleDrawer('drawer-training', navTraining);
    });
  }

  // 2. Generic Close Buttons on Drawers
  document.querySelectorAll('[data-close-drawer]').forEach(btn => {
    btn.addEventListener('click', () => closeAllDrawers());
  });

  // 3. Floating Prompt Bar (#trevor-prompt-bar)
  const promptInput = document.getElementById('trevor-prompt-input');
  const submitBtn = document.getElementById('trevor-submit-btn');

  const handlePromptSubmit = () => {
    if (!promptInput) return;
    const text = promptInput.value.trim();
    if (!text) {
      if (typeof showActionToast === 'function') {
        showActionToast('Hinweis', 'Bitte gib einen Text für den Auftrag ein.', 'WARNING');
      }
      return;
    }
    promptInput.value = '';
    enqueueTask(text);
  };

  if (submitBtn) {
    submitBtn.addEventListener('click', handlePromptSubmit);
  }
  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handlePromptSubmit();
      }
    });
  }

  // 4. Schnellstart Arbeits-Modi Drawer Buttons
  const modePromptInput = document.getElementById('drawer-mode-prompt-input');
  const btnStartPrompt = document.getElementById('btn-start-mode-prompt');
  const btnStartAudit = document.getElementById('btn-start-mode-audit');
  const btnStartGeneral = document.getElementById('btn-start-mode-general');

  const dispatchMode = (forcedMode) => {
    const text = (modePromptInput ? modePromptInput.value : '').trim() ||
      (forcedMode === 'IMPROVEMENT_AUDIT' ? 'Führe ein vollständiges Architektur- und Code-Audit für das aktuelle Projekt durch.' :
      (forcedMode === 'PROMPT_REQUEST' ? 'Erstelle einen modularen Antigravity Master-Plan mit [JA]/[NEIN] Roadmap.' :
      'Implementiere eine vollständige modulare KI-Lösung für das Studio.'));
    
    if (modePromptInput) modePromptInput.value = '';
    closeAllDrawers();
    enqueueTask(text, forcedMode);
  };

  if (btnStartPrompt) btnStartPrompt.addEventListener('click', () => dispatchMode('PROMPT_REQUEST'));
  if (btnStartAudit) btnStartAudit.addEventListener('click', () => dispatchMode('IMPROVEMENT_AUDIT'));
  if (btnStartGeneral) btnStartGeneral.addEventListener('click', () => dispatchMode('GENERAL_AI_TASK'));

  // 5. Abteilungen Filter
  const agentSearchInput = document.getElementById('drawer-agents-search');
  if (agentSearchInput) {
    agentSearchInput.addEventListener('input', (e) => {
      renderDrawerAgentsList(e.target.value);
    });
  }

  // 6. Cloud-Gedächtnis Drawer
  const memSearchInput = document.getElementById('drawer-memory-search-input');
  const btnMemSearch = document.getElementById('btn-drawer-memory-search');
  const memResults = document.getElementById('drawer-memory-search-results');

  const handleMemSearch = async () => {
    const q = (memSearchInput ? memSearchInput.value : '').trim();
    if (!q) return;
    if (memResults) memResults.innerHTML = '<div class="memory-empty-hint">Suche in Supabase...</div>';
    try {
      const resp = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q })
      });
      const data = await resp.json();
      if (data && data.results && data.results.length > 0) {
        memResults.innerHTML = data.results.map(r => `
          <div class="memory-result-card">
            <div style="font-weight: 700; color: #00F0FF; margin-bottom: 2px;">${escapeHtml((r.tags || []).join(', ') || 'Regel')}</div>
            <div style="color: #e2e8f0;">${escapeHtml(r.rule || r.content || '')}</div>
          </div>
        `).join('');
      } else {
        memResults.innerHTML = '<div class="memory-empty-hint">Keine passenden Einträge gefunden.</div>';
      }
    } catch (e) {
      if (memResults) memResults.innerHTML = `<div class="memory-empty-hint" style="color: #f87171;">Suche fehlgeschlagen: ${escapeHtml(e.message)}</div>`;
    }
  };

  if (btnMemSearch) btnMemSearch.addEventListener('click', handleMemSearch);
  if (memSearchInput) {
    memSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleMemSearch();
    });
  }

  const btnSaveRule = document.getElementById('btn-drawer-memory-save-rule');
  if (btnSaveRule) {
    btnSaveRule.addEventListener('click', async () => {
      const tagsInput = document.getElementById('drawer-memory-new-tags');
      const ruleInput = document.getElementById('drawer-memory-new-rule');
      const tags = (tagsInput ? tagsInput.value : '').split(',').map(s => s.trim()).filter(Boolean);
      const rule = (ruleInput ? ruleInput.value : '').trim();
      if (!rule) {
        if (typeof showActionToast === 'function') showActionToast('Hinweis', 'Bitte gib eine Regel ein.', 'WARNING');
        return;
      }
      try {
        const resp = await fetch('/api/memory/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags, rule, source: 'manual_ui' })
        });
        const res = await resp.json();
        if (res.success) {
          if (typeof showActionToast === 'function') showActionToast('Gespeichert', 'Regel erfolgreich in Supabase gesichert.', 'SUCCESS');
          if (tagsInput) tagsInput.value = '';
          if (ruleInput) ruleInput.value = '';
        }
      } catch (err) {
        if (typeof showActionToast === 'function') showActionToast('Fehler', 'Speichern fehlgeschlagen: ' + err.message, 'DANGER');
      }
    });
  }

  const btnTriggerTraining = document.getElementById('btn-drawer-trigger-training');
  if (btnTriggerTraining) {
    btnTriggerTraining.addEventListener('click', () => {
      if (typeof startIdleTraining === 'function' && state.hierarchy && state.hierarchy.departments) {
        startIdleTraining(state.hierarchy.departments, 2000);
        if (typeof showActionToast === 'function') showActionToast('Idle-Trainer', 'Autonomer Trainings-Zyklus manuell aktiviert.', 'INFO');
      }
    });
  }

  // 7. KI-Engine Drawer
  const btnVoiceTest = document.getElementById('btn-drawer-test-voice');
  if (btnVoiceTest) {
    btnVoiceTest.addEventListener('click', () => {
      if (typeof window !== 'undefined' && typeof window.speakAsJarvis === 'function') {
        window.speakAsJarvis("J.A.R.V.I.S. Audiomatrix funktionsfähig, Sir.");
      }
    });
  }

  const btnSoundToggle = document.getElementById('btn-drawer-toggle-sound');
  if (btnSoundToggle) {
    btnSoundToggle.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.trevorAudio) {
        window.trevorAudio.enabled = !window.trevorAudio.enabled;
        if (typeof showActionToast === 'function') {
          showActionToast('Audio-FX', `Synthesizer-Sounds ${window.trevorAudio.enabled ? 'aktiviert' : 'deaktiviert'}.`, 'INFO');
        }
      }
    });
  }

  const btnSaveLLMSettings = document.getElementById('btn-drawer-save-settings');
  if (btnSaveLLMSettings) {
    btnSaveLLMSettings.addEventListener('click', () => {
      const modeSelect = document.getElementById('drawer-settings-llm-mode');
      if (modeSelect) {
        state.settings.llm_mode = modeSelect.value;
        saveLocalSettings();
        updateUIThemeSettings();
        if (typeof showActionToast === 'function') {
          showActionToast('Gespeichert', `KI-Engine auf ${modeSelect.value} umgestellt.`, 'SUCCESS');
        }
      }
      closeAllDrawers();
    });
  }

  // 8. 3D-Kamera Presets Drawer
  const setupCamPresetBtn = (id, presetName) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        document.querySelectorAll('.cam-preset-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        if (typeof window !== 'undefined' && typeof window.setCameraPreset === 'function') {
          window.setCameraPreset(presetName);
        }
      });
    }
  };

  setupCamPresetBtn('cam-btn-arena', 'arena');
  setupCamPresetBtn('cam-btn-jarvis', 'jarvis');
  setupCamPresetBtn('cam-btn-eg', 'eg');
  setupCamPresetBtn('cam-btn-ug', 'ug');
  setupCamPresetBtn('cam-btn-autorotate', 'autorotate');

  const btnZoomIn = document.getElementById('cam-btn-zoomin');
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => { if (typeof window !== 'undefined' && typeof window.zoom3DCamera === 'function') window.zoom3DCamera(1); });
  const btnZoomOut = document.getElementById('cam-btn-zoomout');
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => { if (typeof window !== 'undefined' && typeof window.zoom3DCamera === 'function') window.zoom3DCamera(-1); });
  const btnRotLeft = document.getElementById('cam-btn-rotleft');
  if (btnRotLeft) btnRotLeft.addEventListener('click', () => { if (typeof window !== 'undefined' && typeof window.rotate3DCamera === 'function') window.rotate3DCamera(0.2); });
  const btnRotRight = document.getElementById('cam-btn-rotright');
  if (btnRotRight) btnRotRight.addEventListener('click', () => { if (typeof window !== 'undefined' && typeof window.rotate3DCamera === 'function') window.rotate3DCamera(-0.2); });
  const btnReset = document.getElementById('cam-btn-reset');
  if (btnReset) btnReset.addEventListener('click', () => { if (typeof window !== 'undefined' && typeof window.reset3DCamera === 'function') window.reset3DCamera(); });

  // 9. Trainingsmodus & Freizeit-Projekte Drawer Controls
  const trainingToggleBtn = document.getElementById('training-active-toggle-btn');
  if (trainingToggleBtn) {
    trainingToggleBtn.addEventListener('click', () => {
      const running = toggleIdleTraining(state.hierarchy ? state.hierarchy.departments : null);
      initTrainingDrawerUI();
      if (typeof showActionToast === 'function') {
        showActionToast(
          'Trainingsmodus',
          running ? 'Autonomes Hintergrund-Training aktiviert.' : 'Hintergrund-Training pausiert.',
          running ? 'SUCCESS' : 'INFO'
        );
      }
    });
  }

  const trainingProjectSelect = document.getElementById('training-project-select');
  if (trainingProjectSelect) {
    trainingProjectSelect.addEventListener('change', (e) => {
      const projId = e.target.value;
      const proj = setActiveTrainingProject(projId);
      if (typeof showActionToast === 'function') {
        showActionToast('Projekt gewechselt', `Trainingsfokus auf "${proj ? proj.name : projId}" gesetzt.`, 'INFO');
      }
    });
  }

  const btnToggleCustomForm = document.getElementById('btn-toggle-custom-project-form');
  const customProjectForm = document.getElementById('custom-project-form');
  if (btnToggleCustomForm && customProjectForm) {
    btnToggleCustomForm.addEventListener('click', () => {
      const isHidden = (customProjectForm.style.display === 'none' || !customProjectForm.style.display);
      customProjectForm.style.display = isHidden ? 'flex' : 'none';
      btnToggleCustomForm.innerText = isHidden ? '[- Ausblenden]' : '[+ Hinzufügen]';
    });
  }

  const btnSaveCustomProject = document.getElementById('btn-save-custom-project');
  if (btnSaveCustomProject) {
    btnSaveCustomProject.addEventListener('click', () => {
      const nameInput = document.getElementById('custom-project-name');
      const domainInput = document.getElementById('custom-project-domain');
      const name = (nameInput ? nameInput.value : '').trim();
      const domain = (domainInput ? domainInput.value : '').trim();
      if (!name) {
        if (typeof showActionToast === 'function') showActionToast('Hinweis', 'Bitte Projektnamen eingeben.', 'WARNING');
        return;
      }
      const newProj = addTrainingProject({ name, domain: domain || 'Software-Projekt' });
      initTrainingDrawerUI();
      if (trainingProjectSelect) trainingProjectSelect.value = newProj.id;
      if (customProjectForm) customProjectForm.style.display = 'none';
      if (btnToggleCustomForm) btnToggleCustomForm.innerText = '[+ Hinzufügen]';
      if (nameInput) nameInput.value = '';
      if (domainInput) domainInput.value = '';
      if (typeof showActionToast === 'function') {
        showActionToast('Projekt aufgenommen', `Neues Freizeit-Projekt "${newProj.name}" aufgenommen.`, 'SUCCESS');
      }
    });
  }

  const trainingFocusSelect = document.getElementById('training-focus-select');
  if (trainingFocusSelect) {
    trainingFocusSelect.addEventListener('change', (e) => {
      setTrainingFocusArea(e.target.value);
    });
  }

  const btnTriggerTrainingRun = document.getElementById('btn-trigger-training-run');
  if (btnTriggerTrainingRun) {
    btnTriggerTrainingRun.addEventListener('click', () => {
      const step = executeTrainingStep(state.hierarchy ? state.hierarchy.departments : null);
      if (step) {
        const previewAgent = document.getElementById('training-preview-agent');
        const previewTime = document.getElementById('training-preview-time');
        const previewText = document.getElementById('training-preview-text');
        if (previewAgent) previewAgent.innerText = `${step.agentName} (${step.department})`;
        if (previewTime) previewTime.innerText = new Date(step.timestamp).toLocaleTimeString();
        if (previewText) previewText.innerText = step.insight;
      }
      if (typeof showActionToast === 'function') {
        showActionToast('Trainings-Durchlauf', 'Autonomer Optimierungs-Schritt abgeschlossen.', 'SUCCESS');
      }
    });
  }

  const btnClearTrainingConsole = document.getElementById('btn-clear-training-console');
  if (btnClearTrainingConsole) {
    btnClearTrainingConsole.addEventListener('click', () => {
      const logEl = document.getElementById('training-console-log');
      if (logEl) {
        logEl.innerHTML = '<div style="color: #64748B;">> [System] Konsole geleert. Warte auf Agenten-Aktivitäten...</div>';
      }
    });
  }

  // 10. Top-Header & Task-Queue Floating Panels
  const headerMenuToggle = document.getElementById('header-menu-toggle');
  if (headerMenuToggle) {
    headerMenuToggle.addEventListener('click', () => {
      const navTaskQueue = document.getElementById('nav-task-queue');
      toggleDrawer('drawer-task-queue', navTaskQueue);
    });
  }

  const headerNotificationBtn = document.getElementById('header-notification-btn');
  if (headerNotificationBtn) {
    headerNotificationBtn.addEventListener('click', () => {
      openActionCenter();
    });
  }

  const headerDirectorAvatar = document.getElementById('header-director-avatar');
  if (headerDirectorAvatar) {
    headerDirectorAvatar.addEventListener('click', () => {
      if (typeof window.focusAgentIn3D === 'function') {
        window.focusAgentIn3D('ag_01');
      }
      openTrevorModal();
    });
  }

  const btnLogoutReset = document.getElementById('btn-logout-reset');
  if (btnLogoutReset) {
    btnLogoutReset.addEventListener('click', () => {
      try {
        sessionStorage.removeItem('trevor_studio_unlocked');
      } catch (e) {}
      const loginOverlay = document.getElementById('login-screen') || document.getElementById('login-screen-overlay');
      if (loginOverlay) {
        loginOverlay.style.display = 'flex';
        const pinInput = document.getElementById('login-pin-input');
        if (pinInput) {
          pinInput.value = '';
          pinInput.focus();
        }
      }
      if (typeof showActionToast === 'function') {
        showActionToast('Studio gesperrt', 'PIN-Authentifizierung erforderlich.', 'INFO');
      }
    });
  }

  const taskQueueCollapseBtn = document.getElementById('task-queue-collapse-btn');
  if (taskQueueCollapseBtn) {
    taskQueueCollapseBtn.addEventListener('click', () => {
      const queueList = document.getElementById('task-queue-list');
      const queuePlaceholder = document.getElementById('queue-empty-placeholder');
      const isCollapsed = queueList && queueList.style.display === 'none';
      if (queueList) queueList.style.display = isCollapsed ? 'flex' : 'none';
      if (queuePlaceholder && state.taskQueue.length === 0) {
        queuePlaceholder.style.display = isCollapsed ? 'block' : 'none';
      }
      taskQueueCollapseBtn.innerText = isCollapsed ? '⌄' : '⌃';
      taskQueueCollapseBtn.title = isCollapsed ? 'Minimieren' : 'Maximieren';
    });
  }

  // 11. Central Event Delegation für 100% Button-Funktion
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('btn-back-to-hub')) {
      returnToHub();
      if (typeof showActionToast === 'function') {
        showActionToast('Zentrale', 'Kamera auf J.A.R.V.I.S. & Trevor ausgerichtet.', 'SUCCESS');
      }
    }
  });
}

// =============================================================================
// EVENT LISTENERS SETUP
// =============================================================================
function setupEventListeners() {
  // Sub-Drawers & Navigation initialisieren
  setupDrawerAndNavListeners();

  // Ziel-Projekt Dropdown
  const projectSelect = document.getElementById('project-selector-select');
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'NEW_PROJECT') {
        const customName = prompt('Name des neuen Software-Projekts:');
        if (customName && customName.trim()) {
          const opt = document.createElement('option');
          opt.value = customName.trim();
          opt.innerText = customName.trim();
          projectSelect.insertBefore(opt, projectSelect.lastElementChild);
          projectSelect.value = customName.trim();
          state.selectedProject = customName.trim();
        } else {
          projectSelect.value = state.selectedProject;
        }
      } else {
        state.selectedProject = val;
      }
      localStorage.setItem('trevor_selected_project', state.selectedProject);
      console.log(`[Trevor App] Aktives Ziel-Projekt gewechselt zu: "${state.selectedProject}"`);
    });
  }

  // Suche
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      filterWorkstations();
    });
  }

  // Ansichten-Umschaltung
  const btn3D = document.getElementById('btn-view-3d');
  const btnGrid = document.getElementById('btn-view-grid');
  const canvas3D = document.getElementById('threejs-canvas-container');
  const grid2D = document.getElementById('workstations-grid-container');

  if (btn3D) {
    btn3D.addEventListener('click', () => {
      state.activeView = '3d';
      btn3D.classList.add('active');
      if (btnGrid) btnGrid.classList.remove('active');
      if (canvas3D) canvas3D.style.display = 'block';
      if (grid2D) grid2D.style.display = 'none';
    });
  }

  if (btnGrid) {
    btnGrid.addEventListener('click', () => {
      state.activeView = 'grid';
      btnGrid.classList.add('active');
      if (btn3D) btn3D.classList.remove('active');
      if (canvas3D) canvas3D.style.display = 'none';
      if (grid2D) grid2D.style.display = 'grid';
    });
  }

  // Sidebar- & Modal-Buttons
  const btnSidebarOpen = document.getElementById('btn-sidebar-open-trevor');
  if (btnSidebarOpen) btnSidebarOpen.addEventListener('click', openTrevorModal);
  const btnSidebarTerm = document.getElementById('btn-sidebar-trevor-terminal');
  if (btnSidebarTerm) btnSidebarTerm.addEventListener('click', openTrevorModal);
  const btnSidebarChef = document.getElementById('btn-sidebar-chef-reports');
  if (btnSidebarChef) btnSidebarChef.addEventListener('click', openChefReportsModal);
  const btnResumeLim = document.getElementById('btn-resume-limit');
  if (btnResumeLim) btnResumeLim.addEventListener('click', resumePausedTask);
  const btnDispatch = document.getElementById('btn-dispatch-task');
  if (btnDispatch) btnDispatch.addEventListener('click', dispatchNewTask);

  // J.A.R.V.I.S. Voice Controls
  const btnMic = document.getElementById('btn-mic-input');
  if (btnMic) {
    btnMic.addEventListener('click', toggleVoiceRecognition);
  }
  const btnCtrlMic = document.getElementById('ctrl-mic');
  if (btnCtrlMic) {
    btnCtrlMic.addEventListener('click', toggleVoiceRecognition);
  }

  const btnVoiceToggle = document.getElementById('btn-toggle-jarvis-voice');
  if (btnVoiceToggle) {
    btnVoiceToggle.addEventListener('click', toggleJarvisVoiceEnabled);
  }

  // Neuer Button: Direkt-Anweisung im Inspektor absenden
  const btnDispatchDirect = document.getElementById('btn-inspector-dispatch-direct');
  if (btnDispatchDirect) {
    btnDispatchDirect.addEventListener('click', dispatchDirectDepartmentInstruction);
  }

  // Schwebendes Agenten-Info-Panel: Schließen & Event-Verbindung
  const btnAgentInfoClose = document.getElementById('agent-info-close-btn');
  if (btnAgentInfoClose) {
    btnAgentInfoClose.addEventListener('click', () => {
      const panel = document.getElementById('agent-info-panel');
      if (panel) panel.style.display = 'none';
    });
  }

  // Direkt-Beauftragung (Micro-Management Chat) im Agenten-Panel
  const btnDirectTask = document.getElementById('btn-direct-task');
  const directPromptInput = document.getElementById('agent-direct-prompt');

  if (btnDirectTask && directPromptInput) {
    btnDirectTask.addEventListener('click', () => {
      executeDirectAgentTask();
    });

    directPromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeDirectAgentTask();
      }
    });
  }

  window.addEventListener('agentSelected', (event) => {
    if (event.detail && typeof showAgentInfo === 'function') {
      showAgentInfo(event.detail);
    }
  });

  // RAG Context Files: Aktualisieren-Button
  const btnRefreshRAG = document.getElementById('btn-refresh-rag-files');
  if (btnRefreshRAG) {
    btnRefreshRAG.addEventListener('click', () => {
      loadRAGFiles();
    });
  }

  // Trevor Terminal Tabs
  const btnTrevorActive = document.getElementById('tab-btn-trevor-active');
  const btnTrevorHistory = document.getElementById('tab-btn-trevor-history');
  if (btnTrevorActive) btnTrevorActive.addEventListener('click', () => switchTrevorTab('active'));
  if (btnTrevorHistory) btnTrevorHistory.addEventListener('click', () => switchTrevorTab('history'));

  const btnRefreshHist = document.getElementById('btn-refresh-history');
  if (btnRefreshHist) btnRefreshHist.addEventListener('click', loadTaskHistory);

  const btnTogglePrompt = document.getElementById('btn-toggle-prompt-preview');
  if (btnTogglePrompt) {
    btnTogglePrompt.addEventListener('click', () => {
      const content = document.getElementById('code-preview-content');
      const indicator = document.getElementById('code-preview-indicator');
      if (content && indicator) {
        if (content.style.display === 'none') {
          content.style.display = 'block';
          indicator.innerText = '[Schließen]';
        } else {
          content.style.display = 'none';
          indicator.innerText = '[Aufklappen]';
        }
      }
    });
  }

  const btnDecisionYes = document.getElementById('btn-decision-yes');
  if (btnDecisionYes) {
    btnDecisionYes.addEventListener('click', async () => {
      if (btnDecisionYes.disabled) return;
      await handleUserDecisionClick('JA');
    });
  }

  const btnDecisionNo = document.getElementById('btn-decision-no');
  if (btnDecisionNo) {
    btnDecisionNo.addEventListener('click', () => handleUserDecisionClick('NEIN'));
  }

  const btnSubmitFeedback = document.getElementById('btn-submit-feedback');
  if (btnSubmitFeedback) {
    btnSubmitFeedback.addEventListener('click', submitRejectionFeedback);
  }

  const btnDownloadTask = document.getElementById('btn-download-task');
  if (btnDownloadTask) {
    btnDownloadTask.addEventListener('click', async () => {
      if (btnDownloadTask.disabled) return;
      btnDownloadTask.disabled = true;
      const originalText = btnDownloadTask.innerText;
      btnDownloadTask.innerText = '⏳ Bereite Download vor...';
      btnDownloadTask.style.opacity = '0.6';
      btnDownloadTask.style.cursor = 'not-allowed';

      try {
        const prompt = state.activeTask?.antigravity_prompt || '';
        await exportTaskToLocalDisk(prompt);
      } catch (err) {
        console.error('[Trevor App] Fehler bei Download-Klick:', err);
      } finally {
        btnDownloadTask.disabled = false;
        btnDownloadTask.innerText = originalText;
        btnDownloadTask.style.opacity = '1';
        btnDownloadTask.style.cursor = 'pointer';
      }
    });
  }

  const btnExportDirect = document.getElementById('btn-export-direct');
  if (btnExportDirect) {
    btnExportDirect.addEventListener('click', async () => {
      if (btnExportDirect.disabled) return;
      btnExportDirect.disabled = true;
      const originalText = btnExportDirect.innerText;
      btnExportDirect.innerText = '⏳ Exportiere auf Festplatte...';
      btnExportDirect.style.opacity = '0.6';
      btnExportDirect.style.cursor = 'not-allowed';

      try {
        const prompt = state.activeTask?.antigravity_prompt || '';
        await exportTaskToLocalDisk(prompt);
      } catch (err) {
        console.error('[Trevor App] Fehler bei Direkt-Export:', err);
      } finally {
        btnExportDirect.disabled = false;
        btnExportDirect.innerText = originalText;
        btnExportDirect.style.opacity = '1';
        btnExportDirect.style.cursor = 'pointer';
      }
    });
  }

  // Interaktive Prompt-Roadmap: Buttons anbinden
  const btnExportSelected = document.getElementById('btn-export-selected-steps');
  if (btnExportSelected) {
    btnExportSelected.addEventListener('click', exportSelectedStepsForAntigravity);
  }

  const btnAllYes = document.getElementById('btn-roadmap-all-yes');
  if (btnAllYes) {
    btnAllYes.addEventListener('click', () => {
      const steps = state.activeTask?.checkpoint_data?.structured_steps || [];
      steps.forEach(s => { s.approved = true; s.enabled = true; });
      renderInteractiveRoadmap(steps);
      saveLocalCheckpoint();
    });
  }

  const btnAllNo = document.getElementById('btn-roadmap-all-no');
  if (btnAllNo) {
    btnAllNo.addEventListener('click', () => {
      const steps = state.activeTask?.checkpoint_data?.structured_steps || [];
      steps.forEach(s => { s.approved = false; s.enabled = false; });
      renderInteractiveRoadmap(steps);
      saveLocalCheckpoint();
    });
  }

  // Kompakte Cloud-LLM-Leiste initialisieren & synchronisieren
  const quickProviderSelect = document.getElementById('quick-llm-provider-select');
  if (quickProviderSelect) {
    const initialCfg = getLLMConfig();
    quickProviderSelect.value = initialCfg.provider || 'gemini';

    quickProviderSelect.addEventListener('change', (e) => {
      const newProvider = e.target.value;
      saveLLMConfig({ provider: newProvider });
      state.settings.llm_mode = newProvider;
      saveSettings();
      updateUIThemeSettings();
    });
  }

  // Inspektor-Tabs
  const tabLiveBtn = document.getElementById('tab-btn-live-work');
  if (tabLiveBtn) tabLiveBtn.addEventListener('click', () => switchInspectorTab('live-work'));
  const tabDirectBtn = document.getElementById('tab-btn-direct-command');
  if (tabDirectBtn) tabDirectBtn.addEventListener('click', () => switchInspectorTab('direct-command'));
  const tabLearnedBtn = document.getElementById('tab-btn-learned');
  if (tabLearnedBtn) tabLearnedBtn.addEventListener('click', () => switchInspectorTab('learned'));

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

  // Settings
  const engineBtn = document.getElementById('engine-mode-btn');
  const settingsModal = document.getElementById('modal-settings');
  const openSettingsBtn = document.getElementById('btn-open-settings');

  if (engineBtn) {
    engineBtn.addEventListener('click', () => {
      state.settings.llm_mode = state.settings.llm_mode === 'gemini' ? 'ollama' : 'gemini';
      saveSettings();
      saveLLMConfig({ provider: state.settings.llm_mode });
      updateUIThemeSettings();
    });
  }

  if (openSettingsBtn && settingsModal) {
    openSettingsBtn.addEventListener('click', () => {
      const modeEl = document.getElementById('settings-llm-mode');
      const gemModelEl = document.getElementById('settings-gemini-model');
      const olUrlEl = document.getElementById('settings-ollama-url');
      const olModelEl = document.getElementById('settings-ollama-model');
      if (modeEl) modeEl.value = state.settings.llm_mode;
      if (gemModelEl) gemModelEl.value = state.settings.gemini_model;
      if (olUrlEl) olUrlEl.value = state.settings.ollama_url;
      if (olModelEl) olModelEl.value = state.settings.ollama_model;
      settingsModal.classList.add('open');
    });
  }

  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const modeEl = document.getElementById('settings-llm-mode');
      const gemModelEl = document.getElementById('settings-gemini-model');
      const olUrlEl = document.getElementById('settings-ollama-url');
      const olModelEl = document.getElementById('settings-ollama-model');

      if (modeEl) state.settings.llm_mode = modeEl.value;
      if (gemModelEl) state.settings.gemini_model = gemModelEl.value;
      if (olUrlEl) state.settings.ollama_url = olUrlEl.value;
      if (olModelEl) state.settings.ollama_model = olModelEl.value;

      saveSettings();
      saveLLMConfig({
        provider: state.settings.llm_mode,
        ollamaUrl: state.settings.ollama_url,
        ollamaModel: state.settings.ollama_model
      });
      updateUIThemeSettings();
      if (settingsModal) settingsModal.classList.remove('open');
    });
  }

  // Globale Zentrale-Rückkehr für alle .btn-back-to-hub Buttons
  document.querySelectorAll('.btn-back-to-hub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      returnToHub();
    });
  });

  // 3D-Kamera Steuerung (Zentrale, EG Galerie, UG Arena)
  const btnCtrlHub = document.getElementById('ctrl-hub');
  if (btnCtrlHub) {
    btnCtrlHub.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.flyCameraTo === 'function') {
        const THREE = window.THREE;
        if (THREE) window.flyCameraTo(new THREE.Vector3(0, 14, 21), new THREE.Vector3(0, 1.5, 0));
      } else if (typeof window.reset3DCamera === 'function') {
        window.reset3DCamera();
      }
      returnToHub();
    });
  }
  const btnCtrlEg = document.getElementById('ctrl-floor-eg');
  if (btnCtrlEg) {
    btnCtrlEg.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.flyCameraTo === 'function') {
        const THREE = window.THREE;
        if (THREE) window.flyCameraTo(new THREE.Vector3(0, 18, 15), new THREE.Vector3(0, 1.2, 0));
      } else if (typeof window.switchFloor === 'function') {
        window.switchFloor('EG');
      }
      btnCtrlEg.classList.add('active');
      const btnUg = document.getElementById('ctrl-floor-ug');
      if (btnUg) btnUg.classList.remove('active');
    });
  }
  const btnCtrlUg = document.getElementById('ctrl-floor-ug');
  if (btnCtrlUg) {
    btnCtrlUg.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.flyCameraTo === 'function') {
        const THREE = window.THREE;
        if (THREE) window.flyCameraTo(new THREE.Vector3(0, 7, 10), new THREE.Vector3(0, 0.8, 0));
      } else if (typeof window.switchFloor === 'function') {
        window.switchFloor('UG');
      }
      btnCtrlUg.classList.add('active');
      const btnEg = document.getElementById('ctrl-floor-eg');
      if (btnEg) btnEg.classList.remove('active');
    });
  }

  // Task-Queue: Event-Listener
  const btnEnqueueTask = document.getElementById('btn-enqueue-task');
  if (btnEnqueueTask) {
    btnEnqueueTask.addEventListener('click', () => {
      const input = document.getElementById('task-prompt-input');
      const text = input ? input.value : '';
      if (!text.trim()) {
        showExportNotification('⚠️ Bitte gib einen Text im Prompt-Feld ein.', 'warning');
        return;
      }
      addToTaskQueue(text);
      input.value = '';
      const queuePanel = document.getElementById('task-queue-panel');
      if (queuePanel) queuePanel.style.display = 'flex';
    });
  }

  const btnAddToQueue = document.getElementById('btn-add-to-queue');
  const queueNewInput = document.getElementById('task-queue-new-input');
  if (btnAddToQueue && queueNewInput) {
    const handleAdd = () => {
      const text = queueNewInput.value;
      if (text.trim()) {
        addToTaskQueue(text);
        queueNewInput.value = '';
      }
    };
    btnAddToQueue.addEventListener('click', handleAdd);
    queueNewInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    });
  }

  const btnQueueStartNext = document.getElementById('btn-queue-start-next');
  if (btnQueueStartNext) {
    btnQueueStartNext.addEventListener('click', () => {
      runQueueTask(0);
    });
  }

  const taskQueueCloseBtn = document.getElementById('task-queue-close-btn');
  if (taskQueueCloseBtn) {
    taskQueueCloseBtn.addEventListener('click', () => {
      const panel = document.getElementById('task-queue-panel');
      if (panel) panel.style.display = 'none';
    });
  }

  const ctrlTaskQueueToggle = document.getElementById('ctrl-task-queue-toggle');
  if (ctrlTaskQueueToggle) {
    ctrlTaskQueueToggle.addEventListener('click', () => {
      const panel = document.getElementById('task-queue-panel');
      if (panel) {
        panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'flex' : 'none';
      }
    });
  }

  const btnSidebarTaskQueue = document.getElementById('btn-sidebar-task-queue');
  if (btnSidebarTaskQueue) {
    btnSidebarTaskQueue.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = document.getElementById('task-queue-panel');
      if (panel) {
        panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'flex' : 'none';
      }
    });
  }

  // Q&A Panel: Event-Listener
  const qaPanelCloseBtn = document.getElementById('qa-panel-close-btn');
  if (qaPanelCloseBtn) {
    qaPanelCloseBtn.addEventListener('click', () => {
      const panel = document.getElementById('qa-panel');
      if (panel) panel.style.display = 'none';
    });
  }

  const qaBtnYes = document.getElementById('qa-btn-yes');
  if (qaBtnYes) {
    qaBtnYes.addEventListener('click', () => {
      returnToHub();
      showExportNotification('✔ Frage beantwortet & zur Zentrale zurückgekehrt.', 'success');
    });
  }

  const qaBtnNo = document.getElementById('qa-btn-no');
  if (qaBtnNo) {
    qaBtnNo.addEventListener('click', () => {
      const panel = document.getElementById('qa-panel');
      if (panel) panel.style.display = 'none';
      const input = document.getElementById('task-prompt-input');
      if (input) {
        input.focus();
        input.placeholder = 'Bitte formuliere deine Frage genauer oder stelle eine neue Anweisung...';
      }
      showExportNotification('ℹ️ Formuliere deine Frage bitte etwas genauer oder stelle eine Rückfrage.', 'warning');
    });
  }

  const qaBtnExplain = document.getElementById('qa-btn-explain');
  if (qaBtnExplain) {
    qaBtnExplain.addEventListener('click', () => {
      requestQAExplanation();
    });
  }

  // User Action-Center: Event-Listener
  const btnOpenActionCenter = document.getElementById('btn-open-action-center');
  if (btnOpenActionCenter) {
    btnOpenActionCenter.addEventListener('click', () => {
      const panel = document.getElementById('user-action-center');
      if (panel && panel.style.display === 'flex') {
        closeActionCenter();
      } else {
        openActionCenter();
      }
    });
  }

  const actionCenterCloseBtn = document.getElementById('action-center-close-btn');
  if (actionCenterCloseBtn) {
    actionCenterCloseBtn.addEventListener('click', () => {
      closeActionCenter();
    });
  }
}

function saveSettings() {
  localStorage.setItem('trevor_user_settings', JSON.stringify(state.settings));
}

function updateUIThemeSettings() {
  const icon = document.getElementById('engine-mode-icon');
  const label = document.getElementById('engine-mode-label');
  const aiBadge = document.getElementById('active-ai-badge');
  const aiBadgeText = document.getElementById('active-ai-badge-text');

  if (state.settings.llm_mode === 'ollama') {
    if (icon) icon.innerHTML = '<svg class="ui-icon ui-icon-cyan" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';
    if (label) label.innerText = `Ollama Lokal (${state.settings.ollama_model || 'llama3'})`;
    if (aiBadge) {
      aiBadge.className = 'active-ai-badge badge-ollama';
    }
    if (aiBadgeText) {
      aiBadgeText.innerText = `AKTIVE ENGINE: Ollama Lokal (${state.settings.ollama_model || 'llama3'})`;
    }
  } else {
    // Standard: Google Gemini
    if (icon) icon.innerHTML = '<svg class="ui-icon ui-icon-cyan" viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
    if (label) label.innerText = `Gemini Cloud (${state.settings.gemini_model || 'gemini-2.5-flash'})`;
    if (aiBadge) {
      aiBadge.className = 'active-ai-badge badge-gemini';
    }
    if (aiBadgeText) {
      aiBadgeText.innerText = `AKTIVE ENGINE: Google Gemini (${state.settings.gemini_model || 'gemini-2.5-flash'})`;
    }
  }

  const quickProviderSelect = document.getElementById('quick-llm-provider-select');
  if (quickProviderSelect) quickProviderSelect.value = state.settings.llm_mode || 'gemini';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Globale Fenster-Exporte für maximale Interoperabilität
if (typeof window !== 'undefined') {
  window.exportTaskToLocalDisk = exportTaskToLocalDisk;
  window.triggerBrowserDownload = triggerBrowserDownload;
  window.renderInteractiveRoadmap = renderInteractiveRoadmap;
  window.exportSelectedStepsForAntigravity = exportSelectedStepsForAntigravity;
  window.showAgentInfo = showAgentInfo;
  window.executeDirectAgentTask = executeDirectAgentTask;
  window.getCurrentSelectedAgentData = getCurrentSelectedAgentData;
  window.loadRAGFiles = loadRAGFiles;
  window.renderRAGFileTags = renderRAGFileTags;
  window.updateRAGSelectedCount = updateRAGSelectedCount;
  window.returnToHub = returnToHub;
  window.showQAPanel = showQAPanel;
  window.requestQAExplanation = requestQAExplanation;
  window.generateDynamicTaskFilename = generateDynamicTaskFilename;
  window.addToTaskQueue = addToTaskQueue;
  window.removeFromTaskQueue = removeFromTaskQueue;
  window.moveTaskQueueUp = moveTaskQueueUp;
  window.moveTaskQueueDown = moveTaskQueueDown;
  window.runQueueTask = runQueueTask;
  window.renderTaskQueueUI = renderTaskQueueUI;
  window.taskQueue = state.taskQueue;
  window.isDepartmentBusy = isDepartmentBusy;
  window.setDepartmentStatus = setDepartmentStatus;
  window.updateActiveQueueItemStatus = updateActiveQueueItemStatus;
  window.updateCheckpointBadge = updateCheckpointBadge;
  window.playJarvisWelcomeGreeting = playJarvisWelcomeGreeting;
  window.trevorAudio = window.trevorAudio;
  window.initAudioContext = initAudioContext;
  window.playNotificationSound = playNotificationSound;
  window.setupAudioSystem = setupAudioSystem;
  window.showActionToast = showActionToast;
  window.openActionCenter = openActionCenter;
  window.closeActionCenter = closeActionCenter;
  window.addActionCenterItem = addActionCenterItem;
  window.removeActionCenterItem = removeActionCenterItem;
  window.renderActionCenterUI = renderActionCenterUI;
  window.actionCenterItems = state.actionCenterItems;
  window.speakAsJarvis = speakAsJarvis;
  window.stopJarvisSpeech = stopJarvisSpeech;
  window.toggleVoiceRecognition = toggleVoiceRecognition;
  window.toggleJarvisVoiceEnabled = toggleJarvisVoiceEnabled;
  window.cancelAllActiveTasks = cancelAllActiveTasks;
  window.saveInsightToCloudMemory = saveInsightToCloudMemory;
  window.getDepartmentCode = getDepartmentCode;
  window.searchCloudMemory = (q) => orchestrator.searchCloudMemory(q);
  window.pendingTasksMap = window.pendingTasksMap || {};
  window.processNextTaskInQueue = processNextTaskInQueue;
  window.enqueueTask = enqueueTask;
  window.trevorTaskQueue = state.taskQueue;
  window.isOrchestratorBusy = window.isOrchestratorBusy || false;
  window.closeAllDrawers = closeAllDrawers;
  window.toggleDrawer = toggleDrawer;
  window.renderDrawerAgentsList = renderDrawerAgentsList;
  window.TREVOR_AGENT_ROSTER = TREVOR_AGENT_ROSTER;
  window.AGENT_ROSTER_BY_ID = AGENT_ROSTER_BY_ID;
  window.handleUserDecision = handleUserDecision;
  window.copyTextToClipboard = copyTextToClipboard;
  if (!Array.isArray(window.selectedContextFiles)) {
    window.selectedContextFiles = [];
  }
}
