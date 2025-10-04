# Environment Configuration Migration Guide

## Overview

We've consolidated the environment configuration from **10 scattered files** to **3 core files** for easier management and better security.

## What Changed

### Before (10 Files):
```
.env.local (working file)
.env.flow-nexus (credentials)
config/env-examples/.env.example
config/env-examples/.env.local.example
config/env-examples/.env.production
config/env-examples/.env.security.example
docs/setup/.env.local.example
+ 3 other scattered files
```

### After (3-4 Files):
```
.env.example          (master template, committed)
.env.development      (dev defaults, committed)
.env.test            (test config, committed)
.env.local           (your secrets, gitignored)
```

## Benefits

✅ **Simplified**: One source of truth (`.env.example`)
✅ **Organized**: Clear separation of concerns
✅ **Secure**: Only `.env.local` contains secrets
✅ **Maintainable**: Less duplication, easier updates
✅ **Team-Friendly**: Clear onboarding process

## Migration Steps

### Step 1: Backup Your Current Configuration

```bash
# Create backup directory
mkdir -p .env-backup

# Backup all current env files
cp .env.local .env-backup/env.local.backup 2>/dev/null || true
cp .env.flow-nexus .env-backup/env.flow-nexus.backup 2>/dev/null || true
cp config/env-examples/.env* .env-backup/ 2>/dev/null || true

# List what you backed up
ls -la .env-backup/
```

### Step 2: Extract Your Current Values

Create a temporary file with your actual working values:

```bash
# Extract your working API keys and secrets
cat > .env-backup/my-values.txt << 'EOF'
# Copy your actual values from .env.local here
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
UNSPLASH_ACCESS_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Any custom settings you had
EOF

# Edit this file with your actual values
nano .env-backup/my-values.txt
```

### Step 3: Set Up New Structure

```bash
# Copy the new master template
cp .env.example .env.local

# The .env.development and .env.test files are already committed
# No action needed for these files
```

### Step 4: Populate .env.local

Edit `.env.local` and add your values:

```bash
# Open in your preferred editor
nano .env.local
# or
code .env.local
```

**Transfer these from your backup:**

1. **API Keys** (from old `.env.local`)
   ```env
   OPENAI_API_KEY=sk-proj-...
   NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
   UNSPLASH_ACCESS_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

2. **Security Keys** (generate new ones)
   ```bash
   # Generate fresh security keys
   echo "API_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
   echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
   echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
   ```

3. **Flow Nexus Credentials** (if you were using them)
   ```env
   # From old .env.flow-nexus file
   FLOW_NEXUS_EMAIL=your-email@example.com
   FLOW_NEXUS_PASSWORD=your-password
   ```

4. **Any Custom Settings** you had

### Step 5: Verify Configuration

```bash
# Test that the app starts correctly
npm run dev

# Check for any missing environment variable errors
# Check console for warnings about missing keys
```

### Step 6: Clean Up Old Files

**ONLY after verifying everything works:**

```bash
# Remove old redundant files
rm -f config/env-examples/.env.local.example
rm -f config/env-examples/.env.production
rm -f config/env-examples/.env.security.example
rm -f docs/setup/.env.local.example

# Keep .env.flow-nexus if you're still using it
# Or remove it if you added credentials to .env.local
# rm -f .env.flow-nexus

# Verify git status - should only show removed files
git status
```

### Step 7: Update .gitignore (Already Done)

The `.gitignore` has been updated to ensure `.env.local` is never committed:

```gitignore
# Local env files - CRITICAL SECURITY
.env
.env.local
.env.*.local
*.env
!.env.example
!.env.development
!.env.test
```

## File Responsibilities

### `.env.example` (Committed)
**Purpose**: Master documentation template
**Contains**: All possible variables with placeholders
**Used for**: Onboarding, documentation reference
**Who edits**: Update when adding new variables

### `.env.development` (Committed)
**Purpose**: Safe development defaults
**Contains**: Non-sensitive default values
**Used for**: Automatic loading in dev mode
**Who edits**: Update safe defaults as needed

### `.env.test` (Committed)
**Purpose**: Test environment configuration
**Contains**: Mock values for testing
**Used for**: Automated tests
**Who edits**: Update when tests need new variables

### `.env.local` (Gitignored)
**Purpose**: Your personal secrets
**Contains**: Real API keys, local overrides
**Used for**: Your local development
**Who edits**: Each developer maintains their own

## Common Migration Issues

### Issue: "Can't find environment variable"

**Cause**: Variable not in `.env.local`
**Fix**:
```bash
# Check if variable exists in .env.example
grep VARIABLE_NAME .env.example

# Add it to your .env.local
echo "VARIABLE_NAME=value" >> .env.local

# Restart dev server
npm run dev
```

### Issue: "Old files still being used"

**Cause**: Next.js caching
**Fix**:
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### Issue: "Lost my API keys"

**Cause**: Didn't backup before migration
**Fix**:
```bash
# Check backup directory
cat .env-backup/env.local.backup

# Or retrieve from service providers:
# - Supabase: https://supabase.com/dashboard
# - OpenAI: https://platform.openai.com/api-keys
# - Unsplash: https://unsplash.com/developers
```

### Issue: "Variables not updating"

**Cause**: Server not restarted
**Fix**:
```bash
# Always restart server after env changes
# Ctrl+C to stop, then:
npm run dev
```

## Team Coordination

### For Team Leads:

1. **Announce Migration**:
   ```
   Team: We're consolidating env files.
   Action needed:
   1. Backup your .env.local
   2. Follow migration guide
   3. Test your setup
   Timeline: Complete by [date]
   ```

2. **Update Documentation**:
   - Update onboarding docs to reference `.env.example`
   - Remove references to old file locations
   - Update deployment guides

3. **Verify Team Members**:
   ```bash
   # Create checklist
   - [ ] Member 1 migrated
   - [ ] Member 2 migrated
   - [ ] CI/CD updated
   - [ ] Deployment verified
   ```

### For Developers:

1. **Before Pulling**:
   ```bash
   # Backup your current working .env.local
   cp .env.local .env.local.backup
   ```

2. **After Pulling**:
   ```bash
   # Follow migration steps above
   # Test your local environment
   npm run dev
   ```

3. **Report Issues**:
   - Document any variables that don't work
   - Share with team for quick resolution

## Rollback Plan

If migration causes issues:

```bash
# Restore your backup
cp .env-backup/env.local.backup .env.local

# Restore old structure (if backed up)
cp .env-backup/* config/env-examples/

# Report issue to team lead
# Include error messages and console output
```

## Validation Checklist

After migration, verify:

- [ ] App starts without errors: `npm run dev`
- [ ] All API integrations work:
  - [ ] Image search (Unsplash)
  - [ ] AI translation (OpenAI)
  - [ ] Database access (Supabase)
- [ ] No console warnings about missing env vars
- [ ] Tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Old files removed (after verification)
- [ ] `.env.local` is gitignored
- [ ] Backup kept safe

## Support

### Questions?

1. Check [environment-setup.md](./environment-setup.md)
2. Review `.env.example` comments
3. Ask in team chat
4. Create issue if bug found

### Resources:

- `.env.example` - Complete variable reference
- `environment-setup.md` - Setup guide
- `.env.development` - See default values
- [Next.js Env Docs](https://nextjs.org/docs/basic-features/environment-variables)

## Summary

**Old Way**: 10 files scattered across directories
**New Way**: 3-4 files with clear purposes

**Action Required**: Follow Steps 1-7 above
**Time Needed**: ~15-30 minutes
**Difficulty**: Easy (mostly copy-paste)

**Result**: Cleaner, more maintainable environment configuration!
