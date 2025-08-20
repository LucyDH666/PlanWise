/**
 * PlanWise Lite - Router Module
 * Handles hash-based navigation and route guards
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.init();
  }

  init() {
    // Set up hash change listener
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Handle initial route
    this.handleRouteChange();
  }

  /**
   * Register a route
   */
  register(route, handler) {
    this.routes.set(route, handler);
  }

  /**
   * Navigate to a route
   */
  go(route) {
    try {
      window.logService?.info('Navigating to route', { route });
      
      // Update hash
      window.location.hash = route;
      
      // Handle route change
      this.handleRouteChange();
    } catch (error) {
      window.logService?.error('Navigation error', { route, error: error.message });
    }
  }

  /**
   * Handle route change
   */
  handleRouteChange() {
    try {
      // Get current hash
      const hash = window.location.hash.slice(1) || 'dashboard';
      
      // Check if route exists
      if (!this.routes.has(hash)) {
        window.logService?.warning('Route not found', { route: hash });
        this.go('dashboard');
        return;
      }

      // Check authentication
      if (!this.checkAuth(hash)) {
        window.logService?.info('Auth required, redirecting to login');
        this.go('login');
        return;
      }

      // Check permissions
      if (!this.checkPermissions(hash)) {
        window.logService?.warning('Insufficient permissions', { route: hash });
        this.go('dashboard');
        return;
      }

      // Execute route handler
      const handler = this.routes.get(hash);
      if (handler) {
        this.currentRoute = hash;
        handler();
        
        // Update navigation
        window.ui?.updateNavigation(hash);
        
        window.logService?.info('Route loaded', { route: hash });
      }
    } catch (error) {
      window.logService?.error('Route change error', { error: error.message });
      this.go('dashboard');
    }
  }

  /**
   * Check if user is authenticated for route
   */
  checkAuth(route) {
    // Routes that don't require authentication
    const publicRoutes = ['login'];
    
    if (publicRoutes.includes(route)) {
      return true;
    }

    return window.authService?.isAuthenticated() || false;
  }

  /**
   * Check if user has permissions for route
   */
  checkPermissions(route) {
    if (!window.authService?.isAuthenticated()) {
      return false;
    }

    const auth = window.authService.getCurrentAuth();
    if (!auth) return false;

    // Route permissions
    const routePermissions = {
      'dashboard': 'view',
      'planner': 'view',
      'settings': 'view',
      'superadmin': 'manage_organizations',
      'logs': 'view_logs'
    };

    const requiredPermission = routePermissions[route];
    if (!requiredPermission) {
      return true; // No specific permission required
    }

    return window.authService.hasPermission(requiredPermission);
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get route parameters from hash
   */
  getRouteParams() {
    const hash = window.location.hash.slice(1);
    const [route, ...params] = hash.split('/');
    return { route, params };
  }

  /**
   * Build URL with parameters
   */
  buildUrl(route, params = []) {
    if (params.length === 0) {
      return `#${route}`;
    }
    return `#${route}/${params.join('/')}`;
  }
}

// Create global instance
window.router = new Router();

// Register default routes
window.router.register('login', () => {
  showLoginPage();
});

window.router.register('dashboard', () => {
  showDashboard();
});

window.router.register('planner', () => {
  showPlanner();
});

window.router.register('settings', () => {
  showSettings();
});

window.router.register('superadmin', () => {
  showSuperAdmin();
});

window.router.register('logs', () => {
  showLogs();
});

/**
 * Show login page
 */
function showLoginPage() {
  // Hide all routes
  document.querySelectorAll('.route').forEach(route => {
    route.classList.remove('active');
  });

  // Show login route
  const loginRoute = document.getElementById('route-login');
  if (loginRoute) {
    loginRoute.classList.add('active');
  }

  // Update page title
  document.title = 'Login - PlanWise Lite';
}

/**
 * Show dashboard
 */
function showDashboard() {
  // Hide all routes
  document.querySelectorAll('.route').forEach(route => {
    route.classList.remove('active');
  });

  // Show dashboard route
  const dashboardRoute = document.getElementById('route-dashboard');
  if (dashboardRoute) {
    dashboardRoute.classList.add('active');
  }

  // Load dashboard data
  loadDashboardData();

  // Update page title
  document.title = 'Dashboard - PlanWise Lite';
}

/**
 * Show planner
 */
function showPlanner() {
  // Hide all routes
  document.querySelectorAll('.route').forEach(route => {
    route.classList.remove('active');
  });

  // Show planner route
  const plannerRoute = document.getElementById('route-planner');
  if (plannerRoute) {
    plannerRoute.classList.add('active');
  }

  // Load planner data
  loadPlannerData();

  // Update page title
  document.title = 'Planner - PlanWise Lite';
}

/**
 * Show settings
 */
function showSettings() {
  // Hide all routes
  document.querySelectorAll('.route').forEach(route => {
    route.classList.remove('active');
  });

  // Show settings route
  const settingsRoute = document.getElementById('route-settings');
  if (settingsRoute) {
    settingsRoute.classList.add('active');
  }

  // Load settings data
  loadSettingsData();

  // Update page title
  document.title = 'Instellingen - PlanWise Lite';
}

/**
 * Show super admin
 */
function showSuperAdmin() {
  // Hide all routes
  document.querySelectorAll('.route').forEach(route => {
    route.classList.remove('active');
  });

  // Show super admin route
  const superAdminRoute = document.getElementById('route-superadmin');
  if (superAdminRoute) {
    superAdminRoute.classList.add('active');
  }

  // Load super admin data
  loadSuperAdminData();

  // Update page title
  document.title = 'Super Admin - PlanWise Lite';
}

/**
 * Show logs
 */
function showLogs() {
  // Hide all routes
  document.querySelectorAll('.route').forEach(route => {
    route.classList.remove('active');
  });

  // Show logs route
  const logsRoute = document.getElementById('route-logs');
  if (logsRoute) {
    logsRoute.classList.add('active');
  }

  // Load logs data
  loadLogsData();

  // Update page title
  document.title = 'Logs - PlanWise Lite';
}

/**
 * Load dashboard data
 */
function loadDashboardData() {
  try {
    const auth = window.authService.getCurrentAuth();
    if (!auth) return;

    const state = window.dataService.loadOrgState(auth.orgSlug);
    if (!state) return;

    // Update dashboard content
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
      const eventCount = state.events.length;
      const userCount = state.users.length;
      
      dashboardContent.innerHTML = `
        <div class="grid grid-3">
          <div class="card">
            <h3>Afspraken</h3>
            <p style="font-size: 2rem; font-weight: bold; color: var(--primary);">${eventCount}</p>
          </div>
          <div class="card">
            <h3>Gebruikers</h3>
            <p style="font-size: 2rem; font-weight: bold; color: var(--primary);">${userCount}</p>
          </div>
          <div class="card">
            <h3>Organisatie</h3>
            <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${auth.orgSlug}</p>
          </div>
        </div>
        <div class="card">
          <h3>Welkom, ${auth.name}!</h3>
          <p>Je bent ingelogd als <span class="role-badge role-${auth.role}">${auth.role}</span></p>
        </div>
      `;
    }
  } catch (error) {
    window.logService?.error('Failed to load dashboard data', { error: error.message });
  }
}

/**
 * Load planner data
 */
function loadPlannerData() {
  try {
    const auth = window.authService.getCurrentAuth();
    if (!auth) return;

    const events = window.dataService.getEvents(auth.orgSlug);
    
    // Update planner content
    const plannerContent = document.getElementById('planner-content');
    if (plannerContent) {
      if (events.length === 0) {
        plannerContent.innerHTML = `
          <div class="card">
            <h3>Geen afspraken</h3>
            <p>Er zijn nog geen afspraken gepland.</p>
            <button class="btn btn-primary" onclick="showAddEventModal()">Afspraak toevoegen</button>
          </div>
        `;
      } else {
        const eventsHtml = events.map(event => `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4>${event.title}</h4>
                <p>${event.date} ${event.time}</p>
                ${event.technician ? `<p>Monteur: ${event.technician}</p>` : ''}
              </div>
              <div>
                <button class="btn btn-small btn-secondary" onclick="editEvent('${event.id}')">Bewerken</button>
                <button class="btn btn-small btn-danger" onclick="deleteEvent('${event.id}')">Verwijderen</button>
              </div>
            </div>
          </div>
        `).join('');

        plannerContent.innerHTML = `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3>Afspraken (${events.length})</h3>
              <button class="btn btn-primary" onclick="showAddEventModal()">Afspraak toevoegen</button>
            </div>
          </div>
          ${eventsHtml}
        `;
      }
    }
  } catch (error) {
    window.logService?.error('Failed to load planner data', { error: error.message });
  }
}

/**
 * Load settings data
 */
function loadSettingsData() {
  try {
    const auth = window.authService.getCurrentAuth();
    if (!auth) return;

    const settings = window.dataService.getSettings(auth.orgSlug);
    
    // Update settings content
    const settingsContent = document.getElementById('settings-content');
    if (settingsContent) {
      settingsContent.innerHTML = `
        <div class="card">
          <h3>Werktijden</h3>
          <form onsubmit="saveSettings(event)">
            <div class="form-group">
              <label>Start tijd</label>
              <input type="time" class="form-input" id="work-start" value="${settings.workingHours.start}">
            </div>
            <div class="form-group">
              <label>Eind tijd</label>
              <input type="time" class="form-input" id="work-end" value="${settings.workingHours.end}">
            </div>
            <button type="submit" class="btn btn-primary">Opslaan</button>
          </form>
        </div>
      `;
    }
  } catch (error) {
    window.logService?.error('Failed to load settings data', { error: error.message });
  }
}

/**
 * Load super admin data
 */
function loadSuperAdminData() {
  try {
    const organizations = window.dataService.getAllOrganizations();
    
    // Update super admin content
    const superAdminContent = document.getElementById('superadmin-content');
    if (superAdminContent) {
      const orgsHtml = organizations.map(org => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4>${org.name}</h4>
              <p>Slug: ${org.slug}</p>
            </div>
            <div>
              <button class="btn btn-small btn-secondary" onclick="switchToOrg('${org.slug}')">Beheren</button>
            </div>
          </div>
        </div>
      `).join('');

      superAdminContent.innerHTML = `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Organisaties (${organizations.length})</h3>
            <button class="btn btn-primary" onclick="showAddOrgModal()">Organisatie toevoegen</button>
          </div>
        </div>
        ${orgsHtml}
      `;
    }
  } catch (error) {
    window.logService?.error('Failed to load super admin data', { error: error.message });
  }
}

/**
 * Load logs data
 */
function loadLogsData() {
  try {
    const logs = window.logService?.getLogs() || [];
    
    // Update logs content
    const logsContent = document.getElementById('logs-content');
    if (logsContent) {
      const logsHtml = logs.map(log => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h4>[${log.level.toUpperCase()}] ${log.message}</h4>
              <p>${new Date(log.timestamp).toLocaleString()}</p>
              ${log.data ? `<pre style="background: var(--gray-100); padding: 0.5rem; border-radius: 4px; font-size: 0.875rem;">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
            </div>
          </div>
        </div>
      `).join('');

      logsContent.innerHTML = `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3>Logs (${logs.length})</h3>
            <button class="btn btn-secondary" onclick="clearLogs()">Logs wissen</button>
          </div>
        </div>
        ${logsHtml}
      `;
    }
  } catch (error) {
    window.logService?.error('Failed to load logs data', { error: error.message });
  }
}
