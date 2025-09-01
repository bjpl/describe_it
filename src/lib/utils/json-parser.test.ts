/**
 * Test cases for RobustJSONParser
 * These tests verify that the parser can handle various OpenAI response formats
 */

import { RobustJSONParser } from './json-parser';

// Test data simulating different OpenAI response formats
const testCases = {
  pureJSON: {
    input: '[{"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil", "category": "Test"}]',
    description: 'Pure JSON array'
  },
  
  markdownWrapped: {
    input: '```json\n[{"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil", "category": "Test"}]\n```',
    description: 'JSON wrapped in markdown code block'
  },
  
  markdownWithExplanation: {
    input: 'Here are the Q&A pairs for your image:\n\n```json\n[{"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil", "category": "Test"}]\n```\n\nThese questions will help with Spanish learning.',
    description: 'JSON in markdown with explanatory text'
  },
  
  jsonWithTrailingComma: {
    input: '[{"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil", "category": "Test",}]',
    description: 'JSON with trailing comma'
  },
  
  jsonWithComments: {
    input: '[\n  // First question\n  {"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil", "category": "Test"}\n]',
    description: 'JSON with comments'
  },
  
  mixedTextWithJSON: {
    input: 'Based on the image analysis, here is the generated content: {"objetos": ["árbol", "casa"], "acciones": ["correr", "saltar"], "lugares": ["parque"], "colores": ["verde", "azul"], "emociones": ["alegría"], "conceptos": ["libertad"]} This should help with vocabulary building.',
    description: 'JSON object embedded in explanatory text'
  },
  
  incompleteJSON: {
    input: '[{"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil"',
    description: 'Incomplete JSON (missing closing braces)'
  },
  
  multipleCodeBlocks: {
    input: 'Here are two examples:\n\n```json\n{"invalid": "first"}\n```\n\nAnd the correct one:\n\n```json\n[{"question": "¿Qué ves?", "answer": "Veo una imagen", "difficulty": "facil", "category": "Test"}]\n```',
    description: 'Multiple code blocks with valid JSON in second block'
  }
};

// Type definitions for test validation
interface QAItem {
  question: string;
  answer: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  category: string;
}

interface PhraseCategories {
  objetos: string[];
  acciones: string[];
  lugares: string[];
  colores: string[];
  emociones: string[];
  conceptos: string[];
}

// Test runner
function runTests() {
  console.log('🧪 Running RobustJSONParser Tests\n');
  
  let passed = 0;
  let total = 0;
  
  Object.entries(testCases).forEach(([testName, testCase]) => {
    total++;
    console.log(`Testing: ${testCase.description}`);
    console.log(`Input: ${testCase.input.substring(0, 100)}${testCase.input.length > 100 ? '...' : ''}`);
    
    const result = RobustJSONParser.parse(testCase.input, {
      logging: false, // Disable logging for tests
      fallbackValue: null
    });
    
    if (result.success) {
      console.log(`✅ PASSED - Method: ${result.method}`);
      console.log(`   Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
      passed++;
    } else {
      console.log(`❌ FAILED - Error: ${result.error}`);
    }
    
    console.log('');
  });
  
  // Test with schema validation for Q&A
  console.log('Testing with Q&A schema validation:');
  const qaResult = RobustJSONParser.parseWithSchema<QAItem[]>(
    testCases.markdownWrapped.input,
    (data): data is QAItem[] => {
      return Array.isArray(data) && data.every(item => 
        typeof item === 'object' &&
        item !== null &&
        typeof item.question === 'string' &&
        typeof item.answer === 'string' &&
        ['facil', 'medio', 'dificil'].includes(item.difficulty) &&
        typeof item.category === 'string'
      );
    }
  );
  
  if (qaResult.success) {
    console.log(`✅ Schema validation PASSED`);
    passed++;
  } else {
    console.log(`❌ Schema validation FAILED: ${qaResult.error}`);
  }
  total++;
  
  // Test with phrase categories schema
  console.log('\nTesting with Phrase Categories schema validation:');
  const phraseResult = RobustJSONParser.parseWithSchema<PhraseCategories>(
    testCases.mixedTextWithJSON.input,
    (data): data is PhraseCategories => {
      return typeof data === 'object' &&
             data !== null &&
             ['objetos', 'acciones', 'lugares', 'colores', 'emociones', 'conceptos']
               .every(key => key in data && Array.isArray(data[key as keyof PhraseCategories]));
    }
  );
  
  if (phraseResult.success) {
    console.log(`✅ Phrase schema validation PASSED`);
    passed++;
  } else {
    console.log(`❌ Phrase schema validation FAILED: ${phraseResult.error}`);
  }
  total++;
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  return { passed, total, success: passed === total };
}

// Export for use in other test environments
export { runTests, testCases };

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}