# Auth v2 Test Plan

## Test Scenario 1: Fresh Start & Login Flow

### 1.1 Hard Refresh Test
1. **Action**: Hard refresh (Ctrl+Shift+R) op GitHub Pages
2. **Expected**: Login modal verschijnt direct
3. **Verify**: Geen console errors, modal sluit correct

### 1.2 Super Admin Login
1. **Action**: Login als Super Admin (`superadmin` / `planwise2025!`)
2. **Expected**: 
   - App laadt in Super Admin modus
   - 🔧 Super Admin knop zichtbaar in navigatie
   - Account dropdown toont "Naar Super Admin" optie
3. **Verify**: Geen console errors, UI blijft klikbaar

### 1.3 Regular User Login
1. **Action**: Maak nieuwe organisatie + gebruiker via Super Admin
2. **Action**: Log uit en log in als nieuwe gebruiker
3. **Expected**: 
   - App laadt in tenant modus
   - 🔧 Super Admin knop NIET zichtbaar (tenzij role=superadmin)
   - Account dropdown toont "Switch Tenant" optie

## Test Scenario 2: Organization Switching

### 2.1 Switch Tenant
1. **Prerequisites**: Super Admin ingelogd, meerdere organisaties aangemaakt
2. **Action**: Account → Switch Tenant → Selecteer andere organisatie
3. **Expected**: 
   - App herlaadt in nieuwe tenant context
   - UI toont tenant-specifieke data
   - Account dropdown toont nieuwe organisatie info

### 2.2 Switch to Super Admin
1. **Prerequisites**: Ingelogd als Super Admin in tenant context
2. **Action**: Account → Naar Super Admin
3. **Expected**: 
   - Confirm dialog "Naar platformmodus gaan?"
   - Na confirm: app herlaadt in platform modus
   - Super Admin dashboard zichtbaar

### 2.3 Access Super Admin from Tenant
1. **Prerequisites**: Ingelogd als Super Admin in tenant context
2. **Action**: Klik op 🔧 Super Admin knop
3. **Expected**: 
   - Confirm dialog verschijnt
   - Na confirm: switch naar platform modus

## Test Scenario 3: Persistence & State Management

### 3.1 Browser Restart
1. **Prerequisites**: Ingelogd als Super Admin of tenant gebruiker
2. **Action**: Sluit browser, open live URL opnieuw
3. **Expected**: 
   - Blijft in gekozen context (Super Admin of tenant)
   - Geen login modal (tenzij uitgelogd)
   - Alle functionaliteit werkt

### 3.2 Auth State Migration
1. **Prerequisites**: Oude auth state in localStorage (legacy keys)
2. **Action**: Laad app
3. **Expected**: 
   - Automatische migratie naar v2
   - Legacy keys worden opgeruimd
   - App werkt normaal

### 3.3 Reset Functionality
1. **Prerequisites**: Ingelogd met data
2. **Action**: Account → Reset App
3. **Expected**: 
   - Confirm dialog
   - Na confirm: alle data gewist
   - Login modal verschijnt

## Test Scenario 4: Super Admin Functionality

### 4.1 Create Organization
1. **Prerequisites**: Super Admin ingelogd
2. **Action**: Super Admin → 🏢 Nieuwe Organisatie
3. **Expected**: 
   - Modal opent met formulier
   - Organisatie wordt opgeslagen
   - Verschijnt in organisatie lijst

### 4.2 Create User
1. **Prerequisites**: Super Admin ingelogd, organisatie aangemaakt
2. **Action**: Super Admin → 👤 Nieuwe Gebruiker
3. **Expected**: 
   - Modal opent met formulier
   - Gebruiker wordt opgeslagen
   - Verschijnt in gebruiker lijst

### 4.3 Switch to Created Tenant
1. **Prerequisites**: Nieuwe organisatie + gebruiker aangemaakt
2. **Action**: Account → Switch Tenant → Selecteer nieuwe organisatie
3. **Expected**: 
   - App herlaadt in nieuwe tenant
   - Kan inloggen als nieuwe gebruiker

## Test Scenario 5: Permission System

### 5.1 Role-based Access
1. **Prerequisites**: Verschillende gebruikers met verschillende rollen
2. **Action**: Test navigatie en functionaliteit per rol
3. **Expected**: 
   - Alleen toegestane functies zichtbaar/werkend
   - Super Admin heeft alle toegang
   - Viewer kan alleen bekijken

### 5.2 Route Protection
1. **Prerequisites**: Niet-Super Admin gebruiker
2. **Action**: Probeer direct naar Super Admin routes te gaan
3. **Expected**: 
   - Toegang geweigerd
   - Geen console errors

## Test Scenario 6: Error Handling

### 6.1 Invalid Auth State
1. **Action**: Corrupteer localStorage auth data
2. **Expected**: 
   - Graceful fallback naar login
   - Geen crashes

### 6.2 Network Issues
1. **Action**: Simuleer trage netwerk condities
2. **Expected**: 
   - App blijft functioneel
   - FullCalendar laadt via fallback
   - Geen UI freezes

## Test Scenario 7: GitHub Pages Specific

### 7.1 Dialog Polyfill
1. **Action**: Test op verschillende browsers
2. **Expected**: 
   - Alle modals werken correct
   - Geen polyfill errors

### 7.2 FullCalendar Loading
1. **Action**: Test kalender functionaliteit
2. **Expected**: 
   - Kalender laadt en is klikbaar
   - Events kunnen worden toegevoegd/bewerkt

## Success Criteria

### ✅ Functional Requirements
- [ ] Login modal verschijnt direct bij hard refresh
- [ ] Super Admin functionaliteit volledig werkend
- [ ] Organization switching werkt zonder vastlopen
- [ ] Auth state persistentie werkt correct
- [ ] Permission system werkt correct
- [ ] Reset functionaliteit werkt

### ✅ Technical Requirements
- [ ] Geen console errors
- [ ] Geen UI freezes na herstart
- [ ] Dialog polyfill werkt op alle browsers
- [ ] FullCalendar laadt consistent
- [ ] Auth v2 migratie werkt automatisch

### ✅ User Experience
- [ ] Intuïtieve Account dropdown
- [ ] Duidelijke feedback bij acties
- [ ] Geen verwarrende UI states
- [ ] Super Admin altijd bereikbaar voor role=superadmin

## Known Issues & Workarounds

### Als login modal niet verschijnt:
- Hard refresh (Ctrl+Shift+R)
- Controleer console voor errors
- Test in incognito mode

### Als Super Admin knoppen niet werken:
- Controleer of role=superadmin
- Test reset functionaliteit
- Controleer console voor errors

### Als switching niet werkt:
- Controleer localStorage voor corrupte data
- Test reset functionaliteit
- Controleer console voor errors
