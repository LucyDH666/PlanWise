/**
 * Unit tests voor PlanWise Data Service
 * Test state initialisatie, opslag en migratie
 */

// Mock localStorage voor tests
const mockLocalStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  },
  get length() {
    return Object.keys(this.data).length;
  },
  key(index) {
    return Object.keys(this.data)[index] || null;
  }
};

// Mock DOM elementen
const mockElements = {
  'planwise-loader': {
    style: { display: 'none' },
    querySelector: function(selector) {
      if (selector === '.loader-text') {
        return { textContent: '' };
      }
      return null;
    }
  }
};

// Mock document methods
const originalGetElementById = document.getElementById;
const originalCreateElement = document.createElement;
const originalAppendChild = document.body.appendChild;
const originalQuerySelector = document.querySelector;

// Test suite
function runDataServiceTests() {
  console.log('🧪 Starting Data Service tests...');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  function test(name, testFunction) {
    try {
      testFunction();
      console.log(`✅ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      testsFailed++;
    }
  }
  
  // Setup mocks
  function setupMocks() {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    // Mock document methods
    document.getElementById = function(id) {
      if (mockElements[id]) {
        return mockElements[id];
      }
      return originalGetElementById ? originalGetElementById.call(document, id) : null;
    };
    
    document.createElement = function(tagName) {
      if (tagName === 'div') {
        return {
          id: '',
          innerHTML: '',
          style: { cssText: '' },
          querySelector: function() { return null; }
        };
      }
      if (tagName === 'style') {
        return {
          id: '',
          textContent: '',
          parentNode: { appendChild: function() {} }
        };
      }
      return originalCreateElement.call(document, tagName);
    };
    
    document.body.appendChild = function(element) {
      return originalAppendChild.call(document.body, element);
    };
    
    document.querySelector = function(selector) {
      if (selector === '#loader-styles') {
        return null;
      }
      return originalQuerySelector.call(document, selector);
    };
    
    // Mock currentAuth
    window.currentAuth = {
      orgSlug: 'test-tenant',
      role: 'admin',
      user: 'testuser'
    };
    
    // Mock toast function
    window.toast = function(message) {
      console.log('Toast:', message);
    };
    
    window.showErrorToast = function(message) {
      console.log('Error Toast:', message);
    };
  }
  
  // Cleanup mocks
  function cleanupMocks() {
    document.getElementById = originalGetElementById;
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.querySelector = originalQuerySelector;
    mockLocalStorage.clear();
  }
  
  // Test 1: Data Service Initialization
  test('Data Service Initialization', () => {
    setupMocks();
    
    // Create data service instance
    const dataService = new PlanWiseDataService();
    
    if (!dataService) {
      throw new Error('Data service should be created');
    }
    
    if (typeof dataService.getStorageKey !== 'function') {
      throw new Error('getStorageKey method should exist');
    }
    
    if (typeof dataService.loadState !== 'function') {
      throw new Error('loadState method should exist');
    }
    
    if (typeof dataService.saveState !== 'function') {
      throw new Error('saveState method should exist');
    }
    
    cleanupMocks();
  });
  
  // Test 2: Storage Key Generation
  test('Storage Key Generation', () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    
    // Test with auth
    const key1 = dataService.getStorageKey();
    if (key1 !== 'planwise_test-tenant_v4') {
      throw new Error(`Expected 'planwise_test-tenant_v4', got '${key1}'`);
    }
    
    // Test without auth
    window.currentAuth = null;
    const key2 = dataService.getStorageKey();
    if (key2 !== 'planwise_demo_v4') {
      throw new Error(`Expected 'planwise_demo_v4', got '${key2}'`);
    }
    
    cleanupMocks();
  });
  
  // Test 3: Default State Creation
  test('Default State Creation', () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    const defaultState = dataService.getDefaultState();
    
    if (!defaultState.tickets) {
      throw new Error('Default state should have tickets array');
    }
    
    if (!defaultState.calendarEvents) {
      throw new Error('Default state should have calendarEvents array');
    }
    
    if (!defaultState.settings) {
      throw new Error('Default state should have settings object');
    }
    
    if (!defaultState.settings.timezone) {
      throw new Error('Default state should have timezone setting');
    }
    
    cleanupMocks();
  });
  
  // Test 4: State Loading
  test('State Loading', async () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    
    // Test loading non-existent state
    const result1 = await dataService.loadState();
    if (result1 !== null) {
      throw new Error('Should return null for non-existent state');
    }
    
    // Test loading existing state
    const testState = { tickets: [], calendarEvents: [] };
    mockLocalStorage.setItem('planwise_test-tenant_v4', JSON.stringify(testState));
    
    const result2 = await dataService.loadState();
    if (!result2 || !result2.tickets) {
      throw new Error('Should return loaded state');
    }
    
    cleanupMocks();
  });
  
  // Test 5: State Saving
  test('State Saving', async () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    const testState = { tickets: [], calendarEvents: [] };
    
    const result = await dataService.saveState(testState);
    if (!result) {
      throw new Error('Save should return true on success');
    }
    
    const saved = mockLocalStorage.getItem('planwise_test-tenant_v4');
    if (!saved) {
      throw new Error('State should be saved to localStorage');
    }
    
    const parsed = JSON.parse(saved);
    if (!parsed.tickets) {
      throw new Error('Saved state should contain tickets');
    }
    
    cleanupMocks();
  });
  
  // Test 6: State Initialization
  test('State Initialization', async () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    const auth = { orgSlug: 'new-tenant', role: 'admin', user: 'newuser' };
    
    const state = await dataService.initializeState(auth);
    
    if (!state) {
      throw new Error('Should return initialized state');
    }
    
    if (!state.tickets) {
      throw new Error('Initialized state should have tickets');
    }
    
    if (!state.calendarEvents) {
      throw new Error('Initialized state should have calendarEvents');
    }
    
    // Check if state was saved
    const saved = mockLocalStorage.getItem('planwise_new-tenant_v4');
    if (!saved) {
      throw new Error('State should be saved after initialization');
    }
    
    cleanupMocks();
  });
  
  // Test 7: Demo Data Addition
  test('Demo Data Addition', () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    const emptyState = dataService.getDefaultState();
    
    const stateWithDemo = dataService.addDemoData(emptyState);
    
    if (stateWithDemo.tickets.length === 0) {
      throw new Error('Demo data should add tickets');
    }
    
    if (stateWithDemo.calendarEvents.length === 0) {
      throw new Error('Demo data should add calendar events');
    }
    
    if (stateWithDemo.technicians.length === 0) {
      throw new Error('Demo data should add technicians');
    }
    
    cleanupMocks();
  });
  
  // Test 8: Legacy Migration
  test('Legacy Migration', async () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    
    // Add legacy data
    const legacyState = {
      tickets: [{ id: 'legacy_ticket' }],
      calendarEvents: [{ id: 'legacy_event' }]
    };
    mockLocalStorage.setItem('planwise_old_tenant', JSON.stringify(legacyState));
    
    const result = await dataService.migrateLegacyState();
    
    if (!result) {
      throw new Error('Migration should return true when legacy data exists');
    }
    
    // Check if legacy data was migrated
    const migrated = mockLocalStorage.getItem('planwise_old_tenant_v4');
    if (!migrated) {
      throw new Error('Legacy data should be migrated to new format');
    }
    
    cleanupMocks();
  });
  
  // Test 9: Loader Functions
  test('Loader Functions', () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    
    // Test show loader
    dataService.showLoader('Test message');
    if (dataService.loaderElement.style.display !== 'flex') {
      throw new Error('Loader should be shown');
    }
    
    // Test hide loader
    dataService.hideLoader();
    if (dataService.loaderElement.style.display !== 'none') {
      throw new Error('Loader should be hidden');
    }
    
    cleanupMocks();
  });
  
  // Test 10: Error Handling
  test('Error Handling', async () => {
    setupMocks();
    
    const dataService = new PlanWiseDataService();
    
    // Test save with error
    mockLocalStorage.setItem = function() {
      throw new Error('Storage error');
    };
    
    const result = await dataService.saveState({});
    if (result !== false) {
      throw new Error('Should return false on save error');
    }
    
    // Test load with error
    mockLocalStorage.getItem = function() {
      throw new Error('Storage error');
    };
    
    const loadResult = await dataService.loadState();
    if (loadResult !== null) {
      throw new Error('Should return null on load error');
    }
    
    cleanupMocks();
  });
  
  // Test results
  console.log(`\n📊 Data Service Test Results:`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('🎉 All Data Service tests passed!');
  } else {
    console.log('⚠️  Some Data Service tests failed. Please review the implementation.');
  }
  
  return { passed: testsPassed, failed: testsFailed };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runDataServiceTests = runDataServiceTests;
  console.log('🧪 Data Service tests loaded. Run "runDataServiceTests()" to execute tests.');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runDataServiceTests };
}
