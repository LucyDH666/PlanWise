# PR 3: Persistente instellingen en foutafhandeling

## Overzicht
Deze PR zorgt ervoor dat alle wijzigingen in instellingen, installaties en gebruikers automatisch worden opgeslagen, en voegt robuuste foutafhandeling toe om de app stabiel te houden.

## Implementatie

### 1. Automatische saveState() calls
- **Toegevoegd**: `saveState()` calls in functies die state wijzigen maar dit nog niet deden
- **Betreft**: `logEventChange()`, `syncInstallationsWithMaintenance()`, en andere state-modificaties
- **Resultaat**: Alle wijzigingen worden nu automatisch persistent opgeslagen

### 2. Foutafhandeling (reeds geïmplementeerd)
- **Global error handling**: `window.onerror` en `window.onunhandledrejection` zijn al actief
- **Non-blocking toasts**: Fouten worden getoond als toast-notificaties in plaats van rode banners
- **UI recovery**: App blijft functioneel na fouten, login-modal blijft toegankelijk

### 3. State persistence verificatie
- **Controle**: Alle functies die state wijzigen roepen nu `saveState()` aan
- **Coverage**: Settings, installations, users, technicians, calendar events, work orders
- **Robustness**: Data blijft behouden tussen sessies en tenant switches

## Technische Details

### Gewijzigde bestanden

#### `app.js`
- **logEventChange()**: Toegevoegd `saveState()` na audit log wijzigingen
- **syncInstallationsWithMaintenance()**: Toegevoegd `saveState()` na asset synchronisatie
- **Verificatie**: Alle bestaande `saveState()` calls gecontroleerd en bevestigd

### Foutafhandeling (reeds aanwezig)
```javascript
// Global error handling - al geïmplementeerd
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', {message, source, lineno, colno, error});
  showErrorToast(`Fout: ${message}`);
  return true; // Prevent default error handling
};

window.onunhandledrejection = function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  showErrorToast(`Promise fout: ${event.reason}`);
};
```

## Testplan

### Unit Tests
```bash
# Test persistent settings
npm test test_persistent_settings.js

# Test error handling
npm test test_error_handling.js
```

### E2E Tests
1. **Settings persistence**:
   - Wijzig instellingen → refresh → wijzigingen blijven
   - Switch tenant → terug → instellingen blijven

2. **Installations persistence**:
   - Voeg installatie toe → refresh → installatie blijft
   - Wijzig installatie → switch tenant → terug → wijzigingen blijven

3. **Users persistence**:
   - Super Admin: maak gebruiker → refresh → gebruiker blijft
   - Wijzig gebruiker → switch tenant → terug → wijzigingen blijven

4. **Error handling**:
   - Simuleer fout → toast verschijnt → app blijft functioneel
   - Login-modal blijft toegankelijk na fouten

## Deployment

### GitHub Pages
- Geen extra configuratie nodig
- Foutafhandeling werkt automatisch
- State persistence werkt met bestaande localStorage

### Lokale ontwikkeling
- Test met `npm run dev`
- Controleer console voor error logs
- Verificeer state persistence tussen sessies

## Success Criteria
- [x] Alle state wijzigingen worden automatisch opgeslagen
- [x] Fouten worden getoond als non-blocking toasts
- [x] App blijft functioneel na fouten
- [x] Data blijft behouden tussen sessies
- [x] Login-modal blijft toegankelijk na fouten
- [x] Geen console errors bij normale operaties

## Bekende Issues
- Geen bekende issues
- Alle foutafhandeling is reeds geïmplementeerd in eerdere PRs

## Volgende Stappen
- PR 4: UX-verbeteringen (progress indicators, case-insensitive search)
- PR 5: AI-ondersteuningslaag voor monteurs
