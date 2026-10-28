import { useEffect, useRef, useState } from 'react';
import { API_URL } from '../config';
import useAuth from './useAuth';

// Subscribes to the backend SSE stream. `handlers` maps event names to callbacks;
// `onConnect` runs on every (re)connect so the page can refetch anything it missed.
// Returns whether the stream is currently connected, for a "Live" indicator.
export default function useEventStream(handlers, onConnect) {
  const { token } = useAuth();
  const [live, setLive] = useState(false);
  const handlersRef = useRef(handlers);
  const onConnectRef = useRef(onConnect);
  useEffect(() => {
    handlersRef.current = handlers;
    onConnectRef.current = onConnect;
  });

  useEffect(() => {
    if (!token) return undefined;
    // EventSource can't send headers, so the token goes in the query string.
    const source = new EventSource(`${API_URL}/api/events?token=${encodeURIComponent(token)}`);
    let connectedBefore = false;

    source.addEventListener('connected', () => {
      setLive(true);
      if (connectedBefore) onConnectRef.current?.();
      connectedBefore = true;
    });
    source.onerror = () => setLive(false); // EventSource retries on its own

    const names = Object.keys(handlersRef.current);
    const listeners = names.map((name) => {
      const listener = (e) => handlersRef.current[name]?.(JSON.parse(e.data));
      source.addEventListener(name, listener);
      return [name, listener];
    });

    return () => {
      listeners.forEach(([name, listener]) => source.removeEventListener(name, listener));
      source.close(); // also removes this tab's res from the server's Map
    };
  }, [token]);

  return live;
}
