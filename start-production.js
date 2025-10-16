#!/usr/bin/env node

/**
 * Production Start Script
 * This script ensures the server runs in production mode with proper configuration
 */

// Set production environment
process.env.NODE_ENV = 'production';

// Import tsx dynamically and start the server
import('tsx').then(tsx => {
  // Use tsx to run the TypeScript server in production mode
  tsx.run(['server/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
}).catch(error => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});