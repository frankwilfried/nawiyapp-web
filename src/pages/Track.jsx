import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';
import Icon from '../components/Icon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const STATUS_TEXT = {
  pending: 'Recherche d\'un chauffeur…',
  accepted: 'Le chauffeur va chercher le passager',
  in_progress: 'En route vers la destination',
  completed: 'Course terminée',
  cancelled: 'Course annulée',
};

function dot(color, size = 14) {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)`;
  return el;
}

/** Suivi en direct d'une course, ouvert par un proche via le lien partagé (sans compte). */
export default function Track() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const mapEl = useRef(null);
  const map = useRef(null);
  const driverMarker = useRef(null);
  const framed = useRef(false);

  // Rafraîchi toutes les 5 s tant que la course est en cours
  useEffect(() => {
    let stop = false;
    let timer;
    const load = async () => {
      try {
        const { data: d } = await axios.get(`${API_URL}/track/${encodeURIComponent(token)}`);
        if (stop) return;
        setData({ ...d, fetchedAt: Date.now() }); setError('');
        if (['pending', 'accepted', 'in_progress'].includes(d.status)) timer = setTimeout(load, 5000);
      } catch (err) {
        if (!stop) setError(err.response?.data?.error || 'Suivi indisponible pour le moment');
        if (!stop && !err.response) timer = setTimeout(load, 10000);
      }
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [token]);

  // Carte : départ, arrivée, chauffeur
  useEffect(() => {
    if (!data || !mapEl.current) return;
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapEl.current, style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [data.from.lng, data.from.lat], zoom: 13, attributionControl: { compact: true },
      });
      new maplibregl.Marker({ element: dot('#000') }).setLngLat([data.from.lng, data.from.lat]).addTo(map.current);
      const end = dot('#0F7A5A'); end.style.borderRadius = '3px';
      new maplibregl.Marker({ element: end }).setLngLat([data.to.lng, data.to.lat]).addTo(map.current);
    }
    if (data.position) {
      const at = [data.position.lng, data.position.lat];
      if (!driverMarker.current) driverMarker.current = new maplibregl.Marker({ element: dot('#2563EB', 20) }).setLngLat(at).addTo(map.current);
      else driverMarker.current.setLngLat(at);
    }
    if (!framed.current) {
      framed.current = true;
      const b = new maplibregl.LngLatBounds([data.from.lng, data.from.lat], [data.from.lng, data.from.lat]).extend([data.to.lng, data.to.lat]);
      if (data.position) b.extend([data.position.lng, data.position.lat]);
      map.current.fitBounds(b, { padding: 60, maxZoom: 15, duration: 0 });
    }
  }, [data]);

  useEffect(() => () => map.current?.remove(), []);

  const d = data?.driver;
  return (
    <div className="h-[100dvh] flex flex-col bg-white">
      <div ref={mapEl} className="flex-1 min-h-[40vh] bg-ink-fill" aria-label="Carte du trajet" role="img" />
      <section className="bg-white rounded-t-2xl -mt-4 relative shadow-sheet px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} aria-live="polite">
        <p className="text-xs font-bold tracking-widest text-nawiy-600">NAWIYAPP · SUIVI EN DIRECT</p>
        {error && !data && <p className="text-base text-ink mt-2" role="alert">{error}</p>}
        {data && (
          <>
            <h1 className="text-xl font-bold text-ink mt-1">
              {data.status === 'accepted' && data.arrived ? 'Le chauffeur est au point de départ' : STATUS_TEXT[data.status]}
            </h1>
            {data.eta_min != null && (
              <p className="text-base text-ink-2">
                {data.status === 'in_progress' ? 'Arrivée prévue vers ' : 'Prise en charge vers '}
                {new Date(data.fetchedAt + data.eta_min * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <div className="flex gap-3 mt-3">
              <div className="flex flex-col items-center pt-2" aria-hidden="true">
                <span className="w-2 h-2 rounded-full bg-ink" /><span className="w-px flex-1 bg-ink my-1" /><span className="w-2 h-2 bg-nawiy-600" />
              </div>
              <div className="min-w-0">
                <p className="text-base text-ink truncate">{data.from.name}</p>
                <p className="text-base font-semibold text-ink truncate mt-2">{data.to.name}</p>
              </div>
            </div>
            {d && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-ink-line">
                <span className="w-11 h-11 rounded-full bg-ink-fill flex items-center justify-center text-ink"><Icon name={data.category === 'moto' ? 'bike' : 'car'} size={22} /></span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">{d.name}</p>
                  <p className="text-sm text-ink-2 truncate">{[d.vehicle, d.plate, d.visible_number && `N° ${d.visible_number}`].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-amber-800 mt-2">{error}</p>}
            <a href="tel:117" className="mt-4 h-12 rounded-lg bg-red-50 text-red-700 font-semibold flex items-center justify-center gap-2">
              <Icon name="phone" size={18} /> En cas d'urgence : police 117
            </a>
          </>
        )}
      </section>
    </div>
  );
}
