# 🚀 Production Infrastructure Execution Guide

## Overview
This guide clearly separates what **YOU must do manually** (security-critical) from what **Claude Code can automate** (implementation).

---

# 🔴 CRITICAL: Manual Actions Required (DO THESE FIRST!)

## 1. 🚨 **Rotate Compromised API Keys** (15 minutes)
**YOU MUST DO THIS MANUALLY - Your keys are currently exposed!**

### OpenAI API Key Rotation:
1. **Go to:** https://platform.openai.com/api-keys
2. **Delete** the compromised key starting with `sk-proj-sYrr...`
3. **Create** a new API key
4. **Copy** the new key (you won't see it again!)
5. **Save** it securely (password manager recommended)

### Unsplash API Key Rotation:
1. **Go to:** https://unsplash.com/oauth/applications
2. **Click** on your application
3. **Regenerate** both Access Key and Secret Key
4. **Copy** both new keys
5. **Save** them securely

### Supabase Keys Rotation:
1. **Go to:** Your Supabase project dashboard
2. **Navigate to:** Settings → API
3. **Regenerate:**
   - Anon key
   - Service role key
   - JWT secret
4. **Copy** all new keys
5. **Update** your database connection if needed

## 2. 📝 **Create Local Environment File** (5 minutes)
**YOU MUST DO THIS - Contains your secrets**

```bash
# In your project root, create .env.local
cp .env.example .env.local

# Edit .env.local with your new keys
# NEVER commit this file!
```

Add your rotated keys:
```env
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY_HERE
UNSPLASH_ACCESS_KEY=YOUR_NEW_UNSPLASH_KEY
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=YOUR_NEW_UNSPLASH_KEY
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_KEY
```

## 3. 🔐 **Secure Your Repository** (10 minutes)
**YOU MUST DO THIS - Prevents future leaks**

### Clean Git History (DESTRUCTIVE - backup first!):
```bash
# Backup your repo first!
cp -r . ../describe_it_backup

# Remove sensitive file from ALL git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch vercel.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (this rewrites history!)
git push origin --force --all
git push origin --force --tags
```

### Verify .gitignore:
```bash
# Ensure vercel.env is ignored
grep "vercel.env" .gitignore
# Should output: vercel.env
```

## 4. 🛡️ **Update Production Deployments** (10 minutes)
**YOU MUST DO THIS - Updates live services**

### If using Vercel:
1. **Go to:** https://vercel.com/dashboard
2. **Select** your project
3. **Navigate to:** Settings → Environment Variables
4. **Update** all API keys with new values
5. **Redeploy** to apply changes

### If using other platforms:
- Update environment variables in your hosting platform
- Trigger a new deployment

---

# 🟢 Claude Code Can Automate These Tasks

## Phase 1: Infrastructure Setup (30 minutes)
**Tell Claude Code:** "Set up the production infrastructure"

Claude Code will:
- ✅ Install all npm dependencies
- ✅ Create Docker configuration files
- ✅ Set up monitoring stack (Prometheus, Grafana)
- ✅ Configure Redis for caching and rate limiting
- ✅ Create Kubernetes manifests
- ✅ Set up CI/CD pipelines

### Command for Claude:
```
Please execute Phase 1 infrastructure setup:
1. Install remaining dependencies
2. Set up Docker compose for local development
3. Configure monitoring services
4. Create deployment scripts
```

## Phase 2: Security Implementation (20 minutes)
**Tell Claude Code:** "Implement the security layer"

Claude Code will:
- ✅ Set up HashiCorp Vault client
- ✅ Implement encryption utilities
- ✅ Create audit logging system
- ✅ Set up session management
- ✅ Configure rate limiting
- ✅ Implement secure middleware

### Command for Claude:
```
Please implement security features:
1. Configure Vault integration
2. Set up audit logging
3. Implement rate limiting
4. Add security middleware to API routes
```

## Phase 3: Testing Framework (20 minutes)
**Tell Claude Code:** "Fix and enhance the test suite"

Claude Code will:
- ✅ Set up MSW mocking
- ✅ Fix failing tests
- ✅ Add security tests
- ✅ Create integration tests
- ✅ Set up performance benchmarks
- ✅ Configure test coverage

### Command for Claude:
```
Please fix the test infrastructure:
1. Set up API mocking with MSW
2. Fix existing test failures
3. Add security test suite
4. Configure coverage reporting
```

## Phase 4: Performance Optimization (15 minutes)
**Tell Claude Code:** "Implement performance optimizations"

Claude Code will:
- ✅ Set up connection pooling
- ✅ Implement request batching
- ✅ Configure Redis caching
- ✅ Add circuit breakers
- ✅ Set up CDN integration
- ✅ Create performance monitoring

### Command for Claude:
```
Please implement performance optimizations:
1. Enable connection pooling for OpenAI
2. Set up Redis caching layer
3. Implement request batching
4. Add circuit breaker patterns
```

## Phase 5: Monitoring Dashboard (15 minutes)
**Tell Claude Code:** "Set up the monitoring dashboard"

Claude Code will:
- ✅ Create analytics dashboard
- ✅ Set up real-time metrics
- ✅ Configure Grafana dashboards
- ✅ Implement anomaly detection
- ✅ Add usage tracking
- ✅ Create alerts

### Command for Claude:
```
Please set up monitoring:
1. Create analytics dashboard component
2. Configure Prometheus metrics
3. Set up Grafana dashboards
4. Implement anomaly detection
```

---

# 🟡 Hybrid Tasks (You Decide, Claude Executes)

## Local Development Environment Setup
**You decide configuration, Claude implements**

### Step 1: You choose services to run locally
```yaml
# Tell Claude which services you want:
- Redis (for caching/rate limiting)
- Prometheus (for metrics)
- Grafana (for dashboards)
- Vault (for secrets management)
```

### Step 2: Claude creates docker-compose
```
Claude, create a docker-compose.yml with:
- Redis on port 6379
- Prometheus on port 9090
- Grafana on port 3001
- Include health checks
```

## Production Deployment Configuration
**You provide credentials, Claude configures**

### Step 1: You provide (without exposing keys):
- Your deployment platform (Vercel/AWS/GCP/etc.)
- Your domain name
- Your preferred regions

### Step 2: Claude creates:
- Deployment scripts
- GitHub Actions workflows
- Infrastructure as Code templates
- SSL configuration

---

# 📋 Quick Execution Checklist

## 🔴 Manual Tasks (Do First!)
- [ ] **Rotate OpenAI API key** ⚠️ CRITICAL
- [ ] **Rotate Unsplash keys** ⚠️ CRITICAL  
- [ ] **Rotate Supabase keys** ⚠️ CRITICAL
- [ ] **Create .env.local with new keys**
- [ ] **Clean git history** (after backup)
- [ ] **Update production environment variables**
- [ ] **Verify no keys in repository**

## 🟢 Claude Code Automation (Do Second)
- [ ] **Phase 1:** Infrastructure setup (30 min)
- [ ] **Phase 2:** Security implementation (20 min)
- [ ] **Phase 3:** Testing framework (20 min)
- [ ] **Phase 4:** Performance optimization (15 min)
- [ ] **Phase 5:** Monitoring dashboard (15 min)

## 🟡 Verification (Do Last)
- [ ] **Run security audit:** `npm audit`
- [ ] **Run tests:** `npm test`
- [ ] **Check monitoring:** `docker-compose ps`
- [ ] **Verify API works:** Test in browser
- [ ] **Check logs:** No exposed secrets

---

# 🚀 One-Command Quick Starts

## After completing manual tasks, use these:

### Full Local Development Stack
```bash
# Start everything
docker-compose -f docker-compose.production.yml up -d

# Verify services
docker-compose ps

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

### Run All Tests
```bash
# Full test suite with coverage
npm run test:coverage

# Security tests only
npm run test:security

# Performance benchmarks
npm run test:perf
```

### Deploy to Production
```bash
# Validate environment first
node scripts/validate-environment.js validate

# Deploy (after validation passes)
./scripts/deploy.sh -e production
```

### Monitor System Health
```bash
# Check API health
curl http://localhost:3000/api/health

# View metrics
curl http://localhost:3000/api/metrics

# Open dashboards
open http://localhost:3001  # Grafana
open http://localhost:9090  # Prometheus
```

---

# 🆘 Troubleshooting

## Common Issues and Solutions

### "API key invalid" error
1. **Check:** Did you rotate keys? (Step 1)
2. **Check:** Is .env.local created? (Step 2)
3. **Check:** Are keys in correct format? (sk-proj-...)
4. **Fix:** Restart Next.js after changing .env.local

### Tests failing
1. **Check:** Are dependencies installed? `npm install`
2. **Check:** Is Redis running? `docker-compose ps`
3. **Fix:** `npm run test:fix`

### Docker services not starting
1. **Check:** Is Docker running?
2. **Check:** Are ports available? (3000, 6379, 9090, 3001)
3. **Fix:** `docker-compose down && docker-compose up -d`

### Rate limiting not working
1. **Check:** Is Redis connected?
2. **Check:** Environment variables set?
3. **Fix:** Check Redis connection string in .env.local

---

# 📞 Getting Help

## For Manual Tasks:
- **API Key Issues:** Check respective platform docs
- **Git Issues:** Make sure to backup first!
- **Deployment Issues:** Check platform-specific guides

## For Claude Code Tasks:
Ask Claude Code:
- "Help me debug [specific issue]"
- "Explain how [feature] works"
- "Fix the [component] error"
- "Show me the logs for [service]"

## For Architecture Questions:
Ask Claude Code:
- "Explain the security architecture"
- "How does caching work?"
- "What's the monitoring setup?"
- "How do I add a new API endpoint?"

---

# ⏱️ Total Time Estimate

## Manual Tasks (You): 40 minutes
- Rotate keys: 15 min
- Create .env.local: 5 min
- Secure repository: 10 min
- Update production: 10 min

## Automated Tasks (Claude): 100 minutes
- Infrastructure: 30 min
- Security: 20 min
- Testing: 20 min
- Performance: 15 min
- Monitoring: 15 min

## Total: ~2.5 hours (can be parallelized)

---

# 🎯 Success Criteria

You know you're done when:
1. ✅ All API keys are rotated (no more exposed keys)
2. ✅ Tests pass with >80% coverage
3. ✅ Docker services are running
4. ✅ Monitoring dashboards show data
5. ✅ API responds without errors
6. ✅ No security warnings in audit
7. ✅ Performance benchmarks pass

---

Remember: **Do manual security tasks FIRST**, then let Claude Code handle implementation!