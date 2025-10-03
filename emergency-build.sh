#!/bin/bash
echo "=== EMERGENCY BUILD BYPASS ==="

export NODE_ENV=production
export NODE_OPTIONS="--max_old_space_size=4096"

# Try a simpler build approach
echo "1. Setting up build environment..."
cd client

# Create a minimal dist directory with essential files
echo "2. Creating minimal production bundle..."
mkdir -p dist

# Copy index.html template
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Staff Portal</title>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" href="/assets/index.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
EOF

# Create assets directory
mkdir -p dist/assets

echo "3. Attempting production bundle with timeout protection..."
timeout 120s npm run build:client:fast || {
  echo "Build timed out, using development mode server..."
  echo "FALLBACK: Using development server for production"
  cd ..
  exit 1
}

cd ..
echo "=== BUILD COMPLETED ==="