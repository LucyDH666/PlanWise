# Auth v2: Centralized Authentication State Management

## 🎯 Doel
Login/switchen waterdicht maken en voorkomen dat de UI na herstart "vast" zit.

## 🔧 Implementatie

### 1. Auth Service v2 (`services/auth.js`)
- **Centralized auth state management** met versioning
- **Automatic migration** van legacy auth keys naar v2
- **Organization switching** zonder data loss
- **Permission system** geïntegreerd in auth service
- **Super Admin mode** met platform context switching

### 2. Account Dropdown Menu
- **Switch Tenant**: Wissel tussen organisaties
- **Naar Super Admin**: Platform modus voor super admins
- **Reset App**: Volledige app reset
- **Uitloggen**: Proper logout met cleanup

### 3. Modal/Overlay Hardening
- **Dialog polyfill** voor GitHub Pages compatibiliteit
- **Stray dialog cleanup** bij startup
- **FullCalendar** via vaste defer script-tag
- **Global reset function** beschikbaar

### 4. Startup Logic (Race Condition Free)
- **Single entry point** via `bootstrap()`
- **Auth state check** voor alle routes
- **Calendar loading** met fallback mechanismen
- **Permission-based route protection**

### 5. Super Admin UI Restored
- **🔧 Super Admin knop** altijd zichtbaar voor role=superadmin
- **Organization management** volledig functioneel
- **User management** met role-based access
- **Platform context switching** met confirm dialogs

## ✅ Success Criteria

### Functional Requirements
- [x] Login modal verschijnt direct bij hard refresh
- [x] Super Admin functionaliteit volledig werkend
- [x] Organization switching werkt zonder vastlopen
- [x] Auth state persistentie werkt correct
- [x] Permission system werkt correct
- [x] Reset functionaliteit werkt

## 📝 Files Changed
- `services/auth.js` - Nieuwe auth service
- `index.html` - Account dropdown, Super Admin nav, auth service import
- `app.js` - Auth v2 integratie, startup logic, permission system
- `style.css` - Dropdown menu styling
- `docs/AUTH_V2_TEST_PLAN.md` - Uitgebreide test documentatie
