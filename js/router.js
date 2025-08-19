/**
 * PlanWise Lite - Router Service
 * Handles hash-based routing and navigation
 */

class PlanWiseRouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.defaultRoute = 'dashboard';
    this.init();
  }

  /**
   * Initialize router
   */
  init() {
    this.setupRoutes();
    this.setupEventListeners();
    this.handleInitialRoute();
  }

  /**
   * Setup route definitions
   */
  setupRoutes() {
    this.routes.set('dashboard', {
      path: 'dashboard',
      title: 'Dashboard',
      permission: 'view_dashboard',
      handler: () => this.loadDashboard()
    });

    this.routes.set('planner', {
      path: 'planner',
      title: 'Planner',
      permission: 'view_planner',
      handler: () => this.loadPlanner()
    });

    this.routes.set('organizations', {
      path: 'organizations',
      title: 'Organisaties',
      permission: 'superadmin',
      handler: () => this.loadOrganizations()
    });

    this.routes.set('users', {
      path: 'users',
      title: 'Gebruikers',
      permission: 'superadmin',
      handler: () => this.loadUsers()
    });

    this.routes.set('settings', {
      path: 'settings',
      title: 'Instellingen',
      permission: 'edit_settings',
      handler: () => this.loadSettings()
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Handle navigation button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-route]')) {
        e.preventDefault();
        const route = e.target.getAttribute('data-route');
        this.navigate(route);
      }
    });
  }

  /**
   * Handle initial route on page load
   */
  handleInitialRoute() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      this.navigate(hash);
    } else {
      this.navigate(this.defaultRoute);
    }
  }

  /**
   * Handle route changes
   */
  handleRouteChange() {
    const hash = window.location.hash.slice(1);
    this.navigate(hash);
  }

  /**
   * Navigate to a route
   */
  navigate(route) {
    try {
      // Check if route exists
      if (!this.routes.has(route)) {
        console.warn(`Route '${route}' not found, redirecting to default`);
        this.navigate(this.defaultRoute);
        return;
      }

      const routeConfig = this.routes.get(route);

      // Check permissions
      if (!window.authService.hasPermission(routeConfig.permission)) {
        window.uiService.showToast('Access denied', 'error');
        return;
      }

      // Update URL
      window.location.hash = route;

      // Update navigation
      this.updateNavigation(route);

      // Load route content
      routeConfig.handler();

      // Update current route
      this.currentRoute = route;

    } catch (error) {
      console.error('Navigation error:', error);
      window.uiService.showToast('Navigation error', 'error');
    }
  }

  /**
   * Update navigation state
   */
  updateNavigation(activeRoute) {
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.nav-btn[data-route]');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to current route button
    const activeButton = document.querySelector(`[data-route="${activeRoute}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }

  /**
   * Hide all routes
   */
  hideAllRoutes() {
    const routes = document.querySelectorAll('.route');
    routes.forEach(route => {
      route.classList.remove('active');
    });
  }

  /**
   * Show a specific route
   */
  showRoute(routeId) {
    this.hideAllRoutes();
    const route = document.getElementById(routeId);
    if (route) {
      route.classList.add('active');
    }
  }

  /**
   * Load dashboard route
   */
  loadDashboard() {
    this.showRoute('route-dashboard');
    this.loadDashboardData();
  }

  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    try {
      const organization = window.authService.getCurrentOrganization();
      const state = window.dataService.loadState(organization);
      
      // Update stats
      this.updateDashboardStats(state);
      
      // Initialize calendar
      this.initCalendar();
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      window.uiService.showToast('Error loading dashboard', 'error');
    }
  }

  /**
   * Update dashboard statistics
   */
  updateDashboardStats(state) {
    const today = new Date().toDateString();
    const todayJobs = state.jobs.filter(job => 
      new Date(job.createdAt).toDateString() === today
    );
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekJobs = state.jobs.filter(job => 
      new Date(job.createdAt) >= weekStart
    );

    // Update today stats
    const todayJobsEl = document.getElementById('todayJobs');
    const todayTechniciansEl = document.getElementById('todayTechnicians');
    
    if (todayJobsEl) todayJobsEl.textContent = todayJobs.length;
    if (todayTechniciansEl) todayTechniciansEl.textContent = state.technicians.length;

    // Update week stats
    const weekJobsEl = document.getElementById('weekJobs');
    const weekHoursEl = document.getElementById('weekHours');
    
    if (weekJobsEl) weekJobsEl.textContent = weekJobs.length;
    if (weekHoursEl) weekHoursEl.textContent = weekJobs.length * 2; // Estimate 2 hours per job
  }

  /**
   * Initialize FullCalendar
   */
  initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !window.FullCalendar) return;

    try {
      // Destroy existing calendar if it exists
      if (this.calendar) {
        this.calendar.destroy();
      }

      // Create new calendar
      this.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'nl',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: this.getCalendarEvents(),
        eventClick: (info) => {
          this.handleEventClick(info.event);
        },
        eventDrop: (info) => {
          this.handleEventDrop(info.event);
        },
        eventResize: (info) => {
          this.handleEventResize(info.event);
        }
      });

      this.calendar.render();
    } catch (error) {
      console.error('Error initializing calendar:', error);
    }
  }

  /**
   * Get calendar events from jobs
   */
  getCalendarEvents() {
    try {
      const organization = window.authService.getCurrentOrganization();
      const state = window.dataService.loadState(organization);
      
      return state.jobs
        .filter(job => job.status === 'scheduled' && job.scheduledDate)
        .map(job => ({
          id: job.id,
          title: `${job.customer} - ${job.category}`,
          start: job.scheduledDate,
          end: job.scheduledEndDate || new Date(new Date(job.scheduledDate).getTime() + 2 * 60 * 60 * 1000), // 2 hours default
          backgroundColor: this.getJobColor(job.category),
          borderColor: this.getJobColor(job.category),
          extendedProps: {
            jobId: job.id,
            customer: job.customer,
            address: job.address,
            category: job.category,
            description: job.description
          }
        }));
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  }

  /**
   * Get color for job category
   */
  getJobColor(category) {
    const colors = {
      'CV-onderhoud': '#3b82f6',
      'Loodgieter': '#10b981',
      'Elektra': '#f59e0b',
      'Airco/Koeling': '#8b5cf6',
      'Algemeen': '#6b7280'
    };
    return colors[category] || '#6b7280';
  }

  /**
   * Handle calendar event click
   */
  handleEventClick(event) {
    const jobId = event.extendedProps.jobId;
    // TODO: Show job details modal
    console.log('Event clicked:', jobId);
  }

  /**
   * Handle calendar event drop
   */
  handleEventDrop(event) {
    const jobId = event.extendedProps.jobId;
    const newDate = event.start;
    
    try {
      const organization = window.authService.getCurrentOrganization();
      window.dataService.updateJob(organization, jobId, {
        scheduledDate: newDate.toISOString()
      });
      
      window.uiService.showToast('Job rescheduled successfully', 'success');
    } catch (error) {
      console.error('Error rescheduling job:', error);
      window.uiService.showToast('Error rescheduling job', 'error');
      // Refresh calendar to revert changes
      this.calendar.refetchEvents();
    }
  }

  /**
   * Handle calendar event resize
   */
  handleEventResize(event) {
    const jobId = event.extendedProps.jobId;
    const newStart = event.start;
    const newEnd = event.end;
    
    try {
      const organization = window.authService.getCurrentOrganization();
      window.dataService.updateJob(organization, jobId, {
        scheduledDate: newStart.toISOString(),
        scheduledEndDate: newEnd.toISOString()
      });
      
      window.uiService.showToast('Job duration updated', 'success');
    } catch (error) {
      console.error('Error updating job duration:', error);
      window.uiService.showToast('Error updating job duration', 'error');
      // Refresh calendar to revert changes
      this.calendar.refetchEvents();
    }
  }

  /**
   * Load planner route
   */
  loadPlanner() {
    this.showRoute('route-planner');
    this.loadPlannerData();
  }

  /**
   * Load planner data
   */
  async loadPlannerData() {
    try {
      const organization = window.authService.getCurrentOrganization();
      const jobs = window.dataService.getJobs(organization);
      
      this.renderJobLists(jobs);
      
    } catch (error) {
      console.error('Error loading planner:', error);
      window.uiService.showToast('Error loading planner', 'error');
    }
  }

  /**
   * Render job lists in planner
   */
  renderJobLists(jobs) {
    const containers = {
      new: document.getElementById('newJobs'),
      planned: document.getElementById('plannedJobs'),
      inProgress: document.getElementById('inProgressJobs'),
      completed: document.getElementById('completedJobs')
    };

    // Clear all containers
    Object.values(containers).forEach(container => {
      if (container) container.innerHTML = '';
    });

    // Group jobs by status
    const groupedJobs = {
      new: jobs.filter(job => job.status === 'new'),
      planned: jobs.filter(job => job.status === 'scheduled'),
      inProgress: jobs.filter(job => job.status === 'in_progress'),
      completed: jobs.filter(job => job.status === 'completed')
    };

    // Render each group
    Object.entries(groupedJobs).forEach(([status, statusJobs]) => {
      const container = containers[status];
      if (container) {
        statusJobs.forEach(job => {
          container.appendChild(this.createJobCard(job));
        });
      }
    });
  }

  /**
   * Create job card element
   */
  createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.innerHTML = `
      <div class="job-header">
        <h4>${job.customer}</h4>
        <span class="job-category">${job.category}</span>
      </div>
      <div class="job-details">
        <p>${job.address}</p>
        <p class="job-description">${job.description || 'No description'}</p>
        <p class="job-date">${window.uiService.formatDate(job.createdAt)}</p>
      </div>
      <div class="job-actions">
        <button class="btn btn-small" onclick="router.editJob('${job.id}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="router.deleteJob('${job.id}')">Delete</button>
      </div>
    `;
    return card;
  }

  /**
   * Load organizations route (super admin only)
   */
  loadOrganizations() {
    this.showRoute('route-organizations');
    this.loadOrganizationsData();
  }

  /**
   * Load organizations data
   */
  async loadOrganizationsData() {
    try {
      const organizations = window.dataService.getAllOrganizations();
      this.renderOrganizationsTable(organizations);
      
    } catch (error) {
      console.error('Error loading organizations:', error);
      window.uiService.showToast('Error loading organizations', 'error');
    }
  }

  /**
   * Render organizations table
   */
  renderOrganizationsTable(organizations) {
    const tbody = document.querySelector('#organizationsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    organizations.forEach(org => {
      const info = window.dataService.getOrganizationInfo(org);
      if (info) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${info.slug}</td>
          <td>${info.name}</td>
          <td>${window.authService.getOrganizationUsers(org).length}</td>
          <td>${info.plan}</td>
          <td><span class="status-active">Active</span></td>
          <td>
            <button class="btn btn-small" onclick="router.editOrganization('${org}')">Edit</button>
            <button class="btn btn-small btn-danger" onclick="router.deleteOrganization('${org}')">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      }
    });
  }

  /**
   * Load users route (super admin only)
   */
  loadUsers() {
    this.showRoute('route-users');
    this.loadUsersData();
  }

  /**
   * Load users data
   */
  async loadUsersData() {
    try {
      const users = window.authService.getUsers();
      this.renderUsersTable(users);
      
    } catch (error) {
      console.error('Error loading users:', error);
      window.uiService.showToast('Error loading users', 'error');
    }
  }

  /**
   * Render users table
   */
  renderUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    Object.entries(users).forEach(([key, user]) => {
      const [org, username] = key.split(':');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${org}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td><span class="status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-small" onclick="router.editUser('${org}', '${username}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="router.deleteUser('${org}', '${username}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Load settings route
   */
  loadSettings() {
    this.showRoute('route-settings');
    this.loadSettingsData();
  }

  /**
   * Load settings data
   */
  async loadSettingsData() {
    try {
      const organization = window.authService.getCurrentOrganization();
      const user = window.authService.getCurrentUser();
      const settings = window.dataService.getSettings(organization);
      
      // Populate profile form
      const profileForm = document.getElementById('profileForm');
      if (profileForm) {
        document.getElementById('profileUsername').value = user.username;
        document.getElementById('profileEmail').value = user.email;
        document.getElementById('profileRole').value = user.role;
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      window.uiService.showToast('Error loading settings', 'error');
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get route config
   */
  getRouteConfig(route) {
    return this.routes.get(route);
  }

  /**
   * Check if route exists
   */
  hasRoute(route) {
    return this.routes.has(route);
  }

  /**
   * Get all routes
   */
  getAllRoutes() {
    return Array.from(this.routes.keys());
  }
}

// Create global instance
window.router = new PlanWiseRouter();
