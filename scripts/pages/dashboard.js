/* ============================================================
   InfraDesk Remote — scripts/pages/dashboard.js
   Covers: KPI cards, Chart.js charts (Device Health donut,
   Sessions line, Geo distribution bar, Security radar),
   Activity feed, Quick actions, Top devices list
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   MOCK DATA
──────────────────────────────────────────────────────────── */
const DB = {
  kpis: [
    { id: 'totalDevices',    label: 'Total Devices',      value: 1284, delta: +42,   deltaLabel: 'this week',  icon: '🖥️',  color: 'var(--primary)',  bg: 'rgba(37,99,235,0.12)'   },
    { id: 'activeSessions',  label: 'Active Sessions',    value: 38,   delta: +7,    deltaLabel: 'right now',  icon: '🖱️',  color: 'var(--success)',  bg: 'rgba(16,185,129,0.12)'  },
    { id: 'openAlerts',      label: 'Open Alerts',        value: 7,    delta: -3,    deltaLabel: 'since 1h',   icon: '🔔',  color: 'var(--warning)',  bg: 'rgba(245,158,11,0.12)'  },
    { id: 'securityScore',   label: 'Security Score',     value: '94%', delta: +2,   deltaLabel: 'vs last wk', icon: '🛡️',  color: 'var(--success)',  bg: 'rgba(16,185,129,0.12)'  },
  ],

  deviceHealth: {
    labels : ['Healthy', 'Warning', 'Critical', 'Offline'],
    values : [912, 218, 67, 87],
    colors : ['#10B981', '#F59E0B', '#EF4444', '#64748B'],
  },

  sessionsTrend: {
    labels: ['00:00','02:00','04:00','06:00','08:00','10:00','12:00',
             '14:00','16:00','18:00','20:00','22:00'],
    data:   [12, 8, 5, 7, 22, 41, 55, 62, 71, 58, 44, 38],
  },

  geoDistribution: {
    labels: ['North America', 'Europe', 'Asia Pacific', 'South America', 'Middle East', 'Africa'],
    values: [483, 312, 287, 98, 67, 37],
    colors: ['#2563EB', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EF4444'],
  },

  securityRadar: {
    labels: ['Antivirus', 'Firewall', 'Encryption', 'Patching', 'MFA', 'Backup'],
    current:  [92, 88, 95, 76, 89, 83],
    baseline: [85, 80, 80, 70, 75, 75],
  },

  activities: [
    { icon: '🖱️', bg: 'rgba(37,99,235,0.15)',   color: 'var(--primary)', title: 'Remote session started on <strong>WIN-DESKTOP-042</strong>', meta: 'Sarah Connor · IT Support', time: '2m ago'  },
    { icon: '🔧', bg: 'rgba(245,158,11,0.15)',   color: 'var(--warning)', title: 'Patch <strong>KB5034441</strong> deployed to 47 endpoints',   meta: 'Auto Patch Engine',        time: '14m ago' },
    { icon: '🚨', bg: 'rgba(239,68,68,0.15)',    color: 'var(--danger)',  title: 'Critical alert: High CPU on <strong>SRV-PROD-003</strong>',   meta: 'Monitoring Agent',         time: '31m ago' },
    { icon: '👤', bg: 'rgba(16,185,129,0.15)',   color: 'var(--success)', title: 'New user <strong>j.rodriguez@corp.io</strong> provisioned',   meta: 'Admin · John Doe',         time: '1h ago'  },
    { icon: '📁', bg: 'rgba(6,182,212,0.15)',    color: 'var(--info)',    title: 'File transfer completed: <strong>backup_2026.tar.gz</strong>', meta: 'James Park · DevOps',      time: '2h ago'  },
    { icon: '🛡️', bg: 'rgba(139,92,246,0.15)',  color: '#8B5CF6',        title: 'Threat blocked: Suspicious script on <strong>MAC-HR-011</strong>', meta: 'Security Agent',    time: '3h ago'  },
  ],

  quickActions: [
    { icon: '🖱️', label: 'New Session',   page: 'remote'       },
    { icon: '🎫', label: 'New Ticket',    page: 'helpdesk'     },
    { icon: '🔧', label: 'Push Patch',    page: 'patches'      },
    { icon: '📊', label: 'Run Report',    page: 'reports'      },
  ],

  topDevices: [
    { icon: '🖥️', name: 'SRV-PROD-001', meta: 'Windows Server 2022 · Online', cpu: 72, cpuClass: 'resource-med' },
    { icon: '💻', name: 'MAC-HR-011',   meta: 'macOS Sonoma · Online',        cpu: 31, cpuClass: 'resource-low' },
    { icon: '🖥️', name: 'SRV-DB-002',  meta: 'Ubuntu 22.04 · Online',        cpu: 91, cpuClass: 'resource-high'},
    { icon: '💻', name: 'WIN-DEV-088',  meta: 'Windows 11 Pro · Online',      cpu: 44, cpuClass: 'resource-low' },
    { icon: '🖥️', name: 'SRV-WEB-007', meta: 'CentOS 9 · Online',            cpu: 58, cpuClass: 'resource-med' },
  ],
};

/* ────────────────────────────────────────────────────────────
   CHART REGISTRY  (destroy before re-creating to avoid reuse errors)
──────────────────────────────────────────────────────────── */
const _dashCharts = {};

function _destroyDashCharts() {
  Object.keys(_dashCharts).forEach(k => {
    try { _dashCharts[k].destroy(); } catch (_) {}
    delete _dashCharts[k];
  });
}

/* ────────────────────────────────────────────────────────────
   ENTRY POINT — called by app.js routing
──────────────────────────────────────────────────────────── */
function renderDashboardPage(container) {
  _destroyDashCharts();

  container.innerHTML = _buildShell();

  _renderKPIs();
  _renderCharts();
  _renderActivityFeed();
  _renderQuickActions();
  _renderTopDevices();

  // KPI counter animation
  _animateCounters();
}

/* ════════════════════════════════════════════════════════════
   HTML SHELL
   ════════════════════════════════════════════════════════════ */
function _buildShell() {
  return `
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Infrastructure overview — real-time health &amp; activity</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-ghost btn-sm" onclick="renderDashboardPage(document.getElementById('pageContent'))"
                style="display:flex;align-items:center;gap:6px;font-size:13px">
          <span>↺</span> Refresh
        </button>
        <button class="btn-primary btn-sm" onclick="showPage('monitoring',null)"
                style="font-size:13px">
          Live Monitor
        </button>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid" id="kpiGrid"></div>

    <!-- Row 1: Sessions trend (2/3) + Device Health donut (1/3) -->
    <div class="dashboard-grid" style="margin-bottom:20px">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Active Sessions — 24h Trend</div>
            <div class="chart-subtitle">Concurrent remote sessions across all endpoints</div>
          </div>
          <span class="badge badge-info" style="font-size:11px">Live</span>
        </div>
        <div class="chart-wrap" style="height:220px">
          <canvas id="chartSessions"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Device Health</div>
            <div class="chart-subtitle">1,284 managed endpoints</div>
          </div>
        </div>
        <div class="chart-wrap" style="height:160px;display:flex;align-items:center;justify-content:center">
          <canvas id="chartDeviceHealth"></canvas>
        </div>
        <div class="chart-legend" id="deviceHealthLegend"></div>
      </div>
    </div>

    <!-- Row 2: Geo distribution (1/2) + Security radar (1/2) -->
    <div class="dashboard-grid-2" style="margin-bottom:20px">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Geographic Distribution</div>
            <div class="chart-subtitle">Devices by region</div>
          </div>
        </div>
        <div class="chart-wrap" style="height:220px">
          <canvas id="chartGeo"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Security Posture</div>
            <div class="chart-subtitle">Current vs. baseline score (%)</div>
          </div>
        </div>
        <div class="chart-wrap" style="height:220px;display:flex;align-items:center;justify-content:center">
          <canvas id="chartSecurity"></canvas>
        </div>
        <div class="chart-legend">
          <div class="chart-legend-item">
            <div class="chart-legend-dot" style="background:rgba(37,99,235,0.8)"></div>
            Current
          </div>
          <div class="chart-legend-item">
            <div class="chart-legend-dot" style="background:rgba(100,116,139,0.5)"></div>
            Baseline
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Activity Feed + Quick Actions + Top Devices (3-col) -->
    <div class="dashboard-grid-3">
      <!-- Activity Feed -->
      <div class="chart-card" style="grid-column: span 2">
        <div class="chart-header">
          <div>
            <div class="chart-title">Recent Activity</div>
            <div class="chart-subtitle">Last 6 platform events</div>
          </div>
          <button class="btn-ghost btn-sm" onclick="showPage('alerts',null)" style="font-size:12px">View all</button>
        </div>
        <div class="activity-feed" id="activityFeed"></div>
      </div>

      <!-- Quick Actions + Top Devices stacked -->
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Quick Actions</div>
          </div>
          <div class="quick-actions" id="quickActions"></div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Top Active Devices</div>
              <div class="chart-subtitle">By CPU utilization</div>
            </div>
            <button class="btn-ghost btn-sm" onclick="showPage('devices',null)" style="font-size:12px">All devices</button>
          </div>
          <div id="topDevicesList"></div>
        </div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   KPI CARDS
   ════════════════════════════════════════════════════════════ */
function _renderKPIs() {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;

  grid.innerHTML = DB.kpis.map(k => {
    const positive = k.delta >= 0;
    const deltaColor = (k.id === 'openAlerts')
      ? (k.delta < 0 ? 'var(--success)' : 'var(--danger)')   // fewer alerts = good
      : (positive    ? 'var(--success)'  : 'var(--danger)');
    const arrow = positive ? '▲' : '▼';

    return `
      <div class="chart-card kpi-card" style="padding:20px;cursor:default;transition:var(--transition)"
           onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-md)'"
           onmouseleave="this.style.transform='';this.style.boxShadow=''">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
          <div style="width:42px;height:42px;border-radius:var(--radius-md);
                      background:${k.bg};display:flex;align-items:center;
                      justify-content:center;font-size:20px">
            ${k.icon}
          </div>
          <span style="font-size:11px;font-weight:600;color:${deltaColor};
                       background:${deltaColor}22;padding:3px 8px;border-radius:99px;
                       display:flex;align-items:center;gap:3px">
            ${arrow} ${Math.abs(k.delta)}${typeof k.delta === 'number' && !String(k.value).includes('%') ? '' : ''}
          </span>
        </div>
        <div class="kpi-value" data-target="${k.value}"
             style="font-size:30px;font-weight:900;letter-spacing:-1px;
                    color:var(--text-primary);line-height:1;margin-bottom:6px">
          ${k.value}
        </div>
        <div style="font-size:13px;font-weight:500;color:var(--text-secondary)">${k.label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${k.deltaLabel}</div>
      </div>
    `;
  }).join('');
}

function _animateCounters() {
  document.querySelectorAll('.kpi-value[data-target]').forEach(el => {
    const raw = el.dataset.target;
    if (raw.includes('%') || isNaN(+raw)) return; // skip non-numeric
    const end = parseInt(raw, 10);
    const dur = 900;
    const start = performance.now();
    const step = ts => {
      const progress = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(ease * end).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}

/* ════════════════════════════════════════════════════════════
   CHART.JS CHARTS
   ════════════════════════════════════════════════════════════ */

/* ── Shared defaults ─────────────────────────────────────── */
Chart.defaults.color           = '#64748B';
Chart.defaults.font.family     = "'Inter', 'JetBrains Mono', sans-serif";
Chart.defaults.font.size       = 11;
Chart.defaults.plugins.legend.display = false;

function _chartGrid() {
  return {
    color      : 'rgba(36,48,65,0.8)',
    drawBorder : false,
    drawTicks  : false,
  };
}

function _renderCharts() {
  _chartSessions();
  _chartDeviceHealth();
  _chartGeo();
  _chartSecurity();
}

/* ── 1. Sessions 24h line chart ──────────────────────────── */
function _chartSessions() {
  const canvas = document.getElementById('chartSessions');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0,   'rgba(37,99,235,0.28)');
  grad.addColorStop(1,   'rgba(37,99,235,0)');

  _dashCharts.sessions = new Chart(ctx, {
    type: 'line',
    data: {
      labels  : DB.sessionsTrend.labels,
      datasets: [{
        label          : 'Sessions',
        data           : DB.sessionsTrend.data,
        borderColor    : '#2563EB',
        borderWidth    : 2.5,
        backgroundColor: grad,
        fill           : true,
        tension        : 0.42,
        pointRadius    : 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#2563EB',
        pointBorderColor    : 'var(--bg-card)',
        pointBorderWidth    : 2,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      interaction        : { mode: 'index', intersect: false },
      plugins: {
        tooltip: _tooltipStyle(),
      },
      scales: {
        x: {
          grid  : _chartGrid(),
          ticks : { color: '#64748B', maxTicksLimit: 6 },
          border: { display: false },
        },
        y: {
          grid  : _chartGrid(),
          ticks : { color: '#64748B', stepSize: 20 },
          border: { display: false },
          min   : 0,
        },
      },
    },
  });
}

/* ── 2. Device Health doughnut ───────────────────────────── */
function _chartDeviceHealth() {
  const canvas = document.getElementById('chartDeviceHealth');
  if (!canvas) return;

  const { labels, values, colors } = DB.deviceHealth;
  const total = values.reduce((a, b) => a + b, 0);

  // Build legend
  const legend = document.getElementById('deviceHealthLegend');
  if (legend) {
    legend.innerHTML = labels.map((l, i) => `
      <div class="chart-legend-item">
        <div class="chart-legend-dot" style="background:${colors[i]}"></div>
        ${l}
        <span style="margin-left:auto;font-weight:700;color:var(--text-primary)">${values[i]}</span>
      </div>
    `).join('');
    legend.style.flexDirection = 'column';
    legend.style.gap = '6px';
  }

  _dashCharts.deviceHealth = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data            : values,
        backgroundColor : colors,
        borderColor     : 'var(--bg-card)',
        borderWidth     : 3,
        hoverOffset     : 8,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      cutout             : '68%',
      plugins: {
        tooltip: {
          ..._tooltipStyle(),
          callbacks: {
            label: ctx => {
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return `  ${ctx.label}: ${ctx.raw.toLocaleString()} (${pct}%)`;
            },
          },
        },
        // Centre label via afterDraw plugin
        doughnutCentre: {
          text     : total.toLocaleString(),
          subtext  : 'Devices',
        },
      },
    },
    plugins: [{
      id       : 'doughnutCentre',
      afterDraw: chart => {
        const { ctx: c, chartArea: { top, bottom, left, right } } = chart;
        const cx = (left + right) / 2;
        const cy = (top  + bottom) / 2;
        const opts = chart.options.plugins.doughnutCentre;

        c.save();
        c.textAlign    = 'center';
        c.textBaseline = 'middle';

        c.font         = '800 22px Inter, sans-serif';
        c.fillStyle    = '#F9FAFB';
        c.fillText(opts.text, cx, cy - 8);

        c.font         = '500 11px Inter, sans-serif';
        c.fillStyle    = '#64748B';
        c.fillText(opts.subtext, cx, cy + 12);
        c.restore();
      },
    }],
  });
}

/* ── 3. Geographic distribution horizontal bar ───────────── */
function _chartGeo() {
  const canvas = document.getElementById('chartGeo');
  if (!canvas) return;

  const { labels, values, colors } = DB.geoDistribution;

  _dashCharts.geo = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label          : 'Devices',
        data           : values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor    : colors,
        borderWidth    : 1.5,
        borderRadius   : 6,
        borderSkipped  : false,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      indexAxis          : 'y',
      plugins: {
        tooltip: _tooltipStyle(),
      },
      scales: {
        x: {
          grid  : _chartGrid(),
          ticks : { color: '#64748B' },
          border: { display: false },
          min   : 0,
        },
        y: {
          grid  : { display: false },
          ticks : { color: '#94A3B8', font: { size: 12 } },
          border: { display: false },
        },
      },
    },
  });
}

/* ── 4. Security radar ───────────────────────────────────── */
function _chartSecurity() {
  const canvas = document.getElementById('chartSecurity');
  if (!canvas) return;

  const { labels, current, baseline } = DB.securityRadar;

  _dashCharts.security = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label          : 'Current',
          data           : current,
          borderColor    : 'rgba(37,99,235,0.9)',
          backgroundColor: 'rgba(37,99,235,0.18)',
          borderWidth    : 2,
          pointBackgroundColor: '#2563EB',
          pointBorderColor    : 'var(--bg-card)',
          pointRadius         : 4,
          pointHoverRadius    : 6,
        },
        {
          label          : 'Baseline',
          data           : baseline,
          borderColor    : 'rgba(100,116,139,0.5)',
          backgroundColor: 'rgba(100,116,139,0.06)',
          borderWidth    : 1.5,
          borderDash     : [5, 3],
          pointRadius    : 0,
        },
      ],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      plugins: {
        legend : { display: false },
        tooltip: _tooltipStyle(),
      },
      scales: {
        r: {
          min         : 60,
          max         : 100,
          ticks       : { stepSize: 10, color: '#64748B', backdropColor: 'transparent', font: { size: 10 } },
          grid        : { color: 'rgba(36,48,65,0.8)' },
          angleLines  : { color: 'rgba(36,48,65,0.8)' },
          pointLabels : { color: '#94A3B8', font: { size: 11 } },
        },
      },
    },
  });
}

/* ── Shared tooltip style ────────────────────────────────── */
function _tooltipStyle() {
  return {
    backgroundColor : '#1A2332',
    borderColor     : '#243041',
    borderWidth     : 1,
    titleColor      : '#F9FAFB',
    bodyColor       : '#94A3B8',
    padding         : 10,
    cornerRadius    : 8,
    displayColors   : true,
    boxPadding      : 4,
  };
}

/* ════════════════════════════════════════════════════════════
   ACTIVITY FEED
   ════════════════════════════════════════════════════════════ */
function _renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  feed.innerHTML = DB.activities.map(a => `
    <div class="activity-item">
      <div class="activity-icon" style="background:${a.bg};color:${a.color}">${a.icon}</div>
      <div class="activity-body">
        <div class="activity-title">${a.title}</div>
        <div class="activity-meta">${a.meta}</div>
      </div>
      <div class="activity-time">${a.time}</div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════
   QUICK ACTIONS
   ════════════════════════════════════════════════════════════ */
function _renderQuickActions() {
  const wrap = document.getElementById('quickActions');
  if (!wrap) return;

  wrap.innerHTML = DB.quickActions.map(a => `
    <div class="quick-action-btn" onclick="showPage('${a.page}',null)" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' ')showPage('${a.page}',null)">
      <div class="quick-action-icon">${a.icon}</div>
      <div class="quick-action-label">${a.label}</div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════
   TOP DEVICES
   ════════════════════════════════════════════════════════════ */
function _renderTopDevices() {
  const list = document.getElementById('topDevicesList');
  if (!list) return;

  list.innerHTML = DB.topDevices.map(d => `
    <div class="device-list-item">
      <div class="device-list-icon">${d.icon}</div>
      <div class="device-list-info">
        <div class="device-list-name">${d.name}</div>
        <div class="device-list-meta">${d.meta}</div>
      </div>
      <div class="${d.cpuClass} resource-bar-wrap">
        <div class="resource-bar-val" style="font-size:12px;font-weight:700">${d.cpu}%</div>
        <div class="resource-bar" style="width:64px">
          <div class="resource-bar-fill" style="width:${d.cpu}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ────────────────────────────────────────────────────────────
   EXPOSE to global scope (app.js routing calls window.renderDashboardPage)
──────────────────────────────────────────────────────────── */
window.renderDashboardPage = renderDashboardPage;
