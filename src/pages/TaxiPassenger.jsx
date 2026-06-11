/**
 * TaxiPassenger — interface passager pour demander une course
 * Flux : Saisie trajet → Prix proposé → Attente offres → Négociation → Confirmé
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaxiSocket } from '../hooks/useTaxiSocket';
import { useCityStore } from '../store/cityStore';
import { useAuthStore } from '../store/authStore';
import { buildGraph } from '../lib/staticData';
import { haversineDistance } from '../lib/geocoder';
import { Link } from 'react-router-dom';

const STEPS = {
  FORM:       'form',
  WAITING:    'waiting',
  OFFERS:     'offers',
  CONFIRMED:  'confirmed',
};

// Prix suggéré basé sur la distance
function suggestPrice(distanceKm) {
  const base = 500;
  const perKm = 300;
  return Math.round((base + distanceKm * perKm) / 100) * 100;
}

function StarRating({ rating }) {
  if (!rating) return <span className="text-gray-400 text-xs">Nouveau</span>;
  return (
    <span className="flex items-center gap-1 text-yellow-500 text-sm font-semibold">
      ★ {rating}
    </span>
  );
}

export default function TaxiPassenger() {
  const { selectedCity } = useCityStore();
  const { isAuthenticated } = useAuthStore();
  const { nodes } = buildGraph(selectedCity);

  // Pas connecté → prompt
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-nawiy-dark text-white px-4 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">←</Link>
          <h1 className="font-bold text-lg">Taxi course</h1>
        </div>
        <p className="text-white/60 text-sm ml-11">Trajet privé — négociation de prix</p>
      </div>
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="text-5xl mb-5">🚕</div>
        <h2 className="font-bold text-gray-800 text-xl mb-2">Connexion requise</h2>
        <p className="text-gray-500 text-sm mb-6">Crée un compte gratuit pour commander un taxi</p>
        <Link to="/login" className="bg-nawiy-green text-white px-8 py-3 rounded-2xl font-semibold hover:bg-nawiy-dark transition block mb-3 w-full max-w-xs text-center">
          Se connecter
        </Link>
        <Link to="/login?register=1" className="text-nawiy-green font-medium text-sm hover:underline">
          Créer un compte →
        </Link>
      </div>
    </div>
  );

  const [step, setStep]         = useState(STEPS.FORM);
  const [fromText, setFromText] = useState('');
  const [toText, setToText]     = useState('');
  const [fromNode, setFromNode] = useState(null);
  const [toNode, setToNode]     = useState(null);
  const [fromSugg, setFromSugg] = useState([]);
  const [toSugg, setToSugg]     = useState([]);
  const [activeInput, setActiveInput] = useState('from');

  const [proposedPrice, setProposedPrice] = useState(1500);
  const [rideId, setRideId]     = useState(null);
  const [offers, setOffers]     = useState([]);
  const [driversNearby, setDriversNearby] = useState(0);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError]       = useState('');

  const distanceKm = fromNode && toNode
    ? haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng) / 1000
    : 0;

  const { send, connected } = useTaxiSocket({
    'auth:ok': () => {},
    'ride:created': ({ ride }) => {
      setRideId(ride.id);
    },
    'ride:notified': ({ drivers_notified }) => {
      setDriversNearby(drivers_notified);
      setStep(STEPS.WAITING);
    },
    'ride:offer': (offer) => {
      setOffers(prev => {
        const exists = prev.findIndex(o => o.driver.id === offer.driver.id);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = offer;
          return updated;
        }
        return [...prev, offer];
      });
      setStep(STEPS.OFFERS);
    },
    'ride:confirmed': (data) => {
      setConfirmed(data);
      setStep(STEPS.CONFIRMED);
    },
    'ride:cancelled': () => {
      setStep(STEPS.FORM);
      setOffers([]);
      setRideId(null);
    },
  });

  const suggest = (val, setter) => {
    if (!val) { setter([]); return; }
    const q = val.toLowerCase();
    setter(nodes.filter(n => n.name.toLowerCase().includes(q)).slice(0, 6));
  };

  const handleRequest = () => {
    setError('');
    if (!fromNode || !toNode) { setError('Sélectionne départ et destination'); return; }
    if (proposedPrice < 500) { setError('Prix minimum 500 FCFA'); return; }

    send('ride:request', {
      from_lat: fromNode.lat,
      from_lng: fromNode.lng,
      from_name: fromNode.name,
      to_lat: toNode.lat,
      to_lng: toNode.lng,
      to_name: toNode.name,
      proposed_price: proposedPrice,
      city_slug: selectedCity,
    });
  };

  const acceptOffer = (offer) => {
    send('ride:accept', {
      ride_id:   rideId,
      driver_id: offer.driver.id,
      final_price: offer.offered_price,
    });
  };

  const cancelRide = () => {
    if (rideId) send('ride:cancel', { ride_id: rideId });
    setStep(STEPS.FORM);
    setOffers([]);
    setRideId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-nawiy-dark text-white px-4 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <Link to="/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">←</Link>
          <h1 className="font-bold text-lg">Taxi course</h1>
          <div className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connected ? 'Connecté' : 'Hors ligne'}
          </div>
        </div>
        <p className="text-white/60 text-sm ml-11">Trajet privé — négociation de prix</p>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto">

        {/* ── STEP: Formulaire ── */}
        {step === STEPS.FORM && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Départ / Destination */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <div className="relative mb-3">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-nawiy-green" />
                <input value={fromText} placeholder="Point de départ..."
                  onFocus={() => setActiveInput('from')}
                  onChange={e => { setFromText(e.target.value); setFromNode(null); suggest(e.target.value, setFromSugg); }}
                  className="w-full bg-gray-50 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-400" />
                <input value={toText} placeholder="Destination..."
                  onFocus={() => setActiveInput('to')}
                  onChange={e => { setToText(e.target.value); setToNode(null); suggest(e.target.value, setToSugg); }}
                  className="w-full bg-gray-50 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
                />
              </div>
            </div>

            {/* Suggestions */}
            {(activeInput === 'from' ? fromSugg : toSugg).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
                {(activeInput === 'from' ? fromSugg : toSugg).map(n => (
                  <button key={n.id}
                    onClick={() => {
                      if (activeInput === 'from') { setFromText(n.name); setFromNode(n); setFromSugg([]); setActiveInput('to'); }
                      else { setToText(n.name); setToNode(n); setToSugg([]); }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-base">📍</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">{n.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{n.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Distance estimée */}
            {fromNode && toNode && (
              <div className="bg-nawiy-light rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Distance estimée</div>
                  <div className="font-bold text-nawiy-dark text-lg">{distanceKm.toFixed(1)} km</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Prix suggéré</div>
                  <div className="font-bold text-nawiy-green text-lg">{suggestPrice(distanceKm).toLocaleString()} FCFA</div>
                </div>
              </div>
            )}

            {/* Prix proposé */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <label className="text-sm font-semibold text-gray-700 block mb-3">
                💰 Ton prix proposé (FCFA)
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setProposedPrice(p => Math.max(500, p - 500))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-lg font-bold flex items-center justify-center hover:bg-gray-200 transition">−</button>
                <input type="number" value={proposedPrice} min={500} step={100}
                  onChange={e => setProposedPrice(Number(e.target.value))}
                  className="flex-1 text-center text-2xl font-bold text-nawiy-dark focus:outline-none"
                />
                <button onClick={() => setProposedPrice(p => p + 500)}
                  className="w-10 h-10 rounded-full bg-gray-100 text-lg font-bold flex items-center justify-center hover:bg-gray-200 transition">+</button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Les chauffeurs peuvent accepter ou proposer un autre prix
              </p>
            </div>

            {error && <p className="text-red-500 text-sm mb-3 px-1">{error}</p>}

            <button onClick={handleRequest}
              disabled={!fromNode || !toNode || !connected}
              className="w-full bg-nawiy-green text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40 hover:bg-nawiy-dark transition"
            >
              🚕 Demander une course
            </button>

            {!connected && (
              <p className="text-center text-xs text-gray-400 mt-2">Connexion en cours...</p>
            )}
          </motion.div>
        )}

        {/* ── STEP: Attente ── */}
        {step === STEPS.WAITING && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-nawiy-light mx-auto flex items-center justify-center mb-5">
              <div className="w-12 h-12 rounded-full border-4 border-nawiy-green border-t-transparent animate-spin" />
            </div>
            <h2 className="font-bold text-gray-800 text-xl mb-2">Recherche en cours...</h2>
            <p className="text-gray-500 text-sm mb-1">
              {driversNearby > 0
                ? `${driversNearby} chauffeur${driversNearby > 1 ? 's' : ''} notifié${driversNearby > 1 ? 's' : ''}`
                : 'Aucun chauffeur à proximité pour l\'instant'}
            </p>
            <div className="mt-2 bg-gray-100 rounded-xl p-3 inline-block">
              <div className="text-sm font-medium">{fromText} → {toText}</div>
              <div className="text-nawiy-green font-bold">{proposedPrice.toLocaleString()} FCFA proposés</div>
            </div>
            <button onClick={cancelRide}
              className="mt-6 text-red-500 text-sm font-medium hover:underline block mx-auto">
              Annuler la demande
            </button>
          </motion.div>
        )}

        {/* ── STEP: Offres reçues ── */}
        {step === STEPS.OFFERS && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">
                  {offers.length} offre{offers.length > 1 ? 's' : ''} reçue{offers.length > 1 ? 's' : ''}
                </h2>
                <p className="text-sm text-gray-400">{fromText} → {toText}</p>
              </div>
              <button onClick={cancelRide} className="text-red-400 text-sm font-medium">Annuler</button>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {offers.sort((a, b) => a.offered_price - b.offered_price).map((offer, i) => (
                  <motion.div key={offer.driver.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-nawiy-light flex items-center justify-center text-xl">🚕</div>
                        <div>
                          <div className="font-semibold text-gray-800">{offer.driver.name}</div>
                          <div className="text-xs text-gray-400">{offer.driver.plate} · {offer.driver.vehicle_model || 'Taxi'}</div>
                        </div>
                      </div>
                      <StarRating rating={offer.driver.rating} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {offer.offered_price === proposedPrice ? (
                          <div className="text-sm text-green-600 font-medium">✓ Accepte ton prix</div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Propose <span className="font-bold text-gray-800">{offer.offered_price.toLocaleString()} FCFA</span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({offer.offered_price > proposedPrice ? '+' : ''}{(offer.offered_price - proposedPrice).toLocaleString()})
                            </span>
                          </div>
                        )}
                        {offer.driver.distance_km && (
                          <div className="text-xs text-gray-400 mt-0.5">À {offer.driver.distance_km} km de toi</div>
                        )}
                      </div>
                      <button onClick={() => acceptOffer(offer)}
                        className="bg-nawiy-green text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-nawiy-dark transition">
                        Accepter
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              En attente d'autres offres...
            </p>
          </motion.div>
        )}

        {/* ── STEP: Confirmé ── */}
        {step === STEPS.CONFIRMED && confirmed && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center text-4xl mb-4">✅</div>
            <h2 className="font-bold text-gray-800 text-xl mb-1">Course confirmée !</h2>
            <p className="text-gray-500 text-sm mb-5">Prix final : <span className="font-bold text-nawiy-green">{confirmed.final_price?.toLocaleString()} FCFA</span></p>

            {/* Infos chauffeur */}
            <div className="bg-white rounded-2xl shadow-sm p-5 text-left mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-nawiy-light flex items-center justify-center text-3xl">🚕</div>
                <div>
                  <div className="font-bold text-gray-800 text-base">{confirmed.driver.name}</div>
                  <div className="text-sm text-gray-500">{confirmed.driver.plate}</div>
                  {confirmed.driver.vehicle_model && (
                    <div className="text-xs text-gray-400">{confirmed.driver.vehicle_model}</div>
                  )}
                </div>
                <div className="ml-auto">
                  <StarRating rating={confirmed.driver.rating} />
                </div>
              </div>

              <a href={`tel:${confirmed.driver.phone}`}
                className="flex items-center justify-center gap-2 bg-nawiy-green text-white rounded-xl py-3 font-semibold hover:bg-nawiy-dark transition mb-3">
                📞 Appeler le chauffeur
              </a>

              <a href={`https://wa.me/${confirmed.driver.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, je suis votre passager NawiyApp. Course de ${fromText} vers ${toText} — ${confirmed.final_price} FCFA`)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl py-3 font-semibold hover:bg-green-600 transition">
                💬 WhatsApp
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left text-sm text-gray-600 mb-5">
              <div className="flex justify-between mb-1">
                <span>Départ</span><span className="font-medium">{fromText}</span>
              </div>
              <div className="flex justify-between">
                <span>Destination</span><span className="font-medium">{toText}</span>
              </div>
            </div>

            <button onClick={() => { setStep(STEPS.FORM); setConfirmed(null); setOffers([]); setRideId(null); }}
              className="text-nawiy-green font-semibold text-sm hover:underline">
              Nouvelle course
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
