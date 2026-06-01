/* ============================================================
   InfraDesk Remote — scripts/pages/remote.js
   Covers:
     • Landing view  — connect form + recent-sessions grid
     • Active session — full mock screen, 20-action toolbar
       grouped into 6 sections, live perf bar (latency /
       fps / cpu / net / quality), slide-in chat panel,
       recording indicator + timer, clipboard panel,
       keyboard-shortcut overlay, disconnect dialog
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   MOCK DATA
──────────────────────────────────────────────────────────── */
const _RECENT_SESSIONS = [
  { id: 1, device: 'WIN-IT-042',   os: '💻', user: 'Sarah Connor',   dept: 'IT Support',  duration: '42m', status: 'ended',   latency: 18,  when: '2h ago'   },
  { id: 2, device: 'SRV-PROD-003', os: '🖥️', user: 'James Park',    dept: 'DevOps',      duration: '1h 17m', status: 'ended', latency: 24, when: '5h ago'  },
  { id: 3, device: 'MAC-HR-011',   os: '💻', user: 'Elena Kovač',   dept: 'HR',          duration: '8m',  status: 'ended',   latency: 11,  when: 'Yesterday'},
  { id: 4, device: 'LNX-DEV-088',  os: '🖥️', user: 'Raj Patel',    dept: 'Engineering', duration: '2h 3m', status: 'ended', latency: 32, when: 'Yesterday'},
  { id: 5, device: 'WIN-FIN-019',  os: '💻', user: 'Maria Santos',  dept: 'Finance',     duration: '22m', status: 'ended',   latency: 15,  when: '2d ago'  },
  { id: 6, device: 'SRV-WEB-007',  os: '🖥️', user: 'Tom Richards', dept: 'DevOps',      duration: '55m', status: 'ended',   latency: 21,  when: '3d ago'  },
];

const _CHAT_SEED = [
  { from: 'remote', name: 'Remote User', msg: 'Hey, can you see my screen?',            time: '10:32' },
  { from: 'local',  name: 'You',         msg: 'Yes, I have full view. What\'s the issue?', time: '10:32' },
  { from: 'remote', name: 'Remote User', msg: 'The app is throwing a 403 on login — see the console.',  time: '10:33' },
  { from: 'local',  name: 'You',         msg: 'Got it. Let me check the auth service logs.', time: '10:33' },
];

/* ────────────────────────────────────────────────────────────
   SESSION STATE
──────────────────────────────────────────────────────────── */
const _RS = {
  active        : false,
  deviceName    : '',
  startTs       : 0,
  durationTimer : null,
  perfTimer     : null,
  recTimer      : null,
  recSeconds    : 0,
  recording     : false,
  chatOpen      : false,
  clipboardOpen : false,
  kbShortcuts   : false,
  paused        : false,
  quality       : 'HD',       // HD | FHD | Auto
  viewMode      : 'fit',      // fit | actual | stretch
  // perf mock values (updated by interval)
  perf : { latency: 18, fps: 60, cpu: 34, net: '1.2 MB/s', quality: 5 },
};

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────── */
function renderRemotePage(container) {
  _rsCleanup();
  container.innerHTML = _buildLandingShell();
}

/* ════════════════════════════════════════════════════════════
   LANDING VIEW
   ════════════════════════════════════════════════════════════ */
function _buildLandingShell() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Remote Sessions</h1>
        <p class="page-subtitle">Initiate secure remote control of any managed endpoint</p>
      </div>
      <div class="page-header-actions">
        <span class="badge badge-online" style="font-size:12px">
          <span class="badge-dot"></span>Relay Online
        </span>
      </div>
    </div>

    <!-- Connect Card -->
    <div class="remote-connect-panel" style="min-height:320px">
      <div class="remote-connect-icon">🖱️</div>
      <div>
        <h2 style="font-size:22px;font-weight:800;margin-bottom:6px;color:var(--text-primary)">
          Connect to a Device
        </h2>
        <p style="font-size:14px;color:var(--text-secondary);max-width:380px;text-align:center">
          Enter a device ID, hostname, or IP address to start a secure encrypted session
        </p>
      </div>
      <form class="remote-connect-form" onsubmit="_rsConnect(event)">
        <input class="remote-connect-input" id="rsTargetInput"
               placeholder="Device ID / Hostname / IP"
               autocomplete="off" spellcheck="false"/>
        <button type="submit" class="btn-primary" style="padding:12px 24px;font-size:14px">
          Connect →
        </button>
      </form>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        ${['WIN-IT-042','SRV-PROD-003','MAC-HR-011'].map(h =>
          `<button class="btn-ghost btn-sm" style="font-size:12px;font-family:'JetBrains Mono',monospace"
                   onclick="document.getElementById('rsTargetInput').value='${h}'">${h}</button>`
        ).join('')}
      </div>
    </div>

    <!-- Recent Sessions -->
    <div style="margin-top:32px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3 style="font-size:15px;font-weight:700;color:var(--text-primary)">Recent Sessions</h3>
        <button class="btn-ghost btn-sm" style="font-size:12px"
                onclick="showPage('reports',null)">View all →</button>
      </div>
      <div class="session-grid">
        ${_RECENT_SESSIONS.map(s => _sessionCard(s)).join('')}
      </div>
    </div>
  `;
}

function _sessionCard(s) {
  return `
    <div class="session-card" onclick="_rsConnectById(${s.id})">
      <div class="session-card-header">
        <div>
          <div class="session-card-device">${s.os} ${s.device}</div>
          <div class="session-card-user">${s.user} · ${s.dept}</div>
        </div>
        <span class="badge badge-offline" style="font-size:10px">${s.when}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);display:flex;gap:14px">
        <span>⏱ ${s.duration}</span>
        <span>📶 ${s.latency}ms</span>
        <span>🔒 TLS 1.3</span>
      </div>
      <div class="session-card-stats" style="margin-top:10px">
        <div class="session-stat">
          <div class="session-stat-val">${s.latency}ms</div>
          <div class="session-stat-label">Latency</div>
        </div>
        <div class="session-stat">
          <div class="session-stat-val">${s.duration}</div>
          <div class="session-stat-label">Duration</div>
        </div>
        <div class="session-stat">
          <div class="session-stat-val">HD</div>
          <div class="session-stat-label">Quality</div>
        </div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   CONNECT / DISCONNECT
   ════════════════════════════════════════════════════════════ */
function _rsConnect(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('rsTargetInput');
  const target = input ? input.value.trim() : '';
  if (!target) {
    _rsShake(input);
    return;
  }
  _rsLaunchSession(target);
}

function _rsConnectById(id) {
  const s = _RECENT_SESSIONS.find(x => x.id === id);
  if (s) _rsLaunchSession(s.device);
}

function _rsShake(el) {
  if (!el) return;
  el.style.animation = 'none';
  el.style.borderColor = 'var(--danger)';
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
}

function _rsLaunchSession(deviceName) {
  _rsCleanup();
  _RS.active     = true;
  _RS.deviceName = deviceName;
  _RS.startTs    = Date.now();
  _RS.paused     = false;
  _RS.recording  = false;
  _RS.recSeconds = 0;
  _RS.chatOpen   = false;
  _RS.clipboardOpen = false;
  _RS.perf = { latency: 18, fps: 60, cpu: 34, net: '1.2 MB/s', quality: 5 };

  const container = document.getElementById('pageContent');
  if (!container) return;
  container.innerHTML = _buildSessionShell(deviceName);

  _rsStartTimers();
  _rsInitChat();
}

function _rsDisconnect() {
  // Show confirmation dialog
  _rsShowDialog(
    '🔌 End Session',
    `Disconnect from <strong>${_RS.deviceName}</strong>?<br>
     <span style="font-size:12px;color:var(--text-muted)">The remote session will be terminated and the activity logged.</span>`,
    [
      { label: 'Cancel',      cls: 'btn-ghost',   fn: () => {} },
      { label: 'Disconnect',  cls: 'btn-danger',  fn: () => {
          _rsCleanup();
          const container = document.getElementById('pageContent');
          if (container) {
            container.innerHTML = _buildLandingShell();
          }
        }
      },
    ]
  );
}

function _rsCleanup() {
  _RS.active = false;
  clearInterval(_RS.durationTimer);
  clearInterval(_RS.perfTimer);
  clearInterval(_RS.recTimer);
  _RS.durationTimer = null;
  _RS.perfTimer     = null;
  _RS.recTimer      = null;
}

/* ════════════════════════════════════════════════════════════
   ACTIVE SESSION SHELL
   ════════════════════════════════════════════════════════════ */
function _buildSessionShell(deviceName) {
  return `
    <div class="remote-session-layout" id="rsLayout">

      <!-- ── TOOLBAR ───────────────────────────────────── -->
      <div class="session-toolbar" id="rsToolbar">

        <!-- Group 1: Session info / duration -->
        <div class="session-toolbar-group" style="gap:10px;padding-right:14px">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-online" style="font-size:11px">
              <span class="badge-dot"></span>Live
            </span>
            <span style="font-size:13px;font-weight:700;color:var(--text-primary);
                         font-family:'JetBrains Mono',monospace">${deviceName}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);font-family:'JetBrains Mono',monospace"
               id="rsDuration">00:00:00</div>
        </div>

        <!-- Group 2: View / Display -->
        <div class="session-toolbar-group">
          <button class="toolbar-btn" id="tbPause"   onclick="_rsTbPause()"    title="Pause (P)">
            ⏸ <span class="toolbar-btn-label">Pause</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbFullscreen()"  title="Fullscreen (F11)">
            ⛶ <span class="toolbar-btn-label">Fullscreen</span>
          </button>
          <button class="toolbar-btn" id="tbFit"     onclick="_rsTbViewMode()" title="View Mode">
            ⊞ <span class="toolbar-btn-label" id="tbFitLabel">Fit</span>
          </button>
          <button class="toolbar-btn" id="tbQuality" onclick="_rsTbQuality()"  title="Quality">
            📺 <span class="toolbar-btn-label" id="tbQualityLabel">HD</span>
          </button>
        </div>

        <!-- Group 3: Input -->
        <div class="session-toolbar-group">
          <button class="toolbar-btn" id="tbMouse"    onclick="_rsTbToggle('tbMouse','Mouse')"    title="Toggle Mouse Input">
            🖱️ <span class="toolbar-btn-label">Mouse</span>
          </button>
          <button class="toolbar-btn active" id="tbKeyboard" onclick="_rsTbToggle('tbKeyboard','Keyboard')" title="Toggle Keyboard">
            ⌨️ <span class="toolbar-btn-label">Keyboard</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbSendCtrlAltDel()" title="Ctrl+Alt+Del">
            ⚡ <span class="toolbar-btn-label">CAD</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbKbShortcuts()"    title="Keyboard Shortcuts">
            ⌘ <span class="toolbar-btn-label">Macros</span>
          </button>
        </div>

        <!-- Group 4: Clipboard & Transfer -->
        <div class="session-toolbar-group">
          <button class="toolbar-btn" id="tbClip"     onclick="_rsTbClipboard()" title="Clipboard Sync">
            📋 <span class="toolbar-btn-label">Clipboard</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbFileTransfer()"   title="File Transfer">
            📁 <span class="toolbar-btn-label">Files</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbScreenshot()"     title="Screenshot">
            📸 <span class="toolbar-btn-label">Screenshot</span>
          </button>
          <button class="toolbar-btn" id="tbRec"      onclick="_rsTbRecord()"    title="Record Session">
            ⏺ <span class="toolbar-btn-label" id="tbRecLabel">Record</span>
          </button>
        </div>

        <!-- Group 5: Remote actions -->
        <div class="session-toolbar-group">
          <button class="toolbar-btn" onclick="_rsTbLock()"           title="Lock Remote Screen">
            🔒 <span class="toolbar-btn-label">Lock</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbBlank()"          title="Blank Remote Screen">
            ⬛ <span class="toolbar-btn-label">Blank</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbReboot()"         title="Reboot Remote Device">
            🔄 <span class="toolbar-btn-label">Reboot</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbTaskmgr()"        title="Open Task Manager">
            📊 <span class="toolbar-btn-label">Task Mgr</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbTerminal()"       title="Open Remote Terminal">
            >_ <span class="toolbar-btn-label">Terminal</span>
          </button>
        </div>

        <!-- Group 6: Collaboration & End -->
        <div class="session-toolbar-group">
          <button class="toolbar-btn" id="tbChat" onclick="_rsTbChat()" title="Chat (C)">
            💬 <span class="toolbar-btn-label" id="tbChatLabel">Chat</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbInvite()"          title="Invite Collaborator">
            👤 <span class="toolbar-btn-label">Invite</span>
          </button>
          <button class="toolbar-btn" onclick="_rsTbAuditLog()"        title="Audit Log">
            📝 <span class="toolbar-btn-label">Audit</span>
          </button>
        </div>

        <!-- Disconnect — always right-most -->
        <div style="margin-left:auto;padding-left:8px">
          <button class="toolbar-btn danger" onclick="_rsDisconnect()" title="End Session (Esc)">
            ✕ <span class="toolbar-btn-label">End</span>
          </button>
        </div>
      </div>

      <!-- ── SCREEN AREA ────────────────────────────────── -->
      <div class="session-screen-area" id="rsScreenArea">

        <!-- Mock remote desktop -->
        <div class="session-screen-mock" id="rsMockScreen">
          <div class="session-screen-topbar">
            <span class="session-screen-dot" style="background:#FF5F56"></span>
            <span class="session-screen-dot" style="background:#FFBD2E"></span>
            <span class="session-screen-dot" style="background:#27C93F"></span>
            <span style="flex:1;text-align:center;font-size:10px;color:#8b949e;
                         font-family:'JetBrains Mono',monospace">${deviceName} — Remote Desktop</span>
          </div>
          <div class="session-screen-content">
            <div class="session-sidebar-sim">
              ${['📊 Dashboard','🖥️ Devices','🔔 Alerts','🔧 Patches','⚙️ Settings']
                  .map((l,i) => `<div class="session-sidebar-row${i===0?' active':''}">${l}</div>`)
                  .join('')}
            </div>
            <div class="session-main-sim">
              ${Array.from({length:8},(_,i)=>`<div class="session-main-row"
                style="width:${[90,70,85,55,75,60,80,45][i]}%;opacity:${0.4+i*0.07}"></div>`).join('')}
            </div>
          </div>
          <!-- Animated cursor -->
          <div class="session-cursor" id="rsCursor"></div>

          <!-- Paused overlay -->
          <div id="rsPausedOverlay" style="display:none;position:absolute;inset:0;
               background:rgba(0,0,0,0.7);display:none;align-items:center;
               justify-content:center;flex-direction:column;gap:10px;z-index:10">
            <div style="font-size:48px">⏸</div>
            <div style="font-size:16px;font-weight:700;color:#fff">Session Paused</div>
            <button class="btn-primary" onclick="_rsTbPause()" style="margin-top:8px">Resume</button>
          </div>

          <!-- Recording badge -->
          <div id="rsRecBadge" style="display:none;position:absolute;top:10px;right:10px;
               background:rgba(239,68,68,0.9);color:#fff;border-radius:99px;
               padding:3px 10px;font-size:11px;font-weight:700;
               display:none;align-items:center;gap:5px;backdrop-filter:blur(4px)">
            <span style="width:7px;height:7px;border-radius:50%;background:#fff;
                         animation:_recPulse 1s ease-in-out infinite"></span>
            REC <span id="rsRecTime">00:00</span>
          </div>
        </div>

        <!-- Performance Bar -->
        <div class="session-performance-bar" id="rsPerfBar">
          <div class="perf-stat">
            <span class="perf-stat-label">LAT</span>
            <span class="perf-stat-val perf-stat-good" id="perfLatency">18ms</span>
          </div>
          <div class="perf-divider"></div>
          <div class="perf-stat">
            <span class="perf-stat-label">FPS</span>
            <span class="perf-stat-val perf-stat-good" id="perfFps">60</span>
          </div>
          <div class="perf-divider"></div>
          <div class="perf-stat">
            <span class="perf-stat-label">CPU</span>
            <span class="perf-stat-val" id="perfCpu">34%</span>
          </div>
          <div class="perf-divider"></div>
          <div class="perf-stat">
            <span class="perf-stat-label">NET</span>
            <span class="perf-stat-val" id="perfNet">1.2 MB/s</span>
          </div>
          <div class="perf-divider"></div>
          <div class="perf-stat" title="Signal quality (5 bars)">
            <div class="quality-indicator" id="perfQuality">
              ${[1,2,3,4,5].map(i =>
                `<div class="quality-bar" data-bar="${i}"
                      style="height:${6+i*3}px;background:${i<=5?'var(--success)':'var(--border)'}"></div>`
              ).join('')}
            </div>
          </div>
        </div>

        <!-- Chat Panel -->
        <div class="session-chat-panel" id="rsChatPanel">
          <div style="padding:12px 14px;border-bottom:1px solid var(--border);
                      display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">💬 Session Chat</div>
            <button class="btn-icon btn-icon-sm" onclick="_rsTbChat()" title="Close">✕</button>
          </div>
          <div class="chat-messages" id="rsChatMessages"></div>
          <div class="chat-input-row">
            <input class="chat-input" id="rsChatInput" placeholder="Type a message…"
                   onkeydown="if(event.key==='Enter')_rsSendChat()"/>
            <button class="btn-primary" style="padding:7px 12px;font-size:13px"
                    onclick="_rsSendChat()">→</button>
          </div>
        </div>

        <!-- Clipboard Panel -->
        <div id="rsClipPanel" style="display:none;position:absolute;left:12px;top:12px;
             width:300px;background:rgba(11,18,32,0.97);border:1px solid var(--border);
             border-radius:var(--radius-lg);padding:16px;z-index:20;
             backdrop-filter:blur(8px)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">📋 Clipboard Sync</div>
            <button class="btn-icon btn-icon-sm" onclick="_rsTbClipboard()">✕</button>
          </div>
          <textarea id="rsClipText" rows="4" style="width:100%;background:rgba(255,255,255,0.05);
                    border:1px solid var(--border);border-radius:var(--radius-md);
                    color:var(--text-primary);font-size:12px;padding:8px;
                    font-family:'JetBrains Mono',monospace;resize:vertical;outline:none"
                    placeholder="Paste text to sync to remote clipboard…"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn-primary btn-sm" style="font-size:12px;flex:1"
                    onclick="_rsSyncClipboard()">↑ Send to Remote</button>
            <button class="btn-secondary btn-sm" style="font-size:12px;flex:1"
                    onclick="_rsGetClipboard()">↓ Get from Remote</button>
          </div>
        </div>

        <!-- Keyboard Shortcuts Overlay -->
        <div id="rsKbOverlay" style="display:none;position:absolute;inset:0;
             background:rgba(0,0,0,0.8);z-index:30;align-items:center;justify-content:center">
          <div style="background:var(--bg-card);border:1px solid var(--border);
                      border-radius:var(--radius-xl);padding:28px;max-width:500px;width:90%">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
              <div style="font-size:16px;font-weight:800;color:var(--text-primary)">⌘ Keyboard Macros</div>
              <button class="btn-icon btn-icon-sm" onclick="_rsTbKbShortcuts()">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              ${[
                ['Ctrl+Alt+Del','Force unlock/TM'],['Win+L','Lock remote'],
                ['Win+D','Show desktop'],['Ctrl+Shift+Esc','Task Manager'],
                ['Alt+Tab','Switch window'],['Win+R','Run dialog'],
                ['Ctrl+C','Copy'],['Ctrl+V','Paste'],
                ['Print Screen','Screenshot'],['Win+E','File Explorer'],
              ].map(([k,d]) => `
                <div style="display:flex;align-items:center;justify-content:space-between;
                            padding:8px 10px;background:rgba(255,255,255,0.03);
                            border:1px solid var(--border);border-radius:var(--radius-md)">
                  <code style="font-size:11px;font-family:'JetBrains Mono',monospace;
                                color:var(--primary)">${k}</code>
                  <span style="font-size:11px;color:var(--text-muted)">${d}</span>
                </div>
              `).join('')}
            </div>
            <button class="btn-ghost btn-sm" style="margin-top:16px;width:100%;font-size:12px"
                    onclick="_rsTbKbShortcuts()">Close</button>
          </div>
        </div>

      </div><!-- /screen-area -->

    </div><!-- /session-layout -->

    <style>
      @keyframes _recPulse {
        0%,100% { opacity:1; } 50% { opacity:0.3; }
      }
    </style>
  `;
}

/* ════════════════════════════════════════════════════════════
   TIMERS
   ════════════════════════════════════════════════════════════ */
function _rsStartTimers() {
  // Duration counter
  _RS.durationTimer = setInterval(() => {
    const el = document.getElementById('rsDuration');
    if (!el) { clearInterval(_RS.durationTimer); return; }
    if (_RS.paused) return;
    const elapsed = Math.floor((Date.now() - _RS.startTs) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2,'0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2,'0');
    const s = String(elapsed % 60).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
  }, 1000);

  // Perf bar jitter
  _RS.perfTimer = setInterval(_rsUpdatePerf, 2000);
}

function _rsUpdatePerf() {
  if (!_RS.active) return;
  const jitter = v => Math.max(0, v + Math.round((Math.random()-0.5)*8));
  _RS.perf.latency = Math.max(5, jitter(_RS.perf.latency));
  _RS.perf.fps     = Math.min(60, Math.max(24, jitter(_RS.perf.fps)));
  _RS.perf.cpu     = Math.min(99, Math.max(5, jitter(_RS.perf.cpu)));
  const kbps = Math.max(200, 1200 + Math.round((Math.random()-0.5)*600));
  _RS.perf.net = kbps >= 1000 ? `${(kbps/1000).toFixed(1)} MB/s` : `${kbps} KB/s`;
  _RS.perf.quality = _RS.perf.latency < 30 ? 5 : _RS.perf.latency < 60 ? 4 : _RS.perf.latency < 100 ? 3 : 2;

  const latEl  = document.getElementById('perfLatency');
  const fpsEl  = document.getElementById('perfFps');
  const cpuEl  = document.getElementById('perfCpu');
  const netEl  = document.getElementById('perfNet');
  const qualEl = document.getElementById('perfQuality');

  if (latEl) {
    latEl.textContent = `${_RS.perf.latency}ms`;
    latEl.className   = `perf-stat-val ${_RS.perf.latency<40?'perf-stat-good':_RS.perf.latency<80?'perf-stat-warn':''}`;
  }
  if (fpsEl) {
    fpsEl.textContent = _RS.perf.fps;
    fpsEl.className   = `perf-stat-val ${_RS.perf.fps>=50?'perf-stat-good':_RS.perf.fps>=30?'perf-stat-warn':''}`;
  }
  if (cpuEl) {
    cpuEl.textContent = `${_RS.perf.cpu}%`;
    cpuEl.className   = `perf-stat-val ${_RS.perf.cpu<70?'perf-stat-good':_RS.perf.cpu<90?'perf-stat-warn':''}`;
  }
  if (netEl)  netEl.textContent = _RS.perf.net;

  if (qualEl) {
    const q = _RS.perf.quality;
    qualEl.querySelectorAll('.quality-bar').forEach((bar, i) => {
      bar.style.background = i < q
        ? (q >= 4 ? 'var(--success)' : q >= 3 ? 'var(--warning)' : 'var(--danger)')
        : 'var(--border)';
    });
  }
}

/* ════════════════════════════════════════════════════════════
   TOOLBAR ACTIONS  (20 actions)
   ════════════════════════════════════════════════════════════ */

// 1. Pause / Resume
function _rsTbPause() {
  _RS.paused = !_RS.paused;
  const btn     = document.getElementById('tbPause');
  const overlay = document.getElementById('rsPausedOverlay');
  const cursor  = document.getElementById('rsCursor');

  if (btn) {
    btn.innerHTML = `${_RS.paused ? '▶' : '⏸'} <span class="toolbar-btn-label">${_RS.paused?'Resume':'Pause'}</span>`;
    btn.classList.toggle('active', _RS.paused);
  }
  if (overlay) overlay.style.display = _RS.paused ? 'flex' : 'none';
  if (cursor)  cursor.style.animationPlayState = _RS.paused ? 'paused' : 'running';
}

// 2. Fullscreen
function _rsTbFullscreen() {
  const area = document.getElementById('rsLayout');
  if (!area) return;
  if (!document.fullscreenElement) {
    area.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

// 3. View mode cycle: fit → actual → stretch
function _rsTbViewMode() {
  const modes   = ['fit','actual','stretch'];
  const labels  = ['Fit','1:1','Stretch'];
  const screen  = document.getElementById('rsMockScreen');
  const lbl     = document.getElementById('tbFitLabel');
  const idx     = (modes.indexOf(_RS.viewMode) + 1) % 3;
  _RS.viewMode  = modes[idx];
  if (lbl) lbl.textContent = labels[idx];
  if (screen) {
    if (_RS.viewMode === 'actual')  { screen.style.width = '100%'; screen.style.maxWidth = 'none'; }
    if (_RS.viewMode === 'stretch') { screen.style.width = '100%'; screen.style.aspectRatio = 'auto'; screen.style.height = '85%'; }
    if (_RS.viewMode === 'fit')     { screen.style.width = '90%'; screen.style.maxWidth = '1000px'; screen.style.height = ''; screen.style.aspectRatio = '16/9'; }
  }
}

// 4. Quality cycle: HD → FHD → Auto → HD
function _rsTbQuality() {
  const opts = ['HD','FHD','Auto'];
  const idx  = (opts.indexOf(_RS.quality) + 1) % 3;
  _RS.quality = opts[idx];
  const lbl = document.getElementById('tbQualityLabel');
  if (lbl) lbl.textContent = _RS.quality;
  _rsToast(`Quality set to ${_RS.quality}`);
}

// 5/6. Toggle mouse / keyboard input
function _rsTbToggle(btnId, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const wasActive = btn.classList.toggle('active');
  _rsToast(`${label} input ${wasActive ? 'enabled' : 'disabled'}`);
}

// 7. Ctrl+Alt+Del
function _rsTbSendCtrlAltDel() {
  _rsToast('⚡ Ctrl+Alt+Del sent to remote');
}

// 8. Keyboard macros overlay
function _rsTbKbShortcuts() {
  _RS.kbShortcuts = !_RS.kbShortcuts;
  const el = document.getElementById('rsKbOverlay');
  if (el) el.style.display = _RS.kbShortcuts ? 'flex' : 'none';
}

// 9. Clipboard panel
function _rsTbClipboard() {
  _RS.clipboardOpen = !_RS.clipboardOpen;
  const el  = document.getElementById('rsClipPanel');
  const btn = document.getElementById('tbClip');
  if (el)  el.style.display = _RS.clipboardOpen ? 'block' : 'none';
  if (btn) btn.classList.toggle('active', _RS.clipboardOpen);
}

function _rsSyncClipboard() {
  const txt = document.getElementById('rsClipText')?.value || '';
  if (!txt) return;
  _rsToast('📋 Clipboard synced to remote');
}

function _rsGetClipboard() {
  const ta = document.getElementById('rsClipText');
  if (ta) ta.value = 'C:\\Users\\Admin\\Documents\\report_Q2_2026.xlsx';
  _rsToast('📋 Remote clipboard retrieved');
}

// 10. File transfer — navigate to file transfer page
function _rsTbFileTransfer() {
  showPage('filetransfer', null);
}

// 11. Screenshot
function _rsTbScreenshot() {
  _rsToast('📸 Screenshot captured and saved');
  // Flash effect on screen
  const screen = document.getElementById('rsMockScreen');
  if (screen) {
    screen.style.transition = 'filter 0.1s';
    screen.style.filter = 'brightness(3)';
    setTimeout(() => { screen.style.filter = ''; }, 150);
  }
}

// 12. Record session
function _rsTbRecord() {
  _RS.recording = !_RS.recording;
  const btn   = document.getElementById('tbRec');
  const lbl   = document.getElementById('tbRecLabel');
  const badge = document.getElementById('rsRecBadge');

  if (_RS.recording) {
    _RS.recSeconds = 0;
    _RS.recTimer   = setInterval(() => {
      _RS.recSeconds++;
      const m = String(Math.floor(_RS.recSeconds / 60)).padStart(2,'0');
      const s = String(_RS.recSeconds % 60).padStart(2,'0');
      const t = document.getElementById('rsRecTime');
      if (t) t.textContent = `${m}:${s}`;
    }, 1000);
    if (btn)   btn.classList.add('active');
    if (lbl)   lbl.textContent = 'Stop Rec';
    if (badge) badge.style.display = 'flex';
    _rsToast('⏺ Recording started');
  } else {
    clearInterval(_RS.recTimer);
    if (btn)   btn.classList.remove('active');
    if (lbl)   lbl.textContent = 'Record';
    if (badge) badge.style.display = 'none';
    _rsToast('⏹ Recording saved — session_rec.mp4');
  }
}

// 13. Lock remote screen
function _rsTbLock() {
  _rsToast('🔒 Remote screen locked');
  const screen = document.getElementById('rsMockScreen');
  if (screen) {
    screen.style.filter = 'blur(6px) brightness(0.4)';
    setTimeout(() => { screen.style.filter = ''; }, 2000);
  }
}

// 14. Blank remote screen
function _rsTbBlank() {
  _rsToast('⬛ Remote screen blanked (privacy mode)');
}

// 15. Reboot remote device
function _rsTbReboot() {
  _rsShowDialog(
    '🔄 Reboot Remote Device',
    `Reboot <strong>${_RS.deviceName}</strong>?<br>
     <span style="font-size:12px;color:var(--text-muted)">The session will end. The device will restart in ~60 seconds.</span>`,
    [
      { label: 'Cancel', cls: 'btn-ghost',   fn: () => {} },
      { label: 'Reboot', cls: 'btn-danger',  fn: () => {
          _rsToast('🔄 Reboot command sent');
          setTimeout(_rsDisconnect, 1500);
        }
      },
    ]
  );
}

// 16. Task Manager
function _rsTbTaskmgr() {
  _rsToast('📊 Task Manager opened on remote');
}

// 17. Remote terminal
function _rsTbTerminal() {
  _rsToast('>_ Remote terminal launched');
}

// 18. Chat panel
function _rsTbChat() {
  _RS.chatOpen = !_RS.chatOpen;
  const panel = document.getElementById('rsChatPanel');
  const btn   = document.getElementById('tbChat');
  const lbl   = document.getElementById('tbChatLabel');
  if (panel) panel.classList.toggle('open', _RS.chatOpen);
  if (btn)   btn.classList.toggle('active', _RS.chatOpen);
  if (lbl)   lbl.textContent = _RS.chatOpen ? 'Close' : 'Chat';
  if (_RS.chatOpen) {
    setTimeout(() => {
      const msgs = document.getElementById('rsChatMessages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
      document.getElementById('rsChatInput')?.focus();
    }, 320);
  }
}

// 19. Invite collaborator
function _rsTbInvite() {
  _rsShowDialog(
    '👤 Invite Collaborator',
    `<div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">
       Share this one-time link to let a teammate view this session:
     </div>
     <div style="display:flex;gap:8px">
       <code style="flex:1;padding:9px 12px;background:rgba(255,255,255,0.05);
                    border:1px solid var(--border);border-radius:var(--radius-md);
                    font-size:12px;color:var(--primary);font-family:'JetBrains Mono',monospace;
                    overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
         https://relay.infradesk.io/s/abc123xyz
       </code>
       <button class="btn-secondary btn-sm" style="font-size:12px"
               onclick="_rsToast('Link copied!')">Copy</button>
     </div>`,
    [{ label: 'Close', cls: 'btn-ghost', fn: () => {} }]
  );
}

// 20. Audit log
function _rsTbAuditLog() {
  const events = [
    { t:'00:00', e:'Session started by admin@corp.io' },
    { t:'00:12', e:'Keyboard input enabled' },
    { t:'01:43', e:'Clipboard sync — 128 bytes sent' },
    { t:'03:17', e:'Screenshot captured' },
    { t:'05:02', e:'Ctrl+Alt+Del sent' },
  ];
  _rsShowDialog(
    '📝 Session Audit Log',
    `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;
                 display:flex;flex-direction:column;gap:6px">
       ${events.map(e =>
         `<div style="display:flex;gap:12px;padding:6px 0;
                      border-bottom:1px solid rgba(36,48,65,0.5)">
            <span style="color:var(--text-muted);white-space:nowrap">${e.t}</span>
            <span style="color:var(--text-primary)">${e.e}</span>
          </div>`
       ).join('')}
     </div>`,
    [{ label: 'Close', cls: 'btn-ghost', fn: () => {} }]
  );
}

/* ════════════════════════════════════════════════════════════
   CHAT
   ════════════════════════════════════════════════════════════ */
function _rsInitChat() {
  setTimeout(() => {
    const msgs = document.getElementById('rsChatMessages');
    if (!msgs) return;
    msgs.innerHTML = _CHAT_SEED.map(m => _chatBubble(m)).join('');
    msgs.scrollTop = msgs.scrollHeight;
  }, 100);
}

function _rsSendChat() {
  const input = document.getElementById('rsChatInput');
  if (!input || !input.value.trim()) return;
  const msg = { from: 'local', name: 'You', msg: input.value.trim(), time: _rsNow() };
  _rsAppendChat(msg);
  input.value = '';
  // Simulate remote reply after delay
  setTimeout(() => {
    _rsAppendChat({ from: 'remote', name: 'Remote User',
      msg: 'Got it — give me a moment.', time: _rsNow() });
  }, 1800);
}

function _rsAppendChat(m) {
  const msgs = document.getElementById('rsChatMessages');
  if (!msgs) return;
  const div  = document.createElement('div');
  div.innerHTML = _chatBubble(m);
  msgs.appendChild(div.firstElementChild);
  msgs.scrollTop = msgs.scrollHeight;
}

function _chatBubble(m) {
  const isLocal = m.from === 'local';
  return `
    <div style="display:flex;flex-direction:column;
                align-items:${isLocal?'flex-end':'flex-start'}">
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px;
                  ${isLocal?'text-align:right':''}">
        ${m.name} · ${m.time}
      </div>
      <div class="chat-msg ${isLocal?'chat-msg-local':'chat-msg-remote'}">${m.msg}</div>
    </div>`;
}

function _rsNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ════════════════════════════════════════════════════════════
   DIALOG HELPER
   ════════════════════════════════════════════════════════════ */
function _rsShowDialog(title, body, buttons) {
  document.getElementById('_rsDialog')?.remove();

  const overlay = document.createElement('div');
  overlay.id    = '_rsDialog';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);
    z-index:500;display:flex;align-items:center;justify-content:center`;

  const box = document.createElement('div');
  box.style.cssText = `
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-xl);padding:28px;
    max-width:440px;width:90%;box-shadow:var(--shadow-lg)`;

  box.innerHTML = `
    <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:14px">${title}</div>
    <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px">${body}</div>
    <div style="display:flex;justify-content:flex-end;gap:10px" id="_rsDialogBtns"></div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const btnRow = box.querySelector('#_rsDialogBtns');
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = `${b.cls} btn-sm`;
    btn.style.fontSize = '13px';
    btn.textContent = b.label;
    btn.onclick = () => { overlay.remove(); b.fn(); };
    btnRow.appendChild(btn);
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════ */
function _rsToast(msg) {
  const existing = document.querySelectorAll('._rsToast');
  const offset   = existing.length * 52;
  const t = document.createElement('div');
  t.className = '_rsToast';
  t.style.cssText = `
    position:fixed;bottom:${28 + offset}px;left:50%;transform:translateX(-50%);
    background:var(--bg-card);border:1px solid var(--border);
    border-radius:var(--radius-md);padding:9px 20px;
    font-size:13px;color:var(--text-primary);
    box-shadow:var(--shadow-lg);z-index:9999;white-space:nowrap;
    animation:_toastIn 0.2s ease`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2800);
}

/* ════════════════════════════════════════════════════════════
   EXPOSE
   ════════════════════════════════════════════════════════════ */
window.renderRemotePage    = renderRemotePage;
window._rsConnect          = _rsConnect;
window._rsConnectById      = _rsConnectById;
window._rsDisconnect       = _rsDisconnect;
window._rsTbPause          = _rsTbPause;
window._rsTbFullscreen     = _rsTbFullscreen;
window._rsTbViewMode       = _rsTbViewMode;
window._rsTbQuality        = _rsTbQuality;
window._rsTbToggle         = _rsTbToggle;
window._rsTbSendCtrlAltDel = _rsTbSendCtrlAltDel;
window._rsTbKbShortcuts    = _rsTbKbShortcuts;
window._rsTbClipboard      = _rsTbClipboard;
window._rsSyncClipboard    = _rsSyncClipboard;
window._rsGetClipboard     = _rsGetClipboard;
window._rsTbFileTransfer   = _rsTbFileTransfer;
window._rsTbScreenshot     = _rsTbScreenshot;
window._rsTbRecord         = _rsTbRecord;
window._rsTbLock           = _rsTbLock;
window._rsTbBlank          = _rsTbBlank;
window._rsTbReboot         = _rsTbReboot;
window._rsTbTaskmgr        = _rsTbTaskmgr;
window._rsTbTerminal       = _rsTbTerminal;
window._rsTbChat           = _rsTbChat;
window._rsTbInvite         = _rsTbInvite;
window._rsTbAuditLog       = _rsTbAuditLog;
window._rsSendChat         = _rsSendChat;
window._rsToast            = _rsToast;
