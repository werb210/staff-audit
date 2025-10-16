# Production Monitoring & Maintenance Schedule

## Post-Deployment Timeline

### T + 30 Minutes: Initial Application Verification
**Objective**: Verify first real application processes correctly through SignNow workflow

**Monitoring Commands**:
```bash
# Check application logs for SignNow processing
tail -f /var/log/staff-portal.log | grep -E "(SignNow|signing|embedded)"

# Verify SignNow URLs are being generated
curl -s "https://staffportal.boreal.financial/api/applications" | \
  jq '.[] | select(.status == "preparing" or .status == "ready") | {id, status, signing_url}'

# Monitor queue processing times
curl -s "https://staffportal.boreal.financial/api/health/queue" | \
  jq '.averageProcessingTime, .pendingJobs, .completedJobs'
```

**Success Criteria**:
- Application creates successfully with app_prod_ prefix
- SignNow job queues within 5 seconds
- Embedded signing URL generated within 30 seconds
- Status progresses: draft → preparing → ready

### T + 24 Hours: Document Storage Audit
**Objective**: Verify document upload directory health and prevent storage bloat

**Audit Script**:
```bash
#!/bin/bash
# Document Storage Health Check

UPLOAD_DIR="/app/uploads"
REPORT_FILE="/tmp/document-audit-$(date +%Y%m%d).txt"

echo "Document Storage Audit - $(date)" > $REPORT_FILE
echo "==========================================" >> $REPORT_FILE

# Directory size analysis
echo "Total storage usage:" >> $REPORT_FILE
du -sh $UPLOAD_DIR >> $REPORT_FILE

# Count files by application
echo -e "\nFiles per application:" >> $REPORT_FILE
find $UPLOAD_DIR -type f | cut -d'/' -f4 | sort | uniq -c | sort -nr | head -20 >> $REPORT_FILE

# Identify orphaned files (applications not in database)
echo -e "\nOrphaned file check:" >> $REPORT_FILE
psql $DATABASE_URL -c "
  WITH app_dirs AS (
    SELECT DISTINCT 'app_prod_' || id as dir_name 
    FROM applications 
    WHERE created_at > NOW() - INTERVAL '7 days'
  ),
  disk_dirs AS (
    SELECT unnest(string_to_array('$(ls $UPLOAD_DIR)', E'\n')) as dir_name
  )
  SELECT disk_dirs.dir_name as orphaned_directory
  FROM disk_dirs 
  LEFT JOIN app_dirs ON disk_dirs.dir_name = app_dirs.dir_name
  WHERE app_dirs.dir_name IS NULL;
" >> $REPORT_FILE

# Large file detection
echo -e "\nLarge files (>5MB):" >> $REPORT_FILE
find $UPLOAD_DIR -type f -size +5M -exec ls -lh {} \; >> $REPORT_FILE

echo "Audit complete. Report: $REPORT_FILE"
```

**Cleanup Actions**:
- Remove orphaned directories older than 7 days
- Archive completed applications older than 30 days
- Alert if total storage exceeds 80% capacity

### Weekly: Security Token Rotation
**Objective**: Rotate CLIENT_APP_SHARED_TOKEN with zero-downtime grace period

**Rotation Process**:
```bash
#!/bin/bash
# Weekly Token Rotation with Grace Period

# Generate new secure token
NEW_TOKEN=$(openssl rand -hex 32)
CURRENT_TOKEN=$CLIENT_APP_SHARED_TOKEN

echo "Starting token rotation..."
echo "Current token: ${CURRENT_TOKEN:0:8}..."
echo "New token: ${NEW_TOKEN:0:8}..."

# Step 1: Enable dual-token support (24-hour grace period)
kubectl set env deployment/staff-portal \
  CLIENT_APP_SHARED_TOKEN="$CURRENT_TOKEN" \
  CLIENT_APP_SHARED_TOKEN_NEW="$NEW_TOKEN"

# Step 2: Update client portal configuration
curl -X PATCH "https://clientportal.boreal.financial/api/config/auth" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"newBearerToken": "'$NEW_TOKEN'", "gracePeriod": "24h"}'

# Step 3: Monitor authentication success rates
echo "Monitoring authentication for 1 hour..."
sleep 3600

# Step 4: Verify client pickup
AUTH_SUCCESS=$(curl -s "https://staffportal.boreal.financial/api/metrics/auth" | \
  jq '.last24h.successRate')

if (( $(echo "$AUTH_SUCCESS > 0.95" | bc -l) )); then
  echo "Client successfully using new token (${AUTH_SUCCESS} success rate)"
  
  # Step 5: Remove old token after 24 hours
  sleep 82800  # 23 more hours
  kubectl set env deployment/staff-portal \
    CLIENT_APP_SHARED_TOKEN="$NEW_TOKEN" \
    CLIENT_APP_SHARED_TOKEN_NEW-
  echo "Token rotation complete"
else
  echo "WARNING: Low auth success rate ($AUTH_SUCCESS). Investigate before completing rotation."
fi
```

## Continuous Monitoring Alerts

### Error Rate Monitoring
```yaml
# Alert: 5xx Error Rate > 2% for 5 minutes
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: staff-portal-error-rate
spec:
  groups:
  - name: staff-portal
    rules:
    - alert: HighErrorRate
      expr: |
        (
          rate(http_requests_total{job="staff-portal",code=~"5.."}[5m]) /
          rate(http_requests_total{job="staff-portal"}[5m])
        ) > 0.02
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Staff Portal high error rate"
        description: "Error rate is {{ $value | humanizePercentage }} for 5 minutes"
```

### Queue Performance Monitoring
```javascript
// SignNow Queue Health Check
setInterval(async () => {
  const queueStats = await getQueueStatistics();
  
  if (queueStats.averageProcessingTime > 30000) {
    await sendAlert({
      level: 'warning',
      message: `SignNow queue slow: ${queueStats.averageProcessingTime}ms average`,
      metrics: queueStats
    });
  }
  
  if (queueStats.pendingJobs > 50) {
    await sendAlert({
      level: 'critical', 
      message: `SignNow queue backlog: ${queueStats.pendingJobs} pending jobs`,
      metrics: queueStats
    });
  }
}, 60000); // Check every minute
```

### Database Connection Monitoring
```sql
-- Monitor connection pool utilization
SELECT 
  application_name,
  count(*) as connections,
  count(*) filter (where state = 'active') as active,
  count(*) filter (where state = 'idle') as idle
FROM pg_stat_activity 
WHERE application_name LIKE '%staff-portal%'
GROUP BY application_name;

-- Alert if connections > 80% of pool size
```

## Automated Health Checks

### Application Health Dashboard
```javascript
// Health check endpoints for monitoring
app.get('/api/health/comprehensive', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: await checkDatabaseHealth(),
      signnow: await checkSignNowConnectivity(), 
      queue: await checkQueueHealth(),
      storage: await checkStorageHealth(),
      authentication: await checkAuthenticationHealth()
    },
    metrics: {
      activeApplications: await getActiveApplicationCount(),
      queueDepth: await getQueueDepth(),
      storageUsage: await getStorageUsage(),
      responseTime: await getAverageResponseTime()
    }
  };
  
  const overallHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  health.status = overallHealthy ? 'healthy' : 'degraded';
  
  res.status(overallHealthy ? 200 : 503).json(health);
});
```

## Incident Response Procedures

### High Error Rate Response
1. Check application logs for error patterns
2. Verify database connectivity and performance
3. Confirm SignNow API status
4. Scale application instances if needed
5. Rollback deployment if errors correlate with recent changes

### Queue Backlog Response  
1. Check SignNow API rate limits and status
2. Increase queue worker instances
3. Temporarily disable non-critical job types
4. Manual processing of high-priority applications

### Storage Issues Response
1. Run immediate cleanup of orphaned files
2. Archive old applications to cold storage
3. Increase storage allocation if needed
4. Implement emergency file size limits

This monitoring schedule ensures proactive maintenance and rapid incident response for the production staff portal deployment.