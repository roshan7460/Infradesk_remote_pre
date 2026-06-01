/**
 * alerts.js — Alert Center Page
 * InfraDesk Remote | Page 17
 * Features: Timeline, Correlation engine, Root cause analysis
 */

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

const ALERT_STATUSES = ['firing', 'acknowledged', 'resolved', 'suppressed'];

const MOCK_ALERTS = [
  {
    id: 'ALT-001',
    title: 'CPU usage exceeded 95% threshold',
    severity: 'critical',
    status: 'firing',
    source: 'system-monitor',
    host: 'prod-web-01',
    category: 'performance',
    firedAt: Date.now() - 1000 * 60 * 8,
    updatedAt: Date.now() - 1000 * 60 * 2,
    count: 14,
    correlationGroup: 'grp-001',
    tags: ['cpu', 'production'],
    description: 'CPU utilization on prod-web-01 has been above 95% for 8 consecutive minutes. This may indicate a runaway process or unexpected traffic spike.',
    rootCause: {
      confidence: 88,
      hypothesis: 'Runaway Node.js worker process (PID 23841) consuming 87% of CPU since 03:14 AM.',
      evidence: [
        'Process PID 23841 showing abnormal CPU spike at 03:14 AM',
        'No recent deployments detected in the 60 min prior window',
        'Memory usage stable — rules out memory leak cascade',
        'Network I/O normal — rules out DDoS or traffic surge',
      ],
      recommendation: 'Kill PID 23841 and investigate the latest job queue for runaway tasks.',
    },
    timeline: [
      { time: Date.now() - 1000 * 60 * 8, event: 'Alert fired — CPU crossed 95%', actor: 'system' },
      { time: Date.now() - 1000 * 60 * 6, event: 'Correlated with ALT-003 (memory pressure)', actor: 'correlation-engine' },
      { time: Date.now() - 1000 * 60 * 3, event: 'Root cause analysis completed', actor: 'rca-engine' },
      { time: Date.now() - 1000 * 60 * 2, event: 'Notification sent to on-call team', actor: 'alert-dispatcher' },
    ],
  },
  {
    id: 'ALT-002',
    title: 'Disk usage at 91% on /var/log',
    severity: 'high',
    status: 'acknowledged',
    source: 'system-monitor',
    host: 'prod-db-02',
    category: 'storage',
    firedAt: Date.now() - 1000 * 60 * 35,
    updatedAt: Date.now() - 1000 * 60 * 20,
    count: 3,
    correlationGroup: null,
    tags: ['disk', 'storage', 'production'],
    description: 'Disk partition /var/log on prod-db-02 is at 91% capacity. If it reaches 100%, the database will stop writing transaction logs.',
    rootCause: {
      confidence: 94,
      hypothesis: 'Log rotation misconfiguration allowing query logs to grow unbounded.',
      evidence: [
        '/var/log/mysql/slow-query.log is 38 GB — last rotation was 14 days ago',
        'logrotate config for mysql is missing the compress directive',
        'Disk usage trend: +2.1 GB/day for past 7 days',
      ],
      recommendation: 'Run log rotation manually, then fix /etc/logrotate.d/mysql to rotate daily with compression.',
    },
    timeline: [
      { time: Date.now() - 1000 * 60 * 35, event: 'Alert fired — disk at 85%', actor: 'system' },
      { time: Date.now() - 1000 * 60 * 30, event: 'Severity escalated to high (now at 91%)', actor: 'system' },
      { time: Date.now() - 1000 * 60 * 20, event: 'Acknowledged by devops@company.com', actor: 'devops@company.com' },
      { time: Date.now() - 1000 * 60 * 18, event: 'Root cause analysis completed', actor: 'rca-engine' },
    ],
  },
  {
    id: 'ALT-003',
    title: 'Memory pressure — swap usage 74%',
    severity: 'high',
    status: 'firing',
    source: 'system-monitor',
    host: 'prod-web-01',
    category: 'performance',
    firedAt: Date.now() - 1000 * 60 * 9,
    updatedAt: Date.now() - 1000 * 60 * 2,
    count: 9,
    correlationGroup: 'grp-001',
    tags: ['memory', 'swap', 'production'],
    description: 'Swap usage on prod-web-01 has reached 74%. Combined with elevated CPU, this indicates the system is under severe resource pressure.',
    rootCause: null,
    timeline: [
      { time: Date.now() - 1000 * 60 * 9, event: 'Alert fired — swap crossed 70%', actor: 'system' },
      { time: Date.now() - 1000 * 60 * 6, event: 'Correlated with ALT-001 (CPU spike)', actor: 'correlation-engine' },
    ],
  },
  {
    id: 'ALT-004',
    title: 'SSL certificate expires in 7 days',
    severity: 'medium',
    status: 'firing',
    source: 'cert-watcher',
    host: 'api.infradesk.io',
    category: 'security',
    firedAt: Date.now() - 1000 * 60 * 60 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
    count: 1,
    correlationGroup: null,
    tags: ['ssl', 'certificate', 'security'],
    description: 'The TLS certificate for api.infradesk.io will expire in 7 days. Auto-renewal via Let\'s Encrypt appears to have failed.',
    rootCause: {
      confidence: 99,
      hypothesis: 'Certbot renewal cron job failed due to port 80 being blocked by the new firewall rule pushed on May 26.',
      evidence: [
        'certbot renew exit code 1 in /var/log/letsencrypt/letsencrypt.log',
        'Firewall rule "block-port-80" added on 2026-05-26 at 14:32',
        'ACME HTTP-01 challenge requires port 80 to be reachable',
      ],
      recommendation: 'Temporarily allow port 80 for the ACME challenge, renew the certificate, then re-block port 80.',
    },
    timeline: [
      { time: Date.now() - 1000 * 60 * 60 * 3, event: 'Alert fired — cert expiry warning (7 days)', actor: 'cert-watcher' },
    ],
  },
  {
    id: 'ALT-005',
    title: 'Backup job failed — prod-db-01',
    severity: 'high',
    status: 'firing',
    source: 'backup-agent',
    host: 'prod-db-01',
    category: 'backup',
    firedAt: Date.now() - 1000 * 60 * 60 * 1.5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 1.5,
    count: 2,
    correlationGroup: null,
    tags: ['backup', 'database', 'production'],
    description: 'The scheduled nightly backup for prod-db-01 failed at 02:00 AM. Last successful backup was 26 hours ago.',
    rootCause: {
      confidence: 76,
      hypothesis: 'S3 bucket policy change blocking the backup IAM role from writing to the destination bucket.',
      evidence: [
        'AWS S3 PutObject returned AccessDenied for role infradesk-backup-agent',
        'Bucket policy was modified on 2026-06-01 at 22:14',
        'IAM role permissions unchanged — bucket-side policy is the likely blocker',
      ],
      recommendation: 'Review and restore the S3 bucket policy to allow the infradesk-backup-agent role write access.',
    },
    timeline: [
      { time: Date.now() - 1000 * 60 * 60 * 1.5, event: 'Backup job started', actor: 'backup-agent' },
      { time: Date.now() - 1000 * 60 * 85, event: 'S3 write failed — AccessDenied', actor: 'backup-agent' },
      { time: Date.now() - 1000 * 60 * 84, event: 'Alert fired — backup failure', actor: 'system' },
      { time: Date.now() - 1000 * 60 * 82, event: 'Root cause analysis completed', actor: 'rca-engine' },
    ],
  },
  {
    id: 'ALT-006',
    title: 'Patch deployment succeeded — staging-01',
    severity: 'info',
    status: 'resolved',
    source: 'patch-manager',
    host: 'staging-01',
    category: 'patching',
    firedAt: Date.now() - 1000 * 60 * 60 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 4.5,
    count: 1,
    correlationGroup: null,
    tags: ['patch', 'staging'],
    description: 'All 14 pending patches were applied successfully to staging-01. System reboot completed in 2m 18s.',
    rootCause: null,
    timeline: [
      { time: Date.now() - 1000 * 60 * 60 * 5, event: 'Patch job started (14 patches)', actor: 'patch-manager' },
      { time: Date.now() - 1000 * 60 * 60 * 4.6, event: 'All patches applied — initiating reboot', actor: 'patch-manager' },
      { time: Date.now() - 1000 * 60 * 60 * 4.5, event: 'System online — alert resolved', actor: 'system' },
    ],
  },
  {
    id: 'ALT-007',
    title: 'Unusual login attempt — admin account',
    severity: 'critical',
    status: 'firing',
    source: 'log-collector',
    host: 'auth-server-01',
    category: 'security',
    firedAt: Date.now() - 1000 * 60 * 14,
    updatedAt: Date.now() - 1000 * 60 * 14,
    count: 47,
    correlationGroup: 'grp-002',
    tags: ['security', 'auth', 'brute-force'],
    description: '47 failed login attempts on the admin account from IP 185.220.101.47 (Tor exit node) in the past 14 minutes. Account is currently unlocked.',
    rootCause: {
      confidence: 97,
      hypothesis: 'Automated brute-force attack from a known Tor exit node targeting the admin account.',
      evidence: [
        'IP 185.220.101.47 listed in Tor exit node registry',
        '47 failed attempts in 14 min — pattern consistent with automated tooling',
        'All attempts using username "admin" with sequential password patterns',
        'No successful authentication observed',
      ],
      recommendation: 'Block IP 185.220.101.47, enable account lockout after 5 attempts, and enforce MFA on admin accounts immediately.',
    },
    timeline: [
      { time: Date.now() - 1000 * 60 * 14, event: 'Alert fired — 5 failed logins detected', actor: 'log-collector' },
      { time: Date.now() - 1000 * 60 * 12, event: 'Severity escalated to critical (47 attempts)', actor: 'system' },
      { time: Date.now() - 1000 * 60 * 11, event: 'Correlated with ALT-008 (port scan)', actor: 'correlation-engine' },
      { time: Date.now() - 1000 * 60 * 10, event: 'Root cause analysis completed', actor: 'rca-engine' },
      { time: Date.now() - 1000 * 60 * 10, event: 'Security team notified via PagerDuty', actor: 'alert-dispatcher' },
    ],
  },
  {
    id: 'ALT-008',
    title: 'Port scan detected from external IP',
    severity: 'high',
    status: 'firing',
    source: 'log-collector',
    host: 'firewall-01',
    category: 'security',
    firedAt: Date.now() - 1000 * 60 * 15,
    updatedAt: Date.now() - 1000 * 60 * 14,
    count: 1,
    correlationGroup: 'grp-002',
    tags: ['security', 'network', 'scan'],
    description: 'Systematic port scan from 185.220.101.47 targeting ports 22, 80, 443, 3306, 5432, 8080, 8443 detected at firewall level.',
    rootCause: null,
    timeline: [
      { time: Date.now() - 1000 * 60 * 15, event: 'Port scan detected by firewall IDS', actor: 'firewall-01' },
      { time: Date.now() - 1000 * 60 * 14, event: 'Correlated with ALT-007 (brute-force)', actor: 'correlation-engine' },
    ],
  },
];

// Correlation groups
const CORRELATION_GROUPS = {
  'grp-001': {
    id: 'grp-001',
    label: 'prod-web-01 Resource Exhaustion',
    alertIds: ['ALT-001', 'ALT-003'],
    summary: 'CPU spike and memory pressure on prod-web-01 are correlated — likely caused by a single runaway process.',
  },
  'grp-002': {
    id: 'grp-002',
    label: 'External Attack Campaign',
    alertIds: ['ALT-007', 'ALT-008'],
    summary: 'Port scan followed by brute-force login attempts from the same IP — indicative of a coordinated attack.',
  },
};

// ─── State ────────────────────────────────────────────────────────────────────

const alertState = {
  alerts: MOCK_ALERTS.map(a => ({ ...a })),
  selected: null,
  filter: { severity: 'all', status: 'all', category: 'all', search: '' },
  view: 'list', // 'list' | 'timeline'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function absoluteTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const SEVERITY_META = {
  critical: { color: 'var(--color-error)',        bg: 'var(--color-error-highlight)',    icon: 'alert-octagon',  label: 'Critical' },
  high:     { color: 'var(--color-warning)',       bg: 'var(--color-warning-highlight)',  icon: 'alert-triangle', label: 'High'     },
  medium:   { color: 'var(--color-gold)',          bg: 'var(--color-gold-highlight)',     icon: 'alert-circle',   label: 'Medium'   },
  low:      { color: 'var(--color-blue)',          bg: 'var(--color-blue-highlight)',     icon: 'info',           label: 'Low'      },
  info:     { color: 'var(--color-text-muted)',    bg: 'var(--color-surface-offset)',     icon: 'check-circle-2', label: 'Info'     },
};

const STATUS_META = {
  firing:       { color: 'var(--color-error)',        label: 'Firing'       },
  acknowledged: { color: 'var(--color-warning)',       label: 'Acknowledged' },
  resolved:     { color: 'var(--color-success)',       label: 'Resolved'     },
  suppressed:   { color: 'var(--color-text-muted)',    label: 'Suppressed'   },
};

function severityBadge(sev) {
  const m = SEVERITY_META[sev] || SEVERITY_META.info;
  return `<span class="sev-badge sev-${sev}" style="background:${m.bg};color:${m.color}">${m.label}</span>`;
}

function statusDot(status) {
  const m = STATUS_META[status] || STATUS_META.resolved;
  return `<span class="status-dot" style="background:${m.color}" title="${m.label}"></span>`;
}

function filteredAlerts() {
  const { severity, status, category, search } = alertState.filter;
  return alertState.alerts.filter(a => {
    if (severity !== 'all' && a.severity !== severity) return false;
    if (status   !== 'all' && a.status   !== status)   return false;
    if (category !== 'all' && a.category !== category) return false;
    if (search && ![a.title, a.host, a.id, ...a.tags].join(' ').toLowerCase().includes(search)) return false;
    return true;
  });
}

// ─── Render: Alert List Row ───────────────────────────────────────────────────

function alertRow(alert) {
  const sev = SEVERITY_META[alert.severity] || SEVERITY_META.info;
  const corr = alert.correlationGroup ? CORRELATION_GROUPS[alert.correlationGroup] : null;
  return `
    <div class="alert-row ${alert.status === 'resolved' ? 'alert-resolved' : ''}" data-id="${alert.id}" tabindex="0" role="button" aria-label="Open alert ${alert.id}">
      <div class="ar-sev-bar" style="background:${sev.color}"></div>
      <div class="ar-icon" style="color:${sev.color}">
        <i data-lucide="${sev.icon}"></i>
      </div>
      <div class="ar-main">
        <div class="ar-top">
          <span class="ar-id">${alert.id}</span>
          ${severityBadge(alert.severity)}
          ${statusDot(alert.status)}
          <span class="ar-status-label">${STATUS_META[alert.status]?.label || alert.status}</span>
          ${corr ? `<span class="corr-chip"><i data-lucide="link-2"></i> ${corr.label}</span>` : ''}
          ${alert.rootCause ? `<span class="rca-chip"><i data-lucide="cpu"></i> RCA</span>` : ''}
        </div>
        <div class="ar-title">${alert.title}</div>
        <div class="ar-meta">
          <span><i data-lucide="server"></i>${alert.host}</span>
          <span><i data-lucide="radio"></i>${alert.source}</span>
          <span><i data-lucide="tag"></i>${alert.category}</span>
          <span><i data-lucide="clock"></i>${relativeTime(alert.firedAt)}</span>
          ${alert.count > 1 ? `<span class="ar-count">×${alert.count}</span>` : ''}
        </div>
      </div>
      <div class="ar-actions">
        ${alert.status === 'firing' ? `<button class="btn btn-ghost btn-sm ack-btn" data-id="${alert.id}" title="Acknowledge"><i data-lucide="check"></i></button>` : ''}
        ${alert.status !== 'resolved' ? `<button class="btn btn-ghost btn-sm resolve-btn" data-id="${alert.id}" title="Resolve"><i data-lucide="check-check"></i></button>` : ''}
        <button class="btn btn-ghost btn-sm" title="More"><i data-lucide="more-vertical"></i></button>
      </div>
    </div>`;
}

// ─── Render: Alert Detail Panel ───────────────────────────────────────────────

function alertDetailPanel(alert) {
  const sev = SEVERITY_META[alert.severity] || SEVERITY_META.info;
  const corr = alert.correlationGroup ? CORRELATION_GROUPS[alert.correlationGroup] : null;

  const timelineHTML = alert.timeline.map((ev, i) => `
    <div class="tl-item ${i === 0 ? 'tl-first' : ''}">
      <div class="tl-dot" style="background:${i === 0 ? sev.color : 'var(--color-border)'}"></div>
      <div class="tl-content">
        <div class="tl-event">${ev.event}</div>
        <div class="tl-meta">
          <span>${absoluteTime(ev.time)}</span>
          <span class="tl-actor">${ev.actor}</span>
        </div>
      </div>
    </div>`).join('');

  const rcaHTML = alert.rootCause ? `
    <div class="rca-card">
      <div class="rca-header">
        <i data-lucide="cpu"></i>
        <span class="rca-title">Root Cause Analysis</span>
        <span class="rca-confidence" style="color:${alert.rootCause.confidence >= 85 ? 'var(--color-success)' : 'var(--color-warning)'}">
          ${alert.rootCause.confidence}% confidence
        </span>
      </div>
      <div class="rca-hypothesis">${alert.rootCause.hypothesis}</div>
      <div class="rca-evidence-title">Supporting Evidence</div>
      <ul class="rca-evidence">
        ${alert.rootCause.evidence.map(e => `<li><i data-lucide="chevron-right"></i>${e}</li>`).join('')}
      </ul>
      <div class="rca-rec">
        <i data-lucide="wrench"></i>
        <div>
          <strong>Recommended Action</strong>
          <p>${alert.rootCause.recommendation}</p>
        </div>
      </div>
    </div>` : `
    <div class="rca-pending">
      <i data-lucide="loader-2" class="spin"></i>
      <span>Root cause analysis in progress…</span>
    </div>`;

  const corrHTML = corr ? `
    <div class="corr-card">
      <div class="corr-header">
        <i data-lucide="link-2"></i>
        <span class="corr-title">Correlated Alerts — ${corr.label}</span>
      </div>
      <p class="corr-summary">${corr.summary}</p>
      <div class="corr-list">
        ${corr.alertIds.map(id => {
          const a = alertState.alerts.find(x => x.id === id);
          if (!a) return '';
          return `<div class="corr-item ${id === alert.id ? 'corr-current' : ''}" data-id="${id}">
            <span class="corr-item-sev" style="background:${(SEVERITY_META[a.severity]||SEVERITY_META.info).color}"></span>
            <span class="corr-item-id">${a.id}</span>
            <span class="corr-item-title">${a.title}</span>
            ${id === alert.id ? '<span class="corr-current-label">current</span>' : ''}
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  return `
    <div class="detail-panel" data-alert-id="${alert.id}">
      <div class="dp-header">
        <div class="dp-header-left">
          <button class="btn btn-ghost btn-sm dp-back" title="Back to list"><i data-lucide="arrow-left"></i></button>
          <div>
            <div class="dp-id-row">
              <span class="dp-id">${alert.id}</span>
              ${severityBadge(alert.severity)}
              <span class="status-dot" style="background:${STATUS_META[alert.status]?.color}"></span>
              <span class="dp-status">${STATUS_META[alert.status]?.label}</span>
            </div>
            <h2 class="dp-title">${alert.title}</h2>
          </div>
        </div>
        <div class="dp-header-actions">
          ${alert.status === 'firing' ? `<button class="btn btn-ghost btn-sm ack-btn" data-id="${alert.id}"><i data-lucide="check"></i> Acknowledge</button>` : ''}
          ${alert.status !== 'resolved' ? `<button class="btn btn-primary btn-sm resolve-btn" data-id="${alert.id}"><i data-lucide="check-check"></i> Resolve</button>` : ''}
        </div>
      </div>

      <div class="dp-body">
        <!-- Left column -->
        <div class="dp-col-left">

          <!-- Description -->
          <section class="dp-section">
            <h3 class="dp-section-title"><i data-lucide="file-text"></i> Description</h3>
            <p class="dp-desc">${alert.description}</p>
          </section>

          <!-- Metadata -->
          <section class="dp-section">
            <h3 class="dp-section-title"><i data-lucide="info"></i> Metadata</h3>
            <div class="dp-meta-grid">
              <div class="dp-meta-item"><span class="dmi-label">Host</span><span class="dmi-val">${alert.host}</span></div>
              <div class="dp-meta-item"><span class="dmi-label">Source</span><span class="dmi-val">${alert.source}</span></div>
              <div class="dp-meta-item"><span class="dmi-label">Category</span><span class="dmi-val">${alert.category}</span></div>
              <div class="dp-meta-item"><span class="dmi-label">Fired</span><span class="dmi-val">${absoluteTime(alert.firedAt)}</span></div>
              <div class="dp-meta-item"><span class="dmi-label">Updated</span><span class="dmi-val">${absoluteTime(alert.updatedAt)}</span></div>
              <div class="dp-meta-item"><span class="dmi-label">Count</span><span class="dmi-val">×${alert.count}</span></div>
              <div class="dp-meta-item dp-full"><span class="dmi-label">Tags</span><span class="dmi-val">${alert.tags.map(t => `<span class="cap-tag">${t}</span>`).join('')}</span></div>
            </div>
          </section>

          <!-- Root Cause -->
          <section class="dp-section">
            <h3 class="dp-section-title"><i data-lucide="cpu"></i> Root Cause Analysis</h3>
            ${rcaHTML}
          </section>

          <!-- Correlation -->
          ${corr ? `<section class="dp-section">
            <h3 class="dp-section-title"><i data-lucide="link-2"></i> Correlation</h3>
            ${corrHTML}
          </section>` : ''}
        </div>

        <!-- Right column: Timeline -->
        <div class="dp-col-right">
          <section class="dp-section">
            <h3 class="dp-section-title"><i data-lucide="git-branch"></i> Event Timeline</h3>
            <div class="timeline">${timelineHTML}</div>
          </section>
        </div>
      </div>
    </div>`;
}

// ─── Render: Timeline View ────────────────────────────────────────────────────

function globalTimelineHTML() {
  const events = [];
  alertState.alerts.forEach(a => {
    a.timeline.forEach(ev => {
      events.push({ ...ev, alertId: a.id, alertTitle: a.title, severity: a.severity });
    });
  });
  events.sort((a, b) => b.time - a.time);

  return `
    <div class="global-timeline">
      <h3 class="dp-section-title" style="margin-bottom:var(--space-5)"><i data-lucide="git-branch"></i> Global Event Timeline</h3>
      ${events.map((ev, i) => {
        const sev = SEVERITY_META[ev.severity] || SEVERITY_META.info;
        return `
          <div class="gtl-item">
            <div class="gtl-time">${absoluteTime(ev.time)}</div>
            <div class="gtl-dot" style="background:${sev.color}"></div>
            <div class="gtl-body">
              <div class="gtl-event">${ev.event}</div>
              <div class="gtl-meta">
                <span class="gtl-alert-id" data-id="${ev.alertId}">${ev.alertId}</span>
                <span>${ev.alertTitle}</span>
                <span class="tl-actor">${ev.actor}</span>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ─── Render: KPI Bar ──────────────────────────────────────────────────────────

function kpiBar() {
  const alerts = alertState.alerts;
  const firing      = alerts.filter(a => a.status === 'firing').length;
  const critical    = alerts.filter(a => a.severity === 'critical' && a.status === 'firing').length;
  const acked       = alerts.filter(a => a.status === 'acknowledged').length;
  const resolved    = alerts.filter(a => a.status === 'resolved').length;
  const correlated  = alerts.filter(a => a.correlationGroup).length;
  const withRCA     = alerts.filter(a => a.rootCause).length;

  return `
    <div class="kpi-bar">
      <div class="kpi-item kpi-critical">
        <span class="kpi-val">${critical}</span>
        <span class="kpi-label">Critical Firing</span>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <span class="kpi-val" style="color:var(--color-error)">${firing}</span>
        <span class="kpi-label">Total Firing</span>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <span class="kpi-val" style="color:var(--color-warning)">${acked}</span>
        <span class="kpi-label">Acknowledged</span>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <span class="kpi-val" style="color:var(--color-success)">${resolved}</span>
        <span class="kpi-label">Resolved Today</span>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <span class="kpi-val" style="color:var(--color-primary)">${correlated}</span>
        <span class="kpi-label">Correlated</span>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <span class="kpi-val" style="color:var(--color-purple)">${withRCA}</span>
        <span class="kpi-label">RCA Available</span>
      </div>
    </div>`;
}

// ─── Page Renderer ────────────────────────────────────────────────────────────

export function renderAlertsPage(container) {
  container.innerHTML = `
    <div class="alerts-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Alert Center</h1>
          <p class="page-subtitle">Real-time alerts with correlation detection and AI-powered root cause analysis.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" id="alertRefreshBtn" title="Refresh">
            <i data-lucide="refresh-cw"></i> Refresh
          </button>
          <button class="btn btn-ghost btn-sm" id="alertTimelineViewBtn">
            <i data-lucide="git-branch"></i> Timeline View
          </button>
          <button class="btn btn-ghost btn-sm" id="alertSuppressAllBtn">
            <i data-lucide="bell-off"></i> Suppress All
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div id="alertKpiBar">${kpiBar()}</div>

      <!-- Filters -->
      <div class="alert-filters">
        <div class="search-wrap">
          <i data-lucide="search"></i>
          <input type="text" id="alertSearch" placeholder="Search alerts…" aria-label="Search alerts">
        </div>
        <select id="filterSeverity" aria-label="Filter by severity">
          <option value="all">All severities</option>
          ${ALERT_SEVERITIES.map(s => `<option value="${s}">${SEVERITY_META[s]?.label || s}</option>`).join('')}
        </select>
        <select id="filterStatus" aria-label="Filter by status">
          <option value="all">All statuses</option>
          ${ALERT_STATUSES.map(s => `<option value="${s}">${STATUS_META[s]?.label || s}</option>`).join('')}
        </select>
        <select id="filterCategory" aria-label="Filter by category">
          <option value="all">All categories</option>
          <option value="performance">Performance</option>
          <option value="storage">Storage</option>
          <option value="security">Security</option>
          <option value="backup">Backup</option>
          <option value="patching">Patching</option>
        </select>
        <span class="filter-count" id="alertFilterCount"></span>
      </div>

      <!-- Main content area -->
      <div class="alert-main" id="alertMain">
        <div class="alert-list" id="alertList"></div>
      </div>

    </div>`;

  _renderAlertList(container);
  _initAlertsPage(container);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Render List ──────────────────────────────────────────────────────────────

function _renderAlertList(container) {
  const list = container.querySelector('#alertList');
  if (!list) return;
  const alerts = filteredAlerts();
  const count = container.querySelector('#alertFilterCount');
  if (count) count.textContent = `${alerts.length} alert${alerts.length !== 1 ? 's' : ''}`;

  if (alerts.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i data-lucide="check-circle-2" class="empty-icon"></i>
        <h3>No alerts match your filters</h3>
        <p>Try adjusting the filters above.</p>
      </div>`;
  } else {
    // Sort: critical firing first
    const sorted = [...alerts].sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const stOrder  = { firing: 0, acknowledged: 1, suppressed: 2, resolved: 3 };
      if (stOrder[a.status] !== stOrder[b.status]) return stOrder[a.status] - stOrder[b.status];
      return sevOrder[a.severity] - sevOrder[b.severity];
    });
    list.innerHTML = sorted.map(alertRow).join('');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindAlertRowEvents(container);
}

// ─── Init Interactions ────────────────────────────────────────────────────────

function _initAlertsPage(container) {
  // Filters
  container.querySelector('#alertSearch')?.addEventListener('input', e => {
    alertState.filter.search = e.target.value.toLowerCase().trim();
    _renderAlertList(container);
  });
  container.querySelector('#filterSeverity')?.addEventListener('change', e => {
    alertState.filter.severity = e.target.value;
    _renderAlertList(container);
  });
  container.querySelector('#filterStatus')?.addEventListener('change', e => {
    alertState.filter.status = e.target.value;
    _renderAlertList(container);
  });
  container.querySelector('#filterCategory')?.addEventListener('change', e => {
    alertState.filter.category = e.target.value;
    _renderAlertList(container);
  });

  // Refresh
  container.querySelector('#alertRefreshBtn')?.addEventListener('click', () => {
    const btn = container.querySelector('#alertRefreshBtn');
    const icon = btn?.querySelector('[data-lucide]');
    if (icon) { icon.setAttribute('data-lucide', 'loader-2'); icon.classList.add('spin'); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    setTimeout(() => {
      _renderAlertList(container);
      _showToast(container, 'Alerts refreshed.', 'primary');
      if (icon) { icon.setAttribute('data-lucide', 'refresh-cw'); icon.classList.remove('spin'); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    }, 800);
  });

  // Timeline view
  container.querySelector('#alertTimelineViewBtn')?.addEventListener('click', () => {
    const main = container.querySelector('#alertMain');
    if (!main) return;
    main.innerHTML = `<div class="alert-list">${globalTimelineHTML()}</div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // Bind alert ID clicks in timeline
    main.querySelectorAll('.gtl-alert-id').forEach(el => {
      el.addEventListener('click', () => _openAlertDetail(el.dataset.id, container));
    });
  });

  // Suppress all
  container.querySelector('#alertSuppressAllBtn')?.addEventListener('click', () => {
    alertState.alerts.forEach(a => { if (a.status === 'firing') a.status = 'suppressed'; });
    _renderAlertList(container);
    container.querySelector('#alertKpiBar').innerHTML = kpiBar();
    _showToast(container, 'All firing alerts suppressed.', 'warning');
  });
}

function _bindAlertRowEvents(container) {
  // Open detail
  container.querySelectorAll('.alert-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.ack-btn') || e.target.closest('.resolve-btn') || e.target.closest('[title="More"]')) return;
      _openAlertDetail(row.dataset.id, container);
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _openAlertDetail(row.dataset.id, container); }
    });
  });

  // Acknowledge
  container.querySelectorAll('.ack-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const alert = alertState.alerts.find(a => a.id === btn.dataset.id);
      if (alert && alert.status === 'firing') {
        alert.status = 'acknowledged';
        alert.timeline.push({ time: Date.now(), event: 'Acknowledged via UI', actor: 'user' });
        _renderAlertList(container);
        container.querySelector('#alertKpiBar').innerHTML = kpiBar();
        _showToast(container, `${btn.dataset.id} acknowledged.`, 'warning');
      }
    });
  });

  // Resolve
  container.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const alert = alertState.alerts.find(a => a.id === btn.dataset.id);
      if (alert && alert.status !== 'resolved') {
        alert.status = 'resolved';
        alert.updatedAt = Date.now();
        alert.timeline.push({ time: Date.now(), event: 'Resolved via UI', actor: 'user' });
        _renderAlertList(container);
        container.querySelector('#alertKpiBar').innerHTML = kpiBar();
        _showToast(container, `${btn.dataset.id} resolved.`, 'success');
      }
    });
  });
}

function _openAlertDetail(id, container) {
  const alert = alertState.alerts.find(a => a.id === id);
  if (!alert) return;
  const main = container.querySelector('#alertMain');
  if (!main) return;
  main.innerHTML = alertDetailPanel(alert);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Back button
  main.querySelector('.dp-back')?.addEventListener('click', () => {
    main.innerHTML = '<div class="alert-list" id="alertList"></div>';
    const list = main.querySelector('#alertList');
    // re-attach list id so _renderAlertList finds it
    main.querySelector('.alert-list').id = 'alertList';
    _renderAlertList(container);
  });

  // Correlated alert clicks
  main.querySelectorAll('.corr-item:not(.corr-current)').forEach(item => {
    item.addEventListener('click', () => _openAlertDetail(item.dataset.id, container));
  });

  // Ack / resolve inside detail
  main.querySelectorAll('.ack-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = alertState.alerts.find(x => x.id === btn.dataset.id);
      if (a && a.status === 'firing') {
        a.status = 'acknowledged';
        a.timeline.push({ time: Date.now(), event: 'Acknowledged via UI', actor: 'user' });
        container.querySelector('#alertKpiBar').innerHTML = kpiBar();
        _openAlertDetail(id, container);
        _showToast(container, `${btn.dataset.id} acknowledged.`, 'warning');
      }
    });
  });
  main.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = alertState.alerts.find(x => x.id === btn.dataset.id);
      if (a && a.status !== 'resolved') {
        a.status = 'resolved';
        a.updatedAt = Date.now();
        a.timeline.push({ time: Date.now(), event: 'Resolved via UI', actor: 'user' });
        container.querySelector('#alertKpiBar').innerHTML = kpiBar();
        _openAlertDetail(id, container);
        _showToast(container, `${btn.dataset.id} resolved.`, 'success');
      }
    });
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function _showToast(container, message, type = 'primary') {
  const colorMap = {
    success: 'var(--color-success)',
    primary: 'var(--color-primary)',
    warning: 'var(--color-warning)',
    info:    'var(--color-blue)',
    error:   'var(--color-error)',
  };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:var(--space-6);right:var(--space-6);
    background:var(--color-surface-2);border:1px solid var(--color-border);
    color:var(--color-text);padding:var(--space-3) var(--space-5);
    border-radius:var(--radius-lg);box-shadow:var(--shadow-md);
    font-size:var(--text-sm);z-index:9999;
    border-left:3px solid ${colorMap[type] || colorMap.primary};
    animation:toastIn .22s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export function injectAlertsStyles() {
  if (document.getElementById('alerts-styles')) return;
  const style = document.createElement('style');
  style.id = 'alerts-styles';
  style.textContent = `
    @keyframes toastIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:none; } }
    @keyframes spin     { to   { transform:rotate(360deg); } }
    .spin { animation:spin 1s linear infinite; display:inline-block; }

    .alerts-page { display:flex; flex-direction:column; gap:var(--space-5); }

    /* Page header */
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); flex-wrap:wrap; }
    .page-header-left {}
    .page-header-actions { display:flex; gap:var(--space-2); flex-shrink:0; flex-wrap:wrap; }
    .page-title    { font-size:var(--text-xl); font-family:var(--font-display); font-weight:700; color:var(--color-text); }
    .page-subtitle { font-size:var(--text-sm); color:var(--color-text-muted); margin-top:var(--space-1); }

    /* KPI bar */
    .kpi-bar { display:flex; align-items:center; gap:0; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4) var(--space-6); flex-wrap:wrap; gap:var(--space-4); }
    .kpi-item { display:flex; flex-direction:column; align-items:center; min-width:80px; }
    .kpi-val  { font-size:var(--text-xl); font-weight:700; color:var(--color-text); font-variant-numeric:tabular-nums; }
    .kpi-label { font-size:var(--text-xs); color:var(--color-text-muted); text-align:center; margin-top:2px; }
    .kpi-critical .kpi-val { color:var(--color-error); }
    .kpi-sep  { width:1px; height:36px; background:var(--color-divider); flex-shrink:0; }
    @media(max-width:640px) { .kpi-sep { display:none; } .kpi-bar { justify-content:space-around; } }

    /* Filters */
    .alert-filters { display:flex; gap:var(--space-3); flex-wrap:wrap; align-items:center; }
    .search-wrap { display:flex; align-items:center; gap:var(--space-2); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); flex:1; min-width:180px; }
    .search-wrap svg { width:16px; height:16px; color:var(--color-text-faint); flex-shrink:0; }
    .search-wrap input { background:none; border:none; outline:none; font-size:var(--text-sm); color:var(--color-text); width:100%; }
    .alert-filters select { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); font-size:var(--text-sm); color:var(--color-text); cursor:pointer; }
    .filter-count { font-size:var(--text-xs); color:var(--color-text-muted); white-space:nowrap; }

    /* Alert main area */
    .alert-main { flex:1; }
    .alert-list { display:flex; flex-direction:column; gap:var(--space-2); }

    /* Alert row */
    .alert-row { display:flex; align-items:center; gap:var(--space-3); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4); cursor:pointer; position:relative; overflow:hidden; transition:box-shadow var(--transition-interactive),border-color var(--transition-interactive); }
    .alert-row:hover { box-shadow:var(--shadow-md); border-color:var(--color-primary-highlight); }
    .alert-row:focus-visible { outline:2px solid var(--color-primary); outline-offset:2px; }
    .alert-resolved { opacity:.65; }
    .ar-sev-bar { position:absolute; left:0; top:0; bottom:0; width:3px; border-radius:var(--radius-lg) 0 0 var(--radius-lg); }
    .ar-icon { width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .ar-icon svg { width:22px; height:22px; }
    .ar-main { flex:1; min-width:0; }
    .ar-top { display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; margin-bottom:var(--space-1); }
    .ar-id { font-size:var(--text-xs); color:var(--color-text-muted); font-weight:600; font-variant-numeric:tabular-nums; }
    .ar-status-label { font-size:var(--text-xs); color:var(--color-text-muted); }
    .ar-title { font-size:var(--text-base); font-weight:600; color:var(--color-text); margin-bottom:var(--space-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
    .ar-meta { display:flex; gap:var(--space-3); flex-wrap:wrap; }
    .ar-meta > span { display:flex; align-items:center; gap:4px; font-size:var(--text-xs); color:var(--color-text-muted); }
    .ar-meta svg { width:12px; height:12px; }
    .ar-count { background:var(--color-surface-offset); color:var(--color-text-muted); font-size:var(--text-xs); padding:1px var(--space-2); border-radius:var(--radius-full); font-weight:600; }
    .ar-actions { display:flex; gap:var(--space-1); flex-shrink:0; }

    /* Badges */
    .sev-badge { font-size:var(--text-xs); padding:2px var(--space-2); border-radius:var(--radius-full); font-weight:600; }
    .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; flex-shrink:0; }
    .corr-chip { display:inline-flex; align-items:center; gap:4px; font-size:var(--text-xs); background:var(--color-primary-highlight); color:var(--color-primary); border-radius:var(--radius-full); padding:2px var(--space-2); }
    .corr-chip svg { width:11px; height:11px; }
    .rca-chip  { display:inline-flex; align-items:center; gap:4px; font-size:var(--text-xs); background:color-mix(in oklch,var(--color-purple) 12%,transparent); color:var(--color-purple); border-radius:var(--radius-full); padding:2px var(--space-2); }
    .rca-chip svg { width:11px; height:11px; }

    /* Buttons */
    .btn { display:inline-flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); font-size:var(--text-sm); font-weight:500; cursor:pointer; border:1px solid transparent; transition:background var(--transition-interactive),color var(--transition-interactive),border-color var(--transition-interactive); }
    .btn svg { width:16px; height:16px; }
    .btn-sm { padding:var(--space-1) var(--space-3); font-size:var(--text-xs); }
    .btn-sm svg { width:14px; height:14px; }
    .btn-primary { background:var(--color-primary); color:#fff; }
    .btn-primary:hover { background:var(--color-primary-hover); }
    .btn-ghost { background:transparent; color:var(--color-text-muted); border-color:var(--color-border); }
    .btn-ghost:hover { background:var(--color-surface-offset); color:var(--color-text); }

    /* Empty state */
    .empty-state { display:flex; flex-direction:column; align-items:center; text-align:center; padding:var(--space-16) var(--space-8); gap:var(--space-3); color:var(--color-text-muted); }
    .empty-icon { width:48px; height:48px; color:var(--color-text-faint); }
    .empty-state h3 { color:var(--color-text); font-size:var(--text-lg); font-weight:600; }
    .empty-state p  { font-size:var(--text-sm); max-width:36ch; }
    .cap-tag { font-size:var(--text-xs); background:var(--color-surface-offset); color:var(--color-text-muted); border-radius:var(--radius-sm); padding:2px var(--space-2); display:inline-block; }

    /* ── Detail Panel ── */
    .detail-panel { display:flex; flex-direction:column; gap:var(--space-5); }
    .dp-header { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); flex-wrap:wrap; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-5); }
    .dp-header-left { display:flex; gap:var(--space-3); align-items:flex-start; }
    .dp-header-actions { display:flex; gap:var(--space-2); align-items:center; }
    .dp-id-row { display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; margin-bottom:var(--space-1); }
    .dp-id { font-size:var(--text-xs); color:var(--color-text-muted); font-weight:700; font-variant-numeric:tabular-nums; }
    .dp-status { font-size:var(--text-xs); color:var(--color-text-muted); }
    .dp-title { font-size:var(--text-lg); font-weight:700; color:var(--color-text); }

    .dp-body { display:grid; grid-template-columns:1fr 340px; gap:var(--space-5); }
    @media(max-width:900px) { .dp-body { grid-template-columns:1fr; } }
    .dp-col-left,.dp-col-right { display:flex; flex-direction:column; gap:var(--space-4); }

    .dp-section { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-5); }
    .dp-section-title { display:flex; align-items:center; gap:var(--space-2); font-size:var(--text-sm); font-weight:700; color:var(--color-text); margin-bottom:var(--space-4); }
    .dp-section-title svg { width:16px; height:16px; color:var(--color-text-muted); }
    .dp-desc { font-size:var(--text-sm); color:var(--color-text-muted); line-height:1.7; }

    .dp-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3); }
    .dp-full { grid-column:1/-1; }
    .dp-meta-item { display:flex; flex-direction:column; gap:2px; }
    .dmi-label { font-size:var(--text-xs); color:var(--color-text-faint); text-transform:uppercase; letter-spacing:.05em; }
    .dmi-val   { font-size:var(--text-sm); color:var(--color-text); display:flex; gap:var(--space-1); flex-wrap:wrap; }

    /* RCA card */
    .rca-card { background:color-mix(in oklch,var(--color-purple) 6%,var(--color-surface)); border:1px solid color-mix(in oklch,var(--color-purple) 20%,var(--color-border)); border-radius:var(--radius-md); padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3); }
    .rca-header { display:flex; align-items:center; gap:var(--space-2); }
    .rca-header svg { width:16px; height:16px; color:var(--color-purple); }
    .rca-title { font-weight:700; font-size:var(--text-sm); color:var(--color-text); flex:1; }
    .rca-confidence { font-size:var(--text-xs); font-weight:700; }
    .rca-hypothesis { font-size:var(--text-sm); color:var(--color-text); line-height:1.6; font-style:italic; }
    .rca-evidence-title { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:.06em; color:var(--color-text-faint); }
    .rca-evidence { list-style:none; display:flex; flex-direction:column; gap:var(--space-1); }
    .rca-evidence li { display:flex; align-items:flex-start; gap:var(--space-1); font-size:var(--text-xs); color:var(--color-text-muted); line-height:1.5; }
    .rca-evidence li svg { width:12px; height:12px; color:var(--color-primary); flex-shrink:0; margin-top:2px; }
    .rca-rec { display:flex; gap:var(--space-3); align-items:flex-start; background:var(--color-surface-offset); border-radius:var(--radius-md); padding:var(--space-3); }
    .rca-rec svg { width:16px; height:16px; color:var(--color-warning); flex-shrink:0; margin-top:2px; }
    .rca-rec strong { display:block; font-size:var(--text-xs); color:var(--color-text); margin-bottom:4px; }
    .rca-rec p { font-size:var(--text-xs); color:var(--color-text-muted); line-height:1.6; max-width:none; }
    .rca-pending { display:flex; align-items:center; gap:var(--space-2); font-size:var(--text-sm); color:var(--color-text-muted); padding:var(--space-3); }

    /* Correlation card */
    .corr-card { background:color-mix(in oklch,var(--color-primary) 5%,var(--color-surface)); border:1px solid color-mix(in oklch,var(--color-primary) 18%,var(--color-border)); border-radius:var(--radius-md); padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3); }
    .corr-header { display:flex; align-items:center; gap:var(--space-2); }
    .corr-header svg { width:15px; height:15px; color:var(--color-primary); }
    .corr-title { font-weight:700; font-size:var(--text-sm); color:var(--color-text); }
    .corr-summary { font-size:var(--text-xs); color:var(--color-text-muted); line-height:1.6; }
    .corr-list { display:flex; flex-direction:column; gap:var(--space-1); }
    .corr-item { display:flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-3); border-radius:var(--radius-md); cursor:pointer; font-size:var(--text-xs); color:var(--color-text-muted); transition:background var(--transition-interactive); }
    .corr-item:not(.corr-current):hover { background:var(--color-surface-offset); color:var(--color-text); }
    .corr-current { background:var(--color-primary-highlight); color:var(--color-text); cursor:default; }
    .corr-item-sev { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .corr-item-id  { font-weight:700; color:var(--color-text); flex-shrink:0; }
    .corr-item-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .corr-current-label { font-size:var(--text-xs); background:var(--color-primary); color:#fff; border-radius:var(--radius-full); padding:1px var(--space-2); flex-shrink:0; }

    /* Timeline */
    .timeline { display:flex; flex-direction:column; gap:0; position:relative; }
    .tl-item { display:flex; gap:var(--space-3); position:relative; padding-bottom:var(--space-4); }
    .tl-item:last-child { padding-bottom:0; }
    .tl-item:not(:last-child)::before { content:''; position:absolute; left:7px; top:16px; bottom:0; width:1px; background:var(--color-divider); }
    .tl-dot { width:15px; height:15px; border-radius:50%; flex-shrink:0; margin-top:3px; border:2px solid var(--color-surface); box-shadow:0 0 0 1px var(--color-border); }
    .tl-content { flex:1; min-width:0; }
    .tl-event  { font-size:var(--text-sm); color:var(--color-text); line-height:1.4; }
    .tl-meta   { display:flex; gap:var(--space-3); flex-wrap:wrap; margin-top:4px; }
    .tl-meta > span { font-size:var(--text-xs); color:var(--color-text-muted); }
    .tl-actor { color:var(--color-primary); font-weight:500; }

    /* Global timeline */
    .global-timeline { display:flex; flex-direction:column; gap:var(--space-1); }
    .gtl-item { display:grid; grid-template-columns:140px 16px 1fr; gap:var(--space-3); align-items:flex-start; padding-bottom:var(--space-3); position:relative; }
    .gtl-item:not(:last-child) .gtl-dot::after { content:''; position:absolute; left:calc(140px + var(--space-3) + 7px); top:18px; bottom:0; width:1px; background:var(--color-divider); }
    .gtl-time { font-size:var(--text-xs); color:var(--color-text-muted); text-align:right; padding-top:3px; font-variant-numeric:tabular-nums; }
    .gtl-dot  { width:15px; height:15px; border-radius:50%; flex-shrink:0; margin-top:3px; border:2px solid var(--color-bg); box-shadow:0 0 0 1px var(--color-border); position:relative; }
    .gtl-body { min-width:0; }
    .gtl-event { font-size:var(--text-sm); color:var(--color-text); line-height:1.4; }
    .gtl-meta  { display:flex; gap:var(--space-3); flex-wrap:wrap; margin-top:4px; }
    .gtl-meta > span { font-size:var(--text-xs); color:var(--color-text-muted); }
    .gtl-alert-id { color:var(--color-primary); font-weight:700; cursor:pointer; }
    .gtl-alert-id:hover { text-decoration:underline; }
  `;
  document.head.appendChild(style);
}
