import { useState, useCallback } from 'react';

const RECENT_KEY = 'nawiy_recent';
const FAV_KEY    = 'nawiy_favorites';
const MAX_RECENT = 5;

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useSearchHistory() {
  const [recents,   setRecents]   = useState(() => load(RECENT_KEY));
  const [favorites, setFavorites] = useState(() => load(FAV_KEY));

  const addRecent = useCallback((place) => {
    if (!place?.name) return;
    setRecents(prev => {
      const filtered = prev.filter(p => p.id !== place.id);
      const next = [place, ...filtered].slice(0, MAX_RECENT);
      save(RECENT_KEY, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((place) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === place.id);
      const next = exists ? prev.filter(p => p.id !== place.id) : [place, ...prev];
      save(FAV_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id) => favorites.some(p => p.id === id), [favorites]);

  return { recents, favorites, addRecent, toggleFavorite, isFavorite };
}
