/**
 * Authentication Flow Integration Tests
 * Tests complete authentication scenarios with multiple components
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    setSession: vi.fn(),
    onAuthStateChange: vi.fn((callback) => {
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  describe('New User Signup Flow', () => {
    it('should complete full signup → email verification → first login', async () => {
      const testEmail = 'newuser@test.com';
      const testPassword = 'SecurePass123!';

      // Step 1: User signup
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: testEmail, email_confirmed_at: null },
          session: null, // No session until email verified
        },
        error: null,
      });

      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });

      expect(signupResponse.status).toBe(200);
      const signupData = await signupResponse.json();
      expect(signupData).toMatchObject({
        success: true,
        needsEmailConfirmation: true,
      });

      // Step 2: Email verification (simulated by backend)
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: testEmail,
            email_confirmed_at: new Date().toISOString()
          },
          session: {
            access_token: 'verified-token',
            refresh_token: 'refresh-token',
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      // Step 3: First login after verification
      const loginResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData).toMatchObject({
        success: true,
        user: expect.objectContaining({ email: testEmail }),
        session: expect.objectContaining({ access_token: expect.any(String) }),
      });

      // Verify user profile was created
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should reject signup with existing email', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@test.com',
          password: 'SecurePass123!'
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('already registered');
    });
  });

  describe('Login → API Call → Session Refresh Flow', () => {
    it('should maintain session through API calls and refresh', async () => {
      const testUser = {
        id: 'user-456',
        email: 'active@test.com',
        email_confirmed_at: new Date().toISOString(),
      };

      // Step 1: Login
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: testUser,
          session: {
            access_token: 'initial-token',
            refresh_token: 'refresh-token',
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      const loginResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'password'
        }),
      });

      expect(loginResponse.status).toBe(200);
      const { session: initialSession } = await loginResponse.json();

      // Step 2: Make authenticated API call
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: initialSession },
        error: null,
      });

      const apiResponse = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${initialSession.access_token}`,
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      expect(apiResponse.status).toBe(200);

      // Step 3: Token refresh (expires_at approaching)
      const refreshedSession = {
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() / 1000 + 7200,
      };

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: refreshedSession },
        error: null,
      });

      // Step 4: Make another API call with refreshed token
      const apiResponse2 = await fetch('/api/images/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshedSession.access_token}`,
        },
        body: JSON.stringify({ query: 'mountain' }),
      });

      expect(apiResponse2.status).toBe(200);
    });

    it('should reject API calls with expired tokens', async () => {
      const expiredToken = 'expired-token-123';

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Token expired' },
      });

      const response = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expiredToken}`,
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Authentication');
    });
  });

  describe('OAuth Flow', () => {
    it('should complete OAuth → profile loading → API access', async () => {
      // Step 1: OAuth redirect
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: 'google', url: 'https://google.com/oauth' },
        error: null,
      });

      const oauthResponse = await fetch('/api/auth/oauth/google', {
        method: 'POST',
      });

      expect(oauthResponse.status).toBe(302);

      // Step 2: OAuth callback with tokens
      const oauthUser = {
        id: 'oauth-user-789',
        email: 'oauth@test.com',
        user_metadata: { provider: 'google', full_name: 'OAuth User' },
      };

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'oauth-token',
            refresh_token: 'oauth-refresh',
            user: oauthUser,
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      // Step 3: Load user profile
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: oauthUser.id,
          email: oauthUser.email,
          full_name: 'OAuth User',
          subscription_status: 'free',
        },
        error: null,
      });

      // Step 4: Make authenticated API call
      const apiResponse = await fetch('/api/vocabulary/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer oauth-token',
        },
        body: JSON.stringify({ vocabulary: [] }),
      });

      expect(apiResponse.status).toBe(200);
    });
  });

  describe('Password Reset Flow', () => {
    it('should complete reset request → token validation → password change → login', async () => {
      const testEmail = 'reset@test.com';

      // Step 1: Request password reset
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const resetRequest = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      expect(resetRequest.status).toBe(200);

      // Step 2: Validate reset token (simulated)
      const resetToken = 'valid-reset-token-xyz';

      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: 'user-reset', email: testEmail } },
        error: null,
      });

      // Step 3: Update password
      const updatePassword = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resetToken}`,
        },
        body: JSON.stringify({ newPassword: 'NewSecurePass456!' }),
      });

      expect(updatePassword.status).toBe(200);

      // Step 4: Login with new password
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-reset', email: testEmail },
          session: {
            access_token: 'new-password-token',
            refresh_token: 'new-refresh-token',
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      const loginResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'NewSecurePass456!'
        }),
      });

      expect(loginResponse.status).toBe(200);
      const data = await loginResponse.json();
      expect(data.success).toBe(true);
    });

    it('should reject invalid reset tokens', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid or expired reset token' },
      });

      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({ newPassword: 'NewPassword123!' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Flow', () => {
    it('should logout → clear session → reject API access', async () => {
      const testUser = {
        id: 'user-logout',
        email: 'logout@test.com',
      };

      // Step 1: User is logged in
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'active-token',
            user: testUser,
          },
        },
        error: null,
      });

      // Step 2: Logout
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const logoutResponse = await fetch('/api/auth/signout', {
        method: 'POST',
      });

      expect(logoutResponse.status).toBe(200);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();

      // Step 3: Attempt API access after logout
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const apiResponse = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer active-token', // Old token
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      expect(apiResponse.status).toBe(401);
      const data = await apiResponse.json();
      expect(data.error).toContain('Authentication');
    });

    it('should clear local storage on logout', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      // Set some data in localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('describe-it-auth', JSON.stringify({ token: 'test' }));
        window.localStorage.setItem('user-data', JSON.stringify({ user: 'test' }));
      }

      await fetch('/api/auth/signout', {
        method: 'POST',
      });

      // Verify localStorage is cleared
      if (typeof window !== 'undefined') {
        expect(window.localStorage.getItem('describe-it-auth')).toBeNull();
      }
    });
  });

  describe('Session Security', () => {
    it('should prevent session fixation attacks', async () => {
      // Attacker provides a session ID
      const attackerSessionId = 'attacker-session-123';

      // User logs in - should get NEW session
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'victim-user', email: 'victim@test.com' },
          session: {
            access_token: 'new-legitimate-token', // Different from attacker's
            refresh_token: 'new-refresh-token',
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      const loginResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${attackerSessionId}`, // Attacker's session
        },
        body: JSON.stringify({
          email: 'victim@test.com',
          password: 'password'
        }),
      });

      const data = await loginResponse.json();
      expect(data.session.access_token).not.toBe(attackerSessionId);
      expect(data.session.access_token).toBe('new-legitimate-token');
    });

    it('should validate session fingerprint', async () => {
      const session = {
        access_token: 'fingerprint-token',
        user_agent: 'Chrome/91.0',
        ip_address: '192.168.1.1',
      };

      // Valid request from same fingerprint
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session },
        error: null,
      });

      const validRequest = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fingerprint-token',
          'User-Agent': 'Chrome/91.0',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      expect(validRequest.status).toBe(200);

      // Invalid request from different fingerprint (potential hijacking)
      const hijackRequest = await fetch('/api/descriptions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fingerprint-token',
          'User-Agent': 'Firefox/89.0', // Different browser
          'X-Forwarded-For': '10.0.0.1', // Different IP
        },
        body: JSON.stringify({ imageUrl: 'https://example.com/test.jpg' }),
      });

      // Should flag as suspicious or reject
      expect([401, 403]).toContain(hijackRequest.status);
    });
  });

  describe('Concurrent Session Handling', () => {
    it('should handle multiple concurrent login attempts', async () => {
      const email = 'concurrent@test.com';
      const password = 'password';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'concurrent-user', email },
          session: {
            access_token: 'concurrent-token',
            refresh_token: 'refresh-token',
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      // Simulate 5 concurrent login attempts
      const loginAttempts = Array(5).fill(null).map(() =>
        fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
      );

      const responses = await Promise.all(loginAttempts);

      // All should succeed (no race conditions)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should have only called signIn appropriate number of times
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
    });
  });
});
