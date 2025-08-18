/* PlanWise API Adapter
   Provides a clean interface for backend communication with localStorage fallback
   Ready for backend integration with feature flags
*/

class PlanWiseAPI {
  constructor() {
    this.useRemote = false; // Feature flag for backend toggle
    this.baseUrl = 'https://api.planwise.com/v1'; // Placeholder
    this.timeout = 10000;
    this.retries = 3;
  }

  // Configuration
  setRemote(enabled) {
    this.useRemote = enabled;
    console.log(`API: Remote mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    if (!this.useRemote) {
      return this.localStorageRequest(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'X-Organization-ID': this.getCurrentTenant()
      },
      timeout: this.timeout,
      ...options
    };

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.warn(`API request failed (attempt ${attempt}/${this.retries}):`, error);
        
        if (attempt === this.retries) {
          console.log('Falling back to localStorage');
          return this.localStorageRequest(endpoint, options);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // LocalStorage fallback
  localStorageRequest(endpoint, options) {
    console.log(`API: Using localStorage for ${endpoint}`);
    
    // Simulate network delay
    return new Promise(resolve => {
      setTimeout(() => {
        const result = this.handleLocalStorageRequest(endpoint, options);
        resolve(result);
      }, 100 + Math.random() * 200);
    });
  }

  handleLocalStorageRequest(endpoint, options) {
    const { method = 'GET', body } = options;
    
    switch (endpoint) {
      case '/schedule/optimize':
        return this.optimizeSchedule(body);
      
      case '/jobs':
        return this.handleJobs(method, body);
      
      case '/technicians':
        return this.handleTechnicians(method, body);
      
      case '/events':
        return this.handleEvents(method, body);
      
      case '/installations':
        return this.handleInstallations(method, body);
      
      case '/kpis':
        return this.getKPIs();
      
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  // Schedule optimization
  async optimizeSchedule(data) {
    const { jobs, technicians, policies } = data;
    
    // Simple heuristic algorithm
    const proposals = [];
    
    for (const job of jobs) {
      const matchingTechs = technicians.filter(tech => 
        tech.skills.some(skill => job.required_skills.includes(skill))
      );
      
      if (matchingTechs.length > 0) {
        const tech = matchingTechs[0];
        const start = new Date(job.window_start);
        const end = new Date(start.getTime() + job.duration_min * 60000);
        
        proposals.push({
          job_id: job.id,
          technician_id: tech.id,
          start: start.toISOString(),
          end: end.toISOString(),
          travel_min: 15,
          score: 85,
          violations: []
        });
      }
    }
    
    return {
      routes: proposals,
      appointments: proposals,
      score: 85,
      violations: [],
      why: ['Skills matching', 'Time window feasibility', 'Travel optimization']
    };
  }

  // Jobs CRUD
  handleJobs(method, body) {
    const state = this.getState();
    
    switch (method) {
      case 'GET':
        return { jobs: state.tickets || [] };
      
      case 'POST':
        const newJob = { ...body, id: `job_${Date.now()}`, created_at: new Date().toISOString() };
        state.tickets = state.tickets || [];
        state.tickets.push(newJob);
        this.saveState(state);
        return { job: newJob };
      
      case 'PUT':
        const index = state.tickets.findIndex(j => j.id === body.id);
        if (index !== -1) {
          state.tickets[index] = { ...state.tickets[index], ...body };
          this.saveState(state);
          return { job: state.tickets[index] };
        }
        throw new Error('Job not found');
      
      case 'DELETE':
        state.tickets = state.tickets.filter(j => j.id !== body.id);
        this.saveState(state);
        return { success: true };
      
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // Technicians CRUD
  handleTechnicians(method, body) {
    const state = this.getState();
    
    switch (method) {
      case 'GET':
        return { technicians: state.technicians || [] };
      
      case 'POST':
        const newTech = { ...body, id: `tech_${Date.now()}` };
        state.technicians = state.technicians || [];
        state.technicians.push(newTech);
        this.saveState(state);
        return { technician: newTech };
      
      case 'PUT':
        const index = state.technicians.findIndex(t => t.id === body.id);
        if (index !== -1) {
          state.technicians[index] = { ...state.technicians[index], ...body };
          this.saveState(state);
          return { technician: state.technicians[index] };
        }
        throw new Error('Technician not found');
      
      case 'DELETE':
        state.technicians = state.technicians.filter(t => t.id !== body.id);
        this.saveState(state);
        return { success: true };
      
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // Events CRUD
  handleEvents(method, body) {
    const state = this.getState();
    
    switch (method) {
      case 'GET':
        return { events: state.calendarEvents || [] };
      
      case 'POST':
        const newEvent = { ...body, id: `ev_${Date.now()}` };
        state.calendarEvents = state.calendarEvents || [];
        state.calendarEvents.push(newEvent);
        this.saveState(state);
        return { event: newEvent };
      
      case 'PUT':
        const index = state.calendarEvents.findIndex(e => e.id === body.id);
        if (index !== -1) {
          state.calendarEvents[index] = { ...state.calendarEvents[index], ...body };
          this.saveState(state);
          return { event: state.calendarEvents[index] };
        }
        throw new Error('Event not found');
      
      case 'DELETE':
        state.calendarEvents = state.calendarEvents.filter(e => e.id !== body.id);
        this.saveState(state);
        return { success: true };
      
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // Installations CRUD
  handleInstallations(method, body) {
    const state = this.getState();
    
    switch (method) {
      case 'GET':
        return { installations: state.installations || [] };
      
      case 'POST':
        const newInstallation = { ...body, id: `inst_${Date.now()}` };
        state.installations = state.installations || [];
        state.installations.push(newInstallation);
        this.saveState(state);
        return { installation: newInstallation };
      
      case 'PUT':
        const index = state.installations.findIndex(i => i.id === body.id);
        if (index !== -1) {
          state.installations[index] = { ...state.installations[index], ...body };
          this.saveState(state);
          return { installation: state.installations[index] };
        }
        throw new Error('Installation not found');
      
      case 'DELETE':
        state.installations = state.installations.filter(i => i.id !== body.id);
        this.saveState(state);
        return { success: true };
      
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // KPIs
  getKPIs() {
    const state = this.getState();
    const events = state.calendarEvents || [];
    const tickets = state.tickets || [];
    
    const today = new Date();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const completedThisWeek = events.filter(e => 
      new Date(e.start) >= thisWeek && e.status === 'completed'
    ).length;
    
    const pendingTickets = tickets.filter(t => t.status === 'new').length;
    
    return {
      completed_this_week: completedThisWeek,
      pending_tickets: pendingTickets,
      total_events: events.length,
      total_technicians: (state.technicians || []).length,
      sla_compliance: 95.2, // Mock data
      average_travel_time: 23 // Mock data
    };
  }

  // Utility methods
  getAuthToken() {
    return localStorage.getItem('planwise_auth_token') || 'demo-token';
  }

  getCurrentTenant() {
    return localStorage.getItem('planwise_current_tenant') || 'demo';
  }

  getState() {
    const key = this.getCurrentTenant() ? `planwise_${this.getCurrentTenant()}_v4` : "planwise_demo_v4";
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveState(state) {
    const key = this.getCurrentTenant() ? `planwise_${this.getCurrentTenant()}_v4` : "planwise_demo_v4";
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  // Logging wrapper
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      tenant: this.getCurrentTenant(),
      endpoint: 'api'
    };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    
    // Store in localStorage for debugging
    const logs = JSON.parse(localStorage.getItem('planwise_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 100) logs.shift(); // Keep last 100 logs
    localStorage.setItem('planwise_logs', JSON.stringify(logs));
  }
}

// Export singleton instance
window.planwiseAPI = new PlanWiseAPI();

// Debug helpers
window.apiDebug = {
  enableRemote: () => window.planwiseAPI.setRemote(true),
  disableRemote: () => window.planwiseAPI.setRemote(false),
  getLogs: () => JSON.parse(localStorage.getItem('planwise_logs') || '[]'),
  clearLogs: () => localStorage.removeItem('planwise_logs')
};
