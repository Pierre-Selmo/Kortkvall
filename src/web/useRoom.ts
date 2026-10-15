import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOSE_DENIED, CLOSE_GONE, type ClientMsg, type RoomSnapshot, type ServerMsg } from '../shared/protocol';
import { load, store, tokenKey } from './api';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'gone' | 'denied';

const DELAYS = [1000, 2000, 4000, 8000];
const ERROR_MS = 4000;

export function useRoom(code: string, name: string | null) {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deniedReason, setDeniedReason] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showError = useCallback((message: string) => {
    setError(message);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
  }, []);

  useEffect(() => {
    if (name === null) return;
    let stopped = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${location.host}/api/rooms/${code}/ws`);
      wsRef.current = ws;
      let gone = false;

      ws.onopen = () => {
        attempt = 0;
        setStatus('open');
        const token = load(tokenKey(code)) ?? undefined;
        ws.send(JSON.stringify({ type: 'join', name: name ?? '', token } satisfies ClientMsg));
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as ServerMsg;
        switch (msg.type) {
          case 'welcome': store(tokenKey(code), msg.token); break;
          case 'room': setRoom(msg.room); break;
          case 'error': showError(msg.message); break;
          case 'gone': gone = true; setStatus('gone'); break;
        }
      };
      ws.onclose = (e) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stopped) return;
        if (gone || e.code === CLOSE_GONE) return setStatus('gone');
        if (e.code === CLOSE_DENIED) {
          setDeniedReason(e.reason || null);
          return setStatus('denied');
        }
        if (e.code === 1000 && e.reason === 'Lämnade') return;
        setStatus('reconnecting');
        retry = setTimeout(connect, DELAYS[attempt] ?? 10_000);
        attempt++;
      };
    }

    setStatus('connecting');
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      wsRef.current?.close(1000);
      wsRef.current = null;
    };
  }, [code, name, showError]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    else showError('Ingen anslutning just nu');
  }, [showError]);

  const clearError = useCallback(() => setError(null), []);

  return { status, room, error, deniedReason, send, clearError, showError };
}
