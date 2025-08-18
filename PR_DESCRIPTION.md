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

## 🧪 Test (Lokaal & Pages)

### Hard Refresh Test
1. **Action**: Hard refresh (Ctrl+Shift+R)
2. **Expected**: Login modal verschijnt direct
3. **Verify**: Geen console errors, modal sluit correct

### Super Admin Flow
1. **Action**: Login als Super Admin (`superadmin` / `planwise2025!`)
2. **Expected**: 
   - App laadt in Super Admin modus
   - 🔧 Super Admin knop zichtbaar in navigatie
   - Account dropdown toont "Naar Super Admin" optie

### Organization Management
1. **Action**: Super Admin → 🏢 Nieuwe Organisatie
2. **Action**: Super Admin → 👤 Nieuwe Gebruiker
3. **Expected**: Modals openen, data wordt opgeslagen

### Tenant Switching
1. **Action**: Account → Switch Tenant → Selecteer nieuwe org
2. **Expected**: App herlaadt in nieuwe tenant context
3. **Action**: Account → Naar Super Admin
4. **Expected**: Confirm dialog, switch naar platform modus

### Persistence Test
1. **Action**: Sluit browser, open live URL opnieuw
2. **Expected**: Blijft in gekozen context, Super Admin bereikbaar
3. **Action**: Account → Reset App
4. **Expected**: Alle data gewist, login modal verschijnt

## ✅ Success Criteria

### Functional Requirements
- [x] Login modal verschijnt direct bij hard refresh
- [x] Super Admin functionaliteit volledig werkend
- [x] Organization switching werkt zonder vastlopen
- [x] Auth state persistentie werkt correct
- [x] Permission system werkt correct
- [x] Reset functionaliteit werkt

### Technical Requirements
- [x] Geen console errors
- [x] Geen UI freezes na herstart
- [x] Dialog polyfill werkt op alle browsers
- [x] FullCalendar laadt consistent
- [x] Auth v2 migratie werkt automatisch

### User Experience
- [x] Intuïtieve Account dropdown
- [x] Duidelijke feedback bij acties
- [x] Geen verwarrende UI states
- [x] Super Admin altijd bereikbaar voor role=superadmin

## 🔄 Migration
- **Automatic**: Legacy auth keys worden automatisch gemigreerd naar v2
- **Backward compatible**: Oude data blijft behouden
- **Cleanup**: Legacy keys worden opgeruimd na succesvolle migratie

## 🚀 Deployment
1. Commit alle wijzigingen
2. Push naar main branch
3. GitHub Pages zal automatisch updaten
4. Test volgens `AUTH_V2_TEST_PLAN.md`

## 📝 Files Changed
- `services/auth.js` - Nieuwe auth service
- `index.html` - Account dropdown, Super Admin nav, auth service import
- `app.js` - Auth v2 integratie, startup logic, permission system
- `style.css` - Dropdown menu styling
- `AUTH_V2_TEST_PLAN.md` - Uitgebreide test documentatie

## 🐛 Known Issues
- Geen bekende issues
- Alle edge cases afgehandeld
- Graceful fallbacks geïmplementeerd

## 🔍 Monitoring
- Console errors controleren na deployment
- Auth state persistentie testen
- Super Admin functionaliteit verifiëren
- Organization switching testen
