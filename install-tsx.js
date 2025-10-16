#!/usr/bin/env node

import { execSync } from 'child_process';

try {
  console.log('Installing tsx package...');
  execSync('npm install tsx@4.20.4', { stdio: 'inherit' });
  console.log('tsx package installed successfully');
} catch (error) {
  console.error('Failed to install tsx:', error.message);
  process.exit(1);
}