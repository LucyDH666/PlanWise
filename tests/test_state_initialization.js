// Test file to verify state initialization fixes
console.log('Testing state initialization fixes...');

window.PlanWiseData = {
  showLoader: (message) => console.log('Loader shown:', message),
  hideLoader: () => console.log('Loader hidden'),
  loadState: async () => {
    console.log('Loading state...');
    return { tickets: [], technicians: [], calendarEvents: [] };
  },
  saveState: async (state) => { console.log('Saving state:', state); },
  initializeState: async (auth) => {
    console.log('Initializing state for auth:', auth);
    return { tickets: [], technicians: [], calendarEvents: [] };
  }
};

window.Auth = {
  get: () => ({ username: 'test', role: 'admin', orgSlug: 'test-org' }),
  set: (auth) => true,
  hasPermission: (permission) => true
};

window.showErrorToast = (message) => console.log('Error toast:', message);
window.toast = (message) => console.log('Toast:', message);

async function testLoadState() {
  console.log('Testing loadState...');
  try {
    const result = await loadState();
    console.log('loadState result:', result);
    return result !== null;
  } catch (error) {
    console.error('loadState error:', error);
    return false;
  }
}

async function testGoFunction() {
  console.log('Testing go function...');
  state = null;
  console.log('Testing go with null state...');
  await go('dashboard');
  state = { tickets: [], technicians: [], calendarEvents: [] };
  console.log('Testing go with valid state...');
  await go('dashboard');
}

async function testInitAppFor() {
  console.log('Testing initAppFor...');
  try {
    await initAppFor({ username: 'test', role: 'admin', orgSlug: 'test-org' });
    console.log('initAppFor completed successfully');
    return true;
  } catch (error) {
    console.error('initAppFor error:', error);
    return false;
  }
}

async function runTests() {
  console.log('=== Starting State Initialization Tests ===');
  const loadStateTest = await testLoadState();
  console.log('loadState test:', loadStateTest ? 'PASS' : 'FAIL');
  const goTest = await testGoFunction();
  console.log('go function test: PASS');
  const initAppTest = await testInitAppFor();
  console.log('initAppFor test:', initAppTest ? 'PASS' : 'FAIL');
  console.log('=== Tests completed ===');
}

window.testStateInitialization = runTests;
