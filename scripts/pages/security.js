/* ============================================================
   InfraDesk Remote — scripts/pages/security.js
   Covers:
     • Security Score hero  — animated SVG ring, grade (A–F),
       4 sub-score bars (Patch / Access / Network / Endpoint)
     • Compliance Dashboard — SOC 2, GDPR, HIPAA, ISO 27001
       each with mini SVG ring, % score, status badge, and
       expandable control checklist
     • Threat Event Log     — severity bar, icon, name/desc,
       device, time, status; real-time "new threat" simulation
     • Audit Log            — typed entries (auth/access/
       config/threat) with user + timestamp
     • Remediation Actions  — quick-fix buttons per threat
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   MOCK DATA
──────────────────────────────────────────────────────────── */
const _SEC = {
  score : 81,   // overall 0-100
  grade : 'B+',
  sub   : [
    { label: 'Patch Compliance',  val: 88, color: '#10B981', icon: '🔧' },
    { label: 'Access Control',    val: 74, color: '#2563EB', icon: '🔐' },
    { label: 'Network Security',  val: 79, color: '#8B5CF6', icon: '🌐' },
    { label: 'Endpoint Security', val: 85, color: '#F59E0B', icon: '🖥️' },
  ],
};

const _COMPLIANCE = [
  {
    id: 'soc2', name: 'SOC 2', logo: '🛡️',
    standard: 'Type II — Trust Services', score: 87,
    status: 'compliant',
    controls: [
      { id: 'CC6.1',  name: 'Logical access controls',      pass: true  },
      { id: 'CC6.7',  name: 'Data transmission protection',  pass: true  },
      { id: 'CC7.2',  name: 'Security event monitoring',     pass: true  },
      { id: 'CC8.1',  name: 'Change management process',     pass: false },
      { id: 'A1.1',   name: 'Availability commitments',      pass: true  },
    ],
  },
  {
    id: 'gdpr', name: 'GDPR', logo: '🇪🇺',
    standard: 'EU 2016/679', score: 73,
    status: 'partial',
    controls: [
      { id: 'Art.5',  name: 'Principles of data processing', pass: true  },
      { id: 'Art.25', name: 'Data protection by design',     pass: false },
      { id: 'Art.32', name: 'Security of processing',        pass: true  },
      { id: 'Art.33', name: 'Breach notification ≤72h',      pass: false },
      { id: 'Art.35', name: 'Data protection impact assess.', pass: true },
    ],
  },
  {
    id: 'hipaa', name: 'HIPAA', logo: '🏥',
    standard: 'Security Rule 45 CFR', score: 91,
    status: 'compliant',
    controls: [
      { id: '164.308', name: 'Administrative safeguards',    pass: true  },
      { id: '164.310', name: 'Physical safeguards',          pass: true  },
      { id: '164.312', name: 'Technical safeguards',         pass: true  },
      { id: '164.314', name: 'Org. requirements',            pass: true  },
      { id: '164.316', name: 'Policies & procedures',        pass: false },
    ],
  },
  {
    id: 'iso', name: 'ISO 27001', logo: '📋',
    standard: 'ISMS — 2022 Edition', score: 68,
    status: 'partial',
    controls: [
      { id: 'A.5',  name: 'Information security policies',   pass: true  },
      { id: 'A.8',  name: 'Asset management',                pass: false },
      { id: 'A.9',  name: 'Access control',                  pass: true  },
      { id: 'A.12', name: 'Operations security',             pass: false },
      { id: 'A.16', name: 'Incident management',             pass: true  },
    ],
  },
];

let _THREATS = [
  { id:1,  sev:'critical', icon:'🦠', name:'Malware Detected',          desc:'Trojan.GenericKD found in temp directory',       device:'WIN-IT-042',   time:'2m ago',   status:'open'    },
  { id:2,  sev:'high',     icon:'🔓', name:'Brute-Force Attempt',       desc:'412 failed SSH logins in 10 minutes',            device:'SRV-PROD-003', time:'8m ago',   status:'open'    },
  { id:3,  sev:'high',     icon:'📡', name:'Unusual Outbound Traffic',  desc:'45 MB data exfiltration attempt to 185.x.x.x',   device:'LNX-DEV-088',  time:'15m ago',  status:'investigating' },
  { id:4,  sev:'medium',   icon:'🔑', name:'Privilege Escalation',      desc:'Non-admin account executed sudo without approval',device:'WIN-FIN-019',  time:'31m ago',  status:'resolved' },
  { id:5,  sev:'medium',   icon:'🌐', name:'Suspicious DNS Query',      desc:'Query to known C2 domain blocked by firewall',   device:'MAC-HR-011',   time:'1h ago',   status:'resolved' },
  { id:6,  sev:'low',      icon:'🔐', name:'MFA Bypass Attempt',        desc:'TOTP token reuse detected and blocked',          device:'WIN-IT-042',   time:'2h ago',   status:'resolved' },
  { id:7,  sev:'low',      icon:'📦', name:'Unsigned Software Exec.',   desc:'Unrecognized binary executed from Downloads',    device:'MAC-HR-011',   time:'3h ago',   status:'open'    },
  { id:8,  sev:'info',     icon:'🕵️', name:'Policy Scan Completed',    desc:'Full endpoint policy scan finished — 2 gaps found',device:'All devices', time:'4h ago',   status:'resolved' },
];
let _threatNextId = 9;

const _AUDIT_LOG = [
  { time:'02:41:08', action:'Admin login from 103.xx.xx.14 (Mumbai)',          user:'admin@corp.io',   type:'auth'   },
  { time:'02:38:22', action:'Firewall rule #47 modified — port 443 added',     user:'devops@corp.io',  type:'config' },
  { time:'02:31:55', action:'User james.park@corp.io accessed billing records', user:'james.park',     type:'access' },
  { time:'02:28:03', action:'Malware quarantine — WIN-IT-042',                  user:'system',         type:'threat' },
  { time:'02:19:17', action:'MFA enrolled for 3 new accounts',                  user:'admin@corp.io',  type:'auth'   },
  { time:'02:11:44', action:'SSH key rotated — SRV-PROD-003',                   user:'devops@corp.io', type:'config' },
  { time:'01:55:30', action:'GDPR data export request fulfilled',               user:'admin@corp.io',  type:'access' },
  { time:'01:43:12', action:'Brute-force IP 192.0.2.x blocked',                user:'system',         type:'threat' },
  { time:'01:30:00', action:'Nightly vulnerability scan started',               user:'system',         type:'config' },
  { time:'01:12:08', action:'User account locked — 5 failed logins',           user:'system',         type:'auth'   },
];

/* ────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────── */
let _secTickId        = null;
let _secExpandedComp  = null;   // id of expanded compliance card
let _secThreatFilter  = 'all';  // all | open | critical
let _secChart         = null;   // Chart.js threat-trend doughnut

/* ────────────────────────────────────────────────────────────
   ENTRY POINT
──────────────────────────────────────────────────────────── */
function renderSecurityPage(container) {
  _secCleanup();
  Chart.defaults.color       = '#64748B';
  Chart.defaults.font.family = "'Inter','JetBrains Mono',sans-serif";
  Chart.defaults.font.size   = 11;

  container.innerHTML = _buildSecHtml();

  setTimeout(() => {
    _drawScoreRing();
    _drawComplianceRings();
    _drawThreatDonut();
    _renderThreatLog();
    _secStartTick();
  }, 60);
}

function _secCleanup() {
  clearInterval(_secTickId);
  _secTickId = null;
  if (_secChart) { try { _secChart.destroy(); } catch(_){} _secChart = null; }
}

/* ────────────────────────────────────────────────────────────
   HTML SHELL
──────────────────────────────────────────────────────────── */
function _buildSecHtml() {
  return `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Security Center</h1>
        <p class="page-subtitle">Threat detection, compliance posture &amp; audit trail</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-ghost btn-sm" style="font-size:12px" onclick="_secRunScan()">
          🔍 Run Scan
        </button>
        <button class="btn-secondary btn-sm" style="font-size:12px" onclick="_secExportReport()">
          ⬇ Export Report
        </button>
      </div>
    </div>

    <!-- ── SCORE HERO ─────────────────────────────────────── -->
    <div class="security-score-hero" id="secScoreHero">
      <div class="security-score-ring">
        <svg id="secRingSvg" width="140" height="140" viewBox="0 0 140 140"></svg>
      </div>
      <div class="security-score-info">
        <div class="security-score-grade" id="secGrade"
             style="color:${_gradeColor(_SEC.grade)}">${_SEC.grade}</div>
        <div class="security-score-label">Security Score — <span id="secScoreVal">${_SEC.score}</span>/100</div>
        <div class="security-score-desc">
          Your infrastructure security posture is <strong>${_scoreLbl(_SEC.score)}</strong>.
          2 critical threats require immediate attention. Patch compliance is your strongest area.
        </div>
        <!-- Sub-score bars -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
          ${_SEC.sub.map(s => `
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:14px">${s.icon}</span>
              <span style="font-size:12px;color:var(--text-secondary);width:150px">${s.label}</span>
              <div style="flex:1;height:5px;background:var(--border);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${s.val}%;background:${s.color};border-radius:99px;
                             transition:width 1s ease"></div>
              </div>
              <span style="font-size:12px;font-weight:700;color:${s.color};width:32px;text-align:right">${s.val}</span>
            </div>`).join('')}
        </div>
      </div>
      <!-- Score breakdown items -->
      <div class="security-score-items">
        ${[
          { label:'Open Threats',   val: _THREATS.filter(t=>t.status==='open').length,          color:'var(--danger)'  },
          { label:'Devices at Risk',val: 3,                                                       color:'var(--warning)' },
          { label:'Vulnerabilities',val: 12,                                                      color:'var(--warning)' },
          { label:'Passed Controls',val: `${_compliancePassRate()}%`,                            color:'var(--success)' },
          { label:'Last Scan',      val: '2h ago',                                               color:'var(--text-secondary)' },
        ].map(i => `
          <div class="security-score-item">
            <div class="security-score-item-dot" style="background:${i.color}"></div>
            <div class="security-score-item-label">${i.label}</div>
            <div class="security-score-item-val" style="color:${i.color}">${i.val}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- ── COMPLIANCE GRID ────────────────────────────────── -->
    <div style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
      <h3 style="font-size:14px;font-weight:700;color:var(--text-primary)">Compliance Dashboard</h3>
      <span style="font-size:12px;color:var(--text-muted)">Click a card to expand controls</span>
    </div>
    <div class="compliance-grid" id="secCompGrid">
      ${_COMPLIANCE.map(c => _complianceCard(c)).join('')}
    </div>
    <!-- Expanded compliance controls panel -->
    <div id="secCompControls" style="display:none;margin-bottom:24px;background:var(--bg-card);
         border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden"></div>

    <!-- ── THREAT LOG + DONUT ─────────────────────────────── -->
    <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;margin-bottom:24px">

      <!-- Threat log -->
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="font-size:14px;font-weight:700;color:var(--text-primary)">Threat Event Log</div>
          <div style="display:flex;gap:6px">
            ${['all','open','critical'].map(f =>
              `<button class="btn-ghost btn-sm" id="secTF_${f}" style="font-size:11px"
                       onclick="_secSetFilter('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
            ).join('')}
          </div>
        </div>
        <div id="secThreatList"></div>
      </div>

      <!-- Threat distribution donut -->
      <div style="background:var(--bg-card);border:1px solid var(--border);
                  border-radius:var(--radius-lg);padding:20px;display:flex;
                  flex-direction:column;align-items:center">
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);
                    margin-bottom:14px;align-self:flex-start">By Severity</div>
        <canvas id="secDonut" width="180" height="180" style="max-width:180px"></canvas>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:6px;width:100%">
          ${[
            {label:'Critical', color:'#EF4444'},
            {label:'High',     color:'#F59E0B'},
            {label:'Medium',   color:'#8B5CF6'},
            {label:'Low',      color:'#2563EB'},
            {label:'Info',     color:'#64748B'},
          ].map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
              <div style="display:flex;align-items:center;gap:7px">
                <span style="width:9px;height:9px;border-radius:50%;background:${s.color};display:inline-block"></span>
                <span style="color:var(--text-secondary)">${s.label}</span>
              </div>
              <span style="font-weight:700;color:var(--text-primary);font-family:'JetBrains Mono',monospace">
                ${_THREATS.filter(t=>t.sev===s.label.toLowerCase()).length}
              </span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ── AUDIT LOG ──────────────────────────────────────── -->
    <div style="background:var(--bg-card);border:1px solid var(--border);
                border-radius:var(--radius-lg);overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                  display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary)">Audit Log</div>
        <span style="font-size:12px;color:var(--text-muted)">Last 24 hours · ${_AUDIT_LOG.length} events</span>
      </div>
      <div>
        ${_AUDIT_LOG.map(e => `
          <div class="audit-item">
            <div class="audit-time">${e.time}</div>
            <div style="flex:1">
              <div class="audit-action">${e.action}</div>
              <div class="audit-user">${e.user}</div>
            </div>
            <div class="audit-type audit-type-${e.type}">${e.type}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   SCORE RING SVG  (animated stroke-dashoffset)
──────────────────────────────────────────────────────────── */
function _drawScoreRing() {
  const svg = document.getElementById('secRingSvg');
  if (!svg) return;
  const r = 58, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const pct  = _SEC.score / 100;
  const color = _scoreColor(_SEC.score);

  svg.innerHTML = `
    <!-- track -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="rgba(255,255,255,0.07)" stroke-width="10"/>
    <!-- fill -->
    <circle id="secRingFill" cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="${color}" stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${circ}"
            transform="rotate(-90 ${cx} ${cy})"/>
    <!-- value text -->
    <text x="${cx}" y="${cy - 6}" text-anchor="middle"
          fill="${color}" font-size="28" font-weight="900"
          font-family="'Inter',sans-serif">${_SEC.score}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle"
          fill="#64748B" font-size="11"
          font-family="'Inter',sans-serif">out of 100</text>`;

  /* Animate fill in */
  const fill = document.getElementById('secRingFill');
  if (fill) {
    setTimeout(() => {
      fill.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
      fill.style.strokeDashoffset = circ * (1 - pct);
    }, 100);
  }
}

/* ────────────────────────────────────────────────────────────
   COMPLIANCE CARDS + MINI RINGS
──────────────────────────────────────────────────────────── */
function _complianceCard(c) {
  return `
    <div class="compliance-card" id="secComp_${c.id}"
         onclick="_secToggleCompliance('${c.id}')" style="cursor:pointer">
      <div class="compliance-logo">${c.logo}</div>
      <div class="compliance-name">${c.name}</div>
      <div class="compliance-standard">${c.standard}</div>
      <div class="compliance-score-ring">
        <svg width="80" height="80" viewBox="0 0 80 80" id="secCompRing_${c.id}"></svg>
      </div>
      <div class="compliance-status ${c.status}">
        ${c.status === 'compliant' ? '✅' : c.status === 'partial' ? '⚠️' : '❌'}
        ${c.status.replace('-',' ')}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
        ${c.controls.filter(x=>x.pass).length}/${c.controls.length} controls passing
      </div>
    </div>`;
}

function _drawComplianceRings() {
  _COMPLIANCE.forEach(c => {
    const svg = document.getElementById(`secCompRing_${c.id}`);
    if (!svg) return;
    const r = 32, cx = 40, cy = 40;
    const circ = 2 * Math.PI * r;
    const pct  = c.score / 100;
    const color = c.score >= 85 ? '#10B981' : c.score >= 65 ? '#F59E0B' : '#EF4444';

    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
              stroke="rgba(255,255,255,0.07)" stroke-width="7"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
              stroke="${color}" stroke-width="7"
              stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ * (1 - pct)}"
              transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle"
            fill="${color}" font-size="14" font-weight="800"
            font-family="'Inter',sans-serif">${c.score}%</text>`;
  });
}

function _secToggleCompliance(id) {
  const panel = document.getElementById('secCompControls');
  const card  = document.getElementById(`secComp_${id}`);
  if (!panel) return;

  if (_secExpandedComp === id) {
    _secExpandedComp = null;
    panel.style.display = 'none';
    document.querySelectorAll('.compliance-card').forEach(el =>
      el.style.borderColor = '');
    return;
  }

  _secExpandedComp = id;
  document.querySelectorAll('.compliance-card').forEach(el =>
    el.style.borderColor = '');
  if (card) card.style.borderColor = 'var(--primary)';

  const c = _COMPLIANCE.find(x => x.id === id);
  if (!c) return;

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:14px;font-weight:700;color:var(--text-primary)">
        ${c.logo} ${c.name} — Control Checklist
      </div>
      <button class="btn-icon btn-icon-sm" onclick="_secToggleCompliance('${id}')">✕</button>
    </div>
    ${c.controls.map(ctrl => `
      <div style="display:flex;align-items:center;gap:14px;padding:12px 18px;
                  border-bottom:1px solid rgba(36,48,65,0.4)">
        <span style="font-size:18px">${ctrl.pass ? '✅' : '❌'}</span>
        <code style="font-size:11px;color:var(--primary);font-family:'JetBrains Mono',monospace;
                     width:70px;flex-shrink:0">${ctrl.id}</code>
        <span style="flex:1;font-size:13px;color:var(--text-${ctrl.pass?'secondary':'primary'})">${ctrl.name}</span>
        ${!ctrl.pass ? `<button class="btn-ghost btn-sm" style="font-size:11px"
          onclick="_secRemediateControl('${c.id}','${ctrl.id}')">Remediate →</button>` : ''}
      </div>`).join('')}`;
}

function _secRemediateControl(compId, ctrlId) {
  const c    = _COMPLIANCE.find(x => x.id === compId);
  const ctrl = c?.controls.find(x => x.id === ctrlId);
  if (!ctrl) return;
  ctrl.pass = true;
  _secToggleCompliance(compId);
  _secToggleCompliance(compId);  // re-open refreshed
  _secToast(`✅ ${ctrlId} remediated for ${c.name}`);
}

/* ────────────────────────────────────────────────────────────
   THREAT LOG
──────────────────────────────────────────────────────────── */
const _SEV_COLOR = { critical:'#EF4444', high:'#F59E0B', medium:'#8B5CF6', low:'#2563EB', info:'#64748B' };
const _STATUS_BADGE = {
  open         : `<span class="badge badge-danger" style="font-size:10px">Open</span>`,
  investigating: `<span class="badge badge-warning" style="font-size:10px">Investigating</span>`,
  resolved     : `<span class="badge badge-online" style="font-size:10px">Resolved</span>`,
};

function _renderThreatLog() {
  const wrap = document.getElementById('secThreatList');
  if (!wrap) return;

  /* Highlight active filter button */
  ['all','open','critical'].forEach(f => {
    const btn = document.getElementById(`secTF_${f}`);
    if (btn) btn.classList.toggle('active', f === _secThreatFilter);
  });

  const list = _THREATS.filter(t => {
    if (_secThreatFilter === 'open')     return t.status === 'open';
    if (_secThreatFilter === 'critical') return t.sev === 'critical';
    return true;
  });

  if (!list.length) {
    wrap.innerHTML = `<div style="padding:32px;text-align:center;font-size:13px;
      color:var(--text-muted)">No threats match the current filter.</div>`;
    return;
  }

  wrap.innerHTML = list.map(t => `
    <div class="threat-item" id="secThreat_${t.id}">
      <div class="threat-severity" style="background:${_SEV_COLOR[t.sev]||'#64748B'}"></div>
      <div class="threat-icon" style="background:${_SEV_COLOR[t.sev]}1a">${t.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="threat-name">${t.name}</div>
        <div class="threat-desc">${t.desc}</div>
        <div class="threat-device">${t.device}</div>
      </div>
      <div class="threat-meta">
        <div class="threat-time">${t.time}</div>
        <div style="margin-top:5px">${_STATUS_BADGE[t.status]||''}</div>
        ${t.status === 'open' ? `
          <div style="margin-top:6px;display:flex;gap:4px;justify-content:flex-end">
            <button class="btn-ghost btn-sm" style="font-size:10px"
                    onclick="_secInvestigate(${t.id})">Investigate</button>
            <button class="btn-primary btn-sm" style="font-size:10px"
                    onclick="_secResolve(${t.id})">Resolve</button>
          </div>` : ''}
      </div>
    </div>`).join('');
}

function _secSetFilter(f) {
  _secThreatFilter = f;
  _renderThreatLog();
}

function _secInvestigate(id) {
  const t = _THREATS.find(x => x.id === id);
  if (t) { t.status = 'investigating'; _renderThreatLog(); _secToast(`🔍 Investigating: ${t.name}`); }
}

function _secResolve(id) {
  const t = _THREATS.find(x => x.id === id);
  if (t) { t.status = 'resolved'; _renderThreatLog(); _secToast(`✅ Resolved: ${t.name}`); _secUpdateDonut(); }
}

/* ────────────────────────────────────────────────────────────
   THREAT DISTRIBUTION DONUT  (Chart.js)
──────────────────────────────────────────────────────────── */
function _sevCounts() {
  const s = { critical:0, high:0, medium:0, low:0, info:0 };
  _THREATS.forEach(t => { if (s[t.sev] !== undefined) s[t.sev]++; });
  return s;
}

function _drawThreatDonut() {
  const canvas = document.getElementById('secDonut');
  if (!canvas) return;
  const s = _sevCounts();
  _secChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels  : ['Critical','High','Medium','Low','Info'],
      datasets: [{
        data           : [s.critical, s.high, s.medium, s.low, s.info],
        backgroundColor: ['#EF4444','#F59E0B','#8B5CF6','#2563EB','#64748B'],
        borderColor    : 'var(--bg-card)',
        borderWidth    : 3,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      cutout             : '68%',
      animation          : { duration: 600 },
      plugins: {
        legend : { display: false },
        tooltip: {
          backgroundColor: 'rgba(11,18,32,0.92)',
          borderColor    : 'rgba(255,255,255,0.08)',
          borderWidth    : 1,
          titleColor     : '#F8FAFC',
          bodyColor      : '#94A3B8',
          padding        : 10,
        },
      },
    },
  });
}

function _secUpdateDonut() {
  if (!_secChart) return;
  const s = _sevCounts();
  _secChart.data.datasets[0].data = [s.critical, s.high, s.medium, s.low, s.info];
  _secChart.update();
}

/* ────────────────────────────────────────────────────────────
   LIVE TICK  (new threat injection every ~30 s)
──────────────────────────────────────────────────────────── */
const _NEW_THREATS = [
  { sev:'high',   icon:'🔒', name:'Ransomware Signature',  desc:'WannaCry variant detected in memory scan',        device:'WIN-IT-042'   },
  { sev:'medium', icon:'📧', name:'Phishing Email Blocked', desc:'Malicious attachment stripped by mail gateway',   device:'MAC-HR-011'   },
  { sev:'low',    icon:'🔑', name:'Password Reuse Alert',   desc:'Credential stuffing attempt using leaked password',device:'WIN-FIN-019' },
  { sev:'critical',icon:'🌐', name:'Zero-Day Exploit Attempt','desc':'CVE-2026-XXXX exploit blocked at perimeter',  device:'SRV-WEB-007' },
];
let _newThreatIdx = 0;

function _secStartTick() {
  _secTickId = setInterval(() => {
    /* Inject a new threat every ~30 ticks (30 s) */
    if (Math.random() < 0.033) {
      const tpl = _NEW_THREATS[_newThreatIdx++ % _NEW_THREATS.length];
      _THREATS.unshift({ ...tpl, id: _threatNextId++, time: 'just now', status: 'open' });
      if (_THREATS.length > 20) _THREATS.pop();
      _renderThreatLog();
      _secUpdateDonut();
      _secToast(`🚨 New ${tpl.sev} threat: ${tpl.name}`);
    }
  }, 1000);
}

/* ────────────────────────────────────────────────────────────
   ACTIONS
──────────────────────────────────────────────────────────── */
function _secRunScan() {
  _secToast('🔍 Full security scan initiated — estimated 4 min');
}

function _secExportReport() {
  const lines = [
    'InfraDesk Security Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Overall Score: ${_SEC.score}/100  Grade: ${_SEC.grade}`,
    '',
    'SUB-SCORES',
    ..._SEC.sub.map(s => `  ${s.label}: ${s.val}/100`),
    '',
    'THREAT SUMMARY',
    ..._THREATS.map(t => `  [${t.sev.toUpperCase()}] ${t.name} — ${t.device} — ${t.status}`),
    '',
    'COMPLIANCE',
    ..._COMPLIANCE.map(c => `  ${c.name}: ${c.score}% (${c.status})`),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `infradesk_security_${Date.now()}.txt`;
  a.click();
  _secToast('⬇ Security report exported');
}

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────── */
function _scoreColor(s)  { return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444'; }
function _gradeColor(g)  { return g.startsWith('A') ? '#10B981' : g.startsWith('B') ? '#2563EB' : g.startsWith('C') ? '#F59E0B' : '#EF4444'; }
function _scoreLbl(s)    { return s >= 90 ? 'Excellent' : s >= 80 ? 'Good' : s >= 70 ? 'Fair' : s >= 50 ? 'Poor' : 'Critical'; }

function _compliancePassRate() {
  let pass = 0, total = 0;
  _COMPLIANCE.forEach(c => { c.controls.forEach(x => { total++; if(x.pass) pass++; }); });
  return Math.round((pass/total)*100);
}

function _secToast(msg) {
  const existing = document.querySelectorAll('._secToast');
  const offset   = existing.length * 54;
  const t = document.createElement('div');
  t.className = '_secToast';
  t.style.cssText = `
    position:fixed;bottom:${28+offset}px;right:24px;
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
──────────────────────────────────────────────────────────── */
window.renderSecurityPage       = renderSecurityPage;
window._secSetFilter            = _secSetFilter;
window._secInvestigate          = _secInvestigate;
window._secResolve              = _secResolve;
window._secToggleCompliance     = _secToggleCompliance;
window._secRemediateControl     = _secRemediateControl;
window._secRunScan              = _secRunScan;
window._secExportReport         = _secExportReport;
