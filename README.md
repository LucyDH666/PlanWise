# PlanWise Lite - Core

Een minimale, client-only planning applicatie voor technische dienstverlening.

## Doelen

- **Simpel**: Geen externe API's, bundlers of complexe dependencies
- **Stabiel**: Werkt 100% via GitHub Pages (statische hosting)
- **Veilig**: Geen recursieve login/seed problemen
- **Leesbaar**: Duidelijke code structuur zonder dode code

## Lokale ontwikkeling

1. Clone de repository
2. Start een lokale HTTP server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (npx)
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in je browser

## GitHub Pages deployment

1. Push naar `main` branch
2. Ga naar Settings > Pages
3. Selecteer "Deploy from a branch"
4. Kies `main` branch en `/ (root)` folder
5. De app is beschikbaar op `https://[username].github.io/[repo-name]`

## Standaard login

- **Organisatie**: `superadmin`
- **Gebruiker**: `superadmin`
- **Wachtwoord**: `admin123`

## Rollen

- **Superadmin**: Volledige toegang, kan organisaties en gebruikers beheren
- **Admin**: Beheer binnen eigen organisatie
- **Planner**: Planning en afspraken beheer
- **Monteur**: Werkorders en taken
- **Viewer**: Alleen-lezen toegang

## Technische details

- **Frontend**: Vanilla HTML/CSS/JavaScript (ES modules)
- **Opslag**: localStorage met `planwise_*` keys
- **Router**: Hash-based routing
- **State**: Per organisatie geïsoleerd
