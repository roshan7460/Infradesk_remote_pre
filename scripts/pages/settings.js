// scripts/pages/settings.js — InfraDesk Remote: Settings Module
// Part 1 of 3 — Page shell, General tab, Security tab

// ── State ─────────────────────────────────────────────────────────────────────
let settingsTab = 'general';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function initSettings() { renderSettingsPage(); }

// ── Helpers ───────────────────────────────────────────────────────────────────
const S = {
  card: 'background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);padding:var(--space-5);margin-bottom:var(--space-4)',
  label: 'display:block;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-1)',
  input: 'width:100%;padding:var(--space-2) var(--space-3);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)',
  row: 'margin-bottom:var(--space-4)',
  h3: 'font-size:var(--text-sm);font-weight:700;color:var(--color-text);margin-bottom:var(--space-4)',
  muted: 'font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)',
  divider: 'border:none;border-top:1px solid var(--color-border,#243041);margin:var(--space-4) 0',
  badge: (c,t) => `<span style="padding:2px 8px;border-radius:99px;background:${c}22;color:${c};font-size:11px;font-weight:600">${t}</span>`,
  btn: (label,onclick,style='') => `<button onclick="${onclick}" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:600;cursor:pointer;${style}">${label}</button>`,
  toggle: (id,checked,onchange) => `<label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer">
    <input type="checkbox" id="${id}" ${checked?'checked':''} onchange="${onchange}" style="opacity:0;width:0;height:0">
    <span style="position:absolute;inset:0;background:${checked?'#2563EB':'#243041'};border-radius:99px;transition:.3s" id="track-${id}"></span>
    <span style="position:absolute;left:${checked?'20px':'2px'};top:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.3s" id="thumb-${id}"></span>
  </label>`,
};

// ── Tabs Config ───────────────────────────────────────────────────────────────
const TABS = [
  { id:'general',      icon:'⚙️',  label:'General'      },
  { id:'security',     icon:'🔒',  label:'Security'     },
  { id:'branding',     icon:'🎨',  label:'Branding'     },
  { id:'api',          icon:'🔑',  label:'API Keys'     },
  { id:'integrations', icon:'🔗',  label:'Integrations' },
  { id:'billing',      icon:'💳',  label:'Billing'      },
  { id:'notifications',icon:'🔔',  label:'Notifications'},
  { id:'storage',      icon:'🗄️',  label:'Storage'      },
];

// ── Page Shell ────────────────────────────────────────────────────────────────
function renderSettingsPage() {
  const main = document.querySelector('#page-content') || document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:var(--text-xl);font-weight:700;color:var(--color-text)">Settings</h1>
        <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-top:2px">Configure InfraDesk Remote for your organization</p>
      </div>
    </div>
    <div style="display:flex;gap:var(--space-6);align-items:flex-start">
      <nav style="width:200px;flex-shrink:0;background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);padding:var(--space-2);position:sticky;top:80px">
        ${TABS.map(t => `
          <button onclick="switchSettingsTab('${t.id}')" id="stab-${t.id}"
            style="display:flex;align-items:center;gap:var(--space-3);width:100%;padding:var(--space-2) var(--space-3);border:none;border-radius:var(--radius-md);background:${settingsTab===t.id?'rgba(37,99,235,.15)':'none'};color:${settingsTab===t.id?'#2563EB':'var(--color-text-muted)'};font-size:var(--text-sm);font-weight:${settingsTab===t.id?'600':'400'};cursor:pointer;text-align:left;margin-bottom:2px">
            <span>${t.icon}</span>${t.label}
          </button>
        `).join('')}
      </nav>
      <div id="settings-content" style="flex:1;min-width:0"></div>
    </div>
    <div id="settings-toast-area"></div>
  `;
  switchSettingsTab(settingsTab);
}

function switchSettingsTab(tab) {
  settingsTab = tab;
  TABS.forEach(t => {
    const el = document.getElementById(`stab-${t.id}`);
    if (!el) return;
    el.style.background = t.id === tab ? 'rgba(37,99,235,.15)' : 'none';
    el.style.color      = t.id === tab ? '#2563EB' : 'var(--color-text-muted)';
    el.style.fontWeight = t.id === tab ? '600' : '400';
  });
  const c = document.getElementById('settings-content');
  if (!c) return;
  const map = {
    general: renderGeneralTab, security: renderSecurityTab,
    branding: renderBrandingTab, api: renderApiTab,
    integrations: renderIntegrationsTab, billing: renderBillingTab,
    notifications: renderNotificationsTab, storage: renderStorageTab,
  };
  c.innerHTML = (map[tab] || (() => `<p style="color:var(--color-text-muted)">Coming soon.</p>`))();
}

// ── General Tab ───────────────────────────────────────────────────────────────
function renderGeneralTab() {
  return `
    <div style="${S.card}">
      <p style="${S.h3}">Organization Details</p>
      ${[['Organization Name','InfraDesk Inc.'],['Admin Email','admin@infradesk.io'],['Support Email','support@infradesk.io'],['Phone','+1 (800) 555-0100']].map(([l,v])=>`
        <div style="${S.row}"><label style="${S.label}">${l}</label><input value="${v}" style="${S.input}"/></div>
      `).join('')}
      ${S.btn('Save Changes','saveSettings()','background:#2563EB;color:#fff;border:none')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Region & Timezone</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
        <div><label style="${S.label}">Timezone</label>
          <select style="${S.input}"><option>UTC+05:30 India</option><option>UTC+00:00 London</option><option>UTC-05:00 New York</option></select>
        </div>
        <div><label style="${S.label}">Date Format</label>
          <select style="${S.input}"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select>
        </div>
      </div>
      ${S.btn('Save','saveSettings()','background:#2563EB;color:#fff;border:none')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Session Settings</p>
      <div style="${S.row}"><label style="${S.label}">Session Timeout (minutes)</label><input type="number" value="30" style="${S.input}"/></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
        <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">Idle Auto-Disconnect</div><div style="${S.muted}">Disconnect remote sessions after inactivity</div></div>
        ${S.toggle('idle-disconnect',true,'settingsToggle(this,"track-idle-disconnect","thumb-idle-disconnect")')}
      </div>
      ${S.btn('Save','saveSettings()','background:#2563EB;color:#fff;border:none')}
    </div>`;
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function renderSecurityTab() {
  return `
    <div style="${S.card}">
      <p style="${S.h3}">Authentication</p>
      ${[['Enforce MFA for All Users',true,'Require two-factor authentication organization-wide'],['Single Sign-On (SSO)',false,'Enable SSO via SAML 2.0 / OIDC'],['Password Expiry (90 days)',true,'Force password reset every 90 days']].map(([label,checked,desc])=>`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);padding-bottom:var(--space-4);border-bottom:1px solid var(--color-border,#243041)">
          <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">${label}</div><div style="${S.muted}">${desc}</div></div>
          ${S.toggle('sec-'+label.replace(/\s+/g,'-').toLowerCase(),checked,'settingsToggle(this,\'track-sec-'+label.replace(/\s+/g,'-').toLowerCase()+'\',\'thumb-sec-'+label.replace(/\s+/g,'-').toLowerCase()+'\')') }
        </div>
      `).join('')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">IP Allowlist</p>
      <p style="${S.muted};margin-bottom:var(--space-3)">Only allow logins from these IP ranges.</p>
      <textarea rows="4" placeholder="192.168.1.0/24&#10;10.0.0.0/8" style="${S.input};resize:vertical"></textarea>
      ${S.btn('Save Allowlist','saveSettings()','background:#2563EB;color:#fff;border:none;margin-top:var(--space-3)')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Session Security</p>
      ${[['Concurrent Session Limit',false,'Prevent users from having multiple active sessions'],['Trusted Device Only',true,'Block logins from unrecognized devices'],['Audit All Sessions',true,'Log every remote session for compliance']].map(([label,checked,desc])=>`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">${label}</div><div style="${S.muted}">${desc}</div></div>
          ${S.toggle('ss-'+label.replace(/\s+/g,'-').toLowerCase(),checked,'settingsToggle(this,\'track-ss-'+label.replace(/\s+/g,'-').toLowerCase()+'\',\'thumb-ss-'+label.replace(/\s+/g,'-').toLowerCase()+'\')') }
        </div>
      `).join('')}
    </div>
    <div style="${S.card};border-color:#EF444444">
      <p style="${S.h3};color:#EF4444">Danger Zone</p>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">Revoke All Active Sessions</div><div style="${S.muted}">Force logout every user immediately</div></div>
        ${S.btn('Revoke All','confirmDangerAction("Revoke all sessions?")','background:#EF444422;color:#EF4444;border:1px solid #EF444444')}
      </div>
    </div>`;
}

// ── Partial exports (Part 1) ──────────────────────────────────────────────────
function saveSettings()      { showSettingsToast('✅ Settings saved'); }
function settingsToggle(el, trackId, thumbId) {
  const on = el.checked;
  const tr = document.getElementById(trackId), th = document.getElementById(thumbId);
  if (tr) tr.style.background = on ? '#2563EB' : '#243041';
  if (th) th.style.left = on ? '20px' : '2px';
}
function confirmDangerAction(msg) { if (confirm(msg)) showSettingsToast('⚠️ Action executed'); }
function showSettingsToast(msg) {
  let t = document.getElementById('infradesk-toast');
  if (!t) { t = document.createElement('div'); t.id = 'infradesk-toast'; t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10B981;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:opacity .4s'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._t); t._t = setTimeout(() => { t.style.opacity = '0'; }, 2800);
}

window.initSettings       = initSettings;
window.switchSettingsTab  = switchSettingsTab;
window.saveSettings       = saveSettings;
window.settingsToggle     = settingsToggle;
window.confirmDangerAction= confirmDangerAction;
// NOTE: Part 2 appended — Branding, API Keys, Integrations tabs
