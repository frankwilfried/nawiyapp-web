import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useCityStore } from '../store/cityStore';
import { taxiRequestSchema, searchFormSchema } from '../lib/schemas';
import { captureError } from '../lib/sentry';
import { useMapStore } from '../store/mapStore';
import { getRoadGeometry, getRouteWithSteps, findNearestNode } from '../lib/routing';
import { isPeakHour, applyPeakMultiplier } from '../lib/geocoder';
import { planTrip, haversineKm } from '../lib/itinerary';
import { MODES } from '../lib/modes';
import { priceFor, roadKm, offerBounds, cancellationFee } from '../lib/pricing';
import { useAuthStore } from '../store/authStore';
import { getTaxiEstimate } from '../api/taxi.api';
import { logSearch } from '../lib/searchLog';
import { distanceM, bearingDeg, relativeDirection, formatDistance } from '../lib/geo';
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
import ConfirmDialog  from '../components/ConfirmDialog';
import Icon           from '../components/Icon';
import PaymentSheet   from '../components/PaymentSheet';
import SafetySheet    from '../components/SafetySheet';
import RideComplete   from '../components/RideComplete';
import PickupSheet, { CenterPin } from '../components/PickupSheet';
import SignalScreen   from '../components/SignalScreen';
import ChatSheet from '../components/ChatSheet';
import { PASSENGER_REPLIES } from '../lib/chat';

// Le serveur abandonne la recherche au bout de 2 min ; filet de sécurité si le réseau coupe
const TAXI_SEARCH_TIMEOUT_MS = 150_000;
const RIDE_ENGAGED = ['driver_found', 'driver_arrived'];
const PICKUP_PAD = 260; // hauteur réservée à la fiche de prise en charge (px)
const isWalkOnly = (trip) => trip?.legs?.length > 0 && trip.legs.every(l => l.kind === 'walk');

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
  const [toast,          setToast]          = useState('');
  const [peakDismissed,  setPeakDismissed]  = useState(false);
  const [confirm,        setConfirm]        = useState(null); // { title, body, confirmLabel, onConfirm }
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

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
  const [navTotalM,  setNavTotalM]  = useState(0);
  const [navArrivalTs, setNavArrivalTs] = useState(null);
  const navRouteRef = useRef(null);
  const spokenRef   = useRef(new Set());

  // ── Taxi à la demande ─────────────────────────────────────────────
  // taxiMode : idle → pickup (confirmer le point) → searching → driver_found → driver_arrived → in_progress → completed
  const [taxiMode,     setTaxiMode]     = useState('idle');
  const [taxiRide,     setTaxiRide]     = useState(null);   // { id, price, category, pickup_code, payment_method, from, to }
  const [taxiDriver,   setTaxiDriver]   = useState(null);
  const [taxiEta,      setTaxiEta]      = useState(null);
  const [taxiNotified, setTaxiNotified] = useState(null);
  const [taxiDeclines, setTaxiDeclines] = useState(null); // { declined, notified, all_declined }
  const [counters, setCounters] = useState([]);           // contre-offres des chauffeurs
  const [raising,      setRaising]      = useState(false);
  const [driverPos,    setDriverPos]    = useState(null);
  const [paymentState, setPaymentState] = useState(null);
  const [taxiEstimate, setTaxiEstimate] = useState(null);
  const [payment,      setPayment]      = useState({ method: 'cash', phone: '' });
  const [paymentOpen,  setPaymentOpen]  = useState(false);
  const [safetyOpen,   setSafetyOpen]   = useState(false);
  const [pickup,       setPickup]       = useState(null);   // { category, lat, lng, label, hint, price, moving }
  const [sheetView,    setSheetView]    = useState('overview'); // écran d'ouverture de la fiche trajet
  // Retrouver son chauffeur : signal partagé, description, boussole
  const [taxiSignal,    setTaxiSignal]    = useState(null);
  const [passengerNote, setPassengerNote] = useState('');
  const [signalOpen,    setSignalOpen]    = useState(false);
  const [heading,       setHeading]       = useState(null);

  const { recents, favorites, addRecent, toggleFavorite, isFavorite } = useSearchHistory();
  const { graph, nodes } = useMapData(selectedCity);

  const modeFromRide = (ride) => ride.status === 'pending' ? 'searching'
    : ride.status === 'in_progress' ? 'in_progress'
    : ride.arrived ? 'driver_arrived' : 'driver_found';

  const isAuthenticated = useAuthStore(st => st.isAuthenticated);
  const { send: taxiSend, connected: taxiConnected } = useTaxiPassenger({
    'ride:created':  ({ ride }) => { setTaxiRide(ride); setTaxiMode('searching'); },
    'ride:notified': ({ drivers_notified }) => setTaxiNotified(drivers_notified),
    // Offre façon inDrive : refus des chauffeurs, hausse de l'offre
    'ride:declined': (d) => setTaxiDeclines(d),
    'ride:raised':   ({ price }) => { setTaxiRide(r => r && { ...r, price }); setTaxiDeclines(null); setRaising(false); setCounters([]); },
    // Contre-offre d'un chauffeur : valable 30 s
    'ride:counter_offer': (c) => {
      const until = Date.now() + c.expires_in * 1000;
      setCounters(list => [...list.filter(x => x.driver_id !== c.driver_id), { ...c, until }]);
      navigator.vibrate?.(120);
      setTimeout(() => setCounters(list => list.filter(x => !(x.driver_id === c.driver_id && x.until === until))), c.expires_in * 1000);
    },
    'ride:confirmed': (data) => {
      setCounters([]);
      setTaxiDriver(data.driver); setTaxiEta(data.eta_min ?? null); setTaxiMode('driver_found');
      setTaxiSignal(data.signal || null);
      if (data.driver?.lat != null) setDriverPos({ lat: data.driver.lat, lng: data.driver.lng });
      setTaxiRide(r => r && { ...r, price: data.final_price ?? r.price });
    },
    'ride:driver_position': ({ lat, lng, eta_min }) => { setDriverPos({ lat, lng }); if (eta_min != null) setTaxiEta(eta_min); },
    'ride:driver_arrived':  () => { setTaxiMode('driver_arrived'); setTaxiRide(r => r && { ...r, arrived_at: r.arrived_at || new Date().toISOString() }); },
    'ride:started':         ({ eta_min }) => { setTaxiEta(eta_min ?? null); setTaxiMode('in_progress'); setSignalOpen(false); },
    'ride:completed':       ({ final_price, fee_included }) => { setTaxiRide(r => r && { ...r, price: final_price, fee_included: fee_included || 0 }); setTaxiMode('completed'); setSheetOpen(false); },
    'ride:payment':         (state) => setPaymentState(state),
    'ride:reassigning':     () => { setTaxiDriver(null); setDriverPos(null); setTaxiMode('searching'); showToast('Ton chauffeur a dû annuler. On t\'en cherche un autre.'); },
    'ride:no_driver':       () => { resetTaxi(); setSheetOpen(true); showToast('Aucun chauffeur disponible pour l\'instant. Réessaie dans quelques minutes.'); },
    // Messagerie : l'accusé du serveur remplace le message « en cours d'envoi »
    'chat:message': (m) => {
      setChatMessages(list => [...list.filter(x => !(m.client_id && x.client_id === m.client_id)), m]);
      if (m.sender === 'driver' && !chatOpenRef.current) {
        setChatUnread(n => n + 1);
        navigator.vibrate?.(150);
      }
    },
    'chat:history': ({ messages }) => setChatMessages(messages),
    'ride:scheduled': ({ ride }) => {
      resetTaxi(); setSheetOpen(true);
      const at = new Date(ride.scheduled_at).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      showToast(`Course programmée ${at}. Retrouve-la dans Compte → Mes courses.`);
    },
    'ride:share_link':      ({ token }) => setShareUrl(`${window.location.origin}/suivi/${token}`),
    'ride:cancel_ok':       ({ fee }) => { if (fee) showToast(`Course annulée : ${fee.toLocaleString('fr-FR')} F de frais seront ajoutés à ta prochaine course`); },
    // Le chauffeur t'a attendu plus de 5 min sans te voir
    'ride:cancelled':       ({ reason, fee }) => {
      resetTaxi(); setSheetOpen(true);
      showToast(reason === 'no_show'
        ? `Ton chauffeur ne t'a pas trouvé et a clos la course${fee ? ` (frais de ${fee.toLocaleString('fr-FR')} F sur ta prochaine course)` : ''}.`
        : 'La course a été annulée.');
    },
    'ride:error':           ({ message }) => { setRaising(false); if (['pickup', 'searching'].includes(taxiMode)) { resetTaxi(); setSheetOpen(true); } showToast(message); },
    // Reprise après une coupure réseau ou un rechargement de la page
    'ride:state': ({ ride, driver, messages }) => {
      setChatMessages(messages || []);
      setTaxiRide(ride); setTaxiDriver(driver); setTaxiMode(modeFromRide(ride));
      setTaxiSignal(ride.signal || null); setPassengerNote(ride.passenger_note || '');
      if (driver?.lat != null) setDriverPos({ lat: driver.lat, lng: driver.lng });
      if (!result) {
        const from = { id: '_ride_from', ...ride.from }, to = { id: '_ride_to', ...ride.to };
        setFromText(ride.from.name); setToText(ride.to.name);
        setFromNode(from); setToNode(to);
        // Itinéraire recalculé (sinon estimation simple) pour que la fiche reste complète après la course
        setResult(planTrip(graph, from, to, { departAt: Date.now(), peak: isPeakHour() })
          || { legs: [], total_duration_min: Math.max(1, Math.round(ride.distance_km * 2)), distance_km: ride.distance_km });
      }
      setSheetOpen(true);
    },
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
      attributionControl: false,
    });
    // Mention OpenStreetMap obligatoire (licence ODbL) : à gauche, repliée en « i »
    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.current.once('load', () => mapContainer.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
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
    }, (err) => {
      if (err.code === err.PERMISSION_DENIED) showToast('Active la localisation pour voir où tu es sur la carte');
    }, { enableHighAccuracy: true });
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

  // Renvoie le point « Ma position » pour que l'appelant puisse lancer la recherche aussitôt.
  // Le rattachement au carrefour le plus proche (et la marche) est fait par planTrip.
  const pickMyPosition = useCallback(() => {
    if (!userPosition) { setSearchError('Position GPS non disponible. Active la localisation ou tape ton point de départ.'); return null; }
    const node = { id: '_gps', name: 'Ma position', lat: userPosition.lat, lng: userPosition.lng };
    setFromText('Ma position'); setFromNode(node);
    setActiveInput('to'); setFromSugg([]); setSearchError('');
    return node;
  }, [userPosition]);

  // ── Route drawing ─────────────────────────────────────────────────
  // Marqueurs façon Uber : rond noir au départ, carré noir à l'arrivée
  const routeMarkers = useRef([]);
  const removeRoute = useCallback(() => {
    routeMarkers.current.forEach(m => m.remove()); routeMarkers.current = [];
    ['route-line','route-line-bg','route-walk'].forEach(id => { if (map.current?.getLayer(id)) map.current.removeLayer(id); });
    ['route','route-walk-src'].forEach(id => { if (map.current?.getSource(id)) map.current.removeSource(id); });
  }, []);

  // Cadre le dernier tracé au-dessus de la fiche (hauteur réelle mesurée)
  const routeBounds = useRef(null);
  const fitRoute = useCallback(() => {
    if (!map.current || !routeBounds.current) return;
    const sheetEl = document.querySelector('section[aria-label="Trajet"]');
    const sheetH = sheetEl ? sheetEl.offsetHeight : Math.min(window.innerHeight * 0.6, 460);
    // +48 px : la carte inclinée (pitch 30°) déborde un peu vers le bas
    const bottom = Math.min(sheetH + 48, window.innerHeight - 110 - 80); // garde au moins 80 px de carte
    map.current.fitBounds(routeBounds.current, { padding: { top: 110, bottom, left: 48, right: 48 }, duration: 800 });
  }, []);

  const drawRoute = useCallback(async (waypoints, { walk = false } = {}) => {
    if (!map.current) return;
    removeRoute();
    // À pied : chemin piéton (pas de détour par les sens uniques) et ligne en pointillés, façon Google Maps
    const coords = await getRoadGeometry(waypoints, walk ? 'walking' : 'driving') || waypoints.map(p => [p.lng, p.lat]);
    map.current.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
    if (walk) {
      map.current.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#0F7A5A', 'line-width': 6, 'line-dasharray': [0, 2] } });
    } else {
      map.current.addLayer({ id: 'route-line-bg', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#0F7A5A', 'line-width': 9 } });
      map.current.addLayer({ id: 'route-line',    type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1D9E75', 'line-width': 6 } });
    }
    const mk = (shape) => {
      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;background:#000;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);${shape === 'dot' ? 'border-radius:50%' : ''}`;
      return el;
    };
    // Marqueurs sur les points réels (pas sur la route la plus proche calculée par OSRM),
    // pour qu'ils coïncident avec l'épingle de prise en charge
    const start = waypoints[0], end = waypoints[waypoints.length - 1];
    routeMarkers.current = [
      new maplibregl.Marker({ element: mk('dot') }).setLngLat([start.lng, start.lat]).addTo(map.current),
      new maplibregl.Marker({ element: mk('square') }).setLngLat([end.lng, end.lat]).addTo(map.current),
    ];
    // Cadre le tracé ET les marqueurs (placés sur les points exacts, parfois un peu à côté du tracé)
    routeBounds.current = [...coords, [start.lng, start.lat], [end.lng, end.lat]]
      .reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    fitRoute();
  }, [removeRoute, fitRoute]);

  // Recadre si la fiche du trajet change de hauteur (prix taxi chargés, détail déplié…)
  useEffect(() => {
    const el = sheetOpen && document.querySelector('section[aria-label="Trajet"]');
    if (!el || taxiMode !== 'idle') return;
    let last = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.offsetHeight - last) > 24) { last = el.offsetHeight; fitRoute(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [sheetOpen, taxiMode, result, fitRoute]);

  // ── Search ────────────────────────────────────────────────────────
  const estimateToken = useRef(0); // ignore les estimations taxi d'une recherche précédente
  // Reçoit les nœuds en argument : le panneau lance la recherche juste après une sélection,
  // avant que l'état React ne soit à jour.
  const runSearch = useCallback((from = fromNode, to = toNode) => {
    setSearchError('');
    if (!from || !to) { setSearchError('Choisis un départ et une destination'); return; }
    if (!searchFormSchema.safeParse({ fromNode: from, toNode: to }).success) {
      setSearchError(from.id === to.id ? 'Le départ et la destination sont identiques' : 'Coordonnées manquantes, réessaie');
      return;
    }
    setSearchOpen(false); setSheetOpen(true); setSheetView('overview');
    // Prix taxi et chauffeurs proches, en parallèle du calcul d'itinéraire
    const token = ++estimateToken.current;
    setTaxiEstimate(null);
    getTaxiEstimate(from, to, selectedCity).then(e => { if (estimateToken.current === token) setTaxiEstimate(e); });
    const trip = planTrip(graph, from, to, { departAt: Date.now(), peak: isPeakHour() });
    if (graph) logSearch(selectedCity, from, to, trip);
    if (trip) {
      setResult(trip);
      drawRoute(trip.waypoints, { walk: isWalkOnly(trip) });
      return;
    }
    // Graphe indisponible : estimation à vol d'oiseau (~2 min/km)
    const distKm = haversineKm(from, to);
    setResult({ legs: [], total_duration_min: applyPeakMultiplier(Math.max(1, Math.round(distKm / 0.5))), total_price_fcfa: null, distance_km: Math.round(distKm * 10) / 10 });
    drawRoute([{ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }]);
  }, [fromNode, toNode, graph, drawRoute, selectedCity]);

  // Raccourci favori / récent : destination directe, départ = ma position si le GPS est actif
  const quickDestination = useCallback((place) => {
    setToText(place.name); setToNode(place); setToSugg([]);
    const from = fromNode || pickMyPosition();
    if (from) runSearch(from, place);
    else { setActiveInput('from'); setSearchOpen(true); }
  }, [fromNode, pickMyPosition, runSearch]);

  const openSearch = (input) => {
    if (!fromNode && userPosition) pickMyPosition();
    setActiveInput(fromNode || userPosition ? input : 'from');
    setSearchOpen(true);
  };

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
    const route = await getRouteWithSteps([start, { lat: toNode.lat, lng: toNode.lng }], isWalkOnly(result) ? 'walking' : 'driving');
    if (!route) {
      captureError(new Error('OSRM route unavailable'), { from: fromNode?.name, to: toNode?.name });
      showToast("Impossible de calculer l'itinéraire, réessaie");
      return;
    }
    navRouteRef.current = route; setNavSteps(route.steps); setNavStepIdx(0);
    setNavDistM(route.distanceM); setNavTotalM(route.distanceM); setNavEtaMin(Math.round(route.durationS / 60)); setNavArrivalTs(Date.now() + route.durationS * 1000);
    setNavActive(true); setSheetOpen(false); spokenRef.current = new Set();
    startFollowingUser(); if (route.steps[0]) speak(route.steps[0].instruction);
  }, [fromNode, toNode, userPosition, startFollowingUser, showToast, result]);

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
      if (idx === steps.length - 1 && !spokenRef.current.has('arrived')) { spokenRef.current.add('arrived'); speak('Tu es arrivé à destination'); setTimeout(() => stopNavigation(), 4000); }
      return idx;
    });
    if (toNode) { const d = haversineM(lat, lng, toNode.lat, toNode.lng); const eta = Math.max(1, Math.round(d / 500)); setNavDistM(Math.round(d)); setNavEtaMin(eta); setNavArrivalTs(Date.now() + eta * 60000); }
  }, [navActive, toNode, stopNavigation]);

  // ── Taxi actions ──────────────────────────────────────────────────
  // Nom lisible du point de prise en charge : carrefour connu le plus proche + repère OSM
  const describePickup = useCallback((c) => {
    if (fromNode?.id === '_gps' && haversineKm(c, fromNode) < 0.06) return { label: 'Ma position', hint: 'Ton emplacement GPS' };
    const near = findNearestNode(c.lat, c.lng, nodes);
    if (near && near.distanceKm <= 0.3) {
      const lm = near.node.landmarks?.[0];
      const m = Math.round(near.distanceKm * 1000);
      return {
        label: m < 25 ? near.node.name : `Près de ${near.node.name}`,
        hint: lm ? `Repère : ${lm.name} (${lm.kind_label})` : m < 25 ? 'Point de rendez-vous connu' : `à ${m} m`,
      };
    }
    return { label: 'Point choisi sur la carte', hint: near ? `à ${near.distanceKm.toString().replace('.', ',')} km de ${near.node.name}` : '' };
  }, [fromNode, nodes]);

  // Prix conseillé au point de prise en charge + offre du passager ramenée dans la fourchette autorisée
  const pricing = useCallback((category, at, wanted) => {
    const recommended = priceFor(category, roadKm(at, toNode));
    const b = offerBounds(category, recommended);
    const offer = wanted == null ? recommended : Math.min(b.max, Math.max(b.min, Math.round(wanted / b.step) * b.step));
    return { recommended, price: offer };
  }, [toNode]);

  // 1. « Commander » : on fait d'abord confirmer le point exact de prise en charge
  const orderTaxi = (category, offer) => {
    if (!fromNode || !toNode) return;
    if (!taxiConnected) { showToast('Service taxi injoignable pour l\'instant'); return; }
    const method = taxiEstimate?.payment_methods?.find(m => m.id === payment.method);
    if (method && !method.available) { setPaymentOpen(true); return; }
    setPickup({ category, lat: fromNode.lat, lng: fromNode.lng, ...describePickup(fromNode), ...pricing(category, fromNode, offer), wanted: offer });
    setTaxiMode('pickup'); setSheetOpen(false);
    map.current?.flyTo({ center: [fromNode.lng, fromNode.lat], zoom: 17, padding: { top: 0, bottom: PICKUP_PAD, left: 0, right: 0 }, duration: 800 });
  };

  // Suivi du déplacement de la carte pendant le choix du point
  useEffect(() => {
    if (taxiMode !== 'pickup' || !map.current) return;
    const m = map.current;
    const onStart = () => setPickup(p => p && { ...p, moving: true });
    const onEnd = () => {
      const c = m.getCenter();
      const at = { lat: c.lat, lng: c.lng };
      setPickup(p => p && { ...p, moving: false, ...at, ...describePickup(at), ...pricing(p.category, at, p.wanted) });
    };
    m.on('movestart', onStart); m.on('moveend', onEnd);
    return () => { m.off('movestart', onStart); m.off('moveend', onEnd); m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 }); };
  }, [taxiMode, describePickup, pricing]);

  // 2. Confirmation : la demande part au serveur, qui calcule le prix définitif (identique à l'affiché)
  const confirmPickup = (scheduledAt = null) => {
    const payload = {
      from_lat: pickup.lat, from_lng: pickup.lng, from_name: pickup.label,
      to_lat: toNode.lat, to_lng: toNode.lng, to_name: toText,
      city_slug: selectedCity, category: pickup.category, payment_method: payment.method,
      offer_price: pickup.price,
      ...(payment.method !== 'cash' && { payer_phone: payment.phone }),
      ...(scheduledAt && { scheduled_at: scheduledAt }),
    };
    const parsed = taxiRequestSchema.safeParse(payload);
    if (!parsed.success) { showToast(parsed.error.issues[0]?.message || 'Impossible de commander pour ce trajet'); return; }
    // Course programmée : réservée, le passager revient à la carte (confirmation par « ride:scheduled »)
    if (scheduledAt) { taxiSend('ride:request', parsed.data); return; }
    setTaxiNotified(null); setPaymentState(null);
    setTaxiDeclines(null);
    setTaxiRide({ price: pickup.price, recommended_price: pickup.recommended, category: pickup.category, payment_method: payment.method, from: { lat: pickup.lat, lng: pickup.lng, name: pickup.label }, to: { lat: toNode.lat, lng: toNode.lng, name: toText } });
    setTaxiMode('searching'); setSheetOpen(true);
    taxiSend('ride:request', parsed.data);
    // Tracé du taxi : direct de la prise en charge à la destination (plus celui du transport informel)
    drawRoute([{ lat: pickup.lat, lng: pickup.lng }, { lat: toNode.lat, lng: toNode.lng }]);
  };

  const backFromPickup = () => { setTaxiMode('idle'); setPickup(null); setSheetView('ride'); setSheetOpen(true); if (result?.waypoints) drawRoute(result.waypoints, { walk: isWalkOnly(result) }); };

  // Remise à zéro locale (course terminée, annulée ou abandonnée)
  const resetTaxi = () => {
    setTaxiMode('idle'); setTaxiRide(null); setTaxiDriver(null); setTaxiEta(null);
    setTaxiNotified(null); setDriverPos(null); setPaymentState(null); setPickup(null);
    setTaxiDeclines(null); setRaising(false); setCounters([]);
    setTaxiSignal(null); setPassengerNote(''); setSignalOpen(false); setShareUrl(null);
    setChatMessages([]); setChatUnread(0); setChatOpen(false);
  };

  // ── Messagerie avec le chauffeur ──
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const chatOpenRef = useRef(false);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  const sendChat = (body) => {
    const client_id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setChatMessages(list => [...list, { client_id, sender: 'passenger', body, pending: true }]);
    taxiSend('chat:send', { ride_id: taxiRide?.id, body, client_id });
  };

  // Lien de suivi demandé dès qu'un chauffeur est attribué : le partage reste instantané
  const [shareUrl, setShareUrl] = useState(null);
  useEffect(() => {
    if (taxiRide?.id && !shareUrl && ['driver_found', 'driver_arrived', 'in_progress'].includes(taxiMode)) {
      taxiSend('ride:share', { ride_id: taxiRide.id });
    }
  }, [taxiRide?.id, taxiMode, shareUrl, taxiSend]);

  // ── Retrouver son chauffeur ───────────────────────────────────────
  const approaching = ['driver_found', 'driver_arrived'].includes(taxiMode);

  // Ta position part au chauffeur toutes les 5 s : c'est lui qui vient vers toi
  const myPosRef = useRef(userPosition);
  useEffect(() => { myPosRef.current = userPosition; }, [userPosition]);
  useEffect(() => {
    if (!approaching || !taxiRide?.id) return;
    const sendPos = () => { const p = myPosRef.current; if (p) taxiSend('passenger:position', { ride_id: taxiRide.id, lat: p.lat, lng: p.lng }); };
    sendPos();
    const t = setInterval(sendPos, 5000);
    return () => clearInterval(t);
  }, [approaching, taxiRide?.id, taxiSend]);

  // Boussole (si le téléphone en a une) pour dire « à ta droite » plutôt que « vers l'est »
  useEffect(() => {
    if (!approaching) return;
    const onOrient = (e) => {
      const h = e.webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null);
      if (h != null) setHeading(prev => (prev != null && Math.abs(prev - h) < 10 ? prev : Math.round(h)));
    };
    const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, onOrient);
    return () => window.removeEventListener(evt, onOrient);
  }, [approaching]);

  const radar = (() => {
    const me = userPosition || taxiRide?.from;
    if (!approaching || !driverPos || !me) return null;
    const d = distanceM(me, driverPos);
    if (d > 400) return null; // le radar n'a de sens que quand le chauffeur est tout proche
    return { distance: formatDistance(d), direction: relativeDirection(bearingDeg(me, driverPos), heading) };
  })();

  // Hausse d'offre proposée : jusqu'au prix conseillé, puis +10 % (au palier), sans dépasser le maximum
  const nextOffer = (() => {
    if (taxiMode !== 'searching' || !taxiRide?.price || !taxiRide.category) return null;
    const rec = taxiRide.recommended_price || taxiRide.price;
    const b = offerBounds(taxiRide.category, rec);
    const target = taxiRide.price < rec ? rec : Math.max(taxiRide.price + b.step, Math.ceil((taxiRide.price * 1.1) / b.step) * b.step);
    return target > b.max ? null : target;
  })();
  const taxiOffer = {
    declines: taxiDeclines, nextOffer, raising,
    onRaise: () => { if (!nextOffer || !taxiRide?.id) return; setRaising(true); taxiSend('ride:raise', { ride_id: taxiRide.id, price: nextOffer }); },
    counters,
    onAcceptCounter: (c) => taxiSend('ride:accept_counter', { ride_id: taxiRide?.id, driver_id: c.driver_id }),
    onDeclineCounter: (c) => { taxiSend('ride:decline_counter', { ride_id: taxiRide?.id, driver_id: c.driver_id }); setCounters(l => l.filter(x => x.driver_id !== c.driver_id)); },
  };

  const taxiFind = {
    chat: { unread: chatUnread, open: () => { setChatOpen(true); setChatUnread(0); } },
    signal: taxiSignal, distance: radar?.distance, direction: radar?.direction, note: passengerNote,
    onSignal: () => setSignalOpen(true),
    onWave: () => taxiRide?.id && taxiSend('ride:wave', { ride_id: taxiRide.id }),
    onNote: (note) => { if (!taxiRide?.id) return; taxiSend('passenger:note', { ride_id: taxiRide.id, note }); setPassengerNote(note); },
  };

  const cancelTaxi = () => {
    if (taxiRide?.id) taxiSend('ride:cancel', { ride_id: taxiRide.id });
    resetTaxi();
    showToast('Course annulée');
  };

  // Partage façon Uber : chauffeur, plaque et destination
  const taxiShareText = () => {
    const d = taxiDriver;
    const idLabel = d && (d.plate ? `plaque ${d.plate}` : d.visible_number ? `N° ${d.visible_number}` : '');
    return [
      'NawiyApp — Je suis en course',
      d ? `Chauffeur : ${d.name} · ${[d.vehicle_model, d.vehicle_color, idLabel].filter(Boolean).join(' · ')}` : "En attente d'un chauffeur",
      `Trajet : ${taxiRide?.from?.name || fromText} → ${taxiRide?.to?.name || toText}`,
      taxiEta != null && taxiMode === 'in_progress'
        ? `Arrivée prévue vers ${new Date(Date.now() + taxiEta * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '',
    ].filter(Boolean).join('\n');
  };

  // Partage façon Uber : lien de suivi en direct + chauffeur et plaque
  const shareTaxi = async () => {
    const text = taxiShareText();
    if (navigator.share) {
      try { await navigator.share({ title: 'Ma course NawiyApp', text, url: shareUrl || undefined }); return; }
      catch (err) { if (err?.name === 'AbortError') return; }
    }
    const message = [text, shareUrl && `Suivre en direct : ${shareUrl}`].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  // Fin de course : note envoyée (ou reportée), puis retour à la carte
  const finishRide = (rating) => {
    if (rating && taxiRide?.id) taxiSend('ride:rate', { ride_id: taxiRide.id, ...rating });
    resetTaxi();
    setResult(null); setSheetOpen(false); setFromNode(null); setToNode(null); setFromText(''); setToText('');
    removeRoute();
    if (rating) showToast('Merci pour ta note !');
  };

  // Une course avec chauffeur assigné ne s'annule qu'après confirmation
  const askCancelRide = (after) => {
    const run = () => { cancelTaxi(); after?.(); setConfirm(null); };
    if (!RIDE_ENGAGED.includes(taxiMode)) { run(); return; }
    // Frais seulement pour les comptes, si le chauffeur attend depuis plus de 5 min
    const fee = isAuthenticated ? cancellationFee(taxiRide?.category, taxiRide?.arrived_at) : 0;
    setConfirm({
      title: 'Annuler ta course ?',
      body: fee
        ? `Ton chauffeur t'attend depuis plus de 5 min : l'annulation coûte ${fee.toLocaleString('fr-FR')} F, ajoutés à ta prochaine course.`
        : taxiDriver ? `${taxiDriver.name} est déjà en route vers toi.` : 'Un chauffeur a déjà accepté ta course.',
      confirmLabel: 'Oui, annuler la course',
      onConfirm: run,
    });
  };

  // Abandon automatique si aucun chauffeur n'accepte (sauf course programmée : le serveur cherche jusqu'à l'heure prévue)
  const scheduledSearch = !!taxiRide?.scheduled_at;
  const cancelTaxiRef = useRef(cancelTaxi);
  useEffect(() => { cancelTaxiRef.current = cancelTaxi; });
  useEffect(() => {
    if (taxiMode !== 'searching' || scheduledSearch) return;
    const t = setTimeout(() => {
      cancelTaxiRef.current();
      showToast("Aucun chauffeur disponible pour l'instant. Réessaie dans quelques minutes.");
    }, TAXI_SEARCH_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [taxiMode, scheduledSearch, showToast]);

  const clearRoute = () => {
    const clear = () => {
      setResult(null); setSheetOpen(false); setFromNode(null); setToNode(null); setFromText(''); setToText('');
      removeRoute();
    };
    if (taxiMode === 'in_progress') { showToast('Course en cours : le trajet s\'effacera à l\'arrivée'); return; }
    if (taxiMode === 'pickup') { resetTaxi(); clear(); return; }
    if (taxiMode !== 'idle' && taxiMode !== 'completed') askCancelRide(clear);
    else clear();
  };

  // ── Marqueurs taxi sur la carte ───────────────────────────────────
  const pickupMarker = useRef(null);
  const driverMarker = useRef(null);
  const fittedDriver = useRef(false);

  // Point de prise en charge (onde pendant la recherche)
  useEffect(() => {
    const show = taxiRide?.from && ['searching', 'driver_found', 'driver_arrived'].includes(taxiMode);
    if (!show || !map.current) { pickupMarker.current?.remove(); pickupMarker.current = null; return; }
    if (!pickupMarker.current) {
      const el = document.createElement('div');
      el.className = 'taxi-pickup';
      el.innerHTML = '<span class="taxi-pickup-wave"></span><span class="taxi-pickup-wave" style="animation-delay:.8s"></span><span class="taxi-pickup-dot"></span>';
      pickupMarker.current = new maplibregl.Marker({ element: el }).setLngLat([taxiRide.from.lng, taxiRide.from.lat]).addTo(map.current);
    }
    pickupMarker.current.getElement().classList.toggle('is-searching', taxiMode === 'searching');
    if (taxiMode === 'searching') map.current.easeTo({ center: [taxiRide.from.lng, taxiRide.from.lat], zoom: 15, duration: 600 });
  }, [taxiMode, taxiRide]);

  // Voiture du chauffeur, en direct
  useEffect(() => {
    const show = driverPos && ['driver_found', 'driver_arrived', 'in_progress'].includes(taxiMode);
    if (!show || !map.current) { driverMarker.current?.remove(); driverMarker.current = null; fittedDriver.current = false; return; }
    if (!driverMarker.current) {
      const el = document.createElement('div');
      el.className = 'taxi-car';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/><path d="M7 14h.01M17 14h.01"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M5 18v2M19 18v2"/></svg>';
      driverMarker.current = new maplibregl.Marker({ element: el }).setLngLat([driverPos.lng, driverPos.lat]).addTo(map.current);
    } else {
      driverMarker.current.setLngLat([driverPos.lng, driverPos.lat]);
    }
    // Cadre la voiture et son objectif (point de rendez-vous, puis destination) au-dessus de la fiche,
    // une fois par étape ; ensuite la carte suit la voiture si elle sort de l'écran
    const phase = taxiMode === 'in_progress' ? 'trip' : 'approach';
    const goal = phase === 'trip' ? taxiRide?.to : taxiRide?.from;
    const padding = { top: 120, bottom: Math.min(window.innerHeight * 0.6, 440) + 24, left: 60, right: 60 };
    if (fittedDriver.current !== phase && goal) {
      fittedDriver.current = phase;
      const b = new maplibregl.LngLatBounds([driverPos.lng, driverPos.lat], [driverPos.lng, driverPos.lat]).extend([goal.lng, goal.lat]);
      map.current.fitBounds(b, { padding, maxZoom: 16, duration: 800 });
    } else if (!map.current.getBounds().contains([driverPos.lng, driverPos.lat])) {
      map.current.easeTo({ center: [driverPos.lng, driverPos.lat], duration: 800 });
    }
  }, [driverPos, taxiMode, taxiRide]);

  const shareWhatsApp = () => {
    const steps = (result.legs || []).filter(l => l.kind !== 'change').map((l, i) =>
      l.kind === 'walk'
        ? `${i + 1}. À pied jusqu'à ${l.to.name} (${l.minutes} min)`
        : `${i + 1}. ${MODES[l.transport]?.label || 'Transport'} jusqu'à ${l.to.name} — ${l.estimated ? '~' : ''}${l.price} F`);
    const lines = [
      `🗺️ *NawiyApp* — Itinéraire`, `📍 ${fromText} → ${toText}`,
      `⏱ ~${result.total_duration_min} min${result.total_price_fcfa ? ` | 💰 ~${result.total_price_fcfa} FCFA` : ''}`,
      ...(steps.length ? ['', ...steps] : []),
      ``, `Trouvé avec NawiyApp 🚕`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.5);opacity:0}}
        .home-map .maplibregl-ctrl-bottom-left{bottom:calc(4rem + env(safe-area-inset-bottom))}
        .taxi-pickup{position:relative;width:18px;height:18px}
        .taxi-pickup-dot{position:absolute;inset:0;border-radius:50%;background:#000;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
        .taxi-pickup-wave{position:absolute;inset:-30px;border-radius:50%;background:rgba(0,0,0,.18);opacity:0;display:none}
        .taxi-pickup.is-searching .taxi-pickup-wave{display:block;animation:taxiwave 1.6s ease-out infinite}
        @keyframes taxiwave{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.6);opacity:0}}
        .taxi-car{width:36px;height:36px;border-radius:50%;background:#000;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4);transition:transform .9s linear}
        @media (prefers-reduced-motion: reduce){.taxi-pickup.is-searching .taxi-pickup-wave{animation:none;opacity:.3;transform:scale(1)}}`}</style>

      <AnimatePresence>
        {showOnboarding && !showSplash && (
          <Onboarding onDone={() => { localStorage.setItem('nawiy_onboarded', '1'); setShowOnboarding(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      <div ref={mapContainer} className="home-map fixed inset-0 w-full h-full" />

      <NavBanner navActive={navActive} navSteps={navSteps} navStepIdx={navStepIdx} navDistM={navDistM} navEtaMin={navEtaMin} navTotalM={navTotalM} navArrivalTs={navArrivalTs} onStop={stopNavigation} />

      {/* Barre de recherche flottante */}
      {!navActive && (
        <div className="fixed top-0 left-0 right-0 z-20 px-3 pointer-events-none"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="pointer-events-auto">
            <SearchBar result={result} fromText={fromText} toText={toText} fromNode={fromNode} toNode={toNode}
              taxiMode={taxiMode} taxiEta={taxiEta} favorites={favorites} recents={recents}
              onOpen={openSearch} onQuickDestination={quickDestination}
              onOpenSheet={() => setSheetOpen(true)} onClear={clearRoute} />
          </div>

          <AnimatePresence>
            {isPeakHour() && !peakDismissed && !searchOpen && !sheetOpen && taxiMode === 'idle' && (
              <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
                className="pointer-events-auto mx-auto max-w-md mt-2 flex">
                <div role="status" className="mx-auto bg-amber-100 text-amber-900 rounded-full shadow-float pl-3 pr-1 h-9 flex items-center gap-2 text-sm font-medium">
                  <Icon name="alert" size={16} />
                  Heure de pointe : durées majorées
                  <button onClick={() => setPeakDismissed(true)} aria-label="Masquer l'alerte heure de pointe"
                    className="w-8 h-8 rounded-full flex items-center justify-center active:bg-amber-200">
                    <Icon name="x" size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!navActive && !sheetOpen && taxiMode !== 'pickup' && (
        <MapControls mapRef={map} userPosition={userPosition}
          onNoPosition={() => showToast('Position introuvable. Active la localisation de ton téléphone.')} />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div role="status"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed left-4 right-4 z-[60] mx-auto max-w-md bg-ink text-white text-sm font-medium px-4 py-3 rounded-lg shadow-float"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      </AnimatePresence>

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
            onUseMyPosition={pickMyPosition} onSearch={runSearch} addRecent={addRecent}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen && result && (
          <RouteSheet key={`${result.departAt || result.distance_km}-${sheetView}`}
            open={sheetOpen} result={result} toText={toText} initialView={sheetView}
            taxiMode={taxiMode} taxiRide={taxiRide} taxiDriver={taxiDriver} taxiEta={taxiEta}
            taxiNotified={taxiNotified} taxiConnected={taxiConnected}
            taxiEstimate={taxiEstimate} payment={payment}
            onOpenPayment={() => setPaymentOpen(true)} onOrderTaxi={orderTaxi}
            onClose={() => setSheetOpen(false)}
            onNavigate={startNavigation} onShare={shareWhatsApp} onShareTaxi={shareTaxi}
            onSafety={() => setSafetyOpen(true)} onCancelTaxi={() => askCancelRide()}
            taxiFind={taxiFind} taxiOffer={taxiOffer}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signalOpen && taxiSignal && (
          <SignalScreen signal={taxiSignal} title="Lève ton téléphone vers la route"
            subtitle="Ton chauffeur voit la même couleur et le même numéro sur son téléphone."
            onClose={() => setSignalOpen(false)} />
        )}
      </AnimatePresence>

      {taxiMode === 'pickup' && pickup && <CenterPin moving={pickup.moving} bottomPad={PICKUP_PAD} />}
      <AnimatePresence>
        {taxiMode === 'pickup' && pickup && (
          <PickupSheet label={pickup.label} hint={pickup.hint} category={pickup.category} price={pickup.price}
            canSchedule={isAuthenticated} onConfirm={confirmPickup} onBack={backFromPickup} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentOpen && (
          <PaymentSheet methods={taxiEstimate?.payment_methods || [{ id: 'cash', label: 'Espèces', available: true }]}
            value={payment} onChange={setPayment} onClose={() => setPaymentOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen && taxiRide && (
          <ChatSheet me="passenger" title={taxiDriver?.name ? `Message à ${taxiDriver.name.split(' ')[0]}` : 'Message au chauffeur'}
            messages={chatMessages} quickReplies={PASSENGER_REPLIES} onSend={sendChat}
            closed={!['driver_found', 'driver_arrived', 'in_progress'].includes(taxiMode)}
            onClose={() => setChatOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {safetyOpen && <SafetySheet shareText={taxiShareText()} shareUrl={shareUrl} onClose={() => setSafetyOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {taxiMode === 'completed' && (
          <RideComplete price={(taxiRide?.price || 0) + (taxiRide?.fee_included || 0)} feeIncluded={taxiRide?.fee_included || 0} paymentMethod={taxiRide?.payment_method || 'cash'}
            paymentState={paymentState} driver={taxiDriver}
            onSubmit={(rating) => finishRide(rating)} onSkip={() => finishRide(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
