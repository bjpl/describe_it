# 🚀 Deploy to Staging - Quick Guide

## What We're Doing
Deploying to Vercel staging environment for real-world testing (Ship It and Iterate approach).

## Pre-Deployment Status ✅
- [x] Vercel project configured: `describe-it`
- [x] Build succeeds locally (1m46s)
- [x] Dev server running (http://localhost:3000)
- [x] TypeScript errors reduced 87.5% (160→20)
- [x] Sentry monitoring configured
- [x] Tests created (157 tests, 74.3% pass rate)

## Critical Environment Variables

### Required for Staging (Must Set in Vercel)

```bash
# AI Provider (Primary)
ANTHROPIC_API_KEY=sk-ant-xxx

# Database & Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Image Search
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=xxx
UNSPLASH_ACCESS_KEY=xxx

# Security (Generate new for staging!)
API_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
SENTRY_ENVIRONMENT=staging

# App Config
NEXT_PUBLIC_APP_URL=https://describe-it-staging.vercel.app
NODE_ENV=production
```

## Deployment Commands

### Option 1: Deploy to Preview (Recommended First)
```bash
# Deploy current branch to preview environment
vercel

# This creates a unique preview URL for testing
# Example: https://describe-it-git-main-xxx.vercel.app
```

### Option 2: Deploy to Staging Alias
```bash
# Deploy with specific alias
vercel --prod --alias describe-it-staging

# Creates: https://describe-it-staging.vercel.app
```

### Option 3: One-Command Deploy
```bash
# Build, deploy, and alias in one go
npm run build && vercel --prod
```

## Post-Deployment Testing Checklist

### Manual QA (15 minutes)
- [ ] Visit staging URL
- [ ] Test image search (Unsplash)
- [ ] Generate description with Claude
- [ ] Test Q&A generation
- [ ] Test translation
- [ ] Check auth flow (login/logout)
- [ ] Open browser console - check for errors
- [ ] Check Sentry dashboard - verify events

### Automated Checks
```bash
# Health check
curl https://describe-it-staging.vercel.app/api/health

# Run E2E tests against staging
npm run test:e2e:staging

# Check Sentry errors
# Visit: https://sentry.io/organizations/xxx/projects/describe-it/
```

## Known Issues to Monitor

### From QA Report (Expected):
1. **20 TypeScript null/undefined edge cases** - Non-blocking
2. **Database not migrated yet** - User data won't persist
3. **4 claude-server test mocks** - Non-critical
4. **12 localStorage advanced features** - Nice-to-have

### What to Watch For:
- ⚠️ Claude API costs (monitor token usage)
- ⚠️ Response times (target <3s for descriptions)
- ⚠️ Authentication errors
- ⚠️ Image search failures
- ⚠️ CORS issues

## Rollback Plan

If critical issues found:
```bash
# Rollback to previous deployment
vercel rollback

# Or deploy specific commit
git checkout <previous-commit>
vercel --prod
```

## Monitoring URLs

- **Staging App**: https://describe-it-staging.vercel.app
- **Vercel Dashboard**: https://vercel.com/xxx/describe-it
- **Sentry Dashboard**: https://sentry.io/organizations/xxx/projects/describe-it/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/arjrpdccaczbybbrchvc

## Success Criteria

**Staging is successful if:**
- ✅ App loads without errors
- ✅ Can search for images
- ✅ Can generate descriptions (even if slow)
- ✅ Authentication works (login/logout)
- ✅ Sentry captures errors
- ✅ No CORS blocking

**Don't worry about:**
- ❌ Perfect performance (will optimize)
- ❌ All tests passing (will fix iteratively)
- ❌ Database features (not migrated yet)
- ❌ TypeScript errors (20 remaining, non-blocking)

## Next Steps After Staging

Based on real usage data:
1. Fix critical issues discovered
2. Execute database migration
3. Optimize slow endpoints
4. Fix high-impact TypeScript errors
5. Deploy to production

---

**Remember: Ship it and iterate! Real feedback > Perfect code**
