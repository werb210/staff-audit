#!/usr/bin/env node

/**
 * Direct Deployment Script
 * Bypasses build timeouts by running the server directly with tsx
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting direct deployment...');
console.log('Backend will run on port:', process.env.PORT || 5000);

// Change to the correct directory
process.chdir(__dirname);

// Start the server directly with tsx
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || 5000
  }
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  serverProcess.kill('SIGINT');
});