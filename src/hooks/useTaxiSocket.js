import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore, getFreshToken } from '../store/authStore';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1')
  .replace('http', 'ws')
  .replace('/api/v1', '') + '/ws';

export function useTaxiSocket(handlers = {}) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const ws          = useRef(null);
  const handlersRef = useRef(handlers);
  const retryRef    = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => { handlersRef.current = handlers; });

  const send = useCallback((event, data = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;

    function connect() {
      if (!active) return;
      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = async () => {
        setConnected(true);
        clearTimeout(retryRef.current);
        // Jeton renouvelé si besoin : une reconnexion après 15 min ne doit pas échouer
        const token = await getFreshToken();
        if (token && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event: 'auth', data: { token } }));
      };

      socket.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        const handler = handlersRef.current[msg.event];
        if (handler) handler(msg.data);
      };

      socket.onclose = () => {
        setConnected(false);
        // Reconnexion automatique après 4s, sauf si la page a été quittée
        if (active && ws.current === socket) retryRef.current = setTimeout(connect, 4000);
      };

      socket.onerror = () => socket.close();
    }

    connect();
    return () => {
      active = false;
      clearTimeout(retryRef.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [isAuthenticated]);

  return { send, connected };
}
