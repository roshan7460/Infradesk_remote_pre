/* ============================================================
   InfraDesk Remote — scripts/pages/filetransfer.js
   Covers:
     • Dual-panel file explorer  — Local (left) & Remote (right)
       with breadcrumb nav, toolbar (New Folder / Rename /
       Delete / Refresh / Select-All), sortable columns
       (Name / Size / Modified), multi-select with Shift-click
       and Ctrl/Cmd-click, right-click context menu
     • Transfer controls column  — ▶ Upload, ◀ Download,
       Swap-panels, bandwidth cap selector
     • Transfer queue            — live animated progress bars,
       speed readout, ETA, pause/resume/cancel per item,
       bulk Clear-Completed
     • Bandwidth control         — preset chips + custom slider
       (Unlimited / 1 MB/s / 5 MB/s / 10 MB/s / Custom)
       drives simulated transfer speeds
     • Stats bar                 — total transferred, active
       transfers count, avg speed, session uptime clock
     • Live tick (500 ms)        — advances progress, updates
       speed/ETA readouts, promotes completed items,
       fires toast on completion
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   VIRTUAL FILE-SYSTEM DATA
───────────────────────────────────────────────────────────── */
const _FT_FS = {
  local: {
    '/': [
      { name:'Documents',  type:'dir',  size:0,        modified:'2026-05-28' },
      { name:'Downloads',  type:'dir',  size:0,        modified:'2026-06-01' },
      { name:'Desktop',    type:'dir',  size:0,        modified:'2026-06-01' },
      { name:'Pictures',   type:'dir',  size:0,        modified:'2026-05-10' },
      { name:'Videos',     type:'dir',  size:0,        modified:'2026-04-22' },
    ],
    '/Documents': [
      { name:'Q2-Report.docx',      type:'file', size:245760,  modified:'2026-05-30' },
      { name:'Budget-2026.xlsx',    type:'file', size:189440,  modified:'2026-05-28' },
      { name:'Infradesk-SLA.pdf',   type:'file', size:512000,  modified:'2026-05-15' },
      { name:'Meeting-Notes.txt',   type:'file', size:8192,    modified:'2026-06-01' },
      { name:'Archives',            type:'dir',  size:0,       modified:'2026-04-10' },
    ],
    '/Documents/Archives': [
      { name:'Q1-Report.docx',      type:'file', size:231424,  modified:'2026-03-31' },
      { name:'FY25-Audit.pdf',      type:'file', size:1048576, modified:'2026-01-14' },
    ],
    '/Downloads': [
      { name:'vs_code_setup.exe',   type:'file', size:85983232,modified:'2026-05-29' },
      { name:'zoom_installer.pkg',  type:'file', size:31457280,modified:'2026-05-20' },
      { name:'data-export.csv',     type:'file', size:2097152, modified:'2026-06-01' },
    ],
    '/Desktop': [
      { name:'shortcuts.lnk',       type:'file', size:1024,    modified:'2026-06-01' },
      { name:'Temp',                type:'dir',  size:0,       modified:'2026-05-31' },
    ],
    '/Desktop/Temp': [
      { name:'draft.txt',           type:'file', size:4096,    modified:'2026-05-31' },
    ],
    '/Pictures': [
      { name:'logo-v3.png',         type:'file', size:307200,  modified:'2026-05-10' },
      { name:'screenshot.jpg',      type:'file', size:204800,  modified:'2026-06-01' },
    ],
    '/Videos': [
      { name:'demo-recording.mp4',  type:'file', size:524288000,modified:'2026-04-22' },
    ],
  },
  remote: {
    '/': [
      { name:'home',       type:'dir',  size:0,        modified:'2026-06-01' },
      { name:'var',        type:'dir',  size:0,        modified:'2026-05-30' },
      { name:'etc',        type:'dir',  size:0,        modified:'2026-05-15' },
      { name:'opt',        type:'dir',  size:0,        modified:'2026-04-01' },
      { name:'tmp',        type:'dir',  size:0,        modified:'2026-06-01' },
    ],
    '/home': [
      { name:'infradesk',  type:'dir',  size:0,        modified:'2026-06-01' },
      { name:'backup',     type:'dir',  size:0,        modified:'2026-05-20' },
    ],
    '/home/infradesk': [
      { name:'config.yaml',         type:'file', size:4096,    modified:'2026-06-01' },
      { name:'agent.log',           type:'file', size:1048576, modified:'2026-06-01' },
      { name:'patches',             type:'dir',  size:0,       modified:'2026-05-28' },
      { name:'reports',             type:'dir',  size:0,       modified:'2026-05-30' },
    ],
    '/home/infradesk/patches': [
      { name:'kb5034441.msu',       type:'file', size:524288,  modified:'2026-05-28' },
      { name:'kb5033920.msu',       type:'file', size:262144,  modified:'2026-05-20' },
    ],
    '/home/infradesk/reports': [
      { name:'uptime-may.csv',      type:'file', size:65536,   modified:'2026-05-31' },
      { name:'security-may.pdf',    type:'file', size:409600,  modified:'2026-05-31' },
    ],
    '/home/backup': [
      { name:'full-2026-05-01.tar.gz',type:'file',size:2147483648,modified:'2026-05-01'},
      { name:'diff-2026-06-01.tar.gz',type:'file',size:524288000,modified:'2026-06-01'},
    ],
    '/var': [
      { name:'log',        type:'dir',  size:0,        modified:'2026-06-01' },
      { name:'www',        type:'dir',  size:0,        modified:'2026-05-10' },
    ],
    '/var/log': [
      { name:'syslog',              type:'file', size:10485760, modified:'2026-06-01' },
      { name:'auth.log',            type:'file', size:2097152,  modified:'2026-06-01' },
      { name:'kern.log',            type:'file', size:1572864,  modified:'2026-05-31' },
    ],
    '/etc': [
      { name:'hosts',               type:'file', size:1024,    modified:'2026-03-10' },
      { name:'ssh',        type:'dir',  size:0,        modified:'2026-03-10' },
      { name:'cron.d',     type:'dir',  size:0,        modified:'2026-04-15' },
    ],
    '/opt': [
      { name:'infradesk-agent', type:'dir', size:0,   modified:'2026-05-28' },
    ],
    '/tmp': [
      { name:'upload_staging',  type:'dir', size:0,   modified:'2026-06-01' },
    ],
  },
};

/* ─────────────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────────────── */
let _ftLeft  = { side:'local',  path:'/', selected:new Set(), sort:'name', asc:true };
let _ftRight = { side:'remote', path:'/', selected:new Set(), sort:'name', asc:true };
let _ftQueue = [];          // { id, name, icon, size, progress, speed, direction, status }
let _ftBwCap = 0;           // bytes/s — 0 = unlimited
let _ftTick  = null;
let _ftSessionStart = Date.now();
let _ftTotalBytes = 0;
let _ftCtxTarget  = null;   // { panel, item } for context menu
let _ftNextId = 1;
let _ftNewFolderPanel = null;
let _ftRenameTarget = null;

/* ─────────────────────────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────────────────────────── */
function renderFileTransferPage(container) {
  _ftStopTick();
  _ftQueue = [];
  _ftLeft  = { side:'local',  path:'/', selected:new Set(), sort:'name', asc:true };
  _ftRight = { side:'remote', path:'/', selected:new Set(), sort:'name', asc:true };
  _ftSessionStart = Date.now();
  _ftTotalBytes = 0;

  container.innerHTML = _ftBuildShell();
  _ftRenderPanel('left');
  _ftRenderPanel('right');
  _ftRenderQueue();
  _ftUpdateStats();
  _ftStartTick();

  /* Global click — close context menu */
  document.addEventListener('click', _ftCloseCtx, { once: false });
}

function _ftStopTick() {
  if (_ftTick) { clearInterval(_ftTick); _ftTick = null; }
}

/* ─────────────────────────────────────────────────────────────
   SHELL HTML
───────────────────────────────────────────────────────────── */
function _ftBuildShell() {
  return `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">File Transfer</h1>
        <p class="page-subtitle">Dual-panel explorer — Local ↔ Remote (SRV-PROD-001)</p>
      </div>
      <div class="page-header-actions">
        <!-- Bandwidth control -->
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted)">BW Cap:</span>
          ${['∞','1 MB/s','5 MB/s','10 MB/s'].map((l,i)=>{
            const val = [0,1048576,5242880,10485760][i];
            return `<button id="ftBw_${i}" class="filter-chip" style="font-size:10px;padding:4px 8px"
                            onclick="_ftSetBw(${val},${i})">${l}</button>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div id="ftStatsBar" style="display:flex;align-items:center;gap:20px;
         background:var(--bg-card);border:1px solid var(--border);
         border-radius:var(--radius-md);padding:10px 18px;margin-bottom:16px;
         flex-wrap:wrap;font-size:12px;font-family:'JetBrains Mono',monospace">
      <span id="ftStatActive" style="color:var(--primary)">0 active</span>
      <span style="color:var(--border)">|</span>
      <span id="ftStatSpeed"  style="color:var(--success)">0 B/s</span>
      <span style="color:var(--border)">|</span>
      <span id="ftStatTotal"  style="color:var(--text-secondary)">0 B transferred</span>
      <span style="color:var(--border)">|</span>
      <span id="ftStatUptime" style="color:var(--text-muted)">Session: 0s</span>
    </div>

    <!-- Dual panel + controls -->
    <div class="file-transfer-layout" style="margin-bottom:20px">
      <!-- LEFT panel -->
      <div class="file-panel" id="ftPanelLeft"></div>

      <!-- Transfer controls column -->
      <div class="transfer-controls">
        <button class="transfer-btn transfer-btn-upload tooltip-wrap"
                onclick="_ftTransferSelected('left')"
                title="Upload selected to remote">
          &#10145;
          <span class="tooltip">Upload →</span>
        </button>
        <button class="transfer-btn transfer-btn-download tooltip-wrap"
                onclick="_ftTransferSelected('right')"
                title="Download selected to local">
          &#8592;
          <span class="tooltip">← Download</span>
        </button>
        <button class="transfer-btn"
                style="background:rgba(255,255,255,0.05);border:1px solid var(--border);
                       color:var(--text-secondary);font-size:14px"
                onclick="_ftSwapPanels()" title="Swap panels">
          &#8646;
        </button>
      </div>

      <!-- RIGHT panel -->
      <div class="file-panel" id="ftPanelRight"></div>
    </div>

    <!-- Transfer queue -->
    <div class="transfer-queue" id="ftQueueWrap">
      <div class="transfer-queue-header">
        <span style="font-size:14px;font-weight:700;color:var(--text-primary)">
          Transfer Queue
          <span id="ftQueueCount"
                style="font-size:11px;font-weight:600;color:var(--text-muted);margin-left:6px">
            0 items
          </span>
        </span>
        <div style="display:flex;gap:8px">
          <button class="btn-ghost btn-sm" style="font-size:11px"
                  onclick="_ftPauseAll()">&#9646;&#9646; Pause All</button>
          <button class="btn-ghost btn-sm" style="font-size:11px"
                  onclick="_ftResumeAll()">&#9654; Resume All</button>
          <button class="btn-ghost btn-sm" style="font-size:11px"
                  onclick="_ftClearCompleted()">&#10005; Clear Done</button>
        </div>
      </div>
      <div id="ftQueueList"></div>
    </div>

    <!-- Context menu (hidden by default) -->
    <div id="ftCtxMenu" style="display:none;position:fixed;z-index:500;
         background:var(--bg-card);border:1px solid var(--border);
         border-radius:var(--radius-md);box-shadow:var(--shadow-lg);
         min-width:160px;padding:4px 0;font-size:13px">
    </div>

    <!-- New folder / Rename modal -->
    <div id="ftPromptModal" style="display:none;position:fixed;inset:0;z-index:600;
         background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
         align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);width:360px;max-width:95vw;padding:24px">
        <div id="ftPromptTitle" style="font-size:15px;font-weight:800;
             color:var(--text-primary);margin-bottom:16px">New Folder</div>
        <input id="ftPromptInput" placeholder="Folder name"
               style="width:100%;background:rgba(255,255,255,0.04);
                      border:1px solid var(--border);border-radius:var(--radius-md);
                      color:var(--text-primary);font-size:14px;padding:9px 12px;
                      font-family:'Inter',sans-serif;outline:none;margin-bottom:16px"/>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn-ghost btn-sm" onclick="_ftClosePrompt()">Cancel</button>
          <button class="btn-primary btn-sm" onclick="_ftConfirmPrompt()">Confirm</button>
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
   PANEL RENDER
───────────────────────────────────────────────────────────── */
function _ftRenderPanel(side) {
  const state  = side === 'left' ? _ftLeft : _ftRight;
  const el     = document.getElementById(`ftPanel${side === 'left' ? 'Left' : 'Right'}`);
  if (!el) return;

  const entries = _ftGetEntries(state.side, state.path);
  const sorted  = _ftSort(entries, state.sort, state.asc);
  const isRoot  = state.path === '/';

  const breadcrumbs = _ftBreadcrumbs(state.path);
  const sideLabel   = state.side === 'local' ? '💻 Local' : '🖥️ Remote (SRV-PROD-001)';
  const allSel      = sorted.length > 0 && sorted.every(e => state.selected.has(e.name));

  el.innerHTML = `
    <!-- Panel header -->
    <div class="file-panel-header">
      <div>
        <div class="file-panel-title">${sideLabel}</div>
        <div class="file-panel-path">${breadcrumbs}</div>
      </div>
      <div style="display:flex;gap:4px;align-items:center">
        <!-- side swap toggle -->
        <select style="background:rgba(255,255,255,0.05);border:1px solid var(--border);
                       border-radius:var(--radius-sm);color:var(--text-secondary);
                       font-size:10px;padding:3px 6px;cursor:pointer;outline:none"
                onchange="_ftSwitchSide('${side}',this.value)">
          <option value="local"  ${state.side==='local' ?'selected':''}>Local</option>
          <option value="remote" ${state.side==='remote'?'selected':''}>Remote</option>
        </select>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="file-panel-toolbar">
      <button class="btn-ghost btn-sm" style="font-size:10px;padding:3px 7px"
              ${isRoot ? 'disabled' : ''}
              onclick="_ftNavUp('${side}')">&#8593; Up</button>
      <button class="btn-ghost btn-sm" style="font-size:10px;padding:3px 7px"
              onclick="_ftRefresh('${side}')">&#8635;</button>
      <button class="btn-ghost btn-sm" style="font-size:10px;padding:3px 7px"
              onclick="_ftNewFolder('${side}')">+ Folder</button>
      <button class="btn-ghost btn-sm" style="font-size:10px;padding:3px 7px"
              onclick="_ftDeleteSelected('${side}')">🗑</button>
      <button class="btn-ghost btn-sm" style="font-size:10px;padding:3px 7px"
              onclick="_ftSelectAll('${side}')">${allSel ? 'Deselect' : 'Select All'}</button>
      <span style="font-size:10px;color:var(--text-muted);margin-left:auto">
        ${sorted.length} item${sorted.length !== 1 ? 's' : ''}
        ${state.selected.size ? ` · ${state.selected.size} selected` : ''}
      </span>
    </div>

    <!-- Column headers -->
    <div style="display:flex;align-items:center;gap:0;
                padding:5px 14px;background:rgba(255,255,255,0.02);
                border-bottom:1px solid var(--border);
                font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:0.6px;color:var(--text-muted)">
      <div style="width:22px"></div>
      <div style="flex:1;cursor:pointer" onclick="_ftSortPanel('${side}','name')">
        Name ${state.sort==='name' ? (state.asc ? '↑' : '↓') : ''}
      </div>
      <div style="width:72px;text-align:right;cursor:pointer"
           onclick="_ftSortPanel('${side}','size')">
        Size ${state.sort==='size' ? (state.asc ? '↑' : '↓') : ''}
      </div>
      <div style="width:80px;text-align:right;cursor:pointer"
           onclick="_ftSortPanel('${side}','modified')">
        Modified ${state.sort==='modified' ? (state.asc ? '↑' : '↓') : ''}
      </div>
    </div>

    <!-- File list -->
    <div class="file-list" id="ftList_${side}">
      ${!isRoot ? `
        <div class="file-item" ondblclick="_ftNavUp('${side}')"
             style="color:var(--text-muted);font-size:12px">
          <span class="file-icon">📁</span>
          <span class="file-name" style="color:var(--text-muted)">..</span>
        </div>` : ''}
      ${sorted.map(e => `
        <div class="file-item${state.selected.has(e.name) ? ' selected' : ''}"
             id="ftItem_${side}_${CSS.escape(e.name)}"
             onclick="_ftClickItem(event,'${side}','${_ftEsc(e.name)}')"
             ondblclick="_ftDblClickItem('${side}','${_ftEsc(e.name)}','${e.type}')"
             oncontextmenu="_ftShowCtx(event,'${side}','${_ftEsc(e.name)}','${e.type}')">
          <span class="file-icon">${_ftIcon(e)}</span>
          <span class="file-name">${_ftHtml(e.name)}</span>
          <span class="file-size">${e.type==='dir' ? '' : _ftFmtSize(e.size)}</span>
          <span class="file-date" style="width:80px;text-align:right">${e.modified}</span>
        </div>`).join('')}
      ${sorted.length === 0 ? `
        <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
          📂 Empty folder
        </div>` : ''}
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
   NAVIGATION & SELECTION
───────────────────────────────────────────────────────────── */
function _ftClickItem(evt, side, name) {
  evt.stopPropagation();
  const state = side === 'left' ? _ftLeft : _ftRight;
  const multi = evt.ctrlKey || evt.metaKey;
  const shift = evt.shiftKey;

  if (multi) {
    if (state.selected.has(name)) state.selected.delete(name);
    else state.selected.add(name);
  } else if (shift && state.selected.size > 0) {
    /* Shift-select: add range between last selected and this */
    const entries = _ftSort(_ftGetEntries(state.side, state.path), state.sort, state.asc);
    const names   = entries.map(e => e.name);
    const last    = [...state.selected].pop();
    const a = names.indexOf(last), b = names.indexOf(name);
    const [lo, hi] = [Math.min(a,b), Math.max(a,b)];
    names.slice(lo, hi+1).forEach(n => state.selected.add(n));
  } else {
    state.selected.clear();
    state.selected.add(name);
  }
  _ftRenderPanel(side);
}

function _ftDblClickItem(side, name, type) {
  if (type !== 'dir') return;
  const state = side === 'left' ? _ftLeft : _ftRight;
  const newPath = state.path === '/' ? `/${name}` : `${state.path}/${name}`;
  state.path = newPath;
  state.selected.clear();
  _ftRenderPanel(side);
}

function _ftNavUp(side) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  if (state.path === '/') return;
  const parts = state.path.split('/').filter(Boolean);
  parts.pop();
  state.path = parts.length ? '/' + parts.join('/') : '/';
  state.selected.clear();
  _ftRenderPanel(side);
}

function _ftRefresh(side) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  state.selected.clear();
  _ftRenderPanel(side);
  _ftToast('🔄 Panel refreshed');
}

function _ftSelectAll(side) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  const entries = _ftGetEntries(state.side, state.path);
  if (entries.every(e => state.selected.has(e.name))) {
    state.selected.clear();
  } else {
    entries.forEach(e => state.selected.add(e.name));
  }
  _ftRenderPanel(side);
}

function _ftSortPanel(side, col) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  if (state.sort === col) state.asc = !state.asc;
  else { state.sort = col; state.asc = true; }
  _ftRenderPanel(side);
}

function _ftSwitchSide(side, newSide) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  state.side = newSide;
  state.path = '/';
  state.selected.clear();
  _ftRenderPanel(side);
}

function _ftSwapPanels() {
  [_ftLeft.side, _ftRight.side] = [_ftRight.side, _ftLeft.side];
  [_ftLeft.path, _ftRight.path] = [_ftRight.path, _ftLeft.path];
  _ftLeft.selected.clear(); _ftRight.selected.clear();
  _ftRenderPanel('left');
  _ftRenderPanel('right');
  _ftToast('↔ Panels swapped');
}

/* ─────────────────────────────────────────────────────────────
   CONTEXT MENU
───────────────────────────────────────────────────────────── */
function _ftShowCtx(evt, side, name, type) {
  evt.preventDefault();
  evt.stopPropagation();
  _ftCtxTarget = { side, name, type };

  const menu = document.getElementById('ftCtxMenu');
  const actions = [
    { label:'📂 Open',          fn:`_ftDblClickItem('${side}','${name}','${type}')`, show: type==='dir' },
    { label:'⬆ Upload',        fn:`_ftTransferOne('left','${_ftEsc(name)}')`,        show: side==='local'  },
    { label:'⬇ Download',      fn:`_ftTransferOne('right','${_ftEsc(name)}')`,       show: side==='remote' },
    { label:'✏ Rename',        fn:`_ftStartRename('${side}','${_ftEsc(name)}')`,     show: true },
    { label:'🗑 Delete',        fn:`_ftDeleteOne('${side}','${_ftEsc(name)}')`,       show: true },
    { label:'📋 Copy path',    fn:`_ftCopyPath('${side}','${_ftEsc(name)}')`,        show: true },
    { label:'ℹ Properties',   fn:`_ftShowProps('${side}','${_ftEsc(name)}','${type}')`, show:true },
  ].filter(a => a.show);

  menu.innerHTML = actions.map(a =>
    `<div onclick="${a.fn};_ftCloseCtx()"
          style="padding:8px 16px;cursor:pointer;color:var(--text-primary);
                 transition:background 0.1s"
          onmouseenter="this.style.background='rgba(255,255,255,0.06)'"
          onmouseleave="this.style.background=''">${a.label}</div>`
  ).join('');

  /* Position near cursor, keep inside viewport */
  const x = Math.min(evt.clientX, window.innerWidth  - 180);
  const y = Math.min(evt.clientY, window.innerHeight - actions.length * 36 - 10);
  menu.style.left    = `${x}px`;
  menu.style.top     = `${y}px`;
  menu.style.display = 'block';
}

function _ftCloseCtx() {
  const menu = document.getElementById('ftCtxMenu');
  if (menu) menu.style.display = 'none';
}

/* ─────────────────────────────────────────────────────────────
   FILE OPERATIONS (virtual)
───────────────────────────────────────────────────────────── */
function _ftNewFolder(side) {
  _ftNewFolderPanel = side;
  _ftRenameTarget   = null;
  const m = document.getElementById('ftPromptModal');
  const t = document.getElementById('ftPromptTitle');
  const i = document.getElementById('ftPromptInput');
  if (!m) return;
  t.textContent = 'New Folder';
  i.value = '';
  i.placeholder = 'Folder name';
  m.style.display = 'flex';
  setTimeout(() => i.focus(), 80);
}

function _ftStartRename(side, name) {
  _ftNewFolderPanel = side;
  _ftRenameTarget   = name;
  const m = document.getElementById('ftPromptModal');
  const t = document.getElementById('ftPromptTitle');
  const i = document.getElementById('ftPromptInput');
  if (!m) return;
  t.textContent = 'Rename';
  i.value = name;
  i.placeholder = 'New name';
  m.style.display = 'flex';
  setTimeout(() => { i.focus(); i.select(); }, 80);
}

function _ftClosePrompt() {
  const m = document.getElementById('ftPromptModal');
  if (m) m.style.display = 'none';
}

function _ftConfirmPrompt() {
  const side  = _ftNewFolderPanel;
  const input = document.getElementById('ftPromptInput')?.value.trim();
  if (!input || !side) { _ftClosePrompt(); return; }

  const state = side === 'left' ? _ftLeft : _ftRight;
  const fs    = _FT_FS[state.side];
  const dir   = fs[state.path] || [];

  if (_ftRenameTarget) {
    /* Rename: update entry name in virtual FS */
    const idx = dir.findIndex(e => e.name === _ftRenameTarget);
    if (idx !== -1) {
      dir[idx] = { ...dir[idx], name: input };
      state.selected.clear();
      state.selected.add(input);
    }
    _ftToast(`✏ Renamed to "${input}"`);
  } else {
    /* New folder */
    if (!dir.find(e => e.name === input)) {
      dir.push({ name:input, type:'dir', size:0, modified:new Date().toISOString().slice(0,10) });
      const newPath = state.path === '/' ? `/${input}` : `${state.path}/${input}`;
      fs[newPath] = [];
    }
    _ftToast(`📁 Folder "${input}" created`);
  }

  _ftClosePrompt();
  _ftRenderPanel(side);
}

function _ftDeleteSelected(side) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  if (state.selected.size === 0) { _ftToast('⚠ Nothing selected'); return; }
  const fs  = _FT_FS[state.side];
  const dir = fs[state.path] || [];
  state.selected.forEach(name => {
    const idx = dir.findIndex(e => e.name === name);
    if (idx !== -1) dir.splice(idx, 1);
  });
  _ftToast(`🗑 Deleted ${state.selected.size} item(s)`);
  state.selected.clear();
  _ftRenderPanel(side);
}

function _ftDeleteOne(side, name) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  const fs    = _FT_FS[state.side];
  const dir   = fs[state.path] || [];
  const idx   = dir.findIndex(e => e.name === name);
  if (idx !== -1) dir.splice(idx, 1);
  state.selected.delete(name);
  _ftToast(`🗑 Deleted "${name}"`);
  _ftRenderPanel(side);
}

function _ftCopyPath(side, name) {
  const state = side === 'left' ? _ftLeft : _ftRight;
  const full  = state.path === '/' ? `/${name}` : `${state.path}/${name}`;
  /* Clipboard may be blocked in iframes — fall back to toast */
  try { navigator.clipboard.writeText(full); } catch(_) {}
  _ftToast(`📋 Path copied: ${full}`);
}

function _ftShowProps(side, name, type) {
  const state   = side === 'left' ? _ftLeft : _ftRight;
  const entries = _ftGetEntries(state.side, state.path);
  const entry   = entries.find(e => e.name === name);
  if (!entry) return;
  _ftToast(`ℹ ${name} — ${type === 'dir' ? 'Directory' : _ftFmtSize(entry.size)}, Modified: ${entry.modified}`);
}

/* ─────────────────────────────────────────────────────────────
   TRANSFER ENGINE
───────────────────────────────────────────────────────────── */
function _ftTransferSelected(fromSide) {
  const state = fromSide === 'left' ? _ftLeft : _ftRight;
  if (state.selected.size === 0) { _ftToast('⚠ Select files to transfer'); return; }
  const entries = _ftGetEntries(state.side, state.path);
  const sel     = entries.filter(e => state.selected.has(e.name) && e.type === 'file');
  if (sel.length === 0) { _ftToast('⚠ Only files can be transferred (no folders)'); return; }

  sel.forEach(e => _ftEnqueue(e, fromSide === 'left' ? 'upload' : 'download'));
  state.selected.clear();
  _ftRenderPanel(fromSide);
}

function _ftTransferOne(fromSide, name) {
  const state   = fromSide === 'left' ? _ftLeft : _ftRight;
  const entries = _ftGetEntries(state.side, state.path);
  const entry   = entries.find(e => e.name === name);
  if (!entry || entry.type !== 'file') { _ftToast('⚠ Only files can be transferred'); return; }
  _ftEnqueue(entry, fromSide === 'left' ? 'upload' : 'download');
}

function _ftEnqueue(entry, direction) {
  /* Avoid duplicate active transfers */
  const dup = _ftQueue.find(q => q.name === entry.name &&
    (q.status === 'active' || q.status === 'paused'));
  if (dup) { _ftToast(`⚠ "${entry.name}" already in queue`); return; }

  _ftQueue.push({
    id:        _ftNextId++,
    name:      entry.name,
    icon:      _ftIcon(entry),
    size:      entry.size || 1024*1024,
    progress:  0,
    speed:     0,
    eta:       '—',
    direction,
    status:    'active',   // active | paused | done | error
  });
  _ftRenderQueue();
  _ftToast(`${direction === 'upload' ? '⬆' : '⬇'} Queued: ${entry.name}`);
}

/* ─────────────────────────────────────────────────────────────
   QUEUE RENDER
───────────────────────────────────────────────────────────── */
function _ftRenderQueue() {
  const list = document.getElementById('ftQueueList');
  const cnt  = document.getElementById('ftQueueCount');
  if (!list) return;

  if (cnt) cnt.textContent = `${_ftQueue.length} item${_ftQueue.length !== 1 ? 's' : ''}`;

  if (_ftQueue.length === 0) {
    list.innerHTML = `
      <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
        📭 Queue is empty — select files and click ▶ to transfer
      </div>`;
    return;
  }

  list.innerHTML = _ftQueue.map(item => {
    const pct       = Math.round(item.progress);
    const fillClass = item.status === 'done'  ? 'transfer-progress-fill success' :
                      item.status === 'error' ? 'transfer-progress-fill'         :
                      'transfer-progress-fill';
    const fillColor = item.status === 'done'  ? '' :
                      item.status === 'error' ? 'background:var(--danger)' :
                      item.status === 'paused'? 'background:var(--warning)' : '';
    const statusIcon =
      item.status === 'done'   ? '✅' :
      item.status === 'error'  ? '❌' :
      item.status === 'paused' ? '⏸' : '⏳';
    const dirArrow = item.direction === 'upload' ? '⬆' : '⬇';

    return `
      <div class="transfer-item" id="ftQI_${item.id}">
        <div class="transfer-file-icon">${item.icon}</div>
        <div class="transfer-file-info">
          <div class="transfer-file-name">
            <span style="font-size:10px;margin-right:5px;color:${item.direction==='upload'?'var(--primary)':'var(--success)'}">${dirArrow}</span>
            ${_ftHtml(item.name)}
            <span style="font-size:10px;color:var(--text-muted);margin-left:6px">${_ftFmtSize(item.size)}</span>
          </div>
          <div class="transfer-file-progress">
            <div class="transfer-progress-row">
              <div class="transfer-progress-bar">
                <div class="${fillClass}" id="ftQP_${item.id}"
                     style="width:${pct}%;${fillColor}"></div>
              </div>
              <span class="transfer-speed" id="ftQS_${item.id}">
                ${item.status === 'done'  ? 'Done' :
                  item.status === 'error' ? 'Error':
                  item.status === 'paused'? 'Paused':
                  `${_ftFmtSize(item.speed)}/s · ETA ${item.eta}`}
              </span>
              <span style="font-size:11px;color:var(--text-muted);
                           font-family:'JetBrains Mono',monospace;min-width:32px;text-align:right">
                ${pct}%
              </span>
            </div>
          </div>
        </div>
        <div class="transfer-status-icon">${statusIcon}</div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          ${item.status === 'active' ? `
            <button class="btn-ghost btn-sm" style="font-size:10px;padding:2px 7px"
                    onclick="_ftPauseItem(${item.id})">⏸</button>` : ''}
          ${item.status === 'paused' ? `
            <button class="btn-ghost btn-sm" style="font-size:10px;padding:2px 7px"
                    onclick="_ftResumeItem(${item.id})">▶</button>` : ''}
          ${item.status !== 'done' ? `
            <button class="btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;color:var(--danger)"
                    onclick="_ftCancelItem(${item.id})">✕</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────────────────────────
   QUEUE CONTROLS
───────────────────────────────────────────────────────────── */
function _ftPauseItem(id) {
  const item = _ftQueue.find(q => q.id === id);
  if (item && item.status === 'active') { item.status = 'paused'; _ftRenderQueue(); }
}
function _ftResumeItem(id) {
  const item = _ftQueue.find(q => q.id === id);
  if (item && item.status === 'paused') { item.status = 'active'; _ftRenderQueue(); }
}
function _ftCancelItem(id) {
  const idx = _ftQueue.findIndex(q => q.id === id);
  if (idx !== -1) { _ftQueue.splice(idx, 1); _ftRenderQueue(); }
}
function _ftPauseAll() {
  _ftQueue.forEach(q => { if (q.status === 'active') q.status = 'paused'; });
  _ftRenderQueue();
}
function _ftResumeAll() {
  _ftQueue.forEach(q => { if (q.status === 'paused') q.status = 'active'; });
  _ftRenderQueue();
}
function _ftClearCompleted() {
  _ftQueue = _ftQueue.filter(q => q.status !== 'done' && q.status !== 'error');
  _ftRenderQueue();
}

/* ─────────────────────────────────────────────────────────────
   BANDWIDTH CONTROL
───────────────────────────────────────────────────────────── */
function _ftSetBw(val, idx) {
  _ftBwCap = val;
  [0,1,2,3].forEach(i => {
    const btn = document.getElementById(`ftBw_${i}`);
    if (btn) btn.classList.toggle('active', i === idx);
  });
  const label = ['Unlimited','1 MB/s','5 MB/s','10 MB/s'][idx];
  _ftToast(`⚡ Bandwidth cap: ${label}`);
}

/* ─────────────────────────────────────────────────────────────
   LIVE TICK — advances transfers, DOM-patches progress bars
───────────────────────────────────────────────────────────── */
function _ftStartTick() {
  _ftTick = setInterval(_ftOnTick, 500);
}

function _ftOnTick() {
  const active   = _ftQueue.filter(q => q.status === 'active');
  let   totalBps = 0;

  active.forEach(item => {
    /* Per-item speed: random 0.4–1.2 MB/s, capped by bandwidth cap if set */
    const rawBps  = (0.4 + Math.random() * 0.8) * 1024 * 1024;
    const bps     = _ftBwCap > 0
      ? Math.min(rawBps, _ftBwCap / Math.max(active.length, 1))
      : rawBps;
    const chunkPct = (bps / item.size) * 100 * 0.5; /* 0.5s tick */

    item.progress = Math.min(100, item.progress + chunkPct);
    item.speed    = bps;
    totalBps     += bps;

    const remaining = (100 - item.progress) / 100 * item.size;
    const etaSec    = bps > 0 ? remaining / bps : 0;
    item.eta = etaSec < 60 ? `${Math.round(etaSec)}s` : `${Math.round(etaSec/60)}m`;

    if (item.progress >= 100) {
      item.progress = 100;
      item.status   = 'done';
      item.speed    = 0;
      item.eta      = '—';
      _ftTotalBytes += item.size;
      _ftToast(`✅ ${item.name} — transfer complete`);
    }
  });

  /* DOM-patch individual bars to avoid full re-render flicker */
  _ftQueue.forEach(item => {
    const bar   = document.getElementById(`ftQP_${item.id}`);
    const speed = document.getElementById(`ftQS_${item.id}`);
    if (bar) {
      bar.style.width = `${Math.round(item.progress)}%`;
      if (item.status === 'done')  bar.style.background = 'var(--success)';
      if (item.status === 'error') bar.style.background = 'var(--danger)';
      if (item.status === 'paused') bar.style.background = 'var(--warning)';
    }
    if (speed) {
      speed.textContent =
        item.status === 'done'   ? 'Done'   :
        item.status === 'error'  ? 'Error'  :
        item.status === 'paused' ? 'Paused' :
        `${_ftFmtSize(item.speed)}/s · ETA ${item.eta}`;
    }
    /* Update status icon & buttons only when status changed */
    const row = document.getElementById(`ftQI_${item.id}`);
    if (row && (item.status === 'done' || item.status === 'error')) {
      /* Trigger a full queue re-render once per completion */
      _ftRenderQueue();
    }
  });

  _ftUpdateStats(totalBps);
}

/* ─────────────────────────────────────────────────────────────
   STATS BAR
───────────────────────────────────────────────────────────── */
function _ftUpdateStats(currentBps) {
  const active  = document.getElementById('ftStatActive');
  const speed   = document.getElementById('ftStatSpeed');
  const total   = document.getElementById('ftStatTotal');
  const uptime  = document.getElementById('ftStatUptime');

  const activeCount = _ftQueue.filter(q => q.status === 'active').length;
  const elapsed     = Math.round((Date.now() - _ftSessionStart) / 1000);
  const mins  = Math.floor(elapsed / 60);
  const secs  = elapsed % 60;

  if (active) active.textContent = `${activeCount} active`;
  if (speed)  speed.textContent  = `${_ftFmtSize(currentBps || 0)}/s`;
  if (total)  total.textContent  = `${_ftFmtSize(_ftTotalBytes)} transferred`;
  if (uptime) uptime.textContent = `Session: ${mins ? `${mins}m ` : ''}${secs}s`;
}

/* ─────────────────────────────────────────────────────────────
   VIRTUAL FS HELPERS
───────────────────────────────────────────────────────────── */
function _ftGetEntries(side, path) {
  return (_FT_FS[side] && _FT_FS[side][path]) ? [..._FT_FS[side][path]] : [];
}

function _ftSort(entries, col, asc) {
  return [...entries].sort((a, b) => {
    /* Directories always first */
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    let diff;
    if (col === 'size')     diff = a.size - b.size;
    else if (col==='modified') diff = a.modified.localeCompare(b.modified);
    else                    diff = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    return asc ? diff : -diff;
  });
}

function _ftBreadcrumbs(path) {
  if (path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  let built = '';
  return '/' + parts.map((p, i) => {
    built += '/' + p;
    return `<span style="color:var(--primary)">${p}</span>`;
  }).join('<span style="color:var(--text-muted)"> / </span>');
}

/* ─────────────────────────────────────────────────────────────
   FORMAT HELPERS
───────────────────────────────────────────────────────────── */
function _ftFmtSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function _ftIcon(entry) {
  if (entry.type === 'dir') return '📁';
  const ext = entry.name.split('.').pop().toLowerCase();
  const map = {
    pdf:'📄', docx:'📝', doc:'📝', xlsx:'📊', xls:'📊', csv:'📊',
    txt:'📄', log:'📋', yaml:'⚙️', json:'📦', xml:'📦',
    png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', svg:'🖼️',
    mp4:'🎬', mov:'🎬', avi:'🎬', mkv:'🎬',
    mp3:'🎵', wav:'🎵', flac:'🎵',
    exe:'⚙️', msi:'⚙️', pkg:'📦', deb:'📦', rpm:'📦',
    zip:'🗜️', tar:'🗜️', gz:'🗜️', rar:'🗜️', '7z':'🗜️',
    sh:'📜', py:'🐍', js:'📜', ts:'📜', html:'🌐', css:'🎨',
    lnk:'🔗', iso:'💿', msu:'🛡️',
  };
  return map[ext] || '📄';
}

function _ftHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _ftEsc(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/* ─────────────────────────────────────────────────────────────
   TOAST
───────────────────────────────────────────────────────────── */
function _ftToast(msg) {
  const existing = document.querySelectorAll('._ftToast');
  const offset   = existing.length * 52;
  const t = document.createElement('div');
  t.className = '_ftToast';
  t.style.cssText = `
    position:fixed;bottom:${28+offset}px;right:24px;
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-md);padding:9px 16px;
    font-size:12px;color:var(--text-primary);min-width:220px;
    box-shadow:var(--shadow-lg);z-index:9999;white-space:nowrap`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

/* ─────────────────────────────────────────────────────────────
   EXPOSE GLOBALS
───────────────────────────────────────────────────────────── */
window.renderFileTransferPage = renderFileTransferPage;
window._ftClickItem           = _ftClickItem;
window._ftDblClickItem        = _ftDblClickItem;
window._ftNavUp               = _ftNavUp;
window._ftRefresh             = _ftRefresh;
window._ftSelectAll           = _ftSelectAll;
window._ftSortPanel           = _ftSortPanel;
window._ftSwitchSide          = _ftSwitchSide;
window._ftSwapPanels          = _ftSwapPanels;
window._ftShowCtx             = _ftShowCtx;
window._ftCloseCtx            = _ftCloseCtx;
window._ftNewFolder           = _ftNewFolder;
window._ftStartRename         = _ftStartRename;
window._ftClosePrompt         = _ftClosePrompt;
window._ftConfirmPrompt       = _ftConfirmPrompt;
window._ftDeleteSelected      = _ftDeleteSelected;
window._ftDeleteOne           = _ftDeleteOne;
window._ftCopyPath            = _ftCopyPath;
window._ftShowProps           = _ftShowProps;
window._ftTransferSelected    = _ftTransferSelected;
window._ftTransferOne         = _ftTransferOne;
window._ftPauseItem           = _ftPauseItem;
window._ftResumeItem          = _ftResumeItem;
window._ftCancelItem          = _ftCancelItem;
window._ftPauseAll            = _ftPauseAll;
window._ftResumeAll           = _ftResumeAll;
window._ftClearCompleted      = _ftClearCompleted;
window._ftSetBw               = _ftSetBw;
