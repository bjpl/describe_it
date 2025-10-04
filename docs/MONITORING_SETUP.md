# Monitoring and Analytics Setup Guide

This document provides a comprehensive guide for setting up and using the monitoring and analytics system for the Describe It application.

## Overview

The monitoring system includes:
- **Sentry Error Tracking**: Real-time error monitoring and performance tracking
- **Custom Analytics**: User behavior and feature usage tracking
- **Performance Monitoring**: Web vitals and API performance metrics
- **Alert System**: Automated alerts for errors and performance issues
- **Admin Dashboard**: Comprehensive monitoring dashboard

## Installation and Setup

### 1. Sentry Configuration

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for your application
3. Add environment variables to `.env.local`:

```bash
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### 2. Supabase Database Setup

Run the SQL script to create necessary tables:

```bash
# Execute the SQL file in your Supabase SQL editor
cat scripts/setup-supabase-tables.sql
```

This creates tables for:
- `analytics_events` - All analytics events
- `system_alerts` - System alerts and monitoring
- `performance_metrics` - Performance measurements
- `error_logs` - Detailed error tracking
- `user_sessions` - Session tracking
- `api_usage_logs` - API monitoring
- `feature_usage_stats` - Feature usage statistics

### 3. Environment Variables

Add these monitoring-specific variables to your `.env.local`:

```bash
# Analytics
ENABLE_ANALYTICS=true

# Alerts
ALERT_WEBHOOK_URL=your-webhook-url  # Optional
ALERT_EMAIL=admin@yourdomain.com    # Optional
```

## Features

### Error Tracking

#### Automatic Error Capture
- All JavaScript errors are automatically captured
- React error boundaries catch component errors
- API errors are tracked with context

#### Manual Error Reporting
```typescript
import { captureError } from '@/lib/monitoring/sentry';

try {
  // Your code here
} catch (error) {
  captureError(error, {
    context: 'user-action',
    userId: user.id,
    feature: 'image-search'
  });
}
```

#### Error Boundaries
Components are automatically wrapped with error boundaries:

```typescript
import { SentryErrorBoundary } from '@/lib/monitoring/error-boundary';

<SentryErrorBoundary level="component" showDetails={false}>
  <YourComponent />
</SentryErrorBoundary>
```

### Analytics Tracking

#### User Behavior Analytics
```typescript
import { useAnalytics, LearningAnalytics } from '@/lib/analytics';

// In a component
const { trackFeatureUsage, trackUserAction } = useAnalytics('ImageSearch');

// Track feature usage
trackFeatureUsage('image-search', 'search-performed', {
  searchTerm: 'beach',
  resultsCount: 10
});

// Track learning events
LearningAnalytics.vocabularyLearned('playa', 'beginner', 'img-123');
```

#### Performance Tracking
```typescript
import { performanceMonitor, usePerformanceTracking } from '@/lib/analytics';

// Automatic component performance tracking
const { trackRender } = usePerformanceTracking('MyComponent');

useEffect(() => {
  const finishTracking = trackRender();
  // Component rendering logic
  return finishTracking;
}, []);
```

### Alert System

#### Automatic Alerts
The system automatically monitors:
- High error rates (>5% in 10 minutes)
- Slow API responses (>2 seconds)
- High memory usage (>85%)
- Critical errors
- API limit approaching (>90%)

#### Custom Alerts
```typescript
import { alertManager, AlertHelpers } from '@/lib/monitoring/alerts';

// Check error rate manually
await AlertHelpers.checkErrorRate(errorPercentage);

// Report critical error
await AlertHelpers.reportCriticalError(error, 'payment-system');

// Custom alert
await alertManager.triggerAlert({
  type: 'custom_warning',
  severity: 'high',
  title: 'Custom Alert',
  message: 'Something important happened',
  metadata: { userId, action }
});
```

### Admin Dashboard

Access the admin dashboard at `/admin` to view:

#### Overview Tab
- Key metrics (users, sessions, errors)
- System health status
- Real-time statistics

#### Analytics Tab
- Feature usage charts
- User distribution by tier
- Session analytics

#### Errors Tab
- Error trends over time
- Top error messages
- Error severity breakdown

#### Performance Tab
- Web Vitals metrics (FCP, LCP, FID, CLS)
- API response times
- Slow queries

#### Users Tab
- User activity monitoring
- Learning progress
- Engagement metrics

## API Endpoints

### Analytics API
- `POST /api/analytics` - Submit analytics events
- `GET /api/admin/analytics` - Get aggregated analytics data

### Health Check
- `GET /api/health` - Application health status
- `GET /health` - Health check alias
- `GET /healthz` - Kubernetes-style health check

## Monitoring Best Practices

### 1. Error Handling
- Always provide context when capturing errors
- Use appropriate severity levels
- Include user and session information

```typescript
captureError(error, {
  userId: user?.id,
  userTier: user?.tier,
  component: 'ImageUpload',
  action: 'upload-processing',
  fileSize: file.size,
  fileType: file.type
});
```

### 2. Performance Tracking
- Track key user journeys
- Monitor API response times
- Set performance budgets

```typescript
// Track complete user flow
const sessionId = LearningAnalytics.startSession(userId, userTier);

// ... user learning session ...

LearningAnalytics.endSession(sessionId, duration, wordsLearned);
```

### 3. Analytics Events
- Use consistent event naming
- Include relevant metadata
- Track conversion funnels

```typescript
// Consistent event structure
trackEvent({
  eventName: 'feature_used',
  timestamp: Date.now(),
  properties: {
    featureName: 'vocabulary-quiz',
    action: 'quiz-started',
    difficulty: 'intermediate',
    questionCount: 10
  }
});
```

### 4. Alert Configuration
- Set appropriate thresholds
- Configure cooldown periods
- Use severity levels correctly

## Security and Privacy

### Data Protection
- Personal data is hashed or anonymized
- User consent is respected
- GDPR compliance considerations

### Access Control
- Admin dashboard requires authentication
- Analytics data has user-level access control
- Sensitive data is encrypted

## Performance Impact

### Client-side
- Analytics batching reduces network requests
- Lazy loading of monitoring components
- Minimal bundle size impact

### Server-side
- Efficient database queries with indexes
- Background processing for heavy operations
- Rate limiting for analytics endpoints

## Troubleshooting

### Common Issues

#### Sentry Not Working
1. Check DSN configuration
2. Verify environment variables
3. Check network connectivity
4. Review error filtering rules

#### Analytics Not Tracking
1. Verify `ENABLE_ANALYTICS=true`
2. Check Supabase connection
3. Review browser console for errors
4. Confirm event validation

#### Dashboard Not Loading
1. Check Supabase table creation
2. Verify admin permissions
3. Review API endpoint logs
4. Check for JavaScript errors

### Debug Mode
Enable debug logging in development:

```bash
NODE_ENV=development
```

This enables:
- Console logging of analytics events
- Detailed error information
- Performance monitoring dashboard

## Maintenance

### Regular Tasks
1. **Weekly**: Review error trends and fix critical issues
2. **Monthly**: Analyze performance metrics and optimize
3. **Quarterly**: Clean up old analytics data
4. **Annually**: Review alert thresholds and update

### Data Cleanup
```sql
-- Clean up old analytics data (older than 90 days)
SELECT cleanup_old_analytics(90);
```

### Monitoring the Monitoring System
- Set up alerts for the monitoring system itself
- Monitor Sentry quota usage
- Check Supabase storage limits
- Review API rate limits

## Support and Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Supabase Analytics Guide](https://supabase.com/docs/guides/analytics)
- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

For additional support, check the project issues or contact the development team.