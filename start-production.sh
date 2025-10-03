#!/bin/bash
# Optimized production start script for deployment

# Skip browser downloads to save space
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
export PUPPETEER_SKIP_DOWNLOAD=1
export NODE_ENV=production

# Start the application
echo "🚀 Starting optimized production server..."
npm run start