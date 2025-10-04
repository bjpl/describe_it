#!/usr/bin/env node

/**
 * Cache API Endpoint Test
 * Tests the cache status API and Redis integration through the web API
 */

const path = require('path');
const fs = require('fs');

class CacheAPITest {
  constructor() {
    this.baseUrl = 'http://localhost:3007';
    this.results = {
      endpoints: [],
      redis: null,
      tieredCache: null,
      overall: null
    };
    this.startTime = Date.now();
  }

  async testCacheStatusEndpoint() {
    console.log('🌐 Testing Cache Status API Endpoint...');
    
    const fetch = (await import('node-fetch')).default;
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/cache/status?detailed=true`, {
        timeout: 10000
      });
      
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`  ✅ Cache Status API: ${response.status} (${latency}ms)`);
      console.log(`  📊 Service Status: ${data.status}`);
      console.log(`  🔄 Overall Health: ${data.health?.overall ? 'Healthy' : 'Degraded'}`);
      
      // Check if Redis is mentioned in the response
      if (data.detailed?.infrastructure) {
        const infra = data.detailed.infrastructure;
        console.log(`  💾 Memory Cache: ${infra.memory?.size || 0} items`);
        console.log(`  🌐 KV Configured: ${infra.environment?.kvConfigured ? 'Yes' : 'No'}`);
        
        // Look for Redis information
        if (data.health?.redis !== undefined) {
          console.log(`  🔗 Redis Available: ${data.health.redis ? 'Yes' : 'No'}`);
          this.results.redis = {
            available: data.health.redis,
            tested: true
          };
        } else {
          console.log(`  ⚠️  Redis status not found in response`);
          this.results.redis = {
            available: false,
            tested: false,
            note: 'Not found in API response'
          };
        }
      }
      
      this.results.endpoints.push({
        endpoint: '/api/cache/status',
        success: true,
        status: response.status,
        latency: latency,
        data: data
      });
      
      return { success: true, data };
    } catch (error) {
      console.error(`  ❌ Cache Status API failed: ${error.message}`);
      
      this.results.endpoints.push({
        endpoint: '/api/cache/status',
        success: false,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  async testHealthEndpoint() {
    console.log('\n🏥 Testing Health Endpoint...');
    
    const fetch = (await import('node-fetch')).default;
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/health`, {
        timeout: 10000
      });
      
      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`  ✅ Health API: ${response.status} (${latency}ms)`);
      console.log(`  📊 Service Status: ${data.status || 'N/A'}`);
      
      this.results.endpoints.push({
        endpoint: '/api/health',
        success: true,
        status: response.status,
        latency: latency,
        data: data
      });
      
      return { success: true, data };
    } catch (error) {
      console.error(`  ❌ Health API failed: ${error.message}`);
      
      this.results.endpoints.push({
        endpoint: '/api/health',
        success: false,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  async testCacheOperations() {
    console.log('\n🔧 Testing Cache Operations...');
    
    const fetch = (await import('node-fetch')).default;
    
    try {
      // Test cache clear operation
      console.log('  🧹 Testing cache clear operation...');
      
      const clearResponse = await fetch(`${this.baseUrl}/api/cache/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'clear',
          pattern: 'test_*',
          cacheType: 'memory'
        }),
        timeout: 10000
      });
      
      if (!clearResponse.ok) {
        throw new Error(`Clear operation failed: ${clearResponse.status}`);
      }
      
      const clearData = await clearResponse.json();
      console.log(`    ✅ Clear operation: ${clearData.success ? 'Success' : 'Failed'}`);
      
      if (clearData.result?.totalCleared !== undefined) {
        console.log(`    🗑 Items cleared: ${clearData.result.totalCleared}`);
      }
      
      // Test health check operation
      console.log('  🔍 Testing health check operation...');
      
      const healthResponse = await fetch(`${this.baseUrl}/api/cache/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'health-check'
        }),
        timeout: 10000
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Health check operation failed: ${healthResponse.status}`);
      }
      
      const healthData = await healthResponse.json();
      console.log(`    ✅ Health check: ${healthData.success ? 'Success' : 'Failed'}`);
      
      if (healthData.result?.overall !== undefined) {
        console.log(`    💚 Overall health: ${healthData.result.overall ? 'Healthy' : 'Degraded'}`);
        
        // Check for Redis health in the operation result
        if (healthData.result.infrastructure?.redis !== undefined) {
          console.log(`    🔗 Redis health: ${healthData.result.infrastructure.redis ? 'Healthy' : 'Unhealthy'}`);
          this.results.redis = {
            available: healthData.result.infrastructure.redis,
            tested: true,
            source: 'health-check operation'
          };
        }
      }
      
      this.results.endpoints.push({
        endpoint: '/api/cache/status (POST operations)',
        success: true,
        operations: ['clear', 'health-check'],
        clearResult: clearData,
        healthResult: healthData
      });
      
      return { success: true };
    } catch (error) {
      console.error(`  ❌ Cache operations failed: ${error.message}`);
      
      this.results.endpoints.push({
        endpoint: '/api/cache/status (POST operations)',
        success: false,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🧪 Cache API Integration Test');
    console.log('=' .repeat(50));
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    console.log();

    const tests = [
      { name: 'Cache Status Endpoint', fn: () => this.testCacheStatusEndpoint() },
      { name: 'Health Endpoint', fn: () => this.testHealthEndpoint() },
      { name: 'Cache Operations', fn: () => this.testCacheOperations() }
    ];

    const passed = [];
    const failed = [];

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result.success) {
          passed.push(test.name);
        } else {
          failed.push(test.name);
        }
      } catch (error) {
        console.error(`\n❌ ${test.name} test crashed:`, error.message);
        failed.push(test.name);
      }
    }

    // Calculate results
    const totalTests = tests.length;
    const passedCount = passed.length;
    const failedCount = failed.length;
    const passRate = (passedCount / totalTests) * 100;
    
    this.results.overall = {
      success: failedCount === 0,
      totalTests: totalTests,
      passed: passedCount,
      failed: failedCount,
      passRate: passRate,
      duration: Date.now() - this.startTime
    };

    this.printSummary(passed, failed);
    
    return this.results.overall.success;
  }

  printSummary(passed, failed) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 CACHE API TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`⏱  Total Duration: ${totalDuration}ms`);
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Pass Rate: ${this.results.overall.passRate.toFixed(1)}%`);
    
    if (passed.length > 0) {
      console.log('\n✅ PASSED TESTS:');
      passed.forEach(test => console.log(`   ✓ ${test}`));
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failed.forEach(test => console.log(`   ✗ ${test}`));
    }
    
    // Redis integration status
    console.log('\n🔗 REDIS INTEGRATION STATUS:');
    console.log('-'.repeat(30));
    
    if (this.results.redis?.tested) {
      console.log(`Redis Available: ${this.results.redis.available ? '✅ Yes' : '❌ No'}`);
      if (this.results.redis.source) {
        console.log(`Detection Source: ${this.results.redis.source}`);
      }
    } else {
      console.log('Redis Status: ⚠️  Not detected in API responses');
      console.log('Note: Redis may be working but not exposed in current API structure');
    }
    
    // API endpoint health
    const successfulEndpoints = this.results.endpoints.filter(e => e.success).length;
    const totalEndpoints = this.results.endpoints.length;
    
    console.log(`\n📡 API ENDPOINTS: ${successfulEndpoints}/${totalEndpoints} working`);
    
    console.log('\n' + (this.results.overall.success ? '🎉 ALL API TESTS PASSED!' : '⚠️  SOME API TESTS FAILED!'));
    
    // Export results
    this.exportResults();
  }

  exportResults() {
    const resultsFile = path.join(__dirname, 'cache-api-test-results.json');
    const exportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results
    };
    
    try {
      fs.writeFileSync(resultsFile, JSON.stringify(exportData, null, 2));
      console.log(`\n📄 Results exported to: ${resultsFile}`);
    } catch (error) {
      console.log(`\n⚠️  Could not export results: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const testSuite = new CacheAPITest();
  
  try {
    const success = await testSuite.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CacheAPITest;