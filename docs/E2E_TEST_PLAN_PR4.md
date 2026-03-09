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

## Success Criteria
### Functional Requirements
- [ ] Alle views tonen progress indicators tijdens laden
- [ ] Login modal heeft werkende slug help tooltip
- [ ] Alle zoekvelden zijn case-insensitive
- [ ] Progress indicators verdwijnen na laden
- [ ] Slug help toont alle beschikbare organisaties
- [ ] Geen console errors bij normale operaties
- [ ] Alle tests slagen
