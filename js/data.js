/**
 * PlanWise Lite - Data Service
 * Handles localStorage state management for organizations and users
 */

class PlanWiseDataService {
  constructor() {
    this.authKey = 'planwise_auth_v1';
    this.statePrefix = 'planwise_';
    this.stateSuffix = '_v1';
  }

  /**
   * Get storage key for organization state
   */
  getStorageKey(organization) {
    return `${this.statePrefix}${organization}${this.stateSuffix}`;
  }

  /**
   * Get default state for a new organization
   */
  getDefaultState() {
    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Jobs/Planner data
      jobs: [],
      technicians: [],
      calendarEvents: [],
      
      // Settings
      settings: {
        companyName: '',
        timezone: 'Europe/Amsterdam',
        workingHours: {
          start: '08:00',
          end: '17:00'
        },
        categories: [
          'CV-onderhoud',
          'Loodgieter',
          'Elektra',
          'Airco/Koeling',
          'Algemeen'
        ]
      },
      
      // Statistics
      stats: {
        totalJobs: 0,
        completedJobs: 0,
        totalHours: 0
      }
    };
  }

  /**
   * Load state for an organization
   */
  loadState(organization) {
    try {
      const key = this.getStorageKey(organization);
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return this.getDefaultState();
      }
      
      const state = JSON.parse(stored);
      
      // Migrate if needed
      if (state.version !== '1.0.0') {
        state = this.migrateState(state);
      }
      
      return state;
    } catch (error) {
      console.error('Error loading state:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Save state for an organization
   */
  saveState(organization, state) {
    try {
      const key = this.getStorageKey(organization);
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving state:', error);
      return false;
    }
  }

  /**
   * Get all organizations
   */
  getAllOrganizations() {
    const organizations = [];
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(this.statePrefix) && key.endsWith(this.stateSuffix)) {
        const org = key.replace(this.statePrefix, '').replace(this.stateSuffix, '');
        if (org !== 'auth') {
          organizations.push(org);
        }
      }
    }
    
    return organizations;
  }

  /**
   * Create a new organization
   */
  createOrganization(slug, name, plan = 'free') {
    try {
      // Validate slug
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new Error('Invalid slug format. Use only lowercase letters, numbers, and hyphens.');
      }
      
      // Check if organization already exists
      const existing = this.getAllOrganizations();
      if (existing.includes(slug)) {
        throw new Error('Organization already exists.');
      }
      
      // Create default state
      const state = this.getDefaultState();
      state.settings.companyName = name;
      state.settings.plan = plan;
      
      // Save state
      this.saveState(slug, state);
      
      return true;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Delete an organization
   */
  deleteOrganization(slug) {
    try {
      const key = this.getStorageKey(slug);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error deleting organization:', error);
      return false;
    }
  }

  /**
   * Get organization info
   */
  getOrganizationInfo(slug) {
    try {
      const state = this.loadState(slug);
      return {
        slug,
        name: state.settings.companyName,
        plan: state.settings.plan,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
        stats: state.stats
      };
    } catch (error) {
      console.error('Error getting organization info:', error);
      return null;
    }
  }

  /**
   * Add a job to an organization
   */
  addJob(organization, job) {
    try {
      const state = this.loadState(organization);
      
      const newJob = {
        id: this.generateId(),
        ...job,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      state.jobs.push(newJob);
      state.stats.totalJobs++;
      state.updatedAt = new Date().toISOString();
      
      this.saveState(organization, state);
      return newJob;
    } catch (error) {
      console.error('Error adding job:', error);
      throw error;
    }
  }

  /**
   * Update a job
   */
  updateJob(organization, jobId, updates) {
    try {
      const state = this.loadState(organization);
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      
      if (jobIndex === -1) {
        throw new Error('Job not found');
      }
      
      state.jobs[jobIndex] = {
        ...state.jobs[jobIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      state.updatedAt = new Date().toISOString();
      this.saveState(organization, state);
      
      return state.jobs[jobIndex];
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }

  /**
   * Delete a job
   */
  deleteJob(organization, jobId) {
    try {
      const state = this.loadState(organization);
      const jobIndex = state.jobs.findIndex(job => job.id === jobId);
      
      if (jobIndex === -1) {
        throw new Error('Job not found');
      }
      
      const job = state.jobs[jobIndex];
      state.jobs.splice(jobIndex, 1);
      
      // Update stats
      state.stats.totalJobs--;
      if (job.status === 'completed') {
        state.stats.completedJobs--;
      }
      
      state.updatedAt = new Date().toISOString();
      this.saveState(organization, state);
      
      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  }

  /**
   * Get jobs for an organization
   */
  getJobs(organization, filters = {}) {
    try {
      const state = this.loadState(organization);
      let jobs = [...state.jobs];
      
      // Apply filters
      if (filters.status) {
        jobs = jobs.filter(job => job.status === filters.status);
      }
      
      if (filters.category) {
        jobs = jobs.filter(job => job.category === filters.category);
      }
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        jobs = jobs.filter(job => 
          job.customer.toLowerCase().includes(search) ||
          job.address.toLowerCase().includes(search) ||
          job.description.toLowerCase().includes(search)
        );
      }
      
      // Sort by creation date (newest first)
      jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return jobs;
    } catch (error) {
      console.error('Error getting jobs:', error);
      return [];
    }
  }

  /**
   * Add a technician to an organization
   */
  addTechnician(organization, technician) {
    try {
      const state = this.loadState(organization);
      
      const newTechnician = {
        id: this.generateId(),
        ...technician,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      state.technicians.push(newTechnician);
      state.updatedAt = new Date().toISOString();
      
      this.saveState(organization, state);
      return newTechnician;
    } catch (error) {
      console.error('Error adding technician:', error);
      throw error;
    }
  }

  /**
   * Get technicians for an organization
   */
  getTechnicians(organization) {
    try {
      const state = this.loadState(organization);
      return [...state.technicians];
    } catch (error) {
      console.error('Error getting technicians:', error);
      return [];
    }
  }

  /**
   * Update organization settings
   */
  updateSettings(organization, settings) {
    try {
      const state = this.loadState(organization);
      state.settings = { ...state.settings, ...settings };
      state.updatedAt = new Date().toISOString();
      
      this.saveState(organization, state);
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Get organization settings
   */
  getSettings(organization) {
    try {
      const state = this.loadState(organization);
      return { ...state.settings };
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.getDefaultState().settings;
    }
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Migrate state to current version
   */
  migrateState(state) {
    // Add migration logic here when needed
    state.version = '1.0.0';
    return state;
  }

  /**
   * Clear all data (for reset)
   */
  clearAllData() {
    try {
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        if (key.startsWith(this.statePrefix)) {
          localStorage.removeItem(key);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Export organization data
   */
  exportData(organization) {
    try {
      const state = this.loadState(organization);
      return {
        organization,
        exportedAt: new Date().toISOString(),
        data: state
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Import organization data
   */
  importData(organization, data) {
    try {
      // Validate data structure
      if (!data || !data.data || !data.data.version) {
        throw new Error('Invalid data format');
      }
      
      // Save imported data
      this.saveState(organization, data.data);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}

// Create global instance
window.dataService = new PlanWiseDataService();
