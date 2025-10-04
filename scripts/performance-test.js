const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runPerformanceTest() {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };
  
  const urls = [
    'http://localhost:3000',
    'http://localhost:3000/learn',
    'http://localhost:3000/practice'
  ];
  
  const results = [];
  
  for (const url of urls) {
    console.log(`Testing ${url}...`);
    
    try {
      const runnerResult = await lighthouse(url, options);
      const performance = runnerResult.lhr.categories.performance.score * 100;
      const fcp = runnerResult.lhr.audits['first-contentful-paint'].numericValue;
      const lcp = runnerResult.lhr.audits['largest-contentful-paint'].numericValue;
      const cls = runnerResult.lhr.audits['cumulative-layout-shift'].numericValue;
      const tbt = runnerResult.lhr.audits['total-blocking-time'].numericValue;
      
      results.push({
        url,
        performance,
        metrics: {
          'first-contentful-paint': fcp,
          'largest-contentful-paint': lcp,
          'cumulative-layout-shift': cls,
          'total-blocking-time': tbt
        }
      });
      
      console.log(`Performance Score: ${performance}`);
    } catch (error) {
      console.error(`Error testing ${url}:`, error.message);
    }
  }
  
  await chrome.kill();
  
  // Save results for CI
  fs.writeFileSync('performance-results.json', JSON.stringify(results, null, 2));
  
  console.log('Performance test completed. Results saved to performance-results.json');
  
  // Check if any scores are below threshold
  const failedTests = results.filter(result => result.performance < 85);
  if (failedTests.length > 0) {
    console.error('Performance regression detected!');
    console.error('Failed URLs:', failedTests.map(t => t.url));
    process.exit(1);
  }
}

if (require.main === module) {
  runPerformanceTest().catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}

module.exports = { runPerformanceTest };