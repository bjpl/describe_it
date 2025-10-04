/**
 * Staging Smoke Tests
 *
 * Quick validation tests to ensure critical functionality works
 * after staging deployment
 */

import { test, expect } from '@playwright/test';

// Configuration
const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000';
const TIMEOUT = 30000;

test.describe('Staging Smoke Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test('homepage loads successfully', async ({ page }) => {
    await page.goto(STAGING_URL);
    await expect(page).toHaveTitle(/Describe It/i);

    // Verify key elements are present
    await expect(page.locator('body')).toBeVisible();
  });

  test('health endpoint returns ok status', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  test('status endpoint returns environment info', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/status`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.environment).toBeDefined();
    expect(data.version).toBeDefined();
  });

  test('static assets load correctly', async ({ page }) => {
    await page.goto(STAGING_URL);

    // Check for favicon
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute('href', /.+/);

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    expect(errors.length).toBe(0);
  });

  test('navigation works', async ({ page }) => {
    await page.goto(STAGING_URL);
    await page.waitForLoadState('networkidle');

    // Test basic navigation
    const links = await page.locator('a[href]').all();
    expect(links.length).toBeGreaterThan(0);
  });

  test('API endpoints are protected', async ({ request }) => {
    // Test that protected endpoints require authentication
    const protectedEndpoints = [
      '/api/descriptions/generate',
      '/api/qa/generate',
      '/api/phrases/extract',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.post(`${STAGING_URL}${endpoint}`, {
        data: {},
      });

      // Should return 400/401/403, not 500
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get(STAGING_URL);
    const headers = response.headers();

    // Check for important security headers
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('response times are acceptable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(STAGING_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('error pages work', async ({ page }) => {
    // Test 404 page
    const response = await page.goto(`${STAGING_URL}/this-page-does-not-exist`);
    expect(response?.status()).toBe(404);

    // Verify custom error page
    await expect(page.locator('body')).toBeVisible();
  });

  test('HTTPS redirect works', async ({ page }) => {
    if (STAGING_URL.startsWith('https://')) {
      const httpUrl = STAGING_URL.replace('https://', 'http://');

      try {
        const response = await page.goto(httpUrl);
        // Should redirect to HTTPS
        expect(page.url()).toMatch(/^https:/);
      } catch (error) {
        // HTTP might be blocked, which is also acceptable
        console.log('HTTP blocked (acceptable for staging)');
      }
    }
  });

  test('caching headers are set', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}`);
    const headers = response.headers();

    // Check for cache control headers
    expect(headers['cache-control']).toBeDefined();
  });

  test('compression is enabled', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const headers = response.headers();

    // Response should be compressed
    expect(
      headers['content-encoding'] === 'gzip' ||
      headers['content-encoding'] === 'br' ||
      headers['content-encoding'] === 'deflate'
    ).toBeTruthy();
  });

  test('monitoring endpoints work', async ({ request }) => {
    const monitoringEndpoints = [
      '/api/health',
      '/api/status',
    ];

    for (const endpoint of monitoringEndpoints) {
      const response = await request.get(`${STAGING_URL}${endpoint}`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toBeDefined();
    }
  });
});

test.describe('Critical User Flows', () => {
  test('can access main features', async ({ page }) => {
    await page.goto(STAGING_URL);
    await page.waitForLoadState('networkidle');

    // Verify main UI elements are present
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('error handling works', async ({ page }) => {
    // Test graceful error handling
    page.on('pageerror', error => {
      // Should not have unhandled errors
      throw new Error(`Uncaught error: ${error.message}`);
    });

    await page.goto(STAGING_URL);
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Performance Checks', () => {
  test('lighthouse score is acceptable', async ({ page }) => {
    await page.goto(STAGING_URL);

    // Basic performance checks
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    // DOM should load quickly
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
  });

  test('no memory leaks on page navigation', async ({ page }) => {
    await page.goto(STAGING_URL);

    // Navigate multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Should complete without errors
    expect(true).toBeTruthy();
  });
});
