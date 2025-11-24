# Technical Debt and Follow-up Tasks

## Build Configuration Status

### ✅ Completed (2025-11-19)

1. **TypeScript Checking Enabled** - CRITICAL
   - `next.config.mjs`: Set `typescript.ignoreBuildErrors = false`
   - TypeScript errors will now block production builds
   - This prevents type errors from reaching production

2. **Sentry Configuration Fixed** - HIGH PRIORITY
   - File: `sentry.client.config.ts`
   - Fixed: `tracingOrigins` → `tracePropagationTargets` (deprecated API)
   - Fixed: Null handling for `localStorage.getItem('user-id')`

3. **Console Statements Replaced** - HIGH PRIORITY
   - Replaced `console.error` with `logger.error` in:
     - `src/app/api/search/descriptions/route.ts`
     - `src/app/api/search/vocabulary/route.ts`
     - `src/lib/offline-storage.ts`
   - Ensures proper structured logging in production

4. **React Unescaped Entities Fixed** - PARTIAL
   - Fixed in:
     - `src/components/EnhancedPhrasesPanel.tsx`
     - `src/app/test-api-key/page.tsx`

### 🚧 Remaining Work

#### ESLint Errors (27 total) - MEDIUM PRIORITY

ESLint checking is temporarily disabled in builds until these are fixed.
All errors are related to React unescaped entities (quotes in JSX).

**Files requiring fixes:**

1. `src/components/DescriptionNotebook.tsx` (2 errors)
2. `src/components/ErrorBoundary/SentryErrorBoundary.tsx` (1 error)
3. `src/components/FlashcardComponent.tsx` (6 errors)
4. `src/components/GammaVocabularyExtractor.tsx` (multiple errors)
5. `src/components/HelpContent.tsx` (2 errors)
6. `src/components/ImageSearch/ImageSearch.tsx` (2 errors)
7. `src/components/ShowAnswer.tsx` (2 errors)
8. `src/components/Vocabulary/DatabaseVocabularyManager.tsx` (2 errors)
9. `src/components/OptimizedComponents.tsx` (1 react/display-name error)

**How to fix:**
Replace literal quotes in JSX with HTML entities:

- `"text"` → `&quot;text&quot;`
- `'text'` → `&apos;text&apos;`

**Command to check:**

```bash
npm run lint
```

#### TypeScript Type Issues (Non-blocking) - LOW PRIORITY

**Vercel KV Storage Typing:**

- Files: API routes using `@vercel/kv`
- Issue: KV storage methods return `{}` type in some cases
- Impact: Non-critical, runtime behavior is correct
- Affected files:
  - `src/app/api/export/generate/route.ts`
  - `src/app/api/progress/track/route.ts`

**How to fix:**
Add explicit type assertions or interfaces for KV return types.

### 📋 Next Steps

1. **High Priority** - Enable ESLint in builds:
   - Fix remaining 27 ESLint errors (unescaped entities)
   - Set `eslint.ignoreDuringBuilds = false` in `next.config.mjs`
   - Run `npm run build` to verify

2. **Medium Priority** - Improve type safety:
   - Add proper typing for Vercel KV storage returns
   - Fix remaining TypeScript warnings

3. **Low Priority** - React Hook dependencies:
   - Review and fix exhaustive-deps warnings
   - Most are non-critical but improve code quality

### 🎯 Build Status

- ✅ TypeScript: **ENABLED** - Errors block builds
- ⚠️ ESLint: **DISABLED** - 27 errors need fixing before enabling
- ✅ Type Safety: **GOOD** - Critical Sentry issues fixed
- ✅ Logging: **GOOD** - Console statements replaced with logger

### 📊 Error Summary

```
TypeScript Errors: 0 critical (Sentry config fixed)
ESLint Errors: 27 (all react/no-unescaped-entities)
ESLint Warnings: ~50 (React hooks exhaustive-deps)
```

### 🚀 To Enable Full Type & Lint Checking

1. Fix remaining ESLint errors:

   ```bash
   # See all errors
   npm run lint

   # Fix manually or use automated tool
   # Most errors are in components - replace " with &quot;
   ```

2. Enable ESLint in next.config.mjs:

   ```javascript
   eslint: {
     ignoreDuringBuilds: false,
   }
   ```

3. Verify build passes:
   ```bash
   npm run build
   ```

---

_Last updated: 2025-11-19_
_Author: Claude Code Agent (Coder)_
