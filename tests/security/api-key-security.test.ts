/**
 * API Key Security Test Suite
 * Tests for secure handling of API keys, authentication, and authorization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupMSW, simulateNetworkError } from '../mocks/msw.setup';
import { securityTestData } from '../fixtures/test-data';
import { createMockOpenAI } from '../mocks/openai.mock';

// Setup MSW for HTTP interception
setupMSW();

describe('API Key Security Tests', () => {
  let mockOpenAI: any;
  
  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    vi.clearAllMocks();
    
    // Clear any stored API keys
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Validation', () => {
    it.each(securityTestData.apiKeyTestCases)(
      'should validate API key: $key (should pass: $shouldPass)',
      async ({ key, shouldPass, reason }) => {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            apiKey: key
          })
        });

        if (shouldPass) {
          expect(response.ok).toBe(true);
        } else {
          expect(response.ok).toBe(false);
          
          const errorData = await response.json();
          switch (reason) {
            case 'invalid_format':
              expect(errorData.error).toContain('Invalid API key');
              break;
            case 'empty_key':
            case 'null_key':
              expect(errorData.error).toContain('API key is required');
              break;
          }
        }
      }
    );

    it('should not expose API key in error messages', async () => {
      const sensitiveApiKey = 'sk-sensitive1234567890abcdef';
      
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'invalid-url',
          apiKey: sensitiveApiKey
        })
      });

      expect(response.ok).toBe(false);
      const errorData = await response.json();
      const responseText = JSON.stringify(errorData);
      
      expect(responseText).not.toContain(sensitiveApiKey);
      expect(responseText).not.toContain('sk-sensitive');
    });

    it('should sanitize API key in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const sensitiveApiKey = 'sk-sensitive1234567890abcdef';
      
      await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: sensitiveApiKey
        })
      });

      // Check that API key is not logged in plain text
      const allLogCalls = [
        ...consoleSpy.mock.calls,
        ...consoleErrorSpy.mock.calls
      ].flat();
      
      const logsContainFullKey = allLogCalls.some(call => 
        typeof call === 'string' && call.includes(sensitiveApiKey)
      );
      
      expect(logsContainFullKey).toBe(false);
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Input Sanitization', () => {
    it.each(securityTestData.maliciousInputs)(
      'should sanitize malicious input: %s',
      async (maliciousInput) => {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: maliciousInput,
            apiKey: 'sk-valid1234567890abcdefghijklmnop'
          })
        });

        // Should either reject the input or sanitize it
        if (response.ok) {
          const data = await response.json();
          const responseText = JSON.stringify(data);
          
          // Should not contain script tags or other dangerous elements
          expect(responseText).not.toMatch(/<script/i);
          expect(responseText).not.toMatch(/javascript:/i);
          expect(responseText).not.toMatch(/on\w+=/i);
        } else {
          expect(response.status).toBe(400);
          const errorData = await response.json();
          expect(errorData.error).toBeDefined();
        }
      }
    );

    it.each(securityTestData.validationTestCases)(
      'should validate input correctly: $input',
      async ({ input, shouldPass, reason }) => {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: shouldPass ? 'https://example.com/test.jpg' : input,
            apiKey: 'sk-valid1234567890abcdefghijklmnop',
            description: input
          })
        });

        if (shouldPass) {
          expect(response.ok).toBe(true);
        } else {
          expect(response.ok).toBe(false);
          const errorData = await response.json();
          
          switch (reason) {
            case 'exceeds_length_limit':
              expect(errorData.error).toMatch(/too long|length limit/i);
              break;
            case 'empty_input':
              expect(errorData.error).toMatch(/required|empty/i);
              break;
          }
        }
      }
    );
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per API key', async () => {
      const apiKey = 'sk-ratelimited1234567890abcdef';
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: 'https://example.com/test.jpg',
              apiKey: apiKey
            })
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(rateLimitedResponse.headers.get('Retry-After')).toBeDefined();
    });

    it('should have different rate limits for different API keys', async () => {
      const apiKey1 = 'sk-user1-1234567890abcdef';
      const apiKey2 = 'sk-user2-1234567890abcdef';

      // Make requests with first API key until rate limited
      let rateLimitHit = false;
      let requestCount = 0;
      
      while (!rateLimitHit && requestCount < 20) {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            apiKey: apiKey1
          })
        });
        
        if (response.status === 429) {
          rateLimitHit = true;
        }
        requestCount++;
      }

      // Second API key should still work
      const response2 = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: apiKey2
        })
      });

      expect(response2.status).toBe(200);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/descriptions/generate',
        '/api/images/search',
        '/api/vocabulary/generate'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg'
            // No API key provided
          })
        });

        expect(response.status).toBe(401);
        const errorData = await response.json();
        expect(errorData.error).toMatch(/unauthorized|api key/i);
      }
    });

    it('should validate API key format', async () => {
      const invalidFormats = [
        'invalid-key',
        'sk-',
        'sk-short',
        'not-an-api-key',
        '123456789',
        'bearer-token-format'
      ];

      for (const invalidKey of invalidFormats) {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            apiKey: invalidKey
          })
        });

        expect(response.status).toBe(401);
        const errorData = await response.json();
        expect(errorData.error).toMatch(/invalid.*api key/i);
      }
    });

    it('should handle API key expiration gracefully', async () => {
      const expiredKey = 'sk-expired1234567890abcdef';
      
      // Mock expired key response
      mockOpenAI.setScenario('invalidApiKeyError');
      
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: expiredKey
        })
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toMatch(/expired|invalid/i);
    });
  });

  describe('Audit Logging', () => {
    let auditLogSpy: any;

    beforeEach(() => {
      // Mock audit logging function
      auditLogSpy = vi.fn();
      global.auditLog = auditLogSpy;
    });

    afterEach(() => {
      delete global.auditLog;
    });

    it('should log successful API requests', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: 'sk-valid1234567890abcdefghijklmnop'
        })
      });

      expect(response.ok).toBe(true);
      
      expect(auditLogSpy).toHaveBeenCalledWith({
        event: 'api_request',
        endpoint: '/api/descriptions/generate',
        method: 'POST',
        status: 'success',
        userId: expect.stringMatching(/^sk-.*$/), // Masked API key
        timestamp: expect.any(String),
        ip: expect.any(String)
      });
    });

    it('should log failed authentication attempts', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: 'invalid-key'
        })
      });

      expect(response.status).toBe(401);
      
      expect(auditLogSpy).toHaveBeenCalledWith({
        event: 'auth_failure',
        endpoint: '/api/descriptions/generate',
        method: 'POST',
        reason: 'invalid_api_key',
        timestamp: expect.any(String),
        ip: expect.any(String)
      });
    });

    it('should log rate limit violations', async () => {
      // Make multiple requests to trigger rate limit
      const apiKey = 'sk-ratelimitlog1234567890abcdef';
      
      for (let i = 0; i < 15; i++) {
        await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/test.jpg',
            apiKey: apiKey
          })
        });
      }

      expect(auditLogSpy).toHaveBeenCalledWith({
        event: 'rate_limit_exceeded',
        endpoint: '/api/descriptions/generate',
        userId: expect.stringMatching(/^sk-.*$/),
        timestamp: expect.any(String),
        ip: expect.any(String)
      });
    });
  });

  describe('Data Privacy', () => {
    it('should not store sensitive data unnecessarily', async () => {
      const sensitiveData = {
        imageUrl: 'https://private-domain.com/personal-photo.jpg',
        apiKey: 'sk-personal1234567890abcdef',
        userAgent: 'Personal-Browser/1.0'
      };

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': sensitiveData.userAgent
        },
        body: JSON.stringify({
          imageUrl: sensitiveData.imageUrl,
          apiKey: sensitiveData.apiKey
        })
      });

      // Check that sensitive data is not stored in local storage or cookies
      expect(localStorage.getItem('apiKey')).toBeNull();
      expect(localStorage.getItem('imageUrl')).toBeNull();
      expect(document.cookie).not.toContain('apiKey');
      expect(document.cookie).not.toContain('sk-');
    });

    it('should handle GDPR data deletion requests', async () => {
      // This is a placeholder for GDPR compliance testing
      // In a real implementation, you would test actual data deletion
      const userId = 'sk-user1234567890abcdef';
      
      const deleteResponse = await fetch(`/api/user/delete/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Should confirm deletion or return appropriate status
      expect([200, 204, 404]).toContain(deleteResponse.status);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: 'sk-valid1234567890abcdefghijklmnop'
        })
      });

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should prevent CORS attacks', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: 'sk-valid1234567890abcdefghijklmnop'
        })
      });

      // Should either reject or have proper CORS headers
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      if (corsHeader) {
        expect(corsHeader).not.toBe('*');
        expect(corsHeader).not.toBe('https://malicious-site.com');
      }
    });
  });
});

// Integration tests with real error scenarios
describe('API Key Security Integration Tests', () => {
  it('should handle network errors securely', async () => {
    simulateNetworkError();
    
    const response = await fetch('/api/descriptions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://example.com/test.jpg',
        apiKey: 'sk-valid1234567890abcdefghijklmnop'
      })
    });

    expect(response.ok).toBe(false);
    
    const errorData = await response.json();
    // Should not expose internal error details
    expect(errorData.error).not.toMatch(/internal|stack trace|file path/i);
  });

  it('should maintain security during high load', async () => {
    // Simulate high load with multiple concurrent requests
    const concurrentRequests = 50;
    const requests = Array.from({ length: concurrentRequests }, (_, i) =>
      fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          apiKey: `sk-load-test-${i}-1234567890abcdef`
        })
      })
    );

    const responses = await Promise.allSettled(requests);
    
    // All requests should either succeed or fail gracefully
    responses.forEach((result) => {
      if (result.status === 'fulfilled') {
        expect([200, 401, 429, 500]).toContain(result.value.status);
      }
      // No requests should crash or hang
    });
  });
});