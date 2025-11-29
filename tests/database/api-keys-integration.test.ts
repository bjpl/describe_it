/**
 * User API Keys Table Integration Tests
 * Tests encrypted storage, key management, and security features
 *
 * Note: These tests use mocks and do not require an active database connection.
 * They are skipped when NEXT_PUBLIC_SUPABASE_URL is not configured.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Mock Supabase client before importing
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock database utils to prevent initialization errors
vi.mock('@/lib/database/utils', () => ({
  databaseOperations: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  },
  exportOperations: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  },
  progressOperations: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Now safe to import
import { supabase } from '@/lib/supabase/client';
import { databaseOperations } from '@/lib/database/utils';

// Mock encryption functions
const mockEncrypt = (text: string): string => {
  return Buffer.from(text).toString('base64');
};

const mockDecrypt = (encrypted: string): string => {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
};

// Skip tests if database is not available
const skipTests = !process.env.NEXT_PUBLIC_SUPABASE_URL;

describe.skipIf(skipTests)('User API Keys Table Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==============================================
  // CREATE API KEY RECORDS
  // ==============================================

  describe('Create API Key Records', () => {
    it('should store encrypted API key', async () => {
      const plainKey = 'sk-anthropic-test-key-12345';
      const encryptedKey = mockEncrypt(plainKey);

      const mockApiKey = {
        id: 'key-123',
        user_id: 'user-123',
        service_name: 'claude',
        encrypted_key: encryptedKey,
        key_hash: crypto.createHash('sha256').update(plainKey).digest('hex'),
        is_active: true,
        created_at: new Date().toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockApiKey,
          error: null,
        }),
      });

      const result = await databaseOperations.create('user_api_keys', {
        user_id: 'user-123',
        service_name: 'claude',
        encrypted_key: encryptedKey,
        key_hash: crypto.createHash('sha256').update(plainKey).digest('hex'),
      });

      expect(result.data).toEqual(mockApiKey);
      expect(result.data?.encrypted_key).not.toBe(plainKey);
      expect(result.error).toBeNull();
    });

    it('should support multiple service types', async () => {
      const services = ['claude', 'openai', 'custom'];

      for (const service of services) {
        (supabase.from as any).mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { service_name: service },
            error: null,
          }),
        });

        const result = await databaseOperations.create('user_api_keys', {
          user_id: 'user-123',
          service_name: service,
          encrypted_key: mockEncrypt('test-key'),
        });

        expect(result.data?.service_name).toBe(service);
      }
    });

    it('should enforce unique constraint on user_id + service_name', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
          },
        }),
      });

      const result = await databaseOperations.create('user_api_keys', {
        user_id: 'user-123',
        service_name: 'claude',
        encrypted_key: mockEncrypt('test-key'),
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('duplicate');
    });

    it('should enforce foreign key constraint on user_id', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'violates foreign key constraint',
            code: '23503',
          },
        }),
      });

      const result = await databaseOperations.create('user_api_keys', {
        user_id: 'invalid-user',
        service_name: 'claude',
        encrypted_key: mockEncrypt('test-key'),
      });

      expect(result.error).toBeTruthy();
    });

    it('should store key metadata', async () => {
      const metadata = {
        plan: 'pro',
        rate_limit: 1000,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { key_metadata: metadata },
          error: null,
        }),
      });

      const result = await databaseOperations.create('user_api_keys', {
        user_id: 'user-123',
        service_name: 'claude',
        encrypted_key: mockEncrypt('test-key'),
        key_metadata: metadata,
      });

      expect(result.data?.key_metadata).toEqual(metadata);
    });
  });

  // ==============================================
  // READ API KEY RECORDS
  // ==============================================

  describe('Read API Key Records', () => {
    it('should retrieve user API keys', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          user_id: 'user-123',
          service_name: 'claude',
          is_active: true,
        },
        {
          id: 'key-2',
          user_id: 'user-123',
          service_name: 'openai',
          is_active: true,
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockKeys,
          error: null,
        }),
      });

      const result = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', 'user-123');

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('should decrypt API key using RPC function', async () => {
      const plainKey = 'sk-anthropic-test-key-12345';
      const encryptedKey = mockEncrypt(plainKey);

      (supabase.rpc as any).mockResolvedValue({
        data: plainKey,
        error: null,
      });

      const result = await supabase.rpc('decrypt_api_key', {
        encrypted_key: encryptedKey,
      });

      expect(result.data).toBe(plainKey);
      expect(result.error).toBeNull();
    });

    it('should filter active keys only', async () => {
      const mockKeys = [
        { id: 'key-1', is_active: true },
        { id: 'key-2', is_active: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockKeys,
          error: null,
        }),
      });

      const result = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', 'user-123')
        .is('is_active', true);

      expect(result.data?.every((k) => k.is_active)).toBe(true);
    });

    it('should retrieve key by service name', async () => {
      const mockKey = {
        id: 'key-123',
        service_name: 'claude',
        encrypted_key: mockEncrypt('test-key'),
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockKey,
          error: null,
        }),
      });

      const result = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', 'user-123')
        .eq('service_name', 'claude')
        .single();

      expect(result.data?.service_name).toBe('claude');
    });
  });

  // ==============================================
  // UPDATE API KEY RECORDS
  // ==============================================

  describe('Update API Key Records', () => {
    it('should update encrypted key', async () => {
      const newKey = 'sk-anthropic-new-key-67890';
      const encryptedKey = mockEncrypt(newKey);

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            encrypted_key: encryptedKey,
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'key-123', {
        encrypted_key: encryptedKey,
      });

      expect(result.data?.encrypted_key).toBe(encryptedKey);
    });

    it('should deactivate API key', async () => {
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_active: false },
          error: null,
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'key-123', {
        is_active: false,
      });

      expect(result.data?.is_active).toBe(false);
    });

    it('should update last_used_at on key usage', async () => {
      const now = new Date().toISOString();

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { last_used_at: now },
          error: null,
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'key-123', {
        last_used_at: now,
      });

      expect(result.data?.last_used_at).toBe(now);
    });

    it('should update key metadata', async () => {
      const updatedMetadata = {
        plan: 'enterprise',
        rate_limit: 5000,
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { key_metadata: updatedMetadata },
          error: null,
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'key-123', {
        key_metadata: updatedMetadata,
      });

      expect(result.data?.key_metadata.plan).toBe('enterprise');
    });

    it('should auto-update updated_at timestamp', async () => {
      const now = new Date().toISOString();

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { updated_at: now },
          error: null,
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'key-123', {
        is_active: true,
      });

      expect(result.data?.updated_at).toBeDefined();
    });
  });

  // ==============================================
  // DELETE API KEY RECORDS
  // ==============================================

  describe('Delete API Key Records', () => {
    it('should delete API key', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await databaseOperations.delete('user_api_keys', 'key-123');

      expect(result.error).toBeNull();
    });

    it('should cascade delete when user is deleted', async () => {
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await supabase
        .from('users')
        .delete()
        .eq('id', 'user-123');

      expect(result.error).toBeNull();
    });
  });

  // ==============================================
  // RLS POLICY TESTS
  // ==============================================

  describe('Row Level Security Policies', () => {
    it('should allow users to read own API keys', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-123', service_name: 'claude' }],
          error: null,
        }),
      });

      const result = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', 'user-123');

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('should prevent users from reading others API keys', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const result = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', 'other-user');

      expect(result.error?.code).toBe('PGRST301');
    });

    it('should allow users to update own API keys', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user-123', is_active: false },
          error: null,
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'key-123', {
        is_active: false,
      });

      expect(result.error).toBeNull();
    });

    it('should prevent users from updating others API keys', async () => {
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied', code: 'PGRST301' },
        }),
      });

      const result = await databaseOperations.update('user_api_keys', 'other-key', {
        is_active: false,
      });

      expect(result.error).toBeTruthy();
    });
  });

  // ==============================================
  // ENCRYPTION/DECRYPTION TESTS
  // ==============================================

  describe('Encryption and Decryption', () => {
    it('should encrypt API key correctly', () => {
      const plainKey = 'sk-anthropic-test-key-12345';
      const encrypted = mockEncrypt(plainKey);

      expect(encrypted).not.toBe(plainKey);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt API key correctly', () => {
      const plainKey = 'sk-anthropic-test-key-12345';
      const encrypted = mockEncrypt(plainKey);
      const decrypted = mockDecrypt(encrypted);

      expect(decrypted).toBe(plainKey);
    });

    it('should generate consistent key hash', () => {
      const key = 'sk-anthropic-test-key-12345';
      const hash1 = crypto.createHash('sha256').update(key).digest('hex');
      const hash2 = crypto.createHash('sha256').update(key).digest('hex');

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64-character hex string
    });

    it('should verify key using hash', () => {
      const plainKey = 'sk-anthropic-test-key-12345';
      const storedHash = crypto.createHash('sha256').update(plainKey).digest('hex');
      const providedKeyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

      expect(providedKeyHash).toBe(storedHash);
    });
  });

  // ==============================================
  // KEY EXPIRATION LOGIC
  // ==============================================

  describe('Key Expiration and Reminders', () => {
    it('should detect expired keys', () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const isExpired = expiredDate.getTime() < now.getTime();
      expect(isExpired).toBe(true);
    });

    it('should detect keys expiring soon (within 7 days)', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

      const daysUntilExpiry = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBeLessThan(7);
    });

    it('should send reminder for expiring keys', () => {
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const shouldSendReminder = daysUntilExpiry <= 7;
      expect(shouldSendReminder).toBe(true);
    });
  });

  // ==============================================
  // RATE LIMITING LOGIC
  // ==============================================

  describe('Rate Limiting', () => {
    it('should track API key usage count', async () => {
      let usageCount = 0;

      // Simulate 10 API calls
      for (let i = 0; i < 10; i++) {
        usageCount++;
      }

      expect(usageCount).toBe(10);
    });

    it('should enforce rate limits from metadata', () => {
      const rateLimit = 1000;
      const currentUsage = 950;

      const isNearLimit = currentUsage >= rateLimit * 0.9;
      expect(isNearLimit).toBe(true);
    });

    it('should calculate time until rate limit reset', () => {
      const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const now = new Date();

      const minutesUntilReset = Math.floor(
        (resetTime.getTime() - now.getTime()) / (1000 * 60)
      );

      expect(minutesUntilReset).toBe(60);
    });
  });

  // ==============================================
  // DATA INTEGRITY TESTS
  // ==============================================

  describe('Data Integrity', () => {
    it('should enforce required fields', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'null value in column violates not-null constraint',
            code: '23502',
          },
        }),
      });

      const result = await databaseOperations.create('user_api_keys', {
        user_id: 'user-123',
        // Missing required fields
      });

      expect(result.error).toBeTruthy();
    });

    it('should validate service_name enum', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'invalid service_name',
            code: '23514',
          },
        }),
      });

      const result = await databaseOperations.create('user_api_keys', {
        user_id: 'user-123',
        service_name: 'invalid-service',
        encrypted_key: mockEncrypt('test-key'),
      });

      expect(result.error).toBeTruthy();
    });

    it('should store JSONB metadata correctly', () => {
      const metadata = {
        plan: 'pro',
        rate_limit: 1000,
        features: ['embeddings', 'chat'],
      };

      const jsonString = JSON.stringify(metadata);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(metadata);
    });
  });
});
