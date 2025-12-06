// server.js — dumb relay WebSocket server

import { WebSocketServer } from 'ws';

const PORT = 4000;

const wss = new WebSocketServer({
  port: PORT,
  host: '0.0.0.0', // for connecting phone by IP-connection
});

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    console.log('WS message:', data.toString());

    // sharing other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`ClipSync WS server running on ws://0.0.0.0:${PORT}`);