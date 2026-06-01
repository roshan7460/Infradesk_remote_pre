/* ============================================================
   InfraDesk Remote — scripts/pages/monitoring.js
   Covers:
     • 4 KPI metric cards (CPU / RAM / Disk / Network)
       each with a 60-point live sparkline chart and
       dashed threshold line
     • 2 expanded Chart.js line charts:
         – CPU & RAM history (dual-axis, last 60 s)
         – Network I/O throughput (last 60 s)
     • Alert Threshold Rules CRUD panel
     • Live data simulation via setInterval (1 s tick)
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   CHART REGISTRY  (destroy-safe, mirrors dashboard.js pattern)
──────────────────────────────────────────────────────────────*/
const _monCharts = {};

function _monDestroyAll() {
  Object.keys(_monCharts).forEach(k => {
    try { _monCharts[k].destroy(); } catch (_) {}
    delete _monCharts[k];
  });
  clearInterval(_monTickId);
  _monTickId = null;
}

let _monTickId = null;

/* ────────────────────────────────────────────────────────────
   LIVE DATA STATE  (ring-buffer, 60 points each)
──────────────────────────────────────────────────────────────*/
const BUF = 60;

const _monState = {
  cpu     : { val: 42, buf: [], threshold: 80,  unit: '%',    label: 'CPU',     icon: '🖥️',  color: '#2563EB', danger: '#EF4444' },
  ram     : { val: 68, buf: [], threshold: 85,  unit: '%',    label: 'RAM',     icon: '🧠',  color: '#10B981', danger: '#F59E0B' },
  disk    : { val: 54, buf: [], threshold: 90,  unit: '%',    label: 'Disk I/O',icon: '💾',  color: '#8B5CF6', danger: '#EF4444' },
  network : { val: 38, buf: [], threshold: 100, unit: 'Mb/s', label: 'Network', icon: '🌐',  color: '#F59E0B', danger: '#EF4444' },
};

// Pre-fill buffers with plausible history
(function _seed() {
  Object.values(_monState).forEach(m => {
    for (let i = 0; i < BUF; i++) {
      m.buf.push(Math.max(0, m.val + Math.round((Math.random()-0.5)*20)));
    }
  });
})();

/* time-labels: "–59s" … "now" */
function _timeLabels() {
  return Array.from({length: BUF}, (_, i) => i === BUF-1 ? 'now' : `-${BUF-1-i}s`);
}

/* push one new value into ring buffer, keep length = BUF */
function _push(metric, newVal) {
  metric.buf.push(newVal);
  if (metric.buf.length > BUF) metric.buf.shift();
  metric.val = newVal;
}

/* jitter helper */
function _jitter(v, lo, hi, sigma=6) {
  return Math.min(hi, Math.max(lo, v + Math.round((Math.random()-0.5)*sigma*2)));
}

/* ────────────────────────────────────────────────────────────
   ALERT RULE DATA
──────────────────────────────────────────────────────────────*/
let _monRules = [
  { id:1, metric:'cpu',     op:'>',  threshold:80,  severity:'critical', notify:'email,slack', enabled:true  },
  { id:2, metric:'ram',     op:'>',  threshold:85,  severity:'warning',  notify:'email',       enabled:true  },
  { id:3, metric:'disk',    op:'>',  threshold:90,  severity:'critical', notify:'email,slack', enabled:true  },
  { id:4, metric:'network', op:'>',  threshold:100, severity:'info',     notify:'slack',       enabled:false },
  { id:5, metric:'cpu',     op:'>',  threshold:95,  severity:'critical', notify:'pagerduty',   enabled:true  },
];
let _monNextRuleId = 6;

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────────*/
function renderMonitoringPage(container) {
  _monDestroyAll();

  Chart.defaults.color         = '#64748B';
  Chart.defaults.font.family   = "'Inter', 'JetBrains Mono', sans-serif";
  Chart.defaults.font.size     = 11;
  Chart.defaults.plugins.legend.display = true;

  container.innerHTML = _buildMonHtml();
  setTimeout(() => {
    _buildSparklines();
    _buildExpandedCharts();
    _renderRulesTable();
    _monStartTick();
  }, 60);
}

/* ────────────────────────────────────────────────────────────
   HTML SHELL
──────────────────────────────────────────────────────────────*/
function _buildMonHtml() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Monitoring Center</h1>
        <p class="page-subtitle">Real-time infrastructure metrics across all managed endpoints</p>
      </div>
      <div class="page-header-actions">
        <span class="badge badge-online" style="font-size:12px">
          <span class="badge-dot"></span>Live · 1s refresh
        </span>
        <button class="btn-ghost btn-sm" style="font-size:12px" onclick="_monPauseToggle()" id="monPauseBtn">
          ⏸ Pause
        </button>
        <button class="btn-secondary btn-sm" style="font-size:12px" onclick="_monExport()">
          ⬇ Export CSV
        </button>
      </div>
    </div>

    <!-- ── KPI METRIC CARDS ────────────────────────────────── -->
    <div class="monitoring-grid" id="monMetricGrid">

      ${['cpu','ram','disk','network'].map(k => {
        const m = _monState[k];
        return `
        <div class="monitor-card" id="monCard_${k}">
          <div class="monitor-card-top">
            <div class="monitor-metric-name">
              <span class="monitor-metric-icon">${m.icon}</span>
              ${m.label}
            </div>
            <span class="badge" id="monBadge_${k}" style="font-size:10px">—</span>
          </div>
          <div>
            <span class="monitor-metric-val" id="monVal_${k}">${m.val}</span>
            <span class="monitor-metric-unit">${m.unit}</span>
          </div>
          <div class="monitor-metric-sub" id="monSub_${k}">Loading…</div>
          <div class="monitor-chart" id="monSparkWrap_${k}">
            <canvas id="monSpark_${k}" height="60"></canvas>
            <div class="monitor-threshold-line"
                 id="monThreshLine_${k}" style="bottom:${_threshPct(m)}%"></div>
            <div class="monitor-threshold-label"
                 id="monThreshLbl_${k}" style="bottom:${_threshPct(m)}%">
              ${m.threshold}${m.unit}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- ── EXPANDED CHARTS ─────────────────────────────────── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px" id="monChartsRow">

      <!-- CPU & RAM history -->
      <div class="monitor-card" style="height:260px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:13px;font-weight:700;color:var(--text-primary)">CPU & RAM — Last 60s</div>
          <div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted)">
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:2px;background:#2563EB;display:inline-block;border-radius:99px"></span>CPU
            </span>
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:2px;background:#10B981;display:inline-block;border-radius:99px"></span>RAM
            </span>
          </div>
        </div>
        <canvas id="monChartCpuRam" style="max-height:180px"></canvas>
      </div>

      <!-- Network I/O -->
      <div class="monitor-card" style="height:260px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:13px;font-weight:700;color:var(--text-primary)">Network I/O — Last 60s</div>
          <div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted)">
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:2px;background:#F59E0B;display:inline-block;border-radius:99px"></span>In
            </span>
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:2px;background:#8B5CF6;display:inline-block;border-radius:99px"></span>Out
            </span>
          </div>
        </div>
        <canvas id="monChartNet" style="max-height:180px"></canvas>
      </div>
    </div>

    <!-- ── ALERT THRESHOLD RULES ───────────────────────────── -->
    <div class="card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);
                  display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--text-primary)">Alert Threshold Rules</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
            Trigger notifications when metrics exceed defined thresholds
          </div>
        </div>
        <button class="btn-primary btn-sm" style="font-size:12px" onclick="_monAddRuleDialog()">
          + Add Rule
        </button>
      </div>
      <div id="monRulesTable"></div>
    </div>

    <!-- ── TOP DEVICES TABLE ───────────────────────────────── -->
    <div style="margin-top:24px;background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-lg);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary)">Top Devices by CPU Load</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            ${['Device','OS','CPU %','RAM %','Disk %','Net Mb/s','Status'].map(h=>
              `<th style="padding:10px 16px;text-align:left;font-size:11px;
                          font-weight:600;color:var(--text-muted)">${h}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody id="monDevTable">
          ${_topDevicesRows()}
        </tbody>
      </table>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   SPARKLINE CHARTS  (one per metric card)
──────────────────────────────────────────────────────────────*/
function _sparkCfg(m, labels) {
  const hi = m.threshold + 20;
  return {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data              : [...m.buf],
        borderColor       : m.color,
        borderWidth       : 1.5,
        pointRadius       : 0,
        tension           : 0.4,
        fill              : true,
        backgroundColor   : _hexAlpha(m.color, 0.12),
      }],
    },
    options: {
      responsive        : true,
      maintainAspectRatio: false,
      animation         : { duration: 0 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x : { display: false },
        y : { display: false, min: 0, max: hi, suggestedMax: hi },
      },
    },
  };
}

function _buildSparklines() {
  const labels = _timeLabels();
  ['cpu','ram','disk','network'].forEach(k => {
    const canvas = document.getElementById(`monSpark_${k}`);
    if (!canvas) return;
    canvas.parentElement.style.height = '60px';
    _monCharts[`spark_${k}`] = new Chart(canvas.getContext('2d'), _sparkCfg(_monState[k], labels));
    _updateKpiCard(k);
  });
}

/* ────────────────────────────────────────────────────────────
   EXPANDED CHARTS
──────────────────────────────────────────────────────────────*/
function _buildExpandedCharts() {
  const labels   = _timeLabels();
  const baseOpts = {
    responsive        : true,
    maintainAspectRatio: false,
    animation         : { duration: 300 },
    interaction       : { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor : 'rgba(11,18,32,0.92)',
        borderColor     : 'rgba(255,255,255,0.08)',
        borderWidth     : 1,
        titleColor      : '#F8FAFC',
        bodyColor       : '#94A3B8',
        padding         : 10,
      },
    },
    scales: {
      x: {
        grid  : { color: 'rgba(255,255,255,0.04)' },
        ticks : { maxTicksLimit: 8, color: '#64748B' },
      },
      y: {
        min  : 0,
        max  : 100,
        grid : { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748B', callback: v => v + '%' },
      },
    },
  };

  /* CPU & RAM */
  const cpuRamCanvas = document.getElementById('monChartCpuRam');
  if (cpuRamCanvas) {
    _monCharts.cpuRam = new Chart(cpuRamCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label           : 'CPU %',
            data            : [..._monState.cpu.buf],
            borderColor     : '#2563EB',
            backgroundColor : _hexAlpha('#2563EB', 0.10),
            borderWidth     : 2,
            pointRadius     : 0,
            tension         : 0.4,
            fill            : true,
          },
          {
            label           : 'RAM %',
            data            : [..._monState.ram.buf],
            borderColor     : '#10B981',
            backgroundColor : _hexAlpha('#10B981', 0.10),
            borderWidth     : 2,
            pointRadius     : 0,
            tension         : 0.4,
            fill            : true,
          },
        ],
      },
      options: baseOpts,
    });
  }

  /* Network I/O — separate Y axis (Mb/s) */
  const netCanvas = document.getElementById('monChartNet');
  if (netCanvas) {
    const netOpts = JSON.parse(JSON.stringify(baseOpts));
    netOpts.scales.y.max = 120;
    netOpts.scales.y.ticks = { color: '#64748B', callback: v => v + ' Mb/s' };

    /* Generate an "out" buffer slightly different from "in" */
    const outBuf = _monState.network.buf.map(v =>
      Math.max(0, v - 8 + Math.round((Math.random()-0.5)*10))
    );

    _monCharts.net = new Chart(netCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label           : 'In Mb/s',
            data            : [..._monState.network.buf],
            borderColor     : '#F59E0B',
            backgroundColor : _hexAlpha('#F59E0B', 0.10),
            borderWidth     : 2,
            pointRadius     : 0,
            tension         : 0.4,
            fill            : true,
          },
          {
            label           : 'Out Mb/s',
            data            : outBuf,
            borderColor     : '#8B5CF6',
            backgroundColor : _hexAlpha('#8B5CF6', 0.10),
            borderWidth     : 2,
            pointRadius     : 0,
            tension         : 0.4,
            fill            : true,
          },
        ],
      },
      options: netOpts,
    });
    /* store out buffer separately for live updates */
    _monState._netOut = outBuf;
  }
}

/* ────────────────────────────────────────────────────────────
   LIVE TICK  (1 s)
──────────────────────────────────────────────────────────────*/
let _monPaused = false;

function _monStartTick() {
  _monTickId = setInterval(_monTick, 1000);
}

function _monPauseToggle() {
  _monPaused = !_monPaused;
  const btn = document.getElementById('monPauseBtn');
  if (btn) btn.innerHTML = _monPaused ? '▶ Resume' : '⏸ Pause';
}

function _monTick() {
  if (_monPaused) return;

  /* Generate new values */
  _push(_monState.cpu,     _jitter(_monState.cpu.val,     0, 100, 5));
  _push(_monState.ram,     _jitter(_monState.ram.val,     20, 98,  3));
  _push(_monState.disk,    _jitter(_monState.disk.val,    0, 100, 4));
  _push(_monState.network, _jitter(_monState.network.val, 0, 110, 7));

  const labels = _timeLabels();

  /* Update each sparkline */
  ['cpu','ram','disk','network'].forEach(k => {
    const ch = _monCharts[`spark_${k}`];
    if (ch) {
      ch.data.labels          = labels;
      ch.data.datasets[0].data = [..._monState[k].buf];
      ch.update('none');
    }
    _updateKpiCard(k);
  });

  /* Update expanded CPU/RAM chart */
  const cr = _monCharts.cpuRam;
  if (cr) {
    cr.data.labels              = labels;
    cr.data.datasets[0].data    = [..._monState.cpu.buf];
    cr.data.datasets[1].data    = [..._monState.ram.buf];
    cr.update('none');
  }

  /* Update expanded network chart */
  const net = _monCharts.net;
  if (net && _monState._netOut) {
    const newOut = Math.max(0, _monState.network.val - 8 + Math.round((Math.random()-0.5)*10));
    _monState._netOut.push(newOut);
    if (_monState._netOut.length > BUF) _monState._netOut.shift();
    net.data.labels              = labels;
    net.data.datasets[0].data    = [..._monState.network.buf];
    net.data.datasets[1].data    = [..._monState._netOut];
    net.update('none');
  }

  /* Refresh top-devices table every 5 s */
  if (Math.floor((Date.now() / 1000)) % 5 === 0) {
    const tbody = document.getElementById('monDevTable');
    if (tbody) tbody.innerHTML = _topDevicesRows();
  }

  /* Check threshold alerts */
  _monCheckAlerts();
}

/* ────────────────────────────────────────────────────────────
   KPI CARD UPDATE
──────────────────────────────────────────────────────────────*/
function _updateKpiCard(k) {
  const m   = _monState[k];
  const val = m.val;

  const valEl = document.getElementById(`monVal_${k}`);
  const subEl = document.getElementById(`monSub_${k}`);
  const badge = document.getElementById(`monBadge_${k}`);
  const card  = document.getElementById(`monCard_${k}`);

  if (valEl) valEl.textContent = val;

  const hi    = val >= m.threshold;
  const warn  = val >= m.threshold * 0.85;
  const trend = _monState[k].buf.length >= 2
    ? (_monState[k].buf[_monState[k].buf.length-1] > _monState[k].buf[_monState[k].buf.length-2] ? '↑' : '↓')
    : '→';

  const avg   = Math.round(_monState[k].buf.reduce((a,b)=>a+b,0) / _monState[k].buf.length);
  const peak  = Math.max(..._monState[k].buf);

  if (subEl)  subEl.textContent = `avg ${avg}${m.unit}  ·  peak ${peak}${m.unit}  ·  ${trend}`;

  if (badge) {
    if (hi) {
      badge.className   = 'badge badge-danger';
      badge.textContent = 'ALERT';
    } else if (warn) {
      badge.className   = 'badge badge-warning';
      badge.textContent = 'Warn';
    } else {
      badge.className   = 'badge badge-online';
      badge.textContent = 'Normal';
    }
  }

  if (card) {
    card.style.borderColor = hi ? 'var(--danger)' : warn ? 'var(--warning)' : 'var(--border)';
  }
}

/* ────────────────────────────────────────────────────────────
   ALERT THRESHOLD CHECK
──────────────────────────────────────────────────────────────*/
const _monLastFired = {};

function _monCheckAlerts() {
  _monRules.filter(r => r.enabled).forEach(r => {
    const val = _monState[r.metric]?.val;
    if (val === undefined) return;
    const triggered = r.op === '>' ? val > r.threshold : val < r.threshold;
    const key = `${r.id}`;
    if (triggered && !_monLastFired[key]) {
      _monLastFired[key] = true;
      _monFireToast(r, val);
    } else if (!triggered) {
      _monLastFired[key] = false;
    }
  });
}

function _monFireToast(rule, val) {
  const sev = rule.severity;
  const color = sev === 'critical' ? '#EF4444' : sev === 'warning' ? '#F59E0B' : '#2563EB';
  const m = _monState[rule.metric];
  const t = document.createElement('div');
  t.className = '_monToast';
  const existing = document.querySelectorAll('._monToast');
  const offset   = existing.length * 56;
  t.style.cssText = `
    position:fixed;bottom:${28+offset}px;right:24px;
    background:var(--bg-card);border:1px solid ${color};
    border-left:3px solid ${color};
    border-radius:var(--radius-md);padding:10px 16px;
    font-size:13px;color:var(--text-primary);min-width:260px;
    box-shadow:var(--shadow-lg);z-index:9999;
    animation:_monToastIn 0.25s ease;display:flex;align-items:center;gap:10px`;
  t.innerHTML = `
    <span style="font-size:18px">${m.icon}</span>
    <div style="flex:1">
      <div style="font-weight:700;color:${color};font-size:12px">${sev.toUpperCase()} — ${m.label}</div>
      <div style="font-size:12px;color:var(--text-muted)">${val}${m.unit} exceeded threshold ${rule.threshold}${m.unit}</div>
    </div>
    <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px"
            onclick="this.parentElement.remove()">×</button>`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity    = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 5000);
}

/* ────────────────────────────────────────────────────────────
   ALERT RULES TABLE
──────────────────────────────────────────────────────────────*/
function _renderRulesTable() {
  const wrap = document.getElementById('monRulesTable');
  if (!wrap) return;

  if (!_monRules.length) {
    wrap.innerHTML = `<div style="padding:32px;text-align:center;font-size:13px;color:var(--text-muted)">
      No rules configured. Click <strong>+ Add Rule</strong> to get started.
    </div>`;
    return;
  }

  const sevBadge = s => {
    const map = { critical:'badge-danger', warning:'badge-warning', info:'badge-online' };
    return `<span class="badge ${map[s]||'badge-offline'}" style="font-size:10px">${s}</span>`;
  };

  wrap.innerHTML = _monRules.map(r => {
    const m = _monState[r.metric] || {};
    return `
      <div class="alert-rule-item" id="monRule_${r.id}">
        <div class="alert-rule-icon"
             style="background:${r.enabled?'var(--primary-light)':'rgba(255,255,255,0.03)'}">
          ${m.icon || '📊'}
        </div>
        <div style="flex:1;min-width:0">
          <div class="alert-rule-name">${m.label || r.metric} ${r.op} ${r.threshold}${m.unit || ''}</div>
          <div class="alert-rule-condition">
            notify: ${r.notify} · ${sevBadge(r.severity)}
          </div>
        </div>
        <div class="alert-rule-actions">
          <label class="toggle-switch" style="cursor:pointer" title="${r.enabled?'Disable':'Enable'}">
            <input type="checkbox" ${r.enabled?'checked':''} style="display:none"
                   onchange="_monToggleRule(${r.id},this.checked)">
            <span style="
              display:inline-flex;align-items:center;
              width:34px;height:18px;border-radius:99px;
              background:${r.enabled?'var(--primary)':'var(--border)'};
              position:relative;transition:background 0.2s">
              <span style="
                width:12px;height:12px;border-radius:50%;background:#fff;
                position:absolute;transition:left 0.2s;
                left:${r.enabled?'18px':'3px'}"></span>
            </span>
          </label>
          <button class="btn-icon btn-icon-sm" onclick="_monEditRuleDialog(${r.id})" title="Edit">✏️</button>
          <button class="btn-icon btn-icon-sm" onclick="_monDeleteRule(${r.id})" title="Delete"
                  style="color:var(--danger)">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

/* ────────────────────────────────────────────────────────────
   RULE ACTIONS
──────────────────────────────────────────────────────────────*/
function _monToggleRule(id, enabled) {
  const r = _monRules.find(x => x.id === id);
  if (r) { r.enabled = enabled; _renderRulesTable(); }
}

function _monDeleteRule(id) {
  _monRules = _monRules.filter(x => x.id !== id);
  delete _monLastFired[id];
  _renderRulesTable();
}

function _monAddRuleDialog()  { _monRuleDialog(null); }
function _monEditRuleDialog(id) {
  const r = _monRules.find(x => x.id === id);
  if (r) _monRuleDialog(r);
}

function _monRuleDialog(existing) {
  const isEdit = !!existing;
  const def = existing || { metric:'cpu', op:'>', threshold:80, severity:'warning', notify:'email', enabled:true };

  _monRemoveDialog();
  const overlay = document.createElement('div');
  overlay.id    = '_monDialog';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);
    z-index:500;display:flex;align-items:center;justify-content:center`;

  overlay.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-xl);padding:28px;max-width:420px;
                width:90%;box-shadow:var(--shadow-lg)">
      <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:20px">
        ${isEdit ? '✏️ Edit Rule' : '+ New Alert Rule'}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">

        <div>
          <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">METRIC</label>
          <select id="_rdMetric" style="${_dialogInput()}">
            ${['cpu','ram','disk','network'].map(k =>
              `<option value="${k}" ${def.metric===k?'selected':''}>${_monState[k].label}</option>`
            ).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">OPERATOR</label>
            <select id="_rdOp" style="${_dialogInput()}">
              <option value=">" ${def.op==='>'?'selected':''}>Greater than (&gt;)</option>
              <option value="<" ${def.op==='<'?'selected':''}>Less than (&lt;)</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">THRESHOLD</label>
            <input id="_rdThreshold" type="number" min="0" max="200" value="${def.threshold}"
                   style="${_dialogInput()}"/>
          </div>
        </div>

        <div>
          <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">SEVERITY</label>
          <select id="_rdSeverity" style="${_dialogInput()}">
            ${['critical','warning','info'].map(s =>
              `<option value="${s}" ${def.severity===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
        </div>

        <div>
          <label style="font-size:12px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:5px">NOTIFY VIA</label>
          <input id="_rdNotify" value="${def.notify}" placeholder="email, slack, pagerduty"
                 style="${_dialogInput()}"/>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
        <button class="btn-ghost btn-sm" style="font-size:13px" onclick="_monRemoveDialog()">Cancel</button>
        <button class="btn-primary btn-sm" style="font-size:13px"
                onclick="_monSaveRule(${isEdit ? def.id : 'null'})">${isEdit?'Save Changes':'Add Rule'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target===overlay) _monRemoveDialog(); });
}

function _monSaveRule(id) {
  const metric    = document.getElementById('_rdMetric')?.value;
  const op        = document.getElementById('_rdOp')?.value;
  const threshold = parseInt(document.getElementById('_rdThreshold')?.value, 10);
  const severity  = document.getElementById('_rdSeverity')?.value;
  const notify    = document.getElementById('_rdNotify')?.value.trim() || 'email';

  if (!metric || isNaN(threshold)) return;

  if (id) {
    const r = _monRules.find(x => x.id === id);
    if (r) Object.assign(r, { metric, op, threshold, severity, notify });
  } else {
    _monRules.push({ id: _monNextRuleId++, metric, op, threshold, severity, notify, enabled: true });
  }
  _monRemoveDialog();
  _renderRulesTable();
}

function _monRemoveDialog() {
  document.getElementById('_monDialog')?.remove();
}

/* ────────────────────────────────────────────────────────────
   TOP DEVICES TABLE ROWS
──────────────────────────────────────────────────────────────*/
const _devList = [
  { name:'WIN-IT-042',   os:'\ud83d\udcbb', cpu:72, ram:81, disk:54, net:38  },
  { name:'SRV-PROD-003', os:'\ud83d\udda5\ufe0f', cpu:88, ram:74, disk:61, net:95  },
  { name:'LNX-DEV-088',  os:'\ud83d\udda5\ufe0f', cpu:63, ram:58, disk:39, net:27  },
  { name:'MAC-HR-011',   os:'\ud83d\udcbb', cpu:41, ram:66, disk:72, net:12  },
  { name:'WIN-FIN-019',  os:'\ud83d\udcbb', cpu:55, ram:48, disk:80, net:18  },
  { name:'SRV-WEB-007',  os:'\ud83d\udda5\ufe0f', cpu:91, ram:89, disk:55, net:110 },
];

function _topDevicesRows() {
  return _devList.map(d => {
    const jit = v => Math.min(100, Math.max(0, v + Math.round((Math.random()-0.5)*8)));
    const c = jit(d.cpu), r = jit(d.ram), di = jit(d.disk), n = jit(d.net);
    const alert = c > 85 || r > 85;
    return `
      <tr style="border-bottom:1px solid rgba(36,48,65,0.4);transition:background 0.15s"
          onmouseover="this.style.background='rgba(255,255,255,0.03)'"
          onmouseout="this.style.background=''">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:var(--text-primary);
                   font-family:'JetBrains Mono',monospace">${d.os} ${d.name}</td>
        <td style="padding:10px 16px">
          <span class="badge ${alert?'badge-danger':'badge-online'}" style="font-size:10px">
            ${alert?'High Load':'OK'}
          </span>
        </td>
        <td style="padding:10px 16px">${_miniBar(c, 80)}</td>
        <td style="padding:10px 16px">${_miniBar(r, 85)}</td>
        <td style="padding:10px 16px">${_miniBar(di, 90)}</td>
        <td style="padding:10px 16px;font-size:12px;font-family:'JetBrains Mono',monospace;
                   color:var(--text-secondary)">${n} Mb/s</td>
        <td style="padding:10px 16px">
          <span class="badge ${alert?'badge-warning':'badge-online'}" style="font-size:10px">
            ${alert?'Warning':'Healthy'}
          </span>
        </td>
      </tr>`;
  }).join('');
}

function _miniBar(val, threshold) {
  const color = val >= threshold ? 'var(--danger)' : val >= threshold * 0.85 ? 'var(--warning)' : 'var(--success)';
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;max-width:80px;height:4px;background:var(--border);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${val}%;background:${color};border-radius:99px;transition:width 0.5s"></div>
      </div>
      <span style="font-size:12px;font-family:'JetBrains Mono',monospace;
                   color:var(--text-secondary);white-space:nowrap">${val}%</span>
    </div>`;
}

/* ────────────────────────────────────────────────────────────
   EXPORT CSV
──────────────────────────────────────────────────────────────*/
function _monExport() {
  const rows = [['metric','current','avg_60s','peak_60s','threshold','unit']];
  ['cpu','ram','disk','network'].forEach(k => {
    const m = _monState[k];
    const avg  = Math.round(m.buf.reduce((a,b)=>a+b,0)/m.buf.length);
    const peak = Math.max(...m.buf);
    rows.push([m.label, m.val, avg, peak, m.threshold, m.unit]);
  });
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `infradesk_monitoring_${Date.now()}.csv`;
  a.click();
}

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────*/
function _hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function _threshPct(m) {
  const max = m.threshold + 20;
  return Math.round((m.threshold / max) * 100);
}

function _dialogInput() {
  return `width:100%;padding:9px 12px;background:rgba(255,255,255,0.05);
          border:1px solid var(--border);border-radius:var(--radius-md);
          color:var(--text-primary);font-size:13px;font-family:inherit;outline:none`;
}

/* ────────────────────────────────────────────────────────────
   EXPOSE
──────────────────────────────────────────────────────────────*/
window.renderMonitoringPage  = renderMonitoringPage;
window._monPauseToggle       = _monPauseToggle;
window._monExport            = _monExport;
window._monToggleRule        = _monToggleRule;
window._monDeleteRule        = _monDeleteRule;
window._monAddRuleDialog     = _monAddRuleDialog;
window._monEditRuleDialog    = _monEditRuleDialog;
window._monSaveRule          = _monSaveRule;
window._monRemoveDialog      = _monRemoveDialog;
