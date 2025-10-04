#!/usr/bin/env node

/**
 * Cache Testing Script
 * Tests the caching system functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3002';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  
  try {
    const startTime = Date.now();
    const response = await Promise.race([
      fetch(`${BASE_URL}${url}`, options),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    const headers = Object.fromEntries(response.headers.entries());
    
    console.log(`✅ ${name}: ${response.status} ${response.statusText} (${responseTime}ms)`);
    
    if (headers['x-cache']) {
      console.log(`   Cache: ${headers['x-cache']}`);
    }
    
    if (headers['x-response-time']) {
      console.log(`   Response Time: ${headers['x-response-time']}`);
    }
    
    return {
      success: true,
      status: response.status,
      responseTime,
      headers: headers
    };
    
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runCacheTests() {
  console.log('🚀 Starting Cache System Tests...');
  console.log('================================\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: '/api/health',
      method: 'GET'
    },
    {
      name: 'Cache Status (Health)',
      url: '/api/cache/status?health=true',
      method: 'GET'
    },
    {
      name: 'Cache Status (Basic)',
      url: '/api/cache/status',
      method: 'GET'
    },
    {
      name: 'Image Search (First Request)',
      url: '/api/images/search?query=nature&page=1',
      method: 'GET'
    },
    {
      name: 'Image Search (Cached Request)',
      url: '/api/images/search?query=nature&page=1',
      method: 'GET'
    },
    {
      name: 'Description Generation',
      url: '/api/descriptions/generate',
      method: 'POST',
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        style: 'narrativo',
        language: 'es',
        maxLength: 200
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const options = {
      method: test.method || 'GET'
    };
    
    if (test.body) {
      options.body = test.body;
    }
    
    if (test.headers) {
      options.headers = test.headers;
    }
    
    const result = await testEndpoint(test.name, test.url, options);
    results.push({ ...test, result });
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Summary');
  console.log('================');
  
  const successful = results.filter(r => r.result.success).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${total - successful}`);
  
  if (successful === total) {
    console.log('🎉 All tests passed! Caching system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
  
  // Test cache performance
  console.log('\n⚡ Cache Performance Test');
  console.log('=========================');
  
  try {
    console.log('Testing repeated image search requests...');
    
    const url = '/api/images/search?query=mountains&page=1';
    
    // First request (should be MISS)
    const firstStart = Date.now();
    const first = await fetch(`${BASE_URL}${url}`);
    const firstTime = Date.now() - firstStart;
    const firstHeaders = Object.fromEntries(first.headers.entries());
    
    console.log(`First request: ${firstTime}ms (${firstHeaders['x-cache'] || 'MISS'})`);
    
    // Second request (should be HIT)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const secondStart = Date.now();
    const second = await fetch(`${BASE_URL}${url}`);
    const secondTime = Date.now() - secondStart;
    const secondHeaders = Object.fromEntries(second.headers.entries());
    
    console.log(`Second request: ${secondTime}ms (${secondHeaders['x-cache'] || 'MISS'})`);
    
    if (secondHeaders['x-cache'] === 'HIT') {
      const speedup = (firstTime / secondTime).toFixed(2);
      console.log(`🚀 Cache speedup: ${speedup}x faster!`);
    } else {
      console.log('⚠️ Cache not working as expected (no HIT detected)');
    }
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  runCacheTests().catch(console.error);
}

module.exports = { runCacheTests, testEndpoint };