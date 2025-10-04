# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment. The pipeline is designed to ensure code quality, security, and reliable deployments.

## Pipeline Architecture

### 1. Continuous Integration (CI)

**Workflow:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

**Jobs:**

#### Static Analysis
- **Lint & Type Check** (10 min timeout)
  - ESLint code quality checks
  - TypeScript type checking
  - Prettier formatting verification
  - Caches lint results for faster subsequent runs

#### Testing
- **Unit Tests** (15 min timeout)
  - Runs with coverage reporting
  - Matrix strategy for Node.js 20
  - Uploads coverage to Codecov
  - Archives test results

- **Integration Tests** (20 min timeout)
  - Tests API integrations
  - Database interactions
  - Service communication

- **E2E Tests** (30 min timeout)
  - Playwright browser tests
  - Chromium only for faster execution
  - Uploads test reports on failure

#### Security
- **Security Scan** (10 min timeout)
  - npm audit for known vulnerabilities
  - CodeQL static analysis
  - Dependency vulnerability checks

#### Build Verification
- **Build Verification** (15 min timeout)
  - Production build test
  - Build output validation
  - Caches build artifacts

### 2. Continuous Deployment - Staging

**Workflow:** `.github/workflows/cd-staging.yml`

**Triggers:**
- Push to `develop` branch
- Pull requests to `main` branch
- Manual workflow dispatch

**Jobs:**

#### Deploy to Staging
- Vercel preview deployment
- Automatic environment configuration
- PR comment with deployment URL

#### Verify Staging
- E2E tests against staging environment
- Smoke tests
- Health checks
- Upload test results

### 3. Continuous Deployment - Production

**Workflow:** `.github/workflows/cd-production.yml`

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch (with skip tests option for emergencies)

**Jobs:**

#### Pre-Deployment Validation
- Full test suite execution
- Build verification
- Can be skipped for emergency deployments

#### Docker Build & Push
- Multi-platform builds (amd64, arm64)
- GitHub Container Registry (ghcr.io)
- SBOM generation
- Image tagging strategy:
  - `latest` - Latest main branch
  - `production` - Production tag
  - `prod-main-<sha>` - Commit-specific
  - `<version>` - Semantic versioning
  - `<major>.<minor>` - Major.minor versions

#### Vercel Production Deploy
- Production environment deployment
- Environment configuration
- Health check verification

#### Post-Deployment Verification
- Smoke tests against production
- Health endpoint checks (10 attempts)
- Deployment status verification

#### Performance Testing
- Lighthouse CI
- Web Vitals testing
- Performance metrics upload

#### Rollback on Failure
- Automatic failure detection
- Manual rollback instructions

### 4. Security Scanning

**Workflow:** `.github/workflows/security-scan.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests
- Daily schedule (2 AM UTC)
- Manual workflow dispatch

**Jobs:**

#### Dependency Audit
- npm audit execution
- Production dependency checks
- Vulnerability reporting

#### CodeQL Analysis
- JavaScript/TypeScript security analysis
- Security and quality queries
- SARIF report upload

#### Docker Image Scanning
- Trivy vulnerability scanner
- Critical and high severity checks
- SARIF report for GitHub Security

#### Secret Detection
- TruffleHog secret scanning
- Historical commit analysis
- Verified secrets only

#### Dependency Check
- OWASP dependency checks
- Outdated dependency detection
- Security update recommendations

### 5. Docker Build & Publish

**Workflow:** `.github/workflows/docker-publish.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Version tags (`v*.*.*`)
- Pull requests to `main`
- Manual workflow dispatch

**Jobs:**

#### Build
- Multi-architecture builds (amd64, arm64)
- QEMU for cross-platform builds
- Docker Buildx
- GitHub Container Registry push
- SBOM generation

#### Scan
- Trivy security scanning
- Vulnerability reporting
- SARIF upload to GitHub Security

#### Test
- Container startup verification
- Health check testing
- Container logs on failure

## Environment Configuration

### Required Secrets

#### Vercel Deployment
```
VERCEL_TOKEN - Vercel deployment token
```

#### Code Coverage
```
CODECOV_TOKEN - Codecov upload token (optional but recommended)
```

#### Performance Testing
```
LHCI_GITHUB_APP_TOKEN - Lighthouse CI GitHub App token (optional)
```

### Environment Variables

#### Production
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### Staging
```
NODE_ENV=production
```

## Workflow Optimization

### Caching Strategy

1. **npm dependencies** - Automatic via `actions/setup-node@v4`
2. **Build artifacts** - `.next/cache` and `.next/static`
3. **Lint results** - ESLint cache and TypeScript build info
4. **Docker layers** - GitHub Actions cache

### Concurrency Control

- **CI Pipeline:** Cancels in-progress runs on new commits
- **Production Deployment:** No concurrent deployments allowed
- **Staging Deployment:** Cancel in-progress per branch

### Timeout Configuration

All jobs have appropriate timeouts to prevent hung workflows:
- Lint & Type Check: 10 minutes
- Unit Tests: 15 minutes
- Integration Tests: 20 minutes
- E2E Tests: 30 minutes
- Docker Build: 30 minutes
- Deployments: 15-20 minutes

## Deployment Strategy

### Branch Strategy

```
main (production)
  ↑
  PR with staging verification
  ↑
develop (staging)
  ↑
  feature branches
```

### Deployment Flow

1. **Feature Development**
   - Create feature branch from `develop`
   - CI runs on every push
   - PR creates staging preview

2. **Staging Deployment**
   - Merge to `develop`
   - Auto-deploy to staging
   - Full E2E test suite
   - QA verification

3. **Production Deployment**
   - PR from `develop` to `main`
   - Staging verification required
   - Manual approval for production
   - Merge triggers production deploy
   - Post-deployment verification
   - Performance testing

## Monitoring & Alerts

### GitHub Actions Insights

- Workflow run history
- Job duration tracking
- Success/failure rates
- Resource usage

### Deployment Summaries

Each workflow generates a summary with:
- Job status table
- Deployment URLs
- Test results
- Performance metrics

### Artifacts

- Test reports (7-14 days retention)
- Coverage reports (uploaded to Codecov)
- Build artifacts (3 days retention)
- Performance results (30 days retention)
- SBOM files (90 days retention)

## Troubleshooting

### Common Issues

#### Failed Health Checks
- Check deployment logs
- Verify environment variables
- Check external service dependencies
- Review timeout settings

#### Test Failures
- Review test logs in artifacts
- Check for environment-specific issues
- Verify test data setup

#### Build Failures
- Check Node.js version compatibility
- Verify dependencies are locked
- Review build logs for errors

#### Docker Build Issues
- Check Dockerfile syntax
- Verify multi-stage build steps
- Review platform compatibility

### Emergency Procedures

#### Skip Tests for Emergency Deploy
```bash
# Use workflow_dispatch with skip_tests option
# Navigate to Actions → CD Production → Run workflow
# Select "true" for skip_tests
```

#### Manual Rollback
```bash
# Revert the last commit on main
git revert HEAD
git push origin main

# Or deploy a specific version
git checkout <previous-commit>
git push origin main --force
```

## Performance Metrics

### Expected Execution Times

- **CI Pipeline:** 15-25 minutes
- **Staging Deploy:** 10-15 minutes
- **Production Deploy:** 25-35 minutes
- **Security Scan:** 15-20 minutes
- **Docker Publish:** 20-30 minutes

### Optimization Tips

1. **Use caching effectively**
   - Dependencies
   - Build outputs
   - Docker layers

2. **Parallel job execution**
   - Independent jobs run concurrently
   - Matrix strategies for multi-version testing

3. **Conditional job execution**
   - Skip unnecessary jobs on PRs
   - Use job dependencies wisely

4. **Artifact management**
   - Keep retention periods reasonable
   - Upload only necessary artifacts

## Best Practices

1. **Always run tests before deployment**
2. **Use semantic versioning for releases**
3. **Monitor deployment health checks**
4. **Review security scan results**
5. **Keep dependencies updated**
6. **Document workflow changes**
7. **Test workflow changes in feature branches**
8. **Use meaningful commit messages**
9. **Tag production releases**
10. **Monitor resource usage**

## Contributing

When modifying workflows:

1. Test changes in a feature branch
2. Document changes in this file
3. Update secrets documentation if needed
4. Verify backward compatibility
5. Test all affected workflows
6. Get approval from DevOps team

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Docker Build Documentation](https://docs.docker.com/build/)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Playwright Documentation](https://playwright.dev/)
