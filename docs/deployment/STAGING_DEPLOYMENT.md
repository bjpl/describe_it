# Staging Deployment Guide

Complete guide for deploying Describe It to the staging environment with validation, monitoring, and rollback procedures.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Health Checks](#health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

The staging environment is a pre-production environment that mirrors production configuration and is used for:

- Final testing before production deployment
- QA validation
- Integration testing
- Performance testing
- Security testing
- User acceptance testing (UAT)

### Staging vs Production

| Aspect | Staging | Production |
|--------|---------|------------|
| Purpose | Testing & validation | Live user traffic |
| Data | Test/synthetic data | Real user data |
| Debugging | Enabled | Disabled |
| Logging | Verbose (debug) | Standard (warn/error) |
| Rate Limits | Relaxed | Strict |
| Monitoring | Development tools | Production APM |
| Downtime | Acceptable | Minimized |

## Prerequisites

### Required Tools

1. **Node.js** >= 20.11.0
   ```bash
   node --version
   ```

2. **npm** >= 10.0.0
   ```bash
   npm --version
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **Vercel CLI** (for Vercel deployments)
   ```bash
   npm install -g vercel
   vercel --version
   ```

5. **curl** (for health checks)
   ```bash
   curl --version
   ```

### Required Access

- [ ] Git repository access (read/write)
- [ ] Vercel account and project access
- [ ] Supabase staging project access
- [ ] OpenAI API key (staging)
- [ ] Environment variable access
- [ ] Deployment permissions

### Required Accounts

1. **Vercel Account**
   - Team access to project
   - Deployment permissions
   - Environment variable management

2. **Supabase Staging Project**
   - Separate project from production
   - Project URL and keys
   - Database access

3. **Third-party Services**
   - OpenAI API (staging key)
   - Unsplash API (staging key)
   - Sentry (staging DSN)

## Environment Setup

### Step 1: Copy Environment Template

```bash
# Copy staging template
cp config/env-examples/.env.staging .env.staging

# Or if template doesn't exist yet
cp .env.example .env.staging
```

### Step 2: Generate Security Keys

Generate unique security keys for staging:

```bash
# API Secret Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret (16 bytes)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Step 3: Configure Environment Variables

Edit `.env.staging` with your values:

#### Critical Variables

```bash
# Environment
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.describe-it.yourdomain.com

# Supabase (STAGING PROJECT - separate from production)
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...staging-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...staging-service-key

# OpenAI (staging key)
OPENAI_API_KEY=sk-proj-your-staging-key

# Security Keys (generated above)
API_SECRET_KEY=your-generated-key
JWT_SECRET=your-generated-jwt-secret
SESSION_SECRET=your-generated-session-secret
```

#### Optional Variables

```bash
# Monitoring (staging)
SENTRY_DSN=https://your-staging-sentry-dsn@sentry.io
SENTRY_ENVIRONMENT=staging

# Analytics (staging)
NEXT_PUBLIC_GA_ID=G-STAGING-ID

# Caching (staging Redis)
REDIS_URL=redis://staging-redis.yourdomain.com:6379
```

### Step 4: Validate Environment

```bash
# Validate environment configuration
npm run validate:env:staging

# Or use the setup script
npm run setup:env -- --validate
```

## Deployment Process

### Automated Deployment (Recommended)

Use the automated deployment script that includes all pre-checks and validation:

```bash
# Run automated staging deployment
./scripts/deployment/deploy-staging.sh
```

The script will:
1. ✓ Check prerequisites
2. ✓ Validate environment configuration
3. ✓ Run type checking
4. ✓ Run linting
5. ✓ Run tests
6. ✓ Build application
7. ✓ Create backup
8. ✓ Deploy to Vercel
9. ✓ Run health checks
10. ✓ Run smoke tests

### Manual Deployment Steps

If you need to deploy manually:

#### 1. Pre-Deployment Checks

```bash
# Check Node.js version
node --version  # Should be >= 20.11.0

# Check for uncommitted changes
git status

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests
npm run test:run
```

#### 2. Build Application

```bash
# Clean previous build
npm run clean

# Install dependencies
npm ci --legacy-peer-deps

# Build for staging
NODE_ENV=staging npm run build
```

#### 3. Deploy to Vercel

```bash
# Login to Vercel (if not already)
vercel login

# Link project (first time only)
vercel link

# Deploy to staging
vercel --prod
```

#### 4. Post-Deployment Validation

```bash
# Get deployment URL
STAGING_URL=$(vercel ls | head -n 1 | awk '{print $2}')

# Run health checks
./scripts/deployment/health-check.sh $STAGING_URL

# Run smoke tests
STAGING_URL=$STAGING_URL npm run test:smoke
```

### Vercel Environment Variables

Configure in Vercel dashboard or via CLI:

```bash
# Set environment variables in Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL staging
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY staging
vercel env add SUPABASE_SERVICE_ROLE_KEY staging
vercel env add OPENAI_API_KEY staging
vercel env add API_SECRET_KEY staging
vercel env add JWT_SECRET staging
vercel env add SESSION_SECRET staging
```

## Health Checks

### Automated Health Checks

Run comprehensive health checks:

```bash
# Run all health checks
./scripts/deployment/health-check.sh https://staging.describe-it.yourdomain.com
```

### Manual Health Checks

#### 1. Health Endpoint

```bash
curl -X GET https://staging.describe-it.yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-02T12:00:00.000Z",
  "environment": "staging"
}
```

#### 2. Status Endpoint

```bash
curl -X GET https://staging.describe-it.yourdomain.com/api/status
```

Expected response:
```json
{
  "environment": "staging",
  "version": "1.0.0",
  "nodeVersion": "20.11.0",
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

#### 3. Performance Check

```bash
# Measure response time
time curl -X GET https://staging.describe-it.yourdomain.com/api/health
```

Should complete in < 2 seconds.

#### 4. SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect staging.describe-it.yourdomain.com:443 -servername staging.describe-it.yourdomain.com < /dev/null 2>&1 | grep 'Verify return code'
```

Expected: `Verify return code: 0 (ok)`

### Smoke Tests

Run automated smoke tests:

```bash
# Run smoke test suite
STAGING_URL=https://staging.describe-it.yourdomain.com npm run test:smoke
```

Tests include:
- Homepage loads
- API endpoints respond
- Static assets load
- Security headers present
- Authentication works
- Error handling works
- Performance is acceptable

## Rollback Procedures

### Automated Rollback

If deployment fails or issues are detected:

```bash
# List available backups
./scripts/deployment/rollback.sh

# Or specify backup directly
./scripts/deployment/rollback.sh backups/staging-20251002_120000
```

The rollback script will:
1. Verify backup integrity
2. Restore environment configuration
3. Restore git state
4. Rebuild application
5. Redeploy to Vercel
6. Run health checks

### Manual Rollback

#### Quick Rollback (Vercel)

```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

#### Full Rollback

1. **Restore Environment**
   ```bash
   # Restore from backup
   cp backups/staging-20251002_120000/.env.staging.bak .env.staging
   ```

2. **Restore Git State**
   ```bash
   # Get commit from backup
   git checkout $(cat backups/staging-20251002_120000/git-commit.txt)
   ```

3. **Rebuild & Deploy**
   ```bash
   npm ci --legacy-peer-deps
   NODE_ENV=staging npm run build
   vercel --prod
   ```

### Rollback Checklist

- [ ] Identify the issue
- [ ] Determine rollback target (backup/commit)
- [ ] Notify team of rollback
- [ ] Execute rollback procedure
- [ ] Verify rollback successful
- [ ] Run health checks
- [ ] Document issue for postmortem

## Monitoring

### Real-time Monitoring

#### Vercel Dashboard

1. Navigate to: https://vercel.com/dashboard
2. Select project
3. View:
   - Deployment status
   - Function logs
   - Analytics
   - Edge network status

#### Application Logs

```bash
# Stream Vercel logs
vercel logs --follow

# Filter by function
vercel logs --follow api/health
```

### Health Monitoring Endpoints

Monitor these endpoints continuously:

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/api/health` | Basic health check | 200 OK |
| `/api/status` | Detailed status | Environment info |

### Metrics to Monitor

1. **Performance Metrics**
   - Response times (< 2s)
   - Time to First Byte (TTFB)
   - Largest Contentful Paint (LCP)

2. **Error Rates**
   - 4xx errors (< 1%)
   - 5xx errors (< 0.1%)
   - Unhandled exceptions

3. **Resource Usage**
   - Function duration
   - Memory usage
   - Edge cache hit rate

### Alert Configuration

Set up alerts for:

- [ ] Deployment failures
- [ ] Health check failures
- [ ] High error rates (> 1%)
- [ ] Slow response times (> 5s)
- [ ] SSL certificate expiration (< 30 days)

## Troubleshooting

### Common Issues

#### Build Failures

**Symptom**: Build fails during deployment

**Solutions**:
```bash
# 1. Check for TypeScript errors
npm run typecheck

# 2. Check for dependency issues
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 3. Verify environment variables
npm run validate:env:staging

# 4. Check build logs
cat logs/deployment-*.log
```

#### Environment Variable Issues

**Symptom**: Application errors due to missing/incorrect env vars

**Solutions**:
```bash
# 1. Validate all required variables are set
npm run validate:env:staging

# 2. Check Vercel environment variables
vercel env ls

# 3. Verify .env.staging has all required values
cat .env.staging | grep -v '^#' | grep -v '^$'

# 4. Ensure proper variable prefixes
# NEXT_PUBLIC_ for client-side
# No prefix for server-side only
```

#### Health Check Failures

**Symptom**: `/api/health` returns 500 or times out

**Solutions**:
```bash
# 1. Check function logs
vercel logs api/health

# 2. Verify Supabase connection
curl https://your-staging-project.supabase.co/rest/v1/

# 3. Test locally with staging env
cp .env.staging .env.local
npm run dev
curl http://localhost:3000/api/health

# 4. Check for runtime errors
vercel logs --follow
```

#### Slow Response Times

**Symptom**: Application is slow or timing out

**Solutions**:
```bash
# 1. Check function execution time
vercel logs --follow

# 2. Verify caching is working
curl -I https://staging.describe-it.yourdomain.com/

# 3. Check database connection pooling
# Verify DATABASE_POOL_SIZE in .env.staging

# 4. Enable performance profiling
ANALYZE=true npm run build
```

#### SSL/Certificate Issues

**Symptom**: SSL errors or certificate warnings

**Solutions**:
```bash
# 1. Verify SSL certificate
openssl s_client -connect staging.describe-it.yourdomain.com:443

# 2. Check Vercel SSL settings
vercel certs ls

# 3. Force SSL renewal
vercel certs renew

# 4. Verify DNS configuration
dig staging.describe-it.yourdomain.com
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Set in .env.staging
DEBUG_ENDPOINT_ENABLED=true
LOG_LEVEL=debug
ERROR_REPORTING_LEVEL=debug
```

Access debug endpoint:
```bash
curl https://staging.describe-it.yourdomain.com/api/debug
```

### Getting Help

1. **Check Logs**
   - Deployment logs: `logs/deployment-*.log`
   - Vercel logs: `vercel logs`
   - Application logs: `/api/debug`

2. **Review Documentation**
   - [Vercel Documentation](https://vercel.com/docs)
   - [Next.js Documentation](https://nextjs.org/docs)
   - [Supabase Documentation](https://supabase.com/docs)

3. **Contact Team**
   - DevOps team
   - Backend team
   - Infrastructure team

## Best Practices

### Before Deployment

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Environment variables validated
- [ ] No uncommitted changes
- [ ] Dependencies up to date
- [ ] Security audit completed

### During Deployment

- [ ] Monitor deployment logs
- [ ] Watch for errors
- [ ] Verify build completion
- [ ] Check function deployment
- [ ] Monitor initial traffic

### After Deployment

- [ ] Run health checks
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Document any issues

### Regular Maintenance

- [ ] Weekly dependency updates
- [ ] Monthly security audits
- [ ] Quarterly environment review
- [ ] Regular backup testing
- [ ] Certificate renewal monitoring

## Deployment Checklist

Use this checklist for every staging deployment:

### Pre-Deployment
- [ ] Code merged to staging branch
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Dependencies updated
- [ ] Security keys generated
- [ ] Backup created

### Deployment
- [ ] Pre-deployment checks passed
- [ ] Build successful
- [ ] Deployment completed
- [ ] Health checks passed
- [ ] Smoke tests passed

### Post-Deployment
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Documentation updated
- [ ] Issues logged
- [ ] Metrics baseline established

## Additional Resources

- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [Next.js Production Checklist](https://nextjs.org/docs/deployment)
- [Supabase Production Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

## Support

For deployment support:
- Email: devops@yourdomain.com
- Slack: #staging-deployments
- On-call: [PagerDuty/Schedule]

---

Last Updated: 2025-10-02
Version: 1.0.0
