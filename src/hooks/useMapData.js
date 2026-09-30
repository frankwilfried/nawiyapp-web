import { useState, useEffect } from 'react';
import { buildGraph, STATIC_FOCAL_POINTS, STATIC_ROUTES } from '../lib/staticData';

const API_URL = import.meta.env.VITE_API_URL;
const CACHE_KEY  = 'nawiy_graph_v1';
const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24h

function loadCache(citySlug) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${citySlug}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
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
    return await res.json(); // { nodes, edges, generated_at }
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
      setGraph(cached);
      setNodes(cached.nodes);
      setSource('cache');
    }

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
  }, [citySlug]);

  return { graph, nodes, source, loading };
}
