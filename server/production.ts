// Production Server Entry Point

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the main server
import('./index.ts').then(({ app, PORT }) => {
  console.log('🚀 Production server starting...');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Production mode: ${process.env.NODE_ENV}`);
}).catch(error => {
  console.error('❌ Failed to start production server:', error);
  process.exit(1);
});
