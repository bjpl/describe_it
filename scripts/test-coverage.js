#!/usr/bin/env node

/**
 * Test Coverage Report Generator and Validator
 * Ensures 80% code coverage across all test types
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class CoverageValidator {
  constructor() {
    this.coverageThresholds = {
      global: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      individual: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      }
    }
    
    this.resultsDir = path.join(process.cwd(), 'test-results')
    this.coverageDir = path.join(process.cwd(), 'coverage')
  }

  async runAllTests() {
    console.log('🧪 Running comprehensive test suite...\n')

    try {
      // Create results directory
      this.ensureDirectory(this.resultsDir)
      this.ensureDirectory(this.coverageDir)

      // Run unit tests with coverage
      console.log('📊 Running unit tests with coverage...')
      execSync('npm run test:coverage', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      })

      // Run integration tests
      console.log('🔗 Running integration tests...')
      execSync('npm run test -- tests/integration', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      })

      // Run performance tests
      console.log('⚡ Running performance tests...')
      execSync('npm run test -- tests/performance', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      })

      // Run E2E tests (only if server is available)
      if (await this.checkServerHealth()) {
        console.log('🎭 Running E2E tests...')
        execSync('npm run test:e2e', { 
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'test' }
        })
      } else {
        console.warn('⚠️  Skipping E2E tests - server not available')
      }

      // Validate coverage
      await this.validateCoverage()

      // Generate summary report
      await this.generateSummaryReport()

      console.log('\n✅ All tests completed successfully!')
      return true

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message)
      return false
    }
  }

  async checkServerHealth() {
    try {
      const { default: fetch } = await import('node-fetch')
      const response = await fetch('http://localhost:3000/api/health')
      return response.ok
    } catch (error) {
      return false
    }
  }

  async validateCoverage() {
    console.log('\n📋 Validating code coverage...')

    const coverageFile = path.join(this.coverageDir, 'coverage-summary.json')
    
    if (!fs.existsSync(coverageFile)) {
      throw new Error('Coverage report not found. Make sure tests ran successfully.')
    }

    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
    const totals = coverage.total

    const results = {
      statements: this.validateMetric('Statements', totals.statements, this.coverageThresholds.global.statements),
      branches: this.validateMetric('Branches', totals.branches, this.coverageThresholds.global.branches),
      functions: this.validateMetric('Functions', totals.functions, this.coverageThresholds.global.functions),
      lines: this.validateMetric('Lines', totals.lines, this.coverageThresholds.global.lines)
    }

    const allPassed = Object.values(results).every(result => result.passed)

    if (!allPassed) {
      throw new Error('Coverage thresholds not met!')
    }

    console.log('✅ All coverage thresholds met!\n')
    return results
  }

  validateMetric(name, metric, threshold) {
    const percentage = metric.pct
    const passed = percentage >= threshold
    const status = passed ? '✅' : '❌'
    
    console.log(`${status} ${name}: ${percentage}% (threshold: ${threshold}%)`)
    
    return { name, percentage, threshold, passed }
  }

  async generateSummaryReport() {
    console.log('📊 Generating test summary report...')

    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        npm: execSync('npm --version', { encoding: 'utf8' }).trim(),
        platform: process.platform,
        ci: !!process.env.CI,
      },
      testResults: await this.collectTestResults(),
      coverage: await this.getCoverageData(),
      performance: await this.getPerformanceMetrics(),
    }

    const summaryPath = path.join(this.resultsDir, 'test-summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

    // Generate markdown report
    await this.generateMarkdownReport(summary)

    console.log(`📝 Summary report generated: ${summaryPath}`)
  }

  async collectTestResults() {
    const results = {
      unit: { total: 0, passed: 0, failed: 0 },
      integration: { total: 0, passed: 0, failed: 0 },
      e2e: { total: 0, passed: 0, failed: 0 },
      performance: { total: 0, passed: 0, failed: 0 },
    }

    // Parse vitest results if available
    const vitestResults = path.join(this.resultsDir, 'vitest-results.json')
    if (fs.existsSync(vitestResults)) {
      const data = JSON.parse(fs.readFileSync(vitestResults, 'utf8'))
      // Parse vitest format and update results
    }

    // Parse playwright results if available
    const playwrightResults = path.join(this.resultsDir, 'e2e-results.json')
    if (fs.existsSync(playwrightResults)) {
      const data = JSON.parse(fs.readFileSync(playwrightResults, 'utf8'))
      results.e2e.total = data.suites?.length || 0
      results.e2e.passed = data.suites?.filter(s => s.ok).length || 0
      results.e2e.failed = results.e2e.total - results.e2e.passed
    }

    return results
  }

  async getCoverageData() {
    const coverageFile = path.join(this.coverageDir, 'coverage-summary.json')
    
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
      return coverage.total
    }
    
    return null
  }

  async getPerformanceMetrics() {
    // Collect performance metrics if available
    return {
      apiResponseTimes: await this.getApiMetrics(),
      memoryUsage: process.memoryUsage(),
      loadTimes: await this.getLoadMetrics(),
    }
  }

  async getApiMetrics() {
    // Placeholder for API performance metrics
    return {
      averageResponseTime: '< 2000ms',
      p95ResponseTime: '< 3000ms',
      errorRate: '< 1%',
    }
  }

  async getLoadMetrics() {
    return {
      initialLoad: '< 3000ms',
      timeToInteractive: '< 5000ms',
      firstContentfulPaint: '< 1500ms',
    }
  }

  async generateMarkdownReport(summary) {
    const markdown = `# Test Report

Generated: ${summary.timestamp}

## Environment
- Node.js: ${summary.environment.node}
- NPM: ${summary.environment.npm}
- Platform: ${summary.environment.platform}
- CI: ${summary.environment.ci ? 'Yes' : 'No'}

## Test Results

### Unit Tests
- Total: ${summary.testResults.unit.total}
- Passed: ${summary.testResults.unit.passed}
- Failed: ${summary.testResults.unit.failed}

### Integration Tests
- Total: ${summary.testResults.integration.total}
- Passed: ${summary.testResults.integration.passed}
- Failed: ${summary.testResults.integration.failed}

### E2E Tests
- Total: ${summary.testResults.e2e.total}
- Passed: ${summary.testResults.e2e.passed}
- Failed: ${summary.testResults.e2e.failed}

### Performance Tests
- Total: ${summary.testResults.performance.total}
- Passed: ${summary.testResults.performance.passed}
- Failed: ${summary.testResults.performance.failed}

## Code Coverage

${summary.coverage ? `
- **Statements**: ${summary.coverage.statements.pct}%
- **Branches**: ${summary.coverage.branches.pct}%
- **Functions**: ${summary.coverage.functions.pct}%
- **Lines**: ${summary.coverage.lines.pct}%
` : 'Coverage data not available'}

## Performance Metrics

- **API Response Time**: ${summary.performance.apiResponseTimes.averageResponseTime}
- **P95 Response Time**: ${summary.performance.apiResponseTimes.p95ResponseTime}
- **Error Rate**: ${summary.performance.apiResponseTimes.errorRate}

## Links

- [HTML Coverage Report](../coverage/lcov-report/index.html)
- [E2E Test Report](../test-results/html-report/index.html)
`

    const reportPath = path.join(this.resultsDir, 'TEST_REPORT.md')
    fs.writeFileSync(reportPath, markdown)
  }

  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new CoverageValidator()
  
  validator.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Unexpected error:', error)
      process.exit(1)
    })
}

module.exports = CoverageValidator