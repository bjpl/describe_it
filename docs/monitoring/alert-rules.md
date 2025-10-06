# Sentry Alert Rules for Claude API Monitoring

This document defines alert rules for monitoring Claude API performance and detecting issues.

## Alert Rules Configuration

### 1. High Response Time Alert

**Rule Name:** Claude API Response Time Critical

**Trigger Conditions:**
- `p95(claude.response_time) > 2000ms` for 5 minutes
- Applies to: All Claude API endpoints

**Alert Level:** Warning

**Actions:**
- Send notification to #engineering-alerts Slack channel
- Create Sentry issue
- Send email to on-call engineer

**Query:**
```
has:claude.response_time p95(claude.response_time):>2000
```

**Threshold:**
- Warning: p95 > 2000ms
- Critical: p95 > 5000ms

---

### 2. Error Rate Threshold Alert

**Rule Name:** Claude API Error Rate Exceeded

**Trigger Conditions:**
- Error rate > 1% over 10 minute window
- Minimum 10 requests in window

**Alert Level:** Critical

**Actions:**
- Page on-call engineer
- Send notification to #incidents Slack channel
- Create high-priority Sentry issue

**Query:**
```
has:claude.success equation|count_if(claude.success,equals,false) / count() * 100 > 1
```

**Thresholds:**
- Warning: error rate > 1%
- Critical: error rate > 5%

---

### 3. Token Usage Spike Alert

**Rule Name:** Claude Token Usage Spike Detected

**Trigger Conditions:**
- Token usage increases by >50% compared to 1-hour average
- Sustained for 5 minutes

**Alert Level:** Warning

**Actions:**
- Send notification to #cost-monitoring Slack channel
- Create informational Sentry issue

**Query:**
```
has:claude.tokens.total sum(claude.tokens.total) > baseline * 1.5
```

**Notes:**
- Baseline calculated as 1-hour rolling average
- Helps prevent unexpected cost increases

---

### 4. API Authentication Failures

**Rule Name:** Claude API Authentication Failures

**Trigger Conditions:**
- More than 3 authentication errors in 5 minutes
- Error type: 401 Unauthorized

**Alert Level:** Critical

**Actions:**
- Page on-call engineer immediately
- Send notification to #security-alerts Slack channel
- Create high-priority security incident

**Query:**
```
claude.error_type:"auth_error" OR error.message:"Invalid Anthropic API key"
```

**Auto-remediation:**
- Check API key rotation status
- Verify environment variable configuration

---

### 5. Rate Limit Warnings

**Rule Name:** Claude API Rate Limit Approaching

**Trigger Conditions:**
- Rate limit errors (429) detected
- More than 1 occurrence in 15 minutes

**Alert Level:** Warning

**Actions:**
- Send notification to #engineering-alerts Slack channel
- Create Sentry issue with rate limit context

**Query:**
```
claude.error_type:"rate_limit" OR error.status:429
```

**Auto-remediation:**
- Trigger request throttling
- Enable request queue

---

### 6. Cost Threshold Alert

**Rule Name:** Daily Claude API Cost Threshold

**Trigger Conditions:**
- Estimated daily cost exceeds $50 USD
- Calculated from running sum of `claude.cost.estimated`

**Alert Level:** Warning

**Actions:**
- Send notification to #cost-monitoring Slack channel
- Send email to finance team
- Create informational Sentry issue

**Query:**
```
has:claude.cost.estimated sum(claude.cost.estimated) > 50
```

**Time Window:** 24 hours

**Notes:**
- Adjust threshold based on budget
- Review cost optimization opportunities

---

### 7. Performance Degradation Alert

**Rule Name:** Claude API Performance Degradation

**Trigger Conditions:**
- p50 response time increases by >30% compared to 24-hour baseline
- Sustained for 10 minutes

**Alert Level:** Warning

**Actions:**
- Send notification to #engineering-alerts Slack channel
- Create Sentry issue with performance context

**Query:**
```
has:claude.response_time p50(claude.response_time) > baseline * 1.3
```

**Auto-investigation:**
- Check Anthropic status page
- Review concurrent request count
- Analyze request payload sizes

---

### 8. Endpoint-Specific Alerts

#### Description Generation Endpoint

**Rule Name:** Description Generation Slow Response

**Trigger Conditions:**
- `/api/descriptions/generate` p95 > 3000ms
- Sustained for 5 minutes

**Alert Level:** Warning

**Query:**
```
claude.endpoint:"/api/descriptions/generate" p95(claude.response_time):>3000
```

---

#### Q&A Generation Endpoint

**Rule Name:** Q&A Generation Slow Response

**Trigger Conditions:**
- `/api/qa/generate` p95 > 1500ms
- Sustained for 5 minutes

**Alert Level:** Warning

**Query:**
```
claude.endpoint:"/api/qa/generate" p95(claude.response_time):>1500
```

---

#### Translation Endpoint

**Rule Name:** Translation Slow Response

**Trigger Conditions:**
- `/api/translate` p95 > 1000ms
- Sustained for 5 minutes

**Alert Level:** Warning

**Query:**
```
claude.endpoint:"/api/translate" p95(claude.response_time):>1000
```

---

## Alert Configuration in Sentry

### Setting Up Alerts

1. Navigate to **Alerts** > **Create Alert**
2. Choose **Issues & Errors** or **Performance**
3. Configure trigger conditions using queries above
4. Set alert level (Info, Warning, Critical)
5. Configure notification channels
6. Save alert rule

### Notification Channels

**Slack Integration:**
- #engineering-alerts (warnings)
- #incidents (critical alerts)
- #cost-monitoring (cost alerts)
- #security-alerts (security incidents)

**Email:**
- engineering@example.com (warnings)
- oncall@example.com (critical)

**PagerDuty:**
- Trigger for critical alerts only
- Escalate if not acknowledged within 5 minutes

---

## Alert Maintenance

### Review Schedule

- **Weekly:** Review alert noise and adjust thresholds
- **Monthly:** Analyze false positive rate
- **Quarterly:** Update baseline metrics and thresholds

### Tuning Guidelines

1. Monitor alert frequency
2. Reduce false positives by adjusting thresholds
3. Add context to alerts (error messages, stack traces)
4. Create runbooks for common alert scenarios

---

## Runbook Links

- [High Response Time Runbook](#)
- [Error Rate Investigation Guide](#)
- [Cost Optimization Checklist](#)
- [API Key Rotation Procedure](#)

---

## Metrics Baselines (Updated: October 6, 2025)

| Endpoint | p50 (ms) | p95 (ms) | p99 (ms) | Avg Tokens | Avg Cost |
|----------|----------|----------|----------|------------|----------|
| /api/descriptions/generate | 1189 | 1800 | 2500 | 1500 | $0.012 |
| /api/qa/generate | 931 | 1400 | 2000 | 800 | $0.008 |
| /api/translate | 543 | 800 | 1200 | 300 | $0.003 |

**Note:** Baselines should be updated weekly based on actual production metrics.
