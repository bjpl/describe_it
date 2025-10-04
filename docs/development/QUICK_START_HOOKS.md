# Pre-Commit Hooks - Quick Start Guide

## What Are Pre-Commit Hooks?

Pre-commit hooks are automated checks that run **before** your code is committed. They prevent common mistakes and technical debt from entering the codebase.

---

## Installation Status

✅ **Already Installed** - Hooks are active in this repository.

The hooks run automatically when you use `git commit`.

---

## What Gets Checked

### 1. Backup Files 🚫
**Blocks commit if found**

```bash
❌ component.tsx.bak
❌ config.json.old
❌ utils.ts~
```

**Fix:** Delete or move backup files before committing

---

### 2. TODO Comments 📝
**Blocks commit if not linked to GitHub issue**

```typescript
✅ // TODO(#123): Implement authentication
❌ // TODO: Fix this later
```

**Fix:** Create GitHub issue and reference it
```bash
gh issue create --title "Implement authentication"
# Returns: Created issue #123
# Then use: TODO(#123): Implement authentication
```

---

### 3. Console Logs ⚠️
**Warning only - doesn't block**

```typescript
⚠️ console.log("Debug info")
✅ console.error("Error message")
✅ console.warn("Warning message")
```

**Fix:** Use proper logger or remove debug statements

---

## Usage

### Normal Workflow

Hooks run automatically:

```bash
git add .
git commit -m "feat: Add new feature"

# Hooks run automatically
✓ Formatting code with Prettier
✓ Running ESLint
✓ Type checking
✓ Checking for backup files
✓ Validating TODO comments
✓ Checking console logs
✓ Pre-commit checks completed

[main abc1234] feat: Add new feature
```

---

### If Hooks Find Issues

```bash
git commit -m "feat: Add feature"

❌ COMMIT REJECTED: Backup files detected
  - src/component.tsx.bak

# Fix the issue
rm src/component.tsx.bak

# Try again
git commit -m "feat: Add feature"
✓ Pre-commit checks completed
```

---

## Manual Testing

Test hooks before committing:

```bash
# Test all hooks
npm run hooks:test

# Test backup file detection
npm run check:backups

# Test TODO validation
npm run lint:todos
```

---

## Emergency Bypass

**⚠️ Only for genuine emergencies**

```bash
# Skip all pre-commit hooks
git commit --no-verify -m "hotfix: Critical production bug"
```

**When to bypass:**
- Critical production hotfix
- Merge conflict resolution
- Emergency rollback

**When NOT to bypass:**
- Regular development
- Time pressure
- Convenience

---

## Common Issues

### Issue: Hooks not running

```bash
# Reinstall hooks
npm run hooks:install

# Or manually
rm -rf .husky
npm run prepare
```

### Issue: False positive on backup file

```bash
# If file is legitimately needed, add to .gitignore
echo "src/special.bak" >> .gitignore
```

### Issue: Need to add TODO without issue

Create the issue first:

```bash
# Via GitHub CLI
gh issue create --title "My TODO description"

# Via web
# Go to: https://github.com/your-org/your-repo/issues/new
```

---

## NPM Scripts

```bash
# Run all hooks manually
npm run lint:staged

# Test specific checks
npm run check:backups      # Check for backup files
npm run lint:todos         # Validate TODO format

# Test all hooks
npm run hooks:test         # Run all pre-commit checks

# Reinstall hooks
npm run hooks:install      # Reinstall Husky hooks
```

---

## File Patterns

### Blocked Backup Extensions

```
*.bak         # component.tsx.bak
*.backup      # config.backup
*.old         # utils.old
*.orig        # styles.orig
*.tmp         # data.tmp
*~            # file~
*.swp         # .file.swp (Vim)
*.copy        # file.copy
-backup.*     # file-backup.ts
-old.*        # file-old.ts
```

### Checked File Types

**Code files:**
- `*.ts`, `*.tsx` - TypeScript
- `*.js`, `*.jsx` - JavaScript
- `*.mjs`, `*.cjs` - ES/CommonJS modules

**Style files:**
- `*.css`, `*.scss`, `*.sass`

**Config files:**
- `*.json`

**Documentation:**
- `*.md`

---

## Examples

### Example 1: Valid Commit

```bash
# Edit file
vim src/auth.ts

# Add valid TODO
# TODO(#123): Implement OAuth2 login

# Commit
git add src/auth.ts
git commit -m "feat(auth): Add login skeleton"

✓ Pre-commit checks completed
[main abc1234] feat(auth): Add login skeleton
```

### Example 2: Backup File Rejected

```bash
# Accidentally create backup
cp src/utils.ts src/utils.ts.bak

# Try to commit
git add .
git commit -m "feat: Update utils"

❌ COMMIT REJECTED: Backup files detected
  - src/utils.ts.bak

# Fix
rm src/utils.ts.bak

# Commit again
git commit -m "feat: Update utils"
✓ Pre-commit checks completed
```

### Example 3: Invalid TODO

```bash
# Add TODO without issue
# TODO: Fix authentication bug

git add .
git commit -m "wip: Auth changes"

❌ COMMIT REJECTED: Invalid TODO comments found
  src/auth.ts:45
    // TODO: Fix authentication bug

Valid TODO format:
  // TODO(#123): Description

# Create issue
gh issue create --title "Fix authentication bug"
# Created issue #456

# Update TODO
# TODO(#456): Fix authentication bug

git add .
git commit -m "wip: Auth changes"
✓ Pre-commit checks completed
```

---

## Tips

### 1. Run Checks Before Committing

```bash
# Check everything first
npm run typecheck
npm run lint
npm run test
npm run hooks:test

# Then commit
git add .
git commit -m "feat: Add feature"
```

### 2. Keep Commits Small

Smaller commits = faster hooks:

```bash
# Instead of
git add .  # 100 files

# Do this
git add src/components/NewFeature*
git commit -m "feat: Add NewFeature"

git add src/components/NewFeature.test.tsx
git commit -m "test: Add NewFeature tests"
```

### 3. Use Conventional Commits

```bash
feat(auth): Add OAuth login
fix(api): Handle rate limit errors
docs(hooks): Update documentation
test(utils): Add validation tests
refactor(db): Optimize queries
```

---

## Getting Help

### Documentation
- **Detailed Guide:** `docs/development/PRE_COMMIT_HOOKS.md`
- **Test Results:** `docs/development/HOOK_TESTING_RESULTS.md`
- **Implementation:** `docs/development/PRE_COMMIT_IMPLEMENTATION_SUMMARY.md`

### Support
- Create GitHub issue with label `tooling`
- Ask in team chat
- Check troubleshooting section in main documentation

---

## Summary

**What you need to know:**

1. Hooks run automatically on `git commit`
2. They prevent backup files and unlinked TODOs
3. They warn about console.log statements
4. Fix issues and commit again
5. Only bypass in emergencies

**Most common fixes:**
- Delete `.bak`, `.old`, `~` files
- Link TODOs to GitHub issues
- Remove `console.log` statements

**That's it!** The hooks work automatically to keep code clean.

---

**Last Updated:** 2025-10-03
