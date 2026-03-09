/**
 * Unit tests voor PlanWise Role-based UI
 * Test rol-mapping, menu visibility en Switch Tenant dialog
 */

const mockElements = {
  'currentUserRole': { innerHTML: '' },
  'roleSwitcher': {
    querySelector: function(selector) {
      if (selector === 'select') return { value: 'viewer' };
      return null;
    }
  },
  'switchTenantModal': {
    querySelector: function(selector) {
      if (selector === 'button[value="cancel"]') return { onclick: null };
      return null;
    },
    close: function() {}
  },
  'switchTenantSelect': { value: '', innerHTML: '', onchange: null },
  'accountDropdown': {
    style: { display: 'none' },
    querySelector: function(selector) {
      if (selector === '[data-action="superadmin"]') return { style: { display: 'none' } };
      return null;
    }
  }
};

const originalGetElementById = document.getElementById;
const originalQuerySelector = document.querySelector;
const originalQuerySelectorAll = document.querySelectorAll;

function runRoleBasedUITests() {
  console.log('🧪 Starting Role-based UI tests...');
  
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
  
  function setupMocks() {
    document.getElementById = function(id) {
      if (mockElements[id]) return mockElements[id];
      return originalGetElementById ? originalGetElementById.call(document, id) : null;
    };
    document.querySelector = function(selector) {
      if (selector === '.nav-btn[data-route="superadmin"]') return { style: { display: 'block' }, innerHTML: '🔧 Super Admin' };
      if (selector === '#switchTenantModal button[onclick="performTenantSwitch()"]') return { textContent: 'Ga naar organisatie', disabled: false };
      return originalQuerySelector.call(document, selector);
    };
    document.querySelectorAll = function(selector) {
      if (selector === '.nav-btn') return [
        { dataset: { route: 'dashboard' }, style: { display: 'block' } },
        { dataset: { route: 'planner' }, style: { display: 'block' } },
        { dataset: { route: 'superadmin' }, style: { display: 'block' } }
      ];
      if (selector === '[data-role-display]') return [
        { textContent: '', style: { color: '' } },
        { textContent: '', style: { color: '' } }
      ];
      return originalQuerySelectorAll.call(document, selector);
    };
    window.currentAuth = { orgSlug: 'test-tenant', role: 'admin', user: 'testuser' };
    window.toast = function(message) { console.log('Toast:', message); };
    window.showErrorToast = function(message) { console.log('Error Toast:', message); };
    window.Auth = {
      getKnownOrganizations: function() {
        return [
          { slug: 'org1', name: 'Organization 1', plan: 'trial', created: new Date() },
          { slug: 'org2', name: 'Organization 2', plan: 'pro', created: new Date() }
        ];
      },
      switchOrg: function(slug) { return slug === 'org1'; },
      becomeSuperAdmin: function() { return true; }
    };
    document.body.className = '';
    document.body.classList = {
      add: function(className) { document.body.className += ' ' + className; },
      remove: function(className) { document.body.className = document.body.className.replace(className, ''); }
    };
  }
  
  function cleanupMocks() {
    document.getElementById = originalGetElementById;
    document.querySelector = originalQuerySelector;
    document.querySelectorAll = originalQuerySelectorAll;
    mockElements.currentUserRole.innerHTML = '';
    mockElements.switchTenantSelect.value = '';
    mockElements.switchTenantSelect.innerHTML = '';
  }
  
  test('Role Mapping', () => {
    setupMocks();
    window.currentAuth.role = 'superadmin';
    const role1 = getCurrentUserRole();
    if (role1 !== 'super_admin') throw new Error(`Expected 'super_admin', got '${role1}'`);
    window.currentAuth.role = 'admin';
    const role2 = getCurrentUserRole();
    if (role2 !== 'admin') throw new Error(`Expected 'admin', got '${role2}'`);
    window.currentAuth.role = 'unknown';
    const role6 = getCurrentUserRole();
    if (role6 !== 'viewer') throw new Error(`Expected 'viewer' for unknown role, got '${role6}'`);
    cleanupMocks();
  });
  
  test('Role Info Display', () => {
    setupMocks();
    window.currentAuth.role = 'superadmin';
    const roleInfo1 = getCurrentUserRoleInfo();
    if (roleInfo1.name !== 'Super Admin') throw new Error(`Expected 'Super Admin', got '${roleInfo1.name}'`);
    window.currentAuth.role = 'admin';
    const roleInfo2 = getCurrentUserRoleInfo();
    if (roleInfo2.name !== 'Administrator') throw new Error(`Expected 'Administrator', got '${roleInfo2.name}'`);
    cleanupMocks();
  });
  
  test('Navigation Visibility', () => {
    setupMocks();
    window.currentAuth.role = 'superadmin';
    updateNavigationForRole();
    window.currentAuth.role = 'admin';
    updateNavigationForRole();
    window.currentAuth.role = 'viewer';
    updateNavigationForRole();
    cleanupMocks();
  });
  
  test('Super Admin Menu Visibility', () => {
    setupMocks();
    window.currentAuth.role = 'superadmin';
    updateNavigationForRole();
    const superAdminBtn = document.querySelector('.nav-btn[data-route="superadmin"]');
    if (!superAdminBtn || superAdminBtn.style.display === 'none') throw new Error('Super Admin should be visible for superadmin role');
    window.currentAuth.role = 'admin';
    updateNavigationForRole();
    if (superAdminBtn.style.display !== 'none') throw new Error('Super Admin should be hidden for non-superadmin roles');
    cleanupMocks();
  });
  
  test('Switch Tenant Modal Setup', () => {
    setupMocks();
    showSwitchTenantModal();
    if (mockElements.switchTenantSelect.innerHTML === '') throw new Error('Switch tenant dropdown should be populated');
    const modal = mockElements.switchTenantModal;
    if (!modal) throw new Error('Switch tenant modal should exist');
    cleanupMocks();
  });
  
  test('Switch Tenant Validation', () => {
    setupMocks();
    mockElements.switchTenantSelect.value = '';
    performTenantSwitch();
    mockElements.switchTenantSelect.value = 'org1';
    performTenantSwitch();
    mockElements.switchTenantSelect.value = 'invalid';
    performTenantSwitch();
    cleanupMocks();
  });
  
  test('Role Display Update', () => {
    setupMocks();
    updateRoleDisplay();
    if (!document.body.className.includes('role-admin')) throw new Error('Body should have role-based class');
    cleanupMocks();
  });
  
  test('UI Update for Role', () => {
    setupMocks();
    updateUIForRole();
    if (mockElements.currentUserRole.innerHTML === '') throw new Error('Role indicator should be updated');
    cleanupMocks();
  });
  
  test('Action Button Permissions', () => {
    setupMocks();
    window.currentAuth.role = 'admin';
    updateActionButtonsForRole();
    window.currentAuth.role = 'viewer';
    updateActionButtonsForRole();
    cleanupMocks();
  });
  
  test('Page Content for Role', () => {
    setupMocks();
    window.currentAuth.role = 'technician';
    updatePageContentForRole();
    window.currentAuth.role = 'viewer';
    updatePageContentForRole();
    cleanupMocks();
  });
  
  console.log(`\n📊 Role-based UI Test Results:`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('🎉 All Role-based UI tests passed!');
  } else {
    console.log('⚠️  Some Role-based UI tests failed. Please review the implementation.');
  }
  
  return { passed: testsPassed, failed: testsFailed };
}

if (typeof window !== 'undefined') {
  window.runRoleBasedUITests = runRoleBasedUITests;
  console.log('🧪 Role-based UI tests loaded. Run "runRoleBasedUITests()" to execute tests.');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runRoleBasedUITests };
}
