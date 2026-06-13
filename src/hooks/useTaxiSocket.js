import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1')
  .replace('http', 'ws')
  .replace('/api/v1', '') + '/ws';

export function useTaxiSocket(handlers = {}) {
  const { token } = useAuthStore();
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

  const connect = useCallback(() => {
    if (!token) return;
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      clearTimeout(retryRef.current);
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
      // Reconnexion automatique après 4s
      retryRef.current = setTimeout(() => connect(), 4000);
    };

    socket.onerror = () => socket.close();
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [connect]);

  return { send, connected };
}
