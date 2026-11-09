# TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER

> **Ein elitäres, KI-gestütztes Software-Architektur-Studio mit 10 Abteilungen, 44 Agenten-Einheiten, Three.js 3D-Campus und einem strikten 4-Stufen-Workflow.**

---

## 🌟 1. System-Übersicht & Architektur

TREVOR bündelt die geballte Expertise eines modernen Software-Studios in einer interaktiven Cyberpunk-Kommandozentrale:

```text
Desktop/KI_Trevor/
├── 00_Checkpoints_und_Status/      # Atomare Zwischenstände (CHECKPOINT_STATE.md) & Anti-Limit-Snapshots
├── 01_Datenbank_Supabase/          # SQL-Migrationen, Schemata, RLS & Seed-Daten (schema.sql)
├── 02_Frontend_UI_und_3D_Studio/   # Three.js 3D-Campus (studio3D.js), Dark-Slate UI & JA/NEIN-Terminal
├── 03_Agenten_System_und_Prompts/  # Trevor, 10 Chef-Agenten, 33 Spezial-PCs (studio_hierarchy.json & Prompts)
├── 04_KI_Engine_und_Bridges/       # Gemini Cloud, Ollama Local Bridge, Supabase Client & Orchestrator
├── 05_Antigravity_Outputs/         # Freigegebene Master-Prompts (ANTIGRAVITY_TASK.md)
└── 06_Deployment_und_Config/       # Server (server.js), Render-Blueprint (render.yaml) & .env.example
```

### Die Studio-Einheiten (44 Instanzen):
1. **Trevor Core:** Studio-Director (`trevor_core`, Karmesinrot `#ef4444`, Zentrum).
2. **10 Software-Abteilungen:** Stern-/Hexagon-Architektur rund um Trevor:
   - **Raum 1:** System-Architektur & High-Level Design (Chef: Archon | 3 PCs)
   - **Raum 2:** Backend & API Engineering (Chef: Vektor | 3 PCs)
   - **Raum 3:** Frontend UI, UX & 3D Studio (Chefin: Lumina | 4 PCs)
   - **Raum 4:** Database & Supabase Engineering (Chef: Chronos | 3 PCs)
   - **Raum 5:** Security, Auth & Compliance (Chef: Aegis | 3 PCs)
   - **Raum 6:** DevOps, CI/CD & Deployment (Chef: Nexus | 3 PCs)
   - **Raum 7:** QA, Testing & Edge Cases (Chef: Sentinel | 3 PCs)
   - **Raum 8:** KI-Engine & Prompt Optimization (Chefin: Synapse | 4 PCs)
   - **Raum 9:** Documentation & Developer Experience (Chef: Scribe | 3 PCs)
   - **Raum 10:** Antigravity Code Synthesis (Chef: Katalyst | 4 PCs)
   *(Summe: 1 Trevor + 10 Chef-Agenten + 33 Spezial-PCs = 44 Einheiten)*

---

## ⚡ 2. Schnelleinstieg (1-Klick Start)

### Option A: Über den mitgelieferten Zero-Dependency Webserver (Empfohlen)
Öffne ein Terminal (PowerShell / Bash) im Projektordner:
```bash
npm start
# oder direkt mit Node:
node 06_Deployment_und_Config/server.js
```
Öffne anschließend im Browser: **[http://localhost:3000](http://localhost:3000)**

### Option B: Direktes Öffnen ohne Webserver
Öffne einfach per Doppelklick die Datei:
`Desktop/KI_Trevor/02_Frontend_UI_und_3D_Studio/index.html`

---

## 🔄 3. Der 4-Stufen-Workflow

| Stufe | Rolle | Funktion |
| :--- | :--- | :--- |
| **01** | **Fachteam** | 33 Spezial-PCs erarbeiten Code, Schemata & Tests. Monitore leuchten Cyan (`#06b6d4`). |
| **02** | **Chef-Agent** | 10 Abteilungsleiter prüfen Ergebnisse, beseitigen Widersprüche und erstellen Blueprints. Leuchten Amber (`#f59e0b`). |
| **03** | **Trevor** | Synthetisiert das Gesamtergebnis zu `trevor_summary` und dem ausführbaren `antigravity_prompt`. |
| **04** | **Du entscheidest** | **NUR JA ODER NEIN:** Verbindliche Freigabe durch dich als Projektinhaber. |

### Freigabe (`JA`):
- Kopiert den kompletten Antigravity Master-Prompt direkt in deine Zwischenablage (<kbd>Strg + V</kbd>).
- Speichert den Prompt automatisch als `05_Antigravity_Outputs/ANTIGRAVITY_TASK.md`.
- Schaltet Buttons für direkten Dateisystem-Export frei.

### Ablehnung (`NEIN`):
- Ermöglicht die Eingabe eines kurzen Korrektur-Hinweises.
- Startet den Workflow nahtlos ab Stufe 02 (Chef-Ebene) neu.

---

## 🛡️ 4. Anti-Limit-Fangnetz & Resume-Engine

- **Atomare Checkpoints:** Nach **jedem einzelnen PC-Agenten** und **jedem einzelnen Chef-Agenten** wird der Zwischenstand sofort in Supabase und in `00_Checkpoints_und_Status/CHECKPOINT_STATE.md` festgeschrieben.
- **Nahtloses Resume:** Tritt ein Rate-Limit (`429` / Quota) auf, friert das System den Task am exakten Punkt ein. Über den Button **`[ ⏯️ Ab Zwischenstand fortsetzen ]`** geht es sofort ohne Datenverlust weiter!

---

## ☁️ 5. Dual-Engine: Schule vs. Zuhause

- **In der Schule / Mobil:** Umschalter auf `[ ☁️ Gemini Cloud ]`. Nutzt `gemini-2.5-flash` für blitzschnelle Berechnungen (oder den intelligenten Offline-Simulator bei fehlender Internetverbindung).
- **Zu Hause (Offline):** Umschalter auf `[ 🖥️ Ollama Lokal ]`. Nutzt deine lokale Llama 3 Inferenz unter `http://localhost:11434`.

---

## 🚀 6. Cloud-Deployment auf Render

Das Repository enthält eine schlüsselfertige [`render.yaml`](./render.yaml). Verbinde einfach dein GitHub-Repository mit Render.com – der Web-Service baut und startet vollautomatisch.
