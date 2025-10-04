# GitHub Secrets Configuration Guide

## Overview

This document provides instructions for configuring GitHub repository secrets required for CI/CD pipelines.

## Required Secrets

### 1. Vercel Deployment

#### VERCEL_TOKEN
**Description:** Authentication token for Vercel CLI deployments

**How to obtain:**
1. Log in to [Vercel](https://vercel.com)
2. Navigate to Settings → Tokens
3. Click "Create Token"
4. Name it "GitHub Actions CI/CD"
5. Select appropriate scope (at least deployment access)
6. Copy the generated token

**How to configure:**
```bash
# In GitHub repository settings
Settings → Secrets and variables → Actions → New repository secret

Name: VERCEL_TOKEN
Value: <your-vercel-token>
```

**Required for:**
- Staging deployments (`.github/workflows/cd-staging.yml`)
- Production deployments (`.github/workflows/cd-production.yml`)

---

### 2. Code Coverage (Optional but Recommended)

#### CODECOV_TOKEN
**Description:** Upload token for Codecov coverage reporting

**How to obtain:**
1. Sign up at [Codecov](https://codecov.io)
2. Link your GitHub repository
3. Navigate to repository settings
4. Copy the upload token

**How to configure:**
```bash
Name: CODECOV_TOKEN
Value: <your-codecov-token>
```

**Required for:**
- CI workflow coverage uploads (`.github/workflows/ci.yml`)

**Note:** If not configured, coverage upload will be skipped (fail_ci_if_error: false)

---

### 3. Performance Testing (Optional)

#### LHCI_GITHUB_APP_TOKEN
**Description:** Lighthouse CI GitHub App token for performance tracking

**How to obtain:**
1. Install [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci)
2. Configure for your repository
3. Generate app token from Lighthouse CI server
4. Or use GitHub personal access token with `repo` scope

**How to configure:**
```bash
Name: LHCI_GITHUB_APP_TOKEN
Value: <your-lhci-token>
```

**Required for:**
- Production performance tests (`.github/workflows/cd-production.yml`)

**Note:** If not configured, Lighthouse CI will run in temporary storage mode

---

## Optional Secrets

### 4. GitHub Personal Access Token (PAT)

#### GH_PAT
**Description:** GitHub Personal Access Token for enhanced API access

**When needed:**
- Creating releases
- Managing repository settings
- Advanced GitHub API operations

**How to obtain:**
1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes:
   - `repo` - Full repository access
   - `workflow` - Update GitHub Actions workflows
   - `write:packages` - Upload packages

**How to configure:**
```bash
Name: GH_PAT
Value: <your-github-pat>
```

---

### 5. Container Registry (Automatically Provided)

#### GITHUB_TOKEN
**Description:** Automatic token for GitHub Actions

**Note:** This is automatically provided by GitHub Actions. No configuration needed.

**Used for:**
- Docker image publishing to ghcr.io
- GitHub API operations
- Creating comments, releases, etc.

---

## Environment-Specific Secrets

### Production Environment

Configure these in: `Settings → Environments → production → Add secret`

#### Required:
- `VERCEL_TOKEN` - If different from repository secret
- Additional production-specific secrets as needed

### Staging Environment

Configure these in: `Settings → Environments → staging → Add secret`

#### Required:
- `VERCEL_TOKEN` - If different from repository secret
- Additional staging-specific secrets as needed

---

## Verifying Secret Configuration

### Check Secret Presence

Run this GitHub Actions workflow to verify secrets are configured:

```yaml
name: Verify Secrets
on: workflow_dispatch

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Check VERCEL_TOKEN
        run: |
          if [ -z "${{ secrets.VERCEL_TOKEN }}" ]; then
            echo "❌ VERCEL_TOKEN not configured"
            exit 1
          else
            echo "✅ VERCEL_TOKEN configured"
          fi

      - name: Check CODECOV_TOKEN
        run: |
          if [ -z "${{ secrets.CODECOV_TOKEN }}" ]; then
            echo "⚠️  CODECOV_TOKEN not configured (optional)"
          else
            echo "✅ CODECOV_TOKEN configured"
          fi

      - name: Check LHCI_GITHUB_APP_TOKEN
        run: |
          if [ -z "${{ secrets.LHCI_GITHUB_APP_TOKEN }}" ]; then
            echo "⚠️  LHCI_GITHUB_APP_TOKEN not configured (optional)"
          else
            echo "✅ LHCI_GITHUB_APP_TOKEN configured"
          fi
```

---

## Security Best Practices

### 1. Secret Rotation

**Frequency:** Rotate critical secrets every 90 days

**Process:**
1. Generate new secret in the external service
2. Update GitHub secret
3. Verify workflows still work
4. Revoke old secret

### 2. Least Privilege

- Grant minimum required permissions
- Use repository secrets for non-sensitive data
- Use environment secrets for sensitive production data

### 3. Access Control

**Who can access secrets:**
- Repository administrators
- Environment reviewers (for environment secrets)
- Workflows running on protected branches

**Best practices:**
- Limit admin access
- Use environment protection rules
- Require approval for production deployments

### 4. Secret Scanning

GitHub automatically scans for exposed secrets:
- Enable secret scanning in repository settings
- Review and revoke exposed secrets immediately
- Set up secret scanning alerts

---

## Troubleshooting

### Secret Not Available in Workflow

**Symptoms:**
- Workflow fails with authentication errors
- Secret appears empty in workflow

**Solutions:**
1. Verify secret is configured in correct location (repository vs environment)
2. Check secret name matches exactly (case-sensitive)
3. Verify workflow has access to environment
4. For environment secrets, ensure branch protection rules are met

### Vercel Deployment Fails

**Common issues:**
1. **Invalid token:** Generate new token
2. **Insufficient permissions:** Ensure token has deployment scope
3. **Wrong project:** Verify Vercel project name
4. **Expired token:** Vercel tokens don't expire, but check for revocation

### Codecov Upload Fails

**Common issues:**
1. **Invalid token:** Regenerate from Codecov
2. **Repository not linked:** Link repository in Codecov settings
3. **Coverage file not found:** Check coverage generation step

---

## Initial Setup Checklist

Use this checklist when setting up a new repository:

- [ ] Create Vercel account and link repository
- [ ] Generate and configure `VERCEL_TOKEN`
- [ ] Set up Codecov and configure `CODECOV_TOKEN` (optional)
- [ ] Install Lighthouse CI and configure `LHCI_GITHUB_APP_TOKEN` (optional)
- [ ] Create production environment with required secrets
- [ ] Create staging environment with required secrets
- [ ] Set up environment protection rules
- [ ] Test workflows with secrets
- [ ] Document any additional custom secrets
- [ ] Set up secret rotation reminders

---

## Environment Protection Rules

### Production Environment

Recommended settings:
- **Required reviewers:** 1-2 team members
- **Wait timer:** 0 minutes
- **Deployment branches:** `main` only
- **Secrets:** Production-specific values

### Staging Environment

Recommended settings:
- **Required reviewers:** None (auto-deploy)
- **Wait timer:** 0 minutes
- **Deployment branches:** `develop` and `main`
- **Secrets:** Staging-specific values

---

## Additional Resources

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Authentication](https://vercel.com/docs/cli#authentication)
- [Codecov Upload Documentation](https://docs.codecov.com/docs/quick-start)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

---

## Support

If you encounter issues with secret configuration:

1. Check this documentation first
2. Review GitHub Actions logs for specific errors
3. Verify secret values in external services
4. Contact DevOps team for assistance
5. Create an issue in the repository with details

## Updates

Document any changes to secret requirements:

| Date | Secret | Change | Reason |
|------|--------|--------|--------|
| 2025-10-02 | VERCEL_TOKEN | Added | Initial CI/CD setup |
| 2025-10-02 | CODECOV_TOKEN | Added (optional) | Coverage reporting |
| 2025-10-02 | LHCI_GITHUB_APP_TOKEN | Added (optional) | Performance testing |
