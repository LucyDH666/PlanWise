/**
 * PlanWise Lite - Data Service
 * Handles localStorage operations and data management
 */

class DataService {
  constructor() {
    this.seedDone = false;
  }

  /**
   * Load organization state from localStorage
   */
  loadOrgState(slug) {
    try {
      const key = `planwise_${slug}_v1`;
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const state = JSON.parse(stored);
        // Return a deep copy to prevent reference issues
        return structuredClone(state);
      }
      
      return null;
    } catch (error) {
      window.logService?.error('Failed to load org state', { slug, error: error.message });
      return null;
    }
  }

  /**
   * Save organization state to localStorage
   */
  saveOrgState(slug, state) {
    try {
      const key = `planwise_${slug}_v1`;
      // Save a deep copy to prevent reference issues
      const stateCopy = structuredClone(state);
      localStorage.setItem(key, JSON.stringify(stateCopy));
      return true;
    } catch (error) {
      window.logService?.error('Failed to save org state', { slug, error: error.message });
      return false;
    }
  }

  /**
   * Get default state for a new organization
   */
  getDefaultState() {
    return {
      users: [],
      settings: {
        workingHours: {
          start: '08:00',
          end: '17:00'
        },
        timezone: 'Europe/Amsterdam'
      },
      technicians: [],
      events: [],
      organizations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Ensure superadmin seed exists (idempotent)
   */
  ensureSeed() {
    if (this.seedDone) {
      window.logService?.info('Seed already done, skipping');
      return;
    }

    try {
      window.logService?.info('Starting seed process');
      
      // Check if superadmin org already exists
      const superadminState = this.loadOrgState('superadmin');
      
      if (superadminState) {
        window.logService?.info('Superadmin org already exists');
        this.seedDone = true;
        return;
      }

      // Create superadmin organization
      const defaultState = this.getDefaultState();
      
      // Add superadmin user
      defaultState.users.push({
        id: 'superadmin-user-1',
        username: 'superadmin',
        password: 'admin123', // In real app, this would be hashed
        role: 'superadmin',
        name: 'Super Administrator',
        email: 'admin@planwise.com',
        createdAt: new Date().toISOString()
      });

      // Add superadmin organization
      defaultState.organizations.push({
        id: 'superadmin-org-1',
        name: 'Super Admin',
        slug: 'superadmin',
        createdAt: new Date().toISOString()
      });

      // Save the state
      const success = this.saveOrgState('superadmin', defaultState);
      
      if (success) {
        window.logService?.info('Superadmin seed created successfully');
        this.seedDone = true;
      } else {
        window.logService?.error('Failed to save superadmin seed');
      }
      
    } catch (error) {
      window.logService?.error('Seed process failed', { error: error.message });
    }
  }

  /**
   * Create a new organization
   */
  createOrganization(name, slug) {
    try {
      // Check if slug already exists
      const existingState = this.loadOrgState(slug);
      if (existingState) {
        throw new Error('Organization with this slug already exists');
      }

      const state = this.getDefaultState();
      
      // Add the organization
      state.organizations.push({
        id: `org-${Date.now()}`,
        name,
        slug,
        createdAt: new Date().toISOString()
      });

      const success = this.saveOrgState(slug, state);
      
      if (success) {
        window.logService?.info('Organization created', { name, slug });
        return true;
      } else {
        throw new Error('Failed to save organization');
      }
    } catch (error) {
      window.logService?.error('Failed to create organization', { name, slug, error: error.message });
      throw error;
    }
  }

  /**
   * Add a user to an organization
   */
  addUser(orgSlug, userData) {
    try {
      const state = this.loadOrgState(orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      // Check if username already exists
      const existingUser = state.users.find(u => u.username === userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      const newUser = {
        id: `user-${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString()
      };

      state.users.push(newUser);
      state.updatedAt = new Date().toISOString();

      const success = this.saveOrgState(orgSlug, state);
      
      if (success) {
        window.logService?.info('User added', { orgSlug, username: userData.username });
        return newUser;
      } else {
        throw new Error('Failed to save user');
      }
    } catch (error) {
      window.logService?.error('Failed to add user', { orgSlug, userData, error: error.message });
      throw error;
    }
  }

  /**
   * Get all organizations (from superadmin state)
   */
  getAllOrganizations() {
    try {
      const superadminState = this.loadOrgState('superadmin');
      return superadminState?.organizations || [];
    } catch (error) {
      window.logService?.error('Failed to get organizations', { error: error.message });
      return [];
    }
  }

  /**
   * Validate user credentials
   */
  validateUser(orgSlug, username, password) {
    try {
      const state = this.loadOrgState(orgSlug);
      if (!state) {
        return null;
      }

      const user = state.users.find(u => 
        u.username === username && u.password === password
      );

      if (user) {
        // Return user data without password
        const { password: _, ...userData } = user;
        return userData;
      }

      return null;
    } catch (error) {
      window.logService?.error('Failed to validate user', { orgSlug, username, error: error.message });
      return null;
    }
  }

  /**
   * Add an event to an organization
   */
  addEvent(orgSlug, eventData) {
    try {
      const state = this.loadOrgState(orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      const newEvent = {
        id: `event-${Date.now()}`,
        ...eventData,
        createdAt: new Date().toISOString()
      };

      state.events.push(newEvent);
      state.updatedAt = new Date().toISOString();

      const success = this.saveOrgState(orgSlug, state);
      
      if (success) {
        window.logService?.info('Event added', { orgSlug, eventId: newEvent.id });
        return newEvent;
      } else {
        throw new Error('Failed to save event');
      }
    } catch (error) {
      window.logService?.error('Failed to add event', { orgSlug, eventData, error: error.message });
      throw error;
    }
  }

  /**
   * Update an event
   */
  updateEvent(orgSlug, eventId, eventData) {
    try {
      const state = this.loadOrgState(orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      const eventIndex = state.events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }

      state.events[eventIndex] = {
        ...state.events[eventIndex],
        ...eventData,
        updatedAt: new Date().toISOString()
      };

      state.updatedAt = new Date().toISOString();

      const success = this.saveOrgState(orgSlug, state);
      
      if (success) {
        window.logService?.info('Event updated', { orgSlug, eventId });
        return state.events[eventIndex];
      } else {
        throw new Error('Failed to save event');
      }
    } catch (error) {
      window.logService?.error('Failed to update event', { orgSlug, eventId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete an event
   */
  deleteEvent(orgSlug, eventId) {
    try {
      const state = this.loadOrgState(orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      const eventIndex = state.events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }

      state.events.splice(eventIndex, 1);
      state.updatedAt = new Date().toISOString();

      const success = this.saveOrgState(orgSlug, state);
      
      if (success) {
        window.logService?.info('Event deleted', { orgSlug, eventId });
        return true;
      } else {
        throw new Error('Failed to save state');
      }
    } catch (error) {
      window.logService?.error('Failed to delete event', { orgSlug, eventId, error: error.message });
      throw error;
    }
  }

  /**
   * Get events for an organization
   */
  getEvents(orgSlug) {
    try {
      const state = this.loadOrgState(orgSlug);
      return state?.events || [];
    } catch (error) {
      window.logService?.error('Failed to get events', { orgSlug, error: error.message });
      return [];
    }
  }

  /**
   * Update organization settings
   */
  updateSettings(orgSlug, settings) {
    try {
      const state = this.loadOrgState(orgSlug);
      if (!state) {
        throw new Error('Organization not found');
      }

      state.settings = {
        ...state.settings,
        ...settings
      };
      state.updatedAt = new Date().toISOString();

      const success = this.saveOrgState(orgSlug, state);
      
      if (success) {
        window.logService?.info('Settings updated', { orgSlug });
        return state.settings;
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      window.logService?.error('Failed to update settings', { orgSlug, error: error.message });
      throw error;
    }
  }

  /**
   * Get settings for an organization
   */
  getSettings(orgSlug) {
    try {
      const state = this.loadOrgState(orgSlug);
      return state?.settings || this.getDefaultState().settings;
    } catch (error) {
      window.logService?.error('Failed to get settings', { orgSlug, error: error.message });
      return this.getDefaultState().settings;
    }
  }

  /**
   * Clear all PlanWise data
   */
  clearAllData() {
    try {
      const keys = Object.keys(localStorage);
      const planwiseKeys = keys.filter(key => key.startsWith('planwise_'));
      
      planwiseKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      window.logService?.info('All PlanWise data cleared');
      return true;
    } catch (error) {
      window.logService?.error('Failed to clear data', { error: error.message });
      return false;
    }
  }

  /**
   * Generate UUID
   */
  generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}

// Create global instance
window.dataService = new DataService();
