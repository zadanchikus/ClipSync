import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncMessage } from '../types';

export function useSimpleWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<SyncMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CLOSED');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: any;

    const connect = () => {
      setConnectionStatus('CONNECTING');
      try {
        socket = new WebSocket(url);
      } catch (e) {
        setConnectionStatus('CLOSED');
        return;
      }

      socket.onopen = () => {
        setConnectionStatus('OPEN');
      };

      socket.onclose = () => {
        setConnectionStatus('CLOSED');
        // Auto-reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onmessage = async (event) => {
        try {
          // 1. Normalize binary/blob data to string
          let textData = "";
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          } else {
            textData = String(event.data);
          }

          // 2. Parse JSON safely
          try {
            const parsed = JSON.parse(textData);
            if (parsed && typeof parsed === 'object') {
              setLastMessage(parsed);
            }
          } catch (jsonError) {
            // Not JSON? Ignore or treat as legacy text
            console.warn("Non-JSON message received", textData);
          }
        } catch (e) {
          console.error("Message processing error:", e);
        }
      };

      wsRef.current = socket;
    };

    connect();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimer);
    };
  }, [url]);

  const sendMessage = useCallback((msg: SyncMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { sendMessage, lastMessage, connectionStatus };
}