/* ============================================================
   InfraDesk Remote — scripts/pages/reports.js
   Covers:
     • Report Catalogue   — card grid of saved reports
       (Executive Summary, IT Ops, Security, Uptime, Patch,
        Helpdesk, Cost, Capacity)
     • Executive Dashboard — headline KPIs, sparkline trend
       cards, infrastructure health ring, top-5 incidents
       table, cost breakdown doughnut
     • Operations Report   — uptime heatmap (7-day × device),
       alert volume bar chart, MTTR/MTBF metric row,
       capacity gauges per resource
     • Export Engine       — CSV (native Blob), Excel-style
       TSV Blob, PDF via window.print() with print stylesheet
     • Date-range picker   — preset chips (Today / 7d / 30d /
       90d / Custom) driving chart re-generation
     • Scheduled Reports   — modal to set email + cron cadence
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   REPORT CATALOGUE DATA
──────────────────────────────────────────────────────────── */
const _RPT_CATALOGUE = [
  { id:'executive', icon:'📊', name:'Executive Summary',    desc:'High-level KPIs, cost overview, SLA adherence & top incidents for leadership.',   color:'#2563EB' },
  { id:'ops',       icon:'⚙️',   name:'IT Operations',       desc:'Uptime heatmap, alert trends, MTTR/MTBF and resource capacity deep-dive.',        color:'#10B981' },
  { id:'security',  icon:'🛡️', name:'Security Posture',    desc:'Threat summary, compliance scores, vulnerability trends & audit log digest.',    color:'#EF4444' },
  { id:'uptime',    icon:'🟢', name:'Uptime & SLA',        desc:'Per-service availability percentages, SLA breach log and downtime root causes.',  color:'#10B981' },
  { id:'patch',     icon:'📦', name:'Patch Compliance',    desc:'Patch deployment ring progress, compliance score history and CVE exposure.',      color:'#F59E0B' },
  { id:'helpdesk',  icon:'🎫', name:'Helpdesk Performance', desc:'Ticket volume, resolution times, SLA adherence and agent workload breakdown.',   color:'#8B5CF6' },
  { id:'cost',      icon:'💰', name:'Cost & Billing',       desc:'Cloud & infrastructure spend by category, budget vs actual, 12-month forecast.',  color:'#F59E0B' },
  { id:'capacity',  icon:'🗂️', name:'Capacity Planning',   desc:'CPU/RAM/storage trend projections, runway estimates and scaling recommendations.',color:'#2563EB' },
];

/* ────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────── */
let _rptView     = 'catalogue';  // catalogue | executive | ops
let _rptRange    = '30d';        // today | 7d | 30d | 90d
let _rptCharts   = [];           // Chart.js instances to destroy on leave

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────── */
function renderReportsPage(container) {
  _rptCleanup();
  Chart.defaults.color       = '#64748B';
  Chart.defaults.font.family = "'Inter','JetBrains Mono',sans-serif";
  Chart.defaults.font.size   = 11;
  _rptView = 'catalogue';
  container.innerHTML = _buildShell();
  _renderCatalogue();
}

function _rptCleanup() {
  _rptCharts.forEach(c => { try { c.destroy(); } catch(_){} });
  _rptCharts = [];
}

/* ────────────────────────────────────────────────────────────
   PAGE SHELL
──────────────────────────────────────────────────────────── */
function _buildShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <div style="display:flex;align-items:center;gap:10px">
          <button id="rptBackBtn" onclick="_rptBack()" style="display:none;
            background:none;border:none;color:var(--text-secondary);font-size:18px;
            cursor:pointer;padding:0 4px;line-height:1">&#8592;</button>
          <div>
            <h1 class="page-title" id="rptTitle">Reports &amp; Analytics</h1>
            <p class="page-subtitle" id="rptSubtitle">Export dashboards to PDF, Excel or CSV</p>
          </div>
        </div>
      </div>
      <div class="page-header-actions" id="rptHeaderActions">
        <button class="btn-ghost btn-sm" style="font-size:12px"
                onclick="_rptOpenSchedule()">&#128337; Schedule</button>
      </div>
    </div>

    <!-- Date-range strip (shown in report views) -->
    <div id="rptRangeBar" style="display:none;margin-bottom:16px;
         display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      ${['Today','7d','30d','90d'].map(r => `
        <button class="btn-ghost btn-sm" id="rptR_${r}" style="font-size:11px"
                onclick="_rptSetRange('${r}')">${r === 'Today' ? 'Today' : 'Last '+r}</button>
      `).join('')}
    </div>

    <!-- Export action bar (shown in report views) -->
    <div id="rptExportBar" style="display:none;margin-bottom:20px">
      <div class="export-actions">
        <button class="export-btn" onclick="_rptExport('pdf')">
          &#128196; Export PDF
        </button>
        <button class="export-btn" onclick="_rptExport('excel')">
          &#128202; Export Excel
        </button>
        <button class="export-btn" onclick="_rptExport('csv')">
          &#128196; Export CSV
        </button>
        <button class="export-btn" onclick="_rptExport('json')">
          &#128290; Export JSON
        </button>
      </div>
    </div>

    <!-- Dynamic content area -->
    <div id="rptBody"></div>

    <!-- Schedule modal -->
    <div id="rptSchedModal" style="display:none;position:fixed;inset:0;z-index:1000;
         background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
         align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);width:420px;max-width:95vw">
        <div style="padding:18px 22px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:15px;font-weight:800;color:var(--text-primary)">Schedule Report</span>
          <button class="btn-icon btn-icon-sm" onclick="_rptCloseSchedule()">&times;</button>
        </div>
        <div style="padding:22px;display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Report</label>
            <select id="rptSchedType" style="width:100%;background:var(--bg-card);border:1px solid var(--border);
                    border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;padding:8px 10px;outline:none">
              ${_RPT_CATALOGUE.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Cadence</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              ${['Daily 08:00 AM','Weekly Monday','Monthly 1st','Quarterly'].map(c=>`
                <button class="btn-ghost btn-sm" style="font-size:11px" onclick="this.style.borderColor='var(--primary)'">${c}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Recipients (comma-separated emails)</label>
            <input id="rptSchedEmails" placeholder="cto@corp.io, ops@corp.io"
                   style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);
                          border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;
                          padding:8px 10px;font-family:'Inter',sans-serif;outline:none"/>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px">
            <button class="btn-ghost btn-sm" onclick="_rptCloseSchedule()">Cancel</button>
            <button class="btn-primary btn-sm" onclick="_rptConfirmSchedule()">Save Schedule</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   CATALOGUE VIEW
──────────────────────────────────────────────────────────── */
function _renderCatalogue() {
  _showCatalogueUI();
  document.getElementById('rptBody').innerHTML = `
    <div class="report-grid">
      ${_RPT_CATALOGUE.map(r => `
        <div class="report-card" onclick="_rptOpenReport('${r.id}')">
          <div class="report-icon" style="background:${r.color}1a">
            <span style="font-size:22px">${r.icon}</span>
          </div>
          <div style="flex:1">
            <div class="report-name">${r.name}</div>
            <div class="report-desc">${r.desc}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
              <button class="btn-ghost btn-sm" style="font-size:10px"
                      onclick="event.stopPropagation();_rptExportDirect('${r.id}','csv')">
                &#128196; CSV
              </button>
              <button class="btn-ghost btn-sm" style="font-size:10px"
                      onclick="event.stopPropagation();_rptExportDirect('${r.id}','pdf')">
                &#128196; PDF
              </button>
              <span style="font-size:10px;color:var(--text-muted);margin-left:auto">
                Updated 2h ago
              </span>
            </div>
          </div>
        </div>`).join('')}
    </div>
  `;
}

function _showCatalogueUI() {
  document.getElementById('rptTitle').textContent     = 'Reports & Analytics';
  document.getElementById('rptSubtitle').textContent  = 'Export dashboards to PDF, Excel or CSV';
  document.getElementById('rptBackBtn').style.display = 'none';
  document.getElementById('rptRangeBar').style.display= 'none';
  document.getElementById('rptExportBar').style.display='none';
}

/* ────────────────────────────────────────────────────────────
   OPEN REPORT
──────────────────────────────────────────────────────────── */
function _rptOpenReport(id) {
  _rptCleanup();
  const meta = _RPT_CATALOGUE.find(r => r.id === id);
  if (!meta) return;
  _rptView = id;

  document.getElementById('rptTitle').textContent    = meta.name;
  document.getElementById('rptSubtitle').textContent = meta.desc;
  document.getElementById('rptBackBtn').style.display= 'inline-flex';
  document.getElementById('rptRangeBar').style.display = 'flex';
  document.getElementById('rptExportBar').style.display = 'block';
  _rptHighlightRange();

  if (id === 'executive') { setTimeout(_renderExecutive, 60); }
  else if (id === 'ops')  { setTimeout(_renderOps,       60); }
  else                    { setTimeout(() => _renderGeneric(meta), 60); }
}

function _rptBack() {
  _rptCleanup();
  _rptView = 'catalogue';
  _renderCatalogue();
}

function _rptSetRange(r) {
  _rptRange = r;
  _rptHighlightRange();
  _rptOpenReport(_rptView);
}

function _rptHighlightRange() {
  ['Today','7d','30d','90d'].forEach(r => {
    const btn = document.getElementById(`rptR_${r}`);
    if (btn) btn.classList.toggle('active', r === _rptRange);
  });
}

/* ────────────────────────────────────────────────────────────
   EXECUTIVE DASHBOARD
──────────────────────────────────────────────────────────── */
function _renderExecutive() {
  const days  = _rangeDays();
  const kpis  = [
    { label:'Overall Uptime',  val:'99.72%', delta:'+0.11%', good:true,  icon:'🟢' },
    { label:'Open Incidents',  val:'4',      delta:'-2 vs last',good:true,icon:'🚨' },
    { label:'Patch Compliance',val:'74%',    delta:'+6%',    good:true,  icon:'📦' },
    { label:'Avg MTTR',        val:'38 min', delta:'-12 min',good:true,  icon:'⏱' },
    { label:'Security Score',  val:'81/100', delta:'+3',     good:true,  icon:'🛡️' },
    { label:'Monthly Spend',   val:'$24,180',delta:'+$840',  good:false, icon:'💰' },
  ];

  const incidents = [
    { id:'INC-0041', title:'Production server unreachable',  sev:'critical', dur:'22 min', resolved:false },
    { id:'INC-0040', title:'VPN auth failure — finance team', sev:'high',     dur:'1h 14m', resolved:false },
    { id:'INC-0039', title:'Disk 92% full — SRV-FILES-001',  sev:'medium',   dur:'4h 02m', resolved:true  },
    { id:'INC-0038', title:'AD lockout — 3 senior accounts',  sev:'high',     dur:'38 min', resolved:true  },
    { id:'INC-0037', title:'Backup job failure — overnight',  sev:'medium',   dur:'6h 11m', resolved:true  },
  ];

  const costLabels = ['Compute','Storage','Network','Licences','Support','Other'];
  const costData   = [9200, 4100, 2800, 5400, 1600, 1080];
  const costColors = ['#2563EB','#10B981','#8B5CF6','#F59E0B','#EF4444','#64748B'];

  document.getElementById('rptBody').innerHTML = `
    <!-- KPI grid -->
    <div class="kpi-grid" style="margin-bottom:24px">
      ${kpis.map(k => `
        <div class="chart-card" style="padding:18px 20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);
                         text-transform:uppercase;letter-spacing:0.6px">${k.label}</span>
            <span style="font-size:18px">${k.icon}</span>
          </div>
          <div style="font-size:26px;font-weight:900;color:var(--text-primary);line-height:1">${k.val}</div>
          <div style="font-size:12px;margin-top:6px;color:${k.good?'var(--success)':'var(--danger)'}">
            ${k.delta} vs prev ${days}d
          </div>
        </div>`).join('')}
    </div>

    <!-- Row: infra health ring + cost donut + trend -->
    <div style="display:grid;grid-template-columns:200px 240px 1fr;gap:20px;margin-bottom:24px">

      <!-- Infra health ring -->
      <div class="chart-card" style="display:flex;flex-direction:column;align-items:center;padding:20px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px;align-self:flex-start">
          Infra Health
        </div>
        <svg id="rptHealthRing" width="120" height="120" viewBox="0 0 120 120"
             style="filter:drop-shadow(0 0 10px rgba(16,185,129,0.3))"></svg>
        <div style="margin-top:14px;font-size:12px;color:var(--text-muted);text-align:center">
          296 devices &bull; 4 alerts
        </div>
      </div>

      <!-- Cost doughnut -->
      <div class="chart-card" style="padding:16px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
          Spend Breakdown
        </div>
        <canvas id="rptCostDonut" height="140"></canvas>
      </div>

      <!-- 30-day uptime trend line -->
      <div class="chart-card" style="padding:16px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
          Uptime Trend &mdash; Last ${days} days
        </div>
        <canvas id="rptUptimeTrend" height="120"></canvas>
      </div>
    </div>

    <!-- Row: top incidents + SLA adherence bar chart -->
    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;margin-bottom:24px">

      <!-- Incident table -->
      <div class="chart-card" style="padding:0;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                    font-size:14px;font-weight:700;color:var(--text-primary)">Top Incidents</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="font-size:11px;font-weight:700;color:var(--text-muted);
                       text-transform:uppercase;letter-spacing:0.6px">
              <td style="padding:8px 18px">ID</td>
              <td style="padding:8px 0">Title</td>
              <td style="padding:8px 12px">Severity</td>
              <td style="padding:8px 12px">Duration</td>
              <td style="padding:8px 18px">Status</td>
            </tr>
          </thead>
          <tbody>
            ${incidents.map(i => `
              <tr style="border-top:1px solid rgba(36,48,65,0.4);
                         font-size:13px;color:var(--text-secondary)">
                <td style="padding:10px 18px;font-family:'JetBrains Mono',monospace;
                            font-size:11px;color:var(--primary)">${i.id}</td>
                <td style="padding:10px 0;color:var(--text-primary);font-weight:500">${i.title}</td>
                <td style="padding:10px 12px">
                  <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;
                    background:${_rptSevBg(i.sev)};color:${_rptSevColor(i.sev)}">${i.sev}</span>
                </td>
                <td style="padding:10px 12px;font-family:'JetBrains Mono',monospace;font-size:12px">${i.dur}</td>
                <td style="padding:10px 18px">
                  ${i.resolved
                    ? '<span style="font-size:11px;color:var(--success)">✅ Resolved</span>'
                    : '<span style="font-size:11px;color:var(--danger)">🚨 Open</span>'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- SLA adherence bars -->
      <div class="chart-card" style="padding:16px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:14px">
          SLA Adherence
        </div>
        ${[
          { label:'Email',    pct:99.8, color:'#10B981' },
          { label:'VPN',      pct:97.2, color:'#2563EB' },
          { label:'ERP',      pct:99.1, color:'#10B981' },
          { label:'Storage',  pct:99.9, color:'#10B981' },
          { label:'Network',  pct:98.6, color:'#2563EB' },
          { label:'Auth',     pct:96.4, color:'#F59E0B' },
        ].map(s => `
          <div class="metric-gauge-row" style="margin-bottom:10px">
            <div class="metric-gauge-label">${s.label}</div>
            <div class="metric-gauge-bar">
              <div class="metric-gauge-fill" style="width:${s.pct}%;background:${s.color}"></div>
            </div>
            <div class="metric-gauge-val" style="color:${s.color}">${s.pct}%</div>
          </div>`).join('')}
      </div>
    </div>
  `;

  /* Draw charts */
  _drawHealthRing('rptHealthRing', 97, '#10B981');
  _drawCostDonut('rptCostDonut', costLabels, costData, costColors);
  _drawUptimeLine('rptUptimeTrend', days);
}

/* ────────────────────────────────────────────────────────────
   OPERATIONS REPORT
──────────────────────────────────────────────────────────── */
function _renderOps() {
  const days = _rangeDays();
  const mtrrData = [
    { label:'Critical', mttr:'24 min', mtbf:'14.2 days', color:'#EF4444' },
    { label:'High',     mttr:'1h 08m', mtbf:'9.6 days',  color:'#F59E0B' },
    { label:'Medium',   mttr:'3h 41m', mtbf:'6.1 days',  color:'#8B5CF6' },
    { label:'Low',      mttr:'11h 20m',mtbf:'3.8 days',  color:'#2563EB' },
  ];

  const devices = ['SRV-PROD-001','SRV-PROD-003','WIN-IT-042','LNX-DEV-088','MAC-HR-011'];
  const heatDays = 7;
  const heatmap = devices.map(d => Array.from({length:heatDays}, () =>
    Math.random() < 0.08 ? Math.floor(Math.random()*60)+1 : 0
  ));

  document.getElementById('rptBody').innerHTML = `
    <!-- MTTR / MTBF row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      ${mtrrData.map(m => `
        <div class="chart-card" style="padding:16px">
          <div style="width:8px;height:8px;border-radius:50%;background:${m.color};margin-bottom:8px"></div>
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">${m.label}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">MTTR</div>
          <div style="font-size:20px;font-weight:900;color:${m.color}">${m.mttr}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;margin-bottom:2px">MTBF</div>
          <div style="font-size:14px;font-weight:700;color:var(--text-secondary)">${m.mtbf}</div>
        </div>`).join('')}
    </div>

    <!-- Row: alert volume bar + capacity gauges -->
    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;margin-bottom:24px">
      <div class="chart-card" style="padding:16px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px">
          Alert Volume &mdash; Last ${days} days
        </div>
        <canvas id="rptAlertBar" height="140"></canvas>
      </div>
      <div class="chart-card" style="padding:16px">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:14px">
          Resource Capacity
        </div>
        ${[
          { label:'CPU',     pct:67, color:'#2563EB' },
          { label:'RAM',     pct:81, color:'#F59E0B' },
          { label:'Storage', pct:73, color:'#8B5CF6' },
          { label:'Network', pct:44, color:'#10B981' },
          { label:'GPU',     pct:29, color:'#10B981' },
        ].map(g => `
          <div class="metric-gauge-row" style="margin-bottom:12px">
            <div class="metric-gauge-label">${g.label}</div>
            <div class="metric-gauge-bar">
              <div class="metric-gauge-fill"
                   style="width:${g.pct}%;background:${g.pct>80?'var(--danger)':g.pct>65?'var(--warning)':g.color}"></div>
            </div>
            <div class="metric-gauge-val"
                 style="color:${g.pct>80?'var(--danger)':g.pct>65?'var(--warning)':g.color}">${g.pct}%</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Uptime heatmap -->
    <div class="chart-card" style="padding:16px;margin-bottom:24px;overflow-x:auto">
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:14px">
        7-Day Uptime Heatmap
      </div>
      <div style="display:grid;grid-template-columns:140px repeat(${heatDays},1fr);gap:4px;min-width:500px">
        <div></div>
        ${Array.from({length:heatDays},(_,i)=>{
          const d=new Date(Date.now()-(heatDays-1-i)*86400000);
          return `<div style="font-size:10px;font-weight:700;color:var(--text-muted);
                             text-align:center;padding-bottom:4px">${d.toLocaleDateString('en',{weekday:'short'})}</div>`;
        }).join('')}
        ${devices.map((dev,di)=>`
          <div style="font-size:11px;color:var(--text-secondary);padding:6px 0;
                      font-family:'JetBrains Mono',monospace;font-size:10px">${dev}</div>
          ${heatmap[di].map(downMin=>{
            const good = downMin === 0;
            const bg   = good ? 'rgba(16,185,129,0.25)' :
                         downMin < 15 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.5)';
            const tip  = good ? '100% up' : `${downMin}m down`;
            return `<div title="${tip}" style="background:${bg};border-radius:4px;height:28px;
                              border:1px solid rgba(255,255,255,0.04);
                              display:flex;align-items:center;justify-content:center">
                      ${!good?`<span style="font-size:9px;color:rgba(255,255,255,0.6)">${downMin}m</span>`:''}
                    </div>`;
          }).join('')}`).join('')}
      </div>
      <div style="display:flex;gap:12px;margin-top:12px;font-size:11px;color:var(--text-muted)">
        <span style="display:flex;align-items:center;gap:5px">
          <span style="width:12px;height:12px;background:rgba(16,185,129,0.25);border-radius:3px;display:inline-block"></span> 100% up
        </span>
        <span style="display:flex;align-items:center;gap:5px">
          <span style="width:12px;height:12px;background:rgba(245,158,11,0.4);border-radius:3px;display:inline-block"></span> &lt;15 min down
        </span>
        <span style="display:flex;align-items:center;gap:5px">
          <span style="width:12px;height:12px;background:rgba(239,68,68,0.5);border-radius:3px;display:inline-block"></span> &gt;15 min down
        </span>
      </div>
    </div>

    <!-- Response-time trend line -->
    <div class="chart-card" style="padding:16px">
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">
        Avg Response Time &mdash; Last ${days} days (ms)
      </div>
      <canvas id="rptRttLine" height="100"></canvas>
    </div>
  `;

  _drawAlertBar('rptAlertBar', days);
  _drawRttLine('rptRttLine', days);
}

/* ────────────────────────────────────────────────────────────
   GENERIC REPORT STUB
──────────────────────────────────────────────────────────── */
function _renderGeneric(meta) {
  const days = _rangeDays();
  const rows = _fakeTableRows(meta.id, days);

  document.getElementById('rptBody').innerHTML = `
    <div class="chart-card" style="padding:20px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="width:48px;height:48px;background:${meta.color}1a;
                    border-radius:var(--radius-md);display:flex;align-items:center;
                    justify-content:center;font-size:24px">${meta.icon}</div>
        <div>
          <div style="font-size:16px;font-weight:800;color:var(--text-primary)">${meta.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${meta.desc}</div>
        </div>
      </div>
      <canvas id="rptGenChart" height="120"></canvas>
    </div>
    <div class="chart-card" style="padding:0;overflow:hidden">
      <div style="padding:12px 18px;border-bottom:1px solid var(--border);
                  font-size:13px;font-weight:700;color:var(--text-primary)">
        Data Table &mdash; Last ${days} days
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:rgba(255,255,255,0.03)">
              ${rows.headers.map(h=>`<th style="padding:10px 16px;text-align:left;
                font-size:11px;font-weight:700;color:var(--text-muted);
                text-transform:uppercase;letter-spacing:0.5px">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.data.map(row=>`
              <tr style="border-top:1px solid rgba(36,48,65,0.4);color:var(--text-secondary)">
                ${row.map(cell=>`<td style="padding:10px 16px">${cell}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  _drawGenericLine('rptGenChart', meta.color, days);
}

/* ────────────────────────────────────────────────────────────
   CHART DRAW HELPERS
──────────────────────────────────────────────────────────── */
function _chartDefaults() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,18,32,0.92)',
        borderColor: 'rgba(255,255,255,0.08)', borderWidth:1,
        titleColor:'#F8FAFC', bodyColor:'#94A3B8', padding:10,
      },
    },
    scales: {
      x: { grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#64748B' } },
      y: { grid:{ color:'rgba(255,255,255,0.04)' }, ticks:{ color:'#64748B' } },
    },
  };
}

function _mkChart(id, config) {
  const el = document.getElementById(id);
  if (!el) return;
  const c = new Chart(el.getContext('2d'), config);
  _rptCharts.push(c);
  return c;
}

function _rangeDays() {
  return _rptRange === 'Today' ? 1 : parseInt(_rptRange) || 30;
}

function _genLabels(days) {
  return Array.from({length: Math.min(days, 30)}, (_,i) => {
    const d = new Date(Date.now() - (Math.min(days,30)-1-i)*86400000);
    return days <= 7 ? d.toLocaleDateString('en',{weekday:'short'})
                     : (i % Math.ceil(days/10) === 0 ? `${d.getDate()}/${d.getMonth()+1}` : '');
  });
}

function _drawHealthRing(svgId, pct, color) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const r=50, cx=60, cy=60, circ=2*Math.PI*r;
  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
            stroke-linecap="round" stroke-dasharray="${circ}"
            stroke-dashoffset="${circ*(1-pct/100)}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy-4}" text-anchor="middle" fill="${color}" font-size="22" font-weight="900"
          font-family="'Inter',sans-serif">${pct}%</text>
    <text x="${cx}" y="${cy+14}" text-anchor="middle" fill="#64748B" font-size="11"
          font-family="'Inter',sans-serif">healthy</text>`;
}

function _drawCostDonut(id, labels, data, colors) {
  _mkChart(id, {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors, borderColor:'var(--bg-card)', borderWidth:3 }] },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'65%',
      plugins:{
        legend:{ display:true, position:'right',
          labels:{ color:'#94A3B8', font:{size:10}, boxWidth:10, padding:8 } },
        tooltip:{
          backgroundColor:'rgba(11,18,32,0.92)', borderColor:'rgba(255,255,255,0.08)',
          borderWidth:1, titleColor:'#F8FAFC', bodyColor:'#94A3B8', padding:10,
          callbacks:{ label: ctx=>`$${ctx.parsed.toLocaleString()}` },
        },
      },
    },
  });
}

function _drawUptimeLine(id, days) {
  const labels = _genLabels(days);
  const data   = labels.map(() => 99 + Math.random() * 0.95);
  _mkChart(id, {
    type:'line',
    data:{ labels, datasets:[{
      data, borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.07)',
      borderWidth:2, pointRadius:0, fill:true, tension:0.4,
    }]},
    options:{ ...(_chartDefaults()), scales:{
      x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#64748B'} },
      y: { min:98.5, max:100, grid:{color:'rgba(255,255,255,0.04)'},
           ticks:{ callback:v=>`${v.toFixed(1)}%`, color:'#64748B' } },
    }},
  });
}

function _drawAlertBar(id, days) {
  const labels = _genLabels(days);
  const crit   = labels.map(() => Math.floor(Math.random()*3));
  const high   = labels.map(() => Math.floor(Math.random()*6)+1);
  const med    = labels.map(() => Math.floor(Math.random()*8)+2);
  _mkChart(id, {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Critical', data:crit, backgroundColor:'#EF4444', stack:'a', borderRadius:2 },
      { label:'High',     data:high, backgroundColor:'#F59E0B', stack:'a', borderRadius:0 },
      { label:'Medium',   data:med,  backgroundColor:'#8B5CF6', stack:'a', borderRadius:0 },
    ]},
    options:{ ...(_chartDefaults()),
      plugins:{ legend:{ display:true, labels:{color:'#94A3B8',font:{size:10},boxWidth:10} },
        tooltip:{ backgroundColor:'rgba(11,18,32,0.92)', borderColor:'rgba(255,255,255,0.08)',
          borderWidth:1, titleColor:'#F8FAFC', bodyColor:'#94A3B8', padding:10 } },
      scales:{ x:{ stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#64748B'} },
               y:{ stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#64748B'} } },
    },
  });
}

function _drawRttLine(id, days) {
  const labels = _genLabels(days);
  const data   = labels.map(() => Math.round(80 + Math.random()*140));
  _mkChart(id, {
    type:'line',
    data:{ labels, datasets:[{
      data, borderColor:'#2563EB', backgroundColor:'rgba(37,99,235,0.07)',
      borderWidth:2, pointRadius:0, fill:true, tension:0.4,
    }]},
    options:{ ...(_chartDefaults()),
      scales:{
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#64748B'} },
        y: { grid:{color:'rgba(255,255,255,0.04)'},
             ticks:{ callback:v=>`${v}ms`, color:'#64748B' } },
      },
    },
  });
}

function _drawGenericLine(id, color, days) {
  const labels = _genLabels(days);
  const data   = labels.map(() => Math.round(40 + Math.random()*55));
  _mkChart(id, {
    type:'line',
    data:{ labels, datasets:[{
      data, borderColor:color, backgroundColor:`${color}11`,
      borderWidth:2, pointRadius:0, fill:true, tension:0.4,
    }]},
    options:{ ...(_chartDefaults()) },
  });
}

/* ────────────────────────────────────────────────────────────
   FAKE TABLE DATA
──────────────────────────────────────────────────────────── */
function _fakeTableRows(reportId, days) {
  const schemas = {
    security : { headers:['Date','Threat','Severity','Device','Status'],
      rows:[['2026-06-01','Malware Detected','Critical','WIN-IT-042','Resolved'],
            ['2026-06-01','Brute-Force SSH','High','SRV-PROD-003','Investigating'],
            ['2026-05-31','DNS C2 Query','Medium','MAC-HR-011','Blocked'],
            ['2026-05-30','Priv Escalation','Medium','WIN-FIN-019','Resolved'],
            ['2026-05-29','MFA Bypass','Low','WIN-IT-042','Resolved']] },
    uptime   : { headers:['Service','Uptime %','Downtime','SLA Target','Status'],
      rows:[['Email (Exchange)','99.82%','1h 26m','99.9%','⚠️ Below'],
            ['VPN Gateway','99.71%','2h 3m','99.5%','✅ Met'],
            ['ERP (SAP)','99.91%','38m','99.0%','✅ Met'],
            ['File Server','100%','0m','99.5%','✅ Met'],
            ['Auth (AD)','99.64%','2h 35m','99.9%','⚠️ Below']] },
    patch    : { headers:['KB Number','Title','Severity','Compliance','Ring'],
      rows:[['KB5034441','June 2026 Cumulative','Critical','14%','Canary'],
            ['KB5033920','Defender Definitions','Security','64%','Production'],
            ['KB5032009','.NET Security Patch','Security','38%','Staging'],
            ['KB5031364','Win 11 Quality Update','Optional','0%','Pilot'],
            ['KB5029263','Azure AD Connect','Security','100%','Production']] },
    helpdesk : { headers:['Agent','Open','Resolved','Avg MTTR','SLA %'],
      rows:[['Priya Sharma','3','41','28m','97.6%'],
            ['Rohan Mehta','2','38','34m','95.2%'],
            ['Anita Gupta','1','44','22m','98.9%'],
            ['Dev Patel','2','36','41m','94.8%']] },
    cost     : { headers:['Category','Budget','Actual','Variance','Status'],
      rows:[['Compute','$9,500','$9,200','-$300','✅ Under'],
            ['Storage','$4,000','$4,100','+$100','⚠️ Over'],
            ['Licences','$5,000','$5,400','+$400','🚨 Over'],
            ['Network','$2,500','$2,800','+$300','⚠️ Over'],
            ['Support','$1,800','$1,600','-$200','✅ Under']] },
    capacity : { headers:['Resource','Current','Trend','Runway','Action'],
      rows:[['CPU (avg)','67%','↑ +4%/mo','8 months','Monitor'],
            ['RAM (avg)','81%','↑ +6%/mo','3 months','⚠ Scale soon'],
            ['Storage','73%','↑ +3%/mo','11 months','Monitor'],
            ['GPU','29%','→ Flat','N/A','Idle'],
            ['Network BW','44%','↑ +2%/mo','18 months','OK']] },
  };
  return schemas[reportId] || {
    headers: ['Date','Metric','Value'],
    rows: Array.from({length:5},(_,i) => {
      const d = new Date(Date.now()-i*86400000);
      return [`${d.getDate()}/${d.getMonth()+1}`, 'Measure', Math.round(Math.random()*100)];
    }),
  };
}

/* ────────────────────────────────────────────────────────────
   EXPORT ENGINE
──────────────────────────────────────────────────────────── */
function _rptExport(fmt) { _doExport(_rptView, fmt); }
function _rptExportDirect(id, fmt) { _doExport(id, fmt); }

function _doExport(reportId, fmt) {
  const meta = _RPT_CATALOGUE.find(r => r.id === reportId) ||
               { name: reportId, id: reportId };
  const rows = _fakeTableRows(reportId, _rangeDays());
  const ts   = new Date().toISOString().slice(0,16).replace('T','_').replace(':','-');
  const name = `infradesk_${reportId}_${ts}`;

  if (fmt === 'csv') {
    const lines = [
      `# InfraDesk — ${meta.name}`,
      `# Generated: ${new Date().toISOString()}`,
      `# Range: Last ${_rangeDays()} days`,
      '',
      rows.headers.join(','),
      ...rows.data.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')),
    ];
    _downloadBlob(lines.join('\n'), `${name}.csv`, 'text/csv');
    _rptToast('\u2b07 CSV exported');

  } else if (fmt === 'excel') {
    /* Tab-separated (opens natively in Excel / LibreOffice) */
    const lines = [
      rows.headers.join('\t'),
      ...rows.data.map(r => r.join('\t')),
    ];
    _downloadBlob(lines.join('\n'), `${name}.tsv`,
      'application/vnd.ms-excel');
    _rptToast('\u2b07 Excel file exported');

  } else if (fmt === 'json') {
    const obj = {
      report    : meta.name,
      generated : new Date().toISOString(),
      range     : `Last ${_rangeDays()} days`,
      data      : rows.data.map(row => Object.fromEntries(
                    rows.headers.map((h,i) => [h, row[i]])
                  )),
    };
    _downloadBlob(JSON.stringify(obj, null, 2), `${name}.json`, 'application/json');
    _rptToast('\u2b07 JSON exported');

  } else if (fmt === 'pdf') {
    /* Inject a minimal print stylesheet + trigger print dialog */
    const style = document.createElement('style');
    style.id    = '__rptPrintStyle';
    style.textContent = `
      @media print {
        body > *:not(#app) { display:none !important; }
        #app > *:not(#mainContent) { display:none !important; }
        #mainContent { padding:0 !important; }
        .page-header-actions, #rptExportBar, #rptRangeBar,
        #rptBackBtn, .export-actions { display:none !important; }
        .chart-card, .report-card { break-inside:avoid; }
        body { background:#fff !important; color:#111 !important; }
      }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById('__rptPrintStyle');
      if (el) el.remove();
    }, 2000);
    _rptToast('\u2b07 PDF — print dialog opened');
  }
}

function _downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ────────────────────────────────────────────────────────────
   SCHEDULE MODAL
──────────────────────────────────────────────────────────── */
function _rptOpenSchedule() {
  const m = document.getElementById('rptSchedModal');
  if (m) m.style.display = 'flex';
}
function _rptCloseSchedule() {
  const m = document.getElementById('rptSchedModal');
  if (m) m.style.display = 'none';
}
function _rptConfirmSchedule() {
  const emails = document.getElementById('rptSchedEmails')?.value.trim();
  if (!emails) { _rptToast('\u26a0 Enter at least one recipient email'); return; }
  _rptCloseSchedule();
  _rptToast(`\u2705 Report scheduled — will be sent to ${emails.split(',')[0].trim()}`);
}

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────── */
function _rptSevBg(sev) {
  return sev==='critical'?'rgba(239,68,68,0.15)':sev==='high'?'rgba(245,158,11,0.15)':'rgba(139,92,246,0.15)';
}
function _rptSevColor(sev) {
  return sev==='critical'?'var(--danger)':sev==='high'?'var(--warning)':'#A78BFA';
}

function _rptToast(msg) {
  const existing = document.querySelectorAll('._rptToast');
  const offset   = existing.length * 54;
  const t = document.createElement('div');
  t.className = '_rptToast';
  t.style.cssText = `position:fixed;bottom:${28+offset}px;right:24px;
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-md);padding:10px 18px;
    font-size:13px;color:var(--text-primary);min-width:240px;
    box-shadow:var(--shadow-lg);z-index:9999;white-space:nowrap`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity='0'; t.style.transition='opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ────────────────────────────────────────────────────────────
   EXPOSE
──────────────────────────────────────────────────────────── */
window.renderReportsPage   = renderReportsPage;
window._rptOpenReport      = _rptOpenReport;
window._rptBack            = _rptBack;
window._rptSetRange        = _rptSetRange;
window._rptExport          = _rptExport;
window._rptExportDirect    = _rptExportDirect;
window._rptOpenSchedule    = _rptOpenSchedule;
window._rptCloseSchedule   = _rptCloseSchedule;
window._rptConfirmSchedule = _rptConfirmSchedule;
