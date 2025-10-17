# Comprehensive Monitoring & Observability System

This document describes the complete monitoring and observability setup for the describe_it project, featuring Prometheus metrics, Redis-based rate limiting, anomaly detection, and real-time analytics dashboards.

## Architecture Overview

### Core Components

1. **Prometheus Monitoring** - Metrics collection and storage
2. **Redis Rate Limiter** - Distributed rate limiting with sliding windows
3. **Anomaly Detector** - Statistical fraud detection and suspicious activity monitoring
4. **Usage Analytics Dashboard** - Real-time dashboard with WebSocket updates
5. **Grafana Dashboards** - Visual monitoring and alerting
6. **Docker Compose Stack** - Complete containerized monitoring infrastructure

## Features

### 📊 Prometheus Metrics

- **API Performance**: Request rates, response times, error rates
- **OpenAI Usage**: Token consumption, costs, model performance
- **Rate Limiting**: Rate limit hits and remaining quotas
- **Cache Performance**: Hit rates, miss rates, operation times
- **Business Metrics**: User registrations, subscriptions, revenue
- **Security Metrics**: Authentication attempts, suspicious activity, blocked requests

### 🚦 Rate Limiting

- **Sliding Window Algorithm**: Precise rate limiting using Redis sorted sets
- **Multi-Tier Limiting**: Per-minute, per-hour, and per-day limits
- **Distributed Support**: Works across multiple application instances
- **API Key Based**: Individual limits per API key
- **Automatic Blocking**: Temporary blocks for rate limit violations

### 🔍 Anomaly Detection

- **Statistical Analysis**: Z-score based anomaly detection
- **Pattern Recognition**: Detects unusual usage patterns
- **Fraud Detection**: Advanced fraud detection with machine learning-like heuristics
- **Behavior Profiling**: Builds user behavior profiles over time
- **Real-time Alerts**: Immediate notifications for suspicious activities

### 📈 Analytics Dashboard

- **Real-time Updates**: WebSocket-powered live data streaming
- **Interactive Charts**: Chart.js powered visualizations
- **Export Functionality**: CSV and JSON export capabilities
- **Alert Management**: View and manage anomaly alerts
- **API Key Analytics**: Per-key performance analysis

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start with Docker Compose

```bash
# Start the full monitoring stack
docker-compose up -d

# View logs
docker-compose logs -f describe-it

# Stop the stack
docker-compose down
```

### 3. Access the Services

- **Application**: http://localhost:3000
- **Analytics Dashboard**: http://localhost:3000/analytics (when implemented in routing)
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/admin123)
- **Redis**: localhost:6379

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Monitoring
PROMETHEUS_ENABLED=true
WS_PORT=3001

# Node Environment
NODE_ENV=production
```

### Redis Rate Limiting

```typescript
import { RedisRateLimiter } from '@/lib/rate-limiting/redis-limiter';

const limiter = new RedisRateLimiter();

// Check rate limit
const result = await limiter.checkRateLimit('api_key_123', {
  windowSizeMs: 60 * 1000, // 1 minute
  maxRequests: 60,
});

if (!result.allowed) {
  // Handle rate limit exceeded
}
```

### Prometheus Metrics

```typescript
import { recordApiRequest, recordOpenAIRequest } from '@/lib/monitoring/prometheus';

// Record API request
recordApiRequest('POST', '/api/descriptions/generate', 200, 1.5, 'api_key_hash');

// Record OpenAI usage
recordOpenAIRequest('gpt-4', 'chat/completions', 2.3, 150, 50, 0.01, 'api_key_hash');
```

### Anomaly Detection

```typescript
import AnomalyDetector from '@/lib/monitoring/anomaly-detector';

const detector = new AnomalyDetector();

// Analyze request for anomalies
const events = await detector.analyzeRequest('api_key_123', {
  endpoint: '/api/descriptions/generate',
  method: 'POST',
  responseTime: 1500,
  statusCode: 200,
  tokensUsed: 150,
});

if (events.length > 0) {
  // Handle detected anomalies
}
```

### Fraud Detection

```typescript
import FraudDetector from '@/lib/monitoring/fraud-detector';

const fraudDetector = new FraudDetector();

// Analyze for fraud patterns
const fraudEvents = await fraudDetector.analyzeRequest('api_key_123', {
  endpoint: '/api/descriptions/generate',
  method: 'POST',
  responseTime: 1500,
  statusCode: 200,
  tokensUsed: 150,
  ipHash: 'hashed_ip',
});
```

## API Endpoints

### Metrics Endpoint

```
GET /api/metrics
```
Prometheus metrics scraping endpoint.

### Analytics Dashboard API

```
GET /api/analytics/dashboard?timeRange=24h
```
Returns aggregated analytics data for the dashboard.

### Analytics Export

```
GET /api/analytics/export?format=json&timeRange=7d
GET /api/analytics/export?format=csv&timeRange=30d
```
Exports analytics data in JSON or CSV format.

### WebSocket Analytics

```
WebSocket: ws://localhost:3001/api/analytics/ws
```
Real-time analytics updates via WebSocket.

#### WebSocket Message Types

```typescript
// Subscribe to specific data types
{
  "type": "subscribe",
  "subscriptions": ["metrics", "alerts", "fraud", "api_keys"]
}

// Received data updates
{
  "type": "metrics_update",
  "payload": { /* metrics data */ },
  "timestamp": 1234567890
}

{
  "type": "alert",
  "payload": { /* alert data */ },
  "timestamp": 1234567890
}
```

## Grafana Dashboards

### Pre-configured Dashboards

1. **API Overview** (`monitoring/dashboards/describe-it-overview.json`)
   - Request rates and error rates
   - Response time percentiles
   - OpenAI cost and token usage
   - Cache performance
   - Active sessions

2. **Detailed Analytics** (`monitoring/dashboards/describe-it-detailed.json`)
   - Per-API-key performance analysis
   - Rate limiting status
   - Cost analysis
   - Error message logs
   - Response time heatmaps

### Importing Dashboards

1. Access Grafana at http://localhost:3002
2. Login with admin/admin123
3. Go to "+" → "Import"
4. Upload the JSON files from `monitoring/dashboards/`

## Alerting

### Prometheus Alert Rules

- **High Error Rate**: >5% error rate for 2 minutes
- **High Response Time**: 95th percentile >2s for 3 minutes
- **OpenAI API Errors**: Any OpenAI API errors
- **High Rate Limit Hits**: >10 hits/second for 2 minutes
- **Suspicious Activity**: High severity anomalies detected
- **Low Cache Hit Rate**: <70% cache hit rate for 5 minutes

### Alert Configuration

Alerts are configured in `monitoring/configs/alert_rules.yml` and can be customized based on your requirements.

## Development

### Adding New Metrics

1. Add metric definition in `src/lib/monitoring/prometheus.ts`
2. Record metric values in your application code
3. Update Grafana dashboards to visualize new metrics

### Adding New Anomaly Patterns

1. Add pattern definition in `src/lib/monitoring/anomaly-detector.ts`
2. Implement detection logic
3. Test with sample data

### Adding New Fraud Rules

1. Add rule definition in `src/lib/monitoring/fraud-detector.ts`
2. Implement detection algorithm
3. Configure actions (log, alert, block, throttle)

## Monitoring Best Practices

### Performance Considerations

- **Metric Cardinality**: Limit label values to prevent high cardinality
- **Sampling**: Use sampling for high-volume metrics
- **Retention**: Configure appropriate retention policies
- **Aggregation**: Use recording rules for expensive queries

### Security

- **API Key Hashing**: Always hash API keys in metrics
- **IP Address Anonymization**: Hash IP addresses for privacy
- **Access Control**: Secure monitoring endpoints
- **Audit Logging**: Log all administrative actions

### Scaling

- **Horizontal Scaling**: Use multiple Redis instances for high load
- **Metric Federation**: Use Prometheus federation for multi-region setups
- **Long-term Storage**: Configure remote write for long-term storage
- **Alert Routing**: Use Alertmanager routing for different teams

## Troubleshooting

### Common Issues

1. **Redis Connection Issues**
   - Check Redis server status
   - Verify connection credentials
   - Check network connectivity

2. **Prometheus Scraping Failures**
   - Verify metrics endpoint accessibility
   - Check Prometheus configuration
   - Review application logs

3. **Dashboard Not Updating**
   - Check WebSocket connection
   - Verify browser console for errors
   - Restart WebSocket server

4. **High Memory Usage**
   - Review metric cardinality
   - Implement metric sampling
   - Configure retention policies

### Debug Commands

```bash
# Check Redis connectivity
redis-cli -h localhost -p 6379 ping

# View Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test metrics endpoint
curl http://localhost:3000/api/metrics

# Check WebSocket connection
wscat -c ws://localhost:3001/api/analytics/ws
```

## File Structure

```
src/
├── lib/
│   ├── monitoring/
│   │   ├── prometheus.ts          # Prometheus metrics collection
│   │   ├── anomaly-detector.ts    # Statistical anomaly detection
│   │   └── fraud-detector.ts      # Advanced fraud detection
│   └── rate-limiting/
│       └── redis-limiter.ts       # Redis-based rate limiting
├── components/
│   └── analytics/
│       ├── UsageDashboard.tsx     # Main analytics dashboard
│       └── index.ts               # Component exports
└── app/
    └── api/
        ├── metrics/
        │   └── route.ts           # Prometheus metrics endpoint
        └── analytics/
            ├── dashboard/route.ts  # Dashboard API
            ├── export/route.ts     # Export API
            └── ws/route.ts         # WebSocket endpoint

monitoring/
├── configs/
│   ├── prometheus.yml             # Prometheus configuration
│   ├── alert_rules.yml           # Alert rules
│   ├── alertmanager.yml          # Alertmanager configuration
│   └── grafana-datasources.yml   # Grafana data sources
└── dashboards/
    ├── describe-it-overview.json  # Overview dashboard
    └── describe-it-detailed.json  # Detailed dashboard

docker-compose.yml                 # Complete monitoring stack
```

## Contributing

When adding new monitoring features:

1. Update relevant TypeScript interfaces
2. Add comprehensive tests
3. Update documentation
4. Add appropriate metrics and alerts
5. Test with sample data

## Support

For issues or questions regarding the monitoring system:

1. Check the troubleshooting section
2. Review application and service logs
3. Consult Prometheus and Grafana documentation
4. Create an issue with detailed information

---

This comprehensive monitoring system provides enterprise-grade observability for the describe_it project, enabling proactive monitoring, fraud detection, and performance optimization.