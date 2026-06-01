// scripts/pages/users.js — InfraDesk Remote: User/Role/RBAC Management
// Part 1 — Fake data, state, page shell, users tab

// ── Fake data ────────────────────────────────────────────────────────────────
const USERS = [
  { id: 1, name: 'Alice Johnson',  email: 'alice@infradesk.io',   role: 'Super Admin', dept: 'IT',        status: 'active',   mfa: true,  lastLogin: '2 min ago',   avatar: 'AJ' },
  { id: 2, name: 'Bob Williams',   email: 'bob@infradesk.io',     role: 'IT Admin',    dept: 'IT',        status: 'active',   mfa: true,  lastLogin: '1 hr ago',    avatar: 'BW' },
  { id: 3, name: 'Carol Smith',    email: 'carol@infradesk.io',   role: 'Technician',  dept: 'Helpdesk',  status: 'active',   mfa: false, lastLogin: '3 hrs ago',   avatar: 'CS' },
  { id: 4, name: 'David Lee',      email: 'david@infradesk.io',   role: 'Viewer',      dept: 'Finance',   status: 'inactive', mfa: false, lastLogin: '5 days ago',  avatar: 'DL' },
  { id: 5, name: 'Eva Martinez',   email: 'eva@infradesk.io',     role: 'IT Admin',    dept: 'IT',        status: 'active',   mfa: true,  lastLogin: '30 min ago',  avatar: 'EM' },
  { id: 6, name: 'Frank Chen',     email: 'frank@infradesk.io',   role: 'Technician',  dept: 'Helpdesk',  status: 'suspended',mfa: false, lastLogin: '12 days ago', avatar: 'FC' },
  { id: 7, name: 'Grace Kim',      email: 'grace@infradesk.io',   role: 'Viewer',      dept: 'Marketing', status: 'active',   mfa: false, lastLogin: '2 days ago',  avatar: 'GK' },
  { id: 8, name: 'Henry Patel',    email: 'henry@infradesk.io',   role: 'Auditor',     dept: 'Compliance',status: 'active',   mfa: true,  lastLogin: '4 hrs ago',   avatar: 'HP' },
];

const ROLES = [
  { id: 1, name: 'Super Admin',  users: 1, color: '#EF4444', perms: ['all'] },
  { id: 2, name: 'IT Admin',     users: 2, color: '#2563EB', perms: ['devices','sessions','patches','agents','users'] },
  { id: 3, name: 'Technician',   users: 2, color: '#10B981', perms: ['devices','sessions','helpdesk'] },
  { id: 4, name: 'Auditor',      users: 1, color: '#F59E0B', perms: ['reports','audit_logs','security'] },
  { id: 5, name: 'Viewer',       users: 2, color: '#94A3B8', perms: ['devices_view','sessions_view'] },
];

const PERMISSIONS = {
  'Devices':   ['devices_view','devices_manage','devices_delete'],
  'Remote':    ['sessions_view','sessions_start','sessions_record'],
  'Security':  ['security_view','security_manage','audit_logs'],
  'Helpdesk':  ['tickets_view','tickets_manage','tickets_assign'],
  'Patches':   ['patches_view','patches_deploy'],
  'Reports':   ['reports_view','reports_export'],
  'Users':     ['users_view','users_manage','roles_manage'],
  'Settings':  ['settings_view','settings_manage'],
};

// ── State ─────────────────────────────────────────────────────────────────────
let activeTab = 'users', filterStatus = 'all', filterRole = 'all', searchQ = '';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function initUsers() {
  renderUsersPage();
}

// ── Page Shell ────────────────────────────────────────────────────────────────
function renderUsersPage() {
  const main = document.querySelector('#page-content') || document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:var(--text-xl);font-weight:700;color:var(--color-text)">User Management</h1>
        <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-top:2px">Manage users, roles, permissions and access policies</p>
      </div>
      <button onclick="openCreateUserModal()" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);background:#2563EB;color:#fff;border:none;border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:600;cursor:pointer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        Invite User
      </button>
    </div>
    <div id="users-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--color-border,#243041);margin-bottom:var(--space-6)">
      ${['users','roles','permissions','groups'].map(t=>`
        <button onclick="switchUsersTab('${t}')" id="tab-${t}" style="padding:var(--space-2) var(--space-5);background:none;border:none;border-bottom:2px solid ${activeTab===t?'#2563EB':'transparent'};color:${activeTab===t?'#2563EB':'var(--color-text-muted)'};font-size:var(--text-sm);font-weight:${activeTab===t?'600':'400'};cursor:pointer;text-transform:capitalize">${t}</button>
      `).join('')}
    </div>
    <div id="users-tab-content"></div>
    <div id="users-modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;align-items:center;justify-content:center"></div>
  `;
  switchUsersTab(activeTab);
}

function switchUsersTab(tab) {
  activeTab = tab;
  ['users','roles','permissions','groups'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) {
      el.style.borderBottom = t === tab ? '2px solid #2563EB' : '2px solid transparent';
      el.style.color = t === tab ? '#2563EB' : 'var(--color-text-muted)';
      el.style.fontWeight = t === tab ? '600' : '400';
    }
  });
  const content = document.getElementById('users-tab-content');
  if (!content) return;
  if (tab === 'users')            content.innerHTML = renderUsersTab();
  else if (tab === 'roles')       content.innerHTML = renderRolesTab();
  else if (tab === 'permissions') content.innerHTML = renderPermissionsTab();
  else if (tab === 'groups')      content.innerHTML = renderGroupsTab();
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function renderUsersTab() {
  const statusBadge = s => {
    const map = { active:'#10B981', inactive:'#94A3B8', suspended:'#EF4444' };
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;background:${map[s]||'#94A3B8'}22;color:${map[s]||'#94A3B8'};font-size:11px;font-weight:600;text-transform:capitalize">
      <span style="width:6px;height:6px;border-radius:50%;background:${map[s]||'#94A3B8'}"></span>${s}</span>`;
  };
  const roleChip = r =>
    `<span style="padding:2px 8px;border-radius:99px;background:#2563EB22;color:#2563EB;font-size:11px;font-weight:600">${r}</span>`;
  const mfaIcon = m => m
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>`;

  const filtered = USERS.filter(u =>
    (filterStatus === 'all' || u.status === filterStatus) &&
    (filterRole === 'all' || u.role === filterRole) &&
    (!searchQ || u.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQ.toLowerCase()))
  );

  return `
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap;align-items:center">
      <div style="flex:1;min-width:200px;position:relative">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--color-text-muted)" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input id="user-search" value="${searchQ}" oninput="userSearch(this.value)" placeholder="Search users..." style="width:100%;padding:var(--space-2) var(--space-2) var(--space-2) 34px;background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)"/>
      </div>
      <select onchange="filterUsers('status',this.value)" style="padding:var(--space-2) var(--space-3);background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)">
        <option value="all">All Status</option>
        <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
      </select>
      <select onchange="filterUsers('role',this.value)" style="padding:var(--space-2) var(--space-3);background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)">
        <option value="all">All Roles</option>
        ${ROLES.map(r=>`<option value="${r.name}">${r.name}</option>`).join('')}
      </select>
      <span style="color:var(--color-text-muted);font-size:var(--text-xs)">${filtered.length} of ${USERS.length} users</span>
    </div>
    <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border,#243041)">
            ${['User','Role','Department','Status','MFA','Last Login','Actions'].map(h=>`<th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${filtered.map((u,i) => `
            <tr style="border-bottom:${i<filtered.length-1?'1px solid var(--color-border,#243041)':'none'};transition:background .15s" onmouseover="this.style.background='rgba(37,99,235,.05)'" onmouseout="this.style.background='transparent'">
              <td style="padding:var(--space-3) var(--space-4)">
                <div style="display:flex;align-items:center;gap:var(--space-3)">
                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${u.avatar}</div>
                  <div>
                    <div style="font-size:var(--text-sm);font-weight:600;color:var(--color-text)">${u.name}</div>
                    <div style="font-size:11px;color:var(--color-text-muted)">${u.email}</div>
                  </div>
                </div>
              </td>
              <td style="padding:var(--space-3) var(--space-4)">${roleChip(u.role)}</td>
              <td style="padding:var(--space-3) var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted)">${u.dept}</td>
              <td style="padding:var(--space-3) var(--space-4)">${statusBadge(u.status)}</td>
              <td style="padding:var(--space-3) var(--space-4)">${mfaIcon(u.mfa)}</td>
              <td style="padding:var(--space-3) var(--space-4);font-size:var(--text-xs);color:var(--color-text-muted)">${u.lastLogin}</td>
              <td style="padding:var(--space-3) var(--space-4)">
                <div style="display:flex;gap:var(--space-2)">
                  <button onclick="editUser(${u.id})" style="padding:4px 8px;border:1px solid var(--color-border,#243041);border-radius:var(--radius-sm);background:none;color:var(--color-text-muted);font-size:11px;cursor:pointer">Edit</button>
                  <button onclick="toggleUserStatus(${u.id})" style="padding:4px 8px;border:1px solid var(--color-border,#243041);border-radius:var(--radius-sm);background:none;color:var(--color-text-muted);font-size:11px;cursor:pointer">${u.status==='active'?'Suspend':'Activate'}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Export (Part 1) ───────────────────────────────────────────────────────────
window.initUsers      = initUsers;
window.switchUsersTab = switchUsersTab;
window.userSearch     = userSearch;
window.filterUsers    = filterUsers;
window.toggleUserStatus = toggleUserStatus;
window.editUser       = editUser;

// NOTE: Part 2 appended below — Roles, Permissions, Groups tabs + Modals
