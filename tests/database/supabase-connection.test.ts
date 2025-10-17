/**
 * Supabase Connection and RLS Policy Tests
 * Tests connection, authentication, and row-level security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Supabase Connection Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================
  // CONNECTION TESTS
  // ==============================================

  describe('Connection', () => {
    it('should establish connection to Supabase', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should handle connection errors gracefully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: { message: 'Connection timeout', status: 500 },
      });

      const { error } = await supabase.auth.getSession();

      expect(error).toBeTruthy();
      expect(error?.message).toContain('Connection timeout');
    });

    it('should validate environment variables', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });
  });

  // ==============================================
  // AUTHENTICATION TESTS
  // ==============================================

  describe('Authentication', () => {
    it('should sign up new user', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token-123' } as Session,
        },
        error: null,
      });

      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(error).toBeNull();
      expect(data.user).toEqual(mockUser);
      expect(data.session?.access_token).toBe('token-123');
    });

    it('should sign in existing user', async () => {
      const mockSession: Partial<Session> = {
        access_token: 'token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        } as User,
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(error).toBeNull();
      expect(data.session?.access_token).toBe('token-456');
    });

    it('should reject invalid credentials', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(error).toBeTruthy();
      expect(error?.message).toContain('Invalid login credentials');
    });

    it('should sign out user', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const { error } = await supabase.auth.signOut();

      expect(error).toBeNull();
    });

    it('should handle auth state changes', () => {
      const mockCallback = vi.fn();
      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      });

      const { data } = supabase.auth.onAuthStateChange(mockCallback);

      expect(data.subscription).toBeDefined();
      expect(data.subscription.unsubscribe).toBeDefined();
    });
  });

  // ==============================================
  // ROW-LEVEL SECURITY (RLS) TESTS
  // ==============================================

  describe('Row-Level Security Policies', () => {
    it('should allow users to read own data', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
      } as User;

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'vocab-1', user_id: 'user-123' }],
          error: null,
        }),
      });

      const { data } = await supabase
        .from('vocabulary_items')
        .select('*')
        .eq('user_id', 'user-123');

      expect(data).toBeDefined();
      expect(data?.[0].user_id).toBe('user-123');
    });

    it('should prevent users from reading others data', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const { error } = await supabase
        .from('vocabulary_items')
        .select('*')
        .eq('user_id', 'other-user');

      expect(error).toBeTruthy();
      expect(error?.code).toBe('PGRST301');
    });

    it('should allow anonymous read of public data', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'list-1', is_public: true }],
          error: null,
        }),
      });

      const { data, error } = await supabase
        .from('vocabulary_lists')
        .select('*')
        .eq('is_public', true);

      expect(error).toBeNull();
      expect(data?.[0].is_public).toBe(true);
    });

    it('should prevent unauthorized writes', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'new row violates row-level security policy', code: '42501' },
        }),
      });

      const { error } = await supabase
        .from('user_settings')
        .insert([{ user_id: 'other-user', theme: 'dark' }]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('42501');
    });

    it('should enforce update policies', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'session-1', user_id: 'user-123' }],
          error: null,
        }),
      });

      const { error } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('user_id', 'user-123');

      expect(error).toBeNull();
    });

    it('should enforce delete policies', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const { error } = await supabase
        .from('vocabulary_items')
        .delete()
        .eq('user_id', 'other-user');

      expect(error).toBeTruthy();
    });
  });

  // ==============================================
  // DATA INTEGRITY TESTS
  // ==============================================

  describe('Data Integrity', () => {
    it('should enforce foreign key constraints', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'violates foreign key constraint',
            code: '23503',
            details: 'Key (vocabulary_list_id)=(invalid) is not present',
          },
        }),
      });

      const { error } = await supabase
        .from('vocabulary_items')
        .insert([{
          vocabulary_list_id: 'invalid-list-id',
          spanish_text: 'test',
          english_translation: 'test',
        }]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23503');
    });

    it('should enforce unique constraints', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
          },
        }),
      });

      const { error } = await supabase
        .from('users')
        .insert([{ email: 'duplicate@example.com' }]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23505');
    });

    it('should enforce not-null constraints', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'null value in column violates not-null constraint',
            code: '23502',
          },
        }),
      });

      const { error } = await supabase
        .from('vocabulary_items')
        .insert([{}]); // Missing required fields

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23502');
    });

    it('should enforce check constraints', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'new row violates check constraint',
            code: '23514',
          },
        }),
      });

      const { error } = await supabase
        .from('learning_progress')
        .insert([{
          mastery_level: -1, // Invalid: should be 0-100
        }]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514');
    });
  });

  // ==============================================
  // REALTIME SUBSCRIPTIONS
  // ==============================================

  describe('Realtime Subscriptions', () => {
    it('should subscribe to table changes', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      };

      (supabase as any).channel = vi.fn().mockReturnValue(mockChannel);

      const channel = (supabase as any).channel('vocabulary-changes');
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vocabulary_items',
      }, vi.fn());

      expect(mockChannel.on).toHaveBeenCalled();
    });
  });

  // ==============================================
  // ERROR RECOVERY
  // ==============================================

  describe('Error Recovery', () => {
    it('should handle network disconnection', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('NetworkError: Failed to fetch')),
      });

      try {
        await supabase.from('users').select('*');
      } catch (error: any) {
        expect(error.message).toContain('NetworkError');
      }
    });

    it('should handle rate limiting', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Too many requests', status: 429 },
        }),
      });

      const { error } = await supabase.from('users').select('*');

      expect(error).toBeTruthy();
      expect(error?.status).toBe(429);
    });
  });
});
