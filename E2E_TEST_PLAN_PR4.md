# E2E Test Plan: PR 4 - UX-verbeteringen

## Testomgeving
- **Browser**: Chrome, Edge, Firefox (desktop en mobiel)
- **Platform**: GitHub Pages en lokale ontwikkeling
- **Data**: Fresh start met lege localStorage

## Test Suite 1: Progress Indicators
### Test 1.1: Dashboard Progress Indicator
**Stappen**:
1. Open PlanWise in browser
2. Log in als gebruiker
3. Navigeer naar Dashboard
4. **Verwacht**: Spinner verschijnt in het midden van de view
5. **Verwacht**: Spinner verdwijnt na ~100ms wanneer data geladen is
6. **Verwacht**: Calendar wordt getoond zonder spinner

**Success Criteria**:
- [ ] Spinner verschijnt onmiddellijk bij navigatie
- [ ] Spinner is gecentreerd in de view
- [ ] Spinner verdwijnt na data laden
- [ ] Geen spinner blijft hangen

### Test 1.2: Planner Progress Indicator
**Stappen**:
1. Navigeer naar Planner
2. **Verwacht**: Spinner verschijnt in het midden van de view
3. **Verwacht**: Spinner verdwijnt na ~100ms wanneer tickets geladen zijn
4. **Verwacht**: Kanban board wordt getoond zonder spinner

**Success Criteria**:
- [ ] Spinner verschijnt onmiddellijk bij navigatie
- [ ] Spinner is gecentreerd in de view
- [ ] Spinner verdwijnt na tickets laden
- [ ] Kanban kolommen zijn zichtbaar

### Test 1.3: Installations Progress Indicator
**Stappen**:
1. Navigeer naar Installaties
2. **Verwacht**: Spinner verschijnt in het midden van de view
3. **Verwacht**: Spinner verdwijnt na ~100ms wanneer installaties geladen zijn
4. **Verwacht**: Installaties tabel wordt getoond zonder spinner

**Success Criteria**:
- [ ] Spinner verschijnt onmiddellijk bij navigatie
- [ ] Spinner is gecentreerd in de view
- [ ] Spinner verdwijnt na installaties laden
- [ ] Tabel is zichtbaar en klikbaar

### Test 1.4: Settings Progress Indicator
**Stappen**:
1. Navigeer naar Instellingen
2. **Verwacht**: Spinner verschijnt in het midden van de view
3. **Verwacht**: Spinner verdwijnt na ~100ms wanneer monteurs geladen zijn
4. **Verwacht**: Monteurs tabel wordt getoond zonder spinner

**Success Criteria**:
- [ ] Spinner verschijnt onmiddellijk bij navigatie
- [ ] Spinner is gecentreerd in de view
- [ ] Spinner verdwijnt na monteurs laden
- [ ] Monteurs tabel is bewerkbaar

### Test 1.5: Super Admin Progress Indicator
**Stappen**:
1. Log in als Super Admin
2. Navigeer naar Super Admin
3. **Verwacht**: Spinner verschijnt in het midden van de view
4. **Verwacht**: Spinner verdwijnt na ~100ms wanneer platform data geladen is
5. **Verwacht**: Platform statistieken worden getoond zonder spinner

**Success Criteria**:
- [ ] Spinner verschijnt onmiddellijk bij navigatie
- [ ] Spinner is gecentreerd in de view
- [ ] Spinner verdwijnt na platform data laden
- [ ] Statistieken en tabellen zijn zichtbaar

## Test Suite 2: Slug Help Tooltip
### Test 2.1: Slug Help Button Visibility
**Stappen**:
1. Open login modal (Ctrl+Shift+R voor hard refresh)
2. **Verwacht**: Help-knop (❓) is zichtbaar naast bedrijfsnaam veld
3. **Verwacht**: Help-knop heeft tooltip "Toon beschikbare slugs"

**Success Criteria**:
- [ ] Help-knop is zichtbaar
- [ ] Help-knop is correct gepositioneerd
- [ ] Tooltip is zichtbaar bij hover

### Test 2.2: Slug Help Dropdown Functionality
**Stappen**:
1. Klik op help-knop (❓)
2. **Verwacht**: Dropdown verschijnt onder het veld
3. **Verwacht**: Dropdown toont "Beschikbare organisaties:"
4. **Verwacht**: Lijst met organisaties en slugs wordt getoond

**Success Criteria**:
- [ ] Dropdown verschijnt na klik
- [ ] Dropdown toont juiste titel
- [ ] Organisaties worden getoond
- [ ] Slugs worden getoond in code-formaat

### Test 2.3: Slug Help Close Functionality
**Stappen**:
1. Open slug help dropdown
2. Klik op ❌ knop
3. **Verwacht**: Dropdown verdwijnt
4. **Verwacht**: Knop verandert terug naar ❓

**Success Criteria**:
- [ ] Dropdown verdwijnt na klik op ❌
- [ ] Knop verandert terug naar ❓
- [ ] Tooltip verandert terug naar "Toon beschikbare slugs"

### Test 2.4: Slug Help Click Outside
**Stappen**:
1. Open slug help dropdown
2. Klik ergens buiten de dropdown
3. **Verwacht**: Dropdown verdwijnt
4. **Verwacht**: Knop verandert terug naar ❓

**Success Criteria**:
- [ ] Dropdown verdwijnt na klik buiten
- [ ] Knop verandert terug naar ❓
- [ ] Geen andere UI elementen worden beïnvloed

### Test 2.5: Slug Help with Multiple Organizations
**Stappen**:
1. Maak meerdere organisaties aan via Super Admin
2. Open login modal
3. Klik op help-knop
4. **Verwacht**: Alle organisaties worden getoond
5. **Verwacht**: Elke organisatie toont naam en slug

**Success Criteria**:
- [ ] Alle organisaties worden getoond
- [ ] Namen en slugs zijn correct
- [ ] Geen duplicaten
- [ ] Geen lege entries

## Test Suite 3: Case-Insensitive Search
### Test 3.1: Planner Search Case-Insensitive
**Stappen**:
1. Navigeer naar Planner
2. Voeg test ticket toe met naam "Test Customer"
3. Zoek naar "TEST CUSTOMER" (hoofdletters)
4. **Verwacht**: Ticket wordt gevonden
5. Zoek naar "test customer" (kleine letters)
6. **Verwacht**: Ticket wordt gevonden

**Success Criteria**:
- [ ] Zoeken met hoofdletters vindt resultaten
- [ ] Zoeken met kleine letters vindt resultaten
- [ ] Zoeken met gemengde letters vindt resultaten
- [ ] Geen resultaten bij niet-bestaande zoektermen

### Test 3.2: Installations Search Case-Insensitive
**Stappen**:
1. Navigeer naar Installaties
2. Voeg test installatie toe met klant "Test Client"
3. Zoek naar "TEST CLIENT" (hoofdletters)
4. **Verwacht**: Installatie wordt gevonden
5. Zoek naar "test client" (kleine letters)
6. **Verwacht**: Installatie wordt gevonden

**Success Criteria**:
- [ ] Zoeken met hoofdletters vindt resultaten
- [ ] Zoeken met kleine letters vindt resultaten
- [ ] Zoeken met gemengde letters vindt resultaten
- [ ] Geen resultaten bij niet-bestaande zoektermen

### Test 3.3: Search with Special Characters
**Stappen**:
1. Voeg ticket toe met naam "Test-Customer & Co."
2. Zoek naar "test-customer & co."
3. **Verwacht**: Ticket wordt gevonden
4. Zoek naar "TEST-CUSTOMER & CO."
5. **Verwacht**: Ticket wordt gevonden

**Success Criteria**:
- [ ] Speciale karakters worden correct behandeld
- [ ] Case-insensitive werkt met speciale karakters
- [ ] Geen crashes bij speciale karakters

## Test Suite 4: Cross-Browser Compatibility
### Test 4.1: Chrome Desktop
**Stappen**:
1. Test alle bovenstaande test cases in Chrome
2. **Verwacht**: Alle functionaliteit werkt correct

**Success Criteria**:
- [ ] Progress indicators werken
- [ ] Slug help werkt
- [ ] Case-insensitive search werkt
- [ ] Geen console errors

### Test 4.2: Edge Desktop
**Stappen**:
1. Test alle bovenstaande test cases in Edge
2. **Verwacht**: Alle functionaliteit werkt correct

**Success Criteria**:
- [ ] Progress indicators werken
- [ ] Slug help werkt
- [ ] Case-insensitive search werkt
- [ ] Geen console errors

### Test 4.3: Firefox Desktop
**Stappen**:
1. Test alle bovenstaande test cases in Firefox
2. **Verwacht**: Alle functionaliteit werkt correct

**Success Criteria**:
- [ ] Progress indicators werken
- [ ] Slug help werkt
- [ ] Case-insensitive search werkt
- [ ] Geen console errors

### Test 4.4: Mobile Chrome
**Stappen**:
1. Test alle bovenstaande test cases in mobile Chrome
2. **Verwacht**: Alle functionaliteit werkt correct

**Success Criteria**:
- [ ] Progress indicators werken
- [ ] Slug help werkt (touch-friendly)
- [ ] Case-insensitive search werkt
- [ ] Geen console errors

## Test Suite 5: Performance and Memory
### Test 5.1: Rapid Navigation
**Stappen**:
1. Navigeer snel tussen verschillende views
2. **Verwacht**: Progress indicators verschijnen en verdwijnen correct
3. **Verwacht**: Geen memory leaks

**Success Criteria**:
- [ ] Geen hangende spinners
- [ ] Geen memory leaks
- [ ] Responsieve navigatie

### Test 5.2: Large Dataset Handling
**Stappen**:
1. Voeg veel tickets/installaties toe
2. Test progress indicators
3. **Verwacht**: Spinners werken correct met grote datasets

**Success Criteria**:
- [ ] Spinners verschijnen en verdwijnen correct
- [ ] Geen performance impact
- [ ] UI blijft responsief

## Success Criteria
### Functional Requirements
- [ ] Alle views tonen progress indicators tijdens laden
- [ ] Progress indicators verdwijnen na laden
- [ ] Slug help tooltip werkt correct
- [ ] Case-insensitive search werkt in alle zoekvelden
- [ ] Geen UI crashes of hangs

### Performance Requirements
- [ ] Geen significante performance impact
- [ ] Geen memory leaks
- [ ] Responsieve UI bij grote datasets

### Compatibility Requirements
- [ ] Werkt in Chrome, Edge, Firefox
- [ ] Werkt op desktop en mobiel
- [ ] Werkt op GitHub Pages en lokaal

### UX Requirements
- [ ] Consistente loading states
- [ ] Intuïtieve slug help
- [ ] Betrouwbare zoekfunctionaliteit
- [ ] Geen verwarrende UI states

## Test Execution
### Pre-test Setup
1. Clear browser cache en localStorage
2. Open browser developer tools
3. Enable network throttling (optioneel)

### Test Execution
1. Voer alle test cases uit in volgorde
2. Documenteer eventuele fouten
3. Maak screenshots van problemen

### Post-test Cleanup
1. Clear localStorage
2. Close browser tabs
3. Documenteer resultaten

## Reporting
### Test Results Template
```
Test Suite: [Suite Name]
Date: [Date]
Browser: [Browser Version]
Platform: [Platform]

Results:
- Test 1.1: [PASS/FAIL] - [Notes]
- Test 1.2: [PASS/FAIL] - [Notes]
...

Total: [X] passed, [Y] failed
```

### Pass/Fail Criteria
- **PASS**: Functionaliteit werkt zoals verwacht
- **FAIL**: Functionaliteit werkt niet of veroorzaakt errors
- **PARTIAL**: Functionaliteit werkt gedeeltelijk

## Known Issues
- Geen bekende issues voor deze PR

## Next Steps
- Als alle tests slagen: PR kan worden gemerged
- Als tests falen: Issues moeten worden opgelost voordat merge
- Als performance issues: Optimalisatie vereist
