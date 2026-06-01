/* ============================================================
   InfraDesk Remote — scripts/pages/devices.js
   Covers:
     • Device inventory table (search, OS/status/type filters,
       sortable columns, bulk-select, pagination)
     • Device detail drawer with 6 tabs:
         Overview · Performance · Software · Patches ·
         Security · Activity
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   MOCK DEVICE DATASET  (50 devices)
──────────────────────────────────────────────────────────── */
const _ALL_DEVICES = (function () {
  const osMap = [
    { os: 'Windows 11 Pro',      icon: '💻', osTag: 'windows' },
    { os: 'Windows Server 2022', icon: '🖥️', osTag: 'windows' },
    { os: 'macOS Sonoma 14',     icon: '💻', osTag: 'macos'   },
    { os: 'Ubuntu 22.04 LTS',    icon: '🖥️', osTag: 'linux'   },
    { os: 'CentOS 9 Stream',     icon: '🖥️', osTag: 'linux'   },
    { os: 'Windows 10 Pro',      icon: '💻', osTag: 'windows' },
    { os: 'Fedora 40',           icon: '💻', osTag: 'linux'   },
    { os: 'macOS Ventura 13',    icon: '💻', osTag: 'macos'   },
  ];
  const types  = ['Workstation', 'Server', 'Laptop', 'Virtual Machine'];
  const depts  = ['IT', 'Engineering', 'HR', 'Finance', 'DevOps', 'Security', 'Sales'];
  const locs   = ['New York', 'London', 'Singapore', 'Toronto', 'Berlin', 'Mumbai'];
  const statuses = [
    { label: 'Online',   cls: 'badge-online',   health: 'Healthy'  },
    { label: 'Online',   cls: 'badge-online',   health: 'Healthy'  },
    { label: 'Online',   cls: 'badge-online',   health: 'Warning'  },
    { label: 'Offline',  cls: 'badge-offline',  health: 'Offline'  },
    { label: 'Warning',  cls: 'badge-warning',  health: 'Warning'  },
    { label: 'Critical', cls: 'badge-danger',   health: 'Critical' },
  ];

  function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  const devices = [];
  for (let i = 1; i <= 50; i++) {
    const osEntry  = rnd(osMap);
    const st       = rnd(statuses);
    const dept     = rnd(depts);
    const loc      = rnd(locs);
    const type     = rnd(types);
    const agentVer = `4.${rndInt(0,3)}.${rndInt(0,9)}`;
    const lastSeen = st.label === 'Online'
      ? 'Just now'
      : `${rndInt(1,72)}h ago`;
    const cpu  = st.label === 'Critical' ? rndInt(88,99) : rndInt(10, 80);
    const ram  = rndInt(20, 95);
    const disk = rndInt(30, 92);
    const prefix = osEntry.osTag === 'windows' ? (type === 'Server' ? 'SRV' : 'WIN')
                 : osEntry.osTag === 'macos'   ? 'MAC'
                 : 'LNX';
    devices.push({
      id         : i,
      name       : `${prefix}-${dept.toUpperCase().slice(0,3)}-${String(i).padStart(3,'0')}`,
      icon       : osEntry.icon,
      os         : osEntry.os,
      osTag      : osEntry.osTag,
      type,
      dept,
      loc,
      status     : st.label,
      statusCls  : st.cls,
      health     : st.health,
      cpu, ram, disk,
      ip         : `10.${rndInt(0,3)}.${rndInt(0,25)}.${rndInt(1,254)}`,
      mac        : Array.from({length:6}, () => rndInt(0,255).toString(16).padStart(2,'0').toUpperCase()).join(':'),
      agentVer,
      lastSeen,
      uptime     : st.label === 'Offline' ? '—' : `${rndInt(1,99)}d ${rndInt(0,23)}h`,
      patchPending: rndInt(0, 12),
      secScore   : rndInt(60, 100),
      user       : `user${rndInt(1,20)}@corp.io`,
      serial     : `SN${rndInt(1e8, 9e8)}`,
      model      : rnd(['Dell OptiPlex 7090','HP EliteBook 840','Lenovo ThinkPad X1','MacBook Pro M3','Custom Build']),
    });
  }
  return devices;
}());

/* ────────────────────────────────────────────────────────────
   PAGE STATE
──────────────────────────────────────────────────────────── */
const _DS = {
  filtered    : [..._ALL_DEVICES],
  sortCol     : 'name',
  sortDir     : 'asc',
  page        : 1,
  perPage     : 15,
  search      : '',
  filterOS    : 'all',
  filterStatus: 'all',
  filterType  : 'all',
  selected    : new Set(),
  openDeviceId: null,
};

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────── */
function renderDevicesPage(container) {
  container.innerHTML = _buildPageShell();
  _ensureDrawerDOM();
  _bindToolbarEvents();
  _applyFilters();
}

/* ════════════════════════════════════════════════════════════
   PAGE SHELL
   ════════════════════════════════════════════════════════════ */
function _buildPageShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Device Inventory</h1>
        <p class="page-subtitle">Manage, inspect and connect to all managed endpoints</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-secondary btn-sm" onclick="_devExportCSV()" style="font-size:13px">
          ↓ Export CSV
        </button>
        <button class="btn-primary btn-sm" style="font-size:13px"
                onclick="showPage('agents',null)">
          + Enroll Device
        </button>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="kpi-grid" id="devKpiGrid" style="margin-bottom:20px"></div>

    <!-- Table card -->
    <div class="table-container">
      <!-- Toolbar -->
      <div class="table-toolbar" style="flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
          <div class="table-search" style="min-width:200px;max-width:320px">
            <span style="color:var(--text-muted);font-size:14px">🔍</span>
            <input id="devSearch" placeholder="Search devices, IPs, users…"
                   oninput="_devOnSearch(this.value)" autocomplete="off"/>
          </div>

          <select id="devFilterOS" class="select-input" style="font-size:13px"
                  onchange="_devOnFilter()">
            <option value="all">All OS</option>
            <option value="windows">Windows</option>
            <option value="macos">macOS</option>
            <option value="linux">Linux</option>
          </select>

          <select id="devFilterStatus" class="select-input" style="font-size:13px"
                  onchange="_devOnFilter()">
            <option value="all">All Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>

          <select id="devFilterType" class="select-input" style="font-size:13px"
                  onchange="_devOnFilter()">
            <option value="all">All Types</option>
            <option value="Workstation">Workstation</option>
            <option value="Server">Server</option>
            <option value="Laptop">Laptop</option>
            <option value="Virtual Machine">Virtual Machine</option>
          </select>
        </div>

        <div class="table-actions">
          <span id="devSelCount" style="font-size:12px;color:var(--text-muted);white-space:nowrap"></span>
          <button id="devBulkBtn" class="btn-secondary btn-sm" style="display:none;font-size:12px"
                  onclick="_devBulkAction()">Bulk Action ▾</button>
          <button class="btn-ghost btn-sm" onclick="_devResetFilters()" style="font-size:12px">Reset</button>
        </div>
      </div>

      <!-- Table -->
      <div style="overflow-x:auto">
        <table class="data-table" id="devTable">
          <thead>
            <tr>
              <th style="width:36px;padding-left:16px">
                <input type="checkbox" class="table-checkbox" id="devSelectAll"
                       onchange="_devSelectAll(this.checked)"/>
              </th>
              <th class="sortable" data-col="name"   onclick="_devSort('name')">Device ⇅</th>
              <th class="sortable" data-col="os"     onclick="_devSort('os')">OS ⇅</th>
              <th class="sortable" data-col="status" onclick="_devSort('status')">Status ⇅</th>
              <th class="sortable" data-col="type"   onclick="_devSort('type')">Type ⇅</th>
              <th class="sortable" data-col="dept"   onclick="_devSort('dept')">Dept ⇅</th>
              <th class="sortable" data-col="cpu"    onclick="_devSort('cpu')">CPU ⇅</th>
              <th data-col="ip">IP Address</th>
              <th class="sortable" data-col="lastSeen" onclick="_devSort('lastSeen')">Last Seen ⇅</th>
              <th style="width:80px">Actions</th>
            </tr>
          </thead>
          <tbody id="devTableBody"></tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:12px 16px;border-top:1px solid var(--border)">
        <div id="devPageInfo" style="font-size:12px;color:var(--text-muted)"></div>
        <div style="display:flex;gap:6px" id="devPagination"></div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   KPI STRIP
   ════════════════════════════════════════════════════════════ */
function _renderDevKPIs() {
  const grid = document.getElementById('devKpiGrid');
  if (!grid) return;

  const total    = _ALL_DEVICES.length;
  const online   = _ALL_DEVICES.filter(d => d.status === 'Online').length;
  const critical = _ALL_DEVICES.filter(d => d.status === 'Critical').length;
  const patches  = _ALL_DEVICES.reduce((a, d) => a + d.patchPending, 0);

  const kpis = [
    { label: 'Total Devices',   value: total,    icon: '🖥️', bg: 'rgba(37,99,235,0.12)',    color: 'var(--primary)' },
    { label: 'Online',          value: online,   icon: '✅', bg: 'rgba(16,185,129,0.12)',   color: 'var(--success)' },
    { label: 'Critical',        value: critical, icon: '🚨', bg: 'rgba(239,68,68,0.12)',    color: 'var(--danger)'  },
    { label: 'Patches Pending', value: patches,  icon: '🔧', bg: 'rgba(245,158,11,0.12)',   color: 'var(--warning)' },
  ];

  grid.innerHTML = kpis.map(k => `
    <div class="chart-card kpi-card" style="padding:18px;cursor:default">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:var(--radius-md);
                    background:${k.bg};display:flex;align-items:center;
                    justify-content:center;font-size:18px;flex-shrink:0">${k.icon}</div>
        <div>
          <div style="font-size:26px;font-weight:900;letter-spacing:-1px;
                      color:var(--text-primary);line-height:1">${k.value}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${k.label}</div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════
   FILTER / SORT / PAGINATION ENGINE
   ════════════════════════════════════════════════════════════ */
function _applyFilters() {
  const q  = _DS.search.toLowerCase();
  let rows = _ALL_DEVICES.filter(d => {
    const matchQ = !q || [d.name, d.os, d.ip, d.user, d.dept, d.loc, d.type]
      .some(v => v.toLowerCase().includes(q));
    const matchOS   = _DS.filterOS     === 'all' || d.osTag  === _DS.filterOS;
    const matchSt   = _DS.filterStatus === 'all' || d.status === _DS.filterStatus;
    const matchType = _DS.filterType   === 'all' || d.type   === _DS.filterType;
    return matchQ && matchOS && matchSt && matchType;
  });

  // sort
  rows.sort((a, b) => {
    let va = a[_DS.sortCol], vb = b[_DS.sortCol];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return _DS.sortDir === 'asc' ? -1 : 1;
    if (va > vb) return _DS.sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  _DS.filtered = rows;
  _DS.page = 1; // reset to first page on filter change

  _renderDevKPIs();
  _renderTable();
  _updateSortHeaders();
}

function _renderTable() {
  const start = (_DS.page - 1) * _DS.perPage;
  const page  = _DS.filtered.slice(start, start + _DS.perPage);

  const tbody = document.getElementById('devTableBody');
  if (!tbody) return;

  if (page.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10" style="text-align:center;padding:48px 0;color:var(--text-muted)">
        <div style="font-size:28px;margin-bottom:10px">🖥️</div>
        <div style="font-weight:600;margin-bottom:6px">No devices match your filters</div>
        <div style="font-size:12px">Try adjusting your search or filters</div>
        <button class="btn-ghost btn-sm" style="margin-top:12px;font-size:12px"
                onclick="_devResetFilters()">Clear filters</button>
      </td></tr>`;
    _renderPagination();
    return;
  }

  tbody.innerHTML = page.map(d => {
    const cpuColor = d.cpu >= 90 ? 'var(--danger)' : d.cpu >= 70 ? 'var(--warning)' : 'var(--success)';
    const checked  = _DS.selected.has(d.id) ? 'checked' : '';
    const rowSel   = _DS.selected.has(d.id) ? 'class="selected"' : '';
    return `
      <tr ${rowSel} onclick="_devRowClick(event,${d.id})" data-id="${d.id}">
        <td style="padding-left:16px" onclick="event.stopPropagation()">
          <input type="checkbox" class="table-checkbox" data-id="${d.id}" ${checked}
                 onchange="_devToggleSelect(${d.id},this.checked)"/>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:9px">
            <span style="font-size:18px">${d.icon}</span>
            <div>
              <div style="font-weight:700;font-size:13px;font-family:'JetBrains Mono',monospace">${d.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${d.user}</div>
            </div>
          </div>
        </td>
        <td style="font-size:12.5px;color:var(--text-secondary)">${d.os}</td>
        <td>
          <span class="badge ${d.statusCls}">
            <span class="badge-dot"></span>${d.status}
          </span>
        </td>
        <td style="font-size:12.5px;color:var(--text-secondary)">${d.type}</td>
        <td style="font-size:12.5px;color:var(--text-secondary)">${d.dept}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:52px;height:5px;background:var(--border);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${d.cpu}%;background:${cpuColor};border-radius:99px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${cpuColor};font-family:'JetBrains Mono',monospace">${d.cpu}%</span>
          </div>
        </td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">${d.ip}</td>
        <td style="font-size:12px;color:var(--text-muted)">${d.lastSeen}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn-icon btn-icon-sm" title="Remote Session"
                    onclick="_devQuickConnect(${d.id})">🖱️</button>
            <button class="btn-icon btn-icon-sm" title="Open Details"
                    onclick="_devOpenDrawer(${d.id})">ℹ</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  _renderPagination();
  _updateSelectionUI();
}

function _renderPagination() {
  const total = _DS.filtered.length;
  const pages = Math.ceil(total / _DS.perPage) || 1;
  const p     = _DS.page;
  const start = (p - 1) * _DS.perPage + 1;
  const end   = Math.min(p * _DS.perPage, total);

  const info = document.getElementById('devPageInfo');
  const pag  = document.getElementById('devPagination');
  if (info) info.textContent = total === 0
    ? 'No results'
    : `Showing ${start}–${end} of ${total} devices`;

  if (!pag) return;
  const btn = (label, page, disabled, active) =>
    `<button class="${active ? 'btn-primary' : 'btn-ghost'} btn-sm"
             style="min-width:32px;font-size:12px;padding:5px 9px"
             ${disabled ? 'disabled style="opacity:.4;pointer-events:none"' : ''}
             onclick="_devGoPage(${page})">${label}</button>`;

  let html = btn('‹', p - 1, p <= 1, false);
  const range = [];
  for (let i = Math.max(1, p - 2); i <= Math.min(pages, p + 2); i++) range.push(i);
  if (range[0] > 1) html += btn('1', 1, false, false) + (range[0] > 2 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : '');
  range.forEach(i => { html += btn(i, i, false, i === p); });
  if (range[range.length - 1] < pages) html += (range[range.length - 1] < pages - 1 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : '') + btn(pages, pages, false, false);
  html += btn('›', p + 1, p >= pages, false);
  pag.innerHTML = html;
}

/* ════════════════════════════════════════════════════════════
   EVENT HANDLERS
   ════════════════════════════════════════════════════════════ */
function _bindToolbarEvents() {
  // Keyboard shortcut: Escape closes drawer
  const _esc = e => { if (e.key === 'Escape') _devCloseDrawer(); };
  document.removeEventListener('keydown', _esc);
  document.addEventListener('keydown', _esc);
}

function _devOnSearch(val) {
  _DS.search = val;
  _applyFilters();
}

function _devOnFilter() {
  _DS.filterOS     = document.getElementById('devFilterOS')?.value     || 'all';
  _DS.filterStatus = document.getElementById('devFilterStatus')?.value || 'all';
  _DS.filterType   = document.getElementById('devFilterType')?.value   || 'all';
  _applyFilters();
}

function _devResetFilters() {
  _DS.search = ''; _DS.filterOS = 'all'; _DS.filterStatus = 'all'; _DS.filterType = 'all';
  const s = document.getElementById('devSearch');
  if (s) s.value = '';
  ['devFilterOS','devFilterStatus','devFilterType'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  _applyFilters();
}

function _devSort(col) {
  if (_DS.sortCol === col) {
    _DS.sortDir = _DS.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _DS.sortCol = col;
    _DS.sortDir = 'asc';
  }
  _renderTable();
  _updateSortHeaders();
}

function _updateSortHeaders() {
  document.querySelectorAll('#devTable th.sortable').forEach(th => {
    const col = th.dataset.col;
    const arrow = col === _DS.sortCol ? (_DS.sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅';
    th.textContent = th.textContent.replace(/ [⇅↑↓]$/, '') + arrow;
  });
}

function _devGoPage(p) {
  _DS.page = p;
  _renderTable();
}

function _devRowClick(event, id) {
  // If clicking a checkbox or action button, skip
  if (event.target.type === 'checkbox' || event.target.closest('button')) return;
  _devOpenDrawer(id);
}

/* ════════════════════════════════════════════════════════════
   BULK SELECTION
   ════════════════════════════════════════════════════════════ */
function _devToggleSelect(id, checked) {
  checked ? _DS.selected.add(id) : _DS.selected.delete(id);
  _updateSelectionUI();
}

function _devSelectAll(checked) {
  const start = (_DS.page - 1) * _DS.perPage;
  const page  = _DS.filtered.slice(start, start + _DS.perPage);
  page.forEach(d => checked ? _DS.selected.add(d.id) : _DS.selected.delete(d.id));
  _renderTable();
}

function _updateSelectionUI() {
  const cnt = _DS.selected.size;
  const cntEl  = document.getElementById('devSelCount');
  const bulkEl = document.getElementById('devBulkBtn');
  if (cntEl) cntEl.textContent = cnt > 0 ? `${cnt} selected` : '';
  if (bulkEl) bulkEl.style.display = cnt > 0 ? 'flex' : 'none';

  // sync per-row checkboxes
  document.querySelectorAll('[data-id]').forEach(el => {
    const id = parseInt(el.dataset.id, 10);
    el.checked = _DS.selected.has(id);
  });

  // sync select-all header
  const allChk = document.getElementById('devSelectAll');
  if (allChk) {
    const start = (_DS.page - 1) * _DS.perPage;
    const pageIds = _DS.filtered.slice(start, start + _DS.perPage).map(d => d.id);
    allChk.checked = pageIds.length > 0 && pageIds.every(id => _DS.selected.has(id));
    allChk.indeterminate = !allChk.checked && pageIds.some(id => _DS.selected.has(id));
  }
}

function _devBulkAction() {
  const ids = [..._DS.selected];
  // Show a simple inline prompt (no window.prompt in sandboxed iframes)
  const menu = document.createElement('div');
  menu.style.cssText = `
    position:fixed;right:120px;top:80px;background:var(--bg-card);
    border:1px solid var(--border);border-radius:var(--radius-md);
    box-shadow:var(--shadow-lg);z-index:400;min-width:180px;overflow:hidden`;
  const actions = [
    { icon: '🔧', label: 'Push Patch', fn: () => showPage('patches', null) },
    { icon: '🔄', label: 'Restart Agents', fn: () => _devToast(`Restarting agents on ${ids.length} device(s)…`) },
    { icon: '🛡️', label: 'Run Security Scan', fn: () => _devToast(`Security scan queued for ${ids.length} device(s)`) },
    { icon: '🗑️', label: 'Remove Devices', fn: () => _devToast(`${ids.length} device(s) marked for removal`) },
  ];
  menu.innerHTML = actions.map(a =>
    `<div onclick="(${a.fn.toString()})();document.getElementById('_devBulkMenu')?.remove()"
          id="_devBulkMenuOpt"
          style="padding:10px 14px;display:flex;align-items:center;gap:8px;
                 font-size:13px;cursor:pointer;color:var(--text-primary);
                 transition:background 0.15s"
          onmouseenter="this.style.background='rgba(255,255,255,0.06)'"
          onmouseleave="this.style.background=''">
       <span>${a.icon}</span> ${a.label}
     </div>`
  ).join('');
  menu.id = '_devBulkMenu';
  document.getElementById('_devBulkMenu')?.remove();
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', function _c() {
    document.getElementById('_devBulkMenu')?.remove();
    document.removeEventListener('click', _c);
  }), 50);
}

function _devExportCSV() {
  const cols = ['id','name','os','status','type','dept','loc','ip','cpu','ram','disk','lastSeen','user','agentVer'];
  const rows = [cols.join(','), ..._DS.filtered.map(d => cols.map(c => `"${d[c]}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'infradesk-devices.csv';
  a.click();
}

function _devQuickConnect(id) {
  const d = _ALL_DEVICES.find(x => x.id === id);
  if (!d || d.status === 'Offline') {
    _devToast('Device is offline — cannot start session');
    return;
  }
  showPage('remote', null);
}

function _devToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-md);padding:10px 20px;
    font-size:13px;color:var(--text-primary);
    box-shadow:var(--shadow-lg);z-index:9999;
    animation:_fadeIn 0.2s ease`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ════════════════════════════════════════════════════════════
   DEVICE DETAIL DRAWER
   ════════════════════════════════════════════════════════════ */
function _ensureDrawerDOM() {
  if (document.getElementById('_devDrawer')) return;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = '_devOverlay';
  overlay.onclick = _devCloseDrawer;
  document.body.appendChild(overlay);

  // Drawer shell
  const drawer = document.createElement('div');
  drawer.className = 'device-drawer';
  drawer.id = '_devDrawer';
  drawer.innerHTML = `
    <div class="drawer-header" id="_devDrawerHeader"><!-- filled by _devOpenDrawer --></div>
    <div class="drawer-body">
      <div class="drawer-tabs tabs" id="_devDrawerTabs">
        <!-- tabs filled dynamically -->
      </div>
      <div id="_devDrawerContent"></div>
    </div>
  `;
  document.body.appendChild(drawer);
}

function _devOpenDrawer(id) {
  const d = _ALL_DEVICES.find(x => x.id === id);
  if (!d) return;
  _DS.openDeviceId = id;

  _ensureDrawerDOM();

  // Header
  document.getElementById('_devDrawerHeader').innerHTML = `
    <div class="drawer-device-info">
      <div class="drawer-device-icon">${d.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="drawer-device-name">${d.name}</div>
        <div class="drawer-device-meta">${d.os} · ${d.loc}</div>
        <div class="drawer-device-badges">
          <span class="badge ${d.statusCls}"><span class="badge-dot"></span>${d.status}</span>
          <span class="badge badge-info">${d.type}</span>
          <span class="badge badge-primary">${d.dept}</span>
        </div>
      </div>
    </div>
    <button class="drawer-close" onclick="_devCloseDrawer()" aria-label="Close">✕</button>

    <!-- Tab bar lives inside header for sticky feel -->
    <div class="tabs" id="_devDrawerTabs" style="margin:0 -20px;padding:0 20px;overflow-x:auto;flex-shrink:0">
      ${['Overview','Performance','Software','Patches','Security','Activity'].map((t,i) =>
        `<div class="tab${i===0?' active':''}" data-tab="${i}"
              onclick="_devSwitchTab(${i})">${t}</div>`
      ).join('')}
    </div>
  `;

  _devSwitchTab(0, d);

  document.getElementById('_devDrawer').classList.add('open');
  document.getElementById('_devOverlay').classList.add('visible');
}

function _devCloseDrawer() {
  document.getElementById('_devDrawer')?.classList.remove('open');
  document.getElementById('_devOverlay')?.classList.remove('visible');
  _DS.openDeviceId = null;
}

function _devSwitchTab(idx, deviceArg) {
  const d = deviceArg || _ALL_DEVICES.find(x => x.id === _DS.openDeviceId);
  if (!d) return;

  // Update active tab
  document.querySelectorAll('#_devDrawerTabs .tab').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });

  const content = document.getElementById('_devDrawerContent');
  if (!content) return;

  switch (idx) {
    case 0: content.innerHTML = _drawerTabOverview(d);     break;
    case 1: content.innerHTML = _drawerTabPerformance(d);  _animGauges(); break;
    case 2: content.innerHTML = _drawerTabSoftware(d);     break;
    case 3: content.innerHTML = _drawerTabPatches(d);      break;
    case 4: content.innerHTML = _drawerTabSecurity(d);     break;
    case 5: content.innerHTML = _drawerTabActivity(d);     break;
  }
}

/* ── Tab 0: Overview ─────────────────────────────────────── */
function _drawerTabOverview(d) {
  return `
    <div class="drawer-section" style="padding-top:20px">
      <div class="drawer-section-title">Device Information</div>
      <div class="drawer-info-grid">
        ${_infoItem('Hostname',     d.name,      true)}
        ${_infoItem('Serial No.',   d.serial,    true)}
        ${_infoItem('Model',        d.model)}
        ${_infoItem('Type',         d.type)}
        ${_infoItem('Department',   d.dept)}
        ${_infoItem('Location',     d.loc)}
        ${_infoItem('Assigned User',d.user)}
        ${_infoItem('Last Seen',    d.lastSeen)}
        ${_infoItem('Uptime',       d.uptime)}
        ${_infoItem('Agent',        `v${d.agentVer}`, true)}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Network</div>
      <div class="drawer-info-grid">
        ${_infoItem('IP Address', d.ip,  true)}
        ${_infoItem('MAC Address',d.mac, true)}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Actions</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn-primary btn-sm" onclick="_devQuickConnect(${d.id})" style="font-size:13px">
          🖱️ Remote Connect
        </button>
        <button class="btn-secondary btn-sm" onclick="_devToast('Terminal launched for ${d.name}')" style="font-size:13px">
          ⌨️ Terminal
        </button>
        <button class="btn-secondary btn-sm" onclick="showPage('patches',null)" style="font-size:13px">
          🔧 Push Patch
        </button>
        <button class="btn-danger btn-sm" onclick="_devToast('Restart scheduled for ${d.name}')" style="font-size:13px">
          ↺ Restart
        </button>
      </div>
    </div>
  `;
}

/* ── Tab 1: Performance ──────────────────────────────────── */
function _drawerTabPerformance(d) {
  const metrics = [
    { label: 'CPU',  val: d.cpu,  color: d.cpu  >= 90 ? '#EF4444' : d.cpu  >= 70 ? '#F59E0B' : '#10B981' },
    { label: 'RAM',  val: d.ram,  color: d.ram  >= 90 ? '#EF4444' : d.ram  >= 70 ? '#F59E0B' : '#10B981' },
    { label: 'Disk', val: d.disk, color: d.disk >= 90 ? '#EF4444' : d.disk >= 70 ? '#F59E0B' : '#10B981' },
  ];

  const history = Array.from({length:12}, () => Math.floor(Math.random()*60)+20);
  const maxH = Math.max(...history);

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div class="drawer-section-title">Live Metrics</div>
      <div class="metric-gauge-row">
        ${metrics.map(m => `
          <div class="metric-gauge-item">
            <div class="metric-gauge-label">${m.label}</div>
            <div class="metric-gauge-bar">
              <div class="metric-gauge-fill" data-width="${m.val}"
                   style="width:0%;background:${m.color}"></div>
            </div>
            <div class="metric-gauge-val" style="color:${m.color}">${m.val}%</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">CPU History — Last 12h</div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:80px;
                  border-bottom:1px solid var(--border);padding-bottom:4px">
        ${history.map(v => `
          <div title="${v}%" style="flex:1;background:rgba(37,99,235,0.7);
               border-radius:3px 3px 0 0;
               height:${Math.round((v/maxH)*100)}%;
               transition:height 0.6s ease"></div>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;
                  font-size:10px;color:var(--text-muted);margin-top:4px">
        <span>12h ago</span><span>Now</span>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">System Details</div>
      <div class="drawer-info-grid">
        ${_infoItem('CPU Usage',  `${d.cpu}%`,  false)}
        ${_infoItem('RAM Usage',  `${d.ram}%`,  false)}
        ${_infoItem('Disk Usage', `${d.disk}%`, false)}
        ${_infoItem('Uptime',     d.uptime,     false)}
      </div>
    </div>
  `;
}

/* ── Tab 2: Software ─────────────────────────────────────── */
function _drawerTabSoftware(d) {
  const apps = [
    { name: 'Google Chrome',       version: '124.0.6367.60',  status: 'Up to date',  cls: 'badge-online'  },
    { name: 'Microsoft Office 365',version: '16.0.17328.200', status: 'Up to date',  cls: 'badge-online'  },
    { name: 'Zoom',                version: '5.17.1',         status: 'Update avail',cls: 'badge-warning' },
    { name: 'Slack',               version: '4.36.140',       status: 'Up to date',  cls: 'badge-online'  },
    { name: 'VS Code',             version: '1.88.1',         status: 'Up to date',  cls: 'badge-online'  },
    { name: 'InfraDesk Agent',     version: d.agentVer,       status: 'Up to date',  cls: 'badge-online'  },
    { name: '7-Zip',               version: '23.01',          status: 'Update avail',cls: 'badge-warning' },
    { name: 'Adobe Acrobat',       version: '24.001.20604',   status: 'Up to date',  cls: 'badge-online'  },
    { name: 'VLC Media Player',    version: '3.0.20',         status: 'Up to date',  cls: 'badge-online'  },
    { name: 'Python 3.12',         version: '3.12.3',         status: 'Up to date',  cls: 'badge-online'  },
  ];
  return `
    <div class="drawer-section" style="padding-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="drawer-section-title" style="margin-bottom:0">${apps.length} Installed Applications</div>
        <button class="btn-ghost btn-sm" style="font-size:11px"
                onclick="_devToast('Software audit initiated for ${d.name}')">Run Audit</button>
      </div>
      <div>
        ${apps.map(a => `
          <div class="software-list-item">
            <div class="software-name">${a.name}</div>
            <div class="software-version">${a.version}</div>
            <span class="badge ${a.cls}" style="font-size:10px;padding:2px 7px">${a.status}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ── Tab 3: Patches ──────────────────────────────────────── */
function _drawerTabPatches(d) {
  const patches = Array.from({length: d.patchPending + 3}, (_, i) => {
    const sev = ['Critical','High','Medium','Low'][Math.min(i, 3)];
    const cls = sev==='Critical'?'badge-danger':sev==='High'?'badge-warning':sev==='Medium'?'badge-info':'badge-primary';
    const kb  = `KB${5030000 + i * 441 + d.id}`;
    return { kb, sev, cls,
      desc: ['Security Update','Cumulative Update','Feature Update','Driver Update','Firmware'][i % 5],
      size: `${(Math.random()*200+10).toFixed(1)} MB`,
      applied: i >= d.patchPending };
  });

  const pending = patches.filter(p => !p.applied);
  const applied = patches.filter(p => p.applied);

  const patchRow = (p, showApply) => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;
                border-bottom:1px solid rgba(36,48,65,0.5)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);
                    font-family:'JetBrains Mono',monospace">${p.kb}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${p.desc} · ${p.size}</div>
      </div>
      <span class="badge ${p.cls}" style="font-size:10px;padding:2px 7px">${p.sev}</span>
      ${showApply ? `<button class="btn-secondary btn-sm"
                             style="font-size:11px;padding:4px 10px"
                             onclick="_devToast('Patch ${p.kb} queued')">Apply</button>` : ''}
    </div>`;

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="drawer-section-title" style="margin-bottom:0">
          ${pending.length} Pending Patches
        </div>
        ${pending.length > 0 ? `<button class="btn-primary btn-sm" style="font-size:12px"
                onclick="_devToast('All patches queued for ${d.name}')">Apply All</button>` : ''}
      </div>
      ${pending.length === 0
        ? `<div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:13px">
             ✅ All patches applied
           </div>`
        : pending.map(p => patchRow(p, true)).join('')}
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Recently Applied</div>
      ${applied.map(p => patchRow(p, false)).join('')}
    </div>
  `;
}

/* ── Tab 4: Security ─────────────────────────────────────── */
function _drawerTabSecurity(d) {
  const checks = [
    { label: 'Antivirus',     ok: d.secScore > 65, detail: 'Windows Defender — Real-time On' },
    { label: 'Firewall',      ok: d.secScore > 70, detail: 'Domain + Private profiles active' },
    { label: 'Disk Encryption',ok: true,           detail: 'BitLocker enabled (AES-256)' },
    { label: 'MFA Enrolled',  ok: d.secScore > 75, detail: d.secScore > 75 ? 'Authenticator app' : 'Not configured' },
    { label: 'Patch Status',  ok: d.patchPending === 0, detail: d.patchPending > 0 ? `${d.patchPending} pending` : 'Fully patched' },
    { label: 'Agent Online',  ok: d.status !== 'Offline', detail: `v${d.agentVer}` },
  ];

  const scoreColor = d.secScore >= 90 ? '#10B981' : d.secScore >= 70 ? '#F59E0B' : '#EF4444';

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;
                  padding:16px;background:rgba(255,255,255,0.03);
                  border:1px solid var(--border);border-radius:var(--radius-md)">
        <div style="text-align:center">
          <div style="font-size:42px;font-weight:900;color:${scoreColor};
                      letter-spacing:-2px;line-height:1">${d.secScore}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Security Score</div>
        </div>
        <div style="flex:1">
          <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:10px">
            <div style="height:100%;width:${d.secScore}%;background:${scoreColor};
                        border-radius:99px;transition:width 0.8s ease"></div>
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">
            ${d.secScore >= 90 ? '✅ Excellent posture' : d.secScore >= 70 ? '⚠️ Needs attention' : '🚨 Critical — action required'}
          </div>
          <button class="btn-secondary btn-sm" style="margin-top:10px;font-size:12px"
                  onclick="_devToast('Full security scan queued for ${d.name}')">
            🛡️ Run Full Scan
          </button>
        </div>
      </div>

      <div class="drawer-section-title">Security Checks</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${checks.map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;
                      background:rgba(255,255,255,0.02);border:1px solid var(--border);
                      border-radius:var(--radius-md)">
            <span style="font-size:16px">${c.ok ? '✅' : '❌'}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${c.label}</div>
              <div style="font-size:11px;color:var(--text-muted)">${c.detail}</div>
            </div>
            <span class="badge ${c.ok ? 'badge-online' : 'badge-danger'}" style="font-size:10px">
              ${c.ok ? 'Pass' : 'Fail'}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ── Tab 5: Activity ─────────────────────────────────────── */
function _drawerTabActivity(d) {
  const events = [
    { icon: '🖱️', color: 'var(--primary)', time: '2h ago',  msg: `Remote session started by j.smith@corp.io`            },
    { icon: '🔧', color: 'var(--warning)', time: '6h ago',  msg: `Patch KB5034441 applied successfully`                 },
    { icon: '🛡️', color: '#8B5CF6',       time: '12h ago', msg: `Security scan completed — 0 threats detected`          },
    { icon: '👤', color: 'var(--success)', time: '1d ago',  msg: `User login: ${d.user}`                                 },
    { icon: '⚙️', color: 'var(--info)',    time: '2d ago',  msg: `Agent updated to v${d.agentVer}`                       },
    { icon: '🔄', color: 'var(--text-muted)', time: '3d ago', msg: `System restarted — scheduled maintenance`           },
    { icon: '📁', color: 'var(--info)',    time: '4d ago',  msg: `File transfer: config_backup.zip (4.2 MB)`             },
    { icon: '🔑', color: 'var(--warning)', time: '5d ago',  msg: `Password policy reset applied`                        },
  ];

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="drawer-section-title" style="margin-bottom:0">Device Activity Log</div>
        <button class="btn-ghost btn-sm" style="font-size:11px"
                onclick="_devToast('Exporting full activity log…')">Export</button>
      </div>
      <div class="activity-feed">
        ${events.map(e => `
          <div class="activity-item">
            <div class="activity-icon"
                 style="background:${e.color}22;color:${e.color}">${e.icon}</div>
            <div class="activity-body">
              <div class="activity-title">${e.msg}</div>
              <div class="activity-meta">${d.name}</div>
            </div>
            <div class="activity-time">${e.time}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
function _infoItem(label, value, mono = false) {
  return `
    <div class="drawer-info-item">
      <div class="drawer-info-label">${label}</div>
      <div class="drawer-info-value${mono ? ' drawer-info-mono' : ''}">${value}</div>
    </div>`;
}

function _animGauges() {
  // Animate gauge bars from 0 → data-width after DOM paint
  requestAnimationFrame(() => {
    document.querySelectorAll('.metric-gauge-fill[data-width]').forEach(el => {
      el.style.width = el.dataset.width + '%';
    });
  });
}

/* ════════════════════════════════════════════════════════════
   EXPOSE to global scope
   ════════════════════════════════════════════════════════════ */
window.renderDevicesPage = renderDevicesPage;

// Also expose helper fns used inline in HTML strings
window._devOnSearch    = _devOnSearch;
window._devOnFilter    = _devOnFilter;
window._devResetFilters= _devResetFilters;
window._devSort        = _devSort;
window._devGoPage      = _devGoPage;
window._devRowClick    = _devRowClick;
window._devToggleSelect= _devToggleSelect;
window._devSelectAll   = _devSelectAll;
window._devBulkAction  = _devBulkAction;
window._devExportCSV   = _devExportCSV;
window._devQuickConnect= _devQuickConnect;
window._devOpenDrawer  = _devOpenDrawer;
window._devCloseDrawer = _devCloseDrawer;
window._devSwitchTab   = _devSwitchTab;
window._devToast       = _devToast;
