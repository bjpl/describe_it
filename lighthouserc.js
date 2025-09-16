module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000",
        "http://localhost:3000/learn",
        "http://localhost:3000/practice",
        "http://localhost:3000/progress",
      ],
      startServerCommand: "npm start",
      startServerReadyPattern: "ready on",
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "categories:pwa": ["warn", { minScore: 0.8 }],

        // Performance metrics
        "first-contentful-paint": ["error", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "speed-index": ["error", { maxNumericValue: 3000 }],

        // Accessibility
        "color-contrast": "error",
        "image-alt": "error",
        label: "error",
        "valid-lang": "error",

        // Best practices
        "uses-https": "error",
        "no-vulnerable-libraries": "error",
        charset: "error",

        // SEO
        "meta-description": "error",
        "document-title": "error",
        canonical: "warn",

        // PWA
        viewport: "error",
        "installable-manifest": "warn",
        "splash-screen": "warn",
        "themed-omnibox": "warn",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
    server: {
      port: 9001,
      storage: "./lighthouse-reports",
    },
  },
};
