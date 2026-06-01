/* ============================================================
   InfraDesk Remote — scripts/app.js
   Core Application Controller
   Covers: Splash, Network Canvas, Onboarding, Login / Register /
   Reset / SSO, Routing, Toasts, Modals, Notifications,
   Sidebar, Command-K Search, Global State
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   GLOBAL STATE
──────────────────────────────────────────────────────────── */
const App = {
  currentPage : 'dashboard',
  currentUser : null,
  sidebarOpen : true,
  onboarded   : false,
  toastQueue  : [],
  modals      : [],
  /** In-memory auth store (no localStorage — sandboxed iframe) */
  users: [
    { email: 'admin@infradesk.io', password: 'Admin@1234', name: 'John Doe', role: 'Super Admin', initials: 'JD' }
  ],
  pageHistory : [],
};

/* ────────────────────────────────────────────────────────────
   BOOT SEQUENCE
──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLucide();
  runSplash();
});

function initLucide() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

/* ════════════════════════════════════════════════════════════
   SPLASH SCREEN
   ════════════════════════════════════════════════════════════ */
const SPLASH_STEPS = [
  'Initializing secure connection...',
  'Loading cryptographic modules...',
  'Validating enterprise certificates...',
  'Connecting to InfraDesk cloud...',
  'Syncing device registry...',
  'Applying security policies...',
  'Fetching monitoring data...',
  'Platform ready.',
];

function runSplash() {
  const fill   = document.getElementById('splashProgress');
  const status = document.getElementById('splashStatus');
  const canvas = document.getElementById('networkCanvas');

  if (canvas) startNetworkCanvas(canvas);

  let step = 0;
  const total = SPLASH_STEPS.length;

  const tick = () => {
    if (step >= total) {
      // Full — pause 400 ms then exit
      setTimeout(exitSplash, 400);
      return;
    }
    const pct = Math.round(((step + 1) / total) * 100);
    if (fill)   fill.style.width = pct + '%';
    if (status) status.textContent = SPLASH_STEPS[step];
    step++;
    setTimeout(tick, 320 + Math.random() * 280);
  };

  setTimeout(tick, 350);
}

function exitSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.style.display = 'none';
    afterSplash();
  }, 620);
}

function afterSplash() {
  // Show onboarding if first visit this session
  if (!App.onboarded) {
    showScreen('onboarding-screen');
  } else if (App.currentUser) {
    launchApp();
  } else {
    showScreen('login-screen');
  }
}

/* ────────────────────────────────────────────────────────────
   NETWORK CANVAS (Splash background)
──────────────────────────────────────────────────────────── */
function startNetworkCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  let W, H, nodes, raf;
  const NODE_COUNT = 55;
  const MAX_DIST   = 160;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkNode() {
    return {
      x  : Math.random() * W,
      y  : Math.random() * H,
      vx : (Math.random() - 0.5) * 0.55,
      vy : (Math.random() - 0.5) * 0.55,
      r  : Math.random() * 2.2 + 1.2,
    };
  }

  function init() {
    resize();
    nodes = Array.from({ length: NODE_COUNT }, mkNode);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(37,99,235,${(1 - dist / MAX_DIST) * 0.35})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(96,165,250,0.75)';
      ctx.fill();
    });
  }

  function update() {
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
  }

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  init();
  loop();

  // Stop when splash is gone to free GPU
  const observer = new MutationObserver(() => {
    const splash = document.getElementById('splash-screen');
    if (splash && splash.style.display === 'none') {
      cancelAnimationFrame(raf);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('splash-screen'), { attributes: true, attributeFilter: ['style'] });
}

/* ════════════════════════════════════════════════════════════
   SCREEN HELPER
   ════════════════════════════════════════════════════════════ */
const SCREENS = ['splash-screen', 'onboarding-screen', 'login-screen', 'app-shell'];

function showScreen(id) {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    if (s === id) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

/* ════════════════════════════════════════════════════════════
   ONBOARDING
   ════════════════════════════════════════════════════════════ */
let currentSlide = 1;
const TOTAL_SLIDES = 5;

function goToSlide(n) {
  const slides = document.querySelectorAll('.onboarding-slide');
  const dots   = document.querySelectorAll('.ob-dot');
  const back   = document.getElementById('ob-back-btn');
  const next   = document.getElementById('ob-next-btn');

  slides.forEach((s, i) => {
    s.classList.toggle('active', i + 1 === n);
  });
  dots.forEach((d, i) => {
    d.classList.toggle('active', i + 1 === n);
  });

  currentSlide = n;

  if (back) back.style.display = n > 1 ? 'inline-flex' : 'none';
  if (next) {
    if (n === TOTAL_SLIDES) {
      next.textContent = 'Get Started →';
      next.onclick = goToLogin;
    } else {
      next.textContent = 'Next →';
      next.onclick = nextSlide;
    }
  }
}

function nextSlide() {
  if (currentSlide < TOTAL_SLIDES) {
    goToSlide(currentSlide + 1);
  } else {
    goToLogin();
  }
}

function prevSlide() {
  if (currentSlide > 1) goToSlide(currentSlide - 1);
}

function skipOnboarding() {
  App.onboarded = true;
  showScreen('login-screen');
  showPanel('panel-login');
}

function goToLogin() {
  App.onboarded = true;
  showScreen('login-screen');
  showPanel('panel-login');
}

/* ════════════════════════════════════════════════════════════
   LOGIN — PANEL SWITCHING
   ════════════════════════════════════════════════════════════ */
const ALL_PANELS = ['panel-login', 'panel-register', 'panel-reset', 'panel-mfa'];

function showPanel(id) {
  ALL_PANELS.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.classList.toggle('hidden', p !== id);
  });
}

/* ────────────────────────────────────────────────────────────
   PASSWORD TOGGLE
──────────────────────────────────────────────────────────── */
function togglePass(btn) {
  const wrap  = btn.closest('.input-wrap');
  const input = wrap ? wrap.querySelector('input') : null;
  if (!input) return;
  const isPass = input.type === 'password';
  input.type   = isPass ? 'text' : 'password';
  btn.textContent = isPass ? '🙈' : '👁';
}

/* ────────────────────────────────────────────────────────────
   LOGIN SUBMIT
──────────────────────────────────────────────────────────── */
function doLogin(e) {
  e.preventDefault();
  const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
  const pass  = document.getElementById('loginPass')?.value || '';

  if (!email || !pass) {
    showToast('Please fill in all fields.', 'warning');
    return;
  }

  const user = App.users.find(
    u => u.email.toLowerCase() === email && u.password === pass
  );

  if (user) {
    App.currentUser = user;
    showToast(`Welcome back, ${user.name}! 👋`, 'success');
    setTimeout(launchApp, 600);
  } else {
    // Demo: accept any email with password 'demo'
    if (pass === 'demo' || pass === 'Demo@1234') {
      const demoUser = {
        email,
        name   : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        role   : 'Administrator',
        initials: email.slice(0, 2).toUpperCase(),
      };
      App.currentUser = demoUser;
      showToast(`Welcome, ${demoUser.name}!`, 'success');
      setTimeout(launchApp, 600);
    } else {
      shakeLoginForm();
      showToast('Invalid email or password. Try password: demo', 'error');
    }
  }
}

function shakeLoginForm() {
  const panel = document.getElementById('panel-login');
  if (!panel) return;
  panel.style.animation = 'shake 0.4s ease';
  setTimeout(() => (panel.style.animation = ''), 420);
}

/* ────────────────────────────────────────────────────────────
   REGISTER SUBMIT
──────────────────────────────────────────────────────────── */
function doRegister(e) {
  e.preventDefault();
  const form   = e.target;
  const inputs = form.querySelectorAll('input');
  const vals   = Array.from(inputs).map(i => i.value.trim());

  if (vals.some(v => !v)) {
    showToast('Please fill in all fields.', 'warning');
    return;
  }

  const [first, last, email, company, password] = vals;

  if (password.length < 8) {
    showToast('Password must be at least 8 characters.', 'warning');
    return;
  }

  const newUser = {
    email    : email.toLowerCase(),
    password,
    name     : `${first} ${last}`,
    company,
    role     : 'Administrator',
    initials : (first[0] + last[0]).toUpperCase(),
  };
  App.users.push(newUser);
  App.currentUser = newUser;

  showToast(`Workspace created! Welcome, ${first} 🎉`, 'success');
  setTimeout(launchApp, 800);
}

/* ────────────────────────────────────────────────────────────
   PASSWORD RESET
──────────────────────────────────────────────────────────── */
function doReset(e) {
  e.preventDefault();
  const emailEl = e.target.querySelector('input[type="email"]');
  const email   = emailEl ? emailEl.value.trim() : '';

  if (!email) {
    showToast('Please enter your email address.', 'warning');
    return;
  }

  showToast(`Reset link sent to ${email} ✉️`, 'success');
  setTimeout(() => showPanel('panel-login'), 1500);
}

/* ────────────────────────────────────────────────────────────
   SSO LOGIN
──────────────────────────────────────────────────────────── */
function ssoLogin(provider) {
  const names = { google: 'Google', microsoft: 'Microsoft', github: 'GitHub' };
  showToast(`Connecting to ${names[provider] || provider}...`, 'info');

  // Simulate OAuth redirect delay
  setTimeout(() => {
    const ssoUser = {
      email    : `user@${provider}.com`,
      name     : `${names[provider]} User`,
      role     : 'Administrator',
      initials : (names[provider] || provider).slice(0, 2).toUpperCase(),
      provider,
    };
    App.currentUser = ssoUser;
    showToast(`Signed in with ${names[provider]}! 👋`, 'success');
    setTimeout(launchApp, 500);
  }, 1400);
}

/* ════════════════════════════════════════════════════════════
   LAUNCH APP
   ════════════════════════════════════════════════════════════ */
function launchApp() {
  if (!App.currentUser) {
    showScreen('login-screen');
    return;
  }

  // Personalise sidebar with logged-in user
  _setUserUI(App.currentUser);

  showScreen('app-shell');
  showPage('dashboard', null);
  initKeyboardShortcuts();
  initGlobalSearch();
  initLucide();

  // Welcome toast
  setTimeout(() => {
    showToast('System online · All services operational 🟢', 'success', 4000);
  }, 800);
}

function _setUserUI(user) {
  const nameEls    = document.querySelectorAll('.user-name, .topbar-user-name');
  const roleEls    = document.querySelectorAll('.user-role');
  const avatarEls  = document.querySelectorAll('.user-avatar, .topbar-avatar');

  nameEls.forEach(el   => el.textContent = user.name || 'User');
  roleEls.forEach(el   => el.textContent = user.role || 'Member');
  avatarEls.forEach(el => el.textContent = user.initials || '?');
}

/* ════════════════════════════════════════════════════════════
   ROUTING — showPage
   ════════════════════════════════════════════════════════════ */
const PAGE_META = {
  dashboard   : { label: 'Dashboard',          icon: '⊞' },
  monitoring  : { label: 'Monitoring',          icon: '📊' },
  alerts      : { label: 'Alerts',              icon: '🔔' },
  devices     : { label: 'Device Inventory',    icon: '🖥️' },
  remote      : { label: 'Remote Sessions',     icon: '🖱️' },
  filetransfer: { label: 'File Transfer',       icon: '📁' },
  software    : { label: 'Software Inventory',  icon: '📦' },
  patches     : { label: 'Patch Management',    icon: '🔧' },
  agents      : { label: 'Agent Manager',       icon: '⚙️' },
  helpdesk    : { label: 'Helpdesk',            icon: '🎫' },
  security    : { label: 'Security Center',     icon: '🛡️' },
  reports     : { label: 'Reports & Analytics', icon: '📈' },
  users       : { label: 'User Management',     icon: '👥' },
  settings    : { label: 'Settings',            icon: '⚙' },
};

function showPage(page, linkEl) {
  // Guard: must be logged in
  if (!App.currentUser && page !== 'login') {
    showScreen('login-screen');
    return;
  }

  App.pageHistory.push(App.currentPage);
  App.currentPage = page;

  // Active nav item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
  });
  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    // Find it by page
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('onclick')?.includes(`'${page}'`)) {
        el.classList.add('active');
      }
    });
  }

  // Breadcrumb
  const bc  = document.getElementById('breadcrumb');
  const meta = PAGE_META[page] || { label: page, icon: '' };
  if (bc) bc.textContent = meta.label;

  // Inject page
  const container = document.getElementById('pageContent');
  if (!container) return;

  // Show loading skeleton momentarily
  container.innerHTML = _pageLoadingSkeleton(meta.label);

  // Call the page module render function after micro-delay
  setTimeout(() => {
    const fnName = `render${_capitalize(page)}Page`;
    if (typeof window[fnName] === 'function') {
      window[fnName](container);
      initLucide();
    } else {
      container.innerHTML = _pageComingSoon(meta);
    }
  }, 60);

  // Close notification panel if open
  closeNotifPanel();
  closeUserMenu();
}

function _capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function _pageLoadingSkeleton(label) {
  return `
    <div class="page-header">
      <div class="skeleton skeleton-heading" style="width:200px"></div>
    </div>
    <div class="page-body" style="padding:24px;display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        ${'<div class="skeleton skel-kpi"></div>'.repeat(4)}
      </div>
      <div class="skeleton skel-chart"></div>
      <div class="skeleton skel-row"></div>
      <div class="skeleton skel-row"></div>
      <div class="skeleton skel-row"></div>
    </div>
  `;
}

function _pageComingSoon(meta) {
  return `
    <div class="page-header">
      <div class="page-title-row">
        <h1 class="page-title">${meta.icon} ${meta.label}</h1>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:380px;gap:16px">
      <div style="font-size:56px">${meta.icon}</div>
      <h2 style="font-size:20px;font-weight:700;color:var(--text-primary)">${meta.label}</h2>
      <p style="color:var(--text-secondary);font-size:14px">This module is loading — check back shortly.</p>
      <button class="btn-ghost" onclick="showPage('dashboard',null)">← Back to Dashboard</button>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════
   TOAST SYSTEM
   ════════════════════════════════════════════════════════════ */
const TOAST_ICONS = {
  success : '✅',
  error   : '❌',
  warning : '⚠️',
  info    : 'ℹ️',
};

const TOAST_COLORS = {
  success : 'var(--success)',
  error   : 'var(--danger)',
  warning : 'var(--warning)',
  info    : 'var(--info)',
};

function showToast(message, type = 'info', duration = 3600) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const id   = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
  const clr  = TOAST_COLORS[type] || TOAST_COLORS.info;

  const toast = document.createElement('div');
  toast.id        = id;
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon" style="color:${clr}">${icon}</span>
    <span class="toast-msg">${_escapeHtml(message)}</span>
    <button class="toast-close" onclick="dismissToast('${id}')" aria-label="Close">✕</button>
  `;

  // Inline styles to avoid dependency on external CSS being loaded
  Object.assign(toast.style, {
    display         : 'flex',
    alignItems      : 'center',
    gap             : '10px',
    padding         : '12px 16px',
    background      : 'var(--bg-card)',
    border          : `1px solid var(--border)`,
    borderLeft      : `3px solid ${clr}`,
    borderRadius    : 'var(--radius-md)',
    boxShadow       : 'var(--shadow-lg)',
    color           : 'var(--text-primary)',
    fontSize        : '13.5px',
    maxWidth        : '380px',
    minWidth        : '260px',
    opacity         : '0',
    transform       : 'translateX(40px)',
    transition      : 'opacity 0.25s ease, transform 0.25s ease',
    position        : 'relative',
    pointerEvents   : 'auto',
  });

  toast.querySelector('.toast-icon').style.cssText = `font-size:16px;flex-shrink:0;color:${clr}`;
  toast.querySelector('.toast-msg').style.cssText  = 'flex:1;line-height:1.4';
  toast.querySelector('.toast-close').style.cssText = [
    'background:none','border:none','color:var(--text-muted)',
    'cursor:pointer','font-size:12px','padding:0','flex-shrink:0',
    'opacity:0.6','transition:opacity 0.15s',
  ].join(';');

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateX(0)';
    });
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(id), duration);
  toast._timer = timer;

  // Pause on hover
  toast.addEventListener('mouseenter', () => clearTimeout(toast._timer));
  toast.addEventListener('mouseleave', () => {
    toast._timer = setTimeout(() => dismissToast(id), 1500);
  });
}

function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  clearTimeout(toast._timer);
  toast.style.opacity   = '0';
  toast.style.transform = 'translateX(40px)';
  setTimeout(() => toast.remove(), 280);
}

function _escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════════════════════
   MODAL SYSTEM
   ════════════════════════════════════════════════════════════ */

/**
 * openModal({ title, body, footer, size, onClose })
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
function openModal({ title = '', body = '', footer = '', size = 'md', onClose = null } = {}) {
  const overlay   = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  if (!overlay || !container) return;

  const sizeMap = { sm: '420px', md: '560px', lg: '760px', xl: '980px' };
  const maxW    = sizeMap[size] || sizeMap.md;

  container.innerHTML = `
    <div class="modal" style="max-width:${maxW}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-title">${title}</h2>
        <button class="modal-close" onclick="closeModal()" aria-label="Close modal">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  // Base modal styles (in case dashboard.css hasn't loaded .modal)
  const modal = container.querySelector('.modal');
  if (modal && !modal.classList.contains('styled')) {
    modal.classList.add('styled');
    Object.assign(modal.style, {
      background      : 'var(--bg-card)',
      border          : '1px solid var(--border)',
      borderRadius    : 'var(--radius-xl)',
      boxShadow       : 'var(--shadow-lg)',
      width           : '90vw',
      display         : 'flex',
      flexDirection   : 'column',
      maxHeight       : '85vh',
      overflow        : 'hidden',
      animation       : 'modalPop 0.2s cubic-bezier(0.4,0,0.2,1)',
    });
  }

  overlay.classList.remove('hidden');
  container.classList.remove('hidden');

  // Store close callback
  container._onClose = onClose;

  // Trap focus
  setTimeout(() => {
    const first = container.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
  }, 50);

  // Esc to close
  document._modalEscHandler = (e) => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', document._modalEscHandler);
}

function closeModal() {
  const overlay   = document.getElementById('modalOverlay');
  const container = document.getElementById('modalContainer');
  if (!overlay || !container) return;

  if (typeof container._onClose === 'function') container._onClose();

  overlay.classList.add('hidden');
  container.classList.add('hidden');
  container.innerHTML    = '';
  container._onClose     = null;

  document.removeEventListener('keydown', document._modalEscHandler);
}

/**
 * confirmModal(message, onConfirm, { confirmLabel, danger })
 */
function confirmModal(message, onConfirm, { confirmLabel = 'Confirm', danger = false } = {}) {
  const btnClass = danger ? 'btn-danger' : 'btn-primary';
  openModal({
    title  : 'Confirm Action',
    body   : `<p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${_escapeHtml(message)}</p>`,
    footer : `
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="${btnClass}" id="modal-confirm-btn">${_escapeHtml(confirmLabel)}</button>
    `,
    size   : 'sm',
  });
  setTimeout(() => {
    const btn = document.getElementById('modal-confirm-btn');
    if (btn) btn.addEventListener('click', () => { closeModal(); onConfirm(); });
  }, 10);
}

/* ════════════════════════════════════════════════════════════
   NOTIFICATION PANEL
   ════════════════════════════════════════════════════════════ */
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    // Close user menu if open
    closeUserMenu();
    // Animate in
    panel.style.opacity   = '0';
    panel.style.transform = 'translateY(-8px)';
    panel.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.opacity   = '1';
        panel.style.transform = 'translateY(0)';
      });
    });
    // Outside click closes it
    setTimeout(() => {
      document.addEventListener('click', _notifOutsideClick, { once: true });
    }, 0);
  }
}

function _notifOutsideClick(e) {
  const panel = document.getElementById('notifPanel');
  const btn   = document.querySelector('[onclick="toggleNotifPanel()"]');
  if (panel && !panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
    closeNotifPanel();
  }
}

function closeNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.style.display = 'none';
}

/* ════════════════════════════════════════════════════════════
   USER MENU (topbar)
   ════════════════════════════════════════════════════════════ */
let _userMenuEl = null;

function toggleUserMenu() {
  if (_userMenuEl) {
    _userMenuEl.remove();
    _userMenuEl = null;
    return;
  }

  const trigger = document.querySelector('.topbar-user-btn');
  if (!trigger) return;

  const menu = document.createElement('div');
  menu.className = 'dropdown-menu right';
  menu.id        = 'userDropdown';
  const user     = App.currentUser || {};

  menu.innerHTML = `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);margin-bottom:4px">
      <div style="font-weight:700;font-size:13px;color:var(--text-primary)">${_escapeHtml(user.name || 'User')}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${_escapeHtml(user.email || '')}</div>
    </div>
    <div class="dropdown-item" onclick="showPage('settings',null);closeUserMenu()">
      <span class="dropdown-item-icon">⚙</span>
      <span class="dropdown-item-label">Settings</span>
    </div>
    <div class="dropdown-item" onclick="showPage('users',null);closeUserMenu()">
      <span class="dropdown-item-icon">👤</span>
      <span class="dropdown-item-label">Profile</span>
    </div>
    <div class="dropdown-item" onclick="openModal({title:'Keyboard Shortcuts',body:_shortcutsBody(),size:'md'})">
      <span class="dropdown-item-icon">⌨</span>
      <span class="dropdown-item-label">Keyboard Shortcuts</span>
      <span class="dropdown-item-shortcut">?</span>
    </div>
    <div class="dropdown-divider"></div>
    <div class="dropdown-item danger" onclick="doLogout()">
      <span class="dropdown-item-icon">⏻</span>
      <span class="dropdown-item-label">Sign Out</span>
    </div>
  `;

  Object.assign(menu.style, {
    position : 'absolute',
    top      : '100%',
    right    : '0',
    zIndex   : '650',
  });

  trigger.style.position = 'relative';
  trigger.appendChild(menu);
  _userMenuEl = menu;

  setTimeout(() => {
    document.addEventListener('click', _userMenuOutside, { once: true });
  }, 0);
}

function _userMenuOutside(e) {
  const trigger = document.querySelector('.topbar-user-btn');
  if (_userMenuEl && !_userMenuEl.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
    closeUserMenu();
  }
}

function closeUserMenu() {
  if (_userMenuEl) {
    _userMenuEl.remove();
    _userMenuEl = null;
  }
}

/* ════════════════════════════════════════════════════════════
   LOGOUT
   ════════════════════════════════════════════════════════════ */
function doLogout() {
  confirmModal(
    'Are you sure you want to sign out of InfraDesk Remote?',
    () => {
      App.currentUser = null;
      App.pageHistory = [];
      showScreen('login-screen');
      showPanel('panel-login');
      showToast('Signed out successfully.', 'info');
    },
    { confirmLabel: 'Sign Out', danger: true }
  );
}

/* ════════════════════════════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');
  if (!sidebar) return;

  App.sidebarOpen = !App.sidebarOpen;
  sidebar.classList.toggle('collapsed', !App.sidebarOpen);
  if (main) main.classList.toggle('sidebar-collapsed', !App.sidebarOpen);
}

let _workspaceMenuOpen = false;
function toggleWorkspace() {
  _workspaceMenuOpen = !_workspaceMenuOpen;
  const sel = document.querySelector('.workspace-selector');
  if (sel) sel.classList.toggle('open', _workspaceMenuOpen);

  if (_workspaceMenuOpen) {
    showToast('Workspace switcher — Pro feature 🔒', 'info', 2500);
    setTimeout(() => {
      _workspaceMenuOpen = false;
      if (sel) sel.classList.remove('open');
    }, 2500);
  }
}

/* ════════════════════════════════════════════════════════════
   GLOBAL SEARCH + COMMAND PALETTE (⌘K)
   ════════════════════════════════════════════════════════════ */
const CMD_ITEMS = [
  { title: 'Dashboard',          sub: 'Overview & KPIs',      icon: '⊞', action: () => showPage('dashboard', null) },
  { title: 'Device Inventory',   sub: 'Browse all endpoints', icon: '🖥️', action: () => showPage('devices', null) },
  { title: 'Remote Sessions',    sub: 'Start or join a session', icon: '🖱️', action: () => showPage('remote', null) },
  { title: 'Monitoring',         sub: 'Real-time metrics',    icon: '📊', action: () => showPage('monitoring', null) },
  { title: 'Alerts',             sub: '7 active alerts',      icon: '🔔', action: () => showPage('alerts', null) },
  { title: 'Patch Management',   sub: '12 pending patches',   icon: '🔧', action: () => showPage('patches', null) },
  { title: 'Helpdesk',           sub: 'Tickets & support',    icon: '🎫', action: () => showPage('helpdesk', null) },
  { title: 'Security Center',    sub: 'Threats & compliance', icon: '🛡️', action: () => showPage('security', null) },
  { title: 'Reports & Analytics', sub: 'Generate reports',   icon: '📈', action: () => showPage('reports', null) },
  { title: 'File Transfer',      sub: 'Send & receive files', icon: '📁', action: () => showPage('filetransfer', null) },
  { title: 'Software Inventory', sub: 'Installed packages',   icon: '📦', action: () => showPage('software', null) },
  { title: 'Agent Manager',      sub: 'Deploy & manage agents', icon: '⚙️', action: () => showPage('agents', null) },
  { title: 'User Management',    sub: 'Roles & permissions',  icon: '👥', action: () => showPage('users', null) },
  { title: 'Settings',           sub: 'Platform configuration', icon: '⚙', action: () => showPage('settings', null) },
  { title: 'Sign Out',           sub: 'End your session',     icon: '⏻', action: doLogout },
];

let _cmdOpen = false;

function openCommandPalette() {
  if (_cmdOpen) { closeCommandPalette(); return; }
  _cmdOpen = true;

  const overlay = document.createElement('div');
  overlay.id        = 'cmdPaletteOverlay';
  overlay.className = 'cmd-palette-overlay';
  overlay.innerHTML = `
    <div class="cmd-palette" id="cmdPalette" role="dialog" aria-label="Command Palette">
      <div class="cmd-input-row">
        <span class="cmd-icon">🔍</span>
        <input class="cmd-input" id="cmdInput" placeholder="Search pages, devices, commands..." autocomplete="off" spellcheck="false"/>
        <span class="cmd-esc">ESC</span>
      </div>
      <div class="cmd-results" id="cmdResults"></div>
      <div class="cmd-footer">
        <span class="cmd-hint"><span class="cmd-key">↑↓</span> navigate</span>
        <span class="cmd-hint"><span class="cmd-key">↵</span> open</span>
        <span class="cmd-hint"><span class="cmd-key">ESC</span> close</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCommandPalette();
  });

  const input = document.getElementById('cmdInput');
  if (input) {
    input.addEventListener('input', () => renderCmdResults(input.value));
    input.addEventListener('keydown', handleCmdKey);
    input.focus();
  }

  renderCmdResults('');
}

let _cmdSelected = 0;

function renderCmdResults(query) {
  const container = document.getElementById('cmdResults');
  if (!container) return;

  const q      = query.toLowerCase().trim();
  const items  = q
    ? CMD_ITEMS.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.sub.toLowerCase().includes(q)
      )
    : CMD_ITEMS;

  _cmdSelected = 0;

  if (!items.length) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No results for "${_escapeHtml(query)}"</div>`;
    return;
  }

  container.innerHTML = `
    ${ !q ? '<div class="cmd-section-label">Navigation</div>' : '' }
    ${items.map((item, idx) => `
      <div class="cmd-result-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}" onclick="_cmdExec(${CMD_ITEMS.indexOf(item)})">
        <span class="cmd-result-icon">${item.icon}</span>
        <div class="cmd-result-text">
          <div class="cmd-result-title">${_escapeHtml(item.title)}</div>
          <div class="cmd-result-sub">${_escapeHtml(item.sub)}</div>
        </div>
      </div>
    `).join('')}
  `;
}

function handleCmdKey(e) {
  const items = document.querySelectorAll('.cmd-result-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _cmdSelected = (_cmdSelected + 1) % items.length;
    _updateCmdSelection(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _cmdSelected = (_cmdSelected - 1 + items.length) % items.length;
    _updateCmdSelection(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const sel = items[_cmdSelected];
    if (sel) {
      const idx = parseInt(sel.dataset.idx, 10);
      const input = document.getElementById('cmdInput');
      const q = input ? input.value.toLowerCase().trim() : '';
      const filtered = q
        ? CMD_ITEMS.filter(i => i.title.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))
        : CMD_ITEMS;
      const item = filtered[idx];
      if (item) _execCmdItem(item);
    }
  } else if (e.key === 'Escape') {
    closeCommandPalette();
  }
}

function _updateCmdSelection(items) {
  items.forEach((el, i) => el.classList.toggle('selected', i === _cmdSelected));
  items[_cmdSelected]?.scrollIntoView({ block: 'nearest' });
}

function _cmdExec(globalIdx) {
  const item = CMD_ITEMS[globalIdx];
  if (item) _execCmdItem(item);
}

function _execCmdItem(item) {
  closeCommandPalette();
  if (typeof item.action === 'function') item.action();
}

function closeCommandPalette() {
  _cmdOpen = false;
  const el = document.getElementById('cmdPaletteOverlay');
  if (el) el.remove();
}

function initGlobalSearch() {
  const input = document.getElementById('globalSearch');
  if (!input) return;
  input.addEventListener('focus', openCommandPalette);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.blur(); closeCommandPalette(); }
  });
}

/* ════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ════════════════════════════════════════════════════════════ */
const SHORTCUTS = [
  { keys: ['Meta+k', 'Control+k'], label: '⌘K / Ctrl+K', desc: 'Open Command Palette' },
  { keys: ['?'],                   label: '?',             desc: 'Show this help' },
  { keys: ['g d'],                 label: 'G then D',      desc: 'Go to Dashboard' },
  { keys: ['g v'],                 label: 'G then V',      desc: 'Go to Devices' },
  { keys: ['g r'],                 label: 'G then R',      desc: 'Go to Remote Sessions' },
  { keys: ['g m'],                 label: 'G then M',      desc: 'Go to Monitoring' },
  { keys: ['g a'],                 label: 'G then A',      desc: 'Go to Alerts' },
  { keys: ['g h'],                 label: 'G then H',      desc: 'Go to Helpdesk' },
  { keys: ['g s'],                 label: 'G then S',      desc: 'Go to Security' },
  { keys: ['Escape'],              label: 'ESC',            desc: 'Close panel / modal' },
];

function _shortcutsBody() {
  return `
    <div style="display:grid;gap:6px">
      ${SHORTCUTS.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:6px">
          <span style="font-size:12px;color:var(--text-secondary)">${_escapeHtml(s.desc)}</span>
          <code style="font-size:11px;background:var(--border);padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace;color:var(--text-primary)">${_escapeHtml(s.label)}</code>
        </div>
      `).join('')}
    </div>
  `;
}

let _gKeyPending = false;

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in an input
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;

    // ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      closeCommandPalette();
      closeModal();
      closeNotifPanel();
      closeUserMenu();
      return;
    }

    // ? → shortcuts help
    if (e.key === '?') {
      openModal({ title: 'Keyboard Shortcuts', body: _shortcutsBody(), size: 'md' });
      return;
    }

    // G-chord navigation
    if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
      _gKeyPending = true;
      setTimeout(() => (_gKeyPending = false), 1500);
      return;
    }
    if (_gKeyPending) {
      _gKeyPending = false;
      const map = {
        d: 'dashboard', v: 'devices',   r: 'remote',
        m: 'monitoring', a: 'alerts',   h: 'helpdesk',
        s: 'security',  p: 'patches',   u: 'users',
      };
      const page = map[e.key.toLowerCase()];
      if (page) showPage(page, null);
    }
  });
}

/* ════════════════════════════════════════════════════════════
   CSS ANIMATION KEYFRAMES (injected once)
   ════════════════════════════════════════════════════════════ */
(function injectKeyframes() {
  if (document.getElementById('app-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'app-keyframes';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.93) translateY(12px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-8px); }
      40%     { transform: translateX(8px); }
      60%     { transform: translateX(-6px); }
      80%     { transform: translateX(6px); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(32px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    /* Toast container positioning */
    #toastContainer {
      position: fixed; bottom: 24px; right: 24px;
      display: flex; flex-direction: column-reverse; gap: 10px;
      z-index: 1100; pointer-events: none;
    }
    /* Modal container positioning */
    #modalContainer {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 800; padding: 24px;
      pointer-events: none;
    }
    #modalContainer:not(.hidden) { pointer-events: auto; }
    #modalContainer .modal { pointer-events: auto; }
    /* Modal overlay */
    #modalOverlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px);
      z-index: 799;
    }
    /* Modal inner structure */
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 22px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .modal-close {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 16px; transition: color 0.15s; padding: 2px 4px;
    }
    .modal-close:hover { color: var(--text-primary); }
    .modal-body {
      padding: 22px; overflow-y: auto; flex: 1;
      color: var(--text-secondary); font-size: 14px; line-height: 1.6;
    }
    .modal-footer {
      display: flex; gap: 10px; justify-content: flex-end;
      padding: 16px 22px; border-top: 1px solid var(--border); flex-shrink: 0;
    }
    /* Notification panel */
    #notifPanel {
      position: fixed; top: var(--topbar-h); right: 16px;
      width: 340px; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg); z-index: 500; overflow: hidden;
    }
    /* Command palette overlay */
    .cmd-palette-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(5px);
      z-index: 1000;
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 12vh;
      animation: fadeIn 0.15s ease;
    }
    .cmd-palette {
      width: 100%; max-width: 580px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg), 0 0 60px rgba(37,99,235,0.12);
      overflow: hidden;
      animation: modalPop 0.18s cubic-bezier(0.4,0,0.2,1);
    }
    /* Button helpers */
    .btn-danger {
      background: var(--danger); color: #fff; border: none;
      padding: 9px 20px; border-radius: var(--radius-md);
      font-weight: 600; font-size: 14px; cursor: pointer;
      transition: var(--transition);
    }
    .btn-danger:hover { background: #dc2626; }
    /* Sidebar collapsed */
    .sidebar.collapsed { width: 56px !important; }
    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .nav-section-label,
    .sidebar.collapsed .sidebar-brand,
    .sidebar.collapsed .workspace-info,
    .sidebar.collapsed .workspace-arrow,
    .sidebar.collapsed .user-info,
    .sidebar.collapsed .nav-badge { display: none !important; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 10px 0; }
    .sidebar.collapsed .nav-icon { font-size: 18px; }
    .main-content.sidebar-collapsed { margin-left: 56px !important; }
  `;
  document.head.appendChild(style);
}());

/* ════════════════════════════════════════════════════════════
   PUBLIC API (exposed on window for inline onclick handlers)
   ════════════════════════════════════════════════════════════ */
Object.assign(window, {
  // Splash
  exitSplash,
  // Onboarding
  goToSlide, nextSlide, prevSlide, skipOnboarding, goToLogin,
  // Auth
  showPanel, doLogin, doRegister, doReset, ssoLogin, togglePass, doLogout,
  // Routing
  showPage,
  // Toasts
  showToast, dismissToast,
  // Modals
  openModal, closeModal, confirmModal,
  // Notification
  toggleNotifPanel, closeNotifPanel,
  // User menu
  toggleUserMenu, closeUserMenu,
  // Sidebar
  toggleSidebar, toggleWorkspace,
  // Search
  openCommandPalette, closeCommandPalette,
  // Internal helpers exposed for page modules
  App, _escapeHtml, _shortcutsBody, _cmdExec,
});
