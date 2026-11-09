# TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER (V2.0)

> **Ein elitäres, KI-gestütztes Software-Architektur-Studio mit 10 Abteilungen, 44 Agenten-Einheiten, Three.js 3D-Campus, Trevor als Iron-Man Mech, autonomem Leerlauf-Training und Live-Mobile-Zugriff.**

---

## 🌟 1. System-Übersicht & Neuerungen in Version 2.0

```text
Desktop/KI_Trevor/
├── 00_Checkpoints_und_Status/      # Atomare Zwischenstände (CHECKPOINT_STATE.md) & Anti-Limit-Snapshots
├── 01_Datenbank_Supabase/          # SQL-Migrationen, Schemata, RLS & Seed-Daten (schema.sql)
├── 02_Frontend_UI_und_3D_Studio/   # 3D-Campus (studio3D.js), Klick-Inspektor, Dark-Slate/Gold UI & JA/NEIN-Terminal
├── 03_Agenten_System_und_Prompts/  # Trevor, 10 Chef-Agenten, 33 Spezial-PCs mit 'easy_explanation'
├── 04_KI_Engine_und_Bridges/       # Gemini Cloud, Ollama Bridge, idleTrainer.js & remoteSyncWatcher.js
├── 05_Antigravity_Outputs/         # Freigegebene Master-Prompts (ANTIGRAVITY_TASK.md)
└── 06_Deployment_und_Config/       # Server (server.js), Render-Blueprint (render.yaml) & .env.example
```

---

## 🏛️ 2. Die 10 Abteilungen & Spezialisten (Glasklare deutsche Bezeichnungen)

1. **1. Ideen & Planung:** Prüft deine Idee und plant alle Funktionen.
   - *Chef:* Planungs-Chef | *PCs:* Ideen-Prüfer, Funktions-Planer, Machbarkeits-Checker
2. **2. Bauplan & Technik:** Legt Ordnerstruktur, Sprachen und Systemaufbau fest.
   - *Chef:* Chef-Architekt | *PCs:* Technik-Wähler, Ordner- & Struktur-Planer, Schnittstellen-Planer
3. **3. Optik & Bedienung:** Entwirft Farben, Buttons und einfache Bedienbarkeit.
   - *Chef:* Design-Chef | *PCs:* Layout-Zeichner, Farben- & Dark-Mode-Profi, Handy- & PC-Ansicht-Prüfer
4. **4. Sichtbare Webseite (Frontend):** Programmiert alles, was man im Browser sieht und anklickt.
   - *Chef:* Frontend-Chef | *PCs:* Seiten- & Button-Bauer, Klick-Logik-Programmierer, 3D- & Animations-Bauer, Ladezeiten-Beschleuniger
5. **5. Server & Hintergrund-Logik (Backend):** Programmiert Berechnungen und Datenverarbeitung.
   - *Chef:* Backend-Chef | *PCs:* Datenwege-Bauer (API), Rechenlogik-Programmierer, Echtzeit-Sync-Profi, Login- & Rechte-Wächter
6. **6. Datenbank & Speicher:** Baut die Tabellen, in denen alle Daten sicher gespeichert werden.
   - *Chef:* Datenbank-Chef | *PCs:* Tabellen-Architekt, Such-Beschleuniger, Backup- & Sicherungs-Planer
7. **7. KI & Antigravity-Übersetzer:** Übersetzt alle Pläne in perfekte Befehle für Antigravity.
   - *Chef:* KI-Chef | *PCs:* Antigravity-Prompt-Bauer, KI-Regel-Optimierer, Sprachmodell-Verknüpfer
8. **8. Sicherheit & Datenschutz:** Schützt das Projekt vor Hackern, Fehlern und Datenlecks.
   - *Chef:* Sicherheits-Chef | *PCs:* Schutzschild-Prüfer, Datenschutz-Wächter, Passwort- & Schlüssel-Wächter
9. **9. Fehlersuche & Qualitäts-Check:** Testet den Code auf Herz und Nieren und sucht Bugs.
   - *Chef:* Test-Chef | *PCs:* Automatischer Funktions-Tester, Fehler-Jäger (Bug-Hunter), Härtetest-Simulator, Code-Qualitäts-Prüfer
10. **10. Veröffentlichung & Online-Stellung:** Macht die App startklar für Internet, GitHub und Render.
    - *Chef:* Release-Chef | *PCs:* Online-Stellungs-Profi (Render/GitHub), Paket- & Update-Verwalter, Anleitungs-Schreiber

---

## 🧊 3. Realistischer 3D-Campus & Trevor als Iron-Man Mech

- **Trevor Core:** Modelliert als 3D-Hero-Mech in **Hot-Rod-Rot (`#dc2626`) und Gold-Titan (`#fbbf24`)** mit metallischem Glanz, rot-goldener Helmschale, blau-weiß leuchtenden Augen-Schlitzen und einem hell strahlenden **Arc-Reactor** in der Brust.
- **Büro-Pods:** Warme Holz- und Schieferstein-Böden, edle schwarze Aluminium-Rahmen mit Glas-Wänden, Grünpflanzen in den Ecken, Server-Racks mit blinkenden LEDs und Whiteboards.
- **Arbeitsplätze:** Jeder Platz mit Schreibtisch, ergonomischem Bürostuhl, Dual-Widescreen-Monitoren und einem sitzenden, animierten **3D-Entwickler-Avatar**!

---

## 🔬 4. Live-Klick-Inspektor ("Was macht dieser Raum / PC gerade?")

Klicke im 3D-Campus oder 2D-Grid auf einen beliebigen Raum oder Spezialisten:
1. **Name & Abteilung:** Zeigt die genaue Rolle und Raumnummer.
2. **"Wofür bin ich zuständig?":** Einfache, alltagstaugliche Erklärung aus `easy_explanation`.
3. **"Was mache ich in dieser Sekunde?":**
   - *Bei laufendem Auftrag:* Aktueller Arbeitsschritt und generiertes Fachprotokoll.
   - *Im Leerlauf:* Zeigt live, an welchem Projekt (z. B. *Fussballschulen-Manager*) der Spezialist gerade autonom übt!
4. **"📚 Gelerntes Wissen (Training)":** Tab mit allen gesammelten Optimierungs-Erkenntnissen des Spezialisten.

---

## 🧠 5. Autonomes Leerlauf-Training (Idle-Training)

- Wenn kein Nutzer-Auftrag aktiv ist, trainieren die 10 Abteilungen automatisch an bestehenden Projekten (*KI_Trevor*, *Fussballschulen-Manager*, *LernfeldTrainer*, *Class Kart GP*).
- Erkenntnisse werden als `learned_insights` gesichert und fließen automatisch in Trevors neue Antigravity-Prompts ein!

---

## 📱 6. Live-Zugriff von unterwegs & in der Schule

### Live-URLs für das Studio:
1. **Lokal am PC:** [http://localhost:3000](http://localhost:3000)
2. **Im lokalen WLAN (Smartphone / Tablet):** `http://192.168.178.53:3000`
3. **Weltweit von unterwegs (5G / Schule / Mobil):**
   👉 **`https://better-mirrors-wonder.loca.lt`**
   *(Bypass-Passwort bei erster Abfrage: `88.67.105.95`)*
4. **Cloud-Hosting (Render Blueprint):** Vollständig vorkonfiguriert in [`render.yaml`](./render.yaml) für `https://trevor-ai-studio.onrender.com`.

### Cloud-Queue ("Von unterwegs auf 'JA' klicken"):
Klickst du unterwegs am Smartphone auf **"JA"**, wird der Auftrag in Supabase mit `approved_ready_for_execution` markiert.
Der **`remoteSyncWatcher.js`** auf deinem Heim-PC erkennt dies sofort, speichert die Datei `05_Antigravity_Outputs/ANTIGRAVITY_TASK.md` und befüllt deine lokale Zwischenablage!
