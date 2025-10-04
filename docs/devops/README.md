# DevOps Documentation

## Overview

This directory contains comprehensive documentation for the CI/CD pipeline, infrastructure, and deployment processes for the Describe It application.

## Table of Contents

### 1. [CI/CD Setup Guide](./ci-cd-setup.md)
Complete documentation of the GitHub Actions CI/CD pipeline including:
- Pipeline architecture
- Workflow configurations
- Environment setup
- Deployment strategies
- Performance metrics
- Best practices

### 2. [GitHub Secrets Configuration](./github-secrets.md)
Guide for configuring required secrets and environment variables:
- Required secrets list
- Step-by-step configuration
- Security best practices
- Troubleshooting secret issues
- Environment-specific configuration

### 3. [Troubleshooting Guide](./troubleshooting.md)
Comprehensive troubleshooting documentation:
- Common issues and solutions
- Quick diagnostics
- Debug techniques
- Error message reference
- Prevention checklist

## Quick Reference

### Workflows

| Workflow | File | Purpose | Triggers |
|----------|------|---------|----------|
| **CI** | `.github/workflows/ci.yml` | Continuous Integration | Push, PR |
| **Production Deploy** | `.github/workflows/cd-production.yml` | Production Deployment | Push to main |
| **Staging Deploy** | `.github/workflows/cd-staging.yml` | Staging Deployment | Push to develop |
| **Security Scan** | `.github/workflows/security-scan.yml` | Security Analysis | Daily, Push, PR |
| **Docker Publish** | `.github/workflows/docker-publish.yml` | Container Publishing | Push, Tags |

### Required Secrets

| Secret | Purpose | Required | Documentation |
|--------|---------|----------|---------------|
| `VERCEL_TOKEN` | Vercel deployments | Yes | [Setup Guide](./github-secrets.md#vercel_token) |
| `CODECOV_TOKEN` | Coverage reporting | Optional | [Setup Guide](./github-secrets.md#codecov_token) |
| `LHCI_GITHUB_APP_TOKEN` | Performance testing | Optional | [Setup Guide](./github-secrets.md#lhci_github_app_token) |

### Key Commands

```bash
# View workflow runs
gh run list --limit 10

# Watch current run
gh run watch

# Trigger manual deployment
gh workflow run cd-production.yml

# Download artifacts
gh run download <run-id>

# View logs
gh run view <run-id> --log
```

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Feature Branch → PR → Staging → Production                 │
│                                                               │
├─────────────────┬───────────────────┬──────────────────────┤
│   CI Pipeline   │  Staging Deploy   │  Production Deploy   │
├─────────────────┼───────────────────┼──────────────────────┤
│ • Lint          │ • Vercel Preview  │ • Pre-validation     │
│ • Type Check    │ • E2E Tests       │ • Docker Build       │
│ • Unit Tests    │ • Smoke Tests     │ • Vercel Production  │
│ • Integration   │ • Health Checks   │ • Post-verification  │
│ • E2E Tests     │                   │ • Performance Tests  │
│ • Security Scan │                   │ • Rollback on Fail   │
│ • Build Verify  │                   │                      │
└─────────────────┴───────────────────┴──────────────────────┘
```

## Getting Started

### Initial Setup

1. **Configure Secrets** (5 minutes)
   ```bash
   # Navigate to repository settings
   Settings → Secrets and variables → Actions

   # Add required secrets
   - VERCEL_TOKEN
   - CODECOV_TOKEN (optional)
   - LHCI_GITHUB_APP_TOKEN (optional)
   ```

2. **Set Up Environments** (5 minutes)
   ```bash
   Settings → Environments

   # Create environments
   - production (with reviewers)
   - staging (auto-deploy)
   ```

3. **Enable Workflows** (1 minute)
   ```bash
   # Workflows auto-enable on first push
   # Verify in: Settings → Actions → General
   ```

4. **Test Pipeline** (15 minutes)
   ```bash
   # Push to develop branch
   git checkout -b test-ci
   git commit --allow-empty -m "Test CI pipeline"
   git push origin test-ci

   # Watch workflow run
   gh run watch
   ```

### For Developers

**Before Committing:**
```bash
# Run local checks
npm run lint
npm run typecheck
npm run test
npm run build
```

**Creating a PR:**
1. Create feature branch from `develop`
2. Make changes and commit
3. Push to remote
4. Create PR to `develop`
5. Wait for CI checks
6. Review staging deployment
7. Request review

**Merging to Production:**
1. Ensure staging tests pass
2. Create PR from `develop` to `main`
3. Wait for approval
4. Merge triggers production deployment
5. Monitor deployment status
6. Verify production health

### For DevOps

**Monitoring:**
```bash
# Check workflow health
gh workflow list

# View recent runs
gh run list --workflow=ci.yml --limit 20

# Monitor deployment
gh run watch --exit-status
```

**Maintenance:**
```bash
# Update workflow dependencies
# Review and update action versions in .github/workflows/

# Clean up old deployments
# Handled automatically by cleanup job

# Review security scans
gh run list --workflow=security-scan.yml
```

## Performance Optimization

### Current Performance

- **CI Pipeline:** 15-25 minutes
- **Staging Deploy:** 10-15 minutes
- **Production Deploy:** 25-35 minutes

### Optimization Tips

1. **Use Caching**
   - npm dependencies (automatic)
   - Build outputs
   - Docker layers

2. **Parallel Execution**
   - Independent jobs run concurrently
   - Matrix strategies for multi-version

3. **Conditional Workflows**
   - Skip unnecessary steps on PRs
   - Use path filters

4. **Resource Management**
   - Appropriate timeouts
   - Artifact retention policies

## Security

### Security Scanning Schedule

- **Daily:** Full security scan at 2 AM UTC
- **On Push:** Dependency audit
- **On PR:** CodeQL analysis
- **On Deploy:** Docker image scanning

### Security Best Practices

1. ✅ All secrets encrypted in GitHub
2. ✅ Least privilege access
3. ✅ Environment protection rules
4. ✅ Required reviewers for production
5. ✅ Automatic secret scanning
6. ✅ Regular dependency updates
7. ✅ SBOM generation for containers
8. ✅ Multi-stage Docker builds

## Disaster Recovery

### Rollback Procedures

**Automatic Rollback:**
- Post-deployment verification fails
- Health checks fail
- Performance regression detected

**Manual Rollback:**
```bash
# Option 1: Revert commit
git revert HEAD
git push origin main

# Option 2: Deploy previous version
gh workflow run cd-production.yml --ref <previous-commit>

# Option 3: Vercel rollback
vercel rollback <deployment-url>
```

### Backup Strategy

- **Code:** Git repository (GitHub)
- **Deployments:** Vercel deployment history
- **Artifacts:** 7-30 day retention
- **Logs:** GitHub Actions logs
- **SBOM:** 90 day retention

## Monitoring & Alerts

### GitHub Actions Insights

Access via: `Actions → Workflow name → Insights`

Metrics available:
- Success/failure rates
- Execution duration
- Resource usage
- Workflow trends

### Setting Up Alerts

```yaml
# In workflow file
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Deployment Failed',
        body: 'Deployment failed. Check logs.',
        labels: ['deployment', 'urgent']
      })
```

## Cost Optimization

### GitHub Actions Minutes

- **Free tier:** 2,000 minutes/month
- **Current usage:** ~500-800 minutes/month
- **Optimization:** Caching, concurrency control

### Artifact Storage

- **Free tier:** 500 MB
- **Current usage:** ~100-200 MB
- **Optimization:** Retention policies, compression

### Recommendations

1. Use self-hosted runners for high-volume
2. Optimize workflow execution time
3. Clean up old artifacts
4. Use matrix strategies efficiently

## Contributing

### Modifying Workflows

1. Create feature branch
2. Update workflow files
3. Test in feature branch
4. Update documentation
5. Request review from DevOps team
6. Merge after approval

### Documentation Updates

When modifying pipelines:
- Update [CI/CD Setup](./ci-cd-setup.md)
- Update [Secrets Guide](./github-secrets.md) if needed
- Add troubleshooting tips to [Troubleshooting](./troubleshooting.md)
- Update this README

## Support & Resources

### Internal Resources

- [CI/CD Setup Guide](./ci-cd-setup.md)
- [GitHub Secrets Guide](./github-secrets.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Workflow Status](./.github/workflows-status.md)

### External Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

### Getting Help

1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Review workflow logs
3. Search GitHub Actions Community
4. Contact DevOps team
5. Create GitHub issue

## Changelog

| Date | Change | Author | Reference |
|------|--------|--------|-----------|
| 2025-10-02 | Initial CI/CD pipeline setup | DevOps Agent | Week 1-4 Critical Fixes |
| 2025-10-02 | Added comprehensive documentation | DevOps Agent | Week 1-4 Critical Fixes |
| 2025-10-02 | Configured all workflows | DevOps Agent | Week 1-4 Critical Fixes |

---

## Quick Links

- 📊 [View Workflows](https://github.com/YOUR_USERNAME/describe_it/actions)
- 🔐 [Configure Secrets](https://github.com/YOUR_USERNAME/describe_it/settings/secrets/actions)
- 🌍 [Manage Environments](https://github.com/YOUR_USERNAME/describe_it/settings/environments)
- 🐛 [Report Issues](https://github.com/YOUR_USERNAME/describe_it/issues)
- 📖 [Full Documentation](./ci-cd-setup.md)

---

**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team
