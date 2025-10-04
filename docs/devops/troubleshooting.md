# CI/CD Troubleshooting Guide

## Quick Diagnostics

### 1. Workflow Not Triggering

**Symptoms:**
- Push to branch but workflow doesn't run
- PR created but no checks appear

**Diagnosis:**
```bash
# Check workflow file syntax
cat .github/workflows/ci.yml | grep -E "^on:|  - "

# Verify branch names match
git branch --show-current
```

**Solutions:**
1. Verify workflow file is in `.github/workflows/` (not `.disabled`)
2. Check `on:` triggers match your branch name
3. Ensure YAML syntax is valid
4. Check if workflows are disabled in repository settings
5. Verify file has `.yml` or `.yaml` extension

---

### 2. Failed Health Checks

**Symptoms:**
- Deployment succeeds but health check fails
- Container starts but becomes unhealthy

**Diagnosis:**
```bash
# Local health check test
npm run build
npm start &
sleep 10
curl http://localhost:3000/api/health

# Docker health check test
docker build -f config/docker/Dockerfile -t test .
docker run -p 3000:3000 test &
sleep 15
curl http://localhost:3000/api/health
docker logs $(docker ps -q --filter ancestor=test)
```

**Solutions:**
1. **Missing environment variables:**
   ```bash
   # Check required env vars in deployment
   vercel env ls
   ```

2. **Port binding issues:**
   ```bash
   # Verify PORT env var
   echo $PORT  # Should be 3000
   ```

3. **Database connection timeout:**
   - Check database credentials
   - Verify network connectivity
   - Increase timeout in health check

4. **Application startup time:**
   - Increase health check wait time
   - Add startup probe in addition to health check

---

### 3. Test Failures

**Symptoms:**
- Tests pass locally but fail in CI
- Intermittent test failures

**Diagnosis:**
```bash
# Run tests with CI environment
CI=true npm run test

# Check for timing issues
npm run test -- --reporter=verbose

# Verify test dependencies
npm ls --depth=0
```

**Solutions:**

#### Environment Differences
```bash
# Match CI Node version locally
nvm use 20

# Use same npm version
npm install -g npm@10
```

#### Timing Issues
```typescript
// Add proper waits in tests
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 10000 });
```

#### Database State
```typescript
// Ensure test isolation
beforeEach(async () => {
  await clearDatabase();
  await seedTestData();
});
```

#### Cache Issues
```bash
# Clear test cache
rm -rf .next
rm -rf node_modules/.cache
npm test -- --no-cache
```

---

### 4. Build Failures

**Symptoms:**
- Build fails in CI but works locally
- Type errors in CI only

**Diagnosis:**
```bash
# Clean build test
rm -rf .next node_modules
npm ci
npm run build

# Type check
npm run typecheck

# Check for build warnings
npm run build 2>&1 | grep -i warning
```

**Solutions:**

#### Dependency Issues
```bash
# Use exact versions from lock file
npm ci  # Instead of npm install

# Verify lock file is committed
git ls-files | grep package-lock.json
```

#### TypeScript Configuration
```json
// tsconfig.json - ensure strict mode
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": false
  }
}
```

#### Memory Issues
```yaml
# Increase Node memory in workflow
- name: Build
  run: NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

### 5. Docker Build Issues

**Symptoms:**
- Docker build fails in CI
- Multi-platform build errors
- Image size too large

**Diagnosis:**
```bash
# Test build locally
docker build -f config/docker/Dockerfile -t test .

# Check platform support
docker buildx ls

# Analyze image size
docker images | grep describe-it
```

**Solutions:**

#### Build Context Issues
```bash
# Verify .dockerignore
cat .dockerignore

# Check build context size
du -sh .
```

#### Platform-Specific Errors
```yaml
# Build for specific platform only
platforms: linux/amd64  # Remove arm64 if issues
```

#### Cache Issues
```bash
# Clear Docker build cache
docker builder prune -af

# Disable cache in build
docker build --no-cache -t test .
```

#### Large Image Size
```dockerfile
# Use multi-stage builds
FROM node:18-alpine AS builder
# Build stage

FROM node:18-alpine AS runner
# Only copy necessary files
COPY --from=builder /app/.next/standalone ./
```

---

### 6. Deployment Failures

**Symptoms:**
- Vercel deployment fails
- Deployment times out
- 404 errors after deployment

**Diagnosis:**
```bash
# Test Vercel locally
vercel dev

# Check Vercel logs
vercel logs <deployment-url>

# Verify project settings
vercel project ls
```

**Solutions:**

#### Authentication Issues
```bash
# Verify token
vercel whoami --token=$VERCEL_TOKEN

# Regenerate token if needed
# Settings → Tokens → Create Token
```

#### Build Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

#### Environment Variables
```bash
# List configured env vars
vercel env ls

# Add missing env vars
vercel env add NEXT_PUBLIC_API_URL production
```

#### Deployment Timeout
```yaml
# Increase timeout in workflow
timeout-minutes: 30  # Increase from 15
```

---

### 7. Secret/Environment Variable Issues

**Symptoms:**
- "Secret not found" errors
- Authentication failures
- Missing configuration values

**Diagnosis:**
```bash
# List available secrets (names only)
gh secret list

# Check environment configuration
gh api repos/:owner/:repo/environments
```

**Solutions:**

#### Secret Not Available
```bash
# Verify secret exists
gh secret list | grep VERCEL_TOKEN

# Set secret
gh secret set VERCEL_TOKEN

# For environment-specific
gh secret set VERCEL_TOKEN --env production
```

#### Wrong Environment
```yaml
# Ensure job uses correct environment
jobs:
  deploy:
    environment:
      name: production  # Must match secret environment
```

#### Case Sensitivity
```yaml
# Secret names are case-sensitive
secrets.VERCEL_TOKEN  # Correct
secrets.vercel_token  # Wrong
```

---

### 8. Performance Issues

**Symptoms:**
- Workflows take too long
- Timeout errors
- High resource usage

**Diagnosis:**
```bash
# Check workflow duration
gh run list --limit 10

# View specific run
gh run view <run-id> --log
```

**Solutions:**

#### Optimize Dependencies
```yaml
# Use npm ci instead of npm install
- run: npm ci

# Cache dependencies
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

#### Parallel Jobs
```yaml
# Run independent jobs in parallel
jobs:
  lint:
    # No dependencies
  test:
    # No dependencies
  # Both run at same time
```

#### Reduce Test Scope
```yaml
# Only run affected tests on PR
- name: Test
  run: |
    if [ "${{ github.event_name }}" == "pull_request" ]; then
      npm run test:changed
    else
      npm run test
    fi
```

#### Optimize Docker Builds
```yaml
# Use layer caching
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

### 9. Security Scan Failures

**Symptoms:**
- CodeQL analysis fails
- Vulnerability scan errors
- Secret detection false positives

**Diagnosis:**
```bash
# Run security audit locally
npm audit

# Check for high severity
npm audit --audit-level=high

# Test CodeQL locally (requires CodeQL CLI)
codeql database create --language=javascript
```

**Solutions:**

#### Dependency Vulnerabilities
```bash
# Fix automatically where possible
npm audit fix

# Force fix (may break things)
npm audit fix --force

# Update specific package
npm update <package-name>
```

#### CodeQL Errors
```yaml
# Reduce languages if needed
- uses: github/codeql-action/init@v3
  with:
    languages: javascript  # Remove typescript if issues
```

#### False Positive Secrets
```yaml
# Add to .gitignore or secret scanning config
# .github/secret_scanning.yml
paths-ignore:
  - '**/*.test.ts'
  - '**/mock-data/**'
```

---

### 10. Concurrency Issues

**Symptoms:**
- Workflow canceled unexpectedly
- Deployment conflicts
- Race conditions

**Diagnosis:**
```bash
# Check concurrent runs
gh run list --status in_progress

# View workflow concurrency settings
cat .github/workflows/*.yml | grep -A 2 concurrency
```

**Solutions:**

#### Adjust Concurrency Groups
```yaml
# For CI - cancel old runs
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

# For production - no cancellation
concurrency:
  group: production-deploy
  cancel-in-progress: false
```

#### Queue Deployments
```yaml
# Ensure sequential deployments
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

---

## Common Error Messages

### "Resource not accessible by integration"

**Cause:** Insufficient GitHub token permissions

**Solution:**
```yaml
permissions:
  contents: read
  packages: write
  security-events: write
```

### "No space left on device"

**Cause:** Runner disk space full

**Solution:**
```yaml
# Clean up before build
- name: Free disk space
  run: |
    docker system prune -af
    rm -rf /opt/hostedtoolcache
```

### "ECONNREFUSED" or "ETIMEDOUT"

**Cause:** Network connectivity issues

**Solution:**
```yaml
# Add retries
- name: Install dependencies
  run: npm ci --retry 3 --retry-delay 1000
```

### "Container failed to initialize"

**Cause:** Docker container startup issues

**Solution:**
```bash
# Check container logs
docker logs <container-id>

# Verify health check command
HEALTHCHECK CMD curl -f http://localhost:3000/api/health || exit 1
```

---

## Debug Techniques

### Enable Debug Logging

```yaml
# In workflow file
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Use GitHub Actions Debugging

```bash
# Set up tmate for SSH debugging
- name: Setup tmate session
  if: failure()
  uses: mxschmitt/action-tmate@v3
```

### Verbose Output

```yaml
- name: Build
  run: npm run build --verbose
  env:
    DEBUG: '*'
```

### Artifact Upload for Debugging

```yaml
- name: Upload debug artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: debug-logs
    path: |
      **/*.log
      .next/build-manifest.json
```

---

## Getting Help

### Check Documentation

1. Review [CI/CD Setup Guide](./ci-cd-setup.md)
2. Check [GitHub Secrets Guide](./github-secrets.md)
3. Read workflow comments

### Workflow Logs

```bash
# View recent runs
gh run list --limit 10

# View specific run logs
gh run view <run-id> --log

# Download logs
gh run download <run-id>
```

### Community Resources

- [GitHub Actions Community](https://github.community/c/code-to-cloud/52)
- [Vercel Support](https://vercel.com/support)
- [Docker Community](https://www.docker.com/community/)

### Create an Issue

Include:
1. Workflow file content
2. Error message
3. Steps to reproduce
4. Expected vs actual behavior
5. Relevant logs

---

## Prevention Checklist

- [ ] Test workflows in feature branches first
- [ ] Use specific action versions (`@v4` not `@latest`)
- [ ] Add timeouts to all jobs
- [ ] Implement proper error handling
- [ ] Cache dependencies
- [ ] Use matrix strategies for compatibility
- [ ] Document custom secrets
- [ ] Regular dependency updates
- [ ] Monitor workflow performance
- [ ] Review failed runs promptly
