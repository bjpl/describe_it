# Performance Optimization Guide

## Overview

This guide documents all performance optimizations implemented in the describe-it project and provides guidance for maintaining optimal performance.

## Table of Contents

1. [Database Query Optimization](#database-query-optimization)
2. [React Performance](#react-performance)
3. [Bundle Size Optimization](#bundle-size-optimization)
4. [API Performance](#api-performance)
5. [Performance Budgets](#performance-budgets)
6. [Monitoring & Measurement](#monitoring--measurement)

---

## Database Query Optimization

### Query Optimizer Usage

The `queryOptimizer` provides automatic caching, metrics tracking, and optimization recommendations for Supabase queries.

```typescript
import { optimizedQuery } from '@/lib/performance/query-optimizer';

// Optimized query with selective column fetching
const users = await optimizedQuery<User>(
  supabase,
  'users',
  {
    columns: ['id', 'name', 'email'], // Only fetch needed columns
    filters: { active: true },
    orderBy: { column: 'created_at', ascending: false },
    limit: 20,
    useCache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  }
);
```

### Best Practices

1. **Select Only Required Columns**
   ```typescript
   // ❌ Bad: Fetches all columns
   const { data } = await supabase.from('images').select('*');

   // ✅ Good: Fetches only needed columns
   const { data } = await supabase
     .from('images')
     .select('id,url,alt_description');
   ```

2. **Use Batch Operations**
   ```typescript
   import { batchInsert } from '@/lib/performance/query-optimizer';

   // Insert 1000 records in batches of 100
   await batchInsert(supabase, 'phrases', phrases, 100);
   ```

3. **Prefetch Critical Data**
   ```typescript
   import { prefetchQuery } from '@/lib/performance/query-optimizer';

   // Prefetch on route transition
   useEffect(() => {
     prefetchQuery('user-profile', () =>
       supabase.from('users').select('*').single()
     );
   }, []);
   ```

### Index Recommendations

The query optimizer analyzes query patterns and suggests indexes:

```typescript
const recommendations = queryOptimizer.analyzeQueryPatterns();

recommendations.forEach(rec => {
  console.log(`
    Table: ${rec.table}
    Column: ${rec.column}
    Reason: ${rec.reason}
    Expected Improvement: ${rec.estimatedImprovement}
  `);
});
```

### Performance Metrics

```typescript
const stats = queryOptimizer.getPerformanceStats();

console.log(`
  Total Queries: ${stats.queries.total}
  Average Time: ${stats.queries.averageTime.toFixed(2)}ms
  P95 Time: ${stats.queries.p95Time.toFixed(2)}ms
  Cache Hit Rate: ${stats.queries.cacheHitRate.toFixed(1)}%
  Slow Queries: ${stats.queries.slowQueries}
`);
```

---

## React Performance

### Component Profiling

Use the `useComponentProfiler` hook to track component performance:

```typescript
import { useComponentProfiler } from '@/lib/performance/react-profiler';

function ExpensiveComponent() {
  // Set performance budget
  const { renderCount } = useComponentProfiler('ExpensiveComponent', {
    maxRenderTime: 16, // 60fps target
    maxReRenders: 100, // per minute
  });

  return <div>Rendered {renderCount} times</div>;
}
```

### Memoization

#### 1. React.memo for Components

```typescript
import { memo } from 'react';

// ❌ Bad: Re-renders on every parent render
function ImageCard({ image, onSelect }) {
  return <div onClick={() => onSelect(image.id)}>{image.title}</div>;
}

// ✅ Good: Only re-renders when props change
export const ImageCard = memo(function ImageCard({ image, onSelect }) {
  return <div onClick={() => onSelect(image.id)}>{image.title}</div>;
});
```

#### 2. useMemo for Expensive Computations

```typescript
import { useMemo } from 'react';

function SearchResults({ items, query }) {
  // ❌ Bad: Filters on every render
  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  // ✅ Good: Only recomputes when items or query change
  const filtered = useMemo(
    () => items.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    ),
    [items, query]
  );

  return <div>{filtered.map(item => <div key={item.id}>{item.title}</div>)}</div>;
}
```

#### 3. useCallback for Function Props

```typescript
import { useCallback } from 'react';

function ParentComponent() {
  // ❌ Bad: Creates new function on every render
  const handleClick = (id) => console.log(id);

  // ✅ Good: Stable function reference
  const handleClick = useCallback((id) => {
    console.log(id);
  }, []);

  return <ChildComponent onClick={handleClick} />;
}
```

### Re-render Debugging

```typescript
import { useWhyDidYouUpdate } from '@/lib/performance/react-profiler';

function MyComponent(props) {
  // Logs which props changed between renders
  useWhyDidYouUpdate('MyComponent', props);

  return <div>...</div>;
}
```

### Deferred Updates

For non-urgent UI updates, use deferred values:

```typescript
import { useDeferredValue } from '@/lib/hooks/useDeferredValue';

function SearchInput() {
  const [query, setQuery] = useState('');

  // Defer filtering while user is typing
  const deferredQuery = useDeferredValue(query, {
    timeout: 300,
    priority: 'low',
  });

  const results = useSearchResults(deferredQuery);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <Results items={results} />
    </>
  );
}
```

---

## Bundle Size Optimization

### Code Splitting

#### 1. Route-Based Splitting

```typescript
import React from 'react';

// ❌ Bad: All pages loaded in initial bundle
import AdminPage from './pages/AdminPage';
import ProgressPage from './pages/ProgressPage';

// ✅ Good: Pages loaded on demand
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Routes>
    </Suspense>
  );
}
```

#### 2. Feature-Based Splitting

```typescript
// ❌ Bad: Heavy PDF library in initial bundle
import { generatePDF } from './utils/pdfExport';

// ✅ Good: Load PDF library only when needed
const handleExportPDF = async () => {
  const { generatePDF } = await import('./utils/pdfExport');
  await generatePDF(data);
};
```

#### 3. Component-Level Splitting

```typescript
import { createLazyComponent } from '@/lib/performance/bundle-analyzer';

// Create lazy component with custom fallback
const LazyChartComponent = createLazyComponent(
  () => import('./components/Charts'),
  <div>Loading chart...</div>
);

// Use in your app
function Dashboard() {
  return (
    <div>
      <LazyChartComponent data={chartData} />
    </div>
  );
}
```

### Tree Shaking

```typescript
// ❌ Bad: Imports entire library
import * as Icons from 'lucide-react';
const MyIcon = Icons.Search;

// ✅ Good: Only imports what's needed
import { Search, Settings, Download } from 'lucide-react';
```

### Bundle Analysis

```typescript
import { bundleAnalyzer } from '@/lib/performance/bundle-analyzer';

// Analyze bundle and get recommendations
const analysis = bundleAnalyzer.analyzeBu ndle();

console.log(bundleAnalyzer.getReport());
// Outputs:
// === BUNDLE SIZE ANALYSIS REPORT ===
// Total Bundle Size: 700 KB
// Status: ✅ OK
//
// --- Optimization Suggestions ---
// 1. [HIGH] dynamic-import
//    Heavy dependency 'chart.js' in initial bundle
//    Potential Savings: 100 KB
//    Recommendation: Code split chart components
```

---

## API Performance

### Response Caching

```typescript
// API route with caching headers
export async function GET(request: Request) {
  const data = await fetchData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'ETag': generateETag(data),
    },
  });
}
```

### Request Deduplication

The `useOptimizedQuery` hook automatically deduplicates identical requests:

```typescript
import { useOptimizedQuery } from '@/lib/hooks/useOptimizedQuery';

// Multiple components can call this hook simultaneously
// Only one network request will be made
function Component1() {
  const { data } = useOptimizedQuery(
    'user-data',
    () => fetch('/api/user').then(r => r.json())
  );
}

function Component2() {
  const { data } = useOptimizedQuery(
    'user-data', // Same key = deduped
    () => fetch('/api/user').then(r => r.json())
  );
}
```

### Compression

```typescript
// Enable compression in Next.js
// next.config.js
module.exports = {
  compress: true, // Enables gzip compression
};
```

---

## Performance Budgets

### Set Budgets

```typescript
import { reactProfiler, bundleAnalyzer } from '@/lib/performance';

// React component budgets
reactProfiler.setBudget('ExpensiveComponent', {
  maxRenderTime: 16, // Must render within 16ms (60fps)
  maxReRenders: 100, // Max 100 re-renders per minute
  warnThreshold: 0.8, // Warn at 80% of budget
});

// Bundle size budgets
bundleAnalyzer.setBudget({
  maxInitialBundle: 200 * 1024, // 200 KB initial bundle
  maxAsyncChunk: 100 * 1024, // 100 KB per async chunk
  maxTotalSize: 1024 * 1024, // 1 MB total
});
```

### Performance Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| Initial Bundle Size | < 150 KB | 200 KB |
| Async Chunk Size | < 75 KB | 100 KB |
| Total Bundle Size | < 800 KB | 1 MB |
| API Response Time (P50) | < 100ms | 200ms |
| API Response Time (P95) | < 200ms | 500ms |
| Component Render Time | < 10ms | 16ms |
| Database Query Time (P95) | < 100ms | 200ms |
| Cache Hit Rate | > 80% | > 60% |

---

## Monitoring & Measurement

### Performance Dashboard

Add the performance dashboard to your app (development only):

```typescript
import { PerformanceDashboard } from '@/lib/performance/performance-dashboard';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <PerformanceDashboard />}
      </body>
    </html>
  );
}
```

### Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/lib/performance';

// Get comprehensive metrics
const metrics = PerformanceMonitor.getMetrics();

// Log summary to console
PerformanceMonitor.logSummary();

// Export metrics for analysis
const json = PerformanceMonitor.exportMetrics();
```

### Automated Performance Testing

```typescript
// tests/performance/query-performance.test.ts
import { queryOptimizer } from '@/lib/performance/query-optimizer';

describe('Query Performance', () => {
  it('should complete queries within budget', async () => {
    const result = await queryOptimizer.executeQuery(
      'test-query',
      async () => {
        const { data } = await supabase.from('users').select('*').limit(100);
        return data;
      }
    );

    const stats = queryOptimizer.getPerformanceStats();
    expect(stats.queries.averageTime).toBeLessThan(100); // < 100ms
  });

  it('should maintain high cache hit rate', async () => {
    // ... execute queries ...

    const stats = queryOptimizer.getPerformanceStats();
    expect(stats.queries.cacheHitRate).toBeGreaterThan(70); // > 70%
  });
});
```

---

## Expected Performance Gains

Based on implemented optimizations:

### Database Queries
- **40-60% reduction** in query response time through selective column fetching
- **70-90% reduction** in repeated query time through caching
- **50-70% reduction** in database load through batch operations

### React Performance
- **30-50% reduction** in unnecessary re-renders through memoization
- **60-80% improvement** in initial render time through code splitting
- **40-60% improvement** in interaction responsiveness through deferred updates

### Bundle Size
- **25-40% reduction** in initial bundle size through code splitting
- **30-50% reduction** in unused code through tree-shaking
- **50-70% faster** page loads through lazy loading

### API Performance
- **60-80% reduction** in response time through caching
- **70-90% reduction** in duplicate requests through deduplication
- **30-40% reduction** in bandwidth usage through compression

### Overall
- **P95 API response time**: Expected < 100ms (target < 200ms)
- **Component render time**: Expected < 10ms (target < 16ms)
- **Initial page load**: Expected 2-3x faster
- **Cache hit rate**: Expected > 80%

---

## Maintenance Checklist

### Weekly
- [ ] Review performance dashboard metrics
- [ ] Check for new slow queries
- [ ] Verify cache hit rates > 70%
- [ ] Review component re-render patterns

### Monthly
- [ ] Analyze bundle size trends
- [ ] Review and update performance budgets
- [ ] Run full performance test suite
- [ ] Update optimization recommendations

### Quarterly
- [ ] Comprehensive performance audit
- [ ] Review and optimize critical user paths
- [ ] Update performance targets
- [ ] Document performance improvements

---

## Tools & Resources

### Development Tools
- Performance Dashboard (development only)
- React DevTools Profiler
- Chrome DevTools Performance tab
- Webpack Bundle Analyzer

### Monitoring Tools
- Query Optimizer metrics
- React Profiler reports
- Bundle Analyzer reports
- Custom performance hooks

### References
- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Supabase Performance](https://supabase.com/docs/guides/platform/performance)
