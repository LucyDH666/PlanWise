# Changelog

Alle belangrijke wijzigingen in PlanWise worden hier gedocumenteerd.

## [1.0.0] - 2025-01-14

### 🚀 Added
- **API Adapter Service** (`services/api.js`)
  - Backend-ready interface met feature flags
  - localStorage fallback voor offline gebruik
  - Retry mechanisme en error handling
  - Structured logging en debugging tools

- **Advanced Scheduler Service v2.0** (`services/scheduler.js`)
  - Enhanced heuristische optimalisatie met lock respect
  - Advanced priority scoring met exponential decay
  - Real-world travel matrix met traffic patterns
  - Comprehensive explainability met gedetailleerde redenen
  - Lock respect mechanisme voor vergrendelde afspraken
  - Travel pattern analysis en efficiency scoring
  - Enhanced constraint violation detection met severity levels
  - Fallback proposal generation met travel estimation

- **Enhanced PWA Support v2.0**
  - Advanced Service Worker met offline data caching
  - Enhanced manifest.json met Monteur shortcut
  - Background sync en intelligent caching
  - Push notification support
  - Offline-first Monteur dashboard
  - Work order data persistence
  - Photo upload en signature capture
  - Real-time sync status monitoring

- **Enhanced Dashboard v2.0**
  - Stabilized FullCalendar integration met enhanced error handling
  - Robust drag & drop persistence met validation en conflict detection
  - Live filters en search met keyboard shortcuts (Ctrl+F, Escape)
  - Enhanced event validation en health check systems
  - Improved fallback calendar met week view support
  - Real-time updates met recovery mechanisms
  - Comprehensive audit logging voor calendar changes
  - Enhanced event conflict detection en resolution

- **Installations & Maintenance Integration**
  - Enhanced generateMaintenanceFromContracts() met better calendar integration
  - Improved planAllMaintenance() met priority-based scheduling
  - Advanced maintenance status chips met urgency indicators
  - Better linking naar original installation IDs
  - Enhanced maintenance modal met detailed proposals
  - Contract-based vs preventive maintenance distinction
  - Maintenance event logging en audit trail

- **Monteur Dashboard & Work Orders**
  - Complete Monteur dashboard met takenlijst
  - Interactive work order system met checklist
  - Photo upload functionaliteit met preview
  - Digital signature capture met canvas
  - Materials tracking en notes
  - Offline-first data persistence
  - Navigation integration (Google Maps)
  - Real-time sync status monitoring

- **Role-Based Access Control (RBAC) v2.0**
  - Comprehensive role system (Super Admin, Admin, Planner, Technician, Viewer)
  - Permission-based UI gating en navigation control
  - Role switcher voor testing en development
  - Technician-specific dashboard met taken overzicht
  - Read-only indicators voor viewer role
  - Role-safe function wrappers voor alle acties
  - Enhanced login/registration met role assignment
  - Permission matrix met granular access control
  - UI-based permission enforcement met visual indicators
  - Role-based navigation filtering
  - Form-level permission control
  - Action button permission gating
  - Route-level access control
  - Comprehensive permission checking system

- **Observability & Quality System**
  - Comprehensive logging system met structured logging en context tracking
  - Real-time metrics collection (performance, business, user interaction)
  - Debug panel voor administrators met live metrics en error tracking
  - Performance monitoring voor key functions met execution time tracking
  - Enhanced error handling met global error handlers en user-friendly messages
  - Metrics export functionality voor analysis en monitoring
  - Session tracking en analytics voor user behavior insights

### 🔧 Fixed
- **Critical Bugs**
  - Skeleton cleanup bug in `clearSkeletons()` functie
  - Spread operator typos in installations management
  - Calendar events merge issues
  - Inconsistent fallback function naming
  - Enhanced error handling in toast function
  - Improved UUID generation (RFC 4122 compliant)
  - Enhanced localStorage error handling with user feedback
  - FullCalendar CDN fallback mechanism

- **Dashboard Stability**
  - FullCalendar init/update error handling
  - Event persistence en state management
  - Fallback calendar rendering
  - Error boundaries en recovery
  - Robust calendar event handling with validation
  - Enhanced fallback system with week view support
  - Better FullCalendar integration with proper error boundaries

- **State Management**
  - localStorage key versioning
  - Multi-tenant data isolation
  - Calendar events array initialization
  - Demo data seeding improvements

### 🎨 Improved
- **Code Quality**
  - Modular service architecture
  - Consistent error handling
  - Performance optimizations
  - Code documentation

- **User Experience**
  - Better error messages
  - Loading states en feedback
  - Responsive design improvements
  - Accessibility enhancements

- **Developer Experience**
  - Debug helpers in console
  - API testing tools
  - Scheduler debugging
  - Comprehensive documentation

### 📚 Documentation
- **README.md** - Complete setup en feature overview
- **CHANGELOG.md** - Version tracking
- **Code Comments** - Inline documentation
- **Debug Tools** - Console helpers

### 🔐 Security & Compliance
- **Multi-tenant Isolation** - Per-organisatie data scoping
- **RBAC Simulation** - Role-based access control
- **GDPR Ready** - Data export/delete functionality
- **Audit Logging** - Action tracking

### 📱 Mobile & PWA
- **Service Worker** - Offline caching en sync
- **Manifest** - App installation support
- **Responsive Design** - Mobile-optimized UI
- **Touch Support** - Mobile-friendly interactions

## [0.9.0] - 2024-12-01

### 🚀 Added
- Initial MVP release
- Basic kanban planner
- Simple scheduling logic
- Multi-tenant simulation
- FullCalendar integration

### 🔧 Fixed
- Basic bugs en stability issues
- UI responsiveness
- Data persistence

### 📚 Documentation
- Basic setup instructions
- Feature overview

---

## Versioning

We gebruiken [SemVer](http://semver.org/) voor versioning. Voor beschikbare versies, zie de [tags op deze repository](https://github.com/planwise/planwise/tags).

## Release Notes

### Breaking Changes
- Geen breaking changes in v1.0.0

### Migration Guide
- Geen migratie nodig - backward compatible

### Known Issues
- FullCalendar CDN dependency
- localStorage size limitations
- Service Worker HTTPS requirement

### Upcoming Features
- OR-Tools integration
- Real-time collaboration
- Advanced analytics
- Mobile app
