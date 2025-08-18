/* PlanWise – v3.3
   Auth v2: Centralized authentication state management
   Features: Planner, Dashboard (FullCalendar), Persistentie, Onderhoudsvoorstellen
*/

// Global Error Handling - Ensure UI remains functional after errors
(function() {
  // Toast notification system for errors
  function showErrorToast(message, duration = 5000) {
    // Remove existing error toasts
    const existingToasts = document.querySelectorAll('.error-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles if not already present
    if (!document.querySelector('#error-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'error-toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    });
  }
  
  // Global error handler
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    
    // Don't show toast for expected errors (like network failures)
    if (message && (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('Script error')
    )) {
      return false; // Don't prevent default handling
    }
    
    // Show user-friendly error message
    const userMessage = 'Er is een fout opgetreden. Probeer de pagina te verversen of neem contact op met de beheerder.';
    showErrorToast(userMessage);
    
    // Ensure login modal can still be opened
    if (typeof showLoginModal === 'function') {
      // Add a small delay to ensure the error doesn't interfere
      setTimeout(() => {
        try {
          // Check if we can still access the login modal
          const loginModal = document.getElementById('loginModal');
          if (loginModal && typeof openModal === 'function') {
            console.log('Login modal is still accessible after error');
          }
        } catch (e) {
          console.warn('Could not verify login modal accessibility:', e);
        }
      }, 100);
    }
    
    return false; // Don't prevent default error handling
  };
  
  // Unhandled promise rejection handler
  window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show toast for expected rejections
    if (event.reason && (
      event.reason.message && (
        event.reason.message.includes('Failed to fetch') ||
        event.reason.message.includes('NetworkError') ||
        event.reason.message.includes('User cancelled')
      )
    )) {
      return;
    }
    
    // Show user-friendly error message
    const userMessage = 'Er is een onverwachte fout opgetreden. Probeer de pagina te verversen.';
    showErrorToast(userMessage);
    
    // Prevent the default browser behavior (unhandledrejection event)
    event.preventDefault();
  };
  
  // Add error boundary for critical functions
  window.safeExecute = function(fn, fallback, context = 'unknown') {
    try {
      return fn();
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      if (fallback) {
        try {
          return fallback(error);
        } catch (fallbackError) {
          console.error(`Fallback also failed in ${context}:`, fallbackError);
          showErrorToast('Kritieke fout opgetreden. Herlaad de pagina.');
        }
      }
      return null;
    }
  };
  
  console.log('Global error handling initialized');
})();

/* -------------------- GLOBAL STATE -------------------- */
let currentAuth = null;
let currentRoute = "dashboard";
let state = {};

// Super Admin credentials (in production, this should be env variables)
const SUPER_ADMIN = {
  username: 'superadmin',
  password: 'planwise2025!',
  company: 'PLANWISE_PLATFORM'
};

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
    permissions: ['*'], // All permissions
    color: 'rgba(139, 92, 246, 0.8)' // Purple
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
    color: 'rgba(245, 101, 101, 0.8)' // Red
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
    color: 'rgba(59, 130, 246, 0.8)' // Blue
  },
  [ROLES.TECHNICIAN]: {
    name: 'Monteur',
    description: 'Veldwerk en werkorders',
    permissions: [
      'view_dashboard', 'view_planner', 'view_installations',
      'view_maintenance', 'view_reports'
    ],
    color: 'rgba(16, 185, 129, 0.8)' // Green
  },
  [ROLES.VIEWER]: {
    name: 'Viewer',
    description: 'Alleen bekijken',
    permissions: [
      'view_dashboard', 'view_planner', 'view_installations',
      'view_maintenance', 'view_reports'
    ],
    color: 'rgba(156, 163, 175, 0.8)' // Gray
  }
};

function getStorageKey() {
  return currentAuth?.orgSlug ? `planwise_${currentAuth.orgSlug}_v4` : "planwise_demo_v4";
}

// RBAC Permission Checking
function hasPermission(permission) {
  return Auth.hasPermission(permission);
}

function requirePermission(permission, fallbackAction = null) {
  if (!hasPermission(permission)) {
    toast(`❌ Geen toegang: ${ROLE_PERMISSIONS[permission]?.name || permission} vereist`);
    if (fallbackAction) fallbackAction();
    return false;
  }
  return true;
}

function getCurrentUserRole() {
  if (!currentAuth) return ROLES.VIEWER;
  if (currentAuth.role === 'superadmin') return ROLES.SUPER_ADMIN;
  return currentAuth.role || ROLES.VIEWER;
}

function getCurrentUserRoleInfo() {
  const role = getCurrentUserRole();
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
}

function updateUIForRole() {
  const role = getCurrentUserRole();
  const roleInfo = getCurrentUserRoleInfo();
  
  // Update role indicator in UI
  const roleIndicator = document.getElementById('currentUserRole');
  if (roleIndicator) {
    roleIndicator.innerHTML = `
      <span class="badge" style="background: ${roleInfo.color};">${roleInfo.name}</span>
      <small style="color: rgb(var(--txt-2));">${roleInfo.description}</small>
    `;
  }
  
  // Hide/show navigation based on permissions
  updateNavigationForRole();
  
  // Hide/show action buttons based on permissions
  updateActionButtonsForRole();
  
  // Update page content based on role
  updatePageContentForRole();
}

function updateNavigationForRole() {
  const role = getCurrentUserRole();
  
  // Navigation visibility rules
  const navRules = {
    [ROLES.SUPER_ADMIN]: ['planner', 'dashboard', 'installations', 'settings', 'superadmin'],
    [ROLES.ADMIN]: ['planner', 'dashboard', 'installations', 'settings'],
    [ROLES.PLANNER]: ['planner', 'dashboard', 'installations'],
    [ROLES.TECHNICIAN]: ['dashboard', 'planner'],
    [ROLES.VIEWER]: ['dashboard', 'planner']
  };
  
  const allowedRoutes = navRules[role] || navRules[ROLES.VIEWER];
  
  // Hide/show navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const route = btn.dataset.route;
    if (route && !allowedRoutes.includes(route)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'block';
    }
  });
}

function updateActionButtonsForRole() {
  // Planner actions
  if (!hasPermission('edit_planner')) {
    hideElements(['#addTicketBtn', '#openProposalsBtn', '#approveBtn', '#rejectBtn']);
  }
  
  // Installation actions
  if (!hasPermission('edit_installations')) {
    hideElements(['#addInstallationBtn', '.installation-edit-btn', '.installation-delete-btn']);
  }
  
  // Technician actions
  if (!hasPermission('edit_technicians')) {
    hideElements(['#addTechBtn', '.tech-edit-btn', '.tech-delete-btn']);
  }
  
  // Maintenance actions
  if (!hasPermission('plan_maintenance')) {
    hideElements(['#generateMaintenanceBtn', '#planAllMaintenanceBtn', '.maintenance-plan-btn']);
  }
  
  // Settings actions
  if (!hasPermission('edit_settings')) {
    hideElements(['#saveSettings', '#exportDataBtn']);
  }
}

function updatePageContentForRole() {
  const role = getCurrentUserRole();
  
  // Add role-specific content or restrictions
  if (role === ROLES.TECHNICIAN) {
    // Show technician-specific dashboard
    showTechnicianDashboard();
  } else if (role === ROLES.VIEWER) {
    // Show read-only indicators
    showReadOnlyIndicators();
  }
}

function hideElements(selectors) {
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = 'none';
      el.disabled = true;
    });
  });
}

function showTechnicianDashboard() {
  // Add technician-specific dashboard elements
  const dashboard = document.getElementById('route-dashboard');
  if (dashboard && !document.getElementById('technicianTasks')) {
    const technicianSection = document.createElement('div');
    technicianSection.id = 'technicianTasks';
    technicianSection.innerHTML = `
      <div class="card">
        <h3>🛠️ Mijn Taken</h3>
        <div id="myTasksList">
          <p>Laden van taken...</p>
        </div>
      </div>
    `;
    dashboard.appendChild(technicianSection);
    loadTechnicianTasks();
  }
}

function showReadOnlyIndicators() {
  // Add read-only indicators to forms and tables
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    if (!form.querySelector('.readonly-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'readonly-indicator';
      indicator.innerHTML = '<small style="color: rgb(var(--warn));">📖 Alleen bekijken</small>';
      form.insertBefore(indicator, form.firstChild);
    }
  });
}

function loadTechnicianTasks() {
  const tasksList = document.getElementById('myTasksList');
  if (!tasksList) return;
  
  const today = new Date();
  const myEvents = state.calendarEvents.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === today.toDateString() &&
           event.extendedProps?.technician === getCurrentUserName();
  });
  
  if (myEvents.length === 0) {
    tasksList.innerHTML = '<p>Geen taken voor vandaag</p>';
    return;
  }
  
  const tasksHTML = myEvents.map(event => `
    <div class="task-item" style="padding: 12px; border: 1px solid rgba(var(--border), 0.3); border-radius: 8px; margin-bottom: 8px;">
      <h4 style="margin: 0 0 8px 0;">${event.title}</h4>
      <p style="margin: 0; color: rgb(var(--txt-2)); font-size: 0.9em;">
        ${new Date(event.start).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})} - 
        ${new Date(event.end).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}
      </p>
      <p style="margin: 4px 0 0 0; color: rgb(var(--txt-2)); font-size: 0.9em;">
        📍 ${event.extendedProps?.address || 'Locatie onbekend'}
      </p>
    </div>
  `).join('');
  
  tasksList.innerHTML = tasksHTML;
}

function getCurrentUserName() {
  if (!currentAuth) return 'Onbekend';
  if (currentAuth.role === 'superadmin') return 'Super Admin';
  return currentAuth.user || 'Onbekend';
}

// Enhanced role switching functionality
function switchUserRole(newRole) {
  if (!hasPermission('manage_users')) {
    toast('❌ Geen toegang tot rol wijziging');
    return;
  }
  
  if (!ROLE_PERMISSIONS[newRole]) {
    toast('❌ Ongeldige rol');
    return;
  }
  
  // Update auth state with new role
  if (currentAuth) {
    const newAuth = { ...currentAuth, role: newRole };
    if (Auth.set(newAuth)) {
      currentAuth = newAuth;
      updateUIForRole();
      toast(`✅ Rol gewijzigd naar ${ROLE_PERMISSIONS[newRole].name}`);
      
      // Refresh current page
      const currentRoute = document.querySelector('.route.active')?.id?.replace('route-', '');
      if (currentRoute) {
        go(currentRoute);
      }
    } else {
      toast('❌ Fout bij het wijzigen van rol');
    }
  }
}

// Role-based function wrappers
function roleSafeEditPlanner(action, ...args) {
  if (!requirePermission('edit_planner')) return;
  return action(...args);
}

function roleSafeEditInstallations(action, ...args) {
  if (!requirePermission('edit_installations')) return;
  return action(...args);
}

function roleSafeEditTechnicians(action, ...args) {
  if (!requirePermission('edit_technicians')) return;
  return action(...args);
}

function roleSafePlanMaintenance(action, ...args) {
  if (!requirePermission('plan_maintenance')) return;
  return action(...args);
}

function roleSafeEditSettings(action, ...args) {
  if (!requirePermission('edit_settings')) return;
  return action(...args);
}

// Initialize RBAC system
function initializeRBAC() {
  console.log("Initializing RBAC system...");
  
  // Update UI for current role
  updateUIForRole();
  
  // Add role switcher to UI if user has permission
  if (hasPermission('manage_users')) {
    addRoleSwitcher();
  }
  
  console.log(`RBAC initialized for role: ${currentAuth?.role || 'viewer'}`);
}

function addRoleSwitcher() {
  // Add role switcher to the header or settings area
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
    
    // Add event listener for role switching
    document.getElementById('roleSelect').addEventListener('change', (e) => {
      switchUserRole(e.target.value);
    });
  }
}

// Enhanced RBAC UI Management Functions
function updateRoleIndicator() {
  const roleIndicator = document.getElementById('currentUserRole');
  if (!roleIndicator) return;
  
  const role = currentAuth?.role || 'viewer';
  const roleInfo = ROLE_PERMISSIONS[role];
  
  if (roleInfo) {
    roleIndicator.innerHTML = `
      <span class="role-indicator ${role}" style="background: ${roleInfo.color}">
        👤 ${roleInfo.name}
      </span>
    `;
  } else {
    roleIndicator.innerHTML = `
      <span class="role-indicator viewer">
        👤 Onbekende rol
      </span>
    `;
  }
}

function setupRoleSwitcher() {
  const roleSwitcher = document.getElementById('roleSwitcher');
  const roleSelect = document.getElementById('roleSelect');
  
  if (!roleSwitcher || !roleSelect) return;
  
  // Only show role switcher for users with manage_users permission
  if (hasPermission('manage_users')) {
    roleSwitcher.classList.add('visible');
    
    // Populate role options
    roleSelect.innerHTML = '<option value="">Rol wisselen...</option>';
    Object.entries(ROLE_PERMISSIONS).forEach(([roleKey, roleInfo]) => {
      if (roleKey !== ROLES.SUPER_ADMIN) { // Don't allow switching to super admin
        const option = document.createElement('option');
        option.value = roleKey;
        option.textContent = `${roleInfo.name} - ${roleInfo.description}`;
        roleSelect.appendChild(option);
      }
    });
  } else {
    roleSwitcher.classList.remove('visible');
  }
}

function switchRole(newRole) {
  if (!newRole || !hasPermission('manage_users')) return;
  
  const roleInfo = ROLE_PERMISSIONS[newRole];
  if (!roleInfo) return;
  
  // Update auth state with new role
  if (currentAuth) {
    const newAuth = { ...currentAuth, role: newRole };
    if (Auth.set(newAuth)) {
      currentAuth = newAuth;
      
      // Update UI
      updateRoleIndicator();
      applyRoleBasedUI();
      
      // Reset role switcher
      const roleSelect = document.getElementById('roleSelect');
      if (roleSelect) roleSelect.value = '';
      
      toast(`✅ Rol gewisseld naar: ${roleInfo.name}`);
      
      // Log role switch
      if (window.planwiseLogger) {
        window.planwiseLogger.info('User role switched', {
          user: currentAuth.user,
          oldRole: currentAuth.role,
          newRole: newRole,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      toast('❌ Fout bij het wisselen van rol');
    }
  }
}

function applyRoleBasedUI() {
  const role = currentAuth?.role || 'viewer';
  const isViewer = role === 'viewer';
  
  // Apply viewer mode class to body
  document.body.classList.toggle('viewer-mode', isViewer);
  
  // Update navigation buttons
  updateNavigationPermissions();
  
  // Update action buttons
  updateActionButtonPermissions();
  
  // Update form permissions
  updateFormPermissions();
  
  // Update route access
  updateRouteAccess();
}

function updateNavigationPermissions() {
  const navButtons = document.querySelectorAll('.nav-btn[data-requires-permission]');
  
  navButtons.forEach(btn => {
    const permission = btn.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    
    btn.classList.toggle('no-permission', !hasAccess);
    
    if (!hasAccess) {
      btn.setAttribute('data-tooltip', `Vereist: ${permission}`);
      btn.classList.add('permission-tooltip');
    } else {
      btn.removeAttribute('data-tooltip');
      btn.classList.remove('permission-tooltip');
    }
  });
}

function updateActionButtonPermissions() {
  const actionButtons = document.querySelectorAll('.btn[data-requires-permission]');
  
  actionButtons.forEach(btn => {
    const permission = btn.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    
    btn.classList.toggle('no-permission', !hasAccess);
    btn.disabled = !hasAccess;
    
    if (!hasAccess) {
      btn.setAttribute('data-tooltip', `Vereist: ${permission}`);
      btn.classList.add('permission-tooltip');
    } else {
      btn.removeAttribute('data-tooltip');
      btn.classList.remove('permission-tooltip');
    }
  });
}

function updateFormPermissions() {
  const editableInputs = document.querySelectorAll('input[data-requires-permission], select[data-requires-permission], textarea[data-requires-permission]');
  
  editableInputs.forEach(input => {
    const permission = input.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    
    input.disabled = !hasAccess;
    input.classList.toggle('disabled-by-permission', !hasAccess);
  });
}

function updateRouteAccess() {
  const routes = document.querySelectorAll('.route[data-requires-permission]');
  
  routes.forEach(route => {
    const permission = route.getAttribute('data-requires-permission');
    const hasAccess = hasPermission(permission);
    
    route.classList.toggle('hidden-by-permission', !hasAccess);
  });
}

// Role-safe function wrappers
function roleSafeFunction(permission, originalFunction, fallbackFunction = null) {
  return function(...args) {
    if (requirePermission(permission, fallbackFunction)) {
      return originalFunction.apply(this, args);
    }
    return null;
  };
}

/* -------------------- DEFAULT STATE -------------------- */
const defaultState = {
  tenantInfo: { company: "", industry: "", plan: "demo" },
  settings:{ relayWebhook:"", relayWebhookSchedule:"", gmapsKey:"", openaiKey:"", afasUrl:"", afasToken:"" },
  installationTypes: [
    { id: "vickers", name: "Vickers", color: "#3b82f6", category: "Airco/Koeling" },
    { id: "airco", name: "Airco", color: "#10b981", category: "Airco/Koeling" },
    { id: "ketel", name: "Ketel", color: "#f56565", category: "CV-onderhoud" },
    { id: "ventilatie", name: "Ventilatie", color: "#8b5cf6", category: "Algemeen" },
    { id: "elektra", name: "Elektra", color: "#fbbf24", category: "Elektra" }
  ],
  technicians:[
    { id:"t1", name:"Sanne Peters", email:"sanne@bedrijf.nl", calendarId:"sanne@bedrijf.nl", skills:["CV-onderhoud","Loodgieter"], hub:"1051AA"},
    { id:"t2", name:"Ahmed Ouazani", email:"ahmed@bedrijf.nl", calendarId:"ahmed@bedrijf.nl", skills:["Elektra","Algemeen"], hub:"3527BB"},
    { id:"t3", name:"Lars de Boer", email:"lars@bedrijf.nl", calendarId:"lars@bedrijf.nl", skills:["Airco/Koeling","Algemeen"], hub:"3011CC"}
  ],
  tickets:[],
  proposals:{}, selectedProposal:{},
  calendarEvents:[],
  installations:[],
  assets:[
    { id:"a1", client:"VvE Parkzicht", address:"Kade 12, 1013 AA Amsterdam", system:"Vickers Chiller", lastService:"2024-10-20", category:"Airco/Koeling"},
    { id:"a2", client:"De Boer Makelaardij", address:"Markt 7, 3511 AA Utrecht", system:"CV-ketel Remeha", lastService:"2024-07-03", category:"CV-onderhoud"},
    { id:"a3", client:"Woningstichting Noord", address:"Dok 5, 9712 AA Groningen", system:"CV-ketel Nefit", lastService:"2024-12-15", category:"CV-onderhoud"},
    { id:"a4", client:"Koelservice BV", address:"Handelstraat 8, 3044 AB Rotterdam", system:"Vickers Koelgroep 120kW", lastService:"2023-09-10", category:"Airco/Koeling"}
  ],
  maintenancePlans:[]
};

state = loadState() || seedDemo(structuredClone(defaultState));
let calendar = null;     // FullCalendar instance
currentRoute = "new";

document.addEventListener("DOMContentLoaded", function() {
  // Apply polyfills and close any stray dialogs
  applyPolyfillsAndCloseStrayDialogs();
  
  // Get auth state
  currentAuth = Auth.get();
  
  if (!currentAuth) {
    showLoginModal();
    return;
  }
  
  // Initialize app for current auth
  initAppFor(currentAuth);
  
  // Ensure calendar is loaded before binding event handlers
  ensureCalendarLoaded();
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

/* -------------------- STARTUP & INITIALIZATION -------------------- */

// Apply polyfills and close any stray dialogs/overlays
function applyPolyfillsAndCloseStrayDialogs() {
  // Register dialog polyfill for GitHub Pages compatibility
  if (typeof dialogPolyfill !== 'undefined') {
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
      try {
        dialogPolyfill.registerDialog(dialog);
      } catch (error) {
        console.warn('Failed to register dialog:', error);
      }
    });
    console.log('Dialog polyfill registered for', dialogs.length, 'dialogs');
  }
  
  // Close any 'hanging' dialogs/overlays
  document.querySelectorAll('dialog[open]').forEach(d => { 
    try { d.close(); } catch(_){} 
  });
  
  // Remove any stray overlays/backdrops
  const blockers = document.querySelectorAll('.modal-backdrop,.overlay,.fc-popover'); 
  blockers.forEach(b => b.remove());
  
  // Clear any login errors
  clearLoginError();
}

// Enhanced modal opening function
function openModal(modalId) {
  // Close any existing modals first
  document.querySelectorAll('dialog[open]').forEach(d => { 
    try { d.close(); } catch(_){} 
  });
  
  // Remove any stray overlays/backdrops
  const blockers = document.querySelectorAll('.modal-backdrop,.overlay,.fc-popover'); 
  blockers.forEach(b => b.remove());
  
  // Open the requested modal
  const modal = document.getElementById(modalId);
  if (modal) {
    try {
      modal.showModal();
    } catch (error) {
      console.warn('Failed to open modal:', error);
      // Fallback: try to show as regular dialog
      modal.style.display = 'block';
    }
  }
}

// Initialize app for specific auth state
function initAppFor(auth) {
  console.log("Initializing app for auth:", auth);
  
  currentAuth = auth;
  
  // Initialize RBAC system
  initializeRBAC();
  
  // Update RBAC UI
  updateRoleIndicator();
  setupRoleSwitcher();
  applyRoleBasedUI();
  
  // Setup account dropdown
  setupAccountDropdown();

  // Router-knoppen
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!currentAuth) {
        showLoginModal();
        return;
      }
      go(btn.dataset.route);
    });
  });

  // Inject onderhoud-knop in de nav (als ontbreekt)
  injectMaintenanceNav();

  // Form submit
  const rf = document.getElementById("requestForm");
  if(rf) rf.addEventListener("submit", onSubmitRequest);

  // Instellingen knoppen
  document.getElementById("addTechBtn")?.addEventListener("click", () => roleSafeEditTechnicians(onAddTech));
  document.getElementById("saveSettings")?.addEventListener("click", () => roleSafeEditSettings(onSaveSettings));

  // Planner-zoek
  document.getElementById("searchInput")?.addEventListener("input", renderBoard);

  // Init eerste route - go to dashboard by default
  go("dashboard");
}

// Ensure calendar is loaded before binding event handlers
function ensureCalendarLoaded() {
  if (typeof FullCalendar !== 'undefined') {
    console.log('FullCalendar already loaded');
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (typeof FullCalendar !== 'undefined') {
        clearInterval(checkInterval);
        console.log('FullCalendar loaded successfully');
        resolve();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn('FullCalendar loading timeout');
      resolve();
    }, 5000);
  });
}

// Close account dropdown when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('accountDropdown');
  const accountButton = document.querySelector('.account-dropdown button');
  
  if (dropdown && accountButton) {
    if (!accountButton.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.style.display = 'none';
    }
  }
});

/* -------------------- ROUTER -------------------- */
function go(route){
  // Check if user has permission for this route
  if (!currentAuth) {
    showLoginModal();
    return;
  }
  
  // Special handling for Super Admin routes
  if (route === 'superadmin' || route === 'platform-analytics' || route === 'platform-billing') {
    if (currentAuth.role !== 'superadmin') {
      alert('Alleen Super Admins hebben toegang tot deze functie');
      return;
    }
    
    // If trying to access Super Admin from a tenant context, switch to platform mode
    if (currentAuth.orgSlug !== 'PLANWISE_PLATFORM') {
      if (confirm('Naar platformmodus gaan om Super Admin functies te gebruiken?')) {
        if (Auth.becomeSuperAdmin()) {
          location.reload();
        }
      }
      return;
    }
  }
  
  currentRoute = route;
  document.querySelectorAll(".route").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));

  const sec = document.getElementById(`route-${route}`);
  const tab = document.querySelector(`.nav-btn[data-route="${route}"]`);
  if(sec) sec.classList.add("active");
  if(tab) tab.classList.add("active");

  if(route==="planner") renderBoard();
  if(route==="settings") renderTechTable();
  if(route==="dashboard") ensureDashboard();    // init/refresh once visible
  if(route==="installations") ensureInstallations();
  if(route==="superadmin") loadPlatformData();
  if(route==="platform-analytics") loadAnalyticsData();
  if(route==="platform-billing") loadBillingData();
  if(route==="technician") loadTechnicianDashboard();
}

function injectMaintenanceNav(){
  // Maintenance functionality is now integrated into Installations section
  // No longer injecting separate maintenance navigation
  console.log("Maintenance functionality integrated into Installations section");
}

/* -------------------- HELPERS -------------------- */
const $ = s => document.querySelector(s);
function uuid(){ 
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }); 
}
function fmtDateTime(dt){ const d=new Date(dt); return d.toLocaleString("nl-NL",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }
function fmtDate(d){ return new Date(d).toLocaleDateString("nl-NL",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function createEl(tag, cls, text){ const el=document.createElement(tag); if(cls) el.className=cls; if(text!=null) el.textContent=text; return el; }
function toast(msg){ 
  const t=document.getElementById("toast"); 
  if(!t) {
    console.warn("Toast element not found");
    return; 
  } 
  t.innerHTML=`<div class="toast">${msg}</div>`; 
  t.style.display="block"; 
  clearTimeout(t._h); 
  t._h=setTimeout(()=>t.style.display="none",2200); 
}

/* -------------------- STORAGE -------------------- */
function saveState(){ 
  try{ 
    localStorage.setItem(getStorageKey(), JSON.stringify(state)); 
  } catch(error) {
    console.error("Failed to save state to localStorage:", error);
    toast("⚠️ Opslaan mislukt - probeer opnieuw");
  } 
}
function loadState(){
  try{ 
    const raw=localStorage.getItem(getStorageKey()); 
    return raw? JSON.parse(raw):null; 
  } catch(error) {
    console.error("Failed to load state from localStorage:", error);
    return null; 
  }
}
function seedDemo(s){
  console.log("seedDemo aangeroepen");
  
  if((s.tickets||[]).length) {
    console.log("Demo tickets bestaan al, alleen calendarEvents controleren");
    // Zorg ervoor dat calendarEvents bestaat, zelfs als tickets al bestaan
    if(!s.calendarEvents) {
      s.calendarEvents = [];
    }
    
    // Voeg demo events toe als ze nog niet bestaan
    if(s.calendarEvents.length === 0) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      const dayAfter = new Date(now.getTime() + 2 * 86400000);
      
      const demoEvents = [
        {
          id: "ev_demo1",
          title: "VvE Parkzicht — CV-onderhoud",
          client: "VvE Parkzicht",
          address: "Kade 12, 1013 AA Amsterdam",
          tech: "Sanne Peters",
          type: "Maintenance",
          start: new Date(tomorrow.getTime() + 9 * 3600000).toISOString(), // 09:00
          end: new Date(tomorrow.getTime() + 10 * 3600000).toISOString(), // 10:00
          notes: "Jaarlijkse ketelservice toren A."
        },
        {
          id: "ev_demo2", 
          title: "De Boer Makelaardij — Elektra",
          client: "De Boer Makelaardij",
          address: "Markt 7, 3511 AA Utrecht",
          tech: "Ahmed Ouazani",
          type: "Installation",
          start: new Date(dayAfter.getTime() + 13 * 3600000).toISOString(), // 13:00
          end: new Date(dayAfter.getTime() + 14.5 * 3600000).toISOString(), // 14:30
          notes: "Groepenkast naloop, verschillende storingen."
        }
      ];
      
      s.calendarEvents.push(...demoEvents);
      console.log("Demo events toegevoegd:", demoEvents.length);
    }
    
    saveState(); 
    return s;
  }
  
  const demo = [
    {customer_name:"VvE Parkzicht", email:"beheer@parkzicht.nl", phone:"+31612345678", address:"Kade 12, 1013 AA Amsterdam", category:"CV-onderhoud", window:"Ochtend (08:00–12:00)", preferred_start:new Date(Date.now()+86400000).toISOString().slice(0,10), sla_days:2, description:"Jaarlijkse ketelservice toren A."},
    {customer_name:"De Boer Makelaardij", email:"info@dboer.nl", phone:"+31698765432", address:"Markt 7, 3511 AA Utrecht", category:"Elektra", window:"Middag (12:00–17:00)", preferred_start:new Date(Date.now()+2*86400000).toISOString().slice(0,10), sla_days:1, description:"Groepenkast naloop, verschillende storingen."}
  ];
  
  s.tickets = demo.map(d=> ({...d, id:"req_"+uuid(), createdAt:new Date().toISOString(), status:"new", duration_min:guessDuration(d.category)}));
  
  // Voeg wat demo calendar events toe
  if(!s.calendarEvents) {
    s.calendarEvents = [];
  }
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const dayAfter = new Date(now.getTime() + 2 * 86400000);
  
  const demoEvents = [
    {
      id: "ev_demo1",
      title: "VvE Parkzicht — CV-onderhoud",
      client: "VvE Parkzicht",
      address: "Kade 12, 1013 AA Amsterdam",
      tech: "Sanne Peters",
      type: "Maintenance",
      start: new Date(tomorrow.getTime() + 9 * 3600000).toISOString(), // 09:00
      end: new Date(tomorrow.getTime() + 10 * 3600000).toISOString(), // 10:00
      notes: "Jaarlijkse ketelservice toren A."
    },
    {
      id: "ev_demo2", 
      title: "De Boer Makelaardij — Elektra",
      client: "De Boer Makelaardij",
      address: "Markt 7, 3511 AA Utrecht",
      tech: "Ahmed Ouazani",
      type: "Installation",
      start: new Date(dayAfter.getTime() + 13 * 3600000).toISOString(), // 13:00
      end: new Date(dayAfter.getTime() + 14.5 * 3600000).toISOString(), // 14:30
      notes: "Groepenkast naloop, verschillende storingen."
    }
  ];
  
  s.calendarEvents.push(...demoEvents);
  console.log("Demo events toegevoegd:", demoEvents.length);
  
  saveState(); 
  return s;
}

/* -------------------- NIEUWE AANVRAAG -------------------- */
function onSubmitRequest(e){
  e.preventDefault();
  
  if (!requirePermission('edit_planner')) return;
  
  const fd = new FormData(e.target);
  const t = Object.fromEntries(fd.entries());
  t.id = "req_"+uuid();
  t.createdAt = new Date().toISOString();
  t.status = "new";
  t.duration_min = Number(t.duration_min||0) || guessDuration(t.category);
  t.createdBy = getCurrentUserName();
  state.tickets.push(t); saveState();
  $("#reqStatus").textContent="Verzonden. De planner ontvangt deze aanvraag.";
  toast("✅ Aanvraag ingediend");
  e.target.reset();
  go("planner");
}
function guessDuration(cat){ const map={ "CV-onderhoud":60,"Loodgieter":90,"Elektra":90,"Airco/Koeling":120,"Algemeen":60 }; return map[cat]||60; }

/* -------------------- PLANNER -------------------- */
function renderBoard(){
  const cols = { new:$("#col-new"), proposals:$("#col-proposals"), approval:$("#col-approval"), scheduled:$("#col-scheduled") };
  Object.values(cols).forEach(c=> c && (c.innerHTML=""));

  const tpl=$("#cardTemplate"); const q=($("#searchInput")?.value||"").toLowerCase();
  state.tickets.filter(t=> [t.customer_name,t.address,t.category,t.description].join(" ").toLowerCase().includes(q))
  .forEach(t=>{
    const node=tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".t-customer").textContent=t.customer_name;
    node.querySelector(".t-meta").textContent=`${t.address} • ${t.email} • ${new Date(t.createdAt).toLocaleString("nl-NL")}`;
    const icon={ "CV-onderhoud":"🔥","Loodgieter":"🚰","Elektra":"⚡","Airco/Koeling":"❄️","Algemeen":"🧰" }[t.category||"Algemeen"];
    node.querySelector(".t-category").textContent=`${icon} ${t.category||"Algemeen"}`;
    node.querySelector(".t-desc").textContent=t.description||"—";
    const tags=node.querySelector(".t-tags");
    [t.window||"geen voorkeur", t.sla_days?`SLA: ${t.sla_days}d`:"geen SLA", `${t.duration_min||60} min`].forEach(v=>tags.appendChild(createEl("span","tag",v)));
    node.querySelector(".plan-btn").addEventListener("click", ()=> openProposals(t.id));
    node.querySelector(".approve-btn").addEventListener("click", ()=> approveFlow(t.id));
    node.querySelector(".delete-btn").addEventListener("click", ()=> deleteTicket(t.id));
    (t.status==="new")? cols.new.appendChild(node) :
    (t.status==="proposed")? cols.proposals.appendChild(node) :
    (t.status==="await_approval")? cols.approval.appendChild(node) :
    cols.scheduled.appendChild(node);
  });
}

async function openProposals(ticketId){
  if (!requirePermission('edit_planner')) return;
  
  const t = state.tickets.find(x=>x.id===ticketId);
  showSkeletons("col-proposals",2);
  await new Promise(r=>setTimeout(r,450));
  
  try {
    state.proposals[ticketId] = await buildProposals(t);
    t.status="proposed"; 
    saveState(); 
    clearSkeletons("col-proposals"); 
    renderBoard();
  } catch (error) {
    console.error('Error building proposals:', error);
    clearSkeletons("col-proposals");
    toast("❌ Fout bij genereren voorstellen");
    return;
  }

  const list=$("#proposalList"); list.innerHTML="";
  const techSel=$("#customTech"); techSel.innerHTML="";
  state.technicians.forEach(tech=>{ const o=document.createElement("option"); o.value=tech.id; o.textContent=tech.name; techSel.appendChild(o); });

  state.proposals[ticketId].forEach((p,idx)=>{
    const box=createEl("div","proposal");
    const left=createEl("div");
    
    // Main info
    left.appendChild(createEl("div","", `${p.tech.name} • ${fmtDateTime(p.start)} – ${new Date(p.end).toLocaleTimeString("nl-NL",{hour:'2-digit',minute:'2-digit'})}`));
    
    // Enhanced meta info with travel distance and explanation
    const metaInfo = `Reistijd ~ ${p.travelMin} min`;
    if (p.travelDistance) {
      metaInfo += ` (${p.travelDistance} km)`;
    }
    metaInfo += ` • Score ${p.score}`;
    if (p.fallback) {
      metaInfo += ` • Fallback`;
    }
    left.appendChild(createEl("div","meta", metaInfo));
    
    // Add explanation if available
    if (p.explanation) {
      const explanationEl = createEl("div","explanation", p.explanation);
      explanationEl.style.fontSize = "0.85em";
      explanationEl.style.color = "#666";
      explanationEl.style.marginTop = "4px";
      left.appendChild(explanationEl);
    }
    
    const choose=createEl("button","btn small","Kiezen");
    choose.addEventListener("click", ()=>{ 
      state.selectedProposal[ticketId]=p; 
      saveState(); 
      [...list.children].forEach(c=>c.classList.remove("selected")); 
      box.classList.add("selected"); 
    });
    
    box.appendChild(left); 
    box.appendChild(choose); 
    list.appendChild(box);
    
    if(idx===0 && !state.selectedProposal[ticketId]){
      state.selectedProposal[ticketId]=p; 
      saveState(); 
      box.classList.add("selected"); 
    }
  });

  $("#useCustom").onclick=()=>{
    const s=$("#customStart").value, e=$("#customEnd").value, techId=$("#customTech").value;
    if(!s||!e||!techId) return alert("Vul start, eind en monteur in.");
    const tech=state.technicians.find(x=>x.id===techId);
    state.selectedProposal[ticketId]={ id:"c_"+uuid(), tech, start:new Date(s).toISOString(), end:new Date(e).toISOString(), travelMin:0, score:75, custom:true };
    saveState(); toast("🧩 Eigen voorstel geselecteerd");
  };

  const dlg=$("#proposalModal"); document.body.classList.add("modal-open");
  dlg.addEventListener("close",()=>document.body.classList.remove("modal-open"),{once:true}); dlg.showModal();
  $("#confirmProposal").onclick=()=>{
    if(!state.selectedProposal[ticketId]) return alert("Kies een voorstel of vul een eigen in.");
    t.status="await_approval"; saveState(); renderBoard(); dlg.close(); toast("📝 Voorstel klaar voor goedkeuring");
  };
}

async function buildProposals(t){
  console.log('Building proposals for ticket:', t.id);
  
  try {
    // Get locked events from calendar for scheduler
    const lockedEvents = state.calendarEvents
      .filter(event => event.locked)
      .map(event => ({
        technician_id: event.technician_id,
        start: event.start,
        end: event.end,
        job_id: event.job_id,
        locked: true
      }));
    
    // Prepare job data for scheduler
    const jobs = [{
      id: t.id,
      customer_name: t.customer_name,
      category: t.category,
      duration_min: t.duration_min || guessDuration(t.category),
      address: t.address,
      preferred_start: t.preferred_start,
      sla_deadline: t.sla_days ? new Date(Date.now() + t.sla_days * 86400000).toISOString() : null,
      required_skills: [t.category],
      window: t.window,
      description: t.description,
      email: t.email,
      phone: t.phone
    }];
    
    // Use enhanced scheduler with lock respect
    const result = await window.planwiseScheduler.optimizeSchedule(
      jobs, 
      state.technicians, 
      {}, // policies
      lockedEvents
    );
    
    console.log('Scheduler result:', result);
    
    // Convert scheduler result to proposal format with explainability
    const proposals = result.assignments.map(assignment => {
      const tech = state.technicians.find(tech => tech.id === assignment.technician_id);
      const explanation = assignment.explanation || 'Geoptimaliseerde toewijzing';
      
      return {
        id: "p_" + uuid(),
        tech,
        start: assignment.start,
        end: assignment.end,
        travelMin: assignment.travel_time,
        travelDistance: assignment.travel_distance,
        score: Math.round(assignment.score),
        explanation: explanation,
        scheduler_data: {
          assignment_id: assignment.job_id,
          technician_id: assignment.technician_id,
          travel_time: assignment.travel_time,
          travel_distance: assignment.travel_distance
        }
      };
    });
    
    // Add explanation summary
    if (result.explanations && result.explanations.length > 0) {
      console.log('Scheduler explanations:', result.explanations);
      
      // Log lock respect info
      const lockExplanation = result.explanations.find(e => e.type === 'lock_respect');
      if (lockExplanation) {
        console.log(`Scheduler: ${lockExplanation.message}`);
      }
      
      // Log travel analysis
      if (result.travel_analysis) {
        console.log('Travel analysis:', result.travel_analysis);
      }
    }
    
    // If no assignments found, provide fallback with explanation
    if (proposals.length === 0) {
      console.warn('No assignments found, providing fallback proposals');
      
      const fallbackProposals = this.generateFallbackProposals(t);
      return fallbackProposals.map(proposal => ({
        ...proposal,
        explanation: 'Fallback voorstel - geen optimale toewijzing gevonden',
        score: Math.max(30, proposal.score - 20) // Lower score for fallbacks
      }));
    }
    
    return proposals;
    
  } catch (error) {
    console.error('Scheduler error, falling back to simple logic:', error);
    
    // Enhanced fallback with better error handling
    return this.generateFallbackProposals(t);
  }
}

// Helper function to generate fallback proposals
function generateFallbackProposals(t) {
  const pool = state.technicians.filter(tech => 
    (tech.skills || []).includes(t.category) || t.category === "Algemeen"
  );
  
  const availableTechs = pool.length > 0 ? pool : state.technicians;
  const base = t.preferred_start ? new Date(t.preferred_start) : new Date(Date.now() + 86400000);
  
  return availableTechs.slice(0, 3).map((tech, i) => {
    const start = new Date(base.getTime() + (i * 2 + 1) * 3600000);
    const end = new Date(start.getTime() + (t.duration_min || 60) * 60000);
    
    // Estimate travel time based on location
    const travelTime = estimateTravelTimeForTech(tech, t.address);
    
    return {
      id: "p_" + uuid(),
      tech,
      start: start.toISOString(),
      end: end.toISOString(),
      travelMin: travelTime,
      travelDistance: Math.round(travelTime / 2), // Rough estimate
      score: Math.round(85 - i * 10), // Decreasing score for fallbacks
      explanation: `Fallback voorstel ${i + 1} - ${tech.name}`,
      fallback: true
    };
  });
}

// Helper function to estimate travel time for technician
function estimateTravelTimeForTech(tech, jobAddress) {
  if (!tech.hub || !jobAddress) return 30; // Default 30 minutes
  
  // Simple estimation based on postcode distance
  const techPostcode = extractPostcode(tech.hub);
  const jobPostcode = extractPostcode(jobAddress);
  
  if (techPostcode && jobPostcode) {
    const distance = calculatePostcodeDistance(techPostcode, jobPostcode);
    return Math.max(15, Math.min(90, distance * 2.5)); // 2.5 min per km
  }
  
  return 30 + Math.random() * 30; // 30-60 minutes
}

// Helper function to extract postcode
function extractPostcode(address) {
  const match = address.match(/\d{4}\s*[A-Z]{2}/);
  return match ? match[0].replace(/\s/g, '') : null;
}

// Helper function to calculate postcode distance
function calculatePostcodeDistance(pc1, pc2) {
  const num1 = parseInt(pc1.substring(0, 4));
  const num2 = parseInt(pc2.substring(0, 4));
  return Math.abs(num1 - num2) / 100; // Rough km estimation
}

/* -------------------- GOEDKEUREN → PLAN + DASHBOARD -------------------- */
function approveFlow(ticketId){
  const t = state.tickets.find(x=>x.id===ticketId);
  if(!t) return alert("Ticket niet gevonden.");

  // Controleer of ticket al gepland is
  if(t.status === "scheduled") {
    toast("⚠️ Deze afspraak is al gepland");
    return;
  }

  let p = state.selectedProposal[ticketId] || (state.proposals[ticketId]||[])[0];
  if(!p){ 
    const now=new Date(); 
    p={ 
      id:"fallback_"+uuid(), 
      tech:state.technicians[0], 
      start:now.toISOString(), 
      end:new Date(now.getTime()+60*60000).toISOString(), 
      travelMin:0, 
      score:50, 
      custom:true 
    }; 
  }

  // Controleer op dubbele afspraken
  const existingEvent = state.calendarEvents.find(e => 
    e.client === t.customer_name && 
    Math.abs(new Date(e.start) - new Date(p.start)) < 3600000 && // binnen 1 uur
    e.tech === (p.tech?.name || "Onbekend")
  );

  if(existingEvent) {
    if(!confirm(`Er bestaat al een afspraak voor ${t.customer_name} op ${fmtDateTime(existingEvent.start)}. Toch doorgaan?`)) {
      return;
    }
  }

  t.status="scheduled";

  const ev = {
    id:"ev_"+uuid(),
    title:`${t.customer_name} — ${t.category}`,
    client:t.customer_name, 
    address:t.address,
    tech:p.tech?.name||"Onbekend", 
    type: classifyType(t.category),
    start:p.start, 
    end:p.end, 
    notes:t.description||"",
    ticketId: ticketId // Link naar originele ticket
  };
  
  // Zorg ervoor dat calendarEvents array bestaat
  if(!state.calendarEvents) {
    state.calendarEvents = [];
  }
  
  state.calendarEvents.push(ev);
  saveState();
  
  console.log("Event toegevoegd aan calendar:", ev);
  console.log("Totaal events in state:", state.calendarEvents.length);

  renderBoard();
  
  // als dashboard al open is: live bijwerken
  if(currentRoute==="dashboard") {
    console.log("Dashboard is actief, updating...");
    if(calendar) {
      updateDashboard();
    } else {
      showCalendarFallback();
    }
  }
  
  toast("📅 Afspraak gepland");

  // E-mail + ICS (voorbeeld)
  const subj = `Bevestiging afspraak ${fmtDateTime(p.start)} – ${t.category}`;
  const body = [
    `Beste ${t.customer_name},`, ``,
    `We hebben uw afspraak ingepland:`,
    `• Datum/tijd: ${fmtDateTime(p.start)} – ${new Date(p.end).toLocaleTimeString("nl-NL",{hour:'2-digit',minute:'2-digit'})}`,
    `• Monteur: ${p.tech?.name||"Onbekend"}`,
    `• Adres: ${t.address}`, ``, `Met vriendelijke groet,`, `PlanWise`
  ].join("\n");
  const ics = buildICS({ uid:`${ticketId}@planwise`, start:p.start, end:p.end, title:`Afspraak – ${t.category} (${p.tech?.name||"Onbekend"})`, location:t.address, description:`Klant: ${t.customer_name} • Tel: ${t.phone||""}` });
  $("#emailSubject").value=subj; $("#emailBody").value=body;
  const dlg=$("#emailModal"); document.body.classList.add("modal-open");
  dlg.addEventListener("close",()=>document.body.classList.remove("modal-open"),{once:true}); dlg.showModal();
  $("#downloadIcs").onclick=()=> downloadFile(`planwise_${ticketId}.ics`, ics, "text/calendar");
  $("#sendEmail").onclick=()=>{ dlg.close(); toast("✉️ E-mail verstuurd"); };
}

function deleteTicket(ticketId) {
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (!ticket) return;
  
  if (!confirm(`Weet je zeker dat je de opdracht "${ticket.customer_name}" wilt verwijderen?`)) {
    return;
  }
  
  // Verwijder ticket uit state
  state.tickets = state.tickets.filter(t => t.id !== ticketId);
  
  // Verwijder gerelateerde data
  delete state.proposals[ticketId];
  delete state.selectedProposal[ticketId];
  
  // Verwijder gerelateerde calendar events
  state.calendarEvents = state.calendarEvents.filter(e => e.ticketId !== ticketId);
  
  saveState();
  renderBoard();
  
  // Update dashboard als die open is
  if(currentRoute === "dashboard") {
    if(calendar) {
      updateDashboard();
    } else {
      showCalendarFallback();
    }
  }
  
  toast("🗑️ Opdracht verwijderd");
}
function classifyType(cat){ const c=(cat||"").toLowerCase(); if(c.includes("onderhoud")) return "Maintenance"; if(c.includes("elektra")||c.includes("airco")) return "Installation"; return "Installation"; }
function buildICS({uid,start,end,title,location,description}){ const dt=d=>new Date(d).toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PlanWise//MVP//NL","BEGIN:VEVENT",`UID:${uid}`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(start)}`,`DTEND:${dt(end)}`,`SUMMARY:${title}`,`LOCATION:${location}`,`DESCRIPTION:${description}`,"END:VEVENT","END:VCALENDAR"].join("\r\n"); }
function downloadFile(name, content, type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); }

/* -------------------- INSTELLINGEN -------------------- */
function renderTechTable(){
  const tbody=$("#techTable tbody"); if(!tbody) return;
  tbody.innerHTML="";
  state.technicians.forEach(tech=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><input value="${tech.name}"/></td><td><input value="${tech.email}"/></td><td><input value="${tech.calendarId}"/></td><td><input value="${(tech.skills||[]).join(", ")}"/></td><td><input value="${tech.hub||""}"/></td><td><button class="btn small ghost">Verwijderen</button></td>`;
    tr.querySelector("button").onclick=()=>{ state.technicians=state.technicians.filter(t=>t.id!==tech.id); saveState(); renderTechTable(); toast("🗑️ Monteur verwijderd"); };
    const ins=tr.querySelectorAll("input");
    ins[0].oninput=e=>{ tech.name=e.target.value; saveState(); };
    ins[1].oninput=e=>{ tech.email=e.target.value; saveState(); };
    ins[2].oninput=e=>{ tech.calendarId=e.target.value; saveState(); };
    ins[3].oninput=e=>{ tech.skills=e.target.value.split(",").map(s=>s.trim()).filter(Boolean); saveState(); };
    ins[4].oninput=e=>{ tech.hub=e.target.value; saveState(); };
    tbody.appendChild(tr);
  });
}
function onAddTech(){ 
  if (!requirePermission('edit_technicians')) return;
  state.technicians.push({ id:"t"+uuid(), name:"Nieuwe Monteur", email:"", calendarId:"", skills:["Algemeen","CV-onderhoud"], hub:"" }); 
  saveState(); 
  renderTechTable(); 
  toast("👷 Monteur toegevoegd"); 
}
function onSaveSettings(){
  if (!requirePermission('edit_settings')) return;
  state.settings.relayWebhook = $("#relayWebhook").value;
  state.settings.relayWebhookSchedule = $("#relayWebhookSchedule").value;
  state.settings.gmapsKey = $("#gmapsKey").value;
  state.settings.openaiKey = $("#openaiKey").value;
  state.settings.afasUrl = $("#afasUrl").value;
  state.settings.afasToken = $("#afasToken").value;
  saveState(); $("#settingsStatus").textContent="Opgeslagen (lokaal)."; toast("⚙️ Instellingen opgeslagen"); setTimeout(()=> $("#settingsStatus").textContent="", 1800);
}

/* -------------------- SKELETONS -------------------- */
function showSkeletons(colId,n=2){ const c=document.getElementById(colId); if(!c) return; for(let i=0;i<n;i++){ const d=document.createElement("div"); d.className="card skel"; c.appendChild(d);} }
function clearSkeletons(colId){ const c=document.getElementById(colId); if(!c) return; c.querySelectorAll(".skel").forEach(e=>e.remove()); }

/* -------------------- DASHBOARD (FullCalendar) -------------------- */
function ensureDashboard(){
  console.log("ensureDashboard called");
  
  try {
    // Fill filters
    const techSel=$("#dashTech");
    if(techSel){ 
      techSel.innerHTML=`<option value="">Alle monteurs</option>` + 
        state.technicians.map(t=>`<option value="${t.name}">${t.name}</option>`).join(""); 
    }

    // Try to initialize directly
    initCalendar();

    // Event listeners for filters (only add if they don't exist)
    setupDashboardListeners();
    
    // Run health check
    runDashboardHealthCheck();
    
  } catch (error) {
    console.error("Critical error in ensureDashboard:", error);
    showCalendarFallback();
  }
}

// Global function for delayed init
window.initDashboardAfterLoad = function() {
  if(currentRoute === "dashboard") {
    initCalendar();
  }
};

function runDashboardHealthCheck() {
  try {
    console.log("Running dashboard health check...");
    
    // Check state integrity
    if(!state.calendarEvents) {
      console.warn("calendarEvents array missing, initializing...");
      state.calendarEvents = [];
    }
    
    if(!state.tickets) {
      console.warn("tickets array missing, initializing...");
      state.tickets = [];
    }
    
    // Validate existing events
    const invalidEvents = state.calendarEvents.filter(ev => !validateCalendarEvent(ev));
    if(invalidEvents.length > 0) {
      console.warn(`Found ${invalidEvents.length} invalid events, cleaning up...`);
      state.calendarEvents = state.calendarEvents.filter(ev => validateCalendarEvent(ev));
      saveState();
    }
    
    // Check calendar instance
    if(calendar && typeof calendar.getEvents === 'function') {
      const fcEvents = calendar.getEvents();
      console.log(`Calendar has ${fcEvents.length} events loaded`);
    }
    
    console.log("Dashboard health check completed");
    
  } catch (error) {
    console.error("Error in dashboard health check:", error);
  }
}

function initCalendar() {
  try {
    const el = document.getElementById("calendar");
    if(!el) {
      console.warn("Calendar element not found");
      return;
    }
    
    // Check if FullCalendar is available
    if(typeof FullCalendar === 'undefined') {
      console.log("FullCalendar not available, showing fallback calendar");
      showCalendarFallback();
      return;
    }
    
    console.log("FullCalendar available, initializing...");
    
    // Destroy existing calendar if it exists
    if(calendar) {
      try {
        calendar.destroy();
        console.log("Existing calendar destroyed");
      } catch (error) {
        console.warn("Error destroying existing calendar:", error);
      }
      calendar = null;
    }
    
    // Ensure calendar container is clean
    el.innerHTML = '';
    
    try {
      // Enhanced calendar configuration
      calendar = new FullCalendar.Calendar(el, {
        initialView: $("#dashView")?.value || "dayGridMonth",
        locale: 'nl',
        timeZone: 'Europe/Amsterdam',
        height: "auto",
        headerToolbar: { 
          left: 'prev,next today', 
          center: 'title', 
          right: 'dayGridMonth,timeGridWeek,timeGridDay' 
        },
        events: buildCalendarEvents(),
        eventClassNames: (arg) => [arg.event.extendedProps.type || "Installation"],
        
        // Enhanced event handling
        eventClick: (info) => {
          try {
            console.log("Event clicked:", info.event.title);
            showEventModal(info.event);
          } catch (error) {
            console.error("Error in eventClick:", error);
            toast("❌ Fout bij openen afspraak");
          }
        },
        
        eventDidMount: (info) => {
          console.log("Event mounted:", info.event.title);
        },
        
        // Enhanced drag & drop with persistence
        editable: true,
        eventDrop: (info) => {
          try {
            console.log("Event dropped:", info.event.title, "to", info.event.start);
            
            // Validate the drop
            if (!validateEventDrop(info.event)) {
              console.warn("Invalid drop detected, reverting...");
              info.revert();
              toast("❌ Ongeldige verplaatsing");
              return;
            }
            
            // Update event time with enhanced persistence
            const success = updateEventTime(info.event, info.event.start, info.event.end);
            if (!success) {
              console.warn("Failed to update event time, reverting...");
              info.revert();
              toast("❌ Fout bij opslaan verplaatsing");
              return;
            }
            
            // Update related ticket if this is a scheduled event
            updateRelatedTicket(info.event);
            
            // Log the change for audit
            logEventChange('drop', info.event, {
              oldStart: info.oldEvent.start,
              newStart: info.event.start,
              oldEnd: info.oldEvent.end,
              newEnd: info.event.end
            });
            
            // Show success feedback
            toast("📅 Afspraak verplaatst naar " + info.event.start.toLocaleDateString('nl-NL'));
            
            // Update calendar to reflect changes
            setTimeout(() => {
              if (calendar) {
                calendar.refetchEvents();
              }
            }, 100);
            
          } catch (error) {
            console.error("Error in eventDrop:", error);
            info.revert();
            toast("❌ Fout bij verplaatsen afspraak");
          }
        },
        
        // Enhanced resize with persistence
        eventResize: (info) => {
          try {
            console.log("Event resized:", info.event.title, "to", info.event.start, "-", info.event.end);
            
            // Validate the resize
            if (!validateEventResize(info.event)) {
              console.warn("Invalid resize detected, reverting...");
              info.revert();
              toast("❌ Ongeldige aanpassing");
              return;
            }
            
            // Update event time with enhanced persistence
            const success = updateEventTime(info.event, info.event.start, info.event.end);
            if (!success) {
              console.warn("Failed to update event time, reverting...");
              info.revert();
              toast("❌ Fout bij opslaan aanpassing");
              return;
            }
            
            // Update related ticket if this is a scheduled event
            updateRelatedTicket(info.event);
            
            // Log the change for audit
            logEventChange('resize', info.event, {
              oldStart: info.oldEvent.start,
              newStart: info.event.start,
              oldEnd: info.oldEvent.end,
              newEnd: info.event.end
            });
            
            // Show success feedback
            const duration = Math.round((info.event.end - info.event.start) / (1000 * 60));
            toast(`📅 Afspraak aangepast (${duration} minuten)`);
            
            // Update calendar to reflect changes
            setTimeout(() => {
              if (calendar) {
                calendar.refetchEvents();
              }
            }, 100);
            
          } catch (error) {
            console.error("Error in eventResize:", error);
            info.revert();
            toast("❌ Fout bij aanpassen afspraak");
          }
        },
        
        // Enhanced loading states
        loading: (isLoading) => {
          if (isLoading) {
            el.style.opacity = '0.7';
          } else {
            el.style.opacity = '1';
          }
        },
        
        // Enhanced error handling
        eventSourceFailure: (error) => {
          console.error("Event source failure:", error);
          toast("⚠️ Fout bij laden afspraken");
        }
      });
      
      // Render calendar
      calendar.render();
      console.log("FullCalendar rendered successfully");
      
      // Force layout update after render
      setTimeout(() => {
        if(calendar) {
          try {
            calendar.updateSize();
            console.log("Calendar size updated");
          } catch (error) {
            console.warn("Error updating calendar size:", error);
          }
        }
      }, 100);
      
    } catch (error) {
      console.error("Error initializing FullCalendar:", error);
      showCalendarFallback();
    }
    
  } catch (error) {
    console.error("Critical error in initCalendar:", error);
    showCalendarFallback();
  }
}

function setupDashboardListeners() {
  const dashView = $("#dashView");
  const dashTech = $("#dashTech");
  const dashSearch = $("#dashSearch");
  
  // Enhanced view change listener
  if(dashView && !dashView._hasListener) {
    dashView.addEventListener("change", () => { 
      const selectedView = dashView.value;
      console.log("View changed to:", selectedView);
      
      try {
        if(calendar && calendar.changeView){ 
          calendar.changeView(selectedView); 
          calendar.updateSize(); 
          console.log("Calendar view changed successfully");
        } else {
          // For fallback: show different view based on selection
          if(selectedView === "timeGridWeek" || selectedView === "Week") {
            showWeekFallback();
          } else {
            showCalendarFallback();
          }
        }
      } catch (error) {
        console.error("Error changing view:", error);
        toast("❌ Fout bij wisselen weergave");
        showCalendarFallback(); // Fallback to month view
      }
    });
    dashView._hasListener = true;
  }
  
  // Enhanced technician filter listener
  if(dashTech && !dashTech._hasListener) {
    dashTech.addEventListener("change", () => {
      console.log("Technician filter changed to:", dashTech.value);
      
      try {
        if(calendar && calendar.refetchEvents) {
          calendar.refetchEvents();
          console.log("Calendar events refetched");
        } else {
          // Check current view
          const currentView = $("#dashView")?.value;
          if(currentView === "timeGridWeek" || currentView === "Week") {
            showWeekFallback();
          } else {
            showCalendarFallback();
          }
        }
      } catch (error) {
        console.error("Error updating technician filter:", error);
        toast("❌ Fout bij filteren");
      }
    });
    dashTech._hasListener = true;
  }
  
  // Enhanced search listener with better debouncing
  if(dashSearch && !dashSearch._hasListener) {
    dashSearch.addEventListener("input", debounce(() => {
      const searchTerm = dashSearch.value;
      console.log("Search term changed to:", searchTerm);
      
      try {
        if(calendar && calendar.refetchEvents) {
          calendar.refetchEvents();
          console.log("Calendar events refetched for search");
        } else {
          const currentView = $("#dashView")?.value;
          if(currentView === "timeGridWeek" || currentView === "Week") {
            showWeekFallback();
          } else {
            showCalendarFallback();
          }
        }
      } catch (error) {
        console.error("Error updating search filter:", error);
        toast("❌ Fout bij zoeken");
      }
    }, 300)); // Increased debounce time for better performance
    dashSearch._hasListener = true;
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (currentRoute !== 'dashboard') return;
    
    // Ctrl/Cmd + F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (dashSearch) {
        dashSearch.focus();
        dashSearch.select();
      }
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
      if (dashSearch && dashSearch.value) {
        dashSearch.value = '';
        dashSearch.dispatchEvent(new Event('input'));
      }
    }
  });
}

function showCalendarFallback() {
  console.log("Showing calendar fallback");
  const el = document.getElementById("calendar");
  if(!el) {
    console.error("Calendar element not found");
    return;
  }
  
  try {
    const events = buildCalendarEvents();
    
    // Use fallbackCalendarDate instead of current date
    const year = fallbackCalendarDate.getFullYear();
    const month = fallbackCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Group events by date
    const eventsByDate = {};
    events.forEach(ev => {
      try {
        const date = new Date(ev.start).toDateString();
        if(!eventsByDate[date]) eventsByDate[date] = [];
        eventsByDate[date].push(ev);
      } catch (error) {
        console.warn("Error processing event for fallback:", ev, error);
      }
    });
    
    let calendarHTML = `
      <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; color: rgb(var(--txt-1));">📅 ${firstDay.toLocaleDateString('nl-NL', {month: 'long', year: 'numeric'})}</h3>
          <div style="display: flex; gap: 8px;">
            <button onclick="changeCalendarMonth(-1)" style="padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: rgb(var(--txt-1)); cursor: pointer;">‹</button>
            <button onclick="changeCalendarMonth(1)" style="padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: rgb(var(--txt-1)); cursor: pointer;">›</button>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Zo</div>
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Ma</div>
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Di</div>
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Wo</div>
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Do</div>
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Vr</div>
          <div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Za</div>
    `;
    
    // Generate calendar days
    const current = new Date(startDate);
    const currentDate = new Date();
    for(let week = 0; week < 6; week++) {
      for(let day = 0; day < 7; day++) {
        const dateStr = current.toDateString();
        const dayEvents = eventsByDate[dateStr] || [];
        const isCurrentMonth = current.getMonth() === month;
        const isToday = current.toDateString() === currentDate.toDateString();
        
        calendarHTML += `
          <div style="
            min-height: 80px; 
            padding: 4px; 
            background: ${isCurrentMonth ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)'}; 
            ${isToday ? 'border: 2px solid rgb(var(--brand-1));' : ''}
            display: flex; 
            flex-direction: column;
          ">
            <div style="font-size: 0.9em; color: ${isCurrentMonth ? 'rgb(var(--txt-1))' : 'rgb(var(--txt-3))'}; margin-bottom: 2px;">${current.getDate()}</div>
            ${dayEvents.slice(0, 2).map(ev => `
              <div onclick="showEventModal({id: '${ev.id}', title: '${ev.title.replace(/'/g, "\\'")}', extendedProps: ${JSON.stringify(ev.extendedProps).replace(/"/g, '&quot;')}, start: '${ev.start}', end: '${ev.end}'})" style="
                font-size: 0.75em; 
                padding: 2px 4px; 
                margin: 1px 0; 
                background: linear-gradient(135deg, rgba(var(--brand-1), 0.3), rgba(var(--brand-2), 0.3)); 
                border-radius: 3px; 
                cursor: pointer;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              ">${ev.title.split(' — ')[0]}</div>
            `).join('')}
            ${dayEvents.length > 2 ? `<div style="font-size: 0.7em; color: rgb(var(--txt-3));">+${dayEvents.length - 2} meer</div>` : ''}
          </div>
        `;
        
        current.setDate(current.getDate() + 1);
      }
    }
    
    calendarHTML += `
        </div>
        <p style="color: rgb(var(--txt-2)); font-size: 0.85em; margin: 16px 0 0 0; text-align: center;">
          📅 Kalender weergave (fallback) • Klik op afspraken voor details
        </p>
      </div>
    `;
    
    el.innerHTML = calendarHTML;
    
  } catch (error) {
    console.error("Error in showCalendarFallback:", error);
    el.innerHTML = `
      <div style="padding: 20px; text-align: center; color: rgb(var(--txt-2));">
        ❌ Fout bij laden kalender<br>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: rgba(var(--brand-1), 0.2); border: 1px solid rgba(var(--brand-1), 0.3); border-radius: 6px; color: rgb(var(--txt-1)); cursor: pointer;">Herlaad pagina</button>
      </div>
    `;
  }
}

function showWeekFallback() {
  console.log("Showing week fallback");
  const el = document.getElementById("calendar");
  if(!el) return;
  
  try {
    const events = buildCalendarEvents();
    
    // Get current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    // Group events by day
    const eventsByDay = {};
    for(let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      eventsByDay[day.toDateString()] = [];
    }
    
    events.forEach(ev => {
      try {
        const eventDate = new Date(ev.start);
        const dayKey = eventDate.toDateString();
        if(eventsByDay[dayKey]) {
          eventsByDay[dayKey].push(ev);
        }
      } catch (error) {
        console.warn("Error processing event for week fallback:", ev, error);
      }
    });
    
    const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    
    let weekHTML = `
      <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; color: rgb(var(--txt-1));">📅 Week ${startOfWeek.toLocaleDateString('nl-NL')} - ${endOfWeek.toLocaleDateString('nl-NL')}</h3>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
    `;
    
    for(let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayEvents = eventsByDay[day.toDateString()] || [];
      const isToday = day.toDateString() === new Date().toDateString();
      
      weekHTML += `
        <div style="
          min-height: 120px; 
          padding: 8px; 
          background: rgba(255,255,255,0.02); 
          border-radius: 6px;
          ${isToday ? 'border: 2px solid rgb(var(--brand-1));' : 'border: 1px solid rgba(255,255,255,0.1);'}
        ">
          <div style="font-weight: 500; color: rgb(var(--txt-1)); margin-bottom: 8px;">
            ${dayNames[i]} ${day.getDate()}
          </div>
          ${dayEvents.map(ev => `
            <div onclick="showEventModal({id: '${ev.id}', title: '${ev.title.replace(/'/g, "\\'")}', extendedProps: ${JSON.stringify(ev.extendedProps).replace(/"/g, '&quot;')}, start: '${ev.start}', end: '${ev.end}'})" style="
              font-size: 0.8em; 
              padding: 4px 6px; 
              margin: 2px 0; 
              background: linear-gradient(135deg, rgba(var(--brand-1), 0.3), rgba(var(--brand-2), 0.3)); 
              border-radius: 4px; 
              cursor: pointer;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            ">${ev.title.split(' — ')[0]}</div>
          `).join('')}
        </div>
      `;
    }
    
    weekHTML += `
        </div>
        <p style="color: rgb(var(--txt-2)); font-size: 0.85em; margin: 16px 0 0 0; text-align: center;">
          📅 Week weergave (fallback) • Klik op afspraken voor details
        </p>
      </div>
    `;
    
    el.innerHTML = weekHTML;
    
  } catch (error) {
    console.error("Error in showWeekFallback:", error);
    showCalendarFallback(); // Fallback to month view
  }
}

// Calendar navigation
let fallbackCalendarDate = new Date();
window.changeCalendarMonth = function(delta) {
  fallbackCalendarDate.setMonth(fallbackCalendarDate.getMonth() + delta);
  const currentView = $("#dashView")?.value;
  if(currentView === "timeGridWeek" || currentView === "Week") {
    showWeekFallback();
  } else {
    showCalendarFallback();
  }
};

window.changeCalendarWeek = function(delta) {
  fallbackCalendarDate.setDate(fallbackCalendarDate.getDate() + (delta * 7));
  showWeekFallback();
};

function showWeekFallback() {
  console.log("Toon week fallback");
  const el = document.getElementById("calendar");
  if(!el) return;
  
  const events = buildCalendarEvents();
  
  // Calculate week start (Monday)
  const currentDate = new Date(fallbackCalendarDate);
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = currentDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
  startOfWeek.setDate(currentDate.getDate() + diff);
  
  // Generate week view
  const weekDays = [];
  for(let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }
  
  // Group events by date
  const eventsByDate = {};
  events.forEach(ev => {
    const date = new Date(ev.start).toDateString();
    if(!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(ev);
  });
  
  let weekHTML = `
    <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: rgb(var(--txt-1));">📅 Week ${getWeekNumber(currentDate)} - ${currentDate.getFullYear()}</h3>
        <div style="display: flex; gap: 8px;">
          <button onclick="changeCalendarWeek(-1)" style="padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: rgb(var(--txt-1)); cursor: pointer;">‹</button>
          <button onclick="changeCalendarWeek(1)" style="padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: rgb(var(--txt-1)); cursor: pointer;">›</button>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">
        ${weekDays.map(day => {
          const dayEvents = eventsByDate[day.toDateString()] || [];
          const isToday = day.toDateString() === new Date().toDateString();
          const dayName = day.toLocaleDateString('nl-NL', {weekday: 'short'});
          
          return `
            <div style="
              min-height: 120px; 
              padding: 8px; 
              background: rgba(255,255,255,0.02); 
              ${isToday ? 'border: 2px solid rgb(var(--brand-1));' : ''}
              display: flex; 
              flex-direction: column;
            ">
              <div style="font-weight: 600; color: rgb(var(--txt-1)); margin-bottom: 8px; text-align: center;">
                ${dayName}<br>
                <span style="font-size: 1.2em;">${day.getDate()}</span>
              </div>
              ${dayEvents.map(ev => `
                <div onclick="showEventModal({id: '${ev.id}', title: '${ev.title}', extendedProps: ${JSON.stringify(ev.extendedProps).replace(/"/g, '&quot;')}, start: '${ev.start}', end: '${ev.end}'})" style="
                  font-size: 0.8em; 
                  padding: 4px 6px; 
                  margin: 2px 0; 
                  background: linear-gradient(135deg, rgba(var(--brand-1), 0.4), rgba(var(--brand-2), 0.4)); 
                  border-radius: 4px; 
                  cursor: pointer;
                  color: rgb(var(--txt-1));
                  font-weight: 500;
                ">${ev.title.split(' — ')[0]}<br><small>${new Date(ev.start).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}</small></div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
      <p style="color: rgb(var(--txt-2)); font-size: 0.85em; margin: 16px 0 0 0; text-align: center;">
        📅 Week weergave (fallback) • Klik op afspraken voor details
      </p>
    </div>
  `;
  
  el.innerHTML = weekHTML;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildCalendarEvents(){
  console.log("Building calendar events...");
  
  // Ensure calendarEvents array exists and is initialized
  if(!state.calendarEvents) {
    state.calendarEvents = [];
    console.log("Initialized empty calendarEvents array");
  }
  
  // Ensure tickets array exists
  if(!state.tickets) {
    state.tickets = [];
    console.log("Initialized empty tickets array");
  }
  
  try {
    // Events from state.calendarEvents (direct calendar events)
    const fromState = (state.calendarEvents || [])
      .filter(ev => ev && ev.id) // Filter out invalid events
      .map(ev => {
        try {
          return toFcEvent(ev);
        } catch (error) {
          console.warn("Error converting state event to FC event:", ev, error);
          return null;
        }
      })
      .filter(Boolean);
    
    console.log("Events from state:", fromState.length);
    
    // Events from tickets with status "scheduled"
    const fromTickets = (state.tickets || [])
      .filter(t => t && t.status === "scheduled")
      .map(t => {
        try {
          const p = state.selectedProposal[t.id] || (state.proposals[t.id] || [])[0];
          if(!p) {
            console.warn("No proposal found for scheduled ticket:", t.id, "- ticket skipped");
            return null;
          }
          
          const event = {
            id: "ev_" + uuid(),
            title: `${t.customer_name || 'Onbekend'} — ${t.category || 'Algemeen'}`,
            client: t.customer_name || 'Onbekend', 
            address: t.address || 'Onbekend', 
            tech: p.tech?.name || "Onbekend",
            type: classifyType(t.category), 
            start: p.start, 
            end: p.end, 
            notes: t.description || ""
          };
          
          return toFcEvent(event);
        } catch (error) {
          console.warn("Error converting ticket to FC event:", t, error);
          return null;
        }
      })
      .filter(Boolean);
    
    console.log("Events from tickets:", fromTickets.length);
    
    // Combine all events
    let all = [...fromState, ...fromTickets];
    console.log("Total events before filtering:", all.length);

    // Apply filtering
    const tech = $("#dashTech")?.value || "";
    const q = ($("#dashSearch")?.value || "").toLowerCase();
    
    if(tech || q) {
      all = all.filter(ev => {
        try {
          const okTech = !tech || ev.extendedProps?.tech === tech;
          const hay = `${ev.title || ''} ${ev.extendedProps?.client || ''} ${ev.extendedProps?.address || ''}`.toLowerCase();
          const okSearch = !q || hay.includes(q);
          
          if(!okTech || !okSearch) {
            console.log("Event filtered:", ev.title, "tech:", okTech, "search:", okSearch);
          }
          
          return okTech && okSearch;
        } catch (error) {
          console.warn("Error filtering event:", ev, error);
          return false;
        }
      });
    }
    
    console.log("Events after filtering:", all.length);
    return all;
    
  } catch (error) {
    console.error("Critical error in buildCalendarEvents:", error);
    return [];
  }
}

function toFcEvent(ev){
  try {
    // Validate required fields
    if(!ev || !ev.id || !ev.title || !ev.start) {
      console.warn("Invalid event data:", ev);
      return null;
    }
    
    // Validate dates
    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
    
    if(isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      console.warn("Invalid event dates:", ev.start, ev.end);
      return null;
    }
    
    return { 
      id: ev.id, 
      title: ev.title, 
      start: start.toISOString(), 
      end: end.toISOString(),
      extendedProps: { 
        client: ev.client || 'Onbekend', 
        address: ev.address || 'Onbekend', 
        tech: ev.tech || 'Onbekend', 
        type: ev.type || 'Installation', 
        notes: ev.notes || "",
        originalStart: ev.start,
        originalEnd: ev.end
      } 
    };
  } catch (error) {
    console.error("Error converting to FC event:", ev, error);
    return null;
  }
}

function validateCalendarEvent(event) {
  try {
    if(!event || typeof event !== 'object') return false;
    if(!event.id || !event.title || !event.start) return false;
    
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
    
    if(isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return false;
    
    return true;
  } catch (error) {
    console.warn("Error validating calendar event:", error);
    return false;
  }
}

function updateDashboard(){
  try {
    console.log("Updating dashboard...");
    
    if(!calendar) {
      console.warn("Calendar not initialized, using fallback");
      showCalendarFallback();
      return;
    }
    
    // Check if calendar is properly initialized
    if(!calendar.getEvents || !calendar.removeAllEvents) {
      console.warn("Calendar not properly initialized, reinitializing...");
      initCalendar();
      return;
    }
    
    const events = buildCalendarEvents();
    console.log(`Built ${events.length} events for dashboard`);
    
    // Enhanced event update with better error handling
    try {
      // Remove all existing events safely
      calendar.removeAllEvents();
      console.log("Existing events removed");
      
      // Add new events with enhanced error handling
      if(events && events.length > 0) {
        let addedCount = 0;
        let errorCount = 0;
        
        events.forEach((event, index) => {
          try {
            // Validate event before adding
            if (validateCalendarEvent(event)) {
              calendar.addEvent(event);
              addedCount++;
            } else {
              console.warn("Invalid event skipped:", event.title);
              errorCount++;
            }
          } catch (error) {
            console.warn(`Error adding event ${index}:`, event.title, error);
            errorCount++;
          }
        });
        
        console.log(`Events added: ${addedCount}, errors: ${errorCount}`);
        
        if (errorCount > 0) {
          console.warn(`${errorCount} events failed to load`);
        }
      } else {
        console.log("No events to add");
      }
      
    } catch (error) {
      console.error("Error updating calendar events:", error);
      
      // Try alternative method
      try {
        console.log("Trying alternative event update method...");
        calendar.refetchEvents();
      } catch (altError) {
        console.error("Alternative method also failed:", altError);
        throw altError;
      }
    }
    
    // Update calendar size and layout
    try {
      calendar.updateSize();
      console.log("Calendar size updated");
    } catch (error) {
      console.warn("Error updating calendar size:", error);
    }
    
    // Force a re-render if needed
    setTimeout(() => {
      try {
        if (calendar && calendar.render) {
          calendar.render();
        }
      } catch (error) {
        console.warn("Error forcing calendar render:", error);
      }
    }, 50);
    
    // Save state
    saveState();
    
    console.log("Dashboard update completed successfully");
    
  } catch (error) {
    console.error("Critical error in updateDashboard:", error);
    toast("❌ Fout bij bijwerken dashboard");
    
    // Try to recover by reinitializing
    try {
      console.log("Attempting to recover by reinitializing calendar...");
      initCalendar();
    } catch (recoveryError) {
      console.error("Recovery failed, showing fallback:", recoveryError);
      showCalendarFallback();
    }
  }
}

/* -------------------- EVENT MODAL & EDITING -------------------- */
let currentEventId = null;

function showEventModal(event) {
  currentEventId = event.id;
  
  // Vul modal met event data
  $("#eventTitle").value = event.title || "";
  $("#eventStart").value = event.start ? new Date(event.start).toISOString().slice(0, 16) : "";
  $("#eventEnd").value = event.end ? new Date(event.end).toISOString().slice(0, 16) : "";
  $("#eventClient").value = event.extendedProps?.client || "";
  $("#eventAddress").value = event.extendedProps?.address || "";
  $("#eventNotes").value = event.extendedProps?.notes || "";
  
  // Vul monteur dropdown
  const techSelect = $("#eventTech");
  techSelect.innerHTML = '<option value="">Selecteer monteur</option>' + 
    state.technicians.map(t => `<option value="${t.name}" ${t.name === event.extendedProps?.tech ? 'selected' : ''}>${t.name}</option>`).join("");
  
  // Event listeners voor modal knoppen
  $("#saveEvent").onclick = saveEventChanges;
  $("#deleteEvent").onclick = deleteEvent;
  
  // Toon modal
  const modal = $("#eventModal");
  document.body.classList.add("modal-open");
  modal.addEventListener("close", () => document.body.classList.remove("modal-open"), {once: true});
  modal.showModal();
}

function saveEventChanges() {
  if(!currentEventId) return;
  
  // Vind het event in de state
  const eventIndex = state.calendarEvents.findIndex(e => e.id === currentEventId);
  if(eventIndex === -1) {
    toast("❌ Event niet gevonden");
    return;
  }
  
  // Update event data
  const updatedEvent = {
    ...state.calendarEvents[eventIndex],
    title: $("#eventTitle").value,
    start: new Date($("#eventStart").value).toISOString(),
    end: new Date($("#eventEnd").value).toISOString(),
    client: $("#eventClient").value,
    address: $("#eventAddress").value,
    tech: $("#eventTech").value,
    notes: $("#eventNotes").value
  };
  
  state.calendarEvents[eventIndex] = updatedEvent;
  saveState();
  
  // Update dashboard
  if(currentRoute === "dashboard") {
    if(calendar) {
      updateDashboard();
    } else {
      showCalendarFallback();
    }
  }
  
  $("#eventModal").close();
  toast("✅ Afspraak bijgewerkt");
}

function deleteEvent() {
  if(!currentEventId) return;
  
  if(!confirm("Weet je zeker dat je deze afspraak wilt verwijderen?")) {
    return;
  }
  
  // Verwijder event uit state
  state.calendarEvents = state.calendarEvents.filter(e => e.id !== currentEventId);
  saveState();
  
  // Update dashboard
  if(currentRoute === "dashboard") {
    if(calendar) {
      updateDashboard();
    } else {
      showCalendarFallback();
    }
  }
  
  $("#eventModal").close();
  toast("🗑️ Afspraak verwijderd");
}

function updateEventTime(event, newStart, newEnd) {
  try {
    // Find the event in the state
    const eventIndex = state.calendarEvents.findIndex(e => e.id === event.id);
    if(eventIndex === -1) {
      console.warn("Event not found in state:", event.id);
      return false;
    }
    
    // Enhanced validation
    if (!validateEventTimes(newStart, newEnd)) {
      console.error("Invalid date range:", newStart, newEnd);
      toast("❌ Ongeldige datum/tijd");
      return false;
    }
    
    // Check for conflicts
    if (hasEventConflict(event.id, newStart, newEnd)) {
      console.warn("Event conflict detected");
      toast("❌ Conflicterende afspraak");
      return false;
    }
    
    // Update times with enhanced persistence
    state.calendarEvents[eventIndex] = {
      ...state.calendarEvents[eventIndex],
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
      lastModified: new Date().toISOString()
    };
    
    // Add audit log
    logEventChange(event, 'time_update', {
      old_start: event.extendedProps?.originalStart || 'unknown',
      new_start: newStart.toISOString(),
      old_end: event.extendedProps?.originalEnd || 'unknown', 
      new_end: newEnd.toISOString()
    });
    
    saveState();
    console.log("Event time updated successfully:", event.id);
    return true;
    
  } catch (error) {
    console.error("Error updating event time:", error);
    toast("❌ Fout bij bijwerken afspraak");
    return false;
  }
}

// Validate event times with enhanced checks
function validateEventTimes(start, end) {
  if (!start || !end) return false;
  if (start >= end) return false;
  if (start < new Date('2020-01-01')) return false;
  if (end > new Date('2030-12-31')) return false;
  
  // Check work hours (8:00-17:00)
  const startHour = start.getHours();
  const endHour = end.getHours();
  if (startHour < 8 || endHour > 17) return false;
  
  // Check minimum duration (15 minutes)
  const duration = (end - start) / (1000 * 60);
  if (duration < 15) return false;
  
  return true;
}

// Check for event conflicts
function hasEventConflict(eventId, start, end) {
  return state.calendarEvents.some(event => {
    if (event.id === eventId) return false;
    
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Check for overlap
    return (start < eventEnd && end > eventStart);
  });
}

// Validate event drop
function validateEventDrop(event) {
  try {
    const start = event.start;
    const end = event.end;
    
    // Basic validation
    if (!validateEventTimes(start, end)) {
      return false;
    }
    
    // Check for conflicts
    if (hasEventConflict(event.id, start, end)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating event drop:", error);
    return false;
  }
}

// Validate event resize
function validateEventResize(event) {
  try {
    const start = event.start;
    const end = event.end;
    
    // Basic validation
    if (!validateEventTimes(start, end)) {
      return false;
    }
    
    // Check maximum duration (8 hours)
    const duration = (end - start) / (1000 * 60);
    if (duration > 480) {
      return false;
    }
    
    // Check for conflicts
    if (hasEventConflict(event.id, start, end)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating event resize:", error);
    return false;
  }
}

// Validate calendar event for display
function validateCalendarEvent(event) {
  try {
    // Check required fields
    if (!event.id || !event.title || !event.start || !event.end) {
      console.warn("Event missing required fields:", event);
      return false;
    }
    
    // Validate dates
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn("Event has invalid dates:", event);
      return false;
    }
    
    if (start >= end) {
      console.warn("Event has invalid time range:", event);
      return false;
    }
    
    // Check for reasonable date range
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 1, 0, 1);
    const maxDate = new Date(now.getFullYear() + 2, 11, 31);
    
    if (start < minDate || end > maxDate) {
      console.warn("Event outside reasonable date range:", event);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating calendar event:", error);
    return false;
  }
}

function updateRelatedTicket(event) {
  try {
    // Find related ticket if this event is from a scheduled ticket
    const ticket = state.tickets.find(t => {
      const p = state.selectedProposal[t.id] || (state.proposals[t.id] || [])[0];
      return p && event.title.includes(t.customer_name);
    });
    
    if(ticket) {
      // Update the proposal with new times
      const proposal = state.selectedProposal[ticket.id] || (state.proposals[ticket.id] || [])[0];
      if(proposal) {
        proposal.start = event.start.toISOString();
        proposal.end = event.end.toISOString();
        
        console.log("Updated related ticket proposal:", ticket.id);
        
        // Log the change
        logEventChange(event, 'ticket_proposal_update', {
          ticket_id: ticket.id,
          new_start: proposal.start,
          new_end: proposal.end
        });
      }
    }
  } catch (error) {
    console.warn("Error updating related ticket:", error);
  }
}

function logEventChange(event, action, details = {}) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event_id: event.id,
      action: action,
      user: currentAuth?.user || 'system',
      tenant: currentAuth?.orgSlug || 'demo',
      details: details
    };
    
    // Store in audit log (could be expanded to send to backend)
    if(!state.auditLog) state.auditLog = [];
    state.auditLog.push(logEntry);
    
    // Keep only last 100 entries
    if(state.auditLog.length > 100) {
      state.auditLog = state.auditLog.slice(-100);
    }
    
    console.log("Audit log:", logEntry);
  } catch (error) {
    console.warn("Error logging event change:", error);
  }
}
function debounce(fn,ms){ let h; return (...a)=>{ clearTimeout(h); h=setTimeout(()=>fn(...a),ms); }; }

/* -------------------- ONDERHOUD -------------------- */
function ensureMaintenanceUI(){
  // Event listeners toevoegen voor onderhoud knoppen
  const btnGenMaint = $("#btnGenMaint");
  const btnPlanAll = $("#btnPlanAll");
  
  if(btnGenMaint && !btnGenMaint._hasListener) {
    btnGenMaint.addEventListener("click", generateMaintenanceProposals);
    btnGenMaint._hasListener = true;
  }
  
  if(btnPlanAll && !btnPlanAll._hasListener) {
    btnPlanAll.addEventListener("click", planAllMaintenance);
    btnPlanAll._hasListener = true;
  }
  
  renderMaintenanceTable();
}
function generateMaintenanceProposals(){
  console.log("Genereren onderhoudsvoorstellen...");
  const now = new Date();
  
  if(!state.assets || state.assets.length === 0) {
    toast("❌ Geen assets gevonden voor onderhoudsplanning");
    return;
  }
  
  state.maintenancePlans = state.assets.map(a => {
    const plan = calcMaintenanceProposal(a, now);
    const tech = pickTechForCategory(a.category);
    
    const proposal = { 
      id: "mp_" + uuid(), 
      assetId: a.id, 
      client: a.client, 
      address: a.address, 
      system: a.system,
      lastService: a.lastService, 
      nextStart: plan.start.toISOString(), 
      nextEnd: plan.end.toISOString(),
      category: a.category, 
      tech: tech?.name || "Onbekend" 
    };
    
    console.log("Onderhoudsvoorstel:", proposal);
    return proposal;
  });
  
  saveState(); 
  renderMaintenanceTable(); 
  toast(`🛠️ ${state.maintenancePlans.length} onderhoudsvoorstellen gegenereerd`);
}
function renderMaintenanceTable(){
  const tb = $("#maintTable tbody"); 
  if(!tb) {
    console.warn("Maintenance table body niet gevonden");
    return; 
  }
  
  tb.innerHTML = "";
  
  if(!state.maintenancePlans || state.maintenancePlans.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" style="text-align:center;color:var(--txt-2);padding:20px;">Geen onderhoudsvoorstellen. Klik op "Voorstellen genereren" om te beginnen.</td>`;
    tb.appendChild(tr);
    return;
  }
  
  state.maintenancePlans.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.client}</td>
      <td>${p.address}</td>
      <td>${p.system}</td>
      <td>${fmtDate(p.lastService)}</td>
      <td>${fmtDate(p.nextStart)} ${new Date(p.nextStart).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}</td>
      <td>${p.tech}</td>
      <td><button class="btn small" data-id="${p.id}">Plan</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => planOneMaintenance(p.id));
    tb.appendChild(tr);
  });
  
  console.log(`${state.maintenancePlans.length} onderhoudsvoorstellen gerenderd`);
}
function planOneMaintenance(id){
  const p = (state.maintenancePlans || []).find(x => x.id === id); 
  if(!p) {
    console.warn("Onderhoudsvoorstel niet gevonden:", id);
    return;
  }
  
  // Zorg ervoor dat calendarEvents array bestaat
  if(!state.calendarEvents) {
    state.calendarEvents = [];
  }
  
  const event = { 
    id: "ev_" + uuid(), 
    title: `${p.client} — Onderhoud (${p.system})`,
    client: p.client, 
    address: p.address, 
    tech: p.tech, 
    type: "Maintenance",
    start: p.nextStart, 
    end: p.nextEnd, 
    notes: `Jaarlijks onderhoud ${p.system}` 
  };
  
  state.calendarEvents.push(event);
  state.maintenancePlans = state.maintenancePlans.filter(x => x.id !== id);
  
  saveState(); 
  renderMaintenanceTable(); 
  
  if(currentRoute === "dashboard") {
    if(calendar) {
      updateDashboard();
    } else {
      showCalendarFallback();
    }
  }
  
  console.log("Onderhoud gepland:", event);
  toast(`📅 Gepland: ${p.client} (${p.system})`);
}
function planAllMaintenance(){ (state.maintenancePlans||[]).slice().forEach(p=> planOneMaintenance(p.id)); }
function calcMaintenanceProposal(asset, now){
  console.log("Berekenen onderhoudsvoorstel voor:", asset.system, asset.category);
  
  const last = new Date(asset.lastService); 
  const oneYear = new Date(last); 
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  const overdue = now > oneYear;
  
  const slot = (d, h = 9, m = 120) => { 
    const s = new Date(d); 
    s.setHours(h, 0, 0, 0); 
    return {start: s, end: new Date(s.getTime() + m * 60000)}; 
  };
  
  const cat = (asset.category || "").toLowerCase(); 
  const sys = (asset.system || "").toLowerCase();

  // Vickers/Koeling: vóór winter (oktober)
  if(sys.includes("vickers") || cat.includes("koeling")){
    let target = new Date(now.getFullYear(), 9, 7); // 7 oktober
    if(now > target) {
      target = new Date(now.getFullYear() + 1, 9, 7); // volgend jaar oktober
    }
    const result = overdue ? 
      slot(new Date(now.getTime() + 3 * 86400000), 9, 120) : // binnen 3 dagen als achterstallig
      slot(target, 9, 120); // oktober als gepland
    console.log("Vickers/Koeling onderhoud:", result);
    return result;
  }
  
  // Airco: vóór zomer (mei)
  if(cat.includes("airco")){
    let target = new Date(now.getFullYear(), 4, 10); // 10 mei
    if(now > target) {
      target = new Date(now.getFullYear() + 1, 4, 10); // volgend jaar mei
    }
    const result = overdue ? 
      slot(new Date(now.getTime() + 7 * 86400000), 9, 120) : // binnen week als achterstallig
      slot(target, 9, 120); // mei als gepland
    console.log("Airco onderhoud:", result);
    return result;
  }
  
  // CV en andere: jaarlijks op basis van laatste onderhoud
  const result = overdue ? 
    slot(new Date(now.getTime() + 14 * 86400000), 9, 90) : // binnen 2 weken als achterstallig
    slot(oneYear, 9, 90); // jaarlijks
  console.log("Algemeen onderhoud:", result);
  return result;
}
function pickTechForCategory(category){
  const c=(category||"").toLowerCase();
  const cand = state.technicians.filter(t =>
    (t.skills||[]).some(s=>s.toLowerCase().includes("onderhoud")) ||
    (c.includes("airco") && (t.skills||[]).some(s=> s.toLowerCase().includes("airco"))) ||
    (c.includes("cv") && (t.skills||[]).some(s=> s.toLowerCase().includes("cv")))
  );
  return cand[0] || state.technicians[0];
}

/* -------------------- INIT PLANNER -------------------- */
renderBoard();

/* -------------------- DEBUG HELPER -------------------- */
// Functie om localStorage te resetten (voor testing)
function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// Functie om onderhoudsvoorstellen te genereren
function generateMaintenanceNow() {
  generateMaintenanceProposals();
}

// Functie om demo events toe te voegen
function addDemoEvents() {
  if(!state.calendarEvents) {
    state.calendarEvents = [];
  }
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const dayAfter = new Date(now.getTime() + 2 * 86400000);
  
  const demoEvents = [
    {
      id: "ev_demo1",
      title: "VvE Parkzicht — CV-onderhoud",
      client: "VvE Parkzicht",
      address: "Kade 12, 1013 AA Amsterdam",
      tech: "Sanne Peters",
      type: "Maintenance",
      start: new Date(tomorrow.getTime() + 9 * 3600000).toISOString(),
      end: new Date(tomorrow.getTime() + 10 * 3600000).toISOString(),
      notes: "Jaarlijkse ketelservice toren A."
    },
    {
      id: "ev_demo2", 
      title: "De Boer Makelaardij — Elektra",
      client: "De Boer Makelaardij",
      address: "Markt 7, 3511 AA Utrecht",
      tech: "Ahmed Ouazani",
      type: "Installation",
      start: new Date(dayAfter.getTime() + 13 * 3600000).toISOString(),
      end: new Date(dayAfter.getTime() + 14.5 * 3600000).toISOString(),
      notes: "Groepenkast naloop, verschillende storingen."
    }
  ];
  
  state.calendarEvents.push(...demoEvents);
  saveState();
  
  if(currentRoute === "dashboard") {
    if(calendar) {
      updateDashboard();
    } else {
      showCalendarFallback();
    }
  }
  
  console.log("Demo events toegevoegd:", demoEvents.length);
  toast("📅 Demo events toegevoegd");
}

// Voeg functies toe aan window voor debugging
window.resetDemoData = resetDemoData;
window.generateMaintenanceNow = generateMaintenanceNow;
window.addDemoEvents = addDemoEvents;

// Test functie voor dashboard
window.testDashboard = function() {
  console.log("Testing dashboard...");
  console.log("Current route:", currentRoute);
  console.log("Calendar instance:", calendar);
  console.log("State calendarEvents:", state.calendarEvents);
  console.log("FullCalendar available:", typeof FullCalendar !== 'undefined');
  
  if(currentRoute !== "dashboard") {
    go("dashboard");
  } else {
    updateDashboard();
  }
};

// Functie om FullCalendar status te controleren
window.checkFullCalendar = function() {
  console.log("FullCalendar status check:");
  console.log("- FullCalendar available:", typeof FullCalendar !== 'undefined');
  console.log("- FullCalendar version:", typeof FullCalendar !== 'undefined' ? FullCalendar.version : 'N/A');
  console.log("- Calendar element:", document.getElementById("calendar"));
  console.log("- Calendar instance:", calendar);
};

// Functie om FullCalendar handmatig te laden
window.loadFullCalendar = function() {
  if (typeof FullCalendar !== 'undefined') {
    console.log("FullCalendar is al beschikbaar");
    return;
  }
  
  console.log("Loading FullCalendar manually...");
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/6.1.8/main.min.js';
  script.onload = function() {
    console.log("FullCalendar loaded successfully");
    if (currentRoute === "dashboard") {
      ensureDashboard();
    }
  };
  script.onerror = function() {
    console.error("Failed to load FullCalendar");
  };
  document.head.appendChild(script);
};

/* -------------------- INSTALLATIONS MANAGEMENT -------------------- */

function ensureInstallations() {
  console.log("Setup installaties...");
  
  // Ensure installations exists in state
  if (!state.installations) {
    state.installations = [];
    saveState();
  }
  
  setupInstallationListeners();
  updateInstallationFilterDropdown();
  renderInstallationsTable();
  
  // Auto-sync installations with maintenance on load
  syncInstallationsWithMaintenance();
}

function setupInstallationListeners() {
  const saveBtn = $("#saveInstallation");
  const searchInput = $("#installationSearch");
  const filterSelect = $("#installationFilter");
  
  if (saveBtn && !saveBtn._hasListener) {
    saveBtn.addEventListener("click", saveInstallation);
    saveBtn._hasListener = true;
  }
  
  if (searchInput && !searchInput._hasListener) {
    searchInput.addEventListener("input", debounce(() => {
      renderInstallationsTable();
    }, 300));
    searchInput._hasListener = true;
  }
  
  if (filterSelect && !filterSelect._hasListener) {
    filterSelect.addEventListener("change", () => {
      renderInstallationsTable();
    });
    filterSelect._hasListener = true;
  }
}

function showInstallationModal(installationId = null) {
  if (!requirePermission('edit_installations')) return;
  
  const modal = $("#installationModal");
  const title = $("#installationModalTitle");
  
  if (!modal) return;
  
  // Update installation types dropdown
  updateInstallationTypeDropdown();
  
  if (installationId) {
    const installation = state.installations.find(i => i.id === installationId);
    if (installation) {
      title.textContent = "Installatie Bewerken";
      
      // Fill form with existing data
      $("#instClient").value = installation.client || '';
      $("#instAddress").value = installation.address || '';
      $("#instType").value = installation.type || '';
      $("#instModel").value = installation.model || '';
      $("#instInstallDate").value = installation.installDate || '';
      $("#instLastMaintenance").value = installation.lastMaintenance || '';
      $("#instContractType").value = installation.contractType || '';
      $("#instContractEnd").value = installation.contractEnd || '';
      $("#instContractValue").value = installation.contractValue || '';
      $("#instNotes").value = installation.notes || '';
      
      // Update maintenance status display
      updateMaintenanceStatusDisplay(installation);
      
      // Store ID for updating
      modal.dataset.editId = installationId;
    }
  } else {
    title.textContent = "Nieuwe Installatie";
    
    // Clear form
    const form = modal.querySelector("form");
    if (form) form.reset();
    delete modal.dataset.editId;
  }
  
  modal.showModal();
}

function saveInstallation() {
  if (!requirePermission('edit_installations')) return;
  
  const modal = $("#installationModal");
  const client = $("#instClient").value.trim();
  const address = $("#instAddress").value.trim();
  const type = $("#instType").value;
  
  if (!client || !address || !type) {
    alert("Vul alle verplichte velden in (*)");
    return;
  }
  
  const installationData = {
    id: modal.dataset.editId || uuid(),
    client,
    address,
    type,
    model: $("#instModel").value.trim(),
    installDate: $("#instInstallDate").value,
    lastMaintenance: $("#instLastMaintenance").value,
    contractType: $("#instContractType").value,
    contractEnd: $("#instContractEnd").value,
    contractValue: $("#instContractValue").value ? parseFloat($("#instContractValue").value) : null,
    notes: $("#instNotes").value.trim(),
    createdAt: new Date().toISOString()
  };
  
  if (modal.dataset.editId) {
    // Update existing
    const index = state.installations.findIndex(i => i.id === modal.dataset.editId);
    if (index !== -1) {
      state.installations[index] = { ...state.installations[index], ...installationData };
    }
  } else {
    // Add new
    state.installations.push(installationData);
  }
  
  saveState();
  renderInstallationsTable();
  
  // Auto-sync with maintenance when installation is saved
  syncInstallationsWithMaintenance();
  
  modal.close();
}

function deleteInstallation(installationId) {
  const installation = state.installations.find(i => i.id === installationId);
  if (!installation) return;
  
  if (confirm(`Weet je zeker dat je de installatie "${installation.type} bij ${installation.client}" wilt verwijderen?`)) {
    state.installations = state.installations.filter(i => i.id !== installationId);
    saveState();
    renderInstallationsTable();
  }
}

function renderInstallationsTable() {
  const container = $("#installationsTable");
  if (!container) return;
  
  let installations = [...state.installations];
  
  // Apply filters
  const searchTerm = $("#installationSearch")?.value.toLowerCase() || '';
  const typeFilter = $("#installationFilter")?.value || '';
  
  if (searchTerm) {
    installations = installations.filter(inst => 
      inst.client.toLowerCase().includes(searchTerm) ||
      inst.address.toLowerCase().includes(searchTerm) ||
      inst.type.toLowerCase().includes(searchTerm) ||
      (inst.model && inst.model.toLowerCase().includes(searchTerm))
    );
  }
  
  if (typeFilter) {
    installations = installations.filter(inst => inst.type === typeFilter);
  }
  
  if (installations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgb(var(--txt-3));">
        <p>📋 Geen installaties gevonden</p>
        <button class="btn primary" onclick="showInstallationModal()">Voeg eerste installatie toe</button>
      </div>
    `;
    return;
  }
  
  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Klant</th>
          <th>Adres</th>
          <th>Type</th>
          <th>Model</th>
          <th>Geïnstalleerd</th>
          <th>Laatste Onderhoud</th>
          <th>Contract</th>
          <th>Onderhoud Status</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        ${installations.map(inst => {
          const contractStatus = getContractStatus(inst);
          const maintenanceStatus = getMaintenanceStatus(inst);
          return `
            <tr>
              <td><strong>${inst.client}</strong></td>
              <td>${inst.address}</td>
              <td><span class="badge" style="background: ${getTypeColor(inst.type)}">${inst.type}</span></td>
              <td>${inst.model || '-'}</td>
              <td>${inst.installDate ? new Date(inst.installDate).toLocaleDateString('nl-NL') : '-'}</td>
              <td>${inst.lastMaintenance ? new Date(inst.lastMaintenance).toLocaleDateString('nl-NL') : '-'}</td>
              <td>
                ${contractStatus.html}
                ${inst.contractValue ? `<br><small style="color: rgb(var(--brand-1)); font-weight: 600;">€${parseInt(inst.contractValue).toLocaleString('nl-NL')}/jaar</small>` : ''}
              </td>
              <td>
                ${maintenanceStatus.html}
              </td>
              <td>
                <button class="btn small" onclick="showInstallationModal('${inst.id}')" title="Bewerken">✏️</button>
                <button class="btn small ghost" onclick="deleteInstallation('${inst.id}')" title="Verwijderen">🗑️</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
  
  // Update contract summary
  renderContractSummary(installations);
}

function getTypeColor(type) {
  // Use dynamic installation types if available
  if (state.installationTypes) {
    const typeConfig = state.installationTypes.find(t => t.name === type);
    if (typeConfig) {
      // Convert hex to rgba
      const hex = typeConfig.color;
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    }
  }
  
  // Fallback to default colors
  const colors = {
    'Vickers': 'rgba(59, 130, 246, 0.8)', // Blue
    'Airco': 'rgba(16, 185, 129, 0.8)',   // Green
    'Ketel': 'rgba(245, 101, 101, 0.8)',  // Red
    'Ventilatie': 'rgba(139, 92, 246, 0.8)', // Purple
    'Elektra': 'rgba(251, 191, 36, 0.8)'  // Yellow
  };
  return colors[type] || 'rgba(156, 163, 175, 0.8)';
}

function getContractStatus(installation) {
  if (!installation.contractType) {
    return { 
      html: '<span style="color: rgb(var(--txt-3));">⚪ Geen contract</span>', 
      status: 'none' 
    };
  }
  
  if (!installation.contractEnd) {
    return { 
      html: `<span style="color: rgb(var(--ok)); font-weight: 600;">🟢 ${installation.contractType}</span>`, 
      status: 'active' 
    };
  }
  
  const endDate = new Date(installation.contractEnd);
  const today = new Date();
  const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilEnd < 0) {
    return { 
      html: `<span style="color: rgb(var(--err)); font-weight: 600;">🔴 ${installation.contractType}<br><small>Verlopen sinds ${Math.abs(daysUntilEnd)} dagen</small></span>`, 
      status: 'expired' 
    };
  } else if (daysUntilEnd <= 30) {
    return { 
      html: `<span style="color: rgb(var(--warn)); font-weight: 600;">🟡 ${installation.contractType}<br><small>Verloopt over ${daysUntilEnd} dagen</small></span>`, 
      status: 'expiring' 
    };
  } else {
    return { 
      html: `<span style="color: rgb(var(--ok)); font-weight: 600;">🟢 ${installation.contractType}<br><small>Tot ${endDate.toLocaleDateString('nl-NL')}</small></span>`, 
      status: 'active' 
    };
  }
}

/* -------------------- EXCEL IMPORT/EXPORT -------------------- */

function downloadExcelTemplate() {
  // Create Excel template data
  const templateData = [
    ['Klant', 'Adres', 'Type', 'Model', 'Installatiedatum', 'Laatste Onderhoud', 'Contract Type', 'Contract tot', 'Contractwaarde', 'Opmerkingen'],
    ['Voorbeeld BV', 'Straat 1, 1234 AB Plaats', 'Airco', 'Daikin VRV-IV', '2020-01-15', '2024-01-15', 'Uitgebreid', '2025-12-31', '350', 'Toegangscode: 1234'],
    ['Test Bedrijf', 'Laan 5, 5678 CD Stad', 'Vickers', 'Vickers Chiller 100kW', '2019-05-20', '2023-11-20', 'Basis', '2024-12-31', '200', 'Contact: Jan (06-12345678)']
  ];
  
  // Convert to CSV format (Excel compatible)
  const csvContent = templateData.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  
  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'PlanWise_Installaties_Template.csv';
  link.click();
  
  // Show instructions
  setTimeout(() => {
    alert('Excel template gedownload!\n\nInstructies:\n1. Open het bestand in Excel\n2. Vul je installatie gegevens in\n3. Sla op als Excel bestand (.xlsx)\n4. Gebruik "Importeer Excel" om te uploaden');
  }, 500);
}

function handleExcelImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
    alert('Alleen Excel bestanden (.xlsx, .xls) en CSV bestanden zijn toegestaan');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let data;
      
      if (file.name.match(/\.csv$/i)) {
        // Parse CSV
        data = parseCSV(e.target.result);
      } else {
        // For .xlsx/.xls files, we'll need a library like SheetJS
        // For now, show message to user to save as CSV
        alert('Voor Excel bestanden (.xlsx/.xls):\n\n1. Open het bestand in Excel\n2. Ga naar Bestand > Opslaan als\n3. Kies "CSV (door komma\'s gescheiden)" als bestandstype\n4. Sla op en importeer het CSV bestand\n\nOf gebruik de CSV template die je kunt downloaden.');
        return;
      }
      
      importInstallationsData(data);
      
    } catch (error) {
      console.error('Import error:', error);
      alert('Er is een fout opgetreden bij het importeren van het bestand. Controleer of het bestand de juiste indeling heeft.');
    }
  };
  
  if (file.name.match(/\.csv$/i)) {
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.readAsArrayBuffer(file);
  }
  
  // Reset file input
  event.target.value = '';
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const data = [];
  
  for (const line of lines) {
    const row = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    row.push(current.trim());
    data.push(row);
  }
  
  return data;
}

function importInstallationsData(data) {
  if (data.length < 2) {
    alert('Het bestand bevat geen data om te importeren.');
    return;
  }
  
  // Skip header row
  const rows = data.slice(1);
  let imported = 0;
  let errors = [];
  
  rows.forEach((row, index) => {
    try {
      // Validate required fields
      const client = row[0]?.trim();
      const address = row[1]?.trim();
      const type = row[2]?.trim();
      
      if (!client || !address || !type) {
        errors.push(`Rij ${index + 2}: Klant, Adres en Type zijn verplicht`);
        return;
      }
      
      // Validate type
      const validTypes = ['Vickers', 'Airco', 'Ketel', 'Ventilatie', 'Elektra'];
      if (!validTypes.includes(type)) {
        errors.push(`Rij ${index + 2}: Ongeldig type "${type}". Geldige types: ${validTypes.join(', ')}`);
        return;
      }
      
      const installation = {
        id: uuid(),
        client,
        address,
        type,
        model: row[3]?.trim() || '',
        installDate: parseDate(row[4]) || '',
        lastMaintenance: parseDate(row[5]) || '',
        contractType: row[6]?.trim() || '',
        contractEnd: parseDate(row[7]) || '',
        contractValue: row[8]?.trim() ? parseFloat(row[8].trim()) : null,
        notes: row[9]?.trim() || '',
        createdAt: new Date().toISOString()
      };
      
      state.installations.push(installation);
      imported++;
      
    } catch (error) {
      errors.push(`Rij ${index + 2}: ${error.message}`);
    }
  });
  
  saveState();
  renderInstallationsTable();
  
  // Show results
  let message = `Import voltooid!\n\n✅ ${imported} installaties geïmporteerd`;
  if (errors.length > 0) {
    message += `\n\n❌ ${errors.length} fouten:\n${errors.slice(0, 5).join('\n')}`;
    if (errors.length > 5) {
      message += `\n... en ${errors.length - 5} meer`;
    }
  }
  
  alert(message);
}

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  
  // Try different date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // D-M-YYYY
  ];
  
  const cleaned = dateStr.trim();
  
  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      let year, month, day;
      
      if (format.toString().includes('(\\d{4})')) {
        // YYYY-MM-DD format
        [, year, month, day] = match;
      } else {
        // DD-MM-YYYY or DD/MM/YYYY format
        [, day, month, year] = match;
      }
      
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    }
  }
  
  return '';
}

/* -------------------- SUPER ADMIN FUNCTIONALITY -------------------- */

function showSuperAdminInterface() {
  console.log("Initializing Super Admin interface...");
  
  // Go to super admin dashboard
  go('superadmin');
  
  // Load all platform data
  loadPlatformData();
}

function loadPlatformData() {
  console.log("Loading platform data...");
  
  renderPlatformStats();
  renderTenantsTable();
  renderAllUsersTable();
  renderSystemLogs();
}

function renderPlatformStats() {
  const container = $("#platformStats");
  if (!container) return;
  
  const tenants = getAllTenants();
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.users.length, 0);
  const activeTenants = tenants.filter(t => t.info.plan !== 'suspended').length;
  const trialTenants = tenants.filter(t => t.info.plan === 'trial').length;
  
  const statsHTML = `
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-1), 0.1), rgba(var(--brand-1), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-1), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">🏢</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--brand-1));">${tenants.length}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Totaal Organisaties</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--ok), 0.1), rgba(var(--ok), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--ok), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">✅</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--ok));">${activeTenants}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Actieve Organisaties</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--warn), 0.1), rgba(var(--warn), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--warn), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">⏰</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--warn));">${trialTenants}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Trial Organisaties</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-2), 0.1), rgba(var(--brand-2), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-2), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">👥</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--brand-2));">${totalUsers}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Totaal Gebruikers</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--txt-1), 0.1), rgba(var(--txt-1), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--txt-1), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">💾</div>
      <div style="font-size: 1.2em; font-weight: 600; color: rgb(var(--txt-1));">${formatBytes(getStorageUsage())}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Storage Gebruik</div>
    </div>
  `;
  
  container.innerHTML = statsHTML;
}

function getAllTenants() {
  const tenants = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('planwise_tenant_')) {
      try {
        const tenantData = JSON.parse(localStorage.getItem(key));
        const tenantKey = key.replace('planwise_tenant_', '');
        tenants.push({
          key: tenantKey,
          info: tenantData.info,
          users: tenantData.users,
          created: tenantData.info.created,
          lastActive: tenantData.lastActive || tenantData.info.created
        });
      } catch (e) {
        console.warn(`Failed to parse tenant data for ${key}:`, e);
      }
    }
  }
  
  return tenants.sort((a, b) => new Date(b.created) - new Date(a.created));
}

function renderTenantsTable() {
  const container = $("#tenantsTable");
  if (!container) return;
  
  const tenants = getAllTenants();
  
  if (tenants.length === 0) {
    container.innerHTML = '<p class="muted">Nog geen organisaties geregistreerd.</p>';
    return;
  }
  
  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Organisatie</th>
          <th>Login-slug</th>
          <th>Branche</th>
          <th>Plan</th>
          <th>Gebruikers</th>
          <th>Aangemaakt</th>
          <th>Laatste Activiteit</th>
          <th>Storage</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        ${tenants.map(tenant => {
          const storageKey = `planwise_${tenant.key}_v4`;
          const tenantStorage = localStorage.getItem(storageKey);
          const storageSize = tenantStorage ? formatBytes(tenantStorage.length * 2) : '0 B'; // Rough estimate
          
          return `
            <tr>
              <td><strong>${tenant.info.company}</strong></td>
              <td><code style="background: rgba(var(--bg-2), 0.5); padding: 2px 6px; border-radius: 4px; font-size: 0.85em;">${tenant.key}</code></td>
              <td>${tenant.info.industry || 'Onbekend'}</td>
              <td><span class="badge" style="background: ${getPlanColor(tenant.info.plan)}">${tenant.info.plan}</span></td>
              <td>${tenant.users.length}</td>
              <td>${new Date(tenant.created).toLocaleDateString('nl-NL')}</td>
              <td>${new Date(tenant.lastActive).toLocaleDateString('nl-NL')}</td>
              <td>${storageSize}</td>
              <td>
                <button class="btn small" onclick="showTenantDetails('${tenant.key}')" title="Details">👁️</button>
                <button class="btn small" onclick="impersonateTenant('${tenant.key}')" title="Impersonate">👤</button>
                <button class="btn small ghost" onclick="suspendTenant('${tenant.key}')" title="Suspend">🚫</button>
                <button class="btn small danger" onclick="deleteTenantDirect('${tenant.key}')" title="Verwijder Organisatie">🗑️</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

function renderAllUsersTable() {
  const container = $("#allUsersTable");
  if (!container) return;
  
  const tenants = getAllTenants();
  const allUsers = [];
  
  tenants.forEach(tenant => {
    tenant.users.forEach(user => {
      allUsers.push({
        ...user,
        tenantKey: tenant.key,
        tenantName: tenant.info.company
      });
    });
  });
  
  if (allUsers.length === 0) {
    container.innerHTML = '<p class="muted">Geen gebruikers gevonden.</p>';
    return;
  }
  
  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Gebruikersnaam</th>
          <th>Email</th>
          <th>Organisatie</th>
          <th>Rol</th>
          <th>Aangemaakt</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        ${allUsers.map(user => `
          <tr>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td>${user.tenantName}</td>
            <td><span class="badge" style="background: ${getRoleColor(user.role)}">${user.role}</span></td>
            <td>${new Date(user.created).toLocaleDateString('nl-NL')}</td>
            <td>
              <button class="btn small" onclick="resetUserPassword('${user.tenantKey}', '${user.username}')" title="Reset Password">🔑</button>
              <button class="btn small ghost" onclick="suspendUser('${user.tenantKey}', '${user.username}')" title="Suspend User">🚫</button>
              <button class="btn small danger" onclick="deleteUserDirect('${user.tenantKey}', '${user.username}')" title="Verwijder Gebruiker">🗑️</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

function renderSystemLogs() {
  const container = $("#systemLogs");
  if (!container) return;
  
  // Mock system logs - in production, these would come from a logging service
  const logs = [
    { time: new Date(), level: 'INFO', message: 'Super Admin logged in', user: 'superadmin' },
    { time: new Date(Date.now() - 300000), level: 'INFO', message: 'Platform statistics refreshed', user: 'system' },
    { time: new Date(Date.now() - 600000), level: 'WARN', message: 'High storage usage detected for tenant: testbedrijf', user: 'system' },
    { time: new Date(Date.now() - 900000), level: 'INFO', message: 'New tenant registered: HVAC Solutions', user: 'system' },
    { time: new Date(Date.now() - 1200000), level: 'ERROR', message: 'Failed login attempt for tenant: nonexistent', user: 'unknown' }
  ];
  
  const logsHTML = logs.map(log => {
    const levelColor = {
      'INFO': 'rgb(var(--ok))',
      'WARN': 'rgb(var(--warn))',
      'ERROR': 'rgb(var(--err))'
    }[log.level] || 'rgb(var(--txt-2))';
    
    return `
      <div style="margin: 4px 0; padding: 4px 8px; border-left: 3px solid ${levelColor};">
        <span style="color: rgb(var(--txt-3));">[${log.time.toLocaleTimeString('nl-NL')}]</span>
        <span style="color: ${levelColor}; font-weight: 600;">${log.level}</span>
        <span style="color: rgb(var(--txt-1));">${log.message}</span>
        <span style="color: rgb(var(--txt-3)); font-size: 0.85em;">(${log.user})</span>
      </div>
    `;
  }).join('');
  
  container.innerHTML = logsHTML;
}

function showTenantDetails(tenantKey) {
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  const tenantState = localStorage.getItem(`planwise_${tenantKey}_v4`);
  
  if (!tenantData) return;
  
  const modal = $("#tenantDetailModal");
  const title = $("#tenantDetailTitle");
  const content = $("#tenantDetailContent");
  
  if (!modal || !title || !content) return;
  
  title.textContent = `${tenantData.info.company} - Details`;
  
  let stateData = {};
  try {
    stateData = tenantState ? JSON.parse(tenantState) : {};
  } catch (e) {
    console.warn('Failed to parse tenant state:', e);
  }
  
  const detailHTML = `
    <div class="form">
      <h4>Organisatie Informatie</h4>
      <div class="field-inline">
        <div class="field">
                      <label>Organisatie Naam</label>
            <input type="text" value="${tenantData.info.company}" readonly>
        </div>
        <div class="field">
          <label>Branche</label>
          <input type="text" value="${tenantData.info.industry || 'Onbekend'}" readonly>
        </div>
      </div>
      <div class="field-inline">
        <div class="field">
          <label>Plan</label>
          <input type="text" value="${tenantData.info.plan}" readonly>
        </div>
        <div class="field">
          <label>Aangemaakt</label>
          <input type="text" value="${new Date(tenantData.info.created).toLocaleString('nl-NL')}" readonly>
        </div>
      </div>
      
      <h4>Gebruikers (${tenantData.users.length})</h4>
      ${tenantData.users.map(user => `
        <div style="padding: 8px; margin: 4px 0; background: rgba(255,255,255,0.05); border-radius: 4px;">
          <strong>${user.username}</strong> (${user.email}) - ${user.role}
          <br><small>Aangemaakt: ${new Date(user.created).toLocaleString('nl-NL')}</small>
        </div>
      `).join('')}
      
      <h4>Data Overzicht</h4>
      <div class="field-inline">
        <div class="field">
          <label>Installaties</label>
          <input type="text" value="${stateData.installations?.length || 0}" readonly>
        </div>
        <div class="field">
          <label>Tickets</label>
          <input type="text" value="${stateData.tickets?.length || 0}" readonly>
        </div>
      </div>
      <div class="field-inline">
        <div class="field">
          <label>Calendar Events</label>
          <input type="text" value="${stateData.calendarEvents?.length || 0}" readonly>
        </div>
        <div class="field">
          <label>Installation Types</label>
          <input type="text" value="${stateData.installationTypes?.length || 0}" readonly>
        </div>
      </div>
    </div>
  `;
  
  content.innerHTML = detailHTML;
  
  // Store current tenant key for actions
  modal.dataset.currentTenant = tenantKey;
  
  modal.showModal();
}

function getPlanColor(plan) {
  const colors = {
    'trial': 'rgba(251, 191, 36, 0.8)',     // Yellow
    'active': 'rgba(16, 185, 129, 0.8)',   // Green
    'suspended': 'rgba(245, 101, 101, 0.8)', // Red
    'enterprise': 'rgba(139, 92, 246, 0.8)' // Purple
  };
  return colors[plan] || 'rgba(156, 163, 175, 0.8)';
}

function getRoleColor(role) {
  const colors = {
    'admin': 'rgba(245, 101, 101, 0.8)',    // Red
    'user': 'rgba(59, 130, 246, 0.8)',     // Blue
    'viewer': 'rgba(156, 163, 175, 0.8)'   // Gray
  };
  return colors[role] || 'rgba(156, 163, 175, 0.8)';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStorageUsage() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('planwise_')) {
      const value = localStorage.getItem(key);
      total += value ? value.length * 2 : 0; // Rough estimate (UTF-16)
    }
  }
  return total;
}

function refreshTenantData() {
  loadPlatformData();
  alert('Platform data ververst!');
}

function exportAllData() {
  const allData = {
    exported: new Date().toISOString(),
    tenants: [],
    platformStats: {
      totalTenants: 0,
      totalUsers: 0,
      storageUsage: getStorageUsage()
    }
  };
  
  const tenants = getAllTenants();
  tenants.forEach(tenant => {
    const tenantState = localStorage.getItem(`planwise_${tenant.key}_v4`);
    allData.tenants.push({
      info: tenant.info,
      users: tenant.users,
      state: tenantState ? JSON.parse(tenantState) : {}
    });
  });
  
  allData.platformStats.totalTenants = tenants.length;
  allData.platformStats.totalUsers = tenants.reduce((sum, t) => sum + t.users.length, 0);
  
  // Download as JSON
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `planwise-platform-export-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  alert('Platform data geëxporteerd!');
}

function showPlatformSettingsModal() {
  const modal = $("#platformSettingsModal");
  if (modal) {
    // Load current settings
    loadPlatformSettings();
    modal.showModal();
  }
}

function loadPlatformSettings() {
  const settings = JSON.parse(localStorage.getItem('planwise_platform_settings') || '{}');
  
  $("#platformName").value = settings.platformName || 'PlanWise';
  $("#maxTenants").value = settings.maxTenants || 100;
  $("#trialDays").value = settings.trialDays || 30;
  $("#allowRegistration").checked = settings.allowRegistration !== false;
  $("#enableBilling").checked = settings.enableBilling !== false;
  $("#enableAnalytics").checked = settings.enableAnalytics !== false;
  $("#maintenanceMode").checked = settings.maintenanceMode || false;
  $("#maintenanceMessage").value = settings.maintenanceMessage || '';
}

function savePlatformSettings() {
  const settings = {
    platformName: $("#platformName").value,
    maxTenants: parseInt($("#maxTenants").value),
    trialDays: parseInt($("#trialDays").value),
    allowRegistration: $("#allowRegistration").checked,
    enableBilling: $("#enableBilling").checked,
    enableAnalytics: $("#enableAnalytics").checked,
    maintenanceMode: $("#maintenanceMode").checked,
    maintenanceMessage: $("#maintenanceMessage").value,
    updatedAt: new Date().toISOString()
  };
  
  localStorage.setItem('planwise_platform_settings', JSON.stringify(settings));
  $("#platformSettingsModal").close();
  alert('Platform instellingen opgeslagen!');
}

function impersonateTenant(tenantKey) {
  if (!tenantKey) {
    const modal = $("#tenantDetailModal");
    tenantKey = modal.dataset.currentTenant;
  }
  
  if (!tenantKey) return;
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData || tenantData.users.length === 0) {
    alert('Geen gebruikers gevonden voor deze tenant.');
    return;
  }
  
  if (confirm(`Weet je zeker dat je wilt inloggen als ${tenantData.info.company}?`)) {
    // Set auth state for tenant
    const authData = {
      orgSlug: tenantKey,
      role: tenantData.users[0].role || 'viewer',
      user: tenantData.users[0].username
    };
    
    if (Auth.set(authData)) {
      // Close any open modals
      $("#tenantDetailModal").close();
      
      // Reload to apply new auth state
      location.reload();
      
      alert(`Je bent nu ingelogd als ${tenantData.info.company}. Gebruik 'Uitloggen' om terug te keren naar Super Admin.`);
    } else {
      alert('Fout bij het inloggen als tenant');
    }
  }
}

function suspendTenant(tenantKey) {
  if (!tenantKey) {
    const modal = $("#tenantDetailModal");
    tenantKey = modal.dataset.currentTenant;
  }
  
  if (!tenantKey) return;
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) return;
  
  if (confirm(`Weet je zeker dat je ${tenantData.info.company} wilt suspenderen?`)) {
    tenantData.info.plan = 'suspended';
    tenantData.suspendedAt = new Date().toISOString();
    
    localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
    
    $("#tenantDetailModal").close();
    loadPlatformData();
    
    alert(`${tenantData.info.company} is gesuspendeerd.`);
  }
}

function deleteTenant() {
  const modal = $("#tenantDetailModal");
  const tenantKey = modal.dataset.currentTenant;
  
  if (!tenantKey) return;
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) return;
  
  if (confirm(`WAARSCHUWING: Je gaat ${tenantData.info.company} permanent verwijderen.\n\nAlle data wordt gewist en kan niet worden hersteld.\n\nWeet je dit zeker?`)) {
    // Remove tenant and all associated data
    localStorage.removeItem(`planwise_tenant_${tenantKey}`);
    localStorage.removeItem(`planwise_${tenantKey}_v4`);
    
    modal.close();
    loadPlatformData();
    
    alert(`${tenantData.info.company} is permanent verwijderd.`);
  }
}

function deleteTenantDirect(tenantKey) {
  if (!tenantKey) return;
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) return;
  
  if (confirm(`WAARSCHUWING: Je gaat ${tenantData.info.company} permanent verwijderen.\n\nAlle data wordt gewist en kan niet worden hersteld.\n\nWeet je dit zeker?`)) {
    // Remove tenant and all associated data
    localStorage.removeItem(`planwise_tenant_${tenantKey}`);
    localStorage.removeItem(`planwise_${tenantKey}_v4`);
    
    // Refresh the platform data to update the tables
    loadPlatformData();
    
    alert(`${tenantData.info.company} is permanent verwijderd.`);
  }
}

/* -------------------- USER CREATION & MANAGEMENT -------------------- */

function showCreateUserModal() {
  const modal = $("#createUserModal");
  if (!modal) return;
  
  // Clear form
  $("#newUserTenant").value = '';
  $("#newUserUsername").value = '';
  $("#newUserEmail").value = '';
  $("#newUserPassword").value = '';
  $("#newUserRole").value = '';
  $("#newUserNotes").value = '';
  
  // Populate tenant dropdown
  const tenants = getAllTenants();
  const optionsHTML = '<option value="">Selecteer organisatie</option>' + 
    tenants.map(tenant => `<option value="${tenant.key}">${tenant.info.company}</option>`).join('');
  $("#newUserTenant").innerHTML = optionsHTML;
  
  modal.showModal();
}

function closeCreateUserModal() {
  const modal = $("#createUserModal");
  if (modal) {
    modal.close();
  }
}

function closeCreateOrganizationModal() {
  const modal = $("#createOrganizationModal");
  if (modal) {
    modal.close();
  }
}

function createNewUser() {
  const tenantKey = $("#newUserTenant").value;
  const username = $("#newUserUsername").value.trim();
  const email = $("#newUserEmail").value.trim();
  const password = $("#newUserPassword").value.trim();
  const role = $("#newUserRole").value;
  const notes = $("#newUserNotes").value.trim();
  
  // Validation
  if (!tenantKey || !username || !email || !password || !role) {
    alert("Vul alle verplichte velden in.");
    return;
  }
  
  if (password.length < 6) {
    alert("Wachtwoord moet minimaal 6 karakters lang zijn.");
    return;
  }
  
  // Get tenant data
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) {
    alert("Organisatie niet gevonden.");
    return;
  }
  
  // Check if username already exists in this tenant
  const existingUser = tenantData.users.find(u => u.username === username);
  if (existingUser) {
    alert("Gebruikersnaam bestaat al bij deze organisatie.");
    return;
  }
  
  // Create new user
  const newUser = {
    username: username,
    email: email,
    password: password, // In production, this should be hashed
    role: role,
    notes: notes,
    created: new Date().toISOString(),
    createdBy: 'superadmin'
  };
  
  // Add user to tenant
  tenantData.users.push(newUser);
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  
  // Close modal and refresh
  $("#createUserModal").close();
  renderAllUsersTable();
  renderTenantsTable();
  
  alert(`Gebruiker ${username} succesvol aangemaakt voor ${tenantData.info.company}.`);
}

function resetUserPassword(tenantKey, username) {
  if (!confirm(`Wachtwoord resetten voor gebruiker ${username}?`)) return;
  
  const newPassword = prompt(`Nieuw wachtwoord voor ${username}:`, 'password123');
  if (!newPassword) return;
  
  if (newPassword.length < 6) {
    alert("Wachtwoord moet minimaal 6 karakters lang zijn.");
    return;
  }
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) return;
  
  const user = tenantData.users.find(u => u.username === username);
  if (!user) return;
  
  user.password = newPassword;
  user.passwordResetAt = new Date().toISOString();
  user.passwordResetBy = 'superadmin';
  
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  
  alert(`Wachtwoord voor ${username} is aangepast naar: ${newPassword}`);
}

function suspendUser(tenantKey, username) {
  if (!confirm(`Gebruiker ${username} suspenderen?`)) return;
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) return;
  
  const user = tenantData.users.find(u => u.username === username);
  if (!user) return;
  
  user.suspended = true;
  user.suspendedAt = new Date().toISOString();
  user.suspendedBy = 'superadmin';
  
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  renderAllUsersTable();
  
  alert(`Gebruiker ${username} is gesuspendeerd.`);
}

function deleteUserDirect(tenantKey, username) {
  if (!confirm(`WAARSCHUWING: Je gaat gebruiker ${username} permanent verwijderen.\n\nDeze actie kan niet ongedaan worden gemaakt.\n\nWeet je dit zeker?`)) return;
  
  const tenantData = JSON.parse(localStorage.getItem(`planwise_tenant_${tenantKey}`));
  if (!tenantData) return;
  
  const userIndex = tenantData.users.findIndex(u => u.username === username);
  if (userIndex === -1) return;
  
  // Don't allow deletion of the last admin user
  const user = tenantData.users[userIndex];
  if (user.role === 'admin') {
    const adminUsers = tenantData.users.filter(u => u.role === 'admin');
    if (adminUsers.length === 1) {
      alert("Kan de laatste admin gebruiker niet verwijderen. Maak eerst een andere admin aan.");
      return;
    }
  }
  
  // Remove user from the array
  tenantData.users.splice(userIndex, 1);
  
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  renderAllUsersTable();
  
  alert(`Gebruiker ${username} is permanent verwijderd.`);
}

/* -------------------- ORGANIZATION CREATION & MANAGEMENT -------------------- */

function showCreateOrganizationModal() {
  const modal = $("#createOrganizationModal");
  if (!modal) return;
  
  // Clear form
  $("#newOrgCompany").value = '';
  $("#newOrgIndustry").value = '';
  $("#newOrgPlan").value = 'trial';
  $("#newOrgAdminUsername").value = '';
  $("#newOrgAdminEmail").value = '';
  $("#newOrgAdminPassword").value = '';
  
  modal.showModal();
}

function createNewOrganization() {
  const company = $("#newOrgCompany").value.trim();
  const industry = $("#newOrgIndustry").value;
  const plan = $("#newOrgPlan").value;
  const adminUsername = $("#newOrgAdminUsername").value.trim();
  const adminEmail = $("#newOrgAdminEmail").value.trim();
  const adminPassword = $("#newOrgAdminPassword").value.trim();
  
  // Validation
  if (!company || !adminUsername || !adminEmail || !adminPassword) {
    alert("Vul alle verplichte velden in.");
    return;
  }
  
  if (adminPassword.length < 6) {
    alert("Wachtwoord moet minimaal 6 karakters lang zijn.");
    return;
  }
  
  const tenantKey = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Check if tenant already exists
  const existingTenant = localStorage.getItem(`planwise_tenant_${tenantKey}`);
  if (existingTenant) {
    alert("Een organisatie met deze naam bestaat al.");
    return;
  }
  
  // Create admin user
  const adminUser = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    created: new Date().toISOString(),
    createdBy: 'superadmin'
  };
  
  // Create tenant data
  const tenantData = {
    info: {
      company: company,
      industry: industry || 'Onbekend',
      plan: plan,
      created: new Date().toISOString(),
      createdBy: 'superadmin'
    },
    users: [adminUser],
    lastActive: new Date().toISOString()
  };
  
  // Save tenant
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  
  // Initialize default state for this tenant
  const defaultTenantState = structuredClone(defaultState);
  defaultTenantState.tenantInfo = tenantData.info;
  
  // Add default installation types based on industry
  if (industry === 'hvac') {
    defaultTenantState.installationTypes = [
      { id: 'vickers', name: 'Vickers', color: '#ef4444', category: 'HVAC' },
      { id: 'airco', name: 'Airco', color: '#06b6d4', category: 'Koeling' },
      { id: 'ketel', name: 'Ketel', color: '#f59e0b', category: 'Verwarming' },
      { id: 'ventilatie', name: 'Ventilatie', color: '#84cc16', category: 'Ventilatie' }
    ];
  } else if (industry === 'electrical') {
    defaultTenantState.installationTypes = [
      { id: 'elektra', name: 'Elektra Installatie', color: '#eab308', category: 'Elektra' },
      { id: 'verlichting', name: 'Verlichting', color: '#f97316', category: 'Elektra' },
      { id: 'beveiliging', name: 'Beveiliging', color: '#dc2626', category: 'Elektra' }
    ];
  } else {
    defaultTenantState.installationTypes = [
      { id: 'algemeen', name: 'Algemene Installatie', color: '#6b7280', category: 'Algemeen' }
    ];
  }
  
  localStorage.setItem(`planwise_${tenantKey}_v4`, JSON.stringify(defaultTenantState));
  
  // Close modal and refresh
  $("#createOrganizationModal").close();
  renderTenantsTable();
  renderPlatformStats();
  
  alert(`Organisatie ${company} succesvol aangemaakt met admin gebruiker ${adminUsername}.`);
}

/* -------------------- ANALYTICS FUNCTIONALITY -------------------- */

function loadAnalyticsData() {
  console.log("Loading analytics data...");
  renderUsageStats();
  renderFeatureUsage();
}

function renderUsageStats() {
  const container = $("#usageStats");
  if (!container) return;
  
  const tenants = getAllTenants();
  const totalInstallations = getTotalInstallations();
  const totalTickets = getTotalTickets();
  const totalEvents = getTotalCalendarEvents();
  const avgInstallationsPerTenant = tenants.length > 0 ? Math.round(totalInstallations / tenants.length) : 0;
  
  const statsHTML = `
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-1), 0.1), rgba(var(--brand-1), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-1), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">🏗️</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--brand-1));">${totalInstallations}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Totaal Installaties</div>
      <small style="color: rgb(var(--txt-3));">Ø ${avgInstallationsPerTenant} per tenant</small>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--ok), 0.1), rgba(var(--ok), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--ok), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">🎫</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--ok));">${totalTickets}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Totaal Tickets</div>
      <small style="color: rgb(var(--txt-3));">Alle tenants</small>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--warn), 0.1), rgba(var(--warn), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--warn), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">📅</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--warn));">${totalEvents}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Calendar Events</div>
      <small style="color: rgb(var(--txt-3));">Geplande afspraken</small>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-2), 0.1), rgba(var(--brand-2), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-2), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">📈</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--brand-2));">${getActiveTenantsToday()}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Actief Vandaag</div>
      <small style="color: rgb(var(--txt-3));">Tenants met activiteit</small>
    </div>
  `;
  
  container.innerHTML = statsHTML;
}

function renderFeatureUsage() {
  const container = $("#featureUsageTable");
  if (!container) return;
  
  const tenants = getAllTenants();
  const featureStats = calculateFeatureUsage(tenants);
  
  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Gebruikende Organisaties</th>
          <th>Totaal Gebruik</th>
          <th>Adoptie Rate</th>
        </tr>
      </thead>
      <tbody>
        ${featureStats.map(stat => `
          <tr>
            <td><strong>${stat.feature}</strong></td>
            <td>${stat.usingTenants} / ${tenants.length}</td>
            <td>${stat.totalUsage}</td>
            <td>
              <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div style="width: ${stat.adoptionRate}%; height: 100%; background: rgb(var(--ok));"></div>
              </div>
              ${stat.adoptionRate}%
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

function getTotalInstallations() {
  const tenants = getAllTenants();
  let total = 0;
  
  tenants.forEach(tenant => {
    const tenantState = localStorage.getItem(`planwise_${tenant.key}_v4`);
    if (tenantState) {
      try {
        const state = JSON.parse(tenantState);
        total += state.installations?.length || 0;
      } catch (e) {
        console.warn('Failed to parse tenant state:', e);
      }
    }
  });
  
  return total;
}

function getTotalTickets() {
  const tenants = getAllTenants();
  let total = 0;
  
  tenants.forEach(tenant => {
    const tenantState = localStorage.getItem(`planwise_${tenant.key}_v4`);
    if (tenantState) {
      try {
        const state = JSON.parse(tenantState);
        total += state.tickets?.length || 0;
      } catch (e) {
        console.warn('Failed to parse tenant state:', e);
      }
    }
  });
  
  return total;
}

function getTotalCalendarEvents() {
  const tenants = getAllTenants();
  let total = 0;
  
  tenants.forEach(tenant => {
    const tenantState = localStorage.getItem(`planwise_${tenant.key}_v4`);
    if (tenantState) {
      try {
        const state = JSON.parse(tenantState);
        total += state.calendarEvents?.length || 0;
      } catch (e) {
        console.warn('Failed to parse tenant state:', e);
      }
    }
  });
  
  return total;
}

function getActiveTenantsToday() {
  // Mock implementation - in production, this would track real activity
  const tenants = getAllTenants();
  return Math.round(tenants.length * 0.7); // Assume 70% daily activity
}

function calculateFeatureUsage(tenants) {
  const features = [
    { name: 'Installaties', key: 'installations' },
    { name: 'Calendar Events', key: 'calendarEvents' },
    { name: 'Tickets', key: 'tickets' },
    { name: 'Installation Types', key: 'installationTypes' },
    { name: 'Technicians', key: 'technicians' }
  ];
  
  return features.map(feature => {
    let usingTenants = 0;
    let totalUsage = 0;
    
    tenants.forEach(tenant => {
      const tenantState = localStorage.getItem(`planwise_${tenant.key}_v4`);
      if (tenantState) {
        try {
          const state = JSON.parse(tenantState);
          const usage = state[feature.key]?.length || 0;
          if (usage > 0) {
            usingTenants++;
          }
          totalUsage += usage;
        } catch (e) {
          console.warn('Failed to parse tenant state:', e);
        }
      }
    });
    
    const adoptionRate = tenants.length > 0 ? Math.round((usingTenants / tenants.length) * 100) : 0;
    
    return {
      feature: feature.name,
      usingTenants,
      totalUsage,
      adoptionRate
    };
  });
}

function refreshAnalytics() {
  loadAnalyticsData();
  alert('Analytics data ververst!');
}

function exportAnalytics() {
  const analyticsData = {
    exported: new Date().toISOString(),
    usageStats: {
      totalInstallations: getTotalInstallations(),
      totalTickets: getTotalTickets(),
      totalEvents: getTotalCalendarEvents(),
      activeToday: getActiveTenantsToday()
    },
    featureUsage: calculateFeatureUsage(getAllTenants()),
    tenantStats: getAllTenants().map(tenant => ({
      company: tenant.info.company,
      plan: tenant.info.plan,
      users: tenant.users.length,
      created: tenant.created
    }))
  };
  
  const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `planwise-analytics-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  alert('Analytics data geëxporteerd!');
}

/* -------------------- BILLING FUNCTIONALITY -------------------- */

function loadBillingData() {
  console.log("Loading billing data...");
  renderRevenueStats();
  renderSubscriptionsTable();
  renderPaymentHistory();
}

function renderRevenueStats() {
  const container = $("#revenueStats");
  if (!container) return;
  
  const tenants = getAllTenants();
  const monthlyRevenue = calculateMonthlyRevenue(tenants);
  const annualRevenue = monthlyRevenue * 12;
  const trialTenants = tenants.filter(t => t.info.plan === 'trial').length;
  const paidTenants = tenants.filter(t => t.info.plan === 'active' || t.info.plan === 'enterprise').length;
  
  const statsHTML = `
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--ok), 0.1), rgba(var(--ok), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--ok), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">💰</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--ok));">€${monthlyRevenue.toLocaleString('nl-NL')}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Maandelijkse Omzet</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-1), 0.1), rgba(var(--brand-1), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-1), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">📊</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--brand-1));">€${annualRevenue.toLocaleString('nl-NL')}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Jaarlijkse Projectie</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--warn), 0.1), rgba(var(--warn), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--warn), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">⏰</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--warn));">${trialTenants}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Trial Accounts</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-2), 0.1), rgba(var(--brand-2), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-2), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">💳</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--brand-2));">${paidTenants}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Betalende Klanten</div>
    </div>
  `;
  
  container.innerHTML = statsHTML;
}

function renderSubscriptionsTable() {
  const container = $("#subscriptionsTable");
  if (!container) return;
  
  const tenants = getAllTenants();
  
  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Organisatie</th>
          <th>Plan</th>
          <th>Maandelijks</th>
          <th>Status</th>
          <th>Volgende Betaling</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        ${tenants.map(tenant => {
          const monthlyFee = getPlanPrice(tenant.info.plan);
          const status = getBillingStatus(tenant);
          const nextPayment = getNextPaymentDate(tenant);
          
          return `
            <tr>
              <td><strong>${tenant.info.company}</strong></td>
              <td><span class="badge" style="background: ${getPlanColor(tenant.info.plan)}">${tenant.info.plan}</span></td>
              <td>€${monthlyFee}/maand</td>
              <td><span class="badge" style="background: ${getBillingStatusColor(status)}">${status}</span></td>
              <td>${nextPayment}</td>
              <td>
                <button class="btn small" onclick="generateInvoice('${tenant.key}')" title="Factuur">📄</button>
                <button class="btn small" onclick="changePlan('${tenant.key}')" title="Plan Wijzigen">⚙️</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

function renderPaymentHistory() {
  const container = $("#paymentHistoryTable");
  if (!container) return;
  
  // Mock payment history - in production, this would come from payment processor
  const payments = generateMockPayments();
  
  const tableHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Organisatie</th>
          <th>Bedrag</th>
          <th>Status</th>
          <th>Factuur</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map(payment => `
          <tr>
            <td>${new Date(payment.date).toLocaleDateString('nl-NL')}</td>
            <td>${payment.company}</td>
            <td>€${payment.amount}</td>
            <td><span class="badge" style="background: ${getPaymentStatusColor(payment.status)}">${payment.status}</span></td>
            <td><button class="btn small" onclick="downloadInvoice('${payment.id}')" title="Download">📄</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHTML;
}

function calculateMonthlyRevenue(tenants) {
  return tenants.reduce((total, tenant) => {
    return total + getPlanPrice(tenant.info.plan);
  }, 0);
}

function getPlanPrice(plan) {
  const prices = {
    'trial': 0,
    'active': 49,
    'enterprise': 149,
    'suspended': 0
  };
  return prices[plan] || 0;
}

function getBillingStatus(tenant) {
  if (tenant.info.plan === 'trial') return 'Trial';
  if (tenant.info.plan === 'suspended') return 'Gesuspendeerd';
  return 'Actief';
}

function getBillingStatusColor(status) {
  const colors = {
    'Trial': 'rgba(251, 191, 36, 0.8)',
    'Actief': 'rgba(16, 185, 129, 0.8)',
    'Gesuspendeerd': 'rgba(245, 101, 101, 0.8)'
  };
  return colors[status] || 'rgba(156, 163, 175, 0.8)';
}

function getPaymentStatusColor(status) {
  const colors = {
    'Betaald': 'rgba(16, 185, 129, 0.8)',
    'Pending': 'rgba(251, 191, 36, 0.8)',
    'Mislukt': 'rgba(245, 101, 101, 0.8)'
  };
  return colors[status] || 'rgba(156, 163, 175, 0.8)';
}

function getNextPaymentDate(tenant) {
  if (tenant.info.plan === 'trial' || tenant.info.plan === 'suspended') {
    return 'N/A';
  }
  
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  return nextMonth.toLocaleDateString('nl-NL');
}

function generateMockPayments() {
  const tenants = getAllTenants().filter(t => t.info.plan === 'active' || t.info.plan === 'enterprise');
  const payments = [];
  
  // Generate last 3 months of payments
  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    tenants.forEach(tenant => {
      payments.push({
        id: `inv_${tenant.key}_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
        date: date.toISOString(),
        company: tenant.info.company,
        amount: getPlanPrice(tenant.info.plan),
        status: Math.random() > 0.1 ? 'Betaald' : 'Pending'
      });
    });
  }
  
  return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateInvoices() {
  const tenants = getAllTenants().filter(t => t.info.plan === 'active' || t.info.plan === 'enterprise');
  
  if (tenants.length === 0) {
    alert('Geen betalende tenants gevonden.');
    return;
  }
  
  if (confirm(`${tenants.length} facturen genereren voor deze maand?`)) {
    // Mock invoice generation
    const invoices = tenants.map(tenant => ({
      tenant: tenant.info.company,
      amount: getPlanPrice(tenant.info.plan),
      date: new Date().toISOString(),
      number: `INV-${Date.now()}-${tenant.key.toUpperCase()}`
    }));
    
    console.log('Generated invoices:', invoices);
    alert(`${invoices.length} facturen gegenereerd!`);
    
    // Refresh payment history
    renderPaymentHistory();
  }
}

function exportBillingData() {
  const billingData = {
    exported: new Date().toISOString(),
    revenue: {
      monthly: calculateMonthlyRevenue(getAllTenants()),
      annual: calculateMonthlyRevenue(getAllTenants()) * 12
    },
    subscriptions: getAllTenants().map(tenant => ({
      company: tenant.info.company,
      plan: tenant.info.plan,
      monthlyFee: getPlanPrice(tenant.info.plan),
      status: getBillingStatus(tenant)
    })),
    payments: generateMockPayments()
  };
  
  const blob = new Blob([JSON.stringify(billingData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `planwise-billing-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  alert('Billing data geëxporteerd!');
}

/* -------------------- AUTHENTICATION & TENANT MANAGEMENT -------------------- */

function showLoginModal() {
  // Populate available organizations for autocomplete
  populateAvailableOrganizations();
  
  // Clear any previous errors
  clearLoginError();
  
  // Use enhanced modal opening
  openModal('loginModal');
}

function showRegisterModal() {
  const loginModal = $("#loginModal");
  const registerModal = $("#registerModal");
  
  if (loginModal) loginModal.close();
  if (registerModal) registerModal.showModal();
}

function handleLogin() {
  const company = $("#loginCompany").value.trim();
  const username = $("#loginUsername").value.trim();
  const password = $("#loginPassword").value.trim();
  
  if (!company || !username || !password) {
    showLoginError("Vul alle velden in.");
    return;
  }
  
  // Check for super admin login
  if (company === SUPER_ADMIN.company && username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
    // Super Admin login
    if (Auth.becomeSuperAdmin()) {
      $("#loginModal").close();
      location.reload();
    } else {
      showLoginError("Fout bij inloggen als Super Admin");
    }
    return;
  }
  
  // Find tenant by slug or company name (case-insensitive)
  const tenantKey = findTenantByInput(company);
  
  if (!tenantKey) {
    showLoginError("Onbekende organisatie; gebruik de slug uit Super Admin of registreer eerst een account.");
    populateAvailableOrganizations();
    return;
  }
  
  // Check if tenant exists
  const existingTenant = localStorage.getItem(`planwise_tenant_${tenantKey}`);
  if (!existingTenant) {
    showLoginError("Organisatie niet gevonden. Registreer eerst een account.");
    return;
  }
  
  const tenantData = JSON.parse(existingTenant);
  const user = tenantData.users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    showLoginError("Ongeldige gebruikersnaam of wachtwoord.");
    return;
  }
  
  // Set auth state
  const authData = {
    orgSlug: tenantKey,
    role: user.role || 'viewer',
    user: username
  };
  
  if (Auth.set(authData)) {
    clearLoginError();
    $("#loginModal").close();
    location.reload();
  } else {
    showLoginError("Fout bij inloggen");
  }
}

// Helper function to find tenant by slug or company name
function findTenantByInput(input) {
  const tenants = getAllTenants();
  
  // First try exact slug match
  const exactSlugMatch = tenants.find(t => t.key.toLowerCase() === input.toLowerCase());
  if (exactSlugMatch) return exactSlugMatch.key;
  
  // Then try company name match (case-insensitive)
  const companyMatch = tenants.find(t => t.info.company.toLowerCase() === input.toLowerCase());
  if (companyMatch) return companyMatch.key;
  
  return null;
}

// Show login error message
function showLoginError(message) {
  const errorDiv = $("#loginError");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Clear login error message
function clearLoginError() {
  const errorDiv = $("#loginError");
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// Populate available organizations in datalist
function populateAvailableOrganizations() {
  const datalist = $("#availableOrganizations");
  if (!datalist) return;
  
  const tenants = getAllTenants();
  datalist.innerHTML = '';
  
  tenants.forEach(tenant => {
    const option = document.createElement('option');
    option.value = tenant.info.company;
    option.textContent = `${tenant.info.company} (${tenant.key})`;
    datalist.appendChild(option);
  });
}

function handleRegister() {
  const company = $("#regCompany").value.trim();
  const username = $("#regUsername").value.trim();
  const email = $("#regEmail").value.trim();
  const password = $("#regPassword").value.trim();
  const passwordConfirm = $("#regPasswordConfirm").value.trim();
  const industry = $("#regIndustry").value;
  const role = $("#regRole").value;
  
  if (!company || !username || !email || !password || !role) {
    alert("Vul alle verplichte velden in.");
    return;
  }
  
  if (password !== passwordConfirm) {
    alert("Wachtwoorden komen niet overeen.");
    return;
  }
  
  if (password.length < 6) {
    alert("Wachtwoord moet minimaal 6 karakters lang zijn.");
    return;
  }
  
  // Validate role
  if (!ROLE_PERMISSIONS[role]) {
    alert("Ongeldige rol geselecteerd.");
    return;
  }
  
  const tenantKey = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Check if tenant already exists
  const existingTenant = localStorage.getItem(`planwise_tenant_${tenantKey}`);
  if (existingTenant) {
    alert("Een bedrijf met deze naam bestaat al. Kies een andere naam of log in.");
    return;
  }
  
  // Create new tenant
  const tenantData = {
    info: {
      company: company,
      industry: industry,
      plan: "trial",
      created: new Date().toISOString()
    },
    users: [
      {
        username: username,
        email: email,
        password: password, // In production, this should be hashed!
        role: role,
        created: new Date().toISOString()
      }
    ]
  };
  
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  
  // Set auth state for new user
  const authData = {
    orgSlug: tenantKey,
    role: role,
    user: username
  };
  
  if (Auth.set(authData)) {
    $("#registerModal").close();
    location.reload();
  } else {
    alert("Fout bij het aanmaken van account");
  }
  
  // Auth state is now managed by Auth service
  
  // Close modal and initialize app
  $("#registerModal").close();
  
  // Initialize with default state for new tenant
  state = structuredClone(defaultState);
  state.tenantInfo = tenantData.info;
  
  // Add default installation types based on industry
  if (industry === "hvac") {
    state.installationTypes = [
      { id: "warmtepomp", name: "Warmtepomp", color: "#ef4444", category: "Verwarming" },
      { id: "airco", name: "Airco", color: "#10b981", category: "Koeling" },
      { id: "ventilatie", name: "Ventilatie", color: "#8b5cf6", category: "Ventilatie" },
      { id: "cv_ketel", name: "CV Ketel", color: "#f59e0b", category: "Verwarming" }
    ];
  } else if (industry === "electrical") {
    state.installationTypes = [
      { id: "elektra_installatie", name: "Elektra Installatie", color: "#fbbf24", category: "Elektra" },
      { id: "bliksemafleider", name: "Bliksemafleider", color: "#6366f1", category: "Beveiliging" },
      { id: "noodverlichting", name: "Noodverlichting", color: "#f97316", category: "Veiligheid" }
    ];
  }
  
  saveState();
  
  // Restart setup
  setup();
  
  // Update RBAC UI
  updateRoleIndicator();
  setupRoleSwitcher();
  applyRoleBasedUI();
  
  alert(`Account aangemaakt! Welkom bij PlanWise, ${username}. Je rol is: ${ROLE_PERMISSIONS[role]?.name || 'Gebruiker'}.`);
}

// Global reset function
window.resetApp = function() {
  if (confirm("Weet je zeker dat je de app wilt resetten? Dit verwijdert alle lokale data en herstart de applicatie.")) {
    // Clear all PlanWise related data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('planwise_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    
    // Close any open modals
    document.querySelectorAll('dialog[open]').forEach(d => { 
      try { d.close(); } catch(_){} 
    });
    
    // Remove any stray overlays/backdrops
    const blockers = document.querySelectorAll('.modal-backdrop,.overlay,.fc-popover'); 
    blockers.forEach(b => b.remove());
    
    // Show login modal after reset
    setTimeout(() => {
      showLoginModal();
    }, 100);
  }
}

// Account dropdown functions
function setupAccountDropdown() {
  const superAdminOption = document.getElementById('superAdminOption');
  if (superAdminOption && currentAuth?.role === 'superadmin') {
    superAdminOption.style.display = 'block';
  }
}

function toggleAccountDropdown() {
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

function showSwitchTenantModal() {
  const modal = document.getElementById('switchTenantModal');
  const select = document.getElementById('switchTenantSelect');
  const info = document.getElementById('switchTenantInfo');
  const details = document.getElementById('switchTenantDetails');
  const superAdminOption = document.getElementById('superAdminSwitchOption');
  
  if (!modal || !select) return;
  
  // Get known organizations
  const orgs = Auth.getKnownOrganizations();
  
  // Populate dropdown
  select.innerHTML = '<option value="">Kies een organisatie...</option>';
  orgs.forEach(org => {
    if (org.slug !== currentAuth?.orgSlug) {
      const option = document.createElement('option');
      option.value = org.slug;
      option.textContent = `${org.name} (${org.slug}) - ${org.plan}`;
      select.appendChild(option);
    }
  });
  
  // Show organization info when selected
  select.onchange = function() {
    const selectedOrg = orgs.find(org => org.slug === this.value);
    if (selectedOrg) {
      details.innerHTML = `
        <div><strong>Naam:</strong> ${selectedOrg.name}</div>
        <div><strong>Login-slug:</strong> <code style="background: rgba(var(--bg-2), 0.5); padding: 2px 6px; border-radius: 4px; font-size: 0.85em;">${selectedOrg.slug}</code></div>
        <div><strong>Plan:</strong> ${selectedOrg.plan}</div>
        <div><strong>Aangemaakt:</strong> ${new Date(selectedOrg.created).toLocaleDateString('nl-NL')}</div>
      `;
      info.style.display = 'block';
    } else {
      info.style.display = 'none';
    }
  };
  
  // Show Super Admin option if user has superadmin role
  if (superAdminOption) {
    superAdminOption.style.display = currentAuth?.role === 'superadmin' ? 'block' : 'none';
  }
  
  // Close dropdown and show modal
  document.getElementById('accountDropdown').style.display = 'none';
  openModal('switchTenantModal');
}

function switchToSuperAdminFromModal() {
  if (Auth.becomeSuperAdmin()) {
    document.getElementById('switchTenantModal').close();
    location.reload();
  } else {
    alert('Fout bij het wisselen naar Super Admin modus');
  }
}

function performTenantSwitch() {
  const select = document.getElementById('switchTenantSelect');
  const selectedSlug = select.value;
  
  if (!selectedSlug) {
    alert('Selecteer een organisatie');
    return;
  }
  
  if (Auth.switchOrg(selectedSlug)) {
    location.reload();
  } else {
    alert('Fout bij het wisselen van organisatie');
  }
}

function switchToSuperAdmin() {
  if (currentAuth?.role !== 'superadmin') {
    alert('Alleen super admins kunnen naar platform modus gaan');
    return;
  }
  
  if (currentAuth.orgSlug !== 'PLANWISE_PLATFORM') {
    if (confirm('Naar platformmodus gaan?')) {
      if (Auth.becomeSuperAdmin()) {
        location.reload();
      } else {
        alert('Fout bij het wisselen naar Super Admin modus');
      }
    }
  } else {
    alert('Je bent al in Super Admin modus');
  }
}

function logout() {
  if (confirm("Weet je zeker dat je wilt uitloggen?")) {
    Auth.logout();
    currentAuth = null;
    state = {};
    location.reload();
  }
}

/* -------------------- INSTALLATION TYPES MANAGEMENT -------------------- */

function showInstallationTypesModal() {
  const modal = $("#installationTypesModal");
  if (modal) {
    renderInstallationTypesList();
    modal.showModal();
  }
}

function renderInstallationTypesList() {
  const container = $("#installationTypesList");
  if (!container || !state.installationTypes) return;
  
  const typesHTML = state.installationTypes.map(type => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin: 4px 0; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 20px; height: 20px; border-radius: 4px; background: ${type.color};"></div>
        <span style="font-weight: 500;">${type.name}</span>
        <small style="color: rgb(var(--txt-3));">${type.category}</small>
      </div>
      <button class="btn small ghost" onclick="removeInstallationType('${type.id}')" title="Verwijderen">🗑️</button>
    </div>
  `).join('');
  
  container.innerHTML = typesHTML || '<p class="muted">Geen installatie types gedefinieerd.</p>';
}

function addInstallationType() {
  const name = $("#newInstallationType").value.trim();
  const color = $("#newInstallationColor").value;
  
  if (!name) {
    alert("Vul een naam in voor het installatie type.");
    return;
  }
  
  // Check if name already exists
  if (state.installationTypes.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    alert("Een installatie type met deze naam bestaat al.");
    return;
  }
  
  const newType = {
    id: uuid(),
    name: name,
    color: color,
    category: "Algemeen" // Default category
  };
  
  state.installationTypes.push(newType);
  saveState();
  
  // Clear inputs
  $("#newInstallationType").value = '';
  $("#newInstallationColor").value = '#3b82f6';
  
  // Refresh list
  renderInstallationTypesList();
  
  // Update installation modal if open
  updateInstallationTypeDropdown();
}

function removeInstallationType(typeId) {
  const type = state.installationTypes.find(t => t.id === typeId);
  if (!type) return;
  
  // Check if type is used in installations
  const usageCount = state.installations ? state.installations.filter(inst => inst.type === type.name).length : 0;
  
  if (usageCount > 0) {
    if (!confirm(`Dit installatie type wordt gebruikt door ${usageCount} installatie(s). Weet je zeker dat je het wilt verwijderen?`)) {
      return;
    }
  }
  
  state.installationTypes = state.installationTypes.filter(t => t.id !== typeId);
  saveState();
  
  renderInstallationTypesList();
  updateInstallationTypeDropdown();
}

function updateInstallationTypeDropdown() {
  const dropdown = $("#instType");
  if (!dropdown || !state.installationTypes) return;
  
  const optionsHTML = '<option value="">Selecteer type</option>' + 
    state.installationTypes.map(type => 
      `<option value="${type.name}">${type.name}</option>`
    ).join('');
  
  const currentValue = dropdown.value;
  dropdown.innerHTML = optionsHTML;
  dropdown.value = currentValue;
}

function updateInstallationFilterDropdown() {
  const dropdown = $("#installationFilter");
  if (!dropdown || !state.installationTypes) return;
  
  const optionsHTML = '<option value="">Alle types</option>' + 
    state.installationTypes.map(type => 
      `<option value="${type.name}">${type.name}</option>`
    ).join('');
  
  const currentValue = dropdown.value;
  dropdown.innerHTML = optionsHTML;
  dropdown.value = currentValue;
}

/* -------------------- MAINTENANCE PLANNING MODAL -------------------- */

function showMaintenanceModal() {
  if (!requirePermission('plan_maintenance')) return;
  
  const modal = $("#maintenanceModal");
  if (modal) {
    generateMaintenanceProposalsInModal();
    modal.showModal();
  }
}

function generateMaintenanceProposalsInModal() {
  const container = $("#maintenanceProposals");
  if (!container) return;
  
  // Use existing maintenance logic to generate proposals
  const proposals = generateMaintenanceProposalsData();
  
  if (proposals.length === 0) {
    container.innerHTML = '<p class="muted">Geen onderhoudsvoorstellen gevonden. Voeg eerst installaties toe met contracten.</p>';
    return;
  }
  
  const proposalsHTML = proposals.map(proposal => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin: 8px 0; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
      <div>
        <strong>${proposal.client}</strong><br>
        <small style="color: rgb(var(--txt-3));">${proposal.address}</small><br>
        <span style="color: rgb(var(--brand-1));">${proposal.system}</span><br>
        <small>Voorstel: ${proposal.proposedDate}</small>
      </div>
      <div style="text-align: right;">
        <small style="color: rgb(var(--txt-3));">Laatste: ${proposal.lastService || 'Onbekend'}</small><br>
        <button class="btn small primary" onclick="planSingleMaintenance('${proposal.id}')" title="Plan dit onderhoud">Plan In</button>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = proposalsHTML;
}

function generateMaintenanceProposalsData() {
  // Generate maintenance proposals based on installations
  const proposals = [];
  
  if (!state.installations) return proposals;
  
  state.installations.forEach(installation => {
    if (installation.contractType) {
      const nextDate = calculateNextMaintenanceDate(installation);
      if (nextDate) {
        // Check if not already planned
        const existingEvent = state.calendarEvents.find(event => 
          event.extendedProps?.installationId === installation.id ||
          (event.extendedProps?.client === installation.client && 
           event.extendedProps?.address === installation.address &&
           event.title.toLowerCase().includes('onderhoud'))
        );
        
        if (!existingEvent) {
          proposals.push({
            id: installation.id,
            client: installation.client,
            address: installation.address,
            system: `${installation.type}${installation.model ? ' ' + installation.model : ''}`,
            lastService: installation.lastMaintenance,
            proposedDate: nextDate.toLocaleDateString('nl-NL'),
            installation: installation
          });
        }
      }
    }
  });
  
  return proposals;
}

function planSingleMaintenance(installationId) {
  const installation = state.installations.find(inst => inst.id === installationId);
  if (!installation) return;
  
  const maintenanceDate = calculateNextMaintenanceDate(installation);
  if (!maintenanceDate) return;
  
  const maintenanceEvent = {
    id: uuid(),
    title: `🔧 Onderhoud ${installation.type} — ${installation.client}`,
    start: maintenanceDate.toISOString(),
    end: new Date(maintenanceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    extendedProps: {
      client: installation.client,
      address: installation.address,
      technician: getPreferredTechnician(installation.type),
      notes: `Contract onderhoud: ${installation.contractType}${installation.model ? '\nModel: ' + installation.model : ''}`,
      priority: 'normal',
      contractBased: true,
      installationId: installation.id
    }
  };
  
  state.calendarEvents.push(maintenanceEvent);
  saveState();
  updateDashboard();
  
  // Refresh proposals
  generateMaintenanceProposalsInModal();
  
  alert(`Onderhoud ingepland voor ${installation.client} op ${maintenanceDate.toLocaleDateString('nl-NL')}`);
}

function planAllMaintenance() {
  const proposals = generateMaintenanceProposalsData();
  let scheduled = 0;
  
  proposals.forEach(proposal => {
    const installation = proposal.installation;
    const maintenanceDate = calculateNextMaintenanceDate(installation);
    
    if (maintenanceDate) {
      const maintenanceEvent = {
        id: uuid(),
        title: `🔧 Onderhoud ${installation.type} — ${installation.client}`,
        start: maintenanceDate.toISOString(),
        end: new Date(maintenanceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        extendedProps: {
          client: installation.client,
          address: installation.address,
          technician: getPreferredTechnician(installation.type),
          notes: `Contract onderhoud: ${installation.contractType}${installation.model ? '\nModel: ' + installation.model : ''}`,
          priority: 'normal',
          contractBased: true,
          installationId: installation.id
        }
      };
      
      state.calendarEvents.push(maintenanceEvent);
      scheduled++;
    }
  });
  
  if (scheduled > 0) {
    saveState();
    updateDashboard();
    generateMaintenanceProposalsInModal();
    alert(`${scheduled} onderhoudsafspraken ingepland!`);
  } else {
    alert('Geen nieuwe onderhoud afspraken om in te plannen.');
  }
}

/* -------------------- INSTALLATIONS-MAINTENANCE INTEGRATION -------------------- */

function syncInstallationsWithMaintenance() {
  console.log("Sync installaties met maintenance planning...");
  
  if (!state.installations || !state.assets) return;
  
  // Convert installations to assets format for maintenance planning
  state.installations.forEach(installation => {
    // Check if installation already exists in assets
    const existingAsset = state.assets.find(asset => 
      asset.client === installation.client && 
      asset.address === installation.address &&
      asset.system.includes(installation.type)
    );
    
    if (!existingAsset && shouldCreateMaintenanceAsset(installation)) {
      const newAsset = {
        id: `inst_${installation.id}`,
        client: installation.client,
        address: installation.address,
        system: `${installation.type}${installation.model ? ' ' + installation.model : ''}`,
        lastService: installation.lastMaintenance || '',
        category: mapInstallationTypeToCategory(installation.type),
        contractType: installation.contractType,
        contractEnd: installation.contractEnd,
        installationId: installation.id, // Link back to installation
        contractValue: installation.contractValue,
        installDate: installation.installDate
      };
      
      state.assets.push(newAsset);
      console.log(`Asset toegevoegd voor installatie: ${installation.client} - ${installation.type}`);
    } else if (existingAsset) {
      // Update existing asset with latest installation data
      existingAsset.lastService = installation.lastMaintenance || existingAsset.lastService;
      existingAsset.contractType = installation.contractType;
      existingAsset.contractEnd = installation.contractEnd;
      existingAsset.installationId = installation.id;
      existingAsset.contractValue = installation.contractValue;
      existingAsset.installDate = installation.installDate;
    }
  });
  
  saveState();
}

function shouldCreateMaintenanceAsset(installation) {
  // Only create maintenance assets for installations with active contracts
  // or installations that need maintenance
  return installation.contractType || 
         installation.lastMaintenance || 
         ['Vickers', 'Airco', 'Ketel'].includes(installation.type);
}

function mapInstallationTypeToCategory(type) {
  const mapping = {
    'Vickers': 'Airco/Koeling',
    'Airco': 'Airco/Koeling', 
    'Ketel': 'CV-onderhoud',
    'Ventilatie': 'Algemeen',
    'Elektra': 'Elektra'
  };
  return mapping[type] || 'Algemeen';
}

function generateMaintenanceFromContracts() {
  if (!requirePermission('plan_maintenance')) return;
  
  console.log("Genereer onderhoud op basis van contracten...");
  
  if (!state.installations) {
    toast("❌ Geen installaties gevonden");
    return 0;
  }
  
  const activeContracts = state.installations.filter(installation => {
    const status = getContractStatus(installation);
    return status.status === 'active' || status.status === 'expiring';
  });
  
  if (activeContracts.length === 0) {
    toast("ℹ️ Geen actieve contracten gevonden");
    return 0;
  }
  
  let scheduled = 0;
  const now = new Date();
  const scheduledEvents = [];
  
  activeContracts.forEach(installation => {
    const maintenanceDate = calculateNextMaintenanceDate(installation);
    if (maintenanceDate && maintenanceDate > now) {
      // Check if maintenance is already scheduled
      const existingEvent = state.calendarEvents.find(event => 
        event.extendedProps?.installationId === installation.id &&
        event.title.toLowerCase().includes('onderhoud')
      );
      
      if (!existingEvent) {
        const maintenanceEvent = {
          id: `maintenance_${installation.id}_${maintenanceDate.getTime()}`,
          title: `🔧 Onderhoud ${installation.type} — ${installation.client}`,
          start: maintenanceDate.toISOString(),
          end: new Date(maintenanceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
          extendedProps: {
            client: installation.client,
            address: installation.address,
            technician: getPreferredTechnician(installation.type),
            notes: `Contract onderhoud: ${installation.contractType}${installation.model ? '\nModel: ' + installation.model : ''}${installation.contractValue ? '\nContract waarde: €' + installation.contractValue + '/jaar' : ''}`,
            priority: 'normal',
            contractBased: true,
            installationId: installation.id,
            maintenanceType: 'contract',
            estimatedDuration: 120, // 2 hours in minutes
            requiredSkills: getRequiredSkillsForType(installation.type)
          }
        };
        
        scheduledEvents.push(maintenanceEvent);
        scheduled++;
        console.log(`Contract onderhoud ingepland: ${installation.client} - ${maintenanceDate.toLocaleDateString('nl-NL')}`);
      }
    }
  });
  
  // Add all events to calendar
  if (scheduledEvents.length > 0) {
    state.calendarEvents.push(...scheduledEvents);
    saveState();
    updateDashboard();
    
    // Log the maintenance planning
    scheduledEvents.forEach(event => {
      logEventChange(event, 'maintenance_scheduled', {
        installationId: event.extendedProps.installationId,
        contractType: event.extendedProps.notes.split('\n')[0].replace('Contract onderhoud: ', ''),
        scheduledDate: event.start
      });
    });
    
    toast(`✅ ${scheduled} contract onderhoud afspraken automatisch ingepland!`);
  } else {
    toast('ℹ️ Geen nieuwe contract onderhoud afspraken nodig.');
  }
  
  return scheduled;
}

function planAllMaintenance() {
  console.log("Plan alle onderhoud afspraken...");
  
  if (!state.installations) {
    toast("❌ Geen installaties gevonden");
    return 0;
  }
  
  // Get all installations that need maintenance
  const installationsNeedingMaintenance = state.installations.filter(installation => {
    const status = getMaintenanceStatus(installation);
    return status.status === 'due_soon' || status.status === 'future';
  });
  
  if (installationsNeedingMaintenance.length === 0) {
    toast("ℹ️ Geen installaties die onderhoud nodig hebben");
    return 0;
  }
  
  let scheduled = 0;
  const now = new Date();
  const scheduledEvents = [];
  
  installationsNeedingMaintenance.forEach(installation => {
    const maintenanceDate = calculateNextMaintenanceDate(installation);
    if (maintenanceDate && maintenanceDate > now) {
      // Check if maintenance is already scheduled
      const existingEvent = state.calendarEvents.find(event => 
        event.extendedProps?.installationId === installation.id &&
        event.title.toLowerCase().includes('onderhoud')
      );
      
      if (!existingEvent) {
        const maintenanceEvent = {
          id: `maintenance_${installation.id}_${maintenanceDate.getTime()}`,
          title: `🔧 Onderhoud ${installation.type} — ${installation.client}`,
          start: maintenanceDate.toISOString(),
          end: new Date(maintenanceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          extendedProps: {
            client: installation.client,
            address: installation.address,
            technician: getPreferredTechnician(installation.type),
            notes: `Onderhoud: ${installation.type}${installation.model ? '\nModel: ' + installation.model : ''}${installation.contractType ? '\nContract: ' + installation.contractType : '\nGeen contract'}${installation.contractValue ? '\nContract waarde: €' + installation.contractValue + '/jaar' : ''}`,
            priority: installation.contractType ? 'normal' : 'low',
            contractBased: !!installation.contractType,
            installationId: installation.id,
            maintenanceType: installation.contractType ? 'contract' : 'preventive',
            estimatedDuration: 120, // 2 hours in minutes
            requiredSkills: getRequiredSkillsForType(installation.type)
          }
        };
        
        scheduledEvents.push(maintenanceEvent);
        scheduled++;
        console.log(`Onderhoud ingepland: ${installation.client} - ${maintenanceDate.toLocaleDateString('nl-NL')}`);
      }
    }
  });
  
  // Add all events to calendar
  if (scheduledEvents.length > 0) {
    state.calendarEvents.push(...scheduledEvents);
    saveState();
    updateDashboard();
    
    // Log the maintenance planning
    scheduledEvents.forEach(event => {
      logEventChange(event, 'maintenance_scheduled', {
        installationId: event.extendedProps.installationId,
        maintenanceType: event.extendedProps.maintenanceType,
        scheduledDate: event.start
      });
    });
    
    toast(`✅ ${scheduled} onderhoud afspraken ingepland!`);
  } else {
    toast('ℹ️ Geen nieuwe onderhoud afspraken nodig.');
  }
  
  return scheduled;
}

function getRequiredSkillsForType(installationType) {
  const skillMap = {
    'Vickers': ['Airco/Koeling'],
    'Airco': ['Airco/Koeling'],
    'Ketel': ['CV-onderhoud'],
    'Elektra': ['Elektra'],
    'Ventilatie': ['Algemeen']
  };
  return skillMap[installationType] || ['Algemeen'];
}

function calculateNextMaintenanceDate(installation) {
  const now = new Date();
  const type = installation.type;
  
  // Determine base date from last maintenance or installation date
  let baseDate = now;
  if (installation.lastMaintenance) {
    baseDate = new Date(installation.lastMaintenance);
  } else if (installation.installDate) {
    baseDate = new Date(installation.installDate);
  }
  
  // Calculate next maintenance based on type and season
  let nextDate = new Date(baseDate);
  
  switch (type) {
    case 'Vickers':
    case 'Airco':
      // Airco/Vickers: voor zomer (mei) en winter (oktober)
      if (now.getMonth() < 4) { // Voor mei
        nextDate = new Date(now.getFullYear(), 4, 15); // 15 mei
      } else if (now.getMonth() < 9) { // Voor oktober  
        nextDate = new Date(now.getFullYear(), 9, 15); // 15 oktober
      } else { // Na oktober, plan voor volgend jaar mei
        nextDate = new Date(now.getFullYear() + 1, 4, 15);
      }
      break;
      
    case 'Ketel':
      // CV-ketel: jaarlijks voor de winter (september)
      nextDate = new Date(now.getFullYear(), 8, 15); // 15 september
      if (now.getMonth() >= 8) { // Als we al voorbij september zijn
        nextDate = new Date(now.getFullYear() + 1, 8, 15);
      }
      break;
      
    case 'Ventilatie':
      // Ventilatie: halfjaarlijks
      nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
      
    case 'Elektra':
      // Elektra: jaarlijks 
      nextDate = new Date(baseDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
      
    default:
      // Default: jaarlijks
      nextDate = new Date(baseDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  
  // Ensure date is in the future
  if (nextDate <= now) {
    // Add appropriate interval to get future date
    switch (type) {
      case 'Vickers':
      case 'Airco':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'Ventilatie':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      default:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
  }
  
  return nextDate;
}

function getPreferredTechnician(installationType) {
  // Get technician based on skills
  const technicianMap = {
    'Vickers': 'Lars de Boer', // Airco/Koeling specialist
    'Airco': 'Lars de Boer',
    'Ketel': 'Sanne Peters', // CV-onderhoud specialist  
    'Elektra': 'Ahmed Ouazani', // Elektra specialist
    'Ventilatie': 'Lars de Boer' // Algemeen
  };
  
  return technicianMap[installationType] || 'Sanne Peters';
}

function getMaintenanceStatus(installation) {
  // Check if maintenance is already planned for this installation
  const plannedEvents = state.calendarEvents.filter(event => 
    event.extendedProps?.installationId === installation.id ||
    (event.extendedProps?.client === installation.client && 
     event.extendedProps?.address === installation.address &&
     event.title.toLowerCase().includes('onderhoud'))
  );
  
  if (plannedEvents.length > 0) {
    const nextEvent = plannedEvents
      .filter(event => new Date(event.start) > new Date())
      .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
    
    if (nextEvent) {
      const eventDate = new Date(nextEvent.start);
      const daysUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
      
      let statusColor = 'rgb(var(--ok))';
      let statusIcon = '✅';
      
      if (daysUntil <= 7) {
        statusColor = 'rgb(var(--err))';
        statusIcon = '🚨';
      } else if (daysUntil <= 30) {
        statusColor = 'rgb(var(--warn))';
        statusIcon = '⚠️';
      }
      
      return {
        html: `<span style="color: ${statusColor}; font-weight: 600;">${statusIcon} Ingepland<br><small>${eventDate.toLocaleDateString('nl-NL')} om ${eventDate.toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})}</small></span>`,
        status: 'planned',
        daysUntil: daysUntil
      };
    }
  }
  
  // Check if maintenance should be planned based on contract or last maintenance
  const nextMaintenanceDate = calculateNextMaintenanceDate(installation);
  if (nextMaintenanceDate) {
    const daysUntil = Math.ceil((nextMaintenanceDate - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 7) {
      return {
        html: `<span style="color: rgb(var(--err)); font-weight: 600;">🚨 Dringend<br><small>Voorstel: ${nextMaintenanceDate.toLocaleDateString('nl-NL')}</small></span>`,
        status: 'urgent',
        daysUntil: daysUntil
      };
    } else if (daysUntil <= 30) {
      return {
        html: `<span style="color: rgb(var(--warn)); font-weight: 600;">⚠️ Binnenkort<br><small>Voorstel: ${nextMaintenanceDate.toLocaleDateString('nl-NL')}</small></span>`,
        status: 'due_soon',
        daysUntil: daysUntil
      };
    } else {
      return {
        html: `<span style="color: rgb(var(--txt-3));">📅 Gepland<br><small>Voorstel: ${nextMaintenanceDate.toLocaleDateString('nl-NL')}</small></span>`,
        status: 'future',
        daysUntil: daysUntil
      };
    }
  }
  
  // No contract or maintenance needed
  return {
    html: `<span style="color: rgb(var(--txt-3));">➖ Geen planning</span>`,
    status: 'none',
    daysUntil: null
  };
}

function updateMaintenanceStatusDisplay(installation) {
  const statusDiv = $("#maintenanceStatus");
  if (!statusDiv) return;
  
  const status = getMaintenanceStatus(installation);
  statusDiv.innerHTML = status.html;
}

// Enhanced maintenance modal functions
function generateMaintenanceProposalsInModal() {
  const container = $("#maintenanceProposals");
  if (!container) return;
  
  // Use existing maintenance logic to generate proposals
  const proposals = generateMaintenanceProposalsData();
  
  if (proposals.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgb(var(--txt-3));">
        <p>📋 Geen onderhoudsvoorstellen gevonden</p>
        <p><small>Voeg installaties toe met contracten om onderhoud te plannen</small></p>
      </div>
    `;
    return;
  }
  
  const proposalsHTML = proposals.map(proposal => {
    const status = getMaintenanceStatus({ id: proposal.installationId, type: proposal.type, client: proposal.client, address: proposal.address });
    const contractStatus = proposal.contractType ? getContractStatus({ contractType: proposal.contractType, contractEnd: proposal.contractEnd }) : { html: '<span style="color: rgb(var(--txt-3));">⚪ Geen contract</span>' };
    
    return `
      <div class="card" style="margin-bottom: 16px; border-left: 4px solid ${getTypeColor(proposal.type)};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; color: rgb(var(--txt-1));">${proposal.client}</h4>
            <p style="margin: 0 0 4px 0; color: rgb(var(--txt-2)); font-size: 0.9em;">${proposal.address}</p>
            <div style="display: flex; gap: 8px; margin: 8px 0;">
              <span class="badge" style="background: ${getTypeColor(proposal.type)};">${proposal.type}</span>
              ${contractStatus.html}
            </div>
            <div style="margin: 8px 0;">
              ${status.html}
            </div>
            ${proposal.contractValue ? `<p style="margin: 4px 0; color: rgb(var(--brand-1)); font-weight: 600;">€${parseInt(proposal.contractValue).toLocaleString('nl-NL')}/jaar</p>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn small primary" onclick="planSingleMaintenance('${proposal.installationId}')" title="Plan dit onderhoud">Plan In</button>
            <button class="btn small ghost" onclick="showInstallationModal('${proposal.installationId}')" title="Bekijk details">Details</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = proposalsHTML;
}

function generateMaintenanceProposalsData() {
  // Generate maintenance proposals based on installations
  if (!state.installations) return [];
  
  const proposals = [];
  const now = new Date();
  
  state.installations.forEach(installation => {
    const nextDate = calculateNextMaintenanceDate(installation);
    if (nextDate && nextDate > now) {
      // Check if already planned
      const existingEvent = state.calendarEvents.find(event => 
        event.extendedProps?.installationId === installation.id &&
        event.title.toLowerCase().includes('onderhoud')
      );
      
      if (!existingEvent) {
        proposals.push({
          id: `proposal_${installation.id}`,
          installationId: installation.id,
          client: installation.client,
          address: installation.address,
          type: installation.type,
          model: installation.model,
          contractType: installation.contractType,
          contractEnd: installation.contractEnd,
          contractValue: installation.contractValue,
          lastMaintenance: installation.lastMaintenance,
          nextMaintenance: nextDate,
          installDate: installation.installDate
        });
      }
    }
  });
  
  // Sort by priority (contract-based first, then by urgency)
  return proposals.sort((a, b) => {
    // Contract-based maintenance first
    if (a.contractType && !b.contractType) return -1;
    if (!a.contractType && b.contractType) return 1;
    
    // Then by urgency (days until maintenance)
    const aStatus = getMaintenanceStatus({ id: a.installationId, type: a.type, client: a.client, address: a.address });
    const bStatus = getMaintenanceStatus({ id: b.installationId, type: b.type, client: b.client, address: b.address });
    
    if (aStatus.daysUntil !== null && bStatus.daysUntil !== null) {
      return aStatus.daysUntil - bStatus.daysUntil;
    }
    
    return 0;
  });
}

function planSingleMaintenance(installationId) {
  const installation = state.installations.find(inst => inst.id === installationId);
  if (!installation) {
    toast("❌ Installatie niet gevonden");
    return;
  }
  
  const maintenanceDate = calculateNextMaintenanceDate(installation);
  if (!maintenanceDate) {
    toast("❌ Kan geen onderhoudsdatum berekenen");
    return;
  }
  
  // Check if already planned
  const existingEvent = state.calendarEvents.find(event => 
    event.extendedProps?.installationId === installation.id &&
    event.title.toLowerCase().includes('onderhoud')
  );
  
  if (existingEvent) {
    toast("ℹ️ Onderhoud is al ingepland");
    return;
  }
  
  const maintenanceEvent = {
    id: `maintenance_${installation.id}_${maintenanceDate.getTime()}`,
    title: `🔧 Onderhoud ${installation.type} — ${installation.client}`,
    start: maintenanceDate.toISOString(),
    end: new Date(maintenanceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    extendedProps: {
      client: installation.client,
      address: installation.address,
      technician: getPreferredTechnician(installation.type),
      notes: `Onderhoud: ${installation.type}${installation.model ? '\nModel: ' + installation.model : ''}${installation.contractType ? '\nContract: ' + installation.contractType : '\nGeen contract'}${installation.contractValue ? '\nContract waarde: €' + installation.contractValue + '/jaar' : ''}`,
      priority: installation.contractType ? 'normal' : 'low',
      contractBased: !!installation.contractType,
      installationId: installation.id,
      maintenanceType: installation.contractType ? 'contract' : 'preventive',
      estimatedDuration: 120, // 2 hours in minutes
      requiredSkills: getRequiredSkillsForType(installation.type)
    }
  };
  
  state.calendarEvents.push(maintenanceEvent);
  saveState();
  updateDashboard();
  
  // Log the maintenance planning
  logEventChange(maintenanceEvent, 'maintenance_scheduled', {
    installationId: installation.id,
    maintenanceType: installation.contractType ? 'contract' : 'preventive',
    scheduledDate: maintenanceDate.toISOString()
  });
  
  // Refresh the modal
  generateMaintenanceProposalsInModal();
  
  toast(`✅ Onderhoud ingepland voor ${installation.client} op ${maintenanceDate.toLocaleDateString('nl-NL')}`);
}

function renderContractSummary(installations = null) {
  const container = $("#contractSummary");
  if (!container) return;
  
  const allInstallations = installations || state.installations || [];
  
  // Count contract statuses
  const summary = {
    active: 0,
    expiring: 0,
    expired: 0,
    none: 0
  };
  
  let totalRevenue = 0;
  
  allInstallations.forEach(installation => {
    const status = getContractStatus(installation);
    summary[status.status]++;
    
    // Calculate revenue using actual contract values
    if (status.status === 'active' || status.status === 'expiring') {
      if (installation.contractValue) {
        totalRevenue += installation.contractValue;
      } else {
        // Fallback to estimated values if no specific value set
        const contractValue = getContractValue(installation.contractType);
        totalRevenue += contractValue;
      }
    }
  });
  
  const summaryHTML = `
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--ok), 0.1), rgba(var(--ok), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--ok), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">🟢</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--ok));">${summary.active}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Actieve contracten</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--warn), 0.1), rgba(var(--warn), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--warn), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">🟡</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--warn));">${summary.expiring}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Verlopen binnenkort</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--err), 0.1), rgba(var(--err), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--err), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">🔴</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--err));">${summary.expired}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Verlopen contracten</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--txt-3), 0.1), rgba(var(--txt-3), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--txt-3), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">⚪</div>
      <div style="font-size: 1.5em; font-weight: 600; color: rgb(var(--txt-2));">${summary.none}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Geen contract</div>
    </div>
    
    <div style="padding: 16px; background: linear-gradient(135deg, rgba(var(--brand-1), 0.1), rgba(var(--brand-1), 0.05)); border-radius: 12px; border: 1px solid rgba(var(--brand-1), 0.3);">
      <div style="font-size: 2em; margin-bottom: 8px;">💰</div>
      <div style="font-size: 1.2em; font-weight: 600; color: rgb(var(--brand-1));">€${totalRevenue.toLocaleString('nl-NL')}</div>
      <div style="color: rgb(var(--txt-2)); font-size: 0.9em;">Geschatte jaaromzet</div>
    </div>
  `;
  
  container.innerHTML = summaryHTML;
}

function getContractValue(contractType) {
  // Estimate annual contract values
  const values = {
    'Basis': 150,
    'Uitgebreid': 300,
    'Full-service': 500
  };
  return values[contractType] || 0;
}

/* -------------------- OBSERVABILITY & QUALITY -------------------- */

// Global metrics object
window.planwiseMetrics = {
  // Performance metrics
  pageLoads: 0,
  apiCalls: 0,
  apiErrors: 0,
  schedulerRuns: 0,
  schedulerRuntime: 0,
  
  // Business metrics
  ticketsCreated: 0,
  proposalsGenerated: 0,
  appointmentsScheduled: 0,
  maintenancePlanned: 0,
  
  // User interaction metrics
  roleSwitches: 0,
  loginAttempts: 0,
  successfulLogins: 0,
  
  // Error tracking
  errors: [],
  warnings: [],
  
  // Performance tracking
  pageLoadTimes: [],
  functionExecutionTimes: {},
  
  // Start time for session tracking
  sessionStart: new Date(),
  
  // Reset metrics
  reset() {
    this.pageLoads = 0;
    this.apiCalls = 0;
    this.apiErrors = 0;
    this.schedulerRuns = 0;
    this.schedulerRuntime = 0;
    this.ticketsCreated = 0;
    this.proposalsGenerated = 0;
    this.appointmentsScheduled = 0;
    this.maintenancePlanned = 0;
    this.roleSwitches = 0;
    this.loginAttempts = 0;
    this.successfulLogins = 0;
    this.errors = [];
    this.warnings = [];
    this.pageLoadTimes = [];
    this.functionExecutionTimes = {};
    this.sessionStart = new Date();
  },
  
  // Get metrics summary
  getSummary() {
    const sessionDuration = new Date() - this.sessionStart;
    return {
      session: {
        duration: sessionDuration,
        startTime: this.sessionStart,
        pageLoads: this.pageLoads,
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      performance: {
        avgPageLoadTime: this.pageLoadTimes.length > 0 ? 
          this.pageLoadTimes.reduce((a, b) => a + b, 0) / this.pageLoadTimes.length : 0,
        avgSchedulerRuntime: this.schedulerRuns > 0 ? this.schedulerRuntime / this.schedulerRuns : 0
      },
      business: {
        ticketsCreated: this.ticketsCreated,
        proposalsGenerated: this.proposalsGenerated,
        appointmentsScheduled: this.appointmentsScheduled,
        maintenancePlanned: this.maintenancePlanned
      },
      api: {
        calls: this.apiCalls,
        errors: this.apiErrors,
        successRate: this.apiCalls > 0 ? ((this.apiCalls - this.apiErrors) / this.apiCalls) * 100 : 100
      },
      user: {
        roleSwitches: this.roleSwitches,
        loginAttempts: this.loginAttempts,
        successfulLogins: this.successfulLogins,
        loginSuccessRate: this.loginAttempts > 0 ? (this.successfulLogins / this.loginAttempts) * 100 : 0
      }
    };
  }
};

// Enhanced logging system
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

// PlanWise - Planning & Scheduling Application
// Version: 4.0.0
// Last Updated: 2024-12-19

// Global Error Handling - Ensure UI remains functional after errors
(function() {
  // Toast notification system for errors
  function showErrorToast(message, duration = 5000) {
    // Remove existing error toasts
    const existingToasts = document.querySelectorAll('.error-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles if not already present
    if (!document.querySelector('#error-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'error-toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    });
  }
  
  // Global error handler
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    
    // Don't show toast for expected errors (like network failures)
    if (message && (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('Script error')
    )) {
      return false; // Don't prevent default handling
    }
    
    // Show user-friendly error message
    const userMessage = 'Er is een fout opgetreden. Probeer de pagina te verversen of neem contact op met de beheerder.';
    showErrorToast(userMessage);
    
    // Ensure login modal can still be opened
    if (typeof showLoginModal === 'function') {
      // Add a small delay to ensure the error doesn't interfere
      setTimeout(() => {
        try {
          // Check if we can still access the login modal
          const loginModal = document.getElementById('loginModal');
          if (loginModal && typeof openModal === 'function') {
            console.log('Login modal is still accessible after error');
          }
        } catch (e) {
          console.warn('Could not verify login modal accessibility:', e);
        }
      }, 100);
    }
    
    return false; // Don't prevent default error handling
  };
  
  // Unhandled promise rejection handler
  window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show toast for expected rejections
    if (event.reason && (
      event.reason.message && (
        event.reason.message.includes('Failed to fetch') ||
        event.reason.message.includes('NetworkError') ||
        event.reason.message.includes('User cancelled')
      )
    )) {
      return;
    }
    
    // Show user-friendly error message
    const userMessage = 'Er is een onverwachte fout opgetreden. Probeer de pagina te verversen.';
    showErrorToast(userMessage);
    
    // Prevent the default browser behavior (unhandledrejection event)
    event.preventDefault();
  };
  
  // Add error boundary for critical functions
  window.safeExecute = function(fn, fallback, context = 'unknown') {
    try {
      return fn();
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      if (fallback) {
        try {
          return fallback(error);
        } catch (fallbackError) {
          console.error(`Fallback also failed in ${context}:`, fallbackError);
          showErrorToast('Kritieke fout opgetreden. Herlaad de pagina.');
        }
      }
      return null;
    }
  };
  
  console.log('Global error handling initialized');
})();

// ... rest of the code ...

// Health check function
function runHealthCheck() {
  console.log('🏥 Running PlanWise health check...');
  
  const health = {
    status: 'healthy',
    checks: [],
    timestamp: new Date().toISOString()
  };
  
  // Check 1: Application state
  const stateCheck = {
    name: 'Application State',
    status: 'healthy',
    details: {}
  };
  
  try {
    if (!state) {
      stateCheck.status = 'unhealthy';
      stateCheck.details.error = 'State not initialized';
    } else {
      stateCheck.details.tickets = state.tickets?.length || 0;
      stateCheck.details.technicians = state.technicians?.length || 0;
      stateCheck.details.calendarEvents = state.calendarEvents?.length || 0;
      stateCheck.details.installations = state.installations?.length || 0;
    }
  } catch (error) {
    stateCheck.status = 'unhealthy';
    stateCheck.details.error = error.message;
  }
  
  health.checks.push(stateCheck);
  
  // Check 2: User authentication
  const authCheck = {
    name: 'Authentication',
    status: 'healthy',
    details: {}
  };
  
  try {
    authCheck.details.currentUser = currentAuth?.user || 'none';
    authCheck.details.currentTenant = currentAuth?.orgSlug || 'none';
    authCheck.details.isSuperAdmin = currentAuth?.role === 'superadmin';
    authCheck.details.currentRole = getCurrentUserRole();
  } catch (error) {
    authCheck.status = 'unhealthy';
    authCheck.details.error = error.message;
  }
  
  health.checks.push(authCheck);
  
  // Check 3: Performance metrics
  const perfCheck = {
    name: 'Performance',
    status: 'healthy',
    details: {}
  };
  
  try {
    const metrics = window.planwiseMetrics.getSummary();
    perfCheck.details.avgPageLoadTime = metrics.performance.avgPageLoadTime;
    perfCheck.details.avgSchedulerRuntime = metrics.performance.avgSchedulerRuntime;
    perfCheck.details.errorCount = metrics.session.errors;
    perfCheck.details.warningCount = metrics.session.warnings;
    
    // Mark as unhealthy if too many errors
    if (metrics.session.errors > 10) {
      perfCheck.status = 'unhealthy';
      perfCheck.details.error = 'Too many errors detected';
    }
  } catch (error) {
    perfCheck.status = 'unhealthy';
    perfCheck.details.error = error.message;
  }
  
  health.checks.push(perfCheck);
  
  // Check 4: Storage
  const storageCheck = {
    name: 'Storage',
    status: 'healthy',
    details: {}
  };
  
  try {
    const storageKey = getStorageKey();
    const storageData = localStorage.getItem(storageKey);
    storageCheck.details.storageKey = storageKey;
    storageCheck.details.dataSize = storageData ? storageData.length : 0;
    storageCheck.details.available = localStorage.length < 5000; // Approximate limit
    
    if (!storageCheck.details.available) {
      storageCheck.status = 'unhealthy';
      storageCheck.details.error = 'Storage limit approaching';
    }
  } catch (error) {
    storageCheck.status = 'unhealthy';
    storageCheck.details.error = error.message;
  }
  
  health.checks.push(storageCheck);
  
  // Determine overall health
  const unhealthyChecks = health.checks.filter(check => check.status === 'unhealthy');
  if (unhealthyChecks.length > 0) {
    health.status = 'unhealthy';
    health.details = {
      unhealthyChecks: unhealthyChecks.length,
      totalChecks: health.checks.length
    };
  }
  
  console.log('🏥 Health check completed:', health);
  return health;
}

// Auto-run health check every 5 minutes
setInterval(() => {
  if (currentAuth) { // Only run when user is logged in
    const health = runHealthCheck();
    if (health.status === 'unhealthy') {
      window.planwiseLogger.warn('Health check detected issues', health);
    }
  }
}, 5 * 60 * 1000);

// Add test and health check functions to global scope
window.runPlanwiseTests = () => window.planwiseTests.runAll();
window.runPlanwiseHealthCheck = runHealthCheck;

/* -------------------- MONTEUR DASHBOARD -------------------- */

// Load technician dashboard
function loadTechnicianDashboard() {
  console.log("Loading technician dashboard...");
  
  // Check if user has technician role
  if (!hasPermission('view_technician_dashboard')) {
    toast("❌ Geen toegang tot monteur dashboard");
    go('dashboard');
    return;
  }
  
  // Load tasks for current technician
  loadTechnicianTasks();
  
  // Check offline status
  checkOfflineStatus();
}

// Load technician tasks
function loadTechnicianTasks() {
  try {
    const currentTech = getCurrentTechnician();
    if (!currentTech) {
      console.warn("No technician found for current user");
      return;
    }
    
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get tasks from calendar events
    const allTasks = state.calendarEvents.filter(event => 
      event.extendedProps?.tech === currentTech.name
    );
    
    // Categorize tasks
    const todayTasks = allTasks.filter(task => {
      const taskDate = new Date(task.start).toISOString().split('T')[0];
      return taskDate === todayStr;
    });
    
    const upcomingTasks = allTasks.filter(task => {
      const taskDate = new Date(task.start);
      return taskDate > today && !task.completed;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
    
    const completedTasks = allTasks.filter(task => task.completed);
    
    // Render task lists
    renderTaskList('todayTasks', todayTasks, 'Vandaag geen taken');
    renderTaskList('upcomingTasks', upcomingTasks, 'Geen aankomende taken');
    renderTaskList('completedTasks', completedTasks, 'Geen voltooide taken');
    
    // Cache data for offline use
    cacheTechnicianData({
      todayTasks,
      upcomingTasks,
      completedTasks,
      lastSync: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error loading technician tasks:", error);
    toast("❌ Fout bij laden taken");
  }
}

// Get current technician
function getCurrentTechnician() {
  const currentUser = getCurrentUserName();
  return state.technicians.find(tech => tech.name === currentUser);
}

// Render task list
function renderTaskList(containerId, tasks, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }
  
  container.innerHTML = tasks.map(task => `
    <div class="task-card" onclick="openWorkOrder('${task.id}')">
      <div class="task-header">
        <h4>${task.title}</h4>
        <span class="task-time">${fmtDateTime(task.start)}</span>
      </div>
      <div class="task-details">
        <div class="task-client">👤 ${task.extendedProps?.client || 'Onbekend'}</div>
        <div class="task-address">📍 ${task.extendedProps?.address || 'Onbekend'}</div>
        <div class="task-type">🔧 ${task.extendedProps?.type || 'Algemeen'}</div>
      </div>
      <div class="task-actions">
        <button class="btn small" onclick="event.stopPropagation(); openWorkOrder('${task.id}')">📋 Werkbon</button>
        <button class="btn small" onclick="event.stopPropagation(); navigateToTask('${task.extendedProps?.address || ''}')">🧭 Navigeer</button>
      </div>
    </div>
  `).join('');
}

// Open work order
function openWorkOrder(taskId) {
  const task = state.calendarEvents.find(event => event.id === taskId);
  if (!task) {
    toast("❌ Taak niet gevonden");
    return;
  }
  
  // Populate work order modal
  document.getElementById('workOrderTitle').textContent = task.title;
  document.getElementById('workOrderClient').textContent = task.extendedProps?.client || 'Onbekend';
  document.getElementById('workOrderAddress').textContent = task.extendedProps?.address || 'Onbekend';
  document.getElementById('workOrderDateTime').textContent = fmtDateTime(task.start);
  document.getElementById('workOrderType').textContent = task.extendedProps?.type || 'Algemeen';
  
  // Load existing work order data
  loadWorkOrderData(taskId);
  
  // Show modal
  const modal = document.getElementById('workOrderModal');
  modal.showModal();
  
  // Initialize signature canvas
  initSignatureCanvas();
}

// Load work order data
function loadWorkOrderData(taskId) {
  // Get or create work order data
  if (!state.workOrders) state.workOrders = {};
  
  const workOrder = state.workOrders[taskId] || {
    checklist: [],
    materials: [],
    photos: [],
    notes: '',
    signature: null,
    status: 'draft'
  };
  
  // Populate checklist
  renderChecklist(workOrder.checklist);
  
  // Populate materials
  renderMaterials(workOrder.materials);
  
  // Populate photos
  renderPhotos(workOrder.photos);
  
  // Populate notes
  document.getElementById('workOrderNotes').value = workOrder.notes || '';
  
  // Store current task ID
  window.currentWorkOrderId = taskId;
}

// Render checklist
function renderChecklist(checklist) {
  const container = document.getElementById('workOrderChecklist');
  container.innerHTML = checklist.map((item, index) => `
    <div class="checklist-item">
      <input type="checkbox" id="check_${index}" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem(${index})">
      <label for="check_${index}">${item.text}</label>
      <button class="btn small danger" onclick="removeChecklistItem(${index})">🗑️</button>
    </div>
  `).join('');
}

// Render materials
function renderMaterials(materials) {
  const container = document.getElementById('workOrderMaterials');
  container.innerHTML = materials.map((item, index) => `
    <div class="material-item">
      <input type="text" value="${item.name}" placeholder="Materiaal naam" onchange="updateMaterial(${index}, 'name', this.value)">
      <input type="number" value="${item.quantity}" placeholder="Aantal" onchange="updateMaterial(${index}, 'quantity', this.value)">
      <button class="btn small danger" onclick="removeMaterial(${index})">🗑️</button>
    </div>
  `).join('');
}

// Render photos
function renderPhotos(photos) {
  const container = document.getElementById('workOrderPhotos');
  container.innerHTML = photos.map((photo, index) => `
    <div class="photo-item">
      <img src="${photo.url}" alt="Foto ${index + 1}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
      <button class="btn small danger" onclick="removePhoto(${index})">🗑️</button>
    </div>
  `).join('');
}

// Add checklist item
function addChecklistItem() {
  const taskId = window.currentWorkOrderId;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  if (!state.workOrders[taskId].checklist) state.workOrders[taskId].checklist = [];
  
  const newItem = {
    text: prompt("Voeg checklist item toe:"),
    completed: false
  };
  
  if (newItem.text) {
    state.workOrders[taskId].checklist.push(newItem);
    renderChecklist(state.workOrders[taskId].checklist);
    saveState();
  }
}

// Add material item
function addMaterialItem() {
  const taskId = window.currentWorkOrderId;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  if (!state.workOrders[taskId].materials) state.workOrders[taskId].materials = [];
  
  const newItem = {
    name: prompt("Materiaal naam:"),
    quantity: 1
  };
  
  if (newItem.name) {
    state.workOrders[taskId].materials.push(newItem);
    renderMaterials(state.workOrders[taskId].materials);
    saveState();
  }
}

// Handle photo upload
function handlePhotoUpload(event) {
  const files = event.target.files;
  const taskId = window.currentWorkOrderId;
  
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  if (!state.workOrders[taskId].photos) state.workOrders[taskId].photos = [];
  
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const photo = {
        url: e.target.result,
        filename: file.name,
        timestamp: new Date().toISOString()
      };
      
      state.workOrders[taskId].photos.push(photo);
      renderPhotos(state.workOrders[taskId].photos);
      saveState();
    };
    reader.readAsDataURL(file);
  });
}

// Initialize signature canvas
function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  function startDrawing(e) {
    isDrawing = true;
    draw(e);
  }
  
  function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  
  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
  }
}

// Clear signature
function clearSignature() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Save signature
function saveSignature() {
  const canvas = document.getElementById('signatureCanvas');
  const taskId = window.currentWorkOrderId;
  
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  
  state.workOrders[taskId].signature = canvas.toDataURL();
  saveState();
  toast("✍️ Handtekening opgeslagen");
}

// Save work order as draft
function saveWorkOrderAsDraft() {
  const taskId = window.currentWorkOrderId;
  if (!taskId) return;
  
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  
  state.workOrders[taskId].notes = document.getElementById('workOrderNotes').value;
  state.workOrders[taskId].status = 'draft';
  state.workOrders[taskId].lastModified = new Date().toISOString();
  
  saveState();
  toast("💾 Werkbon opgeslagen als concept");
}

// Complete work order
function completeWorkOrder() {
  const taskId = window.currentWorkOrderId;
  if (!taskId) return;
  
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  
  const workOrder = state.workOrders[taskId];
  
  // Validate completion
  if (!workOrder.signature) {
    toast("❌ Handtekening vereist");
    return;
  }
  
  // Mark task as completed
  const task = state.calendarEvents.find(event => event.id === taskId);
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
  }
  
  // Update work order
  workOrder.status = 'completed';
  workOrder.completedAt = new Date().toISOString();
  workOrder.notes = document.getElementById('workOrderNotes').value;
  
  saveState();
  
  // Close modal
  document.getElementById('workOrderModal').close();
  
  // Refresh task list
  loadTechnicianTasks();
  
  toast("✅ Werkbon voltooid");
}

// Navigate to task location
function navigateToTask(address) {
  if (!address || address === 'Onbekend') {
    toast("❌ Geen adres beschikbaar");
    return;
  }
  
  // Open in navigation app
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
}

// Refresh technician tasks
function refreshTechnicianTasks() {
  loadTechnicianTasks();
  toast("🔄 Taken vernieuwd");
}

// Sync offline data
function syncOfflineData() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_OFFLINE_DATA'
    });
  }
  toast("📡 Offline data gesynchroniseerd");
}

// Show offline status
function showOfflineStatus() {
  const isOnline = navigator.onLine;
  const status = isOnline ? '🟢 Online' : '🔴 Offline';
  toast(`📱 Status: ${status}`);
}

// Check offline status
function checkOfflineStatus() {
  if (!navigator.onLine) {
    toast("🔴 Offline modus - data wordt lokaal opgeslagen");
  }
}

// Cache technician data
function cacheTechnicianData(data) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_TECHNICIAN_DATA',
      data: data
    });
  }
}

// Console helpers for development
console.log(`
🔧 PlanWise Development Tools Available:

🧪 Tests:
  - runPlanwiseTests() - Run all E2E tests
  - runPlanwiseHealthCheck() - Run health check

📊 Metrics & Logging:
  - window.planwiseMetrics - View current metrics
  - window.planwiseLogger - Access logger instance
  - showDebugPanel() - Open debug panel (admin only)

🔍 Debug:
  - window.planwiseMetrics.getSummary() - Get metrics summary
  - window.planwiseLogger.getLogs() - Get recent logs
  - window.planwiseLogger.exportLogs() - Export all logs

💡 Quick Commands:
  - runPlanwiseTests() - Test all functionality
  - runPlanwiseHealthCheck() - Check system health
  - showDebugPanel() - Open debug panel
`);
