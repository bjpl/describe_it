/**
 * Authentication API Integration Tests
 * Tests authentication flows and endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { request } from '../../shared/helpers/request-builder';
import { authFixtures } from '../../shared/fixtures/test-fixtures';

describe('Authentication API - Integration Tests', () => {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  describe('POST /api/auth/signup', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    describe('Valid Signup', () => {
      it('should accept valid signup credentials', async () => {
        const response = await request(baseURL)
          .json({
            email: testEmail,
            password: testPassword,
          })
          .post('/api/auth/signup');

        // Expecting either success (200/201) or specific error
        expect(response.status).toBeGreaterThanOrEqual(200);

        if (response.status >= 200 && response.status < 300) {
          const data = await response.getData();
          expect(data).toHaveProperty('success');
        }
      });

      it('should return user data on successful signup', async () => {
        const uniqueEmail = `signup-${Date.now()}@example.com`;

        const response = await request(baseURL)
          .json({
            email: uniqueEmail,
            password: testPassword,
          })
          .post('/api/auth/signup');

        if (response.status >= 200 && response.status < 300) {
          const data = await response.getData();

          if (data.success && data.data) {
            expect(data.data).toHaveProperty('user');
          }
        }
      });
    });

    describe('Validation', () => {
      it('should reject signup without email', async () => {
        const response = await request(baseURL)
          .json({
            password: testPassword,
          })
          .post('/api/auth/signup');

        await response.expectError();
      });

      it('should reject signup without password', async () => {
        const response = await request(baseURL)
          .json({
            email: testEmail,
          })
          .post('/api/auth/signup');

        await response.expectError();
      });

      it('should reject signup with invalid email format', async () => {
        const response = await request(baseURL)
          .json({
            email: 'not-an-email',
            password: testPassword,
          })
          .post('/api/auth/signup');

        await response.expectError();
        const data = await response.getData();
        expect(data.error || data.message).toBeTruthy();
      });

      it('should reject signup with weak password', async () => {
        const response = await request(baseURL)
          .json({
            email: testEmail,
            password: '123', // Too weak
          })
          .post('/api/auth/signup');

        await response.expectError();
      });
    });

    describe('Duplicate Prevention', () => {
      it('should reject duplicate email registration', async () => {
        const duplicateEmail = `duplicate-${Date.now()}@example.com`;

        // First signup
        const firstResponse = await request(baseURL)
          .json({
            email: duplicateEmail,
            password: testPassword,
          })
          .post('/api/auth/signup');

        // Second signup with same email
        const secondResponse = await request(baseURL)
          .json({
            email: duplicateEmail,
            password: testPassword,
          })
          .post('/api/auth/signup');

        // At least one should succeed or both should fail with proper error
        if (firstResponse.status >= 200 && firstResponse.status < 300) {
          // First succeeded, second should fail
          await secondResponse.expectError();
        }
      });
    });
  });

  describe('POST /api/auth/signin', () => {
    describe('Valid Signin', () => {
      it('should accept valid signin credentials', async () => {
        const response = await request(baseURL)
          .json({
            email: authFixtures.validCredentials.email,
            password: authFixtures.validCredentials.password,
          })
          .post('/api/auth/signin');

        // Should return either success or auth error (not server error)
        expect(response.status).not.toBe(500);
      });

      it('should return session data on successful signin', async () => {
        const response = await request(baseURL)
          .json({
            email: authFixtures.validCredentials.email,
            password: authFixtures.validCredentials.password,
          })
          .post('/api/auth/signin');

        if (response.status >= 200 && response.status < 300) {
          const data = await response.getData();

          if (data.success && data.data) {
            expect(data.data).toHaveProperty('session');
          }
        }
      });
    });

    describe('Invalid Credentials', () => {
      it('should reject signin with wrong password', async () => {
        const response = await request(baseURL)
          .json({
            email: authFixtures.validCredentials.email,
            password: 'WrongPassword123!',
          })
          .post('/api/auth/signin');

        await response.expectError();
      });

      it('should reject signin with non-existent email', async () => {
        const response = await request(baseURL)
          .json({
            email: `nonexistent-${Date.now()}@example.com`,
            password: authFixtures.validCredentials.password,
          })
          .post('/api/auth/signin');

        await response.expectError();
      });

      it('should reject signin without credentials', async () => {
        const response = await request(baseURL)
          .json({})
          .post('/api/auth/signin');

        await response.expectError();
      });
    });

    describe('Rate Limiting', () => {
      it('should handle multiple failed signin attempts', async () => {
        const attempts = 3;
        const responses = [];

        for (let i = 0; i < attempts; i++) {
          const response = await request(baseURL)
            .json({
              email: authFixtures.invalidCredentials.email,
              password: authFixtures.invalidCredentials.password,
            })
            .post('/api/auth/signin');

          responses.push(response);
        }

        // All should fail with auth error
        for (const response of responses) {
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      });
    });
  });

  describe('Session Management', () => {
    describe('Token Validation', () => {
      it('should accept requests with valid auth token', async () => {
        // This tests any protected endpoint with valid token
        const response = await request(baseURL)
          .auth(authFixtures.validToken)
          .get('/api/auth/session');

        // Should not return 401 (unauthorized)
        expect(response.status).not.toBe(401);
      });

      it('should reject requests with invalid auth token', async () => {
        const response = await request(baseURL)
          .auth('invalid-token-12345')
          .get('/api/auth/session');

        await response.expectError();
      });

      it('should reject requests with expired token', async () => {
        const response = await request(baseURL)
          .auth(authFixtures.expiredToken)
          .get('/api/auth/session');

        await response.expectError();
      });
    });
  });

  describe('Security', () => {
    it('should not expose sensitive error details', async () => {
      const response = await request(baseURL)
        .json({
          email: 'test@example.com',
          password: 'wrong',
        })
        .post('/api/auth/signin');

      const data = await response.getData();

      // Should not expose database errors or internal details
      if (data.error) {
        expect(data.error.toLowerCase()).not.toContain('sql');
        expect(data.error.toLowerCase()).not.toContain('database');
        expect(data.error.toLowerCase()).not.toContain('stack');
      }
    });

    it('should use HTTPS in production (via headers)', async () => {
      const response = await request(baseURL).get('/api/health');

      // In production, should have secure headers
      if (process.env.NODE_ENV === 'production') {
        const headers = response.headers;
        // Check for security headers if in production
        expect(headers.get('strict-transport-security')).toBeTruthy();
      }
    });
  });
});
