/**
 * TREVOR – AI SOFTWARE STUDIO & MULTI-AGENT COMMAND CENTER
 * File: 04_KI_Engine_und_Bridges/llmEngine.js
 * 
 * Einheitliche Multi-Provider KI-Bridge:
 * - Modus A: Google Gemini Cloud API (ideal für Schule, mobiles Arbeiten & hohe Geschwindigkeiten)
 * - Modus B: Ollama Local Engine (ideal für zu Hause, 100% lokal & offline via http://localhost:11434)
 * 
 * Mit extrem robustem Fehler- & Rate-Limit-Fangnetz (LimitReachedError),
 * das Kontingenterschöpfung (HTTP 429, RESOURCE_EXHAUSTED) fängt und
 * dem Orchestrator das atomare Einfrieren des Tasks ermöglicht.
 */

export class LimitReachedError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'LimitReachedError';
    this.isLimit = true;
    this.provider = details.provider || 'unknown';
    this.statusCode = details.statusCode || 429;
    this.retryAfter = details.retryAfter || 60; // Sekunden
    this.originalError = details.originalError || null;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Ruft die Gemini API über REST auf
 */
async function callGeminiApi({ systemPrompt, userPrompt, model, apiKey }) {
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const targetModel = model || 'gemini-2.5-flash';

  if (!effectiveKey) {
    console.warn('[Trevor LLM] Kein GEMINI_API_KEY gefunden. Fallback-Modus aktiv.');
    // Synthetische Antwort für Offline/Schul-Testumgebung
    return `[LOKALER ENTWICKLUNGS-MODUS (Gemini API-Key nicht gesetzt)]\n\nFachausarbeitung für ${targetModel}:\n\n` +
           `1. [SPEZIFIKATION]: Strukturierte Implementierung im Rahmen des Trevor Studio Systems.\n` +
           `2. [CODE / DEFINITION]:\n\`\`\`javascript\n// Autogenerierte Spezifikation durch Trevor Engine Fallback\nexport const config = { verified: true, engine: '${targetModel}' };\n\`\`\`\n` +
           `3. [RISIKO & GUARDRAIL]: API-Key in .env hinterlegen, um Live-Inferenz zu nutzen.`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${effectiveKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192
    }
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError' || networkErr.code === 'ECONNREFUSED' || networkErr.code === 'ENOTFOUND') {
      throw new LimitReachedError(`Netzwerkverbindung zu Gemini unterbrochen (${networkErr.message})`, {
        provider: 'gemini',
        statusCode: 503,
        originalError: networkErr
      });
    }
    throw networkErr;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    // Prüfe auf Quota / Rate-Limit (429 oder RESOURCE_EXHAUSTED)
    if (response.status === 429 || errorBody.includes('RESOURCE_EXHAUSTED') || errorBody.includes('quota') || errorBody.includes('RATE_LIMIT_EXCEEDED')) {
      throw new LimitReachedError(`Gemini Rate-Limit erreicht (Status ${response.status}): ${errorBody}`, {
        provider: 'gemini',
        statusCode: response.status,
        originalError: errorBody
      });
    }
    throw new Error(`Gemini API Fehler (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini API hat keine gültige Textantwort zurückgegeben.');
  }

  return textOutput;
}

/**
 * Ruft die lokale Ollama API auf
 */
async function callOllamaApi({ systemPrompt, userPrompt, model, ollamaUrl }) {
  const baseUrl = (ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
  const targetModel = model || 'llama3';
  const endpoint = `${baseUrl}/api/chat`;

  const payload = {
    model: targetModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: false,
    options: {
      temperature: 0.2
    }
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkErr) {
    throw new LimitReachedError(`Lokale Ollama-Instanz unter ${baseUrl} nicht erreichbar (${networkErr.message}). Bitte Ollama starten oder auf Gemini wechseln.`, {
      provider: 'ollama',
      statusCode: 503,
      originalError: networkErr
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) {
      throw new LimitReachedError(`Ollama Überlastung / 429: ${errorText}`, {
        provider: 'ollama',
        statusCode: 429,
        originalError: errorText
      });
    }
    throw new Error(`Ollama Fehler (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data?.message?.content;
  if (!textOutput) {
    throw new Error('Ollama hat keine Text-Inhalte zurückgegeben.');
  }

  return textOutput;
}

/**
 * Einheitliche Ausführungsfunktion für alle Agenten
 * 
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {Object} [params.settings] - { llm_mode: 'gemini'|'ollama', gemini_model, ollama_url, ollama_model, apiKey }
 * @returns {Promise<string>} Antworttext des LLMs
 */
export async function runAgentPrompt({ systemPrompt, userPrompt, settings = {} }) {
  const mode = settings.llm_mode || 'gemini';

  try {
    if (mode === 'ollama') {
      return await callOllamaApi({
        systemPrompt,
        userPrompt,
        model: settings.ollama_model,
        ollamaUrl: settings.ollama_url
      });
    } else {
      return await callGeminiApi({
        systemPrompt,
        userPrompt,
        model: settings.gemini_model,
        apiKey: settings.gemini_api_key
      });
    }
  } catch (err) {
    // Falls LimitReachedError, werfe sauber weiter für den Checkpoint-Guard
    if (err instanceof LimitReachedError) {
      console.warn(`[Trevor LLM] Limit/Ausfall abgefangen [${err.provider}]: ${err.message}`);
      throw err;
    }
    // Unerwartete Fehler
    console.error(`[Trevor LLM] Unbehandelter Fehler bei Ausführung:`, err);
    throw err;
  }
}
