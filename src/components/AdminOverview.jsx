import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import apiClient from '../api/client';
import { CATEGORIES } from '../lib/pricing';

const F = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;
const STATUS = { pending: 'Recherche', accepted: 'Chauffeur en route', in_progress: 'En course', completed: 'Terminée', cancelled: 'Annulée' };
const ago = (d) => {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return min < 1 ? "à l'instant" : min < 60 ? `il y a ${min} min` : `il y a ${Math.floor(min / 60)} h`;
};

function Tile({ label, value, hint, tone }) {
  return (
    <div className={`rounded-xl p-3 ${tone === 'warn' ? 'bg-amber-100' : 'bg-white'} shadow-sm`}>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-sm text-gray-700">{label}</div>
      {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
    </div>
  );
}

// Carte des chauffeurs en ligne : vert = libre, noir = en course
function DriversMap({ positions }) {
  const el = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = new maplibregl.Map({
      container: el.current, style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [9.7085, 4.0511], zoom: 11, attributionControl: { compact: true },
    });
    return () => { map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(m => m.remove());
    markers.current = positions.map(p => {
      const dot = document.createElement('div');
      dot.title = `${CATEGORIES[p.category]?.label || p.category}${p.busy ? ' · en course' : ' · libre'}`;
      dot.style.cssText = `width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);background:${p.busy ? '#000' : '#0F7A5A'}`;
      return new maplibregl.Marker({ element: dot }).setLngLat([p.lng, p.lat]).addTo(map.current);
    });
  }, [positions]);
  return <div ref={el} className="h-72 rounded-xl overflow-hidden bg-gray-100" role="img" aria-label={`Carte : ${positions.length} chauffeurs en ligne`} />;
}

/** Supervision en direct : rafraîchie toutes les 10 s. */
export default function AdminOverview({ onOpenDrivers }) {
  const { data, isError, dataUpdatedAt } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => apiClient.get('/admin/overview').then(r => r.data),
    refetchInterval: 10000,
  });
  if (isError) return <p className="text-red-700" role="alert">Supervision indisponible.</p>;
  if (!data) return <p className="text-gray-500" role="status">Chargement…</p>;
  const { drivers, today, active, recent, alerts } = data;
  const searching = active.filter(r => r.status === 'pending');

  return (
    <div className="flex flex-col gap-4">
      {(alerts.pending_reviews > 0 || alerts.drivers_over_debt > 0) && (
        <div className="flex flex-col gap-2">
          {alerts.pending_reviews > 0 && (
            <button onClick={onOpenDrivers} className="text-left text-sm bg-amber-100 text-amber-900 rounded-lg px-3 py-2 font-semibold">
              {alerts.pending_reviews} dossier{alerts.pending_reviews > 1 ? 's' : ''} chauffeur à contrôler →
            </button>
          )}
          {alerts.drivers_over_debt > 0 && (
            <p className="text-sm bg-red-50 text-red-700 rounded-lg px-3 py-2">
              {alerts.drivers_over_debt} chauffeur{alerts.drivers_over_debt > 1 ? 's' : ''} bloqué{alerts.drivers_over_debt > 1 ? 's' : ''} : solde dû trop élevé
            </p>
          )}
        </div>
      )}

      <section aria-labelledby="live-title">
        <h2 id="live-title" className="text-sm font-semibold text-gray-700 mb-2">En direct</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Chauffeurs en ligne" value={drivers.online}
            hint={Object.entries(drivers.by_category).map(([c, n]) => `${CATEGORIES[c]?.label.replace('Nawiy ', '') || c} ${n}`).join(' · ') || 'aucun'} />
          <Tile label="En course" value={drivers.busy} />
          <Tile label="Demandes en recherche" value={searching.length} tone={searching.length > 0 && drivers.online === drivers.busy ? 'warn' : undefined}
            hint={searching.length > 0 && drivers.online === drivers.busy ? 'aucun chauffeur libre' : undefined} />
          <Tile label="Courses actives" value={active.length} />
        </div>
      </section>

      <DriversMap positions={drivers.positions} />

      <section aria-labelledby="today-title">
        <h2 id="today-title" className="text-sm font-semibold text-gray-700 mb-2">Aujourd'hui</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Courses terminées" value={today.completed} hint={`${today.requested} demandées`} />
          <Tile label="Sans chauffeur" value={today.no_driver}
            hint={today.requested ? `${Math.round((today.no_driver / today.requested) * 100)} % des demandes` : undefined}
            tone={today.requested && today.no_driver / today.requested > 0.2 ? 'warn' : undefined} />
          <Tile label="Volume des courses" value={F(today.volume)} hint={`${today.cancelled} annulées`} />
          <Tile label="Commission NawiyApp" value={F(today.commission)} />
        </div>
      </section>

      <section aria-labelledby="active-title" className="bg-white rounded-xl shadow-sm">
        <h2 id="active-title" className="text-sm font-semibold text-gray-700 px-4 pt-3 pb-2">Courses en cours</h2>
        {active.length === 0 ? <p className="text-sm text-gray-500 px-4 pb-3">Aucune course en cours.</p> : (
          <ul className="divide-y divide-gray-100">
            {active.map(r => (
              <li key={r.id} className="px-4 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">#{r.id} · {r.from_name} → {r.to_name}</p>
                  <p className="text-xs text-gray-500">{CATEGORIES[r.category]?.label} · {r.driver_name || 'sans chauffeur'} · {ago(r.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{F(r.price)}</p>
                  <p className={`text-xs font-semibold ${r.status === 'pending' ? 'text-amber-700' : 'text-nawiy-600'}`}>
                    {r.status === 'accepted' && r.arrived_at ? 'Chauffeur sur place' : STATUS[r.status]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-title" className="bg-white rounded-xl shadow-sm">
        <h2 id="recent-title" className="text-sm font-semibold text-gray-700 px-4 pt-3 pb-2">Dernières courses</h2>
        <ul className="divide-y divide-gray-100">
          {recent.map(r => (
            <li key={r.id} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-900">#{r.id} · {r.to_name}</span>
              <span className={`flex-shrink-0 ${r.status === 'cancelled' ? 'text-gray-500' : 'text-gray-900 font-semibold'}`}>
                {r.status === 'cancelled' ? (r.cancelled_by === 'system' ? 'sans chauffeur' : r.cancelled_by === 'no_show' ? 'passager absent' : 'annulée') : F(r.price)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-gray-400">Mis à jour {new Date(dataUpdatedAt).toLocaleTimeString('fr-FR')} · actualisation toutes les 10 s</p>
    </div>
  );
}
