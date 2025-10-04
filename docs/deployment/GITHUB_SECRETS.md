# GitHub Secrets and Environment Variables Configuration

This guide provides comprehensive instructions for configuring GitHub secrets and environment variables required for the CI/CD pipelines.

## 📋 Overview

Our CI/CD workflows require various secrets and environment variables to function properly. This document outlines all required secrets, their purposes, and how to obtain them.

## 🔐 Required GitHub Secrets

### Repository Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

#### Core Application Secrets
```bash
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth Secret (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-characters-long

# JWT Secret (Generate with: openssl rand -base64 64)
JWT_SECRET=your-jwt-signing-secret-for-additional-security-features

# Unsplash API (Optional)
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
```

#### Vercel Deployment Secrets
```bash
# Vercel Token (Get from: https://vercel.com/account/tokens)
VERCEL_TOKEN=your-vercel-deployment-token

# Vercel Organization ID (Get from: vercel org list)
VERCEL_ORG_ID=your-vercel-organization-id

# Vercel Project ID (Get from: vercel project list)
VERCEL_PROJECT_ID=your-vercel-project-id
```

#### Security and Monitoring Secrets
```bash
# Codecov Token (Get from: https://codecov.io/)
CODECOV_TOKEN=your-codecov-upload-token

# Lighthouse CI Token (Optional, for GitHub App integration)
LHCI_GITHUB_APP_TOKEN=your-lighthouse-ci-github-app-token

# Snyk Token (Optional, for security scanning)
SNYK_TOKEN=your-snyk-security-token

# Semgrep App Token (Optional, for advanced security scanning)
SEMGREP_APP_TOKEN=your-semgrep-app-token

# Sentry Configuration (Optional, for error monitoring)
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-sentry-organization
SENTRY_PROJECT=your-sentry-project-name
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Slack Webhook (Optional, for notifications)
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

#### Environment-Specific Secrets
```bash
# Staging Environment
STAGING_SUPABASE_URL=https://staging-project-ref.supabase.co
STAGING_SUPABASE_ANON_KEY=staging-supabase-anon-key

# Production Environment  
PROD_SUPABASE_URL=https://prod-project-ref.supabase.co
PROD_SUPABASE_ANON_KEY=prod-supabase-anon-key

# Vercel KV (Redis) Configuration
KV_URL=your-kv-redis-url
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token
KV_REST_API_READ_ONLY_TOKEN=your-kv-read-only-token
```

## 🏢 Environment Configuration

### GitHub Environment Setup

Create the following environments in your repository (`Settings > Environments`):

#### 1. Production Environment
```yaml
Environment name: production
Protection rules:
  - Required reviewers: 2 people
  - Wait timer: 0 minutes
  - Deployment branches: main only

Environment secrets:
  - NEXT_PUBLIC_APP_URL=https://describe-it.vercel.app
  - NEXTAUTH_URL=https://describe-it.vercel.app
  - All production database credentials
```

#### 2. Preview Environment
```yaml
Environment name: preview
Protection rules:
  - Required reviewers: 0 people
  - Wait timer: 0 minutes
  - Deployment branches: Any branch

Environment secrets:
  - NEXT_PUBLIC_APP_URL=https://preview-describe-it.vercel.app
  - NEXTAUTH_URL=https://preview-describe-it.vercel.app
  - Staging database credentials
```

#### 3. Development Environment
```yaml
Environment name: development
Protection rules:
  - Required reviewers: 0 people
  - Wait timer: 0 minutes
  - Deployment branches: develop only

Environment secrets:
  - NEXT_PUBLIC_APP_URL=https://dev-describe-it.vercel.app
  - NEXTAUTH_URL=https://dev-describe-it.vercel.app
  - Development database credentials
```

## 🔧 Step-by-Step Setup Guide

### 1. OpenAI Configuration
```bash
# 1. Go to https://platform.openai.com/api-keys
# 2. Create a new API key
# 3. Copy the key (starts with sk-)
# 4. Add as OPENAI_API_KEY secret in GitHub
```

### 2. Supabase Configuration
```bash
# 1. Go to your Supabase project dashboard
# 2. Navigate to Settings > API
# 3. Copy the following values:
#    - Project URL (NEXT_PUBLIC_SUPABASE_URL)
#    - Project API keys > anon public (NEXT_PUBLIC_SUPABASE_ANON_KEY)  
#    - Project API keys > service_role (SUPABASE_SERVICE_ROLE_KEY)
```

### 3. Vercel Configuration
```bash
# 1. Install Vercel CLI: npm i -g vercel
# 2. Login: vercel login
# 3. Link project: vercel link
# 4. Get tokens:
vercel teams list  # Get ORG_ID
vercel project list  # Get PROJECT_ID
# 5. Create deployment token at https://vercel.com/account/tokens
```

### 4. Generate Security Secrets
```bash
# Generate NextAuth Secret
openssl rand -base64 32

# Generate JWT Secret  
openssl rand -base64 64

# Generate random API keys (if needed)
openssl rand -hex 32
```

### 5. Codecov Setup
```bash
# 1. Go to https://codecov.io/
# 2. Login with GitHub
# 3. Add your repository
# 4. Copy the repository upload token
# 5. Add as CODECOV_TOKEN secret
```

### 6. Optional: Lighthouse CI Setup
```bash
# 1. Install LHCI server or use temporary public storage
# 2. For GitHub App integration:
#    - Go to https://github.com/apps/lighthouse-ci
#    - Install the app on your repository
#    - Get the token from the app settings
```

### 7. Security Scanning Setup

#### Snyk Setup
```bash
# 1. Go to https://snyk.io/
# 2. Sign up/login with GitHub
# 3. Go to Account Settings > General > Auth Token
# 4. Copy token and add as SNYK_TOKEN
```

#### Semgrep Setup
```bash
# 1. Go to https://semgrep.dev/
# 2. Sign up/login
# 3. Create a new token in Settings
# 4. Add as SEMGREP_APP_TOKEN
```

### 8. Monitoring Setup

#### Sentry Setup
```bash
# 1. Go to https://sentry.io/
# 2. Create new project
# 3. Get DSN from project settings
# 4. Create auth token in User Settings > Auth Tokens
```

#### Slack Notifications
```bash
# 1. Go to your Slack workspace
# 2. Create a new Slack app
# 3. Add Incoming Webhooks feature
# 4. Create webhook URL for your channel
# 5. Add as SLACK_WEBHOOK_URL
```

## 🚀 Quick Setup Script

Save this script as `setup-secrets.sh` to batch configure secrets:

```bash
#!/bin/bash

# GitHub repository (format: owner/repo)
REPO="your-username/describe-it"

# Function to add secret
add_secret() {
    local name=$1
    local value=$2
    echo "Adding secret: $name"
    gh secret set "$name" --body "$value" --repo "$REPO"
}

# Core secrets (you need to provide actual values)
echo "Setting up GitHub secrets for $REPO..."

# Prompt for required secrets
read -p "Enter OpenAI API Key: " OPENAI_KEY
add_secret "OPENAI_API_KEY" "$OPENAI_KEY"

read -p "Enter Supabase URL: " SUPABASE_URL
add_secret "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"

read -p "Enter Supabase Anon Key: " SUPABASE_ANON
add_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON"

read -p "Enter Supabase Service Role Key: " SUPABASE_SERVICE
add_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE"

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
add_secret "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64)  
add_secret "JWT_SECRET" "$JWT_SECRET"

read -p "Enter Vercel Token: " VERCEL_TOKEN
add_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"

read -p "Enter Vercel Org ID: " VERCEL_ORG
add_secret "VERCEL_ORG_ID" "$VERCEL_ORG"

read -p "Enter Vercel Project ID: " VERCEL_PROJECT
add_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJECT"

echo "✅ Core secrets configured!"
echo "📋 Next steps:"
echo "1. Configure environment-specific secrets"
echo "2. Set up optional monitoring tokens"
echo "3. Test your workflows"
```

## 🔍 Verification

### Test Secret Access
Use this workflow to verify secrets are accessible:

```yaml
name: Test Secrets
on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Check required secrets
        run: |
          # Test core secrets (without exposing values)
          test -n "${{ secrets.OPENAI_API_KEY }}" && echo "✅ OPENAI_API_KEY" || echo "❌ OPENAI_API_KEY missing"
          test -n "${{ secrets.VERCEL_TOKEN }}" && echo "✅ VERCEL_TOKEN" || echo "❌ VERCEL_TOKEN missing"
          test -n "${{ secrets.NEXTAUTH_SECRET }}" && echo "✅ NEXTAUTH_SECRET" || echo "❌ NEXTAUTH_SECRET missing"
          
          # Test secret lengths
          if [ ${#OPENAI_KEY} -gt 20 ]; then
            echo "✅ OPENAI_API_KEY has valid length"
          else
            echo "❌ OPENAI_API_KEY appears invalid"
          fi
        env:
          OPENAI_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Test Deployment
```bash
# Manual test deployment
gh workflow run deploy.yml
gh run list --workflow=deploy.yml --limit=1
```

## 🔄 Secret Rotation

### Monthly Rotation (Recommended)
- [ ] OpenAI API Key
- [ ] Supabase Service Role Key  
- [ ] NextAuth Secret
- [ ] JWT Secret

### Quarterly Rotation
- [ ] Vercel Token
- [ ] Third-party service tokens (Snyk, Semgrep, etc.)

### Annual Rotation
- [ ] GitHub App tokens
- [ ] Long-term integration tokens

### Rotation Script
```bash
#!/bin/bash

# Rotate NextAuth secret
NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
gh secret set "NEXTAUTH_SECRET" --body "$NEW_NEXTAUTH_SECRET"

# Rotate JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)
gh secret set "JWT_SECRET" --body "$NEW_JWT_SECRET"

echo "✅ Secrets rotated. Update production deployments!"
```

## 🛡️ Security Best Practices

### Secret Management
1. **Never commit secrets to code**
2. **Use different secrets for different environments**
3. **Rotate secrets regularly**
4. **Monitor secret usage in audit logs**
5. **Use least-privilege principle**

### Access Control
1. **Limit repository access**
2. **Use environment protection rules**
3. **Require approvals for production deployments**
4. **Monitor secret access in audit logs**

### Emergency Procedures
```bash
# In case of compromised secrets:
# 1. Immediately rotate the compromised secret
gh secret set "COMPROMISED_SECRET" --body "NEW_VALUE"

# 2. Check audit logs for unauthorized access
gh api repos/OWNER/REPO/actions/secrets

# 3. Review recent deployments
gh run list --limit=20

# 4. Update applications to use new secrets
# 5. Monitor for any suspicious activity
```

## 📞 Support

If you encounter issues with secrets configuration:

1. Verify secret names match exactly (case-sensitive)
2. Check environment protection rules
3. Review workflow permissions
4. Test with the verification workflow above
5. Check GitHub audit logs for access issues

## 🔗 Related Documentation

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Branch Protection Rules](./BRANCH_PROTECTION.md)
- [Security Policies](./SECURITY.md)

---

**⚠️ Important**: Keep this documentation updated when adding new secrets or changing configurations. All team members should have access to the latest version.