# Production Monitoring Setup Guide

## Overview
This guide provides step-by-step instructions for setting up external health monitoring for the Staff Portal production deployment.

## Monitoring Endpoints

### Primary Health Endpoints
| Endpoint | URL | Purpose | Expected Response |
|----------|-----|---------|------------------|
| **Root Health** | `https://staff.boreal.financial/` | System health, DB, JWT validation | HTTP 200 + JSON health status |
| **Version Info** | `https://staff.boreal.financial/api/version` | Deployment tracking | HTTP 200 + version details |
| **API Health** | `https://staff.boreal.financial/api/health` | Internal diagnostics | HTTP 200 + detailed health |

### Expected Responses

#### Root Health (`/`)
```json
{
  "status": "healthy",
  "service": "Staff Portal API",
  "timestamp": "2025-07-06T20:00:36.956Z",
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": "connected",
    "secrets": "configured",
    "jwt": "configured"
  }
}
```

#### Version Info (`/api/version`)
```json
{
  "version": "1.0.0",
  "commit": "dev",
  "timestamp": "2025-07-06T20:00:36.989Z",
  "environment": "production"
}
```

## UptimeRobot Setup (Recommended - 5 minutes)

### Step 1: Create UptimeRobot Account
1. Visit [https://uptimerobot.com/](https://uptimerobot.com/)
2. Sign up for free account (50 monitors included)
3. Verify email and login

### Step 2: Add Primary Health Monitor
1. Click "Add New Monitor"
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: "Staff Portal - Health Check"
4. **URL**: `https://staff.boreal.financial/`
5. **Monitoring Interval**: 5 minutes (free tier)
6. **Monitor Timeout**: 30 seconds
7. **Advanced Settings**:
   - **HTTP Method**: GET
   - **Expected Status Codes**: 200
   - **Keyword Monitoring**: Enable
   - **Required Keyword**: `"status":"healthy"`

### Step 3: Add Version Monitoring
1. Click "Add New Monitor"
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: "Staff Portal - Version Check"
4. **URL**: `https://staff.boreal.financial/api/version`
5. **Monitoring Interval**: 15 minutes
6. **Expected Status Codes**: 200
7. **Required Keyword**: `"environment":"production"`

### Step 4: Configure Alert Contacts
1. Go to "My Settings" → "Alert Contacts"
2. **Email Notifications**:
   - Add primary admin email
   - Enable for "Down" and "Up" events
3. **Slack Integration** (Optional):
   - Go to Slack App Directory → UptimeRobot
   - Install app and configure webhook
   - Add Slack contact with channel name

### Step 5: Alert Rules
Configure the following alert rules:
- **Trigger Alert**: When monitor is down for 2+ consecutive checks
- **Send Recovery**: When monitor comes back up
- **Alert Frequency**: Send alerts every 5 minutes while down

## Alternative: Better Stack Setup (10-15 minutes)

### Benefits
- More advanced logging and incident response
- Better dashboard visualization
- Automated incident creation

### Setup
1. Visit [https://betterstack.com/](https://betterstack.com/)
2. Create account and workspace
3. Add HTTP monitors for same endpoints
4. Configure incident management workflows

## Monitoring Checklist

### ✅ Pre-Deployment Verification
- [ ] All endpoints return HTTP 200
- [ ] Health endpoint includes all required JSON fields
- [ ] Version endpoint shows correct environment
- [ ] Database connectivity confirmed
- [ ] JWT configuration validated

### ✅ Post-Setup Verification
- [ ] UptimeRobot monitors created and active
- [ ] Test alerts by temporarily stopping server
- [ ] Verify email/Slack notifications work
- [ ] Confirm keyword monitoring detects health status
- [ ] Set up dashboard bookmarks

## Alert Response Procedures

### When Health Check Fails
1. **Immediate Actions**:
   - Check Replit deployment status
   - Verify database connectivity
   - Review server logs for errors

2. **Recovery Steps**:
   - Restart deployment if needed
   - Check environment variables (JWT_SECRET, DATABASE_URL)
   - Verify CORS configuration

### When Version Check Fails
1. Check deployment pipeline status
2. Verify static file serving
3. Confirm API route registration

## Production Monitoring Dashboard

### Key Metrics to Track
- **Uptime Percentage**: Target 99.9%
- **Response Time**: Target <500ms
- **Error Rate**: Target <0.1%
- **Database Health**: Continuous monitoring

### Weekly Review Process
1. Review uptime reports
2. Analyze response time trends
3. Check for any alert patterns
4. Update monitoring thresholds if needed

## Security Considerations

### Monitoring Security
- UptimeRobot requests come from specific IP ranges
- Health endpoints are public but don't expose sensitive data
- Monitor logs for unusual request patterns

### Data Protection
- Health checks don't transmit user data
- Version info is safe to expose publicly
- Ensure monitoring service has appropriate data handling policies

## Next Steps After Setup

Once monitoring is active:
1. **Week 1**: Monitor for false positives and tune alert thresholds
2. **Week 2**: Add additional endpoints if needed
3. **Month 1**: Review uptime reports and optimize response times
4. **Quarterly**: Rotate JWT_SECRET and update monitoring accordingly

## Support Resources

- **UptimeRobot Documentation**: [https://uptimerobot.com/help/](https://uptimerobot.com/help/)
- **Better Stack Docs**: [https://docs.betterstack.com/](https://docs.betterstack.com/)
- **Staff Portal Health**: `https://staff.boreal.financial/`

---

**Status**: Ready for production monitoring setup
**Last Updated**: July 6, 2025
**Environment**: Production