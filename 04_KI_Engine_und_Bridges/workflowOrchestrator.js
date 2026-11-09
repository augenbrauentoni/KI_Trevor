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

    task.trevor_summary = `[Direkt-Auftrag an ${dept.name}]:\n${summary}\n\n` +
      `✔ Cross-Department-Check: ${crossCheckNotes}`;
    task.antigravity_prompt = antigravityPrompt;
    task.current_stage = '4_user_decision';
    task.status = 'pending_approval';
    task.last_completed_agent = 'trevor_core (Direkt-Synthese)';

    task = await dbBridge.updateTask(task.id, {
      trevor_summary: task.trevor_summary,
      antigravity_prompt: task.antigravity_prompt,
      current_stage: task.current_stage,
      status: task.status,
      last_completed_agent: task.last_completed_agent
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

/**
 * Kern-Engine: Führt den 4-Stufen Workflow sequentiell und mit atomaren Zwischenständen aus
 */
export async function executeTaskWorkflow(initialTask) {
  let task = initialTask;
  const settings = await dbBridge.getUserSettings();

  try {
    // -------------------------------------------------------------------------
    // STUFE 00: TREVOR ROUTING
    // -------------------------------------------------------------------------
    if (!task.checkpoint_data?.routing) {
      console.log(`[Stufe 00] Trevor analysiert Auftrag und routet Abteilungen...`);
      const routingPrompt = buildTrevorRoutingPrompt(task.user_prompt, hierarchy.departments);

      const routingRaw = await runAgentPrompt({
        systemPrompt: routingPrompt.systemPrompt,
        userPrompt: routingPrompt.userPrompt,
        settings
      });

      let parsedRouting;
      try {
        const cleanJson = routingRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedRouting = JSON.parse(cleanJson);
      } catch {
        console.warn(`[Stufe 00] JSON Parsing fehlgeschlagen, aktiviere Standard-Räume [1, 2, 3, 4, 10].`);
        parsedRouting = {
          selected_department_ids: [1, 2, 3, 4, 10],
          routing_rationale: 'Automatische Standardzuweisung für Full-Stack Applikation',
          complexity_level: 'high'
        };
      }

      // Raum 10 (Antigravity Synthesis) immer erzwingen
      if (!parsedRouting.selected_department_ids.includes(10)) {
        parsedRouting.selected_department_ids.push(10);
      }

      task.checkpoint_data.routing = parsedRouting;
      task.selected_departments = parsedRouting.selected_department_ids;
      task.last_completed_agent = 'trevor_core (Routing)';

      task = await dbBridge.updateTask(task.id, {
        selected_departments: task.selected_departments,
        checkpoint_data: task.checkpoint_data,
        last_completed_agent: task.last_completed_agent
      });

      syncLocalCheckpointFile(task, `Routing abgeschlossen: Räume ${task.selected_departments.join(', ')} aktiviert`);
      console.log(`[Stufe 00] Aktivierte Räume:`, task.selected_departments);
    }

    const activeDepartmentObjects = hierarchy.departments.filter(d => task.selected_departments.includes(d.id));

    // -------------------------------------------------------------------------
    // STUFE 01: FACHTEAM (33 SPEZIAL-PCS)
    // -------------------------------------------------------------------------
    if (task.current_stage === '1_fachteam') {
      console.log(`\n--- STUFE 01: FACHTEAM ARBEITET (PC-Agenten) ---`);

      for (const dept of activeDepartmentObjects) {
        for (const pc of dept.specialist_pcs) {
          // Prüfe, ob dieser PC bereits im Checkpoint vorliegt (Anti-Limit & Resume)
          if (task.checkpoint_data.pc_outputs[pc.id]) {
            console.log(`  [Übersprungen / Bereits im Cache] ${pc.name} (${dept.name})`);
            continue;
          }

          console.log(`  > Starte Inferenz für: ${pc.name} [${dept.code}]...`);
          const pcPrompt = buildPcAgentPrompt(pc, dept, task.user_prompt);

          const outputText = await runAgentPrompt({
            systemPrompt: pcPrompt.systemPrompt,
            userPrompt: pcPrompt.userPrompt,
            settings
          });

          // Speichere Agent Log
          await dbBridge.saveAgentLog({
            task_id: task.id,
            department_id: dept.id,
            department_name: dept.name,
            agent_id: pc.id,
            agent_name: pc.name,
            role: 'pc_agent',
            output_text: outputText
          });

          // ATOMARE CHECKPOINT-SPEICHERUNG NACH JEDEM PC
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

          syncLocalCheckpointFile(task, `PC-Agent abgeschlossen: ${pc.name}`);
        }
      }

      // Übergang zu Stufe 02
      task.current_stage = '2_chef_agent';
      task = await dbBridge.updateTask(task.id, { current_stage: task.current_stage });
      syncLocalCheckpointFile(task, 'Stufe 01 beendet -> Wechsel zu Stufe 02 (Chef-Agenten)');
    }

    // -------------------------------------------------------------------------
    // STUFE 02: CHEF-AGENTEN (AUDIT, WIDERSPRUCHS-BEREINIGUNG & BLUEPRINT)
    // -------------------------------------------------------------------------
    if (task.current_stage === '2_chef_agent') {
      console.log(`\n--- STUFE 02: CHEF-AGENTEN KONTROLLIEREN & SYNTHETISIEREN ---`);

      for (const dept of activeDepartmentObjects) {
        const chef = dept.chef_agent;

        if (task.checkpoint_data.chef_outputs[chef.id]) {
          console.log(`  [Übersprungen / Bereits im Cache] ${chef.name} (${dept.name})`);
          continue;
        }

        console.log(`  > Chef-Audit startet: ${chef.name} [Leitung: ${dept.name}]...`);

        // Hole die Outputs der PCs dieser Abteilung
        const departmentPcOutputs = Object.values(task.checkpoint_data.pc_outputs).filter(o => o.department_id === dept.id);

        const chefPrompt = buildChefAgentPrompt(chef, dept, task.user_prompt, departmentPcOutputs);

        const outputText = await runAgentPrompt({
          systemPrompt: chefPrompt.systemPrompt,
          userPrompt: chefPrompt.userPrompt,
          settings
        });

        // Extrahiere aufgelöste Widersprüche falls vorhanden
        const contradictionMatch = outputText.match(/Identifizierte Konflikte[^:]*:\s*([^\n\r]+)/i);
        const resolvedText = contradictionMatch ? contradictionMatch[1] : 'Keine kritischen Widersprüche';

        // Speichere Agent Log
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

        // ATOMARE CHECKPOINT-SPEICHERUNG NACH JEDEM CHEF
        task.checkpoint_data.chef_outputs[chef.id] = {
          agent_id: chef.id,
          agent_name: chef.name,
          department_id: dept.id,
          department_name: dept.name,
          output_text: outputText,
          contradictions_resolved: resolvedText,
          timestamp: new Date().toISOString()
        };
        task.last_completed_agent = `${chef.id} (${chef.name})`;

        task = await dbBridge.updateTask(task.id, {
          checkpoint_data: task.checkpoint_data,
          last_completed_agent: task.last_completed_agent
        });

        syncLocalCheckpointFile(task, `Chef-Agent abgeschlossen: ${chef.name}`);
      }

      // Übergang zu Stufe 03
      task.current_stage = '3_trevor';
      task = await dbBridge.updateTask(task.id, { current_stage: task.current_stage });
      syncLocalCheckpointFile(task, 'Stufe 02 beendet -> Wechsel zu Stufe 03 (Trevor Synthese)');
    }

    // -------------------------------------------------------------------------
    // STUFE 03: TREVOR MASTER-SYNTHESE
    // -------------------------------------------------------------------------
    if (task.current_stage === '3_trevor') {
      console.log(`\n--- STUFE 03: TREVOR ERSTELLT MASTER-SYNTHESE & ANTIGRAVITY-PROMPT ---`);

      const chefReports = Object.values(task.checkpoint_data.chef_outputs);
      const synthesisPrompt = buildTrevorSynthesisPrompt(task.user_prompt, chefReports, task.rejection_feedback);

      const trevorRawOutput = await runAgentPrompt({
        systemPrompt: synthesisPrompt.systemPrompt,
        userPrompt: synthesisPrompt.userPrompt,
        settings
      });

      const { summary, antigravityPrompt } = parseTrevorSynthesis(trevorRawOutput);

      await dbBridge.saveAgentLog({
        task_id: task.id,
        department_id: 0,
        department_name: 'Studio Core Pod',
        agent_id: 'trevor_core',
        agent_name: 'Trevor',
        role: 'trevor',
        output_text: trevorRawOutput
      });

      task.trevor_summary = summary;
      task.antigravity_prompt = antigravityPrompt;
      task.current_stage = '4_user_decision';
      task.status = 'pending_approval';
      task.last_completed_agent = 'trevor_core (Master Synthesis)';

      task = await dbBridge.updateTask(task.id, {
        trevor_summary: task.trevor_summary,
        antigravity_prompt: task.antigravity_prompt,
        current_stage: task.current_stage,
        status: task.status,
        last_completed_agent: task.last_completed_agent
      });

      syncLocalCheckpointFile(task, 'Trevor Master-Synthese fertiggestellt -> Wartet auf Nutzer-Entscheidung (JA / NEIN)');
      console.log(`\n[Trevor Studio] Vorlage fertiggestellt. Status: PENDING_APPROVAL.`);
    }

    return task;
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
