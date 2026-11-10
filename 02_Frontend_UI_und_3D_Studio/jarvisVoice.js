/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 02_Frontend_UI_und_3D_Studio/jarvisVoice.js
 * 
 * J.A.R.V.I.S. Voice-Interface:
 * - Text-To-Speech (TTS) via window.speechSynthesis mit britisch-souveränen J.A.R.V.I.S.-Parametern
 * - Bereinigung von Markdown-Codeblöcken ("Code liegt im Terminal bereit, Sir.")
 * - Visuelle 3D-Synchronisation (window.isJarvisSpeaking = true) für Arc-Reactor Audio-Puls
 * - Speech-To-Text (STT) via Web Speech API (SpeechRecognition) für Live-Transkription & Sprachbefehle
 */

// Globaler Sprach- und Status-Zustand
if (typeof window !== 'undefined') {
  window.isJarvisSpeaking = false;
  const savedVoiceEnabled = localStorage.getItem('trevor_jarvis_voice_enabled');
  window.jarvisVoiceEnabled = savedVoiceEnabled !== null ? (savedVoiceEnabled === 'true') : true;
}

let cachedVoices = [];
let recognitionInstance = null;
let isRecognizing = false;

/**
 * Lädt die im Browser installierten Stimmen
 */
function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices() || [];
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
  loadVoices();
}

/**
 * Bereinigt Text von Markdown-Symbolen und ersetzt Code-Blöcke für ein natürliches Hörerlebnis
 * @param {string} text - Roher Markdown- oder Systemtext
 * @returns {string} Für Sprachausgabe optimierter Text
 */
export function cleanTextForJarvisSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Mehrzeilige Code-Blöcke (```...```) ersetzen:
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' Der entsprechende Code-Block liegt im Terminal bereit, Sir. ');

  // 2. Inline-Code (`...`) bereinigen:
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Markdown-Überschriften (#, ##, ###)
  cleaned = cleaned.replace(/#{1,6}\s+/g, '');

  // 4. Formatierungen (Fett, Kursiv, Durchgestrichen)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');

  // 5. Links [Titel](url) -> Titel
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 6. Bilder ![Alt](url) -> entfernen
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // 7. Aufzählungszeichen (- , * , + ) & Zitate (> )
  cleaned = cleaned.replace(/^[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^>\s+/gm, '');

  // 8. Trennlinien (---, ***)
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');

  // 9. Mehrfache Leerzeichen und Zeilenumbrüche glätten
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Wählt priorisiert die beste männliche neurale Stimme aus
 * @returns {SpeechSynthesisVoice|null}
 */
export function selectBestJarvisVoice() {
  const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  if (!voices || voices.length === 0) return null;

  // Priorisierte Liste:
  // 1. 'Microsoft Conrad Online (Natural) - German (Germany)'
  // 2. 'Microsoft Killian Online (Natural) - German (Germany)'
  // 3. 'Google Deutsch' oder männliche deutsche Stimme
  // 4. Beliebige deutsche Stimme
  // 5. 'Daniel' oder 'George' (Englischer J.A.R.V.I.S.-Stil)
  const voiceChecks = [
    v => v.name.includes('Conrad') && (v.lang.startsWith('de') || v.lang.includes('DE')),
    v => v.name.includes('Killian') && (v.lang.startsWith('de') || v.lang.includes('DE')),
    v => v.name.includes('Google Deutsch') || (v.lang.startsWith('de') && (v.name.includes('Stefan') || v.name.includes('Bernd') || v.name.includes('Male'))),
    v => v.lang.startsWith('de') || v.lang.includes('DE'),
    v => v.name.includes('Daniel') || v.name.includes('George'),
    v => v.lang.startsWith('en')
  ];

  for (const check of voiceChecks) {
    const found = voices.find(check);
    if (found) return found;
  }

  return voices[0] || null;
}

/**
 * Sprachausgabe im J.A.R.V.I.S.-Stil (inklusive Arc-Reactor 3D-Synchronisation)
 * @param {string} rawText - Vorzulesender Text
 */
export function speakAsJarvis(rawText) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Stummschaltung prüfen
  if (window.jarvisVoiceEnabled === false) {
    console.log('[J.A.R.V.I.S.] Sprachausgabe deaktiviert (Mute aktiv).');
    return;
  }

  const cleaned = cleanTextForJarvisSpeech(rawText);
  if (!cleaned) return;

  // Vorherige Ausgabe stoppen
  try {
    window.speechSynthesis.cancel();
  } catch (err) {
    console.warn('[J.A.R.V.I.S.] Cancel Fehler:', err);
  }

  const utterance = new SpeechSynthesisUtterance(cleaned);
  const voice = selectBestJarvisVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'de-DE';
  } else {
    utterance.lang = 'de-DE';
  }

  // J.A.R.V.I.S. Audio-Charakteristik:
  // pitch = 0.92 (souveräne, tiefere Bruststimme)
  // rate = 1.04 (präzises, flüssiges Tempo)
  utterance.pitch = 0.92;
  utterance.rate = 1.04;
  utterance.volume = 1.0;

  // 3D-Synchronisation Start
  utterance.onstart = () => {
    window.isJarvisSpeaking = true;
    console.log('[J.A.R.V.I.S.] Spreche: "' + cleaned.slice(0, 60) + '..."');
    if (typeof window.onJarvisSpeakStart === 'function') {
      window.onJarvisSpeakStart();
    }
  };

  const endSpeech = () => {
    window.isJarvisSpeaking = false;
    if (typeof window.onJarvisSpeakEnd === 'function') {
      window.onJarvisSpeakEnd();
    }
  };

  utterance.onend = endSpeech;
  utterance.onerror = (evt) => {
    console.warn('[J.A.R.V.I.S.] Sprachausgabe-Fehler:', evt);
    endSpeech();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Bricht die Sprachausgabe sofort ab
 */
export function stopJarvisSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    window.isJarvisSpeaking = false;
  }
}

/**
 * Umschalten der J.A.R.V.I.S.-Sprachausgabe (Mute-Toggle)
 */
export function toggleJarvisVoiceEnabled() {
  if (typeof window === 'undefined') return false;
  window.jarvisVoiceEnabled = !window.jarvisVoiceEnabled;
  localStorage.setItem('trevor_jarvis_voice_enabled', window.jarvisVoiceEnabled ? 'true' : 'false');
  if (!window.jarvisVoiceEnabled) {
    stopJarvisSpeech();
  }
  updateVoiceToggleButtonUI();
  return window.jarvisVoiceEnabled;
}

/**
 * Aktualisiert das Aussehen des Voice-Buttons in der Kopfzeile
 */
export function updateVoiceToggleButtonUI() {
  const btn = document.getElementById('btn-toggle-jarvis-voice');
  if (!btn) return;
  if (window.jarvisVoiceEnabled) {
    btn.innerHTML = '🗣️ J.A.R.V.I.S. Voice: AN';
    btn.classList.remove('muted');
    btn.title = 'J.A.R.V.I.S. Sprachausgabe ist AN – Klicken zum Stummschalten';
  } else {
    btn.innerHTML = '🔇 J.A.R.V.I.S. Voice: AUS';
    btn.classList.add('muted');
    btn.title = 'J.A.R.V.I.S. Sprachausgabe ist AUS – Klicken zum Aktivieren';
  }
}

/**
 * Prüft, ob die Spracherkennung gerade aktiv zuhört
 */
export function isVoiceRecognitionActive() {
  return isRecognizing;
}

/**
 * Startet oder stoppt die Spracheingabe (Speech-To-Text) mit Live-Transkription
 */
export function toggleVoiceRecognition() {
  if (typeof window === 'undefined') return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Die Web Speech API (Spracherkennung) wird in diesem Browser nicht unterstützt. Bitte nutze Google Chrome oder Microsoft Edge.');
    return;
  }

  // Falls bereits aktiv: stoppen
  if (isRecognizing && recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch {}
    isRecognizing = false;
    updateMicButtonUI(false);
    return;
  }

  try {
    recognitionInstance = new SpeechRec();
    recognitionInstance.lang = 'de-DE';
    recognitionInstance.interimResults = true;
    recognitionInstance.continuous = false;

    recognitionInstance.onstart = () => {
      isRecognizing = true;
      updateMicButtonUI(true);
      console.log('[J.A.R.V.I.S.] Mikrofon aktiv – ich höre zu, Sir...');
      if (typeof window.showActionToast === 'function') {
        window.showActionToast('J.A.R.V.I.S. hört zu', 'Bitte sprich deinen Auftrag oder Sprachbefehl...', 'SUCCESS');
      }
    };

    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interimTranscript += res[0].transcript;
        }
      }

      const recognizedText = (finalTranscript || interimTranscript).trim();
      
      // Ziel-Eingabefeld ermitteln (Direct-Prompt im Inspektor falls offen, sonst Hauptfeld)
      let targetInput = document.getElementById('agent-direct-prompt');
      if (!targetInput || targetInput.offsetParent === null) {
        targetInput = document.getElementById('task-prompt-input');
      }

      if (targetInput && recognizedText) {
        targetInput.value = recognizedText;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Erkennung spezieller Sprachbefehle
      const lower = recognizedText.toLowerCase();

      // Befehl 1: "Trevor, zurück zur Zentrale"
      if (lower.includes('zurück zur zentrale') || lower.includes('zentrale zurück') || lower.includes('zur zentrale')) {
        if (typeof window.returnToHub === 'function') {
          window.returnToHub();
          speakAsJarvis('Sehr wohl, Sir. Kehre zur Zentrale zurück.');
          try { recognitionInstance.stop(); } catch {}
          return;
        }
      }

      // Befehl 2: "Trevor, alle Aufträge stoppen" / "Abbruch"
      if (lower.includes('aufträge stoppen') || lower.includes('auftrag stoppen') || lower.includes('alle prozesse stoppen') || lower.includes('prozesse anhalten')) {
        if (typeof window.cancelAllActiveTasks === 'function') {
          window.cancelAllActiveTasks();
          speakAsJarvis('Alle aktiven Prozesse wurden angehalten, Sir.');
          try { recognitionInstance.stop(); } catch {}
          return;
        }
      }
    };

    recognitionInstance.onerror = (event) => {
      console.warn('[J.A.R.V.I.S.] Spracherkennung Fehler:', event.error);
      isRecognizing = false;
      updateMicButtonUI(false);
    };

    recognitionInstance.onend = () => {
      isRecognizing = false;
      updateMicButtonUI(false);
      console.log('[J.A.R.V.I.S.] Spracherkennung beendet.');

      // Senden-Button fokussieren falls Eingabetext vorhanden ist
      const input = document.getElementById('task-prompt-input');
      if (input && input.value.trim().length > 3) {
        const btnSubmit = document.getElementById('btn-dispatch-task');
        if (btnSubmit) btnSubmit.focus();
      }
    };

    recognitionInstance.start();
  } catch (err) {
    console.error('[J.A.R.V.I.S.] Start der Spracherkennung fehlgeschlagen:', err);
    isRecognizing = false;
    updateMicButtonUI(false);
  }
}

/**
 * Aktualisiert den optischen Zustand des Mikrofon-Buttons (Pulsieren / Rot)
 * @param {boolean} active 
 */
function updateMicButtonUI(active) {
  const btn = document.getElementById('btn-mic-input');
  if (!btn) return;

  if (active) {
    btn.classList.add('recording');
    btn.innerHTML = '<span>🔴 Höre zu...</span>';
    btn.title = 'Mikrofon aktiv – Klicken zum Beenden';
  } else {
    btn.classList.remove('recording');
    btn.innerHTML = '<span>🎙️ Sprechen</span>';
    btn.title = 'Mit Trevor sprechen (J.A.R.V.I.S. Voice)';
  }
}

/**
 * J.A.R.V.I.S. Start-Begrüßung beim Betreten des Studios (einmalig pro Session)
 */
export function playJarvisWelcomeGreeting() {
  if (typeof window === 'undefined') return;
  if (window.hasGreetedUser === true) return;
  window.hasGreetedUser = true;

  // 1. AudioContext initialisieren / fortsetzen
  try {
    if (typeof window.initAudioContext === 'function') {
      window.initAudioContext();
    }
  } catch (err) {
    console.warn('[J.A.R.V.I.S.] AudioContext Initialisierung Warnung:', err);
  }

  const welcomeText = 'Hallo Sir, was wollen wir heute bearbeiten?';

  // 2. Sprachausgabe im J.A.R.V.I.S.-Stil
  try {
    speakAsJarvis(welcomeText);
  } catch (err) {
    console.warn('[J.A.R.V.I.S.] Begrüßung Sprachausgabe Fehler:', err);
  }

  // 3. Status-Banner & Toast im UI aktualisieren
  try {
    if (typeof window.updateCheckpointBadge === 'function') {
      window.updateCheckpointBadge(`🗣️ J.A.R.V.I.S.: "${welcomeText}"`, true);
    }
    if (typeof window.showActionToast === 'function') {
      window.showActionToast('J.A.R.V.I.S. bereit', welcomeText, 'QUESTION');
    }
  } catch {}
}

// Global an window binden
if (typeof window !== 'undefined') {
  window.speakAsJarvis = speakAsJarvis;
  window.stopJarvisSpeech = stopJarvisSpeech;
  window.toggleVoiceRecognition = toggleVoiceRecognition;
  window.toggleJarvisVoiceEnabled = toggleJarvisVoiceEnabled;
  window.cleanTextForJarvisSpeech = cleanTextForJarvisSpeech;
  window.selectBestJarvisVoice = selectBestJarvisVoice;
  window.playJarvisWelcomeGreeting = playJarvisWelcomeGreeting;
}
