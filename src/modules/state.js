// src/modules/state.js
// Global state vars (currentAuth, currentRoute, state), SUPER_ADMIN, defaultState
// Note: ROLES/ROLE_PERMISSIONS/RBAC helpers are in rbac.js

/* -------------------- GLOBAL STATE -------------------- */
let currentAuth = null;
let currentRoute = "dashboard";
let state = null; // Will be initialized in initAppFor() after authentication

// Super Admin credentials (in production, this should be env variables)
const SUPER_ADMIN = {
  username: 'superadmin',
  password: 'planwise2025!',
  company: 'PLANWISE_PLATFORM'
};

function getStorageKey() {
  return currentAuth?.orgSlug ? `planwise_${currentAuth.orgSlug}_v4` : "planwise_demo_v4";
}

/* -------------------- DEFAULT STATE -------------------- */
const defaultState = {
  tenantInfo: { company: "", industry: "", plan: "demo" },
  settings:{ relayWebhook:"", relayWebhookSchedule:"", gmapsKey:"", openaiKey:"", afasUrl:"", afasToken:"" },
  installationTypes: [
    { id: "vickers", name: "Vickers", color: "#3b82f6", category: "Airco/Koeling" },
    { id: "airco", name: "Airco", color: "#10b981", category: "Airco/Koeling" },
    { id: "ketel", name: "Ketel", color: "#f56565", category: "CV-onderhoud" },
    { id: "ventilatie", name: "Ventilatie", color: "#8b5cf6", category: "Algemeen" },
    { id: "elektra", name: "Elektra", color: "#fbbf24", category: "Elektra" }
  ],
  technicians:[
    { id:"t1", name:"Sanne Peters", email:"sanne@bedrijf.nl", calendarId:"sanne@bedrijf.nl", skills:["CV-onderhoud","Loodgieter"], hub:"1051AA"},
    { id:"t2", name:"Ahmed Ouazani", email:"ahmed@bedrijf.nl", calendarId:"ahmed@bedrijf.nl", skills:["Elektra","Algemeen"], hub:"3527BB"},
    { id:"t3", name:"Lars de Boer", email:"lars@bedrijf.nl", calendarId:"lars@bedrijf.nl", skills:["Airco/Koeling","Algemeen"], hub:"3011CC"}
  ],
  tickets:[],
  proposals:{}, selectedProposal:{},
  calendarEvents:[],
  installations:[],
  assets:[
    { id:"a1", client:"VvE Parkzicht", address:"Kade 12, 1013 AA Amsterdam", system:"Vickers Chiller", lastService:"2024-10-20", category:"Airco/Koeling"},
    { id:"a2", client:"De Boer Makelaardij", address:"Markt 7, 3511 AA Utrecht", system:"CV-ketel Remeha", lastService:"2024-07-03", category:"CV-onderhoud"},
    { id:"a3", client:"Woningstichting Noord", address:"Dok 5, 9712 AA Groningen", system:"CV-ketel Nefit", lastService:"2024-12-15", category:"CV-onderhoud"},
    { id:"a4", client:"Koelservice BV", address:"Handelstraat 8, 3044 AB Rotterdam", system:"Vickers Koelgroep 120kW", lastService:"2023-09-10", category:"Airco/Koeling"}
  ],
  maintenancePlans:[]
};

let calendar = null;     // FullCalendar instance
currentRoute = "new";
