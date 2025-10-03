# Production Deployment Steps for Replit

## Step 1: Configure Environment Variables

1. **Go to Replit Secrets**
   - Click on "Tools" in the left sidebar
   - Select "Secrets" from the dropdown
   - Add these environment variables:

```
NODE_ENV=production
JWT_SECRET=your-existing-jwt-secret-102-characters
DATABASE_URL=your-existing-database-url
SIGNNOW_TEMPLATE_ID=e7ba8b894c644999a7b38037ea66f4cc9cc524f5
CLIENT_APP_SHARED_TOKEN=your-existing-token
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
```

## Step 2: Update Deploy Configuration

1. **Click the "Deploy" button** in the top right corner
2. **In the Deploy settings:**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: 5000

## Step 3: Deploy

1. **Click "Deploy"** button
2. Wait for deployment to complete
3. Your app will be available at: `https://your-repl-name.your-username.repl.co`

## Step 4: Verify Deployment

Visit these URLs to confirm everything is working:
- `/` - Should load the application
- `/api/health` - Should return health status
- `/api/version` - Should return version info
- `/api/public/lenders` - Should return lender data

## Troubleshooting

If deployment fails:
1. Check the deployment logs in Replit
2. Verify all secrets are properly set
3. Ensure NODE_ENV is set to "production"
4. Check that the start command is "npm start"

## Post-Deployment

Once deployed, your production URL will be available for client integration with full CORS support.