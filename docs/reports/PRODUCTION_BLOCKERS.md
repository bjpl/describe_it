# Production Blockers & High Priority Issues

**Last Updated**: October 8, 2025
**Status**: Build Passing, Issues Documented

---

## Critical Issues (Fix Before Production)

### 1. React Hooks Rules Violations - `src/components/ui/Toast.tsx`
**Severity**: HIGH - Runtime Error Risk

**Issue**: Hooks are being called in helper functions that are neither React components nor custom hooks:
- `toast.success()` calls `useToast()`
- `toast.error()` calls `useToast()`
- `toast.warning()` calls `useToast()`
- `toast.info()` calls `useToast()`
- `toast.promise()` calls `useToast()`

**Impact**: This violates React's Rules of Hooks and will cause runtime errors in production when these functions are called.

**ESLint Errors**:
```
191:32  Error: React Hook "useToast" is called in function "success"...
199:32  Error: React Hook "useToast" is called in function "error"...
208:32  Error: React Hook "useToast" is called in function "warning"...
216:32  Error: React Hook "useToast" is called in function "info"...
231:41  Error: React Hook "useToast" is called in function "promise"...
```

**Solution**:
```typescript
// WRONG - Current implementation
export const toast = {
  success: (message: string) => {
    const { addToast } = useToast(); // ❌ Hook in regular function
    addToast({ message, type: 'success' });
  }
};

// CORRECT - Two options:

// Option 1: Make them React components
export const ToastSuccess = ({ message }: { message: string }) => {
  const { addToast } = useToast(); // ✓ Hook in component
  React.useEffect(() => {
    addToast({ message, type: 'success' });
  }, []);
  return null;
};

// Option 2: Use a global toast manager (recommended)
class ToastManager {
  private listeners: Set<(toast: Toast) => void> = new Set();

  success(message: string) {
    this.notify({ message, type: 'success' });
  }

  private notify(toast: Toast) {
    this.listeners.forEach(listener => listener(toast));
  }

  subscribe(listener: (toast: Toast) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const toastManager = new ToastManager();

// In useToast hook:
React.useEffect(() => {
  return toastManager.subscribe(addToast);
}, []);
```

---

## High Priority Issues (Fix Next Sprint)

### 2. Missing Type Export - `AuthResponse`
**Severity**: MEDIUM - Type Safety Issue

**Issue**: Multiple components import `AuthResponse` from `@/types/api` but it's not exported:
- `src/components/Auth/AuthModal.tsx`
- `src/components/Auth/UserMenu.tsx`

**TypeScript Errors**:
```
AuthModal.tsx(9,15): error TS2305: Module '"@/types/api"' has no exported member 'AuthResponse'.
UserMenu.tsx(10,15): error TS2305: Module '"@/types/api"' has no exported member 'AuthResponse'.
```

**Solution**:
Add the type export to `src/types/api.ts`:
```typescript
export interface AuthResponse {
  user: User;
  session: Session;
  access_token: string;
  refresh_token: string;
}
```

---

### 3. Framer Motion Variants Type Errors (50+ errors)
**Severity**: MEDIUM - Type Safety Issue

**Files Affected**:
- `src/components/Onboarding/CompletionStep.tsx` (8 errors)
- `src/components/Onboarding/OnboardingWizard.tsx` (2 errors)

**Issue**: Framer Motion v12 has stricter type requirements for `Variants`. The `transition.type` property must be a specific literal type, not a string.

**TypeScript Errors**:
```
CompletionStep.tsx(166,17): Type 'string' is not assignable to type 'AnimationGeneratorType | undefined'.
```

**Solution**:
```typescript
// WRONG
const variants: Variants = {
  visible: {
    opacity: 1,
    transition: {
      type: 'spring', // ❌ String literal
    }
  }
};

// CORRECT
import { Variants, Spring } from 'framer-motion';

const variants: Variants = {
  visible: {
    opacity: 1,
    transition: {
      type: 'spring' as const, // ✓ Const assertion
      stiffness: 100,
      damping: 10,
    } satisfies Spring
  }
};

// OR simpler: Remove explicit Variants type
const variants = {
  visible: {
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
    }
  }
} as const;
```

---

### 4. Null/Undefined Type Safety (142 TS2345 errors)
**Severity**: MEDIUM - Runtime Safety Issue

**Issue**: Many functions expect non-null values but receive potentially null values.

**Common Pattern**:
```typescript
// Error: Argument of type 'null' is not assignable to parameter of type 'string | undefined'
someFunction(null); // ❌

// Fix: Use undefined instead of null, or check if function accepts null
someFunction(undefined); // ✓
// OR
if (value !== null) {
  someFunction(value); // ✓
}
```

**Top Files**:
- `lib/api/client.ts` (36 errors)
- `lib/store/appStore.ts` (19 errors)
- `lib/store/uiStore.ts` (17 errors)

**Recommended Action**:
- Enable strict null checks in tsconfig
- Add null checks before passing to functions
- Use optional chaining (`?.`) and nullish coalescing (`??`)

---

### 5. React Hooks Dependencies (40 warnings)
**Severity**: MEDIUM - Potential Bug Source

**Issue**: useEffect, useCallback, and useMemo hooks are missing dependencies in their dependency arrays.

**Examples**:
```typescript
// WARNING: Missing dependency 'fetchData'
useEffect(() => {
  fetchData();
}, []); // ❌

// FIX:
useEffect(() => {
  fetchData();
}, [fetchData]); // ✓
```

**Impact**: Can cause stale closures, memory leaks, and unexpected behavior.

**Files with Most Warnings**:
- `hooks/useErrorReporting.ts` (6 warnings)
- `hooks/usePerformanceOptimizations.ts` (4 warnings)
- `hooks/useOptimizedState.ts` (3 warnings)

**Solutions**:
1. Add missing dependencies
2. Use `useCallback` to stabilize function references
3. Use `useRef` for values that don't need to trigger re-renders
4. Disable rule only when absolutely necessary with explanation

---

## Medium Priority Issues

### 6. Image Optimization (9 warnings)
**Severity**: LOW - Performance Impact

**Issue**: Using `<img>` tags instead of Next.js `<Image>` component.

**Files**:
- `components/ImageSearch.tsx`
- `components/ImageDisplay.tsx`
- `components/ImageSearch/ImageGrid.tsx`
- `components/Optimized/OptimizedImageGrid.tsx`

**Impact**: Slower Largest Contentful Paint (LCP), higher bandwidth usage.

**Solution**:
```typescript
// WRONG
<img src={url} alt="description" />

// CORRECT
import Image from 'next/image';
<Image src={url} alt="description" width={500} height={300} />
```

---

### 7. Missing Alt Text (6 warnings)
**Severity**: LOW - Accessibility Issue

**Issue**: Images without alt attributes fail WCAG accessibility guidelines.

**Files**:
- `components/Dashboard/SavedDescriptions.tsx`
- `components/HelpContent.tsx`
- `components/SectionErrorBoundary.tsx`
- `components/Optimized/OptimizedImage.tsx`

**Solution**:
```typescript
// WRONG
<Image src={url} />

// CORRECT
<Image src={url} alt="Description of image content" />
// OR for decorative images:
<Image src={url} alt="" />
```

---

### 8. Unescaped JSX Entities (10 errors)
**Severity**: LOW - XSS Risk (if dynamic)

**Issue**: Apostrophes and quotes not escaped in JSX.

**Files**:
- `components/ApiKeySetupWizard.tsx`
- `components/Auth/ForgotPasswordForm.tsx`
- `components/Auth/PasswordRequirements.tsx`
- `components/Onboarding/*.tsx`

**Solution**:
```typescript
// WRONG
<p>Don't forget to save!</p>

// CORRECT
<p>Don&apos;t forget to save!</p>
// OR
<p>{"Don't forget to save!"}</p>
```

---

## Technical Debt (Low Priority)

### 9. Implicit Any Types (19 TS7006 errors)
**Issue**: Function parameters with implicit `any` type.

**Solution**: Add explicit type annotations:
```typescript
// WRONG
function handleClick(event) { } // ❌

// CORRECT
function handleClick(event: React.MouseEvent<HTMLButtonElement>) { } // ✓
```

---

### 10. Anonymous Default Exports (3 warnings)
**Issue**: Default exports of anonymous objects/functions.

**Solution**:
```typescript
// WRONG
export default { ... };

// CORRECT
const config = { ... };
export default config;
```

---

## Summary Statistics

| Category | Count | Severity |
|----------|-------|----------|
| React Hooks Violations | 4 | CRITICAL |
| Missing Type Exports | 2 | HIGH |
| Framer Motion Type Errors | 50+ | HIGH |
| Null/Undefined Safety | 142 | MEDIUM |
| Hook Dependencies | 40 | MEDIUM |
| Image Optimization | 9 | LOW |
| Missing Alt Text | 6 | LOW |
| Unescaped Entities | 10 | LOW |
| Implicit Any | 19 | LOW |
| Anonymous Exports | 3 | LOW |

**Total Issues**: 285+
**Critical**: 4
**High**: 52+
**Medium**: 182
**Low**: 47

---

## Recommended Fix Order

1. **First** (Before Production): Fix React Hooks violations in `Toast.tsx`
2. **Second** (Before Production): Add `AuthResponse` type export
3. **Third** (Next Sprint): Fix Framer Motion type errors
4. **Fourth** (Next Sprint): Address null/undefined safety
5. **Fifth** (Next Sprint): Fix React Hooks dependencies
6. **Ongoing**: Image optimization, accessibility, code quality

---

## Testing Checklist After Fixes

- [ ] Production build still passes
- [ ] No new TypeScript errors introduced
- [ ] No new ESLint errors introduced
- [ ] Toast notifications work in browser
- [ ] Authentication flow works end-to-end
- [ ] Onboarding wizard animations work
- [ ] No console errors in browser
- [ ] Sentry captures errors correctly

---

**Document Owner**: Production Validator Agent
**Last Review**: 2025-10-08
**Next Review**: After critical fixes applied
