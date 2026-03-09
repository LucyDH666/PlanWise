// src/modules/storage.js
// saveState, loadState, seedDemo, getStorageKey

/* -------------------- STORAGE -------------------- */
async function saveState(){ 
  try{ 
    if (window.PlanWiseData) {
      await window.PlanWiseData.saveState(state);
    } else {
      // Fallback to old method
      localStorage.setItem(getStorageKey(), JSON.stringify(state)); 
    }
  } catch(error) {
    console.error("Failed to save state:", error);
    if (window.showErrorToast) {
      window.showErrorToast("⚠️ Opslaan mislukt - probeer opnieuw");
    } else if (window.toast) {
      window.toast("⚠️ Opslaan mislukt - probeer opnieuw");
    }
  } 
}

async function loadState(){
  try{ 
    if (window.PlanWiseData) {
      // Use data service for loading
      return await window.PlanWiseData.loadState();
    } else {
      // Fallback to old method
      const raw=localStorage.getItem(getStorageKey()); 
      return raw? JSON.parse(raw):null; 
    }
  } catch(error) {
    console.error("Failed to load state from localStorage:", error);
    return null; 
  }
}
function seedDemo(s){
  console.log("seedDemo aangeroepen");
  
  if((s.tickets||[]).length) {
    console.log("Demo tickets bestaan al, alleen calendarEvents controleren");
    if(!s.calendarEvents) {
      s.calendarEvents = [];
    }
    
    if(s.calendarEvents.length === 0) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      const dayAfter = new Date(now.getTime() + 2 * 86400000);
      
      const demoEvents = [
        {
          id: "ev_demo1",
          title: "VvE Parkzicht — CV-onderhoud",
          client: "VvE Parkzicht",
          address: "Kade 12, 1013 AA Amsterdam",
          tech: "Sanne Peters",
          type: "Maintenance",
          start: new Date(tomorrow.getTime() + 9 * 3600000).toISOString(),
          end: new Date(tomorrow.getTime() + 10 * 3600000).toISOString(),
          notes: "Jaarlijkse ketelservice toren A."
        },
        {
          id: "ev_demo2", 
          title: "De Boer Makelaardij — Elektra",
          client: "De Boer Makelaardij",
          address: "Markt 7, 3511 AA Utrecht",
          tech: "Ahmed Ouazani",
          type: "Installation",
          start: new Date(dayAfter.getTime() + 13 * 3600000).toISOString(),
          end: new Date(dayAfter.getTime() + 14.5 * 3600000).toISOString(),
          notes: "Groepenkast naloop, verschillende storingen."
        }
      ];
      
      s.calendarEvents.push(...demoEvents);
      console.log("Demo events toegevoegd:", demoEvents.length);
    }
    
    saveState(); 
    return s;
  }
  
  const demo = [
    {customer_name:"VvE Parkzicht", email:"beheer@parkzicht.nl", phone:"+31612345678", address:"Kade 12, 1013 AA Amsterdam", category:"CV-onderhoud", window:"Ochtend (08:00–12:00)", preferred_start:new Date(Date.now()+86400000).toISOString().slice(0,10), sla_days:2, description:"Jaarlijkse ketelservice toren A."},
    {customer_name:"De Boer Makelaardij", email:"info@dboer.nl", phone:"+31698765432", address:"Markt 7, 3511 AA Utrecht", category:"Elektra", window:"Middag (12:00–17:00)", preferred_start:new Date(Date.now()+2*86400000).toISOString().slice(0,10), sla_days:1, description:"Groepenkast naloop, verschillende storingen."}
  ];
  
  s.tickets = demo.map(d=> ({...d, id:"req_"+uuid(), createdAt:new Date().toISOString(), status:"new", duration_min:guessDuration(d.category)}));
  
  if(!s.calendarEvents) {
    s.calendarEvents = [];
  }
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const dayAfter = new Date(now.getTime() + 2 * 86400000);
  
  const demoEvents = [
    {
      id: "ev_demo1",
      title: "VvE Parkzicht — CV-onderhoud",
      client: "VvE Parkzicht",
      address: "Kade 12, 1013 AA Amsterdam",
      tech: "Sanne Peters",
      type: "Maintenance",
      start: new Date(tomorrow.getTime() + 9 * 3600000).toISOString(),
      end: new Date(tomorrow.getTime() + 10 * 3600000).toISOString(),
      notes: "Jaarlijkse ketelservice toren A."
    },
    {
      id: "ev_demo2", 
      title: "De Boer Makelaardij — Elektra",
      client: "De Boer Makelaardij",
      address: "Markt 7, 3511 AA Utrecht",
      tech: "Ahmed Ouazani",
      type: "Installation",
      start: new Date(dayAfter.getTime() + 13 * 3600000).toISOString(),
      end: new Date(dayAfter.getTime() + 14.5 * 3600000).toISOString(),
      notes: "Groepenkast naloop, verschillende storingen."
    }
  ];
  
  s.calendarEvents.push(...demoEvents);
  console.log("Demo events toegevoegd:", demoEvents.length);
  
  saveState(); 
  return s;
}
