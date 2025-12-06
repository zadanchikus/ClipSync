
import React, { useState, useEffect, useRef } from 'react';
import { useSimpleWebSocket } from './hooks/useSimpleWebSocket';
import { Trash2, Copy, Send, Check, Settings, History, CloudLightning, Lock, File as FileIcon, Download, X, Bell, Volume2 } from 'lucide-react';
import { AppSettings, HistoryItem, SyncMessage } from './types';
import { encryptData, decryptData } from './utils/crypto';
import { MAX_FILE_SIZE } from './constants';
import { DeploymentGuide } from './components/DeploymentGuide';

// Simple beep sound
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // High pitch
  oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1);
};

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'sync' | 'history' | 'settings' | 'deploy'>('sync');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('clipsync_settings');
    const defaults = {
      serverUrl: 'ws://localhost:4000',
      deviceName: 'Web-Client-' + Math.floor(Math.random() * 1000),
      secretKey: '',
      enableNotifications: true,
      enableSound: true
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  
  const [text, setText] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('clipsync_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState('DISCONNECTED');
  const [copied, setCopied] = useState(false);
  const isRemoteUpdate = useRef(false);

  const { sendMessage, lastMessage, connectionStatus } = useSimpleWebSocket(settings.serverUrl);

  // --- EFFECTS ---

  // Save persistence
  useEffect(() => {
    localStorage.setItem('clipsync_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('clipsync_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    setStatus(connectionStatus);
  }, [connectionStatus]);

  // Request Notification Permission
  useEffect(() => {
    if (settings.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.enableNotifications]);

  // Handle Incoming
  useEffect(() => {
    if (!lastMessage) return;

    const processMessage = async () => {
      // Don't process our own echo messages
      if (lastMessage.sender === settings.deviceName) return;

      let content = lastMessage.payload;
      let isEncrypted = !!lastMessage.iv;

      // Decrypt if needed
      if (isEncrypted) {
        if (!settings.secretKey) {
          content = "🔒 Encrypted Content (Set Secret Key in Settings)";
        } else {
          try {
            content = await decryptData(lastMessage.payload, lastMessage.iv!, settings.secretKey);
          } catch (e) {
            content = "❌ Decryption Failed (Wrong Key)";
          }
        }
      }

      // Add to History
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        content,
        type: lastMessage.type === 'file' ? 'file' : 'text',
        sender: lastMessage.sender || 'Unknown',
        timestamp: lastMessage.timestamp,
        fileName: lastMessage.fileName,
        isSelf: false
      };

      setHistory(prev => [newItem, ...prev].slice(0, 50));

      // Update Text Box if it's text
      if (lastMessage.type === 'text') {
        isRemoteUpdate.current = true;
        setText(content);
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      }

      // --- NOTIFICATIONS & SOUND ---
      if (settings.enableSound) {
        playNotificationSound();
      }

      if (settings.enableNotifications && document.hidden) {
        if (Notification.permission === 'granted') {
          new Notification(`ClipSync: ${lastMessage.sender || 'Unknown'}`, {
            body: lastMessage.type === 'file' ? `Sent file: ${lastMessage.fileName}` : content.substring(0, 50) + '...',
            icon: '/vite.svg' // Fallback icon
          });
        }
      }
    };

    processMessage();
  }, [lastMessage]);

  // --- ACTIONS ---

  const handleSend = async (content: string, type: 'text' | 'file', fileName?: string) => {
    if (!content && type === 'text') return;

    let payload = content;
    let iv: string | undefined = undefined;

    // Encrypt if key is set
    if (settings.secretKey) {
      try {
        const encrypted = await encryptData(content, settings.secretKey);
        payload = encrypted.payload;
        iv = encrypted.iv;
      } catch (e) {
        alert("Encryption failed");
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

    // Add to own history
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
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (!isRemoteUpdate.current) {
      handleSend(newText, 'text');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleSend(result, 'file', file.name);
    };
    reader.readAsDataURL(file);
  };

  const restoreHistory = (item: HistoryItem) => {
    if (item.type === 'text') {
      setText(item.content);
      handleSend(item.content, 'text'); // Resend to sync
      setActiveTab('sync');
    }
  };

  const clearHistory = () => {
    if(confirm('Clear local history?')) setHistory([]);
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
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col items-center">
      
      {/* Navbar */}
      <div className="w-full bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-10 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CloudLightning className="text-emerald-500" />
          ClipSync <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">PRO</span>
        </h1>
        
        <div className="flex gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {[
            { id: 'sync', icon: CloudLightning, label: 'Sync' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'settings', icon: Settings, label: 'Settings' },
            { id: 'deploy', icon: Download, label: 'Deploy' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-neutral-800 text-white shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl w-full p-4 md:p-6 flex-1 flex flex-col">
        
        {/* Status Bar */}
        <div className={`mb-6 flex justify-between items-center px-4 py-2 rounded-lg border ${status === 'OPEN' ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-red-900/10 border-red-900/30'}`}>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
             <span className={`text-xs font-mono font-bold ${status === 'OPEN' ? 'text-emerald-400' : 'text-red-400'}`}>
               {status === 'OPEN' ? 'CONNECTED' : 'DISCONNECTED'}
             </span>
          </div>
          <div className="text-xs text-neutral-500 font-mono hidden sm:block">
            {settings.secretKey ? '🔒 End-to-End Encrypted' : '⚠️ Unencrypted'}
          </div>
        </div>

        {/* --- VIEW: SYNC --- */}
        {activeTab === 'sync' && (
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
            <div 
              className={`relative flex-1 bg-neutral-900 border-2 rounded-2xl transition-all overflow-hidden shadow-2xl ${isDragOver ? 'border-emerald-500 bg-emerald-900/10' : 'border-neutral-800'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
            >
              <textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Type text or drag & drop files here..."
                className="w-full h-full bg-transparent p-6 text-lg text-white resize-none focus:outline-none font-mono leading-relaxed z-10 relative"
                spellCheck={false}
              />
              
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
                  <div className="text-emerald-400 font-bold text-xl flex flex-col items-center gap-2 animate-bounce">
                    <FileIcon size={48} />
                    Drop to Send File
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                <button 
                  onClick={() => setText('')}
                  className="bg-neutral-800 hover:bg-red-900/30 text-neutral-400 hover:text-red-400 p-3 rounded-xl border border-neutral-700 transition-all"
                  title="Clear"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => {
                     navigator.clipboard.writeText(text);
                     setCopied(true);
                     setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${copied ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'}`}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
                <button 
                  onClick={() => handleSend(text, 'text')}
                  className="bg-white text-black p-3 rounded-xl border border-white hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
                  title="Force Send"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-neutral-600">Drag and drop files up to 5MB</p>
          </div>
        )}

        {/* --- VIEW: HISTORY --- */}
        {activeTab === 'history' && (
          <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
             <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
               <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Clipboard History</h2>
               <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
               {history.length === 0 && (
                 <div className="text-center py-20 text-neutral-600">No history yet. Start syncing!</div>
               )}
               {history.map((item) => (
                 <div key={item.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 hover:border-neutral-700 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.isSelf ? 'bg-neutral-800 text-neutral-400' : 'bg-indigo-900/30 text-indigo-400'}`}>
                           {item.sender}
                         </span>
                         <span className="text-xs text-neutral-600">
                           {new Date(item.timestamp).toLocaleTimeString()}
                         </span>
                       </div>
                       {item.type === 'text' && (
                          <button onClick={() => restoreHistory(item)} className="text-xs text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            Restore
                          </button>
                       )}
                    </div>
                    
                    {item.type === 'file' ? (
                       <div className="flex items-center gap-3 bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                          <FileIcon className="text-blue-400" size={24} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.fileName}</p>
                            <p className="text-xs text-neutral-500">File Attachment</p>
                          </div>
                          <button 
                            onClick={() => downloadFile(item.content, item.fileName || 'download')}
                            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                          >
                             <Download size={18} />
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

        {/* --- VIEW: SETTINGS --- */}
        {activeTab === 'settings' && (
           <div className="max-w-xl mx-auto w-full space-y-6 animate-in zoom-in-95 duration-300">
             <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
                <h2 className="text-lg font-bold text-white mb-4">Configuration</h2>
                
                <div className="space-y-2">
                   <label className="text-xs font-bold text-neutral-500 uppercase">Device Name</label>
                   <input 
                     type="text" 
                     value={settings.deviceName}
                     onChange={(e) => setSettings({...settings, deviceName: e.target.value})}
                     className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-neutral-500 uppercase">Server URL</label>
                   <input 
                     type="text" 
                     value={settings.serverUrl}
                     onChange={(e) => setSettings({...settings, serverUrl: e.target.value})}
                     className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors"
                   />
                </div>

                <div className="space-y-4 pt-4 border-t border-neutral-800">
                   <div className="flex items-center justify-between">
                     <label className="text-sm font-medium text-white flex items-center gap-2">
                       <Bell size={16} className="text-neutral-400" /> Notifications
                     </label>
                     <button 
                       onClick={() => setSettings(s => ({...s, enableNotifications: !s.enableNotifications}))}
                       className={`w-10 h-6 rounded-full transition-colors relative ${settings.enableNotifications ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                     >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableNotifications ? 'left-5' : 'left-1'}`} />
                     </button>
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <label className="text-sm font-medium text-white flex items-center gap-2">
                       <Volume2 size={16} className="text-neutral-400" /> Sound Effects
                     </label>
                     <button 
                       onClick={() => setSettings(s => ({...s, enableSound: !s.enableSound}))}
                       className={`w-10 h-6 rounded-full transition-colors relative ${settings.enableSound ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                     >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableSound ? 'left-5' : 'left-1'}`} />
                     </button>
                   </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-neutral-800">
                   <label className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                     <Lock size={12} /> Encryption Secret
                   </label>
                   <input 
                     type="password" 
                     value={settings.secretKey}
                     onChange={(e) => setSettings({...settings, secretKey: e.target.value})}
                     placeholder="Enter a shared password..."
                     className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                   />
                   <p className="text-[10px] text-neutral-500">
                     If set, all content is encrypted using AES-GCM before leaving this device.
                     The server cannot read it.
                   </p>
                </div>
             </div>
           </div>
        )}

        {/* --- VIEW: DEPLOY --- */}
        {activeTab === 'deploy' && <DeploymentGuide />}

      </div>
    </div>
  );
}
