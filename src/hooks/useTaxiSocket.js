/**
 * Hook WebSocket NawiyApp Taxi
 * Gère la connexion WS, l'auth, et expose send() + les événements reçus
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1')
  .replace('http', 'ws')
  .replace('/api/v1', '') + '/ws';

export function useTaxiSocket(handlers = {}) {
  const { token } = useAuthStore();
  const ws        = useRef(null);
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);

  // Met à jour les handlers sans recréer la connexion
  useEffect(() => { handlersRef.current = handlers; });

  const send = useCallback((event, data = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      // Auth immédiate
      socket.send(JSON.stringify({ event: 'auth', data: { token } }));
    };

    socket.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      const handler = handlersRef.current[msg.event];
      if (handler) handler(msg.data);
    };

    socket.onclose = () => {
      setConnected(false);
      // Reconnexion automatique après 3s
      setTimeout(() => {
        if (ws.current === socket) ws.current = null;
      }, 3000);
    };

    socket.onerror = () => socket.close();

    return () => {
      socket.close();
      ws.current = null;
      setConnected(false);
    };
  }, [token]);

  return { send, connected };
}
