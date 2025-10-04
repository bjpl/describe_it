#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Verification Script
 * Tests all API endpoints in the project for functionality, performance, and security
 * 
 * Usage: node scripts/verify-api-endpoints.js [--host=localhost:3000] [--detailed] [--auth-test]
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: process.argv.find(arg => arg.startsWith('--host='))?.split('=')[1] || 'http://localhost:3000',
  detailed: process.argv.includes('--detailed'),
  authTest: process.argv.includes('--auth-test'),
  timeout: 10000, // 10 seconds
  retries: 3,
  concurrency: 5
};

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  config: CONFIG,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    totalResponseTime: 0,
    averageResponseTime: 0
  },
  endpoints: [],
  external_apis: {
    openai: { tested: false, available: false, error: null },
    unsplash: { tested: false, available: false, error: null },
    supabase: { tested: false, available: false, error: null }
  }
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

// HTTP request helper with retry logic
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'API-Verifier/1.0',
      ...options.headers
    },
    signal: controller.signal,
    ...options
  };

  let lastError;
  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const startTime = performance.now();
      const response = await fetch(url, requestOptions);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      clearTimeout(timeoutId);

      let data = null;
      let contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          // Response claimed to be JSON but wasn't
          data = { _parseError: 'Invalid JSON response' };
        }
      } else if (contentType.includes('text/')) {
        data = await response.text();
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        responseTime,
        attempt
      };
    } catch (error) {
      lastError = error;
      if (attempt < CONFIG.retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  clearTimeout(timeoutId);
  throw lastError;
}

// Define all API endpoints with their expected behavior
const API_ENDPOINTS = [
  // Health and status endpoints
  {
    path: '/api/health',
    method: 'GET',
    name: 'Health Check',
    category: 'System',
    expectedStatus: [200, 503],
    requiredFields: ['status', 'timestamp'],
    tests: [
      { params: '?detailed=true', description: 'Detailed health check' },
      { params: '', description: 'Basic health check' }
    ]
  },
  {
    path: '/api/status',
    method: 'GET',
    name: 'Application Status',
    category: 'System',
    expectedStatus: [200],
    requiredFields: ['status', 'demo', 'timestamp', 'services']
  },
  {
    path: '/api/env-status',
    method: 'GET',
    name: 'Environment Status',
    category: 'System',
    expectedStatus: [200],
    requiredFields: ['status', 'timestamp', 'environment'],
    tests: [
      { params: '', description: 'Basic environment status' },
      { params: '?detailed=true', description: 'Detailed environment info' },
      { params: '?health=true', description: 'Health-only status' }
    ]
  },
  {
    path: '/api/debug/env',
    method: 'GET',
    name: 'Debug Environment Variables',
    category: 'Debug',
    expectedStatus: [200, 403],
    sensitiveEndpoint: true,
    tests: [
      { params: '', description: 'Without auth (should be blocked in production)' },
      { params: '?secret=check-env-vars', description: 'With secret parameter' }
    ]
  },
  
  // Cache endpoints
  {
    path: '/api/cache/status',
    method: 'GET',
    name: 'Cache Status',
    category: 'Cache',
    expectedStatus: [200, 500],
    requiredFields: ['service', 'status', 'timestamp'],
    tests: [
      { params: '', description: 'Basic cache status' },
      { params: '?detailed=true', description: 'Detailed cache metrics' },
      { params: '?health=true', description: 'Health-only cache status' }
    ]
  },
  {
    path: '/api/cache/status',
    method: 'POST',
    name: 'Cache Operations',
    category: 'Cache',
    expectedStatus: [200, 400, 500],
    requiresBody: true,
    testBodies: [
      { action: 'health-check' },
      { action: 'reset-metrics' },
      { action: 'clear', cacheType: 'memory' }
    ]
  },

  // Content generation endpoints
  {
    path: '/api/descriptions/generate',
    method: 'GET',
    name: 'Description Generation Info',
    category: 'Content',
    expectedStatus: [200],
    requiredFields: ['success', 'data', 'metadata']
  },
  {
    path: '/api/descriptions/generate',
    method: 'POST',
    name: 'Generate Descriptions',
    category: 'Content',
    expectedStatus: [200, 400, 413, 500],
    requiresBody: true,
    testBodies: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        style: 'conversacional',
        maxLength: 150
      }
    ]
  },
  
  // Image search endpoints
  {
    path: '/api/images/search',
    method: 'GET',
    name: 'Image Search',
    category: 'Content',
    expectedStatus: [200, 400],
    requiredFields: ['images'],
    tests: [
      { params: '?query=mountain&page=1&per_page=10', description: 'Basic image search' },
      { params: '?query=ocean&orientation=landscape', description: 'Filtered search' }
    ]
  },

  // Translation endpoints
  {
    path: '/api/translate',
    method: 'GET',
    name: 'Translation Info',
    category: 'Translation',
    expectedStatus: [200],
    requiredFields: ['status', 'supportedLanguages', 'features']
  },
  {
    path: '/api/translate',
    method: 'POST',
    name: 'Translate Text',
    category: 'Translation',
    expectedStatus: [200, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        text: 'hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      }
    ]
  },

  // Q&A generation endpoints
  {
    path: '/api/qa/generate',
    method: 'GET',
    name: 'Q&A Generation Info',
    category: 'Content',
    expectedStatus: [200],
    requiredFields: ['endpoint', 'method', 'parameters']
  },
  {
    path: '/api/qa/generate',
    method: 'POST',
    name: 'Generate Q&A',
    category: 'Content',
    expectedStatus: [200, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        description: 'This is a beautiful mountain landscape with snow-covered peaks.',
        language: 'es',
        count: 3
      }
    ]
  },

  // Phrase extraction endpoints
  {
    path: '/api/phrases/extract',
    method: 'POST',
    name: 'Extract Phrases',
    category: 'Content',
    expectedStatus: [200, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        descriptionText: 'A beautiful mountain landscape with snow and trees.',
        targetLevel: 'intermediate',
        maxPhrases: 10
      }
    ]
  },

  // Vocabulary endpoints
  {
    path: '/api/vocabulary/save',
    method: 'GET',
    name: 'Get Vocabulary',
    category: 'Data',
    expectedStatus: [200, 400, 500],
    requiredFields: ['success'],
    tests: [
      { params: '?userId=test&limit=5', description: 'Get user vocabulary' },
      { params: '?category=nouns&difficulty=intermediate', description: 'Filtered vocabulary' }
    ]
  },
  {
    path: '/api/vocabulary/save',
    method: 'POST',
    name: 'Save Vocabulary',
    category: 'Data',
    expectedStatus: [201, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        userId: 'test-user',
        vocabulary: {
          id: 'test-vocab-1',
          phrase: 'montaña',
          definition: 'A large natural elevation of the earth\'s surface',
          category: 'nature',
          difficulty: 'beginner'
        },
        collectionName: 'test-collection'
      }
    ]
  },

  // Settings endpoints
  {
    path: '/api/settings/save',
    method: 'GET',
    name: 'Get Settings',
    category: 'Settings',
    expectedStatus: [200, 400, 500],
    requiredFields: ['success', 'data'],
    tests: [
      { params: '?userId=test', description: 'Get user settings' },
      { params: '?section=language', description: 'Get language settings' }
    ]
  },
  {
    path: '/api/settings/save',
    method: 'POST',
    name: 'Save Settings',
    category: 'Settings',
    expectedStatus: [200, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        userId: 'test-user',
        settings: {
          language: { primary: 'es', secondary: 'en' },
          interface: { theme: 'dark' }
        }
      }
    ]
  },

  // Progress tracking endpoints
  {
    path: '/api/progress/track',
    method: 'GET',
    name: 'Get Progress',
    category: 'Progress',
    expectedStatus: [200, 400, 500],
    requiredFields: ['success'],
    tests: [
      { params: '?userId=test', description: 'Get user progress' },
      { params: '?aggregation=daily&dateFrom=2024-01-01', description: 'Aggregated progress' }
    ]
  },
  {
    path: '/api/progress/track',
    method: 'POST',
    name: 'Track Progress Event',
    category: 'Progress',
    expectedStatus: [201, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        userId: 'test-user',
        eventType: 'vocabulary_learned',
        eventData: {
          vocabularyId: 'test-vocab-1',
          difficulty: 'intermediate',
          score: 0.8,
          timeSpent: 30
        }
      }
    ]
  },

  // Export endpoints
  {
    path: '/api/export/generate',
    method: 'GET',
    name: 'Export Download',
    category: 'Export',
    expectedStatus: [200, 400, 404],
    tests: [
      { params: '?filename=nonexistent.json', description: 'Non-existent file (should 404)' }
    ]
  },
  {
    path: '/api/export/generate',
    method: 'POST',
    name: 'Generate Export',
    category: 'Export',
    expectedStatus: [200, 400, 500],
    requiresBody: true,
    testBodies: [
      {
        userId: 'test-user',
        exportType: 'json',
        contentType: 'vocabulary',
        filters: {},
        formatting: { template: 'minimal' }
      }
    ]
  }
];

// Test a single endpoint
async function testEndpoint(endpoint) {
  const testResults = {
    name: endpoint.name,
    path: endpoint.path,
    method: endpoint.method,
    category: endpoint.category,
    passed: false,
    warnings: [],
    errors: [],
    responseTime: 0,
    status: null,
    tests: []
  };

  logInfo(`Testing ${endpoint.method} ${endpoint.path} - ${endpoint.name}`);

  try {
    // Test different variations if specified
    const tests = endpoint.tests || [{ params: '', description: 'Basic test' }];
    
    for (const test of tests) {
      const testResult = await runSingleTest(endpoint, test, testResults);
      testResults.tests.push(testResult);
      
      if (!testResult.passed && testResult.critical) {
        testResults.errors.push(`Critical test failed: ${testResult.description}`);
      }
    }

    // Test with request bodies if required
    if (endpoint.requiresBody && endpoint.testBodies) {
      for (const body of endpoint.testBodies) {
        const testResult = await runBodyTest(endpoint, body, testResults);
        testResults.tests.push(testResult);
      }
    }

    // Determine overall result
    const criticalFailures = testResults.tests.filter(t => !t.passed && t.critical);
    testResults.passed = criticalFailures.length === 0;

  } catch (error) {
    testResults.errors.push(`Endpoint test failed: ${error.message}`);
    testResults.passed = false;
  }

  return testResults;
}

// Run a single test variation
async function runSingleTest(endpoint, test, testResults) {
  const url = `${CONFIG.baseUrl}${endpoint.path}${test.params || ''}`;
  const testResult = {
    description: test.description || 'Basic test',
    url,
    passed: false,
    critical: true,
    responseTime: 0,
    status: null,
    errors: [],
    warnings: []
  };

  try {
    const response = await makeRequest(url, { method: endpoint.method });
    
    testResult.responseTime = response.responseTime;
    testResult.status = response.status;
    testResults.responseTime = Math.max(testResults.responseTime, response.responseTime);

    // Check if status code is expected
    if (endpoint.expectedStatus.includes(response.status)) {
      testResult.passed = true;
      
      // Additional validation for successful responses
      if (response.ok && response.data && endpoint.requiredFields) {
        validateRequiredFields(response.data, endpoint.requiredFields, testResult);
      }

      // Performance checks
      if (response.responseTime > 5000) {
        testResult.warnings.push(`Slow response time: ${response.responseTime.toFixed(2)}ms`);
      }

      // Security header checks
      validateSecurityHeaders(response.headers, testResult);
      
    } else {
      testResult.errors.push(`Unexpected status code: ${response.status} (expected: ${endpoint.expectedStatus.join(', ')})`);
    }

  } catch (error) {
    testResult.errors.push(`Request failed: ${error.message}`);
    if (error.name === 'AbortError') {
      testResult.errors.push('Request timed out');
    }
  }

  return testResult;
}

// Run test with request body
async function runBodyTest(endpoint, body, testResults) {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  const testResult = {
    description: `POST with body: ${JSON.stringify(body).substring(0, 50)}...`,
    url,
    passed: false,
    critical: true,
    responseTime: 0,
    status: null,
    errors: [],
    warnings: []
  };

  try {
    const response = await makeRequest(url, {
      method: endpoint.method,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });

    testResult.responseTime = response.responseTime;
    testResult.status = response.status;

    if (endpoint.expectedStatus.includes(response.status)) {
      testResult.passed = true;
      
      if (response.ok && response.data && endpoint.requiredFields) {
        validateRequiredFields(response.data, endpoint.requiredFields, testResult);
      }
    } else {
      testResult.errors.push(`Unexpected status code: ${response.status} (expected: ${endpoint.expectedStatus.join(', ')})`);
    }

  } catch (error) {
    testResult.errors.push(`Request failed: ${error.message}`);
  }

  return testResult;
}

// Validate required fields in response
function validateRequiredFields(data, requiredFields, testResult) {
  for (const field of requiredFields) {
    if (!(field in data)) {
      testResult.warnings.push(`Missing required field: ${field}`);
    }
  }
}

// Validate security headers
function validateSecurityHeaders(headers, testResult) {
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options', 
    'x-xss-protection',
    'referrer-policy'
  ];

  const missingHeaders = securityHeaders.filter(header => !headers[header]);
  if (missingHeaders.length > 0) {
    testResult.warnings.push(`Missing security headers: ${missingHeaders.join(', ')}`);
  }
}

// Test external API connections
async function testExternalAPIs() {
  logInfo('Testing external API connections...');

  // Test OpenAI connectivity
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/descriptions/generate`, {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        style: 'conversacional',
        maxLength: 50
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    results.external_apis.openai.tested = true;
    results.external_apis.openai.available = response.ok && 
      response.data && !response.data.metadata?.demoMode;
    
    if (!results.external_apis.openai.available && response.data?.metadata?.demoMode) {
      results.external_apis.openai.error = 'Running in demo mode - API key not configured';
    }
    
  } catch (error) {
    results.external_apis.openai.tested = true;
    results.external_apis.openai.error = error.message;
  }

  // Test Unsplash connectivity  
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/images/search?query=mountain&per_page=1`);
    
    results.external_apis.unsplash.tested = true;
    results.external_apis.unsplash.available = response.ok && 
      response.data && response.data.images && response.data.images.length > 0 &&
      !response.data.images[0].id?.startsWith('demo');
      
    if (!results.external_apis.unsplash.available && response.data?.images?.[0]?.id?.startsWith('demo')) {
      results.external_apis.unsplash.error = 'Using demo images - API key not configured';
    }
    
  } catch (error) {
    results.external_apis.unsplash.tested = true;
    results.external_apis.unsplash.error = error.message;
  }

  // Test Supabase connectivity (via vocabulary endpoint)
  try {
    const response = await makeRequest(`${CONFIG.baseUrl}/api/vocabulary/save?userId=test&limit=1`);
    
    results.external_apis.supabase.tested = true;
    results.external_apis.supabase.available = response.ok;
    
  } catch (error) {
    results.external_apis.supabase.tested = true;
    results.external_apis.supabase.error = error.message;
  }
}

// Run all endpoint tests
async function runAllTests() {
  log(`\n${colors.bright}🚀 Starting API Endpoint Verification${colors.reset}`);
  log(`Base URL: ${CONFIG.baseUrl}`);
  log(`Testing ${API_ENDPOINTS.length} endpoints...`);
  
  // Test endpoints in batches to avoid overwhelming the server
  const batches = [];
  for (let i = 0; i < API_ENDPOINTS.length; i += CONFIG.concurrency) {
    batches.push(API_ENDPOINTS.slice(i, i + CONFIG.concurrency));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(endpoint => testEndpoint(endpoint));
    const batchResults = await Promise.all(batchPromises);
    results.endpoints.push(...batchResults);
  }

  // Test external APIs
  await testExternalAPIs();

  // Calculate summary statistics
  results.summary.total = results.endpoints.length;
  results.summary.passed = results.endpoints.filter(e => e.passed).length;
  results.summary.failed = results.endpoints.filter(e => !e.passed).length;
  results.summary.warnings = results.endpoints.reduce((sum, e) => sum + e.warnings.length, 0);
  results.summary.totalResponseTime = results.endpoints.reduce((sum, e) => sum + e.responseTime, 0);
  results.summary.averageResponseTime = results.summary.totalResponseTime / results.summary.total;
}

// Generate report
function generateReport() {
  log(`\n${colors.bright}📊 Test Results Summary${colors.reset}`);
  log(`Total Endpoints: ${results.summary.total}`);
  logSuccess(`Passed: ${results.summary.passed}`);
  if (results.summary.failed > 0) {
    logError(`Failed: ${results.summary.failed}`);
  }
  if (results.summary.warnings > 0) {
    logWarning(`Warnings: ${results.summary.warnings}`);
  }
  log(`Average Response Time: ${results.summary.averageResponseTime.toFixed(2)}ms`);

  // Detailed results by category
  const categories = [...new Set(results.endpoints.map(e => e.category))];
  log(`\n${colors.bright}📋 Results by Category:${colors.reset}`);
  
  categories.forEach(category => {
    const categoryEndpoints = results.endpoints.filter(e => e.category === category);
    const passed = categoryEndpoints.filter(e => e.passed).length;
    const total = categoryEndpoints.length;
    
    log(`\n${colors.cyan}${category}:${colors.reset} ${passed}/${total} passed`);
    
    categoryEndpoints.forEach(endpoint => {
      const status = endpoint.passed ? '✅' : '❌';
      const responseTime = endpoint.responseTime.toFixed(2);
      log(`  ${status} ${endpoint.method} ${endpoint.path} (${responseTime}ms)`);
      
      if (CONFIG.detailed) {
        endpoint.errors.forEach(error => log(`    ❌ ${error}`, colors.red));
        endpoint.warnings.forEach(warning => log(`    ⚠️ ${warning}`, colors.yellow));
      }
    });
  });

  // External APIs status
  log(`\n${colors.bright}🔗 External API Status:${colors.reset}`);
  Object.entries(results.external_apis).forEach(([api, status]) => {
    if (status.tested) {
      const statusIcon = status.available ? '✅' : '❌';
      log(`  ${statusIcon} ${api.toUpperCase()}: ${status.available ? 'Available' : 'Unavailable'}`);
      if (status.error) {
        log(`    Error: ${status.error}`, colors.yellow);
      }
    } else {
      log(`  ⚪ ${api.toUpperCase()}: Not tested`);
    }
  });

  // Save detailed report to file
  const reportPath = path.join(__dirname, '..', 'api-verification-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    logSuccess(`Detailed report saved to: ${reportPath}`);
  } catch (error) {
    logWarning(`Failed to save report: ${error.message}`);
  }

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

// Main execution
async function main() {
  try {
    await runAllTests();
    generateReport();
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  console.error(error);
  process.exit(1);
});

// Run the main function
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}

export { testEndpoint, runAllTests, CONFIG, API_ENDPOINTS };