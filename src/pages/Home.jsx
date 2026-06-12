import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCityStore } from '../store/cityStore';
import { useMapStore } from '../store/mapStore';
import { buildGraph } from '../lib/staticData';
import { findPath } from '../lib/pathfinder';
import { applyPeakMultiplier, isPeakHour } from '../lib/geocoder';
import { getRoadGeometry, findNearestNode } from '../lib/routing';
import SplashScreen from '../components/SplashScreen';
import { useTaxiPassenger } from '../hooks/useTaxiPassenger';

const TAXI_PRICE = 3000; // Prix fixe pour toutes les courses

const TRANSPORT_ICONS = {
  taxi_collectif: '🚕',
  moto_taxi:      '🛵',
  minibus:        '🚌',
  a_pied:         '🚶',
};
const TRANSPORT_LABELS = {
  taxi_collectif: 'Taxi collectif',
  moto_taxi:      'Moto-taxi',
  minibus:        'Minibus',
  a_pied:         'À pied',
};
const TYPE_COLORS = {
  carrefour:  '#E85D3A',
  quartier:   '#1D9E75',
  marche:     '#D4A017',
  universite: '#3B82F6',
  transport:  '#8B5CF6',
  autre:      '#6B7280',
};

export default function Home() {
  const { selectedCity, setCity } = useCityStore();
  const { userPosition, setUserPosition, isFollowingUser, stopFollowingUser, startFollowingUser } = useMapStore();

  const mapContainer   = useRef(null);
  const map            = useRef(null);
  const userMarker     = useRef(null);
  const routeMarkers   = useRef([]);
  const etaIntervalRef = useRef(null);

  const [showSplash, setShowSplash]   = useState(true);
  const [graph, setGraph]             = useState(null);
  const [nodes, setNodes]             = useState([]);

  // Search
  const [searchOpen, setSearchOpen]   = useState(false);
  const [fromText, setFromText]       = useState('');
  const [toText, setToText]           = useState('');
  const [fromNode, setFromNode]       = useState(null);
  const [toNode, setToNode]           = useState(null);
  const [fromSugg, setFromSugg]       = useState([]);
  const [toSugg, setToSugg]           = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'from' | 'to'
  const [suggLoading, setSuggLoading] = useState(false);

  // Result
  const [result, setResult]           = useState(null);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [searchError, setSearchError] = useState('');

  // Taxi inline — modèle Uber
  // idle → searching → driver_found → driver_arrived → in_progress → completed
  const [taxiMode, setTaxiMode]       = useState('idle');
  const [taxiRideId, setTaxiRideId]   = useState(null);
  const [taxiDriver, setTaxiDriver]   = useState(null);
  const [taxiEta, setTaxiEta]         = useState(null);   // minutes restantes
  const [taxiRating, setTaxiRating]   = useState(0);      // note donnée
  const [taxiFinalPrice, setTaxiFinalPrice] = useState(null);

  const { send: taxiSend, connected: taxiConnected } = useTaxiPassenger({
    'ride:created': ({ ride }) => setTaxiRideId(ride.id),

    'ride:confirmed': (data) => {
      setTaxiDriver(data.driver);
      setTaxiFinalPrice(data.final_price);
      const eta = data.eta_min || 3;
      setTaxiEta(eta);
      setTaxiMode('driver_found');

      // Compte à rebours ETA
      clearInterval(etaIntervalRef.current);
      etaIntervalRef.current = setInterval(() => {
        setTaxiEta(prev => {
          if (prev <= 1) { clearInterval(etaIntervalRef.current); return 0; }
          return prev - 1;
        });
      }, 8000); // 8s par minute (accéléré pour la démo)
    },

    'ride:driver_arrived': () => {
      clearInterval(etaIntervalRef.current);
      setTaxiEta(0);
      setTaxiMode('driver_arrived');
      // Course démarre auto après 5s
      setTimeout(() => setTaxiMode('in_progress'), 5000);
    },

    'ride:completed': (data) => {
      setTaxiFinalPrice(data.final_price);
      setTaxiMode('completed');
    },

    'ride:cancelled': () => {
      clearInterval(etaIntervalRef.current);
      setTaxiMode('idle');
    },
  });

  // Charge les données statiques
  useEffect(() => {
    const g = buildGraph(selectedCity);
    setGraph(g);
    setNodes(g.nodes);
    setResult(null);
    setFromNode(null); setToNode(null);
    setFromText(''); setToText('');
  }, [selectedCity]);

  // Init carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const city = selectedCity === 'douala'
      ? { center: [9.7085, 4.0511], zoom: 13 }
      : { center: [11.5167, 3.8667], zoom: 13 };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: city.center,
      zoom: city.zoom,
      pitch: 30,
      bearing: 0,
    });

    map.current.on('dragstart', () => stopFollowingUser());

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // Marqueurs points focaux
  useEffect(() => {
    if (!map.current || nodes.length === 0) return;

    // Attendre que la carte soit chargée
    const addMarkers = () => {
      // Supprime anciens marqueurs
      routeMarkers.current.forEach(m => m.remove());
      routeMarkers.current = [];

      nodes.forEach(node => {
        const el = document.createElement('div');
        el.className = 'focal-marker';
        el.style.cssText = `
          width: 12px; height: 12px;
          border-radius: 50%;
          background: ${TYPE_COLORS[node.type] || '#6B7280'};
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        `;
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.6)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        const popup = new maplibregl.Popup({ offset: 12, closeButton: false, className: 'nawiy-popup' })
          .setHTML(`<div style="font-family:Arial;font-size:13px;font-weight:600;color:#1A3C34">${node.name}</div>
                    <div style="font-size:11px;color:#888;margin-top:2px">${node.type}</div>`);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([node.lng, node.lat])
          .setPopup(popup)
          .addTo(map.current);

        // Clic → sélectionne comme départ ou destination
        el.addEventListener('click', () => {
          if (!fromNode) {
            setFromText(node.name); setFromNode(node);
          } else if (!toNode && node.id !== fromNode.id) {
            setToText(node.name); setToNode(node);
          }
        });

        routeMarkers.current.push(marker);
      });
    };

    if (map.current.loaded()) addMarkers();
    else map.current.on('load', addMarkers);
  }, [nodes, map.current]);

  // GPS utilisateur
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(pos => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPosition(coords);

      if (!userMarker.current && map.current) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="position:relative;width:20px;height:20px">
            <div style="position:absolute;inset:0;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5);z-index:2"></div>
            <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(66,133,244,0.2);animation:pulse 2s infinite"></div>
          </div>`;
        userMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map.current);
      } else if (userMarker.current) {
        userMarker.current.setLngLat([coords.lng, coords.lat]);
      }

      if (isFollowingUser && map.current) {
        map.current.easeTo({ center: [coords.lng, coords.lat], duration: 500 });
      }
    }, null, { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isFollowingUser]);

  // Dessine le trajet sur la carte (suit les vraies routes via OSRM)
  const drawRoute = useCallback(async (path, walkingIntro = null) => {
    if (!map.current) return;

    // Supprime l'ancien tracé
    ['route-line','route-walk','route-line-bg'].forEach(id => {
      if (map.current.getLayer(id)) map.current.removeLayer(id);
    });
    ['route','route-walk-src'].forEach(id => {
      if (map.current.getSource(id)) map.current.removeSource(id);
    });

    // Collecte les waypoints du trajet (départ + tous les points intermédiaires + arrivée)
    const waypoints = [];
    if (walkingIntro) waypoints.push({ lat: walkingIntro.fromLat, lng: walkingIntro.fromLng });
    path.forEach((step, i) => {
      waypoints.push({ lat: step.from.lat, lng: step.from.lng });
      if (i === path.length - 1) waypoints.push({ lat: step.to.lat, lng: step.to.lng });
    });

    // Essaie d'obtenir la géométrie réelle via OSRM
    let roadCoords = await getRoadGeometry(waypoints, 'driving');

    // Fallback : ligne droite entre waypoints
    if (!roadCoords) {
      roadCoords = waypoints.map(p => [p.lng, p.lat]);
    }

    // Tracé marche à pied (si départ GPS)
    if (walkingIntro) {
      const walkCoords = roadCoords.slice(0, Math.ceil(roadCoords.length * 0.15)) || [
        [walkingIntro.fromLng, walkingIntro.fromLat],
        [waypoints[1].lng, waypoints[1].lat],
      ];
      const walkWaypoints = [
        { lat: walkingIntro.fromLat, lng: walkingIntro.fromLng },
        { lat: path[0].from.lat,    lng: path[0].from.lng },
      ];
      const walkRoad = await getRoadGeometry(walkWaypoints, 'walking');
      const wCoords = walkRoad || walkWaypoints.map(p => [p.lng, p.lat]);

      map.current.addSource('route-walk-src', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: wCoords } }
      });
      map.current.addLayer({
        id: 'route-walk',
        type: 'line',
        source: 'route-walk-src',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#6B7280', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.8 }
      });
    }

    // Tracé principal — contour blanc + ligne verte
    map.current.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: roadCoords } }
    });
    map.current.addLayer({
      id: 'route-line-bg',
      type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.6 }
    });
    map.current.addLayer({
      id: 'route-line',
      type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#1D9E75', 'line-width': 5, 'line-opacity': 1 }
    });

    // Zoom sur tout le tracé
    const allCoords = roadCoords;
    const bounds = allCoords.reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(allCoords[0], allCoords[0])
    );
    map.current.fitBounds(bounds, { padding: 80, duration: 800 });
  }, []);

  // Utilise la position GPS comme départ
  const useMyPosition = () => {
    if (!userPosition) { setSearchError('Position GPS non disponible'); return; }
    const nearest = findNearestNode(userPosition.lat, userPosition.lng, nodes);
    if (!nearest) return;
    setFromText('📍 Ma position');
    setFromNode({ ...nearest.node, _walkFrom: userPosition, _walkMin: nearest.walkMinutes, _walkDist: nearest.distanceKm });
    setActiveInput('to');
    setFromSugg([]);
  };

  // Recherche itinéraire
  const handleSearch = () => {
    setSearchError('');
    if (!fromNode || !toNode) { setSearchError('Sélectionne départ et destination'); return; }

    // Départ depuis GPS → utilise le nœud focal le plus proche comme vrai départ Dijkstra
    const actualFromId = fromNode._walkFrom ? fromNode.id : fromNode.id;
    const res = findPath(graph, actualFromId, toNode.id);
    if (!res.found) {
      setSearchError(res.error === 'NO_PATH' ? 'Aucun itinéraire trouvé' : 'Erreur de calcul');
      return;
    }

    // Ajoute le temps de marche si départ GPS
    const walkMin = fromNode._walkMin || 0;
    const augmented = {
      ...res,
      total_duration_min: applyPeakMultiplier(res.total_duration_min) + walkMin,
      total_price_fcfa: res.total_price_fcfa,
      walkingIntro: fromNode._walkFrom ? {
        fromLat:    fromNode._walkFrom.lat,
        fromLng:    fromNode._walkFrom.lng,
        toName:     fromNode.name,
        minutes:    walkMin,
        distanceKm: fromNode._walkDist,
      } : null,
    };
    setResult(augmented);
    setSearchOpen(false);
    setSheetOpen(true);
    drawRoute(res.path, augmented.walkingIntro);
  };

  const suggestDebounce = useRef(null);
  const suggest = (val, setter) => {
    if (!val || val.length < 2) { setter([]); setSuggLoading(false); return; }
    setSuggLoading(true);
    clearTimeout(suggestDebounce.current);
    suggestDebounce.current = setTimeout(async () => {
      // D'abord cherche dans les nœuds locaux (transport connu)
      const q = val.toLowerCase();
      const local = nodes.filter(n => n.name.toLowerCase().includes(q)).slice(0, 3);

      // Puis Nominatim pour les lieux OSM
      try {
        const city = selectedCity === 'yaounde' ? 'Yaoundé' : 'Douala';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ' ' + city + ' Cameroun')}&format=json&limit=5&countrycodes=cm&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
        const data = await res.json();
        const osm = data.map(p => ({
          id:   'osm_' + p.osm_id,
          name: p.display_name.split(',').slice(0,2).join(', '),
          lat:  parseFloat(p.lat),
          lng:  parseFloat(p.lon),
          type: 'osm',
        }));
        // Fusionne : nœuds locaux en premier (ils ont les données transport)
        const seen = new Set(local.map(n => n.name.toLowerCase()));
        const merged = [...local, ...osm.filter(o => !seen.has(o.name.toLowerCase()))].slice(0, 7);
        setter(merged);
      } catch {
        setter(local);
      } finally {
        setSuggLoading(false);
      }
    }, 300);
  };

  const clearRoute = () => {
    setResult(null); setSheetOpen(false);
    setFromNode(null); setToNode(null);
    setFromText(''); setToText('');
    if (map.current?.getLayer('route-line')) map.current.removeLayer('route-line');
    if (map.current?.getSource('route')) map.current.removeSource('route');
  };

  const shareWhatsApp = () => {
    const txt = `🗺️ NawiyApp\n${fromText} → ${toText}\n⏱ ${result.total_duration_min} min | 💰 ${result.total_price_fcfa} FCFA\n\n` +
      result.path.map((s, i) => `${i+1}. ${TRANSPORT_ICONS[s.transport]} ${s.from.name} → ${s.to.name} (${s.duration_min}min, ${s.price_fcfa}F)`).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  };

  const requestTaxi = () => {
    if (!fromNode || !toNode) return;
    setTaxiMode('searching');
    taxiSend('ride:request', {
      from_lat: fromNode.lat, from_lng: fromNode.lng, from_name: fromText,
      to_lat:   toNode.lat,   to_lng:   toNode.lng,   to_name:  toText,
      proposed_price: TAXI_PRICE,
      city_slug: selectedCity,
    });
  };

  const cancelTaxi = () => {
    clearInterval(etaIntervalRef.current);
    if (taxiRideId) taxiSend('ride:cancel', { ride_id: taxiRideId });
    setTaxiMode('idle');
    setTaxiRideId(null);
    setTaxiDriver(null);
    setTaxiEta(null);
    setTaxiFinalPrice(null);
    setTaxiRating(0);
  };

  const submitRating = (score) => {
    setTaxiRating(score);
    setTimeout(() => cancelTaxi(), 1500);
  };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.5);opacity:0} }
        .nawiy-popup .maplibregl-popup-content { border-radius:12px; padding:10px 14px; box-shadow:0 4px 20px rgba(0,0,0,0.15); border:none; }
        .nawiy-popup .maplibregl-popup-tip { border-top-color:white; }
        .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left { display:none; }
      `}</style>

      {/* Splash */}
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* Carte plein écran */}
      <div ref={mapContainer} className="fixed inset-0 w-full h-full" />

      {/* ── Barre de recherche flottante ── */}
      <div className="fixed top-0 left-0 right-0 z-20 p-3 pointer-events-none">
        <div className="pointer-events-auto">

          {/* Sélecteur de ville */}
          <div className="flex justify-center mb-2">
            <div className="bg-white/90 backdrop-blur rounded-full shadow-lg flex p-1 gap-1">
              {['douala','yaounde'].map(c => (
                <button key={c}
                  onClick={() => { setCity(c); clearRoute(); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition
                    ${selectedCity === c ? 'bg-nawiy-green text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {c === 'douala' ? 'Douala' : 'Yaoundé'}
                </button>
              ))}
            </div>
          </div>

          {/* Barre principale */}
          {!result ? (
            <div
              className="bg-white rounded-2xl shadow-xl mx-auto max-w-md cursor-pointer overflow-hidden"
              onClick={() => { setSearchOpen(true); setActiveInput('from'); }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full bg-nawiy-light flex items-center justify-center flex-shrink-0">
                  <span className="text-nawiy-green font-bold text-sm">N</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">
                    {fromNode ? fromNode.name : "D'où tu pars ?"}
                  </div>
                  {fromNode && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      → {toNode ? toNode.name : 'Où vas-tu ?'}
                    </div>
                  )}
                  {!fromNode && <div className="text-xs text-gray-400 mt-0.5">Trouver un itinéraire</div>}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          ) : (
            /* Barre résumé résultat */
            <div className="bg-nawiy-green text-white rounded-2xl shadow-xl mx-auto max-w-md px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold text-sm">{fromText} → {toText}</div>
                <div className="text-xs text-white/80 mt-0.5">
                  {result.total_duration_min} min • {result.total_price_fcfa} FCFA
                  {result.walkingIntro && <span className="opacity-70"> • 🚶 {result.walkingIntro.minutes} min à pied</span>}
                </div>
              </div>
              <button onClick={clearRoute} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                <span className="text-sm">✕</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Boutons flottants droite ── */}
      <div className="fixed right-4 bottom-48 z-20 flex flex-col gap-2">
        <button
          onClick={() => {
            startFollowingUser();
            if (userPosition && map.current) {
              map.current.easeTo({ center: [userPosition.lng, userPosition.lat], zoom: 15, duration: 600 });
            }
          }}
          className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition"
          title="Ma position"
        >
          <svg className="w-5 h-5 text-nawiy-green" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7zm0 9.5A2.5 2.5 0 1012 6.5a2.5 2.5 0 000 5z"/>
          </svg>
        </button>

        <a href="/driver"
          className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition text-lg"
          title="Mode Chauffeur collectif"
        >🚌</a>

        <a href="/taxi/driver"
          className="w-11 h-11 bg-nawiy-dark rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition text-lg"
          title="Mode Chauffeur Taxi"
        >🚕</a>
      </div>

      {/* ── Légende ── */}
      <div className="fixed left-3 bottom-48 z-20">
        <div className="bg-white/90 backdrop-blur rounded-xl shadow-md p-2.5 flex flex-col gap-1.5">
          {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'autre').map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-gray-600 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Heure de pointe ── */}
      <AnimatePresence>
        {isPeakHour() && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-20 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold"
          >
            ⚠️ Heure de pointe — durées majorées
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panel de recherche (plein écran) ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-40 bg-white flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
              <button onClick={() => setSearchOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-600">←</span>
              </button>
              <h2 className="font-semibold text-gray-800">Trouver un itinéraire</h2>
            </div>

            {/* Inputs */}
            <div className="px-4 py-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-nawiy-green" />
                  <input autoFocus={activeInput === 'from'}
                    value={fromText} placeholder="Point de départ..."
                    onFocus={() => setActiveInput('from')}
                    onChange={e => { setFromText(e.target.value); setFromNode(null); suggest(e.target.value, setFromSugg); }}
                    className="w-full bg-gray-50 rounded-xl pl-9 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                  />
                  {fromText
                    ? <button onClick={() => { setFromText(''); setFromNode(null); setFromSugg([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>
                    : <button onClick={useMyPosition} title="Utiliser ma position GPS"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-nawiy-green/10 hover:bg-nawiy-green/20 flex items-center justify-center transition text-base">
                        📍
                      </button>
                  }
                </div>
                {/* Raccourci "Ma position" ancré sous le champ — toujours visible si départ non défini */}
                {!fromNode && (
                  <button onClick={useMyPosition}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-nawiy-light hover:bg-green-100 transition text-left w-full">
                    <span className="text-base leading-none">📍</span>
                    <div>
                      <span className="text-sm font-semibold text-nawiy-green">Ma position</span>
                      <span className="text-xs text-gray-400 ml-1">
                        {userPosition ? '· GPS actif' : '· GPS requis'}
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-400" />
                <input
                  value={toText} placeholder="Destination..."
                  onFocus={() => setActiveInput('to')}
                  onChange={e => { setToText(e.target.value); setToNode(null); suggest(e.target.value, setToSugg); }}
                  className="w-full bg-gray-50 rounded-xl pl-9 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                />
                {toText && <button onClick={() => { setToText(''); setToNode(null); setToSugg([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>}
              </div>

              {searchError && <p className="text-red-500 text-sm px-1">{searchError}</p>}

              <button onClick={handleSearch} disabled={!fromNode || !toNode}
                className="bg-nawiy-green text-white rounded-xl py-3.5 font-semibold disabled:opacity-40 hover:bg-nawiy-dark transition"
              >
                Rechercher l'itinéraire
              </button>
            </div>

            {/* Suggestions dynamiques */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">

              {/* Résultats de recherche (apparaissent dès 1 caractère) */}
              {(() => {
                const sugg = activeInput === 'from' ? fromSugg : toSugg;
                const currentText = activeInput === 'from' ? fromText : toText;

                if (currentText && currentText !== '📍 Ma position' && sugg.length === 0) {
                  if (suggLoading) return (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-nawiy-green/30 border-t-nawiy-green rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Recherche en cours…</p>
                    </div>
                  );
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">Aucun résultat pour "{currentText}"</p>
                      <p className="text-gray-300 text-xs mt-1">Essaie : Akwa, Bonaberi, Deido...</p>
                    </div>
                  );
                }

                if (sugg.length > 0) {
                  return (
                    <>
                      <p className="text-xs text-gray-400 font-semibold uppercase mb-2 px-1">
                        {sugg.length} résultat{sugg.length > 1 ? 's' : ''}
                      </p>
                      {sugg.map(n => (
                        <button key={n.id}
                          onClick={() => {
                            if (activeInput === 'from') { setFromText(n.name); setFromNode(n); setFromSugg([]); setActiveInput('to'); }
                            else { setToText(n.name); setToNode(n); setToSugg([]); }
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition"
                        >
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: TYPE_COLORS[n.type] + '20' }}>
                            <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[n.type] }} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-800">{n.name}</div>
                            <div className="text-xs text-gray-400 capitalize">{n.type}</div>
                          </div>
                        </button>
                      ))}
                    </>
                  );
                }

                // Aucun texte → message d'invitation
                return (
                  <div className="text-center py-10">
                    <div className="text-3xl mb-3">🔍</div>
                    <p className="text-gray-400 text-sm">
                      {activeInput === 'from' ? 'Tape ton point de départ' : 'Tape ta destination'}
                    </p>
                    <p className="text-gray-300 text-xs mt-1">Ex : Akwa, Bonaberi, Marché Central...</p>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Sheet résultat ── */}
      <AnimatePresence>
        {sheetOpen && result && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header trajet */}
            <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{fromText} → {toText}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{result.path.length} étape{result.path.length > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => { setSheetOpen(false); setTaxiMode('idle'); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
            </div>

            {/* ── Deux options côte à côte ── */}
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="grid grid-cols-2 gap-3">

                {/* Option 1 : Transport informel */}
                <div className="bg-nawiy-light rounded-2xl p-3">
                  <div className="text-xs text-nawiy-dark font-semibold mb-2">🚌 Transport informel</div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-xl font-bold text-nawiy-green">{result.total_duration_min}</span>
                    <span className="text-xs text-gray-500">min</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-nawiy-dark">{result.total_price_fcfa}</span>
                    <span className="text-xs text-gray-500">FCFA</span>
                  </div>
                  <button onClick={shareWhatsApp}
                    className="mt-2 w-full bg-white text-green-600 text-xs font-medium py-1.5 rounded-xl border border-green-200 hover:bg-green-50 transition">
                    📤 Partager
                  </button>
                </div>

                {/* Option 2 : Taxi course */}
                <div className="bg-gray-900 rounded-2xl p-3">
                  <div className="text-xs text-white/60 font-semibold mb-2">🚕 Taxi course</div>

                  {/* ── idle ── */}
                  {taxiMode === 'idle' && (
                    <>
                      <div className="flex items-baseline gap-1 mb-0.5">
                        <span className="text-xl font-bold text-white">{TAXI_PRICE.toLocaleString()}</span>
                        <span className="text-xs text-white/50">FCFA</span>
                      </div>
                      <div className="text-xs text-white/40 mb-2.5">Trajet direct · Prix fixe</div>
                      <button onClick={requestTaxi}
                        className="w-full bg-nawiy-green text-white text-xs font-bold py-2 rounded-xl hover:bg-green-500 transition active:scale-95">
                        Demander →
                      </button>
                    </>
                  )}

                  {/* ── searching ── */}
                  {taxiMode === 'searching' && (
                    <div className="flex flex-col items-center py-1 gap-2">
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-nawiy-green/20 animate-ping" />
                        <div className="absolute inset-1 rounded-full bg-nawiy-green/30 animate-ping" style={{animationDelay:'0.3s'}} />
                        <span className="relative text-lg z-10">🚕</span>
                      </div>
                      <div className="text-white text-xs font-semibold text-center">Recherche un chauffeur...</div>
                      <button onClick={cancelTaxi} className="text-white/40 text-xs hover:text-white/70 transition">Annuler</button>
                    </div>
                  )}

                  {/* ── driver_found ── */}
                  {taxiMode === 'driver_found' && taxiDriver && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-nawiy-green/20 flex items-center justify-center text-base flex-shrink-0">🧑🏾</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-bold truncate">{taxiDriver.name}</div>
                          <div className="text-white/50 text-xs">{taxiDriver.plate} · ⭐ {taxiDriver.rating}</div>
                        </div>
                      </div>
                      <div className="bg-nawiy-green/10 rounded-lg px-2 py-1 flex items-center justify-between">
                        <span className="text-white/60 text-xs">Arrive dans</span>
                        <span className="text-nawiy-green font-bold text-sm">{taxiEta} min</span>
                      </div>
                      <div className="text-xs text-white/40 text-center">{taxiDriver.vehicle_model}</div>
                      <div className="flex gap-1.5 mt-0.5">
                        <a href={`tel:${taxiDriver.phone}`}
                          className="flex-1 bg-white/10 text-white text-xs py-1.5 rounded-lg text-center hover:bg-white/20 transition">
                          📞 Appeler
                        </a>
                        <button onClick={cancelTaxi}
                          className="flex-1 bg-red-500/20 text-red-300 text-xs py-1.5 rounded-lg hover:bg-red-500/30 transition">
                          ✕ Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── driver_arrived ── */}
                  {taxiMode === 'driver_arrived' && taxiDriver && (
                    <div className="flex flex-col items-center gap-2 py-1">
                      <div className="w-10 h-10 rounded-full bg-nawiy-green/20 flex items-center justify-center text-xl">🚕</div>
                      <div className="text-nawiy-green text-xs font-bold text-center">Chauffeur arrivé !</div>
                      <div className="text-white/60 text-xs text-center">{taxiDriver.name} vous attend</div>
                      <div className="text-white/40 text-xs text-center italic">{taxiDriver.plate}</div>
                    </div>
                  )}

                  {/* ── in_progress ── */}
                  {taxiMode === 'in_progress' && (
                    <div className="flex flex-col items-center gap-2 py-1">
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full bg-nawiy-green/30 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center text-xl">🚗</div>
                      </div>
                      <div className="text-white text-xs font-bold text-center">Course en cours</div>
                      <div className="text-white/50 text-xs text-center">{fromText} → {toText}</div>
                    </div>
                  )}

                  {/* ── completed — notation ── */}
                  {taxiMode === 'completed' && (
                    <div className="flex flex-col gap-2">
                      <div className="text-nawiy-green text-xs font-bold text-center">✅ Course terminée !</div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <div className="text-white text-sm font-bold">{(taxiFinalPrice || TAXI_PRICE).toLocaleString()} FCFA</div>
                        <div className="text-white/40 text-xs">Prix final</div>
                      </div>
                      {taxiRating === 0 ? (
                        <>
                          <div className="text-white/60 text-xs text-center">Note ta course</div>
                          <div className="flex justify-center gap-1">
                            {[1,2,3,4,5].map(star => (
                              <button key={star} onClick={() => submitRating(star)}
                                className="text-xl hover:scale-125 transition-transform">
                                ⭐
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="text-nawiy-green text-xs font-semibold">Merci pour ta note ! {'⭐'.repeat(taxiRating)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Étapes transport informel ── */}
            <div className="overflow-y-auto flex-1 px-5 pb-4">
              <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Détail de l'itinéraire</p>
              <div className="flex flex-col">

                {/* Étape de marche si départ GPS */}
                {result.walkingIntro && (
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0 w-8">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base">🚶</div>
                      <div className="w-0.5 h-5 bg-gray-200 my-1" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-sm font-medium text-gray-800">📍 Ma position</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        À pied · {result.walkingIntro.minutes} min · {(result.walkingIntro.distanceKm * 1000).toFixed(0)} m
                        <span className="ml-1 text-gray-300">→ {result.walkingIntro.toName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {result.path.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0 w-8">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                        style={{ background: TYPE_COLORS[step.from.type] + '20' }}>
                        {TRANSPORT_ICONS[step.transport]}
                      </div>
                      {i < result.path.length - 1 && <div className="w-0.5 h-5 bg-gray-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-sm font-medium text-gray-800">{step.from.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {TRANSPORT_LABELS[step.transport]} · {step.duration_min} min · {step.price_fcfa} FCFA
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{toText}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
