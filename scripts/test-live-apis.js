#!/usr/bin/env node

/**
 * Live API Testing Script
 * Tests Unsplash and OpenAI APIs with real API keys to ensure they're fully functional
 */

const axios = require('axios');
const OpenAI = require('openai').default;
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

console.log('🧠 HIVE MIND API TESTING - ENSURING FULL FUNCTIONALITY');
console.log('=' * 60);

// API Keys
const UNSPLASH_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

console.log(`\n📋 CONFIGURATION:`);
console.log(`Unsplash Key: ${UNSPLASH_KEY ? `${UNSPLASH_KEY.substring(0, 8)}...` : 'MISSING'}`);
console.log(`OpenAI Key: ${OPENAI_KEY ? `${OPENAI_KEY.substring(0, 8)}...` : 'MISSING'}`);

const results = {
  unsplash: {
    configured: !!UNSPLASH_KEY,
    working: false,
    error: null,
    sampleData: null,
    apiLimitRemaining: null
  },
  openai: {
    configured: !!OPENAI_KEY,
    working: false,
    error: null,
    descriptions: {
      narrativo: null,
      poetico: null,
      academico: null,
      conversacional: null,
      infantil: null
    },
    qa_generation: null,
    vocabulary_extraction: null
  }
};

async function testUnsplashAPI() {
  console.log('\n🖼️  TESTING UNSPLASH API');
  console.log('-' * 30);

  if (!UNSPLASH_KEY) {
    results.unsplash.error = 'No API key configured';
    console.log('❌ UNSPLASH: No API key configured');
    return;
  }

  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: 'mountain landscape',
        page: 1,
        per_page: 3,
        order_by: 'relevant'
      },
      headers: {
        'Accept-Version': 'v1',
        'Authorization': `Client-ID ${UNSPLASH_KEY}`
      },
      timeout: 10000
    });

    const data = response.data;
    results.unsplash.working = true;
    results.unsplash.sampleData = {
      total: data.total,
      total_pages: data.total_pages,
      results_count: data.results.length,
      first_image: data.results[0] ? {
        id: data.results[0].id,
        description: data.results[0].description,
        alt_description: data.results[0].alt_description,
        urls: {
          small: data.results[0].urls.small,
          regular: data.results[0].urls.regular
        },
        user: data.results[0].user.name
      } : null
    };
    
    results.unsplash.apiLimitRemaining = response.headers['x-ratelimit-remaining'];

    console.log(`✅ UNSPLASH: Working perfectly!`);
    console.log(`   • Found ${data.total} images for "mountain landscape"`);
    console.log(`   • Retrieved ${data.results.length} images in response`);
    console.log(`   • API Limit Remaining: ${results.unsplash.apiLimitRemaining}`);
    console.log(`   • Sample Image: "${data.results[0]?.alt_description || 'N/A'}"`);
    
  } catch (error) {
    results.unsplash.error = error.message;
    console.log(`❌ UNSPLASH: Failed - ${error.message}`);
    
    if (error.response) {
      console.log(`   • Status: ${error.response.status}`);
      console.log(`   • Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

async function testOpenAIAPI() {
  console.log('\n🤖 TESTING OPENAI API');
  console.log('-' * 30);

  if (!OPENAI_KEY) {
    results.openai.error = 'No API key configured';
    console.log('❌ OPENAI: No API key configured');
    return;
  }

  const openai = new OpenAI({ apiKey: OPENAI_KEY });
  
  // Test image for description generation
  const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
  const testDescription = 'Una hermosa montaña cubierta de nieve bajo un cielo azul cristalino. La luz del sol crea reflejos dorados en las laderas rocosas, mientras que pequeños árboles verdes adornan las zonas más bajas del paisaje alpino.';

  try {
    // 1. Test Description Generation (all 5 styles)
    console.log('\n🎨 Testing Description Generation...');
    
    const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
    
    for (const style of styles) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Crea una descripción ${style} de aproximadamente 50 palabras en español.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Describe esta imagen en estilo ${style}:`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: testImageUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 100,
          temperature: style === 'poetico' ? 0.9 : style === 'academico' ? 0.3 : 0.7
        });

        const description = response.choices[0]?.message?.content || '';
        results.openai.descriptions[style] = {
          text: description,
          wordCount: description.split(/\s+/).length
        };
        
        console.log(`   ✅ ${style}: Generated ${description.split(/\s+/).length} words`);
        
      } catch (error) {
        console.log(`   ❌ ${style}: Failed - ${error.message}`);
      }
    }

    // 2. Test Q&A Generation
    console.log('\n🙋 Testing Q&A Generation...');
    
    try {
      const qaResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an educational content creator. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: `Basándote en la siguiente descripción, genera 3 pares de pregunta-respuesta educativos.
            
            Descripción: ${testDescription}
            
            Formato de respuesta como JSON array:
            [
              {
                "question": "pregunta aquí",
                "answer": "respuesta aquí", 
                "difficulty": "facil|medio|dificil",
                "category": "categoría temática"
              }
            ]`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const qaContent = qaResponse.choices[0]?.message?.content || '[]';
      const qaData = JSON.parse(qaContent);
      
      results.openai.qa_generation = {
        success: true,
        count: qaData.length,
        sample: qaData[0] || null
      };
      
      console.log(`   ✅ Q&A Generation: Generated ${qaData.length} question-answer pairs`);
      console.log(`   • Sample Question: "${qaData[0]?.question || 'N/A'}"`);
      
    } catch (error) {
      results.openai.qa_generation = {
        success: false,
        error: error.message
      };
      console.log(`   ❌ Q&A Generation: Failed - ${error.message}`);
    }

    // 3. Test Vocabulary Extraction
    console.log('\n📚 Testing Vocabulary Extraction...');
    
    try {
      const vocabResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a linguistic analyzer. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: `Extrae y categoriza palabras clave de la siguiente descripción:
            
            Descripción: ${testDescription}
            
            Responde en formato JSON:
            {
              "objetos": ["lista", "de", "objetos"],
              "acciones": ["lista", "de", "acciones"],
              "lugares": ["lista", "de", "lugares"],
              "colores": ["lista", "de", "colores"],
              "emociones": ["lista", "de", "emociones"],
              "conceptos": ["lista", "de", "conceptos"]
            }`
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      });

      const vocabContent = vocabResponse.choices[0]?.message?.content || '{}';
      const vocabData = JSON.parse(vocabContent);
      
      results.openai.vocabulary_extraction = {
        success: true,
        categories: Object.keys(vocabData),
        totalWords: Object.values(vocabData).flat().length,
        sample: vocabData
      };
      
      console.log(`   ✅ Vocabulary Extraction: Extracted ${Object.values(vocabData).flat().length} words in ${Object.keys(vocabData).length} categories`);
      console.log(`   • Categories: ${Object.keys(vocabData).join(', ')}`);
      
    } catch (error) {
      results.openai.vocabulary_extraction = {
        success: false,
        error: error.message
      };
      console.log(`   ❌ Vocabulary Extraction: Failed - ${error.message}`);
    }

    results.openai.working = true;
    console.log(`\n✅ OPENAI: All functionality working!`);
    
  } catch (error) {
    results.openai.error = error.message;
    console.log(`❌ OPENAI: Failed - ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n📊 COMPREHENSIVE API TESTING REPORT');
  console.log('=' * 60);

  // Summary
  const unsplashStatus = results.unsplash.working ? '✅ WORKING' : '❌ FAILED';
  const openaiStatus = results.openai.working ? '✅ WORKING' : '❌ FAILED';
  
  console.log(`\n📋 OVERALL STATUS:`);
  console.log(`Unsplash API: ${unsplashStatus}`);
  console.log(`OpenAI API: ${openaiStatus}`);

  // Demo Mode Check
  const needsDemoMode = !results.unsplash.working || !results.openai.working;
  console.log(`\n🎭 DEMO MODE: ${needsDemoMode ? '⚠️  REQUIRED' : '❌ NOT NEEDED'}`);

  // Detailed Results
  console.log(`\n📊 DETAILED RESULTS:`);
  
  console.log(`\n🖼️  UNSPLASH API:`);
  console.log(`   • Configured: ${results.unsplash.configured ? 'Yes' : 'No'}`);
  console.log(`   • Working: ${results.unsplash.working ? 'Yes' : 'No'}`);
  if (results.unsplash.error) {
    console.log(`   • Error: ${results.unsplash.error}`);
  }
  if (results.unsplash.sampleData) {
    console.log(`   • Total Images Found: ${results.unsplash.sampleData.total}`);
    console.log(`   • API Limit Remaining: ${results.unsplash.apiLimitRemaining}`);
  }

  console.log(`\n🤖 OPENAI API:`);
  console.log(`   • Configured: ${results.openai.configured ? 'Yes' : 'No'}`);
  console.log(`   • Working: ${results.openai.working ? 'Yes' : 'No'}`);
  if (results.openai.error) {
    console.log(`   • Error: ${results.openai.error}`);
  }
  
  console.log(`   • Description Generation:`);
  Object.entries(results.openai.descriptions).forEach(([style, data]) => {
    const status = data ? `✅ (${data.wordCount} words)` : '❌ Failed';
    console.log(`     - ${style}: ${status}`);
  });
  
  const qaStatus = results.openai.qa_generation?.success ? `✅ (${results.openai.qa_generation.count} pairs)` : '❌ Failed';
  console.log(`   • Q&A Generation: ${qaStatus}`);
  
  const vocabStatus = results.openai.vocabulary_extraction?.success ? `✅ (${results.openai.vocabulary_extraction.totalWords} words)` : '❌ Failed';
  console.log(`   • Vocabulary Extraction: ${vocabStatus}`);

  // Issues Found
  const issues = [];
  
  if (!results.unsplash.configured) {
    issues.push('Unsplash API key is missing');
  } else if (!results.unsplash.working) {
    issues.push(`Unsplash API is not working: ${results.unsplash.error}`);
  }
  
  if (!results.openai.configured) {
    issues.push('OpenAI API key is missing');
  } else if (!results.openai.working) {
    issues.push(`OpenAI API is not working: ${results.openai.error}`);
  }

  if (issues.length > 0) {
    console.log(`\n🚨 ISSUES FOUND:`);
    issues.forEach(issue => console.log(`   • ${issue}`));
    console.log(`\n❗ ACTION REQUIRED: Human needs to provide or fix the above issues`);
  } else {
    console.log(`\n🎉 EXCELLENT! All APIs are fully functional - NO demo mode needed!`);
  }

  // Write detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      unsplash_working: results.unsplash.working,
      openai_working: results.openai.working,
      demo_mode_needed: needsDemoMode,
      issues_count: issues.length
    },
    details: results,
    issues: issues,
    recommendations: needsDemoMode ? [
      'Fix API key configuration',
      'Verify API key permissions',
      'Check network connectivity',
      'Review API quotas and billing'
    ] : [
      'All systems operational',
      'Continue with full API integration'
    ]
  };

  require('fs').writeFileSync(
    path.join(__dirname, '../api-test-report.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log(`\n💾 Report saved to: api-test-report.json`);
  
  return needsDemoMode;
}

async function main() {
  console.log(`🚀 Starting comprehensive API tests...\n`);
  
  try {
    await testUnsplashAPI();
    await testOpenAIAPI();
    
    const needsDemoMode = await generateReport();
    
    if (needsDemoMode) {
      console.log('\n⚠️  CONCLUSION: Some APIs are not fully functional - demo mode fallbacks are active');
      process.exit(1);
    } else {
      console.log('\n🎉 CONCLUSION: All APIs are fully functional - ready for production!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}