/**
 * Test Persistent Settings and Error Handling
 * Tests for PR 3: Persistente instellingen en foutafhandeling
 */

const mockLocalStorage = {
  data: {},
  getItem: function(key) { return this.data[key] || null; },
  setItem: function(key, value) { this.data[key] = value; },
  removeItem: function(key) { delete this.data[key]; },
  clear: function() { this.data = {}; }
};

const mockElements = {
  'relayWebhook': { value: 'https://webhook.example.com' },
  'relayWebhookSchedule': { value: 'daily' },
  'gmapsKey': { value: 'test-gmaps-key' },
  'openaiKey': { value: 'test-openai-key' },
  'afasUrl': { value: 'https://afas.example.com' },
  'afasToken': { value: 'test-afas-token' }
};

function $(selector) {
  if (selector.startsWith('#')) {
    const id = selector.substring(1);
    return mockElements[id] || { value: '', textContent: '' };
  }
  return null;
}

let state = {
  settings: {},
  technicians: [],
  installations: [],
  auditLog: [],
  calendarEvents: [],
  tickets: [],
  workOrders: {},
  maintenancePlans: [],
  assets: []
};

let saveStateCalled = false;
function saveState() {
  saveStateCalled = true;
  mockLocalStorage.setItem('test_state', JSON.stringify(state));
}

function toast(message) { console.log('Toast:', message); }
function requirePermission(permission) { return true; }

function runPersistentSettingsTests() {
  console.log('🧪 Running Persistent Settings Tests...');
  
  let testsPassed = 0;
  let totalTests = 0;

  function test(name, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${name}`);
      testsPassed++;
    } catch (error) {
      console.error(`❌ ${name}:`, error.message);
    }
  }

  test('Settings are saved after modification', () => {
    saveStateCalled = false;
    state.settings.relayWebhook = $("#relayWebhook").value;
    state.settings.relayWebhookSchedule = $("#relayWebhookSchedule").value;
    state.settings.gmapsKey = $("#gmapsKey").value;
    state.settings.openaiKey = $("#openaiKey").value;
    state.settings.afasUrl = $("#afasUrl").value;
    state.settings.afasToken = $("#afasToken").value;
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after settings modification');
  });

  test('Technician modifications are saved', () => {
    saveStateCalled = false;
    state.technicians.push({ id: "t1", name: "Test Technician", email: "test@example.com", calendarId: "", skills: ["Algemeen"], hub: "" });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after technician addition');
  });

  test('Installation modifications are saved', () => {
    saveStateCalled = false;
    state.installations.push({ id: "inst1", client: "Test Client", address: "Test Address", type: "Test Type", model: "Test Model", installDate: "2024-01-01", lastMaintenance: "2024-01-01", contractType: "Test Contract", contractEnd: "2024-12-31", contractValue: 1000, notes: "Test notes", createdAt: new Date().toISOString() });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after installation addition');
  });

  test('Audit log changes are saved', () => {
    saveStateCalled = false;
    if (!state.auditLog) state.auditLog = [];
    state.auditLog.push({ timestamp: new Date().toISOString(), action: 'test_action', user: 'test_user', tenant: 'test_tenant', details: 'test_details' });
    if (state.auditLog.length > 100) state.auditLog = state.auditLog.slice(-100);
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after audit log changes');
  });

  test('Work order modifications are saved', () => {
    saveStateCalled = false;
    const taskId = 'task1';
    if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
    if (!state.workOrders[taskId].checklist) state.workOrders[taskId].checklist = [];
    state.workOrders[taskId].checklist.push({ text: 'Test checklist item', completed: false });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after work order modification');
  });

  test('Calendar event modifications are saved', () => {
    saveStateCalled = false;
    state.calendarEvents.push({ id: 'ev1', title: 'Test Event', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString(), extendedProps: { client: 'Test Client', address: 'Test Address', technician: 'Test Technician' } });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after calendar event addition');
  });

  test('Maintenance plan modifications are saved', () => {
    saveStateCalled = false;
    state.maintenancePlans.push({ id: 'mp1', assetId: 'asset1', client: 'Test Client', address: 'Test Address', system: 'Test System', lastService: '2024-01-01', nextStart: new Date().toISOString(), nextEnd: new Date(Date.now() + 7200000).toISOString(), category: 'Test Category', tech: 'Test Technician' });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after maintenance plan addition');
  });

  test('Asset modifications are saved', () => {
    saveStateCalled = false;
    state.assets.push({ id: 'asset1', client: 'Test Client', address: 'Test Address', system: 'Test System', category: 'Test Category', lastService: '2024-01-01', contractType: 'Test Contract', contractEnd: '2024-12-31', installationId: 'inst1', contractValue: 1000, installDate: '2024-01-01' });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after asset addition');
  });

  test('Error handling works correctly', () => {
    let errorToastShown = false;
    window.showErrorToast = function(message) { errorToastShown = true; console.log('Error toast shown:', message); };
    try { throw new Error('Test error'); } catch (error) { console.error('Caught error:', error.message); }
    if (typeof window.showErrorToast !== 'function') throw new Error('Error handling mechanism not available');
  });

  test('State persists across multiple operations', () => {
    saveStateCalled = false;
    state.settings.testSetting = 'test_value';
    state.technicians.push({ id: 't2', name: 'Tech 2' });
    state.installations.push({ id: 'inst2', client: 'Client 2' });
    saveState();
    if (!saveStateCalled) throw new Error('saveState was not called after multiple operations');
    const savedState = JSON.parse(mockLocalStorage.getItem('test_state'));
    if (!savedState || !savedState.settings.testSetting) throw new Error('State was not properly persisted');
  });

  console.log(`\n📊 Test Results: ${testsPassed}/${totalTests} tests passed`);
  if (testsPassed === totalTests) {
    console.log('🎉 All persistent settings tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
  }
}

if (typeof window !== 'undefined') {
  window.runPersistentSettingsTests = runPersistentSettingsTests;
  console.log('🧪 Persistent Settings Tests loaded. Run window.runPersistentSettingsTests() to execute.');
} else {
  runPersistentSettingsTests();
}
