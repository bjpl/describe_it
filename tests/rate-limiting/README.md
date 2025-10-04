# Rate Limiting Test Suite

Comprehensive test coverage for the rate limiting infrastructure including sliding window algorithm, middleware, security scenarios, and performance benchmarks.

## Test Files

### 1. `rate-limiter.test.ts` - Core Algorithm Tests
Tests the fundamental RateLimiter class and sliding window algorithm.

**Coverage:**
- ✅ Sliding window algorithm accuracy
- ✅ Request counting within time windows
- ✅ Window sliding behavior over time
- ✅ Boundary condition handling
- ✅ Multiple IP tracking (independent limits)
- ✅ Concurrent request handling (100+ simultaneous)
- ✅ Memory efficiency and cleanup
- ✅ Custom key generators
- ✅ Rate limit status checks (non-incrementing)
- ✅ Rate limit reset functionality
- ✅ Exponential backoff algorithm
- ✅ Violation tracking and reset
- ✅ Predefined configurations
- ✅ Singleton pattern

**Test Scenarios:**
- Accurate request counting (5 requests, 6th fails)
- Window sliding (reset after expiration)
- Boundary conditions (requests at window edges)
- 100+ concurrent IPs with independent tracking
- 1000 IPs with efficient memory usage
- Exponential backoff (2^n growth, 1-hour cap)
- Backoff reset after inactivity

### 2. `middleware.test.ts` - Middleware Integration Tests
Tests the withRateLimit middleware and preset configurations.

**Coverage:**
- ✅ Basic rate limit enforcement
- ✅ Allow requests under limit
- ✅ Block requests over limit
- ✅ Reset after window expiration
- ✅ Rate limit headers (X-RateLimit-*)
- ✅ Retry-After headers (RFC 6585)
- ✅ Security headers
- ✅ Custom configurations
- ✅ Predefined config presets
- ✅ Admin bypass functionality
- ✅ Exponential backoff integration
- ✅ Callback functions (onLimitExceeded)
- ✅ Skip conditions (skipIf)
- ✅ Error handling and failsafe
- ✅ Tier-based limits (free vs paid)
- ✅ Response format validation

**Middleware Presets Tested:**
- `auth`: 5 requests/15min with exponential backoff
- `description`: 10/min (free) vs 100/min (paid)
- `general`: 100 requests/minute
- `strict`: 10/min, no admin bypass
- `burst`: 20 requests/10 seconds

### 3. `integration.test.ts` - Security & Performance Tests
End-to-end integration tests focusing on security scenarios and performance benchmarks.

**Security Coverage:**
- ✅ DDoS simulation (1000+ requests)
- ✅ Distributed attacks (50+ IPs)
- ✅ Concurrent distributed attacks
- ✅ Burst traffic handling
- ✅ Sustained attacks across windows
- ✅ IP spoofing prevention
- ✅ Rate limit bypass attempts
- ✅ Rapid user switching

**Performance Benchmarks:**
- ✅ Sub-millisecond latency (avg <10ms, P95 <20ms)
- ✅ Concurrent request handling (100+ simultaneous)
- ✅ Memory efficiency (1000+ tracked IPs)
- ✅ Throughput measurement
- ✅ Performance under load

**Integration Flows:**
- ✅ Complete request lifecycle
- ✅ Multiple endpoints with different limits
- ✅ User vs IP rate limiting
- ✅ Window expiration and reset
- ✅ Exponential backoff progression

## Test Metrics

### Coverage Goals
- **Statements**: >95%
- **Branches**: >90%
- **Functions**: >95%
- **Lines**: >95%

### Performance Targets
- **Latency**: <10ms average, <20ms P95
- **Throughput**: >1000 checks/second
- **Concurrency**: Handle 100+ simultaneous requests
- **Memory**: Efficient with 1000+ tracked IPs

### Security Requirements
- Block 800+ of 1000 rapid requests (DDoS)
- Handle 50+ distributed IPs independently
- Prevent IP spoofing attacks
- No bypass through rapid user switching

## Running Tests

### Run All Rate Limiting Tests
```bash
npm test tests/rate-limiting/
```

### Run Specific Test Files
```bash
# Core algorithm tests
npm test tests/rate-limiting/rate-limiter.test.ts

# Middleware tests
npm test tests/rate-limiting/middleware.test.ts

# Integration and security tests
npm test tests/rate-limiting/integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage tests/rate-limiting/
```

### Run Performance Benchmarks
```bash
npm test tests/rate-limiting/integration.test.ts -- --reporter=verbose
```

## Test Structure

### Helper Functions
All test files include common helper functions:
- `createMockRequest(ip, headers)` - Create mock NextRequest
- `sleep(ms)` - Async sleep utility

### Mock Data
- IP addresses in 192.168.x.x and 10.x.x.x ranges
- Custom headers (x-user-id, x-admin-key, etc.)
- Various time windows (100ms to 15min)

### Test Organization
```
describe('Feature Area', () => {
  describe('Specific Feature', () => {
    it('should do specific thing', async () => {
      // Arrange
      const config = { ... };
      const req = createMockRequest('192.168.1.1');

      // Act
      const result = await limiter.checkRateLimit(req, config);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
```

## Key Test Cases

### 1. Sliding Window Accuracy
Verifies that the sliding window algorithm correctly counts requests and enforces limits.

```typescript
// Make 5 requests (should succeed)
// 6th request should fail
// Wait for window to expire
// Next request should succeed
```

### 2. Concurrent Attack Handling
Tests system behavior under concurrent load from multiple sources.

```typescript
// 50 IPs × 10 requests each
// Should block ~50% of requests
// Each IP tracked independently
```

### 3. DDoS Mitigation
Validates that the system can handle and block massive request volumes.

```typescript
// 1000 rapid requests from single IP
// Should block 800+ requests
// Should respond within 30 seconds
```

### 4. Performance Under Load
Ensures the system maintains performance with many tracked entities.

```typescript
// Track 1000 different IPs
// Measure latency with full cache
// Should remain <10ms average
```

## Edge Cases Covered

1. **Time Boundaries**
   - Requests at exact window edges
   - Window expiration timing
   - Clock skew handling

2. **Concurrency**
   - Race conditions in counter updates
   - Parallel requests from same IP
   - Distributed IP tracking

3. **Memory Management**
   - Cleanup of expired entries
   - Memory growth with many IPs
   - Cache eviction policies

4. **Error Handling**
   - Redis connection failures
   - Invalid request data
   - Middleware exceptions

5. **Security**
   - Header injection attempts
   - IP spoofing
   - User ID manipulation
   - Admin key validation

## Performance Benchmarks

Expected performance metrics from integration tests:

| Metric | Target | Typical |
|--------|--------|---------|
| Average Latency | <10ms | ~2-5ms |
| P95 Latency | <20ms | ~10-15ms |
| Throughput | >1000/s | ~2000-5000/s |
| Concurrent Checks | 100+ | 100-200 |
| Memory (1000 IPs) | Reasonable | ~5-10MB |
| DDoS Block Rate | >80% | ~85-90% |

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No external dependencies (Redis optional)
- Deterministic results
- Fast execution (<30 seconds)
- Parallel execution safe
- Clean state between tests

## Debugging Tests

### Enable Verbose Logging
```bash
DEBUG=rate-limit:* npm test tests/rate-limiting/
```

### Run Single Test
```bash
npm test tests/rate-limiting/rate-limiter.test.ts -- -t "should accurately count requests"
```

### Watch Mode
```bash
npm test tests/rate-limiting/ -- --watch
```

## Contributing

When adding new tests:
1. Follow existing patterns (Arrange-Act-Assert)
2. Use descriptive test names
3. Include performance assertions
4. Test both success and failure paths
5. Clean up resources in afterEach
6. Add security considerations

## Related Documentation

- `/src/lib/rate-limiting/rate-limiter.ts` - Core implementation
- `/src/lib/rate-limiting/middleware.ts` - Middleware implementation
- `/docs/SECURITY.md` - Security considerations
- `/docs/PERFORMANCE.md` - Performance guidelines
