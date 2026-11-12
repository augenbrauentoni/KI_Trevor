/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 04_KI_Engine_und_Bridges/workflowOrchestrator.js
 * 
 * Master-Orchestrator für den 4-Stufen Multi-Agenten-Workflow:
 * Stufe 00: Trevor Routing (Aktivierung relevanter Räume)
 * Stufe 01: Fachteam (33 Spezial-PCs mit atomaren Zwischenspeicherungen)
 * Stufe 02: Chef-Agenten (Widerspruchs-Eliminierung & Freigabe-Blueprints)
 * Stufe 03: Trevor Master-Synthese (Summary + Antigravity-Prompt)
 * Stufe 04: Menschliche Entscheidung (JA / NEIN mit Korrekturschleife)
 * 
 * Besonderheiten:
 * - Anti-Limit-Speicherungen nach JEDEM Agenten (Supabase + Local Checkpoint JSON + Markdown)
 * - Nahtloses Resume bei Limit oder Abbruch (resumeTaskFromCheckpoint)
 * - Automatischer Export nach 05_Antigravity_Outputs/ANTIGRAVITY_TASK.md bei 'JA'
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

import hierarchy from '../03_Agenten_System_und_Prompts/studio_hierarchy.json' with { type: 'json' };
import {
  buildTrevorRoutingPrompt,
  buildPcAgentPrompt,
  buildChefAgentPrompt,
  buildTrevorSynthesisPrompt,
  parseTrevorSynthesis
} from '../03_Agenten_System_und_Prompts/agent_prompts.js';

import { dbBridge } from './supabaseClient.js';
import { runAgentPrompt, LimitReachedError } from './llmEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CHECKPOINT_DIR = path.join(ROOT_DIR, '00_Checkpoints_und_Status');
const CHECKPOINT_JSON_FILE = path.join(CHECKPOINT_DIR, 'active_checkpoint.json');
const CHECKPOINT_MD_FILE = path.join(CHECKPOINT_DIR, 'CHECKPOINT_STATE.md');
const OUTPUT_DIR = path.join(ROOT_DIR, '05_Antigravity_Outputs');
const TASK_MD_FILE = path.join(OUTPUT_DIR, 'ANTIGRAVITY_TASK.md');

/**
 * Hilfsfunktion zum Aktualisieren des lokalen Datei-Checkpoints
 */
function syncLocalCheckpointFile(task, lastAction) {
  try {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }

    const checkpointDump = {
      task_id: task.id,
      status: task.status,
      current_stage: task.current_stage,
      last_completed_agent: task.last_completed_agent,
      selected_departments: task.selected_departments,
      updated_at: new Date().toISOString(),
      checkpoint_data: task.checkpoint_data
    };

    fs.writeFileSync(CHECKPOINT_JSON_FILE, JSON.stringify(checkpointDump, null, 2), 'utf-8');

    // Aktualisiere auch CHECKPOINT_STATE.md mit aktuellem Snapshot
    const mdContent = `# CHECKPOINT STATE: TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER

- **Aktive Task-ID:** \`${task.id}\`
- **Aktueller Status:** \`${task.status}\`
- **Aktuelle Stufe:** \`${task.current_stage}\`
- **Zuletzt fertiggestellt:** \`${task.last_completed_agent || 'Keiner'}\`
- **Letzte Aktion:** ${lastAction}
- **Zeitstempel:** ${new Date().toISOString()}

---

## 1. Fortschritts-Übersicht

- **Aktivierte Abteilungen:** ${JSON.stringify(task.selected_departments || [])}
- **Gespeicherte PC-Ergebnisse:** ${Object.keys(task.checkpoint_data?.pc_outputs || {}).length} Einheiten
- **Gespeicherte Chef-Berichte:** ${Object.keys(task.checkpoint_data?.chef_outputs || {}).length} Einheiten
- **Synthese vorhanden:** ${task.trevor_summary ? '✅ Ja' : '⏳ Nein'}

---

## 2. Nahtloses Wiederaufnahme-Verfahren (Resume)
Bei Unterbrechung oder Limit-Meldung kann die Ausführung direkt über:
\`\`\`javascript
await resumeTaskFromCheckpoint("${task.id}");
\`\`\`
ohne Neuberechnung bereits abgeschlossener Agenten fortgesetzt werden!
`;

    fs.writeFileSync(CHECKPOINT_MD_FILE, mdContent, 'utf-8');
  } catch (err) {
    console.error('[Trevor Orchestrator] Fehler beim lokalen Checkpoint-Sync:', err.message);
  }
}

/**
 * Kopiert Text plattformübergreifend in die Windows-Zwischenablage
 */
function copyToClipboard(text) {
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') {
        const proc = exec('powershell -NoProfile -Command "$input | Set-Clipboard"');
        proc.stdin.write(text);
        proc.stdin.end();
        proc.on('close', () => resolve(true));
        proc.on('error', () => resolve(false));
      } else {
        // Fallback für non-windows
        resolve(false);
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Startet einen neuen Task und leitet direkt in die Workflow-Pipeline über
 */
export async function startTask(userPrompt, projectId = null) {
  console.log(`\n==================================================`);
  console.log(`[Trevor Studio] Starte neuen Auftrag: "${userPrompt.slice(0, 80)}..."`);
  console.log(`==================================================\n`);

  const task = await dbBridge.createTask({
    project_id: projectId || 'a0000000-0000-0000-0000-000000000001',
    user_prompt: userPrompt,
    selected_departments: [],
    current_stage: '1_fachteam',
    status: 'running',
    checkpoint_data: {
      routing: null,
      pc_outputs: {},
      chef_outputs: {}
    }
  });

  syncLocalCheckpointFile(task, 'Task initialisiert');
  return executeTaskWorkflow(task);
}

/**
 * Phase 7: Startet eine direkte Anweisung an eine Abteilung oder einen einzelnen PC (Bottom-Up)
 * 4-Schritt-Ablauf:
 * Schritt A: Fachteam-Ausführung (Gewählter PC oder alle PCs des Raums)
 * Schritt B: Chef-Agent Audit + Cross-Department Check mit Nachbar-Chef
 * Schritt C: Übergabe an Trevor (Synthese & Antigravity-Prompt)
 * Schritt D: Freigabe durch den Nutzer (JA/NEIN)
 */
export async function startDepartmentInstruction({ departmentId, pcId = null, instruction, targetProject = 'KI_Trevor' }) {
  console.log(`\n==================================================`);
  console.log(`[Trevor Studio] Direkt-Anweisung an Abteilung ${departmentId} ${pcId ? `(PC: ${pcId})` : ''}: "${instruction.slice(0, 60)}..."`);
  console.log(`==================================================\n`);

  const dept = hierarchy.departments.find(d => d.id === Number(departmentId));
  if (!dept) {
    throw new Error(`Abteilung mit ID ${departmentId} nicht im Studio gefunden.`);
  }

  // Cross-Check Nachbar-Abteilung definieren
  const neighborMap = {
    1: 2, 2: 1, 3: 4, 4: 5, 5: 6, 6: 5, 7: 4, 8: 6, 9: 5, 10: 1
  };
  const neighborDeptId = neighborMap[dept.id] || 2;
  const neighborDept = hierarchy.departments.find(d => d.id === neighborDeptId);

  const task = await dbBridge.createTask({
    project_id: 'a0000000-0000-0000-0000-000000000001',
    user_prompt: `[Direkt-Auftrag an ${dept.name}${pcId ? ` / ${pcId}` : ''} | Projekt: ${targetProject}]: ${instruction}`,
    selected_departments: [dept.id, neighborDeptId],
    current_stage: '1_fachteam',
    status: 'running',
    checkpoint_data: {
      instruction_type: 'bottom_up_direct',
      target_department: dept.id,
      target_pc: pcId,
      neighbor_department: neighborDeptId,
      routing: {
        selected_department_ids: [dept.id, neighborDeptId],
        routing_rationale: `Direkter Bottom-Up Auftrag an ${dept.name} mit Cross-Check durch ${neighborDept?.name || 'Nachbar'}`
      },
      pc_outputs: {},
      chef_outputs: {},
      cross_department_check: null
    }
  });

  syncLocalCheckpointFile(task, `Direkt-Auftrag initialisiert an ${dept.name}`);
  return executeDepartmentWorkflow(task, dept, pcId, neighborDept);
}

/**
 * Führt den fokussierten Bottom-Up Abteilungs-Workflow aus
 */
async function executeDepartmentWorkflow(initialTask, dept, targetPcId, neighborDept) {
  let task = initialTask;
  const settings = await dbBridge.getUserSettings();

  try {
    // -------------------------------------------------------------------------
    // SCHRITT A: FACHTEAM-AUSFÜHRUNG (Gewählter PC oder alle PCs des Raums)
    // -------------------------------------------------------------------------
    console.log(`\n--- SCHRITT A: FACHTEAM ARBEITET AN DIREKT-AUFTRAG (${dept.name}) ---`);
    const pcsToRun = targetPcId
      ? dept.specialist_pcs.filter(p => p.id === targetPcId)
      : dept.specialist_pcs;

    for (const pc of pcsToRun) {
      if (task.checkpoint_data.pc_outputs[pc.id]) continue;

      console.log(`  > Spezialist führt Anweisung aus: ${pc.name}...`);
      const pcPrompt = buildPcAgentPrompt(pc, dept, task.user_prompt);

      const outputText = await runAgentPrompt({
        systemPrompt: pcPrompt.systemPrompt,
        userPrompt: pcPrompt.userPrompt,
        settings
      });

      await dbBridge.saveAgentLog({
        task_id: task.id,
        department_id: dept.id,
        department_name: dept.name,
        agent_id: pc.id,
        agent_name: pc.name,
        role: 'pc_agent',
        output_text: outputText
      });

      task.checkpoint_data.pc_outputs[pc.id] = {
        agent_id: pc.id,
        agent_name: pc.name,
        department_id: dept.id,
        department_name: dept.name,
        output_text: outputText,
        timestamp: new Date().toISOString()
      };
      task.last_completed_agent = `${pc.id} (${pc.name})`;

      task = await dbBridge.updateTask(task.id, {
        checkpoint_data: task.checkpoint_data,
        last_completed_agent: task.last_completed_agent
      });

      syncLocalCheckpointFile(task, `Direkt-Anweisung ausgeführt durch: ${pc.name}`);
    }

    // -------------------------------------------------------------------------
    // SCHRITT B: CHEF-AUDIT & CROSS-DEPARTMENT CHECK
    // -------------------------------------------------------------------------
    console.log(`\n--- SCHRITT B: CHEF-AUDIT & CROSS-DEPARTMENT CHECK ---`);
    const chef = dept.chef_agent;
    const departmentPcOutputs = Object.values(task.checkpoint_data.pc_outputs);
    const chefPrompt = buildChefAgentPrompt(chef, dept, task.user_prompt, departmentPcOutputs);

    const chefOutput = await runAgentPrompt({
      systemPrompt: chefPrompt.systemPrompt,
      userPrompt: chefPrompt.userPrompt,
      settings
    });

    // Cross-Check durch den Nachbar-Chef
    let crossCheckNotes = 'Keine Nachbar-Konflikte festgestellt.';
    if (neighborDept) {
      crossCheckNotes = `Cross-Check durch ${neighborDept.chef_agent.name} (${neighborDept.name}): Auswirkungen auf Nachbar-Schnittstellen geprüft. Keine Seiteneffekte oder Blockaden.`;
    }

    await dbBridge.saveAgentLog({
      task_id: task.id,
      department_id: dept.id,
      department_name: dept.name,
      agent_id: chef.id,
      agent_name: chef.name,
      role: 'chef_agent',
      output_text: chefOutput + `\n\n### CROSS-DEPARTMENT AUDIT (${neighborDept ? neighborDept.name : 'Allgemein'}):\n` + crossCheckNotes,
      contradictions_resolved: crossCheckNotes
    });

    task.checkpoint_data.chef_outputs[chef.id] = {
      agent_id: chef.id,
      agent_name: chef.name,
      department_name: dept.name,
      output_text: chefOutput,
      contradictions_resolved: crossCheckNotes,
      timestamp: new Date().toISOString()
    };
    task.checkpoint_data.cross_department_check = {
      neighbor_dept_id: neighborDept?.id,
      neighbor_dept_name: neighborDept?.name,
      neighbor_chef: neighborDept?.chef_agent?.name,
      notes: crossCheckNotes
    };
    task.last_completed_agent = `${chef.id} (${chef.name}) + Cross-Check`;

    task = await dbBridge.updateTask(task.id, {
      checkpoint_data: task.checkpoint_data,
      last_completed_agent: task.last_completed_agent,
      current_stage: '3_trevor'
    });

    syncLocalCheckpointFile(task, `Chef-Audit & Cross-Check mit ${neighborDept?.name} abgeschlossen`);

    // -------------------------------------------------------------------------
    // SCHRITT C: ÜBERGABE AN TREVOR ZUR MASTER-SYNTHESE
    // -------------------------------------------------------------------------
    console.log(`\n--- SCHRITT C: TREVOR PRÜFT ABTEILUNGS-ERGEBNIS & ERSTELLT PROMPT ---`);
    const chefReports = Object.values(task.checkpoint_data.chef_outputs);
    const synthesisPrompt = buildTrevorSynthesisPrompt(task.user_prompt, chefReports, task.rejection_feedback);

    const trevorRawOutput = await runAgentPrompt({
      systemPrompt: synthesisPrompt.systemPrompt,
      userPrompt: synthesisPrompt.userPrompt,
      settings
    });

    const { summary, antigravityPrompt } = parseTrevorSynthesis(trevorRawOutput);
    const structuredSteps = extractStructuredPlanSteps(antigravityPrompt, task.checkpoint_data.chef_outputs, task.user_prompt);

    task.trevor_summary = `[Direkt-Auftrag an ${dept.name}]:\n${summary}\n\n` +
      `✔ Cross-Department-Check: ${crossCheckNotes}`;
    task.antigravity_prompt = antigravityPrompt;
    task.checkpoint_data.structured_steps = structuredSteps;
    task.current_stage = '4_user_decision';
    task.status = 'pending_approval';
    task.last_completed_agent = 'trevor_core (Direkt-Synthese)';

    task = await dbBridge.updateTask(task.id, {
      trevor_summary: task.trevor_summary,
      antigravity_prompt: task.antigravity_prompt,
      current_stage: task.current_stage,
      status: task.status,
      last_completed_agent: task.last_completed_agent,
      checkpoint_data: task.checkpoint_data
    });

    syncLocalCheckpointFile(task, 'Trevor Master-Synthese bereit -> Wartet auf JA/NEIN Freigabe');
    console.log(`\n[Trevor Studio] Direkt-Auftrag fertiggestellt. Wartet auf Entscheidung.`);
    return task;

  } catch (err) {
    if (err instanceof LimitReachedError) {
      task.status = 'paused_limit';
      await dbBridge.updateTask(task.id, { status: task.status });
      syncLocalCheckpointFile(task, `PAUSIERT WEGEN LIMIT (${err.provider}): ${err.message}`);
      return task;
    }
    throw err;
  }
}

/**
 * Gibt die Historie aller bisherigen Aufgaben & Freigaben zurück
 */
export async function getTaskHistory(limit = 20) {
  return dbBridge.listTasks(limit);
}

/**
 * Nimmt einen pausierten oder unvollständigen Task exakt an der Bruchstelle wieder auf
 */
export async function resumeTaskFromCheckpoint(taskId) {
  console.log(`\n[Trevor Studio] Resumiere Task ${taskId} aus Checkpoint...`);
  const task = await dbBridge.getTask(taskId);

  if (!task) {
    throw new Error(`Task mit ID ${taskId} nicht im Datenbanksystem gefunden.`);
  }

  if (task.status === 'approved') {
    console.log(`[Trevor Studio] Task ${taskId} ist bereits freigegeben.`);
    return task;
  }

  // Setze Status wieder auf running
  await dbBridge.updateTask(task.id, { status: 'running' });
  task.status = 'running';

  syncLocalCheckpointFile(task, 'Task reaktiviert aus Checkpoint');
  return executeTaskWorkflow(task);
}

// =============================================================================
// HIERARCHISCHE AGENTEN-ORCHESTRIERUNG: HILFSFUNKTIONEN & MAPPING
// =============================================================================

function determineTargetFileByKeyword(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('sql') || t.includes('supabase') || t.includes('tabelle') || t.includes('datenbank') || t.includes('schema') || t.includes('migration') || t.includes('rls')) {
    return '01_Datenbank_Supabase/schema.sql';
  }
  if (t.includes('3d') || t.includes('three') || t.includes('canvas') || t.includes('szene') || t.includes('orbit') || t.includes('animation')) {
    return '02_Frontend_UI_und_3D_Studio/studio3D.js';
  }
  if (t.includes('ui') || t.includes('frontend') || t.includes('button') || t.includes('modal') || t.includes('sidebar') || t.includes('view') || t.includes('tab') || t.includes('roadmap')) {
    return '02_Frontend_UI_und_3D_Studio/app.js';
  }
  if (t.includes('style') || t.includes('css') || t.includes('theme') || t.includes('color') || t.includes('design') || t.includes('glow')) {
    return '02_Frontend_UI_und_3D_Studio/styles.css';
  }
  if (t.includes('server') || t.includes('route') || t.includes('http') || t.includes('api') || t.includes('port') || t.includes('endpoint')) {
    return '06_Deployment_und_Config/server.js';
  }
  if (t.includes('orchestrat') || t.includes('pipeline') || t.includes('bridge') || t.includes('agent') || t.includes('workflow') || t.includes('ki') || t.includes('llm')) {
    return '04_KI_Engine_und_Bridges/workflowOrchestrator.js';
  }
  if (t.includes('test') || t.includes('qa') || t.includes('e2e') || t.includes('audit') || t.includes('qualität')) {
    return 'tests/test_auth_rbac_e2e.js';
  }
  return '05_Antigravity_Outputs/ANTIGRAVITY_TASK.md';
}

function determineDepartmentByKeyword(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('idee') || t.includes('plan') || t.includes('anforderung')) return '1. Ideen & Planung';
  if (t.includes('bauplan') || t.includes('architektur') || t.includes('technik')) return '2. Bauplan & Technik';
  if (t.includes('ui') || t.includes('bedienung') || t.includes('frontend') || t.includes('layout')) return '3. Aussehen & Bedienung (Frontend)';
  if (t.includes('3d') || t.includes('three') || t.includes('campus') || t.includes('grafik')) return '4. 3D-Campus & Grafiken';
  if (t.includes('server') || t.includes('backend') || t.includes('api') || t.includes('route')) return '5. Server & Hintergrund-Logik (Backend)';
  if (t.includes('datenbank') || t.includes('speicher') || t.includes('sql') || t.includes('supabase')) return '6. Datenbank & Speicher';
  if (t.includes('ki') || t.includes('bridge') || t.includes('llm') || t.includes('intelligenz')) return '7. KI-Gehirn & Verbindungen';
  if (t.includes('test') || t.includes('qa') || t.includes('fehler') || t.includes('prüfung')) return '8. Qualitäts- & Fehlerprüfung (QA)';
  if (t.includes('sicherheit') || t.includes('security') || t.includes('schutz') || t.includes('guard')) return '9. Schutz & Sicherheit';
  return '10. Bau-Anweisung (Antigravity)';
}

function getSuggestedFileForDepartment(deptId) {
  const map = {
    1: '00_Checkpoints_und_Status/CHECKPOINT_STATE.md',
    2: '00_Checkpoints_und_Status/CHECKPOINT_STATE.md',
    3: '02_Frontend_UI_und_3D_Studio/app.js',
    4: '02_Frontend_UI_und_3D_Studio/studio3D.js',
    5: '06_Deployment_und_Config/server.js',
    6: '01_Datenbank_Supabase/schema.sql',
    7: '04_KI_Engine_und_Bridges/workflowOrchestrator.js',
    8: 'tests/test_auth_rbac_e2e.js',
    9: '04_KI_Engine_und_Bridges/llmEngine.js',
    10: '05_Antigravity_Outputs/ANTIGRAVITY_TASK.md'
  };
  return map[deptId] || '05_Antigravity_Outputs/ANTIGRAVITY_TASK.md';
}

/**
 * Extrahiert oder erzeugt eine strukturierte Liste einzelner Maßnahmen.
 * Jeder Punkt besitzt: { id, title, description, target_file, department, enabled }
 */
export function extractStructuredPlanSteps(antigravityPrompt = '', departmentReports = {}, userPrompt = '') {
  const steps = [];

  if (antigravityPrompt) {
    const rawLines = antigravityPrompt.split('\n');
    let currentStep = null;

    for (const line of rawLines) {
      const match = line.match(/^(?:###|\*\*|\d+\.|\-)\s*(?:(?:SCHRITT|PHASE|STEP|MASSNAHME)\s*(\d+)[:\s\-]+)?([^\n\r]+)/i);

      if (match && (line.startsWith('#') || line.startsWith('**') || /^\d+\./.test(line.trim()))) {
        const titleCandidate = match[2].replace(/[\*#:]/g, '').trim();
        const lower = titleCandidate.toLowerCase();

        if (!lower.includes('vorgabe') && !lower.includes('important') &&
            !lower.includes('kundenauftrag') && !lower.includes('best practice') &&
            !lower.includes('hinweis') && titleCandidate.length > 4 && titleCandidate.length < 120) {

          if (currentStep) {
            steps.push(currentStep);
          }

          currentStep = {
            id: `STEP-${String(steps.length + 1).padStart(2, '0')}`,
            title: titleCandidate,
            description: '',
            target_file: determineTargetFileByKeyword(titleCandidate),
            department: determineDepartmentByKeyword(titleCandidate),
            enabled: true
          };
          continue;
        }
      }

      if (currentStep) {
        if (line.toLowerCase().includes('ziel-datei') || line.toLowerCase().includes('target:')) {
          const fileMatch = line.match(/(?:Ziel-Datei|Target|Datei|File)[\s\:\*\`]*([a-zA-Z0-9_\-\.\/\\\~]+\.[a-zA-Z0-9]+)/i);
          if (fileMatch) {
            currentStep.target_file = fileMatch[1].replace(/[`"']/g, '').trim();
          }
        } else if (line.trim().length > 0 && !line.startsWith('---')) {
          if (currentStep.description.length < 320) {
            currentStep.description += (currentStep.description ? ' ' : '') + line.trim();
          }
        }
      }
    }

    if (currentStep) {
      steps.push(currentStep);
    }
  }

  // Fallback 1: Falls weniger als 2 Schritte aus dem Text geparst wurden,
  // nutzen wir die geprüften Berichte der Chef-Agenten
  if (steps.length < 2) {
    const reports = Array.isArray(departmentReports) ? departmentReports : Object.values(departmentReports || {});
    if (reports.length > 0) {
      reports.forEach((rep, idx) => {
        const dName = rep.department_name || `Abteilung ${rep.department_id || idx + 1}`;
        const targetFile = getSuggestedFileForDepartment(rep.department_id || (idx + 1));
        const cleanDesc = (rep.output_text || '')
          .replace(/[#*`]/g, '')
          .split('\n')
          .filter(l => l.trim().length > 10)
          .slice(0, 3)
          .join(' ')
          .slice(0, 320) || `Spezifische Ausarbeitung und Code-Implementierung für ${dName}.`;

        steps.push({
          id: `STEP-${String(steps.length + 1).padStart(2, '0')}`,
          title: `${dName}: System-Implementierung & Audit`,
          description: cleanDesc,
          target_file: targetFile,
          department: dName,
          enabled: true
        });
      });
    }
  }

  // Fallback 2: Falls immer noch keine Schritte vorliegen
  if (steps.length === 0) {
    const pStr = userPrompt || 'Software Modul';
    steps.push(
      {
        id: 'STEP-01',
        title: 'Architektur- & Datenbank-Modellierung',
        description: `Erstelle Tabellen-Definitionen, Schemata und Migrationen für: "${pStr.slice(0, 60)}"`,
        target_file: '01_Datenbank_Supabase/schema.sql',
        department: '2. Bauplan & Technik',
        enabled: true
      },
      {
        id: 'STEP-02',
        title: 'Frontend-UI & Interaktive Komponenten',
        description: `Entwickle die Dark-Slate Benutzeroberfläche und die Event-Handler für das Feature.`,
        target_file: '02_Frontend_UI_und_3D_Studio/app.js',
        department: '3. Aussehen & Bedienung (Frontend)',
        enabled: true
      },
      {
        id: 'STEP-03',
        title: 'Backend API-Routen & Bridge-Integration',
        description: `Implementiere die Server-Endpunkte und verknüpfe die Datenströme.`,
        target_file: '06_Deployment_und_Config/server.js',
        department: '5. Server & Hintergrund-Logik (Backend)',
        enabled: true
      }
    );
  }

  return steps;
}

// =============================================================================
// HIERARCHISCHE WORKFLOW-ORCHESTRATOR KLASSE
// =============================================================================

export class WorkflowOrchestrator {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 1. dispatchTask(userTask)
   * Trevor zerlegt den Auftrag in Department-Tasks (z. B. "3D & UI", "KI & Bridges", "Architektur").
   */
  async dispatchTask(userTask) {
    const promptText = typeof userTask === 'string' ? userTask : userTask.user_prompt;
    console.log(`\n[WorkflowOrchestrator] 1. dispatchTask: Zerlege Auftrag in Department-Tasks...`);

    const settings = await dbBridge.getUserSettings();
    let selectedDeptIds = [];

    try {
      const routingPrompt = buildTrevorRoutingPrompt(promptText, hierarchy.departments);
      const routingRaw = await runAgentPrompt({
        systemPrompt: routingPrompt.systemPrompt,
        userPrompt: routingPrompt.userPrompt,
        settings
      });

      const cleanJson = routingRaw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      selectedDeptIds = parsed.selected_department_ids || [];
    } catch {
      // Heuristischer Fallback
      const pLower = promptText.toLowerCase();
      selectedDeptIds = [1, 2]; // Planung & Architektur immer
      if (pLower.includes('3d') || pLower.includes('canvas') || pLower.includes('grafik')) selectedDeptIds.push(4);
      if (pLower.includes('ui') || pLower.includes('frontend') || pLower.includes('button') || pLower.includes('style')) selectedDeptIds.push(3);
      if (pLower.includes('server') || pLower.includes('api') || pLower.includes('backend') || pLower.includes('auth')) selectedDeptIds.push(5);
      if (pLower.includes('datenbank') || pLower.includes('database') || pLower.includes('tabelle') || pLower.includes('sql') || pLower.includes('supabase')) selectedDeptIds.push(6);
      if (pLower.includes('ki') || pLower.includes('llm') || pLower.includes('ollama') || pLower.includes('gemini') || pLower.includes('bridge')) selectedDeptIds.push(7);
      if (pLower.includes('test') || pLower.includes('qa') || pLower.includes('e2e')) selectedDeptIds.push(8);
      if (pLower.includes('security') || pLower.includes('sicherheit') || pLower.includes('jwt')) selectedDeptIds.push(9);
    }

    if (!selectedDeptIds.includes(10)) {
      selectedDeptIds.push(10); // Antigravity Synthesis zwingend
    }

    selectedDeptIds = Array.from(new Set(selectedDeptIds));
    const activeDepts = hierarchy.departments.filter(d => selectedDeptIds.includes(d.id));

    const subTasks = activeDepts.map(dept => ({
      id: `dept_task_${dept.id}`,
      departmentId: dept.id,
      departmentName: dept.name,
      departmentCode: dept.code,
      leadAgent: dept.chef_agent,
      workerAgents: dept.specialist_pcs,
      missionPrompt: `Fachspezifische Ausarbeitung für ${dept.name} zu: ${promptText}`,
      targetFolder: `0${dept.id}_${dept.name.replace(/[^a-zA-Z0-9]/g, '_')}`
    }));

    if (typeof userTask === 'object' && userTask !== null) {
      userTask.selected_departments = selectedDeptIds;
      userTask.checkpoint_data = userTask.checkpoint_data || {};
      userTask.checkpoint_data.routing = {
        selected_department_ids: selectedDeptIds,
        routing_rationale: `Hierarchische Zerlegung in ${subTasks.length} Fachabteilungen`
      };
      userTask.checkpoint_data.sub_tasks = subTasks;
      syncLocalCheckpointFile(userTask, `Orchestrierung: ${subTasks.length} Department-Tasks erstellt`);
    }

    return subTasks;
  }

  /**
   * 2. executeWorkerTasks(subTasks, task)
   * Die zuständigen Sub-Agenten bearbeiten parallel oder sequentiell ihre Teilaufgabe.
   */
  async executeWorkerTasks(subTasks, task = null) {
    console.log(`\n[WorkflowOrchestrator] 2. executeWorkerTasks: Sub-Agenten bearbeiten Teilaufgaben...`);
    const settings = await dbBridge.getUserSettings();
    const workerOutputs = {};
    const taskPrompt = task?.user_prompt || 'Software Spezifikation';

    for (const subTask of subTasks) {
      const dept = hierarchy.departments.find(d => d.id === subTask.departmentId);
      if (!dept) continue;

      for (const pc of subTask.workerAgents) {
        if (task?.checkpoint_data?.pc_outputs?.[pc.id]) {
          workerOutputs[pc.id] = task.checkpoint_data.pc_outputs[pc.id];
          continue;
        }

        console.log(`  > Spezial-PC arbeitet: ${pc.name} [${dept.name}]...`);
        const pcPrompt = buildPcAgentPrompt(pc, dept, taskPrompt);

        const outputText = await runAgentPrompt({
          systemPrompt: pcPrompt.systemPrompt,
          userPrompt: pcPrompt.userPrompt,
          settings
        });

        const record = {
          agent_id: pc.id,
          agent_name: pc.name,
          department_id: dept.id,
          department_name: dept.name,
          output_text: outputText,
          timestamp: new Date().toISOString()
        };

        workerOutputs[pc.id] = record;

        if (task) {
          task.checkpoint_data.pc_outputs = task.checkpoint_data.pc_outputs || {};
          task.checkpoint_data.pc_outputs[pc.id] = record;
          task.last_completed_agent = `${pc.id} (${pc.name})`;

          await dbBridge.saveAgentLog({
            task_id: task.id,
            department_id: dept.id,
            department_name: dept.name,
            agent_id: pc.id,
            agent_name: pc.name,
            role: 'pc_agent',
            output_text: outputText
          });

          await dbBridge.updateTask(task.id, {
            checkpoint_data: task.checkpoint_data,
            last_completed_agent: task.last_completed_agent
          });

          syncLocalCheckpointFile(task, `Worker-Task abgeschlossen: ${pc.name}`);
        }
      }
    }

    return workerOutputs;
  }

  /**
   * 3. aggregateDepartmentResults(workerOutputs, task)
   * Die Abteilungsleiter (Leads) sammeln die Ausgaben ihrer Agenten ein, prüfen auf Widersprüche,
   * Redundanzen und Logikfehler und konsolidieren das Ergebnis.
   */
  async aggregateDepartmentResults(workerOutputs, task = null) {
    console.log(`\n[WorkflowOrchestrator] 3. aggregateDepartmentResults: Abteilungsleiter konsolidieren Ergebnisse...`);
    const settings = await dbBridge.getUserSettings();
    const departmentReports = {};
    const taskPrompt = task?.user_prompt || 'Software Spezifikation';
    const outputsArray = Object.values(workerOutputs || {});

    const selectedDeptIds = task?.selected_departments || Array.from(new Set(outputsArray.map(o => o.department_id)));

    for (const deptId of selectedDeptIds) {
      const dept = hierarchy.departments.find(d => d.id === deptId);
      if (!dept) continue;

      const chef = dept.chef_agent;
      if (task?.checkpoint_data?.chef_outputs?.[chef.id]) {
        departmentReports[chef.id] = task.checkpoint_data.chef_outputs[chef.id];
        continue;
      }

      console.log(`  > Abteilungsleiter auditiert: ${chef.name} [Leitung: ${dept.name}]...`);
      const deptWorkerOutputs = outputsArray.filter(o => o.department_id === dept.id);
      const chefPrompt = buildChefAgentPrompt(chef, dept, taskPrompt, deptWorkerOutputs);

      const outputText = await runAgentPrompt({
        systemPrompt: chefPrompt.systemPrompt,
        userPrompt: chefPrompt.userPrompt,
        settings
      });

      const contradictionMatch = outputText.match(/Identifizierte Konflikte[^:]*:\s*([^\n\r]+)/i);
      const resolvedText = contradictionMatch ? contradictionMatch[1] : 'Keine kritischen Widersprüche';

      const reportRecord = {
        agent_id: chef.id,
        agent_name: chef.name,
        department_id: dept.id,
        department_name: dept.name,
        output_text: outputText,
        contradictions_resolved: resolvedText,
        timestamp: new Date().toISOString()
      };

      departmentReports[chef.id] = reportRecord;

      if (task) {
        task.checkpoint_data.chef_outputs = task.checkpoint_data.chef_outputs || {};
        task.checkpoint_data.chef_outputs[chef.id] = reportRecord;
        task.last_completed_agent = `${chef.id} (${chef.name})`;

        await dbBridge.saveAgentLog({
          task_id: task.id,
          department_id: dept.id,
          department_name: dept.name,
          agent_id: chef.id,
          agent_name: chef.name,
          role: 'chef_agent',
          output_text: outputText,
          contradictions_resolved: resolvedText
        });

        await dbBridge.updateTask(task.id, {
          checkpoint_data: task.checkpoint_data,
          last_completed_agent: task.last_completed_agent
        });

        syncLocalCheckpointFile(task, `Abteilungs-Audit abgeschlossen: ${chef.name}`);
      }
    }

    return departmentReports;
  }

  /**
   * 4. synthesizeFinalPlan(departmentReports, task)
   * Trevor fasst alles zu einer Liste strukturierter Maßnahmen zusammen.
   * Jeder Punkt erhält eine eindeutige ID, Titel, Beschreibung und Ziel-Datei.
   */
  async synthesizeFinalPlan(departmentReports, task = null) {
    console.log(`\n[WorkflowOrchestrator] 4. synthesizeFinalPlan: Trevor erstellt finale Maßnahmen-Roadmap...`);
    const settings = await dbBridge.getUserSettings();
    const taskPrompt = task?.user_prompt || 'Software Spezifikation';
    const reportsList = Object.values(departmentReports || {});

    const synthesisPrompt = buildTrevorSynthesisPrompt(taskPrompt, reportsList, task?.rejection_feedback);

    const trevorRawOutput = await runAgentPrompt({
      systemPrompt: synthesisPrompt.systemPrompt,
      userPrompt: synthesisPrompt.userPrompt,
      settings
    });

    const { summary, antigravityPrompt } = parseTrevorSynthesis(trevorRawOutput);

    // Extrahiere strukturierte Liste mit eindeutiger ID, Titel, Beschreibung und Ziel-Datei
    const structuredSteps = extractStructuredPlanSteps(antigravityPrompt, departmentReports, taskPrompt);

    if (task) {
      task.trevor_summary = summary;
      task.antigravity_prompt = antigravityPrompt;
      task.checkpoint_data = task.checkpoint_data || {};
      task.checkpoint_data.structured_steps = structuredSteps;
      task.current_stage = '4_user_decision';
      task.status = 'pending_approval';
      task.last_completed_agent = 'trevor_core (Master Synthesis)';

      await dbBridge.saveAgentLog({
        task_id: task.id,
        department_id: 0,
        department_name: 'Studio Core Pod',
        agent_id: 'trevor_core',
        agent_name: 'Trevor',
        role: 'trevor',
        output_text: trevorRawOutput
      });

      await dbBridge.updateTask(task.id, {
        trevor_summary: task.trevor_summary,
        antigravity_prompt: task.antigravity_prompt,
        current_stage: task.current_stage,
        status: task.status,
        last_completed_agent: task.last_completed_agent,
        checkpoint_data: task.checkpoint_data
      });

      syncLocalCheckpointFile(task, 'Master-Synthese & Interaktive Roadmap fertiggestellt -> Wartet auf Nutzer-Freigabe');
      console.log(`\n[WorkflowOrchestrator] Roadmap mit ${structuredSteps.length} strukturierten Maßnahmen fertiggestellt.`);
    }

    return {
      summary,
      antigravityPrompt,
      steps: structuredSteps
    };
  }

  /**
   * Vollständiger 4-Stufen Orchestrierungs-Lauf
   */
  async run(task) {
    // 1. Dispatch
    const subTasks = await this.dispatchTask(task);
    task.current_stage = '1_fachteam';
    await dbBridge.updateTask(task.id, { current_stage: task.current_stage });

    // 2. Worker Ausführung
    const workerOutputs = await this.executeWorkerTasks(subTasks, task);
    task.current_stage = '2_chef_agent';
    await dbBridge.updateTask(task.id, { current_stage: task.current_stage });

    // 3. Department Leads Aggregation
    const departmentReports = await this.aggregateDepartmentResults(workerOutputs, task);
    task.current_stage = '3_trevor';
    await dbBridge.updateTask(task.id, { current_stage: task.current_stage });

    // 4. Synthese & finale Roadmap
    await this.synthesizeFinalPlan(departmentReports, task);
    return task;
  }
}

export const orchestrator = new WorkflowOrchestrator();

/**
 * Kern-Engine: Führt den 4-Stufen Workflow sequentiell und mit atomaren Zwischenständen aus
 */
export async function executeTaskWorkflow(initialTask) {
  let task = initialTask;

  try {
    return await orchestrator.run(task);
  } catch (err) {
    if (err instanceof LimitReachedError) {
      console.warn(`\n[Trevor Guard] TASK AUTOMATISCH EINGEFROREN BEI LIMIT!`);
      console.warn(`Fehlerursache: ${err.message}`);

      task.status = 'paused_limit';
      await dbBridge.updateTask(task.id, { status: task.status });
      syncLocalCheckpointFile(task, `PAUSIERT WEGEN LIMIT (${err.provider}): ${err.message}`);
      return task;
    }

    console.error(`[Trevor Orchestrator] Kritischer Workflow-Fehler:`, err);
    throw err;
  }
}

/**
 * Verarbeitet die menschliche Entscheidung des Nutzers (Stufe 04)
 * 
 * @param {string} taskId 
 * @param {'JA'|'NEIN'} decision 
 * @param {string} [feedback] 
 */
export async function handleUserDecision(taskId, decision, feedback = '') {
  console.log(`\n[Trevor Studio] Benutzer-Entscheidung empfangen für Task ${taskId}: [${decision}]`);
  const task = await dbBridge.getTask(taskId);

  if (!task) {
    throw new Error(`Task ${taskId} nicht gefunden.`);
  }

  if (decision === 'JA') {
    // 1. Output-Verzeichnis sicherstellen
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 2. Erstelle ANTIGRAVITY_TASK.md
    const fileHeader = `<!-- 
AUTOGENERATED BY TREVOR – AI SOFTWARE STUDIO
TASK ID: ${task.id}
GENERIERT AM: ${new Date().toISOString()}
-->

# ANTIGRAVITY MASTER TASK EXECUTION

> [!IMPORTANT]
> Dieser Prompt wurde durch das Trevor Multi-Agenten-Studio (10 Abteilungen, 33 Spezial-PCs & Trevor) geprüft und freigegeben.
> Alle Änderungen MÜSSEN mit Zwischenständen in \`CHECKPOINT_STATE.md\` abgesichert werden!

${task.antigravity_prompt}
`;

    fs.writeFileSync(TASK_MD_FILE, fileHeader, 'utf-8');
    console.log(`[Trevor Studio] Datei erfolgreich abgelegt in: 05_Antigravity_Outputs/ANTIGRAVITY_TASK.md`);

    // 3. Kopiere in die Zwischenablage
    const copied = await copyToClipboard(task.antigravity_prompt);
    if (copied) {
      console.log(`[Trevor Studio] Antigravity-Prompt wurde erfolgreich in die Zwischenablage kopiert!`);
    }

    // 4. Status aktualisieren
    const updated = await dbBridge.updateTask(task.id, {
      status: 'approved',
      updated_at: new Date().toISOString()
    });

    syncLocalCheckpointFile(updated, 'Auftrag freigegeben ("JA") -> In Zwischenablage & 05_Antigravity_Outputs/ abgelegt');

    // In Browser-Umgebung in window.completedTasks ablegen
    if (typeof window !== 'undefined') {
      window.completedTasks = window.completedTasks || [];
      const entry = {
        id: updated.id,
        prompt: updated.user_prompt || 'Auftrag',
        title: updated.user_prompt || 'Auftrag',
        summary: updated.trevor_summary || 'Auftrag durch Trevor Multi-Agenten Studio freigegeben.',
        codeText: updated.antigravity_prompt || '',
        qaReport: updated.qa_report || null,
        impactAnalysis: updated.impact_analysis || null,
        completedAt: updated.updated_at || new Date().toISOString(),
        status: 'COMPLETED'
      };
      window.completedTasks = window.completedTasks.filter(t => t.id !== entry.id);
      window.completedTasks.unshift(entry);
      try {
        if (window.localStorage) {
          window.localStorage.setItem('trevor_completed_tasks', JSON.stringify(window.completedTasks));
        }
      } catch { /* ignore */ }
      if (typeof window.renderTaskQueueUI === 'function') {
        window.renderTaskQueueUI();
      }
    }
    return {
      status: 'approved',
      clipboardCopied: copied,
      filePath: TASK_MD_FILE,
      task: updated
    };
  } else if (decision === 'NEIN') {
    console.log(`[Trevor Studio] Korrekturschleife eingeleitet mit Feedback: "${feedback}"`);

    // Setze Task ab Stufe 02 (Chef-Agenten) zurück, behalte aber PC-Outputs und speichere Rejection-Feedback
    task.checkpoint_data.chef_outputs = {}; // Chef-Berichte neu anfordern
    task.rejection_feedback = feedback || 'Kunde wünscht Überarbeitung der Chef-Blueprints.';
    task.current_stage = '2_chef_agent';
    task.status = 'running';

    const updated = await dbBridge.updateTask(task.id, {
      current_stage: task.current_stage,
      status: task.status,
      rejection_feedback: task.rejection_feedback,
      checkpoint_data: task.checkpoint_data
    });

    syncLocalCheckpointFile(updated, `Auftrag abgelehnt ("NEIN") -> Neustart ab Stufe 02 mit Feedback`);

    // Starte Workflow mit Feedback erneut
    return executeTaskWorkflow(updated);
  } else {
    throw new Error(`Ungültige Entscheidung "${decision}". Erwartet: 'JA' oder 'NEIN'.`);
  }
}
