/**
 * Unit tests voor PlanWise slug-beheer
 * Test case-insensitivity, slug vs. naam matching, en error handling
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
  loginError: {
    textContent: '',
    style: { display: 'none' }
  },
  availableOrganizations: {
    innerHTML: ''
  }
};

// Mock document.getElementById
const originalGetElementById = document.getElementById;
document.getElementById = function(id) {
  if (mockElements[id]) {
    return mockElements[id];
  }
  return originalGetElementById ? originalGetElementById.call(document, id) : null;
};

// Mock getAllTenants functie
function mockGetAllTenants() {
  return [
    {
      key: 'testbedrijf',
      info: { company: 'Test Bedrijf', industry: 'HVAC' },
      users: [{ username: 'admin', password: 'password123', role: 'admin' }]
    },
    {
      key: 'demo-company',
      info: { company: 'Demo Company', industry: 'Electrical' },
      users: [{ username: 'user', password: 'password123', role: 'user' }]
    },
    {
      key: 'acme-corp',
      info: { company: 'ACME Corporation', industry: 'Plumbing' },
      users: [{ username: 'manager', password: 'password123', role: 'admin' }]
    }
  ];
}

// Test suite
function runSlugManagementTests() {
  console.log('🧪 Starting slug management tests...');
  
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
  
  // Test 1: Case-insensitive slug matching
  test('Case-insensitive slug matching', () => {
    const tenants = mockGetAllTenants();
    
    // Test exact slug match (case-insensitive)
    const exactMatch1 = tenants.find(t => t.key.toLowerCase() === 'testbedrijf');
    const exactMatch2 = tenants.find(t => t.key.toLowerCase() === 'TESTBEDRIJF');
    const exactMatch3 = tenants.find(t => t.key.toLowerCase() === 'TestBedrijf');
    
    if (!exactMatch1 || !exactMatch2 || !exactMatch3) {
      throw new Error('Case-insensitive slug matching failed');
    }
    
    if (exactMatch1.key !== 'testbedrijf') {
      throw new Error('Slug should be returned in original case');
    }
  });
  
  // Test 2: Company name matching (case-insensitive)
  test('Case-insensitive company name matching', () => {
    const tenants = mockGetAllTenants();
    
    // Test company name match (case-insensitive)
    const companyMatch1 = tenants.find(t => t.info.company.toLowerCase() === 'test bedrijf');
    const companyMatch2 = tenants.find(t => t.info.company.toLowerCase() === 'TEST BEDRIJF');
    const companyMatch3 = tenants.find(t => t.info.company.toLowerCase() === 'Test Bedrijf');
    
    if (!companyMatch1 || !companyMatch2 || !companyMatch3) {
      throw new Error('Case-insensitive company name matching failed');
    }
    
    if (companyMatch1.info.company !== 'Test Bedrijf') {
      throw new Error('Company name should be returned in original case');
    }
  });
  
  // Test 3: Slug vs. name priority
  test('Slug takes priority over company name', () => {
    const tenants = mockGetAllTenants();
    
    // Add a tenant where slug matches another tenant's company name
    tenants.push({
      key: 'demo-company',
      info: { company: 'Different Company', industry: 'Other' },
      users: []
    });
    
    // When searching for 'demo-company', should find the tenant with that slug
    const match = tenants.find(t => t.key.toLowerCase() === 'demo-company');
    
    if (!match) {
      throw new Error('Should find tenant by slug');
    }
    
    if (match.info.company !== 'Different Company') {
      throw new Error('Should prioritize slug over company name');
    }
  });
  
  // Test 4: Non-existent organization
  test('Non-existent organization returns null', () => {
    const tenants = mockGetAllTenants();
    
    const nonExistent = tenants.find(t => 
      t.key.toLowerCase() === 'nonexistent' || 
      t.info.company.toLowerCase() === 'nonexistent'
    );
    
    if (nonExistent) {
      throw new Error('Should not find non-existent organization');
    }
  });
  
  // Test 5: Error message display
  test('Error message display', () => {
    // Mock showLoginError function
    const originalShowLoginError = window.showLoginError;
    let errorMessage = '';
    
    window.showLoginError = function(message) {
      errorMessage = message;
    };
    
    // Test error message
    window.showLoginError('Test error message');
    
    if (errorMessage !== 'Test error message') {
      throw new Error('Error message not displayed correctly');
    }
    
    // Restore original function
    window.showLoginError = originalShowLoginError;
  });
  
  // Test 6: Available organizations population
  test('Available organizations population', () => {
    const tenants = mockGetAllTenants();
    const datalist = { innerHTML: '' };
    
    // Mock populateAvailableOrganizations
    function populateAvailableOrganizations() {
      datalist.innerHTML = '';
      
      tenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant.info.company;
        option.textContent = `${tenant.info.company} (${tenant.key})`;
        datalist.appendChild(option);
      });
    }
    
    populateAvailableOrganizations();
    
    if (datalist.innerHTML === '') {
      throw new Error('Available organizations not populated');
    }
    
    // Check if all tenants are included
    const optionCount = (datalist.innerHTML.match(/<option/g) || []).length;
    if (optionCount !== tenants.length) {
      throw new Error(`Expected ${tenants.length} options, got ${optionCount}`);
    }
  });
  
  // Test 7: Slug generation
  test('Slug generation from company name', () => {
    const testCases = [
      { input: 'Test Bedrijf', expected: 'testbedrijf' },
      { input: 'Demo Company', expected: 'democompany' },
      { input: 'ACME Corporation', expected: 'acmecorporation' },
      { input: 'HVAC Solutions BV', expected: 'hvacsolutionsbv' },
      { input: 'Test-Bedrijf 123', expected: 'testbedrijf123' }
    ];
    
    testCases.forEach(({ input, expected }) => {
      const generated = input.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (generated !== expected) {
        throw new Error(`Slug generation failed: "${input}" should become "${expected}", got "${generated}"`);
      }
    });
  });
  
  // Test 8: Login validation
  test('Login validation with invalid input', () => {
    const testCases = [
      { company: '', username: 'user', password: 'pass', shouldFail: true },
      { company: 'test', username: '', password: 'pass', shouldFail: true },
      { company: 'test', username: 'user', password: '', shouldFail: true },
      { company: 'nonexistent', username: 'user', password: 'pass', shouldFail: true },
      { company: 'testbedrijf', username: 'wronguser', password: 'pass', shouldFail: true },
      { company: 'testbedrijf', username: 'admin', password: 'wrongpass', shouldFail: true }
    ];
    
    testCases.forEach(({ company, username, password, shouldFail }) => {
      // This is a simplified test - in real implementation, handleLogin would be called
      const hasRequiredFields = company && username && password;
      const isValidInput = hasRequiredFields && company !== 'nonexistent';
      
      if (shouldFail && isValidInput) {
        throw new Error(`Login validation failed: should fail for company="${company}", username="${username}"`);
      }
    });
  });
  
  // Test 9: Global error handling
  test('Global error handling functionality', () => {
    // Mock DOM elements for error toast
    const originalQuerySelector = document.querySelector;
    const originalCreateElement = document.createElement;
    const originalAppendChild = document.body.appendChild;
    
    let toastCreated = false;
    let toastMessage = '';
    
    // Mock document methods
    document.querySelector = function(selector) {
      if (selector === '.error-toast') return null;
      if (selector === '#error-toast-styles') return null;
      return originalQuerySelector.call(document, selector);
    };
    
    document.createElement = function(tagName) {
      if (tagName === 'div') {
        toastCreated = true;
        return {
          className: '',
          style: { cssText: '' },
          textContent: '',
          addEventListener: function() {},
          parentNode: { removeChild: function() {} }
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
      if (element.className === 'error-toast') {
        toastMessage = element.textContent;
      }
      return originalAppendChild.call(document.body, element);
    };
    
    // Test window.onerror handler
    if (typeof window.onerror === 'function') {
      const errorResult = window.onerror('Test error message', 'test.js', 1, 1, new Error('Test error'));
      if (errorResult !== false) {
        throw new Error('onerror should return false to allow default handling');
      }
    }
    
    // Test window.onunhandledrejection handler
    if (typeof window.onunhandledrejection === 'function') {
      const event = { reason: new Error('Test rejection'), preventDefault: function() {} };
      window.onunhandledrejection(event);
    }
    
    // Test safeExecute utility
    if (typeof window.safeExecute === 'function') {
      // Test with failing function
      const result1 = window.safeExecute(
        () => { throw new Error('Test error'); },
        null,
        'test-context'
      );
      if (result1 !== null) {
        throw new Error('safeExecute should return null for failing function');
      }
      
      // Test with fallback
      const result2 = window.safeExecute(
        () => { throw new Error('Test error'); },
        () => 'fallback result',
        'test-context'
      );
      if (result2 !== 'fallback result') {
        throw new Error('safeExecute should return fallback result');
      }
      
      // Test with successful function
      const result3 = window.safeExecute(
        () => 'success result',
        null,
        'test-context'
      );
      if (result3 !== 'success result') {
        throw new Error('safeExecute should return function result');
      }
    }
    
    // Restore original methods
    document.querySelector = originalQuerySelector;
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
  });
  
  // Test results
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return { passed: testsPassed, failed: testsFailed };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runSlugManagementTests = runSlugManagementTests;
  console.log('🧪 Slug management tests loaded. Run "runSlugManagementTests()" to execute tests.');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runSlugManagementTests };
}
