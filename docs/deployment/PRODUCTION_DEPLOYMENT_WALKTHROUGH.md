# 🚀 Production Deployment Walkthrough

**Last Updated:** 2025-10-03
**Application:** Describe It
**Target Platform:** Vercel + Supabase
**Node Version:** >=20.11.0

---

## 📋 Table of Contents

1. [Quick Overview](#quick-overview)
2. [Prerequisites](#prerequisites)
3. [Visual Workflow](#visual-workflow)
4. [Phase 1: Infrastructure Setup (Manual)](#phase-1-infrastructure-setup-manual)
5. [Phase 2: Configuration (Mixed)](#phase-2-configuration-mixed)
6. [Phase 3: Database Setup (Automated)](#phase-3-database-setup-automated)
7. [Phase 4: Deployment (Automated)](#phase-4-deployment-automated)
8. [Phase 5: Verification (Automated)](#phase-5-verification-automated)
9. [Phase 6: Monitoring (Manual)](#phase-6-monitoring-manual)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Quick Overview

### What You'll Do Manually (≈30 minutes)
- Create Vercel account & project
- Create Supabase account & database
- Obtain API keys (OpenAI, Unsplash, etc.)
- Configure DNS settings
- Set up monitoring dashboards

### What Claude Code Does Automatically (≈15 minutes)
- Generate security keys
- Configure environment variables
- Apply database migrations
- Run tests
- Deploy application
- Verify deployment health
- Set up monitoring alerts

---

## Prerequisites

### Required Accounts
- [ ] **Vercel Account** - https://vercel.com/signup
- [ ] **Supabase Account** - https://supabase.com/dashboard/sign-up
- [ ] **OpenAI Account** - https://platform.openai.com/signup
- [ ] **Unsplash Developer Account** - https://unsplash.com/developers

### Optional Accounts
- [ ] **Sentry** (Error Monitoring) - https://sentry.io/signup
- [ ] **Redis Cloud** (Caching) - https://redis.com/try-free

### Local Requirements
- [ ] Node.js >=20.11.0
- [ ] npm >=10.0.0
- [ ] Git
- [ ] Claude Code installed

### Estimated Costs (Monthly)
```
Vercel:     $0 - $20  (Hobby tier free, Pro $20/mo)
Supabase:   $0 - $25  (Free tier available, Pro $25/mo)
OpenAI:     $5 - $50  (Pay per use)
Unsplash:   $0        (Free tier: 50 req/hour)
Redis:      $0 - $5   (Optional, free tier available)
Sentry:     $0 - $29  (Optional, Developer tier free)
───────────────────────────────────────────────────
TOTAL:      $5 - $129/mo (Free tier: ~$5/mo)
```

---

## Visual Workflow

### 🗺️ ASCII Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PRODUCTION DEPLOYMENT FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: INFRASTRUCTURE SETUP (Manual - 30 min)
═══════════════════════════════════════════════════════════════════════

┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Vercel   │────▶│ Supabase  │────▶│  OpenAI   │────▶│ Unsplash  │
│  Account  │     │  Database │     │  API Key  │     │  API Key  │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
     │                  │                  │                  │
     └──────────────────┴──────────────────┴──────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Collect API     │
                    │  Keys & Secrets  │
                    └──────────────────┘
                              │
                              ▼

Phase 2: CONFIGURATION (Mixed - 15 min)
═══════════════════════════════════════════════════════════════════════

    🤖 CLAUDE CODE                      👤 YOU (Manual)
    ───────────────                     ────────────────
┌────────────────────┐              ┌─────────────────┐
│ Generate security  │              │ Copy API keys   │
│ keys (JWT, API)    │              │ to Vercel       │
└────────────────────┘              └─────────────────┘
         │                                   │
         ├──────────────┬────────────────────┤
         ▼              ▼                    ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────────┐
│ Create .env │  │ Validate    │  │ Set Vercel      │
│ template    │  │ config      │  │ env variables   │
└─────────────┘  └─────────────┘  └─────────────────┘
         │              │                    │
         └──────────────┴────────────────────┘
                        ▼

Phase 3: DATABASE SETUP (Automated - 5 min)
═══════════════════════════════════════════════════════════════════════

    🤖 CLAUDE CODE (All Automated)
    ──────────────────────────────
         ┌────────────────┐
         │ Connect to     │
         │ Supabase DB    │
         └────────────────┘
                │
         ┌──────┴──────┐
         ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Apply        │  │ Create       │
│ Migration    │  │ 11 Tables    │
│ 001          │  │              │
└──────────────┘  └──────────────┘
         │             │
         └──────┬──────┘
                ▼
       ┌─────────────────┐
       │ Set up RLS      │
       │ Policies (35)   │
       └─────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐  ┌──────────────┐
│ Create      │  │ Verify all   │
│ Indexes     │  │ tables exist │
│ (50+)       │  │              │
└─────────────┘  └──────────────┘
       │                 │
       └────────┬────────┘
                ▼
        ┌──────────────┐
        │ DB Ready ✓   │
        └──────────────┘

Phase 4: DEPLOYMENT (Automated - 5 min)
═══════════════════════════════════════════════════════════════════════

    🤖 CLAUDE CODE                      👤 YOU
    ──────────────                      ──────
┌─────────────────┐              ┌──────────────────┐
│ Run build       │              │ Monitor Vercel   │
│ (TypeScript +   │              │ dashboard for    │
│ Next.js)        │              │ progress         │
└─────────────────┘              └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Run type check  │
│ (679 warnings)  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Run tests       │
│ (unit + int.)   │
└─────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Pass?  │ │ Fail?  │
└────────┘ └────────┘
    │           │
    │           └──▶ Fix issues ──▶ Retry
    ▼
┌──────────────────┐
│ Push to Git      │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Vercel auto-     │
│ deploys from Git │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Build succeeds   │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Deploy to        │
│ production URL   │
└──────────────────┘

Phase 5: VERIFICATION (Automated - 5 min)
═══════════════════════════════════════════════════════════════════════

    🤖 CLAUDE CODE
    ──────────────
┌──────────────────┐
│ Health check     │
│ /api/health      │
└──────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ 200 OK │ │ Error  │
└────────┘ └────────┘
    │           │
    │           └──▶ Debug logs ──▶ Fix
    ▼
┌──────────────────┐
│ Test API         │
│ endpoints        │
└──────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Images  │ │ QA Gen   │
│ Search  │ │          │
└─────────┘ └──────────┘
    │         │
    └────┬────┘
         ▼
┌──────────────────┐
│ Run smoke tests  │
│ (critical paths) │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Verify metrics   │
│ collection       │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ ✅ DEPLOYED!     │
└──────────────────┘

Phase 6: MONITORING (Manual Setup - 10 min)
═══════════════════════════════════════════════════════════════════════

    👤 YOU (Manual Dashboard Setup)
    ───────────────────────────────
         ┌────────────────┐
         │ Vercel         │
         │ Analytics      │
         └────────────────┘
                │
         ┌──────┴──────┐
         ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Supabase     │  │ Sentry       │
│ Monitoring   │  │ Error Track  │
└──────────────┘  └──────────────┘
         │             │
         └──────┬──────┘
                ▼
       ┌─────────────────┐
       │ Set up alerts   │
       └─────────────────┘
```

---

## Phase 1: Infrastructure Setup (Manual)

### Step 1.1: Create Vercel Project (5 min)

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS MANUALLY                        │
└─────────────────────────────────────────────────────┘

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub/GitLab repository
4. Configure:
   ┌────────────────────────────────────────┐
   │ Project Name: describe-it-production   │
   │ Framework:    Next.js                  │
   │ Root Dir:     ./                       │
   │ Build Cmd:    npm run build            │
   │ Output Dir:   .next                    │
   └────────────────────────────────────────┘

5. DO NOT deploy yet - click "Skip" for now
6. Save your Vercel Project ID (Settings → General)

✅ Expected Result:
   Project created but not deployed
   URL: https://describe-it-production.vercel.app
```

**What to capture:**
```
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxx
VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://describe-it-production.vercel.app
```

---

### Step 1.2: Create Supabase Database (10 min)

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS MANUALLY                        │
└─────────────────────────────────────────────────────┘

1. Go to: https://supabase.com/dashboard
2. Click "New project"
3. Configure:
   ┌────────────────────────────────────────┐
   │ Organization: [Your org]               │
   │ Project Name: describe-it-prod         │
   │ Database Password: [STRONG PASSWORD]   │
   │ Region: [Closest to users]             │
   │ Plan: Free (can upgrade later)         │
   └────────────────────────────────────────┘

4. Wait 2-3 minutes for provisioning
5. Navigate to: Settings → API
6. Copy these values:

   ┌────────────────────────────────────────┐
   │ Project URL:     https://xxx.supabase.co│
   │ Anon Key:        eyJhbGci...           │
   │ Service Role:    eyJhbGci...           │
   │ Project Ref:     abcdefghij            │
   └────────────────────────────────────────┘

7. Navigate to: Settings → Database
8. Copy Database URL (Connection string)
```

**What to capture:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
```

---

### Step 1.3: Obtain API Keys (10 min)

#### OpenAI API Key

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS MANUALLY                        │
└─────────────────────────────────────────────────────┘

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name: "describe-it-production"
4. Permissions: All
5. Copy the key (shown only once!)
6. Add payment method if not done:
   Settings → Billing → Add payment method

💡 Tip: Set a spending limit!
   Settings → Billing → Usage limits → $10/month
```

**What to capture:**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # Cost-effective
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

#### Unsplash API Key

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS MANUALLY                        │
└─────────────────────────────────────────────────────┘

1. Go to: https://unsplash.com/oauth/applications
2. Click "New Application"
3. Accept terms & conditions
4. Configure:
   ┌────────────────────────────────────────┐
   │ App Name: Describe It                  │
   │ Description: Language learning app     │
   └────────────────────────────────────────┘
5. Copy Access Key
```

**What to capture:**
```
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=xxxxxxxxxxxxxxx
UNSPLASH_ACCESS_KEY=xxxxxxxxxxxxxxx
```

---

### Step 1.4: Optional Services (5 min)

#### Sentry (Error Monitoring) - Optional

```
┌─────────────────────────────────────────────────────┐
│ 👤 OPTIONAL - Skip if you don't need error tracking │
└─────────────────────────────────────────────────────┘

1. Go to: https://sentry.io/signup
2. Create project → Next.js
3. Copy DSN from Settings → Projects → describe-it → Client Keys

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxx
```

#### Redis Cloud (Caching) - Optional

```
┌─────────────────────────────────────────────────────┐
│ 👤 OPTIONAL - App works without Redis               │
└─────────────────────────────────────────────────────┘

1. Go to: https://redis.com/try-free
2. Create database
3. Copy endpoint & password

REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]
REDIS_PASSWORD=your-password
ENABLE_REDIS_CACHE=true
```

---

## Phase 2: Configuration (Mixed)

### Step 2.1: Generate Security Keys (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Generate all security keys for production deployment"

Claude will run:
┌─────────────────────────────────────────────────────┐
│ node -e "console.log(require('crypto')              │
│   .randomBytes(32).toString('hex'))"                │
│                                                     │
│ And generate:                                       │
│ - API_SECRET_KEY (32 bytes)                         │
│ - JWT_SECRET (32 bytes)                             │
│ - SESSION_SECRET (16 bytes)                         │
│ - VALID_API_KEYS (5 random keys)                    │
└─────────────────────────────────────────────────────┘
```

**Example output:**
```
API_SECRET_KEY=a1b2c3d4e5f6...
JWT_SECRET=f6e5d4c3b2a1...
SESSION_SECRET=9f8e7d6c5b4a...
VALID_API_KEYS=key1_xxx,key2_xxx,key3_xxx,key4_xxx,key5_xxx
```

---

### Step 2.2: Configure Vercel Environment Variables (Manual)

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS MANUALLY IN VERCEL DASHBOARD    │
└─────────────────────────────────────────────────────┘

1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add ALL these variables (click "Add" for each):

┌───────────────────────────────────────────────────────────────────┐
│                    REQUIRED VARIABLES                              │
├───────────────────────────────────────────────────────────────────┤
│ Variable Name                  │ Value              │ Environment  │
├────────────────────────────────┼────────────────────┼──────────────┤
│ NODE_ENV                       │ production         │ Production   │
│ NEXT_PUBLIC_APP_URL            │ https://your.app   │ Production   │
│ NEXT_PUBLIC_SUPABASE_URL       │ [from Step 1.2]    │ All          │
│ NEXT_PUBLIC_SUPABASE_ANON_KEY  │ [from Step 1.2]    │ All          │
│ SUPABASE_SERVICE_ROLE_KEY      │ [from Step 1.2]    │ Production   │
│ OPENAI_API_KEY                 │ [from Step 1.3]    │ Production   │
│ OPENAI_MODEL                   │ gpt-4o-mini        │ Production   │
│ OPENAI_MAX_TOKENS              │ 1000               │ Production   │
│ OPENAI_TEMPERATURE             │ 0.7                │ Production   │
│ UNSPLASH_ACCESS_KEY            │ [from Step 1.3]    │ Production   │
│ NEXT_PUBLIC_UNSPLASH_ACCESS_KEY│ [from Step 1.3]    │ All          │
│ API_SECRET_KEY                 │ [from Step 2.1]    │ Production   │
│ JWT_SECRET                     │ [from Step 2.1]    │ Production   │
│ SESSION_SECRET                 │ [from Step 2.1]    │ Production   │
│ VALID_API_KEYS                 │ [from Step 2.1]    │ Production   │
│ DATABASE_URL                   │ [from Step 1.2]    │ Production   │
│ ALLOWED_ORIGINS                │ https://your.app   │ Production   │
│ DEBUG_ENDPOINT_ENABLED         │ false              │ Production   │
│ LOG_LEVEL                      │ warn               │ Production   │
│ ENABLE_REDIS_CACHE             │ false              │ Production   │
│ ENABLE_PERFORMANCE_MONITORING  │ true               │ Production   │
│ ENABLE_WEB_VITALS              │ true               │ Production   │
│ FORCE_HTTPS                    │ true               │ Production   │
│ ENABLE_SECURITY_HEADERS        │ true               │ Production   │
│ NEXT_TELEMETRY_DISABLED        │ 1                  │ All          │
└────────────────────────────────┴────────────────────┴──────────────┘

3. Click "Save" after each entry
```

**⚠️ IMPORTANT:** Set environment scope correctly!
- **Production**: Sensitive keys, production URLs
- **All**: Public keys that are safe for all environments

---

### Step 2.3: Validate Configuration (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Validate my production environment configuration"

Claude will:
1. Create .env.production.local with your values
2. Run: npm run validate:env:prod
3. Check for missing required variables
4. Verify API key formats
5. Test database connection
6. Output validation report

✅ Expected Result: All checks pass
❌ If fails: Claude will tell you what's missing
```

---

## Phase 3: Database Setup (Automated)

### Step 3.1: Apply Database Migrations (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Apply all database migrations to production database"

Claude will:
1. Connect to Supabase using DATABASE_URL
2. Read scripts/migrations/001_create_missing_tables.sql
3. Execute migration SQL
4. Verify all 11 tables created
5. Verify 35 RLS policies applied
6. Verify 50+ indexes created
7. Run verification queries
8. Output migration report

┌─────────────────────────────────────────────────────┐
│ Migration Progress:                                 │
├─────────────────────────────────────────────────────┤
│ [████████████████████████████████] 100%             │
│                                                     │
│ ✓ images table created                             │
│ ✓ descriptions table created                       │
│ ✓ phrases table created                            │
│ ✓ qa_items table created                           │
│ ✓ answer_validations table created                 │
│ ✓ session_progress table created                   │
│ ✓ qa_responses table created                       │
│ ✓ user_settings table created                      │
│ ✓ user_preferences table created                   │
│ ✓ user_data table created                          │
│ ✓ image_history table created                      │
│ ✓ 35 RLS policies applied                          │
│ ✓ 50+ indexes created                              │
│ ✓ 2 analytics views created                        │
└─────────────────────────────────────────────────────┘

✅ Database Ready!
```

**Manual alternative (if needed):**
```
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of scripts/migrations/001_create_missing_tables.sql
3. Paste and click "Run"
4. Verify success message
```

---

### Step 3.2: Seed Initial Data (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Seed the production database with initial data"

Claude will:
1. Create admin user (if needed)
2. Add sample vocabulary for testing
3. Set up default user preferences
4. Create health check test data
5. Output seed report

⚠️ This is optional for production
✅ Recommended for staging environment
```

---

## Phase 4: Deployment (Automated)

### Step 4.1: Pre-Deployment Checks (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Run pre-deployment checks and prepare for production deploy"

Claude will run:
┌─────────────────────────────────────────────────────┐
│ 1. Type Check                                       │
│    npm run typecheck                                │
│    ✓ 679 warnings (acceptable)                      │
│    ✓ 0 errors                                       │
│                                                     │
│ 2. Lint Check                                       │
│    npm run lint                                     │
│    ✓ No critical issues                            │
│                                                     │
│ 3. Unit Tests                                       │
│    npm run test:unit                                │
│    ✓ 2,340+ tests passing                          │
│                                                     │
│ 4. Integration Tests                                │
│    npm run test:integration                         │
│    ✓ 482+ tests passing                            │
│                                                     │
│ 5. Security Audit                                   │
│    npm audit --audit-level=moderate                 │
│    ✓ 0 vulnerabilities                             │
│                                                     │
│ 6. Build Test                                       │
│    npm run build                                    │
│    ✓ Build successful                              │
│    ✓ Bundle size acceptable                        │
└─────────────────────────────────────────────────────┘

✅ All checks passed! Ready to deploy.
```

---

### Step 4.2: Git Commit and Push (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Commit all changes and push to production branch"

Claude will:
1. Stage all changes: git add -A
2. Create production-ready commit
3. Tag release: v1.0.0
4. Push to main branch
5. Trigger Vercel auto-deployment

Git workflow:
┌─────────────────────────────────────────────────────┐
│ git add -A                                          │
│ git commit -m "chore: production deployment v1.0.0" │
│ git tag -a v1.0.0 -m "Release v1.0.0"               │
│ git push origin main --tags                         │
└─────────────────────────────────────────────────────┘

⚡ This triggers Vercel auto-deployment!
```

---

### Step 4.3: Monitor Deployment (Manual)

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL MONITOR THIS IN VERCEL DASHBOARD        │
└─────────────────────────────────────────────────────┘

1. Go to: Vercel Dashboard → Deployments
2. Watch the deployment progress:

┌─────────────────────────────────────────────────────┐
│ Deployment Status                                   │
├─────────────────────────────────────────────────────┤
│ ⏳ Building...                                      │
│ │                                                   │
│ ├─ Installing packages... ✓                        │
│ ├─ Running build... ✓                              │
│ ├─ Generating static pages... ✓                    │
│ ├─ Finalizing build... ✓                           │
│ │                                                   │
│ ✅ Deployment complete!                             │
│                                                     │
│ URL: https://describe-it-production.vercel.app      │
│ Duration: 2m 34s                                    │
└─────────────────────────────────────────────────────┘

⚠️ If deployment fails:
   - Check build logs in Vercel
   - Verify environment variables
   - Check for TypeScript errors
```

---

## Phase 5: Verification (Automated)

### Step 5.1: Health Checks (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Verify production deployment is healthy"

Claude will test:
┌─────────────────────────────────────────────────────┐
│ 1. Application Health                               │
│    GET https://your-app.vercel.app/api/health       │
│    ✓ 200 OK                                         │
│    ✓ Response time: 123ms                           │
│                                                     │
│ 2. Database Connection                              │
│    Check: Supabase connectivity                     │
│    ✓ Connected                                      │
│    ✓ All tables accessible                         │
│                                                     │
│ 3. API Endpoints                                    │
│    GET /api/monitoring/health      ✓               │
│    POST /api/images/search         ✓               │
│    POST /api/descriptions/generate ✓               │
│    POST /api/qa/generate           ✓               │
│                                                     │
│ 4. Authentication                                   │
│    Supabase Auth: ✓ Working                        │
│                                                     │
│ 5. Third-Party APIs                                 │
│    OpenAI:    ✓ Connected                          │
│    Unsplash:  ✓ Connected                          │
│                                                     │
│ 6. Performance Metrics                              │
│    TTFB:  150ms  ✓                                 │
│    FCP:   800ms  ✓                                 │
│    LCP:   1.2s   ✓                                 │
└─────────────────────────────────────────────────────┘

✅ All health checks passed!
```

---

### Step 5.2: Smoke Tests (Automated)

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE WILL DO THIS                         │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Run smoke tests on production deployment"

Claude will:
1. Test user registration flow
2. Test image search
3. Test description generation
4. Test Q&A generation
5. Test vocabulary saving
6. Verify data persistence

┌─────────────────────────────────────────────────────┐
│ Smoke Test Results:                                 │
├─────────────────────────────────────────────────────┤
│ ✓ User registration works                          │
│ ✓ Image search returns results                     │
│ ✓ AI descriptions generate                         │
│ ✓ Q&A pairs generate                               │
│ ✓ Vocabulary saves to database                     │
│ ✓ User settings persist                            │
│ ✓ Session tracking works                           │
└─────────────────────────────────────────────────────┘

Tests passed: 7/7 (100%)
```

---

## Phase 6: Monitoring (Manual)

### Step 6.1: Set Up Vercel Analytics (Manual)

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS IN VERCEL DASHBOARD             │
└─────────────────────────────────────────────────────┘

1. Go to: Vercel Dashboard → Analytics → Enable
2. Configure alerts:
   - Error rate > 1%
   - Response time > 1s
   - 4xx errors > 5%
   - 5xx errors > 0.1%

3. Add notification channels:
   - Email: your-email@domain.com
   - Slack: (optional)
```

---

### Step 6.2: Set Up Supabase Monitoring (Manual)

```
┌─────────────────────────────────────────────────────┐
│ 👤 YOU WILL DO THIS IN SUPABASE DASHBOARD           │
└─────────────────────────────────────────────────────┘

1. Go to: Supabase Dashboard → Reports
2. Enable monitoring:
   ✓ Database queries
   ✓ API requests
   ✓ Authentication events
   ✓ Storage operations

3. Set up alerts (Settings → Notifications):
   - Database CPU > 80%
   - Connections > 80% of limit
   - Disk usage > 80%
```

---

### Step 6.3: Set Up Error Tracking (Manual - Optional)

```
┌─────────────────────────────────────────────────────┐
│ 👤 OPTIONAL - Only if you set up Sentry             │
└─────────────────────────────────────────────────────┘

1. Go to: Sentry Dashboard → Alerts → New Alert
2. Configure:
   - Error rate > 10 errors/hour
   - New error types
   - Performance degradation

3. Add integrations:
   - Slack notifications
   - Email alerts
```

---

## Troubleshooting

### Issue: Build Fails on Vercel

```
❌ Problem: TypeScript errors during build

✅ Solution:
1. Check Vercel build logs
2. Run locally: npm run build
3. Fix TypeScript errors shown
4. Commit and push again

Common fixes:
- Update tsconfig.json: "strict": false
- Ignore warnings: "skipLibCheck": true
```

---

### Issue: Database Connection Fails

```
❌ Problem: Can't connect to Supabase

✅ Solution:
1. Verify DATABASE_URL in Vercel env vars
2. Check Supabase dashboard is accessible
3. Verify service role key is correct
4. Test connection:

curl -X POST https://xxx.supabase.co/rest/v1/images \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

### Issue: API Rate Limiting

```
❌ Problem: OpenAI/Unsplash rate limits hit

✅ Solution:
1. Check OpenAI usage: https://platform.openai.com/usage
2. Increase rate limit settings in .env:
   RATE_LIMIT_MAX_REQUESTS=200
3. Add Redis caching to reduce API calls
4. Implement request queuing
```

---

### Issue: Environment Variables Not Working

```
❌ Problem: App can't find environment variables

✅ Solution:
1. Verify all vars set in Vercel dashboard
2. Check environment scope (Production/Preview/Development)
3. Redeploy after adding new variables
4. Use NEXT_PUBLIC_ prefix for client-side vars
```

---

## Rollback Procedures

### Emergency Rollback

```
┌─────────────────────────────────────────────────────┐
│ 🚨 IF PRODUCTION IS BROKEN - DO THIS IMMEDIATELY    │
└─────────────────────────────────────────────────────┘

VERCEL ROLLBACK (2 minutes):
────────────────────────────────
1. Go to: Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." menu → "Promote to Production"
4. Confirm rollback
5. ✅ App restored in ~30 seconds

DATABASE ROLLBACK (5 minutes):
────────────────────────────────
1. Go to: Supabase Dashboard → SQL Editor
2. Open: scripts/migrations/001_create_missing_tables_rollback.sql
3. Copy contents
4. Paste in SQL Editor
5. Click "Run"
6. ✅ Database reverted

⚠️ WARNING: Database rollback deletes data!
   Only use if absolutely necessary
   Always backup first
```

---

### Planned Rollback

```
┌─────────────────────────────────────────────────────┐
│ 🤖 CLAUDE CODE CAN HELP WITH THIS                   │
└─────────────────────────────────────────────────────┘

Tell Claude Code:
"Roll back to previous production version"

Claude will:
1. Check git history for last stable version
2. Create rollback branch
3. Revert problematic commits
4. Run tests to verify stability
5. Push to trigger deployment
6. Monitor deployment success
```

---

## Post-Deployment Checklist

```
After successful deployment, verify:

🔒 SECURITY:
├─ [ ] API keys are production-only (not dev keys)
├─ [ ] DEBUG_ENDPOINT_ENABLED=false
├─ [ ] FORCE_HTTPS=true
├─ [ ] Security headers enabled
├─ [ ] RLS policies active on all tables
└─ [ ] CORS restricted to production domain

⚡ PERFORMANCE:
├─ [ ] TTFB < 200ms
├─ [ ] LCP < 2.5s
├─ [ ] Build size < 500KB
├─ [ ] Caching configured
└─ [ ] CDN serving static assets

📊 MONITORING:
├─ [ ] Vercel Analytics enabled
├─ [ ] Supabase monitoring active
├─ [ ] Error alerts configured
├─ [ ] Performance alerts set
└─ [ ] Log aggregation working

✅ FUNCTIONALITY:
├─ [ ] User registration works
├─ [ ] Image search functional
├─ [ ] AI generation working
├─ [ ] Database CRUD operations
├─ [ ] Authentication flow
└─ [ ] All API endpoints responding

💰 COST MONITORING:
├─ [ ] OpenAI spending limit set
├─ [ ] Vercel usage tracking
├─ [ ] Supabase tier appropriate
└─ [ ] Alert on cost spikes
```

---

## Quick Command Reference

### For You (Manual)

```bash
# Check deployment status
open https://vercel.com/dashboard

# View Supabase dashboard
open https://supabase.com/dashboard

# Check OpenAI usage
open https://platform.openai.com/usage

# Monitor errors (if using Sentry)
open https://sentry.io
```

### For Claude Code (Automated)

```bash
# Validate environment
npm run validate:env:prod

# Run all tests
npm run test:run && npm run test:e2e

# Type check
npm run typecheck

# Security audit
npm audit --audit-level=moderate

# Build production
npm run build

# Health check
curl https://your-app.vercel.app/api/health
```

---

## Timeline Summary

```
┌─────────────────────────────────────────────────────┐
│ TOTAL DEPLOYMENT TIME: ~1 hour                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Phase 1: Infrastructure Setup   30 min (Manual)    │
│ Phase 2: Configuration          15 min (Mixed)     │
│ Phase 3: Database Setup          5 min (Auto)      │
│ Phase 4: Deployment              5 min (Auto)      │
│ Phase 5: Verification            5 min (Auto)      │
│ Phase 6: Monitoring             10 min (Manual)    │
│                                                     │
│ YOU DO:         ~55 minutes (one-time setup)       │
│ CLAUDE DOES:    ~30 minutes (repeatable)           │
└─────────────────────────────────────────────────────┘
```

---

## Need Help?

**Documentation:**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs

**Support:**
- Check: `docs/deployment/ROLLBACK_GUIDE.md`
- Check: `docs/troubleshooting.md`
- Create GitHub issue in your repository
- Contact your development team

---

**🎉 Congratulations! Your app is now in production!**

Remember to:
1. Monitor performance daily (first week)
2. Check error logs
3. Review costs weekly
4. Set up automated backups
5. Plan for scaling

**Next Steps:**
- Add custom domain
- Set up CI/CD pipelines
- Configure staging environment
- Enable advanced monitoring
- Implement A/B testing
