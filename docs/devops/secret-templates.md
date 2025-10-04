# GitHub Secrets - Complete Templates & Generation Guide

## Table of Contents

1. [Secret Value Formats](#secret-value-formats)
2. [Generation Scripts](#generation-scripts)
3. [Service-Specific Setup](#service-specific-setup)
4. [Testing Procedures](#testing-procedures)
5. [Troubleshooting](#troubleshooting)

---

## Secret Value Formats

### Security Keys (Generated Locally)

#### API_SECRET_KEY
```bash
Format: 64-character hexadecimal string
Length: 32 bytes
Example: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

Generation Command:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Usage in Application:
- API request validation
- Internal service authentication
- Webhook signature verification

Security Level: CRITICAL
Rotation Frequency: Every 90 days
```

#### JWT_SECRET
```bash
Format: 64-character hexadecimal string
Length: 32 bytes
Example: f6e5d4c3b2a198765432109876543210fedcba0987654321fedcba09876543210

Generation Command:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Usage in Application:
- JWT token signing
- User session tokens
- API authentication tokens

Security Level: CRITICAL
Rotation Frequency: Every 90 days
```

#### SESSION_SECRET
```bash
Format: 32-character hexadecimal string
Length: 16 bytes
Example: 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d

Generation Command:
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

Usage in Application:
- Cookie encryption
- Session management
- CSRF token generation

Security Level: HIGH
Rotation Frequency: Every 180 days
```

---

### Vercel Configuration

#### VERCEL_TOKEN
```bash
Format: Bearer token (starts with vercel_)
Example: vercel_1234567890abcdefghijklmnopqrstuvwxyz

Obtaining:
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions CI/CD"
4. Scope: Full Access or Deployment
5. Expiration: No Expiration or custom
6. Copy token immediately

Usage in Workflows:
- vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
- vercel pull --token=${{ secrets.VERCEL_TOKEN }}
- vercel build --token=${{ secrets.VERCEL_TOKEN }}

Testing:
vercel --token="YOUR_TOKEN" ls

Security Level: CRITICAL
Rotation Frequency: Annually or when team changes
```

#### Vercel Project Configuration
```bash
# Also configure in Vercel Dashboard → Project Settings → Environment Variables

VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx

Obtaining:
1. Vercel Dashboard → Project → Settings → General
2. Copy Team ID (if applicable)
3. Copy Project ID

Note: Usually auto-detected by Vercel CLI
```

---

### Supabase Configuration

#### NEXT_PUBLIC_SUPABASE_URL
```bash
Format: HTTPS URL
Example: https://abcdefghijklmnop.supabase.co

Obtaining:
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy "Project URL"
3. Ensure it starts with https://

Usage: Client-side database connection
Can be public: Yes (NEXT_PUBLIC_ prefix)
Security Level: PUBLIC

Testing:
curl https://YOUR_PROJECT_URL.supabase.co/rest/v1/
# Should return API information
```

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
```bash
Format: JWT token (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
Length: ~300-400 characters

Obtaining:
1. Supabase Dashboard → Settings → API
2. Copy "anon public" key
3. Full JWT token starting with eyJ...

Usage: Client-side API authentication
Can be public: Yes (with Row Level Security)
Security Level: PUBLIC (with RLS enabled)

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.signature

Testing:
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### SUPABASE_SERVICE_ROLE_KEY
```bash
Format: JWT token (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
Length: ~300-400 characters

Obtaining:
1. Supabase Dashboard → Settings → API
2. Copy "service_role" key (⚠️ SECRET)
3. Full JWT token starting with eyJ...

Usage: Server-side admin operations
Can be public: NO - NEVER expose to client
Security Level: CRITICAL

⚠️ WARNING: This key bypasses Row Level Security!
Only use server-side, never in client code.

Testing:
# List all tables (admin access)
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

### OpenAI Configuration

#### OPENAI_API_KEY
```bash
Format: sk-proj-... (project-scoped) or sk-... (user-scoped)
Example: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz1234567890

Obtaining:
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name: "Describe It Production"
4. Permissions: Recommended minimum
5. Copy immediately (shown only once)

Usage: AI-powered translations and descriptions
Security Level: CRITICAL
Cost Impact: HIGH (monitor usage)

Recommended Limits:
- Development: $5-10/month
- Staging: $10-20/month
- Production: Set budget alerts at $50, $100, $200

Testing:
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### OpenAI Environment-Specific Keys
```bash
Development:
OPENAI_API_KEY=sk-proj-dev-xxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

Staging:
OPENAI_API_KEY=sk-proj-staging-xxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

Production:
OPENAI_API_KEY=sk-proj-prod-xxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

---

### Unsplash Configuration

#### NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
```bash
Format: Alphanumeric string
Example: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

Obtaining:
1. Go to: https://unsplash.com/oauth/applications
2. Click "New Application"
3. Accept terms and conditions
4. Name: "Describe It"
5. Description: "Language learning application"
6. Copy "Access Key"

Usage: Image search functionality
Can be public: Yes (rate-limited)
Security Level: PUBLIC

Rate Limits:
- Free tier: 50 requests/hour
- Recommended: Production+ (5000 requests/hour)

Testing:
curl "https://api.unsplash.com/search/photos?query=test" \
  -H "Authorization: Client-ID YOUR_ACCESS_KEY"
```

---

### Code Coverage & Quality

#### CODECOV_TOKEN
```bash
Format: UUID-style token
Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Obtaining:
1. Go to: https://codecov.io
2. Login with GitHub
3. Add repository
4. Go to Settings → General
5. Copy "Repository Upload Token"

Usage: Upload coverage reports
Security Level: LOW (read-only for repository)

Testing:
bash <(curl -s https://codecov.io/bash) -t YOUR_TOKEN -f coverage.json

Optional: Set fail_ci_if_error: false in workflow
```

#### LHCI_GITHUB_APP_TOKEN
```bash
Format: GitHub personal access token or Lighthouse CI token
Example: ghp_1234567890abcdefghijklmnopqrstuvwxyz12

Obtaining (Option 1 - GitHub PAT):
1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Scopes: repo, workflow
4. Copy token

Obtaining (Option 2 - Lighthouse CI Server):
1. Install Lighthouse CI Server
2. Generate build token
3. Use server URL and token

Usage: Performance tracking
Security Level: MEDIUM

Testing:
lhci autorun --token=$LHCI_GITHUB_APP_TOKEN
```

---

### Error Monitoring

#### SENTRY_DSN
```bash
Format: HTTPS URL with auth
Example: https://abc123@o123456.ingest.sentry.io/123456

Obtaining:
1. Go to: https://sentry.io
2. Create new project
3. Select platform: Next.js
4. Copy DSN from project settings

Usage: Error tracking and monitoring
Security Level: PUBLIC (safe to expose)

Testing:
curl -X POST 'YOUR_SENTRY_DSN' \
  -H 'Content-Type: application/json' \
  -d '{"message":"test"}'
```

#### SENTRY_AUTH_TOKEN
```bash
Format: Alphanumeric token
Example: sntrys_1234567890abcdefghijklmnopqrstuvwxyz1234567890

Obtaining:
1. Sentry Settings → Account → API → Auth Tokens
2. Create new token
3. Scopes: project:releases, org:read
4. Copy token

Usage: Upload source maps, create releases
Security Level: HIGH

Testing:
curl https://sentry.io/api/0/projects/ \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

---

## Generation Scripts

### Complete Secret Generation Script

Create `/scripts/generate-secrets.sh`:

```bash
#!/bin/bash

echo "==================================="
echo "GitHub Secrets Generation Script"
echo "==================================="
echo ""

# Generate security keys
echo "🔐 Generating security keys..."
echo ""
echo "API_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"

echo ""
echo "⚠️  IMPORTANT: Save these values securely!"
echo "⚠️  Add them to GitHub Secrets: Settings → Secrets and variables → Actions"
echo ""

# Generate template .env file
cat > .env.secrets.template << 'EOF'
# ==================================
# GENERATED SECRETS
# ==================================
# Copy these to GitHub Secrets
# DO NOT commit this file!

# Security Keys (Generated)
API_SECRET_KEY=GENERATED_ABOVE
JWT_SECRET=GENERATED_ABOVE
SESSION_SECRET=GENERATED_ABOVE

# Vercel (Manual - from Vercel Dashboard)
VERCEL_TOKEN=get_from_vercel_dashboard

# Supabase (Manual - from Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (Manual - from OpenAI Platform)
OPENAI_API_KEY=sk-proj-...

# Unsplash (Manual - from Unsplash Developers)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Optional Services
CODECOV_TOKEN=optional_codecov_token
LHCI_GITHUB_APP_TOKEN=optional_lighthouse_token
SENTRY_DSN=optional_sentry_dsn
SENTRY_AUTH_TOKEN=optional_sentry_auth_token
EOF

echo "✅ Template file created: .env.secrets.template"
echo ""
echo "Next steps:"
echo "1. Fill in manual values from service dashboards"
echo "2. Add all secrets to GitHub: gh secret set SECRET_NAME < value.txt"
echo "3. Delete .env.secrets.template after adding to GitHub"
```

### Batch Secret Upload Script

Create `/scripts/upload-secrets.sh`:

```bash
#!/bin/bash

# Upload secrets to GitHub from .env file
# Usage: ./upload-secrets.sh .env.secrets

ENV_FILE=${1:-.env.secrets}

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

echo "Uploading secrets from $ENV_FILE to GitHub..."

# Read and upload each secret
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.*$ ]] || [ -z "$key" ]; then
        continue
    fi

    # Remove quotes and whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs | sed 's/^["'"'"']\(.*\)["'"'"']$/\1/')

    if [ -n "$value" ]; then
        echo "Setting: $key"
        echo "$value" | gh secret set "$key"
    fi
done < "$ENV_FILE"

echo "✅ All secrets uploaded!"
echo "Verify with: gh secret list"
```

---

## Service-Specific Setup

### Vercel Complete Setup

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project
vercel link

# 4. Generate token
# Go to: https://vercel.com/account/tokens
# Copy token and add to GitHub:
echo "YOUR_VERCEL_TOKEN" | gh secret set VERCEL_TOKEN

# 5. Configure environment variables in Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add OPENAI_API_KEY production
# ... add all required env vars
```

### Supabase Complete Setup

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Create project (or use existing)
# Via dashboard: https://supabase.com/dashboard

# 4. Get project reference
# From Supabase → Project Settings → General → Reference ID

# 5. Link local project
supabase link --project-ref YOUR_PROJECT_REF

# 6. Run migrations
supabase db push

# 7. Get API credentials
supabase status
# Copy URL and keys to GitHub secrets
```

---

## Testing Procedures

### Test Secret Configuration

```bash
# Create test file: test-secrets.sh

#!/bin/bash
echo "Testing GitHub Secrets Configuration..."

# Test Vercel
if [ -n "$VERCEL_TOKEN" ]; then
    vercel ls --token="$VERCEL_TOKEN" > /dev/null && echo "✅ Vercel" || echo "❌ Vercel"
else
    echo "⚠️  Vercel token not set"
fi

# Test Supabase
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    curl -I "$NEXT_PUBLIC_SUPABASE_URL" 2>&1 | grep -q "200 OK" && echo "✅ Supabase" || echo "❌ Supabase"
else
    echo "⚠️  Supabase URL not set"
fi

# Test OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
    curl -s https://api.openai.com/v1/models \
        -H "Authorization: Bearer $OPENAI_API_KEY" | grep -q "gpt" && echo "✅ OpenAI" || echo "❌ OpenAI"
else
    echo "⚠️  OpenAI key not set"
fi
```

### GitHub Actions Test Workflow

Create `.github/workflows/test-secrets.yml`:

```yaml
name: Test Secrets Configuration

on:
  workflow_dispatch:

jobs:
  test-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Test Critical Secrets
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          OPENAI_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          echo "Testing secret availability..."
          [ -n "$VERCEL_TOKEN" ] && echo "✅ VERCEL_TOKEN available" || echo "❌ VERCEL_TOKEN missing"
          [ -n "$SUPABASE_URL" ] && echo "✅ SUPABASE_URL available" || echo "❌ SUPABASE_URL missing"
          [ -n "$OPENAI_KEY" ] && echo "✅ OPENAI_KEY available" || echo "❌ OPENAI_KEY missing"

      - name: Test Vercel Connectivity
        run: |
          npm install -g vercel
          vercel --version
          # Note: Cannot test token without exposing it
          echo "✅ Vercel CLI installed"
```

---

## Troubleshooting

### Common Issues

#### Secret Not Available in Workflow

**Problem**: `Error: Input required and not supplied: SECRET_NAME`

**Solutions**:
1. Check secret name spelling (case-sensitive)
2. Verify secret is in correct scope (repository vs environment)
3. Check environment name matches workflow
4. Ensure workflow has access to environment

```bash
# Verify secret exists
gh secret list | grep SECRET_NAME

# Re-add secret
echo "value" | gh secret set SECRET_NAME
```

#### Invalid Token Errors

**Problem**: `Error: Authentication failed`

**Solutions**:
1. Generate new token from service
2. Check token format (no extra spaces/quotes)
3. Verify token hasn't expired
4. Test token manually first

```bash
# Test Vercel token
vercel --token="$TOKEN" ls

# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $TOKEN"
```

#### Secret Value Truncation

**Problem**: Secret value appears cut off

**Solutions**:
1. Use heredoc for long values:
```bash
gh secret set MY_SECRET << 'EOF'
very-long-secret-value-here
EOF
```

2. Or use file input:
```bash
echo "secret-value" > secret.txt
gh secret set MY_SECRET < secret.txt
rm secret.txt
```

---

**Last Updated**: 2025-10-02
**Document Version**: 1.0.0
**Maintained By**: DevOps Team
