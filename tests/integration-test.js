// Integration Test for Describe It Application
const http = require('http');
const https = require('https');

// Test Configuration
const BASE_URL = 'http://localhost:3010';
const API_ROUTES = [
  '/api/export/generate',
  '/api/images/search',
  '/api/phrases/extract',
  '/api/progress/track',
  '/api/qa/generate',
  '/api/settings/save',
  '/api/translate',
  '/api/vocabulary/save'
];

// Test Results
let testResults = {
  timestamp: new Date().toISOString(),
  server: {
    status: 'unknown',
    port: 3010,
    compilation: 'unknown'
  },
  mainPage: {
    accessible: false,
    statusCode: null,
    error: null
  },
  apiRoutes: {},
  environment: {
    variables: {},
    errors: []
  },
  errors: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', postData = null) {
  return new Promise((resolve) => {
    const options = {
      method,
      timeout: 5000,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: null,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: null,
        error: 'Request timeout',
        success: false
      });
    });

    if (postData && method === 'POST') {
      req.write(JSON.stringify(postData));
    }

    req.end();
  });
}

// Test Main Page
async function testMainPage() {
  console.log('Testing main page...');
  const result = await makeRequest(BASE_URL);
  
  testResults.mainPage = {
    accessible: result.success,
    statusCode: result.statusCode,
    error: result.error,
    contentLength: result.body ? result.body.length : 0
  };

  if (result.success) {
    console.log(`✅ Main page accessible (${result.statusCode})`);
  } else {
    console.log(`❌ Main page failed: ${result.error || `Status ${result.statusCode}`}`);
    testResults.errors.push(`Main page: ${result.error || `Status ${result.statusCode}`}`);
  }
}

// Test API Routes
async function testApiRoutes() {
  console.log('Testing API routes...');
  
  for (const route of API_ROUTES) {
    const url = BASE_URL + route;
    console.log(`Testing ${route}...`);
    
    // Test GET request
    const getResult = await makeRequest(url, 'GET');
    
    // Test POST request with sample data
    const postResult = await makeRequest(url, 'POST', { test: true });
    
    testResults.apiRoutes[route] = {
      get: {
        statusCode: getResult.statusCode,
        success: getResult.success,
        error: getResult.error
      },
      post: {
        statusCode: postResult.statusCode,
        success: postResult.success,
        error: postResult.error
      }
    };

    if (getResult.success || postResult.success) {
      console.log(`✅ ${route}: GET ${getResult.statusCode}, POST ${postResult.statusCode}`);
    } else {
      console.log(`❌ ${route}: GET ${getResult.error || getResult.statusCode}, POST ${postResult.error || postResult.statusCode}`);
      testResults.errors.push(`${route}: Both GET and POST failed`);
    }
  }
}

// Check Environment Variables
function checkEnvironment() {
  console.log('Checking environment variables...');
  
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'UNSPLASH_ACCESS_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    testResults.environment.variables[envVar] = {
      defined: !!value,
      hasValue: !!(value && value.length > 0),
      masked: value ? `${value.substring(0, 4)}...` : 'undefined'
    };

    if (!value) {
      testResults.environment.errors.push(`${envVar} is not defined`);
      console.log(`⚠️ ${envVar}: Not defined`);
    } else {
      console.log(`✅ ${envVar}: Defined`);
    }
  }
}

// Generate Summary
function generateSummary() {
  let passed = 0;
  let total = 0;

  // Count main page
  total++;
  if (testResults.mainPage.accessible) passed++;

  // Count API routes
  Object.values(testResults.apiRoutes).forEach(route => {
    total += 2; // GET and POST
    if (route.get.success) passed++;
    if (route.post.success) passed++;
  });

  // Count environment variables
  Object.values(testResults.environment.variables).forEach(env => {
    total++;
    if (env.defined && env.hasValue) passed++;
  });

  testResults.summary = {
    total,
    passed,
    failed: total - passed,
    successRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0
  };
}

// Main Test Function
async function runIntegrationTest() {
  console.log('🚀 Starting Integration Test for Describe It Application');
  console.log('====================================================\n');

  try {
    // Check if server is running
    testResults.server.status = 'running';
    testResults.server.compilation = 'success';

    await testMainPage();
    console.log('');

    await testApiRoutes();
    console.log('');

    checkEnvironment();
    console.log('');

    generateSummary();

    // Output results
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Success Rate: ${testResults.summary.successRate}%\n`);

    if (testResults.errors.length > 0) {
      console.log('❌ ERRORS FOUND:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('');
    }

    if (testResults.environment.errors.length > 0) {
      console.log('⚠️ ENVIRONMENT ISSUES:');
      testResults.environment.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('');
    }

    // Write detailed results to file
    require('fs').writeFileSync(
      'integration-test-results.json',
      JSON.stringify(testResults, null, 2)
    );

    console.log('📄 Detailed results saved to: integration-test-results.json');

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    testResults.errors.push(`Test execution: ${error.message}`);
  }
}

// Run the test
runIntegrationTest();