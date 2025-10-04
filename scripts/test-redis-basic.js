#!/usr/bin/env node

/**
 * Basic Redis Connection Test
 * Validates Redis connectivity and basic operations without API dependencies
 */

const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');

// Test configuration
const CONFIG = {
  REDIS_URL: 'redis://default:Ff3H2oTwNmPZxLYKILwSvdi2L481mINH@redis-10486.c60.us-west-1-2.ec2.redns.redis-cloud.com:10486',
  TEST_PREFIX: 'test_basic_redis:',
  TIMEOUT: 5000,
};

class BasicRedisTest {
  constructor() {
    this.client = null;
    this.results = {
      connection: null,
      basicOps: null,
      performance: null,
      overall: null
    };
    this.startTime = Date.now();
  }

  async initializeClient() {
    console.log('🔌 Initializing Redis client...');
    
    try {
      this.client = new Redis(CONFIG.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`  ↻ Retry attempt ${times}, waiting ${delay}ms`);
          return delay;
        },
        lazyConnect: false,
        enableOfflineQueue: true,
        connectTimeout: CONFIG.TIMEOUT,
        keepAlive: 30000,
      });

      this.client.on('connect', () => console.log('  ✅ Redis connected'));
      this.client.on('ready', () => console.log('  ✅ Redis ready'));
      this.client.on('error', (err) => console.log(`  ❌ Redis error: ${err.message}`));
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Redis client:', error.message);
      return false;
    }
  }

  async testConnection() {
    console.log('\n📡 Testing Redis Connection...');
    
    try {
      const startTime = Date.now();
      const pong = await this.client.ping();
      const latency = Date.now() - startTime;
      
      if (pong !== 'PONG') {
        throw new Error(`Expected 'PONG', got '${pong}'`);
      }
      
      // Get server info
      const info = await this.client.info();
      const serverInfo = this.parseRedisInfo(info);
      
      this.results.connection = {
        success: true,
        latency: latency,
        serverVersion: serverInfo.redis_version,
        mode: serverInfo.redis_mode,
        uptime: parseInt(serverInfo.uptime_in_seconds),
        connectedClients: parseInt(serverInfo.connected_clients),
        usedMemory: this.formatBytes(parseInt(serverInfo.used_memory)),
        maxMemory: serverInfo.maxmemory ? this.formatBytes(parseInt(serverInfo.maxmemory)) : 'unlimited'
      };
      
      console.log('  ✅ Connection successful');
      console.log(`  📊 Latency: ${latency}ms`);
      console.log(`  🖥 Server: Redis ${serverInfo.redis_version} (${serverInfo.redis_mode})`);
      console.log(`  💾 Memory: ${this.results.connection.usedMemory} / ${this.results.connection.maxMemory}`);
      console.log(`  👥 Connected Clients: ${this.results.connection.connectedClients}`);
      console.log(`  ⏱ Uptime: ${Math.floor(this.results.connection.uptime / 3600)}h ${Math.floor((this.results.connection.uptime % 3600) / 60)}m`);
      
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      this.results.connection = { success: false, error: error.message };
      return false;
    }
  }

  async testBasicOperations() {
    console.log('\n🔧 Testing Basic Operations...');
    
    const tests = [];
    const testKey = `${CONFIG.TEST_PREFIX}basic_test`;
    
    try {
      // Test SET
      console.log('  📝 Testing SET...');
      const testValue = { 
        message: 'Hello Redis!', 
        timestamp: Date.now(),
        type: 'basic_test'
      };
      const setStart = Date.now();
      await this.client.setex(testKey, 60, JSON.stringify(testValue));
      const setLatency = Date.now() - setStart;
      tests.push({ operation: 'SET', latency: setLatency, success: true });
      console.log(`    ✅ SET completed in ${setLatency}ms`);
      
      // Test GET
      console.log('  📖 Testing GET...');
      const getStart = Date.now();
      const retrievedValue = await this.client.get(testKey);
      const getLatency = Date.now() - getStart;
      
      if (!retrievedValue) {
        throw new Error('GET returned null');
      }
      
      const parsedValue = JSON.parse(retrievedValue);
      if (parsedValue.message !== testValue.message) {
        throw new Error(`Data mismatch: ${parsedValue.message}`);
      }
      
      tests.push({ operation: 'GET', latency: getLatency, success: true });
      console.log(`    ✅ GET completed in ${getLatency}ms`);
      
      // Test EXISTS
      console.log('  🔍 Testing EXISTS...');
      const existsStart = Date.now();
      const exists = await this.client.exists(testKey);
      const existsLatency = Date.now() - existsStart;
      
      if (exists !== 1) {
        throw new Error(`EXISTS returned ${exists}, expected 1`);
      }
      
      tests.push({ operation: 'EXISTS', latency: existsLatency, success: true });
      console.log(`    ✅ EXISTS completed in ${existsLatency}ms`);
      
      // Test TTL
      console.log('  ⏱ Testing TTL...');
      const ttlStart = Date.now();
      const ttl = await this.client.ttl(testKey);
      const ttlLatency = Date.now() - ttlStart;
      
      if (ttl <= 0 || ttl > 60) {
        throw new Error(`TTL returned ${ttl}, expected 1-60`);
      }
      
      tests.push({ operation: 'TTL', latency: ttlLatency, success: true });
      console.log(`    ✅ TTL completed in ${ttlLatency}ms, expires in ${ttl}s`);
      
      // Test DEL
      console.log('  🗑 Testing DEL...');
      const delStart = Date.now();
      const deleted = await this.client.del(testKey);
      const delLatency = Date.now() - delStart;
      
      if (deleted !== 1) {
        throw new Error(`DEL returned ${deleted}, expected 1`);
      }
      
      tests.push({ operation: 'DEL', latency: delLatency, success: true });
      console.log(`    ✅ DEL completed in ${delLatency}ms`);
      
      this.results.basicOps = {
        success: true,
        tests: tests,
        avgLatency: tests.reduce((sum, t) => sum + t.latency, 0) / tests.length,
        totalOperations: tests.length
      };
      
      console.log('  ✅ All basic operations successful');
      console.log(`  📊 Average latency: ${this.results.basicOps.avgLatency.toFixed(2)}ms`);
      
      return true;
    } catch (error) {
      console.error('❌ Basic operations test failed:', error.message);
      this.results.basicOps = { success: false, error: error.message, tests };
      return false;
    }
  }

  async testPerformance() {
    console.log('\n🚀 Testing Performance...');
    
    try {
      const iterations = 100;
      
      // Write performance
      console.log(`  📝 Testing write performance (${iterations} operations)...`);
      const writeStart = Date.now();
      const writePromises = [];
      
      for (let i = 0; i < iterations; i++) {
        writePromises.push(
          this.client.setex(
            `${CONFIG.TEST_PREFIX}perf_${i}`,
            300,
            JSON.stringify({ id: i, data: `test_data_${i}`, timestamp: Date.now() })
          )
        );
      }
      
      await Promise.all(writePromises);
      const writeDuration = Date.now() - writeStart;
      const writeOpsPerSec = (iterations / writeDuration) * 1000;
      
      console.log(`    ✅ Write: ${writeOpsPerSec.toFixed(2)} ops/sec (${writeDuration}ms total)`);
      
      // Read performance
      console.log(`  📖 Testing read performance (${iterations} operations)...`);
      const readStart = Date.now();
      const readPromises = [];
      
      for (let i = 0; i < iterations; i++) {
        readPromises.push(this.client.get(`${CONFIG.TEST_PREFIX}perf_${i}`));
      }
      
      const readResults = await Promise.all(readPromises);
      const readDuration = Date.now() - readStart;
      const readOpsPerSec = (iterations / readDuration) * 1000;
      const successfulReads = readResults.filter(r => r !== null).length;
      
      console.log(`    ✅ Read: ${readOpsPerSec.toFixed(2)} ops/sec (${readDuration}ms total, ${successfulReads}/${iterations} successful)`);
      
      // Cleanup
      const cleanupKeys = [];
      for (let i = 0; i < iterations; i++) {
        cleanupKeys.push(`${CONFIG.TEST_PREFIX}perf_${i}`);
      }
      
      const deleted = await this.client.del(...cleanupKeys);
      console.log(`    🧹 Cleaned up ${deleted} test keys`);
      
      this.results.performance = {
        success: true,
        writeOpsPerSec: writeOpsPerSec,
        readOpsPerSec: readOpsPerSec,
        writeDuration: writeDuration,
        readDuration: readDuration,
        successfulReads: successfulReads,
        iterations: iterations
      };
      
      return true;
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      this.results.performance = { success: false, error: error.message };
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Basic Redis Connection Test');
    console.log('=' .repeat(50));
    console.log(`🔗 Redis URL: ${CONFIG.REDIS_URL.replace(/:([^:@]*@)/, ':***@')}`);
    console.log();

    // Initialize client
    const clientInit = await this.initializeClient();
    if (!clientInit) {
      console.log('\n❌ Cannot proceed without Redis client');
      process.exit(1);
    }

    // Run tests
    const tests = [
      { name: 'Connection', fn: () => this.testConnection() },
      { name: 'Basic Operations', fn: () => this.testBasicOperations() },
      { name: 'Performance', fn: () => this.testPerformance() }
    ];

    const passed = [];
    const failed = [];

    for (const test of tests) {
      try {
        const success = await test.fn();
        if (success) {
          passed.push(test.name);
        } else {
          failed.push(test.name);
        }
      } catch (error) {
        console.error(`\n❌ ${test.name} test crashed:`, error.message);
        failed.push(test.name);
      }
    }

    // Results summary
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
    
    // Close connection
    if (this.client) {
      await this.client.quit();
    }

    return this.results.overall.success;
  }

  printSummary(passed, failed) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
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
    
    // Key metrics
    console.log('\n📋 KEY METRICS:');
    console.log('-'.repeat(30));
    
    if (this.results.connection?.success) {
      const conn = this.results.connection;
      console.log(`🔌 Connection Latency: ${conn.latency}ms`);
      console.log(`🖥 Redis Version: ${conn.serverVersion}`);
      console.log(`💾 Memory Usage: ${conn.usedMemory}`);
    }
    
    if (this.results.basicOps?.success) {
      const ops = this.results.basicOps;
      console.log(`🔧 Basic Operations Avg: ${ops.avgLatency.toFixed(2)}ms`);
    }
    
    if (this.results.performance?.success) {
      const perf = this.results.performance;
      console.log(`🚀 Write Performance: ${perf.writeOpsPerSec.toFixed(0)} ops/sec`);
      console.log(`📖 Read Performance: ${perf.readOpsPerSec.toFixed(0)} ops/sec`);
    }
    
    console.log('\n' + (this.results.overall.success ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED!'));
    
    // Export results
    this.exportResults();
  }

  exportResults() {
    const resultsFile = path.join(__dirname, 'redis-basic-test-results.json');
    const exportData = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: this.results
    };
    
    try {
      fs.writeFileSync(resultsFile, JSON.stringify(exportData, null, 2));
      console.log(`\n📄 Results exported to: ${resultsFile}`);
    } catch (error) {
      console.log(`\n⚠️  Could not export results: ${error.message}`);
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const parsed = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = value;
      }
    }
    
    return parsed;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Main execution
async function main() {
  const testSuite = new BasicRedisTest();
  
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

module.exports = BasicRedisTest;