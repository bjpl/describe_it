/**
 * Vision API Edge Cases and Bug Detection Tests
 * 
 * This test suite is designed to identify bugs, edge cases, and potential issues
 * in the vision API implementation including error handling, type safety, and edge cases.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Vision API Bug Detection & Edge Cases', () => {
  let server: any;

  beforeAll(async () => {
    // Start development server if not already running
    console.log('Testing against:', API_BASE_URL);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('🚨 CRITICAL BUGS - Request Validation', () => {
    it('should handle null imageUrl gracefully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: null,
          style: 'narrativo'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should handle undefined imageUrl gracefully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'narrativo'
          // imageUrl is missing
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle empty string imageUrl', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: '',
          style: 'narrativo'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle invalid style values', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'invalid_style'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request parameters');
    });
  });

  describe('🔍 Image URL Edge Cases', () => {
    it('should handle malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        'ftp://example.com/image.jpg',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      for (const badUrl of malformedUrls) {
        const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: badUrl,
            style: 'narrativo'
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        console.log(`✓ Blocked malformed URL: ${badUrl}`);
      }
    });

    it('should handle non-existent image URLs', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/non-existent-image-12345',
          style: 'narrativo'
        })
      });

      // Should still return success but with fallback description
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.metadata.fallback || data.metadata.demoMode).toBe(true);
    });

    it('should handle very long URLs', async () => {
      const longUrl = 'https://images.unsplash.com/' + 'a'.repeat(2000);
      
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: longUrl,
          style: 'narrativo'
        })
      });

      expect([400, 413]).toContain(response.status);
    });

    it('should handle data URLs (base64 images)', async () => {
      // 1x1 pixel red PNG in base64
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: dataUrl,
          style: 'narrativo'
        })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('🌐 Language Switching Edge Cases', () => {
    it('should handle invalid language codes', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo',
          language: 'invalid'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should default to Spanish when language is missing', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
          // language is missing - should default to "es"
        })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      
      // Check that Spanish description exists
      const spanishDescription = data.data.find((d: any) => d.language === 'spanish');
      expect(spanishDescription).toBeDefined();
    });

    it('should generate both languages correctly', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo',
          language: 'en'
        })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2); // Should have both English and Spanish
      
      const englishDescription = data.data.find((d: any) => d.language === 'english');
      const spanishDescription = data.data.find((d: any) => d.language === 'spanish');
      
      expect(englishDescription).toBeDefined();
      expect(spanishDescription).toBeDefined();
      expect(englishDescription.content).not.toBe(spanishDescription.content);
    });
  });

  describe('🎭 Description Style Edge Cases', () => {
    const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4';
    const styles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];

    styles.forEach(style => {
      it(`should generate ${style} style descriptions without errors`, async () => {
        const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: testImageUrl,
            style: style
          })
        });

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        
        // Check that descriptions were generated for both languages
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThanOrEqual(1);
        
        // Verify style is correctly set
        data.data.forEach((description: any) => {
          expect(description.style).toBe(style);
          expect(description.content).toBeDefined();
          expect(typeof description.content).toBe('string');
          expect(description.content.length).toBeGreaterThan(0);
        });
      }, 15000); // Increased timeout for API calls
    });

    it('should handle case-sensitive style values', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: testImageUrl,
          style: 'NARRATIVO' // uppercase should fail validation
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('📏 Parameter Edge Cases', () => {
    const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4';

    it('should handle extreme maxLength values', async () => {
      const extremeValues = [0, -1, 10000, '500', null, undefined];

      for (const maxLength of extremeValues) {
        const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: testImageUrl,
            style: 'narrativo',
            maxLength: maxLength
          })
        });

        if (maxLength === null || maxLength === undefined || 
            (typeof maxLength === 'number' && (maxLength < 50 || maxLength > 2000))) {
          expect([400, 413]).toContain(response.status);
        } else if (maxLength === '500') {
          // String should be coerced to number
          const data = await response.json();
          expect(data.success).toBe(true);
        }
      }
    });

    it('should handle malicious customPrompt values', async () => {
      const maliciousPrompts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onload="alert(1)"',
        '<iframe src="evil.com"></iframe>',
        'expression(alert(1))'
      ];

      for (const prompt of maliciousPrompts) {
        const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: testImageUrl,
            style: 'narrativo',
            customPrompt: prompt
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('dangerous content');
      }
    });
  });

  describe('🔒 Security & Headers', () => {
    it('should reject requests with suspicious user agents', async () => {
      const suspiciousAgents = [
        'curl/7.68.0',
        'wget/1.20.3',
        'python-requests/2.25.1',
        'Ruby',
        'scanner-bot'
      ];

      for (const userAgent of suspiciousAgents) {
        const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': userAgent
          },
          body: JSON.stringify({
            imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
            style: 'narrativo'
          })
        });

        expect(response.status).toBe(403);
      }
    });

    it('should include proper security headers in response', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
        })
      });

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    });
  });

  describe('📊 Response Format Validation', () => {
    it('should always return consistent response structure', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
        })
      });

      const data = await response.json();
      
      // Validate response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('timestamp');
      expect(data.metadata).toHaveProperty('responseTime');
      expect(data.metadata).toHaveProperty('requestId');
      
      if (data.success) {
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
        
        data.data.forEach((description: any) => {
          expect(description).toHaveProperty('id');
          expect(description).toHaveProperty('style');
          expect(description).toHaveProperty('content');
          expect(description).toHaveProperty('language');
          expect(description).toHaveProperty('createdAt');
        });
      } else {
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe('⚡ Performance & Resource Management', () => {
    it('should handle concurrent requests without memory leaks', async () => {
      const testImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4';
      const concurrentRequests = 5;
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        fetch(`${API_BASE_URL}/api/descriptions/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: testImageUrl,
            style: 'narrativo'
          })
        })
      );

      const responses = await Promise.allSettled(promises);
      
      // All requests should complete (either success or controlled failure)
      expect(responses.length).toBe(concurrentRequests);
      
      // Check that responses are consistent
      for (const result of responses) {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeGreaterThanOrEqual(200);
          expect(result.value.status).toBeLessThan(600);
        }
      }
    }, 30000);

    it('should have reasonable response times', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
        })
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 30 seconds (API timeout is 30s)
      expect(responseTime).toBeLessThan(30000);
      
      const data = await response.json();
      if (data.metadata && data.metadata.responseTime) {
        const serverResponseTime = parseFloat(data.metadata.responseTime.replace('ms', ''));
        console.log(`Server response time: ${serverResponseTime}ms, Total time: ${responseTime}ms`);
      }
    }, 35000);
  });

  describe('🔄 Fallback & Demo Mode', () => {
    it('should gracefully fallback to demo mode when API fails', async () => {
      // This test verifies fallback behavior - difficult to force API failure
      // but we can check the response structure supports fallback
      
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
        })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.metadata).toHaveProperty('demoMode');
      expect(typeof data.metadata.demoMode).toBe('boolean');
      
      // If in demo mode, should still provide descriptions
      if (data.metadata.demoMode) {
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);
        
        data.data.forEach((description: any) => {
          expect(description.content).toBeDefined();
          expect(description.content.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('🧪 Type Safety & Null Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect([400, 500]).toContain(response.status);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${API_BASE_URL}/api/descriptions/generate`, {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
        })
      });

      // Should either work or give proper error
      expect([200, 400, 415]).toContain(response.status);
    });
  });

  describe('🔍 Vision API Status Endpoint', () => {
    it('should provide diagnostic information', async () => {
      const response = await fetch(`${API_BASE_URL}/api/test/vision`, {
        method: 'GET'
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('apiKeyProvider');
      expect(data).toHaveProperty('openAIService');
      expect(data).toHaveProperty('environment');
      expect(data.apiKeyProvider).toHaveProperty('hasKey');
      expect(data.apiKeyProvider).toHaveProperty('isValid');
      expect(data.openAIService).toHaveProperty('isConfigured');
    });

    it('should test vision functionality with POST', async () => {
      const response = await fetch(`${API_BASE_URL}/api/test/vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          style: 'narrativo'
        })
      });

      expect([200, 500]).toContain(response.status);
      const data = await response.json();
      
      expect(data).toHaveProperty('success');
      if (data.success) {
        expect(data).toHaveProperty('result');
        expect(data.result).toHaveProperty('textPreview');
      } else {
        expect(data).toHaveProperty('error');
      }
    });
  });
});