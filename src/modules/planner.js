// src/modules/planner.js
// onSubmitRequest, guessDuration, renderBoard, openProposals, buildProposals,
// generateFallbackProposals, approveFlow, deleteTicket, classifyType, buildICS, downloadFile

/* -------------------- NIEUWE AANVRAAG -------------------- */
async function onSubmitRequest(e){
  e.preventDefault();
  
  if (!requirePermission('edit_planner')) return;
  
  const fd = new FormData(e.target);
  const t = Object.fromEntries(fd.entries());
  t.id = "req_"+uuid();
  t.createdAt = new Date().toISOString();
  t.status = "new";
  t.duration_min = Number(t.duration_min||0) || guessDuration(t.category);
  t.createdBy = getCurrentUserName();
  state.tickets.push(t); saveState();
  $("#reqStatus").textContent="Verzonden. De planner ontvangt deze aanvraag.";
  toast("\u2705 Aanvraag ingediend");
  e.target.reset();
  await go("planner");
}
function guessDuration(cat){ const map={ "CV-onderhoud":60,"Loodgieter":90,"Elektra":90,"Airco/Koeling":120,"Algemeen":60 }; return map[cat]||60; }

/* -------------------- PLANNER -------------------- */
function renderBoard(){
  showViewLoader("planner");
  
  setTimeout(() => {
    const cols = { new:$("#col-new"), proposals:$("#col-proposals"), approval:$("#col-approval"), scheduled:$("#col-scheduled") };
    Object.values(cols).forEach(c=> c && (c.innerHTML=""));

    const tpl=$("#cardTemplate"); const q=(($("#searchInput")?.value)||"" ).toLowerCase();
    state.tickets.filter(t=> [t.customer_name,t.address,t.category,t.description].join(" ").toLowerCase().includes(q))
    .forEach(t=>{
      const node=tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".t-customer").textContent=t.customer_name;
      node.querySelector(".t-meta").textContent=`${t.address} \u2022 ${t.email} \u2022 ${new Date(t.createdAt).toLocaleString("nl-NL")}`;
      const icon={ "CV-onderhoud":"\ud83d\udd25","Loodgieter":"\ud83d\udeb0","Elektra":"\u26a1","Airco/Koeling":"\u2744\ufe0f","Algemeen":"\ud83e\uddf0" }[t.category||"Algemeen"];
      node.querySelector(".t-category").textContent=`${icon} ${t.category||"Algemeen"}`;
      node.querySelector(".t-desc").textContent=t.description||"\u2014";
      const tags=node.querySelector(".t-tags");
      [t.window||"geen voorkeur", t.sla_days?`SLA: ${t.sla_days}d`:"geen SLA", `${t.duration_min||60} min`].forEach(v=>tags.appendChild(createEl("span","tag",v)));
      node.querySelector(".plan-btn").addEventListener("click", ()=> openProposals(t.id));
      node.querySelector(".approve-btn").addEventListener("click", ()=> approveFlow(t.id));
      node.querySelector(".delete-btn").addEventListener("click", ()=> deleteTicket(t.id));
      (t.status==="new")? cols.new.appendChild(node) :
      (t.status==="proposed")? cols.proposals.appendChild(node) :
      (t.status==="await_approval")? cols.approval.appendChild(node) :
      cols.scheduled.appendChild(node);
    });
    
    hideViewLoader("planner");
  }, 100);
}

async function openProposals(ticketId){
  if (!requirePermission('edit_planner')) return;
  
  const t = state.tickets.find(x=>x.id===ticketId);
  showSkeletons("col-proposals",2);
  await new Promise(r=>setTimeout(r,450));
  
  try {
    state.proposals[ticketId] = await buildProposals(t);
    t.status="proposed"; 
    saveState(); 
    clearSkeletons("col-proposals"); 
    renderBoard();
  } catch (error) {
    console.error('Error building proposals:', error);
    clearSkeletons("col-proposals");
    toast("\u274c Fout bij genereren voorstellen");
    return;
  }

  const list=$("#proposalList"); list.innerHTML="";
  const techSel=$("#customTech"); techSel.innerHTML="";
  state.technicians.forEach(tech=>{ const o=document.createElement("option"); o.value=tech.id; o.textContent=tech.name; techSel.appendChild(o); });

  state.proposals[ticketId].forEach((p,idx)=>{
    const box=createEl("div","proposal");
    const left=createEl("div");
    left.appendChild(createEl("div","", `${p.tech.name} \u2022 ${fmtDateTime(p.start)} \u2013 ${new Date(p.end).toLocaleTimeString("nl-NL",{hour:'2-digit',minute:'2-digit'})}`) );
    let metaInfo = `Reistijd ~ ${p.travelMin} min`;
    if (p.travelDistance) metaInfo += ` (${p.travelDistance} km)`;
    metaInfo += ` \u2022 Score ${p.score}`;
    if (p.fallback) metaInfo += ` \u2022 Fallback`;
    left.appendChild(createEl("div","meta", metaInfo));
    if (p.explanation) {
      const explanationEl = createEl("div","explanation", p.explanation);
      explanationEl.style.fontSize = "0.85em";
      explanationEl.style.color = "#666";
      explanationEl.style.marginTop = "4px";
      left.appendChild(explanationEl);
    }
    const choose=createEl("button","btn small","Kiezen");
    choose.addEventListener("click", ()=>{ 
      state.selectedProposal[ticketId]=p; 
      saveState(); 
      [...list.children].forEach(c=>c.classList.remove("selected")); 
      box.classList.add("selected"); 
    });
    box.appendChild(left); 
    box.appendChild(choose); 
    list.appendChild(box);
    if(idx===0 && !state.selectedProposal[ticketId]){
      state.selectedProposal[ticketId]=p; 
      saveState(); 
      box.classList.add("selected"); 
    }
  });

  $("#useCustom").onclick=()=>{
    const s=$("#customStart").value, e=$("#customEnd").value, techId=$("#customTech").value;
    if(!s||!e||!techId) return alert("Vul start, eind en monteur in.");
    const tech=state.technicians.find(x=>x.id===techId);
    state.selectedProposal[ticketId]={ id:"c_"+uuid(), tech, start:new Date(s).toISOString(), end:new Date(e).toISOString(), travelMin:0, score:75, custom:true };
    saveState(); toast("\ud83e\udde9 Eigen voorstel geselecteerd");
  };

  const dlg=$("#proposalModal"); document.body.classList.add("modal-open");
  dlg.addEventListener("close",()=>document.body.classList.remove("modal-open"),{once:true}); dlg.showModal();
  $("#confirmProposal").onclick=()=>{
    if(!state.selectedProposal[ticketId]) return alert("Kies een voorstel of vul een eigen in.");
    t.status="await_approval"; saveState(); renderBoard(); dlg.close(); toast("\ud83d\udcdd Voorstel klaar voor goedkeuring");
  };
}

async function buildProposals(t){
  console.log('Building proposals for ticket:', t.id);
  try {
    const lockedEvents = state.calendarEvents
      .filter(event => event.locked)
      .map(event => ({ technician_id: event.technician_id, start: event.start, end: event.end, job_id: event.job_id, locked: true }));
    
    const jobs = [{
      id: t.id, customer_name: t.customer_name, category: t.category,
      duration_min: t.duration_min || guessDuration(t.category),
      address: t.address, preferred_start: t.preferred_start,
      sla_deadline: t.sla_days ? new Date(Date.now() + t.sla_days * 86400000).toISOString() : null,
      required_skills: [t.category], window: t.window, description: t.description, email: t.email, phone: t.phone
    }];
    
    const result = await window.planwiseScheduler.optimizeSchedule(jobs, state.technicians, {}, lockedEvents);
    console.log('Scheduler result:', result);
    
    const proposals = result.assignments.map(assignment => {
      const tech = state.technicians.find(tech => tech.id === assignment.technician_id);
      return {
        id: "p_" + uuid(), tech,
        start: assignment.start, end: assignment.end,
        travelMin: assignment.travel_time, travelDistance: assignment.travel_distance,
        score: Math.round(assignment.score),
        explanation: assignment.explanation || 'Geoptimaliseerde toewijzing',
        scheduler_data: { assignment_id: assignment.job_id, technician_id: assignment.technician_id, travel_time: assignment.travel_time, travel_distance: assignment.travel_distance }
      };
    });
    
    if (result.explanations && result.explanations.length > 0) {
      console.log('Scheduler explanations:', result.explanations);
      const lockExplanation = result.explanations.find(e => e.type === 'lock_respect');
      if (lockExplanation) console.log(`Scheduler: ${lockExplanation.message}`);
      if (result.travel_analysis) console.log('Travel analysis:', result.travel_analysis);
    }
    
    if (proposals.length === 0) {
      console.warn('No assignments found, providing fallback proposals');
      return generateFallbackProposals(t).map(proposal => ({
        ...proposal, explanation: 'Fallback voorstel - geen optimale toewijzing gevonden',
        score: Math.max(30, proposal.score - 20)
      }));
    }
    
    return proposals;
  } catch (error) {
    console.error('Scheduler error, falling back to simple logic:', error);
    return generateFallbackProposals(t);
  }
}

function generateFallbackProposals(t) {
  const pool = state.technicians.filter(tech => (tech.skills || []).includes(t.category) || t.category === "Algemeen");
  const availableTechs = pool.length > 0 ? pool : state.technicians;
  const base = t.preferred_start ? new Date(t.preferred_start) : new Date(Date.now() + 86400000);
  return availableTechs.slice(0, 3).map((tech, i) => {
    const start = new Date(base.getTime() + (i * 2 + 1) * 3600000);
    const end = new Date(start.getTime() + (t.duration_min || 60) * 60000);
    const travelTime = estimateTravelTimeForTech(tech, t.address);
    return {
      id: "p_" + uuid(), tech,
      start: start.toISOString(), end: end.toISOString(),
      travelMin: travelTime, travelDistance: Math.round(travelTime / 2),
      score: Math.round(85 - i * 10),
      explanation: `Fallback voorstel ${i + 1} - ${tech.name}`, fallback: true
    };
  });
}

function estimateTravelTimeForTech(tech, jobAddress) {
  if (!tech.hub || !jobAddress) return 30;
  const techPostcode = extractPostcode(tech.hub);
  const jobPostcode = extractPostcode(jobAddress);
  if (techPostcode && jobPostcode) {
    const distance = calculatePostcodeDistance(techPostcode, jobPostcode);
    return Math.max(15, Math.min(90, distance * 2.5));
  }
  return 30 + Math.random() * 30;
}

function extractPostcode(address) {
  const match = address.match(/\d{4}\s*[A-Z]{2}/);
  return match ? match[0].replace(/\s/g, '') : null;
}

function calculatePostcodeDistance(pc1, pc2) {
  const num1 = parseInt(pc1.substring(0, 4));
  const num2 = parseInt(pc2.substring(0, 4));
  return Math.abs(num1 - num2) / 100;
}

/* -------------------- GOEDKEUREN -> PLAN + DASHBOARD -------------------- */
function approveFlow(ticketId){
  const t = state.tickets.find(x=>x.id===ticketId);
  if(!t) return alert("Ticket niet gevonden.");
  if(t.status === "scheduled") { toast("\u26a0\ufe0f Deze afspraak is al gepland"); return; }

  let p = state.selectedProposal[ticketId] || (state.proposals[ticketId]||[])[0];
  if(!p){ 
    const now=new Date(); 
    p={ id:"fallback_"+uuid(), tech:state.technicians[0], start:now.toISOString(), end:new Date(now.getTime()+60*60000).toISOString(), travelMin:0, score:50, custom:true }; 
  }

  const existingEvent = state.calendarEvents.find(e => 
    e.client === t.customer_name && 
    Math.abs(new Date(e.start) - new Date(p.start)) < 3600000 &&
    e.tech === (p.tech?.name || "Onbekend")
  );
  if(existingEvent) {
    if(!confirm(`Er bestaat al een afspraak voor ${t.customer_name} op ${fmtDateTime(existingEvent.start)}. Toch doorgaan?`)) return;
  }

  t.status="scheduled";
  const ev = {
    id:"ev_"+uuid(), title:`${t.customer_name} \u2014 ${t.category}`,
    client:t.customer_name, address:t.address,
    tech:p.tech?.name||"Onbekend", type: classifyType(t.category),
    start:p.start, end:p.end, notes:t.description||"", ticketId
  };
  if(!state.calendarEvents) state.calendarEvents = [];
  state.calendarEvents.push(ev);
  saveState();
  console.log("Event toegevoegd aan calendar:", ev);
  renderBoard();
  if(currentRoute==="dashboard") { if(calendar) updateDashboard(); else showCalendarFallback(); }
  toast("\ud83d\udcc5 Afspraak gepland");

  const subj = `Bevestiging afspraak ${fmtDateTime(p.start)} \u2013 ${t.category}`;
  const body = [`Beste ${t.customer_name},`, ``, `We hebben uw afspraak ingepland:`,
    `\u2022 Datum/tijd: ${fmtDateTime(p.start)} \u2013 ${new Date(p.end).toLocaleTimeString("nl-NL",{hour:'2-digit',minute:'2-digit'})}`,
    `\u2022 Monteur: ${p.tech?.name||"Onbekend"}`, `\u2022 Adres: ${t.address}`, ``, `Met vriendelijke groet,`, `PlanWise`
  ].join("\n");
  const ics = buildICS({ uid:`${ticketId}@planwise`, start:p.start, end:p.end, title:`Afspraak \u2013 ${t.category} (${p.tech?.name||"Onbekend"})`, location:t.address, description:`Klant: ${t.customer_name} \u2022 Tel: ${t.phone||""}` });
  $("#emailSubject").value=subj; $("#emailBody").value=body;
  const dlg=$("#emailModal"); document.body.classList.add("modal-open");
  dlg.addEventListener("close",()=>document.body.classList.remove("modal-open"),{once:true}); dlg.showModal();
  $("#downloadIcs").onclick=()=> downloadFile(`planwise_${ticketId}.ics`, ics, "text/calendar");
  $("#sendEmail").onclick=()=>{ dlg.close(); toast("\u2709\ufe0f E-mail verstuurd"); };
}

function deleteTicket(ticketId) {
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (!ticket) return;
  if (!confirm(`Weet je zeker dat je de opdracht "${ticket.customer_name}" wilt verwijderen?`)) return;
  state.tickets = state.tickets.filter(t => t.id !== ticketId);
  delete state.proposals[ticketId];
  delete state.selectedProposal[ticketId];
  state.calendarEvents = state.calendarEvents.filter(e => e.ticketId !== ticketId);
  saveState(); renderBoard();
  if(currentRoute === "dashboard") { if(calendar) updateDashboard(); else showCalendarFallback(); }
  toast("\ud83d\uddd1\ufe0f Opdracht verwijderd");
}

function classifyType(cat){ const c=(cat||" ").toLowerCase(); if(c.includes("onderhoud")) return "Maintenance"; if(c.includes("elektra")||c.includes("airco")) return "Installation"; return "Installation"; }
function buildICS({uid,start,end,title,location,description}){ const dt=d=>new Date(d).toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PlanWise//MVP//NL","BEGIN:VEVENT",`UID:${uid}`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(start)}`,`DTEND:${dt(end)}`,`SUMMARY:${title}`,`LOCATION:${location}`,`DESCRIPTION:${description}`,"END:VEVENT","END:VCALENDAR"].join("\r\n"); }
function downloadFile(name, content, type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); }
