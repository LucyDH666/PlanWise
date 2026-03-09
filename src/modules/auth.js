// src/modules/auth.js
// showLoginModal, handleLogin, handleRegister, logout, tenant switching

/* -------------------- AUTHENTICATION & TENANT MANAGEMENT -------------------- */

function showLoginModal() {
  try {
    populateAvailableOrganizations();
    clearLoginError();
    openModal('loginModal');
    setupSlugHelp();
  } catch (error) {
    console.error("Error showing login modal:", error);
    createFallbackLoginModal();
  }
}

function createFallbackLoginModal() {
  const existingFallback = document.getElementById('fallbackLoginModal');
  if (existingFallback) existingFallback.remove();
  
  const fallbackModal = document.createElement('div');
  fallbackModal.id = 'fallbackLoginModal';
  fallbackModal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); display: flex;
    justify-content: center; align-items: center; z-index: 10000;
  `;
  fallbackModal.innerHTML = `
    <div style="background: rgb(var(--bg-1)); border: 1px solid rgba(var(--border), 0.3); border-radius: 12px; padding: 32px; max-width: 400px; width: 90%; text-align: center;">
      <h2 style="margin: 0 0 16px 0; color: rgb(var(--txt-1));">PlanWise Login</h2>
      <p style="margin: 0 0 24px 0; color: rgb(var(--txt-2));">Er is een probleem met de login modal. Probeer de pagina te verversen.</p>
      <button onclick="location.reload()" style="background: rgb(var(--brand-1)); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">Pagina Verversen</button>
    </div>
  `;
  document.body.appendChild(fallbackModal);
}

function showRegisterModal() {
  const loginModal = $("#loginModal");
  const registerModal = $("#registerModal");
  if (loginModal) loginModal.close();
  if (registerModal) registerModal.showModal();
}

function handleLogin() {
  const company = $("#loginCompany").value.trim();
  const username = $("#loginUsername").value.trim();
  const password = $("#loginPassword").value.trim();
  
  if (!company || !username || !password) {
    showLoginError("Vul alle velden in.");
    return;
  }
  
  if (company === SUPER_ADMIN.company && username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
    if (Auth.becomeSuperAdmin()) {
      $("#loginModal").close();
      location.reload();
    } else {
      showLoginError("Fout bij inloggen als Super Admin");
    }
    return;
  }
  
  const tenantKey = findTenantByInput(company);
  if (!tenantKey) {
    showLoginError("Onbekende organisatie; gebruik de slug uit Super Admin of registreer eerst een account.");
    populateAvailableOrganizations();
    return;
  }
  
  const existingTenant = localStorage.getItem(`planwise_tenant_${tenantKey}`);
  if (!existingTenant) {
    showLoginError("Organisatie niet gevonden. Registreer eerst een account.");
    return;
  }
  
  const tenantData = JSON.parse(existingTenant);
  const user = tenantData.users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    showLoginError("Ongeldige gebruikersnaam of wachtwoord.");
    return;
  }
  
  const authData = { orgSlug: tenantKey, role: user.role || 'viewer', user: username };
  
  if (Auth.set(authData)) {
    clearLoginError();
    $("#loginModal").close();
    location.reload();
  } else {
    showLoginError("Fout bij inloggen");
  }
}

function findTenantByInput(input) {
  const tenants = getAllTenants();
  const exactSlugMatch = tenants.find(t => t.key.toLowerCase() === input.toLowerCase());
  if (exactSlugMatch) return exactSlugMatch.key;
  const companyMatch = tenants.find(t => t.info.company.toLowerCase() === input.toLowerCase());
  if (companyMatch) return companyMatch.key;
  return null;
}

function showLoginError(message) {
  const errorDiv = $("#loginError");
  if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = 'block'; }
}

function clearLoginError() {
  const errorDiv = $("#loginError");
  if (errorDiv) errorDiv.style.display = 'none';
}

function populateAvailableOrganizations() {
  const datalist = $("#availableOrganizations");
  if (!datalist) return;
  const tenants = getAllTenants();
  datalist.innerHTML = '';
  tenants.forEach(tenant => {
    const option = document.createElement('option');
    option.value = tenant.info.company;
    option.textContent = `${tenant.info.company} (${tenant.key})`;
    datalist.appendChild(option);
  });
  populateSlugHelpList();
}

function setupSlugHelp() {
  const helpBtn = $("#showSlugHelp");
  const helpDiv = $("#slugHelp");
  if (!helpBtn || !helpDiv) return;
  helpBtn.addEventListener("click", function(e) {
    e.preventDefault();
    const isVisible = helpDiv.style.display !== 'none';
    helpDiv.style.display = isVisible ? 'none' : 'block';
    helpBtn.textContent = isVisible ? '\u2753' : '\u274c';
    helpBtn.title = isVisible ? 'Toon beschikbare slugs' : 'Verberg lijst';
  });
  document.addEventListener("click", function(e) {
    if (!helpBtn.contains(e.target) && !helpDiv.contains(e.target)) {
      helpDiv.style.display = 'none';
      helpBtn.textContent = '\u2753';
      helpBtn.title = 'Toon beschikbare slugs';
    }
  });
}

function populateSlugHelpList() {
  const slugList = $("#slugList");
  if (!slugList) return;
  const tenants = getAllTenants();
  if (tenants.length === 0) { slugList.innerHTML = '<em>Nog geen organisaties geregistreerd</em>'; return; }
  slugList.innerHTML = tenants.map(tenant => `
    <div style="margin-bottom: 4px; padding: 4px; background: white; border-radius: 2px;">
      <strong>${tenant.info.company}</strong><br>
      <small style="color: #888;">Slug: <code>${tenant.key}</code></small>
    </div>
  `).join('');
}

function handleRegister() {
  const company = $("#regCompany").value.trim();
  const username = $("#regUsername").value.trim();
  const email = $("#regEmail").value.trim();
  const password = $("#regPassword").value.trim();
  const passwordConfirm = $("#regPasswordConfirm").value.trim();
  const industry = $("#regIndustry").value;
  const role = $("#regRole").value;
  
  if (!company || !username || !email || !password || !role) { alert("Vul alle verplichte velden in."); return; }
  if (password !== passwordConfirm) { alert("Wachtwoorden komen niet overeen."); return; }
  if (password.length < 6) { alert("Wachtwoord moet minimaal 6 karakters lang zijn."); return; }
  if (!ROLE_PERMISSIONS[role]) { alert("Ongeldige rol geselecteerd."); return; }
  
  const tenantKey = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const existingTenant = localStorage.getItem(`planwise_tenant_${tenantKey}`);
  if (existingTenant) { alert("Een bedrijf met deze naam bestaat al. Kies een andere naam of log in."); return; }
  
  const tenantData = {
    info: { company, industry, plan: "trial", created: new Date().toISOString() },
    users: [{ username, email, password, role, created: new Date().toISOString() }]
  };
  
  localStorage.setItem(`planwise_tenant_${tenantKey}`, JSON.stringify(tenantData));
  
  const authData = { orgSlug: tenantKey, role, user: username };
  if (Auth.set(authData)) { $("#registerModal").close(); location.reload(); }
  else { alert("Fout bij het aanmaken van account"); }
}

window.resetApp = function() {
  if (confirm("Weet je zeker dat je de app wilt resetten? Dit verwijdert alle lokale data en herstart de applicatie.")) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('planwise_')) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch(_){} });
    document.querySelectorAll('.modal-backdrop,.overlay,.fc-popover').forEach(b => b.remove());
    setTimeout(() => showLoginModal(), 100);
  }
};

function setupAccountDropdown() {
  const superAdminOption = document.getElementById('superAdminOption');
  if (superAdminOption && currentAuth?.role === 'superadmin') superAdminOption.style.display = 'block';
}

function toggleAccountDropdown() {
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function showSwitchTenantModal() {
  const modal = document.getElementById('switchTenantModal');
  const select = document.getElementById('switchTenantSelect');
  const info = document.getElementById('switchTenantInfo');
  const details = document.getElementById('switchTenantDetails');
  const superAdminOption = document.getElementById('superAdminSwitchOption');
  if (!modal || !select) return;
  const orgs = Auth.getKnownOrganizations();
  select.innerHTML = '<option value="">Kies een organisatie...</option>';
  orgs.forEach(org => {
    if (org.slug !== currentAuth?.orgSlug) {
      const option = document.createElement('option');
      option.value = org.slug;
      option.textContent = `${org.name} (${org.slug}) - ${org.plan}`;
      select.appendChild(option);
    }
  });
  select.onchange = function() {
    const selectedOrg = orgs.find(org => org.slug === this.value);
    if (selectedOrg) {
      details.innerHTML = `
        <div><strong>Naam:</strong> ${selectedOrg.name}</div>
        <div><strong>Login-slug:</strong> <code style="background: rgba(var(--bg-2), 0.5); padding: 2px 6px; border-radius: 4px; font-size: 0.85em;">${selectedOrg.slug}</code></div>
        <div><strong>Plan:</strong> ${selectedOrg.plan}</div>
        <div><strong>Aangemaakt:</strong> ${new Date(selectedOrg.created).toLocaleDateString('nl-NL')}</div>
      `;
      info.style.display = 'block';
    } else { info.style.display = 'none'; }
  };
  if (superAdminOption) superAdminOption.style.display = currentAuth?.role === 'superadmin' ? 'block' : 'none';
  const closeButtons = modal.querySelectorAll('button[value="cancel"], .icon-btn[value="cancel"]');
  closeButtons.forEach(btn => { btn.onclick = function(e) { e.preventDefault(); modal.close(); }; });
  document.getElementById('accountDropdown').style.display = 'none';
  openModal('switchTenantModal');
}

function switchToSuperAdminFromModal() {
  if (Auth.becomeSuperAdmin()) { document.getElementById('switchTenantModal').close(); location.reload(); }
  else { alert('Fout bij het wisselen naar Super Admin modus'); }
}

function performTenantSwitch() {
  const select = document.getElementById('switchTenantSelect');
  const selectedSlug = select.value;
  if (!selectedSlug) { window.toast ? window.toast('\u26a0\ufe0f Selecteer een organisatie om naar te wisselen') : alert('Selecteer een organisatie'); return; }
  const switchBtn = document.querySelector('#switchTenantModal button[onclick="performTenantSwitch()"]');
  if (switchBtn) {
    const originalText = switchBtn.textContent;
    switchBtn.textContent = 'Wisselen...';
    switchBtn.disabled = true;
    setTimeout(() => {
      if (Auth.switchOrg(selectedSlug)) { location.reload(); }
      else {
        if (window.showErrorToast) window.showErrorToast('Fout bij het wisselen van organisatie');
        else if (window.toast) window.toast('\u274c Fout bij het wisselen van organisatie');
        else alert('Fout bij het wisselen van organisatie');
        switchBtn.textContent = originalText;
        switchBtn.disabled = false;
      }
    }, 100);
  } else {
    if (Auth.switchOrg(selectedSlug)) { location.reload(); }
    else {
      if (window.showErrorToast) window.showErrorToast('Fout bij het wisselen van organisatie');
      else if (window.toast) window.toast('\u274c Fout bij het wisselen van organisatie');
      else alert('Fout bij het wisselen van organisatie');
    }
  }
}

function switchToSuperAdmin() {
  if (currentAuth?.role !== 'superadmin') { alert('Alleen super admins kunnen naar platform modus gaan'); return; }
  if (currentAuth.orgSlug !== 'PLANWISE_PLATFORM') {
    if (confirm('Naar platformmodus gaan?')) {
      if (Auth.becomeSuperAdmin()) { location.reload(); }
      else { alert('Fout bij het wisselen naar Super Admin modus'); }
    }
  } else { alert('Je bent al in Super Admin modus'); }
}

function logout() {
  if (confirm("Weet je zeker dat je wilt uitloggen?")) {
    Auth.logout();
    currentAuth = null;
    state = {};
    location.reload();
  }
}
