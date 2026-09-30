/**
 * Espace chauffeur (onglet « Chauffeur ») : accès au taxi à la demande, au taxi collectif
 * et aux outils pour cartographier le transport informel.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { graphApi } from '../api/graph.api';
import { driverRoutesApi } from '../api/driverRoutes.api';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import Icon from '../components/Icon';
import { MODES } from '../lib/modes';
import { CATEGORIES } from '../lib/pricing';

const EMPTY_FORM = { city_id: '', from_name: '', to_name: '', transport: 'taxi_collectif', duration_min: '', price_fcfa: '' };

// Statut du compte chauffeur taxi : pas connecté, pas inscrit, en attente, prêt
function useTaxiDriver(isAuthenticated) {
  const profile = useQuery({
    queryKey: ['taxi-driver-me'],
    queryFn: () => apiClient.get('/taxi/drivers/me').then(r => r.data.driver).catch(e => (e.response?.status === 404 ? null : Promise.reject(e))),
    enabled: isAuthenticated, retry: false,
  });
  const stats = useQuery({
    queryKey: ['taxi-driver-stats'],
    queryFn: () => apiClient.get('/taxi/drivers/stats').then(r => r.data),
    enabled: isAuthenticated && !!profile.data, retry: false,
  });
  return { profile: profile.data, loading: profile.isLoading, error: profile.isError, stats: stats.data };
}

function TaxiCard({ isAuthenticated }) {
  const { profile, loading, error, stats } = useTaxiDriver(isAuthenticated);

  let status, cta;
  if (!isAuthenticated)           { status = 'Connecte-toi pour conduire avec Nawiy'; cta = { to: '/login', label: 'Se connecter' }; }
  else if (loading)               { status = 'Chargement…'; cta = null; }
  else if (error)                 { status = 'Service taxi injoignable pour l\'instant'; cta = { to: '/taxi/driver', label: 'Ouvrir' }; }
  else if (!profile)              { status = 'Inscris ton véhicule pour recevoir des courses'; cta = { to: '/taxi/driver', label: 'Devenir chauffeur' }; }
  else if (!profile.is_approved)  { status = 'Inscription en cours de validation'; cta = { to: '/taxi/driver', label: 'Voir mon profil' }; }
  else                            { status = null; cta = { to: '/taxi/driver', label: profile.is_online ? 'Reprendre' : 'Me mettre en ligne' }; }

  return (
    <section className="bg-ink text-white rounded-2xl p-5" aria-labelledby="taxi-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">Taxi à la demande</p>
          <h2 id="taxi-title" className="text-xl font-bold mt-0.5">Nawiy Chauffeur</h2>
        </div>
        {profile?.is_approved && (
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 flex items-center gap-1.5 ${profile.is_online ? 'bg-nawiy-600' : 'bg-white/15'}`}>
            <span className={`w-2 h-2 rounded-full ${profile.is_online ? 'bg-white' : 'bg-white/60'}`} aria-hidden="true" />
            {profile.is_online ? 'En ligne' : 'Hors ligne'}
          </span>
        )}
      </div>

      {profile?.is_approved && stats ? (
        <dl className="grid grid-cols-3 gap-2 mt-4">
          {[
            ['Gains auj.', `${Number(stats.today.earnings_today).toLocaleString('fr-FR')} F`],
            ['Courses auj.', stats.today.trips_today],
            ['Note', stats.rating ? String(stats.rating).replace('.', ',') : '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5">
              <dt className="text-xs text-white/70">{label}</dt>
              <dd className="text-lg font-bold mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      ) : status && (
        <p className="text-base text-white/80 mt-3">{status}</p>
      )}

      {profile && (
        <p className="text-sm text-white/70 mt-3 flex items-center gap-1.5">
          <Icon name={profile.category === 'moto' ? 'bike' : 'car'} size={16} />
          {CATEGORIES[profile.category]?.label || 'Nawiy Éco'} · {profile.plate}
        </p>
      )}

      {cta && (
        <Link to={cta.to}
          className="mt-4 h-12 bg-white text-ink text-base font-semibold rounded-lg flex items-center justify-center gap-2 active:bg-gray-200">
          {cta.label} <Icon name="chevronRight" size={18} />
        </Link>
      )}
    </section>
  );
}

function ToolRow({ to, onClick, icon, title, desc }) {
  const inner = (
    <>
      <span className="w-11 h-11 rounded-full bg-ink-fill text-ink flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-2">{desc}</span>
      </span>
      <Icon name="chevronRight" size={18} className="text-ink-3 flex-shrink-0" />
    </>
  );
  const cls = 'w-full flex items-center gap-4 px-4 py-3 text-left active:bg-ink-fill';
  return to
    ? <li><Link to={to} className={cls}>{inner}</Link></li>
    : <li><button onClick={onClick} className={cls}>{inner}</button></li>;
}

function KnownTripForm({ isAuthenticated, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => graphApi.getCities() });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await driverRoutesApi.submit({
        ...form,
        city_id:      parseInt(form.city_id),
        duration_min: parseInt(form.duration_min),
        price_fcfa:   parseInt(form.price_fcfa),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || "Erreur lors de l'envoi, réessaie");
    } finally { setLoading(false); }
  };

  const input = 'mt-1 w-full h-12 bg-ink-fill rounded-lg px-3 text-base font-normal text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-ink';

  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="known-title"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <h2 id="known-title" className="text-xl font-bold text-ink">{submitted ? 'Trajet envoyé' : 'Ajouter un trajet connu'}</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill">
            <Icon name="x" size={20} />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <span className="w-14 h-14 rounded-full bg-nawiy-light text-nawiy-600 flex items-center justify-center mx-auto"><Icon name="check" size={30} /></span>
            <p className="text-base text-ink-2 mt-3">L'équipe NawiyApp va le vérifier avant de l'ajouter au réseau. Merci !</p>
            <button onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); }}
              className="w-full h-12 mt-6 bg-ink text-white text-base font-semibold rounded-lg">Ajouter un autre trajet</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <p className="text-sm text-ink-2 -mt-1">Un trajet que tu fais souvent, avec le prix et la durée habituels.</p>
            {!isAuthenticated && (
              <p className="text-sm text-ink bg-ink-fill rounded-lg px-3 py-2">
                <Link to="/login" className="font-semibold underline">Connecte-toi</Link> pour envoyer un trajet.
              </p>
            )}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <label className="text-sm font-semibold text-ink">Ville
              <select name="city_id" value={form.city_id} onChange={handleChange} required className={input}>
                <option value="">Choisis une ville</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-ink">Départ
              <input name="from_name" value={form.from_name} onChange={handleChange} required placeholder="Akwa, Ndokoti…" className={input} />
            </label>
            <label className="text-sm font-semibold text-ink">Destination
              <input name="to_name" value={form.to_name} onChange={handleChange} required placeholder="Makepe, Université…" className={input} />
            </label>

            <fieldset>
              <legend className="text-sm font-semibold text-ink mb-1">Transport</legend>
              <div className="grid grid-cols-3 gap-2">
                {['taxi_collectif', 'moto_taxi', 'minibus'].map(t => (
                  <label key={t} className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-sm cursor-pointer ${form.transport === t ? 'ring-2 ring-ink text-ink font-semibold' : 'bg-ink-fill text-ink'}`}>
                    <input type="radio" name="transport" value={t} checked={form.transport === t} onChange={handleChange} className="sr-only" />
                    <Icon name={MODES[t].icon} size={20} />{MODES[t].label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-ink">Durée (min)
                <input type="number" inputMode="numeric" name="duration_min" value={form.duration_min} onChange={handleChange} required min="1" placeholder="20" className={input} />
              </label>
              <label className="text-sm font-semibold text-ink">Prix (FCFA)
                <input type="number" inputMode="numeric" name="price_fcfa" value={form.price_fcfa} onChange={handleChange} required min="0" placeholder="200" className={input} />
              </label>
            </div>

            <button type="submit" disabled={loading || !isAuthenticated}
              className="h-12 bg-ink text-white text-base font-semibold rounded-lg disabled:bg-ink-fill disabled:text-ink-3">
              {loading ? 'Envoi…' : 'Envoyer le trajet'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function DriverMode() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-24">
      <header className="bg-white px-4 pb-3 flex items-center gap-2 border-b border-ink-line"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button onClick={() => navigate('/')} aria-label="Retour à la carte"
          className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink active:bg-ink-fill">
          <Icon name="arrowLeft" size={22} />
        </button>
        <h1 className="text-lg font-bold text-ink">Espace chauffeur</h1>
      </header>

      <div className="max-w-md mx-auto p-4 flex flex-col gap-4">
        <TaxiCard isAuthenticated={isAuthenticated} />

        <section aria-labelledby="collectif-title">
          <h2 id="collectif-title" className="text-sm font-semibold text-ink px-1 mb-2">Taxi collectif</h2>
          <ul className="bg-white rounded-2xl overflow-hidden">
            <ToolRow to="/drive" icon="users" title="Démarrer une session"
              desc="Note tes passagers pendant ta tournée, jusqu'à 5 places" />
          </ul>
        </section>

        <section aria-labelledby="map-title">
          <h2 id="map-title" className="text-sm font-semibold text-ink px-1">Aider à cartographier</h2>
          <p className="text-sm text-ink-2 px-1 mb-2">Tes trajets rendent les itinéraires plus justes pour tout le monde.</p>
          <ul className="bg-white rounded-2xl overflow-hidden divide-y divide-ink-line">
            <ToolRow to="/record-trip" icon="route" title="Noter mon trajet en passager"
              desc="À chaque étape : le mode, le prix payé et la durée" />
            <ToolRow to="/record-route" icon="navigation" title="Tracer une route au GPS"
              desc="Ton téléphone suit le chemin pour le dessiner sur la carte" />
            <ToolRow onClick={() => setFormOpen(true)} icon="signpost" title="Ajouter un trajet connu"
              desc="Sans te déplacer : départ, arrivée, prix et durée habituels" />
          </ul>
        </section>
      </div>

      <AnimatePresence>
        {formOpen && <KnownTripForm isAuthenticated={isAuthenticated} onClose={() => setFormOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
