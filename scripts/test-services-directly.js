#!/usr/bin/env node

/**
 * Direct Service Testing Script
 * Tests the API services directly without going through Next.js
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

console.log('🎯 DIRECT API SERVICES TESTING');
console.log('=' * 40);

const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

console.log(`\n📋 CONFIGURATION:`);
console.log(`Unsplash Key: ${UNSPLASH_KEY ? `${UNSPLASH_KEY.substring(0, 8)}...` : 'MISSING'}`);
console.log(`OpenAI Key: ${OPENAI_KEY ? `${OPENAI_KEY.substring(0, 8)}...` : 'MISSING'}`);

const results = {
  unsplash_service: { working: false, error: null, demo_mode: false },
  openai_service: { working: false, error: null, demo_mode: false }
};

async function testUnsplashService() {
  console.log('\n🖼️  Testing Unsplash Service Directly...');
  
  try {
    // Import and test the unsplash service
    const { unsplashService } = require('../src/lib/api/unsplash.ts');
    
    const searchResult = await unsplashService.searchImages({
      query: 'mountain landscape',
      page: 1,
      per_page: 3
    });
    
    results.unsplash_service = {
      working: true,
      error: null,
      demo_mode: !UNSPLASH_KEY,
      data: {
        images_found: searchResult.images.length,
        total: searchResult.total,
        sample_image: searchResult.images[0] ? {
          id: searchResult.images[0].id,
          description: searchResult.images[0].alt_description
        } : null
      }
    };
    
    console.log(`✅ Unsplash Service: Working (${searchResult.images.length} images)`);
    console.log(`   • Demo Mode: ${!UNSPLASH_KEY ? 'Yes' : 'No'}`);
    console.log(`   • Total Available: ${searchResult.total}`);
    
  } catch (error) {
    results.unsplash_service = {
      working: false,
      error: error.message,
      demo_mode: !UNSPLASH_KEY
    };
    console.log(`❌ Unsplash Service: Failed - ${error.message}`);
  }
}

async function testOpenAIService() {
  console.log('\n🤖 Testing OpenAI Service Directly...');
  
  try {
    // Import and test the openai service
    const { openAIService } = require('../src/lib/api/openai.ts');
    
    // Test description generation
    console.log('\n📝 Testing Description Generation...');
    const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
    
    const description = await openAIService.generateDescription({
      imageUrl: testImageUrl,
      style: 'narrativo',
      language: 'es',
      maxLength: 100
    });
    
    console.log(`   ✅ Description: Generated ${description.wordCount} words`);
    
    // Test Q&A generation
    console.log('\n🙋 Testing Q&A Generation...');
    const qaResult = await openAIService.generateQA(
      'Una hermosa montaña cubierta de nieve bajo un cielo azul cristalino.',
      'es',
      3
    );
    
    console.log(`   ✅ Q&A: Generated ${qaResult.length} questions`);
    
    // Test phrase extraction
    console.log('\n📚 Testing Phrase Extraction...');
    const phrasesResult = await openAIService.extractPhrases(
      'Una hermosa montaña cubierta de nieve bajo un cielo azul cristalino.',
      'es'
    );
    
    const totalPhrases = Object.values(phrasesResult).flat().length;
    console.log(`   ✅ Phrases: Extracted ${totalPhrases} phrases`);
    
    results.openai_service = {
      working: true,
      error: null,
      demo_mode: !OPENAI_KEY,
      data: {
        description_words: description.wordCount,
        qa_pairs: qaResult.length,
        phrases_extracted: totalPhrases,
        categories: Object.keys(phrasesResult)
      }
    };
    
    console.log(`✅ OpenAI Service: All functionality working!`);
    console.log(`   • Demo Mode: ${!OPENAI_KEY ? 'Yes' : 'No'}`);
    
  } catch (error) {
    results.openai_service = {
      working: false,
      error: error.message,
      demo_mode: !OPENAI_KEY
    };
    console.log(`❌ OpenAI Service: Failed - ${error.message}`);
  }
}

function generateReport() {
  console.log('\n📊 DIRECT SERVICES TEST REPORT');
  console.log('=' * 40);

  const allWorking = results.unsplash_service.working && results.openai_service.working;
  const anyDemoMode = results.unsplash_service.demo_mode || results.openai_service.demo_mode;
  
  console.log(`\n📋 SUMMARY:`);
  console.log(`Unsplash Service: ${results.unsplash_service.working ? '✅ Working' : '❌ Failed'}`);
  console.log(`OpenAI Service: ${results.openai_service.working ? '✅ Working' : '❌ Failed'}`);
  console.log(`Demo Mode Active: ${anyDemoMode ? '⚠️  Yes' : '❌ No'}`);

  console.log(`\n📊 DETAILED RESULTS:`);
  
  console.log(`\n🖼️  UNSPLASH SERVICE:`);
  console.log(`   • Working: ${results.unsplash_service.working ? 'Yes' : 'No'}`);
  console.log(`   • Demo Mode: ${results.unsplash_service.demo_mode ? 'Yes' : 'No'}`);
  if (results.unsplash_service.error) {
    console.log(`   • Error: ${results.unsplash_service.error}`);
  }
  if (results.unsplash_service.data) {
    console.log(`   • Images Found: ${results.unsplash_service.data.images_found}`);
    console.log(`   • Total Available: ${results.unsplash_service.data.total}`);
  }

  console.log(`\n🤖 OPENAI SERVICE:`);
  console.log(`   • Working: ${results.openai_service.working ? 'Yes' : 'No'}`);
  console.log(`   • Demo Mode: ${results.openai_service.demo_mode ? 'Yes' : 'No'}`);
  if (results.openai_service.error) {
    console.log(`   • Error: ${results.openai_service.error}`);
  }
  if (results.openai_service.data) {
    console.log(`   • Description Generation: ${results.openai_service.data.description_words} words`);
    console.log(`   • Q&A Generation: ${results.openai_service.data.qa_pairs} pairs`);
    console.log(`   • Phrase Extraction: ${results.openai_service.data.phrases_extracted} phrases`);
  }

  // Issues Analysis
  const issues = [];
  
  if (!results.unsplash_service.working) {
    issues.push(`Unsplash service failed: ${results.unsplash_service.error}`);
  }
  
  if (!results.openai_service.working) {
    issues.push(`OpenAI service failed: ${results.openai_service.error}`);
  }
  
  if (results.unsplash_service.demo_mode) {
    issues.push('Unsplash is running in demo mode (no API key or key invalid)');
  }
  
  if (results.openai_service.demo_mode) {
    issues.push('OpenAI is running in demo mode (no API key or key invalid)');
  }

  if (issues.length > 0) {
    console.log(`\n🚨 ISSUES FOUND:`);
    issues.forEach(issue => console.log(`   • ${issue}`));
  } else {
    console.log(`\n🎉 NO ISSUES! All services working with real APIs!`);
  }

  // Save report
  const reportData = {
    timestamp: new Date().toISOString(),
    services: results,
    summary: {
      all_working: allWorking,
      demo_mode_active: anyDemoMode,
      issues_count: issues.length
    },
    issues: issues
  };

  require('fs').writeFileSync(
    path.join(__dirname, '../direct-services-test-report.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log(`\n💾 Report saved to: direct-services-test-report.json`);
  
  return allWorking && !anyDemoMode;
}

async function main() {
  console.log('🚀 Starting direct services testing...\n');
  
  try {
    await testUnsplashService();
    await testOpenAIService();
    
    const allPerfect = generateReport();
    
    if (allPerfect) {
      console.log('\n🎉 CONCLUSION: All services are working perfectly with real APIs!');
      console.log('🎯 RECOMMENDATION: APIs are fully functional - NO demo mode needed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  CONCLUSION: Some issues found - see report above');
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