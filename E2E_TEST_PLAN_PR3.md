# E2E Test Plan: PR 3 - Persistente instellingen en foutafhandeling

## Testomgeving
- **Browser**: Chrome, Edge, Firefox (desktop en mobiel)
- **Platform**: GitHub Pages en lokale ontwikkeling
- **Data**: Fresh start met lege localStorage

## Test Suite 1: Settings Persistence

### Test 1.1: Settings Save and Reload
**Doel**: Verificeren dat instellingen worden opgeslagen en behouden na page refresh

**Stappen**:
1. Login als admin gebruiker
2. Ga naar Instellingen
3. Wijzig de volgende velden:
   - Relay Webhook: `https://test-webhook.example.com`
   - Relay Schedule: `hourly`
   - Google Maps Key: `test-gmaps-key-123`
   - OpenAI Key: `test-openai-key-456`
   - AFAS URL: `https://test-afas.example.com`
   - AFAS Token: `test-afas-token-789`
4. Klik "Instellingen Opslaan"
5. Verifieer toast bericht: "⚙️ Instellingen opgeslagen"
6. Hard refresh (Ctrl+Shift+R)
7. Ga terug naar Instellingen
8. **Verwacht**: Alle wijzigingen zijn behouden

**Acceptatiecriteria**:
- [ ] Toast bericht verschijnt na opslaan
- [ ] Alle wijzigingen blijven behouden na refresh
- [ ] Geen console errors

### Test 1.2: Settings Persistence Across Tenants
**Doel**: Verificeren dat instellingen per tenant worden opgeslagen

**Stappen**:
1. Login als superadmin
2. Maak nieuwe organisatie "TestOrg1" aan
3. Maak admin gebruiker aan voor TestOrg1
4. Login als admin van TestOrg1
5. Wijzig instellingen (zie Test 1.1)
6. Switch naar andere tenant via Account menu
7. Switch terug naar TestOrg1
8. Ga naar Instellingen
9. **Verwacht**: Wijzigingen zijn behouden

**Acceptatiecriteria**:
- [ ] Instellingen blijven behouden per tenant
- [ ] Tenant switching werkt correct
- [ ] Geen data leakage tussen tenants

## Test Suite 2: Installations Persistence

### Test 2.1: Installation CRUD Operations
**Doel**: Verificeren dat installatie operaties persistent zijn

**Stappen**:
1. Login als admin gebruiker
2. Ga naar Installaties
3. Voeg nieuwe installatie toe:
   - Klant: "Test Klant"
   - Adres: "Teststraat 123, 1234 AB Amsterdam"
   - Type: "Airco"
   - Model: "Test Model XYZ"
   - Installatiedatum: "2024-01-15"
   - Laatste onderhoud: "2024-01-01"
   - Contract type: "Jaarlijks"
   - Contract einddatum: "2024-12-31"
   - Contract waarde: "1500"
   - Notities: "Test installatie voor E2E testing"
4. Klik "Installatie Opslaan"
5. Verifieer dat installatie verschijnt in de lijst
6. Hard refresh (Ctrl+Shift+R)
7. Ga terug naar Installaties
8. **Verwacht**: Installatie is nog steeds zichtbaar

**Acceptatiecriteria**:
- [ ] Installatie wordt correct opgeslagen
- [ ] Installatie blijft zichtbaar na refresh
- [ ] Alle velden zijn correct opgeslagen

### Test 2.2: Installation Editing
**Doel**: Verificeren dat installatie wijzigingen persistent zijn

**Stappen**:
1. Ga naar Installaties (na Test 2.1)
2. Klik op "Bewerken" bij de test installatie
3. Wijzig:
   - Klant: "Test Klant Gewijzigd"
   - Contract waarde: "2000"
   - Notities: "Gewijzigde test installatie"
4. Klik "Installatie Opslaan"
5. Hard refresh (Ctrl+Shift+R)
6. **Verwacht**: Wijzigingen zijn behouden

**Acceptatiecriteria**:
- [ ] Wijzigingen worden opgeslagen
- [ ] Wijzigingen blijven behouden na refresh
- [ ] Geen data verlies

### Test 2.3: Installation Deletion
**Doel**: Verificeren dat installatie verwijdering persistent is

**Stappen**:
1. Ga naar Installaties
2. Klik op "Verwijderen" bij de test installatie
3. Bevestig verwijdering
4. Verifieer dat installatie verdwenen is uit de lijst
5. Hard refresh (Ctrl+Shift+R)
6. **Verwacht**: Installatie blijft verwijderd

**Acceptatiecriteria**:
- [ ] Installatie wordt correct verwijderd
- [ ] Verwijdering blijft persistent na refresh
- [ ] Geen ghost data

## Test Suite 3: Users Persistence (Super Admin)

### Test 3.1: User Creation
**Doel**: Verificeren dat gebruikers correct worden aangemaakt en opgeslagen

**Stappen**:
1. Login als superadmin
2. Ga naar Super Admin → Gebruikers
3. Klik "Nieuwe Gebruiker"
4. Vul in:
   - Organisatie: "TestOrg1"
   - Gebruikersnaam: "testuser1"
   - E-mail: "testuser1@example.com"
   - Wachtwoord: "testpass123"
   - Rol: "Admin"
   - Notities: "Test gebruiker voor E2E testing"
5. Klik "Gebruiker Aanmaken"
6. Verifieer bevestigingsbericht
7. Hard refresh (Ctrl+Shift+R)
8. Ga terug naar Super Admin → Gebruikers
9. **Verwacht**: Gebruiker is nog steeds zichtbaar

**Acceptatiecriteria**:
- [ ] Gebruiker wordt correct aangemaakt
- [ ] Gebruiker blijft zichtbaar na refresh
- [ ] Alle velden zijn correct opgeslagen

### Test 3.2: User Password Reset
**Doel**: Verificeren dat wachtwoord reset persistent is

**Stappen**:
1. Ga naar Super Admin → Gebruikers
2. Klik op "Wachtwoord Reset" bij testuser1
3. Bevestig reset
4. Stel nieuw wachtwoord in: "newpass123"
5. Login als testuser1 met nieuw wachtwoord
6. **Verwacht**: Login succesvol met nieuw wachtwoord

**Acceptatiecriteria**:
- [ ] Wachtwoord reset werkt correct
- [ ] Nieuw wachtwoord is persistent
- [ ] Login werkt met nieuw wachtwoord

### Test 3.3: User Suspension
**Doel**: Verificeren dat gebruiker suspensie persistent is

**Stappen**:
1. Ga naar Super Admin → Gebruikers
2. Klik op "Suspend" bij testuser1
3. Bevestig suspensie
4. Probeer in te loggen als testuser1
5. **Verwacht**: Login wordt geweigerd

**Acceptatiecriteria**:
- [ ] Gebruiker wordt correct gesuspendeerd
- [ ] Suspensie blijft persistent
- [ ] Login wordt geweigerd voor gesuspendeerde gebruiker

## Test Suite 4: Technicians Persistence

### Test 4.1: Technician CRUD Operations
**Doel**: Verificeren dat monteur operaties persistent zijn

**Stappen**:
1. Login als admin gebruiker
2. Ga naar Instellingen → Monteurs
3. Voeg nieuwe monteur toe:
   - Naam: "Test Monteur"
   - E-mail: "test.monteur@example.com"
   - Calendar ID: "test-calendar-id"
   - Vaardigheden: "Algemeen, Airco/Koeling"
   - Hub: "Amsterdam"
4. Verifieer dat monteur verschijnt in de lijst
5. Hard refresh (Ctrl+Shift+R)
6. Ga terug naar Instellingen → Monteurs
7. **Verwacht**: Monteur is nog steeds zichtbaar

**Acceptatiecriteria**:
- [ ] Monteur wordt correct opgeslagen
- [ ] Monteur blijft zichtbaar na refresh
- [ ] Alle velden zijn correct opgeslagen

### Test 4.2: Technician Editing
**Doel**: Verificeren dat monteur wijzigingen persistent zijn

**Stappen**:
1. Ga naar Instellingen → Monteurs
2. Wijzig de test monteur:
   - Naam: "Test Monteur Gewijzigd"
   - E-mail: "test.monteur.new@example.com"
   - Vaardigheden: "Algemeen, Airco/Koeling, Elektra"
3. Hard refresh (Ctrl+Shift+R)
4. **Verwacht**: Wijzigingen zijn behouden

**Acceptatiecriteria**:
- [ ] Wijzigingen worden opgeslagen
- [ ] Wijzigingen blijven behouden na refresh
- [ ] Geen data verlies

## Test Suite 5: Error Handling

### Test 5.1: Global Error Handling
**Doel**: Verificeren dat globale foutafhandeling werkt

**Stappen**:
1. Open browser console
2. Login als admin gebruiker
3. Open browser console en voer uit: `throw new Error("Test error")`
4. **Verwacht**: Error toast verschijnt, app blijft functioneel

**Acceptatiecriteria**:
- [ ] Error toast verschijnt
- [ ] App blijft functioneel
- [ ] Login-modal blijft toegankelijk
- [ ] Geen blank screen

### Test 5.2: Promise Rejection Handling
**Doel**: Verificeren dat promise rejections worden afgehandeld

**Stappen**:
1. Open browser console
2. Voer uit: `Promise.reject(new Error("Test promise rejection"))`
3. **Verwacht**: Promise rejection toast verschijnt

**Acceptatiecriteria**:
- [ ] Promise rejection toast verschijnt
- [ ] App blijft functioneel
- [ ] Geen unhandled rejection errors

### Test 5.3: Network Error Handling
**Doel**: Verificeren dat netwerk fouten worden afgehandeld

**Stappen**:
1. Simuleer offline modus (Chrome DevTools → Network → Offline)
2. Probeer een actie uit te voeren die netwerk vereist
3. **Verwacht**: Error toast verschijnt, app blijft functioneel

**Acceptatiecriteria**:
- [ ] Network error wordt afgehandeld
- [ ] App blijft functioneel
- [ ] Geen crash

## Test Suite 6: Cross-Browser Compatibility

### Test 6.1: Chrome Desktop
**Stappen**: Voer alle bovenstaande tests uit in Chrome desktop
**Acceptatiecriteria**: Alle tests slagen

### Test 6.2: Edge Desktop
**Stappen**: Voer alle bovenstaande tests uit in Edge desktop
**Acceptatiecriteria**: Alle tests slagen

### Test 6.3: Firefox Desktop
**Stappen**: Voer alle bovenstaande tests uit in Firefox desktop
**Acceptatiecriteria**: Alle tests slagen

### Test 6.4: Mobile Chrome
**Stappen**: Voer alle bovenstaande tests uit in Chrome mobile
**Acceptatiecriteria**: Alle tests slagen

## Test Suite 7: Performance and Memory

### Test 7.1: Large Dataset Handling
**Doel**: Verificeren dat app stabiel blijft met grote datasets

**Stappen**:
1. Maak 100 test installaties aan
2. Maak 50 test monteurs aan
3. Voer normale operaties uit
4. **Verwacht**: App blijft responsief

**Acceptatiecriteria**:
- [ ] App blijft responsief
- [ ] Geen memory leaks
- [ ] Alle functies werken correct

### Test 7.2: Rapid State Changes
**Doel**: Verificeren dat snelle state wijzigingen correct worden opgeslagen

**Stappen**:
1. Voer snel meerdere wijzigingen uit
2. Hard refresh
3. **Verwacht**: Alle wijzigingen zijn behouden

**Acceptatiecriteria**:
- [ ] Alle wijzigingen worden opgeslagen
- [ ] Geen data verlies
- [ ] Geen race conditions

## Success Criteria

### Functional Requirements
- [ ] Alle state wijzigingen worden automatisch opgeslagen
- [ ] Data blijft behouden tussen sessies
- [ ] Data blijft behouden bij tenant switches
- [ ] Fouten worden getoond als non-blocking toasts
- [ ] App blijft functioneel na fouten

### Performance Requirements
- [ ] Geen significante performance impact
- [ ] Geen memory leaks
- [ ] Responsieve UI bij grote datasets

### Compatibility Requirements
- [ ] Werkt in Chrome, Edge, Firefox
- [ ] Werkt op desktop en mobiel
- [ ] Werkt op GitHub Pages en lokaal

### Error Handling Requirements
- [ ] Geen unhandled errors
- [ ] Geen blank screens
- [ ] Login-modal blijft altijd toegankelijk
- [ ] Duidelijke error messages

## Test Execution

### Pre-test Setup
1. Clear browser localStorage
2. Clear browser cache
3. Open browser console
4. Noteer start tijd

### Test Execution
1. Voer tests uit in volgorde
2. Documenteer alle failures
3. Maak screenshots van errors
4. Noteer console errors

### Post-test Cleanup
1. Clear browser localStorage
2. Clear browser cache
3. Noteer end tijd
4. Bereken test duration

## Reporting

### Test Results Template
```
Test Suite: [Suite Name]
Date: [Date]
Browser: [Browser Version]
Platform: [Desktop/Mobile]
Duration: [Duration]

Results:
- Passed: [X/Y]
- Failed: [X/Y]
- Skipped: [X/Y]

Issues Found:
- [Issue 1]
- [Issue 2]

Recommendations:
- [Recommendation 1]
- [Recommendation 2]
```

### Pass/Fail Criteria
- **Pass**: Alle acceptatiecriteria zijn voldaan
- **Fail**: Een of meer acceptatiecriteria zijn niet voldaan
- **Skip**: Test kan niet worden uitgevoerd (browser limitation, etc.)

## Known Issues
- Geen bekende issues voor deze PR

## Next Steps
- Als alle tests slagen: PR kan worden gemerged
- Als tests falen: Issues moeten worden opgelost voordat merge
- Als performance issues: Optimalisatie vereist
