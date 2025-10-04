#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive performance audit script
 * Measures Core Web Vitals, bundle sizes, and runtime performance
 */

class PerformanceAuditor {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || './performance-reports';
    this.pages = options.pages || [
      '/',
      '/learn',
      '/practice',
      '/progress'
    ];
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      audits: [],
      summary: {},
      recommendations: []
    };
  }

  async initialize() {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });

    console.log('🚀 Performance auditor initialized');
  }

  async auditPage(url) {
    console.log(`📊 Auditing ${url}...`);
    
    const page = await this.browser.newPage();
    
    // Set up performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        navigationStart: 0,
        loadEventEnd: 0,
        domContentLoaded: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
        timeToInteractive: 0
      };
    });

    // Inject Web Vitals
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js'
    });

    const startTime = Date.now();
    
    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Collect basic metrics
    const metrics = await page.metrics();
    const performanceTiming = await page.evaluate(() => {
      return {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domContentLoaded: performance.timing.domContentLoadedEventEnd,
        domInteractive: performance.timing.domInteractive
      };
    });

    // Collect Web Vitals
    const webVitals = await this.collectWebVitals(page);
    
    // Collect resource timings
    const resourceTimings = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: entry.transferSize,
        type: entry.initiatorType
      }));
    });

    // Collect bundle analysis
    const bundleAnalysis = await this.analyzeBundles(page);
    
    // Take screenshot
    const screenshotPath = path.join(this.outputDir, `${url.replace(/[^a-zA-Z0-9]/g, '_')}_screenshot.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Performance score calculation
    const performanceScore = this.calculatePerformanceScore(webVitals, metrics);

    const audit = {
      url,
      timestamp: new Date().toISOString(),
      loadTime: Date.now() - startTime,
      statusCode: response.status(),
      performanceScore,
      webVitals,
      metrics: {
        ...metrics,
        ...performanceTiming
      },
      resourceTimings,
      bundleAnalysis,
      screenshot: screenshotPath,
      recommendations: this.generateRecommendations(webVitals, metrics, resourceTimings)
    };

    await page.close();
    
    console.log(`✅ Completed audit for ${url} (Score: ${performanceScore}/100)`);
    
    return audit;
  }

  async collectWebVitals(page) {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        let collected = 0;
        const expectedMetrics = ['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'];
        
        function onVital(metric) {
          vitals[metric.name] = {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta
          };
          collected++;
          
          if (collected >= expectedMetrics.length || collected >= 5) {
            resolve(vitals);
          }
        }

        // Timeout fallback
        setTimeout(() => resolve(vitals), 10000);

        try {
          if (typeof webVitals !== 'undefined') {
            webVitals.getCLS(onVital);
            webVitals.getFID(onVital);
            webVitals.getFCP(onVital);
            webVitals.getLCP(onVital);
            webVitals.getTTFB(onVital);
            if (webVitals.getINP) {
              webVitals.getINP(onVital);
            }
          }
        } catch (error) {
          console.error('Web Vitals collection error:', error);
          resolve(vitals);
        }
      });
    });
  }

  async analyzeBundles(page) {
    const bundles = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      return scripts.map(script => ({
        src: script.src,
        async: script.async,
        defer: script.defer,
        type: script.type || 'text/javascript'
      })).filter(script => script.src);
    });

    const bundleSizes = {};
    let totalSize = 0;

    for (const bundle of bundles) {
      try {
        const response = await page.goto(bundle.src);
        const size = (await response.buffer()).length;
        bundleSizes[bundle.src] = size;
        totalSize += size;
      } catch (error) {
        console.warn(`Could not analyze bundle: ${bundle.src}`);
      }
    }

    return {
      bundles: bundleSizes,
      totalSize,
      count: bundles.length
    };
  }

  calculatePerformanceScore(webVitals, metrics) {
    let score = 100;
    
    // Web Vitals scoring
    if (webVitals.LCP?.value > 2500) score -= 25;
    else if (webVitals.LCP?.value > 4000) score -= 40;
    
    if (webVitals.FID?.value > 100) score -= 20;
    else if (webVitals.FID?.value > 300) score -= 35;
    
    if (webVitals.CLS?.value > 0.1) score -= 20;
    else if (webVitals.CLS?.value > 0.25) score -= 35;
    
    if (webVitals.FCP?.value > 1800) score -= 15;
    else if (webVitals.FCP?.value > 3000) score -= 25;
    
    if (webVitals.TTFB?.value > 600) score -= 10;
    else if (webVitals.TTFB?.value > 1800) score -= 20;
    
    // Memory usage scoring
    if (metrics.JSHeapUsedSize > 100 * 1024 * 1024) score -= 10; // 100MB
    if (metrics.JSHeapUsedSize > 200 * 1024 * 1024) score -= 20; // 200MB
    
    return Math.max(0, Math.round(score));
  }

  generateRecommendations(webVitals, metrics, resourceTimings) {
    const recommendations = [];
    
    // LCP recommendations
    if (webVitals.LCP?.value > 2500) {
      recommendations.push({
        type: 'LCP',
        priority: 'high',
        message: 'Largest Contentful Paint is slow. Consider optimizing images, using a CDN, or implementing critical CSS.',
        value: webVitals.LCP.value,
        threshold: 2500
      });
    }
    
    // FID recommendations
    if (webVitals.FID?.value > 100) {
      recommendations.push({
        type: 'FID',
        priority: 'high',
        message: 'First Input Delay is high. Consider code splitting, reducing JavaScript execution time, or using a web worker.',
        value: webVitals.FID.value,
        threshold: 100
      });
    }
    
    // CLS recommendations
    if (webVitals.CLS?.value > 0.1) {
      recommendations.push({
        type: 'CLS',
        priority: 'medium',
        message: 'Cumulative Layout Shift is high. Ensure images have dimensions, avoid inserting content above existing content.',
        value: webVitals.CLS.value,
        threshold: 0.1
      });
    }
    
    // Bundle size recommendations
    const largeResources = resourceTimings
      .filter(resource => resource.transferSize > 100000) // > 100KB
      .sort((a, b) => b.transferSize - a.transferSize);
    
    if (largeResources.length > 0) {
      recommendations.push({
        type: 'Bundle Size',
        priority: 'medium',
        message: `Found ${largeResources.length} large resources. Consider code splitting or compression.`,
        details: largeResources.slice(0, 5).map(r => ({
          url: r.name,
          size: r.transferSize
        }))
      });
    }
    
    // Memory recommendations
    if (metrics.JSHeapUsedSize > 100 * 1024 * 1024) {
      recommendations.push({
        type: 'Memory',
        priority: 'medium',
        message: 'High memory usage detected. Consider implementing memory optimizations.',
        value: Math.round(metrics.JSHeapUsedSize / 1024 / 1024),
        unit: 'MB'
      });
    }
    
    return recommendations;
  }

  async runFullAudit() {
    await this.initialize();
    
    console.log('🔍 Starting comprehensive performance audit...');
    
    for (const pagePath of this.pages) {
      const url = `${this.baseUrl}${pagePath}`;
      try {
        const audit = await this.auditPage(url);
        this.results.audits.push(audit);
      } catch (error) {
        console.error(`❌ Failed to audit ${url}:`, error.message);
        this.results.audits.push({
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Generate summary
    this.generateSummary();
    
    // Save results
    await this.saveResults();
    
    await this.browser.close();
    
    console.log('✅ Performance audit completed!');
    console.log(`📋 Results saved to: ${this.outputDir}`);
    
    return this.results;
  }

  generateSummary() {
    const successfulAudits = this.results.audits.filter(audit => !audit.error);
    
    if (successfulAudits.length === 0) {
      this.results.summary = { error: 'No successful audits' };
      return;
    }
    
    const scores = successfulAudits.map(audit => audit.performanceScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    this.results.summary = {
      totalPages: this.pages.length,
      successfulAudits: successfulAudits.length,
      averageScore: Math.round(avgScore),
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      totalRecommendations: successfulAudits.reduce((sum, audit) => sum + audit.recommendations.length, 0),
      criticalIssues: successfulAudits.reduce((sum, audit) => 
        sum + audit.recommendations.filter(r => r.priority === 'high').length, 0
      )
    };
    
    // Aggregate recommendations
    const allRecommendations = successfulAudits.flatMap(audit => audit.recommendations);
    const recommendationGroups = allRecommendations.reduce((groups, rec) => {
      const key = rec.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(rec);
      return groups;
    }, {});
    
    this.results.recommendations = Object.entries(recommendationGroups).map(([type, recs]) => ({
      type,
      count: recs.length,
      priority: recs.some(r => r.priority === 'high') ? 'high' : 'medium',
      description: recs[0].message
    }));
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save main results
    const resultsPath = path.join(this.outputDir, `performance-audit-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    // Save human-readable report
    const reportPath = path.join(this.outputDir, `performance-report-${timestamp}.md`);
    const report = this.generateMarkdownReport();
    fs.writeFileSync(reportPath, report);
    
    // Save latest results (overwrite)
    const latestPath = path.join(this.outputDir, 'latest-results.json');
    fs.writeFileSync(latestPath, JSON.stringify(this.results, null, 2));
  }

  generateMarkdownReport() {
    const { summary, audits, recommendations } = this.results;
    
    let report = `# Performance Audit Report\n\n`;
    report += `**Generated:** ${this.results.timestamp}\n\n`;
    
    // Summary
    report += `## Summary\n\n`;
    report += `- **Pages Audited:** ${summary.totalPages}\n`;
    report += `- **Successful Audits:** ${summary.successfulAudits}\n`;
    report += `- **Average Score:** ${summary.averageScore}/100\n`;
    report += `- **Best Score:** ${summary.bestScore}/100\n`;
    report += `- **Worst Score:** ${summary.worstScore}/100\n`;
    report += `- **Critical Issues:** ${summary.criticalIssues}\n\n`;
    
    // Recommendations
    if (recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : '🟡';
        report += `${priority} **${rec.type}** (${rec.count} instances)\n`;
        report += `   ${rec.description}\n\n`;
      });
    }
    
    // Detailed Results
    report += `## Detailed Results\n\n`;
    audits.filter(audit => !audit.error).forEach(audit => {
      report += `### ${audit.url}\n\n`;
      report += `- **Score:** ${audit.performanceScore}/100\n`;
      report += `- **Load Time:** ${audit.loadTime}ms\n`;
      
      if (audit.webVitals) {
        report += `- **Web Vitals:**\n`;
        Object.entries(audit.webVitals).forEach(([metric, data]) => {
          report += `  - ${metric}: ${data.value} (${data.rating})\n`;
        });
      }
      
      if (audit.recommendations.length > 0) {
        report += `- **Issues:**\n`;
        audit.recommendations.forEach(rec => {
          const priority = rec.priority === 'high' ? '🔴' : '🟡';
          report += `  ${priority} ${rec.message}\n`;
        });
      }
      
      report += `\n`;
    });
    
    return report;
  }
}

// CLI usage
if (require.main === module) {
  const auditor = new PerformanceAuditor({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    outputDir: process.env.OUTPUT_DIR || './performance-reports'
  });
  
  auditor.runFullAudit()
    .then(results => {
      console.log('\n📊 Audit Summary:');
      console.log(`Average Score: ${results.summary.averageScore}/100`);
      console.log(`Critical Issues: ${results.summary.criticalIssues}`);
      
      if (results.summary.averageScore < 70) {
        console.log('⚠️  Performance needs improvement!');
        process.exit(1);
      } else {
        console.log('✅ Performance is good!');
      }
    })
    .catch(error => {
      console.error('💥 Audit failed:', error);
      process.exit(1);
    });
}

module.exports = { PerformanceAuditor };