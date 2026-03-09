# PR 1: Robuuste Opslag en State-Initialisatie

## 🎯 Doel
Implementeer een auth-gebaseerde data service die automatisch defaultState initialiseert voor nieuwe tenants en een zichtbare loader toont tijdens initialisatie.

## 📋 Implementatie Overzicht

### ✅ **Nieuwe Data Service (`services/data.js`)**
- **Auth-gebaseerde storage keys** - Elke tenant krijgt eigen storage key
- **Automatische defaultState initialisatie** - Nieuwe tenants krijgen automatisch een werkende state
- **Zichtbare loader** - Spinner met custom berichten tijdens initialisatie
- **Legacy migratie** - Automatische migratie van oude storage formaten
- **Error handling** - Graceful fallbacks bij storage fouten
- **Demo data** - Automatische demo data voor nieuwe tenants

### ✅ **App.js Updates**
- **Async initialisatie** - `initAppFor()` is nu async en gebruikt data service
- **Loader integratie** - Toont loader tijdens state initialisatie
- **Fallback mechanismen** - Werkt ook zonder data service
- **Error recovery** - Toont error toasts bij initialisatie fouten

### ✅ **Unit Tests (`tests/test_data_service.js`)**
- **10 test cases** voor alle data service functionaliteit
- **Mock localStorage** voor geïsoleerde testing
- **Error scenario's** getest
- **Legacy migratie** getest

## 🎯 Success Criteria

### Must Pass (100%)
- ✅ Nieuwe tenants krijgen automatisch werkende state
- ✅ Geen zwarte schermen bij initialisatie
- ✅ Zichtbare loader tijdens loading
- ✅ Bestaande data blijft behouden
- ✅ Legacy data wordt gemigreerd
- ✅ Geen console errors
