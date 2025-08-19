/**
 * PlanWise Lite - UI Service
 * Handles UI interactions, modals, toasts, and form handling
 */

class PlanWiseUIService {
  constructor() {
    this.currentModal = null;
    this.toastTimeout = null;
  }

  /**
   * Initialize UI components
   */
  init() {
    this.setupEventListeners();
    this.setupModals();
    this.setupUserMenu();
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Seed super admin button
    const seedBtn = document.getElementById('seedSuperAdmin');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        this.handleSeedSuperAdmin();
      });
    }

    // Reset app button
    const resetBtn = document.getElementById('resetApp');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.handleResetApp();
      });
    }

    // User menu button
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
      userMenuBtn.addEventListener('click', () => {
        this.toggleUserMenu();
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        this.closeUserMenu();
      }
    });
  }

  /**
   * Setup modal functionality
   */
  setupModals() {
    // Close modals when clicking backdrop
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target);
      }
    });

    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeModal(this.currentModal);
      }
    });
  }

  /**
   * Setup user menu
   */
  setupUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleUserMenu();
      });
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin() {
    try {
      const organization = document.getElementById('organization').value.trim();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!organization || !username || !password) {
        this.showToast('Please fill in all fields', 'error');
        return;
      }

      // Validate organization slug
      if (!/^[a-z0-9-]+$/.test(organization)) {
        this.showToast('Invalid organization format. Use only lowercase letters, numbers, and hyphens.', 'error');
        return;
      }

      // Attempt login
      const session = window.authService.login(organization, username, password);
      
      if (session) {
        this.showToast('Login successful!', 'success');
        
        // Hide loader and show app
        setTimeout(() => {
          this.hideLoader();
          this.showApp();
          this.updateUI();
        }, 500);
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Handle super admin seed
   */
  async handleSeedSuperAdmin() {
    try {
      await window.authService.seedSuperAdmin();
      this.showToast('Super Admin seeded successfully! Use: superadmin / admin123', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  /**
   * Handle app reset
   */
  async handleResetApp() {
    if (confirm('Are you sure you want to reset the app? This will clear all data.')) {
      try {
        window.authService.clearAuthData();
        window.dataService.clearAllData();
        this.showToast('App reset successfully!', 'success');
        
        // Reload page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        this.showToast(error.message, 'error');
      }
    }
  }

  /**
   * Show loader
   */
  showLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = 'flex';
    }
  }

  /**
   * Hide loader
   */
  hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  /**
   * Show login screen
   */
  showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('app');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (app) app.style.display = 'none';
  }

  /**
   * Show main app
   */
  showApp() {
    const loginScreen = document.getElementById('loginScreen');
    const app = document.getElementById('app');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = 'block';
  }

  /**
   * Update UI based on current user and permissions
   */
  updateUI() {
    const user = window.authService.getCurrentUser();
    const organization = window.authService.getCurrentOrganization();
    
    if (!user) return;

    // Update user display
    const currentUserEl = document.getElementById('currentUser');
    const currentRoleEl = document.getElementById('currentRole');
    const organizationDisplayEl = document.getElementById('organizationDisplay');
    
    if (currentUserEl) currentUserEl.textContent = user.username;
    if (currentRoleEl) currentRoleEl.textContent = user.role;
    if (organizationDisplayEl) organizationDisplayEl.textContent = organization;

    // Update permissions
    this.updatePermissions();
  }

  /**
   * Update element permissions based on user role
   */
  updatePermissions() {
    const elements = document.querySelectorAll('[data-requires-permission]');
    
    elements.forEach(element => {
      const permission = element.getAttribute('data-requires-permission');
      const hasPermission = window.authService.hasPermission(permission);
      
      if (hasPermission) {
        element.classList.add('has-permission');
      } else {
        element.classList.remove('has-permission');
      }
    });
  }

  /**
   * Toggle user menu
   */
  toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  /**
   * Close user menu
   */
  closeUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  /**
   * Open modal
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.showModal();
      this.currentModal = modal;
    }
  }

  /**
   * Close modal
   */
  closeModal(modal) {
    if (modal) {
      modal.close();
      this.currentModal = null;
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Clear existing timeout
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // Add to container
    container.appendChild(toast);

    // Auto remove after duration
    this.toastTimeout = setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);

    // Remove on click
    toast.addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  /**
   * Show confirmation dialog
   */
  showConfirm(message, onConfirm, onCancel) {
    if (confirm(message)) {
      if (onConfirm) onConfirm();
    } else {
      if (onCancel) onCancel();
    }
  }

  /**
   * Format date
   */
  formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Format datetime
   */
  formatDateTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleString('nl-NL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return this.formatDate(date);
  }

  /**
   * Create element with classes and content
   */
  createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  }

  /**
   * Get element by ID
   */
  $(id) {
    return document.getElementById(id);
  }

  /**
   * Query selector
   */
  $$(selector) {
    return document.querySelector(selector);
  }

  /**
   * Query selector all
   */
  $$$(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Validate form
   */
  validateForm(formData) {
    const errors = [];
    
    for (const [key, value] of Object.entries(formData)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${key} is required`);
      }
    }
    
    return errors;
  }

  /**
   * Get form data
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  /**
   * Set form data
   */
  setFormData(form, data) {
    for (const [key, value] of Object.entries(data)) {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = value;
      }
    }
  }

  /**
   * Clear form
   */
  clearForm(form) {
    form.reset();
  }

  /**
   * Show loading state
   */
  showLoading(element, text = 'Loading...') {
    if (element) {
      element.disabled = true;
      element.dataset.originalText = element.textContent;
      element.textContent = text;
    }
  }

  /**
   * Hide loading state
   */
  hideLoading(element) {
    if (element) {
      element.disabled = false;
      if (element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
      }
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('Failed to copy to clipboard', 'error');
    }
  }

  /**
   * Download data as JSON file
   */
  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Read file as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * Show error in form field
   */
  showFieldError(field, message) {
    // Remove existing error
    this.clearFieldError(field);
    
    // Add error class
    field.classList.add('error');
    
    // Create error message
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.textContent = message;
    errorEl.style.color = 'rgb(var(--err))';
    errorEl.style.fontSize = '0.8rem';
    errorEl.style.marginTop = '4px';
    
    // Insert after field
    field.parentNode.insertBefore(errorEl, field.nextSibling);
  }

  /**
   * Clear field error
   */
  clearFieldError(field) {
    field.classList.remove('error');
    const errorEl = field.parentNode.querySelector('.field-error');
    if (errorEl) {
      errorEl.remove();
    }
  }

  /**
   * Clear all field errors
   */
  clearAllFieldErrors(form) {
    const fields = form.querySelectorAll('.error');
    fields.forEach(field => this.clearFieldError(field));
  }
}

// Create global instance
window.uiService = new PlanWiseUIService();
