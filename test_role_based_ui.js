/**
 * Unit tests voor PlanWise Role-based UI
 * Test rol-mapping, menu visibility en Switch Tenant dialog
 */

// Mock DOM elementen
const mockElements = {
  'currentUserRole': {
    innerHTML: ''
  },
  'roleSwitcher': {
    querySelector: function(selector) {
      if (selector === 'select') {
        return { value: 'viewer' };
      }
      return null;
    }
  },
  'switchTenantModal': {
    querySelector: function(selector) {
      if (selector === 'button[value="cancel"]') {
        return { onclick: null };
      }
      return null;
    },
    close: function() {}
  },
  'switchTenantSelect': {
    value: '',
    innerHTML: '',
    onchange: null
  },
  'accountDropdown': {
    style: { display: 'none' },
    querySelector: function(selector) {
      if (selector === '[data-action="superadmin"]') {
        return { style: { display: 'none' } };
      }
      return null;
    }
  }
};

// Mock document methods
const originalGetElementById = document.getElementById;
const originalQuerySelector = document.querySelector;
const originalQuerySelectorAll = document.querySelectorAll;

// Test suite
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
  
  // Setup mocks
  function setupMocks() {
    // Mock document.getElementById
    document.getElementById = function(id) {
      if (mockElements[id]) {
        return mockElements[id];
      }
      return originalGetElementById ? originalGetElementById.call(document, id) : null;
    };
    
    // Mock document.querySelector
    document.querySelector = function(selector) {
      if (selector === '.nav-btn[data-route="superadmin"]') {
        return {
          style: { display: 'block' },
          innerHTML: '🔧 Super Admin'
        };
      }
      if (selector === '#switchTenantModal button[onclick="performTenantSwitch()"]') {
        return {
          textContent: 'Ga naar organisatie',
          disabled: false
        };
      }
      return originalQuerySelector.call(document, selector);
    };
    
    // Mock document.querySelectorAll
    document.querySelectorAll = function(selector) {
      if (selector === '.nav-btn') {
        return [
          { dataset: { route: 'dashboard' }, style: { display: 'block' } },
          { dataset: { route: 'planner' }, style: { display: 'block' } },
          { dataset: { route: 'superadmin' }, style: { display: 'block' } }
        ];
      }
      if (selector === '[data-role-display]') {
        return [
          { textContent: '', style: { color: '' } },
          { textContent: '', style: { color: '' } }
        ];
      }
      return originalQuerySelectorAll.call(document, selector);
    };
    
    // Mock currentAuth
    window.currentAuth = {
      orgSlug: 'test-tenant',
      role: 'admin',
      user: 'testuser'
    };
    
    // Mock toast functions
    window.toast = function(message) {
      console.log('Toast:', message);
    };
    
    window.showErrorToast = function(message) {
      console.log('Error Toast:', message);
    };
    
    // Mock Auth service
    window.Auth = {
      getKnownOrganizations: function() {
        return [
          { slug: 'org1', name: 'Organization 1', plan: 'trial', created: new Date() },
          { slug: 'org2', name: 'Organization 2', plan: 'pro', created: new Date() }
        ];
      },
      switchOrg: function(slug) {
        return slug === 'org1';
      },
      becomeSuperAdmin: function() {
        return true;
      }
    };
    
    // Mock body classList
    document.body.className = '';
    document.body.classList = {
      add: function(className) {
        document.body.className += ' ' + className;
      },
      remove: function(className) {
        document.body.className = document.body.className.replace(className, '');
      }
    };
  }
  
  // Cleanup mocks
  function cleanupMocks() {
    document.getElementById = originalGetElementById;
    document.querySelector = originalQuerySelector;
    document.querySelectorAll = originalQuerySelectorAll;
    mockElements.currentUserRole.innerHTML = '';
    mockElements.switchTenantSelect.value = '';
    mockElements.switchTenantSelect.innerHTML = '';
  }
  
  // Test 1: Role Mapping
  test('Role Mapping', () => {
    setupMocks();
    
    // Test superadmin role
    window.currentAuth.role = 'superadmin';
    const role1 = getCurrentUserRole();
    if (role1 !== 'super_admin') {
      throw new Error(`Expected 'super_admin', got '${role1}'`);
    }
    
    // Test admin role
    window.currentAuth.role = 'admin';
    const role2 = getCurrentUserRole();
    if (role2 !== 'admin') {
      throw new Error(`Expected 'admin', got '${role2}'`);
    }
    
    // Test planner role
    window.currentAuth.role = 'planner';
    const role3 = getCurrentUserRole();
    if (role3 !== 'planner') {
      throw new Error(`Expected 'planner', got '${role3}'`);
    }
    
    // Test technician role
    window.currentAuth.role = 'technician';
    const role4 = getCurrentUserRole();
    if (role4 !== 'technician') {
      throw new Error(`Expected 'technician', got '${role4}'`);
    }
    
    // Test viewer role
    window.currentAuth.role = 'viewer';
    const role5 = getCurrentUserRole();
    if (role5 !== 'viewer') {
      throw new Error(`Expected 'viewer', got '${role5}'`);
    }
    
    // Test unknown role
    window.currentAuth.role = 'unknown';
    const role6 = getCurrentUserRole();
    if (role6 !== 'viewer') {
      throw new Error(`Expected 'viewer' for unknown role, got '${role6}'`);
    }
    
    cleanupMocks();
  });
  
  // Test 2: Role Info Display
  test('Role Info Display', () => {
    setupMocks();
    
    // Test superadmin role info
    window.currentAuth.role = 'superadmin';
    const roleInfo1 = getCurrentUserRoleInfo();
    if (roleInfo1.name !== 'Super Admin') {
      throw new Error(`Expected 'Super Admin', got '${roleInfo1.name}'`);
    }
    
    // Test admin role info
    window.currentAuth.role = 'admin';
    const roleInfo2 = getCurrentUserRoleInfo();
    if (roleInfo2.name !== 'Administrator') {
      throw new Error(`Expected 'Administrator', got '${roleInfo2.name}'`);
    }
    
    cleanupMocks();
  });
  
  // Test 3: Navigation Visibility
  test('Navigation Visibility', () => {
    setupMocks();
    
    // Test superadmin navigation
    window.currentAuth.role = 'superadmin';
    updateNavigationForRole();
    
    // Test admin navigation
    window.currentAuth.role = 'admin';
    updateNavigationForRole();
    
    // Test viewer navigation
    window.currentAuth.role = 'viewer';
    updateNavigationForRole();
    
    cleanupMocks();
  });
  
  // Test 4: Super Admin Menu Visibility
  test('Super Admin Menu Visibility', () => {
    setupMocks();
    
    // Test superadmin can see Super Admin menu
    window.currentAuth.role = 'superadmin';
    updateNavigationForRole();
    
    const superAdminBtn = document.querySelector('.nav-btn[data-route="superadmin"]');
    if (!superAdminBtn || superAdminBtn.style.display === 'none') {
      throw new Error('Super Admin should be visible for superadmin role');
    }
    
    // Test non-superadmin cannot see Super Admin menu
    window.currentAuth.role = 'admin';
    updateNavigationForRole();
    
    if (superAdminBtn.style.display !== 'none') {
      throw new Error('Super Admin should be hidden for non-superadmin roles');
    }
    
    cleanupMocks();
  });
  
  // Test 5: Switch Tenant Modal Setup
  test('Switch Tenant Modal Setup', () => {
    setupMocks();
    
    showSwitchTenantModal();
    
    // Check if dropdown is populated
    if (mockElements.switchTenantSelect.innerHTML === '') {
      throw new Error('Switch tenant dropdown should be populated');
    }
    
    // Check if close buttons are set up
    const modal = mockElements.switchTenantModal;
    if (!modal) {
      throw new Error('Switch tenant modal should exist');
    }
    
    cleanupMocks();
  });
  
  // Test 6: Switch Tenant Validation
  test('Switch Tenant Validation', () => {
    setupMocks();
    
    // Test empty selection
    mockElements.switchTenantSelect.value = '';
    performTenantSwitch();
    
    // Test valid selection
    mockElements.switchTenantSelect.value = 'org1';
    performTenantSwitch();
    
    // Test invalid selection
    mockElements.switchTenantSelect.value = 'invalid';
    performTenantSwitch();
    
    cleanupMocks();
  });
  
  // Test 7: Role Display Update
  test('Role Display Update', () => {
    setupMocks();
    
    updateRoleDisplay();
    
    // Check if role switcher is updated
    const roleSwitcher = mockElements.roleSwitcher;
    if (roleSwitcher) {
      const roleSelect = roleSwitcher.querySelector('select');
      if (roleSelect && roleSelect.value !== 'admin') {
        throw new Error('Role switcher should be updated with current role');
      }
    }
    
    // Check if body class is updated
    if (!document.body.className.includes('role-admin')) {
      throw new Error('Body should have role-based class');
    }
    
    cleanupMocks();
  });
  
  // Test 8: UI Update for Role
  test('UI Update for Role', () => {
    setupMocks();
    
    updateUIForRole();
    
    // Check if role indicator is updated
    if (mockElements.currentUserRole.innerHTML === '') {
      throw new Error('Role indicator should be updated');
    }
    
    cleanupMocks();
  });
  
  // Test 9: Action Button Permissions
  test('Action Button Permissions', () => {
    setupMocks();
    
    // Test admin permissions
    window.currentAuth.role = 'admin';
    updateActionButtonsForRole();
    
    // Test viewer permissions
    window.currentAuth.role = 'viewer';
    updateActionButtonsForRole();
    
    cleanupMocks();
  });
  
  // Test 10: Page Content for Role
  test('Page Content for Role', () => {
    setupMocks();
    
    // Test technician dashboard
    window.currentAuth.role = 'technician';
    updatePageContentForRole();
    
    // Test viewer read-only
    window.currentAuth.role = 'viewer';
    updatePageContentForRole();
    
    cleanupMocks();
  });
  
  // Test results
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

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runRoleBasedUITests = runRoleBasedUITests;
  console.log('🧪 Role-based UI tests loaded. Run "runRoleBasedUITests()" to execute tests.');
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runRoleBasedUITests };
}
