// src/modules/rbac.js
// ROLES, ROLE_PERMISSIONS, hasPermission, requirePermission,
// updateNavigationForRole, updateActionButtonsForRole, switchRole, applyRoleBasedUI

// RBAC Role Definitions
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PLANNER: 'planner',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer'
};

// Role Permissions Matrix
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    name: 'Super Admin',
    description: 'Volledige platform toegang',
    permissions: ['*'],
    color: 'rgba(139, 92, 246, 0.8)'
  },
  [ROLES.ADMIN]: {
    name: 'Administrator',
    description: 'Volledige organisatie toegang',
    permissions: [
      'view_dashboard', 'view_planner', 'view_installations', 'view_settings',
      'edit_planner', 'edit_installations', 'edit_technicians', 'edit_settings',
      'delete_installations', 'delete_technicians',
      'view_maintenance', 'edit_maintenance', 'plan_maintenance',
      'view_reports', 'export_data', 'manage_users'
    ],
    color: 'rgba(245, 101, 101, 0.8)'
  },
  [ROLES.PLANNER]: {
    name: 'Planner',
    description: 'Planning en scheduling toegang',
    permissions: [
      'view_dashboard', 'view_planner', 'view_installations',
      'edit_planner', 'edit_installations', 'view_technicians',
      'view_maintenance', 'edit_maintenance', 'plan_maintenance',
      'view_reports', 'export_data'
    ],
    color: 'rgba(59, 130, 246, 0.8)'
  },
  [ROLES.TECHNICIAN]: {
    name: 'Monteur',
    description: 'Veldwerk en werkorders',
    permissions: [
      'view_dashboard', 'view_planner', 'view_installations',
      'view_maintenance', 'view_reports'
    ],
    color: 'rgba(16, 185, 129, 0.8)'
  },
  [ROLES.VIEWER]: {
    name: 'Viewer',
    description: 'Alleen bekijken',
    permissions: [
      'view_dashboard', 'view_planner', 'view_installations',
      'view_maintenance', 'view_reports'
    ],
    color: 'rgba(156, 163, 175, 0.8)'
  }
};

function hasPermission(permission) {
  return Auth.hasPermission(permission);
}

function requirePermission(permission, fallbackAction = null) {
  if (!hasPermission(permission)) {
    toast(`\u274c Geen toegang: ${ROLE_PERMISSIONS[permission]?.name || permission} vereist`);
    if (fallbackAction) fallbackAction();
    return false;
  }
  return true;
}

function getCurrentUserRole() {
  if (!currentAuth) return ROLES.VIEWER;
  const roleMap = {
    'superadmin': ROLES.SUPER_ADMIN,
    'admin': ROLES.ADMIN,
    'planner': ROLES.PLANNER,
    'technician': ROLES.TECHNICIAN,
    'viewer': ROLES.VIEWER
  };
  return roleMap[currentAuth.role] || ROLES.VIEWER;
}

function getCurrentUserRoleInfo() {
  const role = getCurrentUserRole();
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
}

function updateUIForRole() {
  const role = getCurrentUserRole();
  const roleInfo = getCurrentUserRoleInfo();
  const roleIndicator = document.getElementById('currentUserRole');
  if (roleIndicator) {
    roleIndicator.innerHTML = `
      <span class="badge" style="background: ${roleInfo.color};">${roleInfo.name}</span>
      <small style="color: rgb(var(--txt-2));">${roleInfo.description}</small>
    `;
  }
  updateRoleDisplay();
  updateNavigationForRole();
  updateActionButtonsForRole();
  updatePageContentForRole();
}

function updateRoleDisplay() {
  const roleInfo = getCurrentUserRoleInfo();
  const roleSwitcher = document.getElementById('roleSwitcher');
  if (roleSwitcher) {
    const roleSelect = roleSwitcher.querySelector('select');
    if (roleSelect) roleSelect.value = currentAuth?.role || 'viewer';
  }
  document.querySelectorAll('[data-role-display]').forEach(element => {
    element.textContent = roleInfo.name;
    element.style.color = roleInfo.color;
  });
  document.body.className = document.body.className.replace(/role-\w+/g, '');
  document.body.classList.add(`role-${currentAuth?.role || 'viewer'}`);
}

function updateNavigationForRole() {
  const role = getCurrentUserRole();
  const navRules = {
    [ROLES.SUPER_ADMIN]: ['planner', 'dashboard', 'installations', 'settings', 'superadmin'],
    [ROLES.ADMIN]: ['planner', 'dashboard', 'installations', 'settings'],
    [ROLES.PLANNER]: ['planner', 'dashboard', 'installations'],
    [ROLES.TECHNICIAN]: ['dashboard', 'planner'],
    [ROLES.VIEWER]: ['dashboard', 'planner']
  };
  const allowedRoutes = navRules[role] || navRules[ROLES.VIEWER];
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const route = btn.dataset.route;
    if (route && !allowedRoutes.includes(route)) btn.style.display = 'none';
    else btn.style.display = 'block';
  });
  const superAdminBtn = document.querySelector('.nav-btn[data-route="superadmin"]');
  if (superAdminBtn) {
    if (role === ROLES.SUPER_ADMIN) { superAdminBtn.style.display = 'block'; superAdminBtn.innerHTML = '\ud83d\udd27 Super Admin'; }
    else superAdminBtn.style.display = 'none';
  }
  const accountDropdown = document.getElementById('accountDropdown');
  if (accountDropdown) {
    const superAdminOption = accountDropdown.querySelector('[data-action="superadmin"]');
    if (superAdminOption) superAdminOption.style.display = role === ROLES.SUPER_ADMIN ? 'block' : 'none';
  }
}

function updateActionButtonsForRole() {
  if (!hasPermission('edit_planner')) hideElements(['#addTicketBtn', '#openProposalsBtn', '#approveBtn', '#rejectBtn']);
  if (!hasPermission('edit_installations')) hideElements(['#addInstallationBtn', '.installation-edit-btn', '.installation-delete-btn']);
  if (!hasPermission('edit_technicians')) hideElements(['#addTechBtn', '.tech-edit-btn', '.tech-delete-btn']);
  if (!hasPermission('plan_maintenance')) hideElements(['#generateMaintenanceBtn', '#planAllMaintenanceBtn', '.maintenance-plan-btn']);
  if (!hasPermission('edit_settings')) hideElements(['#saveSettings', '#exportDataBtn']);
}

function updatePageContentForRole() {
  const role = getCurrentUserRole();
  if (role === ROLES.TECHNICIAN) showTechnicianDashboard();
  else if (role === ROLES.VIEWER) showReadOnlyIndicators();
}

function hideElements(selectors) {
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => { el.style.display = 'none'; el.disabled = true; });
  });
}

function showTechnicianDashboard() {
  const dashboard = document.getElementById('route-dashboard');
  if (dashboard && !document.getElementById('technicianTasks')) {
    const technicianSection = document.createElement('div');
    technicianSection.id = 'technicianTasks';
    technicianSection.innerHTML = `
      <div class="card">
        <h3>\ud83d\udee0\ufe0f Mijn Taken</h3>
        <div id="myTasksList"><p>Laden van taken...</p></div>
      </div>
    `;
    dashboard.appendChild(technicianSection);
    loadTechnicianTasks();
  }
}

function showReadOnlyIndicators() {
  document.querySelectorAll('form').forEach(form => {
    if (!form.querySelector('.readonly-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'readonly-indicator';
      indicator.innerHTML = '<small style="color: rgb(var(--warn));">\ud83d\udcd6 Alleen bekijken</small>';
      form.insertBefore(indicator, form.firstChild);
    }
  });
}

function getCurrentUserName() {
  if (!currentAuth) return 'Onbekend';
  if (currentAuth.role === 'superadmin') return 'Super Admin';
  return currentAuth.user || 'Onbekend';
}

async function switchUserRole(newRole) {
  if (!hasPermission('manage_users')) { toast('\u274c Geen toegang tot rol wijziging'); return; }
  if (!ROLE_PERMISSIONS[newRole]) { toast('\u274c Ongeldige rol'); return; }
  if (currentAuth) {
    const newAuth = { ...currentAuth, role: newRole };
    if (Auth.set(newAuth)) {
      currentAuth = newAuth;
      updateUIForRole();
      toast(`\u2705 Rol gewijzigd naar ${ROLE_PERMISSIONS[newRole].name}`);
      const currentRoute = document.querySelector('.route.active')?.id?.replace('route-', '');
      if (currentRoute) await go(currentRoute);
    } else { toast('\u274c Fout bij het wijzigen van rol'); }
  }
}

function roleSafeEditPlanner(action, ...args) { if (!requirePermission('edit_planner')) return; return action(...args); }
function roleSafeEditInstallations(action, ...args) { if (!requirePermission('edit_installations')) return; return action(...args); }
function roleSafeEditTechnicians(action, ...args) { if (!requirePermission('edit_technicians')) return; return action(...args); }
function roleSafePlanMaintenance(action, ...args) { if (!requirePermission('plan_maintenance')) return; return action(...args); }
function roleSafeEditSettings(action, ...args) { if (!requirePermission('edit_settings')) return; return action(...args); }

function initializeRBAC() {
  console.log("Initializing RBAC system...");
  updateUIForRole();
  if (hasPermission('manage_users')) addRoleSwitcher();
  console.log(`RBAC initialized for role: ${currentAuth?.role || 'viewer'}`);
}

function addRoleSwitcher() {
  const header = document.querySelector('header') || document.querySelector('.header');
  if (header && !document.getElementById('roleSwitcher')) {
    const roleSwitcher = document.createElement('div');
    roleSwitcher.id = 'roleSwitcher';
    roleSwitcher.style.cssText = 'position: absolute; top: 16px; right: 16px; z-index: 1000;';
    const currentRole = getCurrentUserRole();
    const roleInfo = getCurrentUserRoleInfo();
    roleSwitcher.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge" style="background: ${roleInfo.color};">${roleInfo.name}</span>
        <select id="roleSelect" style="padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(var(--border), 0.3); background: rgb(var(--bg-1)); color: rgb(var(--txt-1));">
          ${Object.entries(ROLE_PERMISSIONS).map(([role, info]) =>
            `<option value="${role}" ${role === currentRole ? 'selected' : ''}>${info.name}</option>`
          ).join('')}
        </select>
      </div>
    `;
    header.appendChild(roleSwitcher);
    document.getElementById('roleSelect').addEventListener('change', (e) => switchUserRole(e.target.value));
  }
}

function updateRoleIndicator() {
  const roleIndicator = document.getElementById('currentUserRole');
  if (!roleIndicator) return;
  const role = currentAuth?.role || 'viewer';
  const roleInfo = ROLE_PERMISSIONS[role];
  if (roleInfo) {
    roleIndicator.innerHTML = `<span class="role-indicator ${role}" style="background: ${roleInfo.color}">\ud83d\udc64 ${roleInfo.name}</span>`;
  } else {
    roleIndicator.innerHTML = `<span class="role-indicator viewer">\ud83d\udc64 Onbekende rol</span>`;
  }
}

function setupRoleSwitcher() {
  const roleSwitcher = document.getElementById('roleSwitcher');
  const roleSelect = document.getElementById('roleSelect');
  if (!roleSwitcher || !roleSelect) return;
  if (hasPermission('manage_users')) {
    roleSwitcher.classList.add('visible');
    roleSelect.innerHTML = '<option value="">Rol wisselen...</option>';
    Object.entries(ROLE_PERMISSIONS).forEach(([roleKey, roleInfo]) => {
      if (roleKey !== ROLES.SUPER_ADMIN) {
        const option = document.createElement('option');
        option.value = roleKey;
        option.textContent = `${roleInfo.name} - ${roleInfo.description}`;
        roleSelect.appendChild(option);
      }
    });
  } else { roleSwitcher.classList.remove('visible'); }
}

function switchRole(newRole) {
  if (!newRole || !hasPermission('manage_users')) return;
  const roleInfo = ROLE_PERMISSIONS[newRole];
  if (!roleInfo) return;
  if (currentAuth) {
    const newAuth = { ...currentAuth, role: newRole };
    if (Auth.set(newAuth)) {
      currentAuth = newAuth;
      updateRoleIndicator();
      applyRoleBasedUI();
      const roleSelect = document.getElementById('roleSelect');
      if (roleSelect) roleSelect.value = '';
      toast(`\u2705 Rol gewisseld naar: ${roleInfo.name}`);
      if (window.planwiseLogger) {
        window.planwiseLogger.info('User role switched', { user: currentAuth.user, oldRole: currentAuth.role, newRole, timestamp: new Date().toISOString() });
      }
    } else { toast('\u274c Fout bij het wisselen van rol'); }
  }
}

function applyRoleBasedUI() {
  const role = currentAuth?.role || 'viewer';
  document.body.classList.toggle('viewer-mode', role === 'viewer');
  updateNavigationPermissions();
  updateActionButtonPermissions();
  updateFormPermissions();
  updateRouteAccess();
}

function updateNavigationPermissions() {
  document.querySelectorAll('.nav-btn[data-requires-permission]').forEach(btn => {
    const permission = btn.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    btn.classList.toggle('no-permission', !hasAccess);
    if (!hasAccess) { btn.setAttribute('data-tooltip', `Vereist: ${permission}`); btn.classList.add('permission-tooltip'); }
    else { btn.removeAttribute('data-tooltip'); btn.classList.remove('permission-tooltip'); }
  });
}

function updateActionButtonPermissions() {
  document.querySelectorAll('.btn[data-requires-permission]').forEach(btn => {
    const permission = btn.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    btn.classList.toggle('no-permission', !hasAccess);
    btn.disabled = !hasAccess;
    if (!hasAccess) { btn.setAttribute('data-tooltip', `Vereist: ${permission}`); btn.classList.add('permission-tooltip'); }
    else { btn.removeAttribute('data-tooltip'); btn.classList.remove('permission-tooltip'); }
  });
}

function updateFormPermissions() {
  document.querySelectorAll('input[data-requires-permission], select[data-requires-permission], textarea[data-requires-permission]').forEach(input => {
    const permission = input.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    input.disabled = !hasAccess;
    input.classList.toggle('disabled-by-permission', !hasAccess);
  });
}

function updateRouteAccess() {
  document.querySelectorAll('.route[data-requires-permission]').forEach(route => {
    const permission = route.getAttribute('data-requires-permission');
    route.classList.toggle('hidden-by-permission', !hasPermission(permission));
  });
}

function roleSafeFunction(permission, originalFunction, fallbackFunction = null) {
  return function(...args) {
    if (requirePermission(permission, fallbackFunction)) return originalFunction.apply(this, args);
    return null;
  };
}
