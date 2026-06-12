/**
 * Mode testeur passager — enregistrement d'un trajet réel
 * Interface minimaliste : Arrêt = 2 taps (transport + prix)
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1');

const TRANSPORTS = [
  { value: 'a_pied',        icon: '🚶', label: 'À pied'   },
  { value: 'taxi_collectif',icon: '🚕', label: 'Taxi'     },
  { value: 'moto_taxi',     icon: '🛵', label: 'Moto'     },
  { value: 'minibus',       icon: '🚌', label: 'Minibus'  },
];
const QUICK_PRICES = [0, 100, 150, 200, 300, 500];

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
  const [phase, setPhase]     = useState('setup');
  const [city, setCity]       = useState('douala');
  const [cityLabel, setCityLabel] = useState('');
  const [testerName, setTesterName]   = useState('');
  const [testerPhone, setTesterPhone] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [legs, setLegs]       = useState([]);

  const [modal, setModal]     = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [nextT, setNextT]     = useState(null);
  const nextTRef              = useRef(null);
  const [price, setPrice]     = useState(null);
  const [stopName, setStopName] = useState('');
  const [currentT, setCurrentT] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]     = useState(null);
  const [gpsActive, setGpsActive] = useState(false);

  const navigate = useNavigate();
  const posRef      = useRef(null);
  const gpsBatch    = useRef([]);
  const gpsWatchId  = useRef(null);
  const timerRef    = useRef(null);
  const legStartPos = useRef(null);
  const legStartAt  = useRef(null);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  const tIcon = v => TRANSPORTS.find(t => t.value === v)?.icon || '?';

  const start = () => {
    try {
      if (navigator.geolocation) {
        gpsWatchId.current = navigator.geolocation.watchPosition(
          pos => {
            const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            posRef.current = p;
            setGpsActive(true);
            gpsBatch.current.push({ ...p, speed_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null });
            if (!legStartPos.current) {
              legStartPos.current = p;
              const slug = detectCity(p.lat, p.lng);
              const found = CITY_CENTERS.find(c => c.slug === slug);
              setCity(slug);
              setCityLabel(found?.label || '');
            }
          },
          () => { setGpsActive(false); },
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }
    } catch (_) {}
    legStartAt.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setPhase('recording');
  };

  const undoLastLeg = () => {
    if (legs.length === 0) return;
    const newLegs = legs.slice(0, -1);
    const last = legs[legs.length - 1];
    setLegs(newLegs);
    setCurrentT(newLegs.length === 0 ? null : last.transport);
    legStartPos.current = last.from_lat ? { lat: last.from_lat, lng: last.from_lng } : null;
    legStartAt.current  = Date.now();
  };

  const openStop = (final = false) => {
    setIsFinal(final);
    setNextT(null);
    nextTRef.current = null;
    setPrice(null);
    setStopName('');
    setModal(true);
  };

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
    <div className="min-h-screen bg-[#0f1923] text-white flex flex-col">

      {/* Hero header */}
      <div className="relative overflow-hidden px-5 pt-12 pb-8">
        {/* Fond dégradé décoratif */}
        <div className="absolute inset-0 bg-gradient-to-br from-nawiy-green/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-nawiy-green/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition active:scale-95 flex-shrink-0">
            ←
          </button>
          <div>
            <p className="text-nawiy-green text-xs font-semibold tracking-widest uppercase">NawiyApp · Beta</p>
            <h1 className="text-2xl font-black leading-tight">Enregistrer un trajet</h1>
          </div>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed">
          Chaque trajet que tu enregistres aide à construire la carte des transports de ta ville.
        </p>
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col gap-4">

        {/* Identification */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Qui es-tu ? <span className="normal-case text-gray-600 font-normal">(optionnel)</span>
          </p>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">👤</span>
              <input value={testerName} onChange={e => setTesterName(e.target.value)}
                placeholder="Ton prénom ou pseudo"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-nawiy-green/60 transition"
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">📱</span>
              <input value={testerPhone} onChange={e => setTesterPhone(e.target.value)}
                placeholder="WhatsApp (ex: 6XXXXXXXX)"
                type="tel"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-nawiy-green/60 transition"
              />
            </div>
          </div>
        </div>

        {/* Comment ça marche */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Comment ça marche</p>
          <div className="flex flex-col gap-4">
            {[
              { icon: '🟢', color: 'bg-green-500/20 text-green-400', step: '1', text: 'Démarre ton trajet' },
              { icon: '📍', color: 'bg-amber-500/20 text-amber-400', step: '2', text: 'Tape "Arrêt" à chaque changement de transport' },
              { icon: '🏁', color: 'bg-blue-500/20 text-blue-400',   step: '3', text: 'Tape "J\'arrive" à ta destination' },
            ].map(({ icon, color, step, text }) => (
              <div key={step} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-xl flex-shrink-0`}>
                  {icon}
                </div>
                <span className="text-sm text-gray-300 leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={start}
          className="w-full bg-nawiy-green text-white rounded-2xl py-5 font-black text-lg shadow-lg shadow-nawiy-green/20 hover:bg-green-500 transition active:scale-[0.98] flex items-center justify-center gap-3 mt-auto">
          <span className="text-2xl">🟢</span> Démarrer
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'done') return (
    <div className="min-h-screen bg-[#0f1923] text-white flex flex-col items-center justify-center px-5">
      <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm">

        {submitting ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 animate-bounce">⏳</div>
            <p className="text-gray-400">Envoi du trajet…</p>
          </div>
        ) : (
          <>
            {/* Succès */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-nawiy-green/20 flex items-center justify-center text-5xl mx-auto mb-4">
                🎉
              </div>
              <h2 className="text-2xl font-black mb-1">Trajet enregistré !</h2>
              <p className="text-gray-400 text-sm">Merci {testerName || ''} · {legs.length} tronçon{legs.length > 1 ? 's' : ''} · {fmt(elapsed)}</p>
            </div>

            {/* Résumé des tronçons */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-5">
              {(done?.legs || legs).map((leg, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < legs.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <span className="text-xl w-8 text-center">{tIcon(leg.transport)}</span>
                  <div className="flex-1 text-sm">
                    <span className="text-gray-400">{leg.from_name}</span>
                    <span className="text-gray-600 mx-1.5">→</span>
                    <span className="text-white font-semibold">{leg.to_name}</span>
                  </div>
                  {leg.price_fcfa > 0 && (
                    <span className="text-nawiy-green text-sm font-bold">{leg.price_fcfa} F</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setPhase('setup'); setLegs([]); setElapsed(0); setDone(null); setCurrentT(null); }}
                className="flex-1 bg-nawiy-green text-white rounded-2xl py-4 font-bold hover:bg-green-500 transition active:scale-[0.98]">
                Nouveau
              </button>
              <button onClick={() => navigate('/')}
                className="flex-1 bg-white/10 text-gray-300 rounded-2xl py-4 font-bold hover:bg-white/15 transition active:scale-[0.98]">
                Carte
              </button>
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
    <div className="min-h-screen bg-[#0f1923] text-white flex flex-col select-none">

      {/* Header */}
      <div className="relative bg-gradient-to-b from-[#0a1a12] to-[#0f1923] px-5 pt-10 pb-5">
        <div className="absolute inset-0 bg-nawiy-green/5 pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => {
              clearInterval(timerRef.current);
              if (gpsWatchId.current != null) navigator.geolocation.clearWatch(gpsWatchId.current);
              setPhase('setup'); setLegs([]); setElapsed(0); setCurrentT(null);
            }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition active:scale-95 flex-shrink-0 mt-1" aria-label="Retour">←</button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-400 text-xs font-bold tracking-widest uppercase">Enregistrement</span>
                {cityLabel && <span className="text-gray-500 text-xs">· {cityLabel}</span>}
              </div>
              <div className="text-5xl font-mono font-black tracking-tighter leading-none">{fmt(elapsed)}</div>
              <div className={`flex items-center gap-1.5 mt-2 ${gpsActive ? 'text-nawiy-green' : 'text-gray-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${gpsActive ? 'bg-nawiy-green animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-xs">{gpsActive ? 'GPS actif' : 'GPS en attente…'}</span>
              </div>
            </div>
          </div>
          {currentT && (
            <div className="text-center bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
              <div className="text-3xl">{tIcon(currentT)}</div>
              <div className="text-xs text-gray-500 mt-1">{TRANSPORTS.find(t=>t.value===currentT)?.label}</div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-5 py-5 overflow-y-auto">
        {legs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-nawiy-green/10 border border-nawiy-green/20 flex items-center justify-center text-3xl">
              📍
            </div>
            <p className="text-gray-400 text-sm font-medium">Départ enregistré</p>
            <p className="text-gray-600 text-xs max-w-[200px]">Tape <span className="text-gray-400 font-bold">Arrêt</span> quand tu changes de transport</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-px bg-white/5" />
            {legs.map((leg, i) => (
              <motion.div key={i} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                className="flex items-start gap-4 mb-3 relative">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl z-10 flex-shrink-0">
                  {tIcon(leg.transport)}
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="text-sm font-medium">
                    <span className="text-gray-500">{leg.from_name}</span>
                    <span className="text-gray-700 mx-1.5">→</span>
                    <span className="text-white">{leg.to_name}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 flex gap-3">
                    {leg.duration_min > 0 && <span>{leg.duration_min} min</span>}
                    {leg.price_fcfa > 0  && <span className="text-nawiy-green font-semibold">{leg.price_fcfa} F</span>}
                  </div>
                </div>
              </motion.div>
            ))}
            {currentT && (
              <div className="flex items-center gap-4 ml-0">
                <div className="w-10 h-10 rounded-full border-2 border-nawiy-green/50 bg-nawiy-green/10 flex items-center justify-center text-xl z-10 flex-shrink-0 animate-pulse">
                  {tIcon(currentT)}
                </div>
                <span className="text-sm text-gray-600 italic">En cours…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 flex flex-col gap-2">
        <div className="flex gap-3">
          <button onClick={() => openStop(false)}
            className="flex-1 bg-white/10 border border-white/10 text-white rounded-2xl py-5 font-bold text-base hover:bg-white/15 transition active:scale-[0.97] flex items-center justify-center gap-2">
            📍 Arrêt
          </button>
          <button onClick={() => openStop(true)}
            className="flex-1 bg-nawiy-green text-white rounded-2xl py-5 font-black text-base shadow-lg shadow-nawiy-green/20 hover:bg-green-500 transition active:scale-[0.97] flex items-center justify-center gap-2">
            🏁 J'arrive
          </button>
        </div>
        {legs.length > 0 && (
          <button onClick={undoLastLeg}
            className="w-full text-gray-700 text-sm py-2 hover:text-red-400 transition flex items-center justify-center gap-1">
            ↩ Annuler le dernier arrêt
          </button>
        )}
      </div>

      {/* ── Modal arrêt ── */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="bg-[#141f2e] border-t border-white/10 rounded-t-3xl w-full px-5 pt-4 pb-10">

              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

              <h3 className="font-black text-lg mb-5 text-center">
                {isFinal ? '🏁 Tu es arrivé ?' : '📍 Tu changes de transport ?'}
              </h3>

              {/* Prix */}
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Prix payé</p>
              <div className="flex gap-2 mb-3">
                {QUICK_PRICES.map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition
                      ${price === p
                        ? 'bg-nawiy-green text-white shadow-lg shadow-nawiy-green/30 scale-105'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'}`}>
                    {p === 0 ? '0' : p}<span className="text-xs font-normal opacity-60 ml-0.5">F</span>
                  </button>
                ))}
              </div>
              <input
                type="number" min="0" step="25"
                placeholder="Autre montant…"
                value={price !== null && !QUICK_PRICES.includes(price) ? price : ''}
                onChange={e => {
                  const v = e.target.value;
                  setPrice(v === '' ? null : parseInt(v, 10));
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-nawiy-green/50 placeholder-gray-700 text-white transition"
              />

              {/* Prochain transport */}
              {!isFinal && (
                <>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Je prends ensuite</p>
                  <div className="grid grid-cols-4 gap-2 mb-5">
                    {TRANSPORTS.map(t => (
                      <button key={t.value}
                        onClick={() => { setNextT(t.value); nextTRef.current = t.value; }}
                        className={`flex flex-col items-center py-3 rounded-2xl transition gap-1
                          ${nextT === t.value
                            ? 'bg-nawiy-green text-white shadow-lg shadow-nawiy-green/20 scale-105'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'}`}>
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Nom de l'arrêt */}
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                {isFinal ? 'Nom de ta destination' : 'Nom de cet arrêt'}
              </p>
              <input value={stopName} onChange={e => setStopName(e.target.value)}
                placeholder={isFinal ? 'Ex: Marché central, Akwa…' : 'Ex: Ndokotti, Carrefour Deido…'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green/50 placeholder-gray-700 text-white transition mb-1"
              />
              {!stopName && (
                <p className="text-xs text-amber-500/70 mb-4 flex items-center gap-1.5">
                  <span>⚠️</span> Sans nom, cet arrêt ne sera pas ajouté à la carte
                </p>
              )}
              {stopName && <div className="mb-4" />}

              <button onClick={confirmStop} disabled={!canConfirm}
                className="w-full bg-nawiy-green text-white rounded-2xl py-4 font-black text-lg disabled:opacity-25 hover:bg-green-500 transition active:scale-[0.98] shadow-lg shadow-nawiy-green/20">
                {isFinal ? '✅ Terminer' : '➡️ Continuer'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
