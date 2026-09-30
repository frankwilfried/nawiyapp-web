/**
 * TaxiDriver — application chauffeur façon Uber Driver / Yango Pro
 * Inscription (catégorie du véhicule) → En ligne → Nouvelle course → Aller chercher le passager
 * → « Je suis arrivé » → code du passager → Course en cours → Terminer → Encaissement
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTaxiSocket } from '../hooks/useTaxiSocket';
import apiClient from '../api/client';
import Icon from '../components/Icon';
import ConfirmDialog from '../components/ConfirmDialog';
import { CATEGORIES } from '../lib/pricing';
import SignalScreen from '../components/SignalScreen';

const REQUEST_TTL_S = 20; // temps pour accepter une demande
const CATEGORY_ICONS = { eco: 'car', confort: 'car', moto: 'bike' };
const PAY_LABELS = { cash: 'Espèces', momo: 'MTN MoMo', orange_money: 'Orange Money' };
const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const mapsLink = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;

function RequestCard({ ride, onAccept, onDecline, onExpire }) {
  const [left, setLeft] = useState(REQUEST_TTL_S);
  useEffect(() => {
    const t = setInterval(() => setLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0) onExpire(ride.ride_id); }, [left, onExpire, ride.ride_id]);

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
      className="bg-white rounded-2xl shadow-float overflow-hidden">
      <div className="h-1 bg-ink-fill"><div className="h-full bg-ink transition-all duration-1000 ease-linear" style={{ width: `${(left / REQUEST_TTL_S) * 100}%` }} /></div>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-ink">{fcfa(ride.price)}</div>
          <div className="text-sm text-ink-2">{PAY_LABELS[ride.payment_method]}</div>
        </div>
        {ride.recommended_price && ride.recommended_price !== ride.price && (
          <p className={`text-sm font-semibold ${ride.price < ride.recommended_price ? 'text-amber-800' : 'text-nawiy-600'}`}>
            Offre du passager · prix conseillé {fcfa(ride.recommended_price)}
          </p>
        )}
        <div className="text-sm text-ink-2 mt-0.5">
          À {ride.pickup_eta_min} min ({String(ride.pickup_distance_km).replace('.', ',')} km) · course {String(ride.distance_km).replace('.', ',')} km
        </div>
        <div className="flex gap-3 mt-3">
          <div className="flex flex-col items-center pt-1.5" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-ink" /><span className="w-px flex-1 bg-ink my-1" /><span className="w-2 h-2 bg-ink" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base text-ink truncate">{ride.from.name}</div>
            <div className="text-base font-semibold text-ink truncate mt-2">{ride.to.name}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onDecline(ride)}
            className="flex-1 h-12 bg-ink-fill text-ink text-base font-semibold rounded-lg active:bg-ink-line">
            Refuser
          </button>
          <button onClick={() => onAccept(ride)}
            className="flex-[2] h-12 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800">
            Accepter · {left} s
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveRide({ ride, codeError, passenger, onArrived, onStart, onComplete, onDriverCancel, onShowSignal }) {
  const [code, setCode] = useState('');
  const toPickup = ride.status === 'accepted';
  const target = toPickup ? ride.from : ride.to;
  const note = passenger.note || ride.passenger_note;

  return (
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-label="Course en cours">
      <div className="bg-ink text-white px-4 pb-5" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <p className="text-sm text-white/70">{toPickup ? (ride.arrived ? 'Le passager arrive' : 'Va chercher le passager') : 'En route vers la destination'}</p>
        <h1 className="text-2xl font-bold mt-1 leading-tight">{target.name}</h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
          <span className="inline-flex items-center gap-1"><Icon name={CATEGORY_ICONS[ride.category]} size={16} /> {CATEGORIES[ride.category]?.label}</span>
          <span>·</span><span>{fcfa(ride.price)}</span><span>·</span><span>{PAY_LABELS[ride.payment_method]}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {/* Retrouver le passager : même signal que sur son téléphone, sa position et sa description */}
        {toPickup && ride.signal && (
          <button onClick={onShowSignal}
            className="rounded-xl p-4 flex items-center gap-4 text-left"
            style={{ background: ride.signal.hex, color: ride.signal.text, boxShadow: ride.signal.id === 'blanc' ? 'inset 0 0 0 1px #E2E2E2' : undefined }}>
            <span className="text-5xl font-black leading-none">{ride.signal.number}</span>
            <span className="flex-1">
              <span className="block text-lg font-black tracking-widest">{ride.signal.name}</span>
              <span className="block text-sm font-semibold">Le passager montre ce signal · touche pour l'afficher en grand</span>
            </span>
          </button>
        )}
        {toPickup && (passenger.distance_m != null || note) && (
          <div className={`rounded-lg px-3 py-2 ${passenger.waving ? 'bg-amber-100 text-amber-900' : 'bg-ink-fill text-ink'}`} role="status">
            {passenger.waving && <p className="text-sm font-semibold">Le passager te fait signe !</p>}
            {passenger.distance_m != null && <p className="text-sm">Passager à <span className="font-semibold">{passenger.distance_m} m</span></p>}
            {note && <p className="text-sm">« {note} »</p>}
          </div>
        )}

        <a href={mapsLink(target)} target="_blank" rel="noreferrer"
          className="h-12 bg-ink-fill text-ink text-base font-semibold rounded-lg flex items-center justify-center gap-2 active:bg-ink-line">
          <Icon name="navigation" size={18} /> Itinéraire
        </a>

        {toPickup && !ride.arrived && (
          <button onClick={onArrived} className="h-14 bg-ink text-white text-lg font-semibold rounded-lg active:bg-gray-800">
            Je suis arrivé
          </button>
        )}

        {toPickup && ride.arrived && (
          <form onSubmit={e => { e.preventDefault(); if (code.length === 4) onStart(code); }} className="flex flex-col gap-2">
            <label htmlFor="ride-code" className="text-base font-semibold text-ink">Code du passager</label>
            <p className="text-sm text-ink-2 -mt-1">Demande-lui les 4 chiffres affichés sur son téléphone.</p>
            <input id="ride-code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              aria-invalid={!!codeError} aria-describedby={codeError ? 'code-err' : undefined}
              className="h-16 text-center text-3xl font-bold tracking-[0.5em] bg-ink-fill rounded-lg outline-none focus:ring-2 focus:ring-ink" />
            {codeError && <p id="code-err" role="alert" className="text-sm text-red-700">Code incorrect, vérifie avec le passager</p>}
            <button type="submit" disabled={code.length !== 4}
              className="h-14 bg-ink text-white text-lg font-semibold rounded-lg active:bg-gray-800 disabled:bg-ink-fill disabled:text-ink-3">
              Démarrer la course
            </button>
          </form>
        )}

        {!toPickup && (
          <button onClick={onComplete} className="h-14 bg-ink text-white text-lg font-semibold rounded-lg active:bg-gray-800">
            Terminer la course
          </button>
        )}

        {toPickup && (
          <button onClick={onDriverCancel} className="h-11 text-base font-semibold text-red-700 rounded-lg active:bg-red-50">
            Je ne peux pas faire cette course
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function TaxiDriver() {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [position, setPosition] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [summary, setSummary]   = useState(null);   // fin de course : montant à encaisser
  const [codeError, setCodeError] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [toast, setToast]       = useState('');
  const [stats, setStats]       = useState(null);
  const [passenger, setPassenger] = useState({});      // { distance_m, note, waving }
  const [signalOpen, setSignalOpen] = useState(false);
  const wantOnline = useRef(false);

  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ plate: '', phone: '', vehicle_model: '', vehicle_color: '', helmet_color: '', visible_number: '', category: 'eco' });
  const [regError, setRegError] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  const loadStats = () => apiClient.get('/taxi/drivers/stats').then(r => setStats(r.data)).catch(() => {});

  const { send, connected } = useTaxiSocket({
    'auth:ok': ({ driverId }) => {
      if (!driverId) setShowRegister(true);
      // Reconnexion : on se remet en ligne automatiquement
      else if (wantOnline.current && position) send('driver:online', position);
    },
    'driver:status': ({ online }) => { setIsOnline(online); wantOnline.current = online; if (!online) setRequests([]); },
    // Une nouvelle offre (passager qui augmente) remplace l'ancienne carte
    'ride:new':  (ride) => setRequests(prev => [ride, ...prev.filter(r => r.ride_id !== ride.ride_id)]),
    'ride:taken': ({ ride_id }) => setRequests(prev => prev.filter(r => r.ride_id !== ride_id)),
    'ride:you_accepted': (ride) => { setActiveRide(ride); setRequests([]); setPassenger({}); },
    'ride:passenger_position': ({ distance_m }) => setPassenger(p => ({ ...p, distance_m })),
    'ride:passenger_note':     ({ note }) => setPassenger(p => ({ ...p, note })),
    'ride:passenger_waving':   () => {
      navigator.vibrate?.([200, 100, 200]);
      setPassenger(p => ({ ...p, waving: true }));
      setTimeout(() => setPassenger(p => ({ ...p, waving: false })), 8000);
    },
    'ride:current':      (ride) => setActiveRide(ride),
    'ride:arrived_ok':   () => setActiveRide(r => r && { ...r, arrived: true }),
    'ride:code_invalid': () => setCodeError(true),
    'ride:started_ok':   (ride) => { setCodeError(false); setActiveRide(ride); setSignalOpen(false); },
    'ride:completed_ok': (data) => { setActiveRide(null); setSummary(data); loadStats(); },
    'ride:driver_cancel_ok': () => { setActiveRide(null); showToast('Course rendue, elle est proposée à un autre chauffeur'); },
    'ride:cancelled':    () => { setActiveRide(null); showToast('Le passager a annulé la course'); },
    'ride:tip':          ({ tip }) => showToast(`Pourboire reçu : ${fcfa(tip)}`),
    'error':             ({ message }) => showToast(message),
  });

  useEffect(() => {
    apiClient.get('/taxi/drivers/me')
      .then(r => { setProfile(r.data.driver); setLoading(false); })
      .catch(() => setLoading(false));
    loadStats();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading }),
      null, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Position envoyée toutes les 4 s en course (suivi en direct du passager), 10 s sinon
  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => {
    if (!isOnline) return;
    const t = setInterval(() => { if (positionRef.current) send('driver:position', positionRef.current); }, activeRide ? 4000 : 10000);
    return () => clearInterval(t);
  }, [isOnline, activeRide, send]);

  const goOnline = () => {
    if (!connected) { showToast('Connexion au serveur en cours, réessaie dans quelques secondes'); return; }
    if (!position) { showToast('Active la localisation de ton téléphone'); return; }
    send('driver:online', position);
  };

  // Refuser, ou laisser expirer, retire la carte et prévient le passager (il pourra augmenter son offre)
  const decline = useCallback((id) => {
    send('ride:decline', { ride_id: id });
    setRequests(prev => prev.filter(r => r.ride_id !== id));
  }, [send]);

  const register = async () => {
    setRegError('');
    const isMoto = form.category === 'moto';
    if (!form.plate.trim() && !(isMoto && form.visible_number.trim())) {
      setRegError(isMoto ? 'Indique la plaque ou le numéro visible (gilet…)' : 'La plaque est requise');
      return;
    }
    try {
      const r = await apiClient.post('/taxi/drivers/register', form);
      setProfile(r.data.driver);
      setShowRegister(false);
    } catch (e) {
      setRegError(e.response?.data?.error || "Erreur lors de l'inscription");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Chargement">
      <div className="w-10 h-10 border-4 border-ink-fill border-t-ink rounded-full animate-spin" />
    </div>
  );

  const header = (
    <div className={`text-white px-4 pb-5 transition-colors ${isOnline ? 'bg-nawiy-600' : 'bg-ink'}`}
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-2">
        <Link to="/driver" aria-label="Retour" className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center active:bg-white/10">
          <Icon name="arrowLeft" size={22} />
        </Link>
        <h1 className="font-bold text-lg">Nawiy Chauffeur</h1>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-white/15' : 'bg-red-700'}`}>
          {connected ? 'Connecté' : 'Connexion…'}
        </span>
      </div>
    </div>
  );

  if (!profile && !showRegister && !connected) return (
    <div className="min-h-screen bg-white">
      {header}
      <div className="flex flex-col items-center px-8 py-20 text-center">
        <Icon name="taxi" size={48} className="text-ink mb-5" />
        <h2 className="font-bold text-ink text-xl mb-2">Connexion requise</h2>
        <p className="text-ink-2 text-base mb-6">Connecte-toi pour accéder au mode chauffeur.</p>
        <Link to="/login" className="bg-ink text-white px-8 h-12 inline-flex items-center rounded-lg font-semibold">Se connecter</Link>
      </div>
    </div>
  );

  const inputCls = 'w-full h-12 bg-ink-fill rounded-lg px-3 text-base text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-ink';

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {header}

      <div className="px-4 py-5 max-w-md mx-auto flex flex-col gap-4">
        {showRegister && !profile && (
          <section className="bg-white rounded-2xl p-5" aria-labelledby="reg-title">
            <h2 id="reg-title" className="font-bold text-ink text-lg mb-4">Inscris ton véhicule</h2>
            <fieldset className="mb-4">
              <legend className="text-sm font-semibold text-ink mb-2">Catégorie</legend>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CATEGORIES).map(([id, c]) => (
                  <label key={id} className={`rounded-xl p-3 text-center cursor-pointer ${form.category === id ? 'ring-2 ring-ink' : 'bg-ink-fill'}`}>
                    <input type="radio" name="category" value={id} checked={form.category === id}
                      onChange={() => setForm(f => ({ ...f, category: id }))} className="sr-only" />
                    <Icon name={CATEGORY_ICONS[id]} size={24} className="mx-auto text-ink" />
                    <span className="block text-sm font-semibold text-ink mt-1">{c.label.replace('Nawiy ', '')}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-ink">Plaque d'immatriculation{form.category === 'moto' ? ' (si elle en a une)' : ''}
                <input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} placeholder="LT 482 AB" className={`${inputCls} mt-1 font-normal`} />
              </label>
              <label className="text-sm font-semibold text-ink">Numéro visible (facultatif)
                <span className="block text-sm font-normal text-ink-2">Gilet, casque ou carrosserie : ce que le passager peut lire de loin</span>
                <input value={form.visible_number} onChange={e => setForm(f => ({ ...f, visible_number: e.target.value.toUpperCase().slice(0, 20) }))} placeholder="214" className={`${inputCls} mt-1 font-normal`} />
              </label>
              <label className="text-sm font-semibold text-ink">Modèle
                <input value={form.vehicle_model} onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))} placeholder="Toyota Corolla" className={`${inputCls} mt-1 font-normal`} />
              </label>
              <label className="text-sm font-semibold text-ink">Couleur {form.category === 'moto' ? 'de la moto' : 'du véhicule'}
                <input value={form.vehicle_color} onChange={e => setForm(f => ({ ...f, vehicle_color: e.target.value }))} placeholder={form.category === 'moto' ? 'Rouge' : 'Grise'} className={`${inputCls} mt-1 font-normal`} />
              </label>
              {form.category === 'moto' && (
                <label className="text-sm font-semibold text-ink">Couleur du casque
                  <input value={form.helmet_color} onChange={e => setForm(f => ({ ...f, helmet_color: e.target.value }))} placeholder="Noir" className={`${inputCls} mt-1 font-normal`} />
                </label>
              )}
              <label className="text-sm font-semibold text-ink">Téléphone (visible par le passager)
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="6 90 12 34 56" className={`${inputCls} mt-1 font-normal`} />
              </label>
              {regError && <p role="alert" className="text-red-700 text-sm">{regError}</p>}
              <button onClick={register} className="h-12 bg-ink text-white rounded-lg font-semibold active:bg-gray-800">S'inscrire</button>
            </div>
          </section>
        )}

        {profile && (
          <section className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full bg-ink-fill text-ink flex items-center justify-center">
                <Icon name={CATEGORY_ICONS[profile.category] || 'car'} size={24} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{profile.name || profile.plate}</div>
                <div className="text-sm text-ink-2 truncate">
                  {CATEGORIES[profile.category]?.label || 'Nawiy Éco'} · {[profile.vehicle_model, profile.vehicle_color].filter(Boolean).join(' ')} · {profile.plate}
                </div>
                {!profile.is_approved && <div className="text-sm text-amber-800 font-medium mt-0.5">En attente de validation</div>}
              </div>
              {stats?.rating && (
                <div className="text-right"><div className="font-bold text-ink inline-flex items-center gap-1"><Icon name="star" size={16} filled /> {stats.rating}</div>
                  <div className="text-xs text-ink-2">{stats.rating_count} avis</div></div>
              )}
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[[stats.today.trips_today, 'Courses auj.'], [Number(stats.today.earnings_today).toLocaleString('fr-FR'), 'FCFA auj.'], [stats.week.trips_week, 'Cette semaine']].map(([v, l]) => (
                  <div key={l} className="bg-ink-fill rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-ink">{v}</div><div className="text-xs text-ink-2 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            )}

            {profile.is_approved && (
              <button onClick={isOnline ? () => send('driver:offline', {}) : goOnline}
                className={`w-full h-14 mt-4 rounded-lg text-lg font-semibold ${isOnline ? 'bg-ink-fill text-ink' : 'bg-nawiy-600 text-white'}`}>
                {isOnline ? 'Passer hors ligne' : 'Me mettre en ligne'}
              </button>
            )}
          </section>
        )}

        {isOnline && (
          <section aria-labelledby="req-title" aria-live="polite">
            <h2 id="req-title" className="font-semibold text-ink mb-2">
              {requests.length ? `${requests.length} demande${requests.length > 1 ? 's' : ''}` : 'En attente de demandes'}
            </h2>
            {requests.length === 0 ? (
              <div className="bg-white rounded-2xl py-10 text-center">
                <div className="w-3 h-3 rounded-full bg-nawiy-600 mx-auto mb-3 animate-pulse" />
                <p className="text-ink text-base">Tu es en ligne</p>
                <p className="text-ink-2 text-sm mt-1">Les courses à moins de 5 km s'afficheront ici</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {requests.map(r => <RequestCard key={`${r.ride_id}-${r.price}`} ride={r} onExpire={decline}
                    onDecline={(ride) => decline(ride.ride_id)}
                    onAccept={(ride) => send('ride:accept_uber', { ride_id: ride.ride_id })} />)}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}
      </div>

      <AnimatePresence>
        {activeRide && (
          <ActiveRide ride={activeRide} codeError={codeError} passenger={passenger}
            onShowSignal={() => setSignalOpen(true)}
            onArrived={() => send('ride:arrived', { ride_id: activeRide.ride_id })}
            onStart={(code) => { setCodeError(false); send('ride:start', { ride_id: activeRide.ride_id, code }); }}
            onComplete={() => setConfirm({
              title: 'Terminer la course ?', body: 'Confirme que le passager est bien arrivé à destination.',
              confirmLabel: 'Oui, terminer', cancelLabel: 'Pas encore',
              onConfirm: () => { setConfirm(null); send('ride:complete', { ride_id: activeRide.ride_id }); },
            })}
            onDriverCancel={() => setConfirm({
              title: 'Rendre la course ?', body: 'Elle sera proposée à un autre chauffeur. Trop d\'annulations peuvent te pénaliser.',
              confirmLabel: 'Oui, rendre la course', cancelLabel: 'Non, je la fais',
              onConfirm: () => { setConfirm(null); send('ride:driver_cancel', { ride_id: activeRide.ride_id }); },
            })} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signalOpen && activeRide?.signal && (
          <SignalScreen signal={activeRide.signal} title="Cherche ce signal"
            subtitle={passenger.note ? `Le passager : « ${passenger.note} »` : 'Le passager affiche la même couleur et le même numéro.'}
            onClose={() => setSignalOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center px-6 text-center" role="dialog" aria-label="Course terminée">
            <span className="w-14 h-14 rounded-full bg-nawiy-light text-nawiy-600 flex items-center justify-center mb-4"><Icon name="check" size={30} /></span>
            <h2 className="text-xl font-bold text-ink">Course terminée</h2>
            {summary.payment_method === 'cash' ? (
              <p className="text-base text-ink-2 mt-2">Encaisse en espèces</p>
            ) : (
              <p className="text-base text-ink-2 mt-2">Payé par {PAY_LABELS[summary.payment_method]} — ne demande pas d'espèces</p>
            )}
            <div className="text-4xl font-bold text-ink mt-2">{fcfa(summary.final_price)}</div>
            <button onClick={() => setSummary(null)} className="w-full max-w-xs h-12 mt-8 bg-ink text-white rounded-lg font-semibold">OK</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div role="status" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed left-4 right-4 z-[80] mx-auto max-w-md bg-ink text-white text-sm font-medium px-4 py-3 rounded-lg"
            style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
