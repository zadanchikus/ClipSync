import React, { useState } from 'react';
import { Clipboard, Send, Monitor, ShieldCheck, Download } from 'lucide-react';
import { ClipboardItem, DeviceConfig } from '../types';
import { cn } from '../utils/cn';

interface SyncDashboardProps {
  config: DeviceConfig;
  history: ClipboardItem[];
  logs: string[];
  onSend: (text: string) => void;
}

export const SyncDashboard: React.FC<SyncDashboardProps> = ({ config, history, logs, onSend }) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      
      {/* Top Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex flex-col">
             <span className="text-sm font-medium text-slate-200">Connected to Session</span>
             <span className="text-xs text-emerald-400 font-mono">{config.pairingCode} @ {config.serverUrl}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-500">
          <div className="flex items-center space-x-1">
             <ShieldCheck size={14} className="text-emerald-600" />
             <span className="hidden sm:inline">E2E Encrypted (AES-256-GCM)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Input & History */}
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
          
          {/* Active Input */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sync New Text</label>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or paste text here to sync..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors h-32 resize-none font-mono text-sm"
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="absolute bottom-4 right-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2 rounded-md transition-all shadow-lg shadow-emerald-900/20"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* History */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Syncs</label>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                {history.length === 0 && (
                  <div className="text-center py-10 text-slate-600 italic">
                    No clipboard history yet.<br/>
                    <span className="text-xs">Connect another device to start syncing.</span>
                  </div>
                )}
                {history.map((item) => (
                  <div key={item.id} className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        {item.deviceId === config.deviceId ? 
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">YOU</span> :
                          <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Monitor size={10} /> REMOTE
                          </span>
                        }
                        <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(item.content)}
                        className="text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy to local clipboard"
                      >
                        <Clipboard size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 font-mono break-all line-clamp-3">{item.content}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right: Logs (Desktop Style Sidebar) */}
        <div className="w-80 border-l border-slate-800 bg-slate-950 p-4 flex flex-col hidden lg:flex">
          <div className="mb-4">
             <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Logs</h3>
             <div className="bg-slate-900 rounded-lg p-3 h-[400px] overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1 border border-slate-800 scrollbar-thin">
                {logs.map((log, i) => (
                  <div key={i} className="border-l-2 border-slate-700 pl-2 py-0.5 break-words">
                    {log}
                  </div>
                ))}
             </div>
          </div>
          
          <div className="mt-auto bg-slate-900 rounded-lg p-4 border border-slate-800">
             <div className="flex items-center space-x-3 mb-2">
               <div className="p-2 bg-blue-500/10 rounded-lg">
                 <Download className="text-blue-400" size={20} />
               </div>
               <div>
                 <h4 className="text-sm font-medium text-slate-200">Download Client</h4>
                 <p className="text-xs text-slate-500">For macOS & Windows</p>
               </div>
             </div>
             <button className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-xs text-white py-2 rounded transition-colors border border-slate-700">
               Get .dmg / .msi
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};