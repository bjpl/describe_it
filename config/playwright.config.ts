import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Enhanced configuration with:
 * - Tag-based test filtering (@smoke, @critical, etc.)
 * - Mobile viewport support
 * - Comprehensive reporting
 * - Parallel execution
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",

  /* Test organization */
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: "test-results/playwright-report" }],
    ["json", { outputFile: "test-results/e2e-results.json" }],
    ["junit", { outputFile: "test-results/e2e-results.xml" }],
    ["list"],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Global test timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Ignore HTTPS errors (for local development) */
    ignoreHTTPSErrors: true,

    /* Viewport size */
    viewport: { width: 1280, height: 720 },

    /* Locale and timezone */
    locale: "en-US",
    timezoneId: "America/New_York",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers. */
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Test timeout */
  timeout: 60000, // Increased for comprehensive E2E tests
  expect: {
    timeout: 10000, // Increased for better stability
  },

  /* Global setup and teardown */
  globalSetup: require.resolve("../tests/e2e/global-setup.ts"),
  globalTeardown: require.resolve("../tests/e2e/global-teardown.ts"),

  /* Metadata */
  metadata: {
    project: "describe-it",
    testType: "e2e",
    architecture: "Page Object Model",
  },
});
