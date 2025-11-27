# CI/CD Pipeline Documentation

## Overview

The Describe It application uses a comprehensive GitHub Actions CI/CD pipeline with multiple workflows for continuous integration, deployment, security scanning, and performance monitoring.

## Workflows

### 1. CI - Continuous Integration (`ci.yml`)

**Triggers:**

- Push to `main` and `develop` branches
- Pull requests to `main` and `develop`
- Manual workflow dispatch

**Jobs:**

#### Lint & Type Check

- Runs ESLint for code quality
- TypeScript type checking with `tsc --noEmit`
- Prettier formatting verification
- Caches lint results for faster subsequent runs

#### Unit Tests

- Runs Vitest unit tests with coverage
- Matrix strategy for Node.js 20
- Uploads coverage to Codecov
- Archives test results as artifacts

#### Integration Tests

- Runs integration test suite
- Tests API endpoints and service integrations
- Uploads coverage reports

#### E2E Tests

- Uses Playwright for end-to-end testing
- Installs Chromium browser
- Builds production version before testing
- Uploads Playwright reports and test results

#### Security Scan

- npm audit for dependency vulnerabilities
- CodeQL static analysis for security issues
- Checks for outdated dependencies

#### Build Verification

- Production build compilation
- Bundle size analysis and reporting
- Size limit enforcement (500KB for main bundle)
- Generates build statistics
- Caches build artifacts for deployment

**Concurrency:** Cancels in-progress runs on new commits

**Caching Strategy:**

- NPM dependencies cached by `package-lock.json` hash
- Build artifacts cached for reuse
- Lint results cached for incremental checks

---

### 2. CD - Production Deployment (`cd-production.yml`)

**Triggers:**

- Manual workflow dispatch (automated push disabled)
- Optional test skipping for emergency deploys

**Jobs:**

#### Pre-Deployment Validation

- Runs full test suite
- TypeScript type checking
- Linting
- Build verification
- Can be skipped with `skip_tests` input

#### Build Docker Image

- Multi-platform builds (amd64, arm64)
- Tags: `latest`, `production`, SHA, semver
- Generates Software Bill of Materials (SBOM)
- Uses GitHub Container Registry
- Layer caching for faster builds

#### Deploy to Vercel

- Pulls Vercel environment configuration
- Builds with Vercel CLI
- Deploys to production
- Outputs deployment URL
- Environment protection enabled

#### Post-Deployment Verification

- Comprehensive health checks with retries
- API endpoint validation
- Response time measurement
- Security headers validation
- Smoke test execution

**Health Check Endpoints:**

- `/api/health` - Basic health status
- `/` - Homepage availability

**Security Headers Verified:**

- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Content-Security-Policy

#### Performance Testing

- Lighthouse CI audit
- Web Vitals measurement
- Performance budget validation
- Results uploaded as artifacts

**Rollback Strategy:**

- Automatic failure detection
- Manual rollback instructions on failure
- Deployment status tracking

**Concurrency:** Prevents concurrent production deployments

---

### 3. Security Scanning (`security-scan.yml`)

**Triggers:**

- Scheduled daily at 2 AM UTC
- Manual workflow dispatch
- (Push/PR triggers temporarily disabled)

**Jobs:**

#### Dependency Audit

- npm audit for all dependencies
- Production-only dependency check
- JSON audit results export
- Moderate severity threshold

#### CodeQL Analysis

- Static security analysis
- JavaScript/TypeScript scanning
- Security and quality queries
- Results uploaded to GitHub Security

#### Docker Image Scanning

- Trivy vulnerability scanner
- SARIF format for GitHub integration
- Critical and high severity focus
- Scans base images and dependencies

#### Secret Scanning

- TruffleHog secret detection
- Scans entire repository history
- Verified secrets only
- Prevents credential leaks

#### Dependency Check

- OWASP-style dependency verification
- Identifies outdated packages
- Security update recommendations
- npm-check-updates integration

**Output:**

- Security scan summary
- Artifact uploads for all scan results
- GitHub Security tab integration
- 30-day retention for audit trails

---

### 4. Lighthouse CI - Performance Monitoring (`lighthouse-ci.yml`)

**Triggers:**

- Pull requests to main/develop
- Push to main branch
- Weekly schedule (Monday 9 AM UTC)
- Manual workflow dispatch

**Jobs:**

#### Lighthouse Performance Audit

- Builds production version
- Starts local Next.js server
- Runs Lighthouse CI with custom config
- Measures Core Web Vitals:
  - First Contentful Paint (< 2s)
  - Largest Contentful Paint (< 2.5s)
  - Cumulative Layout Shift (< 0.1)
  - Total Blocking Time (< 300ms)
- Performance score threshold: 80%
- Accessibility score threshold: 90%

**Performance Categories:**

- Performance
- Accessibility
- Best Practices
- SEO

#### Web Vitals Monitoring

- Collects real user metrics
- Playwright-based measurement
- Paint timing metrics
- Navigation timing
- Largest Contentful Paint tracking

#### Bundle Size Analysis

- ANALYZE mode build
- Webpack Bundle Analyzer integration
- JavaScript chunk analysis
- CSS file size tracking
- Size limit enforcement

**Bundle Size Limits:**

- Main JS bundle: 500KB
- CSS files: 100KB
- Warnings for oversized bundles

**Outputs:**

- PR comments with results
- Lighthouse reports in artifacts
- Bundle analysis visualizations
- Web Vitals JSON data

---

### 5. Security Headers Verification (`security-headers.yml`)

**Triggers:**

- Pull requests to main/develop
- Push to main branch
- Daily schedule at 3 AM UTC
- Manual workflow dispatch

**Jobs:**

#### Security Headers Verification

- Checks HTTP security headers
- Validates presence and values
- Required headers:
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Strict-Transport-Security
  - Content-Security-Policy
  - Permissions-Policy
  - X-XSS-Protection

#### CORS Configuration Check

- Origin validation
- Access-Control headers
- Cross-origin policy verification

#### OWASP Security Checks

- OWASP ZAP baseline scan
- Common vulnerability detection
- HTML and JSON reports
- Containerized scanning

#### SSL/TLS Configuration

- TLS version verification
- Cipher suite validation
- Certificate chain check
- HSTS enforcement

**Security Standards:**

- OWASP Top 10 compliance
- Security best practices
- Industry-standard headers
- HTTPS enforcement

---

## Environment Variables

### Required Secrets

```env
# Vercel Deployment
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>

# Code Coverage
CODECOV_TOKEN=<your-codecov-token>

# Lighthouse CI
LHCI_GITHUB_APP_TOKEN=<optional-github-app-token>

# GitHub (automatically provided)
GITHUB_TOKEN=<automatic>
```

### Build-time Variables

```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
CI=true
```

---

## Workflow Best Practices

### Caching Strategy

1. **Dependency Caching**
   - NPM cache by `package-lock.json` hash
   - Speeds up installation by 60-80%

2. **Build Caching**
   - Next.js `.next/cache` directory
   - Static assets reuse
   - Incremental builds

3. **Docker Layer Caching**
   - GitHub Actions cache
   - Multi-stage build optimization

### Parallel Execution

Jobs run in parallel when possible:

- Unit and integration tests run concurrently
- Linting and type checking run together
- Security scans run independently

### Artifact Management

**Retention Policies:**

- Test results: 7 days
- Build artifacts: 3 days
- Security reports: 30 days
- Performance results: 30 days
- SBOM: 90 days

---

## Performance Optimization

### Job Timeouts

- Linting: 10 minutes
- Unit tests: 15 minutes
- Integration tests: 20 minutes
- E2E tests: 30 minutes
- Build: 15 minutes
- Deployment: 20 minutes

### Resource Usage

- **Runners:** Ubuntu latest
- **Node.js:** Version 20.x
- **Caching:** NPM, build artifacts, Docker layers
- **Concurrency:** Cancel in-progress on new commits

---

## Monitoring & Alerts

### Success Criteria

All jobs must pass for CI success:

- ✅ Linting and type checking
- ✅ All tests (unit, integration, E2E)
- ✅ Security scans
- ✅ Build verification
- ✅ Bundle size limits

### Failure Handling

1. **Test Failures:** Block merge
2. **Security Failures:** Warning only (audit level: moderate)
3. **Performance Regression:** Warning, doesn't block
4. **Deployment Failures:** Auto-rollback notification

### GitHub Status Checks

Required for merge:

- CI Pipeline Success
- Lint & Type Check
- Unit Tests
- Integration Tests
- Build Verification

Optional (informational):

- E2E Tests
- Security Scan
- Performance Monitoring

---

## Deployment Process

### Production Deployment Flow

1. **Pre-validation**
   - Run all tests
   - Build verification
   - Security checks

2. **Docker Build**
   - Multi-platform image
   - SBOM generation
   - Registry push

3. **Vercel Deployment**
   - Environment pull
   - Production build
   - Deploy with CLI

4. **Post-deployment**
   - Health checks (10 retries)
   - Security header validation
   - Performance testing
   - Smoke tests

5. **Verification**
   - API endpoint checks
   - Response time validation
   - Security posture verification

### Emergency Deployment

Use `skip_tests: true` for emergency deploys:

- Bypasses pre-deployment validation
- Still runs post-deployment checks
- **Use with caution**

---

## Troubleshooting

### Common Issues

**Issue: NPM Install Fails**

- Clear NPM cache
- Check `package-lock.json` integrity
- Verify Node.js version compatibility

**Issue: Build Timeout**

- Check for circular dependencies
- Review bundle size
- Optimize imports

**Issue: E2E Tests Flaky**

- Increase timeouts
- Add wait conditions
- Check for race conditions

**Issue: Deployment Health Check Fails**

- Verify API endpoints are deployed
- Check environment variables
- Review server logs

### Debug Mode

Enable debug logging:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

---

## Future Improvements

### Planned Enhancements

1. **Progressive Deployment**
   - Canary releases
   - Blue-green deployments
   - Traffic splitting

2. **Advanced Monitoring**
   - Real User Monitoring (RUM)
   - Error tracking integration
   - Performance dashboards

3. **Automated Rollback**
   - Automatic failure detection
   - One-click rollback
   - Version management

4. **Enhanced Security**
   - SAST/DAST integration
   - Container scanning
   - Secrets rotation

---

## Maintenance

### Weekly Tasks

- Review failed workflows
- Update dependencies
- Check security advisories

### Monthly Tasks

- Audit workflow efficiency
- Review artifact retention
- Update Node.js version

### Quarterly Tasks

- Security audit
- Performance baseline review
- Workflow optimization

---

## Support & Resources

- **GitHub Actions Docs:** https://docs.github.com/actions
- **Vercel Deployment:** https://vercel.com/docs
- **Lighthouse CI:** https://github.com/GoogleChrome/lighthouse-ci
- **OWASP ZAP:** https://www.zaproxy.org/docs/

---

_Last Updated: November 27, 2025_
_Pipeline Version: 2.0_
