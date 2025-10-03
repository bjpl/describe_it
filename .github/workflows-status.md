# GitHub Actions Workflow Status

## CI/CD Pipeline Status

### Continuous Integration
[![CI Pipeline](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/ci.yml)

**Triggers:** Push to main/develop, Pull requests
**Jobs:** Lint, Type Check, Unit Tests, Integration Tests, E2E Tests, Security Scan, Build Verification

---

### Continuous Deployment - Production
[![Production Deploy](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/cd-production.yml/badge.svg)](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/cd-production.yml)

**Triggers:** Push to main, Manual dispatch
**Environment:** Production (https://describe-it.vercel.app)

---

### Continuous Deployment - Staging
[![Staging Deploy](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/cd-staging.yml/badge.svg)](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/cd-staging.yml)

**Triggers:** Push to develop, Pull requests to main
**Environment:** Staging (preview deployments)

---

### Security Scanning
[![Security Scan](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/security-scan.yml/badge.svg)](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/security-scan.yml)

**Schedule:** Daily at 2 AM UTC
**Scans:** Dependencies, CodeQL, Docker Images, Secrets, OWASP

---

### Docker Build & Publish
[![Docker Publish](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/YOUR_USERNAME/describe_it/actions/workflows/docker-publish.yml)

**Registry:** ghcr.io
**Platforms:** linux/amd64, linux/arm64

---

## Quick Links

- [View All Workflows](https://github.com/YOUR_USERNAME/describe_it/actions)
- [CI/CD Documentation](/docs/devops/ci-cd-setup.md)
- [Secrets Configuration](/docs/devops/github-secrets.md)
- [Troubleshooting Guide](/docs/devops/troubleshooting.md)

---

## Workflow Files

| Workflow | File | Purpose |
|----------|------|---------|
| CI | `.github/workflows/ci.yml` | Continuous Integration |
| Production Deploy | `.github/workflows/cd-production.yml` | Production Deployment |
| Staging Deploy | `.github/workflows/cd-staging.yml` | Staging Deployment |
| Security Scan | `.github/workflows/security-scan.yml` | Security Scanning |
| Docker Publish | `.github/workflows/docker-publish.yml` | Docker Image Publishing |

---

## Setup Instructions

### 1. Update Badge URLs

Replace `YOUR_USERNAME` in badge URLs with your GitHub username.

### 2. Configure Secrets

Required secrets (see [GitHub Secrets Guide](/docs/devops/github-secrets.md)):
- `VERCEL_TOKEN` - Vercel deployment token
- `CODECOV_TOKEN` - Code coverage token (optional)
- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI token (optional)

### 3. Enable Workflows

Workflows are automatically enabled when pushed to the repository. Verify in:
```
Settings → Actions → General → Allow all actions and reusable workflows
```

### 4. Set Up Environments

Create environments in repository settings:
1. **production** - Requires reviewers
2. **staging** - Auto-deploy

---

## Monitoring

### View Workflow Runs

```bash
# List recent runs
gh run list --limit 10

# Watch a specific run
gh run watch

# View logs
gh run view <run-id> --log
```

### Download Artifacts

```bash
# List artifacts
gh run view <run-id> --log

# Download specific artifact
gh run download <run-id> --name <artifact-name>
```

---

## Manual Workflow Triggers

### Trigger Production Deploy

```bash
gh workflow run cd-production.yml
```

### Trigger Security Scan

```bash
gh workflow run security-scan.yml
```

### Trigger with Input

```bash
gh workflow run cd-production.yml --field skip_tests=true
```

---

## Status Checks

### Required Status Checks

Configure in: `Settings → Branches → Branch protection rules → main`

Recommended required checks:
- ✅ CI Pipeline Success
- ✅ Lint & Type Check
- ✅ Unit Tests
- ✅ Integration Tests
- ✅ E2E Tests
- ✅ Build Verification

---

## Performance Metrics

### Average Execution Times

| Workflow | Average Duration | Timeout |
|----------|------------------|---------|
| CI | 15-25 minutes | 60 minutes |
| Staging Deploy | 10-15 minutes | 30 minutes |
| Production Deploy | 25-35 minutes | 60 minutes |
| Security Scan | 15-20 minutes | 40 minutes |
| Docker Publish | 20-30 minutes | 45 minutes |

---

## Troubleshooting

See [Troubleshooting Guide](/docs/devops/troubleshooting.md) for common issues and solutions.

Common issues:
- Failed health checks
- Test failures
- Build errors
- Deployment timeouts
- Secret configuration

---

## Contributing

When modifying workflows:

1. Test changes in a feature branch
2. Verify workflows pass before merging
3. Update documentation
4. Notify team of changes

---

## Support

- 📖 [Documentation](/docs/devops/)
- 🐛 [Report Issues](https://github.com/YOUR_USERNAME/describe_it/issues)
- 💬 [Discussions](https://github.com/YOUR_USERNAME/describe_it/discussions)
