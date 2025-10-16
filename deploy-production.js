/**
 * Production Deployment Script
 * Fixes deployment issues by running the server directly with tsx
 * Bypasses build timeouts and module resolution issues
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting production deployment...');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

// Ensure we bind to 0.0.0.0 for deployment compatibility
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '5000'
  },
  cwd: process.cwd()
});

serverProcess.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`📝 Server process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

console.log('✅ Production server starting on port', process.env.PORT || '5000');