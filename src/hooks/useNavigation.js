import { useState, useRef, useCallback } from 'react';
import { getRouteWithSteps } from '../lib/routing';
import { useMapStore } from '../store/mapStore';

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; u.rate = 1.05; u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function useNavigation() {
  const { userPosition, startFollowingUser, stopFollowingUser } = useMapStore();

  const [navActive, setNavActive]   = useState(false);
  const [navSteps, setNavSteps]     = useState([]);
  const [navStepIdx, setNavStepIdx] = useState(0);
  const [navDistM, setNavDistM]     = useState(0);
  const [navEtaMin, setNavEtaMin]   = useState(0);
  const navRouteRef                 = useRef(null);
  const spokenRef                   = useRef(new Set());

  const startNavigation = useCallback(async (fromNode, toNode) => {
    if (!fromNode || !toNode) return;
    const start = userPosition || { lat: fromNode.lat, lng: fromNode.lng };
    const route = await getRouteWithSteps([start, { lat: toNode.lat, lng: toNode.lng }], 'driving');
    if (!route) { alert("Impossible de calculer l'itinéraire"); return; }

    navRouteRef.current = route;
    spokenRef.current   = new Set();
    setNavSteps(route.steps);
    setNavStepIdx(0);
    setNavDistM(route.distanceM);
    setNavEtaMin(Math.round(route.durationS / 60));
    setNavActive(true);
    startFollowingUser();
    if (route.steps[0]) speak(route.steps[0].instruction);
  }, [userPosition, startFollowingUser]);

  const stopNavigation = useCallback(() => {
    setNavActive(false);
    window.speechSynthesis?.cancel();
    stopFollowingUser();
  }, [stopFollowingUser]);

  const updateNavigation = useCallback((lat, lng, toNode) => {
    if (!navActive || !navRouteRef.current) return;
    const steps = navRouteRef.current.steps;

    setNavStepIdx(prev => {
      let idx = prev;
      while (idx < steps.length - 1) {
        const [sLng, sLat] = steps[idx].location || [lng, lat];
        if (haversineM(lat, lng, sLat, sLng) < 30) idx++;
        else break;
      }
      if (idx !== prev && steps[idx] && !spokenRef.current.has(idx)) {
        spokenRef.current.add(idx);
        const dist = steps[idx].distanceM;
        const distTxt = dist > 1000 ? `dans ${(dist / 1000).toFixed(1)} km` : `dans ${dist} mètres`;
        speak(`${distTxt}, ${steps[idx].instruction}`);
      }
      if (idx === steps.length - 1 && !spokenRef.current.has('arrived')) {
        spokenRef.current.add('arrived');
        speak('Vous êtes arrivé à destination');
        setTimeout(() => stopNavigation(), 4000);
      }
      return idx;
    });

    if (toNode) {
      const distLeft = haversineM(lat, lng, toNode.lat, toNode.lng);
      setNavDistM(Math.round(distLeft));
      setNavEtaMin(Math.max(1, Math.round(distLeft / 500)));
    }
  }, [navActive, stopNavigation]);

  return {
    navActive, navSteps, navStepIdx, navDistM, navEtaMin, navRouteRef,
    startNavigation, stopNavigation, updateNavigation,
  };
}
