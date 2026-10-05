import { useState, useEffect } from 'react';
import { buildGraph, STATIC_FOCAL_POINTS, STATIC_ROUTES } from '../lib/staticData';

// VITE_API_URL se termine déjà par /api/v1 : on le retire pour ne pas l'avoir en double
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, '');
const CACHE_KEY  = 'nawiy_graph_v3'; // v3 : repères OSM + coordonnées numériques
const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24h : au-delà on rafraîchit, mais on garde l'ancien hors ligne
const CITIES = ['douala', 'yaounde'];

function loadCache(citySlug) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${citySlug}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return { data, fresh: Date.now() - ts <= CACHE_TTL };
  } catch {
    return null;
  }
}

function saveCache(citySlug, data) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${citySlug}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota */ }
}

async function fetchFromApi(citySlug) {
  if (!API_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_URL}/api/v1/graph?city=${citySlug}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json(); // { nodes, edges, generated_at }
    // Les colonnes DECIMAL de PostgreSQL arrivent parfois en texte : on force des nombres
    data.nodes = (data.nodes || []).map(n => ({ ...n, lat: Number(n.lat), lng: Number(n.lng), landmarks: n.landmarks || [] }));
    return data;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export function useMapData(citySlug) {
  const [graph,   setGraph]   = useState(() => buildGraph(citySlug));
  const [nodes,   setNodes]   = useState(() => STATIC_FOCAL_POINTS[citySlug] || []);
  const [source,  setSource]  = useState('static'); // 'static' | 'cache' | 'api'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!citySlug) return;

    // Mise à jour immédiate depuis les données statiques embarquées
    const staticGraph = buildGraph(citySlug);
    setGraph(staticGraph);
    setNodes(STATIC_FOCAL_POINTS[citySlug] || []);
    setSource('static');

    // Vérifier le cache localStorage en premier
    const cached = loadCache(citySlug);
    if (cached) {
      setGraph(cached.data);
      setNodes(cached.data.nodes);
      setSource('cache');
    }
    if (!navigator.onLine) return;   // hors ligne : on garde le cache (même ancien) ou les données embarquées

    // Puis essayer l'API en arrière-plan
    setLoading(true);
    fetchFromApi(citySlug).then(apiData => {
      if (apiData?.nodes?.length > 0) {
        saveCache(citySlug, apiData);
        setGraph(apiData);
        setNodes(apiData.nodes);
        setSource('api');
      }
    }).finally(() => setLoading(false));

    // L'autre ville aussi, pour pouvoir s'en servir hors ligne en voyage
    for (const other of CITIES.filter(c => c !== citySlug)) {
      if (!loadCache(other)?.fresh) fetchFromApi(other).then(d => { if (d?.nodes?.length) saveCache(other, d); });
    }
  }, [citySlug]);

  return { graph, nodes, source, loading };
}
