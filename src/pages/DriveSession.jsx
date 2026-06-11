/**
 * Mode conduite — 5 places
 * + pour faire monter, × pour faire descendre
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionApi } from '../api/session.api';
import { useAuthStore } from '../store/authStore';

const CITIES     = [{ slug: 'douala', label: 'Douala' }, { slug: 'yaounde', label: 'Yaoundé' }];
const TRANSPORTS = [
  { value: 'taxi_collectif', label: '🚕 Taxi collectif' },
  { value: 'moto_taxi',      label: '🛵 Moto-taxi'      },
  { value: 'minibus',        label: '🚌 Minibus'         },
];
const QUICK_PRICES = [100, 150, 200, 300, 500];

export default function DriveSession() {
  const { isAuthenticated } = useAuthStore();

  const [city, setCity]           = useState('douala');
  const [transport, setTransport] = useState('taxi_collectif');
  const [running, setRunning]     = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionTime, setSessionTime] = useState(0);

  // seats : { 1: null | { tripId, fromName, startedAt }, ... }
  const [seats, setSeats] = useState({ 1:null, 2:null, 3:null, 4:null, 5:null });

  // Stats
  const [dropCount, setDropCount]   = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  // Modal descente
  const [dropSeat, setDropSeat]   = useState(null);  // seat number
  const [dropPrice, setDropPrice] = useState('');
  const [dropName, setDropName]   = useState('');
  const [dropping, setDropping]   = useState(false);

  const [error, setError]  = useState('');
  const [toast, setToast]  = useState('');

  const gpsRef      = useRef(null);
  const gpsBatchRef = useRef([]);
  const gpsFlushRef = useRef(null);
  const timerRef    = useRef(null);
  const posRef      = useRef(null);

  // ── Démarrer ───────────────────────────────────────────────────────────────
  const startSession = async () => {
    if (!isAuthenticated) { setError('Connecte-toi d\'abord'); return; }
    setError('');
    try {
      const res = await sessionApi.start({ city_slug: city, transport });
      setSessionId(res.session.id);
      setRunning(true);

      timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);

      gpsRef.current = navigator.geolocation.watchPosition(
        pos => {
          posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          gpsBatchRef.current.push({ lat: pos.coords.latitude, lng: pos.coords.longitude,
            speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null });
        },
        () => {}, { enableHighAccuracy: true, maximumAge: 0 }
      );

      gpsFlushRef.current = setInterval(async () => {
        if (!gpsBatchRef.current.length) return;
        const pts = gpsBatchRef.current.splice(0);
        sessionApi.gps(res.session.id, pts).catch(() => { gpsBatchRef.current = [...pts, ...gpsBatchRef.current]; });
      }, 10000);
    } catch (e) { setError(e.response?.data?.error?.message || e.response?.data?.error || 'Erreur réseau'); }
  };

  // ── Passager monte ─────────────────────────────────────────────────────────
  const board = async (seat) => {
    if (seats[seat]) return;
    const pos = posRef.current;
    if (!pos) { showToast('⚠️ GPS pas encore prêt'); return; }
    try {
      const res = await sessionApi.board(sessionId, { seat, lat: pos.lat, lng: pos.lng, city_slug: city });
      setSeats(s => ({ ...s, [seat]: {
        tripId:    res.trip.id,
        fromName:  res.snapped_to || '?',
        startedAt: Date.now(),
      }}));
      showToast('🟢 Passager ajouté');
    } catch (e) { showToast('❌ ' + (e.response?.data?.error?.message || e.response?.data?.error || 'Erreur')); }
  };

  // ── Ouvre modal descente ───────────────────────────────────────────────────
  const openDrop = (seat) => {
    setDropSeat(seat);
    setDropPrice('');
    setDropName('');
    setError('');
  };

  // ── Passager descend ───────────────────────────────────────────────────────
  const confirmDrop = async () => {
    const p = parseInt(dropPrice);
    if (!p || p <= 0) { setError('Choisis un prix'); return; }
    const pos = posRef.current;
    if (!pos) { setError('GPS pas disponible'); return; }
    setDropping(true);
    try {
      const trip = seats[dropSeat];
      const res  = await sessionApi.drop(sessionId, trip.tripId, {
        lat: pos.lat, lng: pos.lng, price_fcfa: p,
        stop_name: dropName || null, city_slug: city,
      });
      setSeats(s => ({ ...s, [dropSeat]: null }));
      setDropCount(c => c + 1);
      setTotalEarned(t => t + p);
      const name = res?.stop?.name || dropName || 'Arrêt';
      showToast(`✅ ${name} · ${p} F`);
      setDropSeat(null);
    } catch (e) { setError(e.response?.data?.error?.message || e.response?.data?.error || 'Erreur réseau'); }
    finally { setDropping(false); }
  };

  // ── Terminer ───────────────────────────────────────────────────────────────
  const endSession = async () => {
    clearInterval(timerRef.current);
    clearInterval(gpsFlushRef.current);
    if (gpsRef.current != null) navigator.geolocation.clearWatch(gpsRef.current);
    if (gpsBatchRef.current.length) await sessionApi.gps(sessionId, gpsBatchRef.current.splice(0)).catch(() => {});
    await sessionApi.end(sessionId).catch(() => {});
    setRunning(false); setSessionId(null); setSessionTime(0);
    setSeats({ 1:null, 2:null, 3:null, 4:null, 5:null });
    setDropCount(0); setTotalEarned(0);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fmt = s => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const occupiedCount = Object.values(seats).filter(Boolean).length;

  useEffect(() => () => {
    clearInterval(timerRef.current); clearInterval(gpsFlushRef.current);
    if (gpsRef.current != null) navigator.geolocation.clearWatch(gpsRef.current);
  }, []);

  // ── Config ─────────────────────────────────────────────────────────────────
  if (!running) return (
    <div className="min-h-screen bg-nawiy-light">
      <div className="bg-nawiy-dark text-white px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <a href="/driver" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">←</a>
          <div>
            <h1 className="font-bold text-xl">Mode conduite</h1>
            <p className="text-green-300 text-xs">+ pour faire monter · × pour faire descendre</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Ville</label>
          <div className="flex gap-2">
            {CITIES.map(c => (
              <button key={c.slug} onClick={() => setCity(c.slug)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition
                  ${city === c.slug ? 'bg-nawiy-green text-white' : 'bg-gray-100 text-gray-600'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Transport</label>
          <div className="flex flex-col gap-2">
            {TRANSPORTS.map(t => (
              <button key={t.value} onClick={() => setTransport(t.value)}
                className={`py-3 rounded-xl font-medium text-sm text-left px-4 transition
                  ${transport === t.value ? 'bg-nawiy-green text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {!isAuthenticated && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-700">
            ⚠️ <a href="/login" className="font-semibold underline">Connecte-toi</a> pour démarrer.
          </div>
        )}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button onClick={startSession} disabled={!isAuthenticated}
          className="w-full bg-nawiy-green text-white rounded-2xl py-5 font-bold text-xl shadow-lg hover:bg-nawiy-dark transition disabled:opacity-40">
          🚕 Démarrer
        </button>
      </div>
    </div>
  );

  // ── Conduite ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Header */}
      <div className="bg-nawiy-dark px-5 pt-10 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-sm font-semibold">Session active</span>
          </div>
          <div className="text-3xl font-mono font-bold">{fmt(sessionTime)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs mb-1">{occupiedCount}/5 places · {dropCount} déposés</div>
          <div className="text-nawiy-green text-xl font-bold">{totalEarned.toLocaleString()} F</div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div key={toast} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-gray-800 border-b border-gray-700 px-5 py-2.5 text-sm font-medium text-white">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voiture */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-4">
        <div className="bg-gray-800 rounded-3xl w-full max-w-xs border border-gray-700 overflow-hidden shadow-2xl">

          {/* Bande jaune taxi */}
          <div className="h-2 bg-yellow-400" />

          {/* Chauffeur */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-700">
            <div className="w-10 h-10 rounded-full bg-nawiy-green/20 flex items-center justify-center text-xl">🧑‍✈️</div>
            <div>
              <div className="font-semibold text-sm">Chauffeur</div>
              <div className="text-gray-400 text-xs">{TRANSPORTS.find(t=>t.value===transport)?.label} · {city === 'douala' ? 'Douala' : 'Yaoundé'}</div>
            </div>
          </div>

          {/* Places avant */}
          <div className="px-5 pt-4 pb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Avant</div>
            <div className="flex gap-3">
              {[1,2].map(seat => (
                <Seat key={seat} seat={seat} trip={seats[seat]}
                  onBoard={() => board(seat)}
                  onDrop={() => openDrop(seat)} />
              ))}
            </div>
          </div>

          {/* Places arrière */}
          <div className="px-5 pt-2 pb-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Arrière</div>
            <div className="flex gap-2">
              {[3,4,5].map(seat => (
                <Seat key={seat} seat={seat} trip={seats[seat]}
                  onBoard={() => board(seat)}
                  onDrop={() => openDrop(seat)} />
              ))}
            </div>
          </div>
        </div>

        <div className="text-gray-600 text-xs mt-5 text-center">
          <span className="text-gray-400 font-semibold">＋</span>{' '}passager monte{' · '}<span className="text-red-400 font-semibold">×</span>{' '}passager descend
        </div>
      </div>

      {/* Terminer */}
      <div className="p-4 border-t border-gray-800">
        <button onClick={endSession}
          className="w-full bg-gray-800 text-gray-400 rounded-xl py-3.5 font-semibold hover:bg-gray-700 transition">
          Terminer la session
        </button>
      </div>

      {/* ── Modal descente ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {dropSeat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setDropSeat(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-gray-900 rounded-t-3xl w-full px-6 pt-5 pb-10">

              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">🔴</div>
                <div>
                  <div className="font-bold text-lg">Passager descend</div>
                  <div className="text-gray-400 text-sm">
                    Monté à : <span className="text-white">{seats[dropSeat]?.fromName || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Prix rapides */}
              <div className="flex gap-2 mb-3">
                {QUICK_PRICES.map(p => (
                  <button key={p} onClick={() => setDropPrice(String(p))}
                    className={`flex-1 py-4 rounded-2xl font-bold text-lg transition
                      ${dropPrice === String(p)
                        ? 'bg-nawiy-green text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Nom arrêt optionnel */}
              <input value={dropName} onChange={e => setDropName(e.target.value)}
                placeholder="Nom de l'arrêt (optionnel)..."
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/40 mb-4"
              />

              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

              <button onClick={confirmDrop} disabled={dropping || !dropPrice}
                className="w-full bg-nawiy-green text-white rounded-2xl py-4 font-black text-xl disabled:opacity-40 hover:bg-nawiy-dark transition">
                {dropping ? '...' : `✅  Confirmer · ${dropPrice || '—'} F`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Composant place ─────────────────────────────────────────────────────────
function Seat({ seat, trip, onBoard, onDrop }) {
  const occupied = !!trip;
  const elapsed  = trip ? Math.round((Date.now() - trip.startedAt) / 60000) : 0;

  if (!occupied) {
    return (
      <motion.button whileTap={{ scale: 0.9 }} onClick={onBoard}
        className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gray-700/40 border-2 border-dashed border-gray-600 hover:border-gray-500 transition">
        <span className="text-2xl font-bold text-gray-500">＋</span>
        <span className="text-xs text-gray-600">Place {seat}</span>
      </motion.button>
    );
  }

  return (
    <motion.div className="flex-1 relative rounded-2xl bg-nawiy-green/15 border-2 border-nawiy-green py-3 px-2 flex flex-col items-center gap-1"
      initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
      <span className="text-2xl">🧑</span>
      <span className="text-xs text-gray-400 truncate w-full text-center">{trip.fromName}</span>
      <span className="text-xs text-gray-500">{elapsed}min</span>
      {/* Bouton × */}
      <button onClick={onDrop}
        className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-red-500 text-white font-bold text-base flex items-center justify-center shadow-lg hover:bg-red-600 transition">
        ×
      </button>
    </motion.div>
  );
}
