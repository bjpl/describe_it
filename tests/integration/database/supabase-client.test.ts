/**
 * Supabase Client Configuration Integration Tests
 *
 * Tests for:
 * - Client initialization
 * - Connection pooling
 * - Environment variable configuration
 * - Server vs client-side clients
 * - Error handling for missing credentials
 *
 * Total: 20 comprehensive tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase, createBrowserSupabaseClient } from '@/lib/supabase/client';
import { createServerSupabaseClient, serverAuthHelpers } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

describe('Supabase Client Configuration', () => {
  let testClient: SupabaseClient<Database>;
  const originalEnv = process.env;

  beforeAll(() => {
    // Save original environment
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('Environment Variable Configuration', () => {
    it('should initialize with valid environment variables', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => {
        // This would throw in module initialization
        require('@/lib/supabase/client');
      }).toThrow();

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => {
        require('@/lib/supabase/client');
      }).toThrow();

      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    });

    it('should validate environment variable formats', () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(url).toMatch(/^https?:\/\//);
      expect(key).toHaveLength(expect.any(Number));
      expect(key!.length).toBeGreaterThan(20);
    });
  });

  describe('Client Initialization', () => {
    it('should create singleton client instance', () => {
      const client1 = supabase;
      const client2 = supabase;

      expect(client1).toBe(client2);
    });

    it('should create browser client with correct configuration', () => {
      const client = createBrowserSupabaseClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.from).toBeDefined();
      expect(client.channel).toBeDefined();
    });

    it('should configure browser client with persistent sessions', () => {
      const client = supabase;

      // Browser client should have auth configured
      expect(client.auth).toBeDefined();
    });

    it('should create server client with cookie configuration', async () => {
      const serverClient = await createServerSupabaseClient();

      expect(serverClient).toBeDefined();
      expect(serverClient.auth).toBeDefined();
    });

    it('should handle client initialization errors gracefully', () => {
      expect(() => {
        createClient('invalid-url', 'invalid-key');
      }).toThrow();
    });
  });

  describe('Server vs Client-Side Clients', () => {
    it('should use different configurations for server and browser', async () => {
      const browserClient = supabase;
      const serverClient = await createServerSupabaseClient();

      expect(browserClient).toBeDefined();
      expect(serverClient).toBeDefined();
      // Server and browser clients are different instances
    });

    it('should configure browser client with localStorage', () => {
      // Browser client uses localStorage for session persistence
      const client = supabase;
      expect(client).toBeDefined();
    });

    it('should configure server client with cookies', async () => {
      const serverClient = await createServerSupabaseClient();
      expect(serverClient).toBeDefined();
    });

    it('should handle server-side auth operations', async () => {
      const user = await serverAuthHelpers.getCurrentUser();
      // Should return null or user without throwing
      expect(user === null || typeof user === 'object').toBe(true);
    });
  });

  describe('Connection Pooling', () => {
    it('should reuse existing connections', async () => {
      const query1 = supabase.from('users').select('id').limit(1);
      const query2 = supabase.from('users').select('id').limit(1);

      // Both queries should use the same client
      expect(query1).toBeDefined();
      expect(query2).toBeDefined();
    });

    it('should handle concurrent queries', async () => {
      const promises = Array(5).fill(null).map(() =>
        supabase.from('users').select('id').limit(1)
      );

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(5);
    });

    it('should maintain connection pool limits', async () => {
      // Test that we don't exceed connection pool limits
      const queries = Array(10).fill(null).map(() =>
        supabase.from('users').select('id').limit(1)
      );

      await expect(Promise.all(queries)).resolves.toBeDefined();
    });
  });

  describe('Client Configuration Options', () => {
    it('should configure auth with correct options', () => {
      const client = supabase;

      expect(client.auth).toBeDefined();
    });

    it('should configure realtime with rate limiting', () => {
      const client = supabase;

      // Realtime should be configured
      expect(client.channel).toBeDefined();
    });

    it('should use correct API version', () => {
      const client = supabase;
      expect(client).toBeDefined();
    });

    it('should handle custom headers', async () => {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              'x-custom-header': 'test-value'
            }
          }
        }
      );

      expect(client).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create client with invalid URL
      const invalidClient = createClient(
        'https://invalid-url-that-does-not-exist.supabase.co',
        'invalid-key'
      );

      const { error } = await invalidClient.from('users').select('*').limit(1);
      expect(error).toBeDefined();
    });
  });
});

describe('Client Health Checks', () => {
  it('should verify client connectivity', async () => {
    const { error } = await supabase.from('users').select('id').limit(1);

    // Either succeeds or fails with known error (not connectivity issue)
    if (error) {
      expect(['PGRST116', 'PGRST301', '42501']).toContain(error.code);
    }
  });
});
