# GitHub Actions Workflow Reference

## Complete Workflow Documentation

This document provides detailed documentation for all GitHub Actions workflows in the Describe It project.

---

## Table of Contents

1. [Workflow Overview](#workflow-overview)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Secret Verification](#secret-verification)
4. [Deployment Workflows](#deployment-workflows)
5. [Trigger Conditions](#trigger-conditions)
6. [Job Dependencies](#job-dependencies)
7. [Output Variables](#output-variables)

---

## Workflow Overview

### Active Workflows

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| CI/CD Pipeline | `ci-cd.yml` | push, pull_request | Complete build, test, deploy |
| Verify Secrets | `verify-secrets.yml` | workflow_dispatch | Validate secret configuration |

### Workflow States

```
Disabled → .github/workflows.disabled/
Enabled  → .github/workflows/
```

To enable workflows:
```bash
mv .github/workflows.disabled/*.yml .github/workflows/
```

---

## CI/CD Pipeline

### Workflow: ci-cd.yml

**Full Path**: `.github/workflows/ci-cd.yml`

#### Overview

Complete CI/CD pipeline with the following stages:
1. Code quality checks (lint, typecheck)
2. Automated testing (unit, integration, E2E)
3. Security auditing
4. Docker image building
5. Performance testing
6. Deployment (Vercel)

#### Trigger Conditions

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

**Explanation**:
- `push` to `main` or `develop`: Full pipeline including deployment
- `pull_request` to `main`: All checks except production deployment
- Creates preview deployment for PRs

#### Environment Variables

```yaml
env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
```

#### Jobs

##### 1. lint-and-typecheck

**Purpose**: Code quality validation

**Steps**:
```yaml
- Checkout code
- Setup Node.js 18 with npm cache
- Install dependencies (npm ci)
- Run ESLint
- Check TypeScript types
- Check Prettier formatting
```

**Runs on**: `ubuntu-latest`
**Timeout**: 10 minutes
**Dependencies**: None

**Required Secrets**: None

**Success Criteria**:
- ✅ ESLint passes with no errors
- ✅ TypeScript compilation succeeds
- ✅ Code is properly formatted

##### 2. test

**Purpose**: Run unit and integration tests with coverage

**Steps**:
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Run tests with coverage
- Upload coverage to Codecov
```

**Runs on**: `ubuntu-latest`
**Timeout**: 15 minutes
**Dependencies**: `lint-and-typecheck`

**Required Secrets**:
- `CODECOV_TOKEN` (optional - upload will be skipped if not present)

**Success Criteria**:
- ✅ All tests pass
- ✅ Coverage meets minimum threshold (if configured)

**Outputs**: Coverage reports (uploaded to Codecov)

##### 3. e2e-tests

**Purpose**: End-to-end testing with Playwright

**Steps**:
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Install Playwright browsers with deps
- Build application
- Run Playwright tests
- Upload test reports on failure
```

**Runs on**: `ubuntu-latest`
**Timeout**: 30 minutes
**Dependencies**: `lint-and-typecheck`

**Required Secrets**: None (uses test environment)

**Success Criteria**:
- ✅ All E2E tests pass
- ✅ Application builds successfully

**Artifacts**:
- Playwright report (on failure, 30-day retention)

##### 4. security-audit

**Purpose**: Security vulnerability scanning

**Steps**:
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Run npm audit (moderate level)
- Check outdated packages
```

**Runs on**: `ubuntu-latest`
**Timeout**: 10 minutes
**Dependencies**: None

**Required Secrets**: None

**Success Criteria**:
- ✅ No moderate/high/critical vulnerabilities
- ⚠️ Outdated packages logged (warning only)

##### 5. build-docker

**Purpose**: Build and push Docker image to GitHub Container Registry

**Steps**:
```yaml
- Checkout code
- Set up Docker Buildx
- Login to ghcr.io
- Extract metadata (tags, labels)
- Build and push multi-platform image
  - linux/amd64
  - linux/arm64
```

**Runs on**: `ubuntu-latest`
**Timeout**: 45 minutes
**Dependencies**: `test`, `e2e-tests`

**Required Secrets**:
- `GITHUB_TOKEN` (automatically provided)

**Success Criteria**:
- ✅ Docker image builds successfully
- ✅ Image pushed to ghcr.io

**Outputs**:
- `image-digest`: Docker image digest for verification

**Tags Generated**:
- `main`: latest, sha-{commit}
- `develop`: develop, develop-{commit}
- `pr`: pr-{number}, pr-{number}-{commit}

##### 6. performance-tests

**Purpose**: Performance and Web Vitals testing

**Conditions**: Only on push to `main`

**Steps**:
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Build application
- Start application (port 3000)
- Wait for application ready
- Run Lighthouse CI
- Run performance tests
- Run Web Vitals tests
```

**Runs on**: `ubuntu-latest`
**Timeout**: 20 minutes
**Dependencies**: `build-docker`

**Required Secrets**:
- `LHCI_GITHUB_APP_TOKEN` (optional)

**Success Criteria**:
- ✅ Lighthouse scores meet thresholds
- ✅ Performance tests pass
- ✅ Web Vitals within limits

##### 7. deploy-vercel

**Purpose**: Deploy to Vercel (production)

**Conditions**: Only on push to `main`

**Steps**:
```yaml
- Checkout code
- Install Vercel CLI
- Pull Vercel environment (production)
- Build project artifacts
- Deploy to Vercel (production)
- Run smoke tests against deployment
```

**Runs on**: `ubuntu-latest`
**Timeout**: 15 minutes
**Dependencies**: `build-docker`, `performance-tests`

**Environment**: `production`

**Required Secrets**:
- `VERCEL_TOKEN`

**Success Criteria**:
- ✅ Deployment succeeds
- ✅ Smoke tests pass

**Outputs**:
- `preview-url`: Deployment URL

##### 8. deploy-preview

**Purpose**: Deploy preview for pull requests

**Conditions**: Only on pull requests

**Steps**:
```yaml
- Checkout code
- Install Vercel CLI
- Pull Vercel environment (preview)
- Build project artifacts
- Deploy to Vercel (preview)
- Comment on PR with preview URL
```

**Runs on**: `ubuntu-latest`
**Timeout**: 15 minutes
**Dependencies**: `test`, `e2e-tests`

**Environment**: `preview`

**Required Secrets**:
- `VERCEL_TOKEN`
- `GITHUB_TOKEN` (for PR comments)

**Success Criteria**:
- ✅ Preview deployment succeeds
- ✅ PR comment posted with URL

**Outputs**:
- `preview-url`: Preview deployment URL

##### 9. cleanup

**Purpose**: Clean up old preview deployments

**Conditions**: Always runs after deployments (even if failed)

**Steps**:
```yaml
- Delete deployments older than 10 most recent
- Set old deployments to inactive
```

**Runs on**: `ubuntu-latest`
**Timeout**: 5 minutes
**Dependencies**: `deploy-vercel`, `deploy-preview`

**Required Secrets**:
- `GITHUB_TOKEN`

**Success Criteria**:
- ✅ Old deployments cleaned up

---

## Secret Verification

### Workflow: verify-secrets.yml

**Purpose**: Validate GitHub secrets are properly configured

#### Trigger

```yaml
on: workflow_dispatch
```

**Usage**:
```bash
gh workflow run verify-secrets.yml
gh run watch
```

#### Jobs

**verify-secrets**:
```yaml
- Check VERCEL_TOKEN presence
- Check CODECOV_TOKEN presence (optional)
- Check LHCI_GITHUB_APP_TOKEN presence (optional)
- Check SUPABASE credentials
- Check OPENAI_API_KEY
- Check security keys (API_SECRET_KEY, JWT_SECRET, SESSION_SECRET)
```

**Output Example**:
```
✅ VERCEL_TOKEN configured
✅ NEXT_PUBLIC_SUPABASE_URL configured
⚠️  CODECOV_TOKEN not configured (optional)
✅ OPENAI_API_KEY configured
```

---

## Deployment Workflows

### Deployment Flow Diagram

```
┌─────────────────────────────────────────┐
│         Push to main/develop            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│       Lint & Typecheck & Security       │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
┌─────────────┐    ┌──────────────┐
│    Tests    │    │  E2E Tests   │
└──────┬──────┘    └──────┬───────┘
       │                  │
       └─────────┬────────┘
                 ▼
       ┌─────────────────┐
       │  Build Docker   │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │  Performance    │
       │     Tests       │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ Deploy Vercel   │
       │  (Production)   │
       └─────────────────┘
```

### Deployment Environments

| Environment | Branch | Auto-Deploy | Requires Approval |
|-------------|--------|-------------|-------------------|
| Production | `main` | Yes | Recommended (1 reviewer) |
| Staging | `develop` | Yes | No |
| Preview | Any (PR) | Yes | No |

---

## Trigger Conditions

### Event Types

#### push

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'package.json'
      - '.github/workflows/**'
```

**When it runs**:
- Direct push to main/develop
- Merge of pull request

**What it does**:
- Full CI/CD pipeline
- Deployment to production (main) or staging (develop)

#### pull_request

```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
```

**When it runs**:
- PR opened
- New commit pushed to PR
- PR reopened

**What it does**:
- All quality checks
- Preview deployment
- No production deployment

#### workflow_dispatch

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - staging
          - production
```

**When it runs**:
- Manual trigger via GitHub UI or CLI

**What it does**:
- Custom workflow execution
- Manual deployments

**Usage**:
```bash
gh workflow run ci-cd.yml
gh workflow run ci-cd.yml -f environment=staging
```

#### schedule

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

**When it runs**:
- Automated schedule (cron)

**What it does**:
- Nightly security scans
- Dependency updates
- Performance benchmarks

---

## Job Dependencies

### Dependency Graph

```
lint-and-typecheck
├── test
│   └── build-docker
│       └── performance-tests
│           └── deploy-vercel
└── e2e-tests
    └── build-docker
        └── deploy-preview (PR only)

security-audit (independent)

cleanup (runs after all deployments)
```

### Dependency Configuration

```yaml
jobs:
  job-name:
    needs: [dependency1, dependency2]
```

**Example**:
```yaml
deploy-vercel:
  needs: [build-docker, performance-tests]
```

### Conditional Dependencies

```yaml
deploy-vercel:
  needs: [build-docker, performance-tests]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

---

## Output Variables

### Job Outputs

#### build-docker

```yaml
outputs:
  image-digest: ${{ steps.build.outputs.digest }}
```

**Usage**:
```yaml
jobs:
  use-digest:
    needs: build-docker
    steps:
      - name: Use digest
        run: echo ${{ needs.build-docker.outputs.image-digest }}
```

#### deploy-vercel

```yaml
outputs:
  preview-url: ${{ steps.deploy.outputs.preview-url }}
```

**Usage**:
```yaml
- name: Deploy
  id: deploy
  run: |
    url=$(vercel deploy --prod)
    echo "preview-url=$url" >> $GITHUB_OUTPUT
```

### Setting Outputs

```yaml
- name: Generate output
  id: step-id
  run: |
    echo "output-name=value" >> $GITHUB_OUTPUT
    echo "multi-line<<EOF" >> $GITHUB_OUTPUT
    echo "line 1" >> $GITHUB_OUTPUT
    echo "line 2" >> $GITHUB_OUTPUT
    echo "EOF" >> $GITHUB_OUTPUT
```

### Using Outputs

**In same job**:
```yaml
- name: Use output
  run: echo ${{ steps.step-id.outputs.output-name }}
```

**In dependent job**:
```yaml
jobs:
  job1:
    outputs:
      my-output: ${{ steps.step1.outputs.value }}
    steps:
      - id: step1
        run: echo "value=hello" >> $GITHUB_OUTPUT

  job2:
    needs: job1
    steps:
      - run: echo ${{ needs.job1.outputs.my-output }}
```

---

## Advanced Workflow Patterns

### Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [16, 18, 20]
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

### Conditional Steps

```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: npm run deploy

- name: Deploy preview
  if: github.event_name == 'pull_request'
  run: npm run deploy:preview
```

### Environment Variables

**Repository level**:
```yaml
env:
  GLOBAL_VAR: value
```

**Job level**:
```yaml
jobs:
  job-name:
    env:
      JOB_VAR: value
```

**Step level**:
```yaml
- name: Step
  env:
    STEP_VAR: value
  run: echo $STEP_VAR
```

---

## Workflow Optimization

### Caching

**npm cache**:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 18
    cache: 'npm'
```

**Custom cache**:
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Artifacts

**Upload**:
```yaml
- uses: actions/upload-artifact@v3
  with:
    name: build-output
    path: dist/
    retention-days: 30
```

**Download**:
```yaml
- uses: actions/download-artifact@v3
  with:
    name: build-output
    path: dist/
```

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Effect**: Cancels in-progress runs when new commit is pushed

---

## Monitoring & Debugging

### Workflow Logs

```bash
# View runs
gh run list

# View specific run
gh run view RUN_ID

# Download logs
gh run download RUN_ID

# Watch run
gh run watch
```

### Debug Logging

Enable debug logs:
```bash
gh secret set ACTIONS_STEP_DEBUG --body true
gh secret set ACTIONS_RUNNER_DEBUG --body true
```

### Job Summaries

```yaml
- name: Create summary
  run: |
    echo "## Test Results" >> $GITHUB_STEP_SUMMARY
    echo "✅ All tests passed" >> $GITHUB_STEP_SUMMARY
```

---

**Last Updated**: 2025-10-02
**Document Version**: 1.0.0
**Maintained By**: DevOps Team
