# Staging Deployment Checklist

Quick reference checklist for staging deployments. Print or save for easy access during deployments.

## Pre-Deployment (30 minutes)

### Environment Preparation
- [ ] `.env.staging` file created and configured
- [ ] All API keys configured (Supabase, OpenAI, Unsplash)
- [ ] Security keys generated (API_SECRET_KEY, JWT_SECRET, SESSION_SECRET)
- [ ] Environment variables validated (`npm run validate:env:staging`)
- [ ] Vercel project linked and configured

### Code Quality
- [ ] Latest code pulled from repository
- [ ] No uncommitted changes (`git status` clean)
- [ ] All merge conflicts resolved
- [ ] Code review approved
- [ ] Branch is staging or approved release branch

### Testing
- [ ] All unit tests pass (`npm run test:run`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] No critical security vulnerabilities (`npm audit`)

### Dependencies
- [ ] `node_modules` installed (`npm ci --legacy-peer-deps`)
- [ ] No dependency conflicts
- [ ] Optional dependencies handled
- [ ] Lock file committed

## Deployment (15 minutes)

### Build Process
- [ ] Clean build directory (`npm run clean`)
- [ ] Production build successful (`NODE_ENV=staging npm run build`)
- [ ] Build output verified (`.next` directory exists)
- [ ] No build warnings or errors
- [ ] Source maps generated (if enabled)

### Backup
- [ ] Deployment backup created
- [ ] Environment file backed up
- [ ] Git commit hash recorded
- [ ] Backup location documented

### Deploy to Vercel
- [ ] Vercel CLI authenticated (`vercel whoami`)
- [ ] Deployment initiated (`vercel --prod`)
- [ ] Deployment URL received
- [ ] Environment variables set in Vercel dashboard
- [ ] Domain configured (if applicable)

## Post-Deployment (15 minutes)

### Health Checks
- [ ] Health endpoint responding (`/api/health`)
- [ ] Status endpoint responding (`/api/status`)
- [ ] Response times < 2 seconds
- [ ] No 500 errors in logs
- [ ] SSL certificate valid

### Functional Testing
- [ ] Homepage loads successfully
- [ ] Navigation works
- [ ] Static assets load
- [ ] API endpoints respond correctly
- [ ] Authentication works (if applicable)

### Smoke Tests
- [ ] Automated smoke tests pass (`npm run test:smoke`)
- [ ] Critical user flows work
- [ ] No console errors
- [ ] No unhandled exceptions

### Security Validation
- [ ] Security headers present
- [ ] HTTPS redirect works
- [ ] API endpoints protected
- [ ] Rate limiting active
- [ ] CORS configured correctly

### Performance Checks
- [ ] Page load time < 3 seconds
- [ ] Time to First Byte (TTFB) < 500ms
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] No memory leaks detected
- [ ] Caching working

## Monitoring Setup (10 minutes)

### Logging
- [ ] Vercel logs accessible (`vercel logs`)
- [ ] Log level set to appropriate value
- [ ] Error tracking active (Sentry)
- [ ] Application logs viewable

### Alerts
- [ ] Deployment notifications sent
- [ ] Error alerts configured
- [ ] Performance alerts set
- [ ] Health check monitoring active

### Metrics
- [ ] Baseline metrics recorded
- [ ] Analytics configured
- [ ] Performance monitoring active
- [ ] Resource usage tracked

## Documentation (5 minutes)

### Record Keeping
- [ ] Deployment time recorded
- [ ] Deployment URL documented
- [ ] Git commit hash noted
- [ ] Team notified

### Update Documentation
- [ ] CHANGELOG updated (if applicable)
- [ ] Deployment log created
- [ ] Known issues documented
- [ ] Runbook updated

## Verification (10 minutes)

### Manual Testing
- [ ] Test major features manually
- [ ] Verify UI/UX working correctly
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Verify responsive design

### Data Validation
- [ ] Database connections working
- [ ] Data queries returning correctly
- [ ] No data corruption
- [ ] Migrations applied (if any)

### Integration Testing
- [ ] External API integrations working
- [ ] Third-party services connected
- [ ] Webhooks functioning
- [ ] Background jobs running

## Rollback Readiness

### Rollback Plan
- [ ] Rollback procedure reviewed
- [ ] Previous deployment identified
- [ ] Rollback script tested
- [ ] Team aware of rollback process

### Backup Verification
- [ ] Backup integrity verified
- [ ] Backup accessible
- [ ] Restore procedure documented
- [ ] Recovery time objective (RTO) acceptable

## Sign-Off

### Deployment Approval
- [ ] QA team notified
- [ ] Stakeholders informed
- [ ] Product owner approval
- [ ] Deployment successful

### Final Checks
- [ ] All checklist items completed
- [ ] No critical issues found
- [ ] Monitoring active
- [ ] Documentation complete

---

## Quick Commands Reference

```bash
# Environment validation
npm run validate:env:staging

# Run all tests
npm run test:run

# Type check
npm run typecheck

# Lint
npm run lint

# Build
NODE_ENV=staging npm run build

# Deploy
./scripts/deployment/deploy-staging.sh

# Health check
./scripts/deployment/health-check.sh https://staging.describe-it.yourdomain.com

# Smoke tests
STAGING_URL=https://staging.describe-it.yourdomain.com npm run test:smoke

# Rollback
./scripts/deployment/rollback.sh
```

## Emergency Contacts

- **DevOps Lead**: [Name/Contact]
- **Backend Lead**: [Name/Contact]
- **Infrastructure**: [On-call rotation]
- **Emergency Hotline**: [Number]

## Deployment Times

- **Estimated Total Time**: 80 minutes
- **Pre-Deployment**: 30 minutes
- **Deployment**: 15 minutes
- **Post-Deployment**: 15 minutes
- **Monitoring Setup**: 10 minutes
- **Documentation**: 5 minutes
- **Verification**: 10 minutes

## Notes

- This checklist should be followed for every staging deployment
- Skip items marked as optional only after approval
- Document any deviations from the checklist
- Update checklist based on lessons learned

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Deployment ID**: _______________
**Approved By**: _______________

---

Last Updated: 2025-10-02
Version: 1.0.0
