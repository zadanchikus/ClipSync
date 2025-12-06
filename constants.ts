
export const APP_NAME = "ClipSync";
export const VERSION = "2.1.0-stable";
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const SERVER_CODE = `
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 4000 });

console.log("Server running on ws://localhost:4000");

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    // CRITICAL: Convert Buffer to String to prevent [object Blob]
    const msg = data.toString();
    
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
});
`;

export const PROJECT_STRUCTURE_TREE = {
  name: 'clipsync',
  type: 'folder',
  children: [
    { name: 'server.js', type: 'file' },
    { name: 'client.html', type: 'file' },
    { name: 'src', type: 'folder', children: [{ name: 'App.tsx', type: 'file' }] }
  ]
};
