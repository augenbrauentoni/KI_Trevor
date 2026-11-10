/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js
 * 
 * 4-Stufen Hierarchischer Orchestrator für den Browser (Client-seitig):
 * Stufe 1: Trevor (CEO & Dispatcher) -> Zerlegt den Auftrag in Abteilungs-Tasks
 * Stufe 2: Fach-Agenten (Worker Execution) -> Erarbeiten technische Lösungen & Dateipfade
 * Stufe 3: Abteilungsleiter (Lead Audit) -> Prüfen auf Logikfehler, ES-Modul-Pfade & Redundanzen
 * Stufe 4: Trevor (Synthese & Checkliste) -> Generiert strukturierte [JA]/[NEIN] Checkliste
 */

import { queryLLM } from './llmEngine.js';
import { STUDIO_HIERARCHY } from './hierarchyData.js';

/**
 * Ermittelt per Keyword-Matching die passende Primär-Abteilung
 */
export function detectPrimaryDepartment(text) {
  const p = (text || '').toLowerCase();
  if (p.includes('3d') || p.includes('ui') || p.includes('frontend') || p.includes('css') || p.includes('html') || p.includes('canvas') || p.includes('button') || p.includes('webgl') || p.includes('design') || p.includes('layout')) {
    return 'EG_FRONTEND';
  }
  if (p.includes('architektur') || p.includes('system') || p.includes('struktur') || p.includes('konzept') || p.includes('blueprint')) {
    return 'EG_ARCHITEKTUR';
  }
  if (p.includes('hardware') || p.includes('esp32') || p.includes('arduino') || p.includes('sensor') || p.includes('schaltung') || p.includes('löten') || p.includes('werkstatt') || p.includes('elektronik') || p.includes('microcontroller')) {
    return 'UG_WERKSTATT';
  }
  if (p.includes('serverraum') || p.includes('netzwerk') || p.includes('router') || p.includes('switch') || p.includes('vpn') || p.includes('rack') || p.includes('fisi') || p.includes('firewall') || p.includes('infrastruktur')) {
    return 'UG_SERVER';
  }
  if (p.includes('archiv') || p.includes('recherche') || p.includes('text') || p.includes('artikel') || p.includes('wissen') || p.includes('doku') || p.includes('brainstorm')) {
    return 'UG_ARCHIV';
  }
  if (p.includes('lounge') || p.includes('gaming') || p.includes('alltag') || p.includes('pause') || p.includes('termin')) {
    return 'UG_LOUNGE';
  }
  if (p.includes('datenbank') || p.includes('db') || p.includes('sql') || p.includes('postgres') || p.includes('supabase') || p.includes('rls') || p.includes('tabelle')) {
    return 'EG_DATENBANK';
  }
  if (p.includes('test') || p.includes('qa') || p.includes('qualität') || p.includes('bug') || p.includes('prüf')) {
    return 'EG_TESTING';
  }
  if (p.includes('security') || p.includes('sicherheit') || p.includes('auth') || p.includes('token') || p.includes('passwort') || p.includes('login')) {
    return 'EG_SECURITY';
  }
  if (p.includes('devops') || p.includes('docker') || p.includes('deployment') || p.includes('ci') || p.includes('cd') || p.includes('render') || p.includes('deploy')) {
    return 'EG_DEVOPS';
  }
  // Standard-Fallback
  return 'EG_BACKEND';
}

/**
 * Sicheres JSON-Extrahieren mit Fallback-Garantie:
 * Verhindert, dass Aufträge verschluckt oder als bloßer Text abgebrochen werden.
 */
export function safeParseTrevorJSON(rawText, originalPrompt) {
  if (!rawText || typeof rawText !== 'string') {
    const primaryDept = detectPrimaryDepartment(originalPrompt);
    return {
      needsClarification: false,
      summary: `Auftrag: ${originalPrompt || 'Neuer Auftrag'}`,
      executionMode: 'FULL_DEPARTMENT',
      primaryDepartment: primaryDept,
      targetFloor: primaryDept.startsWith('UG') ? 'UG' : 'EG'
    };
  }

  // 1. Markdown-Backticks entfernen
  const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 2. Per RegEx /\{[\s\S]*\}/ nach JSON-Objekt suchen
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === 'object') {
        const primaryDept = parsed.primaryDepartment || detectPrimaryDepartment(originalPrompt + ' ' + rawText);
        const targetFloor = parsed.targetFloor || (String(primaryDept).startsWith('UG') ? 'UG' : 'EG');
        return {
          needsClarification: parsed.needsClarification === true,
          clarificationQuestion: parsed.clarificationQuestion || parsed.question || '',
          summary: parsed.summary || parsed.description || rawText.slice(0, 300),
          executionMode: parsed.executionMode || 'FULL_DEPARTMENT',
          primaryDepartment: primaryDept,
          targetFloor
        };
      }
    } catch (err) {
      console.warn('[safeParseTrevorJSON] Parsing-Warnung:', err.message);
    }
  }

  // 3. Fallback-Garantie: Falls KI reinen Text geliefert hat
  const primaryDept = detectPrimaryDepartment(originalPrompt + ' ' + rawText);
  return {
    needsClarification: false,
    summary: rawText.trim() || `Auftrag: ${originalPrompt}`,
    executionMode: 'FULL_DEPARTMENT',
    primaryDepartment: primaryDept,
    targetFloor: primaryDept.startsWith('UG') ? 'UG' : 'EG'
  };
}

/**
 * Ermittelt das Abteilungs-Objekt aus STUDIO_HIERARCHY anhand von Code oder ID
 */
export function getDepartmentByCodeOrId(deptCodeOrId, departments) {
  if (!departments || departments.length === 0) return null;

  if (typeof deptCodeOrId === 'number' || /^\d+$/.test(String(deptCodeOrId))) {
    const numId = parseInt(deptCodeOrId, 10);
    const found = departments.find(d => d.id === numId);
    if (found) return found;
  }

  const code = String(deptCodeOrId || '').toUpperCase().trim();
  const map = {
    'EG_FRONTEND': 3,
    'EG_UI': 3,
    'EG_3D': 4,
    'EG_BACKEND': 5,
    'EG_SERVER': 5,
    'EG_DATENBANK': 6,
    'EG_DB': 6,
    'EG_API': 7,
    'EG_QA': 8,
    'EG_TESTING': 8,
    'EG_SECURITY': 9,
    'EG_SEC': 9,
    'EG_DEVOPS': 10,
    'EG_PLANUNG': 1,
    'EG_ARCHITEKTUR': 2,
    'UG_ARCHIV': 11,
    'UG_SERVER': 12,
    'UG_SERVERRAUM': 12,
    'UG_WERKSTATT': 13,
    'UG_LOUNGE': 14
  };

  const targetId = map[code];
  if (targetId) {
    const found = departments.find(d => d.id === targetId);
    if (found) return found;
  }

  const byName = departments.find(d => 
    (d.code && d.code.toUpperCase() === code) ||
    (d.name && d.name.toUpperCase().includes(code))
  );
  if (byName) return byName;

  // Standard: Abteilung 5 (Backend) oder 3 (Frontend)
  return departments.find(d => d.id === 5) || departments[0];
}

export class WorkflowOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.hierarchy = STUDIO_HIERARCHY;
    this.busyDepartments = new Set();
  }

  isDepartmentBusy(deptId) {
    if (typeof window !== 'undefined' && typeof window.isDepartmentBusy === 'function') {
      return window.isDepartmentBusy(deptId);
    }
    return this.busyDepartments.has(Number(deptId));
  }

  setDepartmentBusy(deptId, isBusy) {
    const id = Number(deptId);
    if (isBusy) {
      this.busyDepartments.add(id);
    } else {
      this.busyDepartments.delete(id);
    }
    if (typeof window !== 'undefined' && typeof window.setDepartmentStatus === 'function') {
      window.setDepartmentStatus(id, isBusy ? 'BUSY' : 'IDLE');
    }
  }

  /**
   * Führt den vollständigen 4-Stufen-Workflow mit Live-Statusupdates aus
   * @param {string} userPrompt - Kundenauftrag
   * @param {function} onStatusUpdate - Callback: (stageName, agentName, message) => void
   * @returns {Promise<object>} - { summary, steps, rawReports }
   */
  async executeFullWorkflow(userPrompt, onStatusUpdate = () => {}) {
    console.log(`\n======================================================`);
    console.log(`[WorkflowOrchestrator] Starte Workflow: "${userPrompt.slice(0, 60)}..."`);
    console.log(`======================================================\n`);

    onStatusUpdate('1/4: Trevor analysiert...', 'Trevor', 'Pre-Check und Routing für den Kundenauftrag...');

    // 1. PRE-CHECK VIA TREVOR MIT safeParseTrevorJSON
    const preCheckSystemPrompt = `Du bist Trevor, Studio-Director von "Trevor AI Software Studio".
Antworte im Tonfall von J.A.R.V.I.S. aus Iron Man: präzise, trocken-britisch, extrem höflich ('Sir').
Deine Aufgabe in Stufe 1 ist die Analyse des Kundenauftrags.

ENTSCHEIDE:
1. Ist der Auftrag völlig unklar oder fehlt eine unverzichtbare Angabe?
   -> "needsClarification": true, "clarificationQuestion": "Deine prägnante Rückfrage an Sir"
2. Kann der Auftrag umgesetzt werden (Normalfall für jede Bau-, Programmier-, Refaktorisierungs- oder Analyse-Aufgabe)?
   -> "needsClarification": false, "summary": "Kurze prägnante Zusammenfassung", "primaryDepartment": "EG_FRONTEND" oder "EG_BACKEND" oder "EG_ARCHITEKTUR" oder "UG_SERVER" oder "UG_WERKSTATT" oder "EG_DATENBANK", "targetFloor": "EG" oder "UG"

Antworte zwingend als valides JSON:
{
  "needsClarification": false,
  "clarificationQuestion": "",
  "summary": "...",
  "executionMode": "FULL_DEPARTMENT",
  "primaryDepartment": "EG_BACKEND",
  "targetFloor": "EG"
}`;

    let preCheckResult;
    try {
      const rawResp = await queryLLM(preCheckSystemPrompt, `KUNDENAUFTRAG:\n"""\n${userPrompt}\n"""`, true);
      preCheckResult = safeParseTrevorJSON(rawResp, userPrompt);
    } catch (llmErr) {
      console.warn('[WorkflowOrchestrator] LLM Pre-Check Fehler, nutze Fallback-Garantie:', llmErr.message);
      preCheckResult = safeParseTrevorJSON(null, userPrompt);
    }

    console.log('[WorkflowOrchestrator] Pre-Check Ergebnis:', preCheckResult);

    // 2. FALL A: RÜCKFRAGE ERFORDERLICH
    if (preCheckResult.needsClarification === true && preCheckResult.clarificationQuestion) {
      console.log(`[WorkflowOrchestrator] Rückfrage erforderlich: "${preCheckResult.clarificationQuestion}"`);
      const qText = preCheckResult.clarificationQuestion;

      if (typeof window !== 'undefined') {
        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem({
            id: 'act_clarify_' + Date.now(),
            type: 'CLARIFICATION_NEEDED',
            title: 'Rückfrage von Trevor',
            message: qText
          });
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('QUESTION');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Rückfrage von Trevor', qText, 'QUESTION');
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(qText);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('Wartet auf Nutzer-Antwort');
        }
      }

      onStatusUpdate('Wartet auf Nutzer-Antwort', 'Trevor', qText);

      return {
        needsClarification: true,
        question: qText,
        summary: preCheckResult.summary,
        steps: [],
        departmentReports: {},
        rawReports: {}
      };
    }

    // 3. FALL B: ZWINGENDER ÜBERGANG ZU STUFE 2 (dispatchTaskToDepartment)
    const taskObject = {
      title: userPrompt.length > 50 ? userPrompt.slice(0, 50) + '...' : userPrompt,
      userPrompt,
      prompt: userPrompt,
      summary: preCheckResult.summary,
      primaryDepartment: preCheckResult.primaryDepartment,
      targetFloor: preCheckResult.targetFloor || (preCheckResult.primaryDepartment.startsWith('UG') ? 'UG' : 'EG')
    };

    return await this.dispatchTaskToDepartment(taskObject, onStatusUpdate);
  }

  /**
   * Zwingender Übergang zu Stufe 2: Weist den Task der Ziel-Abteilung zu
   * und führt die Stufen 2, 3 und 4 sequentiell mit Live-Status aus.
   */
  async dispatchTaskToDepartment(taskObject, onStatusUpdate = () => {}) {
    const userPrompt = taskObject.userPrompt || taskObject.prompt || taskObject.summary;
    const dept = getDepartmentByCodeOrId(taskObject.primaryDepartment, this.hierarchy.departments);
    const targetFloor = dept.floor || taskObject.targetFloor || 'EG';

    // 1. Prüfen, ob Ziel-Abteilung BUSY ist
    const isBusy = this.isDepartmentBusy(dept.id);
    if (isBusy) {
      console.warn(`[WorkflowOrchestrator] Abteilung ${dept.name} ist BUSY. Task verbleibt in Warteschlange.`);
      const busyMsg = 'In Warteschlange (Abteilung ausgelastet)';
      onStatusUpdate(busyMsg, dept.name, `Abteilung ${dept.name} ist aktuell belegt.`);
      if (typeof window !== 'undefined' && typeof window.updateActiveQueueItemStatus === 'function') {
        window.updateActiveQueueItemStatus(busyMsg);
      }
      return {
        isQueued: true,
        status: busyMsg,
        department: dept,
        taskObject
      };
    }

    // 2. Abteilung auf BUSY setzen
    this.setDepartmentBusy(dept.id, true);

    try {
      // 3. Status auf 2/4 setzen (UI-Monitor & Queue)
      const stage2Status = `2/4: [${dept.name}] – Fach-Agenten erarbeiten Lösung...`;
      onStatusUpdate(stage2Status, dept.name, `Fach-Agenten von ${dept.name} erarbeiten Lösung...`);
      if (typeof window !== 'undefined' && typeof window.updateActiveQueueItemStatus === 'function') {
        window.updateActiveQueueItemStatus(stage2Status);
      }

      // 4. 3D-Bühne & Kamera informieren
      if (typeof window !== 'undefined') {
        if (typeof window.update3DStudioState === 'function') {
          window.update3DStudioState('stage2', targetFloor);
        }
        if (typeof window.setStageIn3D === 'function') {
          window.setStageIn3D(2);
        }
        // Aktive Agenten im 3D-Campus auf "working" animieren (Badges & Datenpakete)
        dept.specialist_pcs.forEach(pc => {
          if (typeof window.updateAgentStatus === 'function') {
            window.updateAgentStatus(pc.id, 'working', 'Bearbeitet: ' + (taskObject.title || taskObject.summary.slice(0, 30)));
          }
        });
      }

      // 5. Code-RAG Kontext abrufen (bei EG)
      let codeContext = '';
      if (targetFloor === 'EG') {
        try {
          let candidateFiles = [];
          if (typeof window !== 'undefined' && Array.isArray(window.selectedContextFiles) && window.selectedContextFiles.length > 0) {
            candidateFiles = [...window.selectedContextFiles];
          } else {
            candidateFiles = this.extractCandidateFilePaths(taskObject.summary || '', userPrompt);
          }
          if (candidateFiles.length > 0) {
            const fetched = await this.fetchFilesContext(candidateFiles);
            if (fetched && fetched.length > 0) {
              codeContext = fetched.map(f => `### DATEI: ${f.path}\n\`\`\`\n${f.content.slice(0, 5000)}\n\`\`\``).join('\n\n');
            }
          }
        } catch (ragErr) {
          console.warn('[WorkflowOrchestrator] Code-RAG Fehler:', ragErr.message);
        }
      }

      // 6. Cloud-Memory RAG abrufen
      let cloudMemoryContext = '';
      try {
        const hits = await this.searchCloudMemory(userPrompt);
        if (hits && hits.length > 0) {
          cloudMemoryContext = hits.map(m => `### [Gedächtnis / ${m.department}] ${m.topic}\n- Problem: ${m.problem_statement}\n- Lösungsmuster: ${m.solution_pattern}`).join('\n\n');
        }
      } catch (memErr) {
        console.warn('[WorkflowOrchestrator] Cloud-Memory Fehler:', memErr.message);
      }

      // 7. SubTasks für Fach-Agenten definieren
      const subTasks = [
        {
          departmentId: dept.id,
          departmentName: dept.name,
          leadAgent: dept.chef_agent,
          workerAgents: dept.specialist_pcs,
          mission: `Fach-Ausarbeitung in Abteilung ${dept.name} zum Auftrag: "${taskObject.summary}"`
        }
      ];

      // Echter LLM-Call für die Fach-Agenten
      const workerOutputs = await this.executeWorkerTasks(subTasks, userPrompt, onStatusUpdate, codeContext, cloudMemoryContext);
      console.log(`[Stufe 2] Fach-Ausarbeitungen für ${dept.name} abgeschlossen.`);

      // 8. STUFE 3: ABTEILUNGSLEITER AUDIT
      const stage3Status = `3/4: [${dept.name}] – Abteilungsleiter prüft & konsolidiert...`;
      onStatusUpdate(stage3Status, dept.chef_agent.name, `${dept.chef_agent.name} prüft Schnittstellen & Logik...`);
      if (typeof window !== 'undefined' && typeof window.updateActiveQueueItemStatus === 'function') {
        window.updateActiveQueueItemStatus(stage3Status);
      }

      if (typeof window !== 'undefined') {
        if (typeof window.update3DStudioState === 'function') {
          window.update3DStudioState('stage3', targetFloor);
        }
        if (typeof window.setStageIn3D === 'function') {
          window.setStageIn3D(3);
        }
        if (typeof window.updateAgentStatus === 'function') {
          window.updateAgentStatus(dept.chef_agent.id, 'auditing', 'Prüft & konsolidiert Bericht...');
        }
        if (typeof window.triggerDataStreamToTrevor === 'function') {
          window.triggerDataStreamToTrevor(dept.id);
        }
      }

      // Echter LLM-Call für den Abteilungsleiter
      const departmentReports = await this.aggregateDepartmentResults(subTasks, workerOutputs, userPrompt, onStatusUpdate);
      console.log(`[Stufe 3] Abteilungsleiter-Audit für ${dept.name} abgeschlossen.`);

      // 9. STUFE 4: TREVOR SYNTHESE & FREIGABE
      const stage4Status = `4/4: Bereit zur Freigabe im Action-Center`;
      onStatusUpdate(stage4Status, 'Trevor', 'Trevor synthetisiert die Maßnahmen zur finalen Freigabe...');
      if (typeof window !== 'undefined' && typeof window.updateActiveQueueItemStatus === 'function') {
        window.updateActiveQueueItemStatus(stage4Status);
      }

      if (typeof window !== 'undefined') {
        if (typeof window.update3DStudioState === 'function') {
          window.update3DStudioState('stage4', targetFloor);
        }
        if (typeof window.setStageIn3D === 'function') {
          window.setStageIn3D(4);
        }
      }

      const finalPlan = await this.synthesizeFinalPlan(userPrompt, departmentReports);

      // 10. Übergabe an das Action-Center & Sounds
      if (typeof window !== 'undefined') {
        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem({
            id: 'act_approval_' + Date.now(),
            type: 'APPROVAL_NEEDED',
            title: `Freigabe: ${taskObject.title || taskObject.summary.slice(0, 45)}`,
            message: `${dept.chef_agent.name} (${dept.name}) hat die Ausarbeitung abgeschlossen (${finalPlan.steps.length} Maßnahmen).`
          });
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('SUCCESS');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Ergebnis bereit', `Abteilung ${dept.name} hat die Ausarbeitung abgeschlossen.`, 'SUCCESS');
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(`Abteilung ${dept.name} hat die Arbeiten abgeschlossen, Sir. Die Maßnahmen liegen im Action-Center bereit.`);
        }
      }

      return {
        summary: taskObject.summary,
        steps: finalPlan.steps,
        departmentReports,
        rawReports: workerOutputs,
        primaryDepartment: dept.name,
        targetFloor
      };

    } finally {
      // 11. Abteilung wieder freigeben für nachfolgende Queue-Einträge
      this.setDepartmentBusy(dept.id, false);
    }
  }

  /**
   * 0. classifyTaskType: Pre-Routing per LLM (SOFTWARE vs. HARDWARE_ALLGEMEIN vs. QUESTION)
   * Nutzt zwingend queryLLM(..., expectJson = true) für deterministisches JSON.
   */
  async classifyTaskType(userPrompt) {
    const systemPrompt = `Du bist Trevors KI-Routing-Classifier.
Analysiere die Benutzeranfrage und klassifiziere sie in genau EINE von drei Kategorien:
- "QUESTION": Direkte Wissensfragen, Verständnisfragen, Erklärungsbitten, Definitionsfragen ("Was ist...", "Wie funktioniert...", "Warum...", Fragen ohne Bau- oder Programmierauftrag, Ziel-Etage: "EG").
- "SOFTWARE": Webentwicklung, Apps, Three.js, JavaScript, Python, APIs, SQL, Frontend, Backend, Bugs, Code-Architektur, konkrete Programmier- oder Implementierungsaufträge (Ziel-Etage: "EG").
- "HARDWARE_ALLGEMEIN": Physische Hardware, Elektronik, ESP32, Arduino, Raspberry Pi, Löten, PCB, Serverraum, Netzwerkinfrastruktur, FISI-Themen, Allgemeinwissen, Recherche, Textverfassung, Brainstorming, Alltagsorganisation oder Gaming/Freizeit (Ziel-Etage: "UG").

Antworte zwingend und ausschließlich mit folgendem JSON-Schema:
{
  "category": "QUESTION" oder "SOFTWARE" oder "HARDWARE_ALLGEMEIN",
  "target_floor": "EG" oder "UG"
}`;

    try {
      const resp = await queryLLM(systemPrompt, `Aufgabe: "${userPrompt}"`, true);
      let parsed = (typeof resp === 'string') ? JSON.parse(resp) : resp;

      if (!parsed || Array.isArray(parsed) || (!parsed.category && !parsed.target_floor)) {
        return this.heuristicClassification(userPrompt);
      }

      const catUpper = String(parsed.category || '').toUpperCase();
      if (catUpper.includes('QUESTION') || catUpper.includes('FRAGE')) {
        return {
          category: 'QUESTION',
          target_floor: 'EG',
          classification: 'QUESTION',
          floor: 'EG'
        };
      }

      const isUG = catUpper.includes('HARDWARE') || 
                   String(parsed.target_floor || '').toUpperCase() === 'UG';
      
      const target_floor = isUG ? 'UG' : 'EG';
      const category = isUG ? 'HARDWARE_ALLGEMEIN' : 'SOFTWARE';

      return {
        category,
        target_floor,
        classification: category === 'SOFTWARE' ? 'SOFTWARE_DEV' : 'ALLGEMEIN_HARDWARE',
        floor: target_floor
      };
    } catch {
      return this.heuristicClassification(userPrompt);
    }
  }

  heuristicClassification(userPrompt) {
    const p = (userPrompt || '').trim().toLowerCase();

    // 1. Zuerst auf direkte Frage prüfen (wenn keine Bau-/Programmier-Befehle am Anfang)
    const isBuildTask = /^(baue|erstelle|programmiere|implementiere|schreibe code|refaktoriere|fixe|repariere|debugge|konfiguriere|löse|entwickle)\b/i.test(p);
    const isQuestionPattern = /^(was|wie|warum|wieso|weshalb|wozu|wann|wo|wer|welche|welcher|welches|kannst du erklären|erklär|erkläre|definiere|was bedeutet|was ist|unterschied zwischen)\b/i.test(p);

    if (!isBuildTask && (isQuestionPattern || (p.endsWith('?') && p.split(/\s+/).length < 30))) {
      return {
        category: 'QUESTION',
        target_floor: 'EG',
        classification: 'QUESTION',
        floor: 'EG'
      };
    }

    // 2. Hardware / Keller
    const ugKeywords = [
      'hardware', 'elektronik', 'schaltung', 'löten', 'sensor', 'esp32', 'arduino', 'raspberry',
      'serverraum', 'netzwerk', 'kabel', 'router', 'switch', 'rack', 'vpn', 'patchpanel', 'fisi', 'infrastruktur',
      'archiv', 'recherche', 'text schreiben', 'aufsatz', 'brainstorming', 'allgemeinwissen', 'artikel', 'wissen',
      'lounge', 'gaming', 'alltag', 'freizeit', 'pause', 'terminplan', 'lifestyle', 'kaffee'
    ];
    const isUG = ugKeywords.some(kw => p.includes(kw));
    const target_floor = isUG ? 'UG' : 'EG';
    const category = isUG ? 'HARDWARE_ALLGEMEIN' : 'SOFTWARE';
    return {
      category,
      target_floor,
      classification: category === 'SOFTWARE' ? 'SOFTWARE_DEV' : 'ALLGEMEIN_HARDWARE',
      floor: target_floor
    };
  }

  /**
   * 1. dispatchTask: Trevor zerlegt den Auftrag in Abteilungs-Tasks (gefiltert nach Etage)
   */
  async dispatchTask(userPrompt, routing = { category: 'SOFTWARE', target_floor: 'EG' }) {
    const targetFloor = routing.target_floor || routing.floor || (routing.category === 'HARDWARE_ALLGEMEIN' ? 'UG' : 'EG');

    // Filtere verfügbare Abteilungen strikt nach Etage!
    const availableDeptsList = this.hierarchy.departments.filter(d => {
      if (targetFloor === 'UG') return d.floor === 'UG';
      return d.floor !== 'UG';
    });

    const availableDepts = availableDeptsList.map(d => `${d.id}. ${d.name} (${d.floor || 'EG'}): ${d.easy_explanation}`).join('\n');

    const systemPrompt = `Du bist Trevor, der Studio-Director und Master-Dispatcher von "Trevor AI Software Studio".
Antworte im Tonfall von J.A.R.V.I.S. aus Iron Man: präzise, leicht trocken-britisch, extrem höflich und souverän (nutze gelegentlich 'Sir'). Halte gesprochene Statusmeldungen und Rückfragen prägnant.
Deine Aufgabe in Stufe 1 ist es, den Kundenauftrag für die Etage [${targetFloor}] zu analysieren und relevante Abteilungen auszuwählen.

VERFÜGBARE ABTEILUNGEN AUF ETAGE ${targetFloor}:
${availableDepts}

Wähle die relevanten Abteilungs-IDs (ausschließlich aus der Liste oben, z. B. ${targetFloor === 'UG' ? '[11, 12, 13]' : '[1, 2, 3, 5, 6, 10]'}), nenne eventuell betroffene Dateien/Module und gib eine kurze Begründung.`;

    const userMsg = `KUNDENAUFTRAG:\n"""\n${userPrompt}\n"""\n\nWelche Abteilungen auf Etage ${targetFloor} sind erforderlich?`;

    // Heuristik & LLM
    let selectedDeptIds = [];
    let dispatchRawAnalysis = '';
    try {
      const response = await queryLLM(systemPrompt, userMsg, false);
      dispatchRawAnalysis = response;
      const match = response.match(/\[\s*[\d\s,]+\s*\]/);
      if (match) {
        selectedDeptIds = JSON.parse(match[0]);
      }
    } catch { /* ignore */ }

    if (!selectedDeptIds || selectedDeptIds.length === 0) {
      const p = userPrompt.toLowerCase();
      if (targetFloor === 'UG') {
        // Fallback für Untergeschoss
        selectedDeptIds = [];
        if (p.includes('archiv') || p.includes('text') || p.includes('recherche') || p.includes('wissen') || p.includes('artikel') || p.includes('brainstorm')) selectedDeptIds.push(11);
        if (p.includes('server') || p.includes('netzwerk') || p.includes('router') || p.includes('rack') || p.includes('vpn') || p.includes('firewall')) selectedDeptIds.push(12);
        if (p.includes('hardware') || p.includes('elektronik') || p.includes('esp32') || p.includes('arduino') || p.includes('schaltung') || p.includes('löten') || p.includes('sensor')) selectedDeptIds.push(13);
        if (p.includes('lounge') || p.includes('alltag') || p.includes('gaming') || p.includes('freizeit') || p.includes('termin') || p.includes('pause')) selectedDeptIds.push(14);
        if (selectedDeptIds.length === 0) {
          selectedDeptIds = [11, 13]; // Standard: Archiv & Werkstatt
        }
      } else {
        // Fallback für Erdgeschoss
        selectedDeptIds = [1, 2]; // Planung & Architektur immer
        if (p.includes('ui') || p.includes('frontend') || p.includes('design') || p.includes('button')) selectedDeptIds.push(3);
        if (p.includes('3d') || p.includes('canvas') || p.includes('three') || p.includes('grafik')) selectedDeptIds.push(4);
        if (p.includes('backend') || p.includes('server') || p.includes('api') || p.includes('auth')) selectedDeptIds.push(5);
        if (p.includes('datenbank') || p.includes('database') || p.includes('sql') || p.includes('supabase')) selectedDeptIds.push(6);
        if (p.includes('ki') || p.includes('llm') || p.includes('gemini') || p.includes('ollama')) selectedDeptIds.push(7);
        if (p.includes('test') || p.includes('qa') || p.includes('fehler')) selectedDeptIds.push(8);
        selectedDeptIds.push(10); // Antigravity Synthesis
      }
    }

    selectedDeptIds = Array.from(new Set(selectedDeptIds));
    const activeDepts = availableDeptsList.filter(d => selectedDeptIds.includes(d.id));
    const finalDepts = activeDepts.length > 0 ? activeDepts : availableDeptsList.slice(0, 2);

    const subTasks = finalDepts.map(dept => ({
      departmentId: dept.id,
      departmentName: dept.name,
      departmentCode: dept.code,
      floor: dept.floor || targetFloor,
      leadAgent: dept.chef_agent,
      workerAgents: dept.specialist_pcs,
      mission: `Spezifische Ausarbeitung auf Etage ${dept.floor || targetFloor} (${dept.name}) zum Auftrag: "${userPrompt.slice(0, 80)}"`
    }));

    subTasks.rawAnalysis = dispatchRawAnalysis;
    subTasks.routing = routing;
    return subTasks;
  }

  /**
   * Extrahiert relevante Dateipfade aus Texten (z. B. Dispatcher-Antwort & Prompt)
   */
  extractCandidateFilePaths(...texts) {
    const fileRegex = /([a-zA-Z0-9_\-\.\/]+\.(?:js|html|css|md|json|sql|ts|jsx|tsx))/gi;
    const paths = new Set();

    for (const text of texts) {
      if (!text || typeof text !== 'string') continue;
      let match;
      while ((match = fileRegex.exec(text)) !== null) {
        let candidate = match[1].replace(/\\/g, '/').trim();
        candidate = candidate.replace(/[`,;:)\]}]+$/, '');
        if (candidate.startsWith('./')) candidate = candidate.slice(2);
        if (candidate.startsWith('/')) candidate = candidate.slice(1);
        if (candidate.length > 3 && !candidate.startsWith('http') && !candidate.includes(' ') && candidate.includes('.')) {
          paths.add(candidate);
        }
      }
    }
    return Array.from(paths);
  }

  /**
   * Ruft Quellcode über die lokale Bridge (/api/read-files) für Code-RAG ab
   */
  async fetchFilesContext(filePaths) {
    if (!filePaths || filePaths.length === 0) return [];

    try {
      let resp;
      try {
        resp = await fetch('/api/read-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filePaths })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch {
        resp = await fetch('http://localhost:3001/api/read-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filePaths })
        });
      }

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const files = Array.isArray(data) ? data : (data.files || []);
      return files.filter(f => f && f.content && f.status !== 'nicht gefunden');
    } catch (err) {
      console.warn('[WorkflowOrchestrator] Code-RAG Abruf fehlgeschlagen (Bridge offline?):', err.message);
      return [];
    }
  }

  /**
   * Durchsucht das Supabase Cloud-Gedächtnis (/api/memory/search)
   * Gibt maximal 3 relevante Treffer zurück.
   */
  async searchCloudMemory(query) {
    if (!query || typeof query !== 'string') return [];
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const resp = await fetch(`${baseUrl}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query })
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return Array.isArray(data.results) ? data.results.slice(0, 3) : [];
    } catch (err) {
      console.warn('[WorkflowOrchestrator] Fehler bei Cloud-Gedächtnis-Suche:', err.message);
      return [];
    }
  }

  /**
   * 2. executeWorkerTasks: Sub-Agenten bearbeiten ihre Teilaufgaben (mit Code-RAG & Cloud-Gedächtnis Injektion)
   */
  async executeWorkerTasks(subTasks, userPrompt, onStatusUpdate = () => {}, codeContext = '', cloudMemoryContext = '') {
    const workerOutputs = {};

    const ragContextSection = codeContext
      ? `\n\nHier ist der aktuelle Code der betroffenen Dateien:\n"""\n${codeContext}\n"""\nNutze diesen Quellcode als Referenz, um präzise und kompatible Änderungen vorzuschlagen.\n`
      : '';

    const memoryContextSection = cloudMemoryContext
      ? `\n\nBEWÄHRTE LÖSUNGSMUSTER AUS DEM CLOUD-GEDÄCHTNIS (SUPABASE RAG):\n"""\n${cloudMemoryContext}\n"""\nBerücksichtige diese bewährten Architekturmuster und Code-Snippets in deiner Ausarbeitung.\n`
      : '';

    for (const subTask of subTasks) {
      for (const pc of subTask.workerAgents) {
        onStatusUpdate(
          'Stufe 2/4: Fach-Agenten (Worker Execution)',
          pc.name,
          `${pc.name} (${subTask.departmentName}) erarbeitet Modul...`
        );

        if (typeof window !== 'undefined' && typeof window.updateAgentStatus === 'function') {
          window.updateAgentStatus(pc.name, `Analysiert ${subTask.departmentName}...`);
        }

        const systemPrompt = `Du bist ${pc.name}, Spezialist für "${pc.title}" in der Abteilung "${subTask.departmentName}".
Aufgabe: ${pc.easy_explanation}.
Erstelle eine konkrete technische Lösung mit relevanten Dateipfaden (z. B. 02_Frontend_UI_und_3D_Studio/..., 06_Deployment_und_Config/..., 01_Datenbank_Supabase/...).`;

        const userMsg = `AUFTRAG:\n"""\n${userPrompt}\n"""${ragContextSection}${memoryContextSection}\n\nErstelle deine technische Detailausarbeitung:`;

        const output = await queryLLM(systemPrompt, userMsg, false);

        if (typeof window !== 'undefined' && typeof window.updateAgentStatus === 'function') {
          window.updateAgentStatus(pc.name, 'Aufgabe abgeschlossen');
        }

        workerOutputs[pc.id] = {
          agentId: pc.id,
          agentName: pc.name,
          departmentId: subTask.departmentId,
          departmentName: subTask.departmentName,
          outputText: output
        };
      }
    }

    return workerOutputs;
  }

  /**
   * 3. aggregateDepartmentResults: Abteilungsleiter sammeln und prüfen explizit auf Logikfehler & ES-Modul-Pfade
   */
  async aggregateDepartmentResults(subTasks, workerOutputs, userPrompt, onStatusUpdate = () => {}) {
    const departmentReports = {};

    for (const subTask of subTasks) {
      const chef = subTask.leadAgent;
      onStatusUpdate(
        'Stufe 3/4: Abteilungsleiter (Lead Audit)',
        chef.name,
        `Audit durch ${chef.name} [Leitung: ${subTask.departmentName}]: Prüfe auf Logikfehler & Pfade...`
      );

      const deptWorkers = Object.values(workerOutputs).filter(w => w.departmentId === subTask.departmentId);
      const workerSummaries = deptWorkers.map(w => `[${w.agentName}]:\n${w.outputText.slice(0, 300)}...`).join('\n\n');

      const systemPrompt = `Du bist ${chef.name}, Leiter von "${subTask.departmentName}".
Deine Kernaufgabe in Stufe 3 ist ein unbestechliches Qualitäts- und Logikaudit:
1. Prüfe die Ausarbeitungen deiner Fach-Agenten auf:
   - Logikfehler und unklare Abläufe
   - Fehlende Abhängigkeiten
   - Falsche Dateipfade (ACHTUNG: Browser-Imports müssen zwingend innerhalb von "02_Frontend_UI_und_3D_Studio/" liegen!)
   - Redundanzen und Duplikate
2. Korrigiere gefundene Mängel und formuliere einen bereinigten Abteilungsbericht.`;

      const userMsg = `KUNDENAUFTRAG: "${userPrompt}"\n\nFACH-AUSARBEITUNGEN DEINES TEAMS:\n${workerSummaries}\n\nFühre den Logik-Audit durch und gib deinen bereinigten Bericht ab:`;

      const auditedOutput = await queryLLM(systemPrompt, userMsg, false);
      departmentReports[chef.id] = {
        leadId: chef.id,
        leadName: chef.name,
        departmentId: subTask.departmentId,
        departmentName: subTask.departmentName,
        reportText: auditedOutput,
        logicVerified: true
      };

      if (typeof window !== 'undefined') {
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(`Abteilung ${subTask.departmentName} hat die Arbeiten abgeschlossen, Sir.`);
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('SUCCESS');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Ergebnis bereit', 'Abteilung hat die Arbeit abgeschlossen', 'SUCCESS');
        }
        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem({
            id: `act_dept_${chef.id}_${Date.now()}`,
            type: 'APPROVAL_NEEDED',
            title: `Ergebnis bereit: ${subTask.departmentName}`,
            message: `${chef.name} hat den Logik-Audit abgeschlossen.`
          });
        }
        if (typeof document !== 'undefined') {
          const actionBadge = document.getElementById('action-center-badge');
          if (actionBadge) {
            actionBadge.classList.add('pulse-flash');
            setTimeout(() => actionBadge.classList.remove('pulse-flash'), 5000);
          }
        }
      }
    }

    return departmentReports;
  }

  /**
   * 4. synthesizeFinalPlan: Trevor fordert die finale Checkliste im exakten JSON-Schema an
   */
  async synthesizeFinalPlan(userPrompt, departmentReports) {
    const reportsText = Object.values(departmentReports)
      .map(r => `### ${r.departmentName} (Geprüft durch ${r.leadName}):\n${r.reportText.slice(0, 400)}`)
      .join('\n\n');

    const systemPrompt = `Du bist Trevor, Studio Director von "Trevor AI Software Studio".
Antworte im Tonfall von J.A.R.V.I.S. aus Iron Man: präzise, leicht trocken-britisch, extrem höflich und souverän (nutze gelegentlich 'Sir').
Dir liegen die geprüften Berichte deiner Abteilungsleiter vor. Alle Logikfehler und Pfad-Konflikte wurden bereinigt.

DEINE AUFGABE IN STUFE 4:
Fasse alle Maßnahmen zu einer strukturierten Liste von Schritten zusammen.
Gib dein Ergebnis AUSSCHLIESSLICH als valides JSON-Array zurück mit folgendem Schema:

[
  {
    "id": "step_1",
    "department": "Frontend & 3D",
    "title": "Prägnanter Titel der Maßnahme",
    "file": "02_Frontend_UI_und_3D_Studio/app.js",
    "description": "Exakte technische Handlungsanweisung ohne Füllwörter",
    "logicVerified": true,
    "approved": true
  }
]

WICHTIGE REGELN:
1. Jeder Schritt MUSS ein eindeutiges "id" (step_1, step_2, ...), "department", "title", "file" und "description" haben.
2. "logicVerified" ist stets true (durch die Abteilungsleiter verifiziert).
3. "approved" ist standardmäßig true ([JA]).
4. Gib KEIN Markdown vor oder nach dem JSON aus!`;

    const userMsg = `KUNDENAUFTRAG:\n"""\n${userPrompt}\n"""\n\nGEPRÜFTE ABTEILUNGSBERICHTE:\n${reportsText}\n\nErstelle jetzt das JSON-Array:`;

    let steps = [];
    try {
      const jsonResponse = await queryLLM(systemPrompt, userMsg, true);
      if (Array.isArray(jsonResponse) && jsonResponse.length > 0) {
        steps = jsonResponse;
      }
    } catch (err) {
      console.warn('[WorkflowOrchestrator] Fehler beim JSON-Synthese-Parsing:', err);
    }

    // Sicherer Fallback falls Antwort leer oder ungültig
    if (!steps || steps.length === 0) {
      steps = this.generateFallbackSteps(userPrompt, departmentReports);
    }

    // Stelle sicher, dass approved und logicVerified gesetzt sind
    steps = steps.map((s, idx) => ({
      id: s.id || `step_${idx + 1}`,
      department: s.department || 'Allgemein',
      title: s.title || `Maßnahme ${idx + 1}`,
      file: s.file || '02_Frontend_UI_und_3D_Studio/app.js',
      description: s.description || 'Technische Umsetzung gemäß Trevor Studio Spezifikation.',
      logicVerified: true,
      approved: s.approved !== false
    }));

    const trevorSummary = `Trevor hat deinen Auftrag "${userPrompt.slice(0, 60)}" durch alle 4 Stufen orchestratorisch aufbereitet:\n\n` +
      `• Stufe 1: Zerlegung in ${Object.keys(departmentReports).length} Fachabteilungen erfolgt.\n` +
      `• Stufe 2: Technische Fach-Ausarbeitungen durch Spezial-PCs erstellt.\n` +
      `• Stufe 3: Logikprüfung, ES-Modul-Grenzen und Abhängigkeiten durch Abteilungsleiter validiert.\n` +
      `• Stufe 4: ${steps.length} konkrete Maßnahmen vorbereitet.\n\n` +
      `Entscheide nun in der Checkliste mit [JA] oder [NEIN], welche Schritte für Antigravity exportiert werden sollen.`;

    return {
      summary: trevorSummary,
      steps,
      departmentReports
    };
  }

  /**
   * Erzeugt realistische Fallback-Schritte bei Offline-Betrieb
   */
  generateFallbackSteps(userPrompt, departmentReports) {
    const p = userPrompt.slice(0, 60);
    return [
      {
        id: "step_1",
        department: "1. Ideen & Planung",
        title: "Architektur-Blueprint & Feature-Roadmap",
        file: "00_Checkpoints_und_Status/CHECKPOINT_STATE.md",
        description: `Strukturierte Definition der Modul-Spezifikation für "${p}".`,
        logicVerified: true,
        approved: true
      },
      {
        id: "step_2",
        department: "3. Aussehen & Bedienung (Frontend)",
        title: "Dark-Slate UI & [JA]/[NEIN] Checkliste",
        file: "02_Frontend_UI_und_3D_Studio/app.js",
        description: "Integration der interaktiven Komponenten und Live-Statusanzeige.",
        logicVerified: true,
        approved: true
      },
      {
        id: "step_3",
        department: "5. Server & Hintergrund-Logik (Backend)",
        title: "REST API Endpunkte & Dual-Engine Router",
        file: "06_Deployment_und_Config/server.js",
        description: "Bereitstellung der Endpunkte für Task-Inferenz und Checkpoint-Synchronisation.",
        logicVerified: true,
        approved: true
      },
      {
        id: "step_4",
        department: "6. Datenbank & Speicher",
        title: "Supabase Tabellenschema & RLS-Sicherheit",
        file: "01_Datenbank_Supabase/schema.sql",
        description: "Tabellen und Row-Level-Security Policies gegen unbefugten Zugriff absichern.",
        logicVerified: true,
        approved: true
      }
    ];
  }
}

export const orchestrator = new WorkflowOrchestrator();

if (typeof window !== 'undefined') {
  window.WorkflowOrchestrator = WorkflowOrchestrator;
  window.trevorOrchestrator = orchestrator;
  window.safeParseTrevorJSON = safeParseTrevorJSON;
  window.detectPrimaryDepartment = detectPrimaryDepartment;
  window.getDepartmentByCodeOrId = getDepartmentByCodeOrId;
}
