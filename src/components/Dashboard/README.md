# Dashboard Integration

Complete dashboard system with real-time updates, data fetching, and responsive design.

## Features

- ✅ **Real-time Updates** - WebSocket integration for live data
- ✅ **Comprehensive Widgets** - Stats, Progress, Activity, Performance
- ✅ **Data Fetching** - React Query with caching and automatic refetching
- ✅ **Error Handling** - Graceful error states and retry logic
- ✅ **Loading States** - Skeleton loaders for better UX
- ✅ **Responsive Design** - Mobile-first, adaptive layouts
- ✅ **Time Range Filtering** - 24h, 7d, 30d, 90d views
- ✅ **Export Functionality** - Download dashboard data as JSON
- ✅ **TypeScript** - Full type safety

## Components

### IntegratedDashboard
Main dashboard component that orchestrates all widgets.

```tsx
import { IntegratedDashboard } from '@/components/dashboard';

function DashboardPage() {
  return (
    <IntegratedDashboard
      userId="user-123"
      enableRealtime={true}
    />
  );
}
```

### Individual Widgets

#### StatsWidget
Displays key performance indicators.

```tsx
import { StatsWidget } from '@/components/dashboard';

<StatsWidget stats={dashboardStats} loading={false} />
```

#### ProgressChartWidget
Shows progress analytics with charts.

```tsx
import { ProgressChartWidget } from '@/components/dashboard';

<ProgressChartWidget analytics={analyticsData} loading={false} />
```

#### ActivityWidget
Recent sessions and top vocabulary.

```tsx
import { ActivityWidget } from '@/components/dashboard';

<ActivityWidget activity={activityData} loading={false} />
```

#### PerformanceWidget
Web vitals and system metrics.

```tsx
import { PerformanceWidget } from '@/components/dashboard';

<PerformanceWidget metrics={performanceMetrics} loading={false} />
```

## Hooks

### useDashboardData
Centralized data fetching with React Query.

```tsx
import { useDashboardData } from '@/components/dashboard';

function MyDashboard() {
  const { data, isLoading, error, refresh, wsConnected } = useDashboardData({
    userId: 'user-123',
    timeRange: '7d',
    refreshInterval: 30000,
    enableRealtime: true,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Use data */}</div>;
}
```

## API Integration

The dashboard integrates with these endpoints:

- `GET /api/progress/stats` - User statistics
- `GET /api/progress/analytics` - Progress analytics
- `GET /api/monitoring/metrics` - Performance metrics
- `GET /api/sessions` - User activity
- `WS /api/analytics/ws` - Real-time updates

## Data Flow

```
┌─────────────────┐
│ IntegratedDash  │
└────────┬────────┘
         │
         ├─── useDashboardData Hook
         │    ├─── React Query (HTTP)
         │    └─── WebSocket (Real-time)
         │
         ├─── StatsWidget
         ├─── ProgressChartWidget
         ├─── ActivityWidget
         └─── PerformanceWidget
```

## Real-time Updates

WebSocket messages are processed automatically:

```typescript
// Server sends:
{
  type: 'stats_update',
  payload: { totalPoints: 1250, ... }
}

// Hook updates React Query cache automatically
```

## Configuration

### Time Ranges
- `24h` - Last 24 hours
- `7d` - Last 7 days (default)
- `30d` - Last 30 days
- `90d` - Last 90 days

### Refresh Intervals
- Default: 30 seconds
- Performance metrics: 60 seconds
- Customize via `refreshInterval` option

## Error Handling

```tsx
const { data, error } = useDashboardData();

if (error) {
  // Error object includes:
  // - type: 'fetch' | 'network' | 'validation'
  // - message: User-friendly message
  // - details: Technical details
}
```

## TypeScript Types

```typescript
interface DashboardStats {
  totalPoints: number;
  currentStreak: number;
  accuracy: number;
  // ... more fields
}

interface ProgressAnalytics {
  progressOverTime: Array<{ date: string; points: number; }>;
  skillBreakdown: Array<{ category: string; count: number; }>;
  // ... more fields
}
```

## Performance

- **Caching**: React Query caches all data
- **Stale Time**: 10 seconds for stats, 30 seconds for performance
- **Deduplication**: Multiple components share same query
- **Background Refetch**: Automatic updates when window regains focus

## Accessibility

- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus management

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- React 19
- Next.js 15
- @tanstack/react-query - Data fetching
- recharts - Charts
- lucide-react - Icons
- framer-motion - Animations (via DashboardLayout)

## Testing

```bash
# Unit tests
npm run test -- src/components/dashboard

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Troubleshooting

### WebSocket not connecting
- Check if `/api/analytics/ws` endpoint exists
- Verify WebSocket protocol (ws:// vs wss://)
- Check browser console for errors

### Data not loading
- Verify API endpoints are accessible
- Check network tab for failed requests
- Ensure React Query provider is configured

### Charts not rendering
- Verify recharts is installed
- Check data format matches expected schema
- Ensure ResponsiveContainer has valid dimensions

## Future Enhancements

- [ ] Custom widget builder
- [ ] Dashboard templates
- [ ] Advanced filtering
- [ ] PDF export
- [ ] Scheduled reports
- [ ] Mobile app integration
- [ ] AI-powered insights

## License

MIT
