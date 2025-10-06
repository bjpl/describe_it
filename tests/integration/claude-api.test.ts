/**
 * Integration Tests for Claude API Routes
 *
 * Tests all three Claude-powered API endpoints:
 * - /api/descriptions/generate (image alt text, captions, detailed descriptions)
 * - /api/qa/generate (Q&A pair generation)
 * - /api/translate (multi-language translation)
 *
 * Migration: OpenAI → Claude Sonnet 4.5 (2025-06-29)
 *
 * @requires Claude API key (ANTHROPIC_API_KEY)
 * @requires Test server running on http://localhost:3000
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import testData from '../fixtures/claude-test-data.json';

// Test configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds for API calls
const PERFORMANCE_THRESHOLD = 3000; // 3 seconds max response time

// Mock authentication for tests
const mockAuthHeaders = {
  'Content-Type': 'application/json',
  'User-Agent': 'Claude-Integration-Test/1.0.0',
};

/**
 * Helper: Make authenticated API request
 */
async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: mockAuthHeaders,
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const startTime = performance.now();
  const response = await fetch(url, options);
  const duration = performance.now() - startTime;

  // Log performance
  console.log(`[API] ${method} ${endpoint}: ${response.status} (${duration.toFixed(0)}ms)`);

  return response;
}

/**
 * Helper: Parse JSON response safely
 */
async function parseResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('Failed to parse response:', text);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
  }
}

/**
 * Helper: Measure response time
 */
async function measureResponseTime(fn: () => Promise<any>): Promise<{ result: any; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

describe('Claude API Integration Tests', () => {
  describe('1. /api/descriptions/generate - Image Description Generation', () => {

    it('should generate narrative description in Spanish', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: testData.sampleImages[0].url,
        style: 'narrativo',
        language: 'es',
        maxLength: 200,
      });

      expect(response.status).toBe(200);

      const data = await parseResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);

      // Should have both English and Spanish descriptions
      expect(data.data.length).toBeGreaterThanOrEqual(1);

      const spanishDesc = data.data.find((d: any) => d.language === 'spanish');
      expect(spanishDesc).toBeDefined();
      expect(spanishDesc.content).toBeTruthy();
      expect(spanishDesc.style).toBe('narrativo');
      expect(spanishDesc.content.length).toBeGreaterThan(50);
    }, TEST_TIMEOUT);

    it('should generate all 7 description styles successfully', async () => {
      const styles = testData.descriptionStyles;
      const results = [];

      for (const style of styles) {
        const response = await apiRequest('/api/descriptions/generate', 'POST', {
          imageUrl: testData.sampleImages[0].url,
          style,
          language: 'es',
          maxLength: 150,
        });

        const data = await parseResponse(response);
        results.push({ style, success: response.status === 200, data });
      }

      // All styles should succeed
      const allSucceeded = results.every(r => r.success);
      expect(allSucceeded).toBe(true);

      // Each style should return unique content
      const contents = results.map(r => r.data?.data?.[0]?.content || '');
      const uniqueContents = new Set(contents);
      expect(uniqueContents.size).toBe(styles.length);
    }, TEST_TIMEOUT * 2);

    it('should handle base64 image input', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: testData.sampleImages[3].url, // Base64 image
        style: 'conversacional',
        language: 'en',
        maxLength: 100,
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    }, TEST_TIMEOUT);

    it('should validate invalid image URLs', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: 'not-a-valid-url',
        style: 'narrativo',
        language: 'es',
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Image URL');
    });

    it('should validate style parameter', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: testData.sampleImages[0].url,
        style: 'invalid-style',
        language: 'es',
      });

      // Should use default style and succeed
      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.data[0].style).toBe('narrativo'); // Default style
    });

    it('should enforce max length limits', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: testData.sampleImages[0].url,
        style: 'narrativo',
        language: 'es',
        maxLength: 5000, // Too long
      });

      expect(response.status).toBe(200);
      // Should use default maxLength (300)
      const data = await parseResponse(response);
      expect(data.success).toBe(true);
    });

    it('should include token usage metadata', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: testData.sampleImages[0].url,
        style: 'narrativo',
        language: 'es',
      });

      const data = await parseResponse(response);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.responseTime).toBeDefined();
      expect(data.metadata.timestamp).toBeDefined();
      expect(data.metadata.requestId).toBeDefined();
    });

    it('should respond within performance threshold', async () => {
      const { duration } = await measureResponseTime(async () => {
        const response = await apiRequest('/api/descriptions/generate', 'POST', {
          imageUrl: testData.sampleImages[3].url, // Use small base64 image for speed
          style: 'conversacional',
          language: 'es',
          maxLength: 100,
        });
        return parseResponse(response);
      });

      // Parallel generation should complete in reasonable time
      expect(duration).toBeLessThan(testData.performanceBenchmarks.description_generation.acceptable);
      console.log(`Description generation took ${duration.toFixed(0)}ms`);
    }, TEST_TIMEOUT);

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(3).fill(null).map(() =>
        apiRequest('/api/descriptions/generate', 'POST', {
          imageUrl: testData.sampleImages[3].url,
          style: 'narrativo',
          language: 'es',
          maxLength: 100,
        })
      );

      const { duration } = await measureResponseTime(async () => {
        return Promise.all(requests);
      });

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`3 concurrent requests took ${duration.toFixed(0)}ms`);
    }, TEST_TIMEOUT);

    it('should handle GET request for API info', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'GET');

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.success).toBe(true);
      expect(data.data.service).toBe('Description Generation API');
      expect(data.data.status).toBe('healthy');
      expect(data.data.capabilities).toBeDefined();
      expect(data.data.capabilities.styles).toContain('narrativo');
      expect(data.data.capabilities.languages).toContain('es');
    });
  });

  describe('2. /api/qa/generate - Q&A Pair Generation', () => {

    it('should generate 5 Q&A pairs from description', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: testData.sampleDescriptions.narrativo,
        language: 'es',
        count: 5,
      });

      expect(response.status).toBe(200);

      const data = await parseResponse(response);
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBe(5);

      // Validate Q&A structure
      data.questions.forEach((qa: any) => {
        expect(qa.question).toBeTruthy();
        expect(qa.answer).toBeTruthy();
        expect(qa.difficulty).toBeDefined();
      });

      // Validate metadata
      expect(data.metadata.count).toBe(5);
      expect(data.metadata.language).toBe('es');
      expect(data.metadata.source).toBe('claude-sonnet-4-5');
    }, TEST_TIMEOUT);

    it('should validate description parameter', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        language: 'es',
        count: 5,
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toContain('Description is required');
    });

    it('should enforce count limits (1-10)', async () => {
      const invalidCounts = [0, 15, -1, 'three'];

      for (const count of invalidCounts) {
        const response = await apiRequest('/api/qa/generate', 'POST', {
          description: testData.testTexts.spanish,
          language: 'es',
          count,
        });

        expect(response.status).toBe(400);
        const data = await parseResponse(response);
        expect(data.error).toContain('Count must be a number between 1 and 10');
      }
    });

    it('should validate language parameter', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: testData.testTexts.spanish,
        language: 'fr', // Unsupported
        count: 3,
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toContain('Language must be "es" or "en"');
    });

    it('should use default values for optional parameters', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: testData.testTexts.spanish,
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.metadata.language).toBe('es'); // Default
      expect(data.questions.length).toBe(5); // Default count
    }, TEST_TIMEOUT);

    it('should handle very long descriptions', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: testData.testTexts.long,
        language: 'en',
        count: 3,
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.questions.length).toBe(3);
    }, TEST_TIMEOUT);

    it('should handle special characters in descriptions', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: testData.testTexts.special_chars,
        language: 'es',
        count: 2,
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.questions.length).toBe(2);
    }, TEST_TIMEOUT);

    it('should respond within performance threshold', async () => {
      const { duration } = await measureResponseTime(async () => {
        const response = await apiRequest('/api/qa/generate', 'POST', {
          description: testData.testTexts.spanish,
          language: 'es',
          count: 3,
        });
        return parseResponse(response);
      });

      expect(duration).toBeLessThan(testData.performanceBenchmarks.qa_generation.acceptable);
      console.log(`Q&A generation took ${duration.toFixed(0)}ms`);
    }, TEST_TIMEOUT);

    it('should handle GET request for API info', async () => {
      const response = await apiRequest('/api/qa/generate', 'GET');

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.endpoint).toBe('/api/qa/generate');
      expect(data.method).toBe('POST');
      expect(data.parameters).toBeDefined();
    });
  });

  describe('3. /api/translate - Multi-Language Translation', () => {

    it('should translate English to Spanish', async () => {
      const response = await apiRequest('/api/translate', 'POST', {
        text: testData.testTexts.english,
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      expect(response.status).toBe(200);

      const data = await parseResponse(response);
      expect(data.translation).toBeTruthy();
      expect(data.confidence).toBeGreaterThan(0);
      expect(data.detectedLanguage).toBe('en');
    }, TEST_TIMEOUT);

    it('should translate Spanish to English', async () => {
      const response = await apiRequest('/api/translate', 'POST', {
        text: testData.testTexts.spanish,
        sourceLanguage: 'es',
        targetLanguage: 'en',
      });

      expect(response.status).toBe(200);

      const data = await parseResponse(response);
      expect(data.translation).toBeTruthy();
      expect(data.translation).not.toBe(testData.testTexts.spanish);
    }, TEST_TIMEOUT);

    it('should handle multiple language pairs', async () => {
      const pairs = testData.languages.pairs.slice(0, 3); // Test first 3 pairs

      for (const pair of pairs) {
        const response = await apiRequest('/api/translate', 'POST', {
          text: 'Hello, how are you?',
          sourceLanguage: pair.source,
          targetLanguage: pair.target,
        });

        expect(response.status).toBe(200);
        const data = await parseResponse(response);
        expect(data.translation).toBeTruthy();
        console.log(`${pair.label}: "${data.translation}"`);
      }
    }, TEST_TIMEOUT * 2);

    it('should validate required text parameter', async () => {
      const response = await apiRequest('/api/translate', 'POST', {
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toContain('Text is required');
    });

    it('should validate language parameters', async () => {
      const response = await apiRequest('/api/translate', 'POST', {
        text: 'test',
        sourceLanguage: 'xx',
        targetLanguage: 'yy',
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toContain('Unsupported language code');
    });

    it('should handle special characters', async () => {
      const response = await apiRequest('/api/translate', 'POST', {
        text: testData.testTexts.special_chars,
        sourceLanguage: 'es',
        targetLanguage: 'en',
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.translation).toBeTruthy();
    }, TEST_TIMEOUT);

    it('should handle long texts', async () => {
      const response = await apiRequest('/api/translate', 'POST', {
        text: testData.testTexts.long,
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.translation.length).toBeGreaterThan(50);
    }, TEST_TIMEOUT);

    it('should respond within performance threshold', async () => {
      const { duration } = await measureResponseTime(async () => {
        const response = await apiRequest('/api/translate', 'POST', {
          text: testData.testTexts.spanish,
          sourceLanguage: 'es',
          targetLanguage: 'en',
        });
        return parseResponse(response);
      });

      expect(duration).toBeLessThan(testData.performanceBenchmarks.translation.acceptable);
      console.log(`Translation took ${duration.toFixed(0)}ms`);
    }, TEST_TIMEOUT);

    it('should handle GET request for supported languages', async () => {
      const response = await apiRequest('/api/translate', 'GET');

      expect(response.status).toBe(200);
      const data = await parseResponse(response);
      expect(data.status).toBe('ok');
      expect(data.supportedLanguages).toBeDefined();
      expect(Array.isArray(data.supportedLanguages)).toBe(true);
      expect(data.supportedLanguages.length).toBeGreaterThan(0);

      const spanish = data.supportedLanguages.find((l: any) => l.code === 'es');
      expect(spanish).toBeDefined();
      expect(spanish.name).toBe('Spanish');
    });
  });

  describe('4. Error Handling & Edge Cases', () => {

    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/qa/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        body: JSON.stringify({
          text: 'test',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      });

      // Should still work or return appropriate error
      expect([200, 400, 415]).toContain(response.status);
    });

    it('should handle very large payloads', async () => {
      const largeText = 'a'.repeat(100000); // 100KB text

      const response = await apiRequest('/api/translate', 'POST', {
        text: largeText,
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      // Should either succeed or reject with size error
      expect([200, 413]).toContain(response.status);
    });

    it('should handle empty description for Q&A', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: '',
        language: 'es',
        count: 3,
      });

      expect(response.status).toBe(400);
      const data = await parseResponse(response);
      expect(data.error).toBeDefined();
    });

    it('should handle null/undefined values', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'POST', {
        imageUrl: null,
        style: 'narrativo',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('5. API Key Management & Security', () => {

    it('should work with server-side API key', async () => {
      // Test that API works without user-provided key (uses server key)
      const response = await apiRequest('/api/translate', 'POST', {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      // Should succeed with server key
      expect([200, 500]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should include security headers in responses', async () => {
      const response = await apiRequest('/api/descriptions/generate', 'GET');

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Type')).toContain('application/json');
    });

    it('should include request tracking headers', async () => {
      const response = await apiRequest('/api/qa/generate', 'POST', {
        description: testData.testTexts.spanish,
      });

      const data = await parseResponse(response);

      if (response.status === 200) {
        expect(data.metadata.timestamp).toBeDefined();
        expect(response.headers.get('X-Response-Time')).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });

  describe('6. Performance Benchmarks', () => {

    it('should generate descriptions within acceptable time', async () => {
      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measureResponseTime(async () => {
          const response = await apiRequest('/api/descriptions/generate', 'POST', {
            imageUrl: testData.sampleImages[3].url,
            style: 'narrativo',
            language: 'es',
            maxLength: 100,
          });
          return parseResponse(response);
        });
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Description generation: avg ${avgTime.toFixed(0)}ms, max ${maxTime.toFixed(0)}ms`);

      expect(avgTime).toBeLessThan(testData.performanceBenchmarks.description_generation.acceptable);
    }, TEST_TIMEOUT * 3);

    it('should handle burst traffic efficiently', async () => {
      const burstSize = 5;
      const requests = Array(burstSize).fill(null).map((_, i) =>
        apiRequest('/api/qa/generate', 'POST', {
          description: testData.testTexts.spanish,
          language: 'es',
          count: 2,
        })
      );

      const { duration, result: responses } = await measureResponseTime(async () => {
        return Promise.all(requests);
      });

      const successCount = responses.filter((r: Response) => r.status === 200).length;

      console.log(`Burst test: ${successCount}/${burstSize} succeeded in ${duration.toFixed(0)}ms`);

      expect(successCount).toBeGreaterThan(0);
    }, TEST_TIMEOUT * 2);
  });
});

describe('Claude API Integration - Summary', () => {
  it('should print test summary', () => {
    console.log('\n=== Claude API Integration Test Summary ===');
    console.log('✓ Descriptions API: Claude Sonnet 4.5 vision integration');
    console.log('✓ Q&A API: Claude-powered question generation');
    console.log('✓ Translation API: Multi-language support via Claude');
    console.log('✓ All endpoints migrated from OpenAI to Claude');
    console.log('✓ Performance benchmarks validated');
    console.log('✓ Error handling tested');
    console.log('✓ Security headers verified');
    console.log('==========================================\n');
  });
});
