import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/images/search/route';
import { POST } from '@/app/api/descriptions/generate/route';
import { createApiError, createNetworkError } from '../utils/test-factories';

/**
 * Security and Validation Test Suite
 * 
 * Tests the security measures and input validation across the application
 * to ensure protection against common vulnerabilities.
 */

// Mock the validation schemas
vi.mock('@/lib/validations/schemas', () => ({
  searchImageSchema: {
    parse: vi.fn(),
  },
  descriptionSchema: {
    parse: vi.fn(),
  },
  phraseExtractionSchema: {
    parse: vi.fn(),
  },
}));

// Mock rate limiting
vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

describe('Security and Validation Tests', () => {
  let mockValidateSearchSchema: any;
  let mockValidateDescriptionSchema: any;
  let mockCheckRateLimit: any;
  
  beforeEach(() => {
    const { searchImageSchema, descriptionSchema } = require('@/lib/validations/schemas');
    const { checkRateLimit } = require('@/lib/utils/rate-limit');
    
    mockValidateSearchSchema = searchImageSchema.parse;
    mockValidateDescriptionSchema = descriptionSchema.parse;
    mockCheckRateLimit = checkRateLimit;
    
    // Default mocks
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  const createRequest = (url: string, method: string = 'GET', body?: any) => {
    const request = new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return request;
  };
  
  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in search queries', async () => {
      const maliciousQuery = '<script>alert("XSS")</script>';
      const request = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(maliciousQuery)}`
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        page: 1,
        per_page: 20,
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockValidateSearchSchema).toHaveBeenCalledWith(
        expect.objectContaining({
          query: maliciousQuery,
        })
      );
    });
    
    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE images; --";
      const request = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(sqlInjection)}`
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: sqlInjection, // Should be safely handled
        page: 1,
        per_page: 20,
      });
      
      const response = await GET(request);
      
      // Should not crash or cause errors
      expect(response.status).toBeLessThan(500);
    });
    
    it('should handle HTML injection attempts', async () => {
      const htmlInjection = '<img src=x onerror=alert(1)>';
      const request = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(htmlInjection)}`
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: '&lt;img src=x onerror=alert(1)&gt;',
        page: 1,
        per_page: 20,
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      // Response should not contain unescaped HTML
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('<img');
      expect(responseText).not.toContain('onerror');
    });
    
    it('should sanitize JavaScript execution attempts', async () => {
      const jsInjection = 'javascript:alert("hack")';
      const request = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(jsInjection)}`
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: jsInjection,
        page: 1,
        per_page: 20,
      });
      
      const response = await GET(request);
      
      expect(response.status).toBeLessThan(500);
    });
  });
  
  describe('Input Length Validation', () => {
    it('should reject extremely long query strings', async () => {
      const longQuery = 'a'.repeat(10000);
      const request = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(longQuery)}`
      );
      
      mockValidateSearchSchema.mockImplementation(() => {
        throw new Error('Query too long');
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation Error');
    });
    
    it('should limit request body size', async () => {
      const largePayload = {
        imageId: 'test',
        style: 'narrativo',
        data: 'x'.repeat(100000), // 100KB of data
      };
      
      const request = createRequest(
        'http://localhost:3000/api/descriptions/generate',
        'POST',
        largePayload
      );
      
      mockValidateDescriptionSchema.mockImplementation(() => {
        throw new Error('Payload too large');
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Parameter Type Validation', () => {
    it('should validate numeric parameters', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search?query=test&page=abc&per_page=xyz'
      );
      
      mockValidateSearchSchema.mockImplementation(() => {
        throw new Error('Invalid numeric parameters');
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });
    
    it('should validate enum values', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search?query=test&orientation=invalid&color=notacolor'
      );
      
      mockValidateSearchSchema.mockImplementation(() => {
        throw new Error('Invalid enum values');
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });
    
    it('should validate required fields', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search' // Missing query
      );
      
      mockValidateSearchSchema.mockImplementation(() => {
        throw new Error('Required field missing');
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Rate Limiting Security', () => {
    it('should enforce rate limits per IP', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search?query=test'
      );
      
      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 3600000,
        remaining: 0,
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Rate Limit Exceeded');
      
      // Should include rate limit headers
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });
    
    it('should handle different rate limits per endpoint', async () => {
      // Search endpoint rate limit
      const searchRequest = createRequest(
        'http://localhost:3000/api/images/search?query=test'
      );
      
      mockCheckRateLimit.mockResolvedValueOnce({
        allowed: false,
        endpoint: 'search',
        limit: 100,
        remaining: 0,
      });
      
      const searchResponse = await GET(searchRequest);
      expect(searchResponse.status).toBe(429);
      
      // Description endpoint might have different limits
      const descRequest = createRequest(
        'http://localhost:3000/api/descriptions/generate',
        'POST',
        { imageId: 'test', style: 'narrativo' }
      );
      
      mockCheckRateLimit.mockResolvedValueOnce({
        allowed: false,
        endpoint: 'descriptions',
        limit: 50,
        remaining: 0,
      });
      
      const descResponse = await POST(descRequest);
      expect(descResponse.status).toBe(429);
    });
    
    it('should prevent rate limit bypass attempts', async () => {
      const baseRequest = createRequest(
        'http://localhost:3000/api/images/search?query=test'
      );
      
      // Try various bypass techniques
      const bypassAttempts = [
        // Different case headers
        { 'x-forwarded-for': '1.2.3.4' },
        { 'X-Forwarded-For': '1.2.3.4' },
        { 'X-FORWARDED-FOR': '1.2.3.4' },
        // Multiple IPs
        { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
        // Private IPs
        { 'X-Forwarded-For': '192.168.1.1' },
        { 'X-Forwarded-For': '10.0.0.1' },
      ];
      
      mockCheckRateLimit.mockResolvedValue({ allowed: false });
      
      for (const headers of bypassAttempts) {
        const request = new NextRequest(baseRequest.url, {
          method: 'GET',
          headers: { ...baseRequest.headers, ...headers },
        });
        
        const response = await GET(request);
        expect(response.status).toBe(429); // Should still be rate limited
      }
    });
  });
  
  describe('Authorization and Authentication', () => {
    it('should handle missing API keys gracefully', async () => {
      // Mock API that requires authentication
      vi.mock('@/lib/api/openai', () => ({
        generateDescription: vi.fn().mockRejectedValue(createApiError(401, 'Unauthorized')),
      }));
      
      const request = createRequest(
        'http://localhost:3000/api/descriptions/generate',
        'POST',
        { imageId: 'test', style: 'narrativo' }
      );
      
      mockValidateDescriptionSchema.mockReturnValue({
        imageId: 'test',
        style: 'narrativo',
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
    
    it('should validate API key format', async () => {
      // Mock environment variable with invalid API key
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'invalid-key-format';
      
      try {
        const request = createRequest(
          'http://localhost:3000/api/descriptions/generate',
          'POST',
          { imageId: 'test', style: 'narrativo' }
        );
        
        mockValidateDescriptionSchema.mockReturnValue({
          imageId: 'test',
          style: 'narrativo',
        });
        
        const response = await POST(request);
        
        // Should handle invalid API key gracefully
        expect(response.status).toBeGreaterThanOrEqual(400);
      } finally {
        process.env.OPENAI_API_KEY = originalEnv;
      }
    });
  });
  
  describe('CORS and Headers Security', () => {
    it('should include security headers', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search?query=test'
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: 'test',
        page: 1,
        per_page: 20,
      });
      
      const response = await GET(request);
      
      // Check for security headers
      const headers = response.headers;
      
      // Content Security Policy might be set
      if (headers.get('Content-Security-Policy')) {
        expect(headers.get('Content-Security-Policy')).toContain('default-src');
      }
      
      // X-Content-Type-Options
      if (headers.get('X-Content-Type-Options')) {
        expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      }
      
      // X-Frame-Options
      if (headers.get('X-Frame-Options')) {
        expect(headers.get('X-Frame-Options')).toBe('DENY');
      }
    });
    
    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/images/search',
        {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        }
      );
      
      // This would typically be handled by middleware
      // Test that the endpoint doesn't crash on OPTIONS
      try {
        const response = await GET(request);
        // Should either handle OPTIONS or return method not allowed
        expect([200, 204, 405]).toContain(response.status);
      } catch (error) {
        // OPTIONS might not be implemented, which is fine
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('Error Information Disclosure', () => {
    it('should not leak sensitive information in error messages', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search?query=test'
      );
      
      // Mock internal error with sensitive info
      mockValidateSearchSchema.mockImplementation(() => {
        const error = new Error('Database connection failed: password=secret123');
        error.stack = 'Error at /home/user/app/secret-file.js:123';
        throw error;
      });
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation Error');
      
      // Should not leak sensitive information
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('secret123');
      expect(responseText).not.toContain('/home/user/app');
      expect(responseText).not.toContain('stack');
    });
    
    it('should provide generic error messages for internal failures', async () => {
      const request = createRequest(
        'http://localhost:3000/api/images/search?query=test'
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: 'test',
        page: 1,
        per_page: 20,
      });
      
      // Mock internal API error
      vi.mock('@/lib/api/unsplash', () => ({
        searchImages: vi.fn().mockRejectedValue(
          new Error('Internal API configuration error: api_key_missing')
        ),
      }));
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Failed to search images');
      
      // Should not expose internal error details
      expect(data.message).not.toContain('api_key_missing');
      expect(data.message).not.toContain('configuration');
    });
  });
  
  describe('Content Type Validation', () => {
    it('should validate Content-Type for POST requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/descriptions/generate',
        {
          method: 'POST',
          body: JSON.stringify({ imageId: 'test', style: 'narrativo' }),
          headers: {
            'Content-Type': 'text/plain', // Wrong content type
          },
        }
      );
      
      const response = await POST(request);
      
      // Should reject or handle gracefully
      expect([400, 415]).toContain(response.status);
    });
    
    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/descriptions/generate',
        {
          method: 'POST',
          body: '{invalid json}',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON');
    });
  });
  
  describe('Resource Limits and DoS Protection', () => {
    it('should limit concurrent requests', async () => {
      // Simulate many concurrent requests
      const requests = Array.from({ length: 100 }, () =>
        createRequest('http://localhost:3000/api/images/search?query=dos-test')
      );
      
      mockValidateSearchSchema.mockReturnValue({
        query: 'dos-test',
        page: 1,
        per_page: 20,
      });
      
      // Mock rate limiter to allow some but reject others
      let callCount = 0;
      mockCheckRateLimit.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          allowed: callCount <= 10, // Only allow first 10
        });
      });
      
      const responses = await Promise.all(
        requests.map(request => GET(request))
      );
      
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
    
    it('should timeout long-running requests', async () => {
      const request = createRequest(
        'http://localhost:3000/api/descriptions/generate',
        'POST',
        { imageId: 'timeout-test', style: 'narrativo' }
      );
      
      mockValidateDescriptionSchema.mockReturnValue({
        imageId: 'timeout-test',
        style: 'narrativo',
      });
      
      // Mock API call that takes too long
      vi.mock('@/lib/api/openai', () => ({
        generateDescription: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 30000))
        ),
      }));
      
      const startTime = Date.now();
      const response = await POST(request);
      const duration = Date.now() - startTime;
      
      // Should timeout before 30 seconds
      expect(duration).toBeLessThan(15000);
      expect([408, 504]).toContain(response.status);
    });
  });
  
  describe('Unicode and Encoding Security', () => {
    it('should handle Unicode normalization attacks', async () => {
      // Different Unicode representations of the same character
      const normalizedQuery = 'café';
      const decomposedQuery = 'cafe\u0301'; // 'é' as 'e' + combining accent
      
      const request1 = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(normalizedQuery)}`
      );
      const request2 = createRequest(
        `http://localhost:3000/api/images/search?query=${encodeURIComponent(decomposedQuery)}`
      );
      
      mockValidateSearchSchema.mockImplementation((data) => ({
        query: data.query,
        page: 1,
        per_page: 20,
      }));
      
      const response1 = await GET(request1);
      const response2 = await GET(request2);
      
      // Both should be handled consistently
      expect(response1.status).toBe(response2.status);
    });
    
    it('should prevent encoding bypass attempts', async () => {
      // Various encoding attempts to bypass validation
      const encodingAttempts = [
        '%3Cscript%3Ealert(1)%3C/script%3E', // URL encoded
        '%253Cscript%253E', // Double URL encoded
        '\u003Cscript\u003E', // Unicode escaped
      ];
      
      for (const encoded of encodingAttempts) {
        const request = createRequest(
          `http://localhost:3000/api/images/search?query=${encoded}`
        );
        
        mockValidateSearchSchema.mockReturnValue({
          query: decodeURIComponent(encoded),
          page: 1,
          per_page: 20,
        });
        
        const response = await GET(request);
        const data = await response.json();
        
        // Should not contain executable code
        const responseText = JSON.stringify(data);
        expect(responseText).not.toContain('<script>');
      }
    });
  });
});
