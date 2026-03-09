// src/modules/dashboard.js
// Helpers ($, uuid, fmtDateTime, fmtDate, createEl, toast, debounce)
// Skeletons, ViewLoaders, ensureDashboard, initCalendar, setupDashboardListeners,
// showCalendarFallback, showWeekFallback, buildCalendarEvents, updateDashboard,
// showEventModal, saveEventChanges, deleteEvent, KPI rendering, event drag/drop/resize
// Source: app.js lines 1124-1147, 1755-3017

/* -------------------- HELPERS -------------------- */
const $ = s => document.querySelector(s);
function uuid(){ 
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }); 
}
function fmtDateTime(dt){ const d=new Date(dt); return d.toLocaleString("nl-NL",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }
function fmtDate(d){ return new Date(d).toLocaleDateString("nl-NL",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function createEl(tag, cls, text){ const el=document.createElement(tag); if(cls) el.className=cls; if(text!=null) el.textContent=text; return el; }
function toast(msg){ 
  const t=document.getElementById("toast"); 
  if(!t) { console.warn("Toast element not found"); return; } 
  t.innerHTML=`<div class="toast">${msg}</div>`; 
  t.style.display="block"; 
  clearTimeout(t._h); 
  t._h=setTimeout(()=>t.style.display="none",2200); 
}
function debounce(fn,ms){ let h; return (...a)=>{ clearTimeout(h); h=setTimeout(()=>fn(...a),ms); }; }

/* -------------------- SKELETONS -------------------- */
function showSkeletons(colId,n=2){ const c=document.getElementById(colId); if(!c) return; for(let i=0;i<n;i++){ const d=document.createElement("div"); d.className="card skel"; c.appendChild(d);} }
function clearSkeletons(colId){ const c=document.getElementById(colId); if(!c) return; c.querySelectorAll(".skel").forEach(e=>e.remove()); }

/* -------------------- VIEW LOADERS -------------------- */
function showViewLoader(viewName) {
  const container = document.getElementById(`route-${viewName}`);
  if (!container) return;
  const existingLoader = container.querySelector('.view-loader');
  if (existingLoader) existingLoader.remove();
  const loader = document.createElement('div');
  loader.className = 'view-loader';
  loader.innerHTML = `<div class="loader-spinner"></div><div class="loader-text">Laden...</div>`;
  loader.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 1000; background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);`;
  if (!document.querySelector('#view-loader-styles')) {
    const style = document.createElement('style');
    style.id = 'view-loader-styles';
    style.textContent = `.loader-spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .loader-text { color: #666; font-size: 14px; } .route { position: relative; }`;
    document.head.appendChild(style);
  }
  container.appendChild(loader);
}

function hideViewLoader(viewName) {
  const container = document.getElementById(`route-${viewName}`);
  if (!container) return;
  const loader = container.querySelector('.view-loader');
  if (loader) { loader.style.opacity = '0'; loader.style.transition = 'opacity 0.3s ease-out'; setTimeout(() => loader.remove(), 300); }
}

/* -------------------- DASHBOARD (FullCalendar) -------------------- */
let fallbackCalendarDate = new Date();

function ensureDashboard(){
  console.log("ensureDashboard called");
  showViewLoader("dashboard");
  setTimeout(() => {
    try {
      const techSel=$("#dashTech");
      if(techSel){ techSel.innerHTML=`<option value="">Alle monteurs</option>` + state.technicians.map(t=>`<option value="${t.name}">${t.name}</option>`).join(""); }
      initCalendar();
      setupDashboardListeners();
      runDashboardHealthCheck();
    } catch (error) {
      console.error("Critical error in ensureDashboard:", error);
      showCalendarFallback();
    } finally {
      hideViewLoader("dashboard");
    }
  }, 100);
}

window.initDashboardAfterLoad = function() { if(currentRoute === "dashboard") initCalendar(); };

function runDashboardHealthCheck() {
  try {
    if(!state.calendarEvents) { state.calendarEvents = []; }
    if(!state.tickets) { state.tickets = []; }
    const invalidEvents = state.calendarEvents.filter(ev => !validateCalendarEvent(ev));
    if(invalidEvents.length > 0) { state.calendarEvents = state.calendarEvents.filter(ev => validateCalendarEvent(ev)); saveState(); }
    if(calendar && typeof calendar.getEvents === 'function') console.log(`Calendar has ${calendar.getEvents().length} events loaded`);
  } catch (error) { console.error("Error in dashboard health check:", error); }
}

function validateCalendarEvent(ev) {
  return ev && ev.id && ev.title && ev.start;
}

function initCalendar() {
  try {
    const el = document.getElementById("calendar");
    if(!el) { console.warn("Calendar element not found"); return; }
    if(typeof FullCalendar === 'undefined') { console.log("FullCalendar not available, showing fallback calendar"); showCalendarFallback(); return; }
    if(calendar) { try { calendar.destroy(); } catch(error) { console.warn("Error destroying existing calendar:", error); } calendar = null; }
    el.innerHTML = '';
    try {
      calendar = new FullCalendar.Calendar(el, {
        initialView: $("#dashView")?.value || "dayGridMonth",
        locale: 'nl', timeZone: 'Europe/Amsterdam', height: "auto",
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        events: buildCalendarEvents(),
        eventClassNames: (arg) => [arg.event.extendedProps.type || "Installation"],
        eventClick: (info) => { try { showEventModal(info.event); } catch(error) { toast("\u274c Fout bij openen afspraak"); } },
        editable: true,
        eventDrop: (info) => {
          try {
            if (!validateEventDrop(info.event)) { info.revert(); toast("\u274c Ongeldige verplaatsing"); return; }
            const success = updateEventTime(info.event, info.event.start, info.event.end);
            if (!success) { info.revert(); toast("\u274c Fout bij opslaan verplaatsing"); return; }
            updateRelatedTicket(info.event);
            logEventChange('drop', info.event, { oldStart: info.oldEvent.start, newStart: info.event.start, oldEnd: info.oldEvent.end, newEnd: info.event.end });
            toast("\ud83d\udcc5 Afspraak verplaatst naar " + info.event.start.toLocaleDateString('nl-NL'));
            setTimeout(() => { if(calendar) calendar.refetchEvents(); }, 100);
          } catch(error) { info.revert(); toast("\u274c Fout bij verplaatsen afspraak"); }
        },
        eventResize: (info) => {
          try {
            if (!validateEventResize(info.event)) { info.revert(); toast("\u274c Ongeldige aanpassing"); return; }
            const success = updateEventTime(info.event, info.event.start, info.event.end);
            if (!success) { info.revert(); toast("\u274c Fout bij opslaan aanpassing"); return; }
            updateRelatedTicket(info.event);
            logEventChange('resize', info.event, { oldStart: info.oldEvent.start, newStart: info.event.start, oldEnd: info.oldEvent.end, newEnd: info.event.end });
            const duration = Math.round((info.event.end - info.event.start) / (1000 * 60));
            toast(`\ud83d\udcc5 Afspraak aangepast (${duration} minuten)`);
            setTimeout(() => { if(calendar) calendar.refetchEvents(); }, 100);
          } catch(error) { info.revert(); toast("\u274c Fout bij aanpassen afspraak"); }
        },
        loading: (isLoading) => { el.style.opacity = isLoading ? '0.7' : '1'; },
        eventSourceFailure: (error) => { console.error("Event source failure:", error); toast("\u26a0\ufe0f Fout bij laden afspraken"); }
      });
      calendar.render();
      setTimeout(() => { if(calendar) { try { calendar.updateSize(); } catch(error) { console.warn("Error updating calendar size:", error); } } }, 100);
    } catch(error) { console.error("Error initializing FullCalendar:", error); showCalendarFallback(); }
  } catch(error) { console.error("Critical error in initCalendar:", error); showCalendarFallback(); }
}

function setupDashboardListeners() {
  const dashView = $("#dashView"), dashTech = $("#dashTech"), dashSearch = $("#dashSearch");
  if(dashView && !dashView._hasListener) {
    dashView.addEventListener("change", () => {
      try {
        if(calendar && calendar.changeView) { calendar.changeView(dashView.value); calendar.updateSize(); }
        else { dashView.value === "timeGridWeek" ? showWeekFallback() : showCalendarFallback(); }
      } catch(error) { console.error("Error changing view:", error); showCalendarFallback(); }
    });
    dashView._hasListener = true;
  }
  if(dashTech && !dashTech._hasListener) {
    dashTech.addEventListener("change", () => {
      try { if(calendar && calendar.refetchEvents) calendar.refetchEvents(); else showCalendarFallback(); }
      catch(error) { console.error("Error updating technician filter:", error); }
    });
    dashTech._hasListener = true;
  }
  if(dashSearch && !dashSearch._hasListener) {
    dashSearch.addEventListener("input", debounce(() => {
      try { if(calendar && calendar.refetchEvents) calendar.refetchEvents(); else showCalendarFallback(); }
      catch(error) { console.error("Error updating search filter:", error); }
    }, 300));
    dashSearch._hasListener = true;
  }
  document.addEventListener('keydown', (e) => {
    if (currentRoute !== 'dashboard') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); if (dashSearch) { dashSearch.focus(); dashSearch.select(); } }
    if (e.key === 'Escape') { if (dashSearch && dashSearch.value) { dashSearch.value = ''; dashSearch.dispatchEvent(new Event('input')); } }
  });
}

function showCalendarFallback() {
  const el = document.getElementById("calendar");
  if(!el) return;
  try {
    const events = buildCalendarEvents();
    const year = fallbackCalendarDate.getFullYear(), month = fallbackCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const eventsByDate = {};
    events.forEach(ev => { try { const date = new Date(ev.start).toDateString(); if(!eventsByDate[date]) eventsByDate[date] = []; eventsByDate[date].push(ev); } catch(error) {} });
    let html = `<div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"><h3 style="margin: 0; color: rgb(var(--txt-1));">\ud83d\udcc5 ${firstDay.toLocaleDateString('nl-NL', {month: 'long', year: 'numeric'})}</h3><div style="display: flex; gap: 8px;"><button onclick="changeCalendarMonth(-1)" style="padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: rgb(var(--txt-1)); cursor: pointer;">\u2039</button><button onclick="changeCalendarMonth(1)" style="padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: rgb(var(--txt-1)); cursor: pointer;">\u203a</button></div></div><div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;"><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Zo</div><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Ma</div><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Di</div><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Wo</div><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Do</div><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Vr</div><div style="padding: 8px; background: rgba(255,255,255,0.05); text-align: center; font-weight: 500; color: rgb(var(--txt-2)); font-size: 0.9em;">Za</div>`;
    const current = new Date(startDate), currentDate = new Date();
    for(let week = 0; week < 6; week++) {
      for(let day = 0; day < 7; day++) {
        const dateStr = current.toDateString(), dayEvents = eventsByDate[dateStr] || [];
        const isCurrentMonth = current.getMonth() === month, isToday = current.toDateString() === currentDate.toDateString();
        html += `<div style="min-height: 80px; padding: 4px; background: ${isCurrentMonth ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)'}; ${isToday ? 'border: 2px solid rgb(var(--brand-1));' : ''} display: flex; flex-direction: column;"><div style="font-size: 0.9em; color: ${isCurrentMonth ? 'rgb(var(--txt-1))' : 'rgb(var(--txt-3))'}; margin-bottom: 2px;">${current.getDate()}</div>${dayEvents.slice(0, 2).map(ev => `<div style="font-size: 0.75em; padding: 2px 4px; margin: 1px 0; background: linear-gradient(135deg, rgba(var(--brand-1), 0.3), rgba(var(--brand-2), 0.3)); border-radius: 3px; cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;" onclick="showEventModal({id: '${ev.id}', title: '${(ev.title||'').replace(/'/g, "'")}', extendedProps: {client: '${(ev.extendedProps?.client||'').replace(/'/g,"'")}', address: '${(ev.extendedProps?.address||'').replace(/'/g,"'")}', tech: '${(ev.extendedProps?.tech||'').replace(/'/g,"'")}', notes: ''}, start: '${ev.start}', end: '${ev.end}'}">${(ev.title||'').split(' \u2014 ')[0]}</div>`).join('')}${dayEvents.length > 2 ? `<div style="font-size: 0.7em; color: rgb(var(--txt-3));">+${dayEvents.length - 2} meer</div>` : ''}</div>`;
        current.setDate(current.getDate() + 1);
      }
    }
    html += `</div><p style="color: rgb(var(--txt-2)); font-size: 0.85em; margin: 16px 0 0 0; text-align: center;">\ud83d\udcc5 Kalender weergave (fallback) \u2022 Klik op afspraken voor details</p></div>`;
    el.innerHTML = html;
  } catch(error) { console.error("Error in showCalendarFallback:", error); el.innerHTML = `<div style="padding: 20px; text-align: center; color: rgb(var(--txt-2));">\u274c Fout bij laden kalender<br><button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px;">Herlaad pagina</button></div>`; }
}

function changeCalendarMonth(delta) { fallbackCalendarDate.setMonth(fallbackCalendarDate.getMonth() + delta); showCalendarFallback(); }
function changeCalendarWeek(delta) { fallbackCalendarDate.setDate(fallbackCalendarDate.getDate() + delta * 7); showWeekFallback(); }
function getWeekNumber(d) { const date = new Date(d); date.setHours(0,0,0,0); date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7); const week1 = new Date(date.getFullYear(), 0, 4); return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7); }

function showWeekFallback() {
  const el = document.getElementById("calendar");
  if(!el) return;
  const events = buildCalendarEvents();
  const currentDate = new Date(fallbackCalendarDate);
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = currentDate.getDay();
  startOfWeek.setDate(currentDate.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
  const weekDays = [];
  for(let i = 0; i < 7; i++) { const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate() + i); weekDays.push(day); }
  const eventsByDate = {};
  events.forEach(ev => { const date = new Date(ev.start).toDateString(); if(!eventsByDate[date]) eventsByDate[date] = []; eventsByDate[date].push(ev); });
  let html = `<div style="padding: 16px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"><h3>\ud83d\udcc5 Week ${getWeekNumber(currentDate)} - ${currentDate.getFullYear()}</h3><div><button onclick="changeCalendarWeek(-1)">\u2039</button><button onclick="changeCalendarWeek(1)">\u203a</button></div></div><div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px;">${weekDays.map(day => { const dayEvents = eventsByDate[day.toDateString()] || []; const isToday = day.toDateString() === new Date().toDateString(); return `<div style="min-height: 120px; padding: 8px; ${isToday ? 'border: 2px solid rgb(var(--brand-1));' : ''}"><div style="font-weight: 600; text-align: center;">${day.toLocaleDateString('nl-NL', {weekday: 'short'})}<br><span style="font-size: 1.2em;">${day.getDate()}</span></div>${dayEvents.map(ev => `<div style="font-size: 0.8em; padding: 4px 6px; margin: 2px 0; background: rgba(var(--brand-1), 0.2); border-radius: 4px; cursor: pointer;">${new Date(ev.start).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})} ${(ev.extendedProps?.client || ev.title||'').substring(0,20)}</div>`).join('')}</div>`; }).join('')}</div></div>`;
  el.innerHTML = html;
}

function buildCalendarEvents() {
  if (!state.calendarEvents) return [];
  const techFilter = $("#dashTech")?.value || "";
  const searchFilter = ($("#dashSearch")?.value || "").toLowerCase();
  return state.calendarEvents
    .filter(ev => {
      if (techFilter && ev.tech !== techFilter && ev.extendedProps?.tech !== techFilter) return false;
      if (searchFilter) {
        const searchable = [ev.title, ev.client, ev.address, ev.extendedProps?.client, ev.extendedProps?.address].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(searchFilter)) return false;
      }
      return true;
    })
    .map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      extendedProps: {
        client: ev.client || ev.extendedProps?.client || '',
        address: ev.address || ev.extendedProps?.address || '',
        tech: ev.tech || ev.extendedProps?.tech || '',
        notes: ev.notes || ev.extendedProps?.notes || '',
        type: ev.type || ev.extendedProps?.type || 'Installation',
        technician: ev.tech || ev.extendedProps?.tech || ''
      }
    }));
}

function updateDashboard() {
  if(calendar && typeof calendar.refetchEvents === 'function') {
    try {
      calendar.removeAllEvents();
      buildCalendarEvents().forEach(ev => calendar.addEvent(ev));
      console.log("Dashboard updated with", state.calendarEvents.length, "events");
    } catch(error) { console.error("Error updating dashboard:", error); showCalendarFallback(); }
  } else {
    showCalendarFallback();
  }
  renderKPIs();
}

function renderKPIs() {
  const kpiContainer = document.getElementById('kpiContainer') || document.getElementById('dashboardKPIs');
  if (!kpiContainer) return;
  const totalEvents = state.calendarEvents.length;
  const todayEvents = state.calendarEvents.filter(ev => new Date(ev.start).toDateString() === new Date().toDateString()).length;
  const scheduledTickets = state.tickets.filter(t => t.status === 'scheduled').length;
  const openTickets = state.tickets.filter(t => t.status === 'new' || t.status === 'proposed' || t.status === 'await_approval').length;
  kpiContainer.innerHTML = `
    <div class="kpi-card"><div class="kpi-value">${totalEvents}</div><div class="kpi-label">Totaal Afspraken</div></div>
    <div class="kpi-card"><div class="kpi-value">${todayEvents}</div><div class="kpi-label">Vandaag</div></div>
    <div class="kpi-card"><div class="kpi-value">${scheduledTickets}</div><div class="kpi-label">Ingepland</div></div>
    <div class="kpi-card"><div class="kpi-value">${openTickets}</div><div class="kpi-label">Open</div></div>
  `;
}

/* -------------------- EVENT MODAL & EDITING -------------------- */
let currentEventId = null;

function showEventModal(event) {
  currentEventId = event.id;
  $("#eventTitle").value = event.title || "";
  $("#eventStart").value = event.start ? new Date(event.start).toISOString().slice(0, 16) : "";
  $("#eventEnd").value = event.end ? new Date(event.end).toISOString().slice(0, 16) : "";
  $("#eventClient").value = event.extendedProps?.client || "";
  $("#eventAddress").value = event.extendedProps?.address || "";
  $("#eventNotes").value = event.extendedProps?.notes || "";
  const techSelect = $("#eventTech");
  techSelect.innerHTML = '<option value="">Selecteer monteur</option>' + 
    state.technicians.map(t => `<option value="${t.name}" ${t.name === event.extendedProps?.tech ? 'selected' : ''}>${t.name}</option>`).join("");
  $("#saveEvent").onclick = saveEventChanges;
  $("#deleteEvent").onclick = deleteEvent;
  const modal = $("#eventModal");
  document.body.classList.add("modal-open");
  modal.addEventListener("close", () => document.body.classList.remove("modal-open"), {once: true});
  modal.showModal();
}

function saveEventChanges() {
  if(!currentEventId) return;
  const eventIndex = state.calendarEvents.findIndex(e => e.id === currentEventId);
  if(eventIndex === -1) { toast("\u274c Event niet gevonden"); return; }
  const updatedEvent = {
    ...state.calendarEvents[eventIndex],
    title: $("#eventTitle").value,
    start: new Date($("#eventStart").value).toISOString(),
    end: new Date($("#eventEnd").value).toISOString(),
    client: $("#eventClient").value,
    address: $("#eventAddress").value,
    tech: $("#eventTech").value,
    notes: $("#eventNotes").value
  };
  state.calendarEvents[eventIndex] = updatedEvent;
  saveState();
  if(calendar) { calendar.refetchEvents(); } else { showCalendarFallback(); }
  $("#eventModal").close();
  toast("\u2705 Afspraak opgeslagen");
}

function deleteEvent() {
  if(!currentEventId) return;
  if(!confirm("Weet je zeker dat je deze afspraak wilt verwijderen?")) return;
  state.calendarEvents = state.calendarEvents.filter(e => e.id !== currentEventId);
  saveState();
  if(calendar) { calendar.refetchEvents(); } else { showCalendarFallback(); }
  $("#eventModal").close();
  toast("\ud83d\uddd1\ufe0f Afspraak verwijderd");
}

function updateEventTime(fcEvent, newStart, newEnd) {
  try {
    const eventIndex = state.calendarEvents.findIndex(e => e.id === fcEvent.id);
    if (eventIndex === -1) { console.warn("Event not found:", fcEvent.id); return false; }
    state.calendarEvents[eventIndex].start = newStart.toISOString();
    if (newEnd) state.calendarEvents[eventIndex].end = newEnd.toISOString();
    state.calendarEvents[eventIndex].lastModified = new Date().toISOString();
    saveState();
    return true;
  } catch(error) { console.error("Error updating event time:", error); return false; }
}

function updateRelatedTicket(fcEvent) {
  const ticketId = state.calendarEvents.find(e => e.id === fcEvent.id)?.ticketId;
  if (!ticketId) return;
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (ticket) {
    if (!state.selectedProposal[ticketId]) state.selectedProposal[ticketId] = {};
    state.selectedProposal[ticketId].start = fcEvent.start.toISOString();
    state.selectedProposal[ticketId].end = fcEvent.end ? fcEvent.end.toISOString() : null;
    saveState();
  }
}

function validateEventDrop(fcEvent) {
  const start = fcEvent.start;
  if (!start) return false;
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAhead = new Date(); oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
  return start >= oneYearAgo && start <= oneYearAhead;
}

function validateEventResize(fcEvent) {
  const start = fcEvent.start, end = fcEvent.end;
  if (!start || !end) return false;
  const duration = (end - start) / (1000 * 60);
  return duration >= 15 && duration <= 480;
}

function logEventChange(type, fcEvent, changes) {
  try {
    const log = { type, eventId: fcEvent.id, title: fcEvent.title, changes, timestamp: new Date().toISOString() };
    if (window.planwiseLogger) window.planwiseLogger.info('Event changed', log);
    else console.log('Event change:', log);
  } catch(error) { console.warn("Error logging event change:", error); }
}
