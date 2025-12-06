import React from 'react';
import { SERVER_CODE } from '../constants';
import { Copy, Terminal } from 'lucide-react';

export const ServerCodeViewer: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SERVER_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2 text-slate-300">
          <Terminal size={18} />
          <span className="font-mono text-sm">server/src/index.js</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Copy size={14} />
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300 bg-[#0d1117]">
        <pre>{SERVER_CODE}</pre>
      </div>
    </div>
  );
};