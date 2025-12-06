
import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncMessage } from '../types';

export function useSimpleWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<SyncMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSED'>('CLOSED');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let socket: WebSocket;

    const connect = () => {
      setConnectionStatus('CONNECTING');
      socket = new WebSocket(url);

      socket.onopen = () => {
        console.log("WS Connected");
        setConnectionStatus('OPEN');
      };

      socket.onclose = () => {
        console.log("WS Closed");
        setConnectionStatus('CLOSED');
        // Simple retry logic
        setTimeout(connect, 3000);
      };

      socket.onmessage = async (event) => {
        try {
          // STEP 1: Normalize Data to String
          let textData = "";
          
          if (event.data instanceof Blob) {
            // If server sends binary (shouldn't happen with new server.js, but good for safety)
            textData = await event.data.text();
          } else {
            textData = String(event.data);
          }

          // STEP 2: Parse JSON
          // The app expects JSON. If it's plain text (like from client.html), we wrap it.
          try {
            const parsed = JSON.parse(textData);
            // Check if it looks like our protocol
            if (parsed.type && parsed.timestamp) {
               setLastMessage(parsed);
            } else {
               // JSON but not our schema? Treat as text payload.
               throw new Error("Unknown JSON schema");
            }
          } catch (jsonError) {
            // It's not JSON, treat it as a raw text message
            setLastMessage({
              type: 'text',
              payload: textData,
              timestamp: Date.now(),
              sender: 'Unknown'
            });
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
    };
  }, [url]);

  const sendMessage = useCallback((msg: SyncMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { sendMessage, lastMessage, connectionStatus };
}
