// src/modules/router.js
// go() router and injectMaintenanceNav

/* -------------------- ROUTER -------------------- */
async function go(route){
  // Check if user has permission for this route
  if (!currentAuth) {
    showLoginModal();
    return;
  }
  
  // Check if state is loaded, if not wait for initialization
  if (!state) {
    console.log('State not loaded yet, waiting for initialization...');
    if (window.PlanWiseData) {
      window.PlanWiseData.showLoader('Laden...');
    }
    // Wait a bit for state to be initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!state) {
      console.error('State still not loaded after waiting');
      if (window.showErrorToast) {
        window.showErrorToast('Fout bij laden van gegevens. Ververs de pagina.');
      }
      return;
    }
    if (window.PlanWiseData) {
      window.PlanWiseData.hideLoader();
    }
  }
  
  // Special handling for Super Admin routes
  if (route === 'superadmin' || route === 'platform-analytics' || route === 'platform-billing') {
    if (currentAuth.role !== 'superadmin') {
      alert('Alleen Super Admins hebben toegang tot deze functie');
      return;
    }
    
    // If trying to access Super Admin from a tenant context, switch to platform mode
    if (currentAuth.orgSlug !== 'PLANWISE_PLATFORM') {
      if (confirm('Naar platformmodus gaan om Super Admin functies te gebruiken?')) {
        if (Auth.becomeSuperAdmin()) {
          location.reload();
        }
      }
      return;
    }
  }
  
  currentRoute = route;
  document.querySelectorAll(".route").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));

  const sec = document.getElementById(`route-${route}`);
  const tab = document.querySelector(`.nav-btn[data-route="${route}"]`);
  if(sec) sec.classList.add("active");
  if(tab) tab.classList.add("active");

  if(route==="planner") renderBoard();
  if(route==="settings") renderTechTable();
  if(route==="dashboard") ensureDashboard();    // init/refresh once visible
  if(route==="installations") ensureInstallations();
  if(route==="superadmin") loadPlatformData();
  if(route==="platform-analytics") loadAnalyticsData();
  if(route==="platform-billing") loadBillingData();
  if(route==="technician") await loadTechnicianDashboard();
}

function injectMaintenanceNav(){
  // Maintenance functionality is now integrated into Installations section
  // No longer injecting separate maintenance navigation
  console.log("Maintenance functionality integrated into Installations section");
}
