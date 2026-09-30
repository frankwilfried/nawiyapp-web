import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useCityStore } from '../store/cityStore';
import { taxiRequestSchema } from '../lib/schemas';
import { useMapStore } from '../store/mapStore';
import { findNearestNode, getRoadGeometry, getRouteWithSteps } from '../lib/routing';
import { isPeakHour } from '../lib/geocoder';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useMapData } from '../hooks/useMapData';
import { useTaxiPassenger } from '../hooks/useTaxiPassenger';

import SplashScreen   from '../components/SplashScreen';
import Onboarding     from '../components/Onboarding';
import NavBanner      from '../components/NavBanner';
import MapControls    from '../components/MapControls';
import SearchBar      from '../components/SearchBar';
import SearchPanel    from '../components/SearchPanel';
import RouteSheet     from '../components/RouteSheet';

const TAXI_PRICE = 3000;

export default function Home() {
  const { selectedCity } = useCityStore();
  const { userPosition, setUserPosition, isFollowingUser, stopFollowingUser, startFollowingUser } = useMapStore();

  // ── Map refs ──────────────────────────────────────────────────────
  const mapContainer = useRef(null);
  const map          = useRef(null);
  const userMarker   = useRef(null);

  // ── UI state ──────────────────────────────────────────────────────
  const [showSplash,     setShowSplash]     = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('nawiy_onboarded'));
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [sheetOpen,      setSheetOpen]      = useState(false);

  // ── Search state ──────────────────────────────────────────────────
  const [fromText, setFromText] = useState('');
  const [toText,   setToText]   = useState('');
  const [fromNode, setFromNode] = useState(null);
  const [toNode,   setToNode]   = useState(null);
  const [fromSugg, setFromSugg] = useState([]);
  const [toSugg,   setToSugg]   = useState([]);
  const [activeInput, setActiveInput] = useState('from');
  const [suggLoading, setSuggLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [result,      setResult]      = useState(null);

  // ── Navigation GPS ────────────────────────────────────────────────
  const [navActive,  setNavActive]  = useState(false);
  const [navSteps,   setNavSteps]   = useState([]);
  const [navStepIdx, setNavStepIdx] = useState(0);
  const [navDistM,   setNavDistM]   = useState(0);
  const [navEtaMin,  setNavEtaMin]  = useState(0);
  const navRouteRef = useRef(null);
  const spokenRef   = useRef(new Set());

  // ── Taxi state ────────────────────────────────────────────────────
  const [taxiMode,       setTaxiMode]       = useState('idle');
  const [taxiRideId,     setTaxiRideId]     = useState(null);
  const [taxiDriver,     setTaxiDriver]     = useState(null);
  const [taxiEta,        setTaxiEta]        = useState(null);
  const [taxiRating,     setTaxiRating]     = useState(0);
  const [taxiFinalPrice, setTaxiFinalPrice] = useState(null);
  const etaIntervalRef = useRef(null);

  const { recents, favorites, addRecent, toggleFavorite, isFavorite } = useSearchHistory();
  const { graph, nodes, source: dataSource } = useMapData(selectedCity);

  const { send: taxiSend } = useTaxiPassenger({
    'ride:created':        ({ ride })  => setTaxiRideId(ride.id),
    'ride:confirmed':      (data)      => {
      setTaxiDriver(data.driver); setTaxiFinalPrice(data.final_price);
      const eta = data.eta_min || 3; setTaxiEta(eta); setTaxiMode('driver_found');
      clearInterval(etaIntervalRef.current);
      etaIntervalRef.current = setInterval(() => setTaxiEta(p => { if (p <= 1) { clearInterval(etaIntervalRef.current); return 0; } return p - 1; }), 8000);
    },
    'ride:driver_arrived': ()          => { clearInterval(etaIntervalRef.current); setTaxiEta(0); setTaxiMode('driver_arrived'); setTimeout(() => setTaxiMode('in_progress'), 5000); },
    'ride:completed':      (data)      => { setTaxiFinalPrice(data.final_price); setTaxiMode('completed'); },
    'ride:cancelled':      ()          => { clearInterval(etaIntervalRef.current); setTaxiMode('idle'); },
  });

  // ── Reset on city change ──────────────────────────────────────────
  useEffect(() => {
    setResult(null); setFromNode(null); setToNode(null); setFromText(''); setToText('');
  }, [selectedCity]);

  // ── Map init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const city = selectedCity === 'douala'
      ? { center: [9.7085, 4.0511], zoom: 13 }
      : { center: [11.5167, 3.8667], zoom: 13 };
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: city.center, zoom: city.zoom, pitch: 30, bearing: 0,
    });
    map.current.on('dragstart', () => stopFollowingUser());
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // ── GPS user position ─────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(pos => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPosition(coords);
      updateNavigation(coords.lat, coords.lng);
      if (!userMarker.current && map.current) {
        const el = document.createElement('div');
        el.innerHTML = `<div style="position:relative;width:20px;height:20px"><div style="position:absolute;inset:0;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5);z-index:2"></div><div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(66,133,244,0.2);animation:pulse 2s infinite"></div></div>`;
        userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([coords.lng, coords.lat]).addTo(map.current);
      } else if (userMarker.current) {
        userMarker.current.setLngLat([coords.lng, coords.lat]);
      }
      if (isFollowingUser && map.current) map.current.easeTo({ center: [coords.lng, coords.lat], duration: 500 });
    }, null, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isFollowingUser]);

  // ── Google Places script ──────────────────────────────────────────
  const googleLoaded = useRef(false);
  useEffect(() => {
    if (googleLoaded.current || window.google) return;
    googleLoaded.current = true;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places&language=fr`;
    s.async = true; document.head.appendChild(s);
  }, []);

  // ── Search helpers ────────────────────────────────────────────────
  const suggestDebounce = useRef(null);
  const suggest = useCallback((val, setter) => {
    if (!val || val.length < 2) { setter([]); setSuggLoading(false); return; }
    setSuggLoading(true);
    clearTimeout(suggestDebounce.current);
    suggestDebounce.current = setTimeout(() => {
      const q = val.toLowerCase();
      const local = nodes.filter(n => n.name.toLowerCase().includes(q)).slice(0, 3);
      if (!window.google?.maps?.places) { setter(local); setSuggLoading(false); return; }
      const svc = new window.google.maps.places.AutocompleteService();
      const opts = { input: val, componentRestrictions: { country: 'cm' }, language: 'fr' };
      if (userPosition) { opts.location = new window.google.maps.LatLng(userPosition.lat, userPosition.lng); opts.radius = 15000; }
      svc.getPlacePredictions(opts, (predictions, status) => {
        if (status !== 'OK' || !predictions) { setter(local); setSuggLoading(false); return; }
        const remote = predictions.map(p => ({ id: 'gp_' + p.place_id, name: p.structured_formatting.main_text, subtitle: p.structured_formatting.secondary_text, place_id: p.place_id, lat: null, lng: null, type: 'lieu' }));
        setter([...local, ...remote].slice(0, 7)); setSuggLoading(false);
      });
    }, 300);
  }, [userPosition]);

  const resolvePlaceCoords = useCallback((node, onResolved) => {
    if (node.lat !== null || !node.place_id) { onResolved(node); return; }
    const div = document.createElement('div');
    const svc = new window.google.maps.places.PlacesService(div);
    svc.getDetails({ placeId: node.place_id, fields: ['geometry'] }, (place, status) => {
      onResolved(status === 'OK' && place.geometry ? { ...node, lat: place.geometry.location.lat(), lng: place.geometry.location.lng() } : node);
    });
  }, []);

  const useMyPosition = useCallback(() => {
    if (!userPosition) { setSearchError('Position GPS non disponible'); return; }
    const nearest = findNearestNode(userPosition.lat, userPosition.lng, nodes);
    setFromText('📍 Ma position');
    setFromNode(nearest
      ? { ...nearest.node, _walkFrom: userPosition, _walkMin: nearest.walkMinutes, _walkDist: nearest.distanceKm }
      : { id: '_gps', name: '📍 Ma position', lat: userPosition.lat, lng: userPosition.lng }
    );
    setActiveInput('to'); setFromSugg([]);
  }, [userPosition, nodes]);

  // ── Route drawing ─────────────────────────────────────────────────
  const drawRoute = useCallback(async (waypoints) => {
    if (!map.current) return;
    ['route-line','route-line-bg','route-walk'].forEach(id => { if (map.current.getLayer(id)) map.current.removeLayer(id); });
    ['route','route-walk-src'].forEach(id => { if (map.current.getSource(id)) map.current.removeSource(id); });
    const coords = await getRoadGeometry(waypoints, 'driving') || waypoints.map(p => [p.lng, p.lat]);
    map.current.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
    map.current.addLayer({ id: 'route-line-bg', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.6 } });
    map.current.addLayer({ id: 'route-line',    type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1D9E75', 'line-width': 5 } });
    const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.current.fitBounds(bounds, { padding: 80, duration: 800 });
  }, []);

  // ── Search ────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setSearchError('');
    if (!fromNode || !toNode) { setSearchError('Sélectionne départ et destination'); return; }
    if (!fromNode.lat || !toNode.lat) { setSearchError('Coordonnées manquantes, réessaie'); return; }
    setSearchOpen(false); setSheetOpen(true);
    const dLat = toNode.lat - fromNode.lat, dLng = toNode.lng - fromNode.lng;
    const distKm = Math.sqrt(dLat*dLat + dLng*dLng) * 111;
    setResult({ total_duration_min: Math.round(distKm / 0.5), total_price_fcfa: null, distance_km: Math.round(distKm * 10) / 10, path: [] });
    drawRoute([{ lat: fromNode.lat, lng: fromNode.lng }, { lat: toNode.lat, lng: toNode.lng }]);
  }, [fromNode, toNode, drawRoute]);

  // ── Navigation GPS ────────────────────────────────────────────────
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = 1.05; window.speechSynthesis.speak(u);
  };

  const haversineM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const startNavigation = useCallback(async () => {
    if (!fromNode || !toNode) return;
    const start = userPosition || { lat: fromNode.lat, lng: fromNode.lng };
    const route = await getRouteWithSteps([start, { lat: toNode.lat, lng: toNode.lng }], 'driving');
    if (!route) { alert("Impossible de calculer l'itinéraire"); return; }
    navRouteRef.current = route; setNavSteps(route.steps); setNavStepIdx(0);
    setNavDistM(route.distanceM); setNavEtaMin(Math.round(route.durationS / 60));
    setNavActive(true); setSheetOpen(false); spokenRef.current = new Set();
    startFollowingUser(); if (route.steps[0]) speak(route.steps[0].instruction);
  }, [fromNode, toNode, userPosition, startFollowingUser]);

  const stopNavigation = useCallback(() => {
    setNavActive(false); window.speechSynthesis?.cancel(); stopFollowingUser();
  }, [stopFollowingUser]);

  const updateNavigation = useCallback((lat, lng) => {
    if (!navActive || !navRouteRef.current) return;
    const steps = navRouteRef.current.steps;
    setNavStepIdx(prev => {
      let idx = prev;
      while (idx < steps.length - 1) { const [sLng, sLat] = steps[idx].location || [lng, lat]; if (haversineM(lat, lng, sLat, sLng) < 30) idx++; else break; }
      if (idx !== prev && steps[idx] && !spokenRef.current.has(idx)) { spokenRef.current.add(idx); speak(`dans ${steps[idx].distanceM > 1000 ? `${(steps[idx].distanceM/1000).toFixed(1)} km` : `${steps[idx].distanceM} mètres`}, ${steps[idx].instruction}`); }
      if (idx === steps.length - 1 && !spokenRef.current.has('arrived')) { spokenRef.current.add('arrived'); speak('Vous êtes arrivé à destination'); setTimeout(() => stopNavigation(), 4000); }
      return idx;
    });
    if (toNode) { const d = haversineM(lat, lng, toNode.lat, toNode.lng); setNavDistM(Math.round(d)); setNavEtaMin(Math.max(1, Math.round(d / 500))); }
  }, [navActive, toNode, stopNavigation]);

  // ── Taxi actions ──────────────────────────────────────────────────
  const requestTaxi = () => {
    if (!fromNode || !toNode) return;
    const payload = { from_lat: fromNode.lat, from_lng: fromNode.lng, from_name: fromText, to_lat: toNode.lat, to_lng: toNode.lng, to_name: toText, proposed_price: TAXI_PRICE, city_slug: selectedCity };
    const parsed = taxiRequestSchema.safeParse(payload);
    if (!parsed.success) { console.warn('[taxi] payload invalide', parsed.error.issues); return; }
    setTaxiMode('searching');
    taxiSend('ride:request', parsed.data);
  };

  const cancelTaxi = () => {
    clearInterval(etaIntervalRef.current);
    if (taxiRideId) taxiSend('ride:cancel', { ride_id: taxiRideId });
    setTaxiMode('idle'); setTaxiRideId(null); setTaxiDriver(null); setTaxiEta(null); setTaxiFinalPrice(null); setTaxiRating(0);
  };

  const clearRoute = () => {
    setResult(null); setSheetOpen(false); setFromNode(null); setToNode(null); setFromText(''); setToText('');
    if (map.current?.getLayer('route-line')) map.current.removeLayer('route-line');
    if (map.current?.getSource('route')) map.current.removeSource('route');
  };

  const shareWhatsApp = () => {
    const lines = [`🗺️ *NawiyApp* — Itinéraire`, `📍 ${fromText} → ${toText}`, `⏱ ~${result.total_duration_min} min | 📏 ${result.distance_km} km`, ``, `Trouvé avec NawiyApp 🚕`];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.5);opacity:0}}.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left{display:none}`}</style>

      <AnimatePresence>
        {showOnboarding && !showSplash && (
          <Onboarding onDone={() => { localStorage.setItem('nawiy_onboarded', '1'); setShowOnboarding(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      <div ref={mapContainer} className="fixed inset-0 w-full h-full" />

      <NavBanner navActive={navActive} navSteps={navSteps} navStepIdx={navStepIdx} navDistM={navDistM} navEtaMin={navEtaMin} navRouteRef={navRouteRef} onStop={stopNavigation} />

      {/* Floating search bar */}
      <div className="fixed top-0 left-0 right-0 z-20 p-3 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchBar result={result} fromText={fromText} toText={toText} fromNode={fromNode} toNode={toNode}
            onOpen={(input) => { setSearchOpen(true); setActiveInput(input); }} onClear={clearRoute} />
        </div>
      </div>

      <MapControls mapRef={map} userPosition={userPosition} />

      {isPeakHour() && (
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
          className="fixed top-28 left-1/2 -translate-x-1/2 z-20 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold">
          ⚠️ Heure de pointe — durées majorées
        </motion.div>
      )}

      <AnimatePresence>
        {searchOpen && (
          <SearchPanel
            open={searchOpen} onClose={() => setSearchOpen(false)}
            activeInput={activeInput} setActiveInput={setActiveInput}
            fromText={fromText} setFromText={setFromText} fromNode={fromNode} setFromNode={setFromNode}
            toText={toText} setToText={setToText} toNode={toNode} setToNode={setToNode}
            fromSugg={fromSugg} setFromSugg={setFromSugg} toSugg={toSugg} setToSugg={setToSugg}
            suggLoading={suggLoading} searchError={searchError}
            userPosition={userPosition} recents={recents} favorites={favorites}
            isFavorite={isFavorite} toggleFavorite={toggleFavorite}
            onSuggest={suggest} onResolvePlaceCoords={resolvePlaceCoords}
            onUseMyPosition={useMyPosition} onSearch={handleSearch} addRecent={addRecent}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen && result && (
          <RouteSheet
            open={sheetOpen} result={result} fromText={fromText} toText={toText}
            taxiMode={taxiMode} taxiDriver={taxiDriver} taxiEta={taxiEta}
            taxiFinalPrice={taxiFinalPrice} taxiRating={taxiRating}
            onClose={() => { setSheetOpen(false); setTaxiMode('idle'); }}
            onNavigate={startNavigation} onShare={shareWhatsApp}
            onRequestTaxi={requestTaxi} onCancelTaxi={cancelTaxi}
            onRate={(score) => { setTaxiRating(score); setTimeout(() => cancelTaxi(), 1500); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
