import React from 'react';
import { Cloud, Box, Lock } from 'lucide-react';

export const DeploymentGuide: React.FC = () => {
  return (
    <div className="space-y-8 p-4 bg-neutral-900 rounded-xl border border-neutral-800 text-neutral-300 font-mono text-sm h-full overflow-y-auto">
      
      <section>
        <h3 className="text-white text-lg font-bold flex items-center gap-2 mb-3">
          <Box className="text-blue-400" /> 1. Package with Electron
        </h3>
        <p className="mb-2 text-neutral-400">Turn this web app into a native desktop app.</p>
        <div className="bg-black/50 p-4 rounded-lg border border-neutral-800">
          <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
{`# 1. Initialize Electron
npm install --save-dev electron

# 2. Create main.js
const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({ width: 800, height: 600 })
  win.loadURL('http://localhost:3000') // Or your built index.html
}

app.whenReady().then(createWindow)`}
          </pre>
        </div>
      </section>

      <section>
        <h3 className="text-white text-lg font-bold flex items-center gap-2 mb-3">
          <Cloud className="text-purple-400" /> 2. Deploy Server (VPS/Railway)
        </h3>
        <p className="mb-2 text-neutral-400">Host the WebSocket server online for true cross-network sync.</p>
        <div className="bg-black/50 p-4 rounded-lg border border-neutral-800">
          <pre className="text-xs text-yellow-400 overflow-x-auto whitespace-pre-wrap">
{`# Dockerfile for Server
FROM node:18-alpine
WORKDIR /app
COPY package.json server.js ./
RUN npm install
CMD ["node", "server.js"]

# Deploy to Fly.io
fly launch

# Deploy to Railway
railway up`}
          </pre>
        </div>
      </section>

      <section>
        <h3 className="text-white text-lg font-bold flex items-center gap-2 mb-3">
          <Lock className="text-emerald-400" /> 3. Secure with TLS (Nginx)
        </h3>
        <p className="mb-2 text-neutral-400">Production WebSockets must use WSS:// (SSL).</p>
        <div className="bg-black/50 p-4 rounded-lg border border-neutral-800">
          <pre className="text-xs text-blue-300 overflow-x-auto whitespace-pre-wrap">
{`server {
  listen 443 ssl;
  server_name socket.myapp.com;

  location / {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
  }
}`}
          </pre>
        </div>
      </section>

    </div>
  );
};
