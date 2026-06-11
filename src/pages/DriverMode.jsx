import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphApi } from '../api/graph.api';
import { driverRoutesApi } from '../api/driverRoutes.api';
import { useAuthStore } from '../store/authStore';

const TRANSPORTS = [
  { value: 'taxi_collectif', label: '🚕 Taxi collectif' },
  { value: 'moto_taxi',      label: '🛵 Moto-taxi' },
  { value: 'minibus',        label: '🚌 Minibus' },
];

export default function DriverMode() {
  const { isAuthenticated } = useAuthStore();
  const [form, setForm] = useState({
    city_id: '', from_name: '', to_name: '',
    transport: 'taxi_collectif', duration_min: '', price_fcfa: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => graphApi.getCities(),
  });

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
      setError(err.response?.data?.error?.message || 'Erreur lors de la soumission');
    } finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-nawiy-light flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-nawiy-dark mb-2">Trajet soumis !</h2>
          <p className="text-gray-500 text-sm mb-6">Ton trajet est en attente de validation par l'équipe NawiyApp.</p>
          <button onClick={() => { setSubmitted(false); setForm({ city_id: '', from_name: '', to_name: '', transport: 'taxi_collectif', duration_min: '', price_fcfa: '' }); }}
            className="bg-nawiy-green text-white rounded-xl px-6 py-3 font-semibold hover:bg-nawiy-dark transition"
          >
            Soumettre un autre trajet
          </button>
          <a href="/" className="block mt-3 text-sm text-gray-400 hover:underline">← Retour à la carte</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-nawiy-dark text-white px-4 py-3 flex items-center gap-3">
        <a href="/" className="text-white/70 hover:text-white">←</a>
        <h1 className="font-bold">🚕 Mode Chauffeur</h1>
      </header>

      <div className="max-w-lg mx-auto p-4">

        {/* Mode conduite 5 places */}
        <a href="/drive"
          className="flex items-center gap-4 bg-nawiy-green text-white rounded-2xl p-4 mb-3 hover:opacity-90 transition shadow-lg">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
            🚕
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">Démarrer une session</div>
            <div className="text-white/80 text-xs mt-0.5">Enregistre tes passagers — 5 places en parallèle</div>
          </div>
          <span className="text-white/50 text-xl">→</span>
        </a>

        {/* Testeur passager */}
        <a href="/record-trip"
          className="flex items-center gap-4 bg-white border-2 border-nawiy-green rounded-2xl p-4 mb-3 hover:bg-nawiy-light transition shadow">
          <div className="w-12 h-12 rounded-full bg-nawiy-green/10 flex items-center justify-center text-2xl flex-shrink-0">
            🗺️
          </div>
          <div className="flex-1">
            <div className="font-bold text-nawiy-dark">Enregistrer mon trajet</div>
            <div className="text-nawiy-green text-xs mt-0.5">Testeur — aide à construire le réseau NawiyApp</div>
          </div>
          <span className="text-gray-300 text-xl">→</span>
        </a>

        {/* Carte crowdsourcing GPS */}
        <a href="/record-route"
          className="flex items-center gap-4 bg-nawiy-dark text-white rounded-2xl p-4 mb-4 hover:opacity-90 transition shadow-lg">
          <div className="w-12 h-12 rounded-full bg-nawiy-green flex items-center justify-center text-2xl flex-shrink-0">
            🗺️
          </div>
          <div className="flex-1">
            <div className="font-bold">Enregistrer mon trajet GPS</div>
            <div className="text-green-300 text-xs mt-0.5">Aide à construire la carte NawiyApp — suis ta route, on cartographie</div>
          </div>
          <span className="text-white/50 text-xl">→</span>
        </a>

        {!isAuthenticated && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-3 mb-4 text-sm">
            ⚠️ Tu n'es pas connecté. <a href="/login" className="underline font-semibold">Se connecter</a> pour soumettre un trajet.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-nawiy-dark text-lg mb-4">Soumettre un trajet connu</h2>

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Ville</label>
              <select name="city_id" value={form.city_id} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
              >
                <option value="">Sélectionner une ville</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Point de départ</label>
              <input name="from_name" value={form.from_name} onChange={handleChange} required
                placeholder="Ex: Akwa, Ndokotti..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Destination</label>
              <input name="to_name" value={form.to_name} onChange={handleChange} required
                placeholder="Ex: Makepe, Université..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Type de transport</label>
              <div className="flex gap-2">
                {TRANSPORTS.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, transport: t.value }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition
                      ${form.transport === t.value ? 'bg-nawiy-green text-white border-nawiy-green' : 'bg-white text-gray-600 border-gray-200 hover:border-nawiy-green'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Durée (minutes)</label>
                <input type="number" name="duration_min" value={form.duration_min} onChange={handleChange} required min="1"
                  placeholder="Ex: 20"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Prix (FCFA)</label>
                <input type="number" name="price_fcfa" value={form.price_fcfa} onChange={handleChange} required min="0"
                  placeholder="Ex: 200"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
                />
              </div>
            </div>

            <button type="submit" disabled={loading || !isAuthenticated}
              className="bg-nawiy-green text-white rounded-xl py-3 font-semibold hover:bg-nawiy-dark transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Envoi...' : '📤 Soumettre le trajet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
