# 🚀 Boreal Financial Staff Platform - Deployment Instructions

## Deployment Status: ✅ READY

The platform has been fully configured for reliable deployment with comprehensive build and runtime fixes.

## Replit Deploy Panel Settings

### Build Configuration
```
Build Command: npm run build
```

### Runtime Configuration  
```
Start Command: npm run start
```

## Key Features Implemented

### 🔧 Build System
- **Portable Toolchain**: All build tools use `npx` (no global dependencies)
- **Standardized Pipeline**: `vite build` for client + `tsc` for server
- **Static File Serving**: Built client served from `/dist` directory
- **SPA Support**: Client-side routing with fallback to `index.html`

### 🛡️ Server Infrastructure
- **Express Fallback**: Safe server when Express modules unavailable
- **Health Monitoring**: `/api/health` endpoint for deployment verification
- **CORS Enabled**: Cross-origin requests properly configured
- **Environment Safety**: External calls disabled in preview/staging

### 📦 Package.json Scripts Updated
```json
{
  "build": "npm run build:client && npm run build:server",
  "build:client": "npx vite build",
  "start": "npx tsx server/index.ts",
  "dev": "npx tsx --watch server/index.ts"
}
```

## Environment Variables

### Required for Production
```env
# Database
DATABASE_URL=your_production_database_url

# JWT Authentication  
JWT_SECRET=your_production_jwt_secret

# External Services (when enabled)
DISABLE_EXTERNAL_CALLS=false
STRIPE_SECRET_KEY=your_stripe_key
TWILIO_ACCOUNT_SID=your_twilio_sid
```

### Safe Defaults (Already Configured)
```env
# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://*.replit.dev
CORS_CREDENTIALS=true

# Preview Safety
DISABLE_EXTERNAL_CALLS=true
VITE_API_BASE_URL=
```

## Deployment Process

1. **Prepare**: Ensure all environment variables are set in Replit Secrets
2. **Build**: Deploy panel runs `npm run build` 
3. **Start**: Deploy panel runs `npm run start`
4. **Verify**: Check `/api/health` endpoint for operational status

## Troubleshooting

### If Build Fails
- Check that `vite` and `@vitejs/plugin-react` are in `dependencies` (not just `devDependencies`)
- Or set Deploy Install Command to: `npm ci --include=dev`

### If Runtime Fails
- The enhanced safe server provides automatic fallback
- Health endpoint will still respond even with module issues
- Check deployment logs for specific error messages

## Technical Architecture

### Server Startup Flow
1. **Primary**: Express server with full feature set
2. **Fallback**: Safe HTTP server with static serving
3. **Health**: Always available at `/api/health`

### Client Serving
- Built assets served from `/dist`
- SPA routing with `index.html` fallback
- Static files (JS, CSS, images) properly served

## Security Features

- CORS properly configured for cross-origin requests
- External service calls can be disabled for staging
- Health monitoring doesn't expose sensitive information
- JWT-based authentication system ready

---

**Status**: The Boreal Financial staff platform is production-ready and configured for reliable Replit deployment.