# UAT Recommendations & Action Items

## Priority 1: Pre-Launch Critical (Complete Before Production)

### 1. Accessibility Improvements

**File:** `src/components/Settings/ApiKeysSection.tsx`

**Issues:**
- Missing ARIA labels for password toggle buttons
- No aria-live regions for save status announcements
- Missing aria-describedby for help text

**Fixes Required:**

```typescript
// Line 92-110: Add ARIA attributes to inputs
<input
  type={showKeys.anthropic ? 'text' : 'password'}
  value={keys.anthropic}
  onChange={(e) => handleChange('anthropic', e.target.value)}
  placeholder="sk-ant-api03-..."
  className="..."
  autoComplete="off"
  // ADD THESE:
  aria-label="Anthropic API Key"
  aria-describedby="anthropic-help-text"
  aria-required="true"
/>

// Line 100-109: Add ARIA label to toggle button
<button
  onClick={() => toggleVisibility('anthropic')}
  className="..."
  type="button"
  // ADD THIS:
  aria-label={showKeys.anthropic ? "Hide API key" : "Show API key"}
>
  {showKeys.anthropic ? <EyeOff /> : <Eye />}
</button>

// Line 179-215: Add aria-live to save button
<button
  onClick={handleSave}
  disabled={saveStatus === 'saving'}
  className="..."
  // ADD THIS:
  aria-live="polite"
  aria-label={
    saveStatus === 'saved' ? 'API keys saved successfully' :
    saveStatus === 'error' ? 'Error saving API keys, please retry' :
    'Save API keys'
  }
>
  {/* ... */}
</button>
```

**Estimated Time:** 1-2 hours
**Impact:** WCAG 2.1 AA compliance

---

### 2. Keyboard Focus Indicators

**File:** `src/components/SettingsModal.tsx`

**Issue:** No visible focus outline for tab navigation

**Fix:**

```typescript
// Line 239-247: Add focus styles to tab buttons
className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
  // ADD THIS:
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  ${activeTab === tab.id
    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
  }`}
```

**Estimated Time:** 30 minutes
**Impact:** Keyboard navigation usability

---

### 3. Cross-Browser Testing Script

**Create:** `scripts/browser-test.sh`

```bash
#!/bin/bash
# Browser compatibility test script

echo "Starting cross-browser UAT..."

# Test URLs
LOCAL_URL="http://localhost:3000"
STAGING_URL="https://staging.describe-it.app"

# Browser test commands (requires manual execution)
echo "Testing Chrome..."
echo "1. Open DevTools (F12)"
echo "2. Navigate to Settings > API Keys"
echo "3. Enter test Anthropic key"
echo "4. Click Save and verify success"
echo "5. Generate image description"
echo "6. Check Network tab for API calls"
echo "Press Enter when complete..."
read

echo "Testing Firefox..."
echo "Repeat steps in Firefox..."
read

echo "Testing Edge..."
echo "Repeat steps in Edge..."
read

echo "Testing Safari (macOS only)..."
echo "Repeat steps in Safari..."
read

echo "Browser testing complete!"
```

**Estimated Time:** 2-3 hours manual testing
**Impact:** Ensures cross-platform compatibility

---

## Priority 2: Pre-Launch Recommended (High Value)

### 4. Japanese Translation Support

**File:** `src/app/api/translate/route.ts`

**Current Limitation:** Japanese not supported (line 50)

**Fix:**

```typescript
// Line 50: Add Japanese
const supportedLanguages = ["en", "es", "fr", "de", "it", "pt", "ja"];

// Line 143-150: Update language map
const languageMap: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese", // ADD THIS
};
```

**Also Update:** `src/lib/api/claude-server.ts` (translation function)

**Estimated Time:** 1 hour
**Impact:** Expands user base, global reach

---

### 5. Performance Testing Suite

**Create:** `tests/performance/uat-benchmarks.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('UAT Performance Benchmarks', () => {
  it('should generate image description in <15 seconds', async () => {
    const start = performance.now();

    const response = await fetch('http://localhost:3000/api/descriptions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0',
        style: 'narrativo',
        maxLength: 300,
        languages: ['en', 'es']
      })
    });

    const end = performance.now();
    const duration = end - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(15000); // <15 seconds
  });

  it('should generate Q&A in <5 seconds', async () => {
    const start = performance.now();

    const response = await fetch('http://localhost:3000/api/qa/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'A beautiful sunset over the ocean',
        language: 'en',
        count: 5
      })
    });

    const end = performance.now();
    const duration = end - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(5000); // <5 seconds
  });

  it('should translate text in <2 seconds', async () => {
    const start = performance.now();

    const response = await fetch('http://localhost:3000/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello, world!',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      })
    });

    const end = performance.now();
    const duration = end - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(2000); // <2 seconds
  });
});
```

**Run:** `npm run test:perf`

**Estimated Time:** 2 hours (write + execute)
**Impact:** Validates performance claims

---

### 6. Lighthouse CI Integration

**File:** `.github/workflows/lighthouse-ci.yml`

```yaml
name: Lighthouse CI
on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: npx @lhci/cli@0.12.x autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

**Expected Scores:**
- Performance: >90
- Accessibility: >90
- Best Practices: >95
- SEO: >90

**Estimated Time:** 1 hour
**Impact:** Automated quality checks

---

## Priority 3: Post-Launch (First Week)

### 7. Real User Monitoring

**Implementation:**

```typescript
// src/lib/monitoring/rum.ts
export function trackUserFlow(flowName: string, metadata?: Record<string, any>) {
  // Log to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', flowName, {
      event_category: 'user_flow',
      ...metadata
    });
  }

  // Log to Sentry
  Sentry.addBreadcrumb({
    category: 'user_flow',
    message: flowName,
    level: 'info',
    data: metadata
  });
}

// Usage in components:
trackUserFlow('api_key_saved', { service: 'anthropic' });
trackUserFlow('description_generated', { style: 'narrativo', language: 'en' });
```

**Estimated Time:** 3 hours
**Impact:** Data-driven UX improvements

---

### 8. A/B Testing Framework

**Test Hypothesis:** Does parallel generation improve perceived speed?

**Setup:**

```typescript
// src/lib/experiments/ab-test.ts
export function getExperimentVariant(experimentName: string): 'control' | 'variant' {
  const userId = getUserId(); // From localStorage or session
  const hash = simpleHash(userId + experimentName);
  return hash % 2 === 0 ? 'control' : 'variant';
}

// In API:
const variant = getExperimentVariant('parallel_generation');

if (variant === 'variant') {
  // Use parallel generation (current implementation)
  return await generateParallelDescriptions(...);
} else {
  // Use sequential generation (control)
  return await generateSequentialDescriptions(...);
}

// Track results:
trackUserFlow('description_generated', {
  variant,
  responseTime,
  userSatisfaction
});
```

**Estimated Time:** 4 hours
**Impact:** Validates performance improvements

---

## Priority 4: Ongoing Monitoring

### 9. Sentry Alert Rules

**Setup in Sentry Dashboard:**

1. **High Error Rate**
   - Condition: >10 errors/min
   - Action: Email + Slack notification
   - Threshold: 5 minutes

2. **Slow API Response**
   - Condition: P95 response time >20s
   - Action: Email notification
   - Threshold: 15 minutes

3. **API Key Validation Failures**
   - Condition: >5 failures/hour
   - Action: Investigate immediately
   - Could indicate user confusion or attack

**Estimated Time:** 30 minutes
**Impact:** Proactive issue detection

---

### 10. Cost Monitoring Dashboard

**Anthropic API Usage Tracking:**

```typescript
// src/lib/monitoring/cost-tracker.ts
interface APIUsage {
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export async function trackAPICall(usage: APIUsage) {
  // Log to database
  await db.insert('api_usage', usage);

  // Daily cost alert
  const dailyCost = await getDailyCost();
  if (dailyCost > 50) {
    await sendAlert('Daily API cost exceeds $50');
  }
}

// Claude Sonnet 4.5 pricing (as of Oct 2025):
// Input: $3.00 / 1M tokens
// Output: $15.00 / 1M tokens
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3.00;
  const outputCost = (outputTokens / 1_000_000) * 15.00;
  return inputCost + outputCost;
}
```

**Estimated Time:** 4 hours
**Impact:** Budget control, cost optimization

---

## Testing Checklist

### Manual Testing (2-3 hours)

- [ ] **First-Time User Flow**
  - [ ] Open app in incognito mode
  - [ ] Click Settings
  - [ ] Enter Anthropic API key (use test key)
  - [ ] Click Save
  - [ ] Verify success message
  - [ ] Close and reopen Settings
  - [ ] Verify key is still saved

- [ ] **Image Description Flow**
  - [ ] Search for image (e.g., "sunset")
  - [ ] Select image from results
  - [ ] Choose style: Narrativo
  - [ ] Click Generate
  - [ ] Verify English description appears
  - [ ] Verify Spanish description appears
  - [ ] Test all 5 styles:
    - [ ] Narrativo
    - [ ] Poetico
    - [ ] Academico
    - [ ] Conversacional
    - [ ] Infantil

- [ ] **Q&A Generation Flow**
  - [ ] Copy description text
  - [ ] Navigate to Q&A tab
  - [ ] Paste description
  - [ ] Select count: 5
  - [ ] Click Generate
  - [ ] Verify 5 questions appear
  - [ ] Verify answers are relevant

- [ ] **Translation Flow**
  - [ ] Enter text: "Hello, how are you?"
  - [ ] Translate to Spanish
  - [ ] Verify: "Hola, ¿cómo estás?"
  - [ ] Test reverse: ES -> EN
  - [ ] Test other languages:
    - [ ] French
    - [ ] German
    - [ ] Italian
    - [ ] Portuguese

- [ ] **Error Scenarios**
  - [ ] Enter invalid API key
  - [ ] Verify error message
  - [ ] Clear API key
  - [ ] Try to generate description
  - [ ] Verify graceful fallback
  - [ ] Test with network offline
  - [ ] Verify offline message

- [ ] **Browser Compatibility**
  - [ ] Chrome 90+
  - [ ] Firefox 88+
  - [ ] Edge 90+
  - [ ] Safari 14+ (macOS only)

- [ ] **Responsive Design**
  - [ ] Desktop (1920x1080)
  - [ ] Laptop (1366x768)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667)

- [ ] **Accessibility**
  - [ ] Keyboard navigation (Tab/Shift+Tab)
  - [ ] Screen reader test (NVDA/JAWS)
  - [ ] Color contrast (axe DevTools)
  - [ ] Focus indicators visible

---

## Automated Testing (Run Before Deploy)

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:perf

# Lighthouse audit
npm run test:vitals

# Type checking
npm run typecheck

# Linting
npm run lint

# Security audit
npm audit
```

---

## Post-Launch Monitoring (First 24 Hours)

### Hour 0-1: Initial Launch
- [ ] Deploy to production
- [ ] Verify health endpoint: `/api/health`
- [ ] Test one full user flow manually
- [ ] Monitor Sentry for errors

### Hour 1-6: Active Monitoring
- [ ] Check Sentry every hour
- [ ] Monitor API response times
- [ ] Track error rate (<1% expected)
- [ ] Review user feedback

### Hour 6-24: Stability Check
- [ ] Sentry check every 3 hours
- [ ] Review performance metrics
- [ ] Check API cost dashboard
- [ ] Gather user testimonials

### Day 1-7: Optimization Phase
- [ ] Analyze slow queries
- [ ] Optimize common user flows
- [ ] Address top 3 user complaints
- [ ] A/B test improvements

---

## Success Metrics

### Technical KPIs
- Error rate: <0.5%
- P95 response time: <15s (descriptions)
- API uptime: >99.9%
- User satisfaction: >4.5/5

### Business KPIs
- Daily active users: Track trend
- API key activation rate: >70%
- Feature usage:
  - Image descriptions: Primary
  - Q&A generation: Secondary
  - Translation: Tertiary
- API cost per user: <$0.10/day

---

## Issue Escalation

### Severity Levels

**P0 - Critical (Fix Immediately)**
- API completely down
- Security breach
- Data loss
- Complete feature failure

**P1 - High (Fix Within 24h)**
- Degraded performance
- High error rate (>5%)
- Major feature broken
- User data at risk

**P2 - Medium (Fix Within Week)**
- Minor feature issues
- Accessibility problems
- UI/UX annoyances
- Non-critical bugs

**P3 - Low (Backlog)**
- Nice-to-have features
- Code cleanup
- Documentation
- Performance optimizations

---

## Contact & Support

**UAT Lead:** QA Specialist (Tester Agent)
**Development Team:** Claude Flow Swarm
**Monitoring:** Sentry (describe-it-dev)
**Analytics:** Google Analytics (if configured)

**Report Issues:**
- GitHub Issues: Create with `[UAT]` prefix
- Sentry: Auto-captured errors
- Slack: #describe-it-alerts (if configured)

---

**Document Version:** 1.0
**Last Updated:** October 6, 2025
**Next Review:** October 13, 2025 (1 week post-launch)
