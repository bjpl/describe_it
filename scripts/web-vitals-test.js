const puppeteer = require('puppeteer');
const fs = require('fs');

async function collectWebVitals(page) {
  // Inject Web Vitals library
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js'
  });

  // Collect metrics
  const vitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics = {};
      let collected = 0;
      const total = 5; // FCP, LCP, CLS, FID, TTFB

      function onMetric(metric) {
        metrics[metric.name] = {
          value: metric.value,
          rating: metric.rating
        };
        collected++;
        
        if (collected >= total) {
          resolve(metrics);
        }
      }

      // Use timeout as fallback
      setTimeout(() => resolve(metrics), 10000);

      // Collect all Web Vitals
      webVitals.getCLS(onMetric);
      webVitals.getFID(onMetric);
      webVitals.getFCP(onMetric);
      webVitals.getLCP(onMetric);
      webVitals.getTTFB(onMetric);
    });
  });

  return vitals;
}

async function runWebVitalsTest() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  
  // Set viewport for consistent results
  await page.setViewport({ width: 1200, height: 800 });

  const urls = [
    'http://localhost:3000',
    'http://localhost:3000/learn',
    'http://localhost:3000/practice',
    'http://localhost:3000/progress'
  ];

  const results = [];

  for (const url of urls) {
    console.log(`Collecting Web Vitals for ${url}...`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Wait for page interactions to settle
      await page.waitForTimeout(2000);
      
      // Simulate user interaction for FID
      await page.click('body');
      await page.keyboard.press('Tab');
      
      const vitals = await collectWebVitals(page);
      
      results.push({
        url,
        timestamp: new Date().toISOString(),
        vitals
      });
      
      console.log(`Collected metrics for ${url}:`, vitals);
    } catch (error) {
      console.error(`Error collecting vitals for ${url}:`, error.message);
      results.push({
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  await browser.close();

  // Save results
  const output = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalUrls: urls.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length
    }
  };

  fs.writeFileSync('web-vitals.json', JSON.stringify(output, null, 2));
  console.log('Web Vitals collection completed. Results saved to web-vitals.json');

  // Check for performance regressions
  const thresholds = {
    FCP: 2000,  // 2 seconds
    LCP: 3000,  // 3 seconds
    CLS: 0.1,   // 0.1
    TTFB: 600   // 600ms
  };

  const failures = [];
  
  results.forEach(result => {
    if (result.error) return;
    
    const { vitals } = result;
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      if (vitals[metric] && vitals[metric].value > threshold) {
        failures.push({
          url: result.url,
          metric,
          value: vitals[metric].value,
          threshold,
          rating: vitals[metric].rating
        });
      }
    });
  });

  if (failures.length > 0) {
    console.error('Web Vitals thresholds exceeded:');
    failures.forEach(failure => {
      console.error(`${failure.url}: ${failure.metric} = ${failure.value} (threshold: ${failure.threshold}) - ${failure.rating}`);
    });
    process.exit(1);
  }

  console.log('All Web Vitals within acceptable thresholds ✓');
}

if (require.main === module) {
  runWebVitalsTest().catch(error => {
    console.error('Web Vitals test failed:', error);
    process.exit(1);
  });
}

module.exports = { runWebVitalsTest };