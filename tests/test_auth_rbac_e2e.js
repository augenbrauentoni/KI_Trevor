/**
 * PITCHPRO VERSION 10.0 BETA LITE - END-TO-END AUTOMATED TEST SUITE (ESM)
 * Testet:
 * 1. Supabase-Schema & RLS-Policies (auth.uid() = user_id Guardrail)
 * 2. Supabase Auth Pipeline (Login, Signup, Session Persistence, Offline-Fallback)
 * 3. RBAC Guard & Rechtematrix (5 Rollen, Memoisierung, Role-Simulation)
 * 4. Production Client HTML & JS Syntax-Integrität
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SQL_PATH = path.join(ROOT_DIR, '01_Datenbank_Supabase', 'supabase_auth_rbac_pitchpro_v10_lite.sql');
const CSS_PATH = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', 'components', 'pitchproDarkSlateTheme.css');
const AUTH_JS_PATH = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', 'components', 'pitchproAuthPipeline.js');
const RBAC_JS_PATH = path.join(ROOT_DIR, '02_Frontend_UI_und_3D_Studio', 'components', 'pitchproRBACGuard.js');
const HTML_OUTPUT_PATH = path.join(ROOT_DIR, '05_Antigravity_Outputs', 'PitchPro_Beta_10.0_lite_Auth_RBAC.html');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

console.log('\n=============================================================');
console.log(' PITCHPRO 10.0 BETA LITE: E2E TEST-SUITE (SUPABASE AUTH & RBAC)');
console.log('=============================================================\n');

// -----------------------------------------------------------------------------
// TESTSUITE 1: SUPABASE-SCHEMA & RLS-POLICIES
// -----------------------------------------------------------------------------
console.log('--- TESTSUITE 1: Supabase-Schema & RLS Sicherheits-Guardrails ---');

assert(fs.existsSync(SQL_PATH), 'SQL-Schema-Datei existiert');
const sqlContent = fs.readFileSync(SQL_PATH, 'utf-8');

// 1.1 Rollen-Enum
assert(sqlContent.includes("CREATE TYPE public.pitchpro_role AS ENUM"), 'Rollen-Enum pitchpro_role definiert');
['admin', 'trainer', 'cotrainer', 'verwaltung', 'tester'].forEach(role => {
  assert(sqlContent.includes(`'${role}'`), `Rolle '${role}' im Enum vorhanden`);
});

// 1.2 Tabellen
['schools', 'trainer_profiles', 'role_permissions', 'pitchpro_players', 'pitchpro_sessions', 'pitchpro_evaluations', 'pitchpro_app_states', 'pitchpro_audit_logs'].forEach(tbl => {
  assert(sqlContent.includes(`CREATE TABLE IF NOT EXISTS public.${tbl}`), `Tabelle public.${tbl} angelegt`);
});

// 1.3 RLS-Aktivierung auf allen Tabellen
['schools', 'trainer_profiles', 'role_permissions', 'pitchpro_players', 'pitchpro_sessions', 'pitchpro_evaluations', 'pitchpro_app_states', 'pitchpro_audit_logs'].forEach(tbl => {
  assert(sqlContent.includes(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY`), `RLS für ${tbl} aktiviert`);
});

// 1.4 Sicherheits-Guardrails (auth.uid() = user_id)
assert(sqlContent.includes('auth.uid() = user_id'), "Sicherheits-Guardrail: RLS Policy mit 'auth.uid() = user_id' vorhanden");
assert(sqlContent.includes('public.get_auth_trainer_school_id()'), "Mandantentrennung: 'get_auth_trainer_school_id()' Policy vorhanden");

// 1.5 RPC-Funktionen
assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.rpc_get_user_context()'), 'RPC-Funktion rpc_get_user_context vorhanden');
assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.rpc_switch_active_role'), 'RPC-Funktion rpc_switch_active_role vorhanden');
assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.rpc_verify_invite_code'), 'RPC-Funktion rpc_verify_invite_code vorhanden');
assert(sqlContent.includes('CREATE TRIGGER on_auth_user_created'), 'Auth Signup-Trigger on_auth_user_created aktiv');


// -----------------------------------------------------------------------------
// TESTSUITE 2: AUTH PIPELINE LOGIK
// -----------------------------------------------------------------------------
console.log('\n--- TESTSUITE 2: Supabase Auth Pipeline (Unit & State) ---');

assert(fs.existsSync(AUTH_JS_PATH), 'Auth Pipeline JavaScript-Datei existiert');
const authCode = fs.readFileSync(AUTH_JS_PATH, 'utf-8');

// Mock Browser Environment
const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const mockWindow = {
  localStorage: mockLocalStorage,
  addEventListener() {},
  dispatchEvent() {}
};

// Eval Auth Code in sandbox
const runInContext = new Function('window', 'localStorage', 'console', authCode);
runInContext(mockWindow, mockLocalStorage, console);

const PitchProAuth = mockWindow.PitchProAuth;
assert(typeof PitchProAuth === 'object', 'PitchProAuth Instanz erfolgreich initialisiert');

// 2.1 Schnell-Login für alle 5 Rollen
['admin', 'trainer', 'cotrainer', 'verwaltung', 'tester'].forEach(role => {
  const res = PitchProAuth.quickLoginAs(role, true);
  assert(res.success === true, `Schnell-Login als ${role} erfolgreich`);
  assert(PitchProAuth.userContext.role === role, `Benutzer-Rolle ist ${role}`);
  assert(mockLocalStorage.getItem('pitchpro_v10_user_context') !== null, 'Session im LocalStorage persistiert');
});

// 2.2 SignOut Test
PitchProAuth.signOut();
assert(PitchProAuth.currentSession === null, 'Session nach signOut null');
assert(mockLocalStorage.getItem('pitchpro_v10_auth_session') === null, 'Storage nach signOut bereinigt');


// -----------------------------------------------------------------------------
// TESTSUITE 3: RBAC GUARD & MEMOISIERTE RECHTEPRÜFUNG
// -----------------------------------------------------------------------------
console.log('\n--- TESTSUITE 3: RBAC Guard & Memoisierungs-Performance ---');

assert(fs.existsSync(RBAC_JS_PATH), 'RBAC Guard JavaScript-Datei existiert');
const rbacCode = fs.readFileSync(RBAC_JS_PATH, 'utf-8');

// Bind Auth to mockWindow
mockWindow.PitchProAuth = PitchProAuth;
const runRbac = new Function('window', 'localStorage', 'console', rbacCode);
runRbac(mockWindow, mockLocalStorage, console);

const PitchProRBAC = mockWindow.PitchProRBAC;
assert(typeof PitchProRBAC === 'object', 'PitchProRBAC Instanz erfolgreich initialisiert');

// 3.1 Admin Berechtigungen
PitchProRBAC.setRoles('admin', 'admin');
assert(PitchProRBAC.isAdmin() === true, 'Admin wird korrekt als Admin erkannt');
assert(PitchProRBAC.hasPermission('players', 'delete') === true, 'Admin darf Spieler löschen');
assert(PitchProRBAC.hasPermission('system_settings', 'write') === true, 'Admin darf Systemeinstellungen bearbeiten');
assert(PitchProRBAC.hasPermission('finance', 'delete') === true, 'Admin darf Finanzen löschen');

// 3.2 Cotrainer Einschränkungen
PitchProRBAC.setRoles('cotrainer', 'cotrainer');
assert(PitchProRBAC.isAdmin() === false, 'Cotrainer ist kein Admin');
assert(PitchProRBAC.hasPermission('players', 'read') === true, 'Cotrainer darf Spieler lesen');
assert(PitchProRBAC.hasPermission('players', 'delete') === false, 'Cotrainer darf KEINE Spieler löschen');
assert(PitchProRBAC.hasPermission('sessions', 'write') === false, 'Cotrainer darf KEINE Einheiten bearbeiten');
assert(PitchProRBAC.hasPermission('evaluations', 'write') === true, 'Cotrainer darf Bewertungen erfassen');
assert(PitchProRBAC.hasPermission('system_settings', 'read') === false, 'Cotrainer hat keinen Zugriff auf Systemeinstellungen');

// 3.3 Tester Einschränkungen
PitchProRBAC.setRoles('tester', 'tester');
assert(PitchProRBAC.hasPermission('players', 'write') === true, 'Tester darf Spieler testen');
assert(PitchProRBAC.hasPermission('players', 'delete') === false, 'Tester darf keine Daten löschen');
assert(PitchProRBAC.hasPermission('system_settings', 'write') === false, 'Tester hat Systemeinstellungen gesperrt');

// 3.4 Verwaltung Berechtigungen
PitchProRBAC.setRoles('verwaltung', 'verwaltung');
assert(PitchProRBAC.hasPermission('finance', 'write') === true, 'Verwaltung darf Finanzen bearbeiten');
assert(PitchProRBAC.hasPermission('finance', 'delete') === true, 'Verwaltung darf Finanzposten löschen');
assert(PitchProRBAC.hasPermission('sessions', 'write') === false, 'Verwaltung bearbeitet keine Einheiten');

// 3.5 Performance-Test für memoisierte Selektoren (Agent chef_design Best Practice)
PitchProRBAC.setRoles('trainer', 'trainer');
// JIT Warmup
for (let i = 0; i < 1000; i++) {
  PitchProRBAC.hasPermission('players', 'write');
}
const t0 = process.hrtime.bigint();
for (let i = 0; i < 50000; i++) {
  PitchProRBAC.hasPermission('players', 'write');
}
const t1 = process.hrtime.bigint();
const elapsedMs = Number(t1 - t0) / 1000000;
console.log(`    Performance Benchmark: 50.000 memoisierte RBAC-Checks in ${elapsedMs.toFixed(2)} ms!`);
assert(elapsedMs < 350, 'Memoisierungs-Cache antwortet performant für 50.000 Abfragen (> 140.000 Checks/Sekunde)');


// -----------------------------------------------------------------------------
// TESTSUITE 4: PRODUCTION CLIENT HTML & SYNTAX
// -----------------------------------------------------------------------------
console.log('\n--- TESTSUITE 4: Production Client HTML & Syntax-Prüfung ---');

assert(fs.existsSync(HTML_OUTPUT_PATH), 'PitchPro_Beta_10.0_lite_Auth_RBAC.html existiert');
const htmlContent = fs.readFileSync(HTML_OUTPUT_PATH, 'utf-8');

assert(htmlContent.includes('class="pitchpro-dark-slate"'), 'Dark-Slate Body-Klasse vorhanden');
assert(htmlContent.includes('id="pitchpro-role-switcher-container"'), 'RBAC-Simulator Container in HTML integriert');
assert(htmlContent.includes('pp-active-role-display'), 'Live-Rollenplakette im Topbar vorhanden');
assert(htmlContent.includes('data-rbac-module="players" data-rbac-action="delete"'), 'Löschen-Buttons mit RBAC-Gate versehen');
assert(htmlContent.includes('PITCHPRO AUTH PIPELINE'), 'Supabase Auth Pipeline im Bundle enthalten');
assert(htmlContent.includes('PITCHPRO RBAC RECHTEMATRIX'), 'RBAC Rechtematrix im Bundle enthalten');

// Syntax-Check für eingebettete JavaScript-Blöcke via node --check
const scriptMatches = htmlContent.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
console.log(`  Prüfe Syntax von ${scriptMatches.length} JavaScript-Blöcken in der HTML-Datei...`);

scriptMatches.forEach((scriptTag, idx) => {
  const code = scriptTag.replace(/<script\b[^>]*>/i, '').replace(/<\/script>/i, '').trim();
  if (code.length === 0) return;

  const tmpFile = path.join(ROOT_DIR, `tests_tmp_script_${idx}.cjs`);
  fs.writeFileSync(tmpFile, code, 'utf-8');
  try {
    execSync(`node --check "${tmpFile}"`);
    assert(true, `JavaScript-Block ${idx + 1} syntaktisch einwandfrei`);
  } catch (err) {
    assert(false, `Syntax-Fehler in Skriptblock ${idx + 1}: ${err.message}`);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

console.log('\n=============================================================');
console.log(` ERGEBNIS: ${passedTests} von ${totalTests} E2E-Tests ERFOLGREICH BESTANDEN! ✅`);
console.log('=============================================================\n');
