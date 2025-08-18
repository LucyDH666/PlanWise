# PlanWise - AI Planner MVP

Een geavanceerd AI-gestuurd planningssysteem voor installateurs en vastgoedbeheer. PlanWise optimaliseert automatisch werkorders op basis van skills, locatie, beschikbaarheid en prioriteit.

## 🚀 Features

### Core Functionaliteit
- **AI Planning Engine** - Geavanceerde optimalisatie met heuristische algoritmes
- **Multi-tenant Support** - Isolatie per organisatie met localStorage simulatie
- **Real-time Dashboard** - FullCalendar integratie met fallback
- **Kanban Planner** - Visuele workflow management
- **Installatie Management** - Asset tracking en onderhoudsplanning
- **PWA Support** - Offline functionaliteit en mobile-first design

### Technische Features
- **API Adapter** - Backend-ready met feature flags
- **Scheduler Service** - Uitgebreide optimalisatie met explainability
- **Service Worker** - Offline caching en background sync
- **Responsive Design** - Glassmorphism UI met moderne styling
- **Multi-role Support** - RBAC simulatie (Admin, Planner, Monteur, Viewer)

## 📋 Quick Start

### 1. Setup
```bash
# Clone repository
git clone <repository-url>
cd PlanWise

# Start lokale server (Python 3)
python -m http.server 8000

# Of met Node.js
npx serve .

# Of met PHP
php -S localhost:8000
```

### 2. Toegang
Open `http://localhost:8000` in je browser

### 3. Demo Login
- **Super Admin**: `superadmin` / `planwise2025!`
- **Demo Tenant**: Automatisch aangemaakt bij eerste bezoek

## 🏗️ Architectuur

### Frontend Stack
- **Vanilla JavaScript** - Geen frameworks, maximale performance
- **HTML5/CSS3** - Moderne web standards
- **FullCalendar** - Kalender integratie (CDN)
- **PWA** - Service Worker + Manifest

### State Management
- **localStorage** - Per-tenant isolatie
- **API Adapter** - Backend-ready interface
- **Multi-tenant** - Organisatie-scoped data

### Services
- **API Service** (`services/api.js`) - Backend communicatie
- **Scheduler Service** (`services/scheduler.js`) - AI optimalisatie
- **Service Worker** (`service-worker.js`) - Offline support

## 🔧 Configuratie

### Environment Variables
```bash
# API Configuration (voor backend integratie)
PLANWISE_API_URL=https://api.planwise.com/v1
PLANWISE_API_KEY=your-api-key

# External Services
GOOGLE_MAPS_API_KEY=your-google-maps-key
OPENAI_API_KEY=your-openai-key

# Feature Flags
ENABLE_REMOTE_API=false
ENABLE_OR_TOOLS=false
```

### Settings Panel
Configureer in de app:
- **Monteurs** - Skills, beschikbaarheid, standplaats
- **Integraties** - Webhooks, API keys, kalender sync
- **Platform Settings** - Multi-tenant configuratie

## 📊 Scheduler Engine

### Optimalisatie Algoritme
1. **Priority Scoring** - SLA deadlines, categorie prioriteit
2. **Skill Matching** - Technicus-klant matching
3. **Travel Matrix** - Reisafstand optimalisatie
4. **Time Windows** - Beschikbaarheid en voorkeuren
5. **Constraint Checking** - Werkuren, max jobs per dag

### Explainability
De scheduler geeft uitleg bij elke voorstel:
- Waarom deze technicus?
- Hoe is de score berekend?
- Welke constraints zijn toegepast?

## 🔐 Beveiliging & GDPR

### Multi-tenant Isolatie
- Per-organisatie data isolatie
- Row-level security simulatie
- Tenant-scoped API calls

### GDPR Compliance
- Data minimalisatie
- Export/delete functionaliteit
- Audit logging
- PII bescherming

### RBAC (Role-Based Access Control)
- **Admin** - Volledige toegang
- **Planner** - Planning en beheer
- **Monteur** - Werkorders en status
- **Viewer** - Alleen bekijken

## 📱 PWA Features

### Offline Functionaliteit
- Service Worker caching
- Background sync
- Offline werkbonnen
- Push notifications

### Mobile Optimized
- Responsive design
- Touch-friendly interface
- Installable app
- Native-like experience

## 🚀 Deployment

### Static Hosting
```bash
# Build voor productie
# (Geen build stap nodig - vanilla JS)

# Deploy naar Netlify/Vercel
netlify deploy --prod

# Of upload naar web server
```

### Backend Integratie
1. Zet `ENABLE_REMOTE_API=true`
2. Configureer `PLANWISE_API_URL`
3. Implementeer backend endpoints
4. Test API communicatie

### Environment Setup
```bash
# Production environment
cp .env.example .env
# Vul API keys en endpoints in
```

## 🧪 Testing

### Manual Testing
```javascript
// Debug helpers in browser console
window.testDashboard()           // Test dashboard functionaliteit
window.schedulerDebug.testOptimization()  // Test scheduler
window.apiDebug.enableRemote()   // Schakel remote API in
```

### Automated Testing
```bash
# E2E tests (toekomstig)
npm run test:e2e

# Unit tests (toekomstig)
npm run test:unit
```

## 📈 Monitoring & Observability

### Logging
- Structured logging via API service
- Console logging voor debugging
- localStorage log storage

### Metrics
- Scheduler performance
- API response times
- User interactions
- Error tracking

### Health Checks
- Service Worker status
- API connectivity
- Cache status
- Database health

## 🔄 Roadmap

### v1.1 (Q1 2025)
- [ ] OR-Tools integratie
- [ ] Real-time kalender sync
- [ ] Advanced RBAC
- [ ] Mobile app

### v1.2 (Q2 2025)
- [ ] Machine Learning optimalisatie
- [ ] Predictive maintenance
- [ ] Customer portal
- [ ] Advanced analytics

### v2.0 (Q3 2025)
- [ ] Microservices architecture
- [ ] Real-time collaboration
- [ ] Advanced reporting
- [ ] API marketplace

## 🤝 Contributing

### Development Setup
1. Fork repository
2. Maak feature branch
3. Implementeer changes
4. Test thoroughly
5. Submit pull request

### Code Standards
- ES6+ JavaScript
- Consistent naming
- Error handling
- Performance optimization
- Accessibility compliance

## 📄 License

MIT License - zie LICENSE bestand voor details.

## 🆘 Support

### Troubleshooting
1. Check browser console voor errors
2. Verifieer localStorage data
3. Test service worker status
4. Controleer API connectivity

### Common Issues
- **FullCalendar niet geladen**: Check CDN connectivity
- **Scheduler errors**: Controleer console logs
- **PWA niet werkend**: Verifieer HTTPS/Service Worker
- **Data loss**: Check localStorage quota

### Contact
- **Issues**: GitHub Issues
- **Documentation**: Wiki
- **Support**: support@planwise.com

---

**PlanWise** - Slimme planning voor slimme bedrijven 🤖📅
