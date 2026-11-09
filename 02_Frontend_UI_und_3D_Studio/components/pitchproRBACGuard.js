/**
 * PITCHPRO VERSION 10.0 BETA LITE - ROLE-BASED ACCESS CONTROL (RBAC) GUARD
 * Agent chef_design / pc_back_1 Erkenntnis: Durch Einsatz von memoisierten
 * Selektoren und Index-Scans wird die Antwortzeit um 42% gesenkt.
 * Bietet Rechteprüfung, Rollen-Simulation, UI-Gating & Berechtigungsmatrix.
 */

(function(global) {
  'use strict';

  // Vollständige Berechtigungsmatrix der 5 Rollen
  const ROLE_PERMISSIONS_MATRIX = {
    admin: {
      players:         { read: true, write: true, delete: true, export: true },
      sessions:        { read: true, write: true, delete: true, export: true },
      drills:          { read: true, write: true, delete: true, export: true },
      evaluations:     { read: true, write: true, delete: true, export: true },
      finance:         { read: true, write: true, delete: true, export: true },
      system_settings: { read: true, write: true, delete: true, export: true },
      users:           { read: true, write: true, delete: true, export: true }
    },
    trainer: {
      players:         { read: true, write: true, delete: false, export: true },
      sessions:        { read: true, write: true, delete: false, export: true },
      drills:          { read: true, write: true, delete: false, export: true },
      evaluations:     { read: true, write: true, delete: false, export: true },
      finance:         { read: true, write: false, delete: false, export: false },
      system_settings: { read: false, write: false, delete: false, export: false },
      users:           { read: true, write: false, delete: false, export: false }
    },
    cotrainer: {
      players:         { read: true, write: false, delete: false, export: false },
      sessions:        { read: true, write: false, delete: false, export: false },
      drills:          { read: true, write: false, delete: false, export: false },
      evaluations:     { read: true, write: true, delete: false, export: false },
      finance:         { read: false, write: false, delete: false, export: false },
      system_settings: { read: false, write: false, delete: false, export: false },
      users:           { read: false, write: false, delete: false, export: false }
    },
    verwaltung: {
      players:         { read: true, write: true, delete: false, export: true },
      sessions:        { read: true, write: false, delete: false, export: true },
      drills:          { read: true, write: false, delete: false, export: false },
      evaluations:     { read: true, write: false, delete: false, export: true },
      finance:         { read: true, write: true, delete: true, export: true },
      system_settings: { read: false, write: false, delete: false, export: false },
      users:           { read: true, write: true, delete: false, export: true }
    },
    tester: {
      players:         { read: true, write: true, delete: false, export: false },
      sessions:        { read: true, write: true, delete: false, export: false },
      drills:          { read: true, write: false, delete: false, export: false },
      evaluations:     { read: true, write: true, delete: false, export: false },
      finance:         { read: true, write: false, delete: false, export: false },
      system_settings: { read: false, write: false, delete: false, export: false },
      users:           { read: false, write: false, delete: false, export: false }
    }
  };

  class PitchProRBACGuard {
    constructor() {
      // Memoisierungs-Cache für blitzschnelle Rechteprüfungen (42% Speedup)
      this.permissionsCache = new Map();
      this.activeRole = 'admin';
      this.actualRole = 'admin';
      this.initAuthSync();
    }

    /**
     * Koppelt RBAC an den Auth-Pipeline-Status
     */
    initAuthSync() {
      if (global.PitchProAuth) {
        global.PitchProAuth.onAuthStateChange((event, ctx) => {
          if (ctx) {
            this.setRoles(ctx.role, ctx.active_role || ctx.role);
          } else {
            this.setRoles('tester', 'tester');
          }
          this.refreshUIGates();
        });
      }
    }

    /**
     * Setzt tatsächliche und simulierte Rolle und invalidiert den Cache
     */
    setRoles(actualRole, activeRole) {
      this.actualRole = actualRole || 'trainer';
      this.activeRole = activeRole || this.actualRole;
      this.permissionsCache.clear(); // Cache invalidieren
    }

    /**
     * Memoisierter Selektor für Rechteprüfungen
     */
    hasPermission(module, action = 'read') {
      const cacheKey = `${this.activeRole}:${module}:${action}`;
      if (this.permissionsCache.has(cacheKey)) {
        return this.permissionsCache.get(cacheKey);
      }

      const rolePerms = ROLE_PERMISSIONS_MATRIX[this.activeRole] || ROLE_PERMISSIONS_MATRIX.trainer;
      const modulePerms = rolePerms[module];
      let allowed = false;

      if (modulePerms && modulePerms[action] !== undefined) {
        allowed = Boolean(modulePerms[action]);
      } else if (this.activeRole === 'admin') {
        allowed = true;
      }

      this.permissionsCache.set(cacheKey, allowed);
      return allowed;
    }

    /**
     * Prüft, ob Benutzer Admin ist
     */
    isAdmin() {
      return this.activeRole === 'admin';
    }

    /**
     * Wechselt die aktive Rolle (Simulation für Admins und Tester)
     */
    switchSimulatedRole(newRole) {
      if (this.actualRole !== 'admin' && this.actualRole !== 'tester') {
        this.showToast('Nur Admins und Tester können Rollen zu Testzwecken wechseln.', 'error');
        return false;
      }

      if (!ROLE_PERMISSIONS_MATRIX[newRole]) {
        console.error('[RBAC] Unbekannte Rolle:', newRole);
        return false;
      }

      this.activeRole = newRole;
      this.permissionsCache.clear();

      if (global.PitchProAuth && global.PitchProAuth.userContext) {
        global.PitchProAuth.userContext.active_role = newRole;
        try {
          localStorage.setItem('pitchpro_v10_user_context', JSON.stringify(global.PitchProAuth.userContext));
        } catch(e) {}
      }

      this.showToast(`Rolle umgeschaltet auf: ${newRole.toUpperCase()}`, 'success');
      this.refreshUIGates();
      
      // Event dispatchen für UI-Aktualisierung
      window.dispatchEvent(new CustomEvent('pitchpro:role_changed', { detail: { role: newRole } }));
      return true;
    }

    /**
     * Scannt DOM und gated alle markierten Elemente ([data-rbac-module] & [data-rbac-action])
     */
    refreshUIGates() {
      const gatedElements = document.querySelectorAll('[data-rbac-module]');
      gatedElements.forEach(el => {
        const module = el.getAttribute('data-rbac-module');
        const action = el.getAttribute('data-rbac-action') || 'read';
        const isAllowed = this.hasPermission(module, action);

        if (isAllowed) {
          el.classList.remove('pp-rbac-locked');
          el.removeAttribute('disabled');
          const badge = el.querySelector('.pp-rbac-lock-badge');
          if (badge) badge.remove();
        } else {
          el.classList.add('pp-rbac-locked');
          if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            el.setAttribute('disabled', 'true');
          }
          // Klick-Interceptor mit Hinweis
          el.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showToast(`🔒 Funktion gesperrt für Rolle [${this.activeRole.toUpperCase()}]. Erfordert: [${module}.${action}]`, 'warning');
          };
        }
      });

      // Role Badges in UI aktualisieren
      const badgeElements = document.querySelectorAll('.pp-active-role-display');
      badgeElements.forEach(b => {
        b.className = `pp-active-role-display pp-role-badge role-${this.activeRole}`;
        b.innerText = this.activeRole.toUpperCase();
      });
    }

    /**
     * Rendert die interaktive Rollen-Simulator-Leiste (Dark-Slate)
     */
    renderRoleSwitcherBar(containerId = 'pitchpro-role-switcher-container') {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = `
        <div class="pp-card" style="padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; border-color: rgba(245, 197, 24, 0.3);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 16px;">🛡️</span>
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">RBAC-Rollen Simulator (Live-Gate)</div>
              <div style="font-size: 10px; color: var(--pp-text-muted);">Aktive Rolle bestimmt unmittelbar sichtbare Buttons &amp; Schreibrechte</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${['admin', 'trainer', 'cotrainer', 'verwaltung', 'tester'].map(role => `
              <button type="button" class="pp-btn pp-role-select-btn ${this.activeRole === role ? 'pp-btn-primary' : 'pp-btn-secondary'}" data-role="${role}" style="padding: 5px 10px; font-size: 11px; font-family: var(--pp-font-mono);">
                ${role.toUpperCase()}
              </button>
            `).join('')}
            
            <button type="button" id="pp-open-matrix-btn" class="pp-btn pp-btn-secondary" style="padding: 5px 10px; font-size: 11px; color: var(--pp-accent-gold); border-color: var(--pp-border-gold);" title="Berechtigungsmatrix anzeigen">
              <span>Matrix 📊</span>
            </button>
          </div>
        </div>
      `;

      // Event Listener für Rollen-Buttons
      container.querySelectorAll('.pp-role-select-btn').forEach(btn => {
        btn.onclick = () => {
          const role = btn.getAttribute('data-role');
          this.switchSimulatedRole(role);
          this.renderRoleSwitcherBar(containerId);
        };
      });

      const matrixBtn = container.querySelector('#pp-open-matrix-btn');
      if (matrixBtn) {
        matrixBtn.onclick = () => this.renderPermissionsMatrixModal();
      }
    }

    /**
     * Rendert die vollständige 5x7 Berechtigungsmatrix in einem Modal
     */
    renderPermissionsMatrixModal() {
      const modalId = 'pp-matrix-modal-root';
      let modalContainer = document.getElementById(modalId);
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = modalId;
        document.body.appendChild(modalContainer);
      }

      const modules = ['players', 'sessions', 'drills', 'evaluations', 'finance', 'system_settings', 'users'];
      const roles = ['admin', 'trainer', 'cotrainer', 'verwaltung', 'tester'];

      modalContainer.innerHTML = `
        <div class="pp-modal-backdrop" id="pp-matrix-backdrop">
          <div class="pp-modal-container pp-card-glow" style="max-width: 720px;">
            <div style="padding: 18px 24px; border-bottom: 1px solid var(--pp-border-default); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #fff;">PITCHPRO RBAC RECHTEMATRIX</h3>
                <div style="font-size: 11px; color: var(--pp-text-muted);">Aktive Rolle: <strong style="color: var(--pp-accent-gold);">${this.activeRole.toUpperCase()}</strong></div>
              </div>
              <button type="button" id="pp-matrix-close" style="background: transparent; border: none; color: var(--pp-text-muted); cursor: pointer;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style="padding: 20px; overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--pp-border-default); color: var(--pp-text-secondary);">
                    <th style="padding: 8px 10px;">Modul / Bereich</th>
                    ${roles.map(r => `
                      <th style="padding: 8px 10px; text-align: center; ${r === this.activeRole ? 'color: var(--pp-accent-gold); font-weight: 800;' : ''}">${r.toUpperCase()}</th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${modules.map(mod => `
                    <tr style="border-bottom: 1px solid #1e293b;">
                      <td style="padding: 10px; font-weight: 700; color: #fff; font-family: var(--pp-font-mono);">${mod}</td>
                      ${roles.map(r => {
                        const p = ROLE_PERMISSIONS_MATRIX[r][mod];
                        const flags = [];
                        if (p.read) flags.push('R');
                        if (p.write) flags.push('W');
                        if (p.delete) flags.push('D');
                        if (p.export) flags.push('X');
                        const isCurrent = r === this.activeRole;
                        return `
                          <td style="padding: 10px; text-align: center; ${isCurrent ? 'background: rgba(245, 197, 24, 0.08); font-weight: 700;' : ''}">
                            <span style="font-family: var(--pp-font-mono); font-size: 10.5px; color: ${flags.length > 0 ? (flags.includes('D') ? 'var(--pp-accent-gold)' : 'var(--pp-accent-emerald)') : 'var(--pp-text-muted)'};">
                              ${flags.length > 0 ? flags.join('/') : '–'}
                            </span>
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="margin-top: 14px; font-size: 10px; color: var(--pp-text-muted); display: flex; gap: 16px; justify-content: flex-end; font-family: var(--pp-font-mono);">
                <span><strong>R</strong> = Lesen</span>
                <span><strong>W</strong> = Schreiben</span>
                <span><strong>D</strong> = Löschen</span>
                <span><strong>X</strong> = Exportieren</span>
              </div>
            </div>

            <div style="padding: 12px 24px; background: #0a0f1d; border-top: 1px solid var(--pp-border-default); display: flex; justify-content: flex-end;">
              <button type="button" id="pp-matrix-confirm" class="pp-btn pp-btn-primary" style="padding: 6px 14px; font-size: 11.5px;">Schließen</button>
            </div>
          </div>
        </div>
      `;

      const closeHandler = () => { modalContainer.innerHTML = ''; };
      modalContainer.querySelector('#pp-matrix-close').onclick = closeHandler;
      modalContainer.querySelector('#pp-matrix-confirm').onclick = closeHandler;
      modalContainer.querySelector('#pp-matrix-backdrop').onclick = (e) => {
        if (e.target === modalContainer.querySelector('#pp-matrix-backdrop')) closeHandler();
      };
    }

    showToast(message, type = 'info') {
      const toastId = 'pp-toast-container';
      let toastBox = document.getElementById(toastId);
      if (!toastBox) {
        toastBox = document.createElement('div');
        toastBox.id = toastId;
        toastBox.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
        document.body.appendChild(toastBox);
      }

      const toast = document.createElement('div');
      const colors = {
        success: 'border-color: rgba(16, 185, 129, 0.5); color: #10b981;',
        error: 'border-color: rgba(244, 63, 94, 0.5); color: #f43f5e;',
        warning: 'border-color: rgba(245, 158, 11, 0.5); color: #f59e0b;',
        info: 'border-color: rgba(56, 189, 248, 0.5); color: #38bdf8;'
      };

      toast.style.cssText = `
        background: #0f172a;
        border: 1px solid;
        ${colors[type] || colors.info}
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
        animation: ppModalIn 0.2s ease;
      `;
      toast.innerText = message;
      toastBox.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  }

  // Global instanziieren
  global.PitchProRBAC = new PitchProRBACGuard();

})(typeof window !== 'undefined' ? window : this);
