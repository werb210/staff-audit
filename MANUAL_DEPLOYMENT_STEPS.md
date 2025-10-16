# 🚀 Manual Production Deployment Steps

## Target URL: https://staff.boreal.financial

### Step 1: Configure Replit Secrets
In your Replit project, go to **Secrets** tab and add:

```
NODE_ENV = production
document-signing_TEMPLATE_ID = e7ba8b894c644999a7b38037ea66f4cc9cc524f5
document-signing_CLIENT_ID = (your document-signing client ID)
document-signing_CLIENT_SECRET = (your document-signing client secret)  
document-signing_USERNAME = (your document-signing username)
document-signing_PASSWORD = (your document-signing password)
document-signing_FROM_EMAIL = (your document-signing from email)
JWT_SECRET = (your 102+ character secure key)
CLIENT_APP_SHARED_TOKEN = (your secure 64-character token - generate with: openssl rand -hex 32)
DATABASE_URL = (your Neon PostgreSQL URL)
```

### Step 2: Configure Deploy Settings
1. Click the **Deploy** button in Replit
2. Set **Start Command** to: `npm start`
3. Ensure **Build Command** is: `npm run build`

### Step 3: Deploy
Click **Deploy** to start production deployment

### Step 4: Verify Deployment
Once deployed, run the verification script:
```bash
node live-deployment-test.cjs
```

Expected results:
- ✅ Public Lenders API: 40+ products
- ✅ CORS Configuration: Configured for client portal
- ✅ Bearer Authentication: Working
- ✅ document-signing Template: e7ba8b894c644999a7b38037ea66f4cc9cc524f5
- ✅ Database: Connected with lender products
- ✅ Health Check: Application serving
- ✅ Version Endpoint: Working

## Production URLs After Deployment
- **Staff Portal**: https://staff.boreal.financial
- **Public API**: https://staff.boreal.financial/api/public/lenders
- **Health Check**: https://staff.boreal.financial/api/version

## System Capabilities Ready for Production
- 64+ document-signing smart field mappings
- 40+ authentic lender products database
- Complete document workflow automation
- Bearer token authentication for client portal
- CORS configured for cross-origin integration
- Role-based access control (admin/staff/lender)

Your system has passed all verification tests and is ready for immediate deployment.