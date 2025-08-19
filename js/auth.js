/**
 * PlanWise Lite - Authentication Service
 * Handles user authentication, authorization, and role-based access control
 */

class PlanWiseAuthService {
  constructor() {
    this.authKey = 'planwise_auth_v1';
    this.usersKey = 'planwise_users_v1';
    this.currentUser = null;
    this.currentOrganization = null;
  }

  /**
   * Initialize authentication system
   */
  init() {
    try {
      // Load users if they don't exist
      if (!localStorage.getItem(this.usersKey)) {
        this.createDefaultUsers();
      }
      
      // Check for existing session
      const session = this.getSession();
      if (session) {
        this.currentUser = session.user;
        this.currentOrganization = session.organization;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return false;
    }
  }

  /**
   * Create default users (super admin)
   */
  createDefaultUsers() {
    const users = {
      'superadmin': {
        username: 'superadmin',
        email: 'admin@planwise.local',
        password: this.hashPassword('admin123'),
        role: 'superadmin',
        organization: null,
        createdAt: new Date().toISOString(),
        isActive: true
      }
    };
    
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  /**
   * Hash password (simple implementation for demo)
   */
  hashPassword(password) {
    // In a real app, use proper hashing like bcrypt
    return btoa(password + 'salt');
  }

  /**
   * Verify password
   */
  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  /**
   * Login user
   */
  login(organization, username, password) {
    try {
      const users = this.getUsers();
      const userKey = `${organization}:${username}`;
      const user = users[userKey];
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      if (!user.isActive) {
        throw new Error('Account is disabled');
      }
      
      if (!this.verifyPassword(password, user.password)) {
        throw new Error('Invalid credentials');
      }
      
      // Check if user belongs to organization
      if (user.organization && user.organization !== organization) {
        throw new Error('User does not belong to this organization');
      }
      
      // Create session
      const session = {
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
          organization: organization
        },
        organization: organization,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem(this.authKey, JSON.stringify(session));
      
      this.currentUser = session.user;
      this.currentOrganization = organization;
      
      return session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout() {
    try {
      localStorage.removeItem(this.authKey);
      this.currentUser = null;
      this.currentOrganization = null;
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Get current session
   */
  getSession() {
    try {
      const session = localStorage.getItem(this.authKey);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current organization
   */
  getCurrentOrganization() {
    return this.currentOrganization;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    if (!this.currentUser) {
      return false;
    }
    
    const role = this.currentUser.role;
    
    // Super admin has all permissions
    if (role === 'superadmin') {
      return true;
    }
    
    // Define permissions for each role
    const rolePermissions = {
      admin: [
        'view_dashboard',
        'view_planner',
        'edit_planner',
        'edit_settings',
        'view_users',
        'edit_users'
      ],
      planner: [
        'view_dashboard',
        'view_planner',
        'edit_planner',
        'view_settings'
      ],
      technician: [
        'view_dashboard',
        'view_planner',
        'view_settings'
      ],
      viewer: [
        'view_dashboard',
        'view_planner'
      ]
    };
    
    return rolePermissions[role]?.includes(permission) || false;
  }

  /**
   * Get all users
   */
  getUsers() {
    try {
      const users = localStorage.getItem(this.usersKey);
      return users ? JSON.parse(users) : {};
    } catch (error) {
      console.error('Error getting users:', error);
      return {};
    }
  }

  /**
   * Create a new user
   */
  createUser(organization, userData) {
    try {
      const users = this.getUsers();
      const userKey = `${organization}:${userData.username}`;
      
      // Check if user already exists
      if (users[userKey]) {
        throw new Error('User already exists');
      }
      
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password || !userData.role) {
        throw new Error('Missing required fields');
      }
      
      // Validate role
      const validRoles = ['admin', 'planner', 'technician', 'viewer'];
      if (!validRoles.includes(userData.role)) {
        throw new Error('Invalid role');
      }
      
      // Create user
      const newUser = {
        username: userData.username,
        email: userData.email,
        password: this.hashPassword(userData.password),
        role: userData.role,
        organization: organization,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      users[userKey] = newUser;
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      
      return {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.organization
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  updateUser(organization, username, updates) {
    try {
      const users = this.getUsers();
      const userKey = `${organization}:${username}`;
      
      if (!users[userKey]) {
        throw new Error('User not found');
      }
      
      // Update user
      users[userKey] = {
        ...users[userKey],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Hash password if provided
      if (updates.password) {
        users[userKey].password = this.hashPassword(updates.password);
      }
      
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      
      return {
        username: users[userKey].username,
        email: users[userKey].email,
        role: users[userKey].role,
        organization: users[userKey].organization
      };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  deleteUser(organization, username) {
    try {
      const users = this.getUsers();
      const userKey = `${organization}:${username}`;
      
      if (!users[userKey]) {
        throw new Error('User not found');
      }
      
      // Don't allow deleting superadmin
      if (users[userKey].role === 'superadmin') {
        throw new Error('Cannot delete super admin');
      }
      
      delete users[userKey];
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get users for an organization
   */
  getOrganizationUsers(organization) {
    try {
      const users = this.getUsers();
      const orgUsers = [];
      
      for (const [key, user] of Object.entries(users)) {
        if (user.organization === organization) {
          orgUsers.push({
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
          });
        }
      }
      
      return orgUsers;
    } catch (error) {
      console.error('Error getting organization users:', error);
      return [];
    }
  }

  /**
   * Change password
   */
  changePassword(organization, username, currentPassword, newPassword) {
    try {
      const users = this.getUsers();
      const userKey = `${organization}:${username}`;
      
      if (!users[userKey]) {
        throw new Error('User not found');
      }
      
      // Verify current password
      if (!this.verifyPassword(currentPassword, users[userKey].password)) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      users[userKey].password = this.hashPassword(newPassword);
      users[userKey].updatedAt = new Date().toISOString();
      
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Get user info
   */
  getUserInfo(organization, username) {
    try {
      const users = this.getUsers();
      const userKey = `${organization}:${username}`;
      
      if (!users[userKey]) {
        return null;
      }
      
      return {
        username: users[userKey].username,
        email: users[userKey].email,
        role: users[userKey].role,
        organization: users[userKey].organization,
        isActive: users[userKey].isActive,
        createdAt: users[userKey].createdAt
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Seed super admin (for development)
   */
  seedSuperAdmin() {
    try {
      // Create super admin organization if it doesn't exist
      if (!window.dataService) {
        throw new Error('Data service not available');
      }
      
      const orgs = window.dataService.getAllOrganizations();
      if (!orgs.includes('superadmin')) {
        window.dataService.createOrganization('superadmin', 'Super Admin', 'enterprise');
      }
      
      // Create super admin user
      const users = this.getUsers();
      if (!users['superadmin:superadmin']) {
        this.createUser('superadmin', {
          username: 'superadmin',
          email: 'admin@planwise.local',
          password: 'admin123',
          role: 'superadmin'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error seeding super admin:', error);
      throw error;
    }
  }

  /**
   * Clear all auth data (for reset)
   */
  clearAuthData() {
    try {
      localStorage.removeItem(this.authKey);
      localStorage.removeItem(this.usersKey);
      this.currentUser = null;
      this.currentOrganization = null;
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }
}

// Create global instance
window.authService = new PlanWiseAuthService();
