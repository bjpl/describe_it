/**
 * Performance test for parallel description generation
 * This test verifies the optimization from sequential to parallel processing
 */

import https from 'https';
import http from 'http';

const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500';
const API_URL = 'http://localhost:3000/api/descriptions/generate';

async function testParallelGeneration() {
  console.log('🚀 Testing Parallel Description Generation Performance');
  console.log('=' .repeat(60));

  const testPayload = {
    imageUrl: TEST_IMAGE_URL,
    style: 'narrativo',
    maxLength: 150
  };

  const startTime = Date.now();
  
  try {
    const response = await makeRequest(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'
      },
      body: JSON.stringify(testPayload)
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    if (response.success) {
      console.log('✅ Test Results:');
      console.log(`   Total execution time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`   Generated descriptions: ${response.data.length}`);
      console.log(`   Languages: ${response.data.map(d => d.language).join(', ')}`);
      
      // Verify both languages are present
      const hasEnglish = response.data.some(d => d.language === 'english');
      const hasSpanish = response.data.some(d => d.language === 'spanish');
      
      console.log(`   English description: ${hasEnglish ? '✅' : '❌'} (${response.data.find(d => d.language === 'english')?.content.length || 0} chars)`);
      console.log(`   Spanish description: ${hasSpanish ? '✅' : '❌'} (${response.data.find(d => d.language === 'spanish')?.content.length || 0} chars)`);
      
      // Performance benchmarks
      if (totalTime < 15000) {
        console.log('🎯 Performance: EXCELLENT (< 15 seconds target achieved)');
      } else if (totalTime < 25000) {
        console.log('⚠️  Performance: GOOD (within acceptable range)');
      } else {
        console.log('❌ Performance: NEEDS IMPROVEMENT (over 25 seconds)');
      }
      
      console.log(`   Server response time: ${response.metadata.responseTime}`);
      console.log(`   Request ID: ${response.metadata.requestId}`);
      
    } else {
      console.error('❌ Test failed:', response.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlParts = new URL(url);
    const httpModule = urlParts.protocol === 'https:' ? https : http;
    
    const req = httpModule.request({
      hostname: urlParts.hostname,
      port: urlParts.port,
      path: urlParts.pathname + urlParts.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse JSON response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run the test
testParallelGeneration()
  .then(() => console.log('\n🏁 Test completed'))
  .catch(error => console.error('\n💥 Test failed:', error));

export { testParallelGeneration };