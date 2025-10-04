# Rollback Procedures - Production Deployment

**Version**: 1.0.0
**Last Updated**: October 2, 2025
**Purpose**: Emergency rollback procedures for failed deployments

---

## Quick Reference

### Emergency Rollback Commands

```bash
# Quick rollback to previous version
git checkout <previous-tag>
npm install
npm run build
npm start

# Vercel instant rollback
vercel promote <previous-deployment-url>

# Docker rollback
docker pull describe-it:<previous-tag>
docker-compose up -d
```

---

## Pre-Deployment Preparation

### 1. Create Deployment Snapshot

**Before every deployment**, create a snapshot:

```bash
# 1. Tag current production state
git tag -a v$(date +%Y%m%d-%H%M%S)-pre-deploy -m "Pre-deployment snapshot"

# 2. Document current state
echo "Production State - $(date)" > deployment-snapshot.txt
echo "Git Commit: $(git rev-parse HEAD)" >> deployment-snapshot.txt
echo "Node Version: $(node --version)" >> deployment-snapshot.txt
echo "NPM Version: $(npm --version)" >> deployment-snapshot.txt

# 3. Export environment variables
cat .env.local > .env.backup

# 4. Document database schema
# (Supabase - export schema if changes were made)

# 5. List current deployments
vercel ls > current-deployments.txt
```

### 2. Backup Checklist

- [ ] Git tag created
- [ ] Current commit hash documented
- [ ] Environment variables backed up
- [ ] Database snapshot created (if schema changed)
- [ ] Current Vercel deployment URL saved
- [ ] Package versions documented (`package-lock.json` committed)

---

## Rollback Scenarios

### Scenario 1: Failed Deployment Detection

**Symptoms**:
- Application won't start
- 500 errors on all pages
- Build failures
- Health check failing

**Immediate Actions**:
1. Stop deployment immediately
2. Assess impact (users affected?)
3. Decide: Quick fix or rollback?
4. Execute appropriate procedure

### Scenario 2: Partial Failure

**Symptoms**:
- Some features broken
- Intermittent errors
- Performance degradation

**Immediate Actions**:
1. Identify affected features
2. Check if critical path impacted
3. Monitor error rates
4. Decide: Feature flag disable or rollback?

### Scenario 3: Data Corruption

**Symptoms**:
- Incorrect data displayed
- Database errors
- Migration failures

**Immediate Actions**:
1. STOP all writes to database
2. Assess data integrity
3. Restore database from backup
4. Rollback application

---

## Rollback Procedures

### Procedure 1: Local/Development Rollback

```bash
# Step 1: Identify previous working version
git log --oneline --decorate

# Step 2: Checkout previous version
git checkout <commit-hash-or-tag>

# Step 3: Clean build artifacts
rm -rf .next
rm -rf node_modules
rm -f package-lock.json

# Step 4: Reinstall dependencies
npm install

# Step 5: Rebuild application
npm run build

# Step 6: Verify build succeeded
ls -la .next/

# Step 7: Start application
npm start

# Step 8: Verify health
curl http://localhost:3000/api/health
```

**Verification**:
- [ ] Application starts without errors
- [ ] Health check returns 200 OK
- [ ] Homepage loads
- [ ] Core features working

**Estimated Time**: 5-10 minutes

### Procedure 2: Vercel Production Rollback

#### Method A: Instant Rollback (Fastest)

```bash
# Step 1: List recent deployments
vercel ls

# Output example:
# Age  Deployment                   Status
# 3m   describe-it-abc123.vercel.app Ready
# 1h   describe-it-def456.vercel.app Ready  <- Previous good deployment
# 2h   describe-it-ghi789.vercel.app Ready

# Step 2: Promote previous deployment
vercel promote https://describe-it-def456.vercel.app

# Step 3: Verify immediately
curl -I https://your-domain.com/api/health
```

**Estimated Time**: 30 seconds - 2 minutes

#### Method B: Redeploy Previous Version

```bash
# Step 1: Checkout previous version
git checkout <previous-tag>

# Step 2: Deploy to Vercel
vercel --prod

# Step 3: Verify deployment
vercel ls
```

**Estimated Time**: 3-5 minutes

### Procedure 3: Docker Rollback

```bash
# Step 1: Identify previous Docker image
docker images describe-it

# Step 2: Stop current container
docker-compose down

# Step 3: Update docker-compose.yml to use previous tag
# Edit: image: describe-it:<previous-tag>

# Step 4: Start with previous image
docker-compose up -d

# Step 5: Verify container health
docker ps
docker logs <container-id>
curl http://localhost:3000/api/health
```

**Estimated Time**: 2-5 minutes

### Procedure 4: Database Rollback

**WARNING**: Only if database schema changed

```bash
# Step 1: Check migration status
# Supabase Dashboard -> Database -> Migrations

# Step 2: Identify migrations to rollback
# Note: Migrations run since last deployment

# Step 3: Create rollback migration
# Manually create inverse of recent migrations

# Step 4: Apply rollback
# Through Supabase dashboard or CLI

# Step 5: Verify database integrity
# Run validation queries
```

**Estimated Time**: 10-30 minutes

---

## Post-Rollback Procedures

### 1. Immediate Verification

```bash
# Health checks
curl https://your-domain.com/api/health
curl https://your-domain.com/api/env-status

# Smoke tests
npm run test:smoke

# Manual verification
# - Visit homepage
# - Test image search
# - Generate description
# - Verify exports work
```

### 2. Monitoring

**First 30 minutes**:
- [ ] Monitor error rates in Sentry
- [ ] Check Vercel logs
- [ ] Monitor application metrics
- [ ] Check user reports
- [ ] Verify API response times

**First 2 hours**:
- [ ] Continue monitoring
- [ ] Check database performance
- [ ] Verify all integrations working
- [ ] Monitor resource usage

### 3. Communication

**Internal Team**:
```
Subject: PRODUCTION ROLLBACK - [Date/Time]

Rollback Executed:
- Previous Version: <tag/commit>
- New Version: <tag/commit> (rolled back)
- Reason: <brief description>
- Impact: <user impact>
- Status: <current status>

Next Steps:
- Root cause analysis
- Fix development
- Timeline for re-deployment
```

**Users** (if major impact):
```
Subject: Service Restoration Complete

We've identified and resolved a technical issue.
The service is now fully operational.

We apologize for any inconvenience.
```

### 4. Root Cause Analysis

**Template**:
```markdown
## Incident Report

**Date**:
**Time**:
**Duration**:

### What Happened
- Description of failure
- Symptoms observed
- User impact

### Timeline
- 00:00 - Deployment started
- 00:05 - First errors detected
- 00:10 - Rollback decision made
- 00:15 - Rollback completed
- 00:20 - Service restored

### Root Cause
- Technical cause
- Why it wasn't caught in testing
- What could have prevented it

### Action Items
- [ ] Fix identified issue
- [ ] Add test coverage
- [ ] Update deployment checklist
- [ ] Improve monitoring
- [ ] Update documentation

### Prevention
- Changes to CI/CD
- Additional testing
- Improved monitoring
```

---

## Rollback Decision Matrix

### Should You Rollback?

| Severity | Impact | Action | Timeline |
|----------|--------|--------|----------|
| **Critical** | All users unable to access | IMMEDIATE ROLLBACK | < 5 minutes |
| **High** | Core features broken | ROLLBACK | < 15 minutes |
| **Medium** | Some features broken | Evaluate: Fix or Rollback | < 30 minutes |
| **Low** | Minor issues | FIX FORWARD | When ready |

### Critical Indicators (Immediate Rollback)
- Application won't start
- Database connection failures
- Authentication completely broken
- Data corruption detected
- Security vulnerability exposed

### High Indicators (Quick Rollback)
- Core features not working
- Error rate > 10%
- Performance degraded > 50%
- Payment processing broken
- API completely down

### Medium Indicators (Evaluate)
- Non-critical features broken
- Error rate 1-10%
- Performance degraded 25-50%
- Some API endpoints failing

### Low Indicators (Fix Forward)
- UI/UX issues
- Non-critical bugs
- Minor performance issues
- Error rate < 1%

---

## Rollback Testing

### Test Your Rollback Procedure

**Quarterly Rollback Drill**:

1. Schedule rollback test
2. Deploy to staging
3. Intentionally "break" deployment
4. Execute rollback procedure
5. Time the process
6. Document any issues
7. Update procedures

**Checklist**:
- [ ] Can identify previous version quickly
- [ ] Rollback commands work
- [ ] Verification steps clear
- [ ] Communication templates ready
- [ ] Team knows their roles
- [ ] Documented in runbook

---

## Environment-Specific Rollback

### Development
```bash
git checkout main
git reset --hard origin/main
npm install
npm run dev
```

### Staging
```bash
# Vercel staging
vercel promote <previous-staging-deployment>

# Or redeploy
git checkout <previous-tag>
vercel --env=staging
```

### Production
```bash
# Follow Procedure 2 (Vercel Production Rollback)
vercel promote <previous-production-deployment>
```

---

## Rollback Checklist

### Before Rollback
- [ ] Identify previous working version
- [ ] Notify team of rollback decision
- [ ] Document current issue
- [ ] Prepare rollback commands
- [ ] Alert monitoring team

### During Rollback
- [ ] Execute rollback procedure
- [ ] Monitor progress
- [ ] Verify each step
- [ ] Check health endpoints
- [ ] Run smoke tests

### After Rollback
- [ ] Confirm service restored
- [ ] Verify monitoring shows normal
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Begin root cause analysis
- [ ] Plan fix and re-deployment

---

## Recovery Time Objectives (RTO)

| Environment | Target RTO | Maximum RTO |
|-------------|-----------|-------------|
| Production | 5 minutes | 15 minutes |
| Staging | 15 minutes | 30 minutes |
| Development | 30 minutes | 1 hour |

---

## Contact Information

### Emergency Contacts

**On-Call Engineer**:
- Name: _________________
- Phone: _________________
- Email: _________________

**DevOps Lead**:
- Name: _________________
- Phone: _________________
- Email: _________________

**CTO/Technical Lead**:
- Name: _________________
- Phone: _________________
- Email: _________________

### External Services

**Vercel Support**:
- Dashboard: https://vercel.com/support
- Status: https://www.vercel-status.com

**Supabase Support**:
- Dashboard: https://app.supabase.com
- Status: https://status.supabase.com

**GitHub**:
- Status: https://www.githubstatus.com

---

## Appendix: Common Issues and Solutions

### Issue: Build Timeout
**Solution**:
```bash
# Increase timeout
vercel --timeout 600s

# Or optimize build
npm run build:optimize
```

### Issue: Environment Variables Missing
**Solution**:
```bash
# Restore from backup
cp .env.backup .env.local

# Or re-add in Vercel dashboard
vercel env pull
```

### Issue: Database Migration Stuck
**Solution**:
```bash
# Check Supabase dashboard
# Manually rollback migration
# Or restore database backup
```

### Issue: Docker Container Won't Start
**Solution**:
```bash
# Check logs
docker logs <container-id>

# Use previous image
docker pull describe-it:<previous-tag>
docker-compose up -d
```

---

**Document Owner**: DevOps Team
**Review Schedule**: Quarterly
**Last Tested**: _________________
**Next Test Date**: _________________
