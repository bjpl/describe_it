# CI/CD Quick Start Guide

## Overview

This guide will get you up and running with the CI/CD pipeline in **under 30 minutes**.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub repository access (admin or write permissions)
- [ ] Vercel account created
- [ ] OpenAI API key (for application)
- [ ] Supabase project set up (for application)

---

## Step 1: Configure Vercel (10 minutes)

### 1.1 Create Vercel Account
```bash
# If you don't have a Vercel account
1. Visit https://vercel.com
2. Sign up with GitHub
3. Link your repository
```

### 1.2 Get Vercel Token
```bash
1. Navigate to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions CI/CD"
4. Scope: Select your repository/organization
5. Click "Create"
6. Copy the token (you won't see it again!)
```

### 1.3 Add Vercel Token to GitHub
```bash
1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: VERCEL_TOKEN
5. Value: <paste your token>
6. Click "Add secret"
```

✅ **Checkpoint:** Vercel token configured

---

## Step 2: Set Up Environments (5 minutes)

### 2.1 Create Production Environment
```bash
1. GitHub Repository → Settings → Environments
2. Click "New environment"
3. Name: "production"
4. Click "Configure environment"
5. Check "Required reviewers"
6. Add 1-2 team members
7. Deployment branches: "Selected branches" → Add "main"
8. Click "Save protection rules"
```

### 2.2 Create Staging Environment
```bash
1. Click "New environment"
2. Name: "staging"
3. No protection rules needed
4. Deployment branches: "All branches"
5. Click "Save protection rules"
```

✅ **Checkpoint:** Environments configured

---

## Step 3: Enable Branch Protection (5 minutes)

### 3.1 Protect Main Branch
```bash
1. Settings → Branches → Add rule
2. Branch name pattern: "main"
3. Check these options:
   ✅ Require a pull request before merging
   ✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
4. Add required status checks:
   - CI Pipeline Success
   - Lint & Type Check
   - Unit Tests
   - Build Verification
5. Click "Create"
```

✅ **Checkpoint:** Branch protection enabled

---

## Step 4: Test the Pipeline (10 minutes)

### 4.1 Test CI Pipeline
```bash
# Create a test branch
git checkout -b test-ci-pipeline

# Make a small change
echo "# CI/CD Test" >> TEST.md

# Commit and push
git add TEST.md
git commit -m "Test: Verify CI pipeline"
git push origin test-ci-pipeline
```

### 4.2 Monitor Workflow
```bash
# Option 1: GitHub CLI
gh run watch

# Option 2: Web UI
# Go to: Actions → CI - Continuous Integration
# Watch the workflow run
```

### 4.3 Create Pull Request
```bash
# Option 1: GitHub CLI
gh pr create --title "Test CI Pipeline" --body "Testing CI/CD setup"

# Option 2: Web UI
# Go to: Pull requests → New pull request
# Select: test-ci-pipeline → develop
# Create pull request
```

### 4.4 Verify Staging Deployment
```bash
# After PR is created, check for:
1. CI pipeline passes (all green checks)
2. Staging deployment URL in PR comment
3. Click the staging URL to verify deployment
```

### 4.5 Clean Up Test
```bash
# Delete test branch after verification
git checkout develop
git branch -D test-ci-pipeline
git push origin --delete test-ci-pipeline
```

✅ **Checkpoint:** Pipeline tested successfully

---

## Step 5: Optional Enhancements (10 minutes)

### 5.1 Configure Codecov (Optional)
```bash
1. Visit https://codecov.io
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add to GitHub Secrets:
   Name: CODECOV_TOKEN
   Value: <your token>
```

### 5.2 Configure Lighthouse CI (Optional)
```bash
1. Install Lighthouse CI GitHub App:
   https://github.com/apps/lighthouse-ci
2. Configure for your repository
3. Get app token
4. Add to GitHub Secrets:
   Name: LHCI_GITHUB_APP_TOKEN
   Value: <your token>
```

✅ **Checkpoint:** Optional features configured

---

## Verification Checklist

After completing the setup, verify:

- [ ] **Workflows are active**
  ```bash
  gh workflow list
  # Should show all 5 workflows
  ```

- [ ] **Secrets are configured**
  ```bash
  gh secret list
  # Should show VERCEL_TOKEN (and optional tokens)
  ```

- [ ] **Environments exist**
  ```bash
  # Check: Settings → Environments
  # Should see: production, staging
  ```

- [ ] **Branch protection is active**
  ```bash
  # Check: Settings → Branches
  # Should see: main branch protected
  ```

- [ ] **CI pipeline runs on push**
  ```bash
  # Make a commit to develop
  # Check: Actions tab shows workflow running
  ```

---

## Common Issues & Quick Fixes

### Issue 1: Workflow Not Triggering

**Symptom:** Push code but no workflow runs

**Fix:**
```bash
# Check workflow files are in correct location
ls .github/workflows/*.yml

# Verify workflows are enabled
# Settings → Actions → General → Allow all actions
```

### Issue 2: Vercel Deployment Fails

**Symptom:** "Error: Invalid token"

**Fix:**
```bash
# Regenerate Vercel token
1. Vercel → Settings → Tokens → Create new
2. Update GitHub secret with new token
3. Re-run workflow
```

### Issue 3: Health Check Fails

**Symptom:** Deployment succeeds but health check fails

**Fix:**
```bash
# Check Vercel environment variables
vercel env ls

# Ensure required env vars are set:
- OPENAI_API_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
```

### Issue 4: Tests Fail in CI but Pass Locally

**Fix:**
```bash
# Run tests with CI environment
CI=true npm run test

# Check Node version matches CI
node --version  # Should be 20.x

# Clear caches
rm -rf .next node_modules/.cache
npm ci
npm test
```

---

## Next Steps

After successful setup:

1. **Read Full Documentation**
   - [CI/CD Setup Guide](./ci-cd-setup.md)
   - [GitHub Secrets Guide](./github-secrets.md)
   - [Troubleshooting Guide](./troubleshooting.md)

2. **Set Up Monitoring**
   - Enable GitHub Actions notifications
   - Configure deployment alerts
   - Review workflow insights weekly

3. **Team Training**
   - Walk through deployment process with team
   - Practice emergency rollback procedures
   - Document team-specific workflows

4. **Optimization**
   - Monitor pipeline execution times
   - Optimize slow jobs
   - Review and update timeouts

---

## Daily Development Workflow

### For Feature Development

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 2. Make changes and commit
# CI runs on every push
git add .
git commit -m "feat: Add new feature"
git push origin feature/my-feature

# 3. Create PR to develop
gh pr create --base develop

# 4. Wait for CI to pass and get staging deployment

# 5. Request review

# 6. Merge after approval
# Staging auto-deploys
```

### For Production Release

```bash
# 1. Verify staging is stable
# Check staging URL and all tests pass

# 2. Create PR from develop to main
gh pr create --base main --head develop

# 3. Wait for all checks to pass

# 4. Get approval from required reviewers

# 5. Merge PR
# Production deployment triggers automatically

# 6. Monitor deployment
gh run watch

# 7. Verify production
# Check production URL
# Run smoke tests
```

---

## Emergency Procedures

### Emergency Hotfix

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. Make minimal fix and commit
git add .
git commit -m "fix: Critical production issue"
git push origin hotfix/critical-fix

# 3. Create PR to main
gh pr create --base main

# 4. If extremely urgent, use emergency deploy
gh workflow run cd-production.yml --field skip_tests=true
# ⚠️ Only use skip_tests in true emergencies!

# 5. After fix, merge hotfix to develop
git checkout develop
git merge hotfix/critical-fix
git push origin develop
```

### Rollback Production

```bash
# Option 1: Revert commit
git revert HEAD
git push origin main
# Production auto-deploys

# Option 2: Vercel rollback
vercel rollback <deployment-url>

# Option 3: Deploy previous commit
gh workflow run cd-production.yml --ref <previous-commit-sha>
```

---

## Support & Resources

### Documentation
- 📚 [Full CI/CD Documentation](./ci-cd-setup.md)
- 🔐 [Secrets Configuration](./github-secrets.md)
- 🔧 [Troubleshooting](./troubleshooting.md)
- 📊 [Workflow Status](./.github/workflows-status.md)

### Commands Reference
```bash
# View workflows
gh workflow list

# View runs
gh run list --limit 10

# Watch current run
gh run watch

# View logs
gh run view <run-id> --log

# Trigger workflow
gh workflow run <workflow-name>

# List secrets
gh secret list

# View environments
# Settings → Environments (web UI only)
```

### Getting Help
1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Review workflow logs in GitHub Actions
3. Search documentation
4. Ask in team chat
5. Create GitHub issue

---

## Checklist Summary

### Initial Setup (One-time)
- [ ] Configure Vercel token
- [ ] Create environments (production, staging)
- [ ] Enable branch protection
- [ ] Test CI pipeline
- [ ] Test staging deployment
- [ ] Configure optional services (Codecov, Lighthouse)

### Before Every PR
- [ ] Run tests locally (`npm run test`)
- [ ] Run linter (`npm run lint`)
- [ ] Type check (`npm run typecheck`)
- [ ] Build locally (`npm run build`)

### Before Production Release
- [ ] Verify staging is stable
- [ ] All CI checks pass
- [ ] Code review complete
- [ ] Required approvals obtained
- [ ] Changelog updated (if applicable)

### After Production Deploy
- [ ] Monitor health checks
- [ ] Verify production URL
- [ ] Check error logs
- [ ] Run smoke tests
- [ ] Notify team of deployment

---

## Success Criteria

You've successfully set up the CI/CD pipeline when:

✅ Pushing to develop triggers CI pipeline
✅ CI pipeline completes in < 25 minutes
✅ Creating PR deploys to staging automatically
✅ Merging to main deploys to production automatically
✅ Health checks pass consistently
✅ Team members can view deployment status
✅ Rollback procedures are documented and tested

---

**Setup Time:** ~30 minutes
**Difficulty:** Easy to Moderate
**Prerequisites:** GitHub admin access, Vercel account

**Questions?** See [Troubleshooting Guide](./troubleshooting.md) or contact DevOps team.

---

**Last Updated:** 2025-10-02
**Version:** 1.0.0
