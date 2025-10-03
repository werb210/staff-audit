#!/bin/bash
# Production Deployment Script

echo "🚀 Starting production deployment..."

# Set production environment
export NODE_ENV=production

# Skip browser downloads to reduce image size by ~1-2GB
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
export PUPPETEER_SKIP_DOWNLOAD=1

# Clean any existing cache first
echo "🧹 Cleaning cache..."
npm cache clean --force
rm -rf node_modules/.cache
rm -rf ~/.npm/_cacache

# Install dependencies (production only, skip scripts to avoid browser downloads)
echo "📦 Installing production dependencies (optimized for size)..."
npm ci --production --ignore-scripts --no-optional

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Import lender products
echo "💼 Importing lender products..."
node scripts/import-lender-products.js

# Run health check
echo "🏥 Running health check..."
curl -f http://localhost:5000/api/health || exit 1

# Start production server
echo "✅ Starting production server..."
npm start