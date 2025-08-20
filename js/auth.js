/**
 * PlanWise Lite - Authentication Service
 * Handles login, logout, and session management
 */

class AuthService {
  constructor() {
    this.currentAuth = null;
    this.init();
  }

  init() {
    this.loadAuth();
  }

  /**
   * Load authentication from localStorage
   */
  loadAuth() {
    try {
      const stored = localStorage.getItem('planwise_auth_v1');
      if (stored) {
        this.currentAuth = JSON.parse(stored);
        window.logService?.info('Auth loaded', { orgSlug: this.currentAuth.orgSlug, username: this.currentAuth.username });
      }
    } catch (error) {
      window.logService?.error('Failed to load auth', { error: error.message });
      this.currentAuth = null;
    }
  }

  /**
   * Save authentication to localStorage
   */
  saveAuth(auth) {
    try {
      localStorage.setItem('planwise_auth_v1', JSON.stringify(auth));
      this.currentAuth = auth;
      window.logService?.info('Auth saved', { orgSlug: auth.orgSlug, username: auth.username });
      return true;
    } catch (error) {
      window.logService?.error('Failed to save auth', { error: error.message });
      return false;
    }
  }

  /**
   * Login user
   */
  login(orgSlug, username, password) {
    try {
      window.logService?.info('Login attempt', { orgSlug, username });
      
      // Validate credentials
      const user = window.dataService.validateUser(orgSlug, username, password);
      
      if (!user) {
        window.logService?.warning('Login failed - invalid credentials', { orgSlug, username });
        return { success: false, error: 'Ongeldige inloggegevens' };
      }

      // Create auth object
      const auth = {
        orgSlug,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        userId: user.id,
        loginTime: new Date().toISOString()
      };

      // Save auth
      const success = this.saveAuth(auth);
      
      if (success) {
        window.logService?.info('Login successful', { orgSlug, username, role: user.role });
        return { success: true, auth };
      } else {
        return { success: false, error: 'Fout bij opslaan van sessie' };
      }
    } catch (error) {
      window.logService?.error('Login error', { orgSlug, username, error: error.message });
      return { success: false, error: 'Fout bij inloggen' };
    }
  }

  /**
   * Logout user
   */
  logout() {
    try {
      const orgSlug = this.currentAuth?.orgSlug;
      const username = this.currentAuth?.username;
      
      // Clear auth
      localStorage.removeItem('planwise_auth_v1');
      this.currentAuth = null;
      
      window.logService?.info('Logout successful', { orgSlug, username });
      return true;
    } catch (error) {
      window.logService?.error('Logout error', { error: error.message });
      return false;
    }
  }

  /**
   * Get current authentication
   */
  getCurrentAuth() {
    return this.currentAuth;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentAuth !== null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    if (!this.currentAuth) return false;
    
    const roleHierarchy = {
      'viewer': 0,
      'technician': 1,
      'planner': 2,
      'admin': 3,
      'superadmin': 4
    };

    const userLevel = roleHierarchy[this.currentAuth.role] || 0;
    const requiredLevel = roleHierarchy[role] || 0;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission) {
    if (!this.currentAuth) return false;
    
    const permissions = {
      'view': ['viewer', 'technician', 'planner', 'admin', 'superadmin'],
      'edit_events': ['planner', 'admin', 'superadmin'],
      'manage_users': ['admin', 'superadmin'],
      'manage_organizations': ['superadmin'],
      'view_logs': ['superadmin']
    };

    const allowedRoles = permissions[permission] || [];
    return allowedRoles.includes(this.currentAuth.role);
  }

  /**
   * Switch to different organization (for superadmin)
   */
  switchTenant(orgSlug) {
    try {
      if (!this.currentAuth || this.currentAuth.role !== 'superadmin') {
        throw new Error('Only superadmin can switch tenants');
      }

      // Validate organization exists
      const state = window.dataService.loadOrgState(orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      // Create new auth for the target organization
      const newAuth = {
        ...this.currentAuth,
        orgSlug,
        switchTime: new Date().toISOString()
      };

      const success = this.saveAuth(newAuth);
      
      if (success) {
        window.logService?.info('Tenant switched', { from: this.currentAuth.orgSlug, to: orgSlug });
        return { success: true, auth: newAuth };
      } else {
        return { success: false, error: 'Fout bij wisselen van organisatie' };
      }
    } catch (error) {
      window.logService?.error('Switch tenant error', { orgSlug, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    if (!this.currentAuth) return null;
    
    try {
      const state = window.dataService.loadOrgState(this.currentAuth.orgSlug);
      if (!state) return null;
      
      return state.users.find(u => u.id === this.currentAuth.userId);
    } catch (error) {
      window.logService?.error('Failed to get current user', { error: error.message });
      return null;
    }
  }

  /**
   * Update current user info
   */
  updateCurrentUser(userData) {
    try {
      if (!this.currentAuth) {
        throw new Error('Not authenticated');
      }

      const state = window.dataService.loadOrgState(this.currentAuth.orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      const userIndex = state.users.findIndex(u => u.id === this.currentAuth.userId);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Update user data
      state.users[userIndex] = {
        ...state.users[userIndex],
        ...userData,
        updatedAt: new Date().toISOString()
      };

      // Update auth if name changed
      if (userData.name) {
        this.currentAuth.name = userData.name;
        this.saveAuth(this.currentAuth);
      }

      const success = window.dataService.saveOrgState(this.currentAuth.orgSlug, state);
      
      if (success) {
        window.logService?.info('User updated', { userId: this.currentAuth.userId });
        return state.users[userIndex];
      } else {
        throw new Error('Failed to save user');
      }
    } catch (error) {
      window.logService?.error('Failed to update user', { error: error.message });
      throw error;
    }
  }

  /**
   * Change password
   */
  changePassword(currentPassword, newPassword) {
    try {
      if (!this.currentAuth) {
        throw new Error('Not authenticated');
      }

      const state = window.dataService.loadOrgState(this.currentAuth.orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      const userIndex = state.users.findIndex(u => u.id === this.currentAuth.userId);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Verify current password
      if (state.users[userIndex].password !== currentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      state.users[userIndex].password = newPassword;
      state.users[userIndex].updatedAt = new Date().toISOString();

      const success = window.dataService.saveOrgState(this.currentAuth.orgSlug, state);
      
      if (success) {
        window.logService?.info('Password changed', { userId: this.currentAuth.userId });
        return true;
      } else {
        throw new Error('Failed to save password');
      }
    } catch (error) {
      window.logService?.error('Failed to change password', { error: error.message });
      throw error;
    }
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    if (!this.currentAuth) return null;
    
    return {
      orgSlug: this.currentAuth.orgSlug,
      username: this.currentAuth.username,
      role: this.currentAuth.role,
      name: this.currentAuth.name,
      loginTime: this.currentAuth.loginTime,
      sessionDuration: this.currentAuth.loginTime ? 
        Date.now() - new Date(this.currentAuth.loginTime).getTime() : 0
    };
  }
}

// Create global instance
window.authService = new AuthService();
