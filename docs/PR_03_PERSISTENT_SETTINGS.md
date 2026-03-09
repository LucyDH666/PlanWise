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
- **Non-blocking toasts**: Fouten worden getoond als toast-notificaties
- **UI recovery**: App blijft functioneel na fouten, login-modal blijft toegankelijk

## Success Criteria
- [x] Alle state wijzigingen worden automatisch opgeslagen
- [x] Fouten worden getoond als non-blocking toasts
- [x] App blijft functioneel na fouten
- [x] Data blijft behouden tussen sessies
- [x] Login-modal blijft toegankelijk na fouten
- [x] Geen console errors bij normale operaties
