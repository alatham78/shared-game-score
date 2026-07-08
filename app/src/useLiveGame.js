import { useEffect, useRef, useState } from 'react';
import { api } from './api';

/**
 * Keeps a game in sync for display devices.
 *
 * Primary channel: Azure Web PubSub — /api/negotiate hands back a client
 * WebSocket URL that auto-joins this account's group, and every score
 * submission is broadcast to the group. Fallback: polling /api/games/active
 * (4s when there's no WebSocket, 30s as a safety net when there is).
 */
export function useLiveGame() {
  const [game, setGame] = useState(undefined); // undefined = loading, null = none
  const [connected, setConnected] = useState(false);
  const stateRef = useRef({ closed: false, socket: null, timer: null });

  useEffect(() => {
    const state = stateRef.current;
    state.closed = false;

    async function refresh() {
      try {
        const { game: fresh } = await api.getActiveGame();
        if (!state.closed) setGame(fresh);
      } catch {
        /* transient network error — next poll will retry */
      }
    }

    function schedulePoll(intervalMs) {
      clearInterval(state.timer);
      state.timer = setInterval(refresh, intervalMs);
    }

    async function connect() {
      await refresh();
      let negotiated = { url: null, pollIntervalMs: 4000 };
      try {
        negotiated = await api.negotiate();
      } catch {
        /* fall through to polling */
      }

      if (!negotiated.url || state.closed) {
        schedulePoll(negotiated.pollIntervalMs || 4000);
        return;
      }

      const socket = new WebSocket(negotiated.url);
      state.socket = socket;
      socket.onopen = () => {
        setConnected(true);
        schedulePoll(negotiated.pollIntervalMs || 30000);
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'game-updated') {
            // Only follow the account's current active game on displays.
            setGame((current) => {
              if (message.game.status !== 'active') {
                return current && current.id === message.game.id ? message.game : current;
              }
              return message.game;
            });
          }
        } catch {
          /* ignore non-JSON frames */
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!state.closed) schedulePoll(4000); // degrade to fast polling
      };
    }

    connect();
    return () => {
      state.closed = true;
      clearInterval(state.timer);
      state.socket?.close();
    };
  }, []);

  return { game, connected };
}
