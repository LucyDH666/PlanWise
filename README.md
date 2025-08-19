# PlanWise Lite

Een moderne, client-only AI Planner applicatie voor installateurs en vastgoedbeheer. PlanWise Lite is volledig gebouwd voor GitHub Pages deployment zonder externe API's of bundlers.

## 🚀 Features

### 🔐 Authenticatie & Beveiliging
- **Lokale authenticatie** - Geen externe servers nodig
- **Role-based access control** - Super Admin, Admin, Planner, Technicus, Viewer
- **Wachtwoord hashing** - Veilige opslag van gebruikersgegevens
- **Session management** - Automatische login herstel

### 🏢 Organisatie Management
- **Multi-tenant architectuur** - Elke organisatie heeft eigen data
- **Organisatie CRUD** - Volledig beheer van organisaties (Super Admin)
- **Gebruikersbeheer** - Toevoegen, bewerken, verwijderen van gebruikers
- **Slug-based routing** - Unieke URLs per organisatie

### 📅 Planner & Planning
- **FullCalendar integratie** - Moderne kalender interface
- **Job management** - Volledig CRUD voor opdrachten
- **Drag & drop planning** - Visuele planning van opdrachten
- **Status tracking** - Nieuw → Gepland → In uitvoering → Voltooid
- **Categorieën** - CV-onderhoud, Loodgieter, Elektra, Airco/Koeling, Algemeen

### 🎨 Moderne UI/UX
- **Glassmorphism design** - Moderne, transparante interface
- **Responsive design** - Werkt op alle apparaten
- **Dark theme** - Oogvriendelijke donkere modus
- **Toast notifications** - Real-time feedback
- **Loading states** - Duidelijke laadindicatoren

### 🔧 Technische Features
- **Hash-based routing** - Geen server-side routing nodig
- **localStorage state management** - Persistente data opslag
- **Error handling** - Robuuste foutafhandeling
- **Log viewer** - Debug en monitoring tools
- **Offline-first** - Werkt zonder internetverbinding

## 📁 Project Structuur

```
PlanWise/
├── index.html              # Hoofdbestand met UI structuur
├── css/
│   └── style.css          # Moderne CSS met glassmorphism
├── js/
│   ├── data.js            # Data service (localStorage)
│   ├── auth.js            # Authenticatie service
│   ├── ui.js              # UI interacties en modals
│   ├── router.js          # Hash-based routing
│   ├── logs.js            # Error logging en debugging
│   └── app.js             # Hoofdapplicatie
└── README.md              # Deze documentatie
```

## 🚀 Deployment op GitHub Pages

### Stap 1: Repository Setup
```bash
# Clone de repository
git clone https://github.com/yourusername/planwise-lite.git
cd planwise-lite

# Voeg alle bestanden toe
git add .

# Commit de wijzigingen
git commit -m "Initial PlanWise Lite release"

# Push naar GitHub
git push origin main
```

### Stap 2: GitHub Pages Activeren
1. Ga naar je GitHub repository
2. Klik op **Settings** tab
3. Scroll naar **Pages** sectie
4. Onder **Source**, selecteer **Deploy from a branch**
5. Kies **main** branch en **/(root)** folder
6. Klik **Save**

### Stap 3: Toegang tot de App
- Je app is nu beschikbaar op: `https://yourusername.github.io/planwise-lite`
- De eerste keer laden kan 1-2 minuten duren

## 🔑 Eerste Gebruik

### 1. Super Admin Seed
1. Open de applicatie
2. Klik op **🔧 Super Admin Seed**
3. Gebruik de credentials:
   - **Organisatie:** `superadmin`
   - **Gebruikersnaam:** `superadmin`
   - **Wachtwoord:** `admin123`

### 2. Nieuwe Organisatie Aanmaken
1. Log in als Super Admin
2. Ga naar **Organisaties**
3. Klik **+ Nieuwe Organisatie**
4. Vul in:
   - **Slug:** `mijn-bedrijf` (alleen kleine letters, cijfers, streepjes)
   - **Naam:** `Mijn Bedrijf BV`
   - **Plan:** `free`

### 3. Gebruiker Aanmaken
1. Ga naar **Gebruikers**
2. Klik **+ Nieuwe Gebruiker**
3. Vul in:
   - **Organisatie:** `mijn-bedrijf`
   - **Gebruikersnaam:** `admin`
   - **E-mail:** `admin@mijnbedrijf.nl`
   - **Wachtwoord:** `wachtwoord123`
   - **Rol:** `admin`

### 4. Inloggen bij Nieuwe Organisatie
1. Log uit
2. Log in met:
   - **Organisatie:** `mijn-bedrijf`
   - **Gebruikersnaam:** `admin`
   - **Wachtwoord:** `wachtwoord123`

## 🎯 Acceptatie Criteria

### ✅ Hard Refresh → Login binnen 1s
- [x] Applicatie laadt snel
- [x] Login scherm verschijnt direct
- [x] Geen externe dependencies die vertragen

### ✅ Super Admin Login
- [x] Super Admin seed werkt
- [x] Super Admin interface zichtbaar
- [x] Alle Super Admin features beschikbaar

### ✅ Nieuwe Organisatie + User → Uitloggen → Inloggen
- [x] Organisatie aanmaken werkt
- [x] Gebruiker aanmaken werkt
- [x] Uitloggen werkt
- [x] Inloggen bij nieuwe organisatie werkt

### ✅ Reset App → Login Terug
- [x] Reset App knop werkt
- [x] Alle data wordt gewist
- [x] Terug naar login scherm

## 🔧 Technische Details

### State Management
- **localStorage keys:**
  - `planwise_auth_v1` - Authenticatie data
  - `planwise_users_v1` - Gebruikers data
  - `planwise_<slug>_v1` - Organisatie-specifieke data

### Permissions
- **Super Admin:** Alle rechten
- **Admin:** Dashboard, Planner (edit), Settings, Users
- **Planner:** Dashboard, Planner (edit), Settings (view)
- **Technicus:** Dashboard, Planner (view), Settings (view)
- **Viewer:** Dashboard, Planner (view)

### Error Handling
- **Global error handlers** voor JavaScript errors
- **Promise rejection handling**
- **Toast notifications** voor user feedback
- **Log viewer** voor debugging (Ctrl+Shift+L)

### Browser Support
- **Modern browsers** (Chrome, Firefox, Safari, Edge)
- **ES6+ features** gebruikt
- **localStorage** voor data persistence
- **CSS Grid & Flexbox** voor layout

## 🛠️ Development

### Lokale Ontwikkeling
```bash
# Start een lokale server (Python 3)
python -m http.server 8000

# Of met Node.js
npx serve .

# Open in browser
open http://localhost:8000
```

### Debugging
- **Log viewer:** Druk `Ctrl+Shift+L` om logs te bekijken
- **Console:** Alle logs worden ook naar console geschreven
- **localStorage:** Bekijk browser dev tools voor data inspectie

### Customization
- **CSS variables** in `css/style.css` voor theming
- **Permissions** in `js/auth.js` voor role management
- **Categories** in `js/data.js` voor job types

## 📊 Data Export/Import

### Export Data
```javascript
// Export organisatie data
const data = window.dataService.exportData('mijn-bedrijf');
window.uiService.downloadJSON(data, 'planwise-export.json');
```

### Import Data
```javascript
// Import organisatie data
const importedData = JSON.parse(jsonString);
window.dataService.importData('nieuwe-organisatie', importedData);
```

## 🔒 Security Considerations

### Lokale Opslag
- **localStorage** is niet versleuteld
- **Wachtwoorden** worden gehashed (maar niet met bcrypt)
- **Geen HTTPS** vereist voor lokale ontwikkeling

### Productie Gebruik
- **HTTPS** aanbevolen voor productie
- **Sterkere hashing** implementeren
- **Data backup** strategie ontwikkelen

## 🤝 Bijdragen

1. Fork de repository
2. Maak een feature branch (`git checkout -b feature/amazing-feature`)
3. Commit je wijzigingen (`git commit -m 'Add amazing feature'`)
4. Push naar de branch (`git push origin feature/amazing-feature`)
5. Open een Pull Request

## 📄 Licentie

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## 🆘 Support

Voor vragen of problemen:
1. Bekijk de logs met `Ctrl+Shift+L`
2. Check de browser console voor errors
3. Open een issue op GitHub
4. Neem contact op via de repository

---

**PlanWise Lite** - Moderne planning voor installateurs & vastgoedbeheer 🚀
