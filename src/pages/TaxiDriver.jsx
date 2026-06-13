/**
 * TaxiDriver — interface chauffeur de taxi
 * Flux : Inscription → En ligne → Reçoit demandes → Fait offre → Course acceptée
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaxiSocket } from '../hooks/useTaxiSocket';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function TaxiDriver() {
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [isOnline, setIsOnline]     = useState(false);
  const [position, setPosition]     = useState(null);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [offerPrices, setOfferPrices] = useState({});  // rideId → prix

  // Inscription
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ plate: '', phone: '', vehicle_model: '' });
  const [regError, setRegError] = useState('');
  const [stats, setStats] = useState(null);

  const { send, connected } = useTaxiSocket({
    'auth:ok': ({ driverId }) => {
      if (!driverId) setShowRegister(true);
    },
    'driver:status': ({ online }) => setIsOnline(online),
    'ride:new': (ride) => {
      setPendingRides(prev => {
        if (prev.find(r => r.ride_id === ride.ride_id)) return prev;
        return [ride, ...prev];
      });
    },
    'ride:taken': ({ ride_id }) => {
      setPendingRides(prev => prev.filter(r => r.ride_id !== ride_id));
    },
    'ride:you_accepted': (data) => {
      setActiveRide(data);
      setPendingRides([]);
    },
  });

  // Charge le profil + stats
  useEffect(() => {
    apiClient.get('/taxi/drivers/me')
      .then(r => { setProfile(r.data.driver); setLoading(false); })
      .catch(() => { setLoading(false); });
    apiClient.get('/taxi/drivers/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      null, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Envoie la position toutes les 10s quand en ligne
  useEffect(() => {
    if (!isOnline || !position) return;
    const t = setInterval(() => {
      send('driver:position', position);
    }, 10000);
    return () => clearInterval(t);
  }, [isOnline, position, send]);

  const goOnline = () => {
    if (!position) { alert('Active la géolocalisation'); return; }
    send('driver:online', position);
  };
  const goOffline = () => send('driver:offline', {});

  const acceptRide = (ride) => {
    send('ride:accept_uber', { ride_id: ride.ride_id });
  };

  const register = async () => {
    setRegError('');
    if (!form.plate) { setRegError('La plaque est requise'); return; }
    try {
      const r = await apiClient.post('/taxi/drivers/register', form);
      setProfile(r.data.driver);
      setShowRegister(false);
    } catch (e) {
      setRegError(e.response?.data?.error || 'Erreur inscription');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-nawiy-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile && !showRegister && !connected) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-nawiy-dark text-white px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">←</Link>
          <h1 className="font-bold text-lg">Mode Chauffeur Taxi</h1>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="text-5xl mb-5">🚕</div>
        <h2 className="font-bold text-gray-800 text-xl mb-2">Connexion requise</h2>
        <p className="text-gray-500 text-sm mb-6">Tu dois être connecté pour accéder au mode chauffeur</p>
        <Link to="/login" className="bg-nawiy-green text-white px-8 py-3 rounded-2xl font-semibold hover:bg-nawiy-dark transition">
          Se connecter
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`text-white px-4 pt-12 pb-5 transition-colors ${isOnline ? 'bg-nawiy-green' : 'bg-nawiy-dark'}`}>
        <div className="flex items-center gap-3 mb-1">
          <Link to="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">←</Link>
          <h1 className="font-bold text-lg">Mode Chauffeur Taxi</h1>
          <div className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-white/20' : 'bg-red-500/30'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-white' : 'bg-red-300'}`} />
            {connected ? 'Connecté' : 'Hors ligne'}
          </div>
        </div>
        <p className="text-white/70 text-sm ml-11">
          {isOnline ? '🟢 En ligne — tu reçois les demandes' : '⚪ Hors ligne'}
        </p>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto">

        {/* ── Inscription ── */}
        <AnimatePresence>
          {showRegister && !profile && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <h2 className="font-bold text-gray-800 text-base mb-4">Inscription chauffeur</h2>
              <div className="flex flex-col gap-3">
                <input placeholder="Plaque d'immatriculation *" value={form.plate}
                  onChange={e => setForm(f => ({ ...f, plate: e.target.value }))}
                  className="bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                />
                <input placeholder="Téléphone (optionnel)" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                />
                <input placeholder="Modèle du véhicule (optionnel)" value={form.vehicle_model}
                  onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))}
                  className="bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                />
                {regError && <p className="text-red-500 text-sm">{regError}</p>}
                <button onClick={register}
                  className="bg-nawiy-green text-white rounded-xl py-3 font-semibold hover:bg-nawiy-dark transition">
                  S'inscrire
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Profil + statut ── */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            {/* Identité chauffeur */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-nawiy-light flex items-center justify-center text-2xl">🚕</div>
              <div className="flex-1">
                <div className="font-bold text-gray-800">{profile.name || profile.plate}</div>
                <div className="text-sm text-gray-400">{profile.vehicle_model || 'Taxi'} · {profile.plate}</div>
                {!profile.is_approved && (
                  <div className="text-xs text-orange-500 font-medium mt-0.5">⏳ En attente de validation admin</div>
                )}
              </div>
              {stats?.rating && (
                <div className="flex flex-col items-center">
                  <div className="text-yellow-500 font-bold text-base">★ {stats.rating}</div>
                  <div className="text-xs text-gray-400">{stats.rating_count} avis</div>
                </div>
              )}
            </div>

            {/* Stats du jour */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-nawiy-dark">{stats.today.trips_today}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Trajets</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-nawiy-green">{Number(stats.today.earnings_today).toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-0.5">FCFA</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-nawiy-dark">{stats.week.trips_week}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Cette semaine</div>
                </div>
              </div>
            )}

            {profile.is_approved && (
              <button
                onClick={isOnline ? goOffline : goOnline}
                disabled={!connected}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-40
                  ${isOnline
                    ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100'
                    : 'bg-nawiy-green text-white hover:bg-nawiy-dark'}`}
              >
                {isOnline ? '🔴 Passer hors ligne' : '🟢 Me mettre en ligne'}
              </button>
            )}
          </div>
        )}

        {/* ── Demandes de courses ── */}
        {isOnline && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">
                Demandes proches {pendingRides.length > 0 && <span className="bg-nawiy-green text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingRides.length}</span>}
              </h2>
            </div>

            {pendingRides.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">👀</div>
                <p className="text-gray-400 text-sm">En attente de demandes...</p>
                <p className="text-gray-300 text-xs mt-1">Les passagers dans 5km apparaîtront ici</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="flex flex-col gap-3">
                  {pendingRides.map(ride => (
                    <motion.div key={ride.ride_id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-2xl shadow-sm p-4"
                    >
                      {/* Trajet */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full bg-nawiy-green" />
                          <span className="font-medium">{ride.from_name}</span>
                        </div>
                        <div className="w-0.5 h-3 bg-gray-200 ml-[5px] my-1" />
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <span className="font-medium">{ride.to_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-xs text-gray-400">Prix proposé</div>
                          <div className="font-bold text-nawiy-green text-lg">{ride.proposed_price?.toLocaleString()} FCFA</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Distance</div>
                          <div className="font-semibold text-gray-700">{ride.distance_km} km</div>
                        </div>
                      </div>

                      {/* Accepter la course */}
                      <button onClick={() => acceptRide(ride)}
                        className="w-full bg-nawiy-green text-white py-3 rounded-xl font-bold text-sm hover:bg-nawiy-dark transition active:scale-95">
                        ✅ Accepter — {ride.price?.toLocaleString() ?? ride.proposed_price?.toLocaleString()} FCFA
                      </button>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        )}

        {/* ── Course active ── */}
        <AnimatePresence>
          {activeRide && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              className="fixed inset-0 bg-white z-50 flex flex-col">
              <div className="bg-nawiy-green text-white px-4 pt-12 pb-5">
                <h1 className="font-bold text-xl mb-1">🚗 Course en cours</h1>
                <p className="text-white/80 text-sm">Prix confirmé : {activeRide.final_price?.toLocaleString()} FCFA</p>
              </div>
              <div className="flex-1 px-4 py-6">
                <div className="bg-gray-50 rounded-2xl p-5 mb-5">
                  <h3 className="font-semibold text-gray-700 mb-3">Passager</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-nawiy-light flex items-center justify-center text-2xl">👤</div>
                    <div>
                      <div className="font-bold text-gray-800">{activeRide.passenger?.name}</div>
                      <div className="text-sm text-gray-400">{activeRide.passenger?.phone}</div>
                    </div>
                  </div>
                </div>

                <a href={`tel:${activeRide.passenger?.phone}`}
                  className="flex items-center justify-center gap-2 bg-nawiy-green text-white rounded-2xl py-4 font-bold text-base mb-3 hover:bg-nawiy-dark transition">
                  📞 Appeler le passager
                </a>

                <a href={`https://wa.me/${activeRide.passenger?.phone?.replace(/\D/g, '')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-2xl py-4 font-bold text-base mb-5 hover:bg-green-600 transition">
                  💬 WhatsApp
                </a>

                <button onClick={() => setActiveRide(null)}
                  className="w-full border-2 border-gray-200 text-gray-600 rounded-2xl py-3.5 font-semibold hover:border-gray-300 transition">
                  Terminer la course
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
