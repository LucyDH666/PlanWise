/* PlanWise Auth Service v2
   Centralized authentication state management
*/

const Auth = {
  // Get current auth state
  get() {
    try {
      const authData = localStorage.getItem('planwise_auth_v2');
      if (!authData) return null;
      
      const auth = JSON.parse(authData);
      if (auth.version !== 2) {
        console.warn('Auth version mismatch, migrating...');
        return this.migrateFromLegacy();
      }
      
      return auth;
    } catch (error) {
      console.error('Error reading auth state:', error);
      return null;
    }
  },

  // Set auth state
  set(state) {
    try {
      const authData = {
        version: 2,
        ...state,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('planwise_auth_v2', JSON.stringify(authData));
      return true;
    } catch (error) {
      console.error('Error setting auth state:', error);
      return false;
    }
  },

  // Logout - clear all auth data
  logout() {
    try {
      // Remove all legacy keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('planwise_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Remove v2 auth
      localStorage.removeItem('planwise_auth_v2');
      
      console.log('Auth logout completed');
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  },

  // Switch to different organization
  switchOrg(orgSlug) {
    try {
      const currentAuth = this.get();
      if (!currentAuth) return false;

      // If current role is superadmin, reset to platform mode
      if (currentAuth.role === 'superadmin') {
        return this.becomeSuperAdmin();
      }

      // Switch organization while keeping user and role
      const newAuth = {
        ...currentAuth,
        orgSlug: orgSlug
      };
      
      return this.set(newAuth);
    } catch (error) {
      console.error('Error switching organization:', error);
      return false;
    }
  },

  // Become super admin
  becomeSuperAdmin() {
    try {
      const authData = {
        orgSlug: 'PLANWISE_PLATFORM',
        role: 'superadmin',
        user: 'superadmin',
        version: 2,
        timestamp: new Date().toISOString()
      };
      
      return this.set(authData);
    } catch (error) {
      console.error('Error becoming super admin:', error);
      return false;
    }
  },

  // Migrate from legacy auth system
  migrateFromLegacy() {
    try {
      console.log('Migrating from legacy auth system...');
      
      const currentTenant = localStorage.getItem('planwise_current_tenant');
      const currentUser = localStorage.getItem('planwise_current_user');
      const currentUserRole = localStorage.getItem('planwise_current_user_role');
      const isSuperAdmin = localStorage.getItem('planwise_super_admin') === 'true';
      
      let newAuth = null;
      
      if (isSuperAdmin) {
        newAuth = {
          orgSlug: 'PLANWISE_PLATFORM',
          role: 'superadmin',
          user: 'superadmin'
        };
      } else if (currentTenant && currentUser) {
        newAuth = {
          orgSlug: currentTenant,
          role: currentUserRole || 'viewer',
          user: currentUser.replace(`${currentTenant}_`, '') || 'user'
        };
      }
      
      if (newAuth) {
        this.set(newAuth);
        
        // Clean up legacy keys
        localStorage.removeItem('planwise_current_tenant');
        localStorage.removeItem('planwise_current_user');
        localStorage.removeItem('planwise_current_user_role');
        localStorage.removeItem('planwise_super_admin');
        
        console.log('Migration completed:', newAuth);
        return newAuth;
      }
      
      return null;
    } catch (error) {
      console.error('Error during migration:', error);
      return null;
    }
  },

  // Get all known organizations from storage
  getKnownOrganizations() {
    try {
      const orgs = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('planwise_tenant_')) {
          const orgSlug = key.replace('planwise_tenant_', '');
          const tenantData = localStorage.getItem(key);
          
          if (tenantData) {
            try {
              const data = JSON.parse(tenantData);
              orgs.push({
                slug: orgSlug,
                name: data.info?.company || orgSlug,
                plan: data.info?.plan || 'unknown',
                created: data.info?.created || new Date().toISOString()
              });
            } catch (e) {
              console.warn('Failed to parse tenant data for:', orgSlug);
            }
          }
        }
      }
      
      // Add platform organization for super admins
      const currentAuth = this.get();
      if (currentAuth && currentAuth.role === 'superadmin') {
        orgs.unshift({
          slug: 'PLANWISE_PLATFORM',
          name: 'PlanWise Platform',
          plan: 'platform',
          created: new Date().toISOString()
        });
      }
      
      return orgs.sort((a, b) => new Date(a.created) - new Date(b.created));
    } catch (error) {
      console.error('Error getting known organizations:', error);
      return [];
    }
  },

  // Check if user has permission
  hasPermission(permission) {
    const auth = this.get();
    if (!auth) return false;
    
    // Super admin has all permissions
    if (auth.role === 'superadmin') return true;
    
    // Define role permissions
    const rolePermissions = {
      admin: ['*'], // All permissions
      planner: [
        'view_dashboard', 'view_planner', 'view_installations',
        'edit_planner', 'edit_installations', 'view_technicians',
        'view_maintenance', 'edit_maintenance', 'plan_maintenance',
        'view_reports', 'export_data'
      ],
      technician: [
        'view_dashboard', 'view_planner', 'view_installations',
        'view_maintenance', 'view_reports'
      ],
      viewer: [
        'view_dashboard', 'view_planner', 'view_installations',
        'view_maintenance', 'view_reports'
      ]
    };
    
    const permissions = rolePermissions[auth.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }
};

// Export for use in other modules
window.Auth = Auth;
