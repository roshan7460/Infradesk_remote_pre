/* ============================================================
   InfraDesk Remote — scripts/pages/patches.js
   Covers:
     • Summary KPI cards  — Critical / Security / Optional /
       Feature / Compliant counts
     • Compliance Score   — animated SVG ring + grade,
       per-category breakdown bars
     • Deployment Rings   — Canary → Pilot → Staging →
       Production with active-stage highlight + progress bar
     • Patch List         — severity dot, KB number, affected
       devices, release date, status badge; Install / Defer /
       Schedule actions per row
     • Schedule Modal     — date-time picker, ring selector,
       maintenance-window presets
     • Live tick          — in-progress patches advance %,
       stage auto-promotes, compliance score updates
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────*/
const _PT_SEV_COLOR = {
  critical : '#EF4444',
  security : '#F59E0B',
  optional : '#2563EB',
  feature  : '#10B981',
};

const _PT_RINGS = [
  { id:'canary',     label:'Ring 0', name:'Canary',     desc:'3 pilot devices',        devices:3   },
  { id:'pilot',      label:'Ring 1', name:'Pilot',      desc:'12 early adopters',       devices:12  },
  { id:'staging',    label:'Ring 2', name:'Staging',    desc:'47 staging endpoints',    devices:47  },
  { id:'production', label:'Ring 3', name:'Production', desc:'234 production endpoints',devices:234 },
];

/* ────────────────────────────────────────────────────────────
   MOCK DATA
──────────────────────────────────────────────────────────────*/
let _PT_PATCHES = [
  {
    id:'KB5034441', title:'Windows Security Update — June 2026 Cumulative',
    sev:'critical', type:'security', status:'pending',
    devices:47, affected:234, released:'2026-06-01',
    ring:'canary', progress:0,
    cve:['CVE-2026-1234','CVE-2026-1235'],
    desc:'Addresses critical RCE vulnerability in Windows Print Spooler. Immediate deployment recommended.',
  },
  {
    id:'KB5033920', title:'Microsoft Defender Antivirus Update — Definitions 1.411',
    sev:'security', type:'security', status:'deploying',
    devices:189, affected:296, released:'2026-05-30',
    ring:'production', progress:64,
    cve:[],
    desc:'Updated malware definitions including new ransomware signatures detected in the wild.',
  },
  {
    id:'KB5032009', title:'.NET Framework 4.8.1 Security Patch',
    sev:'security', type:'security', status:'deploying',
    devices:23, affected:296, released:'2026-05-28',
    ring:'staging', progress:38,
    cve:['CVE-2026-0981'],
    desc:'Fixes privilege escalation vulnerability in .NET runtime serialization handler.',
  },
  {
    id:'KB5031364', title:'Windows 11 22H2 Quality Update',
    sev:'optional', type:'optional', status:'scheduled',
    devices:0, affected:156, released:'2026-05-25',
    ring:'pilot', progress:0,
    cve:[],
    desc:'Monthly quality rollup including reliability improvements and non-security bug fixes.',
  },
  {
    id:'KB5030219', title:'Microsoft Edge Chromium 126 Update',
    sev:'optional', type:'feature', status:'pending',
    devices:0, affected:296, released:'2026-05-22',
    ring:'canary', progress:0,
    cve:[],
    desc:'Feature update bringing new sidebar productivity tools and enhanced security sandbox.',
  },
  {
    id:'KB5029263', title:'Azure AD Connect Health Agent Update',
    sev:'security', type:'security', status:'compliant',
    devices:296, affected:296, released:'2026-05-18',
    ring:'production', progress:100,
    cve:['CVE-2026-0741'],
    desc:'Patches token forgery vulnerability in Azure AD sync agent.',
  },
  {
    id:'KB5028185', title:'SQL Server 2022 CU13 Security Update',
    sev:'critical', type:'security', status:'compliant',
    devices:8, affected:8, released:'2026-05-15',
    ring:'production', progress:100,
    cve:['CVE-2026-0512','CVE-2026-0513'],
    desc:'Addresses SQL injection and privilege escalation in SQL Server engine.',
  },
  {
    id:'KB5027231', title:'Visual C++ 2022 Redistributable Update',
    sev:'optional', type:'optional', status:'deferred',
    devices:0, affected:201, released:'2026-05-10',
    ring:'canary', progress:0,
    cve:[],
    desc:'Runtime library update improving compatibility with modern C++ applications.',
  },
  {
    id:'KB5026372', title:'Windows Subsystem for Linux 2.2.4',
    sev:'feature', type:'feature', status:'pending',
    devices:0, affected:34, released:'2026-05-08',
    ring:'canary', progress:0,
    cve:[],
    desc:'WSL2 kernel update with improved GPU compute support and reduced memory footprint.',
  },
  {
    id:'KB5025398', title:'Microsoft 365 Apps Monthly Channel Update',
    sev:'security', type:'security', status:'compliant',
    devices:296, affected:296, released:'2026-05-05',
    ring:'production', progress:100,
    cve:['CVE-2026-0402'],
    desc:'Patches macro execution bypass in Excel and Word document handlers.',
  },
];

/* ────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────────*/
let _ptFilter       = 'all';    // all | pending | deploying | scheduled | compliant | deferred
let _ptSearch       = '';
let _ptActiveRing   = 'canary'; // current deployment stage
let _ptTickId       = null;
let _ptSchedulePatch= null;     // id of patch being scheduled
let _ptDetailPatch  = null;     // id of expanded patch row

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────────*/
function renderPatchesPage(container) {
  _ptCleanup();
  Chart.defaults.color       = '#64748B';
  Chart.defaults.font.family = "'Inter','JetBrains Mono',sans-serif";
  Chart.defaults.font.size   = 11;

  container.innerHTML = _buildPtHtml();

  setTimeout(() => {
    _drawComplianceRing();
    _drawTrendChart();
    _renderPatchList();
    _ptStartTick();
  }, 60);
}

function _ptCleanup() {
  clearInterval(_ptTickId);
  _ptTickId = null;
  ['_ptCompChart','_ptTrendChart'].forEach(k => {
    if (window[k]) { try { window[k].destroy(); } catch(_){} window[k] = null; }
  });
}

/* ────────────────────────────────────────────────────────────
   HTML SHELL
──────────────────────────────────────────────────────────────*/
function _buildPtHtml() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Patch Management</h1>
        <p class="page-subtitle">Deployment rings, compliance posture &amp; patch scheduling</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-ghost btn-sm" style="font-size:12px" onclick="_ptSyncNow()">↺ Sync WSUS</button>
        <button class="btn-primary btn-sm" style="font-size:12px" onclick="_ptDeployAll()">⚡ Deploy Critical</button>
      </div>
    </div>

    <!-- Summary KPI cards -->
    <div class="patch-summary-grid" id="ptSummary"></div>

    <!-- Top row: compliance ring + trend chart -->
    <div style="display:grid;grid-template-columns:340px 1fr;gap:20px;margin-bottom:24px">

      <!-- Compliance score card -->
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);padding:24px">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px">
          Patch Compliance Score
        </div>
        <div style="display:flex;align-items:center;gap:20px">
          <svg id="ptCompRing" width="110" height="110" viewBox="0 0 110 110"
               style="flex-shrink:0;filter:drop-shadow(0 0 12px rgba(16,185,129,0.25))"></svg>
          <div style="flex:1">
            ${[
              { label:'Critical',  key:'critical',  color:'#EF4444' },
              { label:'Security',  key:'security',  color:'#F59E0B' },
              { label:'Optional',  key:'optional',  color:'#2563EB' },
              { label:'Feature',   key:'feature',   color:'#10B981' },
            ].map(c => {
              const total     = _PT_PATCHES.filter(p => p.type === c.key).length;
              const compliant = _PT_PATCHES.filter(p => p.type === c.key && p.status === 'compliant').length;
              const pct       = total ? Math.round(compliant / total * 100) : 100;
              return `
                <div style="margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
                    <span style="color:var(--text-secondary)">${c.label}</span>
                    <span style="font-weight:700;color:${c.color}">${pct}%</span>
                  </div>
                  <div style="height:4px;background:var(--border);border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:${c.color};border-radius:99px;
                                transition:width 1s ease"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);
                    display:flex;justify-content:space-between;font-size:12px">
          <span style="color:var(--text-muted)">Last sync</span>
          <span style="color:var(--text-secondary);font-family:'JetBrains Mono',monospace">02:41 AM</span>
        </div>
      </div>

      <!-- 30-day trend chart -->
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);padding:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:14px;font-weight:700;color:var(--text-primary)">30-Day Patch Trend</div>
          <div style="display:flex;gap:12px;font-size:11px">
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:8px;height:8px;background:#10B981;border-radius:50%;display:inline-block"></span>
              <span style="color:var(--text-muted)">Compliant</span>
            </span>
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:8px;height:8px;background:#EF4444;border-radius:50%;display:inline-block"></span>
              <span style="color:var(--text-muted)">Pending</span>
            </span>
          </div>
        </div>
        <canvas id="ptTrendChart" height="90"></canvas>
      </div>
    </div>

    <!-- Deployment rings -->
    <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px">
      Deployment Rings
    </div>
    <div class="deployment-rings" id="ptRings" style="margin-bottom:8px"></div>
    <!-- Ring progress bar -->
    <div style="background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-md);padding:14px 18px;margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:12px;color:var(--text-secondary)" id="ptRingProgLabel">
          Canary ring deployment in progress
        </span>
        <span style="font-size:12px;font-weight:700;color:var(--primary)" id="ptRingProgPct">0%</span>
      </div>
      <div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden">
        <div id="ptRingProgBar" style="height:100%;width:0%;background:var(--primary);
             border-radius:99px;transition:width 0.4s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;
                  color:var(--text-muted)">
        ${_PT_RINGS.map(r=>`<span>${r.name}</span>`).join('')}
      </div>
    </div>

    <!-- Filter + search bar -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <div style="position:relative;flex:1;min-width:180px">
        <input id="ptSearch" placeholder="Search patches or KB numbers…"
               oninput="_ptOnSearch(this.value)"
               style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);
                      border-radius:var(--radius-md);color:var(--text-primary);font-size:12px;
                      padding:7px 12px;font-family:'Inter',sans-serif;outline:none"/>
      </div>
      ${['all','pending','deploying','scheduled','compliant','deferred'].map(f => `
        <button class="btn-ghost btn-sm" id="ptF_${f}" style="font-size:11px;text-transform:capitalize"
                onclick="_ptSetFilter('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>
      `).join('')}
    </div>

    <!-- Patch list -->
    <div style="background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-lg);overflow:hidden" id="ptList"></div>

    <!-- Schedule modal (hidden) -->
    <div id="ptSchedModal" style="display:none;position:fixed;inset:0;z-index:1000;
         background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
         align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);width:440px;max-width:95vw">
        <div style="padding:18px 22px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:15px;font-weight:800;color:var(--text-primary)">Schedule Patch</span>
          <button class="btn-icon btn-icon-sm" onclick="_ptCloseSchedule()">✕</button>
        </div>
        <div style="padding:22px" id="ptSchedBody"></div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   SUMMARY CARDS
──────────────────────────────────────────────────────────────*/
function _renderSummary() {
  const el = document.getElementById('ptSummary');
  if (!el) return;
  const cards = [
    { key:'critical', label:'Critical',  cls:'patch-critical',  icon:'🔴' },
    { key:'security', label:'Security',  cls:'patch-security',  icon:'🛡️' },
    { key:'optional', label:'Optional',  cls:'patch-optional',  icon:'📦' },
    { key:'feature',  label:'Feature',   cls:'patch-feature',   icon:'✨' },
    { key:'compliant',label:'Compliant', cls:'patch-compliant', icon:'✅' },
  ];
  el.innerHTML = cards.map(c => {
    const count = c.key === 'compliant'
      ? _PT_PATCHES.filter(p => p.status === 'compliant').length
      : _PT_PATCHES.filter(p => p.type === c.key && p.status !== 'compliant').length;
    return `
      <div class="patch-summary-card ${c.cls}" onclick="_ptSetFilter('${c.key === 'compliant' ? 'compliant' : 'pending'}')">
        <div style="font-size:22px;margin-bottom:6px">${c.icon}</div>
        <div class="patch-count">${count}</div>
        <div class="patch-type">${c.label}</div>
      </div>`;
  }).join('');
}

/* ────────────────────────────────────────────────────────────
   COMPLIANCE RING SVG
──────────────────────────────────────────────────────────────*/
function _drawComplianceRing() {
  const svg   = document.getElementById('ptCompRing');
  if (!svg) return;
  const score = _calcComplianceScore();
  const r = 46, cx = 55, cy = 55;
  const circ = 2 * Math.PI * r;
  const color = score >= 85 ? '#10B981' : score >= 65 ? '#F59E0B' : '#EF4444';

  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="rgba(255,255,255,0.07)" stroke-width="9"/>
    <circle id="ptCompFill" cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="${color}" stroke-width="9" stroke-linecap="round"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
            transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 5}" text-anchor="middle"
          fill="${color}" font-size="22" font-weight="900"
          font-family="'Inter',sans-serif">${score}%</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle"
          fill="#64748B" font-size="10"
          font-family="'Inter',sans-serif">compliant</text>`;

  setTimeout(() => {
    const fill = document.getElementById('ptCompFill');
    if (fill) {
      fill.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
      fill.style.strokeDashoffset = circ * (1 - score / 100);
    }
  }, 80);
}

function _calcComplianceScore() {
  const total     = _PT_PATCHES.length;
  const compliant = _PT_PATCHES.filter(p => p.status === 'compliant').length;
  const partial   = _PT_PATCHES.filter(p => p.status === 'deploying').length;
  return Math.round((compliant + partial * 0.5) / total * 100);
}

/* ────────────────────────────────────────────────────────────
   30-DAY TREND CHART
──────────────────────────────────────────────────────────────*/
function _drawTrendChart() {
  const canvas = document.getElementById('ptTrendChart');
  if (!canvas) return;
  const labels = [];
  const compliantData = [], pendingData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    labels.push(i % 5 === 0 ? `${d.getDate()}/${d.getMonth()+1}` : '');
    compliantData.push(Math.round(70 + 20 * (1 - i/30) + (Math.random() - 0.5) * 5));
    pendingData.push(Math.round(30 - 20 * (1 - i/30) + (Math.random() - 0.5) * 4));
  }

  window._ptTrendChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Compliant %', data: compliantData,
          borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)',
          borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4,
        },
        {
          label: 'Pending %', data: pendingData,
          borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.06)',
          borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(11,18,32,0.92)',
          borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
          titleColor: '#F8FAFC', bodyColor: '#94A3B8', padding: 10,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748B' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748B' },
          min: 0, max: 100,
          ticks: { callback: v => `${v}%`, stepSize: 25, color: '#64748B' },
        },
      },
    },
  });
}

/* ────────────────────────────────────────────────────────────
   DEPLOYMENT RINGS
──────────────────────────────────────────────────────────────*/
function _renderRings() {
  const el = document.getElementById('ptRings');
  if (!el) return;
  el.innerHTML = _PT_RINGS.map(r => {
    const count    = _PT_PATCHES.filter(p => p.ring === r.id && p.status !== 'compliant').length;
    const isActive = r.id === _ptActiveRing;
    return `
      <div class="ring-item ${isActive ? 'active' : ''}" onclick="_ptSetActiveRing('${r.id}')"
           style="cursor:pointer">
        <div class="ring-label">${r.label}</div>
        <div class="ring-name">${r.name}</div>
        <div class="ring-count" style="color:${isActive ? 'var(--primary)' : 'var(--text-primary)'}">
          ${count}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${r.desc}</div>
      </div>`;
  }).join('');

  /* Update overall deployment progress bar */
  const ringOrder   = _PT_RINGS.map(r => r.id);
  const activeIdx   = ringOrder.indexOf(_ptActiveRing);
  const ringPct     = Math.round(((activeIdx) / (ringOrder.length - 1)) * 100);
  const deployPatch = _PT_PATCHES.find(p => p.status === 'deploying' && p.ring === _ptActiveRing);
  const barPct      = deployPatch ? deployPatch.progress : ringPct;

  const bar   = document.getElementById('ptRingProgBar');
  const pct   = document.getElementById('ptRingProgPct');
  const label = document.getElementById('ptRingProgLabel');
  if (bar)   bar.style.width   = `${barPct}%`;
  if (pct)   pct.textContent   = `${barPct}%`;
  if (label) label.textContent = deployPatch
    ? `${_PT_RINGS.find(r=>r.id===_ptActiveRing)?.name} ring — ${deployPatch.title.slice(0,40)}…`
    : `${_PT_RINGS.find(r=>r.id===_ptActiveRing)?.name} ring ready for deployment`;
}

function _ptSetActiveRing(ringId) {
  _ptActiveRing = ringId;
  _renderRings();
}

/* ────────────────────────────────────────────────────────────
   PATCH LIST
──────────────────────────────────────────────────────────────*/
function _renderPatchList() {
  /* Sync summary + rings + compliance on every render */
  _renderSummary();
  _renderRings();

  /* Update filter button highlights */
  ['all','pending','deploying','scheduled','compliant','deferred'].forEach(f => {
    const btn = document.getElementById(`ptF_${f}`);
    if (btn) btn.classList.toggle('active', f === _ptFilter);
  });

  const el = document.getElementById('ptList');
  if (!el) return;

  const visible = _PT_PATCHES.filter(p => {
    if (_ptSearch) {
      const q = _ptSearch.toLowerCase();
      if (!p.id.toLowerCase().includes(q) && !p.title.toLowerCase().includes(q)) return false;
    }
    if (_ptFilter === 'all') return true;
    return p.status === _ptFilter;
  });

  if (!visible.length) {
    el.innerHTML = `<div style="padding:32px;text-align:center;font-size:13px;
      color:var(--text-muted)">No patches match the current filter.</div>`;
    return;
  }

  el.innerHTML = `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);
                display:flex;align-items:center;gap:14px;
                font-size:11px;font-weight:700;color:var(--text-muted);
                text-transform:uppercase;letter-spacing:0.6px">
      <span style="width:10px"></span>
      <span style="flex:1">Patch / KB Number</span>
      <span style="width:80px">Ring</span>
      <span style="width:70px">Devices</span>
      <span style="width:90px">Status</span>
      <span style="width:130px"></span>
    </div>
    ${visible.map(p => _patchRow(p)).join('')}`;
}

function _patchRow(p) {
  const expanded = _ptDetailPatch === p.id;
  return `
    <div>
      <div class="patch-item" id="ptRow_${p.id}">
        <div class="patch-severity-dot" style="background:${_PT_SEV_COLOR[p.sev]||'#64748B'}"></div>
        <div class="patch-name" style="cursor:pointer" onclick="_ptToggleDetail('${p.id}')">
          <div class="patch-title">${p.title}</div>
          <div class="patch-kb">${p.id} · Released ${p.released}
            ${p.cve.length ? `· <span style="color:var(--danger)">${p.cve[0]}${p.cve.length>1?` +${p.cve.length-1}`:''}</span>` : ''}
          </div>
        </div>
        <div style="width:80px;font-size:12px;color:var(--text-muted)">
          ${_PT_RINGS.find(r=>r.id===p.ring)?.name || p.ring}
        </div>
        <div style="width:70px;font-size:12px">
          ${p.status === 'deploying' ? `
            <div style="font-size:11px;color:var(--text-muted)">${p.devices}/${p.affected}</div>
            <div style="height:3px;background:var(--border);border-radius:99px;margin-top:3px;overflow:hidden;width:60px">
              <div style="height:100%;width:${p.progress}%;background:var(--primary);border-radius:99px;
                           transition:width 0.5s ease"></div>
            </div>` : `<span style="color:var(--text-secondary)">${p.affected}</span>`}
        </div>
        <div style="width:90px">${_ptStatusBadge(p.status)}</div>
        <div class="patch-actions" style="width:130px;justify-content:flex-end">
          ${_ptRowActions(p)}
        </div>
      </div>
      ${expanded ? `
        <div style="padding:14px 24px 16px 36px;background:rgba(255,255,255,0.02);
                    border-bottom:1px solid var(--border)">
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:10px">
            ${p.desc}
          </div>
          ${p.cve.length ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${p.cve.map(c=>`<code style="font-size:11px;background:rgba(239,68,68,0.1);
                color:var(--danger);padding:2px 8px;border-radius:4px;
                font-family:'JetBrains Mono',monospace">${c}</code>`).join('')}
            </div>` : ''}
        </div>` : ''}
    </div>`;
}

function _ptRowActions(p) {
  if (p.status === 'compliant') {
    return `<span style="font-size:11px;color:var(--success)">✅ Up to date</span>`;
  }
  if (p.status === 'deploying') {
    return `
      <span style="font-size:11px;color:var(--primary);font-family:'JetBrains Mono',monospace">
        ${p.progress}%
      </span>
      <button class="btn-ghost btn-sm" style="font-size:10px" onclick="_ptPausePatch('${p.id}')">⏸</button>`;
  }
  if (p.status === 'deferred') {
    return `<button class="btn-ghost btn-sm" style="font-size:10px" onclick="_ptInstall('${p.id}')">↺ Restore</button>`;
  }
  return `
    <button class="btn-ghost btn-sm" style="font-size:10px" onclick="_ptOpenSchedule('${p.id}')">📅</button>
    <button class="btn-ghost btn-sm" style="font-size:10px" onclick="_ptDefer('${p.id}')">⏭ Defer</button>
    <button class="btn-primary btn-sm" style="font-size:10px" onclick="_ptInstall('${p.id}')">▶ Install</button>`;
}

/* ────────────────────────────────────────────────────────────
   SCHEDULE MODAL
──────────────────────────────────────────────────────────────*/
function _ptOpenSchedule(patchId) {
  _ptSchedulePatch = patchId;
  const p  = _PT_PATCHES.find(x => x.id === patchId);
  if (!p) return;
  const modal = document.getElementById('ptSchedModal');
  const body  = document.getElementById('ptSchedBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${p.title}</div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);
                      display:block;margin-bottom:6px">Maintenance Window</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${['Tonight 02:00 AM','Sunday 03:00 AM','Next Maintenance','Custom'].map(w => `
            <button class="btn-ghost btn-sm" style="font-size:11px;justify-content:flex-start"
                    onclick="_ptSelectWindow(this,'${w}')">${w}</button>
          `).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);
                      display:block;margin-bottom:6px">Target Ring</label>
        <select id="ptSchedRing" style="width:100%;background:var(--bg-card);
                border:1px solid var(--border);border-radius:var(--radius-md);
                color:var(--text-primary);font-size:13px;padding:8px 10px;outline:none">
          ${_PT_RINGS.map(r=>`<option value="${r.id}" ${r.id===p.ring?'selected':''}>${r.label} — ${r.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);
                      display:block;margin-bottom:6px">Custom Date / Time</label>
        <input type="datetime-local" id="ptSchedDt"
               style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);
                      border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;
                      padding:8px 10px;outline:none;font-family:'Inter',sans-serif"/>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px">
        <button class="btn-ghost btn-sm" onclick="_ptCloseSchedule()">Cancel</button>
        <button class="btn-primary btn-sm" onclick="_ptConfirmSchedule()">Confirm Schedule</button>
      </div>
    </div>`;

  modal.style.display = 'flex';
}

function _ptSelectWindow(btn, label) {
  document.querySelectorAll('#ptSchedBody .btn-ghost').forEach(b =>
    b.style.borderColor = '');
  btn.style.borderColor = 'var(--primary)';
}

function _ptCloseSchedule() {
  const m = document.getElementById('ptSchedModal');
  if (m) m.style.display = 'none';
  _ptSchedulePatch = null;
}

function _ptConfirmSchedule() {
  const p = _PT_PATCHES.find(x => x.id === _ptSchedulePatch);
  if (!p) return;
  const ring = document.getElementById('ptSchedRing')?.value || p.ring;
  p.status = 'scheduled';
  p.ring   = ring;
  _ptCloseSchedule();
  _renderPatchList();
  _ptToast(`📅 ${p.id} scheduled for ${_PT_RINGS.find(r=>r.id===ring)?.name} ring`);
}

/* ────────────────────────────────────────────────────────────
   PATCH ACTIONS
──────────────────────────────────────────────────────────────*/
function _ptInstall(patchId) {
  const p = _PT_PATCHES.find(x => x.id === patchId);
  if (!p) return;
  p.status   = 'deploying';
  p.progress = 0;
  _ptActiveRing = p.ring;
  _renderPatchList();
  _ptToast(`▶ Deploying ${p.id} to ${_PT_RINGS.find(r=>r.id===p.ring)?.name} ring`);
}

function _ptDefer(patchId) {
  const p = _PT_PATCHES.find(x => x.id === patchId);
  if (p) { p.status = 'deferred'; _renderPatchList(); _ptToast(`⏭ ${p.id} deferred`); }
}

function _ptPausePatch(patchId) {
  const p = _PT_PATCHES.find(x => x.id === patchId);
  if (p) { p.status = 'pending'; _renderPatchList(); _ptToast(`⏸ ${p.id} paused`); }
}

function _ptToggleDetail(patchId) {
  _ptDetailPatch = _ptDetailPatch === patchId ? null : patchId;
  _renderPatchList();
}

function _ptSetFilter(f) { _ptFilter = f; _renderPatchList(); }
function _ptOnSearch(v)   { _ptSearch = v; _renderPatchList(); }

function _ptSyncNow() {
  _ptToast('↺ Syncing with WSUS — checking for new updates…');
  setTimeout(() => _ptToast('✅ WSUS sync complete — 10 patches up to date'), 2500);
}

function _ptDeployAll() {
  let count = 0;
  _PT_PATCHES.forEach(p => {
    if ((p.sev === 'critical' || p.type === 'security') &&
        p.status === 'pending') {
      p.status = 'deploying'; p.progress = 0; count++;
    }
  });
  _ptActiveRing = 'canary';
  _renderPatchList();
  _ptToast(`⚡ Deploying ${count} critical / security patches to Canary ring`);
}

/* ────────────────────────────────────────────────────────────
   LIVE TICK  — advance deploying patches, auto-promote rings
──────────────────────────────────────────────────────────────*/
function _ptStartTick() {
  _ptTickId = setInterval(() => {
    let changed = false;

    _PT_PATCHES.forEach(p => {
      if (p.status !== 'deploying') return;
      const speed = p.sev === 'critical' ? 1.8 : p.sev === 'security' ? 1.2 : 0.7;
      p.progress  = Math.min(100, p.progress + speed);
      changed     = true;

      if (p.progress >= 100) {
        p.progress = 100;
        p.status   = 'compliant';
        p.devices  = p.affected;

        /* Auto-promote ring */
        const order  = _PT_RINGS.map(r => r.id);
        const curIdx = order.indexOf(p.ring);
        if (curIdx < order.length - 1) {
          p.ring = order[curIdx + 1];
          p.status   = 'deploying';
          p.progress = 0;
          _ptActiveRing = p.ring;
          _ptToast(`🚀 ${p.id} promoted to ${_PT_RINGS[curIdx+1].name} ring`);
        } else {
          _ptToast(`✅ ${p.id} fully deployed`);
        }
      }
    });

    if (changed) {
      /* Lightweight DOM patch for progress bars instead of full re-render */
      _PT_PATCHES.forEach(p => {
        if (p.status !== 'deploying') return;
        const row = document.getElementById(`ptRow_${p.id}`);
        if (!row) return;
        const bar = row.querySelector('[style*="background:var(--primary);border-radius:99px;transition"]');
        const pctEl = row.querySelector('[style*="JetBrains Mono"]');
        if (bar)   bar.style.width     = `${p.progress}%`;
        if (pctEl) pctEl.textContent   = `${Math.round(p.progress)}%`;
        const devEl = row.querySelector('[style*="text-muted"]');
        if (devEl) devEl.textContent   = `${Math.round(p.devices * p.progress / 100)}/${p.affected}`;
      });

      /* Full re-render only on completion */
      if (_PT_PATCHES.some(p => p.status === 'compliant' && p.progress === 100)) {
        _renderPatchList();
        _drawComplianceRing();
        _renderSummary();
      }

      _renderRings();
    }
  }, 1000);
}

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────*/
const _PT_STATUS_STYLES = {
  pending   : { bg:'rgba(37,99,235,0.15)',  color:'#60A5FA',          label:'Pending'    },
  deploying : { bg:'rgba(245,158,11,0.15)', color:'var(--warning)',    label:'Deploying'  },
  scheduled : { bg:'rgba(139,92,246,0.15)', color:'#A78BFA',          label:'Scheduled'  },
  compliant : { bg:'rgba(16,185,129,0.15)', color:'var(--success)',    label:'Compliant'  },
  deferred  : { bg:'rgba(100,116,139,0.15)',color:'#94A3B8',           label:'Deferred'   },
};

function _ptStatusBadge(status) {
  const s = _PT_STATUS_STYLES[status] || _PT_STATUS_STYLES.pending;
  return `<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;
                       background:${s.bg};color:${s.color}">${s.label}</span>`;
}

function _ptToast(msg) {
  const existing = document.querySelectorAll('._ptToast');
  const offset   = existing.length * 54;
  const t = document.createElement('div');
  t.className = '_ptToast';
  t.style.cssText = `position:fixed;bottom:${28+offset}px;right:24px;
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-md);padding:10px 18px;
    font-size:13px;color:var(--text-primary);min-width:240px;
    box-shadow:var(--shadow-lg);z-index:9999;white-space:nowrap`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ────────────────────────────────────────────────────────────
   EXPOSE
──────────────────────────────────────────────────────────────*/
window.renderPatchesPage  = renderPatchesPage;
window._ptSetFilter       = _ptSetFilter;
window._ptOnSearch        = _ptOnSearch;
window._ptSetActiveRing   = _ptSetActiveRing;
window._ptInstall         = _ptInstall;
window._ptDefer           = _ptDefer;
window._ptPausePatch      = _ptPausePatch;
window._ptToggleDetail    = _ptToggleDetail;
window._ptOpenSchedule    = _ptOpenSchedule;
window._ptCloseSchedule   = _ptCloseSchedule;
window._ptSelectWindow    = _ptSelectWindow;
window._ptConfirmSchedule = _ptConfirmSchedule;
window._ptSyncNow         = _ptSyncNow;
window._ptDeployAll       = _ptDeployAll;
