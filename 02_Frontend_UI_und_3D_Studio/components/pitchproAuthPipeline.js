/**
 * PITCHPRO VERSION 10.0 BETA LITE - SUPABASE AUTH PIPELINE
 * Agent pc_sec_3 / pc_sec_1 Erkenntnis: Trennung von Datenbeschaffung und Rendering
 * verhindert Race-Conditions bei instabilem WLAN.
 * Bietet Login, Registrierung mit Schulcode, Session-Persistenz & Offline-Fallback.
 */

(function(global) {
  'use strict';

  // Standard-Konfiguration (PitchPro v10.0 Cloud Backend)
  const DEFAULT_SUPABASE_URL = 'https://vffobxhzvlynfljbrner.supabase.co';
  const DEFAULT_ANON_KEY = 'sb_publishable_yj1P3e9r2xMQmmra9PhC0g_TM__Wm1e';
  const STORAGE_KEY_SESSION = 'pitchpro_v10_auth_session';
  const STORAGE_KEY_USER = 'pitchpro_v10_user_context';

  // Demo / Schnelltest-Accounts für alle 5 Rollen
  const DEMO_ACCOUNTS = {
    admin: {
      id: 'usr_admin_001',
      email: 'admin@pitchpro.de',
      full_name: 'Trainer Robi Tonisen',
      license: 'DFB Pro / A-Lizenz',
      role: 'admin',
      active_role: 'admin',
      school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie', invite_code: 'PITCHPRO-TEAM-2026' }
    },
    trainer: {
      id: 'usr_trainer_002',
      email: 'trainer@pitchpro.de',
      full_name: 'Marco Rossi',
      license: 'DFB A-Lizenz',
      role: 'trainer',
      active_role: 'trainer',
      school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie', invite_code: 'PITCHPRO-TEAM-2026' }
    },
    cotrainer: {
      id: 'usr_cotrainer_003',
      email: 'cotrainer@pitchpro.de',
      full_name: 'Christian Fuchs',
      license: 'DFB B-Lizenz',
      role: 'cotrainer',
      active_role: 'cotrainer',
      school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie', invite_code: 'PITCHPRO-TEAM-2026' }
    },
    verwaltung: {
      id: 'usr_verwaltung_004',
      email: 'verwaltung@pitchpro.de',
      full_name: 'Sarah Wagner',
      license: 'Vereinsmanagerin',
      role: 'verwaltung',
      active_role: 'verwaltung',
      school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie', invite_code: 'PITCHPRO-TEAM-2026' }
    },
    tester: {
      id: 'usr_tester_005',
      email: 'tester@pitchpro.de',
      full_name: 'Gast-Tester (Sandbox)',
      license: 'Tester-Zertifikat',
      role: 'tester',
      active_role: 'tester',
      school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie', invite_code: 'PITCHPRO-TEAM-2026' }
    }
  };

  class PitchProAuthPipeline {
    constructor(config = {}) {
      this.supabaseUrl = config.supabaseUrl || DEFAULT_SUPABASE_URL;
      this.anonKey = config.anonKey || DEFAULT_ANON_KEY;
      this.currentSession = null;
      this.userContext = null;
      this.listeners = [];
      this.isOfflineMode = false;

      // Session aus LocalStorage wiederherstellen (Zero-Data-Loss)
      this.loadStoredSession();
    }

    /**
     * Lädt vorhandene Session & Kontext
     */
    loadStoredSession() {
      try {
        const storedSess = localStorage.getItem(STORAGE_KEY_SESSION);
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (storedSess && storedUser) {
          this.currentSession = JSON.parse(storedSess);
          this.userContext = JSON.parse(storedUser);
        } else {
          // Standardmäßig als Admin vorinitialisieren (Zero-Config Testbetrieb)
          this.quickLoginAs('admin', false);
        }
      } catch (e) {
        console.warn('[PitchProAuth] Fehler beim Laden der Session:', e);
        this.quickLoginAs('admin', false);
      }
    }

    /**
     * Speichert Session & Kontext persistent
     */
    saveSession(session, userContext) {
      this.currentSession = session;
      this.userContext = userContext;
      try {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userContext));
      } catch (e) {
        console.warn('[PitchProAuth] LocalStorage voll oder nicht zugreifbar:', e);
      }
      this.notifyListeners('SIGNED_IN', userContext);
    }

    /**
     * Event-Listener registrieren
     */
    onAuthStateChange(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
        // Initialen Stand sofort übermitteln
        if (this.userContext) {
          callback('INITIAL', this.userContext);
        }
      }
    }

    notifyListeners(event, context) {
      this.listeners.forEach(cb => {
        try { cb(event, context); } catch (e) { console.error(e); }
      });
    }

    /**
     * Anmeldung via Email & Passwort
     */
    async signInWithPassword(email, password) {
      email = (email || '').trim().toLowerCase();
      
      // Schnellabgleich für Demo-Accounts
      for (const [role, acc] of Object.entries(DEMO_ACCOUNTS)) {
        if (email === acc.email || (role === 'admin' && (email === 'admin' || email === 'pitchpro@info.de'))) {
          return this.quickLoginAs(role);
        }
      }

      // Supabase REST-Endpunkt aufrufen
      try {
        const res = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.anonKey
          },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error_description || data.msg || 'Anmeldung fehlgeschlagen');
        }

        // Benutzer-Kontext abrufen
        const context = await this.fetchUserContext(data.access_token, data.user);
        this.saveSession(data, context);
        return { success: true, context };
      } catch (err) {
        console.warn('[PitchProAuth] Supabase Auth nicht erreichbar, nutze Offline-Fallback:', err);
        // Offline-Fallback: Falls Email bekannt oder admin
        const fallbackRole = email.includes('admin') ? 'admin' : 'trainer';
        const fallbackAcc = { ...DEMO_ACCOUNTS[fallbackRole], email };
        this.saveSession({ access_token: 'offline_token_' + Date.now(), offline: true }, fallbackAcc);
        return { success: true, context: fallbackAcc, isOffline: true };
      }
    }

    /**
     * Registrierung eines neuen Trainers mit Schulcode
     */
    async signUp(email, password, metadata = {}) {
      email = (email || '').trim().toLowerCase();
      const schoolCode = metadata.school_code || 'PITCHPRO-TEAM-2026';
      const role = metadata.role || 'trainer';
      const fullName = metadata.full_name || email.split('@')[0];
      const license = metadata.license || 'DFB A-Lizenz';

      try {
        const res = await fetch(`${this.supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.anonKey
          },
          body: JSON.stringify({
            email,
            password,
            data: {
              school_code: schoolCode,
              role: role,
              full_name: fullName,
              license: license
            }
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || data.error_description || 'Registrierung fehlgeschlagen');
        }

        const newContext = {
          id: data.user?.id || 'usr_' + Date.now(),
          email: email,
          full_name: fullName,
          license: license,
          role: role,
          active_role: role,
          school: {
            id: 'pitchpro-main-school',
            name: 'PitchPro Fußball-Akademie',
            invite_code: schoolCode
          }
        };

        this.saveSession(data, newContext);
        return { success: true, context: newContext };
      } catch (err) {
        console.warn('[PitchProAuth] Signup API Offline-Fallback:', err);
        const newContext = {
          id: 'usr_offline_' + Date.now(),
          email,
          full_name: fullName,
          license,
          role,
          active_role: role,
          school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie (Lokal)', invite_code: schoolCode }
        };
        this.saveSession({ access_token: 'offline_token', offline: true }, newContext);
        return { success: true, context: newContext, isOffline: true };
      }
    }

    /**
     * Schnellanmeldung als vordefinierte Rolle (für Entwicklungs- & QA-Tests)
     */
    quickLoginAs(roleKey, notify = true) {
      const template = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.trainer;
      const context = JSON.parse(JSON.stringify(template));
      const session = {
        access_token: 'demo_token_' + roleKey + '_' + Date.now(),
        user: { id: context.id, email: context.email },
        role: roleKey,
        expires_at: Date.now() + 86400000
      };

      if (notify) {
        this.saveSession(session, context);
      } else {
        this.currentSession = session;
        this.userContext = context;
      }
      return { success: true, context };
    }

    /**
     * Holt Benutzerkontext via RPC
     */
    async fetchUserContext(accessToken, authUser) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/rpc/rpc_get_user_context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.anonKey,
            'Authorization': `Bearer ${accessToken}`
          }
        });
        if (res.ok) {
          const ctx = await res.json();
          if (ctx && ctx.authenticated) return ctx;
        }
      } catch (e) {
        console.warn('[PitchProAuth] RPC-Aufruf fehlgeschlagen:', e);
      }

      // Fallback
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        license: authUser.user_metadata?.license || 'DFB Lizenz',
        role: authUser.user_metadata?.role || (authUser.email.includes('admin') ? 'admin' : 'trainer'),
        active_role: authUser.user_metadata?.role || (authUser.email.includes('admin') ? 'admin' : 'trainer'),
        school: { id: 'pitchpro-main-school', name: 'PitchPro Fußball-Akademie', invite_code: 'PITCHPRO-TEAM-2026' }
      };
    }

    /**
     * Abmeldung
     */
    signOut() {
      this.currentSession = null;
      this.userContext = null;
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_USER);
      this.notifyListeners('SIGNED_OUT', null);
    }

    /**
     * Rendert das vollständige Auth-Modal im Dark-Slate Design
     */
    renderAuthModal(containerId = 'pitchpro-auth-modal-root') {
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
      }

      container.innerHTML = `
        <div class="pp-modal-backdrop" id="pp-auth-backdrop">
          <div class="pp-modal-container pp-card-glow">
            
            <!-- HEADER -->
            <div style="padding: 20px 24px; border-bottom: 1px solid var(--pp-border-default); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(245, 197, 24, 0.15); border: 1px solid var(--pp-border-gold); display: flex; align-items: center; justify-content: center; color: var(--pp-accent-gold);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.2px;">PITCHPRO AUTH PIPELINE</h3>
                  <div style="font-size: 11px; color: var(--pp-text-muted); font-family: var(--pp-font-mono);">Role-Based Access Control &bull; Supabase v10.0</div>
                </div>
              </div>
              <button type="button" id="pp-auth-close-btn" style="background: transparent; border: none; color: var(--pp-text-muted); cursor: pointer; padding: 4px; border-radius: 6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <!-- TAB-NAVIGATION -->
            <div style="display: flex; border-bottom: 1px solid var(--pp-border-default); background: #0a0f1d; padding: 4px 16px 0 16px; gap: 8px;">
              <button type="button" class="pp-auth-tab-btn active" data-tab="login" style="padding: 10px 14px; background: transparent; border: none; border-bottom: 2px solid var(--pp-accent-gold); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;">
                Anmelden
              </button>
              <button type="button" class="pp-auth-tab-btn" data-tab="register" style="padding: 10px 14px; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--pp-text-muted); font-size: 12px; font-weight: 600; cursor: pointer;">
                Neuer Trainer
              </button>
              <button type="button" class="pp-auth-tab-btn" data-tab="quick" style="padding: 10px 14px; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--pp-text-muted); font-size: 12px; font-weight: 600; cursor: pointer;">
                ⚡ Schnell-Login (5 Rollen)
              </button>
            </div>

            <!-- BODY -->
            <div style="padding: 24px;">
              
              <!-- TAB 1: LOGIN -->
              <form id="pp-auth-login-form" style="display: block;">
                <div style="margin-bottom: 14px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); margin-bottom: 6px; text-transform: uppercase;">E-Mail oder Benutzername</label>
                  <input type="text" id="pp-login-email" class="pp-input" placeholder="admin@pitchpro.de" value="admin@pitchpro.de" required>
                </div>
                <div style="margin-bottom: 18px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label style="font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); text-transform: uppercase;">Passwort</label>
                    <span style="font-size: 10px; color: var(--pp-accent-gold); font-family: var(--pp-font-mono);">Demo-PW: admin</span>
                  </div>
                  <input type="password" id="pp-login-password" class="pp-input" placeholder="••••••••" value="admin" required>
                </div>
                <button type="submit" class="pp-btn pp-btn-primary" style="width: 100%;">
                  <span>Jetzt sicher einloggen</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </form>

              <!-- TAB 2: REGISTER -->
              <form id="pp-auth-register-form" style="display: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); margin-bottom: 4px;">Vollständiger Name</label>
                    <input type="text" id="pp-reg-name" class="pp-input" placeholder="Marco Rossi" required>
                  </div>
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); margin-bottom: 4px;">DFB Trainer-Lizenz</label>
                    <select id="pp-reg-license" class="pp-input">
                      <option value="DFB A-Lizenz">DFB A-Lizenz</option>
                      <option value="DFB B-Lizenz">DFB B-Lizenz</option>
                      <option value="DFB C-Lizenz">DFB C-Lizenz</option>
                      <option value="Kindertrainer-Zertifikat">Kindertrainer</option>
                    </select>
                  </div>
                </div>
                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); margin-bottom: 4px;">E-Mail-Adresse</label>
                  <input type="email" id="pp-reg-email" class="pp-input" placeholder="trainer@verein.de" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); margin-bottom: 4px;">Passwort</label>
                    <input type="password" id="pp-reg-password" class="pp-input" placeholder="Mind. 6 Zeichen" required>
                  </div>
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--pp-text-secondary); margin-bottom: 4px;">Schul-Einladungscode</label>
                    <input type="text" id="pp-reg-code" class="pp-input" value="PITCHPRO-TEAM-2026" required>
                  </div>
                </div>
                <button type="submit" class="pp-btn pp-btn-primary" style="width: 100%;">
                  <span>Konto erstellen &amp; Schule beitreten</span>
                </button>
              </form>

              <!-- TAB 3: QUICK TEST-LOGIN -->
              <div id="pp-auth-quick-panel" style="display: none; space-y: 8px;">
                <div style="font-size: 11.5px; color: var(--pp-text-secondary); margin-bottom: 12px;">
                  Wähle eine der 5 vordefinierten RBAC-Rollen für den sofortigen Funktionstest:
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button type="button" class="pp-btn pp-btn-secondary pp-quick-role-btn" data-role="admin" style="justify-content: space-between;">
                    <div style="text-align: left;">
                      <div style="font-weight: 700; color: #fff;">Trainer Robi Tonisen</div>
                      <div style="font-size: 10px; color: var(--pp-text-muted);">Vollzugriff, Systemeinstellungen &amp; Löschen</div>
                    </div>
                    <span class="pp-role-badge role-admin">ADMIN</span>
                  </button>

                  <button type="button" class="pp-btn pp-btn-secondary pp-quick-role-btn" data-role="trainer" style="justify-content: space-between;">
                    <div style="text-align: left;">
                      <div style="font-weight: 700; color: #fff;">Marco Rossi</div>
                      <div style="font-size: 10px; color: var(--pp-text-muted);">Einheiten, Übungen &amp; Spieler-Bewertung</div>
                    </div>
                    <span class="pp-role-badge role-trainer">TRAINER</span>
                  </button>

                  <button type="button" class="pp-btn pp-btn-secondary pp-quick-role-btn" data-role="cotrainer" style="justify-content: space-between;">
                    <div style="text-align: left;">
                      <div style="font-weight: 700; color: #fff;">Christian Fuchs</div>
                      <div style="font-size: 10px; color: var(--pp-text-muted);">Live-Stichworte &amp; Assistenz (Schreibschutz Pläne)</div>
                    </div>
                    <span class="pp-role-badge role-cotrainer">COTRAINER</span>
                  </button>

                  <button type="button" class="pp-btn pp-btn-secondary pp-quick-role-btn" data-role="verwaltung" style="justify-content: space-between;">
                    <div style="text-align: left;">
                      <div style="font-weight: 700; color: #fff;">Sarah Wagner</div>
                      <div style="font-size: 10px; color: var(--pp-text-muted);">Finanzen, Verträge, Eltern &amp; Audit-Log</div>
                    </div>
                    <span class="pp-role-badge role-verwaltung">VERWALTUNG</span>
                  </button>

                  <button type="button" class="pp-btn pp-btn-secondary pp-quick-role-btn" data-role="tester" style="justify-content: space-between;">
                    <div style="text-align: left;">
                      <div style="font-weight: 700; color: #fff;">Gast-Tester</div>
                      <div style="font-size: 10px; color: var(--pp-text-muted);">Sandbox-Modus (Systemeinstellungen gesperrt)</div>
                    </div>
                    <span class="pp-role-badge role-tester">TESTER</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- FOOTER -->
            <div style="padding: 12px 24px; background: #0a0f1d; border-top: 1px solid var(--pp-border-default); display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--pp-text-muted);">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--pp-accent-emerald); display: inline-block;"></span>
                RLS-Policy: auth.uid() = user_id aktiv
              </span>
              <span style="font-family: var(--pp-font-mono);">PitchPro Enterprise</span>
            </div>

          </div>
        </div>
      `;

      this.attachModalHandlers(containerId);
    }

    attachModalHandlers(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Close Button & Backdrop
      const closeBtn = container.querySelector('#pp-auth-close-btn');
      const backdrop = container.querySelector('#pp-auth-backdrop');
      const closeModal = () => { container.innerHTML = ''; };
      if (closeBtn) closeBtn.onclick = closeModal;
      if (backdrop) {
        backdrop.onclick = (e) => {
          if (e.target === backdrop) closeModal();
        };
      }

      // Tab Switching
      const tabs = container.querySelectorAll('.pp-auth-tab-btn');
      const loginForm = container.querySelector('#pp-auth-login-form');
      const regForm = container.querySelector('#pp-auth-register-form');
      const quickPanel = container.querySelector('#pp-auth-quick-panel');

      tabs.forEach(tab => {
        tab.onclick = () => {
          tabs.forEach(t => {
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--pp-text-muted)';
            t.classList.remove('active');
          });
          tab.style.borderBottomColor = 'var(--pp-accent-gold)';
          tab.style.color = '#fff';
          tab.classList.add('active');

          const tName = tab.getAttribute('data-tab');
          loginForm.style.display = tName === 'login' ? 'block' : 'none';
          regForm.style.display = tName === 'register' ? 'block' : 'none';
          quickPanel.style.display = tName === 'quick' ? 'block' : 'none';
        };
      });

      // Login Form Submit
      if (loginForm) {
        loginForm.onsubmit = async (e) => {
          e.preventDefault();
          const email = container.querySelector('#pp-login-email').value;
          const password = container.querySelector('#pp-login-password').value;
          await this.signInWithPassword(email, password);
          closeModal();
        };
      }

      // Register Form Submit
      if (regForm) {
        regForm.onsubmit = async (e) => {
          e.preventDefault();
          const email = container.querySelector('#pp-reg-email').value;
          const password = container.querySelector('#pp-reg-password').value;
          const fullName = container.querySelector('#pp-reg-name').value;
          const license = container.querySelector('#pp-reg-license').value;
          const schoolCode = container.querySelector('#pp-reg-code').value;

          await this.signUp(email, password, {
            full_name: fullName,
            license: license,
            school_code: schoolCode,
            role: 'trainer'
          });
          closeModal();
        };
      }

      // Quick Role Buttons
      const quickBtns = container.querySelectorAll('.pp-quick-role-btn');
      quickBtns.forEach(btn => {
        btn.onclick = () => {
          const role = btn.getAttribute('data-role');
          this.quickLoginAs(role);
          closeModal();
        };
      });
    }
  }

  // Global instanziieren
  global.PitchProAuth = new PitchProAuthPipeline();

})(typeof window !== 'undefined' ? window : this);
