# 🤖 Claude Code Command Reference

## Copy-Paste Commands for Claude Code

Use these exact commands to have Claude Code implement each phase of the production infrastructure.

---

## 📋 Phase 1: Infrastructure Setup

### Command 1.1: Install Dependencies
```
Install all production dependencies that aren't already installed:
- node-vault, winston, node-forge, ioredis, node-cron for security
- msw, supertest for testing  
- prom-client, chart.js, react-chartjs-2, bull, ws for monitoring
- generic-pool, p-queue, redis-om, opossum for performance

Use --legacy-peer-deps flag if needed.
```

### Command 1.2: Docker Setup
```
Create a complete Docker setup for local development:
1. Create docker-compose.development.yml with:
   - Redis on port 6379 with persistence
   - Prometheus on port 9090 with config
   - Grafana on port 3001 with dashboards
   - Include health checks and restart policies
2. Create config files for each service
3. Add npm scripts to package.json for docker commands
```

### Command 1.3: Deployment Scripts
```
Create deployment automation scripts:
1. Create scripts/setup-local.sh for local environment setup
2. Create scripts/health-check.sh to verify all services
3. Create scripts/backup.sh for database backups
4. Make all scripts executable and cross-platform
```

---

## 📋 Phase 2: Security Implementation

### Command 2.1: Vault Integration
```
Implement HashiCorp Vault integration:
1. Update src/lib/security/vault-client.ts to use environment variables
2. Create a fallback to use .env.local when Vault is not available
3. Add initialization script in scripts/init-vault.sh
4. Document Vault setup in src/lib/security/VAULT_SETUP.md
```

### Command 2.2: API Security
```
Secure all API endpoints:
1. Add security middleware to all routes in src/app/api/
2. Implement rate limiting on /api/descriptions/generate
3. Add audit logging for all API calls
4. Create src/middleware.ts for global security headers
```

### Command 2.3: Key Rotation
```
Set up automated key rotation:
1. Create scripts/rotate-keys.sh for manual rotation
2. Add rotation scheduling to src/lib/security/key-rotation.ts
3. Create webhook endpoint at /api/security/rotate for automated rotation
4. Add rotation status to health check endpoint
```

---

## 📋 Phase 3: Testing Framework

### Command 3.1: Fix Existing Tests
```
Fix all failing tests in the project:
1. Update test configuration in vitest.config.ts
2. Fix localStorage mocking issues
3. Add proper async handling for all tests
4. Update component tests to use MSW mocks
5. Ensure all tests pass
```

### Command 3.2: Add Security Tests
```
Create comprehensive security test suite:
1. Create tests/security/api-endpoints.test.ts for all API routes
2. Test rate limiting functionality
3. Test XSS and injection prevention
4. Test authentication and authorization
5. Add tests for audit logging
```

### Command 3.3: Integration Tests
```
Create end-to-end integration tests:
1. Create tests/e2e/user-workflow.test.ts for complete user flows
2. Test image upload → description → export workflow
3. Add performance benchmarks to tests
4. Create tests/e2e/api-integration.test.ts for API workflows
```

---

## 📋 Phase 4: Performance Optimization

### Command 4.1: Connection Pooling
```
Implement OpenAI client connection pooling:
1. Update src/lib/api/openai-server.ts to use connection pool
2. Add pool configuration to environment variables
3. Implement health checks for pool connections
4. Add metrics for pool usage
```

### Command 4.2: Caching Layer
```
Implement comprehensive caching:
1. Add Redis caching to src/app/api/descriptions/generate/route.ts
2. Cache descriptions by image hash
3. Implement cache warming for common requests
4. Add cache invalidation endpoints
5. Create cache status dashboard component
```

### Command 4.3: Request Optimization
```
Optimize API request handling:
1. Implement request batching for multiple descriptions
2. Add request deduplication
3. Implement circuit breakers for external APIs
4. Add request queuing with priority support
```

---

## 📋 Phase 5: Monitoring & Analytics

### Command 5.1: Metrics Collection
```
Set up Prometheus metrics:
1. Add metrics to all API endpoints
2. Create custom metrics for business KPIs
3. Add /api/metrics endpoint for Prometheus scraping
4. Create Grafana dashboard configs in monitoring/dashboards/
```

### Command 5.2: Real-time Dashboard
```
Create analytics dashboard:
1. Create src/app/analytics/page.tsx with real-time charts
2. Add WebSocket support for live updates
3. Include API usage, performance, and error metrics
4. Add export functionality for reports
```

### Command 5.3: Alerting System
```
Implement alerting and anomaly detection:
1. Create alert rules for critical metrics
2. Add anomaly detection for unusual patterns
3. Create /api/alerts endpoint for alert management
4. Add email/webhook notifications for critical alerts
```

---

## 📋 Phase 6: Production Deployment

### Command 6.1: Environment Validation
```
Create environment validation:
1. Update scripts/validate-environment.js with all checks
2. Validate all required environment variables
3. Check service connectivity (Redis, databases)
4. Verify API keys are valid format
5. Add pre-deployment validation to CI/CD
```

### Command 6.2: GitHub Actions
```
Update GitHub Actions workflow:
1. Add production deployment job to .github/workflows/
2. Include security scanning with Trivy
3. Add performance testing step
4. Implement blue-green deployment
5. Add rollback mechanism
```

### Command 6.3: Production Configs
```
Create production configurations:
1. Create config/production.json with production settings
2. Update next.config.js for production optimizations
3. Add production-specific security headers
4. Configure CDN and caching headers
5. Add production logging configuration
```

---

## 🎯 Verification Commands

### After Each Phase, Ask Claude Code:

### Verify Phase 1:
```
Verify infrastructure setup:
1. Check all dependencies are installed
2. Verify Docker services are configured
3. Test deployment scripts work
4. Show me the Docker service status
```

### Verify Phase 2:
```
Verify security implementation:
1. Test security middleware is working
2. Verify rate limiting is active
3. Check audit logging is functioning
4. Test key rotation mechanism
```

### Verify Phase 3:
```
Verify testing framework:
1. Run all tests and show results
2. Check test coverage percentage
3. Verify MSW mocks are working
4. Run security test suite
```

### Verify Phase 4:
```
Verify performance optimizations:
1. Check connection pooling is active
2. Verify Redis caching is working
3. Test request batching
4. Show performance metrics
```

### Verify Phase 5:
```
Verify monitoring setup:
1. Check Prometheus metrics endpoint
2. Verify Grafana dashboards load
3. Test real-time dashboard updates
4. Verify alerting is configured
```

---

## 🚀 One-Command Full Setup

### For Experienced Users - Full Automation:
```
Please execute the complete production infrastructure setup from EXECUTION_GUIDE.md:
1. Install all dependencies from all phases
2. Set up Docker services for local development
3. Implement security layer with Vault fallback
4. Fix all tests and add security tests
5. Implement performance optimizations
6. Set up monitoring and dashboards
7. Create all deployment scripts
8. Verify everything is working

Assume I have already:
- Rotated all API keys
- Created .env.local with new keys
- Cleaned git history

Start with Phase 1 and continue through all phases. Show me verification after each phase completes.
```

---

## 💡 Tips for Working with Claude Code

1. **Be Specific**: The more specific your command, the better the result
2. **Verify Often**: Ask for verification after each major change
3. **Incremental**: Do one phase at a time if you want more control
4. **Ask Questions**: Claude Code can explain any part of the implementation
5. **Request Changes**: If something isn't right, ask for modifications

## 🆘 Troubleshooting Commands

### If Something Goes Wrong:
```
Help me debug [specific issue]:
1. Show me the error logs
2. Check service connectivity
3. Verify environment variables
4. Test the specific component
5. Suggest fixes
```

### To Understand Implementation:
```
Explain how [feature] works:
1. Show me the code structure
2. Explain the data flow
3. Show me how components interact
4. Explain the configuration options
```

### To Modify Implementation:
```
Modify [component] to:
1. [Specific change needed]
2. Update tests to match
3. Update documentation
4. Verify the change works
```

---

Remember: Claude Code can handle complex multi-step tasks. Don't hesitate to give detailed instructions!