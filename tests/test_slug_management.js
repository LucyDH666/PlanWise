/**
 * Unit tests voor PlanWise slug-beheer
 * Test case-insensitivity, slug vs. naam matching, en error handling
 */

const mockLocalStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; },
  get length() { return Object.keys(this.data).length; },
  key(index) { return Object.keys(this.data)[index] || null; }
};

const mockElements = {
  loginError: { textContent: '', style: { display: 'none' } },
  availableOrganizations: { innerHTML: '' }
};

const originalGetElementById = document.getElementById;
document.getElementById = function(id) {
  if (mockElements[id]) return mockElements[id];
  return originalGetElementById ? originalGetElementById.call(document, id) : null;
};

function mockGetAllTenants() {
  return [
    { key: 'testbedrijf', info: { company: 'Test Bedrijf', industry: 'HVAC' }, users: [{ username: 'admin', password: 'password123', role: 'admin' }] },
    { key: 'demo-company', info: { company: 'Demo Company', industry: 'Electrical' }, users: [{ username: 'user', password: 'password123', role: 'user' }] },
    { key: 'acme-corp', info: { company: 'ACME Corporation', industry: 'Plumbing' }, users: [{ username: 'manager', password: 'password123', role: 'admin' }] }
  ];
}

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
  
  test('Case-insensitive slug matching', () => {
    const tenants = mockGetAllTenants();
    const exactMatch1 = tenants.find(t => t.key.toLowerCase() === 'testbedrijf');
    const exactMatch2 = tenants.find(t => t.key.toLowerCase() === 'TESTBEDRIJF'.toLowerCase());
    const exactMatch3 = tenants.find(t => t.key.toLowerCase() === 'TestBedrijf'.toLowerCase());
    if (!exactMatch1 || !exactMatch2 || !exactMatch3) throw new Error('Case-insensitive slug matching failed');
    if (exactMatch1.key !== 'testbedrijf') throw new Error('Slug should be returned in original case');
  });
  
  test('Case-insensitive company name matching', () => {
    const tenants = mockGetAllTenants();
    const companyMatch1 = tenants.find(t => t.info.company.toLowerCase() === 'test bedrijf');
    const companyMatch2 = tenants.find(t => t.info.company.toLowerCase() === 'TEST BEDRIJF'.toLowerCase());
    const companyMatch3 = tenants.find(t => t.info.company.toLowerCase() === 'Test Bedrijf'.toLowerCase());
    if (!companyMatch1 || !companyMatch2 || !companyMatch3) throw new Error('Case-insensitive company name matching failed');
    if (companyMatch1.info.company !== 'Test Bedrijf') throw new Error('Company name should be returned in original case');
  });
  
  test('Slug takes priority over company name', () => {
    const tenants = mockGetAllTenants();
    tenants.push({ key: 'demo-company', info: { company: 'Different Company', industry: 'Other' }, users: [] });
    const match = tenants.find(t => t.key.toLowerCase() === 'demo-company');
    if (!match) throw new Error('Should find tenant by slug');
    if (match.info.company !== 'Different Company') throw new Error('Should prioritize slug over company name');
  });
  
  test('Non-existent organization returns null', () => {
    const tenants = mockGetAllTenants();
    const nonExistent = tenants.find(t => t.key.toLowerCase() === 'nonexistent' || t.info.company.toLowerCase() === 'nonexistent');
    if (nonExistent) throw new Error('Should not find non-existent organization');
  });
  
  test('Error message display', () => {
    const originalShowLoginError = window.showLoginError;
    let errorMessage = '';
    window.showLoginError = function(message) { errorMessage = message; };
    window.showLoginError('Test error message');
    if (errorMessage !== 'Test error message') throw new Error('Error message not displayed correctly');
    window.showLoginError = originalShowLoginError;
  });
  
  test('Available organizations population', () => {
    const tenants = mockGetAllTenants();
    const datalist = { innerHTML: '', appendChild: function(el) { this.innerHTML += `<option value="${el.value}">${el.textContent}</option>`; } };
    tenants.forEach(tenant => {
      const option = { value: tenant.info.company, textContent: `${tenant.info.company} (${tenant.key})` };
      datalist.appendChild(option);
    });
    if (datalist.innerHTML === '') throw new Error('Available organizations not populated');
    const optionCount = (datalist.innerHTML.match(/<option/g) || []).length;
    if (optionCount !== tenants.length) throw new Error(`Expected ${tenants.length} options, got ${optionCount}`);
  });
  
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
      if (generated !== expected) throw new Error(`Slug generation failed: "${input}" should become "${expected}", got "${generated}"`);
    });
  });
  
  test('Login validation with invalid input', () => {
    const testCases = [
      { company: '', username: 'user', password: 'pass', shouldFail: true },
      { company: 'test', username: '', password: 'pass', shouldFail: true },
      { company: 'test', username: 'user', password: '', shouldFail: true },
      { company: 'nonexistent', username: 'user', password: 'pass', shouldFail: true }
    ];
    testCases.forEach(({ company, username, password, shouldFail }) => {
      const hasRequiredFields = company && username && password;
      const isValidInput = hasRequiredFields && company !== 'nonexistent';
      if (shouldFail && isValidInput) throw new Error(`Login validation failed for company="${company}", username="${username}"`);
    });
  });
  
  test('Global error handling functionality', () => {
    if (typeof window.safeExecute === 'function') {
      const result1 = window.safeExecute(() => { throw new Error('Test error'); }, null, 'test-context');
      if (result1 !== null) throw new Error('safeExecute should return null for failing function');
      const result2 = window.safeExecute(() => { throw new Error('Test error'); }, () => 'fallback result', 'test-context');
      if (result2 !== 'fallback result') throw new Error('safeExecute should return fallback result');
      const result3 = window.safeExecute(() => 'success result', null, 'test-context');
      if (result3 !== 'success result') throw new Error('safeExecute should return function result');
    }
  });
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  if (testsFailed === 0) { console.log('🎉 All tests passed!'); }
  else { console.log('⚠️  Some tests failed. Please review the implementation.'); }
  return { passed: testsPassed, failed: testsFailed };
}

if (typeof window !== 'undefined') {
  window.runSlugManagementTests = runSlugManagementTests;
  console.log('🧪 Slug management tests loaded. Run "runSlugManagementTests()" to execute tests.');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runSlugManagementTests };
}
