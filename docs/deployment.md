# Deployment Guide

## Overview

This guide covers the complete CI/CD pipeline setup for the Spanish Learning Application. The pipeline includes automated testing, security scanning, performance monitoring, and deployment to staging and production environments.

## Pipeline Architecture

### Workflows

1. **Continuous Integration (`ci.yml`)**
   - Triggered on: Push to main/develop, Pull requests
   - Jobs: Lint, Test, E2E Tests, Build, Bundle Analysis, Lighthouse CI

2. **Continuous Deployment (`cd.yml`)**
   - Triggered on: Push to main (staging), Releases (production)
   - Jobs: Deploy to staging/production, post-deployment tests, rollback

3. **Security Scanning (`security.yml`)**
   - Triggered on: Push, PR, Weekly schedule
   - Jobs: CodeQL, Dependency scan, Secret detection, Docker scan, License check

4. **Performance Monitoring (`performance.yml`)**
   - Triggered on: Push to main, PR, Every 6 hours
   - Jobs: Lighthouse audit, Bundle size check, Web Vitals, Performance regression

## Environment Setup

### Required Secrets

Configure these secrets in your GitHub repository settings:

#### Core Application
- `SUPABASE_URL` / `STAGING_SUPABASE_URL` / `PROD_SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `STAGING_SUPABASE_ANON_KEY` / `PROD_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `UNSPLASH_ACCESS_KEY`

#### Deployment
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

#### Monitoring & Analytics
- `SENTRY_DSN` - Sentry error tracking DSN
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project name
- `SENTRY_AUTH_TOKEN` - Sentry authentication token

#### Security Scanning
- `SNYK_TOKEN` - Snyk security scanning token
- `SEMGREP_APP_TOKEN` - Semgrep security analysis token

#### Notifications
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications

#### Performance
- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI GitHub app token

### Environment Variables

Create environment-specific configurations:

#### Development (.env.local)
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_TELEMETRY_DISABLED=1
```

#### Staging
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://describe-it-staging.vercel.app
```

#### Production
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://describe-it.vercel.app
```

## Deployment Process

### Staging Deployment

1. **Automatic Trigger**: Push to `main` branch
2. **Process**:
   - Run full test suite
   - Build application with staging environment variables
   - Deploy to Vercel staging environment
   - Run post-deployment smoke tests
   - Send Slack notification

### Production Deployment

1. **Manual Trigger**: Create a GitHub release
2. **Process**:
   - Run comprehensive test suite including E2E tests
   - Build application with production environment variables
   - Deploy to Vercel production environment
   - Run smoke tests
   - Create Sentry release for error tracking
   - Send success notification

### Rollback Strategy

If production deployment fails:
1. Automatic rollback to previous Vercel deployment
2. Slack notification of rollback
3. Manual investigation required

## Monitoring and Alerting

### Error Tracking (Sentry)

- **Client-side errors**: Captured with session replay
- **Server-side errors**: API route failures and server errors
- **Performance monitoring**: Core Web Vitals and custom metrics
- **Release tracking**: Automatic release creation on deployment

### Performance Monitoring

- **Lighthouse CI**: Automated performance audits on every deployment
- **Bundle Analysis**: Track bundle size changes in pull requests
- **Web Vitals**: Real user monitoring of performance metrics
- **Regression Testing**: Automated performance baseline comparison

### Uptime Monitoring

- **Health Check Endpoint**: `/api/health` monitors:
  - Database connectivity
  - External API availability
  - Environment configuration
  - System health metrics

### Security Monitoring

- **CodeQL**: Static analysis for security vulnerabilities
- **Dependency Scanning**: Automated vulnerability detection in dependencies
- **Secret Detection**: Prevent accidental secret commits
- **License Compliance**: Ensure license compatibility

## Branch Protection Rules

Configure these rules for the `main` branch:

1. **Required Status Checks**:
   - Lint and Format Check
   - Run Tests (Node 18, 20)
   - E2E Tests
   - Build Application
   - CodeQL Analysis
   - Dependency Vulnerability Scan

2. **Additional Settings**:
   - Require branches to be up to date
   - Require review from code owners
   - Dismiss stale reviews when new commits are pushed
   - Require signed commits (recommended)

## Performance Budgets

### Lighthouse Thresholds
- Performance: ≥ 85
- Accessibility: ≥ 95
- Best Practices: ≥ 90
- SEO: ≥ 90
- PWA: ≥ 80

### Bundle Size Limits
- Initial JS: < 200KB
- Total JS: < 500KB
- CSS: < 50KB
- Images: Optimized and lazy-loaded

### Core Web Vitals Targets
- First Contentful Paint (FCP): < 2s
- Largest Contentful Paint (LCP): < 3s
- Cumulative Layout Shift (CLS): < 0.1
- Total Blocking Time (TBT): < 300ms

## Troubleshooting

### Common Issues

#### Build Failures
1. Check Node.js version compatibility
2. Verify all environment variables are set
3. Ensure dependencies are properly locked
4. Check for TypeScript errors

#### Test Failures
1. Update test snapshots if needed
2. Check for race conditions in E2E tests
3. Verify test data setup
4. Check for missing test dependencies

#### Deployment Issues
1. Verify Vercel configuration
2. Check environment variables in Vercel dashboard
3. Review function timeout settings
4. Check for memory limits

#### Security Scan Failures
1. Review vulnerability reports
2. Update dependencies with known issues
3. Add exceptions for false positives
4. Check for exposed secrets

### Debugging Steps

1. **Check GitHub Actions logs**:
   - Navigate to Actions tab in repository
   - Click on failed workflow
   - Review job logs for specific errors

2. **Verify environment setup**:
   - Confirm all required secrets are set
   - Check secret names match workflow files
   - Verify environment variable formats

3. **Test locally**:
   - Run tests locally with same Node.js version
   - Verify build process works locally
   - Check Lighthouse scores locally

4. **Monitor deployments**:
   - Use Vercel dashboard for deployment logs
   - Check Sentry for runtime errors
   - Monitor health check endpoint

### Getting Help

1. Check workflow documentation in `.github/workflows/`
2. Review Vercel deployment logs
3. Check Sentry error reports
4. Monitor Slack notifications for alerts
5. Consult team members for assistance

## Best Practices

### Code Quality
- Run pre-commit hooks for linting and formatting
- Write comprehensive tests for new features
- Maintain high test coverage (>80%)
- Follow TypeScript strict mode

### Security
- Never commit secrets or API keys
- Regularly update dependencies
- Review security scan results
- Use environment-specific configurations

### Performance
- Monitor bundle size changes
- Optimize images and assets
- Use lazy loading where appropriate
- Monitor Core Web Vitals

### Monitoring
- Set up alerts for critical metrics
- Review error rates regularly
- Monitor deployment success rates
- Track performance regressions

## Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check security scan results
- Monitor performance trends
- Review error reports

### Monthly Tasks
- Update workflow dependencies
- Review and optimize performance budgets
- Audit security configurations
- Update documentation