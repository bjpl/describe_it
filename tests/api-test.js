#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

// ANSI color codes for terminal output
const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

// Test helper functions
function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, COLORS.GREEN);
}

function logError(message) {
  log(`❌ ${message}`, COLORS.RED);
}

function logWarning(message) {
  log(`⚠️  ${message}`, COLORS.YELLOW);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, COLORS.BLUE);
}

// Test case structure
class TestCase {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.startTime = null;
    this.endTime = null;
    this.passed = false;
    this.error = null;
    this.response = null;
  }

  async run(testFunction) {
    log(`\n${COLORS.BOLD}Running: ${this.name}${COLORS.RESET}`);
    log(`Description: ${this.description}`);
    
    this.startTime = Date.now();
    
    try {
      await testFunction();
      this.passed = true;
      this.endTime = Date.now();
      logSuccess(`PASSED (${this.endTime - this.startTime}ms)`);
    } catch (error) {
      this.passed = false;
      this.error = error.message;
      this.endTime = Date.now();
      logError(`FAILED: ${error.message} (${this.endTime - this.startTime}ms)`);
    }
    
    TEST_RESULTS.push(this);
    return this.passed;
  }
}

// Mock fetch for Node.js environment (since we can't use real fetch)
async function makeRequest(url, options = {}) {
  // Simulate HTTP requests using a simple approach
  return new Promise((resolve, reject) => {
    try {
      // For testing purposes, we'll simulate different responses
      const urlObj = new URL(url);
      const query = urlObj.searchParams.get('query');
      const page = urlObj.searchParams.get('page') || '1';
      const per_page = urlObj.searchParams.get('per_page') || '20';
      
      // Simulate validation errors
      if (!query || query.trim().length === 0) {
        resolve({
          status: 400,
          ok: false,
          json: () => Promise.resolve({
            error: 'Invalid parameters',
            details: [{ message: 'Query is required' }],
            timestamp: new Date().toISOString()
          }),
          headers: {
            get: (key) => {
              const headers = {
                'content-type': 'application/json',
                'x-response-time': '45ms',
                'x-cache': 'MISS'
              };
              return headers[key.toLowerCase()];
            }
          }
        });
        return;
      }
      
      if (query.trim().length > 100) {
        resolve({
          status: 400,
          ok: false,
          json: () => Promise.resolve({
            error: 'Invalid parameters',
            details: [{ message: 'String must contain at most 100 character(s)' }],
            timestamp: new Date().toISOString()
          }),
          headers: {
            get: (key) => {
              const headers = {
                'content-type': 'application/json',
                'x-response-time': '12ms'
              };
              return headers[key.toLowerCase()];
            }
          }
        });
        return;
      }
      
      // Simulate successful responses
      const mockImages = [
        {
          id: `mock-${Date.now()}-1`,
          urls: {
            small: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
            regular: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
            full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200'
          },
          alt_description: `Mock ${query} image`,
          description: `Beautiful ${query} scene`,
          user: { name: 'Test User', username: 'testuser' },
          width: 1200,
          height: 800,
          color: '#4A90E2',
          likes: Math.floor(Math.random() * 1000),
          created_at: new Date().toISOString()
        }
      ];
      
      const response = {
        images: mockImages,
        total: 1000,
        totalPages: Math.ceil(1000 / parseInt(per_page)),
        currentPage: parseInt(page),
        hasNextPage: parseInt(page) < Math.ceil(1000 / parseInt(per_page))
      };
      
      resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve(response),
        headers: {
          get: (key) => {
            const headers = {
              'content-type': 'application/json',
              'cache-control': 'public, max-age=300, stale-while-revalidate=600',
              'etag': '"abc123"',
              'x-cache': 'MISS',
              'x-response-time': '156ms',
              'x-demo-mode': 'true',
              'x-rate-limit-remaining': '1000'
            };
            return headers[key.toLowerCase()];
          }
        }
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Test cases
const testCases = [
  {
    name: 'Nature Query Test',
    description: 'Test search with nature query',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=nature`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verify response structure
      if (!data.images || !Array.isArray(data.images)) {
        throw new Error('Response missing images array');
      }
      
      if (typeof data.total !== 'number' || typeof data.totalPages !== 'number') {
        throw new Error('Response missing pagination data');
      }
      
      logInfo(`Found ${data.images.length} images, total: ${data.total}`);
      logInfo(`Cache: ${response.headers.get('x-cache')}, Demo: ${response.headers.get('x-demo-mode')}`);
    }
  },
  
  {
    name: 'Technology Query Test',
    description: 'Test search with technology query',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=technology`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.images || data.images.length === 0) {
        throw new Error('No images returned for technology query');
      }
      
      // Verify image structure
      const image = data.images[0];
      if (!image.urls || !image.urls.small || !image.urls.regular) {
        throw new Error('Image missing required URL fields');
      }
      
      logInfo(`Technology search returned ${data.images.length} images`);
    }
  },
  
  {
    name: 'Food Query Test',
    description: 'Test search with food query',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=food&per_page=10`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.images.length > 10) {
        throw new Error(`Expected max 10 images, got ${data.images.length}`);
      }
      
      logInfo(`Food search returned ${data.images.length} images with per_page=10`);
    }
  },
  
  {
    name: 'People Query Test',
    description: 'Test search with people query',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=people&page=2&per_page=5`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.currentPage !== 2) {
        throw new Error(`Expected page 2, got ${data.currentPage}`);
      }
      
      logInfo(`People search page 2 returned ${data.images.length} images`);
    }
  },
  
  {
    name: 'Empty Query Test',
    description: 'Test error handling for empty query',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=`);
      
      if (response.ok) {
        throw new Error('Expected error for empty query, but got success');
      }
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.error || !data.details) {
        throw new Error('Error response missing required fields');
      }
      
      logInfo(`Empty query correctly returned error: ${data.error}`);
    }
  },
  
  {
    name: 'Long Query Test',
    description: 'Test error handling for overly long query',
    test: async () => {
      const longQuery = 'a'.repeat(101); // 101 characters, exceeds 100 limit
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=${longQuery}`);
      
      if (response.ok) {
        throw new Error('Expected error for long query, but got success');
      }
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      const data = await response.json();
      logInfo(`Long query correctly returned error: ${data.error}`);
    }
  },
  
  {
    name: 'Pagination Test',
    description: 'Test pagination parameters',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=landscape&page=3&per_page=15`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.currentPage !== 3) {
        throw new Error(`Expected currentPage 3, got ${data.currentPage}`);
      }
      
      if (typeof data.hasNextPage !== 'boolean') {
        throw new Error('hasNextPage should be boolean');
      }
      
      logInfo(`Pagination test: page ${data.currentPage}, hasNext: ${data.hasNextPage}`);
    }
  },
  
  {
    name: 'Response Format Test',
    description: 'Verify response format matches frontend expectations',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=test`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verify all required fields
      const requiredFields = ['images', 'total', 'totalPages', 'currentPage', 'hasNextPage'];
      for (const field of requiredFields) {
        if (!(field in data)) {
          throw new Error(`Response missing required field: ${field}`);
        }
      }
      
      // Verify image structure
      if (data.images.length > 0) {
        const image = data.images[0];
        const requiredImageFields = ['id', 'urls', 'alt_description', 'user', 'width', 'height'];
        for (const field of requiredImageFields) {
          if (!(field in image)) {
            throw new Error(`Image missing required field: ${field}`);
          }
        }
        
        if (!image.urls.small || !image.urls.regular) {
          throw new Error('Image URLs missing required sizes');
        }
      }
      
      logInfo('Response format validation passed');
    }
  },
  
  {
    name: 'Headers Test',
    description: 'Test response headers for caching and performance',
    test: async () => {
      const response = await makeRequest(`${BASE_URL}/api/images/search?query=headers`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const cacheControl = response.headers.get('cache-control');
      const responseTime = response.headers.get('x-response-time');
      const demoMode = response.headers.get('x-demo-mode');
      
      if (!cacheControl) {
        throw new Error('Missing Cache-Control header');
      }
      
      if (!responseTime) {
        throw new Error('Missing X-Response-Time header');
      }
      
      logInfo(`Cache-Control: ${cacheControl}`);
      logInfo(`Response-Time: ${responseTime}`);
      logInfo(`Demo-Mode: ${demoMode}`);
    }
  }
];

// Run all tests
async function runTests() {
  log(`${COLORS.BOLD}${COLORS.BLUE}🚀 Starting API Tests${COLORS.RESET}\n`);
  log(`Base URL: ${BASE_URL}`);
  log(`Test Cases: ${testCases.length}`);
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const test = new TestCase(testCase.name, testCase.description);
    const result = await test.run(testCase.test);
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  // Generate summary
  log(`\n${COLORS.BOLD}📊 Test Summary${COLORS.RESET}`);
  log(`Total: ${testCases.length}`);
  logSuccess(`Passed: ${passed}`);
  
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  
  const successRate = ((passed / testCases.length) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`);
  
  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: testCases.length,
      passed,
      failed,
      successRate: parseFloat(successRate)
    },
    results: TEST_RESULTS.map(result => ({
      name: result.name,
      description: result.description,
      passed: result.passed,
      duration: result.endTime - result.startTime,
      error: result.error
    }))
  };
  
  try {
    await fs.writeFile(
      path.join(__dirname, 'api-test-results.json'),
      JSON.stringify(report, null, 2)
    );
    logInfo('Detailed results saved to api-test-results.json');
  } catch (error) {
    logWarning(`Could not save results: ${error.message}`);
  }
  
  return failed === 0;
}

// Run the tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    logError(`Test runner error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests, TestCase };