# 🎨 Visual Deployment Guide - ASCII Edition

**Quick Reference:** Print this page for your deployment

---

## 🗺️ Complete Deployment Map

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    DESCRIBE IT - PRODUCTION DEPLOYMENT                        ║
║                         Complete Visual Workflow                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

START HERE ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 1: GET YOUR ACCOUNTS READY (30 min - YOU DO THIS)                   │
│  ═══════════════════════════════════════════════════════════════           │
│                                                                             │
│  Step 1: Vercel        Step 2: Supabase     Step 3: OpenAI                 │
│  ┌────────────┐        ┌────────────┐       ┌────────────┐                │
│  │   Sign Up  │────▶   │ Create DB  │───▶   │  Get Key   │                │
│  │ vercel.com │        │ supabase.co│       │ openai.com │                │
│  └────────────┘        └────────────┘       └────────────┘                │
│        │                     │                     │                        │
│        ├─────────────────────┴─────────────────────┤                        │
│        ▼                                           ▼                        │
│  Project ID                              API Keys Collected                │
│  prj_xxxxx                               ✓ NEXT_PUBLIC_SUPABASE_URL       │
│  URL: https://                           ✓ SUPABASE_ANON_KEY              │
│  your-app.vercel.app                     ✓ SUPABASE_SERVICE_ROLE          │
│                                          ✓ OPENAI_API_KEY                 │
│                                          ✓ UNSPLASH_ACCESS_KEY             │
│                                                                             │
│  Time: ~30 min         Result: ✓ Accounts ready                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 2: CONFIGURE EVERYTHING (15 min - YOU & CLAUDE)                     │
│  ═══════════════════════════════════════════════════════                   │
│                                                                             │
│  🤖 CLAUDE CODE GENERATES          👤 YOU ADD TO VERCEL                    │
│  ──────────────────────            ─────────────────────                   │
│                                                                             │
│  Tell Claude:                      1. Vercel Dashboard                     │
│  "Generate security keys"          2. Settings → Env Vars                  │
│       │                            3. Paste ALL variables                  │
│       ▼                            4. Set environment scope                │
│  ┌──────────────────┐             5. Save                                 │
│  │ API_SECRET_KEY   │             │                                        │
│  │ JWT_SECRET       │─────────────┤                                        │
│  │ SESSION_SECRET   │             ▼                                        │
│  │ VALID_API_KEYS   │        ┌──────────────────┐                         │
│  └──────────────────┘        │ 25+ Variables    │                         │
│                              │ Configured ✓     │                         │
│  Then Claude runs:           └──────────────────┘                         │
│  ┌──────────────────┐                                                      │
│  │ npm run         │                                                       │
│  │ validate:env    │───▶  ✅ All Required Vars Present                    │
│  └──────────────────┘                                                      │
│                                                                             │
│  Time: ~15 min         Result: ✓ Production configured                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 3: SET UP DATABASE (5 min - CLAUDE DOES IT ALL)                     │
│  ═══════════════════════════════════════════════════════                   │
│                                                                             │
│  🤖 FULLY AUTOMATED - Just say: "Apply database migrations"                │
│                                                                             │
│  ┌──────────────┐                                                          │
│  │ Connect to   │                                                          │
│  │ Supabase DB  │                                                          │
│  └──────────────┘                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │ Run Migration: 001_create_missing_tables.sql            │              │
│  ├─────────────────────────────────────────────────────────┤              │
│  │ [████████████████████████████████████████] 100%         │              │
│  │                                                         │              │
│  │ Creating tables:                                        │              │
│  │ ✓ images              ✓ session_progress               │              │
│  │ ✓ descriptions        ✓ qa_responses                   │              │
│  │ ✓ phrases             ✓ user_settings                  │              │
│  │ ✓ qa_items            ✓ user_preferences               │              │
│  │ ✓ answer_validations  ✓ user_data                      │              │
│  │                       ✓ image_history                   │              │
│  │                                                         │              │
│  │ Applying security:                                      │              │
│  │ ✓ 35 RLS policies applied                              │              │
│  │ ✓ 50+ indexes created                                  │              │
│  │ ✓ 2 analytics views created                            │              │
│  │                                                         │              │
│  │ ✅ Database setup complete!                             │              │
│  └─────────────────────────────────────────────────────────┘              │
│                                                                             │
│  Time: ~5 min          Result: ✓ 11 tables, 35 policies, 50+ indexes      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 4: DEPLOY TO PRODUCTION (5 min - CLAUDE DOES IT ALL)                │
│  ═══════════════════════════════════════════════════════                   │
│                                                                             │
│  🤖 FULLY AUTOMATED - Just say: "Deploy to production"                     │
│                                                                             │
│  Step 1: Pre-flight Checks                                                 │
│  ┌────────────────────────────────────────────┐                            │
│  │ ⚙️  Running checks...                      │                            │
│  ├────────────────────────────────────────────┤                            │
│  │ ✓ TypeCheck:    0 errors, 679 warnings    │                            │
│  │ ✓ Lint:         No critical issues         │                            │
│  │ ✓ Unit Tests:   2,340+ passed              │                            │
│  │ ✓ Integration:  482+ passed                │                            │
│  │ ✓ Security:     0 vulnerabilities          │                            │
│  │ ✓ Build Test:   Successful                 │                            │
│  └────────────────────────────────────────────┘                            │
│                      │                                                      │
│                      ▼                                                      │
│  Step 2: Git Push (triggers auto-deploy)                                   │
│  ┌────────────────────────────────────────────┐                            │
│  │ git add -A                                 │                            │
│  │ git commit -m "production deploy v1.0.0"   │                            │
│  │ git tag v1.0.0                             │                            │
│  │ git push origin main --tags                │                            │
│  └────────────────────────────────────────────┘                            │
│                      │                                                      │
│                      ▼                                                      │
│  Step 3: Vercel Auto-Deploy                                                │
│  ┌────────────────────────────────────────────┐                            │
│  │ 🚀 Vercel Deployment                       │                            │
│  ├────────────────────────────────────────────┤                            │
│  │ ⏳ Installing packages...     ✓            │                            │
│  │ ⏳ Building application...    ✓            │                            │
│  │ ⏳ Optimizing bundles...      ✓            │                            │
│  │ ⏳ Generating static pages... ✓            │                            │
│  │ ⏳ Deploying to edge...       ✓            │                            │
│  │                                            │                            │
│  │ ✅ Deployed!                                │                            │
│  │ URL: https://your-app.vercel.app           │                            │
│  │ Build time: 2m 34s                         │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
│  Time: ~5 min          Result: ✓ Live in production!                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 5: VERIFY DEPLOYMENT (5 min - CLAUDE DOES IT ALL)                   │
│  ═══════════════════════════════════════════════════════                   │
│                                                                             │
│  🤖 FULLY AUTOMATED - Just say: "Verify production deployment"             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ 🔍 Running Production Health Checks...                      │           │
│  ├─────────────────────────────────────────────────────────────┤           │
│  │                                                             │           │
│  │ 1. Application Health                                       │           │
│  │    GET /api/health                                          │           │
│  │    ✓ 200 OK (Response: 123ms)                              │           │
│  │                                                             │           │
│  │ 2. Database Connectivity                                    │           │
│  │    ✓ Supabase connected                                    │           │
│  │    ✓ All 11 tables accessible                              │           │
│  │    ✓ RLS policies active                                   │           │
│  │                                                             │           │
│  │ 3. API Endpoints                                            │           │
│  │    POST /api/images/search         ✓ (234ms)               │           │
│  │    POST /api/descriptions/generate ✓ (456ms)               │           │
│  │    POST /api/qa/generate           ✓ (389ms)               │           │
│  │    POST /api/vocabulary/save       ✓ (145ms)               │           │
│  │                                                             │           │
│  │ 4. Third-Party APIs                                         │           │
│  │    OpenAI API:     ✓ Connected (Quota: OK)                 │           │
│  │    Unsplash API:   ✓ Connected (Rate limit: OK)            │           │
│  │                                                             │           │
│  │ 5. Performance Metrics                                      │           │
│  │    TTFB:  150ms  ✅ (Target: <200ms)                       │           │
│  │    FCP:   800ms  ✅ (Target: <1.8s)                        │           │
│  │    LCP:   1.2s   ✅ (Target: <2.5s)                        │           │
│  │    CLS:   0.05   ✅ (Target: <0.1)                         │           │
│  │                                                             │           │
│  │ 6. Smoke Tests                                              │           │
│  │    ✓ User registration                                      │           │
│  │    ✓ Image search                                           │           │
│  │    ✓ Description generation                                 │           │
│  │    ✓ Q&A generation                                         │           │
│  │    ✓ Vocabulary persistence                                 │           │
│  │                                                             │           │
│  │ ╔════════════════════════════════════════╗                 │           │
│  │ ║  ✅ ALL CHECKS PASSED!                 ║                 │           │
│  │ ║  Production deployment verified        ║                 │           │
│  │ ╚════════════════════════════════════════╝                 │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  Time: ~5 min          Result: ✓ Healthy & performing well                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 6: SET UP MONITORING (10 min - YOU DO THIS)                         │
│  ═══════════════════════════════════════════════════════                   │
│                                                                             │
│  👤 MANUAL SETUP - Configure these dashboards                              │
│                                                                             │
│  1. Vercel Analytics                                                        │
│  ┌────────────────────────────────────────────┐                            │
│  │ Dashboard → Analytics → Enable             │                            │
│  │ Configure alerts:                          │                            │
│  │ • Error rate > 1%                          │                            │
│  │ • Response time > 1s                       │                            │
│  │ • 4xx errors > 5%                          │                            │
│  │ • 5xx errors > 0.1%                        │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
│  2. Supabase Monitoring                                                     │
│  ┌────────────────────────────────────────────┐                            │
│  │ Dashboard → Reports → Enable               │                            │
│  │ Set alerts:                                │                            │
│  │ • Database CPU > 80%                       │                            │
│  │ • Connections > 80%                        │                            │
│  │ • Disk usage > 80%                         │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
│  3. Cost Alerts (Important!)                                                │
│  ┌────────────────────────────────────────────┐                            │
│  │ OpenAI: Set spending limit ($10/month)     │                            │
│  │ Vercel: Monitor usage dashboard            │                            │
│  │ Supabase: Check DB size & API requests     │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
│  Time: ~10 min         Result: ✓ Monitoring active                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │  🎉 YOU'RE LIVE!  │
                          │                   │
                          │  Production is:   │
                          │  ✓ Deployed       │
                          │  ✓ Verified       │
                          │  ✓ Monitored      │
                          └───────────────────┘
```

---

## 📊 Role Distribution

```
╔════════════════════════════════════════════════════════════════════╗
║              WHO DOES WHAT - VISUAL BREAKDOWN                       ║
╚════════════════════════════════════════════════════════════════════╝

👤 YOU (Manual Tasks)                    🤖 CLAUDE CODE (Automated)
═══════════════════════                  ═══════════════════════════

Phase 1: Infrastructure (30 min)
├─ Create Vercel account
├─ Create Supabase database
├─ Get OpenAI API key
├─ Get Unsplash API key
└─ Collect all credentials

Phase 2: Configuration (7 min)           Phase 2: Configuration (8 min)
├─ Add env vars to Vercel                ├─ Generate security keys
└─ Set environment scopes                ├─ Validate configuration
                                         └─ Create .env template

                                         Phase 3: Database (5 min)
                                         ├─ Connect to database
                                         ├─ Apply migrations
                                         ├─ Create 11 tables
                                         ├─ Set up 35 RLS policies
                                         ├─ Create 50+ indexes
                                         └─ Verify setup

                                         Phase 4: Deployment (5 min)
                                         ├─ Run pre-flight checks
                                         ├─ Execute tests (2,800+)
                                         ├─ Build application
                                         ├─ Commit & tag release
                                         └─ Push to trigger deploy

Phase 4: Monitor Deploy (2 min)
└─ Watch Vercel dashboard

                                         Phase 5: Verification (5 min)
                                         ├─ Health checks
                                         ├─ API endpoint tests
                                         ├─ Performance metrics
                                         ├─ Smoke tests
                                         └─ Generate report

Phase 6: Monitoring (10 min)
├─ Enable Vercel Analytics
├─ Set up Supabase alerts
├─ Configure cost alerts
└─ Add notification channels

─────────────────────────────────────────────────────────────────────
TOTAL TIME:
👤 You:     ~49 minutes (one-time setup)
🤖 Claude:  ~23 minutes (fully automated)

TOTAL DEPLOYMENT: ~1 hour 12 minutes
```

---

## 🔄 Deployment Flow States

```
╔════════════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT STATE MACHINE                         ║
╚════════════════════════════════════════════════════════════════════╝

                         ┌──────────────┐
                    ┌────│   START      │
                    │    └──────────────┘
                    │
                    ▼
            ┌───────────────┐
            │  NOT DEPLOYED │  ← Initial state
            └───────────────┘
                    │
        Manual      │
        Setup       ▼
            ┌───────────────┐
            │  CONFIGURED   │  ← API keys set
            └───────────────┘
                    │
        Database    │
        Migration   ▼
            ┌───────────────┐
            │  DB READY     │  ← Tables created
            └───────────────┘
                    │
        Build &     │
        Test        ▼
            ┌───────────────┐        ┌──────────────┐
            │  VALIDATED    │───────▶│  BUILD FAIL  │
            └───────────────┘        └──────────────┘
                    │                        │
        Git Push    │                        │ Fix & Retry
                    ▼                        │
            ┌───────────────┐                │
            │  DEPLOYING    │◀───────────────┘
            └───────────────┘
                    │
        Vercel      │
        Build       ▼
            ┌───────────────┐        ┌──────────────┐
            │  DEPLOYED     │───────▶│ DEPLOY FAIL  │
            └───────────────┘        └──────────────┘
                    │                        │
        Health      │                        │ Rollback
        Checks      ▼                        │
            ┌───────────────┐                │
            │  VERIFIED     │◀───────────────┘
            └───────────────┘
                    │
        Monitoring  │
        Setup       ▼
            ┌───────────────┐
            │  PRODUCTION   │  ← Final state ✅
            └───────────────┘
                    │
                    │ (Continuous monitoring)
                    │
                    ▼
            ┌───────────────┐        ┌──────────────┐
            │  HEALTHY      │───────▶│   DEGRADED   │
            └───────────────┘        └──────────────┘
                    ▲                        │
                    │                        │
                    └────────────────────────┘
                         (Auto-recovery or manual fix)
```

---

## 🔐 Security Checklist Visual

```
╔════════════════════════════════════════════════════════════════════╗
║                    SECURITY VERIFICATION                            ║
╚════════════════════════════════════════════════════════════════════╝

Before going live, verify each item:

┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  🔒 ENVIRONMENT VARIABLES                                          │
│  ─────────────────────────                                         │
│  ┌─────────────────────────────────────────┐                      │
│  │ ✓ All production keys are unique        │                      │
│  │ ✓ No development keys in production     │                      │
│  │ ✓ Sensitive keys not in Git             │                      │
│  │ ✓ NEXT_PUBLIC_ used only for safe vars  │                      │
│  └─────────────────────────────────────────┘                      │
│                                                                    │
│  🛡️ API SECURITY                                                   │
│  ───────────────                                                   │
│  ┌─────────────────────────────────────────┐                      │
│  │ ✓ DEBUG_ENDPOINT_ENABLED=false          │                      │
│  │ ✓ API_SECRET_KEY is 32+ bytes           │                      │
│  │ ✓ JWT_SECRET is unique & strong         │                      │
│  │ ✓ Rate limiting configured               │                      │
│  │ ✓ CORS restricted to production domain   │                      │
│  └─────────────────────────────────────────┘                      │
│                                                                    │
│  🔐 DATABASE SECURITY                                              │
│  ───────────────────                                               │
│  ┌─────────────────────────────────────────┐                      │
│  │ ✓ RLS enabled on all tables             │                      │
│  │ ✓ Service role key secured               │                      │
│  │ ✓ Anon key has minimal permissions       │                      │
│  │ ✓ Connection pooling enabled             │                      │
│  │ ✓ SSL/TLS enforced                        │                      │
│  └─────────────────────────────────────────┘                      │
│                                                                    │
│  🌐 WEB SECURITY                                                   │
│  ──────────────                                                    │
│  ┌─────────────────────────────────────────┐                      │
│  │ ✓ FORCE_HTTPS=true                       │                      │
│  │ ✓ Security headers enabled               │                      │
│  │ ✓ CSP configured                          │                      │
│  │ ✓ X-Frame-Options: DENY                   │                      │
│  │ ✓ X-Content-Type-Options: nosniff         │                      │
│  └─────────────────────────────────────────┘                      │
│                                                                    │
│  💰 COST PROTECTION                                                │
│  ──────────────────                                                │
│  ┌─────────────────────────────────────────┐                      │
│  │ ✓ OpenAI spending limit set              │                      │
│  │ ✓ Vercel usage alerts configured         │                      │
│  │ ✓ Supabase tier appropriate               │                      │
│  │ ✓ Alert on unexpected costs               │                      │
│  └─────────────────────────────────────────┘                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

If ALL boxes checked ✓ → Safe to proceed
If ANY box unchecked ❌ → Fix before deploying!
```

---

## 🚨 Emergency Procedures

```
╔════════════════════════════════════════════════════════════════════╗
║                    🚨 EMERGENCY ROLLBACK                            ║
╚════════════════════════════════════════════════════════════════════╝

IF PRODUCTION IS BROKEN:

        ┌─────────────────┐
        │ 🔥 ISSUE         │
        │ DETECTED!       │
        └─────────────────┘
                │
                ▼
        ┌─────────────────┐
        │ Is it critical? │
        └─────────────────┘
          │           │
      YES │           │ NO
          │           │
          ▼           ▼
    ┌──────────┐  ┌──────────┐
    │ ROLLBACK │  │ MONITOR  │
    │  NOW!    │  │ & DEBUG  │
    └──────────┘  └──────────┘
          │
          ▼
┌─────────────────────────────┐
│ ROLLBACK OPTIONS:           │
├─────────────────────────────┤
│                             │
│ Option A: Vercel Rollback   │
│ (2 minutes)                 │
│ ┌─────────────────────────┐ │
│ │ 1. Vercel Dashboard     │ │
│ │ 2. Deployments tab      │ │
│ │ 3. Find last good       │ │
│ │ 4. Click "..."          │ │
│ │ 5. "Promote to Prod"    │ │
│ │ 6. Confirm              │ │
│ │ ✅ Done in 30 seconds   │ │
│ └─────────────────────────┘ │
│                             │
│ Option B: Git Revert        │
│ (5 minutes)                 │
│ ┌─────────────────────────┐ │
│ │ git revert HEAD         │ │
│ │ git push origin main    │ │
│ │ (Triggers redeploy)     │ │
│ │ ✅ Done in ~3 minutes   │ │
│ └─────────────────────────┘ │
│                             │
│ Option C: Database Rollback │
│ ⚠️  USE ONLY IF CRITICAL!   │
│ ┌─────────────────────────┐ │
│ │ Supabase SQL Editor     │ │
│ │ Run: *_rollback.sql     │ │
│ │ ⚠️ DELETES DATA!        │ │
│ │ ✅ Done in ~1 minute    │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
          │
          ▼
    ┌──────────┐
    │ VERIFY   │
    │ FIXED    │
    └──────────┘
          │
      YES │
          ▼
    ┌──────────┐
    │ DOCUMENT │
    │ INCIDENT │
    └──────────┘
          │
          ▼
    ┌──────────┐
    │ POST-    │
    │ MORTEM   │
    └──────────┘
```

---

## 📈 Success Metrics Dashboard

```
╔════════════════════════════════════════════════════════════════════╗
║                 WHAT "SUCCESS" LOOKS LIKE                           ║
╚════════════════════════════════════════════════════════════════════╝

After deployment, you should see:

┌────────────────────────────────────────────────────────────────────┐
│ PERFORMANCE METRICS                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Response Times:                 Target         Actual             │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ TTFB                    < 200ms    [██████░░] 150ms  │         │
│  │ First Contentful Paint  < 1.8s     [█████░░░] 0.8s   │         │
│  │ Largest Contentful Paint< 2.5s     [████░░░░] 1.2s   │         │
│  │ Cumulative Layout Shift < 0.1      [█░░░░░░░] 0.05   │         │
│  │ Time to Interactive     < 3.8s     [███░░░░░] 1.5s   │         │
│  └──────────────────────────────────────────────────────┘         │
│                                                                    │
│  ✅ All metrics in "Good" range                                   │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ AVAILABILITY                                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Uptime:          99.9%  ✅                                        │
│  Error Rate:      < 1%   ✅                                        │
│  API Success:     > 99%  ✅                                        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ DATABASE HEALTH                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Connections:     [████░░] 23/100  ✅                             │
│  CPU Usage:       [███░░░] 15%     ✅                             │
│  Memory:          [████░░] 30%     ✅                             │
│  Disk:            [██░░░░] 12%     ✅                             │
│  Query Time:      < 100ms avg      ✅                             │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ COST TRACKING (Daily)                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  OpenAI:          $0.50  / $10.00  budget  ✅                     │
│  Vercel:          $0.00  (included)        ✅                     │
│  Supabase:        $0.00  (free tier)       ✅                     │
│  Total/day:       $0.50                    ✅                     │
│  Projected/mo:    ~$15                     ✅                     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Command Reference

```
╔════════════════════════════════════════════════════════════════════╗
║                    COMMAND CHEAT SHEET                              ║
╚════════════════════════════════════════════════════════════════════╝

📋 COPY & PASTE THESE COMMANDS:

┌─ WHAT TO SAY TO CLAUDE CODE ────────────────────────────────────────┐
│                                                                     │
│  Phase 2: Configuration                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ "Generate all security keys for production deployment"       │  │
│  │ "Validate my production environment configuration"           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Phase 3: Database                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ "Apply all database migrations to production database"       │  │
│  │ "Verify database setup is correct"                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Phase 4: Deployment                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ "Run pre-deployment checks and prepare for production deploy"│  │
│  │ "Deploy to production"                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Phase 5: Verification                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ "Verify production deployment is healthy"                    │  │
│  │ "Run smoke tests on production"                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Emergency                                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ "Roll back to previous production version"                   │  │
│  │ "Check production health status"                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─ WHAT TO TYPE IN TERMINAL ──────────────────────────────────────────┐
│                                                                     │
│  Generate keys manually:                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ node -e "console.log(require('crypto')                       │  │
│  │   .randomBytes(32).toString('hex'))"                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Validate environment:                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ npm run validate:env:prod                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Run tests:                                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ npm run test:run                                             │  │
│  │ npm run test:e2e                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Build:                                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ npm run build                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Health check:                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ curl https://your-app.vercel.app/api/health                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─ IMPORTANT URLS ────────────────────────────────────────────────────┐
│                                                                     │
│  Vercel Dashboard:    https://vercel.com/dashboard                 │
│  Supabase Dashboard:  https://supabase.com/dashboard               │
│  OpenAI Usage:        https://platform.openai.com/usage            │
│  Your Production:     https://your-app.vercel.app                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

**🎉 Print this guide and check off each step as you complete it!**

**📌 Pro Tip:** Keep this page open in a browser tab during deployment for quick reference.

**⏱️ Total Time:** ~1 hour from start to production-ready application
