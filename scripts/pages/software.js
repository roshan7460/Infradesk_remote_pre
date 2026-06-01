/* ============================================================
   InfraDesk Remote — scripts/pages/software.js
   Covers:
     • KPI strip  — Total installs, Licensed, Unlicensed,
                    Updates available
     • Filter bar — search, Publisher, Category, License,
                    Update-status dropdowns + Reset
     • Sortable paginated table — App name, Publisher,
                    Version, Category, License status,
                    Devices count, Last detected
     • Bulk select + Export CSV
     • Detail drawer — 4 tabs: Overview · Devices ·
                    License · History
     • Toast notifications
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   MOCK DATASET  (60 software entries)
──────────────────────────────────────────────────────────── */
const _ALL_SW = (function () {
  const catalogue = [
    { name:'Google Chrome',          publisher:'Google LLC',            category:'Browser',       icon:'🌐', licenseType:'Free',        unitCost:0     },
    { name:'Mozilla Firefox',        publisher:'Mozilla Foundation',    category:'Browser',       icon:'🦊', licenseType:'Free',        unitCost:0     },
    { name:'Microsoft Edge',         publisher:'Microsoft Corporation', category:'Browser',       icon:'🔵', licenseType:'Free',        unitCost:0     },
    { name:'Microsoft Office 365',   publisher:'Microsoft Corporation', category:'Productivity',  icon:'📄', licenseType:'Subscription',unitCost:12.50 },
    { name:'Microsoft Teams',        publisher:'Microsoft Corporation', category:'Collaboration', icon:'💬', licenseType:'Subscription',unitCost:0     },
    { name:'Slack',                  publisher:'Salesforce Inc.',       category:'Collaboration', icon:'💬', licenseType:'Freemium',    unitCost:7.25  },
    { name:'Zoom',                   publisher:'Zoom Video Comms.',     category:'Collaboration', icon:'📹', licenseType:'Subscription',unitCost:14.99 },
    { name:'VS Code',                publisher:'Microsoft Corporation', category:'Dev Tools',     icon:'🖊️', licenseType:'Free',        unitCost:0     },
    { name:'JetBrains IntelliJ',     publisher:'JetBrains s.r.o.',      category:'Dev Tools',     icon:'🧠', licenseType:'Commercial',  unitCost:69.00 },
    { name:'GitHub Desktop',         publisher:'GitHub Inc.',           category:'Dev Tools',     icon:'🐙', licenseType:'Free',        unitCost:0     },
    { name:'Postman',                publisher:'Postman Inc.',          category:'Dev Tools',     icon:'📮', licenseType:'Freemium',    unitCost:14.00 },
    { name:'Docker Desktop',         publisher:'Docker Inc.',           category:'Dev Tools',     icon:'🐳', licenseType:'Commercial',  unitCost:21.00 },
    { name:'Python 3.12',            publisher:'Python Software Found.',category:'Runtime',       icon:'🐍', licenseType:'Free',        unitCost:0     },
    { name:'Node.js 20 LTS',         publisher:'OpenJS Foundation',     category:'Runtime',       icon:'🟩', licenseType:'Free',        unitCost:0     },
    { name:'Java JDK 21',            publisher:'Oracle Corporation',    category:'Runtime',       icon:'☕', licenseType:'Commercial',  unitCost:25.00 },
    { name:'.NET 8 Runtime',         publisher:'Microsoft Corporation', category:'Runtime',       icon:'⚙️', licenseType:'Free',        unitCost:0     },
    { name:'Adobe Acrobat Pro',      publisher:'Adobe Inc.',            category:'Productivity',  icon:'📕', licenseType:'Subscription',unitCost:19.99 },
    { name:'Adobe Creative Cloud',   publisher:'Adobe Inc.',            category:'Creative',      icon:'🎨', licenseType:'Subscription',unitCost:54.99 },
    { name:'Figma',                  publisher:'Figma Inc.',            category:'Creative',      icon:'🎨', licenseType:'Freemium',    unitCost:12.00 },
    { name:'VLC Media Player',       publisher:'VideoLAN',              category:'Media',         icon:'🎞️', licenseType:'Free',        unitCost:0     },
    { name:'7-Zip',                  publisher:'Igor Pavlov',           category:'Utility',       icon:'🗜️', licenseType:'Free',        unitCost:0     },
    { name:'WinRAR',                 publisher:'win.rar GmbH',          category:'Utility',       icon:'📦', licenseType:'Commercial',  unitCost:4.00  },
    { name:'Notepad++',              publisher:'Don Ho',                category:'Utility',       icon:'📝', licenseType:'Free',        unitCost:0     },
    { name:'TreeSize Free',          publisher:'JAM Software',          category:'Utility',       icon:'🌲', licenseType:'Free',        unitCost:0     },
    { name:'Malwarebytes',           publisher:'Malwarebytes Inc.',     category:'Security',      icon:'🛡️', licenseType:'Commercial',  unitCost:3.33  },
    { name:'Bitwarden',              publisher:'Bitwarden Inc.',        category:'Security',      icon:'🔑', licenseType:'Freemium',    unitCost:1.00  },
    { name:'1Password',              publisher:'AgileBits Inc.',        category:'Security',      icon:'🔐', licenseType:'Commercial',  unitCost:2.99  },
    { name:'Cisco AnyConnect',       publisher:'Cisco Systems',         category:'Network',       icon:'🔒', licenseType:'Commercial',  unitCost:0     },
    { name:'PuTTY',                  publisher:'Simon Tatham',          category:'Network',       icon:'🖥️', licenseType:'Free',        unitCost:0     },
    { name:'WireShark',              publisher:'Wireshark Foundation',  category:'Network',       icon:'🦈', licenseType:'Free',        unitCost:0     },
    { name:'FileZilla',              publisher:'FileZilla Project',     category:'Network',       icon:'📂', licenseType:'Free',        unitCost:0     },
    { name:'Terraform',              publisher:'HashiCorp Inc.',        category:'DevOps',        icon:'🏗️', licenseType:'Commercial',  unitCost:20.00 },
    { name:'Ansible',                publisher:'Red Hat Inc.',          category:'DevOps',        icon:'⚙️', licenseType:'Free',        unitCost:0     },
    { name:'kubectl',                publisher:'CNCF',                  category:'DevOps',        icon:'☸️', licenseType:'Free',        unitCost:0     },
    { name:'Lens (Kubernetes IDE)',  publisher:'Mirantis Inc.',         category:'DevOps',        icon:'🔭', licenseType:'Freemium',    unitCost:19.99 },
    { name:'Grafana',                publisher:'Grafana Labs',          category:'Monitoring',    icon:'📊', licenseType:'Freemium',    unitCost:0     },
    { name:'Datadog Agent',          publisher:'Datadog Inc.',          category:'Monitoring',    icon:'🐕', licenseType:'Commercial',  unitCost:15.00 },
    { name:'Splunk Universal Fwd.',  publisher:'Splunk Inc.',           category:'Monitoring',    icon:'📡', licenseType:'Commercial',  unitCost:0     },
    { name:'Zoom Rooms',             publisher:'Zoom Video Comms.',     category:'Collaboration', icon:'📹', licenseType:'Subscription',unitCost:49.00 },
    { name:'Google Drive',           publisher:'Google LLC',            category:'Storage',       icon:'💾', licenseType:'Free',        unitCost:0     },
    { name:'Dropbox',                publisher:'Dropbox Inc.',          category:'Storage',       icon:'📦', licenseType:'Freemium',    unitCost:11.99 },
    { name:'OneDrive',               publisher:'Microsoft Corporation', category:'Storage',       icon:'☁️', licenseType:'Subscription',unitCost:0     },
    { name:'ShareX',                 publisher:'ShareX Team',           category:'Utility',       icon:'📷', licenseType:'Free',        unitCost:0     },
    { name:'Git',                    publisher:'Software Freedom Cons.',category:'Dev Tools',     icon:'🌿', licenseType:'Free',        unitCost:0     },
    { name:'PowerShell 7',           publisher:'Microsoft Corporation', category:'Runtime',       icon:'💻', licenseType:'Free',        unitCost:0     },
    { name:'Obsidian',               publisher:'Obsidian.md',           category:'Productivity',  icon:'🪨', licenseType:'Freemium',    unitCost:4.00  },
    { name:'Notion',                 publisher:'Notion Labs Inc.',      category:'Productivity',  icon:'📒', licenseType:'Freemium',    unitCost:8.00  },
    { name:'TeamViewer',             publisher:'TeamViewer SE',         category:'Remote',        icon:'🖱️', licenseType:'Commercial',  unitCost:24.90 },
    { name:'AnyDesk',                publisher:'AnyDesk Software',      category:'Remote',        icon:'🖥️', licenseType:'Commercial',  unitCost:14.90 },
    { name:'Snagit',                 publisher:'TechSmith Corp.',       category:'Creative',      icon:'📸', licenseType:'Commercial',  unitCost:7.49  },
    { name:'Camtasia',               publisher:'TechSmith Corp.',       category:'Creative',      icon:'🎬', licenseType:'Commercial',  unitCost:16.58 },
    { name:'Greenshot',              publisher:'Greenshot',             category:'Utility',       icon:'🟢', licenseType:'Free',        unitCost:0     },
    { name:'LibreOffice',            publisher:'The Document Foundation',category:'Productivity', icon:'📃', licenseType:'Free',        unitCost:0     },
    { name:'Inkscape',               publisher:'Inkscape Project',      category:'Creative',      icon:'✏️', licenseType:'Free',        unitCost:0     },
    { name:'GIMP',                   publisher:'GNOME Project',         category:'Creative',      icon:'🖼️', licenseType:'Free',        unitCost:0     },
    { name:'OBS Studio',             publisher:'OBS Project',           category:'Media',         icon:'📹', licenseType:'Free',        unitCost:0     },
    { name:'Audacity',               publisher:'Audacity Team',         category:'Media',         icon:'🎙️', licenseType:'Free',        unitCost:0     },
    { name:'VirtualBox',             publisher:'Oracle Corporation',    category:'Virtualization',icon:'📦', licenseType:'Free',        unitCost:0     },
    { name:'VMware Workstation',     publisher:'VMware by Broadcom',    category:'Virtualization',icon:'🖥️', licenseType:'Commercial',  unitCost:12.00 },
    { name:'Hyper-V Manager',        publisher:'Microsoft Corporation', category:'Virtualization',icon:'💡', licenseType:'Free',        unitCost:0     },
  ];

  function rndInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function rndEl(arr)   { return arr[Math.floor(Math.random() * arr.length)]; }

  const versions = {
    'Google Chrome'        : ['124.0.6367.60','123.0.6312.122','122.0.6261.128'],
    'Mozilla Firefox'      : ['126.0','125.0.3','124.0.2'],
    'Microsoft Edge'       : ['124.0.2478.97','123.0.2420.97'],
    'Microsoft Office 365' : ['16.0.17531.20140','16.0.17328.200'],
    'Zoom'                 : ['5.17.11','5.17.1','5.16.10'],
    'Slack'                : ['4.38.125','4.36.140'],
    'Adobe Acrobat Pro'    : ['24.002.20759','24.001.20604'],
    'Docker Desktop'       : ['4.30.0','4.29.0'],
    'JetBrains IntelliJ'   : ['2024.1','2023.3.6'],
    'Terraform'            : ['1.8.4','1.7.5'],
  };

  const licStatuses = ['Licensed','Licensed','Licensed','Unlicensed','Expired','Trial'];
  const detectedDates = ['2026-06-01','2026-05-30','2026-05-28','2026-05-25','2026-05-20'];
  const updateAvail   = [true,false,false,false,false,false,false]; // ~14% chance

  return catalogue.map((app, idx) => {
    const deviceCount  = rndInt(3, 48);
    const licStatus    = app.licenseType === 'Free'
      ? 'Licensed'
      : rndEl(licStatuses);
    const hasUpdate    = rndEl(updateAvail);
    const versionPool  = versions[app.name];
    const version      = versionPool
      ? rndEl(versionPool)
      : `${rndInt(1,12)}.${rndInt(0,9)}.${rndInt(0,99)}`;
    const detected     = rndEl(detectedDates);
    const licensedSeats = licStatus === 'Licensed'
      ? rndInt(deviceCount, deviceCount + 20)
      : (licStatus === 'Unlicensed' ? 0 : rndInt(1, deviceCount - 1));
    const annualCost   = app.unitCost * deviceCount * 12;

    return {
      id          : idx + 1,
      name        : app.name,
      publisher   : app.publisher,
      category    : app.category,
      icon        : app.icon,
      licenseType : app.licenseType,
      licStatus,
      version,
      hasUpdate,
      deviceCount,
      licensedSeats,
      annualCost  : Math.round(annualCost),
      unitCost    : app.unitCost,
      detected,
      installedOn : Array.from({ length: deviceCount }, (_, i) =>
        `${['WIN','SRV','MAC','LNX'][i % 4]}-${['IT','ENG','HR','FIN','OPS'][i % 5].padEnd(3,'-').slice(0,3)}-${String(i + 1).padStart(3,'0')}`
      ),
    };
  });
}());

/* ────────────────────────────────────────────────────────────
   PAGE STATE
──────────────────────────────────────────────────────────── */
const _SWS = {
  filtered    : [..._ALL_SW],
  sortCol     : 'name',
  sortDir     : 'asc',
  page        : 1,
  perPage     : 15,
  search      : '',
  filterPub   : 'all',
  filterCat   : 'all',
  filterLic   : 'all',
  filterUpd   : 'all',
  selected    : new Set(),
  openId      : null,
};

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────── */
function renderSoftwarePage(container) {
  container.innerHTML = _swShell();
  _swEnsureDrawer();
  _swBindKeys();
  _swApplyFilters();
}

/* ════════════════════════════════════════════════════════════
   PAGE SHELL
   ════════════════════════════════════════════════════════════ */
function _swShell() {
  /* Build unique publisher + category lists for dropdowns */
  const publishers = [...new Set(_ALL_SW.map(s => s.publisher))].sort();
  const categories = [...new Set(_ALL_SW.map(s => s.category))].sort();

  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Software Inventory</h1>
        <p class="page-subtitle">Installed applications across all managed endpoints — publisher, version &amp; license status</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-secondary btn-sm" style="font-size:13px"
                onclick="_swExportCSV()">↓ Export CSV</button>
        <button class="btn-primary btn-sm" style="font-size:13px"
                onclick="_swToast('🔄 Discovery scan queued for all endpoints')">
          🔍 Run Discovery
        </button>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="kpi-grid" id="swKpiGrid" style="margin-bottom:20px"></div>

    <!-- Table card -->
    <div class="table-container">

      <!-- Toolbar -->
      <div class="table-toolbar" style="flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">

          <div class="table-search" style="min-width:200px;max-width:300px">
            <span style="color:var(--text-muted);font-size:14px">🔍</span>
            <input id="swSearch" placeholder="Search name, publisher, version…"
                   oninput="_swOnSearch(this.value)" autocomplete="off"/>
          </div>

          <select id="swFilterPub" class="select-input" style="font-size:13px"
                  onchange="_swOnFilter()">
            <option value="all">All Publishers</option>
            ${publishers.map(p => `<option value="${_swHtml(p)}">${_swHtml(p)}</option>`).join('')}
          </select>

          <select id="swFilterCat" class="select-input" style="font-size:13px"
                  onchange="_swOnFilter()">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${_swHtml(c)}">${_swHtml(c)}</option>`).join('')}
          </select>

          <select id="swFilterLic" class="select-input" style="font-size:13px"
                  onchange="_swOnFilter()">
            <option value="all">All License Status</option>
            <option value="Licensed">Licensed</option>
            <option value="Unlicensed">Unlicensed</option>
            <option value="Expired">Expired</option>
            <option value="Trial">Trial</option>
          </select>

          <select id="swFilterUpd" class="select-input" style="font-size:13px"
                  onchange="_swOnFilter()">
            <option value="all">All Update Status</option>
            <option value="update">Update Available</option>
            <option value="current">Up to Date</option>
          </select>
        </div>

        <div class="table-actions">
          <span id="swSelCount" style="font-size:12px;color:var(--text-muted);white-space:nowrap"></span>
          <button id="swBulkBtn" class="btn-secondary btn-sm"
                  style="display:none;font-size:12px"
                  onclick="_swBulkAction()">Bulk Action ▾</button>
          <button class="btn-ghost btn-sm" style="font-size:12px"
                  onclick="_swResetFilters()">Reset</button>
        </div>
      </div>

      <!-- Table -->
      <div style="overflow-x:auto">
        <table class="data-table" id="swTable">
          <thead>
            <tr>
              <th style="width:36px;padding-left:16px">
                <input type="checkbox" class="table-checkbox" id="swSelectAll"
                       onchange="_swSelectAll(this.checked)"/>
              </th>
              <th class="sortable" data-col="name"        onclick="_swSort('name')">Application ⇅</th>
              <th class="sortable" data-col="publisher"   onclick="_swSort('publisher')">Publisher ⇅</th>
              <th class="sortable" data-col="version"     onclick="_swSort('version')">Version ⇅</th>
              <th class="sortable" data-col="category"    onclick="_swSort('category')">Category ⇅</th>
              <th class="sortable" data-col="licStatus"   onclick="_swSort('licStatus')">License ⇅</th>
              <th class="sortable" data-col="deviceCount" onclick="_swSort('deviceCount')">Devices ⇅</th>
              <th class="sortable" data-col="detected"    onclick="_swSort('detected')">Last Detected ⇅</th>
              <th style="width:70px">Actions</th>
            </tr>
          </thead>
          <tbody id="swTableBody"></tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:12px 16px;border-top:1px solid var(--border)">
        <div id="swPageInfo"   style="font-size:12px;color:var(--text-muted)"></div>
        <div id="swPagination" style="display:flex;gap:6px"></div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   KPI STRIP
   ════════════════════════════════════════════════════════════ */
function _swRenderKPIs() {
  const grid = document.getElementById('swKpiGrid');
  if (!grid) return;

  const total      = _ALL_SW.length;
  const licensed   = _ALL_SW.filter(s => s.licStatus === 'Licensed').length;
  const unlicensed = _ALL_SW.filter(s => s.licStatus === 'Unlicensed' || s.licStatus === 'Expired').length;
  const updates    = _ALL_SW.filter(s => s.hasUpdate).length;
  const annualSpend= _ALL_SW.reduce((a, s) => a + s.annualCost, 0);

  const kpis = [
    { label:'Total Applications', value: total,      icon:'📦', bg:'rgba(37,99,235,0.12)',  color:'var(--primary)' },
    { label:'Licensed',           value: licensed,   icon:'✅', bg:'rgba(16,185,129,0.12)', color:'var(--success)' },
    { label:'Unlicensed / Expired',value: unlicensed,icon:'⚠️', bg:'rgba(245,158,11,0.12)', color:'var(--warning)' },
    { label:'Updates Available',  value: updates,    icon:'🔄', bg:'rgba(139,92,246,0.12)', color:'#8B5CF6'        },
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
   FILTER / SORT / PAGINATION
   ════════════════════════════════════════════════════════════ */
function _swApplyFilters() {
  const q = _SWS.search.toLowerCase();

  let rows = _ALL_SW.filter(s => {
    const matchQ   = !q || [s.name, s.publisher, s.version, s.category]
      .some(v => v.toLowerCase().includes(q));
    const matchPub = _SWS.filterPub === 'all' || s.publisher === _SWS.filterPub;
    const matchCat = _SWS.filterCat === 'all' || s.category  === _SWS.filterCat;
    const matchLic = _SWS.filterLic === 'all' || s.licStatus === _SWS.filterLic;
    const matchUpd = _SWS.filterUpd === 'all' ||
      (_SWS.filterUpd === 'update'  &&  s.hasUpdate) ||
      (_SWS.filterUpd === 'current' && !s.hasUpdate);
    return matchQ && matchPub && matchCat && matchLic && matchUpd;
  });

  rows.sort((a, b) => {
    let va = a[_SWS.sortCol], vb = b[_SWS.sortCol];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return _SWS.sortDir === 'asc' ? -1 :  1;
    if (va > vb) return _SWS.sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  _SWS.filtered = rows;
  _SWS.page     = 1;

  _swRenderKPIs();
  _swRenderTable();
  _swUpdateSortHeaders();
}

function _swRenderTable() {
  const start = (_SWS.page - 1) * _SWS.perPage;
  const page  = _SWS.filtered.slice(start, start + _SWS.perPage);
  const tbody = document.getElementById('swTableBody');
  if (!tbody) return;

  if (page.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9" style="text-align:center;padding:48px 0;color:var(--text-muted)">
        <div style="font-size:28px;margin-bottom:10px">📦</div>
        <div style="font-weight:600;margin-bottom:6px">No software matches your filters</div>
        <div style="font-size:12px">Try adjusting your search or filters</div>
        <button class="btn-ghost btn-sm" style="margin-top:12px;font-size:12px"
                onclick="_swResetFilters()">Clear filters</button>
      </td></tr>`;
    _swRenderPagination();
    return;
  }

  tbody.innerHTML = page.map(s => {
    const licBadge = _swLicBadge(s.licStatus);
    const updBadge = s.hasUpdate
      ? `<span class="badge badge-warning" style="font-size:10px;margin-left:4px">Update</span>`
      : '';
    const checked  = _SWS.selected.has(s.id) ? 'checked' : '';
    const rowSel   = _SWS.selected.has(s.id) ? 'class="selected"' : '';
    return `
      <tr ${rowSel} onclick="_swRowClick(event,${s.id})" data-id="${s.id}">
        <td style="padding-left:16px" onclick="event.stopPropagation()">
          <input type="checkbox" class="table-checkbox" data-id="${s.id}" ${checked}
                 onchange="_swToggleSelect(${s.id},this.checked)"/>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:9px">
            <span style="font-size:18px">${s.icon}</span>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--text-primary)">${_swHtml(s.name)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${_swHtml(s.licenseType)}</div>
            </div>
          </div>
        </td>
        <td style="font-size:12.5px;color:var(--text-secondary)">${_swHtml(s.publisher)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:12px;font-family:'JetBrains Mono',monospace;
                         color:var(--text-secondary)">${_swHtml(s.version)}</span>
            ${updBadge}
          </div>
        </td>
        <td>
          <span class="badge badge-info" style="font-size:10px;padding:2px 7px">
            ${_swHtml(s.category)}
          </span>
        </td>
        <td>${licBadge}</td>
        <td>
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:48px;height:4px;background:var(--border);
                        border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100, Math.round(s.deviceCount/50*100))}%;
                          background:var(--primary);border-radius:99px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;
                         color:var(--text-primary)">${s.deviceCount}</span>
          </div>
        </td>
        <td style="font-size:12px;color:var(--text-muted)">${s.detected}</td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn-icon btn-icon-sm" title="View Details"
                    onclick="_swOpenDrawer(${s.id})">ℹ</button>
            ${s.hasUpdate ? `<button class="btn-icon btn-icon-sm" title="Update"
                    onclick="_swToast('🔄 Update queued for ${_swHtml(s.name)}')">🔄</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');

  _swRenderPagination();
  _swUpdateSelectionUI();
}

function _swRenderPagination() {
  const total = _SWS.filtered.length;
  const pages = Math.ceil(total / _SWS.perPage) || 1;
  const p     = _SWS.page;
  const start = (p - 1) * _SWS.perPage + 1;
  const end   = Math.min(p * _SWS.perPage, total);

  const info = document.getElementById('swPageInfo');
  const pag  = document.getElementById('swPagination');
  if (info) info.textContent = total === 0
    ? 'No results'
    : `Showing ${start}–${end} of ${total} applications`;

  if (!pag) return;
  const btn = (label, page, disabled, active) =>
    `<button class="${active ? 'btn-primary' : 'btn-ghost'} btn-sm"
             style="min-width:32px;font-size:12px;padding:5px 9px"
             ${disabled ? 'disabled style="opacity:.4;pointer-events:none"' : ''}
             onclick="_swGoPage(${page})">${label}</button>`;

  let html = btn('‹', p - 1, p <= 1, false);
  const range = [];
  for (let i = Math.max(1, p - 2); i <= Math.min(pages, p + 2); i++) range.push(i);
  if (range[0] > 1) html += btn('1', 1, false, false) + (range[0] > 2 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : '');
  range.forEach(i => { html += btn(i, i, false, i === p); });
  if (range[range.length-1] < pages) html += (range[range.length-1] < pages-1 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : '') + btn(pages, pages, false, false);
  html += btn('›', p + 1, p >= pages, false);
  pag.innerHTML = html;
}

/* ════════════════════════════════════════════════════════════
   EVENT HANDLERS
   ════════════════════════════════════════════════════════════ */
function _swBindKeys() {
  const esc = e => { if (e.key === 'Escape') _swCloseDrawer(); };
  document.removeEventListener('keydown', esc);
  document.addEventListener('keydown', esc);
}

function _swOnSearch(val) { _SWS.search = val; _swApplyFilters(); }

function _swOnFilter() {
  _SWS.filterPub = document.getElementById('swFilterPub')?.value || 'all';
  _SWS.filterCat = document.getElementById('swFilterCat')?.value || 'all';
  _SWS.filterLic = document.getElementById('swFilterLic')?.value || 'all';
  _SWS.filterUpd = document.getElementById('swFilterUpd')?.value || 'all';
  _swApplyFilters();
}

function _swResetFilters() {
  _SWS.search = ''; _SWS.filterPub = 'all'; _SWS.filterCat = 'all';
  _SWS.filterLic = 'all'; _SWS.filterUpd = 'all';
  ['swSearch'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['swFilterPub','swFilterCat','swFilterLic','swFilterUpd'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = 'all';
  });
  _swApplyFilters();
}

function _swSort(col) {
  if (_SWS.sortCol === col) _SWS.sortDir = _SWS.sortDir === 'asc' ? 'desc' : 'asc';
  else { _SWS.sortCol = col; _SWS.sortDir = 'asc'; }
  _swRenderTable();
  _swUpdateSortHeaders();
}

function _swUpdateSortHeaders() {
  document.querySelectorAll('#swTable th.sortable').forEach(th => {
    const col   = th.dataset.col;
    const arrow = col === _SWS.sortCol ? (_SWS.sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅';
    th.textContent = th.textContent.replace(/ [⇅↑↓]$/, '') + arrow;
  });
}

function _swGoPage(p)  { _SWS.page = p; _swRenderTable(); }
function _swRowClick(event, id) {
  if (event.target.type === 'checkbox' || event.target.closest('button')) return;
  _swOpenDrawer(id);
}

/* ════════════════════════════════════════════════════════════
   BULK SELECTION
   ════════════════════════════════════════════════════════════ */
function _swToggleSelect(id, checked) {
  checked ? _SWS.selected.add(id) : _SWS.selected.delete(id);
  _swUpdateSelectionUI();
}

function _swSelectAll(checked) {
  const start = (_SWS.page - 1) * _SWS.perPage;
  const page  = _SWS.filtered.slice(start, start + _SWS.perPage);
  page.forEach(s => checked ? _SWS.selected.add(s.id) : _SWS.selected.delete(s.id));
  _swRenderTable();
}

function _swUpdateSelectionUI() {
  const cnt    = _SWS.selected.size;
  const cntEl  = document.getElementById('swSelCount');
  const bulkEl = document.getElementById('swBulkBtn');
  if (cntEl)  cntEl.textContent  = cnt > 0 ? `${cnt} selected` : '';
  if (bulkEl) bulkEl.style.display = cnt > 0 ? 'flex' : 'none';

  document.querySelectorAll('#swTableBody [data-id]').forEach(el => {
    const id = parseInt(el.dataset.id, 10);
    el.checked = _SWS.selected.has(id);
  });

  const allChk = document.getElementById('swSelectAll');
  if (allChk) {
    const start   = (_SWS.page - 1) * _SWS.perPage;
    const pageIds = _SWS.filtered.slice(start, start + _SWS.perPage).map(s => s.id);
    allChk.checked       = pageIds.length > 0 && pageIds.every(id => _SWS.selected.has(id));
    allChk.indeterminate = !allChk.checked && pageIds.some(id => _SWS.selected.has(id));
  }
}

function _swBulkAction() {
  const ids = [..._SWS.selected];
  const menu = document.createElement('div');
  menu.id = '_swBulkMenu';
  menu.style.cssText = `
    position:fixed;right:120px;top:80px;background:var(--bg-card);
    border:1px solid var(--border);border-radius:var(--radius-md);
    box-shadow:var(--shadow-lg);z-index:400;min-width:190px;overflow:hidden`;
  const actions = [
    { icon:'🔄', label:'Update Selected',    fn: () => _swToast(`🔄 Updates queued for ${ids.length} app(s)`) },
    { icon:'🗑️', label:'Uninstall Selected', fn: () => _swToast(`🗑️ Uninstall queued for ${ids.length} app(s)`) },
    { icon:'📋', label:'Export to CSV',      fn: () => _swExportCSV() },
    { icon:'🔑', label:'Review Licenses',    fn: () => _swToast(`🔑 License review initiated for ${ids.length} app(s)`) },
  ];
  menu.innerHTML = actions.map(a =>
    `<div onclick="(${a.fn.toString()})();document.getElementById('_swBulkMenu')?.remove()"
          style="padding:10px 14px;display:flex;align-items:center;gap:8px;
                 font-size:13px;cursor:pointer;color:var(--text-primary);
                 transition:background 0.15s"
          onmouseenter="this.style.background='rgba(255,255,255,0.06)'"
          onmouseleave="this.style.background=''">
      <span>${a.icon}</span> ${a.label}
    </div>`
  ).join('');
  document.getElementById('_swBulkMenu')?.remove();
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', function _c() {
    document.getElementById('_swBulkMenu')?.remove();
    document.removeEventListener('click', _c);
  }), 50);
}

function _swExportCSV() {
  const cols = ['id','name','publisher','version','category','licenseType','licStatus','deviceCount','annualCost','detected'];
  const rows = [cols.join(','), ..._SWS.filtered.map(s => cols.map(c => `"${s[c]}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type:'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'infradesk-software.csv';
  a.click();
}

/* ════════════════════════════════════════════════════════════
   DETAIL DRAWER
   ════════════════════════════════════════════════════════════ */
function _swEnsureDrawer() {
  if (document.getElementById('_swDrawer')) return;

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id        = '_swOverlay';
  overlay.onclick   = _swCloseDrawer;
  document.body.appendChild(overlay);

  const drawer = document.createElement('div');
  drawer.className = 'device-drawer';
  drawer.id        = '_swDrawer';
  drawer.innerHTML = `
    <div class="drawer-header" id="_swDrawerHeader"></div>
    <div class="drawer-body">
      <div id="_swDrawerContent"></div>
    </div>
  `;
  document.body.appendChild(drawer);
}

function _swOpenDrawer(id) {
  const s = _ALL_SW.find(x => x.id === id);
  if (!s) return;
  _SWS.openId = id;
  _swEnsureDrawer();

  document.getElementById('_swDrawerHeader').innerHTML = `
    <div class="drawer-device-info">
      <div class="drawer-device-icon" style="font-size:26px">${s.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="drawer-device-name">${_swHtml(s.name)}</div>
        <div class="drawer-device-meta">${_swHtml(s.publisher)} · v${_swHtml(s.version)}</div>
        <div class="drawer-device-badges" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          ${_swLicBadge(s.licStatus)}
          <span class="badge badge-info" style="font-size:10px">${_swHtml(s.category)}</span>
          ${s.hasUpdate ? `<span class="badge badge-warning" style="font-size:10px">Update Available</span>` : ''}
        </div>
      </div>
    </div>
    <button class="drawer-close" onclick="_swCloseDrawer()" aria-label="Close">✕</button>

    <div class="tabs" style="margin:0 -20px;padding:0 20px;overflow-x:auto;flex-shrink:0">
      ${['Overview','Devices','License','History'].map((t, i) =>
        `<div class="tab${i===0?' active':''}" data-tab="${i}"
              onclick="_swSwitchTab(${i})">${t}</div>`
      ).join('')}
    </div>
  `;

  _swSwitchTab(0, s);
  document.getElementById('_swDrawer').classList.add('open');
  document.getElementById('_swOverlay').classList.add('visible');
}

function _swCloseDrawer() {
  document.getElementById('_swDrawer')?.classList.remove('open');
  document.getElementById('_swOverlay')?.classList.remove('visible');
  _SWS.openId = null;
}

function _swSwitchTab(idx, swArg) {
  const s = swArg || _ALL_SW.find(x => x.id === _SWS.openId);
  if (!s) return;

  document.querySelectorAll('#_swDrawerHeader .tab').forEach((t, i) =>
    t.classList.toggle('active', i === idx)
  );

  const content = document.getElementById('_swDrawerContent');
  if (!content) return;

  switch (idx) {
    case 0: content.innerHTML = _swTabOverview(s);  break;
    case 1: content.innerHTML = _swTabDevices(s);   break;
    case 2: content.innerHTML = _swTabLicense(s);   break;
    case 3: content.innerHTML = _swTabHistory(s);   break;
  }
}

/* ── Tab 0: Overview ─────────────────────────────────────── */
function _swTabOverview(s) {
  const costLabel = s.annualCost > 0
    ? `$${s.annualCost.toLocaleString()} / yr`
    : 'Free';
  return `
    <div class="drawer-section" style="padding-top:20px">
      <div class="drawer-section-title">Application Details</div>
      <div class="drawer-info-grid">
        ${_swInfoItem('Publisher',      s.publisher)}
        ${_swInfoItem('Version',        s.version,         true)}
        ${_swInfoItem('Category',       s.category)}
        ${_swInfoItem('License Type',   s.licenseType)}
        ${_swInfoItem('License Status', s.licStatus)}
        ${_swInfoItem('Devices',        `${s.deviceCount} endpoints`)}
        ${_swInfoItem('Annual Cost',    costLabel)}
        ${_swInfoItem('Last Detected',  s.detected)}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Deployment Spread</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="flex:1;height:10px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,Math.round(s.deviceCount/50*100))}%;
                      background:var(--primary);border-radius:99px;transition:width 0.8s ease">
          </div>
        </div>
        <span style="font-size:13px;font-weight:700;color:var(--primary);
                     font-family:'JetBrains Mono',monospace">
          ${s.deviceCount} / 50
        </span>
      </div>
      <div style="font-size:11px;color:var(--text-muted)">
        Installed on ${s.deviceCount} of 50 managed endpoints
        (${Math.round(s.deviceCount/50*100)}% coverage)
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Actions</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${s.hasUpdate ? `
          <button class="btn-primary btn-sm" style="font-size:13px"
                  onclick="_swToast('🔄 Update queued for all ${s.deviceCount} devices')">
            🔄 Push Update
          </button>` : ''}
        <button class="btn-secondary btn-sm" style="font-size:13px"
                onclick="_swToast('📋 Software audit queued for ${_swHtml(s.name)}')">
          📋 Run Audit
        </button>
        <button class="btn-secondary btn-sm" style="font-size:13px"
                onclick="_swToast('🗑️ Uninstall request queued — ${s.deviceCount} devices')">
          🗑️ Uninstall All
        </button>
        <button class="btn-ghost btn-sm" style="font-size:13px"
                onclick="_swToast('📊 Usage report generated for ${_swHtml(s.name)}')">
          📊 Usage Report
        </button>
      </div>
    </div>
  `;
}

/* ── Tab 1: Devices ──────────────────────────────────────── */
function _swTabDevices(s) {
  const statusPool = ['Online','Online','Online','Offline','Warning'];
  const statusCls  = { Online:'badge-online', Offline:'badge-offline', Warning:'badge-warning' };
  function rndEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const rows = s.installedOn.map(name => {
    const st  = rndEl(statusPool);
    const ver = s.version;
    return { name, st, ver };
  });

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="drawer-section-title" style="margin-bottom:0">
          ${s.deviceCount} Devices with ${_swHtml(s.name)}
        </div>
        <button class="btn-ghost btn-sm" style="font-size:11px"
                onclick="_swToast('📋 Device list exported')">Export</button>
      </div>

      <div style="margin-bottom:10px">
        <input placeholder="Filter devices…"
               style="width:100%;background:rgba(255,255,255,0.04);
                      border:1px solid var(--border);border-radius:var(--radius-md);
                      color:var(--text-primary);font-size:12px;padding:7px 10px;
                      font-family:'Inter',sans-serif;outline:none"
               oninput="
                 const q=this.value.toLowerCase();
                 document.querySelectorAll('._swDevRow').forEach(r=>{
                   r.style.display=r.dataset.n.includes(q)?'':'none';
                 });
               "/>
      </div>

      <div style="max-height:340px;overflow-y:auto">
        ${rows.map(r => `
          <div class="_swDevRow" data-n="${r.name.toLowerCase()}"
               style="display:flex;align-items:center;gap:10px;padding:8px 0;
                      border-bottom:1px solid rgba(36,48,65,0.5)">
            <span style="font-size:14px">💻</span>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;
                          color:var(--text-primary)">${r.name}</div>
              <div style="font-size:10px;color:var(--text-muted)">v${r.ver}</div>
            </div>
            <span class="badge ${statusCls[r.st] || 'badge-info'}"
                  style="font-size:10px;padding:2px 6px">
              <span class="badge-dot"></span>${r.st}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ── Tab 2: License ──────────────────────────────────────── */
function _swTabLicense(s) {
  const compliance = s.licStatus === 'Licensed'
    ? { pct: Math.min(100, Math.round(s.deviceCount / Math.max(s.licensedSeats, 1) * 100)),
        color: 'var(--success)', label: 'Compliant' }
    : s.licStatus === 'Expired'
    ? { pct: 100, color: 'var(--danger)',  label: 'Expired'    }
    : s.licStatus === 'Trial'
    ? { pct: 60,  color: 'var(--warning)', label: 'Trial'      }
    : { pct: 100, color: 'var(--danger)',  label: 'Unlicensed' };

  const expiryDate = s.licenseType === 'Free' ? 'N/A' :
    s.licStatus === 'Expired' ? '2026-01-31' :
    s.licStatus === 'Trial'   ? '2026-07-01' :
    '2027-06-01';

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div class="drawer-section-title">License Summary</div>

      <!-- Compliance gauge -->
      <div style="padding:16px;background:rgba(255,255,255,0.03);
                  border:1px solid var(--border);border-radius:var(--radius-md);
                  margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="text-align:center;min-width:60px">
            <div style="font-size:36px;font-weight:900;color:${compliance.color};
                        letter-spacing:-1px;line-height:1">${compliance.pct}%</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">Utilization</div>
          </div>
          <div style="flex:1">
            <div style="height:8px;background:var(--border);border-radius:99px;
                        overflow:hidden;margin-bottom:8px">
              <div style="height:100%;width:${compliance.pct}%;
                          background:${compliance.color};border-radius:99px;
                          transition:width 0.8s ease"></div>
            </div>
            <div style="font-size:12px;font-weight:600;color:${compliance.color}">
              ${compliance.label}
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">
              ${s.licenseType === 'Free'
                ? 'Open source / free — no seat limit'
                : `${s.deviceCount} devices · ${s.licensedSeats} licensed seats`}
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-info-grid">
        ${_swInfoItem('License Type',    s.licenseType)}
        ${_swInfoItem('Status',          s.licStatus)}
        ${_swInfoItem('Licensed Seats',  s.licenseType === 'Free' ? 'Unlimited' : String(s.licensedSeats))}
        ${_swInfoItem('Devices Using',   String(s.deviceCount))}
        ${_swInfoItem('Unit Cost/Month', s.unitCost > 0 ? `$${s.unitCost.toFixed(2)}` : 'Free')}
        ${_swInfoItem('Annual Spend',    s.annualCost > 0 ? `$${s.annualCost.toLocaleString()}` : '$0')}
        ${_swInfoItem('Expiry Date',     expiryDate)}
        ${_swInfoItem('Last Detected',   s.detected)}
      </div>

      ${s.licStatus !== 'Licensed' && s.licenseType !== 'Free' ? `
        <div style="margin-top:16px;padding:12px 14px;
                    background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);
                    border-radius:var(--radius-md)">
          <div style="font-size:13px;font-weight:700;color:var(--danger);margin-bottom:4px">
            ⚠️ License Action Required
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">
            ${s.licStatus === 'Expired'
              ? 'License expired. Renew immediately to maintain compliance.'
              : s.licStatus === 'Trial'
              ? 'Trial period active. Purchase a full license before expiry.'
              : `${s.deviceCount} devices are running this software without a valid license.`}
          </div>
          <button class="btn-danger btn-sm" style="margin-top:10px;font-size:12px"
                  onclick="_swToast('📧 License procurement request sent to admin')">
            Request License
          </button>
        </div>` : ''}
    </div>
  `;
}

/* ── Tab 3: History ──────────────────────────────────────── */
function _swTabHistory(s) {
  const events = [
    { icon:'🔍', color:'var(--primary)',    time:'2026-06-01', msg:`Discovery scan detected ${s.deviceCount} installs` },
    { icon:'🔄', color:'var(--success)',    time:'2026-05-28', msg:`Auto-update policy evaluated — ${s.hasUpdate ? 'update pending' : 'no action needed'}` },
    { icon:'🔑', color:'#8B5CF6',           time:'2026-05-20', msg:`License compliance check: ${s.licStatus}` },
    { icon:'📦', color:'var(--info)',        time:'2026-05-15', msg:`New install detected on WIN-IT-012` },
    { icon:'🗑️', color:'var(--warning)',     time:'2026-05-10', msg:`Uninstall completed on MAC-ENG-007` },
    { icon:'⬆️', color:'var(--success)',     time:'2026-04-30', msg:`Version updated from previous release on 8 devices` },
    { icon:'📋', color:'var(--text-muted)',  time:'2026-04-15', msg:`Software audit report generated` },
    { icon:'🔐', color:'var(--danger)',      time:'2026-04-01', msg:`CVE-2026-1234 vulnerability assessment completed` },
  ];

  return `
    <div class="drawer-section" style="padding-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="drawer-section-title" style="margin-bottom:0">Software Activity Log</div>
        <button class="btn-ghost btn-sm" style="font-size:11px"
                onclick="_swToast('📊 History exported')">Export</button>
      </div>
      <div class="activity-feed">
        ${events.map(e => `
          <div class="activity-item">
            <div class="activity-icon"
                 style="background:${e.color}22;color:${e.color}">${e.icon}</div>
            <div class="activity-body">
              <div class="activity-title">${e.msg}</div>
              <div class="activity-meta">${_swHtml(s.name)}</div>
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
function _swLicBadge(status) {
  const map = {
    Licensed  : 'badge-online',
    Unlicensed: 'badge-danger',
    Expired   : 'badge-danger',
    Trial     : 'badge-warning',
  };
  return `<span class="badge ${map[status] || 'badge-info'}"
               style="font-size:10px;padding:2px 7px">
            <span class="badge-dot"></span>${status}
          </span>`;
}

function _swInfoItem(label, value, mono = false) {
  return `
    <div class="drawer-info-item">
      <div class="drawer-info-label">${label}</div>
      <div class="drawer-info-value${mono ? ' drawer-info-mono' : ''}">${_swHtml(value)}</div>
    </div>`;
}

function _swHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function _swToast(msg) {
  const existing = document.querySelectorAll('._swToast');
  const offset   = existing.length * 52;
  const t = document.createElement('div');
  t.className = '_swToast';
  t.style.cssText = `
    position:fixed;bottom:${28+offset}px;right:24px;
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-md);padding:9px 16px;
    font-size:12px;color:var(--text-primary);min-width:220px;
    box-shadow:var(--shadow-lg);z-index:9999;white-space:nowrap`;
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

/* ════════════════════════════════════════════════════════════
   EXPOSE GLOBALS
   ════════════════════════════════════════════════════════════ */
window.renderSoftwarePage  = renderSoftwarePage;
window._swOnSearch         = _swOnSearch;
window._swOnFilter         = _swOnFilter;
window._swResetFilters     = _swResetFilters;
window._swSort             = _swSort;
window._swGoPage           = _swGoPage;
window._swRowClick         = _swRowClick;
window._swToggleSelect     = _swToggleSelect;
window._swSelectAll        = _swSelectAll;
window._swBulkAction       = _swBulkAction;
window._swExportCSV        = _swExportCSV;
window._swOpenDrawer       = _swOpenDrawer;
window._swCloseDrawer      = _swCloseDrawer;
window._swSwitchTab        = _swSwitchTab;
window._swToast            = _swToast;
