// Test file to verify service loading fixes
console.log('Testing service loading fixes...');

function testServiceLoading() {
  console.log('=== Testing Service Loading ===');
  
  const services = {
    auth: typeof Auth !== 'undefined',
    data: typeof window.PlanWiseData !== 'undefined',
    api: typeof window.PlanWiseAPI !== 'undefined',
    scheduler: typeof window.PlanWiseScheduler !== 'undefined'
  };
  
  console.log('Service availability (uppercase names):', services);
  
  const backwardsCompatibility = {
    api: typeof window.planwiseAPI !== 'undefined',
    scheduler: typeof window.planwiseScheduler !== 'undefined'
  };
  
  console.log('Backwards compatibility (lowercase names):', backwardsCompatibility);
  
  const checkServicesResult = window.checkServices();
  console.log('checkServices() result:', checkServicesResult);
  
  if (window.PlanWiseAPI) {
    console.log('✅ PlanWiseAPI is available');
  } else {
    console.log('❌ PlanWiseAPI is not available');
  }
  
  if (window.PlanWiseScheduler) {
    console.log('✅ PlanWiseScheduler is available');
  } else {
    console.log('❌ PlanWiseScheduler is not available');
  }
  
  return { services, backwardsCompatibility, checkServicesResult, allServicesAvailable: checkServicesResult };
}

async function testServiceInitialization() {
  console.log('=== Testing Service Initialization ===');
  try {
    const result = await window.initializeServices();
    console.log('initializeServices() result:', result);
    return result;
  } catch (error) {
    console.error('Service initialization error:', error);
    return false;
  }
}

function testAPIFunctionality() {
  console.log('=== Testing API Functionality ===');
  if (!window.PlanWiseAPI) { console.log('❌ PlanWiseAPI not available for testing'); return false; }
  try {
    const kpis = window.PlanWiseAPI.getKPIs();
    console.log('API KPIs test:', kpis);
    const state = window.PlanWiseAPI.getState();
    console.log('API getState test:', state);
    console.log('✅ API functionality test passed');
    return true;
  } catch (error) {
    console.error('❌ API functionality test failed:', error);
    return false;
  }
}

function testSchedulerFunctionality() {
  console.log('=== Testing Scheduler Functionality ===');
  if (!window.PlanWiseScheduler) { console.log('❌ PlanWiseScheduler not available for testing'); return false; }
  try {
    const testJobs = [{ id: 'test_job', customer_name: 'Test Customer', category: 'CV-onderhoud', duration_min: 60, address: 'Amsterdam 1011AA', required_skills: ['CV-onderhoud'] }];
    const testTechs = [{ id: 'test_tech', name: 'Test Technician', skills: ['CV-onderhoud'], hub: 'Amsterdam 1012AA' }];
    const result = window.PlanWiseScheduler.optimizeSchedule(testJobs, testTechs);
    console.log('Scheduler optimization test:', result);
    console.log('✅ Scheduler functionality test passed');
    return true;
  } catch (error) {
    console.error('❌ Scheduler functionality test failed:', error);
    return false;
  }
}

async function runServiceTests() {
  console.log('=== Starting Service Loading Tests ===');
  const serviceLoadingTest = testServiceLoading();
  console.log('Service loading test:', serviceLoadingTest.allServicesAvailable ? 'PASS' : 'FAIL');
  const initializationTest = await testServiceInitialization();
  console.log('Service initialization test:', initializationTest ? 'PASS' : 'FAIL');
  const apiTest = testAPIFunctionality();
  console.log('API functionality test:', apiTest ? 'PASS' : 'FAIL');
  const schedulerTest = testSchedulerFunctionality();
  console.log('Scheduler functionality test:', schedulerTest ? 'PASS' : 'FAIL');
  const allTestsPassed = serviceLoadingTest.allServicesAvailable && initializationTest && apiTest && schedulerTest;
  console.log('=== All tests completed ===');
  console.log('Overall result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  return { serviceLoading: serviceLoadingTest, initialization: initializationTest, apiFunctionality: apiTest, schedulerFunctionality: schedulerTest, allPassed: allTestsPassed };
}

window.testServiceLoading = runServiceTests;
