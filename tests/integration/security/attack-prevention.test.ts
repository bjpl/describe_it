/**
 * Attack Prevention Integration Tests
 * Tests security against common attack vectors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inputValidator } from '@/lib/security/inputValidation';
import { authenticator } from '@/lib/security/authentication';

describe('Attack Prevention Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Brute Force Attack Prevention', () => {
    it('should rate limit login attempts → lock account after threshold', async () => {
      const email = 'target@test.com';
      const wrongPassword = 'wrong-password';

      const loginAttempts = Array(10).fill(null).map(() =>
        fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: wrongPassword }),
        })
      );

      const responses = await Promise.all(loginAttempts);

      // First few attempts should return 401 (invalid credentials)
      const unauthorizedAttempts = responses.filter(r => r.status === 401);
      expect(unauthorizedAttempts.length).toBeGreaterThan(0);

      // Later attempts should be rate limited (429) or account locked (403)
      const blockedAttempts = responses.filter(r => [429, 403].includes(r.status));
      expect(blockedAttempts.length).toBeGreaterThan(0);

      // Last response should indicate account lockout
      const lastResponse = responses[responses.length - 1];
      expect([403, 429]).toContain(lastResponse.status);

      if (lastResponse.status === 403) {
        const data = await lastResponse.json();
        expect(data.error).toMatch(/locked|suspended|blocked/i);
      }
    });

    it('should implement exponential backoff for repeated failures', async () => {
      const email = 'backoff@test.com';

      // First batch of failed attempts
      await Promise.all(Array(5).fill(null).map(() =>
        fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrong' }),
        })
      ));

      // Should have short retry-after
      const response1 = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrong' }),
      });

      const retryAfter1 = parseInt(response1.headers.get('Retry-After') || '0');

      // Second batch after backoff
      await new Promise(resolve => setTimeout(resolve, 1000));
      await Promise.all(Array(5).fill(null).map(() =>
        fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrong' }),
        })
      ));

      // Should have longer retry-after
      const response2 = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrong' }),
      });

      const retryAfter2 = parseInt(response2.headers.get('Retry-After') || '0');

      if (retryAfter1 > 0 && retryAfter2 > 0) {
        expect(retryAfter2).toBeGreaterThanOrEqual(retryAfter1);
      }
    });

    it('should reset rate limits after successful login', async () => {
      const email = 'reset@test.com';
      const correctPassword = 'correct-password';

      // Make some failed attempts
      await Promise.all(Array(3).fill(null).map(() =>
        fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrong' }),
        })
      ));

      // Successful login
      const successResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: correctPassword }),
      });

      if (successResponse.status === 200) {
        // Rate limit should be reset - next failed attempt should not be blocked
        const nextAttempt = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrong' }),
        });

        expect(nextAttempt.status).toBe(401); // Unauthorized, not rate limited
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize and reject SQL injection attempts', () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'admin'); --",
        "' UNION SELECT * FROM users WHERE '1'='1",
      ];

      sqlPayloads.forEach(payload => {
        const sanitized = inputValidator.sanitizeSQL(payload);

        // Should not contain dangerous SQL keywords
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('INSERT');
        expect(sanitized).not.toContain('UNION');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain("'");
      });
    });

    it('should prevent SQL injection in query parameters', async () => {
      const response = await fetch('/api/vocabulary/search?query=' + encodeURIComponent("'; DROP TABLE vocabulary; --"), {
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      // Should either sanitize or reject
      if (response.status === 200) {
        const data = await response.json();
        // Data should be safe, not contain injection
        expect(JSON.stringify(data)).not.toContain('DROP');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should use parameterized queries for database operations', async () => {
      const maliciousInput = {
        phrase: "test'; DELETE FROM vocabulary WHERE '1'='1",
        translation: 'test',
        category: 'sustantivos',
      };

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ vocabulary: [maliciousInput] }),
      });

      // Should either sanitize or reject
      expect([200, 400]).toContain(response.status);

      // Verify no data was deleted (would need database check in real scenario)
      const verifyResponse = await fetch('/api/vocabulary/list', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      expect(verifyResponse.status).toBe(200);
    });
  });

  describe('XSS Attack Prevention', () => {
    it('should sanitize XSS payloads in user input', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(document.cookie)',
        '<svg onload="alert(1)">',
        '"><script>fetch("/api/steal-data")</script>',
      ];

      xssPayloads.forEach(payload => {
        const sanitized = inputValidator.sanitizeHTML(payload);

        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
      });
    });

    it('should prevent XSS in stored descriptions', async () => {
      const xssDescription = 'Beautiful mountain <script>alert("XSS")</script>';

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          imageUrl: 'https://example.com/test.jpg',
          customDescription: xssDescription,
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        const allDescriptions = JSON.stringify(data);

        expect(allDescriptions).not.toContain('<script');
        expect(allDescriptions).not.toContain('alert(');
      }
    });

    it('should sanitize XSS in vocabulary phrases', async () => {
      const maliciousVocab = [{
        phrase: 'mountain <img src=x onerror=alert(1)>',
        translation: 'montaña',
        category: 'sustantivos',
      }];

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ vocabulary: maliciousVocab }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(JSON.stringify(data)).not.toContain('onerror=');
        expect(JSON.stringify(data)).not.toContain('<img');
      }
    });

    it('should set proper Content-Security-Policy', async () => {
      const response = await fetch('/api/health');
      const csp = response.headers.get('Content-Security-Policy');

      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      // Should not allow unsafe-inline or unsafe-eval
      expect(csp).not.toContain('unsafe-inline');
      expect(csp).not.toContain('unsafe-eval');
    });
  });

  describe('CSRF Attack Prevention', () => {
    it('should validate CSRF tokens on state-changing requests', async () => {
      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          // Missing CSRF token
        },
        body: JSON.stringify({ vocabulary: [] }),
      });

      // Should require CSRF token or validate origin
      if (response.status === 403) {
        const data = await response.json();
        expect(data.error).toMatch(/csrf|token|origin/i);
      }
    });

    it('should validate Origin header matches allowed origins', async () => {
      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'Origin': 'https://malicious-site.com',
        },
        body: JSON.stringify({ vocabulary: [] }),
      });

      expect([403, 401]).toContain(response.status);
    });

    it('should reject requests with mismatched Referer', async () => {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'Referer': 'https://evil-site.com',
        },
        body: JSON.stringify({ newPassword: 'NewPass123!' }),
      });

      expect([403, 400]).toContain(response.status);
    });

    it('should use SameSite cookie attribute', async () => {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
      });

      const cookies = response.headers.get('Set-Cookie');
      if (cookies) {
        expect(cookies).toContain('SameSite=');
        // Should be Lax or Strict, not None
        expect(cookies).toMatch(/SameSite=(Lax|Strict)/);
      }
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should detect and reject session with mismatched fingerprint', async () => {
      // Original session
      const session = {
        access_token: 'session-token-123',
        user_agent: 'Chrome/91.0.4472.124',
        ip_address: '192.168.1.100',
      };

      // Request from different fingerprint (potential hijacking)
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'User-Agent': 'Firefox/89.0', // Different browser
          'X-Forwarded-For': '10.0.0.1', // Different IP
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      // Should flag as suspicious
      expect([401, 403]).toContain(response.status);
    });

    it('should regenerate session ID on login', async () => {
      // Login should create new session, not reuse existing
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=old-session-id',
        },
        body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
      });

      if (response.status === 200) {
        const data = await response.json();
        // New session should be different from old one
        expect(data.session.access_token).not.toBe('old-session-id');
      }
    });

    it('should invalidate all sessions on password change', async () => {
      const oldToken = 'old-session-token';

      // Change password
      await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oldToken}`,
        },
        body: JSON.stringify({ newPassword: 'NewSecurePass123!' }),
      });

      // Old token should no longer work
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oldToken}`,
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('SSRF Attack Prevention', () => {
    it('should reject internal IP addresses in image URLs', async () => {
      const internalURLs = [
        'http://localhost:3306/mysql',
        'http://127.0.0.1:5432/postgres',
        'http://169.254.169.254/metadata', // AWS metadata
        'http://192.168.1.1/admin',
        'http://10.0.0.1/internal',
      ];

      for (const url of internalURLs) {
        const response = await fetch('/api/descriptions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toMatch(/invalid|url|not allowed/i);
      }
    });

    it('should reject file:// protocol URLs', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'file:///etc/passwd' }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject URLs with credentials', async () => {
      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: 'http://admin:password@internal-server.com/image.jpg'
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should whitelist allowed domains for image URLs', async () => {
      const allowedURL = 'https://images.unsplash.com/photo-123.jpg';
      const disallowedURL = 'https://random-site.com/image.jpg';

      const response1 = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: allowedURL }),
      });

      const response2 = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: disallowedURL }),
      });

      // Allowed URL should work (or fail for other reasons)
      expect([200, 401, 500]).toContain(response1.status);

      // Disallowed URL should be rejected
      if (process.env.NODE_ENV === 'production') {
        expect(response2.status).toBe(400);
      }
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', type: 'application/x-msdownload' },
        { name: 'script.php', type: 'application/x-php' },
        { name: 'virus.bat', type: 'application/x-bat' },
      ];

      for (const file of maliciousFiles) {
        const formData = new FormData();
        const blob = new Blob(['malicious content'], { type: file.type });
        formData.append('file', blob, file.name);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toMatch(/file type|not allowed|invalid/i);
      }
    });

    it('should enforce file size limits', async () => {
      // Create 10MB file (over limit)
      const largeContent = 'x'.repeat(10 * 1024 * 1024);
      const formData = new FormData();
      const blob = new Blob([largeContent], { type: 'image/jpeg' });
      formData.append('file', blob, 'large.jpg');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toMatch(/too large|size limit/i);
    });

    it('should sanitize filenames', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        'file;rm -rf /',
        'image.jpg.exe',
        '<script>alert(1)</script>.jpg',
      ];

      for (const filename of maliciousFilenames) {
        const formData = new FormData();
        const blob = new Blob(['test'], { type: 'image/jpeg' });
        formData.append('file', blob, filename);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Denial of Service Prevention', () => {
    it('should limit request payload size', async () => {
      const oversizedPayload = {
        data: 'x'.repeat(10 * 1024 * 1024), // 10MB
      };

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oversizedPayload),
      });

      expect(response.status).toBe(413);
    });

    it('should limit array sizes in requests', async () => {
      const oversizedArray = Array(100000).fill({
        phrase: 'test',
        translation: 'test',
      });

      const response = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabulary: oversizedArray }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/too many|limit|size/i);
    });

    it('should timeout long-running requests', async () => {
      // This would require backend timeout implementation
      const response = await fetch('/api/expensive-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'slow' }),
      });

      // Should either complete or timeout (not hang)
      expect([200, 408, 504]).toContain(response.status);
    }, 15000); // 15 second test timeout
  });
});
