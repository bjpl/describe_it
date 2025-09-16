import { VaultClient, VaultConfig, SecretData } from './vault-client';
import CryptoUtils from './encryption';
import { getAuditLogger } from './audit-logger';
import { Redis } from 'ioredis';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

const logger = getAuditLogger('secrets-manager');

export interface SecretManagerConfig {
  provider: 'vault' | 'env' | 'memory';
  vault?: VaultConfig;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  encryption?: {
    enabled: boolean;
    key?: string;
  };
  cache?: {
    enabled: boolean;
    ttl: number; // seconds
  };
}

export interface Secret {
  value: string;
  metadata?: {
    created: Date;
    updated: Date;
    version: number;
    tags?: string[];
  };
}

export interface SecretFilter {
  tags?: string[];
  path?: string;
  pattern?: string;
}

export abstract class BaseSecretProvider {
  protected encryptionKey?: string;

  constructor(protected config: SecretManagerConfig) {
    if (config.encryption?.enabled && config.encryption.key) {
      this.encryptionKey = config.encryption.key;
    }
  }

  abstract get(key: string): Promise<Secret | null>;
  abstract set(key: string, value: string, metadata?: any): Promise<boolean>;
  abstract delete(key: string): Promise<boolean>;
  abstract list(filter?: SecretFilter): Promise<string[]>;
  abstract exists(key: string): Promise<boolean>;

  protected encryptValue(value: string): string | any {
    if (!this.encryptionKey) {
      return value;
    }
    return CryptoUtils.encrypt(value, this.encryptionKey);
  }

  protected decryptValue(value: string | any): string {
    if (!this.encryptionKey || typeof value === 'string') {
      return value as string;
    }
    return CryptoUtils.decrypt(value, this.encryptionKey);
  }
}

export class VaultSecretProvider extends BaseSecretProvider {
  private client: VaultClient;

  constructor(config: SecretManagerConfig) {
    super(config);
    if (!config.vault) {
      throw new Error('Vault configuration is required');
    }
    this.client = new VaultClient(config.vault);
  }

  async initialize(): Promise<boolean> {
    try {
      const authenticated = await this.client.authenticate();
      if (!authenticated) {
        throw new Error('Vault authentication failed');
      }
      
      const healthy = await this.client.healthCheck();
      if (!healthy) {
        throw new Error('Vault health check failed');
      }

      logger.securityEvent('PROVIDER_INIT', { provider: 'vault' });
      return true;
    } catch (error) {
      logger.securityEvent('PROVIDER_INIT', { 
        provider: 'vault', 
        error: error.message 
      }, false);
      return false;
    }
  }

  async get(key: string): Promise<Secret | null> {
    try {
      const vaultSecret = await this.client.readSecret(key);
      if (!vaultSecret?.data) {
        return null;
      }

      const value = this.decryptValue(vaultSecret.data.value as string);
      
      logger.accessEvent(key, 'READ', undefined, true);
      
      return {
        value,
        metadata: {
          created: new Date(vaultSecret.metadata?.created_time || Date.now()),
          updated: new Date(vaultSecret.metadata?.created_time || Date.now()),
          version: vaultSecret.metadata?.version || 1,
          tags: vaultSecret.data.tags as string[] || [],
        },
      };
    } catch (error) {
      logger.accessEvent(key, 'READ', undefined, false);
      return null;
    }
  }

  async set(key: string, value: string, metadata?: any): Promise<boolean> {
    try {
      const encryptedValue = this.encryptValue(value);
      const secretData: SecretData = {
        value: encryptedValue,
        ...metadata,
      };

      const success = await this.client.writeSecret(key, secretData);
      logger.accessEvent(key, 'WRITE', undefined, success);
      return success;
    } catch (error) {
      logger.accessEvent(key, 'WRITE', undefined, false);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const success = await this.client.deleteSecret(key);
      logger.accessEvent(key, 'DELETE', undefined, success);
      return success;
    } catch (error) {
      logger.accessEvent(key, 'DELETE', undefined, false);
      return false;
    }
  }

  async list(filter?: SecretFilter): Promise<string[]> {
    try {
      const path = filter?.path || '';
      const keys = await this.client.listSecrets(path);
      
      let filteredKeys = keys;
      if (filter?.pattern) {
        const regex = new RegExp(filter.pattern);
        filteredKeys = keys.filter(key => regex.test(key));
      }

      logger.accessEvent(path, 'LIST', undefined, true);
      return filteredKeys;
    } catch (error) {
      logger.accessEvent(filter?.path || '', 'LIST', undefined, false);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    const secret = await this.get(key);
    return secret !== null;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export class EnvironmentSecretProvider extends BaseSecretProvider {
  private secrets: Map<string, Secret> = new Map();

  constructor(config: SecretManagerConfig) {
    super(config);
    this.loadFromEnvironment();
    logger.securityEvent('PROVIDER_INIT', { provider: 'environment' });
  }

  private loadFromEnvironment(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('SECRET_') || key.endsWith('_KEY') || key.endsWith('_SECRET')) {
        this.secrets.set(key, {
          value: value || '',
          metadata: {
            created: new Date(),
            updated: new Date(),
            version: 1,
            tags: ['environment'],
          },
        });
      }
    }
  }

  async get(key: string): Promise<Secret | null> {
    const secret = this.secrets.get(key);
    if (secret) {
      const decryptedValue = this.decryptValue(secret.value);
      logger.accessEvent(key, 'READ', undefined, true);
      return {
        ...secret,
        value: decryptedValue,
      };
    }
    
    logger.accessEvent(key, 'READ', undefined, false);
    return null;
  }

  async set(key: string, value: string, metadata?: any): Promise<boolean> {
    try {
      const encryptedValue = this.encryptValue(value);
      this.secrets.set(key, {
        value: encryptedValue as string,
        metadata: {
          created: new Date(),
          updated: new Date(),
          version: 1,
          tags: metadata?.tags || [],
        },
      });
      
      logger.accessEvent(key, 'WRITE', undefined, true);
      return true;
    } catch (error) {
      logger.accessEvent(key, 'WRITE', undefined, false);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.secrets.delete(key);
    logger.accessEvent(key, 'DELETE', undefined, deleted);
    return deleted;
  }

  async list(filter?: SecretFilter): Promise<string[]> {
    let keys = Array.from(this.secrets.keys());
    
    if (filter?.pattern) {
      const regex = new RegExp(filter.pattern);
      keys = keys.filter(key => regex.test(key));
    }

    logger.accessEvent('*', 'LIST', undefined, true);
    return keys;
  }

  async exists(key: string): Promise<boolean> {
    return this.secrets.has(key);
  }
}

export class MemorySecretProvider extends BaseSecretProvider {
  private secrets: Map<string, Secret> = new Map();
  private redis?: Redis;

  constructor(config: SecretManagerConfig) {
    super(config);
    
    if (config.redis) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });
    }

    logger.securityEvent('PROVIDER_INIT', { provider: 'memory' });
  }

  async get(key: string): Promise<Secret | null> {
    try {
      let secret = this.secrets.get(key);
      
      // Try Redis if local cache miss
      if (!secret && this.redis) {
        const redisValue = await this.redis.get(`secret:${key}`);
        if (redisValue) {
          secret = safeParse(redisValue);
          if (secret) {
            this.secrets.set(key, secret);
          }
        }
      }

      if (secret) {
        const decryptedValue = this.decryptValue(secret.value);
        logger.accessEvent(key, 'READ', undefined, true);
        return {
          ...secret,
          value: decryptedValue,
        };
      }

      logger.accessEvent(key, 'READ', undefined, false);
      return null;
    } catch (error) {
      logger.accessEvent(key, 'READ', undefined, false);
      return null;
    }
  }

  async set(key: string, value: string, metadata?: any): Promise<boolean> {
    try {
      const encryptedValue = this.encryptValue(value);
      const secret: Secret = {
        value: encryptedValue as string,
        metadata: {
          created: new Date(),
          updated: new Date(),
          version: 1,
          tags: metadata?.tags || [],
        },
      };

      this.secrets.set(key, secret);
      
      // Store in Redis if available
      if (this.redis) {
        const ttl = this.config.cache?.ttl || 3600;
        await this.redis.setex(`secret:${key}`, ttl, safeStringify(secret));
      }

      logger.accessEvent(key, 'WRITE', undefined, true);
      return true;
    } catch (error) {
      logger.accessEvent(key, 'WRITE', undefined, false);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.secrets.delete(key);
      
      if (this.redis) {
        await this.redis.del(`secret:${key}`);
      }

      logger.accessEvent(key, 'DELETE', undefined, deleted);
      return deleted;
    } catch (error) {
      logger.accessEvent(key, 'DELETE', undefined, false);
      return false;
    }
  }

  async list(filter?: SecretFilter): Promise<string[]> {
    let keys = Array.from(this.secrets.keys());
    
    if (filter?.pattern) {
      const regex = new RegExp(filter.pattern);
      keys = keys.filter(key => regex.test(key));
    }

    logger.accessEvent('*', 'LIST', undefined, true);
    return keys;
  }

  async exists(key: string): Promise<boolean> {
    if (this.secrets.has(key)) {
      return true;
    }

    if (this.redis) {
      const exists = await this.redis.exists(`secret:${key}`);
      return exists === 1;
    }

    return false;
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

export class SecretsManager {
  private provider: BaseSecretProvider;
  private cache: Map<string, { secret: Secret; expires: number }> = new Map();

  constructor(private config: SecretManagerConfig) {
    this.provider = this.createProvider();
  }

  private createProvider(): BaseSecretProvider {
    switch (this.config.provider) {
      case 'vault':
        return new VaultSecretProvider(this.config);
      case 'env':
        return new EnvironmentSecretProvider(this.config);
      case 'memory':
        return new MemorySecretProvider(this.config);
      default:
        throw new Error(`Unsupported secret provider: ${this.config.provider}`);
    }
  }

  async initialize(): Promise<boolean> {
    if ('initialize' in this.provider) {
      return await (this.provider as VaultSecretProvider).initialize();
    }
    return true;
  }

  async getSecret(key: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.config.cache?.enabled) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.secret.value;
        }
      }

      const secret = await this.provider.get(key);
      if (!secret) {
        return null;
      }

      // Update cache
      if (this.config.cache?.enabled) {
        const expires = Date.now() + (this.config.cache.ttl * 1000);
        this.cache.set(key, { secret, expires });
      }

      return secret.value;
    } catch (error) {
      logger.error('Failed to get secret', { key, error: error.message });
      return null;
    }
  }

  async setSecret(key: string, value: string, metadata?: any): Promise<boolean> {
    try {
      const success = await this.provider.set(key, value, metadata);
      
      // Clear cache
      if (this.config.cache?.enabled) {
        this.cache.delete(key);
      }

      return success;
    } catch (error) {
      logger.error('Failed to set secret', { key, error: error.message });
      return false;
    }
  }

  async deleteSecret(key: string): Promise<boolean> {
    try {
      const success = await this.provider.delete(key);
      
      // Clear cache
      if (this.config.cache?.enabled) {
        this.cache.delete(key);
      }

      return success;
    } catch (error) {
      logger.error('Failed to delete secret', { key, error: error.message });
      return false;
    }
  }

  async listSecrets(filter?: SecretFilter): Promise<string[]> {
    try {
      return await this.provider.list(filter);
    } catch (error) {
      logger.error('Failed to list secrets', { filter, error: error.message });
      return [];
    }
  }

  async secretExists(key: string): Promise<boolean> {
    try {
      return await this.provider.exists(key);
    } catch (error) {
      logger.error('Failed to check secret existence', { key, error: error.message });
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Secret cache cleared');
  }

  async close(): Promise<void> {
    if ('close' in this.provider) {
      await (this.provider as VaultSecretProvider | MemorySecretProvider).close();
    }
    this.clearCache();
  }
}

export function createSecretsManager(config: SecretManagerConfig): SecretsManager {
  return new SecretsManager(config);
}