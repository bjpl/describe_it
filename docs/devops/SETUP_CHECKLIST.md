# CI/CD Setup Checklist - Week 2 Deliverable

## Quick Reference

**Total Time Estimate**: 5-7 hours
**Prerequisites**: GitHub admin access, Vercel account, Supabase account

---

## Phase 1: Secret Inventory (Complete)

### Critical Secrets (4 - REQUIRED)

- [ ] `VERCEL_TOKEN` - Deployment platform token
  - Source: https://vercel.com/account/tokens
  - Used in: All deployment workflows
  - Security: HIGH

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Database connection URL
  - Source: https://supabase.com/dashboard/project/settings/api
  - Used in: Runtime application
  - Security: PUBLIC (safe)

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database public key
  - Source: Supabase Dashboard → API → anon key
  - Used in: Client-side queries
  - Security: PUBLIC (with RLS)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Database admin key
  - Source: Supabase Dashboard → API → service_role key
  - Used in: Server-side admin operations
  - Security: CRITICAL (never expose to client)

### Important Secrets (4 - RECOMMENDED)

- [ ] `OPENAI_API_KEY` - AI translation service
  - Source: https://platform.openai.com/api-keys
  - Used in: AI-powered features
  - Security: HIGH
  - Cost: Monitor usage

- [ ] `API_SECRET_KEY` - API security key (32 bytes)
  - Source: Generate with `./scripts/generate-secrets.sh`
  - Used in: API validation, webhooks
  - Security: CRITICAL

- [ ] `JWT_SECRET` - JWT signing key (32 bytes)
  - Source: Generate with `./scripts/generate-secrets.sh`
  - Used in: Authentication tokens
  - Security: CRITICAL

- [ ] `SESSION_SECRET` - Session encryption key (16 bytes)
  - Source: Generate with `./scripts/generate-secrets.sh`
  - Used in: Cookie encryption, CSRF
  - Security: HIGH

### Optional Secrets (7 - ENHANCED FEATURES)

- [ ] `CODECOV_TOKEN` - Code coverage reporting
  - Source: https://codecov.io
  - Used in: CI coverage uploads
  - Security: LOW

- [ ] `LHCI_GITHUB_APP_TOKEN` - Lighthouse performance tracking
  - Source: GitHub PAT or Lighthouse CI server
  - Used in: Performance tests
  - Security: MEDIUM

- [ ] `SENTRY_DSN` - Error monitoring
  - Source: https://sentry.io
  - Used in: Error tracking
  - Security: PUBLIC

- [ ] `SENTRY_AUTH_TOKEN` - Sentry source maps
  - Source: Sentry → Account → API
  - Used in: Source map uploads
  - Security: HIGH

- [ ] `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` - Image search
  - Source: https://unsplash.com/oauth/applications
  - Used in: Image search feature
  - Security: PUBLIC

- [ ] `GH_PAT` - GitHub personal access token
  - Source: GitHub → Settings → Developer settings
  - Used in: Advanced GitHub automation
  - Security: HIGH

- [ ] `GITHUB_TOKEN` - Auto-provided by GitHub Actions
  - Source: Automatic
  - Used in: GitHub API operations
  - Security: MANAGED

**Total Secrets**: 15 (4 critical, 4 important, 7 optional)

---

## Phase 2: Local Setup (30 minutes)

### Generate Security Keys

- [ ] Run secret generation script:
  ```bash
  ./scripts/generate-secrets.sh
  ```

- [ ] Save generated keys:
  - API_SECRET_KEY (64 chars)
  - JWT_SECRET (64 chars)
  - SESSION_SECRET (32 chars)

- [ ] Add `.env.secrets.template` to `.gitignore`:
  ```bash
  echo ".env.secrets.template" >> .gitignore
  ```

### Install Required Tools

- [ ] GitHub CLI:
  ```bash
  # macOS
  brew install gh

  # Ubuntu/Debian
  sudo apt install gh

  # Windows
  winget install GitHub.cli
  ```

- [ ] Authenticate GitHub CLI:
  ```bash
  gh auth login
  ```

- [ ] Verify authentication:
  ```bash
  gh auth status
  ```

---

## Phase 3: Service Configuration (90 minutes)

### Vercel Setup (30 min)

- [ ] Create Vercel account: https://vercel.com
- [ ] Link GitHub repository
- [ ] Create token:
  1. Settings → Tokens
  2. Create Token → "GitHub Actions CI/CD"
  3. Scope: Full Access or Deployment
  4. Copy token immediately
- [ ] Save token to `.env.secrets.template`

### Supabase Setup (30 min)

- [ ] Create Supabase project: https://supabase.com/dashboard
- [ ] Configure project:
  - Name: describe-it-prod
  - Region: Closest to users
  - Strong database password
- [ ] Get credentials:
  - Project URL → NEXT_PUBLIC_SUPABASE_URL
  - anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY
  - service_role → SUPABASE_SERVICE_ROLE_KEY
- [ ] Add to `.env.secrets.template`

### OpenAI Setup (15 min)

- [ ] Create OpenAI account: https://platform.openai.com
- [ ] Generate API key:
  1. API Keys → Create new secret key
  2. Name: "Describe It Production"
  3. Permissions: Minimum required
- [ ] Set up usage limits:
  - Soft limit: $50/month
  - Hard limit: $100/month
- [ ] Add to `.env.secrets.template`

### Optional Services (15 min)

- [ ] Unsplash (if using image search):
  - https://unsplash.com/oauth/applications
  - Create application
  - Copy Access Key

- [ ] Codecov (if tracking coverage):
  - https://codecov.io
  - Link repository
  - Copy upload token

- [ ] Sentry (if error monitoring):
  - https://sentry.io
  - Create Next.js project
  - Copy DSN and auth token

---

## Phase 4: GitHub Configuration (60 minutes)

### Upload Secrets (20 min)

- [ ] Fill all values in `.env.secrets.template`

- [ ] Upload to GitHub:
  ```bash
  ./scripts/upload-secrets.sh .env.secrets.template
  ```

- [ ] Verify secrets:
  ```bash
  gh secret list
  ```

- [ ] Expected output:
  ```
  VERCEL_TOKEN                    Updated 2025-10-02
  NEXT_PUBLIC_SUPABASE_URL        Updated 2025-10-02
  NEXT_PUBLIC_SUPABASE_ANON_KEY   Updated 2025-10-02
  SUPABASE_SERVICE_ROLE_KEY       Updated 2025-10-02
  OPENAI_API_KEY                  Updated 2025-10-02
  API_SECRET_KEY                  Updated 2025-10-02
  JWT_SECRET                      Updated 2025-10-02
  SESSION_SECRET                  Updated 2025-10-02
  ```

### Create Environments (20 min)

- [ ] Production environment:
  1. Settings → Environments → New environment
  2. Name: `production`
  3. Required reviewers: 1
  4. Deployment branches: `main` only
  5. Add production-specific secrets (if any)

- [ ] Staging environment:
  1. Name: `staging`
  2. Required reviewers: None
  3. Deployment branches: `main`, `develop`
  4. Add staging-specific secrets (if any)

- [ ] Preview environment:
  1. Name: `preview`
  2. Required reviewers: None
  3. Deployment branches: Any branch with PR
  4. Uses repository secrets

### Branch Protection (20 min)

- [ ] Protect `main` branch:
  1. Settings → Branches → Add rule
  2. Branch name pattern: `main`
  3. Settings:
     - ✅ Require pull request before merging
     - ✅ Require 1 approval
     - ✅ Dismiss stale approvals
     - ✅ Require status checks to pass
     - ✅ Require branches to be up to date
     - ✅ Require conversation resolution
     - ❌ Allow force pushes
     - ❌ Allow deletions

- [ ] Required status checks:
  - `lint-and-typecheck`
  - `test`
  - `e2e-tests`
  - `security-audit`
  - `build-docker`

- [ ] Optional: Protect `develop` branch:
  - Same settings as main
  - Can reduce approval requirement to 0

---

## Phase 5: Workflow Activation (30 minutes)

### Enable Workflows (10 min)

- [ ] Move workflows to active directory:
  ```bash
  mv .github/workflows.disabled/* .github/workflows/
  ```

- [ ] Commit and push:
  ```bash
  git add .github/workflows/
  git commit -m "ci: Enable GitHub Actions workflows"
  git push origin main
  ```

### Configure Workflow Permissions (5 min)

- [ ] Settings → Actions → General
- [ ] Workflow permissions:
  - ✅ Read and write permissions
  - ✅ Allow GitHub Actions to create and approve pull requests

### Verify Workflows (15 min)

- [ ] List active workflows:
  ```bash
  gh workflow list
  ```

- [ ] Expected workflows:
  - CI/CD Pipeline
  - Verify Secrets

- [ ] Run secret verification:
  ```bash
  gh workflow run verify-secrets.yml
  gh run watch
  ```

- [ ] Check for ✅ on all critical secrets

---

## Phase 6: Validation & Testing (90 minutes)

### Automated Validation (30 min)

- [ ] Run validation script:
  ```bash
  ./scripts/validate-cicd.sh
  ```

- [ ] Expected checks:
  - ✅ All dependencies installed
  - ✅ All critical secrets configured
  - ✅ Workflow syntax valid
  - ✅ Environments configured
  - ✅ Branch protection active

- [ ] Review validation report:
  ```bash
  cat .cicd-validation/summary.txt
  ```

- [ ] Address any failures before proceeding

### Test Workflows (30 min)

#### Test 1: Verify Secrets Available

- [ ] Run verification workflow:
  ```bash
  gh workflow run verify-secrets.yml
  ```

- [ ] Watch execution:
  ```bash
  gh run watch
  ```

- [ ] Verify all critical secrets pass

#### Test 2: Trigger CI Pipeline

- [ ] Create test branch:
  ```bash
  git checkout -b test/ci-validation
  ```

- [ ] Make small change:
  ```bash
  echo "# CI Test" >> README.md
  git add README.md
  git commit -m "test: CI pipeline validation"
  ```

- [ ] Push and create PR:
  ```bash
  git push origin test/ci-validation
  gh pr create --title "Test: CI Pipeline" --body "Testing CI/CD setup"
  ```

- [ ] Watch PR checks:
  ```bash
  gh pr checks --watch
  ```

- [ ] Expected results:
  - ✅ Lint and typecheck pass
  - ✅ Tests pass
  - ✅ E2E tests pass
  - ✅ Security audit completes
  - ✅ Preview deployment succeeds

#### Test 3: Verify Branch Protection

- [ ] Try direct push to main (should fail):
  ```bash
  git checkout main
  echo "test" >> README.md
  git commit -am "Test branch protection"
  git push origin main
  ```

- [ ] Expected error:
  ```
  remote: error: GH006: Protected branch update failed
  ```

- [ ] If push succeeds, branch protection is not configured correctly

### End-to-End Test (30 min)

- [ ] Merge test PR:
  ```bash
  gh pr merge test/ci-validation --merge
  ```

- [ ] Watch full pipeline:
  ```bash
  gh run watch
  ```

- [ ] Verify all jobs complete:
  - ✅ Lint and typecheck
  - ✅ Tests with coverage
  - ✅ E2E tests
  - ✅ Security audit
  - ✅ Docker build
  - ✅ Performance tests
  - ✅ Production deployment

- [ ] Check Vercel deployment:
  1. Go to Vercel dashboard
  2. Verify deployment succeeded
  3. Test application URL

- [ ] Verify GitHub deployment:
  1. Repository → Deployments
  2. Check production deployment status
  3. Verify environment URL

---

## Phase 7: Documentation & Cleanup (30 minutes)

### Security Cleanup (10 min)

- [ ] Delete secrets template file:
  ```bash
  rm .env.secrets.template
  ```

- [ ] Verify no secrets in git:
  ```bash
  git status
  git log --all --full-history -- .env.secrets.template
  ```

- [ ] Add to `.gitignore` if not already:
  ```bash
  echo ".env.secrets.template" >> .gitignore
  echo ".env.secrets" >> .gitignore
  ```

### Documentation (20 min)

- [ ] Update team documentation:
  - Share `docs/devops/CICD_SETUP_GUIDE.md`
  - Link to `docs/devops/secret-templates.md`
  - Reference `docs/devops/workflow-reference.md`

- [ ] Create onboarding guide for new developers:
  - How to get access to secrets
  - How to run validation locally
  - How to trigger workflows

- [ ] Document secret rotation schedule:
  - Critical secrets: Every 90 days
  - Security keys: Every 180 days
  - Service tokens: Annually

---

## Post-Setup Monitoring

### Daily Checks (5 min)

- [ ] Review failed workflow runs:
  ```bash
  gh run list --status failure
  ```

- [ ] Check Vercel deployment status

- [ ] Monitor error rates in Sentry (if configured)

### Weekly Checks (15 min)

- [ ] Review Dependabot alerts
- [ ] Check security audit results
- [ ] Verify deployment success rate
- [ ] Review code coverage trends

### Monthly Checks (30 min)

- [ ] Audit secret access logs:
  ```bash
  gh api /repos/{owner}/{repo}/actions/secrets/audit
  ```

- [ ] Review and update workflows
- [ ] Check artifact storage usage
- [ ] Performance test results analysis

### Quarterly Checks (2 hours)

- [ ] Rotate critical secrets
- [ ] Review and update branch protection
- [ ] Update GitHub Actions versions
- [ ] Security compliance audit

---

## Troubleshooting

### Common Issues

**Secret not available in workflow**:
- Check spelling (case-sensitive)
- Verify correct scope (repository vs environment)
- Re-add secret: `gh secret set SECRET_NAME`

**Vercel deployment fails**:
- Generate new token
- Verify token scope
- Test locally: `vercel --token="$TOKEN" ls`

**E2E tests timeout**:
- Increase timeout in workflow
- Check build step completed
- Review application logs

**Docker build fails**:
- Verify `package-lock.json` committed
- Check Node version matches
- Clear cache: `docker build --no-cache`

For detailed troubleshooting, see: `docs/devops/CICD_SETUP_GUIDE.md#troubleshooting`

---

## Success Criteria

### All Critical Checks Pass

- ✅ All 4 critical secrets configured
- ✅ All 4 important secrets configured
- ✅ Workflows enabled and active
- ✅ Branch protection rules applied
- ✅ Environments created (production, staging, preview)
- ✅ Test PR merged successfully
- ✅ Production deployment successful
- ✅ Validation script passes with 100%

### Team Readiness

- ✅ Documentation shared with team
- ✅ Secret access procedures documented
- ✅ Workflow trigger guide available
- ✅ Troubleshooting guide accessible
- ✅ Monitoring dashboards set up

### Security Compliance

- ✅ No secrets in version control
- ✅ Secret scanning enabled
- ✅ Branch protection enforced
- ✅ Environment protection configured
- ✅ Rotation schedule documented

---

## Quick Reference Commands

```bash
# Generate secrets
./scripts/generate-secrets.sh

# Upload secrets
./scripts/upload-secrets.sh .env.secrets.template

# Verify secrets
gh secret list
gh workflow run verify-secrets.yml

# Validate CI/CD
./scripts/validate-cicd.sh

# Test workflow
gh workflow run ci-cd.yml
gh run watch

# Create PR
git checkout -b feature/test
# ... make changes ...
gh pr create

# Monitor deployments
gh run list
gh deployment list
```

---

## Resources

- **Setup Guide**: `/docs/devops/CICD_SETUP_GUIDE.md`
- **Secret Templates**: `/docs/devops/secret-templates.md`
- **Workflow Reference**: `/docs/devops/workflow-reference.md`
- **Troubleshooting**: `/docs/devops/troubleshooting.md`

---

**Checklist Version**: 1.0.0
**Last Updated**: 2025-10-02
**Estimated Total Time**: 5-7 hours
**Status**: Ready for implementation
