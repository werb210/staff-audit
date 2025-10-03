# LinkedIn + Sales Navigator Integration

This module adds comprehensive LinkedIn integration to the Staff Marketing platform including OAuth, organic posts, ads management, lead generation sync, matched audiences, and compliant messaging sequences.

## Features
- **OAuth 2.0 Integration**: Secure LinkedIn API authentication
- **Organic Content**: Create and schedule LinkedIn posts for organization pages
- **Ads Management**: Campaign creation and management for LinkedIn ads
- **Lead Generation**: Sync leads from LinkedIn Lead Gen forms to CRM
- **Matched Audiences**: Create custom audiences from CRM contacts
- **Messaging Sequences**: Compliant messaging for 1st-degree connections via Sales Navigator

## Required Environment Variables
Add these secrets via Replit Secrets:
- `LI_CLIENT_ID` - LinkedIn Developer App Client ID
- `LI_CLIENT_SECRET` - LinkedIn Developer App Client Secret  
- `LI_REDIRECT_URI` - OAuth callback URL (e.g., https://your-repl.replit.dev/api/linkedin/oauth/callback)
- `LI_ORG_ID` - LinkedIn Organization URN suffix
- `LI_AD_ACCOUNT_ID` - LinkedIn Ad Account URN suffix

## Database Schema
The integration adds these tables:
- `linkedin_tokens` - OAuth tokens per user
- `linkedin_orgs` - Managed company pages
- `linkedin_posts` - Organic post content and scheduling
- `linkedin_campaigns` - Ads campaign management
- `linkedin_leadgen` - Lead generation form sync
- `linkedin_audiences` - Matched audience mapping
- `linkedin_sequences` - Messaging sequence templates
- `linkedin_sequence_enrollments` - Active sequence enrollments

## API Endpoints
- `/api/linkedin/auth` - Start OAuth flow
- `/api/linkedin/oauth/callback` - OAuth callback handler
- `/api/linkedin/org/:orgUrn/posts` - Create organic posts
- `/api/linkedin/ads/accounts/:accountUrn/campaigns` - Manage campaigns
- `/api/linkedin/leadgen/:orgUrn/sync` - Sync lead generation
- `/api/linkedin/audiences/:accountUrn/create` - Create matched audiences
- `/api/linkedin/sequences` - Manage messaging sequences

## Compliance Notes
- All messaging sequences respect LinkedIn's 1st-degree connection requirements
- Rate limiting implemented per LinkedIn API guidelines
- Proper scope requests for approved LinkedIn features only
- Email hashing for matched audiences per LinkedIn policy