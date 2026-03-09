// src/modules/maintenance.js
// ensureMaintenanceUI, generateMaintenanceProposals, renderMaintenanceTable,
// planOneMaintenance, planAllMaintenance, calcMaintenanceProposal, pickTechForCategory,
// showMaintenanceModal, generateMaintenanceProposalsInModal, planSingleMaintenance

/* -------------------- ONDERHOUD -------------------- */
function ensureMaintenanceUI(){
  const btnGenMaint = $("#btnGenMaint");
  const btnPlanAll = $("#btnPlanAll");
  if(btnGenMaint && !btnGenMaint._hasListener) { btnGenMaint.addEventListener("click", generateMaintenanceProposals); btnGenMaint._hasListener = true; }
  if(btnPlanAll && !btnPlanAll._hasListener) { btnPlanAll.addEventListener("click", planAllMaintenance); btnPlanAll._hasListener = true; }
  renderMaintenanceTable();
}

function generateMaintenanceProposals(){
  console.log("Genereren onderhoudsvoorstellen...");
  const now = new Date();
  if(!state.assets || state.assets.length === 0) { toast("\u274c Geen assets gevonden voor onderhoudsplanning"); return; }
  state.maintenancePlans = state.assets.map(a => {
    const plan = calcMaintenanceProposal(a, now);
    const tech = pickTechForCategory(a.category);
    return { id: "mp_" + uuid(), assetId: a.id, client: a.client, address: a.address, system: a.system, lastService: a.lastService, nextStart: plan.start.toISOString(), nextEnd: plan.end.toISOString(), category: a.category, tech: tech?.name || "Onbekend" };
  });
  saveState(); renderMaintenanceTable();
  toast(`\ud83d\udee0\ufe0f ${state.maintenancePlans.length} onderhoudsvoorstellen gegenereerd`);
}

function renderMaintenanceTable(){
  const tb = $("#maintTable tbody");
  if(!tb) { console.warn("Maintenance table body niet gevonden"); return; }
  tb.innerHTML = "";
  if(!state.maintenancePlans || state.maintenancePlans.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" style="text-align:center;color:var(--txt-2);padding:20px;">Geen onderhoudsvoorstellen. Klik op "Voorstellen genereren" om te beginnen.</td>`;
    tb.appendChild(tr); return;
  }
  state.maintenancePlans.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.client}</td><td>${p.address}</td><td>${p.system}</td>
      <td>${fmtDate(p.lastService)}</td>
      <td>${fmtDate(p.nextStart)} ${new Date(p.nextStart).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}</td>
      <td>${p.tech}</td>
      <td><button class="btn small" data-id="${p.id}">Plan</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => planOneMaintenance(p.id));
    tb.appendChild(tr);
  });
  console.log(`${state.maintenancePlans.length} onderhoudsvoorstellen gerenderd`);
}

function planOneMaintenance(id){
  const p = (state.maintenancePlans || []).find(x => x.id === id);
  if(!p) { console.warn("Onderhoudsvoorstel niet gevonden:", id); return; }
  if(!state.calendarEvents) state.calendarEvents = [];
  const event = { id: "ev_" + uuid(), title: `${p.client} \u2014 Onderhoud (${p.system})`, client: p.client, address: p.address, tech: p.tech, type: "Maintenance", start: p.nextStart, end: p.nextEnd, notes: `Jaarlijks onderhoud ${p.system}` };
  state.calendarEvents.push(event);
  state.maintenancePlans = state.maintenancePlans.filter(x => x.id !== id);
  saveState(); renderMaintenanceTable();
  if(currentRoute === "dashboard") { if(calendar) updateDashboard(); else showCalendarFallback(); }
  toast(`\ud83d\udcc5 Gepland: ${p.client} (${p.system})`);
}

function planAllMaintenance(){ (state.maintenancePlans||[]).slice().forEach(p=> planOneMaintenance(p.id)); }

function calcMaintenanceProposal(asset, now){
  const last = new Date(asset.lastService);
  const oneYear = new Date(last); oneYear.setFullYear(oneYear.getFullYear() + 1);
  const overdue = now > oneYear;
  const slot = (d, h = 9, m = 120) => { const s = new Date(d); s.setHours(h, 0, 0, 0); return {start: s, end: new Date(s.getTime() + m * 60000)}; };
  const cat = (asset.category || "").toLowerCase();
  const sys = (asset.system || "").toLowerCase();
  if(sys.includes("vickers") || cat.includes("koeling")){
    let target = new Date(now.getFullYear(), 9, 7);
    if(now > target) target = new Date(now.getFullYear() + 1, 9, 7);
    return overdue ? slot(new Date(now.getTime() + 3 * 86400000), 9, 120) : slot(target, 9, 120);
  }
  if(cat.includes("airco")){
    let target = new Date(now.getFullYear(), 4, 10);
    if(now > target) target = new Date(now.getFullYear() + 1, 4, 10);
    return overdue ? slot(new Date(now.getTime() + 7 * 86400000), 9, 120) : slot(target, 9, 120);
  }
  return overdue ? slot(new Date(now.getTime() + 14 * 86400000), 9, 90) : slot(oneYear, 9, 90);
}

function pickTechForCategory(category){
  const c=(category||"").toLowerCase();
  const cand = state.technicians.filter(t =>
    (t.skills||[]).some(s=>s.toLowerCase().includes("onderhoud")) ||
    (c.includes("airco") && (t.skills||[]).some(s=> s.toLowerCase().includes("airco"))) ||
    (c.includes("cv") && (t.skills||[]).some(s=> s.toLowerCase().includes("cv")))
  );
  return cand[0] || state.technicians[0];
}

/* -------------------- MAINTENANCE PLANNING MODAL -------------------- */
function showMaintenanceModal() {
  if (!requirePermission('plan_maintenance')) return;
  const modal = $("#maintenanceModal");
  if (modal) { generateMaintenanceProposalsInModal(); modal.showModal(); }
}

function generateMaintenanceProposalsInModal() {
  const container = $("#maintenanceProposals");
  if (!container) return;
  const proposals = generateMaintenanceProposalsData();
  if (proposals.length === 0) { container.innerHTML = '<p class="muted">Geen onderhoudsvoorstellen gevonden. Voeg eerst installaties toe met contracten.</p>'; return; }
  container.innerHTML = proposals.map(proposal => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; margin: 8px 0; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
      <div>
        <strong>${proposal.client}</strong><br>
        <small style="color: rgb(var(--txt-3));">${proposal.address}</small><br>
        <span style="color: rgb(var(--brand-1));">${proposal.system}</span><br>
        <small>Voorstel: ${proposal.proposedDate}</small>
      </div>
      <div style="text-align: right;">
        <small style="color: rgb(var(--txt-3));">Laatste: ${proposal.lastService || 'Onbekend'}</small><br>
        <button class="btn small primary" onclick="planSingleMaintenance('${proposal.id}')" title="Plan dit onderhoud">Plan In</button>
      </div>
    </div>
  `).join('');
}

function generateMaintenanceProposalsData() {
  const proposals = [];
  if (!state.installations) return proposals;
  state.installations.forEach(installation => {
    if (installation.contractType) {
      const nextDate = calculateNextMaintenanceDate(installation);
      if (nextDate) {
        const existingEvent = state.calendarEvents.find(event =>
          event.extendedProps?.installationId === installation.id ||
          (event.extendedProps?.client === installation.client && event.extendedProps?.address === installation.address && event.title.toLowerCase().includes('onderhoud'))
        );
        if (!existingEvent) {
          proposals.push({ id: installation.id, client: installation.client, address: installation.address, system: `${installation.type}${installation.model ? ' ' + installation.model : ''}`, lastService: installation.lastMaintenance, proposedDate: nextDate.toLocaleDateString('nl-NL'), installation });
        }
      }
    }
  });
  return proposals;
}

function planSingleMaintenance(installationId) {
  const installation = state.installations.find(inst => inst.id === installationId);
  if (!installation) return;
  const maintenanceDate = calculateNextMaintenanceDate(installation);
  if (!maintenanceDate) return;
  const maintenanceEvent = {
    id: uuid(),
    title: `\ud83d\udd27 Onderhoud ${installation.type} \u2014 ${installation.client}`,
    start: maintenanceDate.toISOString(),
    end: new Date(maintenanceDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    extendedProps: { client: installation.client, address: installation.address, technician: getPreferredTechnician(installation.type), notes: `Contract onderhoud: ${installation.contractType}${installation.model ? '\nModel: ' + installation.model : ''}`, priority: 'normal', contractBased: true, installationId: installation.id }
  };
  state.calendarEvents.push(maintenanceEvent); saveState(); updateDashboard();
  generateMaintenanceProposalsInModal();
  alert(`Onderhoud ingepland voor ${installation.client} op ${maintenanceDate.toLocaleDateString('nl-NL')}`);
}
