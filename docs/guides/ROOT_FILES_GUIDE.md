# Root Directory Files Guide

## ✅ Files That MUST Stay in Root

These files must remain in root for the application to function properly:

### Core Project Files
- `package.json` - NPM dependencies and scripts
- `package-lock.json` - Dependency lock file
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration

### Documentation
- `README.md` - Main project documentation
- `CLAUDE.md` - Claude configuration guide

### Environment Files
- `.env.local` - Local environment variables (git-ignored)
- `.env.flow-nexus` - Flow Nexus configuration

### Code Files
- `instrumentation.ts` - Next.js instrumentation
- `next-env.d.ts` - Next.js TypeScript definitions

### Git & Version Control
- `.gitignore` - Git ignore rules
- `.dockerignore` - Docker ignore rules

### Linting & Formatting
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.nvmrc` - Node version specification

### Build Files (Auto-generated)
- `tsconfig.tsbuildinfo` - TypeScript build info (git-ignored)

### Hidden Folders (Must Stay)
- `.git/` - Git repository
- `.github/` - GitHub workflows (disabled)
- `.next/` - Next.js build output (git-ignored)
- `.husky/` - Git hooks
- `.vercel/` - Vercel deployment (git-ignored)

### MCP & Claude Folders
- `.claude/` - Claude configurations
- `.claude-flow/` - Claude Flow settings
- `.mcp.json` - MCP configuration

### Other Config Files in Root
- `.lighthouserc.js` - Lighthouse CI config
- `.size-limit.json` - Bundle size limits
- `.roomodes` - Room modes configuration

## 📁 Files That Were Moved

### To `/config/`
- All Docker files (`docker-compose.yml`, `Dockerfile`)
- Test configs (`jest.config.js`, `vitest.config.ts`, `playwright.config.ts`)
- Sentry configs (`sentry.*.config.ts`)
- Environment examples (`.env.example`, `.env.production`)
- Claude Flow configs

### To `/docs/`
- All markdown documentation (except README.md and CLAUDE.md)
- Reports (`/docs/reports/`)
- Guides (`/docs/guides/`)
- Security docs (`/docs/security/`)
- Archive (`/docs/archive/`)

### To `/scripts/`
- Test scripts (`test-*.js`)
- Startup scripts (`start-claude-flow-mcp.bat`)
- Utility scripts

## ⚠️ Security Notes

1. **vercel.env** - Should be deleted or added to .gitignore (contains secrets)
2. **Never commit** `.env.local` or any `.env` files with real values
3. **Build outputs** (`.next/`, `node_modules/`) should stay git-ignored

## 📊 Final Count

- **Root files needed**: ~20-25 files
- **Root folders needed**: 15-20 folders (including hidden)
- **Total root items**: ~35-40 (This is normal for a Next.js project)

The root directory is now properly organized with only essential files that must be there for the application to function correctly.