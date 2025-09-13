# GitHub Actions Optimization Guide

## Current Usage Analysis
- **Total Workflows**: 13 files
- **Minutes Used**: 3,000/3,000 (100%)
- **Estimated Savings**: 60-70% reduction possible

## Immediate Optimizations

### 1. Disable Redundant Workflows
Add `workflow_dispatch` trigger and remove automatic triggers from:
- `test.yml` (duplicate of test-ci.yml)
- `ci.yml` (duplicate of ci-cd.yml)  
- `cd.yml` (covered by ci-cd.yml)
- `production.yml` (duplicate of production-deploy.yml)

### 2. Add Path Filters
Modify workflows to skip on non-code changes:

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'
      - 'docs/**'
      - '.github/workflows-optimization.md'
      - 'LICENSE'
```

### 3. Consolidate Test Workflows
Combine into single `test-suite.yml`:
- Unit tests
- Integration tests
- E2E tests (run only on main branch)

### 4. Add Manual Triggers
For expensive workflows, add manual dispatch:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * 0'  # Weekly instead of on every push
```

### 5. Use Concurrency Groups
Prevent duplicate runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Recommended Immediate Actions

1. **DISABLE these workflows temporarily:**
   ```bash
   # Rename to disable
   mv .github/workflows/test.yml .github/workflows/test.yml.disabled
   mv .github/workflows/ci.yml .github/workflows/ci.yml.disabled
   mv .github/workflows/cd.yml .github/workflows/cd.yml.disabled
   mv .github/workflows/production.yml .github/workflows/production.yml.disabled
   ```

2. **MODIFY pr-checks.yml:**
   - Add path filters
   - Run only essential checks
   - Skip deployment previews for draft PRs

3. **OPTIMIZE test-ci.yml:**
   - Cache dependencies better
   - Run tests in parallel
   - Skip coverage on non-main branches

## Expected Savings
- **Immediate**: 40% reduction by disabling duplicates
- **With optimizations**: 60-70% total reduction
- **Estimated new usage**: ~900-1,200 minutes/month

## Alternative Strategies
1. Use local pre-commit hooks for linting
2. Run tests locally before pushing
3. Use GitHub's free tier for public repos when possible
4. Consider self-hosted runners for heavy workloads