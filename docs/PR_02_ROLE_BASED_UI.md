# PR 2: Role-based UI Verbeteringen

## 🎯 Doel
Verbeter de role-based UI door correcte rol-mapping te implementeren, Super Admin menu-item te verbergen voor niet-superadmin gebruikers, en Switch Tenant dialog te verbeteren.

## 📋 Implementatie Overzicht

### ✅ **Verbeterde Rol-mapping (`app.js`)**
- **Correcte rol-mapping** - Toon "Super Admin", "Admin", "Planner", "Monteur" of "Viewer"
- **RoleMap object** - Centrale mapping van role strings naar role constants
- **Fallback naar Viewer** - Onbekende rollen worden automatisch gemapped naar Viewer

### ✅ **Super Admin Menu Visibility**
- **Conditionele weergave** - Super Admin menu-item alleen zichtbaar voor superadmin gebruikers
- **Navigation rules** - Update van navigation visibility rules per rol
- **Account dropdown** - Super Admin optie verborgen voor niet-superadmin gebruikers

### ✅ **Switch Tenant Dialog Verbeteringen**
- **Correcte modal closing** - X en Annuleren knoppen sluiten modal zonder tenant selectie
- **Event handler setup** - Proper event handlers voor close buttons
- **Loading states** - Visuele feedback tijdens tenant switching
- **Error handling** - Non-blocking toast notifications

### ✅ **Unit Tests (`tests/test_role_based_ui.js`)**
- **10 test cases** voor alle role-based UI functionaliteit

## 🎯 Success Criteria

### Must Pass (100%)
- ✅ Correcte rol-mapping (geen "Onbekende rol" meer)
- ✅ Super Admin menu verborgen voor niet-superadmin gebruikers
- ✅ Switch Tenant dialog sluit met X en Annuleren knoppen
- ✅ Role-based UI updates correct
- ✅ Geen console errors
