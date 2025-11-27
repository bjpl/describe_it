# GitHub Actions Workflows - Quick Reference

## Workflow Overview

| Workflow              | File                   | Trigger          | Purpose                      |
| --------------------- | ---------------------- | ---------------- | ---------------------------- |
| **CI**                | `ci.yml`               | Push, PR, Manual | Continuous integration tests |
| **Production Deploy** | `cd-production.yml`    | Manual           | Deploy to Vercel production  |
| **Staging Deploy**    | `cd-staging.yml`       | Push to develop  | Deploy to staging            |
| **Security Scan**     | `security-scan.yml`    | Daily 2 AM UTC   | Security audits              |
| **Lighthouse CI**     | `lighthouse-ci.yml`    | PR, Push, Weekly | Performance monitoring       |
| **Security Headers**  | `security-headers.yml` | PR, Push, Daily  | Header validation            |
| **API Tests**         | `api-tests.yml`        | Push, PR         | API integration tests        |
| **Docker Publish**    | `docker-publish.yml`   | Release          | Build & publish images       |

---

## Common Commands

### Trigger Manual Workflows

```bash
# Using GitHub CLI
gh workflow run cd-production.yml

# With inputs
gh workflow run cd-production.yml -f skip_tests=true

# List workflow runs
gh run list --workflow=ci.yml

# View workflow run
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

### Local Testing

```bash
# Install act (GitHub Actions locally)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI workflow locally
act -j lint-and-typecheck

# Run with secrets
act -j build-verification --secret-file .env.local

# List available jobs
act -l
```

---

## Workflow Status Badges

Add to README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/describe_it/workflows/CI%20-%20Continuous%20Integration/badge.svg)
![Security](https://github.com/YOUR_USERNAME/describe_it/workflows/Security%20Scanning/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/describe_it/workflows/CD%20-%20Production%20Deployment/badge.svg)
```

---

## Quick Debugging

### View Workflow Logs

```bash
# Latest run
gh run view

# Specific job
gh run view --job=<job-id>

# Download logs
gh run view <run-id> --log
```

### Re-run Failed Jobs

```bash
# Re-run failed jobs
gh run rerun <run-id> --failed

# Re-run entire workflow
gh run rerun <run-id>
```

### Cancel Running Workflow

```bash
gh run cancel <run-id>
```

---

## Environment Setup

### Required Secrets

Set in: Repository Settings → Secrets and Variables → Actions

```bash
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Code Coverage
CODECOV_TOKEN

# Lighthouse CI (optional)
LHCI_GITHUB_APP_TOKEN
```

### Add Secret via CLI

```bash
gh secret set VERCEL_TOKEN
# Paste your token when prompted
```

---

## Performance Benchmarks

| Workflow           | Average Duration | Timeout |
| ------------------ | ---------------- | ------- |
| Lint & Type Check  | 2-3 min          | 10 min  |
| Unit Tests         | 3-5 min          | 15 min  |
| Integration Tests  | 5-8 min          | 20 min  |
| E2E Tests          | 10-15 min        | 30 min  |
| Build Verification | 5-7 min          | 15 min  |
| Full CI Pipeline   | 15-20 min        | -       |
| Production Deploy  | 10-15 min        | 20 min  |

---

## Troubleshooting Guide

### Issue: Workflow Not Triggering

**Check:**

1. Branch protection rules
2. Workflow file syntax (YAML)
3. File location (`.github/workflows/`)
4. Workflow permissions

**Fix:**

```bash
# Validate workflow syntax
act --dryrun -j <job-name>
```

### Issue: Tests Failing in CI but Pass Locally

**Common Causes:**

- Environment variable mismatch
- Timezone differences
- File system case sensitivity
- Missing test dependencies

**Fix:**

```bash
# Run tests with CI environment
CI=true npm test

# Check environment
env | grep -i node
```

### Issue: Deployment Fails

**Check:**

1. Vercel token validity
2. Project settings
3. Build logs
4. Environment variables

**Fix:**

```bash
# Test Vercel deployment locally
vercel --prod --debug

# Verify environment
vercel env ls
```

### Issue: Slow Workflow Execution

**Optimizations:**

1. Enable dependency caching
2. Use matrix builds strategically
3. Parallelize independent jobs
4. Reduce artifact sizes
5. Use `concurrency` to cancel old runs

---

## Best Practices Checklist

### Before Committing

- [ ] Run tests locally: `npm test`
- [ ] Check linting: `npm run lint`
- [ ] Type check: `npm run typecheck`
- [ ] Format code: `npm run format`
- [ ] Review changes: `git diff`

### Before Merging PR

- [ ] All CI checks pass
- [ ] Code review approved
- [ ] No merge conflicts
- [ ] Updated documentation
- [ ] Tested deployment preview

### Before Production Deploy

- [ ] Staging deployment verified
- [ ] Security scans passed
- [ ] Performance benchmarks met
- [ ] Rollback plan ready
- [ ] Team notified

---

## Workflow Optimization Tips

### Caching Strategy

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
      .next/cache
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}
```

### Conditional Job Execution

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
```

### Matrix Builds

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
```

### Fail Fast

```yaml
strategy:
  fail-fast: true # Stop all jobs on first failure
```

---

## Monitoring & Alerts

### GitHub Notifications

Configure in: Settings → Notifications

- Email on workflow failures
- Web notifications for PRs
- Mobile app alerts

### Slack Integration

```yaml
- name: Slack Notification
  uses: 8398a7/action-slack@v3
  if: failure()
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Status Checks

Required checks (Settings → Branches → Branch protection):

- CI Pipeline Success
- Lint & Type Check
- Unit Tests
- Build Verification

---

## Useful Resources

### Documentation

- [GitHub Actions](https://docs.github.com/actions)
- [Workflow Syntax](https://docs.github.com/actions/reference/workflow-syntax-for-github-actions)
- [Vercel GitHub Integration](https://vercel.com/docs/git/vercel-for-github)

### Tools

- [act](https://github.com/nektos/act) - Run Actions locally
- [actionlint](https://github.com/rhysd/actionlint) - Workflow linter
- [GitHub CLI](https://cli.github.com/) - Manage from terminal

### Marketplace

- [Codecov](https://github.com/marketplace/codecov)
- [Lighthouse CI](https://github.com/marketplace/actions/lighthouse-ci-action)
- [Docker Build Push](https://github.com/marketplace/actions/build-and-push-docker-images)

---

## Emergency Procedures

### Rollback Production

1. Identify last working deployment
2. Trigger manual deployment of that commit
3. Verify health checks pass
4. Notify team

```bash
# Find last successful deploy
gh run list --workflow=cd-production.yml --status=success --limit=5

# Deploy specific commit
git checkout <commit-hash>
gh workflow run cd-production.yml
```

### Disable Workflow

```bash
# Disable workflow
gh workflow disable cd-production.yml

# Re-enable workflow
gh workflow enable cd-production.yml
```

### Emergency Hotfix

1. Create hotfix branch from main
2. Make minimal changes
3. Run CI locally with `act`
4. Deploy with `skip_tests: true` if critical
5. Follow up with full test suite

---

## Metrics & KPIs

### Track These Metrics

- CI/CD pipeline success rate
- Average build time
- Deployment frequency
- Time to recovery
- Test coverage percentage
- Security vulnerabilities found

### Weekly Review

```bash
# Get workflow metrics
gh run list --workflow=ci.yml --limit=50 --json conclusion,startedAt,updatedAt

# Success rate
gh api repos/:owner/:repo/actions/runs --jq '.workflow_runs[] | select(.conclusion=="success") | .name' | wc -l
```

---

_Quick Reference v2.0 - Last Updated: November 27, 2025_
