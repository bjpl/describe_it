# Staging Rollback Guide

Comprehensive guide for rolling back staging deployments when issues are detected.

## When to Rollback

Rollback should be considered when:

- **Critical bugs** affecting core functionality
- **Security vulnerabilities** discovered post-deployment
- **Performance degradation** (> 50% slower response times)
- **Data integrity issues** detected
- **Failed health checks** that cannot be quickly resolved
- **High error rates** (> 5% of requests failing)
- **Complete service outage**

## Rollback Decision Matrix

| Severity | Issue Type | Action | Timeline |
|----------|-----------|--------|----------|
| **Critical** | Service down | Immediate rollback | < 5 minutes |
| **High** | Major feature broken | Rollback if no quick fix | < 15 minutes |
| **Medium** | Minor feature broken | Attempt quick fix first | < 30 minutes |
| **Low** | UI/UX issue | Monitor, fix in next deployment | No rollback |

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] Confirm the issue is severe enough to warrant rollback
- [ ] Identify the working previous deployment/backup
- [ ] Notify team of impending rollback
- [ ] Document the issue causing rollback
- [ ] Ensure backup integrity
- [ ] Have rollback procedure ready

## Rollback Methods

### Method 1: Automated Rollback (Recommended)

Use the automated rollback script:

```bash
# List available backups and select one
./scripts/deployment/rollback.sh

# Or specify backup directly
./scripts/deployment/rollback.sh backups/staging-20251002_120000
```

**What it does**:
1. Verifies backup integrity
2. Confirms rollback with user
3. Restores environment configuration
4. Restores git state to previous commit
5. Rebuilds application
6. Redeploys to Vercel
7. Runs health checks

**Time**: ~10-15 minutes

### Method 2: Vercel Quick Rollback

Fastest method for Vercel deployments:

```bash
# 1. List recent deployments
vercel ls

# 2. Identify the working deployment
# Look for the deployment before the current one

# 3. Promote that deployment
vercel promote <deployment-url>
```

**Example**:
```bash
vercel ls
# Output shows:
# staging-abc123.vercel.app (current - broken)
# staging-xyz789.vercel.app (previous - working)

vercel promote https://staging-xyz789.vercel.app
```

**Time**: ~2-5 minutes

### Method 3: Manual Rollback

For full control over the rollback process:

#### Step 1: Identify Target State

```bash
# Find the last working deployment
ls -lt backups/

# Or check git history
git log --oneline -10
```

#### Step 2: Restore Environment

```bash
# Backup current environment (just in case)
cp .env.staging .env.staging.failed

# Restore from backup
cp backups/staging-20251002_120000/.env.staging.bak .env.staging
```

#### Step 3: Restore Code State

```bash
# Get target commit from backup
TARGET_COMMIT=$(cat backups/staging-20251002_120000/git-commit.txt)

# Stash any changes
git stash save "Before rollback"

# Checkout target commit
git checkout $TARGET_COMMIT
```

#### Step 4: Rebuild Application

```bash
# Clean build
npm run clean

# Install dependencies
npm ci --legacy-peer-deps

# Build
NODE_ENV=staging npm run build
```

#### Step 5: Deploy

```bash
# Deploy to Vercel
vercel --prod --yes
```

#### Step 6: Verify Rollback

```bash
# Get deployment URL
DEPLOYMENT_URL=$(vercel ls | head -n 1 | awk '{print $2}')

# Run health checks
./scripts/deployment/health-check.sh $DEPLOYMENT_URL

# Run smoke tests
STAGING_URL=$DEPLOYMENT_URL npm run test:smoke
```

**Time**: ~15-20 minutes

## Rollback Procedures by Scenario

### Scenario 1: Complete Service Outage

**Symptom**: Application is completely down, returning 500 errors or not responding.

**Action**: Immediate Vercel quick rollback

```bash
# Quick rollback to last working deployment
vercel ls
vercel promote <last-working-deployment-url>

# Verify
curl https://staging.describe-it.yourdomain.com/api/health
```

**Expected Time**: 2-3 minutes

### Scenario 2: Critical Feature Broken

**Symptom**: Major functionality not working (e.g., API endpoints failing).

**Action**: Automated rollback

```bash
# Run automated rollback
./scripts/deployment/rollback.sh

# Select the last working backup when prompted
```

**Expected Time**: 10-15 minutes

### Scenario 3: Performance Degradation

**Symptom**: Application slow but functional (response times > 5s).

**Action**: Attempt quick fix first, rollback if needed

```bash
# First, try to identify the issue
vercel logs --follow

# Check for database connection issues
# Check for API rate limiting

# If no quick fix found, rollback
./scripts/deployment/rollback.sh
```

**Expected Time**: 15-20 minutes (including troubleshooting)

### Scenario 4: Data Integrity Issues

**Symptom**: Database queries returning incorrect data or failing.

**Action**: Immediate rollback + database restore

```bash
# 1. Rollback application
./scripts/deployment/rollback.sh

# 2. Contact database admin for database rollback
# 3. Verify data integrity after rollback
```

**Expected Time**: 20-30 minutes

### Scenario 5: Security Vulnerability

**Symptom**: Security issue discovered in new deployment.

**Action**: Immediate rollback + security patch

```bash
# 1. Quick rollback
vercel promote <last-safe-deployment>

# 2. Create security patch on separate branch
git checkout -b hotfix/security-patch

# 3. Apply fix and redeploy
```

**Expected Time**: 5 minutes (rollback) + patch time

## Post-Rollback Actions

### Immediate Actions (< 5 minutes)

1. **Verify Rollback Success**
   ```bash
   # Health check
   curl https://staging.describe-it.yourdomain.com/api/health

   # Smoke tests
   npm run test:smoke
   ```

2. **Monitor Application**
   ```bash
   # Watch logs for errors
   vercel logs --follow

   # Monitor error rates
   # Check Sentry dashboard
   ```

3. **Notify Stakeholders**
   - Team notification: "Rollback completed"
   - Status update: "Service restored"
   - Expected fix timeline

### Short-term Actions (< 1 hour)

1. **Root Cause Analysis**
   - Review deployment logs
   - Identify what caused the issue
   - Document findings

2. **Create Fix Plan**
   - Identify fix approach
   - Estimate fix time
   - Create hotfix branch if needed

3. **Update Documentation**
   - Document the incident
   - Add to known issues
   - Update runbook

### Long-term Actions (< 1 day)

1. **Incident Report**
   - Timeline of events
   - Root cause
   - Impact assessment
   - Lessons learned

2. **Process Improvement**
   - Update deployment checklist
   - Improve automated checks
   - Add new validation steps

3. **Prevention Measures**
   - Add tests to prevent recurrence
   - Update monitoring
   - Improve alerts

## Rollback Verification

After rollback, verify:

### Application Health
- [ ] Health endpoint returns 200 OK
- [ ] Status endpoint shows correct environment
- [ ] No 500 errors in logs
- [ ] Response times normal

### Functionality
- [ ] Core features working
- [ ] API endpoints responding
- [ ] Database queries successful
- [ ] Authentication working

### Performance
- [ ] Response times < 2s
- [ ] No timeout errors
- [ ] Cache hit rates normal
- [ ] Database connection pool healthy

### Data Integrity
- [ ] Data queries return expected results
- [ ] No data corruption
- [ ] Database state consistent
- [ ] User data intact

## Rollback Troubleshooting

### Issue: Rollback Script Fails

**Symptom**: `./scripts/deployment/rollback.sh` fails with error.

**Solutions**:
```bash
# 1. Check script permissions
chmod +x ./scripts/deployment/rollback.sh

# 2. Check backup directory exists
ls -la backups/

# 3. Try manual rollback instead
# Follow Method 3 above

# 4. Check logs
cat logs/rollback-*.log
```

### Issue: Vercel Promote Fails

**Symptom**: `vercel promote` command fails.

**Solutions**:
```bash
# 1. Verify authentication
vercel whoami

# 2. Re-login if needed
vercel logout
vercel login

# 3. Check deployment exists
vercel ls

# 4. Try with full URL
vercel promote https://staging-xyz789.vercel.app
```

### Issue: Build Fails During Rollback

**Symptom**: Build fails when trying to rollback to previous version.

**Solutions**:
```bash
# 1. Clean everything
rm -rf node_modules package-lock.json .next

# 2. Fresh install
npm install --legacy-peer-deps

# 3. Try build again
NODE_ENV=staging npm run build

# 4. If still failing, use Vercel quick rollback instead
vercel promote <last-working-deployment>
```

### Issue: Health Checks Fail After Rollback

**Symptom**: Health checks fail even after successful rollback.

**Solutions**:
```bash
# 1. Wait a minute for deployment to propagate
sleep 60

# 2. Check Vercel logs
vercel logs api/health

# 3. Verify environment variables
vercel env ls

# 4. Check DNS/CDN cache
# May take up to 5 minutes to clear

# 5. Hard refresh
curl -H "Cache-Control: no-cache" https://staging.describe-it.yourdomain.com/api/health
```

## Rollback Communication Template

### Initial Notification

```
🚨 STAGING ROLLBACK IN PROGRESS

Reason: [Brief description of issue]
Action: Rolling back to deployment [backup-id]
Expected completion: [time]
Impact: [description]

Will update when complete.
```

### Completion Notification

```
✅ STAGING ROLLBACK COMPLETED

Previous deployment: [failed-deployment-id]
Rolled back to: [working-deployment-id]
Rollback completed at: [time]
Verification: All health checks passing

Next steps:
1. Root cause analysis
2. Create fix
3. Retest and redeploy

Issue tracking: [link to issue]
```

## Prevention Strategies

### Before Deployment
- [ ] Comprehensive testing in development
- [ ] Code review for all changes
- [ ] Automated pre-deployment checks
- [ ] Staging environment mirrors production
- [ ] Database migration testing

### During Deployment
- [ ] Monitor deployment progress
- [ ] Watch logs in real-time
- [ ] Run automated health checks
- [ ] Verify critical endpoints

### After Deployment
- [ ] Extended monitoring period (30 minutes)
- [ ] Smoke test suite execution
- [ ] Performance monitoring
- [ ] Error rate tracking

## Backup Management

### Backup Retention Policy

- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 4 weeks
- **Monthly backups**: Keep for 3 months
- **Critical releases**: Keep indefinitely

### Backup Verification

Regular backup verification:
```bash
# Weekly backup verification script
for backup in backups/staging-*; do
    echo "Verifying: $backup"

    # Check files exist
    test -f "$backup/.env.staging.bak" || echo "Missing env file"
    test -f "$backup/git-commit.txt" || echo "Missing git commit"

    # Verify git commit is valid
    commit=$(cat "$backup/git-commit.txt")
    git cat-file -e "$commit" || echo "Invalid commit: $commit"
done
```

## Emergency Contacts

- **Primary On-call**: [Name] - [Contact]
- **Secondary On-call**: [Name] - [Contact]
- **DevOps Lead**: [Name] - [Contact]
- **Infrastructure Team**: [Slack channel]

## Additional Resources

- [Vercel Rollback Documentation](https://vercel.com/docs/deployments/rollback)
- [Git Reset and Revert Guide](https://git-scm.com/docs/git-reset)
- [Incident Response Playbook](../operations/INCIDENT_RESPONSE.md)

---

Last Updated: 2025-10-02
Version: 1.0.0
