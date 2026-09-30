# NawiyApp — Guide Claude

## Projet
Navigation transport informel au Cameroun (Douala + Yaoundé).
Stack : React + Vite + Tailwind (front) / Express + WebSocket + Neon PostgreSQL (back).

## Structure
```
nawiyapp-web/        Frontend (Vercel)
  src/
    pages/           Home.jsx (coordinateur), TaxiDriver.jsx, Driver.jsx
    components/      NavBanner, MapControls, SearchBar, SearchPanel, RouteSheet, TaxiWidget, Onboarding
    hooks/           useNavigation, useGooglePlaces, useSearchHistory, useTaxiPassenger, useTaxiSocket
    lib/             routing.js (OSRM), pathfinder.js, staticData.js, geocoder.js
    store/           mapStore.js, cityStore.js (Zustand)

nawiyapp-backend/    Backend (Render)
  src/
    app.js           Express + toutes les routes
    ws/wsServer.js   WebSocket JWT auth
    routes/          taxi.routes.js, driver.routes.js, auth.routes.js
    db/              pool Neon PostgreSQL
```

## Règles clés
- JWT: utiliser `decoded.id` (pas `decoded.userId`)
- Taxi à la demande : prix au km par catégorie (eco / confort / moto), calculé par le SERVEUR. `nawiyapp-backend/src/lib/pricing.js` et `nawiyapp-web/src/lib/pricing.js` doivent rester identiques (test de parité dans `src/test/pricing.test.js`)
- Chauffeur simulé : seulement avec `DEMO_DRIVER=true` (jamais en production)
- Google Places: clé dans VITE_GOOGLE_MAPS_KEY, restreinte à nawiyapp-web.vercel.app
- OSRM public: `https://router.project-osrm.org`
- Tiles: `https://tiles.openfreemap.org/styles/liberty`
- Langue UI: français camerounais (pas de "vous" formel, "tu" ou neutre)

## Conventions
- Composants: PascalCase, hooks: camelCase préfixé use
- Pas de TypeScript pour l'instant (migration progressive Phase 2)
- Tailwind only, pas de CSS modules
- Framer Motion pour toutes les animations
- `nawiy-green` = #1D9E75, `nawiy-dark` = #0F3528, `nawiy-light` = #E8F5EF

## Branches Git
- `main` — production uniquement, merge depuis develop via PR
- `develop` — intégration continue
- `feature/xxx` — nouvelles fonctionnalités
- `fix/xxx` — corrections

## Variables d'environnement
Frontend (.env) : VITE_GOOGLE_MAPS_KEY, VITE_WS_URL, VITE_API_URL
Backend (.env)  : DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL
