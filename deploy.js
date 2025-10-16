#!/usr/bin/env node
/**
 * Production deployment script that bypasses build timeouts
 * Runs the TypeScript server directly using tsx
 */

const { spawn } = require('child_process');

const port = process.env.PORT || 5000;
console.log(`Starting production server on port ${port}`);

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port
  }
});

server.on('error', (error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down');
  server.kill('SIGINT');
});