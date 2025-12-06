import { useState, useEffect, useCallback, useRef } from 'react';
import { AppStatus, ClipboardItem, DeviceConfig } from '../types';
import { deriveKey, encryptText, decryptText } from '../utils/crypto';

export function useClipboardSync() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.DISCONNECTED);
  const [config, setConfig] = useState<DeviceConfig>({
    deviceId: typeof window !== 'undefined' && window.crypto ? window.crypto.randomUUID().slice(0, 8) : 'unknown',
    deviceName: 'Web Client',
    pairingCode: '',
    serverUrl: 'ws://localhost:8080',
    sharedSecret: null
  });
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${String(msg)}`, ...prev].slice(0, 50));

  // DEMO MODE LOGIC
  useEffect(() => {
    if (isDemo && status === AppStatus.PAIRED) {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          const fakeMessages = [
            "Link from Mac: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "Meeting ID: 882-123-999",
            "sudo apt-get install clipsync",
            "Design assets for the project are in Dropbox.",
            "Color palette: #10b981, #0f172a, #334155"
          ];
          const randomMsg = fakeMessages[Math.floor(Math.random() * fakeMessages.length)];
          
          const newItem: ClipboardItem = {
            id: window.crypto.randomUUID(),
            content: randomMsg,
            timestamp: Date.now(),
            deviceId: 'demo-mac-01',
            encrypted: true
          };
          setHistory(prev => [newItem, ...prev]);
          addLog('Received sync from Demo Device (macOS).');
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isDemo, status]);

  const startDemo = () => {
    setIsDemo(true);
    setStatus(AppStatus.CONNECTING);
    addLog('Starting Demo Mode...');
    setTimeout(() => {
        setStatus(AppStatus.PAIRED);
        setConfig(prev => ({ ...prev, pairingCode: 'DEMO-123', serverUrl: 'Simulation', sharedSecret: 'demo' }));
        addLog('Connected to Virtual Demo Server.');
        
        // Initial welcome message
        const welcomeItem: ClipboardItem = {
            id: window.crypto.randomUUID(),
            content: "Welcome to ClipSync! This is a demo. Copy text here and see it 'sync'!",
            timestamp: Date.now(),
            deviceId: 'system',
            encrypted: false
        };
        setHistory([welcomeItem]);
    }, 1500);
  };

  const connect = useCallback(async (code: string, url: string) => {
    setIsDemo(false);
    if (!code || !url) return;
    
    // Reset state
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setStatus(AppStatus.CONNECTING);
    addLog(`Deriving keys for code: ${code}...`);

    let key: CryptoKey | null = null;
    try {
      key = await deriveKey(code);
      cryptoKeyRef.current = key;
      addLog('Crypto Key derived successfully.');
    } catch (e) {
      addLog('Error deriving key.');
      setStatus(AppStatus.ERROR);
      return;
    }

    addLog(`Connecting to ${url}...`);
    
    try {
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        addLog('WebSocket Connected.');
        // Send Handshake
        const registerMsg = {
          type: 'REGISTER',
          pairingCode: code,
          id: config.deviceId
        };
        socket.send(JSON.stringify(registerMsg));
        addLog('Sent REGISTER handshake.');
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'REGISTER_ACK') {
            setStatus(AppStatus.PAIRED);
            setConfig(prev => ({ ...prev, pairingCode: code, serverUrl: url, sharedSecret: code }));
            addLog('Device successfully PAIRED with session.');
          } 
          else if (data.type === 'DEVICE_JOINED') {
            addLog(`Device ${data.deviceId} joined the session.`);
          }
          else if (data.type === 'DEVICE_LEFT') {
            addLog(`Device ${data.deviceId} left the session.`);
          }
          else if (data.type === 'CLIPBOARD_UPDATE') {
            addLog('Received encrypted clipboard payload.');
            if (!cryptoKeyRef.current) return;

            try {
              const decrypted = await decryptText(data.payload, data.iv, cryptoKeyRef.current);
              addLog('Decrypted successfully.');
              
              const newItem: ClipboardItem = {
                id: window.crypto.randomUUID(),
                content: decrypted,
                timestamp: data.timestamp || Date.now(),
                deviceId: data.senderId || 'unknown',
                encrypted: true
              };
              setHistory(prev => [newItem, ...prev]);
              
              // Copy to local clipboard if possible (requires focus/permission)
              try {
                  await navigator.clipboard.writeText(decrypted);
                  addLog('Updated system clipboard.');
              } catch (err) {
                  addLog('Note: Could not auto-write to clipboard (browser restriction).');
              }
            } catch (err) {
              addLog('Decryption failed for incoming message.');
              console.error(err);
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      socket.onerror = (e) => {
        addLog('WebSocket Error. Check server URL.');
        // Don't auto-disconnect here to allow retries or manual fix, but show error
        setStatus(AppStatus.ERROR);
      };

      socket.onclose = () => {
        addLog('WebSocket Disconnected.');
        // Only reset if we were previously connected to avoid loops
        setStatus(prev => prev === AppStatus.PAIRED ? AppStatus.DISCONNECTED : prev);
      };

      wsRef.current = socket;
    } catch (e) {
      addLog('Failed to create WebSocket connection.');
      setStatus(AppStatus.ERROR);
    }

  }, [config.deviceId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus(AppStatus.DISCONNECTED);
    setConfig(prev => ({ ...prev, pairingCode: '', sharedSecret: null }));
    setHistory([]);
    cryptoKeyRef.current = null;
    setIsDemo(false);
    addLog('Disconnected manually.');
  }, []);

  const sendClipboardUpdate = async (text: string) => {
    // DEMO HANDLING
    if (isDemo) {
        addLog('Sending demo update...');
        const newItem: ClipboardItem = {
            id: window.crypto.randomUUID(),
            content: text,
            timestamp: Date.now(),
            deviceId: config.deviceId,
            encrypted: false
        };
        setHistory(prev => [newItem, ...prev]);
        setTimeout(() => {
             addLog('Virtual Mac received your clipboard.');
        }, 500);
        return;
    }

    if (status !== AppStatus.PAIRED || !cryptoKeyRef.current || !wsRef.current) {
        addLog('Cannot send: Not connected.');
        return;
    }

    try {
      addLog('Encrypting payload...');
      const { payload, iv } = await encryptText(text, cryptoKeyRef.current);
      
      const msg = {
        type: 'CLIPBOARD_UPDATE',
        payload,
        iv
      };
      
      wsRef.current.send(JSON.stringify(msg));
      addLog('Sent Encrypted Update.');

      // Add to local history
      const newItem: ClipboardItem = {
        id: window.crypto.randomUUID(),
        content: text,
        timestamp: Date.now(),
        deviceId: config.deviceId,
        encrypted: false
      };
      setHistory(prev => [newItem, ...prev]);
    } catch (e) {
      addLog('Error sending update.');
      console.error(e);
    }
  };

  return {
    status,
    config,
    history,
    logs,
    connect,
    startDemo,
    disconnect,
    sendClipboardUpdate
  };
}