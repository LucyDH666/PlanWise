// src/modules/settings.js
// onSaveSettings (see also technician.js), debug helper,
// observability: metrics, logger, planwiseMetrics, runPlanwiseTests, runPlanwiseHealthCheck

/* -------------------- DEBUG HELPER -------------------- */
// Debug helper for development
window.planwiseDebug = {
  getState: () => state,
  getAuth: () => currentAuth,
  getRoute: () => currentRoute,
  clearState: () => { localStorage.removeItem(getStorageKey()); location.reload(); },
  seedDemoData: () => { state = seedDemo(structuredClone(defaultState)); saveState(); location.reload(); },
  simulateError: (msg) => { throw new Error(msg || 'Simulated error'); },
  checkServices: () => window.checkServices(),
  listModules: () => console.log('Modules: state, router, auth, rbac, planner, dashboard, installations, maintenance, technician, settings, superadmin')
};

console.log('\ud83d\udd27 PlanWise debug tools available via window.planwiseDebug');

/* -------------------- OBSERVABILITY & QUALITY -------------------- */
// Metrics collection
window.planwiseMetrics = {
  counters: {},
  timers: {},
  errors: [],
  
  increment(metric, value = 1) {
    this.counters[metric] = (this.counters[metric] || 0) + value;
  },
  
  startTimer(metric) {
    this.timers[metric] = { start: performance.now() };
  },
  
  endTimer(metric) {
    if (this.timers[metric]) {
      const duration = performance.now() - this.timers[metric].start;
      this.timers[metric].duration = duration;
      return duration;
    }
    return null;
  },
  
  recordError(error, context = '') {
    this.errors.push({ error: error.message, context, timestamp: new Date().toISOString(), stack: error.stack });
    if (this.errors.length > 100) this.errors.shift(); // Keep last 100 errors
  },
  
  getSummary() {
    return { counters: this.counters, timers: Object.fromEntries(Object.entries(this.timers).map(([k, v]) => [k, v.duration])), errorCount: this.errors.length, recentErrors: this.errors.slice(-5) };
  }
};

// Logger
window.planwiseLogger = {
  logs: [],
  maxLogs: 500,
  
  _log(level, message, data = null) {
    const entry = { level, message, data, timestamp: new Date().toISOString() };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(`[PlanWise:${level.toUpperCase()}] ${message}`, data || '');
  },
  
  info(message, data) { this._log('info', message, data); },
  warn(message, data) { this._log('warn', message, data); },
  error(message, data) { this._log('error', message, data); },
  debug(message, data) { this._log('debug', message, data); },
  
  getLogs(level = null) { return level ? this.logs.filter(l => l.level === level) : this.logs; },
  
  exportLogs() {
    const logData = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `planwise-logs-${new Date().toISOString().split('T')[0]}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
};

// Health check
window.runPlanwiseHealthCheck = function() {
  console.log('\ud83c\udfe5 Running PlanWise health check...');
  const checks = [];
  
  // Check state integrity
  checks.push({ name: 'State initialized', status: state !== null && state !== undefined, value: !!state });
  checks.push({ name: 'Tickets array', status: Array.isArray(state?.tickets), value: state?.tickets?.length });
  checks.push({ name: 'Technicians array', status: Array.isArray(state?.technicians), value: state?.technicians?.length });
  checks.push({ name: 'Calendar events array', status: Array.isArray(state?.calendarEvents), value: state?.calendarEvents?.length });
  checks.push({ name: 'Auth state', status: currentAuth !== null, value: currentAuth?.role });
  checks.push({ name: 'Auth service', status: typeof Auth !== 'undefined', value: typeof Auth });
  checks.push({ name: 'Scheduler service', status: typeof window.planwiseScheduler !== 'undefined', value: typeof window.planwiseScheduler });
  checks.push({ name: 'Data service', status: typeof window.PlanWiseData !== 'undefined', value: typeof window.PlanWiseData });
  checks.push({ name: 'FullCalendar', status: typeof FullCalendar !== 'undefined', value: typeof FullCalendar });
  checks.push({ name: 'localStorage available', status: (() => { try { localStorage.setItem('test', '1'); localStorage.removeItem('test'); return true; } catch(e) { return false; } })(), value: 'available' });
  
  let passed = 0; let failed = 0;
  checks.forEach(check => {
    const icon = check.status ? '\u2705' : '\u274c';
    console.log(`${icon} ${check.name}: ${check.value}`);
    if (check.status) passed++; else failed++;
  });
  
  console.log(`\n\ud83d\udcca Health check: ${passed} passed, ${failed} failed`);
  if (failed === 0) { toast('\u2705 Systeemcheck geslaagd!'); } else { showErrorToast(`Systeemcheck: ${failed} problemen gevonden`); }
  return { passed, failed, checks };
};

// E2E Tests
window.runPlanwiseTests = async function() {
  console.log('\ud83e\uddea Running PlanWise E2E tests...');
  const results = { passed: 0, failed: 0, tests: [] };
  
  async function test(name, fn) {
    try {
      await fn();
      results.tests.push({ name, status: 'passed' });
      results.passed++;
      console.log(`\u2705 ${name}`);
    } catch (error) {
      results.tests.push({ name, status: 'failed', message: 'Error: ' + error.message });
      results.failed++;
      console.error(`\u274c ${name}:`, error);
    }
  }
  
  await test('State is initialized', () => { if (!state) throw new Error('State is null'); });
  await test('Auth service available', () => { if (typeof Auth === 'undefined') throw new Error('Auth not defined'); });
  await test('uuid() generates unique IDs', () => { const id1 = uuid(); const id2 = uuid(); if (id1 === id2) throw new Error('UUIDs are not unique'); });
  await test('getStorageKey() returns string', () => { const key = getStorageKey(); if (typeof key !== 'string') throw new Error('Storage key is not a string'); });
  await test('hasPermission() is callable', () => { if (typeof hasPermission !== 'function') throw new Error('hasPermission not a function'); });
  await test('go() function exists', () => { if (typeof go !== 'function') throw new Error('go() not defined'); });
  await test('renderBoard() function exists', () => { if (typeof renderBoard !== 'function') throw new Error('renderBoard() not defined'); });
  await test('State has required properties', () => { const required = ['tickets', 'technicians', 'calendarEvents']; required.forEach(prop => { if (!state.hasOwnProperty(prop)) throw new Error(`Missing: ${prop}`); }); });
  
  console.log('\ud83e\uddea Test Results:', results);
  const message = `Tests: ${results.passed} passed, ${results.failed} failed`;
  if (results.failed === 0) { console.log('\u2705 All tests passed!'); toast('\u2705 Alle tests geslaagd!'); }
  else { console.error('\u274c Some tests failed'); showErrorToast(`Tests: ${results.passed} geslaagd, ${results.failed} gefaald`); }
  return results;
};

console.log(`
\ud83d\udd27 PlanWise Development Tools Available:

\ud83e\uddea Tests:
  - runPlanwiseTests() - Run all E2E tests
  - runPlanwiseHealthCheck() - Run health check

\ud83d\udcca Metrics & Logging:
  - window.planwiseMetrics - View current metrics
  - window.planwiseLogger - Access logger instance

\ud83d\udd0d Debug:
  - window.planwiseDebug - Access debug tools
  - window.planwiseMetrics.getSummary() - Get metrics summary
  - window.planwiseLogger.getLogs() - Get recent logs
`);
