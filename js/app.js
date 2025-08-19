/**
 * PlanWise Lite - Main Application
 * Initializes the application and handles global functionality
 */

class PlanWiseApp {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      window.logsService.log('Initializing PlanWise Lite application', 'INFO');
      
      // Initialize services
      await this.initializeServices();
      
      // Setup global event listeners
      this.setupGlobalEventListeners();
      
      // Setup modal handlers
      this.setupModalHandlers();
      
      // Check authentication
      await this.checkAuthentication();
      
      this.isInitialized = true;
      window.logsService.log('Application initialized successfully', 'INFO');
      
    } catch (error) {
      window.logsService.logError(error, { context: 'App initialization' });
      window.uiService.showToast('Failed to initialize application', 'error');
    }
  }

  /**
   * Initialize all services
   */
  async initializeServices() {
    // Initialize auth service
    const isAuthenticated = window.authService.init();
    
    // Initialize UI service
    window.uiService.init();
    
    window.logsService.log('Services initialized', 'DEBUG', { isAuthenticated });
  }

  /**
   * Setup global event listeners
   */
  setupGlobalEventListeners() {
    // Add job button
    const addJobBtn = document.getElementById('addJobBtn');
    if (addJobBtn) {
      addJobBtn.addEventListener('click', () => {
        window.uiService.openModal('addJobModal');
      });
    }

    // Add organization button
    const addOrgBtn = document.getElementById('addOrgBtn');
    if (addOrgBtn) {
      addOrgBtn.addEventListener('click', () => {
        window.uiService.openModal('addOrgModal');
      });
    }

    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => {
        window.uiService.openModal('addUserModal');
      });
    }

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleProfileUpdate();
      });
    }

    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePasswordChange();
      });
    }
  }

  /**
   * Setup modal handlers
   */
  setupModalHandlers() {
    // Job form
    const jobForm = document.getElementById('jobForm');
    if (jobForm) {
      jobForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleJobSubmit();
      });
    }

    // Organization form
    const orgForm = document.getElementById('orgForm');
    if (orgForm) {
      orgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleOrganizationSubmit();
      });
    }

    // User form
    const userForm = document.getElementById('userForm');
    if (userForm) {
      userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUserSubmit();
      });
    }
  }

  /**
   * Check authentication status
   */
  async checkAuthentication() {
    const isAuthenticated = window.authService.isAuthenticated();
    
    if (isAuthenticated) {
      window.logsService.log('User is authenticated', 'INFO');
      window.uiService.hideLoader();
      window.uiService.showApp();
      window.uiService.updateUI();
      
      // Navigate to current route or default
      const hash = window.location.hash.slice(1);
      if (hash && window.router.hasRoute(hash)) {
        window.router.navigate(hash);
      } else {
        window.router.navigate('dashboard');
      }
    } else {
      window.logsService.log('User is not authenticated, showing login screen', 'INFO');
      window.uiService.hideLoader();
      window.uiService.showLoginScreen();
    }
  }

  /**
   * Handle job submission
   */
  async handleJobSubmit() {
    try {
      const form = document.getElementById('jobForm');
      const formData = window.uiService.getFormData(form);
      
      // Validate form
      const errors = window.uiService.validateForm(formData);
      if (errors.length > 0) {
        window.uiService.showToast(errors[0], 'error');
        return;
      }

      const organization = window.authService.getCurrentOrganization();
      const job = {
        customer: formData.jobCustomer,
        address: formData.jobAddress,
        category: formData.jobCategory,
        description: formData.jobDescription,
        preferredDate: formData.jobPreferredDate,
        timeWindow: formData.jobTimeWindow
      };

      await window.dataService.addJob(organization, job);
      
      window.uiService.showToast('Job added successfully', 'success');
      window.uiService.closeModal(document.getElementById('addJobModal'));
      window.uiService.clearForm(form);
      
      // Refresh planner if we're on that route
      if (window.router.getCurrentRoute() === 'planner') {
        window.router.loadPlannerData();
      }
      
      window.logsService.logUserAction('job_created', { jobId: job.id });
      
    } catch (error) {
      window.logsService.logError(error, { context: 'Job submission' });
      window.uiService.showToast(error.message, 'error');
    }
  }

  /**
   * Handle organization submission
   */
  async handleOrganizationSubmit() {
    try {
      const form = document.getElementById('orgForm');
      const formData = window.uiService.getFormData(form);
      
      // Validate form
      const errors = window.uiService.validateForm(formData);
      if (errors.length > 0) {
        window.uiService.showToast(errors[0], 'error');
        return;
      }

      await window.dataService.createOrganization(
        formData.orgSlug,
        formData.orgName,
        formData.orgPlan
      );
      
      window.uiService.showToast('Organization created successfully', 'success');
      window.uiService.closeModal(document.getElementById('addOrgModal'));
      window.uiService.clearForm(form);
      
      // Refresh organizations table
      if (window.router.getCurrentRoute() === 'organizations') {
        window.router.loadOrganizationsData();
      }
      
      window.logsService.logUserAction('organization_created', { slug: formData.orgSlug });
      
    } catch (error) {
      window.logsService.logError(error, { context: 'Organization submission' });
      window.uiService.showToast(error.message, 'error');
    }
  }

  /**
   * Handle user submission
   */
  async handleUserSubmit() {
    try {
      const form = document.getElementById('userForm');
      const formData = window.uiService.getFormData(form);
      
      // Validate form
      const errors = window.uiService.validateForm(formData);
      if (errors.length > 0) {
        window.uiService.showToast(errors[0], 'error');
        return;
      }

      await window.authService.createUser(formData.userOrg, {
        username: formData.userUsername,
        email: formData.userEmail,
        password: formData.userPassword,
        role: formData.userRole
      });
      
      window.uiService.showToast('User created successfully', 'success');
      window.uiService.closeModal(document.getElementById('addUserModal'));
      window.uiService.clearForm(form);
      
      // Refresh users table
      if (window.router.getCurrentRoute() === 'users') {
        window.router.loadUsersData();
      }
      
      window.logsService.logUserAction('user_created', { 
        username: formData.userUsername,
        organization: formData.userOrg 
      });
      
    } catch (error) {
      window.logsService.logError(error, { context: 'User submission' });
      window.uiService.showToast(error.message, 'error');
    }
  }

  /**
   * Handle profile update
   */
  async handleProfileUpdate() {
    try {
      const form = document.getElementById('profileForm');
      const formData = window.uiService.getFormData(form);
      
      const organization = window.authService.getCurrentOrganization();
      const user = window.authService.getCurrentUser();
      
      await window.authService.updateUser(organization, user.username, {
        email: formData.profileEmail
      });
      
      window.uiService.showToast('Profile updated successfully', 'success');
      window.logsService.logUserAction('profile_updated');
      
    } catch (error) {
      window.logsService.logError(error, { context: 'Profile update' });
      window.uiService.showToast(error.message, 'error');
    }
  }

  /**
   * Handle password change
   */
  async handlePasswordChange() {
    try {
      const form = document.getElementById('passwordForm');
      const formData = window.uiService.getFormData(form);
      
      // Validate passwords match
      if (formData.newPassword !== formData.confirmPassword) {
        window.uiService.showToast('Passwords do not match', 'error');
        return;
      }

      const organization = window.authService.getCurrentOrganization();
      const user = window.authService.getCurrentUser();
      
      await window.authService.changePassword(
        organization,
        user.username,
        formData.currentPassword,
        formData.newPassword
      );
      
      window.uiService.showToast('Password changed successfully', 'success');
      window.uiService.clearForm(form);
      window.logsService.logUserAction('password_changed');
      
    } catch (error) {
      window.logsService.logError(error, { context: 'Password change' });
      window.uiService.showToast(error.message, 'error');
    }
  }

  /**
   * Save job (called from modal)
   */
  async saveJob() {
    await this.handleJobSubmit();
  }

  /**
   * Save organization (called from modal)
   */
  async saveOrganization() {
    await this.handleOrganizationSubmit();
  }

  /**
   * Save user (called from modal)
   */
  async saveUser() {
    await this.handleUserSubmit();
  }

  /**
   * Logout user
   */
  logout() {
    try {
      window.authService.logout();
      window.uiService.showLoginScreen();
      window.location.hash = '';
      window.logsService.logUserAction('logout');
    } catch (error) {
      window.logsService.logError(error, { context: 'Logout' });
      window.uiService.showToast('Error during logout', 'error');
    }
  }

  /**
   * Reset application
   */
  async resetApp() {
    try {
      if (confirm('Are you sure you want to reset the app? This will clear all data.')) {
        window.authService.clearAuthData();
        window.dataService.clearAllData();
        window.uiService.showToast('App reset successfully!', 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      window.logsService.logError(error, { context: 'App reset' });
      window.uiService.showToast('Error resetting app', 'error');
    }
  }

  /**
   * Get application status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: window.authService.isAuthenticated(),
      currentUser: window.authService.getCurrentUser(),
      currentOrganization: window.authService.getCurrentOrganization(),
      currentRoute: window.router.getCurrentRoute(),
      services: {
        auth: !!window.authService,
        data: !!window.dataService,
        ui: !!window.uiService,
        router: !!window.router,
        logs: !!window.logsService
      }
    };
  }
}

// Global functions for modal buttons
window.saveJob = function() {
  window.app.saveJob();
};

window.saveOrganization = function() {
  window.app.saveOrganization();
};

window.saveUser = function() {
  window.app.saveUser();
};

window.logout = function() {
  window.app.logout();
};

window.resetApp = function() {
  window.app.resetApp();
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PlanWiseApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanWiseApp;
}
