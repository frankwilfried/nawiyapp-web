import { useRef, useState, useEffect } from 'react';

export function useGooglePlaces(userPosition, nodes = []) {
  const [suggLoading, setSuggLoading] = useState(false);
  const debounceRef  = useRef(null);
  const googleLoaded = useRef(false);

  useEffect(() => {
    if (googleLoaded.current || window.google) return;
    googleLoaded.current = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places&language=fr`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const suggest = (val, setter) => {
    if (!val || val.length < 2) { setter([]); setSuggLoading(false); return; }
    setSuggLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const q = fold(val);
      const matches = nodes.filter(n => fold(n.name).includes(q));
      const local = matches.slice(0, 3);

      if (!navigator.onLine || !window.google?.maps?.places) {
        setter(matches.slice(0, 8));
        setSuggLoading(false);
        return;
      }

      const svc = new window.google.maps.places.AutocompleteService();
      const opts = { input: val, componentRestrictions: { country: 'cm' }, language: 'fr' };
      if (userPosition) {
        opts.location = new window.google.maps.LatLng(userPosition.lat, userPosition.lng);
        opts.radius   = 15000;
      }

      svc.getPlacePredictions(opts, (predictions, status) => {
        if (status !== 'OK' || !predictions) { setter(local); setSuggLoading(false); return; }
        const remote = predictions.map(p => ({
          id:       'gp_' + p.place_id,
          name:     p.structured_formatting.main_text,
          subtitle: p.structured_formatting.secondary_text,
          place_id: p.place_id,
          lat: null, lng: null,
          type: 'lieu',
        }));
        const seen   = new Set(local.map(n => n.name.toLowerCase()));
        const merged = [...local, ...remote.filter(g => !seen.has(g.name.toLowerCase()))].slice(0, 7);
        setter(merged);
        setSuggLoading(false);
      });
    }, 300);
  };

  const resolvePlaceCoords = (node, onResolved) => {
    if (node.lat !== null || !node.place_id) { onResolved(node); return; }
    const div = document.createElement('div');
    const svc = new window.google.maps.places.PlacesService(div);
    svc.getDetails({ placeId: node.place_id, fields: ['geometry'] }, (place, status) => {
      if (status === 'OK' && place.geometry) {
        onResolved({ ...node, lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      } else {
        onResolved(node);
      }
    });
  };

  return { suggest, resolvePlaceCoords, suggLoading };
}
