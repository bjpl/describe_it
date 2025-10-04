# Environment Configuration Guide

## Overview

The project uses a **3-file environment structure** for managing configuration:

1. **`.env.example`** - Master template with all variables documented
2. **`.env.development`** - Safe defaults for development (committed)
3. **`.env.test`** - Test environment configuration (committed)
4. **`.env.local`** - Your local secrets and overrides (gitignored)

## Quick Start

### 1. Create Local Environment File

```bash
# Copy the example file
cp .env.example .env.local

# Or use the interactive setup script
npm run setup:env
```

### 2. Generate Security Keys

```bash
# API Secret Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret (16 bytes)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 3. Add Required API Keys

Edit `.env.local` and add:

**Supabase** (from https://supabase.com/dashboard)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**OpenAI** (from https://platform.openai.com/api-keys)
```env
OPENAI_API_KEY=sk-proj-...
```

**Unsplash** (from https://unsplash.com/developers)
```env
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
UNSPLASH_ACCESS_KEY=...
```

## File Structure Explained

### `.env.example` (Master Template)
- **Purpose**: Complete documentation of all environment variables
- **Status**: Committed to git
- **Usage**: Copy to `.env.local` to get started
- **Contains**: Placeholder values, documentation, setup instructions

### `.env.development` (Development Defaults)
- **Purpose**: Safe defaults for local development
- **Status**: Committed to git
- **Usage**: Automatically loaded in development mode
- **Contains**: Non-sensitive default values, feature flags

### `.env.test` (Test Configuration)
- **Purpose**: Configuration for automated tests
- **Status**: Committed to git
- **Usage**: Automatically loaded when `NODE_ENV=test`
- **Contains**: Mock API keys, test-specific settings

### `.env.local` (Your Secrets)
- **Purpose**: Your actual API keys and local overrides
- **Status**: **NEVER committed** (in .gitignore)
- **Usage**: Created by you from `.env.example`
- **Contains**: Real API keys, secrets, local customizations

## Environment Variable Priority

Next.js loads environment files in this order (later overrides earlier):

1. `.env` (base, if exists)
2. `.env.development` or `.env.production` or `.env.test`
3. `.env.local` (your overrides)

**Priority**: `.env.local` > `.env.{environment}` > `.env`

## Variable Categories

### Required Variables

These **must** be set in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Unsplash
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
UNSPLASH_ACCESS_KEY=

# Security Keys (generate with crypto)
API_SECRET_KEY=
JWT_SECRET=
SESSION_SECRET=
```

### Optional Variables

Enhance functionality when configured:

```env
# Vercel KV (Redis caching)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Sentry (error monitoring)
SENTRY_DSN=

# Analytics
NEXT_PUBLIC_GA_ID=

# Vercel Blob (file storage)
BLOB_READ_WRITE_TOKEN=
```

### Feature Flags

Control application features:

```env
ENABLE_IMAGE_SEARCH=true
ENABLE_AI_TRANSLATION=true
ENABLE_DEMO_MODE=false
ENABLE_ANALYTICS=true
ENABLE_COLLABORATION=true
```

## Common Scenarios

### Local Development

1. Copy `.env.example` to `.env.local`
2. Add your API keys
3. Generate security keys
4. Run `npm run dev`

**Tips**:
- Keep `DEBUG_ENDPOINT_ENABLED=true`
- Use `LOG_LEVEL=info`
- Enable all features you're working on

### Production Deployment

1. Set environment variables in your hosting platform (Vercel, etc.)
2. Ensure these critical settings:
   ```env
   NODE_ENV=production
   DEBUG_ENDPOINT_ENABLED=false
   LOG_LEVEL=warn
   FORCE_HTTPS=true
   ENABLE_HSTS=true
   ```
3. Use strong, unique security keys
4. Restrict `ALLOWED_ORIGINS` to your domain only

### Running Tests

1. Tests automatically use `.env.test`
2. No setup needed - uses mock values
3. Override if needed with `.env.test.local` (gitignored)

## Security Best Practices

### DO:
- ✅ Keep `.env.local` gitignored
- ✅ Use different keys for dev/prod
- ✅ Rotate API keys regularly
- ✅ Generate strong security keys
- ✅ Limit `ALLOWED_ORIGINS` in production
- ✅ Use environment-specific values

### DON'T:
- ❌ Commit `.env.local` to git
- ❌ Share API keys in chat/email
- ❌ Use development keys in production
- ❌ Expose unnecessary variables to client (NEXT_PUBLIC_)
- ❌ Hardcode secrets in code
- ❌ Use weak or default security keys

## Troubleshooting

### "Environment variable not found"

1. Check if variable is in `.env.local`
2. Restart dev server (`npm run dev`)
3. Check variable name spelling
4. Ensure no spaces around `=`

### "Invalid API key"

1. Verify key is correct from provider
2. Check for extra spaces or newlines
3. Ensure key hasn't expired
4. Test key directly with provider's API

### "CORS errors"

1. Check `ALLOWED_ORIGINS` includes your URL
2. Ensure protocol matches (http/https)
3. Include port if using localhost:3001
4. Restart server after changes

### "Variables not updating"

1. Restart development server
2. Clear `.next` folder: `rm -rf .next`
3. Check `.env.local` is in project root
4. Verify variable name format

## Migration from Old Structure

If migrating from the previous 10-file structure:

### Step 1: Backup Current Files
```bash
mkdir .env-backup
cp .env* .env-backup/
cp config/env-examples/.env* .env-backup/
```

### Step 2: Create New Structure
```bash
# Copy master template
cp .env.example .env.local

# Copy your working values from .env.local backup
# Edit .env.local and add your actual keys
```

### Step 3: Verify Setup
```bash
# Check all required variables are set
npm run check:env

# Test application
npm run dev
```

### Step 4: Remove Old Files
```bash
# Remove redundant files (after verifying new setup works)
rm -f config/env-examples/.env.local.example
rm -f config/env-examples/.env.production
rm -f config/env-examples/.env.security.example
rm -f docs/setup/.env.local.example
```

## Environment Variables Reference

See `.env.example` for complete documentation of all available variables.

### Categories:
- **Core API Keys**: Supabase, OpenAI, Unsplash
- **Security**: Secrets, CORS, authentication
- **Features**: Feature flags and toggles
- **Performance**: Caching, rate limiting
- **Monitoring**: Logging, analytics, error tracking
- **Deployment**: Build optimization, SSL/TLS

## Getting Help

### Resources:
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Setup Guide](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### Common Links:
- Supabase Dashboard: https://supabase.com/dashboard
- OpenAI API Keys: https://platform.openai.com/api-keys
- Unsplash Developers: https://unsplash.com/developers
- Vercel Storage: https://vercel.com/dashboard/stores

## Checklist

### Initial Setup:
- [ ] Copy `.env.example` to `.env.local`
- [ ] Generate all security keys
- [ ] Add Supabase credentials
- [ ] Add OpenAI API key
- [ ] Add Unsplash API key
- [ ] Test with `npm run dev`

### Production Deployment:
- [ ] Set all variables in hosting platform
- [ ] Use production API keys
- [ ] Disable debug endpoints
- [ ] Enable security headers
- [ ] Restrict CORS origins
- [ ] Enable HTTPS and HSTS
- [ ] Configure monitoring (Sentry)
- [ ] Test deployment
