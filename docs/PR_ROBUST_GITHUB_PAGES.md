# PR: PlanWise GitHub Pages Robuustheid & Tenant Login Verbeteringen

## 🎯 Doel
De GitHub Pages-versie van PlanWise robuuster maken en de tenant-login verbeteren met een geavanceerd slug-beheer systeem.

## 📋 Implementatie Overzicht

### 1. **Slug-beheer bij Login** ✅
- **Login-slug kolom** toegevoegd aan Super Admin organisatie tabel
- **Case-insensitive login** - accepteert zowel slug als organisatienaam
- **Autocomplete dropdown** met beschikbare organisaties
- **Duidelijke foutmeldingen** bij onbekende organisaties
- **Slug generatie** bij organisatie aanmaak (lowercase, geen spaties)

### 2. **Modals en Polyfills (GitHub Pages)** ✅
- **Dialog-polyfill CSS** toegevoegd voor betere compatibiliteit
- **Verbeterde modal registratie** met error handling
- **Stray overlay cleanup** - verwijdert `.modal-backdrop`, `.overlay`, `.fc-popover`
- **Enhanced modal opening** functie met fallback mechanismen
- **FullCalendar 6.1.8** vaste script tag als backup

### 3. **Switch-Tenant Dialog** ✅
- **X en Annuleren knoppen** sluiten modal zonder tenant selectie
- **Login-slug weergave** in dropdown en organisatie info
- **"Ga naar Super Admin"** optie voor superadmin gebruikers

### 4. **Global Error Handling** ✅
- **Window.onerror handler** voor JavaScript errors met toast notifications
- **Window.onunhandledrejection handler** voor promise rejections
- **SafeExecute() utility** voor kritieke operaties met fallbacks
- **UI recovery** - login modal blijft toegankelijk na errors

### 5. **Unit Tests & E2E Tests** ✅
- **Comprehensive unit tests** voor slug-beheer systeem
- **E2E test plan** voor GitHub Pages scenario's

## 🎯 Success Criteria

### Must Pass (100%)
- ✅ Login modal verschijnt bij hard refresh
- ✅ Super Admin login werkt
- ✅ Organisatie aanmaak met slug werkt
- ✅ Case-insensitive login werkt
- ✅ Switch tenant dialog sluit correct
- ✅ Reset app wist alle data
- ✅ Geen console errors
- ✅ Global error handling werkt (toast notifications)
