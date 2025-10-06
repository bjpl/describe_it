# Claude API Performance Monitoring Guide

## Overview

This guide covers comprehensive performance monitoring for Claude Sonnet 4.5 API integrated with Sentry. The monitoring system tracks response times, token usage, costs, error rates, and provides real-time insights into API performance.

## Table of Contents

1. [Architecture](#architecture)
2. [Metrics Tracked](#metrics-tracked)
3. [Dashboard Setup](#dashboard-setup)
4. [Alert Configuration](#alert-configuration)
5. [Usage Guide](#usage-guide)
6. [Troubleshooting](#troubleshooting)
7. [Cost Optimization](#cost-optimization)

---

## Architecture

### Components

1. **Sentry Integration** (`sentry.server.config.ts`, `sentry.edge.config.ts`)
   - Enhanced with Claude-specific tracing
   - Custom tags for AI provider and model
   - Performance profiling enabled

2. **Claude Metrics Utility** (`src/lib/monitoring/claude-metrics.ts`)
   - Token usage tracking
   - Cost calculation ($3/1M input, $15/1M output tokens)
   - Performance markers
   - Error rate monitoring

3. **Instrumented API Routes**
   - `/api/descriptions/generate` - Image description generation
   - `/api/qa/generate` - Q&A generation
   - `/api/translate` - Translation service

4. **Claude Server Library** (`src/lib/api/claude-server.ts`)
   - All Claude API calls instrumented
   - Automatic metrics tracking
   - Error context capture

### Data Flow

```
API Request
    ↓
Sentry Transaction Start
    ↓
Claude Performance Tracker Initialized
    ↓
Claude API Call (with spans)
    ↓
Response + Usage Data
    ↓
Metrics Calculation (tokens, cost, time)
    ↓
Sentry Tracking (measurements, tags, context)
    ↓
Dashboard Update
```

---

## Metrics Tracked

### Performance Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| `claude.response_time` | Total API call duration (ms) | p95 < 2000ms |
| `claude.total_duration` | End-to-end processing time | p95 < 2500ms |
| `claude.streaming.chunks` | Number of chunks in streaming response | N/A |

### Token Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `claude.tokens.input` | Input tokens consumed | tokens |
| `claude.tokens.output` | Output tokens generated | tokens |
| `claude.tokens.total` | Total tokens used | tokens |

### Cost Metrics

| Metric | Description | Formula |
|--------|-------------|---------|
| `claude.cost.estimated` | Estimated API cost | (input × $0.003/1M) + (output × $0.015/1M) |

### Success Metrics

| Tag | Values | Description |
|-----|--------|-------------|
| `claude.success` | true/false | API call success status |
| `claude.error_type` | String | Error classification |
| `claude.endpoint` | String | API endpoint path |
| `claude.model` | String | Claude model used |

---

## Dashboard Setup

### Importing the Dashboard

1. Log in to Sentry
2. Navigate to **Dashboards** > **Create Dashboard**
3. Select **Import from JSON**
4. Upload `docs/monitoring/sentry-dashboard.json`
5. Customize time range and filters as needed

### Dashboard Widgets

#### 1. Response Time Overview
- **Type:** Line chart
- **Metrics:** p50, p95, p99 response times
- **Interval:** 5 minutes
- **Purpose:** Track response time percentiles

#### 2. Token Usage
- **Type:** Area chart
- **Metrics:** Input vs Output tokens
- **Interval:** 1 hour
- **Purpose:** Monitor token consumption patterns

#### 3. Cost Tracking
- **Type:** Line chart
- **Metrics:** Total cost, average cost per request
- **Interval:** 1 hour
- **Purpose:** Track API spending

#### 4. Endpoint Breakdown
- **Type:** Bar chart
- **Metrics:** Average response time by endpoint
- **Purpose:** Identify slow endpoints

#### 5. Error Rate
- **Type:** Line chart
- **Metrics:** Error percentage over time
- **Interval:** 15 minutes
- **Thresholds:** Warning at 1%, Critical at 5%

#### 6. Throughput
- **Type:** Area chart
- **Metrics:** Requests per minute
- **Interval:** 1 minute
- **Purpose:** Monitor API load

### Accessing the Dashboard

**Development:** http://sentry.io/organizations/[org]/dashboards/claude-api-performance/

**Production:** Same URL, filter by environment

---

## Alert Configuration

### Setting Up Alerts

All alert rules are documented in `docs/monitoring/alert-rules.md`. To configure:

1. Navigate to **Alerts** > **Alert Rules**
2. Create alerts based on rules in alert-rules.md
3. Configure notification channels (Slack, Email, PagerDuty)
4. Test alerts with sample data

### Critical Alerts

1. **High Response Time** - p95 > 2000ms for 5 minutes
2. **Error Rate Exceeded** - >1% error rate over 10 minutes
3. **API Authentication Failures** - >3 auth errors in 5 minutes
4. **Rate Limit Warnings** - 429 errors detected

### Warning Alerts

1. **Token Usage Spike** - >50% increase from baseline
2. **Cost Threshold** - Daily cost exceeds $50
3. **Performance Degradation** - p50 increases >30%
4. **Endpoint-Specific Slowness** - Per-endpoint thresholds exceeded

---

## Usage Guide

### Viewing Metrics in Sentry

#### 1. Real-time Performance

```
Navigate to: Dashboards > Claude API Performance
Widget: Response Time Overview
Action: Monitor p95 response times
```

#### 2. Token Usage Analysis

```
Navigate to: Dashboards > Claude API Performance
Widget: Token Usage
Action: Compare input vs output token trends
```

#### 3. Cost Tracking

```
Navigate to: Dashboards > Claude API Performance
Widget: Cost Tracking
Action: Review daily/weekly spending
```

### Querying Metrics

#### Find slow requests

```
has:claude.response_time claude.response_time:>2000
```

#### Find high-cost requests

```
has:claude.cost.estimated claude.cost.estimated:>0.01
```

#### Find errors by endpoint

```
claude.success:false claude.endpoint:"/api/descriptions/generate"
```

#### Analyze token usage

```
has:claude.tokens.total
```

### Custom Queries

Create custom discover queries:

1. Navigate to **Discover** > **Build a new query**
2. Select fields: `claude.endpoint`, `avg(claude.response_time)`, `sum(claude.tokens.total)`
3. Add conditions: `has:claude.endpoint`
4. Group by: `claude.endpoint`
5. Save query for reuse

---

## Troubleshooting

### High Response Times

**Symptoms:**
- p95 > 2000ms
- User complaints about slow descriptions

**Investigation:**
1. Check Sentry dashboard for endpoint breakdown
2. Review Claude API status: https://status.anthropic.com
3. Analyze request payload sizes
4. Check concurrent request count

**Solutions:**
- Implement request queuing
- Optimize image sizes before sending
- Consider caching frequent requests
- Review system prompt lengths

### High Error Rates

**Symptoms:**
- Error rate > 1%
- Multiple failed requests

**Investigation:**
1. Check error types in dashboard
2. Review error messages in Sentry issues
3. Verify API key validity
4. Check rate limits

**Solutions:**
- Rotate API keys if auth errors
- Implement exponential backoff for rate limits
- Add request validation
- Review error handling logic

### Token Usage Spikes

**Symptoms:**
- Sudden increase in token consumption
- Unexpected cost increases

**Investigation:**
1. Review token usage widget
2. Check for changes in prompts
3. Analyze endpoint usage patterns
4. Review recent deployments

**Solutions:**
- Optimize system prompts
- Reduce max_tokens parameter
- Implement prompt caching
- Review user input validation

### Missing Metrics

**Symptoms:**
- Empty dashboard widgets
- No data in Sentry

**Investigation:**
1. Verify Sentry SDK installation
2. Check environment variables
3. Review instrumentation code
4. Check Sentry DSN configuration

**Solutions:**
- Ensure `@sentry/nextjs` is installed
- Verify DSN in config files
- Check middleware execution
- Review server logs for Sentry errors

---

## Cost Optimization

### Current Pricing (Claude Sonnet 4.5)

- **Input tokens:** $3 per 1M tokens
- **Output tokens:** $15 per 1M tokens

### Optimization Strategies

#### 1. Prompt Optimization

**Before:**
```typescript
const prompt = `You are an expert Spanish language teacher. Your role is to...
[500 words of context]
Now, describe this image...`;
```

**After:**
```typescript
const prompt = `Expert Spanish teacher. Describe image:`;
// Reduced from 500 to 10 words = 98% token savings on system prompt
```

#### 2. Response Length Limits

```typescript
// Adjust max_tokens based on use case
const maxTokens = {
  description: 500,  // ~375 words
  qa: 300,           // ~225 words
  translation: 150   // ~110 words
};
```

#### 3. Caching Strategy

```typescript
// Cache descriptions for duplicate images
const cacheKey = `desc:${imageHash}:${style}:${language}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;

const description = await generateClaudeVisionDescription(...);
await redis.setex(cacheKey, 3600, description); // 1 hour cache
```

#### 4. Batch Processing

```typescript
// Instead of 2 separate calls
const englishDesc = await generateDescription({ language: 'en' });
const spanishDesc = await generateDescription({ language: 'es' });

// Use parallel processing (already implemented)
const descriptions = await generateParallelDescriptions({
  languages: ['en', 'es']
});
```

### Cost Monitoring

**Daily Budget:** Set alerts at $50/day

**Weekly Review:**
- Total spend
- Cost per request
- Most expensive endpoints
- Token usage trends

**Monthly Optimization:**
- Review prompt efficiency
- Analyze cache hit rates
- Optimize max_tokens settings
- Consider model alternatives for simple tasks

### Cost Calculation Examples

| Endpoint | Avg Input | Avg Output | Cost per Request | Requests/Day | Daily Cost |
|----------|-----------|------------|------------------|--------------|------------|
| /descriptions | 1000 | 500 | $0.0105 | 1000 | $10.50 |
| /qa | 500 | 300 | $0.006 | 500 | $3.00 |
| /translate | 200 | 100 | $0.0021 | 300 | $0.63 |
| **Total** | - | - | - | **1800** | **$14.13** |

---

## Best Practices

### 1. Performance Monitoring

- Review dashboard daily
- Set up alert notifications
- Track response time trends
- Monitor error rates

### 2. Cost Management

- Set daily/weekly budgets
- Optimize prompts regularly
- Implement caching
- Use appropriate max_tokens

### 3. Error Handling

- Implement retries with backoff
- Provide fallback responses
- Log detailed error context
- Monitor auth failures

### 4. Metrics Analysis

- Weekly performance reviews
- Monthly cost analysis
- Quarterly optimization reviews
- Trend analysis and forecasting

---

## Integration with Development Workflow

### Local Development

```bash
# Set Sentry environment
export SENTRY_ENVIRONMENT=development

# Run with monitoring enabled
npm run dev

# View metrics in Sentry (filter by environment:development)
```

### Testing

```bash
# Run performance tests
npm run test:performance

# Check metrics after test run
# Review: Response times, token usage, error rates
```

### Production Deployment

1. Verify Sentry configuration
2. Update environment variables
3. Deploy with monitoring enabled
4. Check dashboard for anomalies
5. Set up production alerts

---

## Appendix

### Environment Variables

```bash
SENTRY_DSN=https://58c3cacf9671e15d453e2f28a626a134@o4510134648307712.ingest.us.sentry.io/4510134719348736
SENTRY_ENVIRONMENT=production
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Useful Links

- [Sentry Dashboard](https://sentry.io/organizations/[org]/dashboards/claude-api-performance/)
- [Anthropic Status](https://status.anthropic.com)
- [Claude API Docs](https://docs.anthropic.com)
- [Alert Rules](./alert-rules.md)

### Support

For monitoring issues or questions:
- Slack: #engineering-monitoring
- Email: monitoring@example.com
- On-call: PagerDuty rotation

---

**Last Updated:** October 6, 2025
**Next Review:** October 13, 2025
