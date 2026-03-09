// src/modules/technician.js
// renderTechTable, onAddTech, onSaveSettings,
// loadTechnicianDashboard, work order management, offline mode

/* -------------------- INSTELLINGEN (Technicians) -------------------- */
function renderTechTable(){
  showViewLoader("settings");
  setTimeout(() => {
    const tbody=$("#techTable tbody"); if(!tbody) return;
    tbody.innerHTML="";
    state.technicians.forEach(tech=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td><input value="${tech.name}"/></td><td><input value="${tech.email}"/></td><td><input value="${tech.calendarId}"/></td><td><input value="${(tech.skills||[]).join(", ")}"/></td><td><input value="${tech.hub||""}"/></td><td><button class="btn small ghost">Verwijderen</button></td>`;
      tr.querySelector("button").onclick=()=>{ state.technicians=state.technicians.filter(t=>t.id!==tech.id); saveState(); renderTechTable(); toast("\ud83d\uddd1\ufe0f Monteur verwijderd"); };
      const ins=tr.querySelectorAll("input");
      ins[0].oninput=e=>{ tech.name=e.target.value; saveState(); };
      ins[1].oninput=e=>{ tech.email=e.target.value; saveState(); };
      ins[2].oninput=e=>{ tech.calendarId=e.target.value; saveState(); };
      ins[3].oninput=e=>{ tech.skills=e.target.value.split(",").map(s=>s.trim()).filter(Boolean); saveState(); };
      ins[4].oninput=e=>{ tech.hub=e.target.value; saveState(); };
      tbody.appendChild(tr);
    });
    hideViewLoader("settings");
  }, 100);
}

function onAddTech(){
  if (!requirePermission('edit_technicians')) return;
  state.technicians.push({ id:"t"+uuid(), name:"Nieuwe Monteur", email:"", calendarId:"", skills:["Algemeen","CV-onderhoud"], hub:"" });
  saveState(); renderTechTable(); toast("\ud83d\udc77 Monteur toegevoegd");
}

function onSaveSettings(){
  if (!requirePermission('edit_settings')) return;
  state.settings.relayWebhook = $("#relayWebhook").value;
  state.settings.relayWebhookSchedule = $("#relayWebhookSchedule").value;
  state.settings.gmapsKey = $("#gmapsKey").value;
  state.settings.openaiKey = $("#openaiKey").value;
  state.settings.afasUrl = $("#afasUrl").value;
  state.settings.afasToken = $("#afasToken").value;
  saveState(); $("#settingsStatus").textContent="Opgeslagen (lokaal)."; toast("\u2699\ufe0f Instellingen opgeslagen"); setTimeout(()=> $("#settingsStatus").textContent="", 1800);
}

/* -------------------- MONTEUR DASHBOARD -------------------- */
async function loadTechnicianDashboard() {
  console.log("Loading technician dashboard...");
  if (!hasPermission('view_technician_dashboard')) { toast("\u274c Geen toegang tot monteur dashboard"); await go('dashboard'); return; }
  loadTechnicianTasks();
  checkOfflineStatus();
}

function loadTechnicianTasks() {
  try {
    const currentTech = getCurrentTechnician();
    if (!currentTech) { console.warn("No technician found for current user"); return; }
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const allTasks = state.calendarEvents.filter(event => event.extendedProps?.tech === currentTech.name);
    const todayTasks = allTasks.filter(task => new Date(task.start).toISOString().split('T')[0] === todayStr);
    const upcomingTasks = allTasks.filter(task => new Date(task.start) > today && !task.completed).sort((a, b) => new Date(a.start) - new Date(b.start));
    const completedTasks = allTasks.filter(task => task.completed);
    renderTaskList('todayTasks', todayTasks, 'Vandaag geen taken');
    renderTaskList('upcomingTasks', upcomingTasks, 'Geen aankomende taken');
    renderTaskList('completedTasks', completedTasks, 'Geen voltooide taken');
    cacheTechnicianData({ todayTasks, upcomingTasks, completedTasks, lastSync: new Date().toISOString() });
  } catch (error) { console.error("Error loading technician tasks:", error); toast("\u274c Fout bij laden taken"); }
}

function getCurrentTechnician() {
  return state.technicians.find(tech => tech.name === getCurrentUserName());
}

function renderTaskList(containerId, tasks, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (tasks.length === 0) { container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`; return; }
  container.innerHTML = tasks.map(task => `
    <div class="task-card" onclick="openWorkOrder('${task.id}')">
      <div class="task-header">
        <h4>${task.title}</h4>
        <span class="task-time">${fmtDateTime(task.start)}</span>
      </div>
      <div class="task-details">
        <div class="task-client">\ud83d\udc64 ${task.extendedProps?.client || 'Onbekend'}</div>
        <div class="task-address">\ud83d\udccd ${task.extendedProps?.address || 'Onbekend'}</div>
        <div class="task-type">\ud83d\udd27 ${task.extendedProps?.type || 'Algemeen'}</div>
      </div>
      <div class="task-actions">
        <button class="btn small" onclick="event.stopPropagation(); openWorkOrder('${task.id}')">\ud83d\udccb Werkbon</button>
        <button class="btn small" onclick="event.stopPropagation(); navigateToTask('${task.extendedProps?.address || ''}')">\ud83e\udded Navigeer</button>
      </div>
    </div>
  `).join('');
}

function openWorkOrder(taskId) {
  const task = state.calendarEvents.find(event => event.id === taskId);
  if (!task) { toast("\u274c Taak niet gevonden"); return; }
  document.getElementById('workOrderTitle').textContent = task.title;
  document.getElementById('workOrderClient').textContent = task.extendedProps?.client || 'Onbekend';
  document.getElementById('workOrderAddress').textContent = task.extendedProps?.address || 'Onbekend';
  document.getElementById('workOrderDateTime').textContent = fmtDateTime(task.start);
  document.getElementById('workOrderType').textContent = task.extendedProps?.type || 'Algemeen';
  loadWorkOrderData(taskId);
  document.getElementById('workOrderModal').showModal();
  initSignatureCanvas();
}

function loadWorkOrderData(taskId) {
  if (!state.workOrders) state.workOrders = {};
  const workOrder = state.workOrders[taskId] || { checklist: [], materials: [], photos: [], notes: '', signature: null, status: 'draft' };
  renderChecklist(workOrder.checklist);
  renderMaterials(workOrder.materials);
  renderPhotos(workOrder.photos);
  document.getElementById('workOrderNotes').value = workOrder.notes || '';
  window.currentWorkOrderId = taskId;
}

function renderChecklist(checklist) {
  const container = document.getElementById('workOrderChecklist');
  container.innerHTML = checklist.map((item, index) => `
    <div class="checklist-item">
      <input type="checkbox" id="check_${index}" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem(${index})">
      <label for="check_${index}">${item.text}</label>
      <button class="btn small danger" onclick="removeChecklistItem(${index})">\ud83d\uddd1\ufe0f</button>
    </div>
  `).join('');
}

function renderMaterials(materials) {
  const container = document.getElementById('workOrderMaterials');
  container.innerHTML = materials.map((item, index) => `
    <div class="material-item">
      <input type="text" value="${item.name}" placeholder="Materiaal naam" onchange="updateMaterial(${index}, 'name', this.value)">
      <input type="number" value="${item.quantity}" placeholder="Aantal" onchange="updateMaterial(${index}, 'quantity', this.value)">
      <button class="btn small danger" onclick="removeMaterial(${index})">\ud83d\uddd1\ufe0f</button>
    </div>
  `).join('');
}

function renderPhotos(photos) {
  const container = document.getElementById('workOrderPhotos');
  container.innerHTML = photos.map((photo, index) => `
    <div class="photo-item">
      <img src="${photo.url}" alt="Foto ${index + 1}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
      <button class="btn small danger" onclick="removePhoto(${index})">\ud83d\uddd1\ufe0f</button>
    </div>
  `).join('');
}

function addChecklistItem() {
  const taskId = window.currentWorkOrderId;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  if (!state.workOrders[taskId].checklist) state.workOrders[taskId].checklist = [];
  const newItem = { text: prompt("Voeg checklist item toe:"), completed: false };
  if (newItem.text) { state.workOrders[taskId].checklist.push(newItem); renderChecklist(state.workOrders[taskId].checklist); saveState(); }
}

function addMaterialItem() {
  const taskId = window.currentWorkOrderId;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  if (!state.workOrders[taskId].materials) state.workOrders[taskId].materials = [];
  const newItem = { name: prompt("Materiaal naam:"), quantity: 1 };
  if (newItem.name) { state.workOrders[taskId].materials.push(newItem); renderMaterials(state.workOrders[taskId].materials); saveState(); }
}

function handlePhotoUpload(event) {
  const files = event.target.files;
  const taskId = window.currentWorkOrderId;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  if (!state.workOrders[taskId].photos) state.workOrders[taskId].photos = [];
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      state.workOrders[taskId].photos.push({ url: e.target.result, filename: file.name, timestamp: new Date().toISOString() });
      renderPhotos(state.workOrders[taskId].photos);
      saveState();
    };
    reader.readAsDataURL(file);
  });
}

function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  function startDrawing(e) { isDrawing = true; draw(e); }
  function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }
  function stopDrawing() { isDrawing = false; ctx.beginPath(); }
}

function clearSignature() {
  const canvas = document.getElementById('signatureCanvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function saveSignature() {
  const taskId = window.currentWorkOrderId;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  state.workOrders[taskId].signature = document.getElementById('signatureCanvas').toDataURL();
  saveState(); toast("\u270d\ufe0f Handtekening opgeslagen");
}

function saveWorkOrderAsDraft() {
  const taskId = window.currentWorkOrderId;
  if (!taskId) return;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  state.workOrders[taskId].notes = document.getElementById('workOrderNotes').value;
  state.workOrders[taskId].status = 'draft';
  state.workOrders[taskId].lastModified = new Date().toISOString();
  saveState(); toast("\ud83d\udcbe Werkbon opgeslagen als concept");
}

function completeWorkOrder() {
  const taskId = window.currentWorkOrderId;
  if (!taskId) return;
  if (!state.workOrders[taskId]) state.workOrders[taskId] = {};
  const workOrder = state.workOrders[taskId];
  if (!workOrder.signature) { toast("\u274c Handtekening vereist"); return; }
  const task = state.calendarEvents.find(event => event.id === taskId);
  if (task) { task.completed = true; task.completedAt = new Date().toISOString(); }
  workOrder.notes = document.getElementById('workOrderNotes').value;
  workOrder.status = 'completed';
  workOrder.completedAt = new Date().toISOString();
  saveState();
  document.getElementById('workOrderModal').close();
  loadTechnicianTasks();
  toast("\u2705 Werkbon afgerond");
}

function navigateToTask(address) {
  if (!address) { toast("\u274c Geen adres beschikbaar"); return; }
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
}

function cacheTechnicianData(data) {
  try { localStorage.setItem('planwise_tech_cache', JSON.stringify({ ...data, cachedAt: new Date().toISOString() })); }
  catch (error) { console.warn('Failed to cache technician data:', error); }
}

function checkOfflineStatus() {
  const isOnline = navigator.onLine;
  const offlineBanner = document.getElementById('offlineBanner');
  if (offlineBanner) offlineBanner.style.display = isOnline ? 'none' : 'block';
  if (!isOnline) {
    console.log('Offline mode: loading cached data');
    loadCachedTechnicianData();
  }
}

function loadCachedTechnicianData() {
  try {
    const cached = JSON.parse(localStorage.getItem('planwise_tech_cache') || 'null');
    if (!cached) { console.warn('No cached data available'); return; }
    console.log('Loading cached data from:', cached.cachedAt);
    if (cached.todayTasks) renderTaskList('todayTasks', cached.todayTasks, 'Vandaag geen taken (offline)');
    if (cached.upcomingTasks) renderTaskList('upcomingTasks', cached.upcomingTasks, 'Geen aankomende taken (offline)');
  } catch (error) { console.error('Failed to load cached data:', error); }
}
