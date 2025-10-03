# Cross-Origin Deployment Configuration

## Overview
This guide covers the configuration needed for deploying the client and server applications on separate domains while maintaining authentication and session functionality.

## Server Configuration (✅ Completed)

### 1. CORS Middleware
Updated `server/index.ts` with production-ready CORS configuration:

```typescript

  origin: process.env.NODE_ENV === 'production' 
    ? [
        /.*\.replit\.app$/,  // Match any .replit.app subdomain
        process.env.CLIENT_URL,
        process.env.PRODUCTION_URL
      ]
    : ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));
```

### 2. Session Cookie Configuration
Updated `server/replitAuth.ts` for cross-origin cookie handling:

```typescript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Required for cross-origin
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Critical for cross-origin
  maxAge: sessionTtl,
}
```

## Environment Variables Required

Set these environment variables for production deployment:

```env
# Client application URL (where your React app is deployed)
CLIENT_URL=https://your-client-app.replit.app

# Additional production URLs if needed
PRODUCTION_URL=https://your-custom-domain.com

# Ensure NODE_ENV is set for production
NODE_ENV=production
```

## Key Configuration Points

### ✅ CORS Origin Matching
- Uses regex pattern `/.*\.replit\.app$/` to match any Replit subdomain
- Includes specific CLIENT_URL for targeted access
- Supports custom domains via PRODUCTION_URL

### ✅ Cookie Settings for Cross-Origin
- `secure: true` - Mandatory for production HTTPS
- `sameSite: 'none'` - Required for cross-origin cookie transmission
- `httpOnly: true` - Security protection against XSS

### ✅ Request Headers
- Includes all necessary headers for API communication
- Supports both JSON and form-based requests
- Compatible with modern browsers and legacy systems

## Testing Cross-Origin Setup

After deployment, verify the configuration works:

1. **Client App Authentication**: Visit your client application URL
2. **API Connectivity**: Check browser network tab for successful OPTIONS requests
3. **Cookie Transmission**: Verify session cookies are sent with requests
4. **Authentication Flow**: Test login/logout functionality

## Deployment Order

1. Deploy server application with updated configuration
2. Deploy client application pointing to server URL
3. Set environment variables on both deployments
4. Test cross-origin authentication flow

## Common Issues and Solutions

**Issue**: "CORS policy" errors in browser console
- **Solution**: Verify CLIENT_URL environment variable matches exactly

**Issue**: Authentication not persisting across requests
- **Solution**: Ensure `credentials: true` in both server CORS and client fetch requests

**Issue**: Cookies not being sent
- **Solution**: Verify `secure: true` and `sameSite: 'none'` in production environment

## Security Considerations

- Only allows specific trusted domains in production
- Uses secure cookie settings to prevent XSS attacks
- Implements proper CORS headers to prevent unauthorized access
- Maintains session security with httpOnly cookies

This configuration ensures secure cross-origin communication while maintaining full authentication functionality.