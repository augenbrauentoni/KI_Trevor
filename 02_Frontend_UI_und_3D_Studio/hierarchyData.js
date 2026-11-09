/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/hierarchyData.js
 * 
 * Feste, netzwerkunabhängige Hierarchie-Definition (100% Offline- & Zero-Network-Garantie):
 * - 10 deutsche Abteilungen mit verständlichen Namen & easy_explanation
 * - 10 Chef-Agenten
 * - 33 Spezial-PCs mit Fachprofilen
 * - Trevor Core (Iron-Man MK-VII Edition)
 * - 3 Schnell-Aktionen (Quick-Prompts) pro Abteilung
 * - Dynamische Micro-Status Vorlagen
 */

export const STUDIO_HIERARCHY = {
  studio_meta: {
    name: "Trevor – AI Software Studio & Multi-Agent Command Center",
    version: "2.5.0 (Phase 7 Modern Office Edition)",
    theme: {
      background: "#06080e",
      surface: "#0f1420",
      accent: "#ef4444",
      accent_gold: "#fbbf24",
      arc_reactor: "#38bdf8",
      border: "#1f2937"
    }
  },
  trevor: {
    id: "trevor_core",
    name: "Trevor",
    title: "Studio Director (Iron-Man Armor)",
    color: "#dc2626",
    accent_color: "#fbbf24",
    reactor_color: "#38bdf8",
    role: "Studio-Leiter, Aufgaben-Router, Zusammenfasser & Entscheidungs-Vorbereiter",
    easy_explanation: "Trevor leitet das 43-Agenten-Studio im Iron-Man-Look. Er analysiert deine Aufträge, verteilt Aufgaben an die richtigen Räume, bündelt Ergebnisse und legt dir am Ende die fertige Freigabe (JA/NEIN) vor.",
    position_3d: { x: 0, y: 1.2, z: 0 }
  },
  departments: [
    {
      id: 1,
      code: "dept_plan",
      name: "1. Ideen & Planung",
      description: "Prüft deine Idee und plant alle Funktionen",
      easy_explanation: "Hier wird deine Projektidee auf Herz und Nieren geprüft, in logische Funktionen zerlegt und ein klarer Ablaufplan erstellt.",
      color: "#3b82f6",
      floor_type: "wood",
      micro_status: "💬 Prüft Feature-Roadmap",
      quick_prompts: [
        "💡 Neue Feature-Idee auf Machbarkeit prüfen",
        "🗺️ Vollständige Roadmap & MVP-Phasen planen",
        "⚖️ Kosten-, Zeit- & Aufwandsanalyse erstellen"
      ],
      chef_agent: {
        id: "chef_plan",
        name: "Planungs-Chef",
        title: "Leiter Ideen & Konzeption",
        role: "chef_agent",
        department_id: 1,
        focus: "Prüft Ideen auf Machbarkeit und leitet das Planungsteam",
        easy_explanation: "Prüft alle Ideen auf Machbarkeit, löst Widersprüche und leitet das Planungsteam."
      },
      specialist_pcs: [
        {
          id: "pc_plan_1",
          name: "Ideen-Prüfer",
          title: "Ideen- & Nutzen-Analyst",
          role: "pc_agent",
          department_id: 1,
          focus: "Prüft Idee auf Logik, Zielgruppe und Nutzen",
          easy_explanation: "Testet deine Idee auf Logik, echten Nutzen und beste Erfolgsaussichten."
        },
        {
          id: "pc_plan_2",
          name: "Funktions-Planer",
          title: "Feature- & Roadmap-Architekt",
          role: "pc_agent",
          department_id: 1,
          focus: "Erstellt vollständigen Feature-Katalog",
          easy_explanation: "Erstellt die Liste aller Funktionen und Knöpfe, die für dein Projekt gebraucht werden."
        },
        {
          id: "pc_plan_3",
          name: "Machbarkeits-Checker",
          title: "Scope- & Ressourcen-Prüfer",
          role: "pc_agent",
          department_id: 1,
          focus: "Validiert Umsetzbarkeit und Zeitaufwand",
          easy_explanation: "Prüft, ob die Technik, Schnittstellen und Zeit für diese Idee realistisch ausreichen."
        }
      ]
    },
    {
      id: 2,
      code: "dept_arch",
      name: "2. Bauplan & Technik",
      description: "Legt Ordnerstruktur, Sprachen und Systemaufbau fest",
      easy_explanation: "Entwirft das technische Fundament: Welche Frameworks werden genutzt, wie sieht der Verzeichnisbaum aus und wie kommunizieren Systeme?",
      color: "#6366f1",
      floor_type: "stone",
      micro_status: "🏗️ Entwirft Ordnerstruktur",
      quick_prompts: [
        "🏗️ Saubere Projekt- & Ordnerstruktur entwerfen",
        "🔌 REST / GraphQL Schnittstellen-Plan erstellen",
        "⚡ Tech-Stack & Framework-Evaluation durchführen"
      ],
      chef_agent: {
        id: "chef_arch",
        name: "Chef-Architekt",
        title: "Leitender Systemarchitekt",
        role: "chef_agent",
        department_id: 2,
        focus: "Überwacht das technische Fundament und den Gesamtbauplan",
        easy_explanation: "Überwacht das gesamte technische Fundament, harmonisiert Schnittstellen und gibt den Bauplan frei."
      },
      specialist_pcs: [
        {
          id: "pc_arch_1",
          name: "Technik-Wähler",
          title: "Tech-Stack & Framework Experte",
          role: "pc_agent",
          department_id: 2,
          focus: "Entscheidet über Libraries, Node, Python, Three.js",
          easy_explanation: "Wählt die modernsten und stabilsten Werkzeuge und Bibliotheken für dein Projekt aus."
        },
        {
          id: "pc_arch_2",
          name: "Ordner- & Struktur-Planer",
          title: "Dateibaum- & Modul-Architekt",
          role: "pc_agent",
          department_id: 2,
          focus: "Definiert modulare Ordnerstruktur",
          easy_explanation: "Sorgt dafür, dass jede Datei am richtigen Platz liegt und der Code übersichtlich bleibt."
        },
        {
          id: "pc_arch_3",
          name: "Schnittstellen-Planer",
          title: "API- & Protokoll-Designer",
          role: "pc_agent",
          department_id: 2,
          focus: "Spezifiziert Datenaustausch und Endpunkte",
          easy_explanation: "Plant, wie Daten fehlerfrei zwischen Frontend, Server und Datenbank transportiert werden."
        }
      ]
    },
    {
      id: 3,
      code: "dept_design",
      name: "3. Optik & Bedienung",
      description: "Entwirft Farben, Buttons und einfache Bedienbarkeit",
      easy_explanation: "Sorgt dafür, dass alles fantastisch aussieht: Farben, Animationen, Dark-Mode und kinderleichte Bedienung auf PC und Handy.",
      color: "#ec4899",
      floor_type: "wood",
      micro_status: "🎨 Optimiert Dark-Mode & Glow",
      quick_prompts: [
        "🎨 UI auf modernen Dark-Mode & Crimson Glow optimieren",
        "📱 Mobile Touch-Bedienung & Responsiveness verfeinern",
        "✨ Hochwertige Glassmorphism-Karten stylen"
      ],
      chef_agent: {
        id: "chef_design",
        name: "Design-Chef",
        title: "Art Director & UX Lead",
        role: "chef_agent",
        department_id: 3,
        focus: "Kuriert Designsprache, Farben und Ergonomie",
        easy_explanation: "Verbindet Ästhetik und Nutzerfreundlichkeit zu einem beeindruckenden Gesamterlebnis."
      },
      specialist_pcs: [
        {
          id: "pc_design_1",
          name: "Layout-Zeichner",
          title: "Wireframe & Screens-Designer",
          role: "pc_agent",
          department_id: 3,
          focus: "Erstellt Seitenaufbau, Grids und Panels",
          easy_explanation: "Zeichnet den perfekten Aufbau aller Seiten, Boxen und Bedienleisten."
        },
        {
          id: "pc_design_2",
          name: "Farben- & Dark-Mode-Profi",
          title: "Palette- & Theme-Spezialist",
          role: "pc_agent",
          department_id: 3,
          focus: "Feinabstimmung von Dark-Slate, Crimson-Red und Kontrasten",
          easy_explanation: "Mischt harmonische Farben, Neon-Akzente und sorgt für augenfreundlichen Dark-Mode."
        },
        {
          id: "pc_design_3",
          name: "Handy- & PC-Prüfer",
          title: "Responsive & Usability Experte",
          role: "pc_agent",
          department_id: 3,
          focus: "Garantiert perfekte Ansicht auf allen Displaygrößen",
          easy_explanation: "Prüft, ob jeder Knopf auf dem Handy mit dem Daumen bequem erreichbar ist."
        }
      ]
    },
    {
      id: 4,
      code: "dept_fe",
      name: "4. Sichtbare Webseite (Frontend)",
      description: "Programmiert alles, was man im Browser sieht und anklickt",
      easy_explanation: "Baut HTML, CSS, JavaScript, 3D-Canvas und reaktive Komponenten zusammen, die direkt im Browser laufen.",
      color: "#06b6d4",
      floor_type: "stone",
      micro_status: "💻 Baut interaktive 3D-Bühne",
      quick_prompts: [
        "💻 Neue interaktive Klick-Komponente programmieren",
        "🚀 Ladezeiten & Rendering-Performance beschleunigen",
        "✨ Flüssige CSS- & Canvas-Animationen einbauen"
      ],
      chef_agent: {
        id: "chef_fe",
        name: "Frontend-Chef",
        title: "Leiter Frontend-Engineering",
        role: "chef_agent",
        department_id: 4,
        focus: "Überwacht Code-Qualität und flüssige Interaktion im Browser",
        easy_explanation: "Überwacht modernen Frontend-Code und sorgt für 60 FPS Animationen."
      },
      specialist_pcs: [
        {
          id: "pc_fe_1",
          name: "Seiten- & Button-Bauer",
          title: "HTML5/CSS3 & Komponenten-Programmierer",
          role: "pc_agent",
          department_id: 4,
          focus: "Baut solide, saubere Web-Elemente",
          easy_explanation: "Baut sauberen HTML- und CSS-Code für alle Menüs, Karten und Formulare."
        },
        {
          id: "pc_fe_2",
          name: "Klick-Logik-Programmierer",
          title: "JavaScript / React State Manager",
          role: "pc_agent",
          department_id: 4,
          focus: "Verarbeitet Nutzerklicks und Datenströme",
          easy_explanation: "Programmiert die Logik: Was passiert bei welchem Klick, Modal und Dateneingabe."
        },
        {
          id: "pc_fe_3",
          name: "3D- & Animations-Bauer",
          title: "Three.js & Canvas Spezialist",
          role: "pc_agent",
          department_id: 4,
          focus: "Erzeugt interaktive 3D-Szenen und Lichteffekte",
          easy_explanation: "Programmiert 3D-Kameras, Lichtquellen und rotierende Hologramme mit Three.js."
        },
        {
          id: "pc_fe_4",
          name: "Ladezeiten-Beschleuniger",
          title: "Frontend-Performance Engineer",
          role: "pc_agent",
          department_id: 4,
          focus: "Minimiert Ladezeiten und Asset-Größen",
          easy_explanation: "Optimiert Grafiken und Skripte für blitzschnellen Seitenstart ohne Ruckeln."
        }
      ]
    },
    {
      id: 5,
      code: "dept_be",
      name: "5. Server & Hintergrund-Logik (Backend)",
      description: "Programmiert die Berechnungen und Datenverarbeitung im Hintergrund",
      easy_explanation: "Entwickelt den Server, APIs und Hintergrundprozesse, die Anfragen entgegennehmen, verarbeiten und absichern.",
      color: "#10b981",
      floor_type: "tech_servers",
      micro_status: "⚙️ Konfiguriert REST API Endpunkte",
      quick_prompts: [
        "⚙️ Neue Backend-API-Endpunkte & Router implementieren",
        "🔐 Token-basierte Auth-Middleware programmieren",
        "🔄 Asynchrone Worker-Jobs & Webhooks anbinden"
      ],
      chef_agent: {
        id: "chef_be",
        name: "Backend-Chef",
        title: "Leiter Server- & Cloud-Architektur",
        role: "chef_agent",
        department_id: 5,
        focus: "Koordiniert Server-Stabilität, APIs und Datenfluss",
        easy_explanation: "Hält alle Server-Dienste stabil, sicher und hochperformant zusammen."
      },
      specialist_pcs: [
        {
          id: "pc_be_1",
          name: "Datenwege-Bauer (API)",
          title: "REST & WebSocket Architekt",
          role: "pc_agent",
          department_id: 5,
          focus: "Baut schnelle Schnittstellen zwischen Frontend und Server",
          easy_explanation: "Entwickelt superschnelle REST- und WebSocket-Kanäle für Live-Datenübertragung."
        },
        {
          id: "pc_be_2",
          name: "Rechenlogik-Programmierer",
          title: "Core Business Logic Developer",
          role: "pc_agent",
          department_id: 5,
          focus: "Programmiert Berechnungen, Filter und Algorithmen",
          easy_explanation: "Schreibt die Kern-Berechnungen, Auswertungen und Geschäftslogik deines Systems."
        },
        {
          id: "pc_be_3",
          name: "Externe-Dienste-Anbinder",
          title: "Integration & Cloud-Bridges",
          role: "pc_agent",
          department_id: 5,
          focus: "Bindet KI-Modelle, Stripe, E-Mail und Payment an",
          easy_explanation: "Verknüpft externe Dienste wie Gemini AI, Ollama, E-Mail-Provider und Payment."
        }
      ]
    },
    {
      id: 6,
      code: "dept_db",
      name: "6. Datenbank & Speicher",
      description: "Verwaltet Tabellen, Supabase und sichere Datenspeicherung",
      easy_explanation: "Entwirft Datenmodelle, Supabase-Tabellen, Indizes und schützt deine Datensätze mit Row-Level-Security (RLS).",
      color: "#8b5cf6",
      floor_type: "tech_servers",
      micro_status: "🗄️ Prüft RLS-Policies & Indizes",
      quick_prompts: [
        "🗄️ Supabase Tabellen-Schema & Relationen optimieren",
        "⚡ Datenbank-Indizes & Query-Performance tunen",
        "🛡️ Row-Level-Security (RLS) Policies für Tabellen erstellen"
      ],
      chef_agent: {
        id: "chef_db",
        name: "Datenbank-Chef",
        title: "Lead Database Administrator & Data Architect",
        role: "chef_agent",
        department_id: 6,
        focus: "Überwacht Datenintegrität, RLS-Sicherheit und Performance",
        easy_explanation: "Sorgt dafür, dass niemals Daten verloren gehen und Abfragen in Millisekunden antworten."
      },
      specialist_pcs: [
        {
          id: "pc_db_1",
          name: "Tabellen-Architekt",
          title: "SQL- & Schema-Experte",
          role: "pc_agent",
          department_id: 6,
          focus: "Baut normalisierte Tabellen und Relationen",
          easy_explanation: "Entwirft relationale SQL-Tabellen mit Fremdschlüsseln und sauberen Datentypen."
        },
        {
          id: "pc_db_2",
          name: "Daten-Beschleuniger",
          title: "Index & Query-Tuning Spezialist",
          role: "pc_agent",
          department_id: 6,
          focus: "Verhindert langsame Abfragen durch smarte Indizes",
          easy_explanation: "Baut Indizes und optimiert SQL-Abfragen für blitzschnelle Suchergebnisse."
        },
        {
          id: "pc_db_3",
          name: "Sicherheits- & Rechte-Wächter",
          title: "Row Level Security (RLS) Engineer",
          role: "pc_agent",
          department_id: 6,
          focus: "Schützt Benutzerdaten mit RLS-Policies",
          easy_explanation: "Stellt sicher, dass jeder Nutzer streng nur auf seine eigenen Daten zugreifen darf."
        }
      ]
    },
    {
      id: 7,
      code: "dept_qa",
      name: "7. Fehlersuche & Stabilität",
      description: "Findet Bugs, testet Abläufe und sichert Qualität",
      easy_explanation: "Testet jeden Knopf, simuliert Fehleingaben, spürt Programmfehler auf und sorgt für absturzsichere Software.",
      color: "#f59e0b",
      floor_type: "stone",
      micro_status: "🔍 Testet Edge-Cases & Stabilität",
      quick_prompts: [
        "🔍 Kompletten Code auf Bugs & Edge-Cases prüfen",
        "🧪 Automatisierte Unit- & Integrationstests schreiben",
        "⏱️ Stresstest & Fehlertoleranz unter Last simulieren"
      ],
      chef_agent: {
        id: "chef_qa",
        name: "Chef-Tester",
        title: "Head of Quality Assurance & Testing",
        role: "chef_agent",
        department_id: 7,
        focus: "Leitet automatisierte Testreihen und Stabilitätsprüfungen",
        easy_explanation: "Gibt Software erst frei, wenn alle Tests grün sind und keine Fehler auftreten."
      },
      specialist_pcs: [
        {
          id: "pc_qa_1",
          name: "Automatischer Tester",
          title: "Unit- & Integrationstest-Entwickler",
          role: "pc_agent",
          department_id: 7,
          focus: "Schreibt automatisierte Prüfroutinen",
          easy_explanation: "Schreibt Roboter-Tests, die bei jeder Änderung sofort prüfen, ob noch alles klappt."
        },
        {
          id: "pc_qa_2",
          name: "Klick- & Ablauf-Prüfer",
          title: "End-to-End Test Engineer",
          role: "pc_agent",
          department_id: 7,
          focus: "Simuliert echte Benutzerklicks und Workflows",
          easy_explanation: "Klickt wie ein echter User durch die gesamte App und deckt Stolpersteine auf."
        },
        {
          id: "pc_qa_3",
          name: "Stresstest-Spezialist",
          title: "Last- & Grenzfall-Analyst",
          role: "pc_agent",
          department_id: 7,
          focus: "Testet das System unter extremer Belastung",
          easy_explanation: "Flutet das System mit tausenden Anfragen, um maximale Belastbarkeit zu garantieren."
        }
      ]
    },
    {
      id: 8,
      code: "dept_sec",
      name: "8. Sicherheit & Schutz",
      description: "Schützt vor Hackerangriffen, schützt Daten und sperrt Lücken",
      easy_explanation: "Prüft Passwörter, verhindert unbefugte Zugriffe, verschlüsselt Verbindungen und erfüllt DSGVO-Standards.",
      color: "#ef4444",
      floor_type: "tech_servers",
      micro_status: "🛡️ Scannt nach Security-Leaks",
      quick_prompts: [
        "🛡️ Sicherheits- & DSGVO-Audit durchführen",
        "🔑 API-Keys, Token-Leaks & Injection-Schutz prüfen",
        "🚫 CORS-, XSS- & CSRF-Schutzwall härten"
      ],
      chef_agent: {
        id: "chef_sec",
        name: "Sicherheits-Chef",
        title: "Chief Information Security Officer (CISO)",
        role: "chef_agent",
        department_id: 8,
        focus: "Schützt das gesamte Studio und Software vor Angriffen",
        easy_explanation: "Verteidigt das System wie eine Festung gegen Manipulation und Datendiebstahl."
      },
      specialist_pcs: [
        {
          id: "pc_sec_1",
          name: "Lücken-Sucher",
          title: "Schwachstellen- & Penetrationstester",
          role: "pc_agent",
          department_id: 8,
          focus: "Sucht Sicherheitslücken und Angriffspunkte",
          easy_explanation: "Versucht gezielt, Schwachstellen im Code zu finden, bevor Angreifer es tun."
        },
        {
          id: "pc_sec_2",
          name: "Zugangs- & Schloss-Wächter",
          title: "Auth, Token & Session Guard",
          role: "pc_agent",
          department_id: 8,
          focus: "Prüft JWT-Tokens, Passwörter und Rollen",
          easy_explanation: "Überwacht Passwörter, Sitzungen und stellt sicher, dass Unbefugte draußen bleiben."
        },
        {
          id: "pc_sec_3",
          name: "Verschlüsselungs-Experte",
          title: "Kryptografie & DSGVO-Wächter",
          role: "pc_agent",
          department_id: 8,
          focus: "Sichert Passwörter und sensible Kundendaten",
          easy_explanation: "Verschlüsselt Passwörter und Datenbankinhalte nach höchsten Krypto-Standards."
        }
      ]
    },
    {
      id: 9,
      code: "dept_ops",
      name: "9. Veröffentlichung & Server",
      description: "Bringt die App online (Render, Vercel, Docker, GitHub)",
      easy_explanation: "Richtet Deployment-Pipelines ein, konfiguriert Cloud-Server, Domains, SSL-Zertifikate und Docker-Container.",
      color: "#14b8a6",
      floor_type: "stone",
      micro_status: "🚀 Bereitet Cloud-Deployment vor",
      quick_prompts: [
        "🚀 Render.yaml & GitHub CI/CD Pipeline einrichten",
        "🌐 Custom Domain, SSL & Cloudflare DNS konfigurieren",
        "📦 Dockerfile & Container-Build optimieren"
      ],
      chef_agent: {
        id: "chef_ops",
        name: "DevOps-Chef",
        title: "Head of Infrastructure & Operations",
        role: "chef_agent",
        department_id: 9,
        focus: "Verantwortet automatisches Deployment und Cloud-Uptime",
        easy_explanation: "Sorgt dafür, dass das Projekt auf Knopfdruck 24/7 weltweit erreichbar online geht."
      },
      specialist_pcs: [
        {
          id: "pc_ops_1",
          name: "Container-Bauer",
          title: "Docker & Container-Architekt",
          role: "pc_agent",
          department_id: 9,
          focus: "Erstellt standardisierte Docker-Images",
          easy_explanation: "Verpackt die gesamte App in einen leichten Container, der überall identisch startet."
        },
        {
          id: "pc_ops_2",
          name: "Cloud-Einrichter",
          title: "Render, Vercel & Supabase Deployer",
          role: "pc_agent",
          department_id: 9,
          focus: "Konfiguriert Server in der Cloud",
          easy_explanation: "Richtet Cloud-Server bei Render oder Vercel ein und verbindet Datenbanken."
        },
        {
          id: "pc_ops_3",
          name: "Domain- & Web-Wächter",
          title: "DNS, SSL & Tunnel-Manager",
          role: "pc_agent",
          department_id: 9,
          focus: "Verwaltet Domains, SSL-Zertifikate und Live-Tunnels",
          easy_explanation: "Schaltet Web-Adressen und sichere HTTPS-Zertifikate frei für mobilen Zugriff."
        },
        {
          id: "pc_ops_4",
          name: "Dauerbetrieb-Wächter",
          title: "Monitoring & Auto-Restart Engineer",
          role: "pc_agent",
          department_id: 9,
          focus: "Überwacht Serverauslastung und Neustarts",
          easy_explanation: "Beobachtet Serverauslastung und startet Dienste bei Abstürzen automatisch neu."
        }
      ]
    },
    {
      id: 10,
      code: "dept_doc",
      name: "10. Dokumentation & Übergabe",
      description: "Schreibt verständliche Anleitungen und das Übergabe-Paket",
      easy_explanation: "Erstellt die README, API-Referenzen, Benutzerhandbücher und bereitet das finale Paket für Antigravity vor.",
      color: "#a855f7",
      floor_type: "wood",
      micro_status: "📖 Erstellt Antigravity Master-Task",
      quick_prompts: [
        "📖 Vollständige README.md & System-Doku schreiben",
        "📋 API-Referenz & Postman-Collection erstellen",
        "🎯 Schritt-für-Schritt Schnellstart-Anleitung verfassen"
      ],
      chef_agent: {
        id: "chef_doc",
        name: "Doku-Chef",
        title: "Lead Technical Writer & Release Manager",
        role: "chef_agent",
        department_id: 10,
        focus: "Stellt glasklare Dokumentation und Übergabe sicher",
        easy_explanation: "Macht komplexe Technik für jeden sofort verständlich und liefert perfekte Anleitungen."
      },
      specialist_pcs: [
        {
          id: "pc_doc_1",
          name: "Anleitungs-Schreiber",
          title: "README- & Benutzerhandbuch-Autor",
          role: "pc_agent",
          department_id: 10,
          focus: "Schreibt Schritt-für-Schritt-Anleitungen",
          easy_explanation: "Schreibt die README-Datei und einfache Schritt-für-Schritt-Anleitungen."
        },
        {
          id: "pc_doc_2",
          name: "Schnittstellen-Erklärer",
          title: "API-Dokumentations-Spezialist",
          role: "pc_agent",
          department_id: 10,
          focus: "Dokumentiert alle API-Endpunkte und Payloads",
          easy_explanation: "Erklärt jeden Server-Befehl und welche Daten gesendet werden müssen."
        },
        {
          id: "pc_doc_3",
          name: "Antigravity-Übergabe-Profi",
          title: "Master-Prompt & Checkpoint-Verfasser",
          role: "pc_agent",
          department_id: 10,
          focus: "Generiert den fertigen ANTIGRAVITY_TASK.md Prompt",
          easy_explanation: "Formuliert den finalen, wasserdichten Master-Prompt für Antigravity mit allen Checkpoints."
        }
      ]
    }
  ]
};

// Aliase für garantierte synchrone Verfügbarkeit
export const STUDIO_HIERARCHY_DATA = STUDIO_HIERARCHY;

if (typeof window !== 'undefined') {
  window.STUDIO_HIERARCHY = STUDIO_HIERARCHY;
  window.STUDIO_HIERARCHY_DATA = STUDIO_HIERARCHY;
}
