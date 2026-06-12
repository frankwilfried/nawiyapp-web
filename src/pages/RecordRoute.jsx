/**
 * Page d'enregistrement GPS d'un trajet — mode chauffeur
 * Le chauffeur déclare ses arrêts, démarre, conduit, termine.
 * La trace GPS est envoyée en temps réel pour construire le graphe.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { crowdsourceApi } from '../api/crowdsource.api';
import { STATIC_FOCAL_POINTS } from '../lib/staticData';
import { useAuthStore } from '../store/authStore';

const TRANSPORTS = [
  { value: 'taxi_collectif', label: '🚕 Taxi collectif' },
  { value: 'moto_taxi',      label: '🛵 Moto-taxi' },
  { value: 'minibus',        label: '🚌 Minibus' },
];

const CITIES = [
  { slug: 'douala',  label: 'Douala'  },
  { slug: 'yaounde', label: 'Yaoundé' },
];

// Étapes de l'interface
const STEP = { SETUP: 'setup', RECORDING: 'recording', DONE: 'done' };

export default function RecordRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // Config
  const [city, setCity]           = useState('douala');
  const [transport, setTransport] = useState('taxi_collectif');
  const [stops, setStops]         = useState([]);    // arrêts sélectionnés
  const [stopSearch, setStopSearch] = useState('');
  const [stopResults, setStopResults] = useState([]);

  // Enregistrement
  const [step, setStep]           = useState(STEP.SETUP);
  const [routeId, setRouteId]     = useState(null);
  const [gpsCount, setGpsCount]   = useState(0);
  const [duration, setDuration]   = useState(0);   // secondes
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);

  const watchIdRef   = useRef(null);
  const batchRef     = useRef([]);      // points GPS en attente d'envoi
  const timerRef     = useRef(null);
  const sendTimerRef = useRef(null);

  const nodes = STATIC_FOCAL_POINTS[city] || [];

  // Recherche d'arrêts
  useEffect(() => {
    if (!stopSearch) { setStopResults([]); return; }
    const q = stopSearch.toLowerCase();
    setStopResults(nodes.filter(n => n.name.toLowerCase().includes(q)).slice(0, 6));
  }, [stopSearch, nodes]);

  const addStop = (node) => {
    if (stops.find(s => s.focal_point_id === node.id)) return;
    setStops(s => [...s, {
      focal_point_id:   node.id,
      focal_point_name: node.name,
      lat: node.lat,
      lng: node.lng,
    }]);
    setStopSearch('');
    setStopResults([]);
  };

  const removeStop = (idx) => setStops(s => s.filter((_, i) => i !== idx));

  const moveStop = (idx, dir) => {
    setStops(s => {
      const arr = [...s];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // Envoie le batch GPS accumulé toutes les 10 secondes
  const flushGps = useCallback(async (id) => {
    if (!batchRef.current.length) return;
    const toSend = batchRef.current.splice(0);
    try {
      await crowdsourceApi.sendGps(id, toSend);
      setGpsCount(n => n + toSend.length);
    } catch { /* silencieux — on réessaie au prochain flush */ batchRef.current = [...toSend, ...batchRef.current]; }
  }, []);

  // Démarre l'enregistrement
  const startRecording = async () => {
    if (stops.length < 2) { setError('Ajoute au moins 2 arrêts'); return; }
    if (!isAuthenticated) { setError('Tu dois être connecté pour enregistrer un trajet'); return; }
    setLoading(true); setError('');
    try {
      const res = await crowdsourceApi.start({ city_slug: city, transport, stops });
      const rid = res.route_id;
      setRouteId(rid);
      setStep(STEP.RECORDING);

      // Chronomètre
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // GPS watchPosition
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          batchRef.current.push({
            lat:       pos.coords.latitude,
            lng:       pos.coords.longitude,
            speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
          });
        },
        (err) => console.warn('[GPS]', err.message),
        { enableHighAccuracy: true, maximumAge: 0 }
      );

      // Flush toutes les 10s
      sendTimerRef.current = setInterval(() => flushGps(rid), 10000);

    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors du démarrage');
    } finally { setLoading(false); }
  };

  // Termine l'enregistrement
  const finishRecording = async () => {
    setLoading(true);
    // Flush final
    clearInterval(sendTimerRef.current);
    clearInterval(timerRef.current);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    await flushGps(routeId);
    try {
      const res = await crowdsourceApi.finish(routeId);
      setResult(res);
      setStep(STEP.DONE);
    } catch (e) {
      setError('Erreur lors de la finalisation');
    } finally { setLoading(false); }
  };

  // Annule
  const cancelRecording = async () => {
    clearInterval(sendTimerRef.current);
    clearInterval(timerRef.current);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (routeId) await crowdsourceApi.cancel(routeId).catch(() => {});
    setStep(STEP.SETUP);
    setRouteId(null);
    setGpsCount(0);
    setDuration(0);
    batchRef.current = [];
  };

  // Cleanup au démontage
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(sendTimerRef.current);
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  const fmtDuration = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // ── ÉCRAN TERMINÉ ──────────────────────────────────────────────────────────
  if (step === STEP.DONE) {
    return (
      <div className="min-h-screen bg-nawiy-light flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-nawiy-dark mb-2">Trajet enregistré !</h2>
          <p className="text-gray-500 text-sm mb-1">
            <strong>{stops.map(s => s.focal_point_name).join(' → ')}</strong>
          </p>
          <p className="text-gray-400 text-sm mb-2">
            {gpsCount} points GPS · {fmtDuration(duration)}
          </p>
          <div className="bg-nawiy-light rounded-xl p-3 mb-6 text-sm text-nawiy-green font-medium">
            ✅ En attente de validation — l'équipe NawiyApp va l'intégrer dans le graphe de navigation.
          </div>
          <button onClick={() => { setStep(STEP.SETUP); setStops([]); setGpsCount(0); setDuration(0); setResult(null); }}
            className="w-full bg-nawiy-green text-white rounded-xl py-3 font-semibold hover:bg-nawiy-dark transition mb-3">
            Enregistrer un autre trajet
          </button>
          <button onClick={() => navigate('/')} className="block text-sm text-gray-400 hover:underline">← Retour à la carte</button>
        </motion.div>
      </div>
    );
  }

  // ── ÉCRAN ENREGISTREMENT EN COURS ──────────────────────────────────────────
  if (step === STEP.RECORDING) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Header pulsant */}
        <div className="bg-red-600 px-4 pt-12 pb-4 flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
          <div>
            <div className="font-bold text-lg">Enregistrement en cours</div>
            <div className="text-red-200 text-sm">{TRANSPORTS.find(t => t.value === transport)?.label}</div>
          </div>
          <div className="ml-auto text-2xl font-mono font-bold">{fmtDuration(duration)}</div>
        </div>

        {/* Arrêts */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Itinéraire déclaré</h3>
          <div className="space-y-2">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${i === 0 ? 'bg-nawiy-green' : i === stops.length-1 ? 'bg-red-500' : 'bg-gray-600'}`}>
                  {i === 0 ? '🟢' : i === stops.length-1 ? '🔴' : i+1}
                </div>
                <div className="text-white font-medium">{s.focal_point_name}</div>
                {i < stops.length-1 && <div className="ml-auto text-gray-500 text-xs">↓</div>}
              </div>
            ))}
          </div>

          {/* Stats GPS */}
          <div className="mt-8 bg-gray-800 rounded-2xl p-4 text-center">
            <div className="text-4xl font-bold text-nawiy-green">{gpsCount}</div>
            <div className="text-gray-400 text-sm mt-1">points GPS enregistrés</div>
            <div className="mt-3 flex justify-center gap-1">
              {[...Array(Math.min(gpsCount, 20))].map((_, i) => (
                <div key={i} className="w-1.5 h-4 bg-nawiy-green rounded-full opacity-70" style={{ height: 8 + Math.random()*16 }} />
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-xs text-center mt-4">
            Conduis normalement — le GPS enregistre automatiquement ta route
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3 border-t border-gray-800">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button onClick={finishRecording} disabled={loading}
            className="w-full bg-nawiy-green text-white rounded-xl py-4 font-bold text-lg hover:bg-nawiy-dark transition disabled:opacity-50">
            {loading ? 'Envoi en cours...' : '✅ Terminer et soumettre'}
          </button>
          <button onClick={cancelRecording}
            className="w-full bg-gray-800 text-gray-400 rounded-xl py-3 font-medium hover:bg-gray-700 transition">
            Annuler l'enregistrement
          </button>
        </div>
      </div>
    );
  }

  // ── ÉCRAN CONFIGURATION ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-nawiy-light">
      {/* Header */}
      <div className="bg-nawiy-dark text-white px-4 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/driver')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition active:scale-95" aria-label="Retour">←</button>
          <div>
            <h1 className="font-bold text-xl">Enregistrer un trajet</h1>
            <p className="text-green-300 text-xs">Aide à construire la carte NawiyApp</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-lg mx-auto">

        {/* Ville */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Ville</label>
          <div className="flex gap-2">
            {CITIES.map(c => (
              <button key={c.slug} onClick={() => { setCity(c.slug); setStops([]); }}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition
                  ${city === c.slug ? 'bg-nawiy-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transport */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Type de transport</label>
          <div className="flex flex-col gap-2">
            {TRANSPORTS.map(t => (
              <button key={t.value} onClick={() => setTransport(t.value)}
                className={`py-3 rounded-xl font-medium text-sm transition text-left px-4
                  ${transport === t.value ? 'bg-nawiy-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Arrêts */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Arrêts du trajet <span className="text-gray-400 font-normal">(dans l'ordre, min 2)</span>
          </label>

          {/* Liste des arrêts sélectionnés */}
          {stops.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {stops.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-nawiy-light rounded-xl px-3 py-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i === 0 ? 'bg-nawiy-green text-white' : i === stops.length-1 ? 'bg-red-400 text-white' : 'bg-gray-300 text-gray-700'}`}>
                    {i+1}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800">{s.focal_point_name}</span>
                  <div className="flex gap-1">
                    {i > 0 && (
                      <button onClick={() => moveStop(i, -1)} className="w-6 h-6 rounded-lg bg-white text-gray-500 text-xs hover:bg-gray-100 flex items-center justify-center">↑</button>
                    )}
                    {i < stops.length-1 && (
                      <button onClick={() => moveStop(i, 1)} className="w-6 h-6 rounded-lg bg-white text-gray-500 text-xs hover:bg-gray-100 flex items-center justify-center">↓</button>
                    )}
                    <button onClick={() => removeStop(i)} className="w-6 h-6 rounded-lg bg-white text-red-400 text-xs hover:bg-red-50 flex items-center justify-center">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recherche d'arrêts */}
          <div className="relative">
            <input
              value={stopSearch}
              onChange={e => setStopSearch(e.target.value)}
              placeholder={stops.length === 0 ? 'Ajoute le 1er arrêt (départ)...' : stops.length === 1 ? 'Ajoute la destination...' : 'Ajouter un arrêt intermédiaire...'}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
            />
            {stopSearch && (
              <button onClick={() => { setStopSearch(''); setStopResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">✕</button>
            )}
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {stopResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-2 space-y-1">
                {stopResults.map(n => (
                  <button key={n.id} onClick={() => addStop(n)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-nawiy-light transition">
                    <span className="text-lg">{n.type === 'marche' ? '🏪' : n.type === 'transport' ? '🚉' : n.type === 'universite' ? '🏫' : '📍'}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{n.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{n.type}</div>
                    </div>
                    <span className="ml-auto text-nawiy-green text-lg">+</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Résumé + bouton démarrer */}
        {stops.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-nawiy-dark text-white rounded-2xl p-4">
            <div className="text-sm font-medium mb-1">
              {stops.map(s => s.focal_point_name).join(' → ')}
            </div>
            <div className="text-green-300 text-xs mb-4">
              {TRANSPORTS.find(t => t.value === transport)?.label} · {stops.length} arrêts · {city === 'douala' ? 'Douala' : 'Yaoundé'}
            </div>
            <p className="text-green-200 text-xs mb-4">
              📱 Démarre l'enregistrement puis conduis normalement. L'app suit ta position GPS pour cartographier la route réelle.
            </p>
            {error && <p className="text-red-300 text-sm mb-3">{error}</p>}
            <button onClick={startRecording} disabled={loading}
              className="w-full bg-nawiy-green text-white rounded-xl py-4 font-bold text-lg hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Démarrage...' : '🔴 Démarrer l\'enregistrement'}
            </button>
          </motion.div>
        )}

        {!isAuthenticated && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-700">
            ⚠️ Tu dois être <a href="/login" className="font-semibold underline">connecté</a> pour enregistrer un trajet.
          </div>
        )}

        {/* Mes trajets soumis */}
        <MyRoutes />

        <div className="h-6" />
      </div>
    </div>
  );
}

// ── Composant : mes trajets soumis ─────────────────────────────────────────
function MyRoutes() {
  const { isAuthenticated } = useAuthStore();
  const [routes, setRoutes] = useState([]);
  const [open, setOpen]     = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !open) return;
    crowdsourceApi.mine().then(setRoutes).catch(() => {});
  }, [open, isAuthenticated]);

  if (!isAuthenticated) return null;

  const statusColor = { pending: 'text-orange-500', approved: 'text-green-600', rejected: 'text-red-500', recording: 'text-blue-500' };
  const statusLabel = { pending: '⏳ En attente', approved: '✅ Approuvé', rejected: '❌ Rejeté', recording: '🔴 En cours' };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
        <span>📋 Mes trajets soumis</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100">
          {routes.length === 0
            ? <p className="text-sm text-gray-400 text-center py-6">Aucun trajet soumis pour l'instant</p>
            : routes.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{r.name}</div>
                  <div className="text-xs text-gray-400">{r.total_gps_pts} pts GPS · {new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <span className={`text-xs font-semibold ${statusColor[r.status]}`}>{statusLabel[r.status]}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
