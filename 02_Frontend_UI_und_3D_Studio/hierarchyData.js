/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/hierarchyData.js
 * 
 * ZENTRALE AGENTEN-DATENBANK & HIERARCHIE-DEFINITION (v7.0)
 * - 33 Agenten mit festen Spezialgebieten, echten Namen und Abteilungs-Zuordnung
 * - 1 Zentrale (Trevor Core am Holo-Kern)
 * - 4 Fachabteilungen à 8 Spezialisten (1 Lead + 7 Spezialisten)
 *   1. EG_ARCHITEKTUR (Marcus [LEAD] + 7 Spezialisten)
 *   2. EG_FRONTEND (Daria [LEAD] + 7 Spezialisten)
 *   3. EG_BACKEND (David [LEAD] + 7 Spezialisten)
 *   4. UG_SERVER (Ilja [LEAD] + 7 Spezialisten)
 * - 100% Offline- & Zero-Network-Garantie
 */

// =========================================================================
// 1. ZENTRALE AGENTEN-DATENBANK (33 AGENTEN)
// =========================================================================

export const TREVOR_AGENT_ROSTER = [
  // -----------------------------------------------------------------------
  // ZENTRALE (CENTER_CORE – Position am Holo-Kern)
  // -----------------------------------------------------------------------
  {
    id: 'ag_01',
    name: 'Trevor',
    role: 'Studio Director',
    title: 'Studio Director (Iron-Man Armor)',
    department: 'ZENTRALE',
    deptCode: 'CENTER_CORE',
    deptName: 'Zentrale & Holo-Kern',
    isLead: true,
    floor: 'EG',
    sector: 'Zentrum / Holo-Kern',
    color: '#00F0FF',
    accentColor: '#F59E0B',
    focus: 'Gesamtleitung, Pre-Check & Koordination',
    easy_explanation: 'Trevor leitet das 33-Agenten-Studio im Iron-Man-Look. Er analysiert deine Aufträge, verteilt Aufgaben an die richtigen Räume, bündelt Ergebnisse und legt dir am Ende die fertige Freigabe vor.'
  },

  // -----------------------------------------------------------------------
  // ABTEILUNG 1: EG_ARCHITEKTUR (Sektor Nord-West auf der EG-Terrasse)
  // -----------------------------------------------------------------------
  {
    id: 'ag_02',
    name: 'Marcus',
    role: 'Abteilungsleiter Architektur',
    title: 'Abteilungsleiter Architektur (Systemdesign & Gesamtkonzept)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: true,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    accentColor: '#F59E0B',
    focus: 'Systemdesign, Gesamtkonzept & Architekturentscheidungen',
    easy_explanation: 'Leitet die Architektur-Abteilung, entwirft modulare System-Strukturen und überwacht die Einhaltung technischer Standards.'
  },
  {
    id: 'ag_03',
    name: 'Elena',
    role: 'Requirements Engineer',
    title: 'Requirements Engineer (Anforderungsanalyse & Spezifikation)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Anforderungsanalyse, User Stories & Spezifikation',
    easy_explanation: 'Zerlegt komplexe Nutzeranforderungen in präzise, umsetzbare Spezifikationen und User Stories.'
  },
  {
    id: 'ag_04',
    name: 'Viktor',
    role: 'Data Modeler',
    title: 'Data Modeler (Datenbank-Schemata & Datenflüsse)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Datenbank-Schemata, Entity-Relationship & Datenflüsse',
    easy_explanation: 'Entwirft relationale und dokumentenorientierte Datenmodelle sowie konsistente Datenflüsse.'
  },
  {
    id: 'ag_05',
    name: 'Svenja',
    role: 'BWL & Projekt-Analystin',
    title: 'BWL & Projekt-Analystin (Kalkulation, Netzplan & Wirtschaftlichkeit)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Kalkulation, Netzplan, Aufwandsschätzung & Wirtschaftlichkeit',
    easy_explanation: 'Berechnet Projektaufwände, Ressourcen, Zeitpläne und wirtschaftliche Machbarkeit.'
  },
  {
    id: 'ag_06',
    name: 'Lukas',
    role: 'Tech-Stack Strategist',
    title: 'Tech-Stack Strategist (Architektur-Entscheidungen & Schnittstellen)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Technologie-Auswahl, Frameworks & Schnittstellenarchitektur',
    easy_explanation: 'Wählt moderne, zukunftssichere Technologien, Frameworks und APIs für maximale Skalierbarkeit.'
  },
  {
    id: 'ag_07',
    name: 'Nadia',
    role: 'Prompt Architect',
    title: 'Prompt Architect (Erstellung präziser Antigravity-System-Prompts)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Antigravity-System-Prompts, LLM-Instruktionen & Prompt-Chains',
    easy_explanation: 'Formuliert hocheffektive, rollenbasierte Prompts und Instruktionen für Antigravity- und Coding-Agenten.'
  },
  {
    id: 'ag_08',
    name: 'Henrik',
    role: 'Impact & Risk Auditor',
    title: 'Impact & Risk Auditor (Folgenabschätzung für Ja/Nein-Fragen)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Folgenabschätzung, Risikoanalyse & Entscheidungs-Audits',
    easy_explanation: 'Analysiert die direkten Vor- und Nachteile von Ja/Nein-Entscheidungen (impactYes / impactNo).'
  },
  {
    id: 'ag_09',
    name: 'Clara',
    role: 'Documentation Lead',
    title: 'Documentation Lead (Zusammenfassungen, Lernhilfen & Doku)',
    department: 'EG_ARCHITEKTUR',
    deptCode: 'EG_ARCHITEKTUR',
    deptName: '1. Architektur & Planung',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-West (EG-Terrasse)',
    color: '#3B82F6',
    focus: 'Dokumentation, Checkpoints, Zusammenfassungen & Lernhilfen',
    easy_explanation: 'Erstellt verständliche Dokumentationen, Zusammenfassungen und didaktische Leitfäden.'
  },

  // -----------------------------------------------------------------------
  // ABTEILUNG 2: EG_FRONTEND (Sektor Nord-Ost auf der EG-Terrasse)
  // -----------------------------------------------------------------------
  {
    id: 'ag_10',
    name: 'Daria',
    role: 'Abteilungsleiterin Frontend',
    title: 'Abteilungsleiterin Frontend (UI/UX-Leitung & Design-System)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: true,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    accentColor: '#F59E0B',
    focus: 'UI/UX-Leitung, Design-System & visuelle Qualität',
    easy_explanation: 'Leitet das Frontend-Team, überwacht Designsysteme, Ergonomie und die ganzheitliche Benutzeroberfläche.'
  },
  {
    id: 'ag_11',
    name: 'Liam',
    role: 'Three.js & WebGL Engineer',
    title: 'Three.js & WebGL Engineer (3D-Geometrie, Kamera & Beleuchtung)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'Three.js 3D-Bühne, WebGL Shaders, Kamera-Führung & Lichteffekte',
    easy_explanation: 'Baut interaktive 3D-Welten, optimiert Shader, Partikelsysteme und sorgt für cinematische Kamerafahrten.'
  },
  {
    id: 'ag_12',
    name: 'Maya',
    role: 'CSS & Slate-UI Specialist',
    title: 'CSS & Slate-UI Specialist (Glassmorphismus, Farben & Layouts)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'Slate J.A.R.V.I.S. Matte Farbpalette, Glassmorphismus & CSS Grid/Flexbox',
    easy_explanation: 'Stylt elegante Benutzeroberflächen mit Schiefer-Farben, Glassmorphismus und perfekten Kontrasten.'
  },
  {
    id: 'ag_13',
    name: 'Noah',
    role: 'DOM & HUD Controller',
    title: 'DOM & HUD Controller (Interaktive Fenster, Queue-UI & Events)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'DOM-Manipulation, HUD-Widgets, Queue-Events & Task-Rendering',
    easy_explanation: 'Steuert reaktive DOM-Elemente, schwebende Fenster, Task-Listen und interaktive HUD-Panels.'
  },
  {
    id: 'ag_14',
    name: 'Zoe',
    role: '60FPS Animation Specialist',
    title: '60FPS Animation Specialist (Flüssige Bewegungen & Partikeleffekte)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'Delta-Animationsschleifen, 60 FPS Performance & Partikelsysteme',
    easy_explanation: 'Sorgt für butterweiche 60-FPS-Animationen ohne Ruckler mittels zeitbasiertem Delta-Timing.'
  },
  {
    id: 'ag_15',
    name: 'Finn',
    role: 'Audio & Voice Integrator',
    title: 'Audio & Voice Integrator (Synthesizer-Sounds & J.A.R.V.I.S.-Sprach-UI)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'Web Audio API Synthesizer, SpeechSynthesis & Spracherkennung',
    easy_explanation: 'Integriert native Web-Audio-Synthesizer, J.A.R.V.I.S.-Stimmen und nahtloses akustisches Feedback.'
  },
  {
    id: 'ag_16',
    name: 'Lea',
    role: 'Icon & Tooltip Designerin',
    title: 'Icon & Tooltip Designerin (Vektor-Symbole, Sub-Menüs & Hover-Badges)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'SVG-Icons, Pure CSS Tooltips, Sub-Menüs & Hover-Badges',
    easy_explanation: 'Entwirft pixelgenaue SVG-Vektor-Icons, schwebende Tooltips und visuell ansprechende Mikro-Badges.'
  },
  {
    id: 'ag_17',
    name: 'Ben',
    role: 'Usability & UX Tester',
    title: 'Usability & UX Tester (Ergonomie & Sichtbarkeits-Prüfung)',
    department: 'EG_FRONTEND',
    deptCode: 'EG_FRONTEND',
    deptName: '2. Frontend, 3D & UI/UX',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Nord-Ost (EG-Terrasse)',
    color: '#00F0FF',
    focus: 'UX Testing, Ergonomie, Barrierefreiheit & Kontrastprüfung',
    easy_explanation: 'Testet Bedienbarkeit, intuitive Klickpfade und sorgt dafür, dass kein UI-Element den Blick verdeckt.'
  },

  // -----------------------------------------------------------------------
  // ABTEILUNG 3: EG_BACKEND (Sektor Süd auf der EG-Terrasse)
  // -----------------------------------------------------------------------
  {
    id: 'ag_18',
    name: 'David',
    role: 'Abteilungsleiter Backend',
    title: 'Abteilungsleiter Backend (Server-Logik & Code-Konsolidierung)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: true,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    accentColor: '#F59E0B',
    focus: 'Server-Architektur, API-Orchestrierung & Code-Konsolidierung',
    easy_explanation: 'Leitet die Backend-Abteilung, koordiniert Serverlogik, führt Teilergebnisse zusammen und sichert Code-Qualität.'
  },
  {
    id: 'ag_19',
    name: 'Sarah',
    role: 'Node.js & API Engineer',
    title: 'Node.js & API Engineer (Express-Server, Proxy & Endpunkte)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'Node.js, Express, REST-APIs, Proxies & Streaming-Endpunkte',
    easy_explanation: 'Entwickelt performante HTTP-Server, Proxy-Routen und sichere Schnittstellen in Node.js.'
  },
  {
    id: 'ag_20',
    name: 'Malik',
    role: 'Supabase & Memory Specialist',
    title: 'Supabase & Memory Specialist (Cloud-Gedächtnis & Datenbanken)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'Supabase, PostgreSQL, Vector-Search & persistentes Gedächtnis',
    easy_explanation: 'Verwaltet das dauerhafte Cloud-Gedächtnis, Tabellen-Strukturen und schnelle semantische RAG-Suchen.'
  },
  {
    id: 'ag_21',
    name: 'Jonas',
    role: 'Python & Algorithm Dev',
    title: 'Python & Algorithm Dev (Python-Programme, Sortierung & Mathe-Logik)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'Python, Algorithmen, Datenverarbeitung, Sortierung & Mathematik',
    easy_explanation: 'Schreibt saubere Python-Skripte, mathematische Berechnungen und optimierte Sortier-Algorithmen.'
  },
  {
    id: 'ag_22',
    name: 'Kiara',
    role: 'Dual-LLM Specialist',
    title: 'Dual-LLM Specialist (Ollama Qwen 2.5 & Gemini Cloud-Steuerung)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'Ollama Qwen 2.5 Coder, Google Gemini Flash/Pro & Dual-LLM Routing',
    easy_explanation: 'Steuert lokale und Cloud-KI-Modelle, wählt das beste Modell je nach Aufgabe und überwacht Token-Limits.'
  },
  {
    id: 'ag_23',
    name: 'Tarek',
    role: 'RAG & Code-Context Engineer',
    title: 'RAG & Code-Context Engineer (Wissensabruf & Projekt-Analyse)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'Retrieval Augmented Generation, Code-Indexing & Kontext-Injektion',
    easy_explanation: 'Analysiert das gesamte Projektverzeichnis und liefert den perfekten Code-Kontext für präzise KI-Antworten.'
  },
  {
    id: 'ag_24',
    name: 'Hannah',
    role: 'Async & Queue Architect',
    title: 'Async & Queue Architect (Parallele Promise.all-Pipelines & Task-Queue)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'Asynchrone Workflows, Promise.all Parallelisierung & Task-Queues',
    easy_explanation: 'Konstruiert unterbrechungsfreie Task-Queues und parallele Agenten-Pipelines ohne Event-Loop-Blockaden.'
  },
  {
    id: 'ag_25',
    name: 'Tim',
    role: 'Parser & Validation Dev',
    title: 'Parser & Validation Dev (JSON-Sicherheit & Fehlerbehandlung)',
    department: 'EG_BACKEND',
    deptCode: 'EG_BACKEND',
    deptName: '3. Backend & Algorithmen',
    isLead: false,
    floor: 'EG',
    sector: 'Sektor Süd (EG-Terrasse)',
    color: '#10B981',
    focus: 'JSON-Parsing, Regex-Extraktion, Fallbacks & Error-Handling',
    easy_explanation: 'Garantiert fehlertolerantes JSON-Parsing, fängt Sonderzeichen ab und verhindert Task-Verluste bei Netzwerkfehlern.'
  },

  // -----------------------------------------------------------------------
  // ABTEILUNG 4: UG_SERVER (Arena-Grube im Untergeschoss)
  // -----------------------------------------------------------------------
  {
    id: 'ag_26',
    name: 'Ilja',
    role: 'Abteilungsleiter Systemintegration & Security',
    title: 'Abteilungsleiter Systemintegration & Security (Prüfung, Härtung & Infrastruktur)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: true,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    accentColor: '#00F0FF',
    focus: 'Systemhärtung, Infrastruktur, Security & Integrationsprüfung',
    easy_explanation: 'Leitet die Server- und Sicherheits-Abteilung im UG, überwacht Systemgrenzen und authorisiert kritische Deployments.'
  },
  {
    id: 'ag_27',
    name: 'Milan',
    role: 'Network & Subnetting Engineer',
    title: 'Network & Subnetting Engineer (IPv4/IPv6, CIDR, VLSM, VLAN & Routing)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'IPv4, IPv6, CIDR, VLSM, VLAN, Subnetting & Routing-Tabellen',
    easy_explanation: 'Berechnet Subnetze, plant VLAN-Segmentierungen und konfiguriert Routing- und Netzwerkprotokolle.'
  },
  {
    id: 'ag_28',
    name: 'Freya',
    role: 'Security & Sandbox Guardian',
    title: 'Security & Sandbox Guardian (API-Schutz, PIN-Auth & Richtlinien)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'PIN-Authentifizierung, Sandbox-Absicherung, OWASP & API-Schutz',
    easy_explanation: 'Schützt das Studio vor unbefugtem Zugriff, prüft PIN-Sicherheit und hält Sicherheitsrichtlinien ein.'
  },
  {
    id: 'ag_29',
    name: 'Anton',
    role: 'Cloud & Render DevOps',
    title: 'Cloud & Render DevOps (Git-Workflows, Build-Logs & Deployment)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'CI/CD, Git-Workflows, Render-Deployments & Build-Monitoring',
    easy_explanation: 'Automatisiert Build-Prozesse, Git-Pushes und sorgt für reibungslose Cloud-Deployments auf Render.'
  },
  {
    id: 'ag_30',
    name: 'Kian',
    role: 'Hardware & Virtualization Spec',
    title: 'Hardware & Virtualization Spec (Server-Hardware, Proxmox, RAM/CPU & VMs)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'Server-Hardware, Proxmox VE, VM-Management, RAM/CPU-Optimierung',
    easy_explanation: 'Überwacht physische und virtuelle Server-Ressourcen, Proxmox-Container und Hardware-Auslastung.'
  },
  {
    id: 'ag_31',
    name: 'Nora',
    role: 'Firewall & VPN Specialist',
    title: 'Firewall & VPN Specialist (WireGuard, Tailscale & Netzwerksicherheit)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'Firewalls, WireGuard, Tailscale, Port-Forwarding & Verschlüsselung',
    easy_explanation: 'Richtet verschlüsselte VPN-Tunnel, WireGuard-Netzwerke und strenge Firewall-Regeln ein.'
  },
  {
    id: 'ag_32',
    name: 'Rico',
    role: 'QA & Logic Debugger',
    title: 'QA & Logic Debugger (Tiefenprüfung auf Logikfehler & Bugs)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'QA, Test-Suites, Logik-Debugging, Randfälle & Regressions-Tests',
    easy_explanation: 'Führt strenge automatisierte Tests durch, findet versteckte Bugs und validiert Programmabläufe.'
  },
  {
    id: 'ag_33',
    name: 'Yuna',
    role: 'Idle-Trainer & AI Optimizer',
    title: 'Idle-Trainer & AI Optimizer (Kontinuierliches Lernen & System-Audits)',
    department: 'UG_SERVER',
    deptCode: 'UG_SERVER',
    deptName: '4. Systemintegration & Server (UG)',
    isLead: false,
    floor: 'UG',
    sector: 'UG-Zentrum (Arena-Grube)',
    color: '#F59E0B',
    focus: 'Idle-Training, RAG-Optimierung, Continuous Learning & System-Audits',
    easy_explanation: 'Nutzt Leerlaufzeiten zur Systemoptimierung, speichert gelernte Regeln im Cloud-Gedächtnis und trainiert KI-Antworten.'
  }
];

export const AGENT_ROSTER_BY_ID = Object.fromEntries(
  TREVOR_AGENT_ROSTER.map(agent => [agent.id, agent])
);

// =========================================================================
// 2. STUDIO HIERARCHY (ABTEILUNGEN & LEADS FÜR DIE ARENA & WORKFLOWS)
// =========================================================================

export const STUDIO_HIERARCHY = {
  studio_meta: {
    name: "Trevor – AI Software Studio & Multi-Agent Command Center",
    version: "7.0.0 (33-Agent Amphitheater Arena Edition)",
    theme: {
      background: "#0B101B",
      surface: "rgba(14, 23, 38, 0.65)",
      accent: "#00F0FF",
      accent_amber: "#F59E0B",
      border: "rgba(255, 255, 255, 0.08)"
    }
  },
  trevor: {
    id: "ag_01",
    name: "Trevor",
    title: "Studio Director (Iron-Man Armor)",
    color: "#00F0FF",
    accent_color: "#F59E0B",
    role: "Studio Director, Aufgaben-Router, Zusammenfasser & Entscheidungs-Vorbereiter",
    easy_explanation: "Trevor leitet das 33-Agenten-Studio im Iron-Man-Look. Er analysiert deine Aufträge, verteilt Aufgaben an die richtigen Räume, bündelt Ergebnisse und legt dir am Ende die fertige Freigabe vor.",
    position_3d: { x: 0, y: 0.4, z: 3.8 }
  },
  departments: [
    {
      id: 2, // Map to 2 for backward compatibility with tests
      alt_id: 1,
      floor: "EG",
      code: "EG_ARCHITEKTUR",
      name: "1. Architektur & Planung",
      short_name: "Architektur",
      description: "Systemdesign, Anforderungsanalyse, BWL & Antigravity-Prompts",
      easy_explanation: "Entwirft das technische Fundament, zerlegt Anforderungen, berechnet Wirtschaftlichkeit und verfasst System-Prompts.",
      color: "#3B82F6",
      sector: "Nord-West",
      micro_status: "🏗️ Systemdesign & Spezifikation",
      quick_prompts: [
        "🏗️ Systemarchitektur & Ordnerstruktur entwerfen",
        "📝 Anforderungsanalyse & Spezifikation erstellen",
        "⚖️ BWL-Kalkulation & Netzplan berechnen"
      ],
      chef_agent: {
        id: "ag_02",
        name: "Marcus",
        title: "Abteilungsleiter Architektur",
        role: "chef_agent",
        isLead: true,
        department_id: 2,
        deptCode: "EG_ARCHITEKTUR",
        focus: "Systemdesign, Gesamtkonzept & Architekturentscheidungen",
        easy_explanation: "Leitet das Architektur-Team, entwirft modulare System-Strukturen und überwacht Standards."
      },
      specialist_pcs: [
        {
          id: "ag_03",
          name: "Elena",
          title: "Requirements Engineer",
          role: "pc_agent",
          department_id: 2,
          focus: "Anforderungsanalyse & Spezifikation",
          easy_explanation: "Zerlegt Nutzeranforderungen in präzise, umsetzbare Spezifikationen."
        },
        {
          id: "ag_04",
          name: "Viktor",
          title: "Data Modeler",
          role: "pc_agent",
          department_id: 2,
          focus: "Datenbank-Schemata & Datenflüsse",
          easy_explanation: "Entwirft relationale Datenmodelle und konsistente Datenflüsse."
        },
        {
          id: "ag_05",
          name: "Svenja",
          title: "BWL & Projekt-Analystin",
          role: "pc_agent",
          department_id: 2,
          focus: "Kalkulation, Netzplan & Wirtschaftlichkeit",
          easy_explanation: "Berechnet Projektaufwände, Ressourcen, Zeitpläne und Wirtschaftlichkeit."
        },
        {
          id: "ag_06",
          name: "Lukas",
          title: "Tech-Stack Strategist",
          role: "pc_agent",
          department_id: 2,
          focus: "Architektur-Entscheidungen & Schnittstellen",
          easy_explanation: "Wählt moderne, zukunftssichere Technologien, Frameworks und APIs."
        },
        {
          id: "ag_07",
          name: "Nadia",
          title: "Prompt Architect",
          role: "pc_agent",
          department_id: 2,
          focus: "Erstellung präziser Antigravity-System-Prompts",
          easy_explanation: "Formuliert hocheffektive Prompts für Antigravity- und Coding-Agenten."
        },
        {
          id: "ag_08",
          name: "Henrik",
          title: "Impact & Risk Auditor",
          role: "pc_agent",
          department_id: 2,
          focus: "Folgenabschätzung für Ja/Nein-Fragen",
          easy_explanation: "Analysiert Vor- und Nachteile von Entscheidungen (impactYes / impactNo)."
        },
        {
          id: "ag_09",
          name: "Clara",
          title: "Documentation Lead",
          role: "pc_agent",
          department_id: 2,
          focus: "Zusammenfassungen, Lernhilfen & Doku",
          easy_explanation: "Erstellt verständliche Dokumentationen und didaktische Leitfäden."
        }
      ]
    },
    {
      id: 3,
      alt_id: 4,
      floor: "EG",
      code: "EG_FRONTEND",
      name: "2. Frontend, 3D & UI/UX",
      short_name: "Frontend",
      description: "Three.js 3D-Bühne, Slate-UI, DOM-Widgets, 60 FPS & J.A.R.V.I.S.-Audio",
      easy_explanation: "Baut responsive Web-Frontends, interaktive Three.js-3D-Bühnen, 60-FPS-Animationen und die J.A.R.V.I.S.-Sprachoberfläche.",
      color: "#00F0FF",
      sector: "Nord-Ost",
      micro_status: "💻 3D-Bühne & Slate-HUD aktiv",
      quick_prompts: [
        "🎨 Slate-UI & Glassmorphismus-Komponente bauen",
        "🌐 Three.js 3D-Geometrie & Shader optimieren",
        "⚡ 60-FPS-Animation & Web Audio Sound einbinden"
      ],
      chef_agent: {
        id: "ag_10",
        name: "Daria",
        title: "Abteilungsleiterin Frontend",
        role: "chef_agent",
        isLead: true,
        department_id: 3,
        deptCode: "EG_FRONTEND",
        focus: "UI/UX-Leitung, Design-System & visuelle Qualität",
        easy_explanation: "Leitet das Frontend-Team, überwacht Designsysteme und Ergonomie."
      },
      specialist_pcs: [
        {
          id: "ag_11",
          name: "Liam",
          title: "Three.js & WebGL Engineer",
          role: "pc_agent",
          department_id: 3,
          focus: "3D-Geometrie, Kamera & Beleuchtung",
          easy_explanation: "Baut interaktive 3D-Welten, Shaders und cinematische Kamerafahrten."
        },
        {
          id: "ag_12",
          name: "Maya",
          title: "CSS & Slate-UI Specialist",
          role: "pc_agent",
          department_id: 3,
          focus: "Glassmorphismus, Farben & Layouts",
          easy_explanation: "Stylt Benutzeroberflächen mit Schiefer-Farben und Glassmorphismus."
        },
        {
          id: "ag_13",
          name: "Noah",
          title: "DOM & HUD Controller",
          role: "pc_agent",
          department_id: 3,
          focus: "Interaktive Fenster, Queue-UI & Events",
          easy_explanation: "Steuert reaktive DOM-Elemente, schwebende Fenster und Task-HUDs."
        },
        {
          id: "ag_14",
          name: "Zoe",
          title: "60FPS Animation Specialist",
          role: "pc_agent",
          department_id: 3,
          focus: "Flüssige Bewegungen & Partikeleffekte",
          easy_explanation: "Sorgt für flüssige 60-FPS-Animationen mittels Delta-Timing."
        },
        {
          id: "ag_15",
          name: "Finn",
          title: "Audio & Voice Integrator",
          role: "pc_agent",
          department_id: 3,
          focus: "Synthesizer-Sounds & J.A.R.V.I.S.-Sprach-UI",
          easy_explanation: "Integriert Web Audio Synthesizer und J.A.R.V.I.S.-Stimmen."
        },
        {
          id: "ag_16",
          name: "Lea",
          title: "Icon & Tooltip Designerin",
          role: "pc_agent",
          department_id: 3,
          focus: "Vektor-Symbole, Sub-Menüs & Hover-Badges",
          easy_explanation: "Entwirft SVG-Icons, schwebende Tooltips und Hover-Badges."
        },
        {
          id: "ag_17",
          name: "Ben",
          title: "Usability & UX Tester",
          role: "pc_agent",
          department_id: 3,
          focus: "Ergonomie & Sichtbarkeits-Prüfung",
          easy_explanation: "Testet Bedienbarkeit, intuitive Klickpfade und Barrierefreiheit."
        }
      ]
    },
    {
      id: 5, // Supported for ID 5 and 4
      alt_id: 4,
      floor: "EG",
      code: "EG_BACKEND",
      name: "3. Backend & Algorithmen",
      short_name: "Backend",
      description: "Express-Server, Python-Algorithmen, Supabase RAG, Dual-LLM & Task-Queue",
      easy_explanation: "Programmiert Node.js-Server, mathematische Python-Algorithmen, Supabase RAG-Archive und sichere Schnittstellen.",
      color: "#10B981",
      sector: "Süd",
      micro_status: "⚡ APIs, Algorithmen & DB aktiv",
      quick_prompts: [
        "🐍 Python-Algorithmus & Sortierlogik entwickeln",
        "🔌 Express API Route mit Validierung bauen",
        "🧠 Supabase RAG-Gedächtnis durchsuchen & abfragen"
      ],
      chef_agent: {
        id: "ag_18",
        name: "David",
        title: "Abteilungsleiter Backend",
        role: "chef_agent",
        isLead: true,
        department_id: 5,
        deptCode: "EG_BACKEND",
        focus: "Server-Logik, API-Orchestrierung & Code-Konsolidierung",
        easy_explanation: "Leitet das Backend-Team, koordiniert Serverlogik und konsolidiert Code."
      },
      specialist_pcs: [
        {
          id: "ag_19",
          name: "Sarah",
          title: "Node.js & API Engineer",
          role: "pc_agent",
          department_id: 5,
          focus: "Express-Server, Proxy & Endpunkte",
          easy_explanation: "Entwickelt performante HTTP-Server und Proxy-Routen in Node.js."
        },
        {
          id: "ag_20",
          name: "Malik",
          title: "Supabase & Memory Specialist",
          role: "pc_agent",
          department_id: 5,
          focus: "Cloud-Gedächtnis & Datenbanken",
          easy_explanation: "Verwaltet das Supabase Cloud-Gedächtnis und schnelle RAG-Suchen."
        },
        {
          id: "ag_21",
          name: "Jonas",
          title: "Python & Algorithm Dev",
          role: "pc_agent",
          department_id: 5,
          focus: "Python-Programme, Sortierung & Mathe-Logik",
          easy_explanation: "Schreibt saubere Python-Programme und mathematische Berechnungen."
        },
        {
          id: "ag_22",
          name: "Kiara",
          title: "Dual-LLM Specialist",
          role: "pc_agent",
          department_id: 5,
          focus: "Ollama Qwen 2.5 & Gemini Cloud-Steuerung",
          easy_explanation: "Steuert lokale und Cloud-KI-Modelle mit dynamischem Routing."
        },
        {
          id: "ag_23",
          name: "Tarek",
          title: "RAG & Code-Context Engineer",
          role: "pc_agent",
          department_id: 5,
          focus: "Wissensabruf & Projekt-Analyse",
          easy_explanation: "Liefert den perfekten Code-Kontext aus dem Workspace für präzise KI-Antworten."
        },
        {
          id: "ag_24",
          name: "Hannah",
          title: "Async & Queue Architect",
          role: "pc_agent",
          department_id: 5,
          focus: "Parallele Promise.all-Pipelines & Task-Queue",
          easy_explanation: "Konstruiert unterbrechungsfreie Task-Queues und parallele Pipelines."
        },
        {
          id: "ag_25",
          name: "Tim",
          title: "Parser & Validation Dev",
          role: "pc_agent",
          department_id: 5,
          focus: "JSON-Sicherheit & Fehlerbehandlung",
          easy_explanation: "Garantiert fehlertolerantes JSON-Parsing und sichere Typvalidierung."
        }
      ]
    },
    {
      id: 12, // Standard ID 12 for UG_SERVER
      alt_id: 11,
      floor: "UG",
      code: "UG_SERVER",
      name: "4. Systemintegration & Server",
      short_name: "Serverraum",
      description: "Netzwerk & Subnetting, Security, Sandboxing, DevOps & Continuous Learning",
      easy_explanation: "Verwaltet Server-Hardware, Netzwerk-Subnetze (CIDR, VLSM), Firewalls, Proxmox-VMs und das kontinuierliche KI-Lernen.",
      color: "#F59E0B",
      sector: "UG-Zentrum",
      micro_status: "🔒 Server-Racks & Härtung aktiv",
      quick_prompts: [
        "🌐 Subnetting, VLSM & Routing-Plan berechnen",
        "🛡️ Sandbox-Absicherung & PIN-Security prüfen",
        "🧠 Idle-Trainer KI-Audit & Wissensarchivierung starten"
      ],
      chef_agent: {
        id: "ag_26",
        name: "Ilja",
        title: "Abteilungsleiter Systemintegration & Security",
        role: "chef_agent",
        isLead: true,
        department_id: 12,
        deptCode: "UG_SERVER",
        focus: "Prüfung, Härtung & Infrastruktur",
        easy_explanation: "Leitet die Server- und Sicherheits-Abteilung im UG und authorisiert Deployments."
      },
      specialist_pcs: [
        {
          id: "ag_27",
          name: "Milan",
          title: "Network & Subnetting Engineer",
          role: "pc_agent",
          department_id: 12,
          focus: "IPv4/IPv6, CIDR, VLSM, VLAN & Routing",
          easy_explanation: "Berechnet Subnetze, plant VLANs und konfiguriert Routing-Tabellen."
        },
        {
          id: "ag_28",
          name: "Freya",
          title: "Security & Sandbox Guardian",
          role: "pc_agent",
          department_id: 12,
          focus: "API-Schutz, PIN-Auth & Richtlinien",
          easy_explanation: "Schützt das Studio vor unbefugtem Zugriff und sichert Endpunkte ab."
        },
        {
          id: "ag_29",
          name: "Anton",
          title: "Cloud & Render DevOps",
          role: "pc_agent",
          department_id: 12,
          focus: "Git-Workflows, Build-Logs & Deployment",
          easy_explanation: "Automatisiert Git-Workflows und überwacht Cloud-Deployments auf Render."
        },
        {
          id: "ag_30",
          name: "Kian",
          title: "Hardware & Virtualization Spec",
          role: "pc_agent",
          department_id: 12,
          focus: "Server-Hardware, Proxmox, RAM/CPU & VMs",
          easy_explanation: "Überwacht Server-Ressourcen, Proxmox VE und Hardware-Auslastung."
        },
        {
          id: "ag_31",
          name: "Nora",
          title: "Firewall & VPN Specialist",
          role: "pc_agent",
          department_id: 12,
          focus: "WireGuard, Tailscale & Netzwerksicherheit",
          easy_explanation: "Richtet verschlüsselte VPN-Tunnel und Firewall-Regeln ein."
        },
        {
          id: "ag_32",
          name: "Rico",
          title: "QA & Logic Debugger",
          role: "pc_agent",
          department_id: 12,
          focus: "Tiefenprüfung auf Logikfehler & Bugs",
          easy_explanation: "Führt strenge automatisierte Tests durch und findet versteckte Bugs."
        },
        {
          id: "ag_33",
          name: "Yuna",
          title: "Idle-Trainer & AI Optimizer",
          role: "pc_agent",
          department_id: 12,
          focus: "Kontinuierliches Lernen & System-Audits",
          easy_explanation: "Führt kontinuierliche Selbst-Audits durch und erweitert das Cloud-Gedächtnis."
        }
      ]
    }
  ]
};

// Aliase für garantierte synchrone Verfügbarkeit
export const STUDIO_HIERARCHY_DATA = STUDIO_HIERARCHY;

// Globaler Browser- & Node-Export
if (typeof window !== 'undefined') {
  window.TREVOR_AGENT_ROSTER = TREVOR_AGENT_ROSTER;
  window.AGENT_ROSTER_BY_ID = AGENT_ROSTER_BY_ID;
  window.STUDIO_HIERARCHY = STUDIO_HIERARCHY;
  window.STUDIO_HIERARCHY_DATA = STUDIO_HIERARCHY;
}
