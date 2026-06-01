/* ============================================================
   InfraDesk Remote — scripts/pages/helpdesk.js
   Covers:
     • Ticket Queue sidebar — search, priority dot, status badge,
       SLA countdown, active highlight
     • Ticket Detail panel — title, metadata row, SLA timer,
       description, comment thread (public + internal notes),
       reply composer with internal-toggle
     • Timeline tab — full event history with dot + connector
     • Create Ticket modal — subject, priority, category,
       assignee, description
     • Assign / Escalate inline actions
     • SLA Tracker — live countdown per ticket, breach alerts
     • KPI bar — Open / In-Progress / Breached / Resolved today
     • Live tick — SLA countdowns decrement every second
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────── */
const _HD_AGENTS = [
  { id:'a1', name:'Priya Sharma',   avatar:'PS', color:'#2563EB' },
  { id:'a2', name:'Rohan Mehta',    avatar:'RM', color:'#10B981' },
  { id:'a3', name:'Anita Gupta',    avatar:'AG', color:'#8B5CF6' },
  { id:'a4', name:'Dev Patel',      avatar:'DP', color:'#F59E0B' },
  { id:'a5', name:'Unassigned',     avatar:'—',  color:'#64748B' },
];

const _HD_CATS = ['Hardware','Software','Network','Access','Email','Other'];

const _PRI_COLOR = { critical:'#EF4444', high:'#F59E0B', medium:'#8B5CF6', low:'#2563EB' };
const _PRI_LABEL = { critical:'Critical', high:'High', medium:'Medium', low:'Low' };

/* SLA target minutes per priority */
const _SLA_MIN = { critical: 60, high: 240, medium: 480, low: 1440 };

/* ────────────────────────────────────────────────────────────
   MOCK DATA
──────────────────────────────────────────────────────────── */
let _HD_TICKETS = [
  {
    id:'TKT-1041', priority:'critical', status:'open',
    subject:'Server SRV-PROD-003 unreachable after patch',
    desc:'Production server stopped responding at 01:12 AM after the nightly patch cycle. SSH and RDP both timing out. No ping response. Critical for e-commerce checkout flow.',
    category:'Hardware', assignee:'a2',
    created: Date.now() - 38*60000,  // 38 min ago
    slaRemainingMs: 22*60000,        // 22 min remaining
    comments:[
      { author:'Rohan Mehta', avatar:'RM', color:'#10B981', text:'Checked IPMI — server is powered on but OS not responding. Initiating remote console session.', time:'32m ago', internal:false },
      { author:'Priya Sharma', avatar:'PS', color:'#2563EB', text:'Rolled back patch KB2031144. Monitoring reboot.', time:'18m ago', internal:true },
    ],
    timeline:[
      { event:'Ticket created', actor:'System', time:'38m ago', color:'#64748B' },
      { event:'Auto-assigned to Rohan Mehta', actor:'System', time:'38m ago', color:'#2563EB' },
      { event:'Status → In Progress', actor:'Rohan Mehta', time:'32m ago', color:'#10B981' },
      { event:'Internal note added', actor:'Priya Sharma', time:'18m ago', color:'#F59E0B' },
      { event:'SLA breach warning sent', actor:'System', time:'5m ago', color:'#EF4444' },
    ],
  },
  {
    id:'TKT-1040', priority:'high', status:'in-progress',
    subject:'VPN client not connecting — remote finance team',
    desc:'Entire finance team in the Pune office cannot connect to VPN since 8 AM. Error: "Authentication failed (Error 812)". Affects 14 users. Payroll processing deadline today.',
    category:'Network', assignee:'a3',
    created: Date.now() - 3*3600000,
    slaRemainingMs: 58*60000,
    comments:[
      { author:'Anita Gupta', avatar:'AG', color:'#8B5CF6', text:'Checked RADIUS — certificate expired yesterday. Renewing now.', time:'2h ago', internal:false },
      { author:'Anita Gupta', avatar:'AG', color:'#8B5CF6', text:'Certificate renewed, testing with 2 users. Deployment to all users in ~15 min.', time:'45m ago', internal:false },
    ],
    timeline:[
      { event:'Ticket created', actor:'james.park@corp.io', time:'3h ago', color:'#64748B' },
      { event:'Priority escalated to High', actor:'Priya Sharma', time:'3h ago', color:'#EF4444' },
      { event:'Assigned to Anita Gupta', actor:'Priya Sharma', time:'2h 55m ago', color:'#8B5CF6' },
      { event:'Status → In Progress', actor:'Anita Gupta', time:'2h ago', color:'#10B981' },
    ],
  },
  {
    id:'TKT-1039', priority:'medium', status:'open',
    subject:'Outlook keeps crashing on WIN-FIN-019',
    desc:'User reports Outlook 365 crashes immediately on launch since yesterday afternoon. Tried safe mode — same issue. Event log shows faulting module mso.dll.',
    category:'Software', assignee:'a4',
    created: Date.now() - 5*3600000,
    slaRemainingMs: 195*60000,
    comments:[
      { author:'Dev Patel', avatar:'DP', color:'#F59E0B', text:'Confirmed crash. Running Office repair tool remotely.', time:'3h ago', internal:false },
    ],
    timeline:[
      { event:'Ticket created', actor:'fin-user@corp.io', time:'5h ago', color:'#64748B' },
      { event:'Assigned to Dev Patel', actor:'System', time:'5h ago', color:'#F59E0B' },
      { event:'Remote session started', actor:'Dev Patel', time:'3h ago', color:'#10B981' },
    ],
  },
  {
    id:'TKT-1038', priority:'high', status:'breached',
    subject:'Active Directory lockout — 3 senior accounts',
    desc:'Three senior management accounts locked out simultaneously. Suspected credential stuffing attack. Accounts: cfo@corp.io, cto@corp.io, ceo-assistant@corp.io.',
    category:'Access', assignee:'a1',
    created: Date.now() - 6*3600000,
    slaRemainingMs: -42*60000,       // negative = breached
    comments:[
      { author:'Priya Sharma', avatar:'PS', color:'#2563EB', text:'Accounts unlocked. Forcing MFA re-enrolment. Security incident log filed.', time:'4h ago', internal:false },
      { author:'Priya Sharma', avatar:'PS', color:'#2563EB', text:'Source IP blocked at perimeter. Monitoring for further attempts.', time:'3h ago', internal:true },
    ],
    timeline:[
      { event:'Ticket created', actor:'cfo@corp.io', time:'6h ago', color:'#64748B' },
      { event:'Escalated to Critical', actor:'System', time:'6h ago', color:'#EF4444' },
      { event:'Assigned to Priya Sharma', actor:'System', time:'6h ago', color:'#2563EB' },
      { event:'⚠ SLA Breached', actor:'System', time:'4h 42m ago', color:'#EF4444' },
      { event:'Accounts unlocked', actor:'Priya Sharma', time:'4h ago', color:'#10B981' },
    ],
  },
  {
    id:'TKT-1037', priority:'low', status:'resolved',
    subject:'New monitor setup request — MAC-HR-011',
    desc:'User requests second monitor setup. Hardware delivered; needs display cable and stand assembly.',
    category:'Hardware', assignee:'a4',
    created: Date.now() - 8*3600000,
    slaRemainingMs: 0,
    comments:[
      { author:'Dev Patel', avatar:'DP', color:'#F59E0B', text:'Setup complete. User confirmed working.', time:'6h ago', internal:false },
    ],
    timeline:[
      { event:'Ticket created', actor:'hr-user@corp.io', time:'8h ago', color:'#64748B' },
      { event:'Assigned to Dev Patel', actor:'System', time:'8h ago', color:'#F59E0B' },
      { event:'Status → Resolved', actor:'Dev Patel', time:'6h ago', color:'#10B981' },
    ],
  },
  {
    id:'TKT-1036', priority:'medium', status:'resolved',
    subject:'Email quarantine false positive — finance invoices',
    desc:'Multiple legitimate invoice emails from vendor@billing.com quarantined by Defender. Need whitelist rule.',
    category:'Email', assignee:'a2',
    created: Date.now() - 10*3600000,
    slaRemainingMs: 0,
    comments:[
      { author:'Rohan Mehta', avatar:'RM', color:'#10B981', text:'Sender domain whitelisted. Quarantined emails released.', time:'8h ago', internal:false },
    ],
    timeline:[
      { event:'Ticket created', actor:'fin-user@corp.io', time:'10h ago', color:'#64748B' },
      { event:'Assigned to Rohan Mehta', actor:'System', time:'10h ago', color:'#2563EB' },
      { event:'Status → Resolved', actor:'Rohan Mehta', time:'8h ago', color:'#10B981' },
    ],
  },
];
let _hdNextId = 1042;

/* ────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────── */
let _hdSelected    = _HD_TICKETS[0].id;
let _hdFilter      = 'all';   // all | open | in-progress | breached | resolved
let _hdSearch      = '';
let _hdTab         = 'thread'; // thread | timeline
let _hdTickId      = null;
let _hdInternalNote= false;

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────── */
function renderHelpdeskPage(container) {
  _hdCleanup();
  container.innerHTML = _buildHdHtml();
  setTimeout(() => {
    _renderQueue();
    _renderDetail();
    _renderKpis();
    _hdStartTick();
  }, 40);
}

function _hdCleanup() {
  clearInterval(_hdTickId);
  _hdTickId = null;
}

/* ────────────────────────────────────────────────────────────
   HTML SHELL
──────────────────────────────────────────────────────────── */
function _buildHdHtml() {
  return `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Helpdesk</h1>
        <p class="page-subtitle">Ticket queue, SLA tracking &amp; incident resolution</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-primary btn-sm" style="font-size:12px" onclick="_hdOpenCreate()">
          + New Ticket
        </button>
      </div>
    </div>

    <!-- KPI bar -->
    <div id="hdKpis" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px"></div>

    <!-- Status filter tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
      ${['all','open','in-progress','breached','resolved'].map(f => `
        <button class="btn-ghost btn-sm" id="hdF_${f}" style="font-size:11px;text-transform:capitalize"
                onclick="_hdSetFilter('${f}')">${f==='in-progress'?'In Progress':f.charAt(0).toUpperCase()+f.slice(1)}</button>
      `).join('')}
    </div>

    <!-- Main split layout -->
    <div class="helpdesk-layout" id="hdLayout">
      <!-- Queue sidebar -->
      <div class="helpdesk-queue" id="hdQueue">
        <div class="helpdesk-queue-header">
          <span style="font-size:13px;font-weight:700;color:var(--text-primary)">Queue</span>
          <span id="hdQueueCount" style="font-size:11px;color:var(--text-muted)"></span>
        </div>
        <div class="helpdesk-queue-search">
          <input id="hdSearch" placeholder="Search tickets…" oninput="_hdOnSearch(this.value)"/>
        </div>
        <div class="helpdesk-queue-list" id="hdQueueList"></div>
      </div>

      <!-- Detail panel -->
      <div class="ticket-detail" id="hdDetail"></div>
    </div>

    <!-- Create ticket modal (hidden) -->
    <div id="hdCreateModal" style="display:none;position:fixed;inset:0;z-index:1000;
         background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
         display:flex;align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);width:520px;max-width:95vw;
                  max-height:90vh;overflow-y:auto">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:16px;font-weight:800;color:var(--text-primary)">New Ticket</span>
          <button class="btn-icon btn-icon-sm" onclick="_hdCloseCreate()">✕</button>
        </div>
        <div style="padding:24px" id="hdCreateForm">${_buildCreateForm()}</div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   KPI BAR
──────────────────────────────────────────────────────────── */
function _renderKpis() {
  const el = document.getElementById('hdKpis');
  if (!el) return;
  const kpis = [
    { label:'Open',         val: _HD_TICKETS.filter(t=>t.status==='open').length,      color:'var(--info)',    icon:'📬' },
    { label:'In Progress',  val: _HD_TICKETS.filter(t=>t.status==='in-progress').length,color:'var(--warning)', icon:'⚙️' },
    { label:'SLA Breached', val: _HD_TICKETS.filter(t=>t.status==='breached').length,   color:'var(--danger)',  icon:'🚨' },
    { label:'Resolved Today',val: _HD_TICKETS.filter(t=>t.status==='resolved').length,  color:'var(--success)', icon:'✅' },
  ];
  el.innerHTML = kpis.map(k => `
    <div style="background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-md);padding:14px 16px;
                display:flex;align-items:center;gap:12px">
      <span style="font-size:22px">${k.icon}</span>
      <div>
        <div style="font-size:22px;font-weight:900;color:${k.color};line-height:1">${k.val}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${k.label}</div>
      </div>
    </div>`).join('');
}

/* ────────────────────────────────────────────────────────────
   QUEUE
──────────────────────────────────────────────────────────── */
function _renderQueue() {
  const list = document.getElementById('hdQueueList');
  const cnt  = document.getElementById('hdQueueCount');
  if (!list) return;

  /* Update filter button active states */
  ['all','open','in-progress','breached','resolved'].forEach(f => {
    const btn = document.getElementById(`hdF_${f}`);
    if (btn) btn.classList.toggle('active', f === _hdFilter);
  });

  const visible = _HD_TICKETS.filter(t => {
    if (_hdSearch && !t.subject.toLowerCase().includes(_hdSearch.toLowerCase()) &&
        !t.id.toLowerCase().includes(_hdSearch.toLowerCase())) return false;
    if (_hdFilter === 'all') return true;
    return t.status === _hdFilter;
  });

  if (cnt) cnt.textContent = `${visible.length} ticket${visible.length!==1?'s':''}`;

  if (!visible.length) {
    list.innerHTML = `<div style="padding:24px;text-align:center;font-size:12px;
      color:var(--text-muted)">No tickets match the filter.</div>`;
    return;
  }

  list.innerHTML = visible.map(t => {
    const agent = _HD_AGENTS.find(a => a.id === t.assignee) || _HD_AGENTS[4];
    const slaClass = _slaClass(t);
    const slaLabel = t.status === 'resolved' ? '' :
      t.slaRemainingMs <= 0 ? `<span style="font-size:10px;color:var(--danger)">⚠ SLA Breached</span>` :
      `<span style="font-size:10px;color:${slaClass==='warn'?'var(--warning)':'var(--success)'}">⏱ ${_fmtMs(Math.abs(t.slaRemainingMs))}</span>`;

    return `
      <div class="ticket-item ${t.id===_hdSelected?'active':''}"
           onclick="_hdSelect('${t.id}')">
        <div class="ticket-item-top">
          <span class="ticket-id">${t.id}</span>
          <span class="ticket-priority" style="background:${_PRI_COLOR[t.priority]}"></span>
        </div>
        <div class="ticket-subject">${t.subject}</div>
        <div class="ticket-meta">
          <span>${_statusBadge(t.status)}</span>
          <span style="color:var(--text-muted)">${agent.name.split(' ')[0]}</span>
          ${slaLabel}
        </div>
      </div>`;
  }).join('');
}

/* ────────────────────────────────────────────────────────────
   DETAIL PANEL
──────────────────────────────────────────────────────────── */
function _renderDetail() {
  const el = document.getElementById('hdDetail');
  if (!el) return;
  const t = _HD_TICKETS.find(x => x.id === _hdSelected);
  if (!t) { el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Select a ticket</div>`; return; }

  const agent    = _HD_AGENTS.find(a => a.id === t.assignee) || _HD_AGENTS[4];
  const slaClass = _slaClass(t);
  const slaText  = t.status === 'resolved' ? 'Resolved — SLA Met' :
    t.slaRemainingMs <= 0 ? `Breached by ${_fmtMs(Math.abs(t.slaRemainingMs))}` :
    `${_fmtMs(t.slaRemainingMs)} remaining`;

  el.innerHTML = `
    <!-- Header -->
    <div class="ticket-detail-header">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <code style="font-size:11px;color:var(--primary);font-family:'JetBrains Mono',monospace">${t.id}</code>
            <span style="width:8px;height:8px;border-radius:50%;background:${_PRI_COLOR[t.priority]};flex-shrink:0"></span>
            <span style="font-size:11px;font-weight:700;color:${_PRI_COLOR[t.priority]}">${_PRI_LABEL[t.priority]}</span>
            ${_statusBadge(t.status)}
          </div>
          <div class="ticket-detail-title">${t.subject}</div>
        </div>
        <!-- SLA timer -->
        <div class="sla-timer ${t.status==='resolved'?'ok':slaClass}" id="hdSlaTimer_${t.id}">
          <span class="sla-timer-icon">${t.status==='resolved'?'✅':slaClass==='breach'?'🚨':'⏱'}</span>
          <span class="sla-time" id="hdSlaTime_${t.id}">${slaText}</span>
        </div>
      </div>

      <!-- Meta row -->
      <div class="ticket-detail-meta">
        <div class="ticket-meta-item">
          <span class="ticket-meta-icon">👤</span>
          <span>Assigned to</span>
          <select id="hdAssignSel" style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:4px;color:var(--text-primary);font-size:12px;padding:2px 6px;outline:none"
                  onchange="_hdAssign('${t.id}',this.value)">
            ${_HD_AGENTS.map(a=>`<option value="${a.id}" ${a.id===t.assignee?'selected':''}>${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="ticket-meta-item">
          <span class="ticket-meta-icon">🗂</span>
          <span>${t.category}</span>
        </div>
        <div class="ticket-meta-item">
          <span class="ticket-meta-icon">🕐</span>
          <span>Opened ${_fmtAgo(t.created)}</span>
        </div>
        <div class="ticket-meta-item" style="margin-left:auto;gap:6px">
          ${t.status !== 'resolved' ? `
            <button class="btn-ghost btn-sm" style="font-size:11px" onclick="_hdEscalate('${t.id}')">⬆ Escalate</button>
            <button class="btn-primary btn-sm" style="font-size:11px" onclick="_hdResolve('${t.id}')">✓ Resolve</button>
          ` : `<button class="btn-ghost btn-sm" style="font-size:11px" onclick="_hdReopen('${t.id}')">↩ Reopen</button>`}
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border);flex-shrink:0">
      ${['thread','timeline'].map(tab => `
        <button style="padding:10px 20px;font-size:13px;font-weight:600;background:none;border:none;
                       color:${_hdTab===tab?'var(--primary)':'var(--text-secondary)'};
                       border-bottom:2px solid ${_hdTab===tab?'var(--primary)':'transparent'};
                       cursor:pointer;transition:var(--transition)"
                onclick="_hdSwitchTab('${tab}')">
          ${tab.charAt(0).toUpperCase()+tab.slice(1)}
        </button>`).join('')}
    </div>

    <!-- Body -->
    <div class="ticket-detail-body" id="hdDetailBody">
      ${_hdTab === 'thread' ? _renderThread(t) : _renderTimeline(t)}
    </div>

    <!-- Reply composer (thread tab only) -->
    ${_hdTab === 'thread' && t.status !== 'resolved' ? `
      <div style="padding:16px 24px;border-top:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">Reply</span>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-muted);cursor:pointer">
            <input type="checkbox" id="hdInternalChk" ${_hdInternalNote?'checked':''}
                   onchange="_hdToggleInternal(this.checked)"/>
            Internal note
          </label>
        </div>
        <textarea id="hdReplyText" rows="3"
          placeholder="${_hdInternalNote?'Internal note (not visible to user)…':'Reply to user…'}"
          style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);
                 border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;
                 padding:10px 12px;resize:vertical;font-family:'Inter',sans-serif;outline:none;
                 ${_hdInternalNote?'border-color:rgba(245,158,11,0.4);':''}"></textarea>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;gap:8px">
          <button class="btn-ghost btn-sm" style="font-size:12px" onclick="_hdClearReply()">Clear</button>
          <button class="btn-primary btn-sm" style="font-size:12px" onclick="_hdSendReply('${t.id}')">
            ${_hdInternalNote?'💬 Add Note':'📤 Send Reply'}
          </button>
        </div>
      </div>` : ''}
  `;
}

/* ────────────────────────────────────────────────────────────
   THREAD
──────────────────────────────────────────────────────────── */
function _renderThread(t) {
  return `
    <div class="ticket-description">${t.desc}</div>
    ${t.comments.map(c => `
      <div class="ticket-comment">
        <div class="comment-avatar" style="background:${c.color}">${c.avatar}</div>
        <div class="comment-bubble ${c.internal?'internal':''}">
          <div class="comment-header">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="comment-author">${c.author}</span>
              ${c.internal?'<span class="comment-internal-badge">Internal</span>':''}
            </div>
            <span class="comment-time">${c.time}</span>
          </div>
          <div class="comment-text">${c.text}</div>
        </div>
      </div>`).join('')}
    ${t.comments.length === 0 ? `<div style="padding:20px 0;text-align:center;font-size:13px;color:var(--text-muted)">No replies yet.</div>` : ''}
  `;
}

/* ────────────────────────────────────────────────────────────
   TIMELINE
──────────────────────────────────────────────────────────── */
function _renderTimeline(t) {
  return `
    <div class="timeline">
      ${t.timeline.map(ev => `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:${ev.color}"></div>
          <div class="timeline-content">
            <div class="timeline-event">${ev.event}</div>
            <div class="timeline-actor">${ev.actor}</div>
            <div class="timeline-time">${ev.time}</div>
          </div>
        </div>`).join('')}
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   CREATE TICKET FORM
──────────────────────────────────────────────────────────── */
function _buildCreateForm() {
  return `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Subject *</label>
        <input id="hdCSubject" placeholder="Brief description of the issue"
               style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);
                      border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;
                      padding:9px 12px;font-family:'Inter',sans-serif;outline:none"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Priority</label>
          <select id="hdCPriority" style="width:100%;background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;padding:9px 12px;outline:none">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Category</label>
          <select id="hdCCategory" style="width:100%;background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;padding:9px 12px;outline:none">
            ${_HD_CATS.map(c=>`<option>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Assign To</label>
        <select id="hdCAssignee" style="width:100%;background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;padding:9px 12px;outline:none">
          ${_HD_AGENTS.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Description</label>
        <textarea id="hdCDesc" rows="4" placeholder="Full details of the issue…"
                  style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);
                         border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;
                         padding:9px 12px;resize:vertical;font-family:'Inter',sans-serif;outline:none"></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px">
        <button class="btn-ghost btn-sm" onclick="_hdCloseCreate()">Cancel</button>
        <button class="btn-primary btn-sm" onclick="_hdSubmitCreate()">Create Ticket</button>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   ACTIONS
──────────────────────────────────────────────────────────── */
function _hdSelect(id) {
  _hdSelected = id;
  _hdTab      = 'thread';
  _renderQueue();
  _renderDetail();
}

function _hdSetFilter(f) {
  _hdFilter = f;
  _renderQueue();
}

function _hdOnSearch(val) {
  _hdSearch = val;
  _renderQueue();
}

function _hdSwitchTab(tab) {
  _hdTab = tab;
  _renderDetail();
}

function _hdToggleInternal(checked) {
  _hdInternalNote = checked;
  _renderDetail();
}

function _hdClearReply() {
  const ta = document.getElementById('hdReplyText');
  if (ta) ta.value = '';
}

function _hdSendReply(ticketId) {
  const ta = document.getElementById('hdReplyText');
  if (!ta || !ta.value.trim()) return;
  const t = _HD_TICKETS.find(x => x.id === ticketId);
  if (!t) return;
  t.comments.push({
    author: 'Priya Sharma', avatar: 'PS', color: '#2563EB',
    text: ta.value.trim(),
    time: 'just now',
    internal: _hdInternalNote,
  });
  t.timeline.push({
    event: _hdInternalNote ? 'Internal note added' : 'Reply sent to user',
    actor: 'Priya Sharma', time: 'just now', color: '#2563EB',
  });
  _hdInternalNote = false;
  _renderDetail();
  _hdToast(_hdInternalNote ? '💬 Note added' : '📤 Reply sent');
}

function _hdAssign(ticketId, agentId) {
  const t = _HD_TICKETS.find(x => x.id === ticketId);
  const a = _HD_AGENTS.find(x => x.id === agentId);
  if (!t || !a) return;
  t.assignee = agentId;
  t.timeline.push({ event:`Reassigned to ${a.name}`, actor:'Priya Sharma', time:'just now', color:a.color });
  _renderQueue();
  _hdToast(`👤 Assigned to ${a.name}`);
}

function _hdEscalate(ticketId) {
  const t = _HD_TICKETS.find(x => x.id === ticketId);
  if (!t) return;
  const order = ['low','medium','high','critical'];
  const idx   = order.indexOf(t.priority);
  if (idx < order.length - 1) {
    t.priority = order[idx + 1];
    t.slaRemainingMs = _SLA_MIN[t.priority] * 60000 * 0.5; // fresh SLA at 50%
    t.timeline.push({ event:`Escalated to ${_PRI_LABEL[t.priority]}`, actor:'Priya Sharma', time:'just now', color:'#EF4444' });
    _renderQueue();
    _renderDetail();
    _renderKpis();
    _hdToast(`⬆ Escalated to ${_PRI_LABEL[t.priority]}`);
  } else {
    _hdToast('Already at Critical priority');
  }
}

function _hdResolve(ticketId) {
  const t = _HD_TICKETS.find(x => x.id === ticketId);
  if (!t) return;
  t.status = 'resolved';
  t.slaRemainingMs = 0;
  t.timeline.push({ event:'Status → Resolved', actor:'Priya Sharma', time:'just now', color:'#10B981' });
  _renderQueue();
  _renderDetail();
  _renderKpis();
  _hdToast(`✅ Ticket ${ticketId} resolved`);
}

function _hdReopen(ticketId) {
  const t = _HD_TICKETS.find(x => x.id === ticketId);
  if (!t) return;
  t.status = 'open';
  t.slaRemainingMs = _SLA_MIN[t.priority] * 60000;
  t.timeline.push({ event:'Ticket Reopened', actor:'Priya Sharma', time:'just now', color:'#F59E0B' });
  _renderQueue();
  _renderDetail();
  _renderKpis();
  _hdToast(`↩ Ticket ${ticketId} reopened`);
}

function _hdOpenCreate() {
  const m = document.getElementById('hdCreateModal');
  if (m) m.style.display = 'flex';
}

function _hdCloseCreate() {
  const m = document.getElementById('hdCreateModal');
  if (m) m.style.display = 'none';
}

function _hdSubmitCreate() {
  const subj = document.getElementById('hdCSubject')?.value.trim();
  if (!subj) { _hdToast('⚠ Subject is required'); return; }
  const pri  = document.getElementById('hdCPriority')?.value  || 'medium';
  const cat  = document.getElementById('hdCCategory')?.value  || 'Other';
  const asgn = document.getElementById('hdCAssignee')?.value  || 'a5';
  const desc = document.getElementById('hdCDesc')?.value.trim()|| '';

  const newTicket = {
    id      : `TKT-${_hdNextId++}`,
    priority: pri, status: 'open',
    subject : subj, desc, category: cat, assignee: asgn,
    created : Date.now(),
    slaRemainingMs: _SLA_MIN[pri] * 60000,
    comments: [],
    timeline: [
      { event:'Ticket created', actor:'Priya Sharma', time:'just now', color:'#64748B' },
      ...(_HD_AGENTS.find(a=>a.id===asgn)?.name !== 'Unassigned'
        ? [{ event:`Assigned to ${_HD_AGENTS.find(a=>a.id===asgn).name}`, actor:'System', time:'just now', color:'#2563EB' }]
        : []),
    ],
  };

  _HD_TICKETS.unshift(newTicket);
  _hdSelected = newTicket.id;
  _hdCloseCreate();
  _renderQueue();
  _renderDetail();
  _renderKpis();
  _hdToast(`🎫 Ticket ${newTicket.id} created`);
}

/* ────────────────────────────────────────────────────────────
   LIVE SLA TICK  (every 1 s)
──────────────────────────────────────────────────────────── */
function _hdStartTick() {
  _hdTickId = setInterval(() => {
    let needsRefresh = false;

    _HD_TICKETS.forEach(t => {
      if (t.status === 'resolved') return;
      t.slaRemainingMs -= 1000;

      /* Breach transition */
      if (t.slaRemainingMs <= 0 && t.status !== 'breached') {
        t.status = 'breached';
        t.timeline.push({ event:'⚠ SLA Breached', actor:'System', time:'just now', color:'#EF4444' });
        needsRefresh = true;
        _hdToast(`🚨 SLA breached: ${t.id}`);
      }

      /* Update visible SLA timer in detail panel */
      if (t.id === _hdSelected) {
        const timeEl = document.getElementById(`hdSlaTime_${t.id}`);
        const timerEl= document.getElementById(`hdSlaTimer_${t.id}`);
        if (timeEl && timerEl) {
          if (t.slaRemainingMs <= 0) {
            timeEl.textContent  = `Breached by ${_fmtMs(Math.abs(t.slaRemainingMs))}`;
            timerEl.className   = 'sla-timer breach';
          } else {
            timeEl.textContent  = `${_fmtMs(t.slaRemainingMs)} remaining`;
            timerEl.className   = `sla-timer ${_slaClass(t)}`;
          }
        }
      }
    });

    if (needsRefresh) {
      _renderQueue();
      _renderKpis();
    }
  }, 1000);
}

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────── */
function _slaClass(t) {
  if (t.slaRemainingMs <= 0)           return 'breach';
  if (t.slaRemainingMs < 30 * 60000)   return 'warn';
  return 'ok';
}

function _fmtMs(ms) {
  const totalMin = Math.floor(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const s = Math.floor((Math.abs(ms) % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`;
  return `${s}s`;
}

function _fmtAgo(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

const _STATUS_COLORS = {
  'open'       : { bg:'rgba(37,99,235,0.15)',  text:'#60A5FA' },
  'in-progress': { bg:'rgba(245,158,11,0.15)', text:'var(--warning)' },
  'breached'   : { bg:'rgba(239,68,68,0.15)',  text:'var(--danger)'  },
  'resolved'   : { bg:'rgba(16,185,129,0.15)', text:'var(--success)' },
};

function _statusBadge(status) {
  const s = _STATUS_COLORS[status] || { bg:'rgba(100,116,139,0.15)', text:'#94A3B8' };
  const lbl = status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase()+status.slice(1);
  return `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;
                       background:${s.bg};color:${s.text}">${lbl}</span>`;
}

function _hdToast(msg) {
  const existing = document.querySelectorAll('._hdToast');
  const offset   = existing.length * 54;
  const t = document.createElement('div');
  t.className = '_hdToast';
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
window.renderHelpdeskPage  = renderHelpdeskPage;
window._hdSelect           = _hdSelect;
window._hdSetFilter        = _hdSetFilter;
window._hdOnSearch         = _hdOnSearch;
window._hdSwitchTab        = _hdSwitchTab;
window._hdToggleInternal   = _hdToggleInternal;
window._hdClearReply       = _hdClearReply;
window._hdSendReply        = _hdSendReply;
window._hdAssign           = _hdAssign;
window._hdEscalate         = _hdEscalate;
window._hdResolve          = _hdResolve;
window._hdReopen           = _hdReopen;
window._hdOpenCreate       = _hdOpenCreate;
window._hdCloseCreate      = _hdCloseCreate;
window._hdSubmitCreate     = _hdSubmitCreate;
