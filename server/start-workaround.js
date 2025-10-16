#!/usr/bin/env node

// Boreal Financial Staff Management Platform - Emergency Startup Workaround
// This bypasses TypeScript compilation issues by using dynamic import

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🔧 [EMERGENCY-BOOT] Starting Boreal Financial Staff Management Platform');
console.log(`📋 Environment: NODE_ENV=${process.env.NODE_ENV || 'development'}, HOST=${HOST}, PORT=${PORT}`);

// Dynamic import the tsx binary to run the TypeScript server
import('child_process').then(({ spawn }) => {
  console.log('🚀 [EMERGENCY-BOOT] Launching TypeScript server via tsx...');
  
  const serverProcess = spawn('npx', ['tsx', '--tsconfig=tsconfig.node.json', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: PORT.toString(),
      HOST: HOST
    }
  });

  serverProcess.on('error', (error) => {
    console.error('❌ [EMERGENCY-BOOT] Failed to start server:', error.message);
    
    // Fallback to safe server
    console.log('🔄 [EMERGENCY-BOOT] Falling back to safe server...');
    const safeProcess = spawn('npx', ['tsx', 'server/bootstrap/safe-server.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: PORT.toString(),
        HOST: HOST
      }
    });
    
    safeProcess.on('error', (fallbackError) => {
      console.error('❌ [EMERGENCY-BOOT] Safe server also failed:', fallbackError.message);
      process.exit(1);
    });
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ [EMERGENCY-BOOT] Server exited with code ${code}`);
      process.exit(code);
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📤 [EMERGENCY-BOOT] Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('📤 [EMERGENCY-BOOT] Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });

}).catch((error) => {
  console.error('❌ [EMERGENCY-BOOT] Critical error importing child_process:', error);
  process.exit(1);
});