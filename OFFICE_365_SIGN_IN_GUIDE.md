# Office 365 Email Integration Sign-In Guide

## Current Status
✅ **Microsoft Graph OAuth Configured**: Client ID: e62aed67... (operational)
✅ **Database Tables Created**: email_accounts table ready for connections
✅ **API Endpoints Active**: All OAuth routes mounted at `/api/msgraph/*`

## How to Sign Into Office 365

### Step 1: Initiate OAuth Flow
**CLICK THIS LINK TO SIGN INTO OFFICE 365:**
```
http://localhost:5000/api/msgraph/oauth?staffUserId=todd.w@boreal.financial
```

**For Team Email (if different):**
```
http://localhost:5000/api/msgraph/oauth?staffUserId=TEAM_EMAIL_ADDRESS
```

### Step 2: Microsoft Login Process
1. You'll be redirected to Microsoft's login page
2. Sign in with your Office 365 credentials
3. Review and accept the requested permissions:
   - **Mail.ReadWrite**: Read and write access to your email
   - **Mail.Send**: Send emails on your behalf
   - **offline_access**: Maintain access when you're not actively using the app

### Step 3: Automatic Integration
After successful authentication:
- Your access tokens are securely stored in the database
- The system can now access your Office 365 email
- You'll be redirected back to the staff application

## Team Email Setup

### For Shared Mailboxes
The system supports both personal and shared mailboxes. To add a team email:

1. **Personal Access**: Use the OAuth flow above with each team member's credentials
2. **Shared Mailbox**: Configure through your Office 365 admin panel to grant access to the registered application

### Current Configuration
- **Redirect URI**: `https://staff.boreal.financial/api/msgraph/callback`
- **Client ID**: `e62aed67-c241-465a-9efb-c656800c7428`
- **Mode**: Public client (no client secret required)

## Verification Commands

Check if your email account is connected:
```bash
curl -X GET "http://localhost:5000/api/msgraph/accounts" -H "Accept: application/json"
```

Check OAuth health status:
```bash
curl -X GET "http://localhost:5000/api/msgraph/health" -H "Accept: application/json"
```

## Troubleshooting

### Common Issues
1. **"Authorization required"**: You need to complete the OAuth flow first
2. **"Token expired"**: Re-run the OAuth flow to refresh tokens
3. **"Insufficient permissions"**: Ensure your Office 365 account has the required permissions

### Admin Consent
For organization-wide deployment, your Office 365 admin may need to provide admin consent for the application.

## Next Steps After Sign-In

Once signed in, you can:
- Send emails directly from the CRM contact cards
- Receive incoming emails in the shared inbox
- Log all email communications automatically
- Access full email thread history

## Support
If you encounter issues during sign-in, check the server logs for detailed error messages or contact your system administrator.