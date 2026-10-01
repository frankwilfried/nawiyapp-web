/**
 * Hook WebSocket pour le passager taxi — session anonyme
 * Reconnexion automatique + file d'attente si WS pas encore ouvert
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { getFreshToken } from '../store/authStore';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1')
  .replace('http', 'ws')
  .replace('/api/v1', '') + '/ws';

export function getClientId() {
  let id = sessionStorage.getItem('nawiy_client_id');
  if (!id) {
    // Identifiant imprévisible : il suffit à reprendre la course en cours, il ne doit pas se deviner
    id = 'anon_' + crypto.randomUUID().replace(/-/g, '');
    sessionStorage.setItem('nawiy_client_id', id);
  }
  return id;
}

export function useTaxiPassenger(onEvent = {}) {
  const ws          = useRef(null);
  const handlersRef = useRef(onEvent);
  const pendingRef  = useRef([]);   // messages en attente d'envoi
  const [connected, setConnected] = useState(false);
  const activeRef   = useRef(true); // false quand le composant est démonté
  const clientId = getClientId();

  useEffect(() => { handlersRef.current = onEvent; });

  const send = useCallback((event, data = {}) => {
    const payload = JSON.stringify({ event, data });
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(payload);
    } else {
      // Met en file d'attente — sera envoyé dès la reconnexion
      pendingRef.current.push(payload);
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;

    function connect() {
      if (!activeRef.current) return;

      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      const sendAnon = () => socket.send(JSON.stringify({ event: 'passenger:anon', data: { clientId } }));
      // La file d'attente part seulement une fois l'identification confirmée par le serveur
      const flush = () => { while (pendingRef.current.length > 0) socket.send(pendingRef.current.shift()); };

      socket.onopen = async () => {
        if (!activeRef.current) { socket.close(); return; }
        // Connecté : les courses sont rattachées au compte (historique, reçus) ; sinon session anonyme
        const token = await getFreshToken();
        if (socket.readyState !== WebSocket.OPEN) return;
        if (token) socket.send(JSON.stringify({ event: 'auth', data: { token } }));
        else sendAnon();
      };

      socket.onmessage = (e) => {
        let msg; try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.event === 'auth:ok' || msg.event === 'anon:ok') { setConnected(true); flush(); }
        if (msg.event === 'auth:error') { sendAnon(); return; }
        const h = handlersRef.current[msg.event];
        if (h) h(msg.data);
      };

      socket.onclose = () => {
        setConnected(false);
        ws.current = null;
        // Reconnexion automatique après 2s si le composant est encore monté
        if (activeRef.current) {
          setTimeout(connect, 2000);
        }
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      activeRef.current = false;
      ws.current?.close();
      ws.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { send, connected, clientId };
}
