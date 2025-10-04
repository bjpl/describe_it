# Pre-Commit Hooks Documentation

## Overview

This project uses pre-commit hooks to maintain code quality and prevent technical debt from being committed to the repository. The hooks are managed by [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged).

## What Gets Checked

### 1. Backup File Detection
**Script:** `scripts/pre-commit/check-backup-files.js`

**Purpose:** Prevents accidental commits of backup files, temporary files, and editor artifacts.

**Detected Patterns:**
- `.bak`, `.backup`, `.old`, `.orig`, `.tmp`
- Files ending with `~`
- `.swp`, `.swo` (Vim swap files)
- `.DS_Store`, `Thumbs.db`
- `.copy`, `-backup`, `-old` suffixes

**Example Violations:**
```
❌ component.tsx.bak
❌ config.json.old
❌ utils.ts~
❌ file.copy.ts
```

---

### 2. TODO Comment Format Validation
**Script:** `scripts/pre-commit/validate-todo-format.js`

**Purpose:** Ensures all TODO comments reference GitHub issues for better task tracking.

**Valid Format:**
```typescript
// TODO(#123): Implement user authentication
// TODO(#456): Refactor database queries for better performance
/* TODO(#789): Add comprehensive error handling */
```

**Invalid Format:**
```typescript
❌ // TODO: Fix this later
❌ // TODO - needs work
❌ /* TODO implement this */
```

**Creating a GitHub Issue:**
```bash
# Create issue via GitHub CLI
gh issue create --title "Implement user authentication"

# Create issue via web interface
# Go to: https://github.com/your-org/your-repo/issues/new
```

---

### 3. Console Log Detection
**Script:** `scripts/pre-commit/prevent-console-logs.js`

**Purpose:** Warns about `console.log` and `console.debug` statements in production code.

**Behavior:**
- **WARNING only** - does not block commits
- Encourages use of proper logging libraries
- Allows `console.error` and `console.warn`
- Skips test files, scripts, and config files

**Recommendation:**
```typescript
// ❌ Avoid
console.log('User data:', userData);

// ✅ Use proper logger
import { logger } from '@/lib/logger';
logger.info('User data retrieved', { userId: userData.id });
```

---

### 4. Code Formatting and Linting
**Tools:** Prettier, ESLint

**Purpose:** Ensures consistent code style and catches common errors.

**Checks:**
- Code formatting (Prettier)
- ESLint rules (max-warnings: 0)
- TypeScript type checking
- Import ordering
- Unused variables
- Code complexity

---

## How to Use

### Normal Commits
Hooks run automatically on every commit:

```bash
git add .
git commit -m "feat: Add user profile page"
# Hooks run automatically
```

### Bypassing Hooks (Emergency Only)

**⚠️ WARNING: Only use in genuine emergencies**

```bash
# Bypass all pre-commit hooks
git commit --no-verify -m "emergency: Fix critical production bug"

# Why bypass should be rare:
# - Backup files can cause deployment issues
# - Unlinked TODOs become lost tasks
# - Console logs expose sensitive data
# - Formatting issues accumulate
```

**When Bypass is Acceptable:**
- Critical production hotfix (fix it properly later)
- Merge conflict resolution (hooks already ran on original commits)
- Emergency rollback

---

## Adding New Hooks

### 1. Create Hook Script

Create a new script in `scripts/pre-commit/`:

```javascript
#!/usr/bin/env node
// scripts/pre-commit/check-sensitive-data.js

import { readFileSync } from 'fs';

const SENSITIVE_PATTERNS = [
  /password\s*=\s*['"]/i,
  /api[_-]?key\s*=\s*['"]/i,
  /secret\s*=\s*['"]/i,
];

async function main() {
  const stagedFiles = process.argv.slice(2);
  let violations = [];

  for (const file of stagedFiles) {
    const content = readFileSync(file, 'utf-8');
    SENSITIVE_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        violations.push({ file, pattern: pattern.source });
      }
    });
  }

  if (violations.length > 0) {
    console.error('❌ COMMIT REJECTED: Sensitive data detected');
    violations.forEach(v => console.error(`  ${v.file}: ${v.pattern}`));
    process.exit(1);
  }

  process.exit(0);
}

main();
```

### 2. Update lint-staged Configuration

Edit `lint-staged.config.js`:

```javascript
export default {
  '**/*.{ts,tsx,js,jsx}': [
    'prettier --write',
    'eslint --fix --max-warnings=0',
    () => 'tsc --noEmit',
    'node scripts/pre-commit/validate-todo-format.js',
    'node scripts/pre-commit/prevent-console-logs.js',
    'node scripts/pre-commit/check-sensitive-data.js', // Add new hook
  ],
};
```

### 3. Make Script Executable

```bash
chmod +x scripts/pre-commit/check-sensitive-data.js
```

### 4. Test the Hook

```bash
# Stage files and test
git add .
npm run lint:staged  # Test without committing

# Test actual commit
git commit -m "test: Verify new hook"
```

---

## Available npm Scripts

### Pre-commit Related Scripts

```bash
# Run all lint-staged checks manually
npm run lint:staged

# Check TODO format specifically
npm run lint:todos

# Check for backup files
npm run check:backups

# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Run ESLint
npm run lint

# Type checking
npm run typecheck
```

### Hook Setup and Maintenance

```bash
# Install/reinstall hooks (runs automatically after npm install)
npm run prepare

# Remove all hooks
rm -rf .husky
npx husky install

# Update husky
npm install husky@latest --save-dev
npm run prepare
```

---

## Troubleshooting

### Hook Not Running

```bash
# Verify Husky is installed
ls -la .husky/

# Reinstall hooks
rm -rf .husky
npm run prepare

# Check hook permissions
chmod +x .husky/pre-commit
```

### Hook Failing Incorrectly

```bash
# Run lint-staged directly to see full error
npx lint-staged

# Run specific check manually
node scripts/pre-commit/check-backup-files.js src/components/Button.tsx

# Check Node.js version (requires >= 20.11.0)
node --version
```

### Performance Issues

If hooks are slow:

```bash
# Limit files checked (lint-staged.config.js)
export default {
  '**/*.{ts,tsx}': [
    // Only type-check changed files, not entire project
    'tsc --noEmit --skipLibCheck',
  ],
};

# Skip type checking temporarily
SKIP_TYPE_CHECK=1 git commit -m "..."
```

---

## Hook Architecture

```
┌─────────────────────────────────────────────────────┐
│  git commit                                         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  .husky/pre-commit                                  │
│  ├─ Triggers lint-staged                           │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  lint-staged.config.js                              │
│  ├─ Groups files by extension                      │
│  ├─ Runs appropriate checks for each group         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ├──────────┬──────────┬─────────────┐
                  ▼          ▼          ▼             ▼
         ┌─────────────┐ ┌────────┐ ┌──────┐ ┌──────────────┐
         │ check-      │ │ TODO   │ │ ESL  │ │ TypeScript   │
         │ backup-     │ │ format │ │ int  │ │ type check   │
         │ files.js    │ │ .js    │ │      │ │              │
         └─────────────┘ └────────┘ └──────┘ └──────────────┘
                  │          │          │             │
                  └──────────┴──────────┴─────────────┘
                                  │
                    All pass ✓    │    Any fail ✗
                                  │
                  ┌───────────────┴──────────────┐
                  ▼                              ▼
         ┌─────────────────┐         ┌──────────────────┐
         │ Commit succeeds │         │ Commit rejected  │
         │ Changes saved   │         │ Fix issues and   │
         │                 │         │ try again        │
         └─────────────────┘         └──────────────────┘
```

---

## Best Practices

### 1. Run Checks Before Committing

```bash
# Run all checks manually first
npm run typecheck
npm run lint
npm run format:check
npm run test

# Then commit
git add .
git commit -m "feat: Add new feature"
```

### 2. Fix Issues, Don't Bypass

```bash
# ❌ Don't do this
git commit --no-verify

# ✅ Do this
npm run format        # Fix formatting
npm run lint -- --fix # Fix lint issues
git add .
git commit
```

### 3. Use Conventional Commits

```bash
# Format: <type>(<scope>): <description>
git commit -m "feat(auth): Add OAuth2 login"
git commit -m "fix(api): Handle rate limit errors"
git commit -m "docs(hooks): Update pre-commit documentation"
```

### 4. Keep Commits Small

Smaller commits = faster hook execution:

```bash
# Instead of
git add .  # 100 files

# Do this
git add src/components/NewFeature*
git commit -m "feat: Add NewFeature component"

git add src/components/NewFeature.test.tsx
git commit -m "test: Add NewFeature tests"
```

---

## Configuration Files

### lint-staged.config.js
Defines which checks run on which file types.

### .husky/pre-commit
Entry point for all pre-commit hooks.

### scripts/pre-commit/*
Individual hook implementations.

### .eslintrc.js
ESLint rules and configuration.

### .prettierrc
Code formatting rules.

### tsconfig.json
TypeScript compiler options.

---

## Support and Issues

### Reporting Hook Issues

If a hook is causing problems:

1. Create a GitHub issue with:
   - Hook script that's failing
   - Full error message
   - Steps to reproduce
   - Your environment (OS, Node version)

2. Temporary workaround (while issue is being fixed):
   ```bash
   # Document why you're bypassing
   git commit --no-verify -m "fix: Critical bug (hook issue #123)"
   ```

### Requesting New Hooks

To request a new pre-commit check:

1. Create a GitHub issue describing:
   - What should be checked
   - Why it's important
   - Example violations
   - Suggested implementation

2. Or submit a PR with:
   - New hook script in `scripts/pre-commit/`
   - Updated `lint-staged.config.js`
   - Tests for the hook
   - Documentation updates

---

## Related Documentation

- [Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Last Updated:** 2025-10-03
**Maintained By:** Development Team
