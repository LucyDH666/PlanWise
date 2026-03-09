# PR 4: UX-verbeteringen

## Overzicht
Deze PR voegt belangrijke UX-verbeteringen toe aan PlanWise, waaronder progress-indicators op alle views, een slug-tooltip in de login-modal, en case-insensitive zoekfunctionaliteit.

## Implementatie

### 1. Progress-indicators op alle views
- **Toegevoegd**: `showViewLoader()` en `hideViewLoader()` functies
- **Betreft**: Dashboard, Planner, Installaties, Instellingen, en Super Admin views
- **Resultaat**: Gebruikers zien een spinner tijdens het laden van data

### 2. Slug-tooltip in login-modal
- **Toegevoegd**: Help-knop (❓) naast het bedrijfsnaam veld
- **Functionaliteit**: Toont een dropdown met alle beschikbare organisaties en hun slugs

### 3. Case-insensitive zoekfunctionaliteit
- **Verbeterd**: Alle zoekvelden zijn nu case-insensitive
- **Betreft**: Planner zoekveld en installaties zoekveld

## Success Criteria
- [x] Alle views tonen progress indicators tijdens laden
- [x] Login modal heeft werkende slug help tooltip
- [x] Alle zoekvelden zijn case-insensitive
- [x] Geen console errors bij normale operaties
- [x] Alle tests slagen
