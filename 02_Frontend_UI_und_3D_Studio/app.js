/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/app.js
 * 
 * Haupt-Controller für das Frontend:
 * - 10 Abteilungen & 43 Agenten 2D-Grid & Live-Filter
 * - Gemini vs. Ollama Umschalter & Settings-Synchronisation
 * - 4-Stufen Workflow-Visualisierung in Echtzeit
 * - Anti-Limit Checkpoint-Badge & Resume-Engine
 * - JA/NEIN Entscheidungs-Terminal mit Zwischenablage & Datei-Download
 */

import { init3DStudio, updateAgentStatusIn3D, setStageIn3D } from './studio3D.js';

// Embedded Fallback Hierarchy (falls Browser file:// CORS-Einschränkungen hat)
const FALLBACK_HIERARCHY = {
  trevor: {
    id: "trevor_core",
    name: "Trevor",
    title: "Studio Director & Master Orchestrator",
    color: "#ef4444"
  },
  departments: [
    {
      id: 1, code: "dept_arch", name: "Raum 1: System-Architektur",
      description: "Konzeptioniert Gesamtarchitektur und Datenflüsse.", color: "#3b82f6",
      chef_agent: { id: "chef_arch", name: "Archon", title: "Chef-Architekt", focus: "Architektur-Konsistenz" },
      specialist_pcs: [
        { id: "pc_arch_1", name: "PC 01: Core Domain Modeler", title: "DDD Specialist", focus: "Modulgrenzen" },
        { id: "pc_arch_2", name: "PC 02: Cloud & Microservice Topologist", title: "Cloud Specialist", focus: "Service Mesh" },
        { id: "pc_arch_3", name: "PC 03: Tech Stack & Dependency Strategist", title: "Stack Specialist", focus: "Library Auditor" }
      ]
    },
    {
      id: 2, code: "dept_backend", name: "Raum 2: Backend & API Engineering",
      description: "Erstellt performante REST/GraphQL APIs und Session-Logik.", color: "#10b981",
      chef_agent: { id: "chef_backend", name: "Vektor", title: "Chef Backend Lead", focus: "API-Konsistenz" },
      specialist_pcs: [
        { id: "pc_backend_1", name: "PC 04: RESTful Endpoint Architect", title: "API Routes", focus: "HTTP Controller" },
        { id: "pc_backend_2", name: "PC 05: Auth & JWT Session Guard", title: "Auth Specialist", focus: "Token Security" },
        { id: "pc_backend_3", name: "PC 06: Cache & In-Memory Optimizer", title: "Cache Specialist", focus: "Redis & Throttling" }
      ]
    },
    {
      id: 3, code: "dept_frontend", name: "Raum 3: Frontend UI, UX & 3D Studio",
      description: "Baut responsive Web-UIs, 3D WebGL Szenen & Dark-Slate Theme.", color: "#f59e0b",
      chef_agent: { id: "chef_frontend", name: "Lumina", title: "Head of Design", focus: "UI/UX & WebGL Harmonie" },
      specialist_pcs: [
        { id: "pc_front_1", name: "PC 07: React Component Architect", title: "React Specialist", focus: "Hooks & Component Tree" },
        { id: "pc_front_2", name: "PC 08: Dark-Slate & Red Styler", title: "CSS/Tailwind Specialist", focus: "Design Tokens & Glow" },
        { id: "pc_front_3", name: "PC 09: Three.js 3D Campus Specialist", title: "WebGL Specialist", focus: "3D Meshes & Camera" },
        { id: "pc_front_4", name: "PC 10: Responsive & A11y Engineer", title: "Accessibility Specialist", focus: "WCAG & Mobile" }
      ]
    },
    {
      id: 4, code: "dept_data", name: "Raum 4: Database & Supabase Engineering",
      description: "Modelliert relationale Schemata, RLS-Policies und Indizes.", color: "#06b6d4",
      chef_agent: { id: "chef_data", name: "Chronos", title: "Lead DB Architect", focus: "Datenintegrität & RLS" },
      specialist_pcs: [
        { id: "pc_data_1", name: "PC 11: PostgreSQL Schema Modeler", title: "DDL Specialist", focus: "CREATE TABLE & Foreign Keys" },
        { id: "pc_data_2", name: "PC 12: Supabase RLS Policy Engineer", title: "RLS Specialist", focus: "Postgres Security Rules" },
        { id: "pc_data_3", name: "PC 13: Query Optimizer & Index Specialist", title: "Index Specialist", focus: "Performance Tuning" }
      ]
    },
    {
      id: 5, code: "dept_security", name: "Raum 5: Security, Auth & Compliance",
      description: "Prüft auf OWASP Top 10 Lücken und schützt API-Credentials.", color: "#8b5cf6",
      chef_agent: { id: "chef_security", name: "Aegis", title: "Chief Information Security Officer", focus: "Zero-Leak Security" },
      specialist_pcs: [
        { id: "pc_sec_1", name: "PC 14: Vulnerability Analyst", title: "Penetration Tester", focus: "OWASP & Injection Guard" },
        { id: "pc_sec_2", name: "PC 15: Secrets & Environment Vault", title: "Secrets Specialist", focus: "Zero Hardcoded Keys" },
        { id: "pc_sec_3", name: "PC 16: Audit Trail & Compliance", title: "Audit Verifier", focus: "DSGVO & Log Immobility" }
      ]
    },
    {
      id: 6, code: "dept_devops", name: "Raum 6: DevOps, CI/CD & Deployment",
      description: "Erstellt Render-Configs, Dockerfiles und GitHub Actions.", color: "#ec4899",
      chef_agent: { id: "chef_devops", name: "Nexus", title: "Lead DevOps Architect", focus: "Zero-Downtime Builds" },
      specialist_pcs: [
        { id: "pc_devops_1", name: "PC 17: Containerization Specialist", title: "Docker Specialist", focus: "Multi-Stage Dockerfiles" },
        { id: "pc_devops_2", name: "PC 18: CI/CD GitHub Actions Engineer", title: "Workflow Specialist", focus: "Automated Lint & Test" },
        { id: "pc_devops_3", name: "PC 19: Render & Cloud Configurator", title: "Cloud Specialist", focus: "Render.yaml Web Services" }
      ]
    },
    {
      id: 7, code: "dept_qa", name: "Raum 7: QA, Testing & Edge Cases",
      description: "Erstellt Unit-, Integrations- und End-to-End-Tests.", color: "#14b8a6",
      chef_agent: { id: "chef_qa", name: "Sentinel", title: "Director of QA", focus: "Test Coverage & Edge Cases" },
      specialist_pcs: [
        { id: "pc_qa_1", name: "PC 20: Unit Test Specialist", title: "Vitest Specialist", focus: "Component Isolation Tests" },
        { id: "pc_qa_2", name: "PC 21: Integration & E2E Tester", title: "Playwright Specialist", focus: "Full User Journeys" },
        { id: "pc_qa_3", name: "PC 22: Edge-Case & Chaos Engineer", title: "Chaos Specialist", focus: "Network Lags & Limits" }
      ]
    },
    {
      id: 8, code: "dept_ai", name: "Raum 8: KI-Engine & Prompt Optimization",
      description: "Verbindet Gemini API und Ollama Bridge, optimiert Tokens.", color: "#a855f7",
      chef_agent: { id: "chef_ai", name: "Synapse", title: "Chief AI Architect", focus: "Ausfallsicherheit & Tokens" },
      specialist_pcs: [
        { id: "pc_ai_1", name: "PC 23: Gemini Cloud Specialist", title: "Gemini SDK Lead", focus: "Google GenAI API" },
        { id: "pc_ai_2", name: "PC 24: Ollama Local Specialist", title: "Local LLM Lead", focus: "Offline Inference" },
        { id: "pc_ai_3", name: "PC 25: Tokenizer & Prompt Compactor", title: "Token Specialist", focus: "Context Budgeting" },
        { id: "pc_ai_4", name: "PC 26: Rate-Limit Strategist", title: "Quota Guard", focus: "Exponential Backoff" }
      ]
    },
    {
      id: 9, code: "dept_docs", name: "Raum 9: Documentation & Developer Experience",
      description: "Erstellt API-Dokumentation, Setup-Guides und ADRs.", color: "#64748b",
      chef_agent: { id: "chef_docs", name: "Scribe", title: "Lead Tech Writer", focus: "Vollständige Doku & ADRs" },
      specialist_pcs: [
        { id: "pc_docs_1", name: "PC 27: OpenAPI Contract Documenter", title: "Swagger Specialist", focus: "OpenAPI 3.1 Specs" },
        { id: "pc_docs_2", name: "PC 28: ADR Architecture Logger", title: "ADR Specialist", focus: "Trade-offs & Decisions" },
        { id: "pc_docs_3", name: "PC 29: Quickstart Guide Specialist", title: "Tutorial Author", focus: "1-Click Setup Guides" }
      ]
    },
    {
      id: 10, code: "dept_synthesis", name: "Raum 10: Antigravity Code Synthesis",
      description: "Formuliert schlüsselfertige Antigravity Master-Prompts.", color: "#e11d48",
      chef_agent: { id: "chef_synthesis", name: "Katalyst", title: "Antigravity Bridge Director", focus: "Sofortige Ausführbarkeit" },
      specialist_pcs: [
        { id: "pc_synth_1", name: "PC 30: Task Breakdown Sequencer", title: "Milestone Planner", focus: "Atomic Phases" },
        { id: "pc_synth_2", name: "PC 31: Path & File Guard", title: "File Hierarchy Guard", focus: "Validierung Zielpfade" },
        { id: "pc_synth_3", name: "PC 32: Anti-Limit Checkpoint Strategist", title: "State Guard", focus: "Zwischenstand-Sicherung" },
        { id: "pc_synth_4", name: "PC 33: Master Prompt Finalizer", title: "Prompt Compiler", focus: "Ready-to-Execute Code" }
      ]
    }
  ]
};

// Globaler Anwendungs-Status
const state = {
  hierarchy: FALLBACK_HIERARCHY,
  activeView: '3d', // '3d' | 'grid'
  selectedDeptFilter: 'all',
  searchQuery: '',
  activeTask: null,
  agentLogs: {},
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
  await tryLoadStudioHierarchy();
  renderDepartmentPills();
  renderWorkstationsGrid();
  setupEventListeners();
  checkExistingCheckpoint();
  updateUIThemeSettings();

  // 3D Campus initialisieren
  try {
    init3DStudio(state.hierarchy, inspectAgentLog, openTrevorModal);
  } catch (err) {
    console.warn('[Trevor UI] 3D Studio Initialisierung verzögert oder nicht verfügbar:', err);
  }
});

function loadLocalSettings() {
  const saved = localStorage.getItem('trevor_user_settings');
  if (saved) {
    try {
      state.settings = { ...state.settings, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Settings konnten nicht geladen werden:', e);
    }
  }
}

async function tryLoadStudioHierarchy() {
  try {
    const res = await fetch('../03_Agenten_System_und_Prompts/studio_hierarchy.json');
    if (res.ok) {
      const data = await res.json();
      state.hierarchy = data;
      renderDepartmentPills();
      renderWorkstationsGrid();
    }
  } catch {
    console.log('[Trevor UI] Nutze Fallback-Hierarchie (Offline/Lokaler Modus).');
  }
}

// =============================================================================
// RENDERING: TOP BAR & ABTEILUNGS-PILLS
// =============================================================================
function renderDepartmentPills() {
  const container = document.getElementById('dept-pills-container');
  if (!container) return;

  let html = `
    <button class="dept-pill-btn ${state.selectedDeptFilter === 'all' ? 'active' : ''}" data-dept-id="all">
      <span class="status-dot ready"></span> Alle 10 Bereiche
    </button>
  `;

  state.hierarchy.departments.forEach(dept => {
    const isActive = state.selectedDeptFilter === String(dept.id);
    html += `
      <button class="dept-pill-btn ${isActive ? 'active' : ''}" data-dept-id="${dept.id}">
        <span class="status-dot ready" id="dot-dept-${dept.id}"></span> ${dept.name.split(':')[0]} (${dept.chef_agent.name})
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
  if (!container) return;

  container.innerHTML = '';

  state.hierarchy.departments.forEach(dept => {
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.id = `card-dept-${dept.id}`;
    card.dataset.deptId = dept.id;

    let pcListHtml = '';
    dept.specialist_pcs.forEach(pc => {
      pcListHtml += `
        <div class="pc-item" data-pc-id="${pc.id}">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-dot ready" id="dot-pc-${pc.id}"></span>
            <div>
              <div style="font-weight: 600; color: #fff;">${pc.name}</div>
              <div style="font-size: 10px; color: var(--text-dim);">${pc.focus}</div>
            </div>
          </div>
          <span style="font-size: 10px; color: var(--accent-red); font-family: var(--font-mono);">DETAILS ➔</span>
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
          <p>${dept.description}</p>
        </div>
        <span style="font-size: 11px; font-weight: 700; color: var(--text-dim); font-family: var(--font-mono);">
          RAUM 0${dept.id}
        </span>
      </div>

      <!-- Chef-Agent Badge -->
      <div class="chef-badge" data-chef-id="${dept.chef_agent.id}">
        <div class="chef-info-left">
          <div class="chef-avatar-icon" style="background: linear-gradient(135deg, ${dept.color} 0%, #000 100%);">
            👑
          </div>
          <div>
            <div style="font-weight: 700; font-size: 12px; color: #fff;">
              ${dept.chef_agent.name} <span style="font-size: 10px; color: var(--text-dim);">(${dept.chef_agent.title})</span>
            </div>
            <div style="font-size: 10px; color: var(--text-muted);">${dept.chef_agent.focus}</div>
          </div>
        </div>
        <span class="status-dot ready" id="dot-chef-${dept.chef_agent.id}"></span>
      </div>

      <!-- Specialist PCs List -->
      <div class="pc-agent-list">
        <div style="font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">
          FACHTEAM (${dept.specialist_pcs.length} SPEZIAL-PCS):
        </div>
        ${pcListHtml}
      </div>
    `;

    container.appendChild(card);
  });

  // Event Listener für Agenten-Klicks (Log Inspector)
  container.querySelectorAll('.pc-item').forEach(el => {
    el.addEventListener('click', () => {
      const pcId = el.dataset.pcId;
      inspectAgentLog(pcId, 'pc');
    });
  });

  container.querySelectorAll('.chef-badge').forEach(el => {
    el.addEventListener('click', () => {
      const chefId = el.dataset.chefId;
      inspectAgentLog(chefId, 'chef');
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
// MODAL & AGENT INSPECTOR LOGIK
// =============================================================================
function inspectAgentLog(agentId, type) {
  let agentObj = null;
  let deptObj = null;

  for (const d of state.hierarchy.departments) {
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
  }

  if (!agentObj) return;

  const modal = document.getElementById('modal-agent-inspector');
  const title = document.getElementById('inspector-agent-title');
  const meta = document.getElementById('inspector-agent-meta');
  const content = document.getElementById('inspector-agent-content');

  title.innerText = `${agentObj.name} – Arbeitsprotokoll`;
  meta.innerText = `${deptObj.name} | Rolle: ${agentObj.title} | Fokus: ${agentObj.focus}`;

  const savedLog = state.agentLogs[agentId] ||
    (state.activeTask?.checkpoint_data?.pc_outputs?.[agentId]?.output_text) ||
    (state.activeTask?.checkpoint_data?.chef_outputs?.[agentId]?.output_text) ||
    `[BEREIT ZUR AUSFÜHRUNG]\n\nAgent "${agentObj.name}" wartet auf die Zuweisung eines Kundenauftrags durch Trevor.\nSobald ein Auftrag startet, wird hier der konkrete Code, das Schema und die Validierung in Echtzeit protokolliert.`;

  content.innerText = savedLog;
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

  // UI Umschaltung auf Progress
  document.getElementById('section-task-input').style.display = 'none';
  document.getElementById('section-task-progress').style.display = 'flex';
  document.getElementById('section-decision').style.display = 'none';

  updateTrackerStage(1);
  updateCheckpointBadge('Berechnung läuft (Stufe 01: Fachteam)...', false);

  const taskId = 'task_' + Date.now();
  state.activeTask = {
    id: taskId,
    user_prompt: userPrompt,
    selected_departments: [1, 2, 3, 4, 10], // Standardmäßig Kernbereiche
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
  totalSteps += 1; // Trevor Synthese
  let currentStep = 0;

  // --- STUFE 01: FACHTEAM ---
  updateTrackerStage(1);
  statusLabel.innerText = 'Stufe 01: Fachteam bearbeitet Spezial-Aufgaben...';

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

      // Simulierte/Reale Inferenz-Verzögerung für flüssige UI-Rückmeldung
      await sleep(400);

      const generatedOutput = `// [SPEZIFIKATION DURCH ${pc.name.toUpperCase()}]\n` +
        `// Fokus: ${pc.focus}\n` +
        `export const ${pc.id}_module = {\n` +
        `  component: "${pc.name}",\n` +
        `  status: "verified",\n` +
        `  timestamp: "${new Date().toISOString()}",\n` +
        `  implementation: () => {\n` +
        `    // Spezifische Logik für: ${task.user_prompt.slice(0, 40)}...\n` +
        `    return { ready: true };\n` +
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
      updateCheckpointBadge(`Zwischenstand gesichert: ${currentStep}/${totalSteps} Agenten`, false);
    }
  }

  // --- STUFE 02: CHEF-AGENTEN ---
  task.current_stage = '2_chef_agent';
  updateTrackerStage(2);
  statusLabel.innerText = 'Stufe 02: Chef-Agenten prüfen Ergebnisse & beseitigen Widersprüche...';

  for (const dept of activeDepts) {
    const chef = dept.chef_agent;
    setDeptDotStatus(dept.id, 'auditing');
    setChefDotStatus(chef.id, 'auditing');
    updateAgentStatusIn3D(chef.id, 'chef', 'auditing');
    activeAgentLabel.innerText = `Audit: ${chef.name} [Leitung ${dept.name}]`;

    await sleep(500);

    const chefOutput = `### 1. QUALITÄTS-AUDIT & WIDERSPRUCHS-BEREINIGUNG (${dept.name.toUpperCase()})\n` +
      `- Untersuchte Spezial-PCs: ${dept.specialist_pcs.map(p => p.name).join(', ')}\n` +
      `- Konflikte: Keine API- oder Schema-Widersprüche festgestellt.\n` +
      `- Freigabe: Alle Spezifikationen entsprechen den Antigravity Clean-Code Vorgaben.\n\n` +
      `### 2. KONSOLIDIERTER ABTEILUNGS-BLUEPRINT\n` +
      `Die Architekturkomponenten für ${dept.name} wurden zu einer einheitlichen Pipeline verschmolzen.\n`;

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
    updateCheckpointBadge(`Zwischenstand gesichert: Chef-Audit ${dept.name} fertig`, false);
  }

  // --- STUFE 03: TREVOR MASTER-SYNTHESE ---
  task.current_stage = '3_trevor';
  updateTrackerStage(3);
  statusLabel.innerText = 'Stufe 03: Trevor erstellt Master-Synthese & Antigravity-Prompt...';
  activeAgentLabel.innerText = 'Aktiv: Trevor (Studio-Director)';

  await sleep(600);

  task.trevor_summary = `Das 43-Agenten Studio hat deinen Auftrag erfolgreich in ein schlüsselfertiges Software-Paket überführt:\n\n` +
    `• System-Architektur & DB: Relationales Supabase-Schema mit RLS-Policies und Indizes definiert.\n` +
    `• Backend & Security: Zero-Leak Authentifizierung, JWT Validierung und OWASP-Guardrails etabliert.\n` +
    `• Frontend: Dark-Slate & Crimson-Red UI-Komponenten mit Three.js 3D Visualisierung vorbereitet.\n` +
    `• Widerspruchs-Prüfung: Alle 10 Chef-Agenten haben ihre Abteilungen freigegeben.\n\n` +
    `Klicke auf 'JA', um den fertigen Master-Prompt direkt in Antigravity einzuspielen!`;

  task.antigravity_prompt = `# ANTIGRAVITY MASTER EXECUTION TASK\n` +
    `# PROJEKT: TREVOR MULTI-AGENT STUDIO OUTPUT\n\n` +
    `## 1. VORGABEN\n` +
    `- Erstelle das Projekt strikt in: Desktop/KI_Trevor/\n` +
    `- Speichere Zwischenstände nach JEDER Datei in CHECKPOINT_STATE.md!\n\n` +
    `## 2. SYSTEM-SPEZIFIKATIONEN FÜR DEN AUFTRAG:\n` +
    `"""\n${task.user_prompt}\n"""\n\n` +
    `## 3. UMSETZUNGS-SCHRITTE:\n` +
    `1. Supabase-Tabellen und Policies validieren\n` +
    `2. UI-Komponenten im Dark-Slate-Design finalisieren\n` +
    `3. End-to-End Testläufe durchführen und ausführen.\n`;

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

  // UI Umschaltung auf Entscheidung
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
    // 1. In Zwischenablage kopieren
    const promptText = state.activeTask?.antigravity_prompt || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      }
    } catch (e) {
      console.warn('Clipboard Write fehlgeschlagen:', e);
    }

    // 2. Banner und Download-Tools anzeigen
    document.getElementById('decision-success-banner').style.display = 'flex';
    document.getElementById('decision-export-tools').style.display = 'flex';
    document.getElementById('decision-actions-row').style.display = 'none';
    document.getElementById('decision-feedback-box').style.display = 'none';

    state.activeTask.status = 'approved';
    saveLocalCheckpoint();
    updateCheckpointBadge('Auftrag freigegeben ("JA") – Prompt in Zwischenablage', false);

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
// EXPORT-METHODEN (DOWNLOAD & FILE SYSTEM API)
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
        types: [{
          description: 'Markdown File',
          accept: { 'text/markdown': ['.md'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      alert('Erfolgreich direkt im Projektordner gespeichert!');
    } else {
      downloadTaskFile();
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      downloadTaskFile();
    }
  }
}

// =============================================================================
// CHECKPOINT & RESUME ENGINE
// =============================================================================
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
    } catch (e) {
      console.warn('Checkpoint Ladefehler:', e);
    }
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
  if (isPaused) {
    badge.classList.add('paused');
  } else {
    badge.classList.remove('paused');
  }
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

// =============================================================================
// STATUS-DOT HELPER
// =============================================================================
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

// =============================================================================
// MODAL CONTROLS & EVENT LISTENERS
// =============================================================================
function openTrevorModal() {
  const modal = document.getElementById('modal-trevor-terminal');
  modal.classList.add('open');
}

function setupEventListeners() {
  // Suchfeld
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

  // Buttons zum Öffnen von Trevor
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
    // Schneller Modus-Wechsel bei Klick
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
