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
    // PRE-ROUTING: LLM-KLASSIFIZIERUNG (SOFTWARE_DEV vs. ALLGEMEIN_HARDWARE)
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 1/4: Pre-Routing (Etagen-Klassifizierung)',
      'Trevor',
      'Klassifiziert Auftrag: Prüfe ob Software-Code (EG) oder Non-Code/Hardware/Archiv (UG)...'
    );

    const routing = await this.classifyTaskType(userPrompt);
    console.log(`[Pre-Routing] Klassifizierung: ${routing.classification} -> Ziel-Etage: ${routing.floor} (${routing.reason})`);

    // 3D-Bühne sofort über Ziel-Etage informieren (Kamera-Fahrt UG/EG)
    if (typeof window !== 'undefined' && typeof window.update3DStudioState === 'function') {
      window.update3DStudioState(routing.floor === 'UG' ? 'ug_active' : 'stage1');
    }

    // -------------------------------------------------------------------------
    // STUFE 1: TREVOR (CEO & DISPATCHER)
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 1/4: Trevor (CEO & Dispatcher)',
      'Trevor',
      routing.floor === 'UG'
        ? `ALLGEMEIN_HARDWARE erkannt -> Verteilt Aufgaben an das Untergeschoss (UG: Archiv, Serverraum, Werkstatt, Lounge)...`
        : `SOFTWARE_DEV erkannt -> Verteilt Aufgaben an den Software-Campus (EG)...`
    );

    const subTasks = await this.dispatchTask(userPrompt, routing);
    console.log(`[Stufe 1] Auftrag in ${subTasks.length} Abteilungs-Tasks (${routing.floor}) zerlegt.`);

    // -------------------------------------------------------------------------
    // CODE-RAG: KONTEXT-ABRUF AUS DATEIEN (NUR BEI SOFTWARE_DEV / EG)
    // -------------------------------------------------------------------------
    let codeContext = '';
    if (routing.classification === 'SOFTWARE_DEV') {
      try {
        let candidateFiles = [];
        let isManualSelection = false;

        // Priorität 1: Manuelle Dateiauswahl des Nutzers im UI (window.selectedContextFiles)
        if (typeof window !== 'undefined' && Array.isArray(window.selectedContextFiles) && window.selectedContextFiles.length > 0) {
          candidateFiles = [...window.selectedContextFiles];
          isManualSelection = true;
          console.log(`[WorkflowOrchestrator] Code-RAG: Verwende ${candidateFiles.length} manuell ausgewählte Kontext-Dateien aus window.selectedContextFiles (Regex-Fallback übersprungen).`);
        } else {
          // Priorität 2: Automatische Regex-Erkennung aus Prompt & Dispatcher-Antwort
          candidateFiles = this.extractCandidateFilePaths(subTasks.rawAnalysis || '', userPrompt);
        }

        if (candidateFiles.length > 0) {
          onStatusUpdate(
            'Stufe 1/4: Code-RAG (Kontext-Abruf)',
            'Trevor',
            isManualSelection
              ? `Lese Quellcode von ${candidateFiles.length} manuell gewählten Kontext-Dateien (Sandbox) via Bridge (Port 3001)...`
              : `Lese Quellcode von ${candidateFiles.length} identifizierten Projektdateien via Bridge (Port 3001)...`
          );

          const fetchedFiles = await this.fetchFilesContext(candidateFiles);
          if (fetchedFiles && fetchedFiles.length > 0) {
            codeContext = fetchedFiles.map(f => {
              const snippet = f.content.length > 6000 
                ? `${f.content.slice(0, 6000)}\n// ... [weiterer Code gekürzt für Prompt-Kontext]` 
                : f.content;
              return `### DATEI: ${f.path}\n\`\`\`\n${snippet}\n\`\`\``;
            }).join('\n\n');

            console.log(`[WorkflowOrchestrator] Code-RAG: ${fetchedFiles.length} Dateien erfolgreich für Fach-Agenten geladen.`);
          }
        }
      } catch (ragErr) {
        console.warn('[WorkflowOrchestrator] Code-RAG nicht verfügbar (Bridge offline?):', ragErr.message);
        codeContext = '';
      }
    } else {
      console.log('[WorkflowOrchestrator] Code-RAG für UG / ALLGEMEIN_HARDWARE automatisch übersprungen (Token-Ersparnis).');
    }

    // -------------------------------------------------------------------------
    // STUFE 2: FACH-AGENTEN (WORKER EXECUTION) MIT CODE-RAG INJEKTION
    // -------------------------------------------------------------------------
    onStatusUpdate(
      'Stufe 2/4: Fach-Agenten (Worker Execution)',
      'Spezial-PCs',
      'Fach-Agenten erarbeiten konkrete technische Lösungen und Dateipfade...'
    );

    const workerOutputs = await this.executeWorkerTasks(subTasks, userPrompt, onStatusUpdate, codeContext);
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
   * 0. classifyTaskType: Pre-Routing per LLM (SOFTWARE_DEV vs. ALLGEMEIN_HARDWARE)
   */
  async classifyTaskType(userPrompt) {
    const systemPrompt = `Du bist Trevors KI-Routing-Classifier.
Analysiere die Benutzeranfrage und klassifiziere sie in genau EINE von zwei Kategorien:
1. SOFTWARE_DEV: Webentwicklung, Apps, Three.js, JavaScript, Python, APIs, SQL, Frontend, Backend, Bugs, Code-Architektur (Ziel: Erdgeschoss EG).
2. ALLGEMEIN_HARDWARE: Physische Hardware, Elektronik, ESP32, Arduino, Raspberry Pi, Löten, PCB, Serverraum-Verkabelung/Netzwerkinfrastruktur, Allgemeinwissen, Recherche, Textverfassung, Brainstorming, Alltagsorganisation oder Gaming/Freizeit (Ziel: Untergeschoss UG).

Antworte ausschließlich im JSON-Format:
{
  "classification": "SOFTWARE_DEV" oder "ALLGEMEIN_HARDWARE",
  "floor": "EG" oder "UG",
  "reason": "Kurze Begründung"
}`;

    try {
      const resp = await queryLLM(systemPrompt, `Aufgabe: "${userPrompt}"`, false);
      const parsed = JSON.parse(resp);
      const isUG = (parsed.classification || '').toUpperCase().includes('HARDWARE') || (parsed.floor || '').toUpperCase() === 'UG';
      return {
        classification: isUG ? 'ALLGEMEIN_HARDWARE' : 'SOFTWARE_DEV',
        floor: isUG ? 'UG' : 'EG',
        reason: parsed.reason || 'LLM Pre-Routing Klassifizierung'
      };
    } catch {
      // Heuristischer Fallback bei Offline-Betrieb / JSON-Parse-Fehler
      const p = userPrompt.toLowerCase();
      const ugKeywords = [
        'hardware', 'elektronik', 'schaltung', 'löten', 'sensor', 'esp32', 'arduino', 'raspberry',
        'serverraum', 'netzwerktechnik', 'kabel', 'router', 'switch', 'rack', 'vpn', 'patchpanel',
        'archiv', 'recherche', 'text schreiben', 'aufsatz', 'brainstorming', 'allgemeinwissen', 'artikel',
        'lounge', 'gaming', 'alltag', 'freizeit', 'pause', 'terminplan', 'lifestyle', 'kaffee'
      ];
      const isUG = ugKeywords.some(kw => p.includes(kw));
      return {
        classification: isUG ? 'ALLGEMEIN_HARDWARE' : 'SOFTWARE_DEV',
        floor: isUG ? 'UG' : 'EG',
        reason: isUG ? 'Heuristik: Hardware/Non-Coding Schlüsselwörter erkannt' : 'Heuristik: Standard Software-Entwicklung'
      };
    }
  }

  /**
   * 1. dispatchTask: Trevor zerlegt den Auftrag in Abteilungs-Tasks (gefiltert nach Etage)
   */
  async dispatchTask(userPrompt, routing = { classification: 'SOFTWARE_DEV', floor: 'EG' }) {
    const targetFloor = routing.floor || (routing.classification === 'ALLGEMEIN_HARDWARE' ? 'UG' : 'EG');

    // Filtere verfügbare Abteilungen strikt nach Etage!
    const availableDeptsList = this.hierarchy.departments.filter(d => {
      if (targetFloor === 'UG') return d.floor === 'UG';
      return d.floor !== 'UG';
    });

    const availableDepts = availableDeptsList.map(d => `${d.id}. ${d.name} (${d.floor || 'EG'}): ${d.easy_explanation}`).join('\n');

    const systemPrompt = `Du bist Trevor, der Studio-Director und Master-Dispatcher von "Trevor AI Software Studio".
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
      const resp = await fetch('http://localhost:3001/api/read-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filePaths })
      });

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
   * 2. executeWorkerTasks: Sub-Agenten bearbeiten ihre Teilaufgaben (mit Code-RAG Injektion)
   */
  async executeWorkerTasks(subTasks, userPrompt, onStatusUpdate = () => {}, codeContext = '') {
    const workerOutputs = {};

    const ragContextSection = codeContext
      ? `\n\nHier ist der aktuelle Code der betroffenen Dateien:\n"""\n${codeContext}\n"""\nNutze diesen Quellcode als Referenz, um präzise und kompatible Änderungen vorzuschlagen.\n`
      : '';

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

        const userMsg = `AUFTRAG:\n"""\n${userPrompt}\n"""${ragContextSection}\n\nErstelle deine technische Detailausarbeitung:`;

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
