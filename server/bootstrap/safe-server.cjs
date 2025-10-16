// Safe server for emergency startup - CommonJS
const startedAt = new Date().toISOString();

// Try to require express, fallback to http if not available
let app, server;
try {
  const express = require('express');
  app = express();
  
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'staff-safe', startedAt, now: new Date().toISOString() });
  });
  
  app.get('/', (req, res) => {
    res.type('text/plain').send(`Staff SAFE server
- Health: /api/health
- Started: ${startedAt}
`);
  });
  
  console.log('[SAFE] Using Express server');
} catch (expressError) {
  console.log('[SAFE] Express not available, using HTTP server:', expressError.message);
  
  const http = require('http');
  const url = require('url');
  
  server = http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;
    
    res.setHeader('Content-Type', 'application/json');
    
    if (pathname === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, service: 'staff-safe-http', startedAt, now: new Date().toISOString() }));
    } else if (pathname === '/') {
      res.setHeader('Content-Type', 'text/plain');
      res.writeHead(200);
      res.end(`Staff SAFE server (HTTP fallback)
- Health: /api/health
- Started: ${startedAt}
`);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
}

const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '0.0.0.0';

if (app) {
  app.listen(port, host, () => {
    console.log(`[SAFE] Express listening on http://${host}:${port}`);
  });
} else if (server) {
  server.listen(port, host, () => {
    console.log(`[SAFE] HTTP server listening on http://${host}:${port}`);
  });
}