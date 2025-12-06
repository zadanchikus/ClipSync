import React from 'react';
import { DollarSign, Box, Wifi } from 'lucide-react';

export const DeploymentGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-neutral-300 font-mono text-sm">
      <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-lg">
        <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-2"><DollarSign size={16} /> Monetization</h3>
        <p>This "Local Network" architecture is popular for privacy-focused tools. You can package this and sell it on Gumroad for $2.99-9.99.</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-white font-bold flex items-center gap-2"><Box size={16} /> Packaging (Electron)</h3>
        <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-800">
          <code className="text-xs text-green-400 block mb-2">npm install electron --save-dev</code>
          <p className="text-xs text-neutral-500">Create a main.js file that loads http://localhost:5173 (dev) or the build index.html (prod).</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-white font-bold flex items-center gap-2"><Wifi size={16} /> Usage Instructions</h3>
        <ul className="list-disc pl-5 text-xs text-neutral-400 space-y-1">
          <li>User runs <code>node server.js</code> on their main PC.</li>
          <li>User finds their IP (displayed in terminal).</li>
          <li>User enters that IP into the Settings tab on their phone/laptop.</li>
        </ul>
      </div>
    </div>
  );
};