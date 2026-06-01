// scripts/pages/users.js — InfraDesk Remote: User / Role / RBAC Management
// Complete file (Part 1 + Part 2) — 350+ lines

// ── Data ──────────────────────────────────────────────────────────────────────
const USERS = [
  { id:1, name:'Alice Johnson',  email:'alice@infradesk.io',  role:'Super Admin', dept:'IT',         status:'active',    mfa:true,  lastLogin:'2 min ago',   avatar:'AJ' },
  { id:2, name:'Bob Williams',   email:'bob@infradesk.io',    role:'IT Admin',    dept:'IT',         status:'active',    mfa:true,  lastLogin:'1 hr ago',    avatar:'BW' },
  { id:3, name:'Carol Smith',    email:'carol@infradesk.io',  role:'Technician',  dept:'Helpdesk',   status:'active',    mfa:false, lastLogin:'3 hrs ago',   avatar:'CS' },
  { id:4, name:'David Lee',      email:'david@infradesk.io',  role:'Viewer',      dept:'Finance',    status:'inactive',  mfa:false, lastLogin:'5 days ago',  avatar:'DL' },
  { id:5, name:'Eva Martinez',   email:'eva@infradesk.io',    role:'IT Admin',    dept:'IT',         status:'active',    mfa:true,  lastLogin:'30 min ago',  avatar:'EM' },
  { id:6, name:'Frank Chen',     email:'frank@infradesk.io',  role:'Technician',  dept:'Helpdesk',   status:'suspended', mfa:false, lastLogin:'12 days ago', avatar:'FC' },
  { id:7, name:'Grace Kim',      email:'grace@infradesk.io',  role:'Viewer',      dept:'Marketing',  status:'active',    mfa:false, lastLogin:'2 days ago',  avatar:'GK' },
  { id:8, name:'Henry Patel',    email:'henry@infradesk.io',  role:'Auditor',     dept:'Compliance', status:'active',    mfa:true,  lastLogin:'4 hrs ago',   avatar:'HP' },
];

const ROLES = [
  { id:1, name:'Super Admin', users:1, color:'#EF4444', perms:['all'] },
  { id:2, name:'IT Admin',    users:2, color:'#2563EB', perms:['devices','sessions','patches','agents','users'] },
  { id:3, name:'Technician',  users:2, color:'#10B981', perms:['devices','sessions','helpdesk'] },
  { id:4, name:'Auditor',     users:1, color:'#F59E0B', perms:['reports','audit_logs','security'] },
  { id:5, name:'Viewer',      users:2, color:'#94A3B8', perms:['devices_view','sessions_view'] },
];

const PERMISSIONS = {
  Devices:  ['devices_view','devices_manage','devices_delete'],
  Remote:   ['sessions_view','sessions_start','sessions_record'],
  Security: ['security_view','security_manage','audit_logs'],
  Helpdesk: ['tickets_view','tickets_manage','tickets_assign'],
  Patches:  ['patches_view','patches_deploy'],
  Reports:  ['reports_view','reports_export'],
  Users:    ['users_view','users_manage','roles_manage'],
  Settings: ['settings_view','settings_manage'],
};

const GROUPS = [
  { name:'IT Department',  members:4, dept:'Information Technology', color:'#2563EB' },
  { name:'Helpdesk Team',  members:3, dept:'Customer Support',       color:'#10B981' },
  { name:'Finance',        members:2, dept:'Finance & Accounting',   color:'#F59E0B' },
  { name:'Compliance',     members:1, dept:'Legal & Compliance',     color:'#8B5CF6' },
  { name:'Marketing',      members:1, dept:'Marketing',              color:'#06B6D4' },
];

// ── State ─────────────────────────────────────────────────────────────────────
let activeTab = 'users', filterStatus = 'all', filterRole = 'all', searchQ = '';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function initUsers() { renderUsersPage(); }

// ── Page Shell ────────────────────────────────────────────────────────────────
function renderUsersPage() {
  const main = document.querySelector('#page-content') || document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
      <div>
        <h1 style="font-size:var(--text-xl);font-weight:700;color:var(--color-text)">User Management</h1>
        <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-top:2px">Manage users, roles, permissions and access policies</p>
      </div>
      <button onclick="openCreateUserModal()" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);background:#2563EB;color:#fff;border:none;border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:600;cursor:pointer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        Invite User
      </button>
    </div>
    <div style="display:flex;border-bottom:1px solid var(--color-border,#243041);margin-bottom:var(--space-6)">
      ${['users','roles','permissions','groups'].map(t => `
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
    if (!el) return;
    el.style.borderBottom  = t === tab ? '2px solid #2563EB' : '2px solid transparent';
    el.style.color         = t === tab ? '#2563EB' : 'var(--color-text-muted)';
    el.style.fontWeight    = t === tab ? '600' : '400';
  });
  const c = document.getElementById('users-tab-content');
  if (!c) return;
  if      (tab === 'users')       c.innerHTML = renderUsersTab();
  else if (tab === 'roles')       c.innerHTML = renderRolesTab();
  else if (tab === 'permissions') c.innerHTML = renderPermissionsTab();
  else if (tab === 'groups')      c.innerHTML = renderGroupsTab();
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function renderUsersTab() {
  const statusBadge = s => {
    const map = { active:'#10B981', inactive:'#94A3B8', suspended:'#EF4444' };
    const c = map[s] || '#94A3B8';
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;background:${c}22;color:${c};font-size:11px;font-weight:600;text-transform:capitalize">
      <span style="width:6px;height:6px;border-radius:50%;background:${c}"></span>${s}</span>`;
  };
  const roleChip = r =>
    `<span style="padding:2px 8px;border-radius:99px;background:#2563EB22;color:#2563EB;font-size:11px;font-weight:600">${r}</span>`;
  const mfaIcon = m => m
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>`;

  const filtered = USERS.filter(u =>
    (filterStatus === 'all' || u.status === filterStatus) &&
    (filterRole   === 'all' || u.role   === filterRole) &&
    (!searchQ || u.name.toLowerCase().includes(searchQ.toLowerCase()) ||
                 u.email.toLowerCase().includes(searchQ.toLowerCase()))
  );

  return `
    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap;align-items:center">
      <div style="flex:1;min-width:200px;position:relative">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%)" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value="${searchQ}" oninput="userSearch(this.value)" placeholder="Search users…" style="width:100%;padding:var(--space-2) var(--space-2) var(--space-2) 34px;background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)"/>
      </div>
      <select onchange="filterUsers('status',this.value)" style="padding:var(--space-2) var(--space-3);background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)">
        <option value="all">All Status</option>
        <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
      </select>
      <select onchange="filterUsers('role',this.value)" style="padding:var(--space-2) var(--space-3);background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)">
        <option value="all">All Roles</option>
        ${ROLES.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
      </select>
      <span style="color:var(--color-text-muted);font-size:var(--text-xs)">${filtered.length} / ${USERS.length} users</span>
    </div>
    <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border,#243041)">
            ${['User','Role','Department','Status','MFA','Last Login','Actions'].map(h =>
              `<th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em">${h}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${filtered.map((u, i) => `
            <tr style="border-bottom:${i < filtered.length - 1 ? '1px solid var(--color-border,#243041)' : 'none'};transition:background .15s"
                onmouseover="this.style.background='rgba(37,99,235,.05)'"
                onmouseout="this.style.background='transparent'">
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
                  <button onclick="toggleUserStatus(${u.id})" style="padding:4px 8px;border:1px solid var(--color-border,#243041);border-radius:var(--radius-sm);background:none;color:var(--color-text-muted);font-size:11px;cursor:pointer">${u.status === 'active' ? 'Suspend' : 'Activate'}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────
function renderRolesTab() {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)">
      ${ROLES.map(r => `
        <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);padding:var(--space-5);transition:border-color .2s;cursor:pointer"
             onmouseover="this.style.borderColor='${r.color}'" onmouseout="this.style.borderColor='var(--color-border,#243041)'">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <div style="width:10px;height:10px;border-radius:50%;background:${r.color}"></div>
              <span style="font-weight:700;color:var(--color-text);font-size:var(--text-sm)">${r.name}</span>
            </div>
            <button onclick="editRole(${r.id})" style="padding:4px 10px;border:1px solid var(--color-border,#243041);border-radius:var(--radius-sm);background:none;color:var(--color-text-muted);font-size:11px;cursor:pointer">Edit</button>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-3)">${r.users} user${r.users !== 1 ? 's' : ''} assigned</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${r.perms.slice(0, 4).map(p => `<span style="padding:2px 6px;border-radius:4px;background:rgba(37,99,235,.15);color:#60A5FA;font-size:10px">${p}</span>`).join('')}
            ${r.perms.length > 4 ? `<span style="padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.06);color:var(--color-text-muted);font-size:10px">+${r.perms.length - 4}</span>` : ''}
          </div>
        </div>
      `).join('')}
      <div onclick="openCreateRoleModal()" style="background:transparent;border:2px dashed var(--color-border,#243041);border-radius:var(--radius-lg);padding:var(--space-5);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:var(--space-2);cursor:pointer;transition:border-color .2s"
           onmouseover="this.style.borderColor='#2563EB'" onmouseout="this.style.borderColor='var(--color-border,#243041)'">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        <span style="font-size:var(--text-sm);color:#2563EB;font-weight:600">Create Role</span>
      </div>
    </div>`;
}

// ── Permissions Tab ───────────────────────────────────────────────────────────
function renderPermissionsTab() {
  return `
    <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);overflow:hidden">
      <div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--color-border,#243041);font-weight:700;color:var(--color-text);font-size:var(--text-sm)">
        Role × Permission Matrix
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:700px">
          <thead>
            <tr style="border-bottom:1px solid var(--color-border,#243041)">
              <th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);min-width:160px">Permission</th>
              ${ROLES.map(r => `<th style="text-align:center;padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:600;color:${r.color}">${r.name}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${Object.entries(PERMISSIONS).map(([group, perms]) => `
              <tr style="background:rgba(37,99,235,.04)">
                <td colspan="${ROLES.length + 1}" style="padding:var(--space-2) var(--space-4);font-size:11px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em">${group}</td>
              </tr>
              ${perms.map(perm => `
                <tr style="border-bottom:1px solid var(--color-border,#243041)">
                  <td style="padding:var(--space-2) var(--space-4) var(--space-2) var(--space-6);font-size:var(--text-xs);color:var(--color-text)">${perm}</td>
                  ${ROLES.map(r => {
                    const has = r.perms.includes('all') ||
                                r.perms.some(p => perm.startsWith(p.split('_')[0]) || perm === p);
                    return `<td style="text-align:center;padding:var(--space-2)">
                      <input type="checkbox" ${has ? 'checked' : ''} style="accent-color:#2563EB;width:14px;height:14px;cursor:pointer"
                             onchange="togglePerm(${r.id},'${perm}',this.checked)"/>
                    </td>`;
                  }).join('')}
                </tr>
              `).join('')}
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
function renderGroupsTab() {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--space-4)">
      ${GROUPS.map(g => `
        <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-lg);padding:var(--space-5)">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
            <div style="width:38px;height:38px;border-radius:var(--radius-md);background:${g.color}22;display:flex;align-items:center;justify-content:center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${g.color}" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style="font-weight:700;color:var(--color-text);font-size:var(--text-sm)">${g.name}</div>
              <div style="font-size:11px;color:var(--color-text-muted)">${g.dept}</div>
            </div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${g.members} member${g.members !== 1 ? 's' : ''}</div>
        </div>
      `).join('')}
    </div>`;
}

// ── Interaction Handlers ──────────────────────────────────────────────────────
function userSearch(val)         { searchQ = val; document.getElementById('users-tab-content').innerHTML = renderUsersTab(); }
function filterUsers(type, val)  { if (type === 'status') filterStatus = val; else filterRole = val; document.getElementById('users-tab-content').innerHTML = renderUsersTab(); }
function editUser(id)            { openUserModal(USERS.find(u => u.id === id)); }
function editRole(id)            { openRoleModal(ROLES.find(r => r.id === id)); }
function openCreateUserModal()   { openUserModal(null); }
function openCreateRoleModal()   { openRoleModal(null); }
function togglePerm(rId, p, v)   { showUsersToast(`Permission "${p}" ${v ? 'granted' : 'revoked'}`); }

function toggleUserStatus(id) {
  const u = USERS.find(x => x.id === id);
  if (!u) return;
  u.status = u.status === 'active' ? 'suspended' : 'active';
  document.getElementById('users-tab-content').innerHTML = renderUsersTab();
  showUsersToast(`${u.name} is now ${u.status}`);
}

// ── Modals ────────────────────────────────────────────────────────────────────
function openUserModal(user) {
  const overlay = document.getElementById('users-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-xl);padding:var(--space-6);width:440px;max-width:95vw;box-shadow:0 24px 60px rgba(0,0,0,.55)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
        <h3 style="font-size:var(--text-lg);font-weight:700;color:var(--color-text)">${user ? 'Edit User' : 'Invite User'}</h3>
        <button onclick="closeUserModal()" style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:18px;line-height:1">✕</button>
      </div>
      ${[['Full Name', user ? user.name : ''], ['Email Address', user ? user.email : '']].map(([label, val]) => `
        <div style="margin-bottom:var(--space-4)">
          <label style="display:block;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-1)">${label}</label>
          <input value="${val}" placeholder="${label}" style="width:100%;padding:var(--space-2) var(--space-3);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)"/>
        </div>
      `).join('')}
      <div style="margin-bottom:var(--space-4)">
        <label style="display:block;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-1)">Role</label>
        <select style="width:100%;padding:var(--space-2) var(--space-3);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)">
          ${ROLES.map(r => `<option ${user && user.role === r.name ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5)">
        <button onclick="closeUserModal()" style="flex:1;padding:var(--space-2);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);background:none;color:var(--color-text-muted);font-size:var(--text-sm);cursor:pointer">Cancel</button>
        <button onclick="saveUser()" style="flex:2;padding:var(--space-2);background:#2563EB;border:none;border-radius:var(--radius-md);color:#fff;font-size:var(--text-sm);font-weight:600;cursor:pointer">${user ? 'Save Changes' : 'Send Invite'}</button>
      </div>
    </div>`;
}

function openRoleModal(role) {
  const overlay = document.getElementById('users-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="background:var(--color-surface,#1A2332);border:1px solid var(--color-border,#243041);border-radius:var(--radius-xl);padding:var(--space-6);width:400px;max-width:95vw;box-shadow:0 24px 60px rgba(0,0,0,.55)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
        <h3 style="font-size:var(--text-lg);font-weight:700;color:var(--color-text)">${role ? 'Edit Role' : 'Create Role'}</h3>
        <button onclick="closeUserModal()" style="background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:18px;line-height:1">✕</button>
      </div>
      <div style="margin-bottom:var(--space-4)">
        <label style="display:block;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:var(--space-1)">Role Name</label>
        <input value="${role ? role.name : ''}" placeholder="e.g. Network Engineer" style="width:100%;padding:var(--space-2) var(--space-3);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)"/>
      </div>
      <div style="margin-bottom:var(--space-4)">
        <label style="display:block;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:var(--space-1)">Description</label>
        <input placeholder="Brief role description" style="width:100%;padding:var(--space-2) var(--space-3);background:var(--color-bg,#0B1220);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm)"/>
      </div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5)">
        <button onclick="closeUserModal()" style="flex:1;padding:var(--space-2);border:1px solid var(--color-border,#243041);border-radius:var(--radius-md);background:none;color:var(--color-text-muted);font-size:var(--text-sm);cursor:pointer">Cancel</button>
        <button onclick="saveRole()" style="flex:2;padding:var(--space-2);background:#2563EB;border:none;border-radius:var(--radius-md);color:#fff;font-size:var(--text-sm);font-weight:600;cursor:pointer">${role ? 'Save' : 'Create Role'}</button>
      </div>
    </div>`;
}

function closeUserModal() {
  const o = document.getElementById('users-modal-overlay');
  if (o) o.style.display = 'none';
}
function saveUser() { closeUserModal(); showUsersToast('User saved successfully'); }
function saveRole() { closeUserModal(); showUsersToast('Role saved successfully'); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showUsersToast(msg) {
  let t = document.getElementById('infradesk-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'infradesk-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10B981;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:opacity .4s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2800);
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.initUsers          = initUsers;
window.switchUsersTab     = switchUsersTab;
window.userSearch         = userSearch;
window.filterUsers        = filterUsers;
window.toggleUserStatus   = toggleUserStatus;
window.editUser           = editUser;
window.editRole           = editRole;
window.openCreateUserModal= openCreateUserModal;
window.openCreateRoleModal= openCreateRoleModal;
window.closeUserModal     = closeUserModal;
window.saveUser           = saveUser;
window.saveRole           = saveRole;
window.togglePerm         = togglePerm;
