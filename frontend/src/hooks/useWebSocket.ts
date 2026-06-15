import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { CameraFramePayload } from '../types';

const WS_URL = 'ws://127.0.0.1:8000/api/inspect/ws';

export function useInspectionWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setKpi, setFrame, setSystemState, setPLC, auth } = useAppStore();

  const connect = useCallback(() => {
    if (!auth) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to inspection stream');
      // Keep-alive ping every 25s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ command: 'ping' }));
        } else {
          clearInterval(ping);
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'kpi_update':
            setKpi(msg);
            break;

          case 'camera_frame':
            setFrame(msg as CameraFramePayload);
            if (msg.plc) {
              setPLC({ ...msg.plc, connected: true });
            }
            break;

          case 'state_update':
            setSystemState(msg.state, msg.locked_modules ?? []);
            break;

          case 'plc_update':
            setPLC({ ...msg, connected: true });
            break;

          case 'pong':
            // keep-alive acknowledged
            break;

          default:
            console.debug('[WS] Unknown message type:', msg.type);
        }
      } catch (e) {
        console.warn('[WS] Parse error:', e);
      }
    };

    ws.onerror = (err) => {
      console.warn('[WS] Error:', err);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting in 3s...');
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, [auth, setKpi, setFrame, setSystemState, setPLC]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
