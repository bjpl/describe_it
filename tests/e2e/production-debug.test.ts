/**
 * End-to-End Production Debugging Tests for Image Search
 * 
 * These tests specifically target the production environment at:
 * https://describe-it-lovat.vercel.app
 * 
 * They simulate user interactions and validate the complete request chain
 * to identify where failures occur in the live environment.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Production URL
const PRODUCTION_URL = 'https://describe-it-lovat.vercel.app';

// Helper function to monitor network requests
async function setupNetworkMonitoring(page: Page) {
  const requests: any[] = [];
  const responses: any[] = [];
  
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: Date.now()
    });
  });

  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      timestamp: Date.now()
    });
  });

  return { requests, responses };
}

// Helper function to inject console monitoring
async function setupConsoleMonitoring(page: Page) {
  const logs: any[] = [];
  const errors: any[] = [];

  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: Date.now()
    });
  });

  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: Date.now()
    });
  });

  return { logs, errors };
}

test.describe('Production Image Search Debugging', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('1. Validate API Key Retrieval from localStorage', async () => {
    // Setup monitoring
    const { logs, errors } = await setupConsoleMonitoring(page);

    // Navigate to production site
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    // Check if localStorage has API keys
    const localStorageData = await page.evaluate(() => {
      try {
        const settingsStr = localStorage.getItem('app-settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          return {
            hasSettings: true,
            hasApiKeys: !!settings.data?.apiKeys,
            hasUnsplashKey: !!settings.data?.apiKeys?.unsplash,
            unsplashKeyLength: settings.data?.apiKeys?.unsplash?.length || 0,
            settingsStructure: Object.keys(settings.data || {})
          };
        }
        return { hasSettings: false };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('localStorage Analysis:', localStorageData);

    // Test API key validation
    const apiKeyValidation = await page.evaluate(() => {
      try {
        const settingsStr = localStorage.getItem('app-settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const unsplashKey = settings.data?.apiKeys?.unsplash;
          
          if (unsplashKey) {
            // Check key format (should match Unsplash pattern)
            const isValidFormat = /^[a-zA-Z0-9_-]{20,}$/.test(unsplashKey);
            const isNotPlaceholder = !unsplashKey.toLowerCase().includes('demo') && 
                                   !unsplashKey.toLowerCase().includes('test') &&
                                   !unsplashKey.toLowerCase().includes('example');
            
            return {
              keyPresent: true,
              validFormat: isValidFormat,
              notPlaceholder: isNotPlaceholder,
              keyPreview: unsplashKey.substring(0, 8) + '...'
            };
          }
        }
        return { keyPresent: false };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('API Key Validation:', apiKeyValidation);

    // Report findings
    expect(localStorageData.hasSettings).toBe(true);
    
    if (localStorageData.hasUnsplashKey) {
      expect(apiKeyValidation.keyPresent).toBe(true);
      expect(apiKeyValidation.validFormat).toBe(true);
    }
  });

  test('2. Monitor Network Requests During Search', async () => {
    const { requests, responses } = await setupNetworkMonitoring(page);
    const { logs, errors } = await setupConsoleMonitoring(page);

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    // Find and interact with search input
    const searchInput = page.locator('input[placeholder*="Search for images"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Perform a search
    await searchInput.fill('nature');
    await page.waitForTimeout(1000); // Wait for debouncing

    // Wait for potential API calls
    await page.waitForTimeout(3000);

    // Analyze API requests
    const apiRequests = requests.filter(req => 
      req.url.includes('/api/images/search')
    );

    const apiResponses = responses.filter(res => 
      res.url.includes('/api/images/search')
    );

    console.log('API Requests:', apiRequests);
    console.log('API Responses:', apiResponses);
    console.log('Console Logs:', logs.filter(log => log.text.includes('useImageSearch')));
    console.log('Console Errors:', errors);

    // Validate request structure
    if (apiRequests.length > 0) {
      const request = apiRequests[0];
      
      // Check if request URL includes necessary parameters
      expect(request.url).toContain('query=nature');
      expect(request.url).toContain('page=1');
      expect(request.url).toContain('per_page=20');
      
      // Check if API key is included in request
      const hasApiKey = request.url.includes('api_key=') || 
                       Object.values(request.headers).some(header => 
                         typeof header === 'string' && header.includes('Client-ID')
                       );
      
      console.log('Request has API key:', hasApiKey);
      console.log('Request headers:', request.headers);
    }

    // Validate response structure
    if (apiResponses.length > 0) {
      const response = apiResponses[0];
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check for CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    }
  });

  test('3. Test Error States and User Feedback', async () => {
    const { logs, errors } = await setupConsoleMonitoring(page);

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    // Search with empty query first
    const searchInput = page.locator('input[placeholder*="Search for images"]');
    await searchInput.fill('');
    await page.keyboard.press('Enter');

    // Check for error handling
    await page.waitForTimeout(2000);

    // Search with a valid query
    await searchInput.fill('test search query');
    await page.waitForTimeout(1000);

    // Wait and check for loading states
    const loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading, [class*="loading"]');
    const errorMessage = page.locator('[class*="error"], [data-testid="error"]');

    // Check if loading state appears
    try {
      await expect(loadingSpinner).toBeVisible({ timeout: 2000 });
      console.log('Loading state detected');
    } catch {
      console.log('No loading state detected');
    }

    // Wait for completion
    await page.waitForTimeout(5000);

    // Check for error messages
    const errorVisible = await errorMessage.isVisible();
    if (errorVisible) {
      const errorText = await errorMessage.textContent();
      console.log('Error message displayed:', errorText);
    }

    // Check for successful results
    const imageResults = page.locator('[data-testid="image-grid"], [class*="image-grid"], img');
    const hasResults = await imageResults.count() > 0;
    
    console.log('Search completed. Has results:', hasResults);
    console.log('Console errors during search:', errors);
    console.log('Relevant console logs:', logs.filter(log => 
      log.text.includes('useImageSearch') || 
      log.text.includes('API') ||
      log.text.includes('search')
    ));
  });

  test('4. Validate Response Data Structure', async () => {
    const { requests, responses } = await setupNetworkMonitoring(page);

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    // Intercept API responses to examine data structure
    page.on('response', async response => {
      if (response.url().includes('/api/images/search')) {
        try {
          const responseData = await response.json();
          console.log('API Response Data Structure:', {
            hasImages: !!responseData.images,
            hasResults: !!responseData.results,
            imageCount: (responseData.images || responseData.results || []).length,
            hasTotalPages: !!responseData.totalPages || !!responseData.total_pages,
            hasTotal: !!responseData.total,
            structure: Object.keys(responseData)
          });
          
          // Validate expected structure
          const hasValidStructure = responseData.images || responseData.results;
          console.log('Response has valid structure:', hasValidStructure);
          
          if (responseData.images && responseData.images.length > 0) {
            const firstImage = responseData.images[0];
            console.log('First image structure:', {
              hasId: !!firstImage.id,
              hasUrls: !!firstImage.urls,
              hasSmallUrl: !!firstImage.urls?.small,
              hasRegularUrl: !!firstImage.urls?.regular,
              hasUser: !!firstImage.user,
              structure: Object.keys(firstImage)
            });
          }
        } catch (error) {
          console.log('Error parsing API response:', error.message);
        }
      }
    });

    // Perform search
    const searchInput = page.locator('input[placeholder*="Search for images"]');
    await searchInput.fill('mountains');
    await page.waitForTimeout(6000); // Wait for API response
  });

  test('5. Check API Key Provider Integration', async () => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    // Test API key provider functionality
    const keyProviderTest = await page.evaluate(() => {
      // Check if keyProvider is accessible
      try {
        // Try to access the keyProvider if it's exposed globally
        const result = {
          timestamp: Date.now(),
          hasLocalStorage: !!window.localStorage,
          hasSettings: false,
          keyProviderAvailable: false
        };

        // Check settings
        try {
          const settingsStr = localStorage.getItem('app-settings');
          if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            result.hasSettings = true;
            result.settingsData = {
              hasApiKeys: !!settings.data?.apiKeys,
              apiKeyServices: Object.keys(settings.data?.apiKeys || {}),
              unsplashKeyPresent: !!settings.data?.apiKeys?.unsplash
            };
          }
        } catch (e) {
          result.settingsError = e.message;
        }

        return result;
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('Key Provider Integration Test:', keyProviderTest);
  });

  test('6. Full Production Flow Validation', async () => {
    const { requests, responses } = await setupNetworkMonitoring(page);
    const { logs, errors } = await setupConsoleMonitoring(page);

    // Step 1: Navigate to production
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('domcontentloaded');

    // Step 2: Check initial state
    const initialState = await page.evaluate(() => ({
      hasSearchInput: !!document.querySelector('input[placeholder*="Search"]'),
      hasApiSettings: !!localStorage.getItem('app-settings'),
      userAgent: navigator.userAgent,
      location: window.location.href
    }));

    console.log('Initial State:', initialState);

    // Step 3: Perform search
    const searchInput = page.locator('input[placeholder*="Search for images"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    await searchInput.fill('nature landscape');
    
    // Step 4: Monitor the complete flow
    const flowStart = Date.now();
    
    // Wait for debouncing and API call
    await page.waitForTimeout(3000);
    
    // Step 5: Wait for results or error
    await page.waitForTimeout(5000);
    
    const flowEnd = Date.now();
    const flowDuration = flowEnd - flowStart;

    // Step 6: Analyze complete flow
    const flowAnalysis = {
      duration: flowDuration,
      requestCount: requests.length,
      responseCount: responses.length,
      apiRequests: requests.filter(r => r.url.includes('/api/images')),
      apiResponses: responses.filter(r => r.url.includes('/api/images')),
      errorCount: errors.length,
      relevantLogs: logs.filter(l => 
        l.text.includes('useImageSearch') || 
        l.text.includes('API') ||
        l.text.includes('search') ||
        l.text.includes('error')
      )
    };

    console.log('Complete Flow Analysis:', flowAnalysis);

    // Step 7: Check final UI state
    const finalState = await page.evaluate(() => {
      const hasImages = document.querySelectorAll('img').length > 0;
      const hasErrorMessage = !!document.querySelector('[class*="error"]');
      const hasLoadingSpinner = !!document.querySelector('[class*="loading"]');
      
      return {
        hasImages,
        hasErrorMessage,
        hasLoadingSpinner,
        imageCount: document.querySelectorAll('img').length
      };
    });

    console.log('Final UI State:', finalState);

    // Step 8: Generate debugging report
    const debugReport = {
      testUrl: PRODUCTION_URL,
      searchQuery: 'nature landscape',
      flowDuration,
      apiCalls: {
        requested: flowAnalysis.apiRequests.length,
        responded: flowAnalysis.apiResponses.length,
        successful: flowAnalysis.apiResponses.filter(r => r.status < 400).length,
        failed: flowAnalysis.apiResponses.filter(r => r.status >= 400).length
      },
      errors: errors.map(e => ({
        message: e.message,
        name: e.name
      })),
      userInterface: finalState,
      timestamp: new Date().toISOString()
    };

    console.log('=== PRODUCTION DEBUG REPORT ===');
    console.log(JSON.stringify(debugReport, null, 2));

    // Assertions for test validation
    expect(initialState.hasSearchInput).toBe(true);
    expect(errors.length).toBe(0); // Should have no JavaScript errors
    
    if (flowAnalysis.apiRequests.length > 0) {
      expect(flowAnalysis.apiResponses.length).toBeGreaterThan(0);
    }
  });
});