import React, { useState, useEffect, useRef } from 'react';
import { useSimpleWebSocket } from './hooks/useSimpleWebSocket';
import { Trash2, Copy, Send, Check, Settings, History, CloudLightning, Lock, File as FileIcon, Download, Wifi, Bell, Volume2, Crown } from 'lucide-react';
import { AppSettings, HistoryItem, SyncMessage } from './types';
import { encryptData, decryptData } from './utils/crypto';
import { MAX_FILE_SIZE } from './constants';
import { DeploymentGuide } from './components/DeploymentGuide';

// --- UTILS ---
const playSound = (type: 'ping' | 'success') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'ping') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } else {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(550, ctx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn("Audio play failed", e);
  }
};

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'sync' | 'history' | 'settings' | 'deploy'>('sync');
  
  // Settings Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('clipsync_settings');
      const defaults: AppSettings = {
        serverUrl: 'ws://localhost:4000',
        deviceName: 'Device-' + Math.floor(Math.random() * 1000),
        secretKey: '',
        enableNotifications: true,
        enableSound: true
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { 
      return { serverUrl: 'ws://localhost:4000', deviceName: 'Device', secretKey: '', enableNotifications: true, enableSound: true };
    }
  });

  // History Persistence
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('clipsync_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Networking
  const { sendMessage, lastMessage, connectionStatus } = useSimpleWebSocket(settings.serverUrl);
  const isRemoteUpdate = useRef(false);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('clipsync_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('clipsync_history', JSON.stringify(history));
  }, [history]);

  // --- INCOMING MESSAGES ---
  useEffect(() => {
    if (!lastMessage) return;

    const processMessage = async () => {
      // Ignore own messages
      if (lastMessage.sender === settings.deviceName) return;

      let content = lastMessage.payload;
      let isEncrypted = !!lastMessage.iv;

      // Decryption
      if (isEncrypted) {
        if (!settings.secretKey) {
          content = "🔒 Encrypted Content (Requires Password)";
        } else {
          try {
            content = await decryptData(lastMessage.payload, lastMessage.iv!, settings.secretKey);
          } catch (e) {
            content = "❌ Decryption Failed";
          }
        }
      }

      // Add to History
      const newItem: HistoryItem = {
        id: Date.now().toString() + Math.random(),
        content,
        type: lastMessage.type === 'file' ? 'file' : 'text',
        sender: lastMessage.sender || 'Unknown',
        timestamp: lastMessage.timestamp,
        fileName: lastMessage.fileName,
        isSelf: false
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50));

      // Update Text Area
      if (lastMessage.type === 'text') {
        isRemoteUpdate.current = true;
        setText(content);
        // Reset remote flag after a short delay
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      }

      // Notifications
      if (settings.enableSound) playSound('ping');
      
      if (settings.enableNotifications && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`ClipSync: ${lastMessage.sender}`, {
          body: lastMessage.type === 'file' ? 'Sent a file' : content.substring(0, 50),
          icon: '/vite.svg'
        });
      }
    };

    processMessage();
  }, [lastMessage]);

  // Request Notification Permission
  useEffect(() => {
    if (settings.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.enableNotifications]);

  // --- ACTIONS ---
  const handleSend = async (content: string, type: 'text' | 'file', fileName?: string) => {
    if (!content && type === 'text') return;

    let payload = content;
    let iv: string | undefined = undefined;

    if (settings.secretKey) {
      try {
        const encrypted = await encryptData(content, settings.secretKey);
        payload = encrypted.payload;
        iv = encrypted.iv;
      } catch (e) {
        alert("Encryption failed. Check console.");
        return;
      }
    }

    const msg: SyncMessage = {
      type,
      payload,
      iv,
      sender: settings.deviceName,
      timestamp: Date.now(),
      fileName
    };

    sendMessage(msg);

    // Optimistic Update
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      content,
      type,
      sender: settings.deviceName,
      timestamp: Date.now(),
      fileName,
      isSelf: true
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50));
    if (settings.enableSound) playSound('success');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Max 5MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleSend(result, 'file', file.name);
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* HEADER */}
      <header className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              <Crown className="text-amber-500" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">ClipSync</h1>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Premium</span>
            </div>
          </div>

          <nav className="flex gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {[
              { id: 'sync', icon: CloudLightning, label: 'Sync' },
              { id: 'history', icon: History, label: 'History' },
              { id: 'settings', icon: Settings, label: 'Config' },
              { id: 'deploy', icon: Download, label: 'Deploy' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col">
        
        {/* CONNECTION BAR */}
        <div className={`mb-6 flex flex-col sm:flex-row justify-between items-center p-3 rounded-xl border backdrop-blur-sm transition-all ${connectionStatus === 'OPEN' ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]' : 'bg-red-500/5 border-red-900/30'}`}>
          <div className="flex items-center gap-3">
             <div className="relative flex items-center justify-center w-3 h-3">
               <div className={`absolute w-full h-full rounded-full ${connectionStatus === 'OPEN' ? 'bg-amber-400 animate-ping opacity-75' : 'bg-red-500'}`} />
               <div className={`relative w-2 h-2 rounded-full ${connectionStatus === 'OPEN' ? 'bg-amber-500' : 'bg-red-500'}`} />
             </div>
             <span className={`text-xs font-mono font-bold tracking-wider ${connectionStatus === 'OPEN' ? 'text-amber-500' : 'text-red-500'}`}>
               {connectionStatus === 'OPEN' ? 'CONNECTED TO NETWORK' : 'DISCONNECTED'}
             </span>
          </div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
             {settings.secretKey && (
               <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/30">
                 <Lock size={10} /> ENCRYPTED
               </div>
             )}
             <div className="text-[10px] text-neutral-500 font-mono truncate max-w-[200px]">
               {settings.serverUrl}
             </div>
          </div>
        </div>

        {/* --- SYNC TAB --- */}
        {activeTab === 'sync' && (
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
            <div 
              className={`relative flex-1 bg-[#0f0f0f] border-2 rounded-2xl transition-all overflow-hidden group ${isDragOver ? 'border-amber-500 bg-amber-900/10' : 'border-neutral-800 hover:border-neutral-700'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
            >
              <textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Type here to sync..."
                className="w-full h-full bg-transparent p-6 text-lg text-neutral-200 resize-none focus:outline-none font-mono leading-relaxed z-10 relative"
                spellCheck={false}
              />
              
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm border-2 border-amber-500 rounded-2xl m-4 border-dashed animate-pulse">
                  <div className="text-amber-400 font-bold text-xl flex flex-col items-center gap-2">
                    <FileIcon size={48} />
                    Drop File to Send
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                 <button onClick={() => setText('')} className="bg-neutral-900/80 hover:bg-red-900/20 text-neutral-400 hover:text-red-400 p-3 rounded-xl border border-neutral-800 transition-colors backdrop-blur">
                   <Trash2 size={18} />
                 </button>
                 <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`p-3 rounded-xl border transition-all flex items-center gap-2 backdrop-blur ${copied ? 'bg-amber-900/30 border-amber-800 text-amber-400' : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-800'}`}>
                   {copied ? <Check size={18} /> : <Copy size={18} />}
                 </button>
                 <button onClick={() => handleSend(text, 'text')} className="bg-amber-500 hover:bg-amber-400 text-black font-bold p-3 rounded-xl shadow-[0_0_15px_-3px_rgba(245,158,11,0.5)] transition-all active:scale-95">
                   <Send size={18} />
                 </button>
              </div>
            </div>
            <div className="text-center text-xs text-neutral-600 font-mono">
              Supports Text & Files (Max 5MB)
            </div>
          </div>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
          <div className="flex-1 bg-[#0f0f0f] border border-neutral-800 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
               <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Local History</h2>
               <button onClick={() => { if(confirm('Clear history?')) setHistory([]); }} className="text-xs text-red-400 hover:underline">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {history.length === 0 && <div className="text-center py-10 text-neutral-600 text-sm">No items yet.</div>}
               {history.map(item => (
                 <div key={item.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 hover:border-amber-900/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${item.isSelf ? 'bg-neutral-800 text-neutral-400' : 'bg-amber-900/20 text-amber-500'}`}>
                           {item.sender}
                         </span>
                         <span className="text-[10px] text-neutral-600 font-mono">
                           {new Date(item.timestamp).toLocaleTimeString()}
                         </span>
                       </div>
                       {item.type === 'text' && (
                         <button onClick={() => { setText(item.content); setActiveTab('sync'); }} className="text-[10px] text-amber-500 hover:underline">Restore</button>
                       )}
                    </div>
                    {item.type === 'file' ? (
                       <div className="flex items-center gap-3 bg-black/40 p-2 rounded border border-neutral-800">
                          <FileIcon className="text-blue-400" size={20} />
                          <div className="flex-1 min-w-0">
                             <p className="text-sm text-neutral-200 truncate">{item.fileName}</p>
                             <p className="text-[10px] text-neutral-500">File</p>
                          </div>
                          <button onClick={() => downloadFile(item.content, item.fileName || 'file')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
                             <Download size={16} />
                          </button>
                       </div>
                    ) : (
                       <p className="text-sm text-neutral-300 font-mono break-all line-clamp-3">{item.content}</p>
                    )}
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto w-full animate-in zoom-in-95 duration-300">
            <div className="bg-[#0f0f0f] border border-neutral-800 rounded-2xl p-6 space-y-6">
               <h2 className="text-lg font-bold text-white mb-6">Configuration</h2>
               
               <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Device Name</label>
                  <input type="text" value={settings.deviceName} onChange={e => setSettings({...settings, deviceName: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors" />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Server Address</label>
                  <div className="relative">
                    <input type="text" value={settings.serverUrl} onChange={e => setSettings({...settings, serverUrl: e.target.value})} className="w-full bg-black border border-neutral-800 rounded-lg p-3 pr-10 text-amber-500 font-mono text-sm focus:border-amber-500 outline-none transition-colors" />
                    <Wifi className="absolute right-3 top-3 text-neutral-600" size={16} />
                  </div>
                  <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-400 mt-2">
                    Run <code>node server.js</code> on your host PC to see the Local IP address (e.g., <code>ws://192.168.1.5:4000</code>).
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 py-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg">
                    <span className="text-sm font-medium text-neutral-300 flex items-center gap-2"><Bell size={16}/> Notify</span>
                    <button onClick={() => setSettings(s => ({...s, enableNotifications: !s.enableNotifications}))} className={`w-10 h-6 rounded-full relative transition-colors ${settings.enableNotifications ? 'bg-amber-600' : 'bg-neutral-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableNotifications ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg">
                    <span className="text-sm font-medium text-neutral-300 flex items-center gap-2"><Volume2 size={16}/> Sound</span>
                    <button onClick={() => setSettings(s => ({...s, enableSound: !s.enableSound}))} className={`w-10 h-6 rounded-full relative transition-colors ${settings.enableSound ? 'bg-amber-600' : 'bg-neutral-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableSound ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
               </div>

               <div className="space-y-2 pt-4 border-t border-neutral-800">
                  <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2"><Lock size={12}/> Encryption Secret</label>
                  <input type="password" value={settings.secretKey} onChange={e => setSettings({...settings, secretKey: e.target.value})} placeholder="Shared Password..." className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors" />
               </div>
            </div>
          </div>
        )}

        {/* --- DEPLOY TAB --- */}
        {activeTab === 'deploy' && <DeploymentGuide />}

      </main>
    </div>
  );
}