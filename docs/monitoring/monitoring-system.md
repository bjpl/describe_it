# API Monitoring and Logging System

## Overview

A comprehensive monitoring and logging system has been implemented for the Describe-It API, providing structured logging, performance metrics, error tracking, and real-time monitoring capabilities.

## Features Implemented

### 1. Structured Logging System (`src/lib/monitoring/logger.ts`)

- **Request/Response Logging**: Complete request lifecycle tracking with unique request IDs
- **Performance Metrics**: Response time, memory usage, and resource utilization tracking  
- **Error Categorization**: Automatic error classification by category and severity
- **Security Event Logging**: Specialized logging for security-related events
- **Memory Optimization**: In-memory log storage with automatic cleanup

**Key Features:**
- Request tracing with unique IDs
- Context-aware logging with user information
- Memory and CPU usage tracking
- Integration points for external services (Sentry, webhooks, etc.)

### 2. Performance Metrics Collection (`src/lib/monitoring/metrics.ts`)

- **API Metrics**: Request tracking, response times, and status codes
- **Resource Metrics**: Memory usage, CPU utilization, and system resources
- **Error Metrics**: Error counts, categories, and trends
- **Endpoint Analytics**: Per-endpoint performance statistics

**Capabilities:**
- Real-time metric collection
- Historical trend analysis
- Performance percentiles (P95, P99)
- Resource utilization monitoring
- System health assessment

### 3. Request/Response Middleware (`src/lib/monitoring/middleware.ts`)

- **Automatic Instrumentation**: Wraps API handlers with monitoring
- **Rate Limiting**: Configurable request rate limiting with monitoring
- **Error Handling**: Standardized error responses with tracking
- **Header Sanitization**: Security-aware header filtering
- **Performance Thresholds**: Configurable alerting on slow responses

**Configuration Options:**
- Request/response body logging
- Performance thresholds
- Header filtering
- Error tracking enablement

### 4. Error Tracking System (`src/lib/monitoring/errorTracking.ts`)

- **Comprehensive Error Reports**: Detailed error context and stack traces
- **Error Fingerprinting**: Grouping similar errors for analysis
- **Integration Points**: Webhook, Sentry, and custom integrations
- **Error Analytics**: Trends, categories, and affected users
- **Resolution Tracking**: Mark errors as resolved with notes

**Features:**
- Error categorization and severity assessment
- Memory leak detection
- Integration with external error tracking services
- Error analytics and reporting

### 5. Health Check Endpoints

#### Main Health Check (`/api/monitoring/health`)
- **Service Status**: Individual service health checks (API, database, OpenAI, etc.)
- **Performance Metrics**: Response times, error rates, and throughput
- **System Resources**: Memory, CPU, and disk usage
- **Alerts and Recommendations**: System-generated alerts and optimization suggestions

#### Metrics Dashboard (`/api/monitoring/metrics`)  
- **Usage Analytics**: Request patterns, user distribution, and endpoint popularity
- **Performance Distribution**: Response time percentiles and trending
- **Error Analysis**: Error rates, categories, and top errors
- **Time-based Filtering**: Configurable time ranges for analysis

#### Resource Monitoring (`/api/monitoring/resource-usage`)
- **Real-time Resources**: Current memory, CPU, and system utilization
- **Historical Trends**: Resource usage over time
- **Memory Leak Detection**: Automatic detection of potential memory leaks
- **Performance Recommendations**: System-generated optimization suggestions

#### Dashboard API (`/api/monitoring/dashboard`)
- **Comprehensive Overview**: Complete system status and metrics
- **Real-time Data**: Live system metrics and performance indicators
- **Trend Analysis**: Historical performance and error trends
- **Configuration Management**: Monitoring system configuration and thresholds

### 6. Hooks and Configuration System (`src/lib/monitoring/hooks.ts`)

- **Centralized Configuration**: Single configuration point for all monitoring
- **Session Management**: Request session tracking and restoration
- **Event Hooks**: Pre/post task hooks for workflow integration
- **Memory Coordination**: Shared memory for cross-request data
- **Notification System**: Alert and notification management

## API Endpoints

### Health and Status
- `GET /api/monitoring/health` - Comprehensive health check
- `GET /api/monitoring/dashboard` - Complete monitoring dashboard
- `GET /api/monitoring/metrics` - Detailed metrics and analytics
- `GET /api/monitoring/resource-usage` - Resource utilization monitoring

### Integration Features

#### Request Tracing
Every API request receives a unique request ID that can be tracked across logs, metrics, and error reports.

#### Performance Monitoring
- Response time tracking
- Memory usage monitoring
- Request rate monitoring
- Error rate calculation

#### Error Tracking
- Automatic error categorization
- Stack trace collection
- Error fingerprinting for grouping
- Integration with external services

#### Security Monitoring
- Failed authentication tracking
- Suspicious activity detection
- Rate limiting violations
- Security event logging

## Configuration

### Environment Variables
```bash
# Logging Configuration
LOG_LEVEL=info
EXTERNAL_LOGGING_ENABLED=true
LOGGING_WEBHOOK_URL=https://your-webhook-url

# Performance Thresholds
PERF_THRESHOLD_RESPONSE_TIME=1000
PERF_THRESHOLD_MEMORY=85
PERF_THRESHOLD_ERROR_RATE=5.0

# Alert Thresholds  
ALERT_CRITICAL_ERROR_COUNT=10
ALERT_HIGH_MEMORY=90
ALERT_SLOW_RESPONSE=5000

# External Integrations
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
ERROR_WEBHOOK_URL=https://your-error-webhook
```

### Monitoring Configuration
```typescript
import { monitoring } from '@/lib/monitoring';

// Update monitoring configuration
monitoring.updateConfig({
  performanceThresholds: {
    responseTime: 2000,
    memoryUsage: 80,
    errorRate: 3.0
  },
  integrations: {
    webhook: 'https://your-webhook-url',
    sentry: true
  }
});
```

## Usage Examples

### Basic Monitoring Integration
```typescript
import { withMonitoring } from '@/lib/monitoring';

export const POST = withMonitoring(
  async (request) => {
    // Your API handler
    return NextResponse.json({ success: true });
  },
  {
    enableRequestLogging: true,
    enablePerformanceTracking: true,
    performanceThreshold: 1000
  }
);
```

### Custom Event Logging
```typescript
import { monitoring } from '@/lib/monitoring';

// Log custom events
monitoring.logEvent(context, 'user_action', { action: 'export_data' });

// Track errors
await monitoring.trackError(error, {
  requestId,
  endpoint: '/api/custom',
  userId: 'user-123'
});
```

### Health Checks
```typescript
import { healthChecks } from '@/lib/monitoring';

// Check system health
const health = await healthChecks.checkAPIHealth();
console.log('System status:', health.status);

// Check dependencies
const deps = await healthChecks.checkDependencies();
console.log('OpenAI available:', deps.openai);
```

## Integration with Existing Routes

The main API route `/api/descriptions/generate` has been updated to include:
- Request/response logging with structured context
- Performance metrics collection
- Error tracking with detailed context
- Integration with monitoring middleware

## Monitoring Dashboard Features

The dashboard provides:
- **Real-time Metrics**: Active requests, memory usage, error rates
- **Performance Analytics**: Response time distributions, endpoint performance
- **Error Analysis**: Recent errors, error categories, critical alerts
- **System Health**: Dependencies status, alerts, recommendations
- **Resource Utilization**: Memory trends, CPU usage, system resources

## Hooks Integration

Uses SPARC methodology hooks for coordination:
- Pre-task preparation and logging
- Post-task completion and metrics
- Session management and memory coordination
- Configuration sharing across components

This monitoring system provides comprehensive observability for the API, enabling proactive performance management, quick error resolution, and detailed usage analytics.