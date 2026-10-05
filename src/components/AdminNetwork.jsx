import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import apiClient from '../api/client';

const TYPES = { carrefour: 'Carrefour', quartier: 'Quartier', marche: 'Marché', universite: 'Université', transport: 'Gare / arrêt', autre: 'Autre' };
const TYPE_COLORS = { carrefour: '#000000', quartier: '#545454', marche: '#B45309', universite: '#1D4ED8', transport: '#0F7A5A', autre: '#6B6B6B' };
const KIND_LABELS = { marketplace: 'marché', bus_station: 'gare routière', station: 'gare', university: 'université', suburb: 'quartier', quarter: 'quartier', neighbourhood: 'quartier', roundabout: 'rond-point' };
const km = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`);
const errMsg = (e) => e?.response?.data?.error || 'Erreur, réessaie';

function pointEl(p, selected) {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', p.name);
  el.style.cssText = `width:${selected ? 22 : 16}px;height:${selected ? 22 : 16}px;border-radius:50%;border:3px solid ${selected ? '#FACC15' : '#fff'};
    box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer;background:${p.is_active ? TYPE_COLORS[p.type] || '#000' : '#C4C4C4'}`;
  return el;
}

/**
 * Carte d'édition du réseau : déplacer un point (glisser), le renommer, voir les liaisons
 * et les corrections proposées par OpenStreetMap (en orange, reliées au point actuel).
 */
function NetworkMap({ data, selectedId, onSelect, onMoved, focus }) {
  const el = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [ready, setReady] = useState(false);
  // Centre initial seulement : il bouge quand un point est déplacé, la carte ne doit pas être recréée
  const center = useRef([data.city.lng, data.city.lat]);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current, style: 'https://tiles.openfreemap.org/styles/liberty',
      center: center.current, zoom: 12, attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      m.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'routes', type: 'line', source: 'routes', paint: { 'line-color': '#0F7A5A', 'line-width': 2, 'line-opacity': 0.6 } });
      m.addSource('fixes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'fixes', type: 'line', source: 'fixes', paint: { 'line-color': '#EA580C', 'line-width': 2, 'line-dasharray': [2, 2] } });
      setReady(true);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; setReady(false); };
  }, []);

  // Liaisons et corrections dessinées en lignes ; points et suggestions en marqueurs
  useEffect(() => {
    if (!ready) return;
    const m = map.current;
    const byId = Object.fromEntries(data.points.map(p => [p.id, p]));
    m.getSource('routes').setData({
      type: 'FeatureCollection',
      features: data.routes.filter(r => byId[r.from_point_id] && byId[r.to_point_id]).map(r => ({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: [[byId[r.from_point_id].lng, byId[r.from_point_id].lat], [byId[r.to_point_id].lng, byId[r.to_point_id].lat]] },
      })),
    });
    m.getSource('fixes').setData({
      type: 'FeatureCollection',
      features: data.suggestions.filter(s => byId[s.focal_point_id]).map(s => ({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: [[byId[s.focal_point_id].lng, byId[s.focal_point_id].lat], [s.lng, s.lat]] },
      })),
    });

    markers.current.forEach(mk => mk.remove());
    markers.current = [];
    for (const s of data.suggestions) {
      const d = document.createElement('div');
      d.title = `Proposition OSM : ${s.osm_name}`;
      d.style.cssText = 'width:12px;height:12px;transform:rotate(45deg);background:#EA580C;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)';
      markers.current.push(new maplibregl.Marker({ element: d }).setLngLat([s.lng, s.lat]).addTo(m));
    }
    for (const c of data.candidates || []) {
      const d = document.createElement('div');
      d.title = `Arrêt ${c.source === 'gps' ? 'détecté (GPS)' : 'proposé par un chauffeur'} : ${c.name}`;
      d.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#7C3AED;border:3px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)';
      markers.current.push(new maplibregl.Marker({ element: d }).setLngLat([c.lng, c.lat]).addTo(m));
    }
    for (const p of data.points) {
      const selected = p.id === selectedId;
      const element = pointEl(p, selected);
      element.addEventListener('click', (e) => { e.stopPropagation(); onSelect(p.id); });
      const mk = new maplibregl.Marker({ element, draggable: selected }).setLngLat([p.lng, p.lat]).addTo(m);
      if (selected) mk.on('dragend', () => { const ll = mk.getLngLat(); onMoved(p.id, ll.lat, ll.lng); });
      markers.current.push(mk);
    }
  }, [ready, data, selectedId, onSelect, onMoved]);

  useEffect(() => {
    if (ready && focus) map.current.flyTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.current.getZoom(), 14), duration: 600 });
  }, [ready, focus]);

  return <div ref={el} className="h-[55vh] min-h-80 rounded-xl overflow-hidden bg-gray-100" role="application" aria-label="Carte du réseau : clique un point pour le modifier, glisse-le pour le déplacer" />;
}

function PointEditor({ point, moved, onSave, onCancelMove, saving, error }) {
  const [name, setName] = useState(point.name);
  const [type, setType] = useState(point.type);
  const [active, setActive] = useState(point.is_active);
  const changed = name.trim() !== point.name || type !== point.type || active !== point.is_active || !!moved;
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ name: name.trim(), type, is_active: active, ...(moved || {}) }); }}
      className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Modifier le point</h3>
        <span className="text-xs text-gray-500">{point.degree} liaison{point.degree > 1 ? 's' : ''}</span>
      </div>
      <label className="text-sm font-semibold text-gray-800">Nom
        <input value={name} onChange={e => setName(e.target.value)} maxLength={150} required className="mt-1 w-full h-11 border border-gray-300 rounded-lg px-3 font-normal" />
      </label>
      <label className="text-sm font-semibold text-gray-800">Type
        <select value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full h-11 border border-gray-300 rounded-lg px-3 font-normal bg-white">
          {Object.entries(TYPES).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4" />
        Actif (utilisé pour les itinéraires)
      </label>
      {moved ? (
        <p className="text-sm bg-amber-100 text-amber-900 rounded-lg px-3 py-2">
          Nouvelle position : {moved.lat.toFixed(5)}, {moved.lng.toFixed(5)}{' '}
          <button type="button" onClick={onCancelMove} className="underline font-semibold">annuler</button>
        </p>
      ) : (
        <p className="text-xs text-gray-500">Glisse le point sur la carte pour le déplacer.</p>
      )}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={!changed || saving} className="h-11 bg-black text-white rounded-lg font-semibold disabled:opacity-40">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}

function Priorities({ city, onFocus, onCreated }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['network-priorities', city],
    queryFn: () => apiClient.get('/admin/network/priorities', { params: { city } }).then(r => r.data),
  });
  const create = useMutation({
    mutationFn: (pl) => apiClient.post('/admin/network/points', { city, name: pl.name, type: pl.suggested_type, lat: pl.lat, lng: pl.lng }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['network-priorities', city] }); onCreated(); },
  });
  if (isLoading || !data) return <p className="text-gray-500 text-sm" role="status">Calcul des priorités…</p>;

  const copyList = () => {
    const lines = [
      ...data.failed_searches.map(f => `• ${f.from_name || 'zone'} → ${f.to_name || 'zone'} (${f.searches} recherches sans résultat)`),
      ...data.isolated_points.map(p => `• Trajets depuis/vers ${p.name} (${p.degree} liaison)`),
      ...data.uncovered_places.slice(0, 10).map(p => `• Arrêt à repérer près de : ${p.name}`),
    ];
    navigator.clipboard?.writeText(`NawiyApp — trajets à enregistrer en priorité\n${lines.join('\n')}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">Ce qu'il faut collecter en priorité avec les testeurs (mode « Enregistrer »).</p>
        <button onClick={copyList} className="h-9 px-3 rounded-lg bg-white border border-gray-300 text-sm font-semibold whitespace-nowrap">Copier la liste</button>
      </div>

      <section className="bg-white rounded-xl shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 px-4 pt-3">Recherches sans itinéraire (60 jours)</h3>
        {data.failed_searches.length === 0
          ? <p className="text-sm text-gray-500 px-4 py-3">Aucune pour l'instant : les recherches des passagers s'afficheront ici.</p>
          : (
            <ul className="divide-y divide-gray-100">
              {data.failed_searches.map((f, i) => (
                <li key={i} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{f.from_name || `${f.from_lat}, ${f.from_lng}`} → {f.to_name || `${f.to_lat}, ${f.to_lng}`}</span>
                  <span className="font-semibold whitespace-nowrap">{f.searches}×</span>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="bg-white rounded-xl shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 px-4 pt-3">Points mal reliés ({data.isolated_points.length})</h3>
        <p className="text-xs text-gray-500 px-4">0 ou 1 liaison : impossible d'en partir ou d'y passer.</p>
        <ul className="divide-y divide-gray-100 mt-1">
          {data.isolated_points.map(p => (
            <li key={p.id}>
              <button onClick={() => onFocus(p)} className="w-full px-4 py-2 flex items-center justify-between gap-3 text-sm text-left hover:bg-gray-50">
                <span className="truncate">{p.name} <span className="text-gray-500">· {TYPES[p.type]}</span></span>
                <span className={`whitespace-nowrap font-semibold ${p.degree === 0 ? 'text-red-700' : 'text-amber-700'}`}>{p.degree} liaison</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 px-4 pt-3">Lieux sans arrêt proche (OpenStreetMap)</h3>
        <p className="text-xs text-gray-500 px-4">Marchés, gares et quartiers à plus de 800 m de tout point du réseau.</p>
        {data.osm_places === 0 && <p className="text-sm text-gray-500 px-4 py-3">Lance d'abord « Rechercher les corrections OSM ».</p>}
        <ul className="divide-y divide-gray-100 mt-1">
          {data.uncovered_places.map(p => (
            <li key={p.osm_id} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
              <button onClick={() => onFocus(p)} className="min-w-0 text-left">
                <span className="block truncate">{p.name}</span>
                <span className="block text-xs text-gray-500">{KIND_LABELS[p.kind] || p.kind} · arrêt le plus proche à {km(p.nearest_m)}</span>
              </button>
              <button onClick={() => create.mutate(p)} disabled={create.isPending}
                className="h-9 px-3 rounded-lg bg-gray-100 text-sm font-semibold whitespace-nowrap disabled:opacity-50">Créer un arrêt</button>
            </li>
          ))}
        </ul>
        {create.isError && <p className="text-sm text-red-700 px-4 pb-3" role="alert">{errMsg(create.error)}</p>}
      </section>
    </div>
  );
}

function CandidateRow({ c, onFocus, onDecide, busy }) {
  const [name, setName] = useState(c.name);
  const [type, setType] = useState('carrefour');
  return (
    <li className="bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2">
      <button onClick={onFocus} className="text-left">
        <span className="block text-sm text-gray-600">
          {c.source === 'gps' ? 'Détecté dans les traces GPS' : 'Nommé par un chauffeur'} · vu {c.seen_count} fois
          {c.drivers_count ? ` · ${c.drivers_count} chauffeurs` : ''}{c.avg_dwell_s ? ` · arrêt moyen ${c.avg_dwell_s} s` : ''}
        </span>
      </button>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={150} aria-label="Nom de l'arrêt"
          className="flex-1 min-w-40 h-10 border border-gray-300 rounded-lg px-3 text-sm" />
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Type"
          className="h-10 border border-gray-300 rounded-lg px-2 text-sm bg-white">
          {Object.entries(TYPES).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <button onClick={() => onDecide(true, { name: name.trim(), type })} disabled={busy || !name.trim()}
          className="h-10 px-3 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50">Ajouter au réseau</button>
        <button onClick={() => onDecide(false)} disabled={busy}
          className="h-10 px-3 rounded-lg bg-gray-100 text-sm font-semibold disabled:opacity-50">Ignorer</button>
      </div>
    </li>
  );
}

/** Onglet « Réseau » : carte d'édition, corrections OSM, priorités de collecte. */
export default function AdminNetwork() {
  const qc = useQueryClient();
  const [city, setCity] = useState('douala');
  const [view, setView] = useState('fixes'); // fixes | priorities
  const [selectedId, setSelectedId] = useState(null);
  const [moved, setMoved] = useState(null);
  const [focus, setFocus] = useState(null);
  const [notice, setNotice] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['network-map', city],
    queryFn: () => apiClient.get('/admin/network/map', { params: { city } }).then(r => r.data),
  });
  const reload = () => qc.invalidateQueries({ queryKey: ['network-map', city] });

  const refresh = useMutation({
    mutationFn: (refetch) => apiClient.post('/admin/network/suggestions/refresh', { city, refetch }).then(r => r.data),
    onSuccess: (r) => { setNotice(`${r.osm_places} lieux OSM comparés à ${r.points} points : ${r.created} nouvelle${r.created > 1 ? 's' : ''} correction${r.created > 1 ? 's' : ''}.`); reload(); qc.invalidateQueries({ queryKey: ['network-priorities', city] }); },
    onError: (e) => setNotice(errMsg(e)),
  });
  const mine = useMutation({
    mutationFn: () => apiClient.post('/admin/network/stops/mine', { city }).then(r => r.data),
    onSuccess: (r) => { setNotice(`${r.gps_points} points GPS analysés : ${r.likely} arrêts fréquents, ${r.created} nouveau${r.created > 1 ? 'x' : ''} à valider.`); reload(); setView('stops'); },
    onError: (e) => setNotice(errMsg(e)),
  });
  const decideStop = useMutation({
    mutationFn: ({ id, accept, body }) => apiClient.post(`/sessions/admin/candidates/${id}/${accept ? 'approve' : 'reject'}`, body || {}),
    onSuccess: reload,
  });
  const decide = useMutation({
    mutationFn: ({ id, accept }) => apiClient.post(`/admin/network/suggestions/${id}/${accept ? 'accept' : 'reject'}`),
    onSuccess: reload,
  });
  const save = useMutation({
    mutationFn: (body) => apiClient.patch(`/admin/network/points/${selectedId}`, body).then(r => r.data),
    onSuccess: () => { setMoved(null); setNotice('Point enregistré.'); reload(); },
  });

  if (isError) return <p className="text-red-700" role="alert">Réseau indisponible.</p>;
  if (isLoading || !data) return <p className="text-gray-500" role="status">Chargement du réseau…</p>;
  const selected = data.points.find(p => p.id === selectedId);
  const shown = moved && selected ? { ...data, points: data.points.map(p => (p.id === selectedId ? { ...p, ...moved } : p)) } : data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={city} onChange={e => { setCity(e.target.value); setSelectedId(null); setMoved(null); }} aria-label="Ville"
          className="h-10 border border-gray-300 rounded-lg px-3 bg-white text-sm font-semibold">
          <option value="douala">Douala</option>
          <option value="yaounde">Yaoundé</option>
        </select>
        <span className="text-sm text-gray-600">{data.points.length} points · {data.routes.length} liaisons</span>
        <button onClick={() => refresh.mutate(false)} disabled={refresh.isPending}
          className="ml-auto h-10 px-3 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50">
          {refresh.isPending ? 'Comparaison avec OSM… (jusqu\'à 2 min)' : 'Rechercher les corrections OSM'}
        </button>
        <button onClick={() => refresh.mutate(true)} disabled={refresh.isPending} title="Télécharger à nouveau les lieux OpenStreetMap"
          className="h-10 px-3 rounded-lg bg-white border border-gray-300 text-sm font-semibold disabled:opacity-50">Actualiser OSM</button>
        <button onClick={() => mine.mutate()} disabled={mine.isPending}
          className="h-10 px-3 rounded-lg bg-white border border-gray-300 text-sm font-semibold disabled:opacity-50">
          {mine.isPending ? 'Analyse des traces…' : 'Détecter les arrêts (GPS chauffeurs)'}
        </button>
      </div>
      {notice && <p className="text-sm bg-gray-100 rounded-lg px-3 py-2" role="status">{notice}</p>}

      <NetworkMap key={city} data={shown} selectedId={selectedId} focus={focus}
        onSelect={(id) => { setSelectedId(id); setMoved(null); save.reset(); }}
        onMoved={(id, lat, lng) => setMoved({ lat, lng })} />
      <p className="text-xs text-gray-500 -mt-2">
        Points : noir carrefour, vert gare, orange foncé marché, bleu université, gris inactif · losange orange : position proposée par OSM ·
        rond violet : arrêt détecté ·
        © OpenStreetMap contributors
      </p>

      {selected && (
        <PointEditor key={selected.id} point={selected} moved={moved} saving={save.isPending}
          error={save.isError ? errMsg(save.error) : ''} onCancelMove={() => setMoved(null)} onSave={(b) => save.mutate(b)} />
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {[['fixes', `Corrections OSM (${data.suggestions.length})`], ['stops', `Arrêts détectés (${data.candidates?.length || 0})`], ['priorities', 'Priorités de collecte']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${view === id ? 'border-black text-black' : 'border-transparent text-gray-500'}`}>{label}</button>
        ))}
      </div>

      {view === 'fixes' && (
        data.suggestions.length === 0
          ? <p className="text-sm text-gray-500">Aucune correction en attente. Lance « Rechercher les corrections OSM ».</p>
          : (
            <ul className="flex flex-col gap-2">
              {data.suggestions.map(s => (
                <li key={s.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between gap-3">
                  <button onClick={() => { setSelectedId(s.focal_point_id); setFocus({ lat: s.lat, lng: s.lng }); }} className="min-w-0 text-left">
                    <span className="block font-semibold text-gray-900 truncate">{s.point_name}</span>
                    <span className="block text-sm text-gray-600 truncate">→ « {s.osm_name} » dans OSM, à {km(s.distance_m)}</span>
                  </button>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decide.mutate({ id: s.id, accept: true })} disabled={decide.isPending}
                      className="h-9 px-3 rounded-lg bg-black text-white text-sm font-semibold disabled:opacity-50">Déplacer</button>
                    <button onClick={() => decide.mutate({ id: s.id, accept: false })} disabled={decide.isPending}
                      className="h-9 px-3 rounded-lg bg-gray-100 text-sm font-semibold disabled:opacity-50">Ignorer</button>
                  </div>
                </li>
              ))}
            </ul>
          )
      )}
      {view === 'stops' && (
        !data.candidates?.length
          ? <p className="text-sm text-gray-500">Aucun arrêt à valider. Les traces GPS des sessions de conduite sont analysées chaque nuit, ou avec « Détecter les arrêts ».</p>
          : (
            <ul className="flex flex-col gap-2">
              {data.candidates.map(c => (
                <CandidateRow key={c.id} c={c} busy={decideStop.isPending}
                  onFocus={() => setFocus({ lat: c.lat, lng: c.lng })}
                  onDecide={(accept, body) => decideStop.mutate({ id: c.id, accept, body })} />
              ))}
            </ul>
          )
      )}
      {view === 'priorities' && (
        <Priorities city={city} onCreated={reload}
          onFocus={(p) => { setFocus({ lat: p.lat, lng: p.lng }); if (p.id) setSelectedId(p.id); }} />
      )}
    </div>
  );
}
