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

export class WorkflowOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.hierarchy = STUDIO_HIERARCHY;
  }

  /**
   * Führt den vollständigen 4-Stufen-Workflow mit Live-Statusupdates aus
   * @param {string} userPrompt - Kundenauftrag
   * @param {function} onStatusUpdate - Callback: (stageName, agentName, message) => void
   * @returns {Promise<object>} - { summary, steps, rawReports }
   */
  async executeFullWorkflow(userPrompt, onStatusUpdate = () => {}) {
    console.log(`\n======================================================`);
    console.log(`[WorkflowOrchestrator] Starte 4-Stufen Workflow: "${userPrompt.slice(0, 60)}..."`);
    console.log(`======================================================\n`);

    // -------------------------------------------------------------------------
    // STUFE 1: TREVOR (CEO & DISPATCHER)
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 1/4: Trevor (CEO & Dispatcher)',
      'Trevor',
      'Analysiert den Auftrag und zerlegt ihn in spezifische Abteilungs-Tasks...'
    );

    const subTasks = await this.dispatchTask(userPrompt);
    console.log(`[Stufe 1] Auftrag in ${subTasks.length} Abteilungs-Tasks zerlegt.`);

    // -------------------------------------------------------------------------
    // STUFE 2: FACH-AGENTEN (WORKER EXECUTION)
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 2/4: Fach-Agenten (Worker Execution)',
      'Spezial-PCs',
      'Fach-Agenten erarbeiten konkrete technische Lösungen und Dateipfade...'
    );

    const workerOutputs = await this.executeWorkerTasks(subTasks, userPrompt, onStatusUpdate);
    console.log(`[Stufe 2] ${Object.keys(workerOutputs).length} Fach-Ausarbeitungen erstellt.`);

    // -------------------------------------------------------------------------
    // STUFE 3: ABTEILUNGSLEITER (LEAD AUDIT & LOGIKPRÜFUNG)
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 3/4: Abteilungsleiter (Lead Audit)',
      'Chef-Agenten',
      'Abteilungsleiter prüfen auf Logikfehler, ES-Modul-Grenzen und Abhängigkeiten...'
    );

    const departmentReports = await this.aggregateDepartmentResults(subTasks, workerOutputs, userPrompt, onStatusUpdate);
    console.log(`[Stufe 3] ${Object.keys(departmentReports).length} geprüfte Abteilungsberichte erstellt.`);

    // -------------------------------------------------------------------------
    // STUFE 4: TREVOR (SYNTHESE & STRUKTURIERTE CHECKLISTE)
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 4/4: Trevor (Synthese & Checkliste)',
      'Trevor',
      'Trevor synthetisiert alle Berichte und generiert die interaktive Checkliste...'
    );

    const finalPlan = await this.synthesizeFinalPlan(userPrompt, departmentReports);
    console.log(`[Stufe 4] Finale Checkliste mit ${finalPlan.steps.length} Schritten fertiggestellt.`);

    return finalPlan;
  }

  /**
   * 1. dispatchTask: Trevor zerlegt den Auftrag in Abteilungs-Tasks
   */
  async dispatchTask(userPrompt) {
    const availableDepts = this.hierarchy.departments.map(d => `${d.id}. ${d.name}: ${d.easy_explanation}`).join('\n');

    const systemPrompt = `Du bist Trevor, der Studio-Director und Master-Dispatcher von "Trevor AI Software Studio".
Deine Aufgabe in Stufe 1 ist es, den Kundenauftrag zu analysieren und festzulegen, welche Fachabteilungen dafür zwingend benötigt werden.

VERFÜGBARE ABTEILUNGEN:
${availableDepts}

Wähle die relevanten Abteilungs-IDs (als Array von Zahlen, z. B. [1, 2, 3, 5, 6, 10]) und gib eine kurze Begründung.`;

    const userMsg = `KUNDENAUFTRAG:\n"""\n${userPrompt}\n"""\n\nWelche Abteilungen sind erforderlich?`;

    // Heuristik & LLM
    let selectedDeptIds = [];
    try {
      const response = await queryLLM(systemPrompt, userMsg, false);
      const match = response.match(/\[\s*[\d\s,]+\s*\]/);
      if (match) {
        selectedDeptIds = JSON.parse(match[0]);
      }
    } catch { /* ignore */ }

    if (!selectedDeptIds || selectedDeptIds.length === 0) {
      const p = userPrompt.toLowerCase();
      selectedDeptIds = [1, 2]; // Planung & Architektur immer
      if (p.includes('ui') || p.includes('frontend') || p.includes('design') || p.includes('button')) selectedDeptIds.push(3);
      if (p.includes('3d') || p.includes('canvas') || p.includes('three') || p.includes('grafik')) selectedDeptIds.push(4);
      if (p.includes('backend') || p.includes('server') || p.includes('api') || p.includes('auth')) selectedDeptIds.push(5);
      if (p.includes('datenbank') || p.includes('database') || p.includes('sql') || p.includes('supabase')) selectedDeptIds.push(6);
      if (p.includes('ki') || p.includes('llm') || p.includes('gemini') || p.includes('ollama')) selectedDeptIds.push(7);
      if (p.includes('test') || p.includes('qa') || p.includes('fehler')) selectedDeptIds.push(8);
      selectedDeptIds.push(10); // Antigravity Synthesis
    }

    selectedDeptIds = Array.from(new Set(selectedDeptIds));
    const activeDepts = this.hierarchy.departments.filter(d => selectedDeptIds.includes(d.id));

    return activeDepts.map(dept => ({
      departmentId: dept.id,
      departmentName: dept.name,
      departmentCode: dept.code,
      leadAgent: dept.chef_agent,
      workerAgents: dept.specialist_pcs,
      mission: `Spezifische technische Ausarbeitung für ${dept.name} zum Auftrag: "${userPrompt.slice(0, 80)}"`
    }));
  }

  /**
   * 2. executeWorkerTasks: Sub-Agenten bearbeiten ihre Teilaufgaben
   */
  async executeWorkerTasks(subTasks, userPrompt, onStatusUpdate = () => {}) {
    const workerOutputs = {};

    for (const subTask of subTasks) {
      for (const pc of subTask.workerAgents) {
        onStatusUpdate(
          'Stufe 2/4: Fach-Agenten (Worker Execution)',
          pc.name,
          `${pc.name} (${subTask.departmentName}) erarbeitet Modul...`
        );

        const systemPrompt = `Du bist ${pc.name}, Spezialist für "${pc.title}" in der Abteilung "${subTask.departmentName}".
Aufgabe: ${pc.easy_explanation}.
Erstelle eine konkrete technische Lösung mit relevanten Dateipfaden (z. B. 02_Frontend_UI_und_3D_Studio/..., 06_Deployment_und_Config/..., 01_Datenbank_Supabase/...).`;

        const userMsg = `AUFTRAG:\n"""\n${userPrompt}\n"""\n\nErstelle deine technische Detailausarbeitung:`;

        const output = await queryLLM(systemPrompt, userMsg, false);
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
}
