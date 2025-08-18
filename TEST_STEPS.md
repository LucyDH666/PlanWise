# Test Steps voor GitHub Pages Fixes

## Test 1: Login Modal en Dialog Polyfill
1. Ga naar de live GitHub Pages URL
2. Hard refresh de pagina (Ctrl+F5 of Cmd+Shift+R)
3. **Verwacht resultaat**: Login modal moet direct zichtbaar zijn
4. **Test**: Klik op de sluitknop (✕) - modal moet sluiten
5. **Test**: Klik buiten de modal - modal moet sluiten

## Test 2: FullCalendar Functionaliteit
1. Log in als Super Admin: `superadmin` / `planwise2025!`
2. Ga naar Dashboard
3. **Verwacht resultaat**: Kalender moet zichtbaar zijn en klikbaar
4. **Test**: Klik op een datum - event modal moet openen
5. **Test**: Klik op "Vandaag" knop - kalender moet naar vandaag scrollen

## Test 3: Super Admin Functionaliteit
1. Log in als Super Admin: `superadmin` / `planwise2025!`
2. **Verwacht resultaat**: Super Admin dashboard moet zichtbaar zijn
3. **Test**: Klik op "🏢 Nieuwe Organisatie" knop
4. **Verwacht resultaat**: Modal moet openen met formulier
5. **Test**: Vul formulier in en klik "Organisatie Aanmaken"
6. **Verwacht resultaat**: Nieuwe organisatie moet verschijnen in de lijst

## Test 4: Nieuwe Gebruiker Aanmaken
1. In Super Admin dashboard, klik op "👤 Nieuwe Gebruiker"
2. **Verwacht resultaat**: Modal moet openen
3. **Test**: Selecteer een organisatie en vul gebruiker gegevens in
4. **Test**: Klik "Gebruiker Aanmaken"
5. **Verwacht resultaat**: Nieuwe gebruiker moet verschijnen in de lijst

## Test 5: Reset Functionaliteit
1. Log in als Super Admin
2. Maak een nieuwe organisatie aan
3. Klik op "🔄 Reset" knop
4. **Verwacht resultaat**: Bevestigingsdialog moet verschijnen
5. **Test**: Klik "OK"
6. **Verwacht resultaat**: Pagina moet herladen en login modal moet verschijnen
7. **Test**: Controleer of alle data weg is (nieuwe organisatie niet meer zichtbaar)

## Test 6: Planner Functionaliteit
1. Log in als Super Admin
2. Maak een nieuwe organisatie aan met admin gebruiker
3. Log uit en log in als de nieuwe admin gebruiker
4. Ga naar Planner
5. **Verwacht resultaat**: Planner moet zichtbaar zijn en werkend
6. **Test**: Maak een nieuwe opdracht aan
7. **Test**: Sleep opdracht naar andere datum/tijd

## Test 7: GitHub Pages Specifieke Tests
1. Test op verschillende browsers (Chrome, Firefox, Safari)
2. Test met verschillende netwerk condities (langzaam, offline)
3. **Verwacht resultaat**: App moet altijd werken, ook als CDN's traag zijn
4. **Test**: Controleer console voor errors
5. **Verwacht resultaat**: Geen kritieke errors, alleen waarschuwingen over service worker

## Bekende Issues en Oplossingen

### Als login modal niet verschijnt:
- Hard refresh (Ctrl+F5)
- Controleer console voor JavaScript errors
- Test in incognito/private browsing mode

### Als kalender niet werkt:
- Controleer of FullCalendar geladen is in console
- Test de backup CDN door netwerk te simuleren
- Controleer of dialog polyfill geladen is

### Als Super Admin knoppen niet werken:
- Controleer of je ingelogd bent als Super Admin
- Controleer console voor JavaScript errors
- Test reset functionaliteit om state te clearen

## Success Criteria
- ✅ Login modal verschijnt direct bij laden
- ✅ Kalender is klikbaar en functioneel
- ✅ Super Admin knoppen werken correct
- ✅ Nieuwe organisaties en gebruikers worden opgeslagen
- ✅ Reset functionaliteit werkt
- ✅ Geen kritieke JavaScript errors in console
