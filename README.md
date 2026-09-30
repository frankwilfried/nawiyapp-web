# NawiyApp — Web

Application de navigation pour le transport informel au Cameroun (Douala + Yaoundé).

## Stack
- **Frontend** : React + Vite + Tailwind CSS + Framer Motion
- **Carte** : MapLibre GL + OpenFreeMap tiles
- **Routing** : OSRM (géométrie réelle des routes)
- **Recherche** : Google Places API (Cameroun)
- **Voix** : Web Speech API (français)
- **État** : Zustand

## Démarrage rapide

```bash
cp .env.example .env
# Remplis VITE_GOOGLE_MAPS_KEY dans .env
npm install
npm run dev
```

## Structure `src/`
```
pages/         Home.jsx (coordinateur), TaxiDriver.jsx, Driver.jsx
components/    NavBanner, MapControls, SearchBar, SearchPanel, RouteSheet, TaxiWidget, Onboarding, SplashScreen
hooks/         useNavigation, useGooglePlaces, useSearchHistory, useTaxiPassenger, useTaxiSocket
lib/           routing.js, pathfinder.js, staticData.js, geocoder.js
store/         mapStore.js, cityStore.js
```

## Variables d'environnement
Voir [.env.example](.env.example).

## Branches
- `main` — production (Vercel auto-deploy)
- `develop` — intégration
- `feature/xxx` — nouvelles fonctionnalités

## Backend
Repo séparé : `nawiyapp-backend` — Express + WebSocket + Neon PostgreSQL (Render).
