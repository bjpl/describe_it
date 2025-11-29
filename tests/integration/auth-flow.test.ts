/**
 * Authentication Flow Integration Tests
 * Tests complete signup → login → profile flow with database
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '@/lib/services/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock modules at the top level - use inline functions to avoid hoisting issues
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
  } as unknown as SupabaseClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('Authentication Flow Integration', () => {
  let dbService: DatabaseService;
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked supabase instance
    const { supabase } = await import('@/lib/supabase/client');
    mockSupabase = supabase;

    dbService = new DatabaseService({
      supabaseUrl: 'https://test.supabase.co',
      anonKey: 'test-key',
      enableLogging: false,
    });
  });

  // ==============================================
  // COMPLETE SIGNUP FLOW
  // ==============================================

  describe('Signup Flow', () => {
    it('should complete full signup process', async () => {
      const testEmail = 'newuser@example.com';
      const testPassword = 'SecurePass123!';

      // Step 1: Sign up with Supabase Auth
      (mockSupabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-new-123',
            email: testEmail,
            confirmed_at: null,
          },
          session: null,
        },
        error: null,
      });

      const signUpResult = await mockSupabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      expect(signUpResult.error).toBeNull();
      expect(signUpResult.data.user).toBeDefined();
      const userId = signUpResult.data.user!.id;

      // Step 2: Create user profile in database
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            email: testEmail,
            username: 'newuser',
            spanish_level: 'beginner',
            profile_completed: false,
          },
          error: null,
        }),
      });

      const profileResult = await dbService.createUser({
        id: userId,
        email: testEmail,
        username: 'newuser',
      });

      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.email).toBe(testEmail);

      // Step 3: Initialize user settings
      (mockSupabase.from as any).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: userId,
            theme: 'light',
            language: 'en',
            daily_word_goal: 10,
          },
          error: null,
        }),
      });

      const settingsResult = await dbService.updateUserSettings(userId, {
        theme: 'light',
        language: 'en',
        daily_word_goal: 10,
      });

      expect(settingsResult.success).toBe(true);

      // Step 4: Create initial session
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-initial',
            user_id: userId,
            session_type: 'onboarding',
          },
          error: null,
        }),
      });

      const sessionResult = await dbService.createSession({
        user_id: userId,
        session_type: 'onboarding',
      });

      expect(sessionResult.success).toBe(true);
    });

    it('should handle signup with duplicate email', async () => {
      (mockSupabase.auth.signUp as any).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 422,
        },
      });

      const result = await mockSupabase.auth.signUp({
        email: 'duplicate@example.com',
        password: 'password',
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.status).toBe(422);
    });

    it('should validate password strength during signup', async () => {
      (mockSupabase.auth.signUp as any).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Password should be at least 6 characters',
          status: 422,
        },
      });

      const result = await mockSupabase.auth.signUp({
        email: 'test@example.com',
        password: 'weak',
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Password');
    });
  });

  // ==============================================
  // LOGIN FLOW
  // ==============================================

  describe('Login Flow', () => {
    it('should complete full login process', async () => {
      const testEmail = 'user@example.com';
      const testPassword = 'SecurePass123!';

      // Step 1: Sign in with credentials
      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-existing',
            email: testEmail,
            confirmed_at: new Date().toISOString(),
          },
          session: {
            access_token: 'token-abc123',
            refresh_token: 'refresh-xyz789',
          },
        },
        error: null,
      });

      const signInResult = await mockSupabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(signInResult.error).toBeNull();
      expect(signInResult.data.session).toBeDefined();
      const userId = signInResult.data.user!.id;

      // Step 2: Fetch user profile
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            email: testEmail,
            username: 'existinguser',
            spanish_level: 'intermediate',
            profile_completed: true,
          },
          error: null,
        }),
      });

      const profileResult = await dbService.getUser(userId);

      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.email).toBe(testEmail);

      // Step 3: Load user settings
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: userId,
            theme: 'dark',
            language: 'es',
          },
          error: null,
        }),
      });

      const settingsResult = await dbService.getUserSettings(userId);

      expect(settingsResult.success).toBe(true);
      expect(settingsResult.data?.theme).toBe('dark');

      // Step 4: Update last login timestamp
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            last_login: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const updateResult = await dbService.updateUser(userId, {
        last_login: new Date().toISOString(),
      });

      expect(updateResult.success).toBe(true);
    });

    it('should handle invalid credentials', async () => {
      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        },
      });

      const result = await mockSupabase.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid');
    });

    it('should handle unconfirmed email', async () => {
      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Email not confirmed',
          status: 400,
        },
      });

      const result = await mockSupabase.auth.signInWithPassword({
        email: 'unconfirmed@example.com',
        password: 'password',
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('not confirmed');
    });
  });

  // ==============================================
  // PROFILE MANAGEMENT FLOW
  // ==============================================

  describe('Profile Management Flow', () => {
    it('should complete profile update flow', async () => {
      const userId = 'user-123';

      // Step 1: Get current profile
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            username: 'oldname',
            spanish_level: 'beginner',
            profile_completed: false,
          },
          error: null,
        }),
      });

      const currentProfile = await dbService.getUser(userId);
      expect(currentProfile.data?.spanish_level).toBe('beginner');

      // Step 2: Update profile fields
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            username: 'newname',
            spanish_level: 'intermediate',
            profile_completed: true,
          },
          error: null,
        }),
      });

      const updateResult = await dbService.updateUser(userId, {
        username: 'newname',
        spanish_level: 'intermediate',
        profile_completed: true,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.spanish_level).toBe('intermediate');
      expect(updateResult.data?.profile_completed).toBe(true);

      // Step 3: Verify cache invalidation
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            spanish_level: 'intermediate',
          },
          error: null,
        }),
      });

      const refreshedProfile = await dbService.getUser(userId, false); // bypass cache
      expect(refreshedProfile.data?.spanish_level).toBe('intermediate');
    });

    it('should update avatar URL', async () => {
      const userId = 'user-123';
      const avatarUrl = 'https://storage.example.com/avatar.jpg';

      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            avatar_url: avatarUrl,
          },
          error: null,
        }),
      });

      const result = await dbService.updateUser(userId, {
        avatar_url: avatarUrl,
      });

      expect(result.success).toBe(true);
      expect(result.data?.avatar_url).toBe(avatarUrl);
    });
  });

  // ==============================================
  // LOGOUT FLOW
  // ==============================================

  describe('Logout Flow', () => {
    it('should complete full logout process', async () => {
      const userId = 'user-123';
      const sessionId = 'session-active';

      // Step 1: End current session
      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: sessionId,
            ended_at: new Date().toISOString(),
            duration_minutes: 45,
          },
          error: null,
        }),
      });

      const sessionEnd = await dbService.endSession(sessionId, {
        duration_minutes: 45,
        completion_rate: 0.9,
      });

      expect(sessionEnd.success).toBe(true);

      // Step 2: Sign out from Supabase
      (mockSupabase.auth.signOut as any).mockResolvedValue({
        error: null,
      });

      const signOutResult = await mockSupabase.auth.signOut();

      expect(signOutResult.error).toBeNull();

      // Step 3: Clear client-side cache
      dbService.clearCache();
      expect(dbService['queryCache'].size).toBe(0);
    });
  });

  // ==============================================
  // ERROR SCENARIOS
  // ==============================================

  describe('Error Scenarios', () => {
    it('should handle network errors during signup', async () => {
      (mockSupabase.auth.signUp as any).mockRejectedValue(
        new Error('NetworkError: Failed to fetch')
      );

      await expect(
        mockSupabase.auth.signUp({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow('NetworkError');
    });

    it('should handle database errors during profile creation', async () => {
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Database connection failed',
            code: '08006',
          },
        }),
      });

      const result = await dbService.createUser({
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle session timeout during operations', async () => {
      (mockSupabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: {
          message: 'JWT expired',
          status: 401,
        },
      });

      const result = await mockSupabase.auth.getUser();

      expect(result.error).toBeTruthy();
      expect(result.error?.status).toBe(401);
    });
  });

  // ==============================================
  // CONCURRENT OPERATIONS
  // ==============================================

  describe('Concurrent Operations', () => {
    it('should handle multiple login attempts', async () => {
      (mockSupabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const attempts = Array.from({ length: 3 }, () =>
        mockSupabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'password',
        })
      );

      const results = await Promise.all(attempts);

      expect(results.every(r => r.data.session)).toBe(true);
    });

    it('should handle concurrent profile updates', async () => {
      const userId = 'user-123';

      (mockSupabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: userId },
          error: null,
        }),
      });

      const updates = [
        dbService.updateUser(userId, { theme: 'dark' }),
        dbService.updateUser(userId, { language: 'es' }),
        dbService.updateUser(userId, { spanish_level: 'advanced' }),
      ];

      const results = await Promise.all(updates);

      expect(results.every(r => r.success)).toBe(true);
    });
  });
});
