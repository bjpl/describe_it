# Troubleshooting Guide

## CI/CD Pipeline Issues

### Build Failures

#### Node.js Version Mismatch
**Symptoms**: Build fails with module compatibility errors
**Solution**:
```bash
# Check .github/workflows/ci.yml for Node.js versions
# Ensure local version matches CI version
node --version
nvm use 18  # or whatever version CI uses
```

#### TypeScript Compilation Errors
**Symptoms**: Build fails during type checking
**Solution**:
```bash
# Run type check locally
npm run typecheck

# Common fixes:
# 1. Update type definitions
npm install --save-dev @types/node@latest

# 2. Fix strict mode issues
# Update tsconfig.json or fix type errors
```

#### Missing Environment Variables
**Symptoms**: Build succeeds but runtime errors occur
**Solution**:
1. Check `.env.example` for required variables
2. Verify GitHub Secrets are configured
3. Update Vercel environment variables

### Test Failures

#### Unit Test Issues
**Symptoms**: Jest/Vitest tests fail
**Solution**:
```bash
# Run tests locally
npm run test

# Update snapshots if UI changed
npm run test -- --updateSnapshot

# Debug specific test
npm run test -- --testNamePattern="specific test"
```

#### E2E Test Issues
**Symptoms**: Playwright tests timeout or fail
**Solution**:
```bash
# Run E2E tests locally
npm run test:e2e

# Debug with UI mode
npm run test:e2e -- --ui

# Check for race conditions
# Ensure proper wait conditions in tests
```

### Deployment Issues

#### Vercel Deployment Failures
**Symptoms**: Deployment fails or times out
**Diagnostics**:
1. Check Vercel dashboard for deployment logs
2. Verify build command in `vercel.json`
3. Check function timeout settings

**Solutions**:
```json
// Increase timeout in vercel.json
{
  "functions": {
    "src/app/api/slow-endpoint/route.ts": {
      "maxDuration": 30
    }
  }
}
```

#### Environment Variable Issues
**Symptoms**: Runtime errors about missing config
**Solution**:
1. Check Vercel dashboard environment variables
2. Ensure variables match between environments
3. Verify variable names don't have typos

### Security Scan Failures

#### CodeQL Issues
**Symptoms**: Security analysis finds vulnerabilities
**Solution**:
1. Review CodeQL results in GitHub Security tab
2. Fix identified security issues
3. Add exceptions for false positives:

```yaml
# .github/codeql/codeql-config.yml
name: "CodeQL Config"
paths-ignore:
  - "tests/**"
  - "**/*.test.ts"
```

#### Dependency Vulnerabilities
**Symptoms**: Snyk or npm audit finds issues
**Solution**:
```bash
# Check vulnerabilities
npm audit

# Auto-fix if possible
npm audit fix

# For unfixable issues, check if update available
npm update

# Add exclusions for false positives in CI
```

### Performance Issues

#### Lighthouse Score Degradation
**Symptoms**: Performance scores drop below thresholds
**Diagnostics**:
1. Check Lighthouse CI results
2. Compare with previous builds
3. Identify performance bottlenecks

**Solutions**:
```bash
# Run Lighthouse locally
npx lighthouse http://localhost:3000 --view

# Optimize bundle size
npm run analyze

# Check Core Web Vitals
npm run test:vitals
```

#### Bundle Size Increase
**Symptoms**: Bundle analysis shows size increase
**Solution**:
```bash
# Analyze bundle
npm run analyze

# Find large dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js

# Optimize imports
# Use dynamic imports for large components
const LargeComponent = dynamic(() => import('./LargeComponent'))
```

## Application Issues

### Database Connection Problems

#### Supabase Connection Errors
**Symptoms**: API routes fail with database errors
**Diagnostics**:
```bash
# Check health endpoint
curl https://your-app.vercel.app/api/health

# Check Supabase dashboard for connection issues
```

**Solutions**:
1. Verify Supabase credentials
2. Check Supabase service status
3. Review connection pool settings
4. Check for rate limiting

### API Integration Issues

#### OpenAI API Failures
**Symptoms**: AI features don't work
**Diagnostics**:
```javascript
// Check API key in browser console (development only)
console.log('API Key configured:', !!process.env.OPENAI_API_KEY)
```

**Solutions**:
1. Verify API key is valid
2. Check OpenAI service status
3. Review rate limiting
4. Check request format

#### Unsplash API Issues
**Symptoms**: Images don't load
**Solution**:
1. Check API key validity
2. Verify request parameters
3. Check rate limits
4. Ensure proper error handling

### Runtime Errors

#### Memory Issues
**Symptoms**: Function timeouts or memory errors
**Solution**:
```json
// Increase memory in vercel.json
{
  "functions": {
    "src/app/api/memory-intensive/route.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

#### Cold Start Issues
**Symptoms**: First request to API routes is slow
**Solutions**:
1. Implement warming strategies
2. Use edge runtime where possible
3. Optimize bundle size
4. Consider connection pooling

## Monitoring and Debugging

### Sentry Error Tracking

#### Setting Up Debug Information
```javascript
// Add to sentry config for better debugging
Sentry.init({
  debug: process.env.NODE_ENV === 'development',
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event:', event);
    }
    return event;
  }
});
```

#### Common Error Patterns
1. **Unhandled Promise Rejections**: Add proper error handling
2. **Memory Leaks**: Check for uncleaned event listeners
3. **Rate Limiting**: Implement backoff strategies

### Performance Debugging

#### Web Vitals Issues
```javascript
// Add custom Web Vitals reporting
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

#### Bundle Analysis
```bash
# Generate detailed bundle report
npm run build
npx @next/bundle-analyzer

# Check for duplicate dependencies
npx duplicate-package-checker-webpack-plugin
```

## Environment-Specific Issues

### Development Environment

#### Hot Reload Issues
**Symptoms**: Changes don't reflect in browser
**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
```

#### Port Conflicts
**Symptoms**: Development server won't start
**Solution**:
```bash
# Kill process on port 3000
npx kill-port 3000

# Use different port
PORT=3001 npm run dev
```

### Production Environment

#### Static Generation Issues
**Symptoms**: Pages fail to build or load
**Solution**:
1. Check for dynamic imports in static pages
2. Verify API routes return proper data
3. Review ISR configuration

#### Edge Function Limitations
**Symptoms**: API routes fail on Edge Runtime
**Solution**:
1. Check for Node.js-specific APIs
2. Use Edge-compatible libraries
3. Consider switching to Node.js runtime

## Emergency Procedures

### Immediate Rollback
```bash
# Using Vercel CLI
vercel rollback [deployment-url]

# Or through Vercel dashboard
# 1. Go to deployments
# 2. Find previous stable deployment
# 3. Click "Promote to Production"
```

### Incident Response
1. **Assess Impact**: Check error rates and user reports
2. **Immediate Action**: Rollback if necessary
3. **Investigation**: Review logs and metrics
4. **Communication**: Update status page and notify users
5. **Post-Mortem**: Document lessons learned

### Emergency Contacts
- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.com
- **Sentry Support**: support@sentry.io

## Preventive Measures

### Code Quality Gates
1. Pre-commit hooks for linting and testing
2. Required PR reviews
3. Automated dependency updates
4. Regular security audits

### Monitoring Setup
1. Health check endpoints
2. Error rate alerting
3. Performance monitoring
4. Uptime monitoring

### Testing Strategy
1. Unit tests for critical functions
2. Integration tests for API routes
3. E2E tests for user journeys
4. Performance regression tests

### Documentation Maintenance
1. Keep troubleshooting guide updated
2. Document known issues and solutions
3. Maintain runbook for common operations
4. Regular team knowledge sharing

## Getting Help

### Internal Resources
1. Check this troubleshooting guide
2. Review deployment documentation
3. Check team knowledge base
4. Consult with team members

### External Resources
1. GitHub Actions documentation
2. Vercel documentation
3. Next.js troubleshooting guides
4. Community forums and Stack Overflow

### Escalation Path
1. Team lead for technical issues
2. DevOps team for infrastructure issues
3. Security team for security concerns
4. External vendor support for service issues