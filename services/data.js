/**
 * PlanWise Data Service
 * Auth-gebaseerde state management met automatische initialisatie
 */

class PlanWiseDataService {
  constructor() {
    this.currentState = null;
    this.isInitializing = false;
    this.loaderElement = null;
    this.initLoader();
  }

  /**
   * Initialize loader element
   */
  initLoader() {
    // Create loader if it doesn't exist
    if (!document.getElementById('planwise-loader')) {
      this.loaderElement = document.createElement('div');
      this.loaderElement.id = 'planwise-loader';
      this.loaderElement.innerHTML = `
        <div class="loader-overlay">
          <div class="loader-spinner">
            <div class="spinner"></div>
            <div class="loader-text">PlanWise laden...</div>
          </div>
        </div>
      `;
      this.loaderElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      `;
      
      // Add CSS for spinner
      if (!document.getElementById('loader-styles')) {
        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.textContent = `
          .loader-overlay {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .loader-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .loader-text {
            color: white;
            font-size: 16px;
            font-weight: 500;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(this.loaderElement);
    } else {
      this.loaderElement = document.getElementById('planwise-loader');
    }
  }

  /**
   * Show loader with custom message
   */
  showLoader(message = 'PlanWise laden...') {
    if (this.loaderElement) {
      const textElement = this.loaderElement.querySelector('.loader-text');
      if (textElement) {
        textElement.textContent = message;
      }
      this.loaderElement.style.display = 'flex';
    }
  }

  /**
   * Hide loader
   */
  hideLoader() {
    if (this.loaderElement) {
      this.loaderElement.style.display = 'none';
    }
  }

  /**
   * Get storage key based on current auth
   */
  getStorageKey() {
    const auth = window.currentAuth;
    return auth?.orgSlug ? `planwise_${auth.orgSlug}_v4` : "planwise_demo_v4";
  }

  /**
   * Get default state for new tenants
   */
  getDefaultState() {
    return {
      tickets: [],
      calendarEvents: [],
      installations: [],
      technicians: [],
      maintenancePlans: [],
      settings: {
        companyName: '',
        timezone: 'Europe/Amsterdam',
        workingHours: {
          start: '08:00',
          end: '17:00'
        },
        slaDays: 2,
        categories: ['CV-onderhoud', 'Loodgieter', 'Elektra', 'Airco/Koeling', 'Algemeen']
      },
      installationTypes: [
        { id: 'hvac', name: 'HVAC Systemen', category: 'Airco/Koeling' },
        { id: 'electrical', name: 'Elektrische Installaties', category: 'Elektra' },
        { id: 'plumbing', name: 'Sanitair', category: 'Loodgieter' },
        { id: 'heating', name: 'Verwarmingssystemen', category: 'CV-onderhoud' }
      ],
      maintenanceAssets: [],
      contracts: [],
      analytics: {
        totalTickets: 0,
        completedTickets: 0,
        averageResolutionTime: 0,
        customerSatisfaction: 0
      }
    };
  }

  /**
   * Load state for current auth context
   */
  async loadState() {
    try {
      const storageKey = this.getStorageKey();
      const raw = localStorage.getItem(storageKey);
      
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log(`State loaded for ${storageKey}:`, parsed);
        return parsed;
      }
      
      // No existing state, return null to trigger default initialization
      console.log(`No existing state found for ${storageKey}`);
      return null;
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return null;
    }
  }

  /**
   * Save current state
   */
  async saveState(state) {
    try {
      const storageKey = this.getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(state));
      console.log(`State saved for ${storageKey}`);
      return true;
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
      // Show non-blocking toast
      if (window.toast) {
        window.toast("⚠️ Opslaan mislukt - probeer opnieuw");
      }
      return false;
    }
  }

  /**
   * Initialize state for new tenant or existing tenant
   */
  async initializeState(auth) {
    if (this.isInitializing) {
      console.log('State initialization already in progress');
      return;
    }

    this.isInitializing = true;
    this.showLoader('Initialiseren...');

    try {
      console.log('Initializing state for auth:', auth);
      
      // Load existing state
      let state = await this.loadState();
      
      if (!state) {
        // No existing state, create default state
        console.log('Creating default state for new tenant');
        state = this.getDefaultState();
        
        // Add demo data for new tenants (optional)
        if (auth.orgSlug !== 'PLANWISE_PLATFORM') {
          state = this.addDemoData(state);
        }
        
        // Save the new state
        await this.saveState(state);
      }

      // Set global state
      window.state = state;
      this.currentState = state;
      
      console.log('State initialization completed:', state);
      return state;
      
    } catch (error) {
      console.error('State initialization failed:', error);
      // Fallback to default state
      const fallbackState = this.getDefaultState();
      window.state = fallbackState;
      this.currentState = fallbackState;
      return fallbackState;
    } finally {
      this.isInitializing = false;
      this.hideLoader();
    }
  }

  /**
   * Add demo data to state for new tenants
   */
  addDemoData(state) {
    const demo = [
      {
        customer_name: "VvE Parkzicht",
        email: "beheer@parkzicht.nl",
        phone: "+31612345678",
        address: "Kade 12, 1013 AA Amsterdam",
        category: "CV-onderhoud",
        window: "Ochtend (08:00–12:00)",
        preferred_start: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        sla_days: 2,
        description: "Jaarlijkse ketelservice toren A."
      },
      {
        customer_name: "De Boer Makelaardij",
        email: "info@dboer.nl",
        phone: "+31698765432",
        address: "Markt 7, 3511 AA Utrecht",
        category: "Elektra",
        window: "Middag (12:00–17:00)",
        preferred_start: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        sla_days: 1,
        description: "Groepenkast naloop, verschillende storingen."
      }
    ];

    // Add demo tickets
    state.tickets = demo.map(d => ({
      ...d,
      id: "req_" + this.generateUUID(),
      createdAt: new Date().toISOString(),
      status: "new",
      duration_min: this.guessDuration(d.category)
    }));

    // Add demo calendar events
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

    state.calendarEvents = demoEvents;

    // Add demo technicians
    state.technicians = [
      {
        id: "tech_1",
        name: "Sanne Peters",
        email: "sanne@planwise.nl",
        phone: "+31612345678",
        skills: ["CV-onderhoud", "Loodgieter"],
        availability: "full-time"
      },
      {
        id: "tech_2",
        name: "Ahmed Ouazani",
        email: "ahmed@planwise.nl",
        phone: "+31687654321",
        skills: ["Elektra", "Airco/Koeling"],
        availability: "full-time"
      }
    ];

    return state;
  }

  /**
   * Generate UUID for demo data
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Guess duration for category
   */
  guessDuration(category) {
    const map = {
      "CV-onderhoud": 60,
      "Loodgieter": 90,
      "Elektra": 90,
      "Airco/Koeling": 120,
      "Algemeen": 60
    };
    return map[category] || 60;
  }

  /**
   * Clear state for current tenant
   */
  async clearState() {
    try {
      const storageKey = this.getStorageKey();
      localStorage.removeItem(storageKey);
      console.log(`State cleared for ${storageKey}`);
      return true;
    } catch (error) {
      console.error("Failed to clear state:", error);
      return false;
    }
  }

  /**
   * Migrate state from legacy format
   */
  async migrateLegacyState() {
    try {
      const legacyKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('planwise_') && !key.includes('_v4')) {
          legacyKeys.push(key);
        }
      }

      if (legacyKeys.length === 0) {
        return false;
      }

      console.log('Migrating legacy state keys:', legacyKeys);
      
      for (const key of legacyKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            // Convert legacy format to new format
            const newState = this.convertLegacyToNewFormat(parsed);
            const newKey = key.replace(/planwise_/, 'planwise_').replace(/_\d+$/, '_v4');
            localStorage.setItem(newKey, JSON.stringify(newState));
            localStorage.removeItem(key);
            console.log(`Migrated ${key} to ${newKey}`);
          }
        } catch (error) {
          console.error(`Failed to migrate ${key}:`, error);
        }
      }

      return true;
    } catch (error) {
      console.error('Legacy migration failed:', error);
      return false;
    }
  }

  /**
   * Convert legacy state format to new format
   */
  convertLegacyToNewFormat(legacyState) {
    const newState = this.getDefaultState();
    
    // Map legacy properties to new format
    if (legacyState.tickets) {
      newState.tickets = legacyState.tickets;
    }
    if (legacyState.calendarEvents) {
      newState.calendarEvents = legacyState.calendarEvents;
    }
    if (legacyState.installations) {
      newState.installations = legacyState.installations;
    }
    if (legacyState.technicians) {
      newState.technicians = legacyState.technicians;
    }
    if (legacyState.settings) {
      newState.settings = { ...newState.settings, ...legacyState.settings };
    }

    return newState;
  }
}

// Create global instance
window.PlanWiseData = new PlanWiseDataService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanWiseDataService;
}
