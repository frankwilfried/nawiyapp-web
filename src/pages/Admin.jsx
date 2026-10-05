import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverRoutesApi } from '../api/driverRoutes.api';
import { graphApi } from '../api/graph.api';
import { sessionApi } from '../api/session.api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import AdminDrivers from '../components/AdminDrivers';
import AdminOverview from '../components/AdminOverview';
import AdminBalances from '../components/AdminBalances';

const STATUS_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// Contrôle d'accès séparé : les hooks du panneau ne doivent pas s'exécuter conditionnellement
export default function Admin() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-nawiy-light flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-gray-600 mb-4">Accès réservé aux administrateurs.</p>
          <a href="/login" className="bg-nawiy-600 text-white px-6 py-3 rounded-xl font-semibold inline-block">Se connecter</a>
        </div>
      </div>
    );
  }
  return <AdminPanel user={user} />;
}

function AdminPanel({ user }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab]         = useState('overview'); // overview | drivers | balances | routes | candidates | trips
  const [selected, setSelected] = useState(null);
  const [fromPointId, setFromPointId] = useState('');
  const [toPointId, setToPointId]     = useState('');
  const [rejectNote, setRejectNote]   = useState('');
  const [rejectId, setRejectId]       = useState(null);
  const [cityFilter, setCityFilter]   = useState('');
  const [candidateType, setCandidateType] = useState('carrefour');

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['driver-routes', cityFilter],
    queryFn: () => driverRoutesApi.list({ status: 'pending', ...(cityFilter && { city: cityFilter }) }),
    refetchInterval: 30000,
  });

  const { data: focalPoints = [] } = useQuery({
    queryKey: ['focal-points', selected?.city_slug],
    queryFn: () => graphApi.getFocalPoints(selected?.city_slug || 'douala'),
    enabled: !!selected,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, from_point_id, to_point_id }) =>
      driverRoutesApi.approve(id, { from_point_id: parseInt(from_point_id), to_point_id: parseInt(to_point_id) }),
    onSuccess: () => { qc.invalidateQueries(['driver-routes']); setSelected(null); setFromPointId(''); setToPointId(''); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => driverRoutesApi.reject(id, reason),
    onSuccess: () => { qc.invalidateQueries(['driver-routes']); setRejectId(null); setRejectNote(''); },
  });

  const { data: candidates = [], isLoading: candLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => sessionApi.getCandidates(),
    refetchInterval: 30000,
    enabled: tab === 'candidates',
  });

  const approveCandMutation = useMutation({
    mutationFn: ({ id, type }) => sessionApi.approveCandidate(id, type),
    onSuccess: () => qc.invalidateQueries(['candidates']),
  });

  const rejectCandMutation = useMutation({
    mutationFn: (id) => sessionApi.rejectCandidate(id),
    onSuccess: () => qc.invalidateQueries(['candidates']),
  });

  const { data: recordedTrips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['recorded-trips'],
    queryFn: () => sessionApi.getRecordedTrips(),
    enabled: tab === 'trips',
  });

  const TICONS = { a_pied:'🚶', taxi_collectif:'🚕', moto_taxi:'🛵', minibus:'🚌' };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-nawiy-dark text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition active:scale-95" aria-label="Retour">←</button>
          <h1 className="font-bold">⚙️ Administration</h1>
        </div>
        <span className="text-sm text-white/60">{user?.email}</span>
      </header>

      <div className="max-w-3xl mx-auto p-4">

        {/* Onglets */}
        <div className="flex gap-2 mb-5 border-b border-gray-200 overflow-x-auto overflow-y-hidden">
          <button onClick={() => setTab('overview')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px whitespace-nowrap ${tab === 'overview' ? 'border-nawiy-green text-nawiy-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Supervision
          </button>
          <button onClick={() => setTab('drivers')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px whitespace-nowrap ${tab === 'drivers' ? 'border-nawiy-green text-nawiy-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Chauffeurs
          </button>
          <button onClick={() => setTab('balances')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px whitespace-nowrap ${tab === 'balances' ? 'border-nawiy-green text-nawiy-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Soldes
          </button>
          <button onClick={() => setTab('routes')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px ${tab === 'routes' ? 'border-nawiy-green text-nawiy-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Trajets soumis
            {submissions.length > 0 && <span className="ml-1.5 bg-nawiy-green text-white text-xs px-1.5 py-0.5 rounded-full">{submissions.length}</span>}
          </button>
          <button onClick={() => setTab('candidates')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px ${tab === 'candidates' ? 'border-nawiy-green text-nawiy-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Points candidats
            {candidates.length > 0 && <span className="ml-1.5 bg-amber-400 text-white text-xs px-1.5 py-0.5 rounded-full">{candidates.length}</span>}
          </button>
          <button onClick={() => setTab('trips')}
            className={`px-4 py-2 font-semibold text-sm border-b-2 transition -mb-px ${tab === 'trips' ? 'border-nawiy-green text-nawiy-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Trajets testeurs
            {recordedTrips.length > 0 && <span className="ml-1.5 bg-gray-400 text-white text-xs px-1.5 py-0.5 rounded-full">{recordedTrips.length}</span>}
          </button>
        </div>

        {tab === 'overview' && <AdminOverview onOpenDrivers={() => setTab('drivers')} />}
        {tab === 'drivers' && <AdminDrivers />}
        {tab === 'balances' && <AdminBalances />}

        {/* ── Onglet trajets soumis ── */}
        {tab === 'routes' && <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-nawiy-dark">Trajets en attente</h2>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Toutes les villes</option>
            <option value="douala">Douala</option>
            <option value="yaounde">Yaoundé</option>
          </select>
        </div>

        {isLoading && <p className="text-center text-gray-400 py-8">Chargement...</p>}

        {!isLoading && submissions.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            Aucun trajet en attente.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {submissions.map(s => (
            <div key={s.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-nawiy-dark">
                    {s.from_name} → {s.to_name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-2">
                    <span className="bg-gray-100 rounded px-2 py-0.5">{s.transport?.replace('_', ' ')}</span>
                    <span>⏱ {s.duration_min} min</span>
                    <span>💰 {s.price_fcfa} FCFA</span>
                    <span>📍 {s.city_slug}</span>
                  </div>
                  {s.driver_name && <div className="text-xs text-gray-400 mt-1">Par : {s.driver_name}</div>}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[s.status]}`}>
                  {s.status}
                </span>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => { setSelected(s); setFromPointId(''); setToPointId(''); }}
                  className="flex-1 bg-nawiy-green text-white rounded-lg py-2 text-sm font-semibold hover:bg-nawiy-dark transition"
                >
                  ✅ Approuver
                </button>
                <button onClick={() => setRejectId(s.id)}
                  className="flex-1 border border-red-300 text-red-500 rounded-lg py-2 text-sm font-semibold hover:bg-red-50 transition"
                >
                  ❌ Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
        </>}

        {/* ── Onglet points candidats ── */}
        {tab === 'candidates' && <>
          <h2 className="font-bold text-nawiy-dark mb-4">Points candidats à valider</h2>
          <p className="text-sm text-gray-400 mb-4">Ces arrêts ont été nommés par des testeurs. Approuve-les pour les ajouter à la carte comme points focaux.</p>

          {candLoading && <p className="text-center text-gray-400 py-8">Chargement...</p>}

          {!candLoading && candidates.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">✅</div>
              Aucun point candidat en attente.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {candidates.map(c => (
              <div key={c.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-nawiy-dark text-base">{c.name}</div>
                    <div className="text-sm text-gray-400 mt-0.5 flex gap-3">
                      <span>📍 {c.city_slug}</span>
                      <span>👁 vu {c.seen_count}×</span>
                      {c.lat && <span className="font-mono text-xs">{Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)}</span>}
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap">candidat</span>
                </div>

                <div className="flex gap-2 items-center">
                  <select value={candidateType} onChange={e => setCandidateType(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1">
                    <option value="carrefour">Carrefour</option>
                    <option value="marche">Marché</option>
                    <option value="quartier">Quartier</option>
                    <option value="gare">Gare / terminus</option>
                    <option value="autre">Autre</option>
                  </select>
                  <button
                    onClick={() => approveCandMutation.mutate({ id: c.id, type: candidateType })}
                    disabled={approveCandMutation.isPending}
                    className="bg-nawiy-green text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-nawiy-dark transition disabled:opacity-50">
                    ✅ Approuver
                  </button>
                  <button
                    onClick={() => rejectCandMutation.mutate(c.id)}
                    disabled={rejectCandMutation.isPending}
                    className="border border-red-300 text-red-500 rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ── Onglet trajets testeurs ── */}
        {tab === 'trips' && <>
          <h2 className="font-bold text-nawiy-dark mb-1">Trajets enregistrés</h2>
          <p className="text-sm text-gray-400 mb-4">{recordedTrips.length} trajet{recordedTrips.length !== 1 ? 's' : ''} soumis par les testeurs</p>

          {tripsLoading && <p className="text-center text-gray-400 py-8">Chargement...</p>}

          {!tripsLoading && recordedTrips.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🗺️</div>
              Aucun trajet enregistré pour l'instant.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {recordedTrips.map(t => (
              <div key={t.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-nawiy-dark text-sm">
                      {t.tester_name || 'Anonyme'}
                    </span>
                    {t.tester_phone && <span className="text-xs text-gray-400 ml-2">📞 {t.tester_phone}</span>}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>{t.city_slug}</div>
                    <div>{new Date(t.recorded_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2 flex flex-col gap-1">
                  {(t.legs || []).filter(l => l.from_name).map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-base">{TICONS[l.transport] || '?'}</span>
                      <span className="text-gray-500">{l.from_name}</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-nawiy-dark font-medium">{l.to_name}</span>
                      {l.price_fcfa > 0 && <span className="text-nawiy-green text-xs ml-auto">{l.price_fcfa} F</span>}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-2">{t.leg_count} tronçon{t.leg_count !== 1 ? 's' : ''} · {t.gps_points} pts GPS</div>
              </div>
            ))}
          </div>
        </>}

      </div>

      {/* Modal approbation */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-nawiy-dark mb-1">Approuver le trajet</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.from_name} → {selected.to_name}</p>

            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Point focal de départ</label>
                <select value={fromPointId} onChange={e => setFromPointId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Choisir...</option>
                  {focalPoints.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Point focal de destination</label>
                <select value={toPointId} onChange={e => setToPointId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Choisir...</option>
                  {focalPoints.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSelected(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => approveMutation.mutate({ id: selected.id, from_point_id: fromPointId, to_point_id: toPointId })}
                disabled={!fromPointId || !toPointId || approveMutation.isPending}
                className="flex-1 bg-nawiy-green text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approbation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejet */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-nawiy-dark mb-3">Motif du rejet</h3>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="Expliquer pourquoi ce trajet est rejeté..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:border-nawiy-green"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectId(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectNote })}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejet...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
