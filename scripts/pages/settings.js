// scripts/pages/settings.js — InfraDesk Remote: Complete Settings Module
// All 8 tabs: General, Security, Branding, API Keys, Integrations, Billing, Notifications, Storage

// ── State ─────────────────────────────────────────────────────────────────────
let settingsTab = 'general';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function initSettings() { renderSettingsPage(); }

// ── Style Helpers ───────────────────────────────────────────────────────────────
const S = {
  card:   'background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);padding:var(--space-5);margin-bottom:var(--space-4)',
  label:  'display:block;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-1)',
  input:  'width:100%;padding:var(--space-2) var(--space-3);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)',
  row:    'margin-bottom:var(--space-4)',
  h3:     'font-size:var(--text-sm);font-weight:700;color:var(--color-text);margin-bottom:var(--space-4)',
  muted:  'font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)',
  badge:  (c, t) => `<span style="padding:2px 8px;border-radius:99px;background:${c}22;color:${c};font-size:11px;font-weight:600">${t}</span>`,
  btn:    (label, onclick, style = '') =>
    `<button onclick="${onclick}" style="padding:var(--space-2) var(--space-4);border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:600;cursor:pointer;${style}">${label}</button>`,
  toggle: (id, checked, onchange) =>
    `<label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${onchange}" style="opacity:0;width:0;height:0">
      <span style="position:absolute;inset:0;background:${checked ? '#2563EB' : '#243041'};border-radius:99px;transition:.3s" id="track-${id}"></span>
      <span style="position:absolute;left:${checked ? '20px' : '2px'};top:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.3s" id="thumb-${id}"></span>
    </label>`,
};

// ── Tabs Config ───────────────────────────────────────────────────────────────
const SETTINGS_TABS = [
  { id: 'general',       icon: '⚙️',  label: 'General'       },
  { id: 'security',      icon: '🔒',  label: 'Security'      },
  { id: 'branding',      icon: '🎨',  label: 'Branding'      },
  { id: 'api',           icon: '🔑',  label: 'API Keys'      },
  { id: 'integrations',  icon: '🔗',  label: 'Integrations'  },
  { id: 'billing',       icon: '💳',  label: 'Billing'       },
  { id: 'notifications', icon: '🔔',  label: 'Notifications' },
  { id: 'storage',       icon: '🗄️',  label: 'Storage'       },
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
        ${SETTINGS_TABS.map(t => `
          <button onclick="switchSettingsTab('${t.id}')" id="stab-${t.id}"
            style="display:flex;align-items:center;gap:var(--space-3);width:100%;padding:var(--space-2) var(--space-3);border:none;border-radius:var(--radius-md);background:${settingsTab === t.id ? 'rgba(37,99,235,.15)' : 'none'};color:${settingsTab === t.id ? '#2563EB' : 'var(--color-text-muted)'};font-size:var(--text-sm);font-weight:${settingsTab === t.id ? '600' : '400'};cursor:pointer;text-align:left;margin-bottom:2px">
            <span>${t.icon}</span>${t.label}
          </button>
        `).join('')}
      </nav>
      <div id="settings-content" style="flex:1;min-width:0"></div>
    </div>
  `;
  switchSettingsTab(settingsTab);
}

function switchSettingsTab(tab) {
  settingsTab = tab;
  SETTINGS_TABS.forEach(t => {
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
  c.innerHTML = (map[tab] || (() => '<p style="color:var(--color-text-muted)">Coming soon.</p>'))();
}

// ── 1. General Tab ─────────────────────────────────────────────────────────────
function renderGeneralTab() {
  return `
    <div style="${S.card}">
      <p style="${S.h3}">Organization Details</p>
      ${[['Organization Name','InfraDesk Inc.'],['Admin Email','admin@infradesk.io'],['Support Email','support@infradesk.io'],['Phone','+1 (800) 555-0100']].map(([l, v]) =>
        `<div style="${S.row}"><label style="${S.label}">${l}</label><input value="${v}" style="${S.input}"/></div>`
      ).join('')}
      ${S.btn('Save Changes', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
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
      ${S.btn('Save', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Session Settings</p>
      <div style="${S.row}"><label style="${S.label}">Session Timeout (minutes)</label><input type="number" value="30" style="${S.input}"/></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
        <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">Idle Auto-Disconnect</div><div style="${S.muted}">Disconnect remote sessions after inactivity</div></div>
        ${S.toggle('idle-dc', true, 'settingsToggle(this,"track-idle-dc","thumb-idle-dc")')}
      </div>
      ${S.btn('Save', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
    </div>`;
}

// ── 2. Security Tab ────────────────────────────────────────────────────────────
function renderSecurityTab() {
  const authRows = [['Enforce MFA for All Users',true,'Require 2FA organization-wide'],['Single Sign-On (SSO)',false,'Enable SSO via SAML 2.0 / OIDC'],['Password Expiry (90 days)',true,'Force reset every 90 days']];
  const sessRows = [['Concurrent Session Limit',false,'Block multiple active sessions per user'],['Trusted Device Only',true,'Block logins from unrecognized devices'],['Audit All Sessions',true,'Log every session for compliance']];
  return `
    <div style="${S.card}">
      <p style="${S.h3}">Authentication</p>
      ${authRows.map(([label, checked, desc], i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;${i < authRows.length-1 ? 'margin-bottom:var(--space-4);padding-bottom:var(--space-4);border-bottom:1px solid var(--color-border,#243041)' : ''}">
          <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">${label}</div><div style="${S.muted}">${desc}</div></div>
          ${S.toggle('auth-' + i, checked, `settingsToggle(this,'track-auth-${i}','thumb-auth-${i}')`)}  
        </div>
      `).join('')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">IP Allowlist</p>
      <p style="${S.muted};margin-bottom:var(--space-3)">Only allow logins from these IP ranges (CIDR notation).</p>
      <textarea rows="4" placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;203.0.113.0/24" style="${S.input};resize:vertical"></textarea>
      ${S.btn('Save Allowlist', 'saveSettings()', 'background:#2563EB;color:#fff;border:none;margin-top:var(--space-3)')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Session Security</p>
      ${sessRows.map(([label, checked, desc], i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
          <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">${label}</div><div style="${S.muted}">${desc}</div></div>
          ${S.toggle('sess-' + i, checked, `settingsToggle(this,'track-sess-${i}','thumb-sess-${i}')`)}  
        </div>
      `).join('')}
    </div>
    <div style="${S.card};border-color:rgba(239,68,68,.3)">
      <p style="font-size:var(--text-sm);font-weight:700;color:#EF4444;margin-bottom:var(--space-4)">Danger Zone</p>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">Revoke All Active Sessions</div><div style="${S.muted}">Force-logout every user immediately</div></div>
        ${S.btn('Revoke All', 'confirmDangerAction("Revoke all active sessions?")', 'background:rgba(239,68,68,.12);color:#EF4444;border:1px solid rgba(239,68,68,.3)')}
      </div>
    </div>`;
}

// ── 3. Branding Tab ───────────────────────────────────────────────────────────
function renderBrandingTab() {
  return `
    <div style="${S.card}">
      <p style="${S.h3}">Brand Identity</p>
      <div style="${S.row}"><label style="${S.label}">Company Name</label><input value="InfraDesk Inc." style="${S.input}"/></div>
      <div style="${S.row}"><label style="${S.label}">Tagline</label><input value="Secure. Fast. Reliable Remote Access." style="${S.input}"/></div>
      <div style="${S.row}">
        <label style="${S.label}">Logo Upload</label>
        <div style="display:flex;align-items:center;gap:var(--space-4)">
          <div style="width:64px;height:64px;background:rgba(37,99,235,.15);border:2px dashed var(--color-border,#243041);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
          ${S.btn('Upload Logo', 'showSettingsToast("Logo upload triggered")', 'background:rgba(37,99,235,.15);color:#2563EB;border:1px solid rgba(37,99,235,.3)')}
        </div>
      </div>
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Color Palette</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
        ${[['Primary Color','#2563EB'],['Accent Color','#10B981'],['Sidebar Background','#0B1220'],['Card Background','#1A2332']].map(([l, v]) =>
          `<div><label style="${S.label}">${l}</label><div style="display:flex;gap:var(--space-2)">
            <input type="color" value="${v}" style="width:40px;height:34px;border:none;border-radius:var(--radius-sm);background:none;cursor:pointer;padding:0">
            <input value="${v}" style="${S.input};flex:1"/>
          </div></div>`
        ).join('')}
      </div>
      ${S.btn('Apply Branding', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Custom Domain</p>
      <div style="${S.row}"><label style="${S.label}">White-Label Domain</label><input value="remote.yourcompany.com" style="${S.input}"/></div>
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-3)">
        ${S.btn('Verify Domain', 'showSettingsToast("DNS lookup triggered")', 'background:rgba(16,185,129,.12);color:#10B981;border:1px solid rgba(16,185,129,.3)')}
        ${S.btn('Save', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
      </div>
    </div>`;
}

// ── 4. API Keys Tab ───────────────────────────────────────────────────────────
const API_KEYS = [
  { name:'Production Key',  key:'sk_prod_4xH9...kL2m', created:'Jan 15, 2026', last:'2 min ago',   scopes:['read','write','devices'],   status:'active'  },
  { name:'CI/CD Pipeline',  key:'sk_ci_7pQ3...nW8r',   created:'Mar 03, 2026', last:'1 day ago',   scopes:['read','patches'],           status:'active'  },
  { name:'Legacy Monitor',  key:'sk_lgc_2aB5...vT6s',  created:'Nov 20, 2025', last:'30 days ago', scopes:['read'],                     status:'revoked' },
];
function renderApiTab() {
  return `
    <div style="${S.card}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
        <p style="${S.h3};margin-bottom:0">API Keys</p>
        ${S.btn('+ Generate New Key', 'generateApiKey()', 'background:#2563EB;color:#fff;border:none')}
      </div>
      <div style="background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-4);font-size:var(--text-xs);color:#06B6D4">
        🔒 API keys are shown once. Store them securely. Treat them like passwords.
      </div>
      ${API_KEYS.map(k => `
        <div style="background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-3)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-text)">${k.name}</span>
              ${S.badge(k.status === 'active' ? '#10B981' : '#EF4444', k.status)}
            </div>
            ${k.status === 'active' ? S.btn('Revoke', `revokeApiKey('${k.name}')`, 'background:rgba(239,68,68,.12);color:#EF4444;border:1px solid rgba(239,68,68,.3);font-size:11px;padding:3px 10px') : ''}
          </div>
          <div style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--color-text-muted);background:rgba(255,255,255,.04);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);margin-bottom:var(--space-2)">${k.key}</div>
          <div style="display:flex;gap:var(--space-4);font-size:11px;color:var(--color-text-muted)">
            <span>Created: ${k.created}</span><span>Last used: ${k.last}</span>
            <div style="display:flex;gap:4px">${k.scopes.map(sc => `<span style="padding:1px 6px;border-radius:4px;background:rgba(37,99,235,.15);color:#60A5FA;font-size:10px">${sc}</span>`).join('')}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── 5. Integrations Tab ─────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { name:'Slack',          desc:'Send alerts and notifications to Slack channels.',  connected:true,  color:'#4A154B', icon:'💬' },
  { name:'Microsoft Teams',desc:'Push session alerts and ticket updates to Teams.',  connected:false, color:'#464EB8', icon:'📞' },
  { name:'Jira',           desc:'Auto-create Jira tickets from helpdesk escalations.',connected:true, color:'#0052CC', icon:'📊' },
  { name:'PagerDuty',      desc:'Trigger on-call alerts for critical device events.', connected:false, color:'#06AC38', icon:'🚨' },
  { name:'Zapier',         desc:'Connect InfraDesk to 5000+ apps via Zapier.',       connected:false, color:'#FF4A00', icon:'⚡' },
  { name:'Webhook',        desc:'Send real-time event payloads to any HTTP endpoint.',connected:true, color:'#2563EB', icon:'🔗' },
];
function renderIntegrationsTab() {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-4);margin-bottom:var(--space-4)">
      ${INTEGRATIONS.map(int => `
        <div style="${S.card};margin-bottom:0">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3)">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <div style="width:40px;height:40px;border-radius:var(--radius-md);background:${int.color}22;display:flex;align-items:center;justify-content:center;font-size:20px">${int.icon}</div>
              <div>
                <div style="font-size:var(--text-sm);font-weight:700;color:var(--color-text)">${int.name}</div>
                ${S.badge(int.connected ? '#10B981' : '#94A3B8', int.connected ? 'Connected' : 'Not Connected')}
              </div>
            </div>
          </div>
          <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">${int.desc}</p>
          ${int.connected
            ? S.btn('Disconnect', `disconnectIntegration('${int.name}')`, 'background:rgba(239,68,68,.12);color:#EF4444;border:1px solid rgba(239,68,68,.3);font-size:12px')
            : S.btn('Connect', `connectIntegration('${int.name}')`, 'background:rgba(37,99,235,.15);color:#2563EB;border:1px solid rgba(37,99,235,.3);font-size:12px')}
        </div>
      `).join('')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">SMTP Email (Outgoing)</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
        ${[['SMTP Host','smtp.sendgrid.net'],['Port','587'],['Username','apikey'],['From Address','no-reply@infradesk.io']].map(([l, v]) =>
          `<div><label style="${S.label}">${l}</label><input value="${v}" style="${S.input}"/></div>`
        ).join('')}
      </div>
      <div style="display:flex;gap:var(--space-3)">
        ${S.btn('Test SMTP', 'showSettingsToast("Test email sent!")', 'background:rgba(16,185,129,.12);color:#10B981;border:1px solid rgba(16,185,129,.3)')}
        ${S.btn('Save SMTP', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
      </div>
    </div>`;
}

// ── 6. Billing Tab ─────────────────────────────────────────────────────────────
function renderBillingTab() {
  const invoices = [
    { id:'INV-2026-06', date:'Jun 1, 2026',  amount:'$599.00', status:'paid'    },
    { id:'INV-2026-05', date:'May 1, 2026',  amount:'$599.00', status:'paid'    },
    { id:'INV-2026-04', date:'Apr 1, 2026',  amount:'$499.00', status:'paid'    },
    { id:'INV-2026-03', date:'Mar 1, 2026',  amount:'$499.00', status:'overdue' },
  ];
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">
      <div style="${S.card};margin-bottom:0">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:var(--space-2)">Current Plan</div>
        <div style="font-size:var(--text-xl);font-weight:800;color:var(--color-text);margin-bottom:4px">Enterprise</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">$599 / month &bull; Billed monthly</div>
        ${S.btn('Upgrade Plan', 'showSettingsToast("Redirecting to billing...")', 'background:#2563EB;color:#fff;border:none')}
      </div>
      <div style="${S.card};margin-bottom:0">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:var(--space-2)">Usage This Month</div>
        ${[['Devices','124 / 200'],['Active Sessions','38 / 100'],['Data Transfer','1.2 TB / 5 TB'],['Agents Installed','118 / 200']].map(([l, v]) => `
          <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${l}</span>
            <span style="font-size:var(--text-xs);font-weight:600;color:var(--color-text)">${v}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Payment Method</p>
      <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);margin-bottom:var(--space-4)">
        <div style="font-size:24px">💳</div>
        <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">Visa ending in 4242</div><div style="${S.muted}">Expires 08/2028</div></div>
        ${S.btn('Update Card', 'showSettingsToast("Redirecting to Stripe...")', 'background:rgba(37,99,235,.15);color:#2563EB;border:1px solid rgba(37,99,235,.3);margin-left:auto')}
      </div>
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Invoice History</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${['Invoice','Date','Amount','Status',''].map(h => `<th style="text-align:left;padding:var(--space-2) var(--space-3);font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);border-bottom:1px solid var(--color-border,#243041)">${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${invoices.map(inv => `
            <tr style="border-bottom:1px solid var(--color-border,#243041)">
              <td style="padding:var(--space-3);font-size:var(--text-xs);font-family:monospace;color:var(--color-text)">${inv.id}</td>
              <td style="padding:var(--space-3);font-size:var(--text-xs);color:var(--color-text-muted)">${inv.date}</td>
              <td style="padding:var(--space-3);font-size:var(--text-xs);font-weight:700;color:var(--color-text)">${inv.amount}</td>
              <td style="padding:var(--space-3)">${S.badge(inv.status === 'paid' ? '#10B981' : '#EF4444', inv.status)}</td>
              <td style="padding:var(--space-3)">${S.btn('PDF', `showSettingsToast('Downloading ${inv.id}...')`, 'background:rgba(255,255,255,.06);color:var(--color-text-muted);border:1px solid var(--color-border,#243041);font-size:11px;padding:3px 10px')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── 7. Notifications Tab ─────────────────────────────────────────────────────────
function renderNotificationsTab() {
  const notifRows = [
    ['Device Goes Offline',      true,  'Notify when any monitored device loses connection'],
    ['Critical Security Alert',  true,  'Threat detection, failed logins, suspicious activity'],
    ['Patch Available',          false, 'New OS or software patches available for deployment'],
    ['Session Started',          false, 'Someone initiates a remote desktop session'],
    ['Ticket Assigned',          true,  'A helpdesk ticket is assigned to you'],
    ['Agent Disconnected',       true,  'Installed agent goes offline unexpectedly'],
    ['Billing Due',              true,  'Invoice generated or payment method expiring'],
  ];
  return `
    <div style="${S.card}">
      <p style="${S.h3}">Email Notifications</p>
      ${notifRows.map(([label, checked, desc], i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;${i < notifRows.length-1 ? 'border-bottom:1px solid var(--color-border,#243041)' : ''}">
          <div><div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">${label}</div><div style="${S.muted}">${desc}</div></div>
          ${S.toggle('notif-' + i, checked, `settingsToggle(this,'track-notif-${i}','thumb-notif-${i}')`)}  
        </div>
      `).join('')}
      <div style="margin-top:var(--space-4)">${S.btn('Save Notification Prefs', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}</div>
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Notification Channels</p>
      <div style="${S.row}"><label style="${S.label}">Email Digest Frequency</label>
        <select style="${S.input}"><option>Real-time</option><option>Hourly Digest</option><option>Daily Digest</option><option>Weekly Digest</option></select>
      </div>
      <div style="${S.row}"><label style="${S.label}">Slack Webhook URL</label><input placeholder="https://hooks.slack.com/services/..." style="${S.input}"/></div>
      ${S.btn('Save Channels', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
    </div>`;
}

// ── 8. Storage Tab ─────────────────────────────────────────────────────────────
function renderStorageTab() {
  const buckets = [
    { name:'Session Recordings', used:'340 GB', total:'500 GB', pct:68, color:'#2563EB' },
    { name:'Audit Logs',         used:'12 GB',  total:'100 GB', pct:12, color:'#10B981' },
    { name:'File Transfers',     used:'87 GB',  total:'200 GB', pct:44, color:'#F59E0B' },
    { name:'Agent Installers',   used:'2.1 GB', total:'10 GB',  pct:21, color:'#8B5CF6' },
  ];
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--space-4);margin-bottom:var(--space-4)">
      ${buckets.map(b => `
        <div style="${S.card};margin-bottom:0">
          <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:var(--space-2)">${b.name}</div>
          <div style="font-size:var(--text-lg);font-weight:800;color:var(--color-text);margin-bottom:4px">${b.used}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-3)">of ${b.total}</div>
          <div style="height:6px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${b.pct}%;background:${b.color};border-radius:99px;transition:width .6s"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Retention Policies</p>
      ${[['Session Recordings Retention','90 days'],['Audit Log Retention','365 days'],['File Transfer History','30 days']].map(([l, v]) =>
        `<div style="${S.row}"><label style="${S.label}">${l}</label>
          <select style="${S.input}"><option>30 days</option><option ${v==='90 days'?'selected':''}>90 days</option><option ${v==='365 days'?'selected':''}>365 days</option><option>Forever</option></select>
        </div>`
      ).join('')}
      ${S.btn('Save Policies', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
    </div>
    <div style="${S.card}">
      <p style="${S.h3}">Storage Provider</p>
      <div style="${S.row}"><label style="${S.label}">Provider</label>
        <select style="${S.input}"><option>InfraDesk Cloud (Default)</option><option>Amazon S3</option><option>Azure Blob Storage</option><option>Google Cloud Storage</option></select>
      </div>
      <div style="${S.row}"><label style="${S.label}">Bucket / Container Name</label><input placeholder="infradesk-recordings-prod" style="${S.input}"/></div>
      ${S.btn('Save Storage Config', 'saveSettings()', 'background:#2563EB;color:#fff;border:none')}
    </div>`;
}

// ── Action Handlers ───────────────────────────────────────────────────────────
function saveSettings() { showSettingsToast('✅ Settings saved successfully'); }
function settingsToggle(el, trackId, thumbId) {
  const on = el.checked;
  const tr = document.getElementById(trackId), th = document.getElementById(thumbId);
  if (tr) tr.style.background = on ? '#2563EB' : '#243041';
  if (th) th.style.left = on ? '20px' : '2px';
}
function confirmDangerAction(msg) {
  if (confirm(msg)) showSettingsToast('⚠️ Action executed successfully');
}
function generateApiKey() {
  const key = 'sk_new_' + Math.random().toString(36).slice(2, 10) + '...' + Math.random().toString(36).slice(2, 6);
  showSettingsToast('🔑 New API key: ' + key);
}
function revokeApiKey(name)             { showSettingsToast(`Key "${name}" revoked`); }
function connectIntegration(name)        { showSettingsToast(`Connecting to ${name}…`); }
function disconnectIntegration(name)     { showSettingsToast(`Disconnected from ${name}`); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showSettingsToast(msg) {
  let t = document.getElementById('infradesk-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'infradesk-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10B981;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:opacity .4s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 2800);
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.initSettings          = initSettings;
window.switchSettingsTab     = switchSettingsTab;
window.saveSettings          = saveSettings;
window.settingsToggle        = settingsToggle;
window.confirmDangerAction   = confirmDangerAction;
window.generateApiKey        = generateApiKey;
window.revokeApiKey          = revokeApiKey;
window.connectIntegration    = connectIntegration;
window.disconnectIntegration = disconnectIntegration;
window.showSettingsToast     = showSettingsToast;
