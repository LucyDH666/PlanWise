/* PlanWise API Service
 * Maakt echte fetch-calls naar de Express backend (/api/...).
 * Interface is backwards-compatibel met de localStorage-versie.
 * Zet useRemote = false om terug te vallen op localStorage (development/offline).
 */

class PlanWiseAPI {
  constructor() {
    this.useRemote = true;        // Nu standaard aan
    this.baseUrl = '/api';        // Relatief, werkt op elke host/poort
    this.timeout = 15000;
    this.retries = 2;
  }

  // --- Configuratie ---

  setRemote(enabled) {
    this.useRemote = enabled;
    console.log(`API: Remote mode ${enabled ? 'ingeschakeld' : 'uitgeschakeld'}`);
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  // --- Auth helpers ---

  getAuthToken() {
    return localStorage.getItem('planwise_api_token') || null;
  }

  setAuthToken(token) {
    if (token) localStorage.setItem('planwise_api_token', token);
    else localStorage.removeItem('planwise_api_token');
  }

  getCurrentTenant() {
    try {
      const raw = localStorage.getItem('planwise_auth_v2');
      if (raw) return JSON.parse(raw).orgSlug || 'demo';
    } catch {}
    return localStorage.getItem('planwise_current_tenant') || 'demo';
  }

  // --- Generic request ---

  async request(endpoint, options = {}) {
    if (!this.useRemote) {
      return this._localStorageRequest(endpoint, options);
    }

    const { method = 'GET', body } = options;
    const token = this.getAuthToken();

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Normaliseer endpoint: /jobs → /api/jobs
    const url = endpoint.startsWith('/api') ? endpoint : `${this.baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        this.log('warn', `Request mislukt (poging ${attempt}/${this.retries}): ${endpoint}`, error.message);

        if (attempt === this.retries) {
          // Fallback naar localStorage als backend niet bereikbaar is
          console.warn('API: Backend niet bereikbaar, val terug op localStorage');
          return this._localStorageRequest(endpoint, options);
        }

        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }

  // --- Auth API ---

  async login(username, password, orgSlug) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password, orgSlug }
    });
    if (result.token) this.setAuthToken(result.token);
    return result;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
    this.setAuthToken(null);
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getOrganizations() {
    return this.request('/auth/organizations');
  }

  // --- Jobs / Tickets ---

  async getJobs() {
    return this.request('/jobs');
  }

  async getJob(id) {
    return this.request(`/jobs/${id}`);
  }

  async createJob(data) {
    return this.request('/jobs', { method: 'POST', body: data });
  }

  async updateJob(id, data) {
    return this.request(`/jobs/${id}`, { method: 'PUT', body: data });
  }

  async deleteJob(id) {
    return this.request(`/jobs/${id}`, { method: 'DELETE' });
  }

  // --- Technicians ---

  async getTechnicians() {
    return this.request('/technicians');
  }

  async createTechnician(data) {
    return this.request('/technicians', { method: 'POST', body: data });
  }

  async updateTechnician(id, data) {
    return this.request(`/technicians/${id}`, { method: 'PUT', body: data });
  }

  async deleteTechnician(id) {
    return this.request(`/technicians/${id}`, { method: 'DELETE' });
  }

  // --- Calendar Events ---

  async getEvents() {
    return this.request('/events');
  }

  async createEvent(data) {
    return this.request('/events', { method: 'POST', body: data });
  }

  async updateEvent(id, data) {
    return this.request(`/events/${id}`, { method: 'PUT', body: data });
  }

  async deleteEvent(id) {
    return this.request(`/events/${id}`, { method: 'DELETE' });
  }

  // --- Installations ---

  async getInstallations() {
    return this.request('/installations');
  }

  async createInstallation(data) {
    return this.request('/installations', { method: 'POST', body: data });
  }

  async updateInstallation(id, data) {
    return this.request(`/installations/${id}`, { method: 'PUT', body: data });
  }

  async deleteInstallation(id) {
    return this.request(`/installations/${id}`, { method: 'DELETE' });
  }

  // --- Settings ---

  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(data) {
    return this.request('/settings', { method: 'PUT', body: data });
  }

  // --- KPIs ---

  async getKPIs() {
    return this.request('/kpis');
  }

  // --- Scheduling (blijft lokaal via services/scheduler.js) ---

  async optimizeSchedule(data) {
    // Scheduler draait client-side — geen backend call nodig
    if (window.PlanWiseScheduler) {
      const { jobs, technicians, policies } = data;
      return window.PlanWiseScheduler.optimizeSchedule(jobs, technicians, policies || {});
    }
    // Minimale fallback als scheduler niet geladen is
    return { assignments: [], unassigned_jobs: data.jobs || [], score: 0, explanations: [] };
  }

  // --- Migratie: localStorage → backend ---

  async migrateStateToBackend(orgSlug) {
    const key = `planwise_${orgSlug}_v4`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      console.warn('Geen localStorage data gevonden voor', orgSlug);
      return { ok: false, reason: 'geen data' };
    }

    let state;
    try { state = JSON.parse(raw); } catch { return { ok: false, reason: 'parse error' }; }

    const result = await this.request('/migrate', { method: 'POST', body: { state } });
    console.log('Migratie voltooid:', result);
    return result;
  }

  // --- Backwards-compatibele state helpers (deprecated, gebruik de losse methoden) ---

  getState() {
    const key = `planwise_${this.getCurrentTenant()}_v4`;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  saveState(state) {
    const key = `planwise_${this.getCurrentTenant()}_v4`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('saveState mislukt:', error);
    }
  }

  // --- Logging ---

  log(level, message, data = null) {
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    console[level === 'warn' ? 'warn' : 'log'](`[PlanWise API] ${message}`, data || '');

    try {
      const logs = JSON.parse(localStorage.getItem('planwise_logs') || '[]');
      logs.push(entry);
      if (logs.length > 100) logs.shift();
      localStorage.setItem('planwise_logs', JSON.stringify(logs));
    } catch {}
  }

  // --- Interne localStorage fallback (identiek aan originele implementatie) ---

  _localStorageRequest(endpoint, options) {
    return new Promise(resolve => {
      setTimeout(() => resolve(this._handleLocalRequest(endpoint, options)), 50);
    });
  }

  _handleLocalRequest(endpoint, options) {
    const { method = 'GET', body } = options;
    const state = this.getState();

    if (endpoint === '/schedule/optimize') return this.optimizeSchedule(body);

    const entityMap = {
      '/jobs': { key: 'tickets', idPrefix: 'job' },
      '/technicians': { key: 'technicians', idPrefix: 'tech' },
      '/events': { key: 'calendarEvents', idPrefix: 'ev' },
      '/installations': { key: 'installations', idPrefix: 'inst' }
    };

    // Ondersteun /jobs/:id patroon
    const baseEndpoint = '/' + endpoint.split('/')[1];
    const entityId = endpoint.split('/')[2];
    const map = entityMap[baseEndpoint];

    if (map) {
      const list = state[map.key] || [];
      if (method === 'GET') return entityId ? list.find(i => i.id === entityId) : list;
      if (method === 'POST') {
        const item = { ...body, id: `${map.idPrefix}_${Date.now()}` };
        state[map.key] = [...list, item];
        this.saveState(state);
        return item;
      }
      if (method === 'PUT') {
        const idx = list.findIndex(i => i.id === (entityId || body.id));
        if (idx !== -1) { state[map.key][idx] = { ...list[idx], ...body }; this.saveState(state); return state[map.key][idx]; }
        throw new Error('Niet gevonden');
      }
      if (method === 'DELETE') {
        state[map.key] = list.filter(i => i.id !== (entityId || body?.id));
        this.saveState(state);
        return { ok: true };
      }
    }

    if (endpoint === '/kpis') return this._computeKPIs(state);
    if (endpoint.startsWith('/settings')) {
      if (method === 'GET') return state.settings || {};
      if (method === 'PUT') { state.settings = { ...state.settings, ...body }; this.saveState(state); return state.settings; }
    }

    throw new Error(`Onbekend endpoint: ${endpoint}`);
  }

  _computeKPIs(state) {
    const events = state.calendarEvents || [];
    const tickets = state.tickets || [];
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return {
      completed_this_week: events.filter(e => new Date(e.start) >= thisWeek && e.status === 'completed').length,
      pending_tickets: tickets.filter(t => t.status === 'new').length,
      total_events: events.length,
      total_technicians: (state.technicians || []).length,
      sla_compliance: 95.2,
      average_travel_time: 23
    };
  }
}

// Singleton — zelfde interface als voor de refactor
window.PlanWiseAPI = new PlanWiseAPI();
window.planwiseAPI = window.PlanWiseAPI; // Backwards compat

// Debug helpers
window.apiDebug = {
  enableRemote:  () => window.PlanWiseAPI.setRemote(true),
  disableRemote: () => window.PlanWiseAPI.setRemote(false),
  getLogs:       () => JSON.parse(localStorage.getItem('planwise_logs') || '[]'),
  clearLogs:     () => localStorage.removeItem('planwise_logs'),
  migrate:       (orgSlug) => window.PlanWiseAPI.migrateStateToBackend(orgSlug)
};
