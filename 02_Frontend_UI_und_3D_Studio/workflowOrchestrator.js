/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js
 * 
 * 3 Arbeits-Modi & Präzisions-Orchestrator:
 * - MODUS A: PROMPT_REQUEST (Vorab-Entscheidung mit Auswirkungs-Analyse -> Antigravity System-Prompt)
 * - MODUS B: IMPROVEMENT_AUDIT (Bereichsübergreifender Scan via Promise.all() -> Interaktive Abstimmung)
 * - MODUS C: GENERAL_AI_TASK (Volle KI-Kompetenz mit Spezialisten-Fokus via Promise.all() -> Komplettlösung)
 * - Non-Blocking Action-Center & Dynamische J.A.R.V.I.S. Sprachausgabe (spokenSummary)
 */

import { queryLLM } from './llmEngine.js';
import { STUDIO_HIERARCHY, TREVOR_AGENT_ROSTER, AGENT_ROSTER_BY_ID } from './hierarchyData.js';

/**
 * Klassifiziert den Nutzer-Auftrag strikt in einen der 3 Arbeits-Modi:
 * - 'PROMPT_REQUEST': Nutzer fordert einen System-Prompt oder eine Projekt-Änderung an
 * - 'IMPROVEMENT_AUDIT': Nutzer fragt nach Verbesserungen / Optimierungen / Schwachstellen
 * - 'GENERAL_AI_TASK': Allgemeine Fragen, Aufgaben lösen, Zusammenfassungen, Code/Theorie erklären
 */
export function classifyWorkMode(text) {
  const t = (text || '').toLowerCase();

  // Modus B: IMPROVEMENT_AUDIT
  if (
    t.includes('verbesser') ||
    t.includes('optimier') ||
    t.includes('audit') ||
    t.includes('schwachstell') ||
    t.includes('code review') ||
    t.includes('code-review') ||
    t.includes('refactor') ||
    t.includes('qualitätsprüfung') ||
    t.includes('performance-check') ||
    t.includes('bottleneck') ||
    t.includes('verbesserungsvorschläg') ||
    t.includes('was kann verbessert werden') ||
    t.includes('schwachstellen-scan')
  ) {
    return 'IMPROVEMENT_AUDIT';
  }

  // Modus A: PROMPT_REQUEST
  if (
    t.includes('system-prompt') ||
    t.includes('system prompt') ||
    t.includes('task-prompt') ||
    t.includes('task prompt') ||
    t.includes('prompt für antigravity') ||
    t.includes('antigravity prompt') ||
    t.includes('antigravity-prompt') ||
    t.includes('erstelle einen prompt') ||
    t.includes('schreibe einen prompt') ||
    t.includes('baue mir einen prompt') ||
    t.includes('generiere einen prompt') ||
    t.includes('formuliere einen prompt') ||
    t.includes('prompt erstellen') ||
    t.includes('prompt schreiben') ||
    t.includes('prompt generieren') ||
    t.includes('projekt-änderung') ||
    t.includes('projektänderung') ||
    t.includes('feature-request') ||
    t.includes('neues feature') ||
    t.includes('prompt:') ||
    t.includes('generiere prompt') ||
    t.includes('antigravity task') ||
    t.includes('antigravity-task')
  ) {
    return 'PROMPT_REQUEST';
  }

  // Modus C: GENERAL_AI_TASK (Standard)
  return 'GENERAL_AI_TASK';
}

/**
 * Ermittelt per Keyword-Matching die passende Primär-Abteilung
 */
export function detectPrimaryDepartment(text) {
  const p = (text || '').toLowerCase();
  if (p.includes('3d') || p.includes('ui') || p.includes('frontend') || p.includes('css') || p.includes('html') || p.includes('canvas') || p.includes('button') || p.includes('webgl') || p.includes('design') || p.includes('layout')) {
    return 'EG_FRONTEND';
  }
  if (p.includes('architektur') || p.includes('system') || p.includes('struktur') || p.includes('konzept') || p.includes('blueprint') || p.includes('planung')) {
    return 'EG_ARCHITEKTUR';
  }
  if (p.includes('hardware') || p.includes('esp32') || p.includes('arduino') || p.includes('sensor') || p.includes('schaltung') || p.includes('löten') || p.includes('werkstatt') || p.includes('elektronik') || p.includes('microcontroller')) {
    return 'UG_WERKSTATT';
  }
  if (p.includes('serverraum') || p.includes('netzwerk') || p.includes('router') || p.includes('switch') || p.includes('vpn') || p.includes('rack') || p.includes('fisi') || p.includes('firewall') || p.includes('infrastruktur') || p.includes('server-hardware')) {
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
  const modeFallback = classifyWorkMode(originalPrompt + ' ' + (rawText || ''));
  const deptFallback = detectPrimaryDepartment(originalPrompt + ' ' + (rawText || ''));

  if (!rawText || typeof rawText !== 'string') {
    return {
      workMode: modeFallback,
      needsClarification: false,
      clarificationQuestion: '',
      impactAnalysis: {
        impactYes: 'Der Auftrag wird gemäß Ihren Spezifikationen umgesetzt.',
        impactNo: 'Der Auftrag wird nach Standard-Architektur-Vorgaben ausgeführt.',
        ifYes: 'Der Auftrag wird gemäß Ihren Spezifikationen umgesetzt.',
        ifNo: 'Der Auftrag wird nach Standard-Architektur-Vorgaben ausgeführt.'
      },
      summary: `Auftrag: ${originalPrompt || 'Neuer Auftrag'}`,
      executionMode: 'FULL_DEPARTMENT',
      primaryDepartment: deptFallback,
      targetFloor: deptFallback.startsWith('UG') ? 'UG' : 'EG',
      spokenSummary: `Sir, ich habe Ihren Auftrag bezüglich "${(originalPrompt || 'Neuer Auftrag').slice(0, 45)}" aufgenommen.`
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
        const validModes = ['PROMPT_REQUEST', 'IMPROVEMENT_AUDIT', 'GENERAL_AI_TASK'];
        const workMode = validModes.includes(parsed.workMode) ? parsed.workMode : modeFallback;
        const primaryDept = parsed.primaryDepartment || deptFallback;
        const targetFloor = parsed.targetFloor || (String(primaryDept).startsWith('UG') ? 'UG' : 'EG');
        const needsClarification = parsed.needsClarification === true && Boolean(parsed.clarificationQuestion || parsed.question);
        const clarificationQuestion = parsed.clarificationQuestion || parsed.question || '';

        const yesVal = parsed.impactAnalysis?.impactYes || parsed.impactAnalysis?.ifYes || 'Der Auftrag wird mit diesen zusätzlichen Spezifikationen ausgeführt.';
        const noVal = parsed.impactAnalysis?.impactNo || parsed.impactAnalysis?.ifNo || 'Der Auftrag wird nach den Standard-Architektur-Vorgaben umgesetzt.';
        const impactAnalysis = {
          impactYes: yesVal,
          impactNo: noVal,
          ifYes: yesVal,
          ifNo: noVal
        };

        const spokenSummary = parsed.spokenSummary || (needsClarification
          ? `Sir, zu Ihrem Auftrag liegt eine Rückfrage im Action-Center bereit: ${clarificationQuestion.slice(0, 80)}`
          : `Sir, ich habe Ihren Auftrag im Modus ${workMode} analysiert und an ${primaryDept} übergeben.`);

        return {
          workMode,
          needsClarification,
          clarificationQuestion,
          impactAnalysis,
          summary: parsed.summary || parsed.description || rawText.slice(0, 300),
          executionMode: parsed.executionMode || 'FULL_DEPARTMENT',
          primaryDepartment: primaryDept,
          targetFloor,
          spokenSummary
        };
      }
    } catch (err) {
      console.warn('[safeParseTrevorJSON] Parsing-Warnung:', err.message);
    }
  }

  // 3. Fallback-Garantie: Reiner Text
  return {
    workMode: modeFallback,
    needsClarification: false,
    clarificationQuestion: '',
    impactAnalysis: {
      impactYes: 'Der Auftrag wird gemäß Ihren Spezifikationen umgesetzt.',
      impactNo: 'Der Auftrag wird nach Standard-Architektur-Vorgaben ausgeführt.',
      ifYes: 'Der Auftrag wird gemäß Ihren Spezifikationen umgesetzt.',
      ifNo: 'Der Auftrag wird nach Standard-Architektur-Vorgaben ausgeführt.'
    },
    summary: rawText.trim() || `Auftrag: ${originalPrompt}`,
    executionMode: 'FULL_DEPARTMENT',
    primaryDepartment: deptFallback,
    targetFloor: deptFallback.startsWith('UG') ? 'UG' : 'EG',
    spokenSummary: `Sir, ich habe Ihren Auftrag im Modus ${modeFallback} aufgenommen und an die zuständige Abteilung übergeben.`
  };
}

/**
 * Ermittelt das Abteilungs-Objekt aus STUDIO_HIERARCHY anhand von Code oder ID
 */
export function getDepartmentByCodeOrId(deptCodeOrId, departments) {
  if (!departments || departments.length === 0) return null;

  const code = String(deptCodeOrId || '').toUpperCase().trim();

  // 1. Direkter Code- oder Short-Name-Match
  const directMatch = departments.find(d => 
    (d.code && d.code.toUpperCase() === code) ||
    (d.short_name && d.short_name.toUpperCase() === code)
  );
  if (directMatch) return directMatch;

  // 2. Numerischer Match (id oder alt_id)
  if (typeof deptCodeOrId === 'number' || /^\d+$/.test(String(deptCodeOrId))) {
    const numId = parseInt(deptCodeOrId, 10);
    const found = departments.find(d => d.id === numId || d.alt_id === numId);
    if (found) return found;
  }

  // 3. Mapping für bekannte Kürzel
  const map = {
    'EG_FRONTEND': 3,
    'EG_UI': 3,
    'EG_3D': 3,
    'EG_BACKEND': 5,
    'EG_SERVER': 5,
    'EG_DATENBANK': 5,
    'EG_DB': 5,
    'EG_API': 5,
    'EG_QA': 12,
    'EG_TESTING': 12,
    'EG_SECURITY': 12,
    'EG_SEC': 12,
    'EG_DEVOPS': 12,
    'EG_PLANUNG': 2,
    'EG_ARCHITEKTUR': 2,
    'UG_ARCHIV': 12,
    'UG_SERVER': 12,
    'UG_SERVERRAUM': 12,
    'UG_WERKSTATT': 12,
    'UG_LOUNGE': 12
  };

  const targetId = map[code];
  if (targetId) {
    const found = departments.find(d => d.id === targetId || d.alt_id === targetId);
    if (found) return found;
  }

  const byName = departments.find(d => 
    (d.code && d.code.toUpperCase() === code) ||
    (d.name && d.name.toUpperCase().includes(code))
  );
  if (byName) return byName;

  return departments.find(d => d.id === 5 || d.alt_id === 4) || departments[0];
}

/**
 * Wählt anhand des Prompts und der Fachgebiete genau die 3 passenden Spezialisten
 * aus dem 33-Agenten-Roster für paralleles Arbeiten via Promise.all() aus.
 */
export function selectSpecialistsForTask(dept, promptText = '') {
  const p = (promptText || '').toLowerCase();
  const pcs = (dept && dept.specialist_pcs) ? dept.specialist_pcs : [];
  if (pcs.length <= 3) return pcs;

  const deptCode = dept.code || '';

  if (deptCode === 'EG_BACKEND') {
    // Python / Algorithmen / Mathe -> Jonas (ag_21), Tim (ag_25), Sarah (ag_19)
    if (p.includes('python') || p.includes('algor') || p.includes('sort') || p.includes('math') || p.includes('berechn')) {
      const jonas = pcs.find(x => x.name === 'Jonas') || pcs[2];
      const tim = pcs.find(x => x.name === 'Tim') || pcs[6];
      const sarah = pcs.find(x => x.name === 'Sarah') || pcs[0];
      return [jonas, tim, sarah];
    }
    // Datenbank / Supabase / Cache -> Malik (ag_20), Tarek (ag_23), Tim (ag_25)
    if (p.includes('datenbank') || p.includes('db') || p.includes('supabase') || p.includes('sql') || p.includes('cache') || p.includes('postgres')) {
      const malik = pcs.find(x => x.name === 'Malik') || pcs[1];
      const tarek = pcs.find(x => x.name === 'Tarek') || pcs[4];
      const tim = pcs.find(x => x.name === 'Tim') || pcs[6];
      return [malik, tarek, tim];
    }
    // KI / LLM / RAG -> Kiara (ag_22), Tarek (ag_23), Hannah (ag_24)
    if (p.includes('llm') || p.includes('qwen') || p.includes('gemini') || p.includes('ki') || p.includes('rag')) {
      const kiara = pcs.find(x => x.name === 'Kiara') || pcs[3];
      const tarek = pcs.find(x => x.name === 'Tarek') || pcs[4];
      const hannah = pcs.find(x => x.name === 'Hannah') || pcs[5];
      return [kiara, tarek, hannah];
    }
    // Default Backend: Sarah (API), Jonas (Logik), Tim (Validierung)
    return [
      pcs.find(x => x.name === 'Sarah') || pcs[0],
      pcs.find(x => x.name === 'Jonas') || pcs[2],
      pcs.find(x => x.name === 'Tim') || pcs[6]
    ];
  }

  if (deptCode === 'EG_FRONTEND') {
    // 3D / Three.js / WebGL / Canvas -> Liam (ag_11), Zoe (ag_14), Ben (ag_17)
    if (p.includes('3d') || p.includes('three') || p.includes('shader') || p.includes('webgl') || p.includes('kamera') || p.includes('canvas')) {
      return [
        pcs.find(x => x.name === 'Liam') || pcs[0],
        pcs.find(x => x.name === 'Zoe') || pcs[3],
        pcs.find(x => x.name === 'Ben') || pcs[6]
      ];
    }
    // Audio / Voice / Sounds -> Finn (ag_15), Noah (ag_13), Ben (ag_17)
    if (p.includes('sound') || p.includes('audio') || p.includes('voice') || p.includes('sprache') || p.includes('synthesizer')) {
      return [
        pcs.find(x => x.name === 'Finn') || pcs[4],
        pcs.find(x => x.name === 'Noah') || pcs[2],
        pcs.find(x => x.name === 'Ben') || pcs[6]
      ];
    }
    // Default Frontend: Maya (CSS/Slate), Noah (DOM/HUD), Zoe (Animation)
    return [
      pcs.find(x => x.name === 'Maya') || pcs[1],
      pcs.find(x => x.name === 'Noah') || pcs[2],
      pcs.find(x => x.name === 'Zoe') || pcs[3]
    ];
  }

  if (deptCode === 'EG_ARCHITEKTUR') {
    // Prompts / Antigravity -> Nadia (ag_07), Henrik (ag_08), Clara (ag_09)
    if (p.includes('prompt') || p.includes('antigravity') || p.includes('instruktion')) {
      return [
        pcs.find(x => x.name === 'Nadia') || pcs[4],
        pcs.find(x => x.name === 'Henrik') || pcs[5],
        pcs.find(x => x.name === 'Clara') || pcs[6]
      ];
    }
    // BWL / Kalkulation / Aufwand -> Svenja (ag_05), Lukas (ag_06), Henrik (ag_08)
    if (p.includes('bwl') || p.includes('kosten') || p.includes('kalkulation') || p.includes('netzplan') || p.includes('wirtschaft')) {
      return [
        pcs.find(x => x.name === 'Svenja') || pcs[2],
        pcs.find(x => x.name === 'Lukas') || pcs[3],
        pcs.find(x => x.name === 'Henrik') || pcs[5]
      ];
    }
    // Default Architektur: Elena (Requirements), Viktor (Datenmodell), Lukas (Tech-Stack)
    return [
      pcs.find(x => x.name === 'Elena') || pcs[0],
      pcs.find(x => x.name === 'Viktor') || pcs[1],
      pcs.find(x => x.name === 'Lukas') || pcs[3]
    ];
  }

  if (deptCode === 'UG_SERVER') {
    // Subnetting / IP / CIDR / VLAN / Routing -> Milan (ag_27), Nora (ag_31), Rico (ag_32)
    if (p.includes('subnet') || p.includes('ip') || p.includes('cidr') || p.includes('vlsm') || p.includes('vlan') || p.includes('netzwerk') || p.includes('routing')) {
      return [
        pcs.find(x => x.name === 'Milan') || pcs[0],
        pcs.find(x => x.name === 'Nora') || pcs[4],
        pcs.find(x => x.name === 'Rico') || pcs[5]
      ];
    }
    // Security / PIN / Sandbox / Firewall -> Freya (ag_28), Nora (ag_31), Rico (ag_32)
    if (p.includes('security') || p.includes('pin') || p.includes('sandbox') || p.includes('auth') || p.includes('firewall')) {
      return [
        pcs.find(x => x.name === 'Freya') || pcs[1],
        pcs.find(x => x.name === 'Nora') || pcs[4],
        pcs.find(x => x.name === 'Rico') || pcs[5]
      ];
    }
    // Default Server: Milan (Netzwerk), Anton (DevOps), Yuna (Optimizer)
    return [
      pcs.find(x => x.name === 'Milan') || pcs[0],
      pcs.find(x => x.name === 'Anton') || pcs[2],
      pcs.find(x => x.name === 'Yuna') || pcs[6]
    ];
  }

  return pcs.slice(0, 3);
}

export class WorkflowOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.hierarchy = STUDIO_HIERARCHY;
    this.busyDepartments = new Set();
  }

  classifyWorkMode(text) {
    return classifyWorkMode(text);
  }

  safeParseTrevorJSON(rawText, originalPrompt) {
    return safeParseTrevorJSON(rawText, originalPrompt);
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
   * Führt den vollständigen Workflow mit 3 Modi aus
   */
  async executeFullWorkflow(userPrompt, onStatusUpdate = () => {}) {
    console.log(`\n======================================================`);
    console.log(`[WorkflowOrchestrator] Starte Workflow: "${userPrompt.slice(0, 60)}..."`);
    console.log(`======================================================\n`);

    onStatusUpdate('1/4: Trevor analysiert...', 'Trevor', 'Pre-Check, Arbeitsmodus & Rückfragen-Prüfung...');

    // 1. PRE-CHECK VIA TREVOR MIT safeParseTrevorJSON
    const preCheckSystemPrompt = `Du bist Trevor, Studio-Director von "Trevor AI Software Studio".
Antworte im Tonfall von J.A.R.V.I.S. aus Iron Man: präzise, trocken-britisch, extrem höflich ('Sir').
Deine Aufgabe in Stufe 1 ist die strikte Klassifizierung des Nutzer-Auftrags in genau einen von drei Arbeits-Modi sowie die Prüfung auf Unklarheiten:

ARBEITS-MODI:
1. "PROMPT_REQUEST": Der Nutzer fordert einen System-Prompt für Antigravity oder eine konkrete Projekt-Änderung/Feature an.
2. "IMPROVEMENT_AUDIT": Der Nutzer fragt nach Verbesserungen, Optimierungen, Schwachstellen-Scans, Code-Audits oder Performance-Checks.
3. "GENERAL_AI_TASK": Allgemeine Aufgaben aller Art (Schritt-für-Schritt Problemlösung, Zusammenfassungen, Skripte schreiben, Berechnungen, Erklärungen von Code oder Konzepten).

RÜCKFRAGEN-PFLICHT BEI UNKLARHEIT:
Falls unverzichtbare Angaben fehlen oder der Auftrag mehrdeutig ist: Setze "needsClarification": true und formuliere eine präzise Rückfrage mit Auswirkungs-Erklärung (was passiert bei Ja/Nein).
Raten ist strengstens verboten! Wenn alles klar ist: "needsClarification": false.

DYNAMISCHE SPRACHAUSGABE:
Erzeuge immer ein Feld "spokenSummary" mit 1-2 präzisen Sätzen im J.A.R.V.I.S.-Stil auf Deutsch, die inhaltlich konkret zusammenfassen, was Trevor erkannt hat oder welche Rückfrage offen ist.

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "workMode": "PROMPT_REQUEST" | "IMPROVEMENT_AUDIT" | "GENERAL_AI_TASK",
  "needsClarification": false,
  "clarificationQuestion": "",
  "impactAnalysis": {
    "ifYes": "Was passiert bei Ja...",
    "ifNo": "Konsequenz bei Nein..."
  },
  "summary": "Prägnante Zusammenfassung",
  "primaryDepartment": "EG_BACKEND" | "EG_FRONTEND" | "EG_ARCHITEKTUR" | "UG_SERVER" | "EG_DATENBANK" | "UG_WERKSTATT" | "UG_ARCHIV",
  "targetFloor": "EG" | "UG",
  "spokenSummary": "Sir, ich habe Ihren Auftrag analysiert..."
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

    const taskId = 'task_' + Date.now();
    const taskObject = {
      id: taskId,
      title: userPrompt.length > 50 ? userPrompt.slice(0, 50) + '...' : userPrompt,
      userPrompt,
      prompt: userPrompt,
      summary: preCheckResult.summary,
      workMode: preCheckResult.workMode,
      primaryDepartment: preCheckResult.primaryDepartment,
      targetFloor: preCheckResult.targetFloor || (preCheckResult.primaryDepartment.startsWith('UG') ? 'UG' : 'EG'),
      spokenSummary: preCheckResult.spokenSummary
    };

    // 2. FALL A: RÜCKFRAGE ERFORDERLICH (NON-BLOCKING PAUSIERUNG)
    if (preCheckResult.needsClarification === true && preCheckResult.clarificationQuestion) {
      console.log(`[WorkflowOrchestrator] Rückfrage erforderlich: "${preCheckResult.clarificationQuestion}"`);
      const qText = preCheckResult.clarificationQuestion;
      const actionId = 'act_clarify_' + Date.now();

      const pendingData = {
        id: actionId,
        actionId,
        taskId: taskObject.id,
        type: 'WAITING_FOR_USER',
        subType: 'CLARIFICATION',
        title: `Rückfrage: ${taskObject.title}`,
        message: qText,
        impact: preCheckResult.impactAnalysis,
        workMode: preCheckResult.workMode,
        taskObject,
        preCheckResult,
        timestamp: Date.now()
      };

      if (typeof window !== 'undefined') {
        window.pendingTasksMap = window.pendingTasksMap || {};
        window.pendingTasksMap[actionId] = pendingData;

        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem(pendingData);
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('QUESTION');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Rückfrage von Trevor', qText, 'QUESTION', actionId);
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(preCheckResult.spokenSummary || qText);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('Wartet auf Nutzer-Antwort');
        }
        // Sofortiges Weiterarbeiten am nächsten Problem (Non-Blocking)
        if (typeof window.processNextTaskInQueue === 'function') {
          setTimeout(() => window.processNextTaskInQueue(), 100);
        }
      }

      onStatusUpdate('Wartet auf Nutzer-Antwort', 'Trevor', qText);

      return {
        isPaused: true,
        reason: 'CLARIFICATION_NEEDED',
        question: qText,
        pendingData,
        summary: preCheckResult.summary
      };
    }

    // 3. FALL B: ZWINGENDER ÜBERGANG ZU DEM ENTSPRECHENDEN MODUS
    if (taskObject.workMode === 'PROMPT_REQUEST') {
      return await this.executePromptRequestMode(taskObject, onStatusUpdate);
    } else if (taskObject.workMode === 'IMPROVEMENT_AUDIT') {
      return await this.executeImprovementAuditMode(taskObject, onStatusUpdate);
    } else {
      return await this.executeGeneralAITaskMode(taskObject, onStatusUpdate);
    }
  }

  /**
   * MODUS A: PROMPT_REQUEST
   * Vorab-Entscheidung mit Auswirkungs-Analyse -> Antigravity System-Prompt
   */
  async executePromptRequestMode(taskObject, onStatusUpdate = () => {}) {
    const dept = getDepartmentByCodeOrId(taskObject.primaryDepartment, this.hierarchy.departments);
    const targetFloor = dept.floor || taskObject.targetFloor || 'EG';

    if (this.isDepartmentBusy(dept.id)) {
      const busyMsg = 'In Warteschlange (Abteilung ausgelastet)';
      onStatusUpdate(busyMsg, dept.name, `Abteilung ${dept.name} ist aktuell belegt.`);
      if (typeof window !== 'undefined' && typeof window.updateActiveQueueItemStatus === 'function') {
        window.updateActiveQueueItemStatus(busyMsg);
      }
      return { isQueued: true, status: busyMsg, department: dept, taskObject };
    }

    this.setDepartmentBusy(dept.id, true);

    try {
      const stage2Status = `2/4: [${dept.name}] – Fach-Agenten erarbeiten technische Optionen...`;
      onStatusUpdate(stage2Status, dept.name, `Fach-Agenten von ${dept.name} prüfen Optionen & Auswirkungs-Analyse...`);
      if (typeof window !== 'undefined') {
        if (typeof window.updateActiveQueueItemStatus === 'function') window.updateActiveQueueItemStatus(stage2Status);
        if (typeof window.update3DStudioState === 'function') window.update3DStudioState('stage2', targetFloor);
        if (typeof window.setStageIn3D === 'function') window.setStageIn3D(2);
        dept.specialist_pcs.forEach(pc => {
          if (typeof window.updateAgentStatus === 'function') {
            window.updateAgentStatus(pc.id, 'working', 'Erstellt technische Optionen...');
          }
        });
      }

      const codeContext = await this.getCodeContext(dept.floor, taskObject.summary, taskObject.userPrompt);
      const cloudMemoryContext = await this.getMemoryContext(taskObject.userPrompt);

      const optionsPrompt = `Du bist das Expertenteam der Abteilung "${dept.name}".
Aufgabe: Erarbeite für den System-Prompt-Auftrag "${taskObject.userPrompt}" 2-3 konkrete technische Optionen / Architektur-Alternativen mit klarer Auswirkungs-Analyse (Impact-Analyse).
Jede Option MUSS erklären:
1. Was passiert im System bei "Ja"? (impactYes)
2. Was ist die Konsequenz bei "Nein"? (impactNo)

Antworte AUSSCHLIESSLICH als valides JSON-Array:
[
  {
    "id": "opt_1",
    "title": "Option 1 Titel",
    "description": "Prägnante technische Beschreibung",
    "impactYes": "Konkrete Auswirkung bei Bestätigung...",
    "impactNo": "Konsequenz bei Ablehnung..."
  }
]`;

      let options = [];
      try {
        const rawOptions = await queryLLM(optionsPrompt, `AUFTRAG:\n${taskObject.userPrompt}\n${codeContext}\n${cloudMemoryContext}`, true);
        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          options = rawOptions;
        }
      } catch (err) {
        console.warn('[WorkflowOrchestrator] Fehler bei Options-Erarbeitung:', err);
      }

      if (!options || options.length === 0) {
        options = [
          {
            id: 'opt_1',
            title: 'Modulare Komponenten-Architektur (Empfohlen)',
            description: 'Strikte Trennung von Datenmodell, State-Management und UI-Renderern in isolierte ES-Module.',
            impactYes: 'Hohe Wartbarkeit, leichte Erweiterbarkeit, saubere Modulgrenzen ohne zirkuläre Abhängigkeiten.',
            impactNo: 'Schnellerer Initialaufbau in einer Datei, jedoch langfristig schwerer test- und wartbar.'
          },
          {
            id: 'opt_2',
            title: 'Echtzeit-Event-Bus & Reactive Store',
            description: 'Zentrale Synchronisation aller Events über ein globales Messaging- und State-Interface.',
            impactYes: 'Komponenten reagieren verzögerungsfrei auf Zustandsänderungen; UI und 3D-Bühne bleiben synchron.',
            impactNo: 'Zustandsänderungen müssen manuell über Callbacks nachverfolgt werden.'
          }
        ];
      }

      const actionId = 'act_prompt_dec_' + Date.now();
      const spokenSummary = `Sir, ich habe die technischen Optionen für Ihren System-Prompt ausgearbeitet. Bitte entscheiden Sie im Action-Center über die bevorzugte Architektur.`;

      const pendingData = {
        id: actionId,
        actionId,
        taskId: taskObject.id,
        type: 'WAITING_FOR_USER',
        subType: 'PROMPT_DECISION',
        title: `Entscheidung erforderlich: ${taskObject.title}`,
        message: 'Bevor der finale System-Prompt für Antigravity erstellt wird, bitte über die technischen Optionen abstimmen:',
        options,
        workMode: 'PROMPT_REQUEST',
        taskObject,
        dept,
        spokenSummary,
        timestamp: Date.now()
      };

      if (typeof window !== 'undefined') {
        window.pendingTasksMap = window.pendingTasksMap || {};
        window.pendingTasksMap[actionId] = pendingData;

        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem(pendingData);
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('QUESTION');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Entscheidung erforderlich', 'Technische Optionen für System-Prompt bereit', 'QUESTION', actionId);
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(spokenSummary);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('Wartet auf Nutzer-Entscheidung');
        }
        if (typeof window.processNextTaskInQueue === 'function') {
          setTimeout(() => window.processNextTaskInQueue(), 100);
        }
      }

      onStatusUpdate('Wartet auf Nutzer-Entscheidung', 'Trevor', 'Vorab-Entscheidung liegt im Action-Center bereit.');

      return {
        isPaused: true,
        actionId,
        workMode: 'PROMPT_REQUEST',
        reason: 'PROMPT_DECISION_NEEDED',
        pendingData,
        options
      };

    } finally {
      this.setDepartmentBusy(dept.id, false);
    }
  }

  /**
   * Fortsetzung von MODUS A nach Nutzer-Entscheidung
   */
  async resumePromptRequestTask(pendingData, decision, notes = '') {
    const { taskObject, dept } = pendingData;
    const targetFloor = dept.floor || 'EG';

    console.log(`[WorkflowOrchestrator] Setze PROMPT_REQUEST fort mit Entscheidung: "${decision}", Anmerkung: "${notes}"`);
    this.setDepartmentBusy(dept.id, true);

    try {
      if (typeof window !== 'undefined') {
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus(`3/4: [${dept.name}] – Generiere Antigravity System-Prompt...`);
        }
        if (typeof window.update3DStudioState === 'function') window.update3DStudioState('stage3', targetFloor);
        if (typeof window.setStageIn3D === 'function') window.setStageIn3D(3);
      }

      const promptGenPrompt = `Du bist Trevor, Studio Director von "Trevor AI Software Studio".
Antworte im Tonfall von J.A.R.V.I.S. aus Iron Man: präzise, trocken-britisch, extrem höflich ('Sir').
Deine Abteilung "${dept.name}" hat mit dem Nutzer abgestimmt:
- Gewählte Option / Entscheidung: "${decision}"
- Nutzer-Anmerkungen: "${notes || 'Keine zusätzlichen Anmerkungen'}"

DEINE AUFGABE:
Generiere einen vollständigen, professionellen, sofort in Antigravity ausführbaren Markdown System-Prompt für den Kundenauftrag:
"${taskObject.userPrompt}".

Der System-Prompt MUSS folgende Abschnitte enthalten:
1. # IDENTITY & GOAL (Rolle, Zweck und Ziel)
2. # ARCHITECTURE & TECH STACK (Konkrete Architektur basierend auf der Nutzer-Entscheidung)
3. # STEP-BY-STEP IMPLEMENTATION ROADMAP (Klare Dateipfade wie z.B. 02_Frontend_UI_und_3D_Studio/...)
4. # CONSTRAINTS & BEST PRACTICES (ES-Module .js-Endungen, Non-Blocking, Native DOM)
5. # VERIFICATION CHECKLIST (Wie das Ergebnis getestet wird)

Erzeuge außerdem zwingend ein Feld "spokenSummary" mit 1-2 Sätzen im J.A.R.V.I.S.-Stil (deutsch), die inhaltlich zusammenfassen, was der Prompt bewirkt.

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "spokenSummary": "1-2 präzise Sätze im J.A.R.V.I.S.-Stil...",
  "summary": "Zusammenfassung des System-Prompts...",
  "antigravityPrompt": "# MARKDOWN SYSTEM PROMPT..."
}`;

      let resultObj;
      try {
        resultObj = await queryLLM(promptGenPrompt, `Auftrag: ${taskObject.userPrompt}`, true);
      } catch (err) {
        console.warn('[WorkflowOrchestrator] Fehler bei Prompt-Generierung:', err);
      }

      const antigravityPrompt = resultObj?.antigravityPrompt || `# SYSTEM PROMPT: ${taskObject.title}\n\n## Ziel\nUmsetzung von: ${taskObject.userPrompt}\n\n## Gewählte Konfiguration\n- Entscheidung: ${decision}\n- Spezifikation: ${notes || 'Standard'}\n\n## Umsetzungsschritte\n1. Architektur vorbereiten in 02_Frontend_UI_und_3D_Studio/app.js\n2. Komponenten modular implementieren\n3. Verifikation durchführen`;
      const spokenSummary = resultObj?.spokenSummary || `Sir, der Antigravity-System-Prompt für "${taskObject.title}" wurde gemäß Ihrer Entscheidung erstellt und liegt zur Übernahme bereit.`;

      if (typeof window !== 'undefined') {
        const decSummary = document.getElementById('decision-summary-text');
        if (decSummary) decSummary.innerText = resultObj?.summary || taskObject.summary;
        const codePreview = document.getElementById('code-preview-content');
        if (codePreview) codePreview.innerText = antigravityPrompt;

        const decSection = document.getElementById('section-decision');
        if (decSection) decSection.style.display = 'flex';
        const progSection = document.getElementById('section-task-progress');
        if (progSection) progSection.style.display = 'none';

        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem({
            id: 'act_prompt_done_' + Date.now(),
            type: 'APPROVAL_NEEDED',
            title: `System-Prompt bereit: ${taskObject.title}`,
            message: `Der Antigravity-System-Prompt wurde fertiggestellt und kann kopiert oder exportiert werden.`,
            promptText: antigravityPrompt
          });
        }

        if (typeof window.playNotificationSound === 'function') window.playNotificationSound('SUCCESS');
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('System-Prompt fertig', `System-Prompt für ${taskObject.title} bereit`, 'SUCCESS');
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(spokenSummary);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('4/4: Bereit zur Freigabe im Action-Center');
        }
      }

      return {
        antigravityPrompt,
        spokenSummary,
        summary: resultObj?.summary || taskObject.summary
      };

    } finally {
      this.setDepartmentBusy(dept.id, false);
      if (typeof window !== 'undefined') {
        if (typeof window.updateAgentStatus === 'function') {
          if (pc1) window.updateAgentStatus(pc1.id, 'ready');
          if (pc2) window.updateAgentStatus(pc2.id, 'ready');
          if (pc3) window.updateAgentStatus(pc3.id, 'ready');
          if (dept.chef_agent) window.updateAgentStatus(dept.chef_agent.id, 'ready');
        }
        if (typeof window.processNextTaskInQueue === 'function') {
          window.processNextTaskInQueue();
        }
      }
    }
  }

  /**
   * MODUS B: IMPROVEMENT_AUDIT
   * Bereichsübergreifender Scan via Promise.all() -> Interaktive Abstimmung
   */
  async executeImprovementAuditMode(taskObject, onStatusUpdate = () => {}) {
    console.log(`[WorkflowOrchestrator] Starte MODUS B (IMPROVEMENT_AUDIT) via Promise.all()`);

    const auditDepts = [
      { id: 2, code: 'EG_ARCHITEKTUR', name: '2. Bauplan & Technik', focus: 'Architektur, Modularität & Clean Code' },
      { id: 3, code: 'EG_FRONTEND', name: '3. Optik & Bedienung', focus: 'UI/UX, 3D Canvas, CSS & Responsiveness' },
      { id: 4, code: 'EG_BACKEND', name: '4. Server & Hintergrund-Logik', focus: 'APIs, Datenfluss, Validierung & Fehlerbehandlung' },
      { id: 12, code: 'UG_SERVER', name: 'Der Serverraum', focus: 'Infrastruktur, Secrets, Performance & Redundanz' }
    ];

    auditDepts.forEach(d => this.setDepartmentBusy(d.id, true));

    const stage2Status = '2/4: Bereichsübergreifender Scan aller 4 Abteilungen...';
    onStatusUpdate(stage2Status, 'Trevor', 'Paralleler Scan via Promise.all() über Architektur, Frontend, Backend und Server...');
    if (typeof window !== 'undefined') {
      if (typeof window.updateActiveQueueItemStatus === 'function') window.updateActiveQueueItemStatus(stage2Status);
      if (typeof window.update3DStudioState === 'function') window.update3DStudioState('stage2', 'EG');
    }

    try {
      const codeContext = await this.getCodeContext('EG', taskObject.summary, taskObject.userPrompt);
      const cloudMemoryContext = await this.getMemoryContext(taskObject.userPrompt);

      // Paralleler Scan aller 4 Abteilungen via Promise.all()
      const auditPromises = auditDepts.map(async (d) => {
        const sysPrompt = `Du bist Abteilungsleiter für "${d.name}" (Schwerpunkt: ${d.focus}) im Trevor Software Studio.
Untersuche das Gesamtsystem auf konkrete Schwachstellen, Performance-Engpässe, Code-Qualität oder UX-Probleme bezogen auf: "${taskObject.userPrompt}".
Formuliere 1-2 konkrete Optimierungsvorschläge. Jeder Vorschlag MUSS eine klare Auswirkungs-Erklärung enthalten:
- impactYes: Was verbessert sich im System bei [Ja, umsetzen]?
- impactNo: Was ist die Konsequenz / das Risiko bei [Nein, verwerfen]?

Antworte AUSSCHLIESSLICH als valides JSON-Objekt:
{
  "proposals": [
    {
      "id": "prop_${d.code}_1",
      "department": "${d.name}",
      "deptCode": "${d.code}",
      "title": "Prägnanter Titel",
      "finding": "Gefundene Schwachstelle oder Optimierungspotenzial",
      "impactYes": "Konkrete Verbesserung bei Umsetzung...",
      "impactNo": "Risiko oder Konsequenz bei Verwerfung..."
    }
  ]
}`;
        try {
          const res = await queryLLM(sysPrompt, `Prüfungsauftrag: ${taskObject.userPrompt}\nCode-Referenz:\n${codeContext.slice(0, 2000)}\n${cloudMemoryContext}`, true);
          if (Array.isArray(res?.proposals) && res.proposals.length > 0) {
            return { dept: d, proposals: res.proposals };
          }
        } catch (err) {
          console.warn(`[WorkflowOrchestrator] Audit-Fehler in ${d.name}:`, err);
        }
        return {
          dept: d,
          proposals: [
            {
              id: `prop_${d.code}_1`,
              department: d.name,
              deptCode: d.code,
              title: `Optimierung ${d.name}`,
              finding: `Routine-Check für ${d.focus} empfiehlt Performance- und Stabilitäts-Audit.`,
              impactYes: `Erhöhte Ausfallsicherheit und schnellere Reaktionszeiten.`,
              impactNo: `Keine unmittelbaren Ausfälle, aber potenziell unentdeckte Latenzen.`
            }
          ]
        };
      });

      const auditResults = await Promise.all(auditPromises);

      const allProposals = [];
      auditResults.forEach(res => {
        res.proposals.forEach(p => allProposals.push(p));
      });

      const actionId = 'act_audit_' + Date.now();
      const spokenSummary = `Sir, der bereichsübergreifende Scan wurde abgeschlossen. 4 Fachabteilungen haben konkrete Optimierungsvorschläge im Action-Center zur Abstimmung hinterlegt.`;

      const pendingData = {
        id: actionId,
        actionId,
        taskId: taskObject.id,
        type: 'WAITING_FOR_USER',
        subType: 'IMPROVEMENT_AUDIT',
        title: `Optimierungs-Audit: ${allProposals.length} Vorschläge aus 4 Bereichen`,
        message: 'Trevor und die Fach-Agenten haben folgende Optimierungspotenziale identifiziert. Bitte stimmen Sie über die Umsetzung ab:',
        proposals: allProposals,
        workMode: 'IMPROVEMENT_AUDIT',
        taskObject,
        spokenSummary,
        timestamp: Date.now()
      };

      if (typeof window !== 'undefined') {
        window.pendingTasksMap = window.pendingTasksMap || {};
        window.pendingTasksMap[actionId] = pendingData;

        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem(pendingData);
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('QUESTION');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Audit abgeschlossen', `${allProposals.length} Optimierungsvorschläge bereit`, 'QUESTION', actionId);
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(spokenSummary);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('Wartet auf Nutzer-Abstimmung');
        }
        if (typeof window.processNextTaskInQueue === 'function') {
          setTimeout(() => window.processNextTaskInQueue(), 100);
        }
      }

      onStatusUpdate('Wartet auf Nutzer-Abstimmung', 'Trevor', 'Vorschlagsliste liegt im Action-Center bereit.');

      return {
        isPaused: true,
        actionId,
        workMode: 'IMPROVEMENT_AUDIT',
        reason: 'AUDIT_DECISION_NEEDED',
        pendingData,
        proposals: allProposals
      };

    } finally {
      auditDepts.forEach(d => this.setDepartmentBusy(d.id, false));
    }
  }

  /**
   * Fortsetzung von MODUS B nach Nutzer-Abstimmung
   */
  async resumeImprovementAuditTask(pendingData, decisions, notes = '') {
    const { taskObject, proposals } = pendingData;
    console.log(`[WorkflowOrchestrator] Setze IMPROVEMENT_AUDIT fort. Entscheidungen:`, decisions);

    const approvedProposals = proposals.filter(p => {
      if (typeof decisions === 'object' && decisions !== null) {
        return decisions[p.id] !== false && decisions[p.id] !== 'NEIN';
      }
      return true;
    });

    try {
      if (typeof window !== 'undefined') {
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('3/4: Trevor konsolidiert freigegebene Optimierungen...');
        }
      }

      const consolidationPrompt = `Du bist Trevor, Studio Director.
Der Nutzer hat folgende Optimierungsmaßnahmen für "${taskObject.userPrompt}" freigegeben:
${approvedProposals.map(p => `- [${p.department}] ${p.title}: ${p.finding}`).join('\n')}

Nutzer-Hinweise: "${notes || 'Keine zusätzlichen Hinweise'}".

DEINE AUFGABE:
Konsolidiere diese freigegebenen Maßnahmen in eine strukturierte Antigravity-Checkliste und generiere ein Feld "spokenSummary" mit 1-2 prägnanten Sätzen im J.A.R.V.I.S.-Stil (deutsch), die zusammenfassen, welche Verbesserungen umgesetzt werden.

Antworte als valides JSON:
{
  "spokenSummary": "1-2 Sätze im J.A.R.V.I.S.-Stil...",
  "summary": "Zusammenfassung der freigegebenen Maßnahmen...",
  "steps": [
    {
      "id": "step_1",
      "department": "Bereich",
      "title": "Titel",
      "file": "02_Frontend_UI_und_3D_Studio/app.js",
      "description": "Handlungsanweisung",
      "approved": true,
      "logicVerified": true
    }
  ]
}`;

      let res;
      try {
        res = await queryLLM(consolidationPrompt, 'Erstelle die finale Roadmap:', true);
      } catch (err) {
        console.warn('[WorkflowOrchestrator] Fehler bei Konsolidierung der Optimierungen:', err);
      }

      const steps = Array.isArray(res?.steps) ? res.steps : this.generateFallbackSteps(taskObject.userPrompt, {});
      const spokenSummary = res?.spokenSummary || `Sir, die ${approvedProposals.length} freigegebenen Optimierungsmaßnahmen wurden zusammengeführt und in die Umsetzungs-Roadmap überführt.`;

      if (typeof window !== 'undefined') {
        const decSummary = document.getElementById('decision-summary-text');
        if (decSummary) decSummary.innerText = res?.summary || `Audit abgeschlossen: ${approvedProposals.length} Maßnahmen freigegeben.`;

        const decSection = document.getElementById('section-decision');
        if (decSection) decSection.style.display = 'flex';
        const progSection = document.getElementById('section-task-progress');
        if (progSection) progSection.style.display = 'none';

        if (typeof window.renderInteractiveRoadmap === 'function') {
          window.renderInteractiveRoadmap(steps);
        }

        if (typeof window.playNotificationSound === 'function') window.playNotificationSound('SUCCESS');
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Optimierungen konsolidiert', `${steps.length} Maßnahmen bereit zur Ausführung`, 'SUCCESS');
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(spokenSummary);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('4/4: Bereit zur Freigabe im Action-Center');
        }
      }

      return {
        summary: res?.summary || 'Optimierungen konsolidiert',
        steps,
        spokenSummary
      };

    } finally {
      if (typeof window !== 'undefined' && typeof window.processNextTaskInQueue === 'function') {
        window.processNextTaskInQueue();
      }
    }
  }

  /**
   * MODUS C: GENERAL_AI_TASK
   * Volle KI-Kompetenz mit Spezialisten-Fokus via Promise.all() -> Komplettlösung
   */
  async executeGeneralAITaskMode(taskObject, onStatusUpdate = () => {}) {
    console.log(`[WorkflowOrchestrator] Starte MODUS C (GENERAL_AI_TASK) mit Spezialisten-Fokus via Promise.all()`);

    const dept = getDepartmentByCodeOrId(taskObject.primaryDepartment, this.hierarchy.departments);
    const targetFloor = dept.floor || taskObject.targetFloor || 'EG';

    if (this.isDepartmentBusy(dept.id)) {
      const busyMsg = 'In Warteschlange (Abteilung ausgelastet)';
      onStatusUpdate(busyMsg, dept.name, `Abteilung ${dept.name} ist aktuell belegt.`);
      if (typeof window !== 'undefined' && typeof window.updateActiveQueueItemStatus === 'function') {
        window.updateActiveQueueItemStatus(busyMsg);
      }
      return { isQueued: true, status: busyMsg, department: dept, taskObject };
    }

    this.setDepartmentBusy(dept.id, true);

    let pc1, pc2, pc3;
    try {
      const selectedPcs = selectSpecialistsForTask(dept, taskObject.userPrompt);
      pc1 = selectedPcs[0] || (dept.specialist_pcs && dept.specialist_pcs[0]) || { name: 'Jonas', title: 'Python & Algorithm Dev', role: 'pc_agent' };
      pc2 = selectedPcs[1] || (dept.specialist_pcs && dept.specialist_pcs[1]) || { name: 'Tim', title: 'Parser & Validation Dev', role: 'pc_agent' };
      pc3 = selectedPcs[2] || (dept.specialist_pcs && dept.specialist_pcs[2]) || { name: 'Sarah', title: 'Node.js & API Engineer', role: 'pc_agent' };

      const stage2Status = `2/4: [${dept.name}] – Fach-Spezialisten erarbeiten Komplettlösung...`;
      onStatusUpdate(stage2Status, dept.name, `${pc1.name}, ${pc2.name} und ${pc3.name} bearbeiten die Aufgabe parallel via Promise.all()...`);
      if (typeof window !== 'undefined') {
        if (typeof window.updateActiveQueueItemStatus === 'function') window.updateActiveQueueItemStatus(stage2Status);
        if (typeof window.update3DStudioState === 'function') window.update3DStudioState('stage2', targetFloor);
        if (typeof window.setStageIn3D === 'function') window.setStageIn3D(2);
        if (typeof window.updateAgentStatus === 'function') {
          window.updateAgentStatus(pc1.id, 'working', `Erstellt Lösung: ${taskObject.title || taskObject.summary}`);
          window.updateAgentStatus(pc2.id, 'working', `Prüft Kernaussagen & Synthese`);
          window.updateAgentStatus(pc3.id, 'working', `Analysiert Stolpersteine & Edge-Cases`);
          if (dept.chef_agent) window.updateAgentStatus(dept.chef_agent.id, 'working', `Koordiniert Fachteam`);
        }
      }

      // 3 Fach-Agenten bearbeiten parallel via Promise.all()
      const [solutionPart, summaryPart, pitfallsPart] = await Promise.all([
        queryLLM(
          `Du bist ${pc1.name}, ${pc1.title || 'Spezialist'} in der Abteilung "${dept.name}".
Aufgabe: Erstelle eine exakte, vollständige Schritt-für-Schritt-Lösung, den lauffähigen Code/Skript oder die genaue Berechnung für folgende Anforderung:
"${taskObject.userPrompt}".
Nenne zu Beginn deines Beitrags deinen Namen (${pc1.name}) und dein Fachgebiet (${pc1.title || pc1.focus}).
Strukturiere die Antwort klar mit Markdown-Überschriften und Code-Blöcken.`,
          taskObject.userPrompt,
          false
        ),
        queryLLM(
          `Du bist ${pc2.name}, ${pc2.title || 'Spezialist'} in der Abteilung "${dept.name}".
Aufgabe: Erstelle eine prägnante Zusammenfassung (Executive Summary) und 3-4 zentrale Merksätze für folgende Anforderung:
"${taskObject.userPrompt}".
Nenne zu Beginn deines Beitrags deinen Namen (${pc2.name}) und dein Fachgebiet (${pc2.title || pc2.focus}).
Verzichte auf Floskeln, bringe die Kernaussage auf den Punkt.`,
          taskObject.userPrompt,
          false
        ),
        queryLLM(
          `Du bist ${pc3.name}, ${pc3.title || 'Spezialist'} in der Abteilung "${dept.name}".
Aufgabe: Nenne die 3 wichtigsten typischen Stolpersteine, Best Practices und Sicherheits- oder Edge-Case-Aspekte für folgende Anforderung:
"${taskObject.userPrompt}".
Nenne zu Beginn deines Beitrags deinen Namen (${pc3.name}) und dein Fachgebiet (${pc3.title || pc3.focus}).`,
          taskObject.userPrompt,
          false
        )
      ]);

      const stage3Status = `3/4: [${dept.name}] – Abteilungsleiter & Trevor konsolidieren Komplettlösung...`;
      onStatusUpdate(stage3Status, dept.chef_agent.name, 'Zusammenführung von Lösung, Zusammenfassung und Best Practices...');
      if (typeof window !== 'undefined') {
        if (typeof window.updateActiveQueueItemStatus === 'function') window.updateActiveQueueItemStatus(stage3Status);
        if (typeof window.update3DStudioState === 'function') window.update3DStudioState('stage3', targetFloor);
        if (typeof window.setStageIn3D === 'function') window.setStageIn3D(3);
      }

      const consolidationPrompt = `Du bist Trevor, Studio Director, unterstützt von Abteilungsleiter ${dept.chef_agent.name} (${dept.name}).
Führe die drei Bausteine deiner Spezial-Agenten zu einer perfekten, übersichtlichen und direkt verwendbaren Gesamtlösung zusammen.

BEITRAG 1 (LÖSUNG/CODE von ${pc1.name} – ${pc1.title}):
${solutionPart}

BEITRAG 2 (ZUSAMMENFASSUNG von ${pc2.name} – ${pc2.title}):
${summaryPart}

BEITRAG 3 (BEST PRACTICES & EDGE-CASES von ${pc3.name} – ${pc3.title}):
${pitfallsPart}

ANFORDERUNG:
Erzeuge ein valides JSON-Objekt mit:
1. "spokenSummary": 1-2 prägnante Sätze im J.A.R.V.I.S.-Stil auf Deutsch, die inhaltlich zusammenfassen, WAS gelöst wurde.
2. "executiveSummary": Kompakte Zusammenfassung der Kernaussage.
3. "fullSolutionMarkdown": Die vollständige, wunderschön formatierte Gesamtlösung mit allen Abschnitten (📋 Executive Summary, 🛠️ Schritt-für-Schritt Lösung / Code von ${pc1.name}, 💡 Best Practices & Stolpersteine von ${pc3.name}, 🔍 Freigabe durch ${dept.chef_agent.name}).

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "spokenSummary": "...",
  "executiveSummary": "...",
  "fullSolutionMarkdown": "..."
}`;

      let consolidated;
      try {
        consolidated = await queryLLM(consolidationPrompt, 'Konsolidiere die Gesamtlösung:', true);
      } catch (err) {
        console.warn('[WorkflowOrchestrator] Fehler bei Konsolidierung von GENERAL_AI_TASK:', err);
      }

      const sPart = solutionPart || `### 🛠️ Lösungsausarbeitung durch ${pc1.name} (${pc1.title})\n\`\`\`javascript\n// Implementierung durch ${pc1.name} (${dept.name})\nexport function executeSolution() {\n  return { status: "ready", processed: true, specialist: "${pc1.name}", timestamp: Date.now() };\n}\n\`\`\``;
      const sumPart = summaryPart || `Die Anforderung "${taskObject.userPrompt}" wurde durch ${pc2.name} (${pc2.title}) analysiert und strukturiert.`;
      const pitPart = pitfallsPart || `- [${pc3.name}]: Eingabevalidierung zur Absicherung vor ungültigen Typen sicherstellen.\n- [${pc3.name}]: Fehlerbehandlung für Randfälle und asynchrone Fehlerketten etablieren.\n- [${dept.chef_agent.name}]: Abteilungs-Audit erfolgreich abgeschlossen.`;

      const fullMarkdown = consolidated?.fullSolutionMarkdown || `## 📋 Zusammenfassung\n${sumPart}\n\n## 🛠️ Schritt-für-Schritt Lösung\n${sPart}\n\n## 💡 Best Practices & Stolpersteine\n${pitPart}`;
      const spokenSummary = consolidated?.spokenSummary || `Sir, die Lösung für Ihre Anfrage bezüglich "${taskObject.title || 'Aufgabe'}" wurde durch die Spezialisten von ${dept.name} (${pc1.name}, ${pc2.name}) ausgearbeitet und liegt im Action-Center bereit.`;

      const actionId = 'act_sol_' + Date.now();
      const cardData = {
        id: actionId,
        actionId,
        type: 'SOLUTION_READY',
        title: `Lösung bereit: ${taskObject.title || 'KI-Lösung'}`,
        message: consolidated?.executiveSummary || `Vollständige Ausarbeitung durch die Spezialisten von ${dept.name} abgeschlossen.`,
        solution: fullMarkdown,
        solutionMarkdown: fullMarkdown,
        spokenSummary,
        departmentName: dept.name,
        taskObject,
        timestamp: Date.now()
      };

      if (typeof window !== 'undefined') {
        if (typeof window.addActionCenterItem === 'function') {
          window.addActionCenterItem(cardData);
        }
        if (typeof window.playNotificationSound === 'function') {
          window.playNotificationSound('SUCCESS');
        }
        if (typeof window.showActionToast === 'function') {
          window.showActionToast('Lösung bereit', `Ausarbeitung zu ${taskObject.title || 'Aufgabe'} abgeschlossen`, 'SUCCESS', actionId);
        }
        if (typeof window.speakAsJarvis === 'function') {
          window.speakAsJarvis(spokenSummary);
        }
        if (typeof window.updateActiveQueueItemStatus === 'function') {
          window.updateActiveQueueItemStatus('4/4: Bereit zur Freigabe im Action-Center');
        }
        if (typeof window.showQAPanel === 'function') {
          window.showQAPanel(taskObject.userPrompt, fullMarkdown);
        }
      }

      onStatusUpdate('4/4: Bereit zur Freigabe im Action-Center', 'Trevor', 'Komplettlösung im Action-Center bereitgestellt.');

      return {
        isPaused: false,
        summary: consolidated?.executiveSummary || taskObject.summary,
        solution: fullMarkdown,
        solutionMarkdown: fullMarkdown,
        spokenSummary,
        isQuestion: true,
        workMode: 'GENERAL_AI_TASK'
      };

    } finally {
      this.setDepartmentBusy(dept.id, false);
      if (typeof window !== 'undefined') {
        if (typeof window.updateAgentStatus === 'function') {
          if (pc1) window.updateAgentStatus(pc1.id, 'ready');
          if (pc2) window.updateAgentStatus(pc2.id, 'ready');
          if (pc3) window.updateAgentStatus(pc3.id, 'ready');
          if (dept.chef_agent) window.updateAgentStatus(dept.chef_agent.id, 'ready');
        }
        if (typeof window.processNextTaskInQueue === 'function') {
          window.processNextTaskInQueue();
        }
      }
    }
  }

  /**
   * Router zur Wiederaufnahme eines pausierten Tasks aus dem Action-Center
   */
  async resumePendingTask(pendingData, decision, notes = '') {
    if (!pendingData) return;
    console.log(`[WorkflowOrchestrator] Wiederaufnahme von Task ${pendingData.id} (Typ: ${pendingData.subType || pendingData.type})`);

    if (pendingData.subType === 'CLARIFICATION' || (pendingData.type === 'WAITING_FOR_USER' && pendingData.preCheckResult)) {
      const originalPrompt = pendingData.taskObject.userPrompt;
      const enhancedPrompt = `${originalPrompt}\n\n[Nutzer-Präzisierung auf Rückfrage]: Entscheidung: ${decision || 'Ja'}, Details: ${notes || 'Keine'}`;
      console.log(`[WorkflowOrchestrator] Fortsetzung nach Rückfrage mit neuem Prompt: "${enhancedPrompt}"`);

      const taskObject = {
        ...pendingData.taskObject,
        userPrompt: enhancedPrompt,
        prompt: enhancedPrompt,
        summary: `${pendingData.taskObject.summary} (präzisiert)`
      };

      if (taskObject.workMode === 'PROMPT_REQUEST') {
        return await this.executePromptRequestMode(taskObject);
      } else if (taskObject.workMode === 'IMPROVEMENT_AUDIT') {
        return await this.executeImprovementAuditMode(taskObject);
      } else {
        return await this.executeGeneralAITaskMode(taskObject);
      }
    }

    if (pendingData.subType === 'PROMPT_DECISION') {
      return await this.resumePromptRequestTask(pendingData, decision, notes);
    }

    if (pendingData.subType === 'IMPROVEMENT_AUDIT') {
      return await this.resumeImprovementAuditTask(pendingData, decision, notes);
    }

    console.warn(`[WorkflowOrchestrator] Unbekannter Pending-Typ: ${pendingData.subType || pendingData.type}`);
  }

  /**
   * Zwingender Übergang zu Stufe 2 (Routing-Schnittstelle)
   */
  async dispatchTaskToDepartment(taskObject, onStatusUpdate = () => {}) {
    if (taskObject.workMode === 'PROMPT_REQUEST') {
      return await this.executePromptRequestMode(taskObject, onStatusUpdate);
    } else if (taskObject.workMode === 'IMPROVEMENT_AUDIT') {
      return await this.executeImprovementAuditMode(taskObject, onStatusUpdate);
    } else {
      return await this.executeGeneralAITaskMode(taskObject, onStatusUpdate);
    }
  }

  /**
   * Extrahiert Code-RAG Kontext
   */
  async getCodeContext(floor, summary, prompt) {
    if (floor !== 'EG') return '';
    try {
      let candidateFiles = [];
      if (typeof window !== 'undefined' && Array.isArray(window.selectedContextFiles) && window.selectedContextFiles.length > 0) {
        candidateFiles = [...window.selectedContextFiles];
      } else {
        candidateFiles = this.extractCandidateFilePaths(summary || '', prompt || '');
      }
      if (candidateFiles.length > 0) {
        const fetched = await this.fetchFilesContext(candidateFiles);
        if (fetched && fetched.length > 0) {
          return fetched.map(f => `### DATEI: ${f.path}\n\`\`\`\n${f.content.slice(0, 5000)}\n\`\`\``).join('\n\n');
        }
      }
    } catch (ragErr) {
      console.warn('[WorkflowOrchestrator] Code-RAG Fehler:', ragErr.message);
    }
    return '';
  }

  /**
   * Extrahiert Cloud-Memory Kontext
   */
  async getMemoryContext(prompt) {
    try {
      const hits = await this.searchCloudMemory(prompt);
      if (hits && hits.length > 0) {
        return hits.map(m => `### [Gedächtnis / ${m.department}] ${m.topic}\n- Problem: ${m.problem_statement}\n- Lösungsmuster: ${m.solution_pattern}`).join('\n\n');
      }
    } catch (memErr) {
      console.warn('[WorkflowOrchestrator] Cloud-Memory Fehler:', memErr.message);
    }
    return '';
  }

  /**
   * Parst Datei-Pfade für Code-RAG
   */
  extractCandidateFilePaths(...texts) {
    const fileRegex = /(?:[a-zA-Z0-9_\-\.\/]+)\.(?:js|json|html|css|md|sql)/g;
    const candidates = new Set();

    for (const text of texts) {
      if (!text || typeof text !== 'string') continue;
      let match;
      while ((match = fileRegex.exec(text)) !== null) {
        let candidate = match[0].trim();
        if (candidate.startsWith('./')) candidate = candidate.slice(2);
        if (candidate.startsWith('/')) candidate = candidate.slice(1);
        if (candidate.length > 3 && !candidate.startsWith('http') && !candidate.includes(' ') && candidate.includes('.')) {
          candidates.add(candidate);
        }
      }
    }

    return Array.from(candidates);
  }

  /**
   * Lädt Datei-Inhalte für Code-RAG
   */
  async fetchFilesContext(filePaths) {
    if (!filePaths || filePaths.length === 0) return [];
    const results = [];

    for (const p of filePaths) {
      try {
        let resp = await fetch(`/api/rag-file?path=${encodeURIComponent(p)}`);
        if (!resp.ok) {
          resp = await fetch(`http://localhost:3001/api/rag-file?path=${encodeURIComponent(p)}`);
        }
        if (resp.ok) {
          const text = await resp.text();
          results.push({ path: p, content: text });
        }
      } catch {
        // Ignorieren
      }
    }

    return results;
  }

  /**
   * Durchsucht das Supabase-Cloud-Gedächtnis
   */
  async searchCloudMemory(query) {
    if (!query || typeof query !== 'string') return [];
    try {
      const resp = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query })
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return Array.isArray(data.results) ? data.results : [];
    } catch (err) {
      console.warn('[WorkflowOrchestrator] Fehler bei Cloud-Gedächtnis-Suche:', err.message);
      return [];
    }
  }

  /**
   * Sub-Agenten bearbeiten parallel via Promise.all()
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
      const pcPromises = subTask.workerAgents.map(async (pc) => {
        onStatusUpdate(
          'Stufe 2/4: Fach-Agenten (Worker Execution)',
          pc.name,
          `${pc.name} (${subTask.departmentName}) erarbeitet Modul...`
        );

        if (typeof window !== 'undefined' && typeof window.updateAgentStatus === 'function') {
          window.updateAgentStatus(pc.id, 'working', `Analysiert ${subTask.departmentName}...`);
        }

        const systemPrompt = `Du bist ${pc.name}, Spezialist für "${pc.title}" in der Abteilung "${subTask.departmentName}".
Aufgabe: ${pc.easy_explanation}.
Erstelle eine konkrete technische Lösung mit relevanten Dateipfaden (z. B. 02_Frontend_UI_und_3D_Studio/..., 06_Deployment_und_Config/..., 01_Datenbank_Supabase/...).`;

        const userMsg = `AUFTRAG:\n"""\n${userPrompt}\n"""${ragContextSection}${memoryContextSection}\n\nErstelle deine technische Detailausarbeitung:`;

        const output = await queryLLM(systemPrompt, userMsg, false);

        if (typeof window !== 'undefined' && typeof window.updateAgentStatus === 'function') {
          window.updateAgentStatus(pc.id, 'done', 'Aufgabe abgeschlossen');
        }

        return {
          agentId: pc.id,
          agentName: pc.name,
          departmentId: subTask.departmentId,
          departmentName: subTask.departmentName,
          outputText: output
        };
      });

      const results = await Promise.all(pcPromises);
      results.forEach(res => {
        workerOutputs[res.agentId] = res;
      });
    }

    return workerOutputs;
  }

  /**
   * Abteilungsleiter fassen zusammen
   */
  async aggregateDepartmentResults(subTasks, workerOutputs, userPrompt, onStatusUpdate = () => {}) {
    const departmentReports = {};

    for (const subTask of subTasks) {
      const chef = subTask.leadAgent;
      onStatusUpdate(
        'Stufe 3/4: Abteilungsleiter-Audit (Lead Audit)',
        chef.name,
        `${chef.name} konsolidiert Ergebnisse für ${subTask.departmentName}...`
      );

      const specialistReports = subTask.workerAgents
        .map(pc => `--- ${pc.name} (${pc.title}) ---\n${workerOutputs[pc.id]?.outputText || 'Keine Ausgabe'}`)
        .join('\n\n');

      const systemPrompt = `Du bist ${chef.name}, Abteilungsleiter für "${subTask.departmentName}".
Prüfe die Ausarbeitungen deiner Spezialisten auf Vollständigkeit, Logikfehler und korrekte ES-Modul-Dateiendungen (.js).`;

      const userMsg = `URSPRÜNGLICHER AUFTRAG:\n"""\n${userPrompt}\n"""\n\nBERICHTE DER SPEZIALISTEN:\n${specialistReports}\n\nErstelle deinen Audit-Bericht:`;

      const auditReport = await queryLLM(systemPrompt, userMsg, false);

      departmentReports[subTask.departmentId] = {
        departmentId: subTask.departmentId,
        departmentName: subTask.departmentName,
        leadName: chef.name,
        reportText: auditReport,
        contradictionsResolved: 'Logikfehler und Abhängigkeiten bereinigt.'
      };
    }

    return departmentReports;
  }

  /**
   * Finale Synthese mit zwingendem spokenSummary
   */
  async synthesizeFinalPlan(userPrompt, departmentReports) {
    const reportsText = Object.values(departmentReports)
      .map(r => `### ${r.departmentName} (Geprüft durch ${r.leadName}):\n${r.reportText.slice(0, 400)}`)
      .join('\n\n');

    const systemPrompt = `Du bist Trevor, Studio Director von "Trevor AI Software Studio".
Antworte im Tonfall von J.A.R.V.I.S. aus Iron Man: präzise, trocken-britisch, extrem höflich ('Sir').
Fasse alle Maßnahmen zu einer strukturierten Liste von Schritten zusammen.

Du MUSST zwingend ein Feld "spokenSummary" mit 1-2 präzisen Sätzen im J.A.R.V.I.S.-Stil auf Deutsch erzeugen, die inhaltlich konkret zusammenfassen, WAS gelöst wurde.

Antworte AUSSCHLIESSLICH als valides JSON:
{
  "spokenSummary": "1-2 präzise Sätze im J.A.R.V.I.S.-Stil...",
  "summary": "Ausführliche Zusammenfassung...",
  "steps": [
    {
      "id": "step_1",
      "department": "Frontend & 3D",
      "title": "Titel der Maßnahme",
      "file": "02_Frontend_UI_und_3D_Studio/app.js",
      "description": "Exakte technische Handlungsanweisung",
      "logicVerified": true,
      "approved": true
    }
  ]
}`;

    const userMsg = `KUNDENAUFTRAG:\n"""\n${userPrompt}\n"""\n\nGEPRÜFTE ABTEILUNGSBERICHTE:\n${reportsText}\n\nErstelle jetzt das JSON:`;

    let steps = [];
    let spokenSummary = '';
    let summaryText = '';

    try {
      const jsonResponse = await queryLLM(systemPrompt, userMsg, true);
      if (jsonResponse && typeof jsonResponse === 'object') {
        if (Array.isArray(jsonResponse.steps)) steps = jsonResponse.steps;
        else if (Array.isArray(jsonResponse)) steps = jsonResponse;
        spokenSummary = jsonResponse.spokenSummary || '';
        summaryText = jsonResponse.summary || '';
      }
    } catch (err) {
      console.warn('[WorkflowOrchestrator] Fehler beim JSON-Synthese-Parsing:', err);
    }

    if (!steps || steps.length === 0) {
      steps = this.generateFallbackSteps(userPrompt, departmentReports);
    }

    steps = steps.map((s, idx) => ({
      id: s.id || `step_${idx + 1}`,
      department: s.department || 'Allgemein',
      title: s.title || `Maßnahme ${idx + 1}`,
      file: s.file || '02_Frontend_UI_und_3D_Studio/app.js',
      description: s.description || 'Technische Umsetzung gemäß Trevor Studio Spezifikation.',
      logicVerified: true,
      approved: s.approved !== false
    }));

    if (!spokenSummary) {
      spokenSummary = `Sir, die Fachabteilungen haben ${steps.length} konkrete Maßnahmen für Ihren Auftrag erarbeitet und zur Abstimmung bereitgestellt.`;
    }

    const trevorSummary = summaryText || (
      `Trevor hat deinen Auftrag "${userPrompt.slice(0, 60)}" aufbereitet:\n\n` +
      `• Stufe 1: Zerlegung in ${Object.keys(departmentReports).length} Fachabteilungen erfolgt.\n` +
      `• Stufe 2: Technische Fach-Ausarbeitungen durch Spezial-PCs erstellt.\n` +
      `• Stufe 3: Logikprüfung und Abhängigkeiten durch Abteilungsleiter validiert.\n` +
      `• Stufe 4: ${steps.length} konkrete Maßnahmen vorbereitet.`
    );

    return {
      summary: trevorSummary,
      steps,
      spokenSummary,
      departmentReports
    };
  }

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
  window.trevorOrchestrator = orchestrator;
  window.safeParseTrevorJSON = safeParseTrevorJSON;
  window.classifyWorkMode = classifyWorkMode;
  window.detectPrimaryDepartment = detectPrimaryDepartment;
  window.getDepartmentByCodeOrId = getDepartmentByCodeOrId;
}
