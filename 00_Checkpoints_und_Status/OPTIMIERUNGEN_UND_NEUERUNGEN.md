# MASTER-KATALOG: SYSTEM-WEITE OPTIMIERUNGEN & NEUERUNGEN FÜR KI_TREVOR

> **Ziel:** Vollständige strukturierte Liste aller identifizierten Verbesserungen, Optimierungspotenziale und Neuerungen über alle 14 Abteilungen und Architekturebenen. Diese Liste dient als schrittweiser Umsetzungs-Fahrplan für zukünftige Iterationen.

---

## 🏢 1. ÜBERSICHT NACH ARCHITEKTUR-EBENEN

| ID | Bereich | Priorität | Status | Ziel-Datei / Modul | Kurzbeschreibung |
|---|---|---|---|---|---|
| **OPT-01** | Frontend UI & Roadmap | HOCH | In Arbeit (Schritt 1) | `02_Frontend_UI_und_3D_Studio/app.js` | Dark-Slate [JA]/[NEIN] Entscheidungsliste mit Multi-Filter & Zähler |
| **OPT-02** | Backend & Server API | HOCH | In Arbeit (Schritt 2) | `06_Deployment_und_Config/server.js` | Dual-Engine Proxy, CORS-Hardening, Checkpoint-Endpunkte |
| **OPT-03** | Datenbank & Sicherheit | HOCH | In Arbeit (Schritt 3) | `01_Datenbank_Supabase/schema.sql` | RLS-Regeln, Backlog-Tabelle, Indizes & Migrationen |
| **OPT-04** | 3D-Campus & Three.js | HOCH | In Arbeit (Schritt 4) | `02_Frontend_UI_und_3D_Studio/studio3D.js` | OrbitControls Damping (0.05), 60 FPS Delta-Clock, State-Sync |
| **OPT-05** | Local Bridge Server | MITTEL | Geplant | `04_KI_Engine_und_Bridges/localBridgeServer.js` | WebSocket Live-Log-Streaming statt Polling |
| **OPT-06** | KI Engine & Token-Budget | MITTEL | Geplant | `02_Frontend_UI_und_3D_Studio/llmEngine.js` | Automatisches Token-Clipping & Fallback-Retry-Exponential |
| **OPT-07** | Code-RAG Engine | HOCH | Geplant | `02_Frontend_UI_und_3D_Studio/workflowOrchestrator.js` | AST-basierter Chunking-Filter für Code-Dateien (> 500 Zeilen) |
| **OPT-08** | Offline-PWA & Caching | NIEDRIG | Geplant | `06_Deployment_und_Config/` | ServiceWorker für vollständige Offline-Verfügbarkeit des Studios |

---

## 🏛️ 2. DETAIL-OPTIMIERUNGEN DER 14 ABTEILUNGEN

### Erdgeschoss (EG: Software-Entwicklung & Studio-Direktion)

1. **Abteilung 1 – Ideen & Planung (`dept_1`):**
   - *Neuerung:* Automatisches User-Story-Mapping und Akzeptanzkriterien-Generator im Trevor-Terminal.
   - *Optimierung:* Frühe Erkennung unvollständiger Anforderungen mit Rückfrage-Prompts.

2. **Abteilung 2 – Bauplan & Technik (`dept_2`):**
   - *Neuerung:* Generierung von interaktiven Mermaid-Architektur-Diagrammen im Inspektions-Panel.
   - *Optimierung:* Automatische Konsistenzprüfung modularer Pfade (`02_...`, `04_...`, `06_...`).

3. **Abteilung 3 – Aussehen & Bedienung / Frontend (`dept_3`):**
   - *Neuerung:* Theme-Switcher (Dark-Slate / Cyber-Red / High-Contrast Accessibility Mode).
   - *Optimierung:* Virtualisiertes Rendering von Agenten-Logs für flüssiges Scrollen bei > 1.000 Zeilen.

4. **Abteilung 4 – 3D-Campus & Grafiken (`dept_4`):**
   - *Neuerung:* Dynamische Heatmap der am stärksten ausgelasteten Abteilungen über Raum-Bodenlichter.
   - *Optimierung:* Damping bei Kamera-Fahrten und Memory-Disposal nicht genutzter Geometrien.

5. **Abteilung 5 – Server & Hintergrund-Logik (`dept_5`):**
   - *Neuerung:* Integrierter Rate-Limiter und Health-Check-Dashboard im Node-Server.
   - *Optimierung:* Asynchrones File-Streaming bei RAG-Anfragen großer Projekte.

6. **Abteilung 6 – Datenbank & Speicher (`dept_6`):**
   - *Neuerung:* Auto-Snapshotting des Zustands vor jeder destruktiven Tabellenänderung.
   - *Optimierung:* Composite-Indizes für `tasks(status, created_at)` und granulare RLS-Sicherheitsregeln.

7. **Abteilung 7 – Verbindungen & APIs (`dept_7`):**
   - *Neuerung:* Auto-Discovery lokaler LLM-Modelle (Ollama `/api/tags`) im UI-Dropdown.
   - *Optimierung:* Timeout-Fallback von 10s auf Offline-Mocks bei Verbindungsabbrüchen.

8. **Abteilung 8 – Qualitäts- & Fehlerprüfung / QA (`dept_8`):**
   - *Neuerung:* Auto-Test-Runner mit direktem Testergebnis-Badge im Trevor-Terminal.
   - *Optimierung:* Syntax-Preflight mit `node -c` vor dem finalen Antigravity-Export.

9. **Abteilung 9 – Absicherung & Passwörter / Security (`dept_9`):**
   - *Neuerung:* Automatischer Secret-Scanner, der API-Keys in Prompts maskiert.
   - *Optimierung:* Sandbox-Check mit striktem Whitelisting erlaubter Ordner im Root.

10. **Abteilung 10 – Bereitstellung & Wartung / DevOps (`dept_10`):**
    - *Neuerung:* 1-Klick Dockerfile- und docker-compose.yml-Export für das gesamte Studio.
    - *Optimierung:* Statische Asset-Kompression (gzip) im Node-Server.

---

### Untergeschoss (UG: Keller, Hardware & Infrastruktur)

11. **Abteilung 11 – Das Archiv (`dept_11`):**
    - *Neuerung:* Semantischer Volltext-Suchindex über alle bisherigen Antigravity-Exports und Entscheidungen.
    - *Optimierung:* Lokales Caching gelerner Prompts in `localStorage` & Supabase.

12. **Abteilung 12 – Der Serverraum (`dept_12`):**
    - *Neuerung:* Live-Ping-Monitor für Gateway, Bridge (3001), Web-Server (3000) und Ollama (11434).
    - *Optimierung:* Automatischer Reconnect mit Backoff, wenn der Bridge-Server neu startet.

13. **Abteilung 13 – Die Werkstatt (`dept_13`):**
    - *Neuerung:* Schaltplan-Generator für ESP32/Raspberry Pi Pinbelegungen als ASCII/Markdown.
    - *Optimierung:* Spezielle Hardware-Prompt-Templates für Sensoren, Aktoren und serielle Protokolle.

14. **Abteilung 14 – Die Lounge (`dept_14`):**
    - *Neuerung:* Pomodoro-Timer und Kaffeepausen-Erinnerung im 3D-Büro.
    - *Optimierung:* Schnelle Brainstorming-Modi mit kreativen System-Prompts.

---

## 🚀 3. DIE 4 FREIGEGEBENEN MASTER-SCHRITTE (ROADMAP)

1. **Schritt 1 (Frontend & 3D):**
   - Dynamische [JA]/[NEIN] Entscheidungsliste & Dark-Slate Filter in `02_Frontend_UI_und_3D_Studio/app.js`.
2. **Schritt 2 (Backend & Bridges):**
   - Dual-Engine Proxy, CORS-Hardening & Task-Historie in `06_Deployment_und_Config/server.js`.
3. **Schritt 3 (System & Architektur):**
   - Supabase Schema, Backlog-Tabelle & RLS-Sicherheitsregeln in `01_Datenbank_Supabase/schema.sql`.
4. **Schritt 4 (3D-Campus & Visualisierung):**
   - OrbitControls Damping, 60 FPS Render-Loop & State-Sync in `02_Frontend_UI_und_3D_Studio/studio3D.js`.
