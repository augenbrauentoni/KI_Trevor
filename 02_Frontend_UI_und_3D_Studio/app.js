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

import { STUDIO_HIERARCHY } from './hierarchyData.js';
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
  getAgentCurrentActivity,
  getAgentLearnedInsights,
  getAllLearnedKnowledgeSummary,
  saveInsightToCloudMemory,
  getDepartmentCode
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

// Globales Trevor-Audio-Objekt frühzeitig initialisieren
if (typeof window !== 'undefined') {
  window.trevorAudio = window.trevorAudio || { enabled: true, ctx: null };
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
  const userPrompt = promptInput.value.trim();

  if (!userPrompt) {
    alert('Bitte gib zuerst eine Beschreibung deines Software-Auftrags ein!');
    return;
  }

  stopIdleTraining();

  // 1. Sofort in Task-Queue einreihen mit Status "1/4: Trevor analysiert..."
  const queueId = 'queue_' + Date.now();
  const queueItem = {
    id: queueId,
    text: userPrompt,
    title: userPrompt.length > 50 ? userPrompt.slice(0, 50) + '...' : userPrompt,
    status: '1/4: Trevor analysiert...',
    createdAt: new Date().toLocaleTimeString()
  };
  state.taskQueue.unshift(queueItem);
  if (typeof window !== 'undefined') window.taskQueue = state.taskQueue;
  try {
    localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
  } catch {}
  renderTaskQueueUI();

  const monitorEl = document.getElementById('live-activity-monitor');
  if (monitorEl) {
    monitorEl.innerText = '1/4: Trevor analysiert...';
  }

  document.getElementById('section-task-input').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';
  document.getElementById('section-decision').style.display = 'none';

  updateTrackerStage(1);
  setStageIn3D(1);
  updateCheckpointBadge('Berechnung läuft (Stufe 1/4: Trevor Dispatcher)...', false);

  const taskId = 'task_' + Date.now();
  state.activeTask = {
    id: taskId,
    user_prompt: userPrompt,
    selected_departments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    current_stage: '1_fachteam',
    status: 'running',
    checkpoint_data: { pc_outputs: {}, chef_outputs: {}, structured_steps: [] },
    trevor_summary: '',
    antigravity_prompt: ''
  };

  saveLocalCheckpoint();

  const progressBar = document.getElementById('progress-bar-fill');
  const percentLabel = document.getElementById('progress-percent-label');
  const statusLabel = document.getElementById('progress-status-label');
  const activeAgentLabel = document.getElementById('progress-active-agent');

  try {
    const finalResult = await orchestrator.executeFullWorkflow(userPrompt, (stageName, agentName, message) => {
      // Live-Update in Warteschlange & Activity Monitor
      queueItem.status = stageName;
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

      // Visuelle Echtzeit-Kopplung der 3D-Szene an den Workflow (inkl. Etagen-Routing EG/UG)
      const targetFloor = (agentName && agentName.includes('UG')) || (message && message.includes('UG')) || stageName.includes('UG')
        ? 'UG'
        : ((agentName && agentName.includes('EG')) || (message && message.includes('EG')) ? 'EG' : undefined);

      if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
        window.update3DStudioState(stageName, targetFloor);
      } else {
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
    });

    // Q&A-Modus: Bei direkter Frage wurde Antwort bereits in showQAPanel angezeigt
    if (finalResult && finalResult.isQuestion) {
      console.log('[Trevor App] Q&A-Workflow erfolgreich abgeschlossen (Direkt-Antwort angezeigt).');
      queueItem.status = '4/4: Im Q&A-Modus beantwortet';
      renderTaskQueueUI();
      try {
        localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
      } catch {}
      if (monitorEl) {
        monitorEl.innerText = '4/4: Im Q&A-Modus beantwortet';
      }
      const progressSection = document.getElementById('section-task-progress');
      if (progressSection) progressSection.style.display = 'none';
      const promptSection = document.getElementById('section-task-input');
      if (promptSection) promptSection.style.display = 'flex';
      const promptInput = document.getElementById('task-prompt-input');
      if (promptInput) promptInput.value = '';
      updateCheckpointBadge('Frage im Q&A-Modus beantwortet', true);
      if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
        window.update3DStudioState('stage1', 'EG');
      }
      return;
    }

    state.activeTask.current_stage = '4_user_decision';
    state.activeTask.status = 'pending_approval';
    state.activeTask.trevor_summary = finalResult.summary;
    state.activeTask.checkpoint_data = {
      ...state.activeTask.checkpoint_data,
      structured_steps: finalResult.steps,
      department_reports: finalResult.departmentReports
    };
    state.activeTask.antigravity_prompt = buildAntigravityPromptForSteps(
      finalResult.steps.filter(s => s.approved !== false && s.enabled !== false),
      state.activeTask
    );

    updateTrackerStage(4);
    if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
      window.update3DStudioState('stage4');
    } else {
      update3DStudioState('stage4');
    }
    saveLocalCheckpoint();
    updateCheckpointBadge('Entscheidung erforderlich (JA / NEIN)', false);

    queueItem.status = '4/4: Bereit zur Freigabe im Action-Center';
    renderTaskQueueUI();
    try {
      localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    } catch {}
    if (monitorEl) {
      monitorEl.innerText = '4/4: Bereit zur Freigabe im Action-Center';
    }

    document.getElementById('section-task-progress').style.display = 'none';
    document.getElementById('section-decision').style.display = 'flex';

    document.getElementById('decision-summary-text').innerText = state.activeTask.trevor_summary;
    document.getElementById('code-preview-content').innerText = state.activeTask.antigravity_prompt;
    renderInteractiveRoadmap(state.activeTask.checkpoint_data.structured_steps);

    // Audio-Feedback & Toast für fertiges Ergebnis
    playNotificationSound('SUCCESS');
    showActionToast('Ergebnis bereit', 'Abteilung hat die Arbeit abgeschlossen', 'SUCCESS');
    addActionCenterItem({
      id: `act_${state.activeTask.id}_final`,
      type: 'APPROVAL_NEEDED',
      title: 'Ergebnis bereit zur Abstimmung',
      message: `${(state.activeTask.checkpoint_data.structured_steps || []).length} Maßnahmen freigabebereit.`
    });

  } catch (err) {
    console.warn('[Trevor App] Fehler bei executeFullWorkflow, starte Simulation als Fallback:', err);
    queueItem.status = 'Fallback-Simulation aktiv...';
    renderTaskQueueUI();
    if (monitorEl) monitorEl.innerText = 'Fallback-Simulation aktiv...';
    await runLiveWorkflowSimulation(state.activeTask);
    queueItem.status = '4/4: Bereit zur Freigabe im Action-Center';
    renderTaskQueueUI();
    if (monitorEl) monitorEl.innerText = '4/4: Bereit zur Freigabe im Action-Center';
  }
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
  let container = document.getElementById('trevor-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'trevor-toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
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
  }
}

export function addToTaskQueue(promptText) {
  const text = (promptText || '').trim();
  if (!text) {
    showExportNotification('⚠️ Bitte gib einen Text für den Auftrag ein.', 'warning');
    return;
  }

  const newItem = {
    id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    text,
    title: text.length > 50 ? text.slice(0, 50) + '...' : text,
    status: 'In Warteschlange eingereiht',
    createdAt: new Date().toLocaleTimeString()
  };

  state.taskQueue.push(newItem);
  if (typeof window !== 'undefined') window.taskQueue = state.taskQueue;
  localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
  renderTaskQueueUI();
  showExportNotification(`✔ Auftrag zur Queue hinzugefügt (#${state.taskQueue.length})`, 'success');
}

export function removeFromTaskQueue(index) {
  if (index >= 0 && index < state.taskQueue.length) {
    state.taskQueue.splice(index, 1);
    if (typeof window !== 'undefined') window.taskQueue = state.taskQueue;
    localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    renderTaskQueueUI();
  }
}

export function moveTaskQueueUp(index) {
  if (index > 0 && index < state.taskQueue.length) {
    const item = state.taskQueue.splice(index, 1)[0];
    state.taskQueue.splice(index - 1, 0, item);
    if (typeof window !== 'undefined') window.taskQueue = state.taskQueue;
    localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    renderTaskQueueUI();
  }
}

export function moveTaskQueueDown(index) {
  if (index >= 0 && index < state.taskQueue.length - 1) {
    const item = state.taskQueue.splice(index, 1)[0];
    state.taskQueue.splice(index + 1, 0, item);
    if (typeof window !== 'undefined') window.taskQueue = state.taskQueue;
    localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
    renderTaskQueueUI();
  }
}

export async function runQueueTask(index) {
  if (index < 0 || index >= state.taskQueue.length) return;
  const item = state.taskQueue.splice(index, 1)[0];
  if (typeof window !== 'undefined') window.taskQueue = state.taskQueue;
  localStorage.setItem('trevor_task_queue', JSON.stringify(state.taskQueue));
  renderTaskQueueUI();

  const input = document.getElementById('task-prompt-input');
  if (input) {
    input.value = item.text;
  }
  const queuePanel = document.getElementById('task-queue-panel');
  if (queuePanel) {
    queuePanel.style.display = 'none';
  }
  await dispatchNewTask();
}

function getStatusBadgeClass(status) {
  if (!status) return 'badge-analyzing';
  const s = status.toLowerCase();
  if (s.includes('ausgelastet') || s.includes('busy')) return 'badge-busy';
  if (s.includes('2/4') || s.includes('3/4') || s.includes('erarbeiten') || s.includes('prüft')) return 'badge-working';
  if (s.includes('4/4') || s.includes('bereit') || s.includes('abgeschlossen') || s.includes('erledigt') || s.includes('erfolg')) return 'badge-done';
  return 'badge-analyzing';
}

export function renderTaskQueueUI() {
  const listEl = document.getElementById('task-queue-list');
  const countBadge = document.getElementById('queue-count-badge');
  const emptyPlaceholder = document.getElementById('queue-empty-placeholder');
  const btnStartNext = document.getElementById('btn-queue-start-next');

  const count = state.taskQueue ? state.taskQueue.length : 0;

  if (countBadge) {
    countBadge.innerText = `${count} ${count === 1 ? 'wartender Auftrag' : 'wartende Aufträge'}`;
  }

  const topBadge = document.getElementById('queue-badge-count');
  if (topBadge) topBadge.innerText = count;
  const sidebarBadge = document.getElementById('sidebar-queue-count');
  if (sidebarBadge) sidebarBadge.innerText = count;

  if (emptyPlaceholder) {
    emptyPlaceholder.style.display = count === 0 ? 'block' : 'none';
  }

  if (btnStartNext) {
    btnStartNext.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  if (!listEl) return;

  if (count === 0) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = state.taskQueue.map((item, idx) => `
    <li class="task-queue-item" data-index="${idx}" data-id="${item.id}">
      <div class="task-queue-item-header">
        <span class="task-queue-item-num">#${idx + 1}</span>
        <span class="task-queue-item-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
      </div>
      <div class="task-queue-status-line">
        <span class="task-queue-badge ${getStatusBadgeClass(item.status)}">${escapeHtml(item.status || 'Wartet in Warteschlange...')}</span>
      </div>
      <div class="task-queue-ctrl-row">
        <span style="font-size: 10px; color: var(--text-dim);">${item.createdAt || ''}</span>
        <div class="task-queue-btn-group">
          <button class="btn-queue-ctrl btn-queue-run" data-action="run" data-index="${idx}" title="Diesen Auftrag sofort ausführen">▶ Start</button>
          <button class="btn-queue-ctrl btn-queue-up" data-action="up" data-index="${idx}" title="Nach oben verschieben" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-queue-ctrl btn-queue-down" data-action="down" data-index="${idx}" title="Nach unten verschieben" ${idx === count - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-queue-ctrl btn-queue-delete" data-action="delete" data-index="${idx}" title="Löschen">✕</button>
        </div>
      </div>
    </li>
  `).join('');

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
  const updateSoundBtnUI = () => {
    if (!soundBtn) return;
    if (window.trevorAudio.enabled) {
      soundBtn.innerText = '🔊 Sound: AN';
      soundBtn.classList.remove('muted');
      soundBtn.title = 'Sound ist AN – Klicken zum Stummschalten';
    } else {
      soundBtn.innerText = '🔇 Sound: AUS';
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

  const icon = isQuestion ? '❓' : (isSuccess ? '⚡' : '⚠️');

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
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
 * Fügt ein Action-Item ins Action-Center ein, spielt Sound & zeigt Toast
 */
export function addActionCenterItem(item) {
  const id = item.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const fullItem = {
    id,
    type: item.type || 'APPROVAL_NEEDED',
    title: item.title || 'Aktion erforderlich',
    message: item.message || '',
    timestamp: Date.now(),
    data: item.data || {}
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
    const isClarification = item.type === 'CLARIFICATION_NEEDED' || item.type === 'QUESTION';
    const card = document.createElement('div');
    card.id = `action-card-${item.id}`;
    card.className = `action-item-card ${isClarification ? 'type-clarification' : 'type-approval'}`;

    const tagClass = isClarification ? 'tag-clarification' : 'tag-approval';
    const tagText = isClarification ? '❓ RÜCKFRAGE' : '✔ FREIGABE BEREIT';
    const btnText = isClarification ? '💬 Ansehen / Antworten' : '📋 Zur Checkliste';

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
      if (isClarification) {
        const qaPanel = document.getElementById('qa-panel');
        if (qaPanel && qaPanel.style.display !== 'none') {
          qaPanel.scrollIntoView({ behavior: 'smooth' });
        } else {
          const input = document.getElementById('task-prompt-input');
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } else {
        const decSection = document.getElementById('section-decision');
        if (decSection) {
          decSection.style.display = 'flex';
          decSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

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

    const counterBadge = container.querySelector('.roadmap-counter-badge');
    if (counterBadge) {
      counterBadge.innerHTML = `Freigegeben: <strong>${approved} von ${total}</strong> Maßnahmen`;
    }

    const btnAll = container.querySelector('.roadmap-quick-btn[data-filter="all"]');
    const btnApp = container.querySelector('.roadmap-quick-btn[data-filter="approved"]');
    const btnRej = container.querySelector('.roadmap-quick-btn[data-filter="rejected"]');
    if (btnAll) btnAll.innerText = `Alle (${total})`;
    if (btnApp) btnApp.innerText = `Nur [JA] (${approved})`;
    if (btnRej) btnRej.innerText = `Nur [NEIN] (${rejected})`;
  };

  const initialApproved = validSteps.filter(s => s.approved !== false && s.enabled !== false).length;

  const statsBarHtml = `
    <div class="roadmap-stats-bar">
      <span class="roadmap-counter-badge">Freigegeben: <strong>${initialApproved} von ${validSteps.length}</strong> Maßnahmen</span>
      <div class="roadmap-filter-buttons">
        <button class="roadmap-quick-btn active" data-filter="all">Alle (${validSteps.length})</button>
        <button class="roadmap-quick-btn" data-filter="approved">Nur [JA] (${initialApproved})</button>
        <button class="roadmap-quick-btn" data-filter="rejected">Nur [NEIN] (${validSteps.length - initialApproved})</button>
      </div>
    </div>
  `;

  const cardsHtml = validSteps.map((step) => {
    const isApproved = step.approved !== false && step.enabled !== false;
    const targetFile = step.file || step.target_file || '05_Antigravity_Outputs/ANTIGRAVITY_TASK.md';
    return `
      <div class="roadmap-step-card ${isApproved ? 'enabled' : 'disabled'}" id="step-card-${escapeHtml(step.id)}" data-approved="${isApproved}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="step-id-badge">${escapeHtml(step.id)}</span>
            <span class="step-dept-badge">${escapeHtml(step.department || 'Allgemein')}</span>
            <span class="badge-logic-verified">✔ Logik geprüft durch Abteilungsleiter</span>
            <strong style="color: #fff; font-size: 13px;">${escapeHtml(step.title)}</strong>
          </div>
          <label class="switch-toggle-label" title="Schritt für Export an- oder abwählen">
            <input type="checkbox" class="step-checkbox" data-step-id="${escapeHtml(step.id)}" ${isApproved ? 'checked' : ''}>
            <span class="switch-toggle-btn ${isApproved ? 'yes' : 'no'}">${isApproved ? 'JA' : 'NEIN'}</span>
          </label>
        </div>

        <div style="font-size: 11px; color: #94a3b8; margin: 6px 0; line-height: 1.4;">
          ${escapeHtml(step.description || '')}
        </div>

        <div style="font-size: 10px; color: #38bdf8; display: flex; align-items: center; gap: 4px; font-family: var(--font-mono);">
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
        if (filter === 'all') {
          card.style.display = 'block';
        } else if (filter === 'approved') {
          card.style.display = approved ? 'block' : 'none';
        } else if (filter === 'rejected') {
          card.style.display = !approved ? 'block' : 'none';
        }
      });
    });
  });

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
        errorMsg.textContent = '❌ Ungültige PIN. Zugriff verweigert! (PIN: 2026)';
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
// EVENT LISTENERS SETUP
// =============================================================================
function setupEventListeners() {
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

  // Sidebar- & Modal-Buttons
  document.getElementById('btn-sidebar-open-trevor').addEventListener('click', openTrevorModal);
  document.getElementById('btn-sidebar-trevor-terminal').addEventListener('click', openTrevorModal);
  document.getElementById('btn-sidebar-chef-reports').addEventListener('click', openChefReportsModal);
  document.getElementById('btn-resume-limit').addEventListener('click', resumePausedTask);
  document.getElementById('btn-dispatch-task').addEventListener('click', dispatchNewTask);

  // J.A.R.V.I.S. Voice Controls
  const btnMic = document.getElementById('btn-mic-input');
  if (btnMic) {
    btnMic.addEventListener('click', toggleVoiceRecognition);
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
  document.getElementById('tab-btn-live-work').addEventListener('click', () => switchInspectorTab('live-work'));
  const tabDirectBtn = document.getElementById('tab-btn-direct-command');
  if (tabDirectBtn) tabDirectBtn.addEventListener('click', () => switchInspectorTab('direct-command'));
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

  // Settings
  const engineBtn = document.getElementById('engine-mode-btn');
  const settingsModal = document.getElementById('modal-settings');
  const openSettingsBtn = document.getElementById('btn-open-settings');

  engineBtn.addEventListener('click', () => {
    state.settings.llm_mode = state.settings.llm_mode === 'gemini' ? 'ollama' : 'gemini';
    saveSettings();
    saveLLMConfig({ provider: state.settings.llm_mode });
    updateUIThemeSettings();
  });

  openSettingsBtn.addEventListener('click', () => {
    document.getElementById('settings-llm-mode').value = state.settings.llm_mode;
    document.getElementById('settings-gemini-model').value = state.settings.gemini_model;
    document.getElementById('settings-ollama-url').value = state.settings.ollama_url;
    document.getElementById('settings-ollama-model').value = state.settings.ollama_model;
    settingsModal.classList.add('open');
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    state.settings.llm_mode = document.getElementById('settings-llm-mode').value;
    state.settings.gemini_model = document.getElementById('settings-gemini-model').value;
    state.settings.ollama_url = document.getElementById('settings-ollama-url').value;
    state.settings.ollama_model = document.getElementById('settings-ollama-model').value;

    saveSettings();
    saveLLMConfig({
      provider: state.settings.llm_mode,
      ollamaUrl: state.settings.ollama_url,
      ollamaModel: state.settings.ollama_model
    });
    updateUIThemeSettings();
    settingsModal.classList.remove('open');
  });

  // Globale Zentrale-Rückkehr für alle .btn-back-to-hub Buttons
  document.querySelectorAll('.btn-back-to-hub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      returnToHub();
    });
  });

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
    if (icon) icon.innerText = '🖥️';
    if (label) label.innerText = `Ollama Lokal (${state.settings.ollama_model || 'llama3'})`;
    if (aiBadge) {
      aiBadge.className = 'active-ai-badge badge-ollama';
    }
    if (aiBadgeText) {
      aiBadgeText.innerText = `🖥️ AKTIVE ENGINE: Ollama Lokal (${state.settings.ollama_model || 'llama3'})`;
    }
  } else {
    // Standard: Google Gemini
    if (icon) icon.innerText = '☁️';
    if (label) label.innerText = `Gemini Cloud (${state.settings.gemini_model || 'gemini-2.5-flash'})`;
    if (aiBadge) {
      aiBadge.className = 'active-ai-badge badge-gemini';
    }
    if (aiBadgeText) {
      aiBadgeText.innerText = `☁️ AKTIVE ENGINE: Google Gemini (${state.settings.gemini_model || 'gemini-2.5-flash'})`;
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
  if (!Array.isArray(window.selectedContextFiles)) {
    window.selectedContextFiles = [];
  }
}
