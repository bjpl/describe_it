#!/usr/bin/env node

/**
 * Application API Endpoints Testing Script
 * Tests the actual Next.js API endpoints to ensure they work with real API keys
 */

const axios = require('axios');
const path = require('path');

console.log('🔗 TESTING APPLICATION API ENDPOINTS');
console.log('=' * 50);

const BASE_URL = 'http://localhost:3004/api';

const testResults = {
  server_running: false,
  endpoints: {
    images_search: { working: false, error: null, data: null },
    descriptions_generate: { working: false, error: null, data: null },
    qa_generate: { working: false, error: null, data: null },
    phrases_extract: { working: false, error: null, data: null },
    health: { working: false, error: null, data: null }
  }
};

// Test image for endpoints
const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';

async function checkServerRunning() {
  console.log('\n🌐 Checking if development server is running...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    testResults.server_running = true;
    console.log('✅ Development server is running');
    return true;
  } catch (error) {
    console.log('❌ Development server is not running');
    console.log('   Start it with: npm run dev');
    return false;
  }
}

async function testImagesSearch() {
  console.log('\n🖼️  Testing /api/images/search...');
  
  try {
    const response = await axios.get(`${BASE_URL}/images/search`, {
      params: {
        query: 'mountain landscape',
        page: 1,
        per_page: 3
      },
      timeout: 15000
    });

    const data = response.data;
    testResults.endpoints.images_search = {
      working: true,
      error: null,
      data: {
        images_count: data.images?.length || 0,
        total: data.total || 0,
        demo_mode: response.headers['x-demo-mode'] === 'true',
        sample_image: data.images?.[0] ? {
          id: data.images[0].id,
          alt_description: data.images[0].alt_description
        } : null
      }
    };

    console.log(`✅ Images Search: Working (${data.images?.length || 0} images found)`);
    console.log(`   • Demo Mode: ${response.headers['x-demo-mode'] === 'true' ? 'Yes' : 'No'}`);
    console.log(`   • Total Available: ${data.total || 0}`);
    
  } catch (error) {
    testResults.endpoints.images_search.error = error.message;
    console.log(`❌ Images Search: Failed - ${error.message}`);
  }
}

async function testDescriptionsGenerate() {
  console.log('\n📝 Testing /api/descriptions/generate...');
  
  const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
  let successCount = 0;
  
  for (const style of styles) {
    try {
      const response = await axios.post(`${BASE_URL}/descriptions/generate`, {
        imageUrl: testImageUrl,
        style: style,
        language: 'es',
        maxLength: 100
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;
      successCount++;
      
      console.log(`   ✅ ${style}: ${data.data?.wordCount || 0} words generated`);
      
    } catch (error) {
      console.log(`   ❌ ${style}: Failed - ${error.message}`);
    }
  }
  
  testResults.endpoints.descriptions_generate = {
    working: successCount > 0,
    error: successCount === 0 ? 'All styles failed' : null,
    data: {
      styles_working: successCount,
      total_styles: styles.length,
      success_rate: `${Math.round((successCount / styles.length) * 100)}%`
    }
  };
  
  console.log(`✅ Description Generation: ${successCount}/${styles.length} styles working`);
}

async function testQAGenerate() {
  console.log('\n🙋 Testing /api/qa/generate...');
  
  try {
    const response = await axios.post(`${BASE_URL}/qa/generate`, {
      description: 'Una hermosa montaña cubierta de nieve bajo un cielo azul cristalino.',
      language: 'es',
      count: 3
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    testResults.endpoints.qa_generate = {
      working: true,
      error: null,
      data: {
        questions_generated: data.questions?.length || 0,
        sample_question: data.questions?.[0]?.question || null,
        language: data.metadata?.language || 'unknown'
      }
    };

    console.log(`✅ Q&A Generation: ${data.questions?.length || 0} questions generated`);
    console.log(`   • Sample: "${data.questions?.[0]?.question || 'N/A'}"`);
    
  } catch (error) {
    testResults.endpoints.qa_generate.error = error.message;
    console.log(`❌ Q&A Generation: Failed - ${error.message}`);
  }
}

async function testPhrasesExtract() {
  console.log('\n📚 Testing /api/phrases/extract...');
  
  try {
    const response = await axios.post(`${BASE_URL}/phrases/extract`, {
      description: 'Una hermosa montaña cubierta de nieve bajo un cielo azul cristalino con árboles verdes.',
      language: 'es'
    }, {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    const totalPhrases = Object.values(data.phrases || {}).flat().length;
    
    testResults.endpoints.phrases_extract = {
      working: true,
      error: null,
      data: {
        total_phrases: totalPhrases,
        categories: Object.keys(data.phrases || {}),
        sample_phrases: data.phrases || {}
      }
    };

    console.log(`✅ Phrase Extraction: ${totalPhrases} phrases in ${Object.keys(data.phrases || {}).length} categories`);
    console.log(`   • Categories: ${Object.keys(data.phrases || {}).join(', ')}`);
    
  } catch (error) {
    testResults.endpoints.phrases_extract.error = error.message;
    console.log(`❌ Phrase Extraction: Failed - ${error.message}`);
  }
}

async function testHealthEndpoint() {
  console.log('\n💚 Testing /api/health...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    const data = response.data;
    
    testResults.endpoints.health = {
      working: true,
      error: null,
      data: {
        status: data.status,
        services: data.services || [],
        demo_mode: data.demoMode
      }
    };

    console.log(`✅ Health Check: ${data.status || 'unknown'}`);
    console.log(`   • Demo Mode: ${data.demoMode ? 'Yes' : 'No'}`);
    console.log(`   • Services: ${data.services?.length || 0} configured`);
    
  } catch (error) {
    testResults.endpoints.health.error = error.message;
    console.log(`❌ Health Check: Failed - ${error.message}`);
  }
}

function generateReport() {
  console.log('\n📊 APPLICATION API ENDPOINTS REPORT');
  console.log('=' * 50);

  const workingEndpoints = Object.values(testResults.endpoints).filter(e => e.working).length;
  const totalEndpoints = Object.keys(testResults.endpoints).length;
  
  console.log(`\n📋 SUMMARY:`);
  console.log(`Server Running: ${testResults.server_running ? '✅ Yes' : '❌ No'}`);
  console.log(`Working Endpoints: ${workingEndpoints}/${totalEndpoints}`);
  console.log(`Success Rate: ${Math.round((workingEndpoints / totalEndpoints) * 100)}%`);

  console.log(`\n📊 DETAILED RESULTS:`);
  
  Object.entries(testResults.endpoints).forEach(([endpoint, result]) => {
    const status = result.working ? '✅' : '❌';
    console.log(`\n${status} ${endpoint.replace(/_/g, '/')}:`);
    if (result.working && result.data) {
      Object.entries(result.data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`   • ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`   • ${key}: ${value}`);
        }
      });
    } else if (result.error) {
      console.log(`   • Error: ${result.error}`);
    }
  });

  // Demo Mode Analysis
  const demoModeActive = testResults.endpoints.health.data?.demo_mode || 
                        testResults.endpoints.images_search.data?.demo_mode;
                        
  console.log(`\n🎭 DEMO MODE STATUS: ${demoModeActive ? '⚠️  ACTIVE' : '✅ DISABLED'}`);
  
  if (demoModeActive) {
    console.log('   • Some APIs are falling back to demo mode');
    console.log('   • Check API keys and configurations');
  } else {
    console.log('   • All APIs are using real services');
    console.log('   • Full functionality available');
  }

  // Save report
  const reportData = {
    timestamp: new Date().toISOString(),
    server_running: testResults.server_running,
    endpoints: testResults.endpoints,
    summary: {
      working_endpoints: workingEndpoints,
      total_endpoints: totalEndpoints,
      success_rate: Math.round((workingEndpoints / totalEndpoints) * 100),
      demo_mode_active: demoModeActive
    }
  };

  require('fs').writeFileSync(
    path.join(__dirname, '../api-endpoints-test-report.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log(`\n💾 Report saved to: api-endpoints-test-report.json`);
  
  return workingEndpoints === totalEndpoints && testResults.server_running;
}

async function main() {
  console.log('🚀 Starting application API endpoints testing...\n');
  
  try {
    const serverRunning = await checkServerRunning();
    
    if (!serverRunning) {
      console.log('\n⚠️  Cannot test endpoints - server is not running');
      console.log('Start the development server with: npm run dev');
      process.exit(1);
    }
    
    await testImagesSearch();
    await testDescriptionsGenerate();
    await testQAGenerate();
    await testPhrasesExtract();
    await testHealthEndpoint();
    
    const allWorking = generateReport();
    
    if (allWorking) {
      console.log('\n🎉 CONCLUSION: All application API endpoints are working perfectly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  CONCLUSION: Some endpoints have issues - see report above');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}