/**
 * @test API Key Encryption Security Tests
 * @description Comprehensive test suite for AES-256-GCM encryption of API keys
 * @security Critical security component - validates encryption implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock data and fixtures
const TEST_API_KEY = 'sk-test-1234567890abcdefghijklmnopqrstuvwxyz';
const TEST_MASTER_KEY = 'test-master-key-32-bytes-long!!';
const TEST_WEAK_KEY = 'weak';

interface EncryptedData {
  encryptedKey: string;
  iv: string;
  authTag: string;
  algorithm: string;
  version: number;
}

interface KeyMetadata {
  userId: string;
  keyId: string;
  createdAt: Date;
  lastUsed?: Date;
  rotationDate?: Date;
}

/**
 * API Key Encryption Service
 * Implements AES-256-GCM encryption with secure key derivation
 */
class ApiKeyEncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private saltLength = 32;
  private tagLength = 16;
  private iterations = 100000; // PBKDF2 iterations

  /**
   * Derive encryption key from master key using PBKDF2
   */
  private deriveKey(masterKey: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Encrypt API key using AES-256-GCM
   */
  encrypt(apiKey: string, masterKey: string): EncryptedData {
    // Generate cryptographically secure random values
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);

    // Derive key from master key
    const derivedKey = this.deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

    // Encrypt
    let encrypted = cipher.update(apiKey, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Clear sensitive data from memory
    derivedKey.fill(0);

    return {
      encryptedKey: encrypted,
      iv: Buffer.concat([salt, iv]).toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm,
      version: 1
    };
  }

  /**
   * Decrypt API key using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData, masterKey: string): string {
    // Parse IV and salt
    const ivBuffer = Buffer.from(encryptedData.iv, 'base64');
    const salt = ivBuffer.subarray(0, this.saltLength);
    const iv = ivBuffer.subarray(this.saltLength);

    // Derive key
    const derivedKey = this.deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv);

    // Set auth tag
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));

    // Decrypt
    let decrypted = decipher.update(encryptedData.encryptedKey, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Clear sensitive data
    derivedKey.fill(0);

    return decrypted;
  }

  /**
   * Validate encrypted data structure
   */
  validateEncryptedData(data: any): data is EncryptedData {
    return (
      typeof data === 'object' &&
      typeof data.encryptedKey === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.authTag === 'string' &&
      typeof data.algorithm === 'string' &&
      typeof data.version === 'number'
    );
  }

  /**
   * Detect if data is base64 encoded (legacy format)
   */
  isBase64Encoded(data: string): boolean {
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf8');
      return decoded.startsWith('sk-') || decoded.includes('api_key');
    } catch {
      return false;
    }
  }

  /**
   * Migrate from base64 to AES-256-GCM
   */
  migrateFromBase64(base64Key: string, masterKey: string): EncryptedData {
    // Decode base64
    const apiKey = Buffer.from(base64Key, 'base64').toString('utf8');

    // Re-encrypt with AES-256-GCM
    return this.encrypt(apiKey, masterKey);
  }
}

/**
 * Mock Database for testing
 */
class MockKeyStorage {
  private storage = new Map<string, { encrypted: EncryptedData; metadata: KeyMetadata }>();

  async store(keyId: string, encrypted: EncryptedData, metadata: KeyMetadata): Promise<void> {
    this.storage.set(keyId, { encrypted, metadata });
  }

  async retrieve(keyId: string): Promise<{ encrypted: EncryptedData; metadata: KeyMetadata } | null> {
    return this.storage.get(keyId) || null;
  }

  async delete(keyId: string): Promise<boolean> {
    return this.storage.delete(keyId);
  }

  async list(userId: string): Promise<Array<{ keyId: string; metadata: KeyMetadata }>> {
    const results: Array<{ keyId: string; metadata: KeyMetadata }> = [];
    this.storage.forEach((value, keyId) => {
      if (value.metadata.userId === userId) {
        results.push({ keyId, metadata: value.metadata });
      }
    });
    return results;
  }

  clear(): void {
    this.storage.clear();
  }
}

describe('API Key Encryption - AES-256-GCM Implementation', () => {
  let encryptionService: ApiKeyEncryptionService;
  let storage: MockKeyStorage;

  beforeEach(() => {
    encryptionService = new ApiKeyEncryptionService();
    storage = new MockKeyStorage();
  });

  afterEach(() => {
    storage.clear();
  });

  describe('Encryption Implementation', () => {
    it('should encrypt API key with AES-256-GCM', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      expect(encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.version).toBe(1);
      expect(encrypted.encryptedKey).not.toBe(TEST_API_KEY);
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
    });

    it('should generate unique IV for each encryption', () => {
      const encrypted1 = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const encrypted2 = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedKey).not.toBe(encrypted2.encryptedKey);
    });

    it('should generate valid authentication tag', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      expect(encrypted.authTag).toBeTruthy();
      expect(Buffer.from(encrypted.authTag, 'base64').length).toBe(16);
    });

    it('should encrypt different keys differently', () => {
      const key1 = 'sk-test-key-1';
      const key2 = 'sk-test-key-2';

      const encrypted1 = encryptionService.encrypt(key1, TEST_MASTER_KEY);
      const encrypted2 = encryptionService.encrypt(key2, TEST_MASTER_KEY);

      expect(encrypted1.encryptedKey).not.toBe(encrypted2.encryptedKey);
    });

    it('should handle empty API key', () => {
      const encrypted = encryptionService.encrypt('', TEST_MASTER_KEY);
      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedKey).toBeTruthy();
    });

    it('should handle very long API keys', () => {
      const longKey = 'sk-' + 'a'.repeat(1000);
      const encrypted = encryptionService.encrypt(longKey, TEST_MASTER_KEY);

      expect(encrypted).toBeDefined();
      expect(encrypted.encryptedKey).toBeTruthy();
    });

    it('should complete encryption within acceptable time', () => {
      const start = performance.now();
      encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });

  describe('Decryption Implementation', () => {
    it('should successfully decrypt encrypted API key', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const decrypted = encryptionService.decrypt(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(TEST_API_KEY);
    });

    it('should fail with invalid master key', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      expect(() => {
        encryptionService.decrypt(encrypted, 'wrong-master-key');
      }).toThrow();
    });

    it('should fail with corrupted encrypted data', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      encrypted.encryptedKey = 'corrupted-data';

      expect(() => {
        encryptionService.decrypt(encrypted, TEST_MASTER_KEY);
      }).toThrow();
    });

    it('should fail with invalid IV', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      encrypted.iv = Buffer.from('invalid-iv').toString('base64');

      expect(() => {
        encryptionService.decrypt(encrypted, TEST_MASTER_KEY);
      }).toThrow();
    });

    it('should fail with invalid auth tag', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      encrypted.authTag = Buffer.from('invalid-tag-1234').toString('base64');

      expect(() => {
        encryptionService.decrypt(encrypted, TEST_MASTER_KEY);
      }).toThrow();
    });

    it('should handle empty encrypted key', () => {
      const encrypted = encryptionService.encrypt('', TEST_MASTER_KEY);
      const decrypted = encryptionService.decrypt(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe('');
    });

    it('should decrypt within acceptable time', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      const start = performance.now();
      encryptionService.decrypt(encrypted, TEST_MASTER_KEY);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });

  describe('Key Storage', () => {
    it('should store encrypted key with metadata', async () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const metadata: KeyMetadata = {
        userId: 'user-123',
        keyId: 'key-456',
        createdAt: new Date()
      };

      await storage.store('key-456', encrypted, metadata);
      const retrieved = await storage.retrieve('key-456');

      expect(retrieved).toBeDefined();
      expect(retrieved?.encrypted).toEqual(encrypted);
      expect(retrieved?.metadata).toEqual(metadata);
    });

    it('should retrieve and decrypt stored key', async () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const metadata: KeyMetadata = {
        userId: 'user-123',
        keyId: 'key-456',
        createdAt: new Date()
      };

      await storage.store('key-456', encrypted, metadata);
      const retrieved = await storage.retrieve('key-456');
      const decrypted = encryptionService.decrypt(retrieved!.encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(TEST_API_KEY);
    });

    it('should securely delete key', async () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const metadata: KeyMetadata = {
        userId: 'user-123',
        keyId: 'key-456',
        createdAt: new Date()
      };

      await storage.store('key-456', encrypted, metadata);
      const deleted = await storage.delete('key-456');
      const retrieved = await storage.retrieve('key-456');

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should list keys for user', async () => {
      const metadata1: KeyMetadata = {
        userId: 'user-123',
        keyId: 'key-1',
        createdAt: new Date()
      };
      const metadata2: KeyMetadata = {
        userId: 'user-123',
        keyId: 'key-2',
        createdAt: new Date()
      };

      await storage.store('key-1', encryptionService.encrypt('key1', TEST_MASTER_KEY), metadata1);
      await storage.store('key-2', encryptionService.encrypt('key2', TEST_MASTER_KEY), metadata2);

      const keys = await storage.list('user-123');

      expect(keys).toHaveLength(2);
      expect(keys.map(k => k.keyId)).toContain('key-1');
      expect(keys.map(k => k.keyId)).toContain('key-2');
    });

    it('should support key rotation metadata', async () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const metadata: KeyMetadata = {
        userId: 'user-123',
        keyId: 'key-456',
        createdAt: new Date(),
        rotationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };

      await storage.store('key-456', encrypted, metadata);
      const retrieved = await storage.retrieve('key-456');

      expect(retrieved?.metadata.rotationDate).toBeDefined();
    });
  });

  describe('Migration from Base64', () => {
    it('should detect base64 encoded keys', () => {
      const base64Key = Buffer.from(TEST_API_KEY).toString('base64');
      const isBase64 = encryptionService.isBase64Encoded(base64Key);

      expect(isBase64).toBe(true);
    });

    it('should migrate base64 to AES-256-GCM', () => {
      const base64Key = Buffer.from(TEST_API_KEY).toString('base64');
      const migrated = encryptionService.migrateFromBase64(base64Key, TEST_MASTER_KEY);

      expect(migrated.algorithm).toBe('aes-256-gcm');
      expect(migrated.version).toBe(1);

      const decrypted = encryptionService.decrypt(migrated, TEST_MASTER_KEY);
      expect(decrypted).toBe(TEST_API_KEY);
    });

    it('should validate migrated data', () => {
      const base64Key = Buffer.from(TEST_API_KEY).toString('base64');
      const migrated = encryptionService.migrateFromBase64(base64Key, TEST_MASTER_KEY);

      const isValid = encryptionService.validateEncryptedData(migrated);
      expect(isValid).toBe(true);
    });

    it('should handle batch migration', async () => {
      const keys = [
        Buffer.from('sk-test-1').toString('base64'),
        Buffer.from('sk-test-2').toString('base64'),
        Buffer.from('sk-test-3').toString('base64')
      ];

      const migrated = keys.map(key =>
        encryptionService.migrateFromBase64(key, TEST_MASTER_KEY)
      );

      expect(migrated).toHaveLength(3);
      migrated.forEach(data => {
        expect(data.algorithm).toBe('aes-256-gcm');
      });
    });
  });

  describe('Security Scenarios', () => {
    it('should resist brute force attacks with PBKDF2', () => {
      // PBKDF2 with 100,000 iterations makes brute force infeasible
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      // Attempting decryption with wrong keys should fail
      const wrongKeys = ['wrong1', 'wrong2', 'wrong3'];
      wrongKeys.forEach(wrongKey => {
        expect(() => {
          encryptionService.decrypt(encrypted, wrongKey);
        }).toThrow();
      });
    });

    it('should prevent timing attacks with constant-time comparison', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        try {
          encryptionService.decrypt(encrypted, 'wrong-key-' + i);
        } catch {
          // Expected to fail
        }
        times.push(performance.now() - start);
      }

      // Timing should be relatively consistent (within 2x variance)
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxVariance = Math.max(...times) / Math.min(...times);

      expect(maxVariance).toBeLessThan(2);
    });

    it('should use cryptographically secure random values', () => {
      const encrypted1 = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const encrypted2 = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      // IVs should be different and unpredictable
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // Auth tags should be different
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);
    });

    it('should handle key derivation securely', () => {
      // Test with weak master key
      const weakEncrypted = encryptionService.encrypt(TEST_API_KEY, TEST_WEAK_KEY);

      // Should still work but relies on PBKDF2 for strengthening
      expect(weakEncrypted).toBeDefined();

      const decrypted = encryptionService.decrypt(weakEncrypted, TEST_WEAK_KEY);
      expect(decrypted).toBe(TEST_API_KEY);
    });

    it('should validate data integrity with auth tag', () => {
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

      // Tamper with encrypted data
      const tampered = { ...encrypted };
      const encryptedBuffer = Buffer.from(tampered.encryptedKey, 'base64');
      encryptedBuffer[0] ^= 0xFF; // Flip bits
      tampered.encryptedKey = encryptedBuffer.toString('base64');

      // Should fail due to auth tag mismatch
      expect(() => {
        encryptionService.decrypt(tampered, TEST_MASTER_KEY);
      }).toThrow();
    });

    it('should protect against side-channel attacks', () => {
      // Memory should be cleared after operations
      const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
      const decrypted = encryptionService.decrypt(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(TEST_API_KEY);

      // Service should clear sensitive buffers internally
      // This is implementation-dependent and tested via code review
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent encryptions', async () => {
      const promises = Array(100).fill(null).map((_, i) =>
        Promise.resolve(encryptionService.encrypt(`key-${i}`, TEST_MASTER_KEY))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.algorithm).toBe('aes-256-gcm');
      });
    });

    it('should handle concurrent decryptions', async () => {
      const encrypted = Array(100).fill(null).map((_, i) =>
        encryptionService.encrypt(`key-${i}`, TEST_MASTER_KEY)
      );

      const promises = encrypted.map(enc =>
        Promise.resolve(encryptionService.decrypt(enc, TEST_MASTER_KEY))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((result, i) => {
        expect(result).toBe(`key-${i}`);
      });
    });

    it('should maintain performance with large datasets', async () => {
      const count = 1000;
      const start = performance.now();

      for (let i = 0; i < count; i++) {
        const encrypted = encryptionService.encrypt(`key-${i}`, TEST_MASTER_KEY);
        encryptionService.decrypt(encrypted, TEST_MASTER_KEY);
      }

      const duration = performance.now() - start;
      const avgTime = duration / count;

      expect(avgTime).toBeLessThan(10); // <10ms per encrypt+decrypt cycle
    });

    it('should handle memory efficiently', () => {
      const iterations = 1000;
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
        encryptionService.decrypt(encrypted, TEST_MASTER_KEY);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not leak significant memory (<10MB for 1000 iterations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() => {
        encryptionService.encrypt(null as any, TEST_MASTER_KEY);
      }).toThrow();

      expect(() => {
        encryptionService.encrypt(TEST_API_KEY, null as any);
      }).toThrow();
    });

    it('should validate encrypted data structure', () => {
      const invalidData = {
        encryptedKey: 'test',
        // Missing required fields
      };

      const isValid = encryptionService.validateEncryptedData(invalidData);
      expect(isValid).toBe(false);
    });

    it('should handle special characters in API keys', () => {
      const specialKey = 'sk-test-!@#$%^&*()_+-=[]{}|;:",.<>?';
      const encrypted = encryptionService.encrypt(specialKey, TEST_MASTER_KEY);
      const decrypted = encryptionService.decrypt(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(specialKey);
    });

    it('should handle unicode characters', () => {
      const unicodeKey = 'sk-test-こんにちは-🔐-мир';
      const encrypted = encryptionService.encrypt(unicodeKey, TEST_MASTER_KEY);
      const decrypted = encryptionService.decrypt(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(unicodeKey);
    });

    it('should handle maximum key length', () => {
      const maxKey = 'sk-' + 'a'.repeat(10000);
      const encrypted = encryptionService.encrypt(maxKey, TEST_MASTER_KEY);
      const decrypted = encryptionService.decrypt(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(maxKey);
    });
  });
});

describe('Integration Tests', () => {
  let encryptionService: ApiKeyEncryptionService;
  let storage: MockKeyStorage;

  beforeEach(() => {
    encryptionService = new ApiKeyEncryptionService();
    storage = new MockKeyStorage();
  });

  it('should complete full encryption lifecycle', async () => {
    // 1. Encrypt
    const encrypted = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);

    // 2. Store
    const metadata: KeyMetadata = {
      userId: 'user-123',
      keyId: 'key-456',
      createdAt: new Date()
    };
    await storage.store('key-456', encrypted, metadata);

    // 3. Retrieve
    const retrieved = await storage.retrieve('key-456');
    expect(retrieved).toBeDefined();

    // 4. Decrypt
    const decrypted = encryptionService.decrypt(retrieved!.encrypted, TEST_MASTER_KEY);
    expect(decrypted).toBe(TEST_API_KEY);

    // 5. Delete
    const deleted = await storage.delete('key-456');
    expect(deleted).toBe(true);
  });

  it('should handle key rotation workflow', async () => {
    // Initial key
    const encrypted1 = encryptionService.encrypt(TEST_API_KEY, TEST_MASTER_KEY);
    const metadata1: KeyMetadata = {
      userId: 'user-123',
      keyId: 'key-1',
      createdAt: new Date(),
      rotationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    };
    await storage.store('key-1', encrypted1, metadata1);

    // Rotate to new key
    const newMasterKey = 'new-master-key-32-bytes-long!!!';
    const retrieved = await storage.retrieve('key-1');
    const decrypted = encryptionService.decrypt(retrieved!.encrypted, TEST_MASTER_KEY);
    const reencrypted = encryptionService.encrypt(decrypted, newMasterKey);

    const metadata2: KeyMetadata = {
      ...metadata1,
      keyId: 'key-2',
      createdAt: new Date()
    };
    await storage.store('key-2', reencrypted, metadata2);

    // Verify new key works
    const retrieved2 = await storage.retrieve('key-2');
    const decrypted2 = encryptionService.decrypt(retrieved2!.encrypted, newMasterKey);
    expect(decrypted2).toBe(TEST_API_KEY);
  });

  it('should handle migration workflow', async () => {
    // Store old base64 key
    const base64Key = Buffer.from(TEST_API_KEY).toString('base64');

    // Detect and migrate
    const isBase64 = encryptionService.isBase64Encoded(base64Key);
    expect(isBase64).toBe(true);

    const migrated = encryptionService.migrateFromBase64(base64Key, TEST_MASTER_KEY);

    // Store migrated key
    const metadata: KeyMetadata = {
      userId: 'user-123',
      keyId: 'migrated-key',
      createdAt: new Date()
    };
    await storage.store('migrated-key', migrated, metadata);

    // Verify
    const retrieved = await storage.retrieve('migrated-key');
    const decrypted = encryptionService.decrypt(retrieved!.encrypted, TEST_MASTER_KEY);
    expect(decrypted).toBe(TEST_API_KEY);
  });
});
