/**
 * agents.js — Agent Builder Page
 * InfraDesk Remote | Page 16
 * Features: Custom branding, Download center
 */

// ─── State ───────────────────────────────────────────────────────────────────

const agentState = {
  agents: JSON.parse(localStorage.getItem('infradesk_agents') || '[]'),
  selected: null,
  filter: 'all',
};

// ─── Agent Templates ──────────────────────────────────────────────────────────

const AGENT_TEMPLATES = [
  {
    id: 'monitor',
    name: 'System Monitor',
    icon: 'activity',
    description: 'Monitors CPU, memory, disk, and network in real time.',
    tags: ['monitoring', 'system'],
    capabilities: ['cpu_watch', 'memory_watch', 'disk_watch', 'net_watch'],
  },
  {
    id: 'patch',
    name: 'Patch Manager',
    icon: 'shield',
    description: 'Automates OS and software patch deployment.',
    tags: ['patching', 'security'],
    capabilities: ['os_patch', 'app_patch', 'rollback'],
  },
  {
    id: 'backup',
    name: 'Backup Agent',
    icon: 'database',
    description: 'Schedules and verifies incremental backups.',
    tags: ['backup', 'storage'],
    capabilities: ['incremental', 'verify', 'restore'],
  },
  {
    id: 'alert',
    name: 'Alert Dispatcher',
    icon: 'bell',
    description: 'Routes alerts to Slack, email, or PagerDuty.',
    tags: ['alerting', 'integration'],
    capabilities: ['slack', 'email', 'pagerduty'],
  },
  {
    id: 'log',
    name: 'Log Collector',
    icon: 'file-text',
    description: 'Aggregates and ships logs to your SIEM or S3.',
    tags: ['logging', 'compliance'],
    capabilities: ['syslog', 's3_ship', 'siem_push'],
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    icon: 'cpu',
    description: 'Start from scratch with a blank agent.',
    tags: ['custom'],
    capabilities: [],
  },
];

// ─── Download Packages ────────────────────────────────────────────────────────

const DOWNLOAD_PACKAGES = [
  {
    id: 'win_x64',
    label: 'Windows x64',
    icon: 'monitor',
    version: '2.4.1',
    size: '18.2 MB',
    ext: '.exe',
    badge: 'Stable',
    badgeColor: 'success',
  },
  {
    id: 'linux_x64',
    label: 'Linux x64',
    icon: 'terminal',
    version: '2.4.1',
    size: '14.6 MB',
    ext: '.tar.gz',
    badge: 'Stable',
    badgeColor: 'success',
  },
  {
    id: 'linux_arm64',
    label: 'Linux ARM64',
    icon: 'cpu',
    version: '2.4.1',
    size: '13.9 MB',
    ext: '.tar.gz',
    badge: 'Stable',
    badgeColor: 'success',
  },
  {
    id: 'macos',
    label: 'macOS Universal',
    icon: 'apple',
    version: '2.4.1',
    size: '19.1 MB',
    ext: '.pkg',
    badge: 'Stable',
    badgeColor: 'success',
  },
  {
    id: 'docker',
    label: 'Docker Image',
    icon: 'box',
    version: '2.4.1',
    size: '–',
    ext: '',
    badge: 'Latest',
    badgeColor: 'primary',
    cmd: 'docker pull infradesk/agent:latest',
  },
  {
    id: 'beta_win',
    label: 'Windows x64 Beta',
    icon: 'monitor',
    version: '2.5.0-beta.3',
    size: '18.9 MB',
    ext: '.exe',
    badge: 'Beta',
    badgeColor: 'warning',
  },
];

// ─── Branding Presets ─────────────────────────────────────────────────────────

const BRANDING_PRESETS = [
  { id: 'infradesk', label: 'InfraDesk Default', primary: '#01696f', logo: 'infradesk' },
  { id: 'dark',      label: 'Dark Pro',           primary: '#4f98a3', logo: 'infradesk' },
  { id: 'orange',    label: 'Sunset Orange',      primary: '#da7101', logo: 'infradesk' },
  { id: 'purple',    label: 'Purple Haze',        primary: '#7a39bb', logo: 'infradesk' },
  { id: 'custom',    label: 'Custom…',            primary: '#01696f', logo: null },
];

// ─── Render Helpers ───────────────────────────────────────────────────────────

function badgeHTML(label, color) {
  const map = {
    success: 'var(--color-success)',
    primary: 'var(--color-primary)',
    warning: 'var(--color-warning)',
    error:   'var(--color-error)',
  };
  return `<span class="agent-badge" style="background:${map[color] || map.primary}20;color:${map[color] || map.primary};border:1px solid ${map[color] || map.primary}40">${label}</span>`;
}

function capabilityTag(cap) {
  return `<span class="cap-tag">${cap.replace(/_/g, ' ')}</span>`;
}

function agentCard(tpl) {
  return `
    <div class="agent-card" data-id="${tpl.id}" tabindex="0" role="button" aria-label="Select ${tpl.name} template">
      <div class="agent-card-icon">
        <i data-lucide="${tpl.icon}"></i>
      </div>
      <div class="agent-card-body">
        <div class="agent-card-header">
          <span class="agent-card-name">${tpl.name}</span>
          <div class="agent-card-tags">${tpl.tags.map(t => badgeHTML(t, 'primary')).join('')}</div>
        </div>
        <p class="agent-card-desc">${tpl.description}</p>
        ${tpl.capabilities.length ? `<div class="cap-list">${tpl.capabilities.map(capabilityTag).join('')}</div>` : ''}
      </div>
      <button class="agent-select-btn btn btn-ghost" aria-label="Use ${tpl.name}">
        <i data-lucide="arrow-right"></i>
      </button>
    </div>`;
}

function downloadCard(pkg) {
  const isDocker = !!pkg.cmd;
  return `
    <div class="dl-card">
      <div class="dl-card-left">
        <div class="dl-icon"><i data-lucide="${pkg.icon}"></i></div>
        <div class="dl-info">
          <span class="dl-label">${pkg.label}</span>
          <span class="dl-meta">v${pkg.version} ${pkg.size !== '–' ? '· ' + pkg.size : ''} ${pkg.ext}</span>
        </div>
      </div>
      <div class="dl-card-right">
        ${badgeHTML(pkg.badge, pkg.badgeColor)}
        ${isDocker
          ? `<button class="btn btn-ghost dl-copy-btn" data-cmd="${pkg.cmd}" title="Copy command">
               <i data-lucide="copy"></i> Copy
             </button>`
          : `<button class="btn btn-primary dl-download-btn" data-pkg="${pkg.id}" title="Download ${pkg.label}">
               <i data-lucide="download"></i> Download
             </button>`}
      </div>
    </div>`;
}

// ─── Page Renderer ────────────────────────────────────────────────────────────

export function renderAgentsPage(container) {
  container.innerHTML = `
    <div class="agents-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Agent Builder</h1>
          <p class="page-subtitle">Deploy, brand, and manage InfraDesk remote agents across your infrastructure.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="agentImportBtn">
            <i data-lucide="upload"></i> Import Config
          </button>
          <button class="btn btn-primary" id="agentNewBtn">
            <i data-lucide="plus"></i> New Agent
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="agents-tabs" role="tablist">
        <button class="tab-btn active" data-tab="templates" role="tab" aria-selected="true">Templates</button>
        <button class="tab-btn" data-tab="branding" role="tab" aria-selected="false">Custom Branding</button>
        <button class="tab-btn" data-tab="download" role="tab" aria-selected="false">Download Center</button>
        <button class="tab-btn" data-tab="deployed" role="tab" aria-selected="false">Deployed Agents</button>
      </nav>

      <!-- Tab Panels -->
      <div class="tab-panels">

        <!-- Templates -->
        <div class="tab-panel active" id="tab-templates" role="tabpanel">
          <div class="panel-toolbar">
            <div class="search-wrap">
              <i data-lucide="search"></i>
              <input type="text" id="agentSearch" placeholder="Search templates…" aria-label="Search agent templates">
            </div>
            <select id="agentTagFilter" aria-label="Filter by tag">
              <option value="all">All categories</option>
              <option value="monitoring">Monitoring</option>
              <option value="security">Security</option>
              <option value="backup">Backup</option>
              <option value="alerting">Alerting</option>
              <option value="logging">Logging</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="agent-grid" id="agentGrid">
            ${AGENT_TEMPLATES.map(agentCard).join('')}
          </div>
        </div>

        <!-- Custom Branding -->
        <div class="tab-panel" id="tab-branding" role="tabpanel" hidden>
          <div class="branding-layout">
            <div class="branding-form card">
              <h2 class="section-title">Agent Branding</h2>
              <p class="section-desc">Customise how agents appear on end-user machines.</p>

              <label class="form-label">Branding Preset</label>
              <div class="preset-grid" id="brandingPresets">
                ${BRANDING_PRESETS.map(p => `
                  <button class="preset-chip ${p.id === 'infradesk' ? 'active' : ''}" data-preset="${p.id}"
                    style="--chip-color:${p.primary}" aria-pressed="${p.id === 'infradesk'}">
                    <span class="chip-swatch" style="background:${p.primary}"></span>
                    ${p.label}
                  </button>`).join('')}
              </div>

              <div class="form-group">
                <label class="form-label" for="brandName">Display Name</label>
                <input class="form-input" id="brandName" type="text" value="InfraDesk Agent" placeholder="Your Company Agent">
              </div>

              <div class="form-group">
                <label class="form-label" for="brandColor">Primary Color</label>
                <div class="color-row">
                  <input class="form-input color-text" id="brandColorHex" type="text" value="#01696f" maxlength="7">
                  <input class="color-swatch" id="brandColor" type="color" value="#01696f" aria-label="Pick color">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Logo Upload</label>
                <div class="upload-drop" id="logoDropZone" role="button" tabindex="0" aria-label="Upload logo">
                  <i data-lucide="image"></i>
                  <span>Drop PNG/SVG here or <u>browse</u></span>
                  <input type="file" id="logoFile" accept=".png,.svg" hidden>
                </div>
                <div class="logo-preview" id="logoPreview" hidden>
                  <img id="logoImg" alt="Brand logo preview">
                  <button class="btn btn-ghost logo-remove" id="logoRemove"><i data-lucide="x"></i></button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="brandSupportUrl">Support URL</label>
                <input class="form-input" id="brandSupportUrl" type="url" placeholder="https://support.yourcompany.com">
              </div>

              <div class="form-actions">
                <button class="btn btn-ghost" id="brandReset">Reset</button>
                <button class="btn btn-primary" id="brandSave">
                  <i data-lucide="save"></i> Save Branding
                </button>
              </div>
            </div>

            <!-- Live Preview -->
            <div class="branding-preview card">
              <h2 class="section-title">Live Preview</h2>
              <div class="preview-shell" id="previewShell">
                <div class="preview-tray">
                  <div class="preview-logo" id="previewLogo">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                      <rect width="32" height="32" rx="8" fill="var(--preview-color,#01696f)"/>
                      <path d="M8 16h16M16 8v16" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span class="preview-name" id="previewName">InfraDesk Agent</span>
                  <span class="preview-dot" id="previewDot"></span>
                </div>
                <div class="preview-card">
                  <div class="preview-stat">
                    <span class="ps-label">CPU</span>
                    <div class="ps-bar"><div class="ps-fill" style="width:42%;background:var(--preview-color,#01696f)"></div></div>
                    <span class="ps-val">42%</span>
                  </div>
                  <div class="preview-stat">
                    <span class="ps-label">RAM</span>
                    <div class="ps-bar"><div class="ps-fill" style="width:67%;background:var(--preview-color,#01696f)"></div></div>
                    <span class="ps-val">67%</span>
                  </div>
                  <button class="preview-btn" id="previewBtn" style="background:var(--preview-color,#01696f)">View Details</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Download Center -->
        <div class="tab-panel" id="tab-download" role="tabpanel" hidden>
          <div class="download-header">
            <div>
              <h2 class="section-title">Download Center</h2>
              <p class="section-desc">Choose the agent package for your target OS or container runtime.</p>
            </div>
            <div class="dl-version-info">
              <span class="dl-current-ver">Latest stable: <strong>v2.4.1</strong></span>
              <a href="#" class="link-small" target="_blank" rel="noopener noreferrer">Changelog <i data-lucide="external-link" style="width:12px;height:12px"></i></a>
            </div>
          </div>

          <div class="dl-section">
            <h3 class="dl-section-title">Stable Packages</h3>
            <div class="dl-list">
              ${DOWNLOAD_PACKAGES.filter(p => p.badge !== 'Beta').map(downloadCard).join('')}
            </div>
          </div>

          <div class="dl-section">
            <h3 class="dl-section-title">Beta / Pre-release</h3>
            <div class="dl-list">
              ${DOWNLOAD_PACKAGES.filter(p => p.badge === 'Beta').map(downloadCard).join('')}
            </div>
          </div>

          <div class="dl-install-hint card">
            <i data-lucide="terminal" class="hint-icon"></i>
            <div>
              <strong>Quick Install (Linux)</strong>
              <code class="code-block">curl -sSL https://get.infradesk.io/agent | bash</code>
            </div>
            <button class="btn btn-ghost dl-copy-btn" data-cmd="curl -sSL https://get.infradesk.io/agent | bash" title="Copy">
              <i data-lucide="copy"></i>
            </button>
          </div>
        </div>

        <!-- Deployed Agents -->
        <div class="tab-panel" id="tab-deployed" role="tabpanel" hidden>
          <div class="panel-toolbar">
            <div class="search-wrap">
              <i data-lucide="search"></i>
              <input type="text" id="deployedSearch" placeholder="Filter deployed agents…" aria-label="Filter deployed agents">
            </div>
            <select id="deployedStatusFilter" aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div id="deployedList" class="deployed-list">
            <div class="empty-state">
              <i data-lucide="cpu" class="empty-icon"></i>
              <h3>No agents deployed yet</h3>
              <p>Use a template above to configure and deploy your first agent.</p>
              <button class="btn btn-primary" id="deployedNewBtn">
                <i data-lucide="plus"></i> New Agent
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  _initAgentsPage(container);
}

// ─── Initialise Interactions ──────────────────────────────────────────────────

function _initAgentsPage(container) {
  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      container.querySelectorAll('.tab-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = container.querySelector(`#tab-${btn.dataset.tab}`);
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  });

  // Template search + filter
  const agentSearch = container.querySelector('#agentSearch');
  const agentTagFilter = container.querySelector('#agentTagFilter');
  function filterTemplates() {
    const q = agentSearch.value.toLowerCase();
    const tag = agentTagFilter.value;
    container.querySelectorAll('.agent-card').forEach(card => {
      const id = card.dataset.id;
      const tpl = AGENT_TEMPLATES.find(t => t.id === id);
      const matchQ = !q || tpl.name.toLowerCase().includes(q) || tpl.description.toLowerCase().includes(q);
      const matchTag = tag === 'all' || tpl.tags.includes(tag);
      card.style.display = matchQ && matchTag ? '' : 'none';
    });
  }
  agentSearch?.addEventListener('input', filterTemplates);
  agentTagFilter?.addEventListener('change', filterTemplates);

  // Agent card keyboard support
  container.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.querySelector('.agent-select-btn')?.click(); } });
    card.querySelector('.agent-select-btn')?.addEventListener('click', () => _handleTemplateSelect(card.dataset.id, container));
  });

  // New agent buttons
  container.querySelector('#agentNewBtn')?.addEventListener('click', () => _showNewAgentModal(container));
  container.querySelector('#deployedNewBtn')?.addEventListener('click', () => {
    container.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    container.querySelectorAll('.tab-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
    const tBtn = container.querySelector('[data-tab="templates"]');
    tBtn.classList.add('active'); tBtn.setAttribute('aria-selected', 'true');
    const tPanel = container.querySelector('#tab-templates');
    tPanel.classList.add('active'); tPanel.hidden = false;
  });

  // Branding
  _initBranding(container);

  // Downloads — copy buttons
  container.querySelectorAll('.dl-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.cmd).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check"></i> Copied!';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => { btn.innerHTML = orig; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 2000);
      });
    });
  });

  // Downloads — download buttons (simulated)
  container.querySelectorAll('.dl-download-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pkg = DOWNLOAD_PACKAGES.find(p => p.id === btn.dataset.pkg);
      if (!pkg) return;
      const orig = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Preparing…';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = '<i data-lucide="check"></i> Done';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => { btn.innerHTML = orig; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 2500);
      }, 1500);
    });
  });

  // Init Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Branding Logic ───────────────────────────────────────────────────────────

function _initBranding(container) {
  const colorInput = container.querySelector('#brandColor');
  const colorHex   = container.querySelector('#brandColorHex');
  const nameInput  = container.querySelector('#brandName');
  const previewName = container.querySelector('#previewName');
  const previewShell = container.querySelector('#previewShell');
  const logoFile   = container.querySelector('#logoFile');
  const logoDropZone = container.querySelector('#logoDropZone');
  const logoPreview  = container.querySelector('#logoPreview');
  const logoImg      = container.querySelector('#logoImg');
  const logoRemove   = container.querySelector('#logoRemove');

  function syncColor(hex) {
    if (colorInput) colorInput.value = hex;
    if (colorHex) colorHex.value = hex;
    if (previewShell) previewShell.style.setProperty('--preview-color', hex);
  }

  colorInput?.addEventListener('input', () => syncColor(colorInput.value));
  colorHex?.addEventListener('change', () => {
    const v = colorHex.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) syncColor(v);
  });

  nameInput?.addEventListener('input', () => { if (previewName) previewName.textContent = nameInput.value || 'Agent'; });

  // Presets
  container.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.preset-chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('active'); chip.setAttribute('aria-pressed', 'true');
      const preset = BRANDING_PRESETS.find(p => p.id === chip.dataset.preset);
      if (preset) syncColor(preset.primary);
    });
  });

  // Logo upload
  logoDropZone?.addEventListener('click', () => logoFile?.click());
  logoDropZone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') logoFile?.click(); });
  logoDropZone?.addEventListener('dragover', e => { e.preventDefault(); logoDropZone.classList.add('drag-over'); });
  logoDropZone?.addEventListener('dragleave', () => logoDropZone.classList.remove('drag-over'));
  logoDropZone?.addEventListener('drop', e => {
    e.preventDefault(); logoDropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) _handleLogoFile(file, logoDropZone, logoPreview, logoImg);
  });
  logoFile?.addEventListener('change', () => {
    const file = logoFile.files?.[0];
    if (file) _handleLogoFile(file, logoDropZone, logoPreview, logoImg);
  });
  logoRemove?.addEventListener('click', () => {
    if (logoImg) logoImg.src = '';
    if (logoPreview) logoPreview.hidden = true;
    if (logoDropZone) logoDropZone.hidden = false;
    if (logoFile) logoFile.value = '';
  });

  // Save branding
  container.querySelector('#brandSave')?.addEventListener('click', () => {
    const branding = {
      name: nameInput?.value || 'InfraDesk Agent',
      color: colorInput?.value || '#01696f',
      supportUrl: container.querySelector('#brandSupportUrl')?.value || '',
    };
    try { localStorage.setItem('infradesk_branding', JSON.stringify(branding)); } catch (_) {}
    _showToast(container, 'Branding saved successfully.', 'success');
  });

  // Reset branding
  container.querySelector('#brandReset')?.addEventListener('click', () => {
    if (nameInput) nameInput.value = 'InfraDesk Agent';
    syncColor('#01696f');
    if (previewName) previewName.textContent = 'InfraDesk Agent';
    _showToast(container, 'Branding reset to defaults.', 'info');
  });
}

function _handleLogoFile(file, dropZone, preview, img) {
  const reader = new FileReader();
  reader.onload = e => {
    if (img) { img.src = e.target.result; img.alt = file.name; }
    if (dropZone) dropZone.hidden = true;
    if (preview) preview.hidden = false;
  };
  reader.readAsDataURL(file);
}

// ─── Template Select ──────────────────────────────────────────────────────────

function _handleTemplateSelect(id, container) {
  const tpl = AGENT_TEMPLATES.find(t => t.id === id);
  if (!tpl) return;
  _showToast(container, `"${tpl.name}" selected. Configure in the panel.`, 'primary');
  // In a real app: open config drawer / route to agent config page
}

// ─── New Agent Modal (simple) ─────────────────────────────────────────────────

function _showNewAgentModal(container) {
  _showToast(container, 'Agent creation wizard — coming soon!', 'info');
}

// ─── Toast Notification ───────────────────────────────────────────────────────

function _showToast(container, message, type = 'primary') {
  const colorMap = {
    success: 'var(--color-success)',
    primary: 'var(--color-primary)',
    warning: 'var(--color-warning)',
    info:    'var(--color-blue)',
    error:   'var(--color-error)',
  };
  const toast = document.createElement('div');
  toast.className = 'agents-toast';
  toast.style.cssText = `
    position:fixed;bottom:var(--space-6);right:var(--space-6);
    background:var(--color-surface-2);border:1px solid var(--color-border);
    color:var(--color-text);padding:var(--space-3) var(--space-5);
    border-radius:var(--radius-lg);box-shadow:var(--shadow-md);
    font-size:var(--text-sm);display:flex;align-items:center;gap:var(--space-2);
    z-index:9999;border-left:3px solid ${colorMap[type] || colorMap.primary};
    animation:toastIn .25s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export function injectAgentsStyles() {
  if (document.getElementById('agents-styles')) return;
  const style = document.createElement('style');
  style.id = 'agents-styles';
  style.textContent = `
    @keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
    @keyframes spin     { to   { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; display:inline-block; }

    .agents-page { display:flex; flex-direction:column; gap:var(--space-6); }

    /* Page header */
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); flex-wrap:wrap; }
    .page-header-actions { display:flex; gap:var(--space-2); flex-shrink:0; }
    .page-title   { font-size:var(--text-xl); font-family:var(--font-display); font-weight:700; color:var(--color-text); }
    .page-subtitle { font-size:var(--text-sm); color:var(--color-text-muted); margin-top:var(--space-1); }

    /* Tabs */
    .agents-tabs { display:flex; gap:0; border-bottom:1px solid var(--color-divider); }
    .tab-btn { background:none; border:none; padding:var(--space-3) var(--space-5); font-size:var(--text-sm); color:var(--color-text-muted); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color var(--transition-interactive),border-color var(--transition-interactive); }
    .tab-btn:hover { color:var(--color-text); }
    .tab-btn.active { color:var(--color-primary); border-bottom-color:var(--color-primary); font-weight:600; }

    /* Panel toolbar */
    .panel-toolbar { display:flex; gap:var(--space-3); align-items:center; flex-wrap:wrap; margin-bottom:var(--space-4); }
    .search-wrap { display:flex; align-items:center; gap:var(--space-2); background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); flex:1; min-width:200px; }
    .search-wrap svg { color:var(--color-text-faint); width:16px; height:16px; flex-shrink:0; }
    .search-wrap input { background:none; border:none; outline:none; font-size:var(--text-sm); color:var(--color-text); width:100%; }
    .panel-toolbar select { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); font-size:var(--text-sm); color:var(--color-text); cursor:pointer; }

    /* Agent grid */
    .agent-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr)); gap:var(--space-4); }
    .agent-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-5); display:flex; gap:var(--space-4); align-items:flex-start; cursor:pointer; transition:box-shadow var(--transition-interactive),border-color var(--transition-interactive); }
    .agent-card:hover { box-shadow:var(--shadow-md); border-color:var(--color-primary-highlight); }
    .agent-card:focus-visible { outline:2px solid var(--color-primary); outline-offset:2px; }
    .agent-card-icon { width:40px; height:40px; border-radius:var(--radius-md); background:var(--color-primary-highlight); color:var(--color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .agent-card-icon svg { width:20px; height:20px; }
    .agent-card-body { flex:1; min-width:0; }
    .agent-card-header { display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap; margin-bottom:var(--space-1); }
    .agent-card-name { font-weight:600; font-size:var(--text-base); color:var(--color-text); }
    .agent-card-tags { display:flex; gap:var(--space-1); flex-wrap:wrap; }
    .agent-card-desc { font-size:var(--text-sm); color:var(--color-text-muted); line-height:1.5; margin-bottom:var(--space-2); }
    .cap-list { display:flex; flex-wrap:wrap; gap:var(--space-1); }
    .cap-tag { font-size:var(--text-xs); background:var(--color-surface-offset); color:var(--color-text-muted); border-radius:var(--radius-sm); padding:2px var(--space-2); }
    .agent-badge { font-size:var(--text-xs); padding:2px var(--space-2); border-radius:var(--radius-full); font-weight:500; }
    .agent-select-btn { flex-shrink:0; padding:var(--space-2); border-radius:var(--radius-md); color:var(--color-text-muted); }
    .agent-select-btn:hover { background:var(--color-surface-offset); color:var(--color-primary); }
    .agent-select-btn svg { width:18px; height:18px; }

    /* Branding */
    .branding-layout { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-6); }
    @media(max-width:768px) { .branding-layout { grid-template-columns:1fr; } }
    .card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-6); }
    .section-title { font-size:var(--text-lg); font-weight:700; color:var(--color-text); margin-bottom:var(--space-1); }
    .section-desc  { font-size:var(--text-sm); color:var(--color-text-muted); margin-bottom:var(--space-5); }
    .form-group { margin-bottom:var(--space-4); }
    .form-label { display:block; font-size:var(--text-sm); font-weight:500; color:var(--color-text); margin-bottom:var(--space-2); }
    .form-input { width:100%; background:var(--color-bg); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-2) var(--space-3); font-size:var(--text-sm); color:var(--color-text); transition:border-color var(--transition-interactive); }
    .form-input:focus { outline:none; border-color:var(--color-primary); }
    .color-row { display:flex; gap:var(--space-2); align-items:center; }
    .color-text { flex:1; }
    .color-swatch { width:40px; height:36px; border:1px solid var(--color-border); border-radius:var(--radius-md); cursor:pointer; padding:2px; background:none; }
    .preset-grid { display:flex; flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-5); }
    .preset-chip { display:flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-3); border:1px solid var(--color-border); border-radius:var(--radius-full); font-size:var(--text-xs); background:var(--color-bg); cursor:pointer; transition:border-color var(--transition-interactive),background var(--transition-interactive); }
    .preset-chip.active { border-color:var(--chip-color,var(--color-primary)); background:color-mix(in oklch,var(--chip-color,var(--color-primary)) 10%,transparent); }
    .chip-swatch { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
    .upload-drop { border:2px dashed var(--color-border); border-radius:var(--radius-md); padding:var(--space-8) var(--space-4); text-align:center; cursor:pointer; font-size:var(--text-sm); color:var(--color-text-muted); display:flex; flex-direction:column; align-items:center; gap:var(--space-2); transition:border-color var(--transition-interactive); }
    .upload-drop svg { width:24px; height:24px; }
    .upload-drop:hover,.upload-drop.drag-over { border-color:var(--color-primary); }
    .logo-preview { position:relative; display:inline-block; }
    .logo-preview img { max-height:64px; border-radius:var(--radius-md); }
    .logo-remove { position:absolute; top:-8px; right:-8px; background:var(--color-surface-offset); border:1px solid var(--color-border); border-radius:var(--radius-full); padding:2px; }
    .form-actions { display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-5); }

    /* Preview shell */
    .preview-shell { background:var(--color-bg); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4); }
    .preview-tray { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3); background:var(--color-surface-offset); border-radius:var(--radius-md); margin-bottom:var(--space-4); }
    .preview-name { font-size:var(--text-sm); font-weight:600; color:var(--color-text); flex:1; }
    .preview-dot { width:8px; height:8px; border-radius:50%; background:var(--color-success); }
    .preview-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3); }
    .preview-stat { display:flex; align-items:center; gap:var(--space-2); }
    .ps-label { font-size:var(--text-xs); color:var(--color-text-muted); width:36px; flex-shrink:0; }
    .ps-bar { flex:1; height:6px; background:var(--color-surface-offset); border-radius:var(--radius-full); overflow:hidden; }
    .ps-fill { height:100%; border-radius:var(--radius-full); transition:background var(--transition-interactive); }
    .ps-val { font-size:var(--text-xs); color:var(--color-text-muted); width:32px; text-align:right; }
    .preview-btn { align-self:flex-end; padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); color:#fff; font-size:var(--text-sm); font-weight:500; border:none; cursor:pointer; transition:opacity var(--transition-interactive); }
    .preview-btn:hover { opacity:.85; }

    /* Downloads */
    .download-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4); margin-bottom:var(--space-6); }
    .dl-version-info { display:flex; flex-direction:column; align-items:flex-end; gap:var(--space-1); }
    .dl-current-ver { font-size:var(--text-sm); color:var(--color-text-muted); }
    .link-small { font-size:var(--text-xs); color:var(--color-primary); display:flex; align-items:center; gap:2px; }
    .dl-section { margin-bottom:var(--space-6); }
    .dl-section-title { font-size:var(--text-base); font-weight:600; color:var(--color-text); margin-bottom:var(--space-3); }
    .dl-list { display:flex; flex-direction:column; gap:var(--space-2); }
    .dl-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-4); display:flex; align-items:center; justify-content:space-between; gap:var(--space-4); }
    .dl-card-left { display:flex; align-items:center; gap:var(--space-3); }
    .dl-icon { width:36px; height:36px; background:var(--color-surface-offset); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; color:var(--color-text-muted); }
    .dl-icon svg { width:18px; height:18px; }
    .dl-label { display:block; font-size:var(--text-sm); font-weight:500; color:var(--color-text); }
    .dl-meta  { display:block; font-size:var(--text-xs); color:var(--color-text-muted); }
    .dl-card-right { display:flex; align-items:center; gap:var(--space-3); }
    .dl-install-hint { display:flex; align-items:center; gap:var(--space-4); padding:var(--space-4) var(--space-5); }
    .hint-icon { width:24px; height:24px; color:var(--color-text-muted); flex-shrink:0; }
    .code-block { display:block; font-family:monospace; font-size:var(--text-xs); color:var(--color-text-muted); margin-top:var(--space-1); background:var(--color-surface-offset); padding:var(--space-2) var(--space-3); border-radius:var(--radius-sm); }

    /* Deployed / empty */
    .deployed-list { min-height:200px; }
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:var(--space-16) var(--space-8); gap:var(--space-3); color:var(--color-text-muted); }
    .empty-icon { width:48px; height:48px; margin-bottom:var(--space-2); color:var(--color-text-faint); }
    .empty-state h3 { color:var(--color-text); font-size:var(--text-lg); font-weight:600; }
    .empty-state p  { font-size:var(--text-sm); max-width:36ch; }

    /* Buttons */
    .btn { display:inline-flex; align-items:center; gap:var(--space-2); padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); font-size:var(--text-sm); font-weight:500; cursor:pointer; border:1px solid transparent; transition:background var(--transition-interactive),color var(--transition-interactive),border-color var(--transition-interactive); }
    .btn svg { width:16px; height:16px; }
    .btn-primary { background:var(--color-primary); color:#fff; }
    .btn-primary:hover { background:var(--color-primary-hover); }
    .btn-ghost   { background:transparent; color:var(--color-text-muted); border-color:var(--color-border); }
    .btn-ghost:hover { background:var(--color-surface-offset); color:var(--color-text); }
  `;
  document.head.appendChild(style);
}
