#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Script
 * Runs Lighthouse audits on all pages and generates a comprehensive report
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const PAGES_TO_AUDIT = [
  { name: 'Home', url: 'http://localhost:3000' },
  { name: 'Dashboard', url: 'http://localhost:3000/dashboard' },
  { name: 'Admin', url: 'http://localhost:3000/admin' },
];

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });

  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options, LIGHTHOUSE_CONFIG);

  await chrome.kill();

  return runnerResult;
}

function getScoreRating(score) {
  if (score >= 90) return { rating: 'PASS', color: 'green' };
  if (score >= 70) return { rating: 'NEEDS IMPROVEMENT', color: 'yellow' };
  return { rating: 'FAIL', color: 'red' };
}

async function auditAllPages() {
  console.log('🚀 Starting Lighthouse Performance Audit...\n');

  const results = [];
  const timestamp = new Date().toISOString();

  for (const page of PAGES_TO_AUDIT) {
    console.log(`📊 Auditing: ${page.name} (${page.url})`);

    try {
      const runnerResult = await runLighthouse(page.url);
      const { lhr } = runnerResult;

      const scores = {
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
      };

      const metrics = {
        fcp: lhr.audits['first-contentful-paint'].numericValue,
        lcp: lhr.audits['largest-contentful-paint'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue,
        tbt: lhr.audits['total-blocking-time'].numericValue,
        tti: lhr.audits['interactive'].numericValue,
      };

      results.push({
        page: page.name,
        url: page.url,
        scores,
        metrics,
        timestamp,
      });

      console.log(`  ✅ Performance: ${scores.performance}%`);
      console.log(`  ✅ Accessibility: ${scores.accessibility}%`);
      console.log(`  ✅ Best Practices: ${scores.bestPractices}%`);
      console.log(`  ✅ SEO: ${scores.seo}%\n`);
    } catch (error) {
      console.error(`  ❌ Error auditing ${page.name}:`, error.message);
      results.push({
        page: page.name,
        url: page.url,
        error: error.message,
        timestamp,
      });
    }
  }

  // Generate report
  const report = {
    timestamp,
    summary: {
      totalPages: PAGES_TO_AUDIT.length,
      successfulAudits: results.filter((r) => !r.error).length,
      failedAudits: results.filter((r) => r.error).length,
    },
    results,
  };

  // Calculate averages
  const successfulResults = results.filter((r) => !r.error);
  if (successfulResults.length > 0) {
    report.averages = {
      performance: Math.round(
        successfulResults.reduce((sum, r) => sum + r.scores.performance, 0) /
          successfulResults.length
      ),
      accessibility: Math.round(
        successfulResults.reduce((sum, r) => sum + r.scores.accessibility, 0) /
          successfulResults.length
      ),
      bestPractices: Math.round(
        successfulResults.reduce((sum, r) => sum + r.scores.bestPractices, 0) /
          successfulResults.length
      ),
      seo: Math.round(
        successfulResults.reduce((sum, r) => sum + r.scores.seo, 0) /
          successfulResults.length
      ),
    };
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'docs', 'lighthouse-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📝 Report saved to: ${reportPath}`);

  // Print summary
  console.log('\n📊 AUDIT SUMMARY');
  console.log('================');
  if (report.averages) {
    const { averages } = report;
    console.log(`Performance:    ${averages.performance}% ${getScoreRating(averages.performance).rating}`);
    console.log(`Accessibility:  ${averages.accessibility}% ${getScoreRating(averages.accessibility).rating}`);
    console.log(`Best Practices: ${averages.bestPractices}% ${getScoreRating(averages.bestPractices).rating}`);
    console.log(`SEO:            ${averages.seo}% ${getScoreRating(averages.seo).rating}`);
  }

  // Check if targets met
  const targets = {
    performance: 90,
    accessibility: 95,
    bestPractices: 95,
  };

  if (report.averages) {
    const averages = report.averages;
    const targetsMet =
      averages.performance >= targets.performance &&
      averages.accessibility >= targets.accessibility &&
      averages.bestPractices >= targets.bestPractices;

    if (targetsMet) {
      console.log('\n✅ All performance targets met!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some performance targets not met');
      process.exit(1);
    }
  }
}

// Run audit
auditAllPages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
