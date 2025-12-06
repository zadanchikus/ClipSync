import React, { useState } from 'react';
import { ArrowRight, Laptop, RefreshCw, Server, Zap } from 'lucide-react';

interface PairingScreenProps {
  onConnect: (code: string, url: string) => void;
  onDemo: () => void;
  deviceId: string;
  errorMessage?: string;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({ onConnect, onDemo, deviceId, errorMessage }) => {
  const [inputCode, setInputCode] = useState('');
  // Detect if we are on HTTPS, if so, suggest wss://, otherwise ws://
  const defaultUrl = window.location.protocol === 'https:' 
    ? 'wss://your-clipsync-server.com' 
    : 'ws://localhost:8080';
    
  const [serverUrl, setServerUrl] = useState(defaultUrl);
  const [myCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6 space-y-8 animate-in fade-in zoom-in duration-300">
      
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Laptop className="text-emerald-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white">ClipSync Web</h2>
        <p className="text-slate-400 text-sm">Universal clipboard synchronization.</p>
      </div>

      {/* Main Card */}
      <div className="w-full bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-6 shadow-2xl">
        
        {/* Error Display */}
        {errorMessage && (
           <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
             {errorMessage}
           </div>
        )}

        {/* Demo Button */}
        <button 
           onClick={onDemo}
           className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3 rounded-lg flex items-center justify-center space-x-2 font-medium transition-all shadow-lg shadow-emerald-900/20 group"
        >
           <Zap size={16} className="group-hover:text-yellow-300 transition-colors" />
           <span>Start Instant Demo</span>
        </button>
        
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-slate-800 text-slate-500">Advanced Connection</span>
            </div>
        </div>

        {/* Server Config */}
        <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
           <div className="space-y-2">
               <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                 <Server size={10}/> WebSocket Server
               </label>
               <input 
                  type="text" 
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="ws://localhost:8080"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors"
               />
           </div>

            <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Pairing Code</label>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        placeholder="XYZ-123"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-center font-mono text-sm tracking-widest focus:outline-none focus:border-emerald-500 transition-colors"
                        maxLength={10}
                    />
                    <button 
                        onClick={() => onConnect(inputCode, serverUrl)}
                        disabled={inputCode.length < 3 || !serverUrl}
                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 rounded-lg flex items-center justify-center transition-all"
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-600 text-center max-w-xs">
         Note: To use the "Advanced Connection", you must be running the ClipSync Server locally.
      </p>
    </div>
  );
};