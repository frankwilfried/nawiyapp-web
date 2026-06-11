/**
 * Mode testeur passager — enregistrement d'un trajet réel
 * Interface minimaliste : Arrêt = 2 taps (transport + prix)
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1');

const TRANSPORTS = [
  { value: 'a_pied',        icon: '🚶', label: 'À pied'   },
  { value: 'taxi_collectif',icon: '🚕', label: 'Taxi'     },
  { value: 'moto_taxi',     icon: '🛵', label: 'Moto'     },
  { value: 'minibus',       icon: '🚌', label: 'Minibus'  },
];
const QUICK_PRICES = [0, 100, 150, 200, 300, 500];

// Centres des villes — détection automatique par GPS
const CITY_CENTERS = [
  { slug: 'douala',  label: 'Douala',  lat: 4.0511,  lng: 9.7679  },
  { slug: 'yaounde', label: 'Yaoundé', lat: 3.8480,  lng: 11.5021 },
];

function detectCity(lat, lng) {
  let nearest = CITY_CENTERS[0], minD = Infinity;
  for (const c of CITY_CENTERS) {
    const d = Math.hypot(lat - c.lat, lng - c.lng);
    if (d < minD) { minD = d; nearest = c; }
  }
  return nearest.slug;
}

function authHeader() {
  const t = localStorage.getItem('nawiy_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function PassengerRecord() {
  const [phase, setPhase]     = useState('setup');   // setup | recording | done
  const [city, setCity]       = useState('douala');
  const [cityLabel, setCityLabel] = useState('');
  const [testerName, setTesterName]   = useState('');
  const [testerPhone, setTesterPhone] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [legs, setLegs]       = useState([]);

  // Modal arrêt
  const [modal, setModal]     = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [nextT, setNextT]     = useState(null);       // transport sélectionné dans modal
  const nextTRef              = useRef(null);
  const [price, setPrice]     = useState(null);
  const [showName, setShowName] = useState(false);
  const [stopName, setStopName] = useState('');

  // Transport courant (affiché en header)
  const [currentT, setCurrentT] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]     = useState(null);

  const posRef      = useRef(null);
  const gpsBatch    = useRef([]);
  const gpsWatchId  = useRef(null);
  const timerRef    = useRef(null);
  const legStartPos = useRef(null);
  const legStartAt  = useRef(null);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  const tIcon = v => TRANSPORTS.find(t => t.value === v)?.icon || '?';

  // ── Démarrer ─────────────────────────────────────────────────────────────────
  const start = () => {
    try {
      if (navigator.geolocation) {
        gpsWatchId.current = navigator.geolocation.watchPosition(
          pos => {
            const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            posRef.current = p;
            gpsBatch.current.push({ ...p, speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null });
            if (!legStartPos.current) {
              legStartPos.current = p;
              // Auto-détecte la ville à la première position GPS
              const slug = detectCity(p.lat, p.lng);
              const found = CITY_CENTERS.find(c => c.slug === slug);
              setCity(slug);
              setCityLabel(found?.label || '');
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }
    } catch (_) {}
    legStartAt.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setPhase('recording');
  };

  // ── Annuler le dernier arrêt ──────────────────────────────────────────────────
  const undoLastLeg = () => {
    if (legs.length === 0) return;
    const newLegs = legs.slice(0, -1);
    const last = legs[legs.length - 1];
    setLegs(newLegs);
    setCurrentT(newLegs.length === 0 ? null : last.transport);
    legStartPos.current = last.from_lat ? { lat: last.from_lat, lng: last.from_lng } : null;
    legStartAt.current  = Date.now();
  };

  // ── Ouvre modal arrêt ─────────────────────────────────────────────────────────
  const openStop = (final = false) => {
    setIsFinal(final);
    setNextT(null);
    nextTRef.current = null;
    setPrice(null);
    setStopName('');
    setShowName(false);
    setModal(true);
  };

  // ── Confirmer l'arrêt ─────────────────────────────────────────────────────────
  const confirmStop = () => {
    const chosenT = nextTRef.current;
    const fromName = legs.length === 0 ? 'Départ' : legs[legs.length - 1].to_name;
    const toName   = stopName || (isFinal ? 'Arrivée' : 'Arrêt');

    const newLeg = {
      transport:    currentT || 'a_pied',
      price_fcfa:   price || 0,
      from_name:    fromName,
      to_name:      toName,
      from_lat:     legStartPos.current?.lat,
      from_lng:     legStartPos.current?.lng,
      to_lat:       posRef.current?.lat,
      to_lng:       posRef.current?.lng,
      duration_min: Math.round((Date.now() - legStartAt.current) / 60000),
    };

    const newLegs = [...legs, newLeg];
    setLegs(newLegs);
    setModal(false);

    if (isFinal) {
      finalize(newLegs);
    } else {
      setCurrentT(chosenT);
      legStartPos.current = posRef.current;
      legStartAt.current  = Date.now();
    }
  };

  // ── Finaliser ─────────────────────────────────────────────────────────────────
  const finalize = async (finalLegs) => {
    clearInterval(timerRef.current);
    if (gpsWatchId.current != null) navigator.geolocation.clearWatch(gpsWatchId.current);
    setPhase('done');
    setSubmitting(true);
    try {
      const res = await axios.post(`${BASE}/trips/record`, {
        city_slug: city,
        legs: finalLegs,
        gps_trace: gpsBatch.current,
        tester_name:  testerName  || null,
        tester_phone: testerPhone || null,
      }, { headers: authHeader() });
      setDone(res.data);
    } catch (_) {
      setDone({ legs: finalLegs });
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = isFinal ? price !== null : (nextTRef.current !== null && price !== null);

  // ─────────────────────────────────────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="min-h-screen bg-nawiy-light flex flex-col">
      <div className="bg-nawiy-dark text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <a href="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">←</a>
          <div>
            <h1 className="font-bold text-xl">Enregistrer un trajet</h1>
            <p className="text-green-300 text-xs">Aide à construire la carte NawiyApp</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-4 max-w-sm mx-auto w-full">

        {/* Identification testeur */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Qui es-tu ? <span className="normal-case text-gray-300 font-normal">(optionnel)</span></p>
          <div className="flex flex-col gap-3">
            <input value={testerName} onChange={e => setTesterName(e.target.value)}
              placeholder="Ton prénom ou pseudo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
            />
            <input value={testerPhone} onChange={e => setTesterPhone(e.target.value)}
              placeholder="Ton numéro WhatsApp (ex: 6XXXXXXXX)"
              type="tel"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
            />
          </div>
        </div>

        {/* Instructions visuelles */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Comment ça marche</p>
          <div className="flex flex-col gap-3">
            {[
              ['🟢', 'Démarre ton trajet'],
              ['📍', 'Tape "Arrêt" à chaque changement de transport'],
              ['🏁', 'Tape "J\'arrive" à ta destination'],
            ].map(([icon, text], i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{icon}</span>
                <span className="text-sm text-gray-600">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={start}
          className="w-full bg-nawiy-green text-white rounded-2xl py-5 font-black text-xl shadow-lg hover:bg-nawiy-dark transition">
          🟢 Démarrer
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-5">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-sm w-full">
        <div className="text-6xl mb-4">{submitting ? '⏳' : '🎉'}</div>
        <h2 className="text-2xl font-bold mb-2">{submitting ? 'Envoi...' : 'Trajet enregistré !'}</h2>
        {!submitting && (
          <>
            <p className="text-gray-400 text-sm mb-6">Merci ! Ton trajet aide à construire la carte NawiyApp.</p>
            <div className="bg-gray-800 rounded-2xl overflow-hidden mb-6">
              {(done?.legs || legs).map((leg, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < legs.length - 1 ? 'border-b border-gray-700' : ''}`}>
                  <span className="text-xl w-8 text-center">{tIcon(leg.transport)}</span>
                  <div className="flex-1 text-sm text-left">
                    <span className="text-gray-300">{leg.from_name}</span>
                    <span className="text-gray-600 mx-1">→</span>
                    <span className="text-white font-medium">{leg.to_name}</span>
                  </div>
                  {leg.price_fcfa > 0 && <span className="text-nawiy-green text-sm font-bold">{leg.price_fcfa} F</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPhase('setup'); setLegs([]); setElapsed(0); setDone(null); setCurrentT(null); }}
                className="flex-1 bg-nawiy-green text-white rounded-2xl py-3 font-bold">
                Nouveau trajet
              </button>
              <a href="/" className="flex-1 bg-gray-700 text-gray-300 rounded-2xl py-3 font-bold text-center">
                Retour carte
              </a>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col select-none">

      {/* Header */}
      <div className="bg-nawiy-dark px-5 pt-10 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-300 text-xs font-semibold tracking-wide uppercase">Enregistrement</span>
            {cityLabel && <span className="text-gray-400 text-xs">· {cityLabel}</span>}
          </div>
          <div className="text-4xl font-mono font-bold tracking-tight">{fmt(elapsed)}</div>
        </div>
        {currentT && (
          <div className="text-right">
            <div className="text-4xl">{tIcon(currentT)}</div>
            <div className="text-xs text-gray-400 mt-1">{TRANSPORTS.find(t=>t.value===currentT)?.label}</div>
          </div>
        )}
      </div>

      {/* Timeline des arrêts */}
      <div className="flex-1 px-5 py-4 overflow-y-auto">
        {legs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <span className="text-5xl">📍</span>
            <p className="text-sm">Départ enregistré</p>
            <p className="text-xs">Tape <strong className="text-gray-400">Arrêt</strong> quand tu changes de transport</p>
          </div>
        ) : (
          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-gray-700" />
            {legs.map((leg, i) => (
              <motion.div key={i} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                className="flex items-start gap-4 mb-4 relative">
                <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center text-xl z-10 flex-shrink-0">
                  {tIcon(leg.transport)}
                </div>
                <div className="flex-1 bg-gray-800 rounded-2xl px-4 py-3">
                  <div className="text-sm font-medium">
                    <span className="text-gray-400">{leg.from_name}</span>
                    <span className="text-gray-600 mx-1.5">→</span>
                    <span className="text-white">{leg.to_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                    {leg.duration_min > 0 && <span>{leg.duration_min} min</span>}
                    {leg.price_fcfa > 0  && <span className="text-nawiy-green font-semibold">{leg.price_fcfa} F</span>}
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Indicateur transport en cours */}
            {currentT && (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-nawiy-green/20 border-2 border-nawiy-green flex items-center justify-center text-xl z-10 flex-shrink-0 animate-pulse">
                  {tIcon(currentT)}
                </div>
                <div className="text-sm text-gray-500 italic">En cours…</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boutons actions */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <div className="flex gap-3">
          <button onClick={() => openStop(false)}
            className="flex-1 bg-gray-700 text-white rounded-2xl py-4 font-bold text-base hover:bg-gray-600 transition flex items-center justify-center gap-2">
            📍 Arrêt
          </button>
          <button onClick={() => openStop(true)}
            className="flex-1 bg-nawiy-green text-white rounded-2xl py-4 font-black text-base shadow-lg hover:bg-nawiy-dark transition flex items-center justify-center gap-2">
            🏁 J'arrive
          </button>
        </div>
        {legs.length > 0 && (
          <button onClick={undoLastLeg}
            className="w-full text-gray-600 text-sm py-2 hover:text-red-400 transition flex items-center justify-center gap-1">
            ↩ Annuler le dernier arrêt
          </button>
        )}
      </div>

      {/* ── Modal arrêt ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="bg-gray-900 rounded-t-3xl w-full px-5 pt-4 pb-10">

              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />

              <h3 className="font-bold text-lg mb-4 text-center">
                {isFinal ? '🏁 Tu es arrivé ?' : '📍 Tu changes de transport ?'}
              </h3>

              {/* ── Prix payé ── */}
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Prix payé pour ce tronçon</p>
              <div className="flex gap-2 mb-3">
                {QUICK_PRICES.map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    className={`flex-1 py-4 rounded-2xl font-bold text-base transition
                      ${price === p ? 'bg-nawiy-green text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                    {p === 0 ? '0' : p}<span className="text-xs font-normal ml-0.5 opacity-70">F</span>
                  </button>
                ))}
              </div>
              <input
                type="number" min="0" step="25"
                placeholder="Autre montant (ex: 175)"
                value={price !== null && !QUICK_PRICES.includes(price) ? price : ''}
                onChange={e => {
                  const v = e.target.value;
                  setPrice(v === '' ? null : parseInt(v, 10));
                }}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-nawiy-green/40 placeholder-gray-600"
              />

              {/* ── Prochain transport (si pas arrivée finale) ── */}
              {!isFinal && (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Je prends ensuite</p>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {TRANSPORTS.map(t => (
                      <button key={t.value}
                        onClick={() => { setNextT(t.value); nextTRef.current = t.value; }}
                        className={`flex flex-col items-center py-3 rounded-2xl transition gap-1
                          ${nextT === t.value ? 'bg-nawiy-green text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ── Nom de l'arrêt ── */}
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                {isFinal ? 'Nom de ta destination' : 'Nom de cet arrêt'}
              </p>
              <input value={stopName} onChange={e => setStopName(e.target.value)}
                placeholder={isFinal ? 'Ex: Marché central, Akwa...' : 'Ex: Ndokotti, Carrefour Deido...'}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/40 placeholder-gray-600"
              />
              {!stopName && (
                <p className="text-xs text-amber-500/80 mt-1.5 mb-3">
                  ⚠️ Sans nom, cet arrêt ne peut pas être ajouté à la carte
                </p>
              )}
              {stopName && <div className="mb-3" />}

              <button onClick={confirmStop} disabled={!canConfirm}
                className="w-full bg-nawiy-green text-white rounded-2xl py-4 font-black text-xl disabled:opacity-30 hover:bg-nawiy-dark transition">
                {isFinal ? '✅ Terminer' : '➡️ Continuer'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
