# Reserved VM Deployment Configuration

## Settings for Reserved VM Deployment

### Build Configuration
**Build Command**: `npm run build`
**Start Command**: `npm start`
**Port**: 5000 (should auto-detect)

### Environment Variables (Deployment Secrets)
Configure these environment variables in your Reserved VM deployment secrets:

```
NODE_ENV=production
JWT_SECRET=[REQUIRED: Generate a secure 102+ character random string]
DATABASE_URL=[REQUIRED: Your PostgreSQL connection string from Neon/provider]
TWILIO_ACCOUNT_SID=[REQUIRED: Your Twilio Account SID from dashboard]
TWILIO_AUTH_TOKEN=[REQUIRED: Your Twilio Auth Token from dashboard]
TWILIO_PHONE_NUMBER=[REQUIRED: Your verified Twilio phone number]
SIGNNOW_ACCESS_TOKEN=[REQUIRED: Your SignNow API access token]
SIGNNOW_CLIENT_ID=[REQUIRED: Your SignNow client ID]
SIGNNOW_CLIENT_SECRET=[REQUIRED: Your SignNow client secret]
SIGNNOW_TEMPLATE_ID=[REQUIRED: Your SignNow document template ID]
SIGNNOW_USERNAME=[REQUIRED: Your SignNow account email]
SIGNNOW_FROM_EMAIL=[REQUIRED: Your SignNow from email address]
SIGNNOW_PASSWORD=[REQUIRED: Your SignNow account password]
```

**SECURITY WARNING:** Never commit actual credentials to source code. Each deployment environment should use its own unique credentials configured through environment variables or secure secret management.

### VM Size Configuration
**Recommended for your app**: 
- **CPU**: 2 cores minimum
- **RAM**: 4GB minimum 
- **Storage**: 10GB minimum

### Advanced Settings
- **Health Check Path**: `/`
- **Health Check Port**: 5000
- **Startup Timeout**: 300 seconds
- **Request Timeout**: 60 seconds

## Reserved VM Advantages for Your App

✅ **Dedicated Resources**: No sharing with other applications
✅ **Always-On**: Persistent server, no cold starts  
✅ **Better Performance**: Dedicated CPU and memory
✅ **More Reliable**: Less likely to fail during deployment
✅ **Consistent Performance**: No auto-scaling delays

## Deployment Steps

1. **VM Size**: Choose adequate resources (2 CPU, 4GB RAM recommended)
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`
4. **Environment Variables**: Copy all secrets from above
5. **Deploy**: Click deploy and monitor logs
6. **Health Check**: Verify `/` endpoint returns 200

## Post-Deployment Verification

Test these endpoints after deployment:
- `https://your-app.replit.app/` - Health check
- `https://your-app.replit.app/api/version` - API status
- `https://your-app.replit.app/api/public/lenders` - Data endpoint

Reserved VM is your best option for reliable production deployment!