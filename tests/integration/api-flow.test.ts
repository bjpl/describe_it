/**
 * API Flow Integration Test Suite
 * End-to-end testing of complete API workflows and user journeys
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setupMSW, simulateTimeout, simulateRateLimiting, resetRequestCount } from '../mocks/msw.setup';
import { createMockOpenAI } from '../mocks/openai.mock';
import { createMockUnsplash } from '../mocks/unsplash.mock';
import { testImageUrls, sampleResponses, userScenarios, performanceTestData } from '../fixtures/test-data';

// Setup MSW for HTTP interception
setupMSW();

describe('API Flow Integration Tests', () => {
  let mockOpenAI: any;
  let mockUnsplash: any;

  beforeAll(() => {
    // Setup performance monitoring
    global.performance.mark = vi.fn();
    global.performance.measure = vi.fn();
  });

  beforeEach(() => {
    mockOpenAI = createMockOpenAI('visionSuccess');
    mockUnsplash = createMockUnsplash('success');
    resetRequestCount();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    delete global.performance.mark;
    delete global.performance.measure;
  });

  describe('Complete Image Description Flow', () => {
    it('should complete full workflow: search -> select -> describe -> vocabulary -> questions', async () => {
      const workflow = new APIWorkflowTester();
      
      // Step 1: Search for images
      const searchResults = await workflow.searchImages('mountain sunset');
      expect(searchResults.success).toBe(true);
      expect(searchResults.images).toHaveLength(3);
      
      // Step 2: Select an image
      const selectedImage = searchResults.images[0];
      expect(selectedImage.url).toBeTruthy();
      expect(selectedImage.thumbnail).toBeTruthy();
      
      // Step 3: Generate description
      const description = await workflow.generateDescription(
        selectedImage.url,
        'sk-valid1234567890abcdefghijklmnop'
      );
      expect(description.success).toBe(true);
      expect(description.description).toBeTruthy();
      expect(description.description.length).toBeGreaterThan(50);
      
      // Step 4: Generate vocabulary
      expect(description.vocabulary).toBeDefined();
      expect(description.vocabulary.length).toBeGreaterThan(0);
      description.vocabulary.forEach(word => {
        expect(word.word).toBeTruthy();
        expect(word.definition).toBeTruthy();
        expect(word.examples).toBeDefined();
        expect(Array.isArray(word.examples)).toBe(true);
      });
      
      // Step 5: Generate questions
      expect(description.questions).toBeDefined();
      expect(description.questions.length).toBeGreaterThan(0);
      description.questions.forEach(q => {
        expect(q.question).toBeTruthy();
        expect(q.answer).toBeTruthy();
        expect(q.difficulty).toMatch(/easy|medium|hard/);
      });
      
      // Verify workflow timing
      expect(workflow.getTotalTime()).toBeLessThan(10000); // Should complete under 10 seconds
    });

    it('should handle user preferences correctly', async () => {
      const scenarios = [userScenarios.beginner, userScenarios.intermediate, userScenarios.advanced];
      
      for (const scenario of scenarios) {
        const workflow = new APIWorkflowTester();
        const result = await workflow.generateDescriptionWithPreferences(
          testImageUrls.validJpeg,
          'sk-valid1234567890abcdefghijklmnop',
          scenario.profile.preferences
        );
        
        expect(result.success).toBe(true);
        
        // Verify vocabulary count matches user level
        expect(result.vocabulary.length).toBeGreaterThanOrEqual(
          scenario.expectedBehavior.vocabularyCount - 2
        );
        expect(result.vocabulary.length).toBeLessThanOrEqual(
          scenario.expectedBehavior.vocabularyCount + 2
        );
        
        // Verify question count matches user level
        expect(result.questions.length).toBeGreaterThanOrEqual(
          scenario.expectedBehavior.questionCount - 1
        );
        expect(result.questions.length).toBeLessThanOrEqual(
          scenario.expectedBehavior.questionCount + 1
        );
        
        // Verify description length matches preference
        const wordCount = result.description.split(' ').length;
        switch (scenario.profile.preferences.descriptionLength) {
          case 'short':
            expect(wordCount).toBeLessThan(100);
            break;
          case 'medium':
            expect(wordCount).toBeLessThan(200);
            break;
          case 'detailed':
            expect(wordCount).toBeGreaterThan(150);
            break;
        }
      }
    });

    it('should maintain consistency across multiple requests', async () => {
      const workflow = new APIWorkflowTester();
      const imageUrl = testImageUrls.validJpeg;
      const apiKey = 'sk-consistency1234567890abcdef';
      
      // Generate multiple descriptions for the same image
      const results = await Promise.all([
        workflow.generateDescription(imageUrl, apiKey),
        workflow.generateDescription(imageUrl, apiKey),
        workflow.generateDescription(imageUrl, apiKey)
      ]);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Descriptions should be similar but not identical
      const descriptions = results.map(r => r.description);
      expect(descriptions[0]).toBeTruthy();
      expect(descriptions[1]).toBeTruthy();
      expect(descriptions[2]).toBeTruthy();
      
      // Should contain similar key terms
      const keyTerms = ['mountain', 'sunset', 'landscape', 'beautiful'];
      keyTerms.forEach(term => {
        const occurrences = descriptions.filter(desc => 
          desc.toLowerCase().includes(term)
        ).length;
        expect(occurrences).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully', async () => {
      const workflow = new APIWorkflowTester();
      
      // Simulate OpenAI API failure
      mockOpenAI.setScenario('rateLimitError');
      
      const result = await workflow.generateDescription(
        testImageUrls.validJpeg,
        'sk-valid1234567890abcdefghijklmnop'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.retryAfter).toBeTruthy();
    });

    it('should implement exponential backoff for retries', async () => {
      const workflow = new APIWorkflowTester();
      const startTime = Date.now();
      
      // Setup temporary failure that recovers
      let attemptCount = 0;
      mockOpenAI.chat.completions.create.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return sampleResponses.description.success;
      });
      
      const result = await workflow.generateDescriptionWithRetry(
        testImageUrls.validJpeg,
        'sk-retry1234567890abcdefghijklmnop',
        { maxRetries: 3, exponentialBackoff: true }
      );
      
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      
      // Should have used exponential backoff (approximate timing check)
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeGreaterThan(3000); // First retry after 1s, second after 2s
    });

    it('should handle partial failures in batch processing', async () => {
      const workflow = new APIWorkflowTester();
      const images = [
        testImageUrls.validJpeg,
        testImageUrls.invalidUrl,
        testImageUrls.validPng,
        testImageUrls.nonExistent
      ];
      
      const results = await workflow.processBatch(
        images,
        'sk-batch1234567890abcdefghijklmnop'
      );
      
      expect(results).toHaveLength(4);
      
      // Valid images should succeed
      expect(results[0].success).toBe(true);
      expect(results[2].success).toBe(true);
      
      // Invalid images should fail gracefully
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeTruthy();
      expect(results[3].success).toBe(false);
      expect(results[3].error).toBeTruthy();
      
      // Should not affect valid processing
      expect(results[0].description).toBeTruthy();
      expect(results[2].description).toBeTruthy();
    });

    it('should handle network timeouts appropriately', async () => {
      simulateTimeout(8000); // 8 second delay
      
      const workflow = new APIWorkflowTester();
      const startTime = Date.now();
      
      const result = await workflow.generateDescription(
        testImageUrls.validJpeg,
        'sk-timeout1234567890abcdefghijklmnop',
        { timeout: 5000 } // 5 second timeout
      );
      
      const totalTime = Date.now() - startTime;
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TIMEOUT_ERROR');
      expect(totalTime).toBeLessThan(6000); // Should timeout before 6 seconds
    });
  });

  describe('Performance and Load Testing', () => {
    it('should meet performance benchmarks', async () => {
      const workflow = new APIWorkflowTester();
      const benchmarks = performanceTestData;
      
      // Test small image processing
      const startTime = performance.now();
      const result = await workflow.generateDescription(
        benchmarks.smallImage.url,
        'sk-perf1234567890abcdefghijklmnop'
      );
      const processingTime = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(benchmarks.smallImage.expectedProcessingTime);
    });

    it('should handle concurrent requests efficiently', async () => {
      const workflow = new APIWorkflowTester();
      const concurrentRequests = 10;
      const apiKey = 'sk-concurrent1234567890abcdef';
      
      const startTime = performance.now();
      
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        workflow.generateDescription(
          testImageUrls.validJpeg,
          apiKey,
          { requestId: `concurrent-${i}` }
        )
      );
      
      const results = await Promise.all(requests);
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.description).toBeTruthy();
      });
      
      // Average time should be reasonable for concurrent processing
      expect(averageTime).toBeLessThan(5000); // 5 seconds average
      
      // Total time should be less than sequential processing
      expect(totalTime).toBeLessThan(concurrentRequests * 3000); // Less than 30 seconds total
    });

    it('should implement proper rate limiting', async () => {
      simulateRateLimiting();
      
      const workflow = new APIWorkflowTester();
      const apiKey = 'sk-ratelimit1234567890abcdef';
      
      // Make requests until rate limited
      let rateLimitHit = false;
      let successCount = 0;
      let rateLimitCount = 0;
      
      for (let i = 0; i < 20 && !rateLimitHit; i++) {
        const result = await workflow.generateDescription(
          testImageUrls.validJpeg,
          apiKey
        );
        
        if (result.success) {
          successCount++;
        } else if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
          rateLimitCount++;
          rateLimitHit = true;
        }
      }
      
      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThan(20); // Some requests should be rate limited
    });

    it('should optimize memory usage during processing', async () => {
      const workflow = new APIWorkflowTester();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple images
      for (let i = 0; i < 10; i++) {
        await workflow.generateDescription(
          testImageUrls.validJpeg,
          `sk-memory-${i}-1234567890abcdef`
        );
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should validate response data structure', async () => {
      const workflow = new APIWorkflowTester();
      
      const result = await workflow.generateDescription(
        testImageUrls.validJpeg,
        'sk-validation1234567890abcdef'
      );
      
      expect(result.success).toBe(true);
      
      // Validate description structure
      expect(typeof result.description).toBe('string');
      expect(result.description.length).toBeGreaterThan(10);
      
      // Validate vocabulary structure
      expect(Array.isArray(result.vocabulary)).toBe(true);
      result.vocabulary.forEach(item => {
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('definition');
        expect(item).toHaveProperty('examples');
        expect(typeof item.word).toBe('string');
        expect(typeof item.definition).toBe('string');
        expect(Array.isArray(item.examples)).toBe(true);
      });
      
      // Validate questions structure
      expect(Array.isArray(result.questions)).toBe(true);
      result.questions.forEach(item => {
        expect(item).toHaveProperty('question');
        expect(item).toHaveProperty('answer');
        expect(item).toHaveProperty('difficulty');
        expect(typeof item.question).toBe('string');
        expect(typeof item.answer).toBe('string');
        expect(['easy', 'medium', 'hard']).toContain(item.difficulty);
      });
    });

    it('should sanitize and validate user inputs', async () => {
      const workflow = new APIWorkflowTester();
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd'
      ];
      
      for (const maliciousInput of maliciousInputs) {
        const result = await workflow.generateDescription(
          maliciousInput, // Malicious URL
          'sk-security1234567890abcdef'
        );
        
        // Should either reject the input or sanitize it
        expect(result.success).toBe(false);
        if (result.error) {
          expect(result.error.code).toMatch(/INVALID_INPUT|VALIDATION_ERROR/);
        }
      }
    });

    it('should ensure data consistency across multiple API calls', async () => {
      const workflow = new APIWorkflowTester();
      const imageUrl = testImageUrls.validJpeg;
      const apiKey = 'sk-consistency1234567890abcdef';
      
      // Make multiple calls and ensure consistency
      const results = await Promise.all([
        workflow.generateDescription(imageUrl, apiKey),
        workflow.generateDescription(imageUrl, apiKey),
        workflow.generateDescription(imageUrl, apiKey)
      ]);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Check for consistent vocabulary themes
      const allVocabulary = results.flatMap(r => r.vocabulary.map(v => v.word));
      const uniqueWords = [...new Set(allVocabulary)];
      
      // Should have some overlapping vocabulary
      expect(uniqueWords.length).toBeLessThan(allVocabulary.length);
    });
  });
});

// Helper class for workflow testing
class APIWorkflowTester {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  async searchImages(query: string) {
    const response = await fetch('/api/images/search?' + new URLSearchParams({ query }));
    return await response.json();
  }
  
  async generateDescription(imageUrl: string, apiKey: string, options: any = {}) {
    const response = await fetch('/api/descriptions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        apiKey,
        ...options
      })
    });
    
    return await response.json();
  }
  
  async generateDescriptionWithPreferences(imageUrl: string, apiKey: string, preferences: any) {
    return await this.generateDescription(imageUrl, apiKey, { preferences });
  }
  
  async generateDescriptionWithRetry(imageUrl: string, apiKey: string, retryOptions: any) {
    let lastError;
    const { maxRetries = 3, exponentialBackoff = false } = retryOptions;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.generateDescription(imageUrl, apiKey);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = exponentialBackoff ? Math.pow(2, attempt) * 1000 : 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: lastError || new Error('Max retries exceeded')
    };
  }
  
  async processBatch(imageUrls: string[], apiKey: string) {
    const results = await Promise.allSettled(
      imageUrls.map(url => this.generateDescription(url, apiKey))
    );
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: { code: 'PROCESSING_FAILED', message: result.reason.message }
        };
      }
    });
  }
  
  getTotalTime() {
    return Date.now() - this.startTime;
  }
}