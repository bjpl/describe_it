import { SecretsManager, SecretManagerConfig } from './secrets-manager';
import CryptoUtils, { SymmetricEncryption, AsymmetricEncryption } from './encryption';
import { getAuditLogger } from './audit-logger';
import { Redis } from 'ioredis';
import * as cron from 'node-cron';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

const logger = getAuditLogger('key-rotation');

export interface KeyRotationConfig {
  schedule: string; // cron expression
  keyTypes: ('symmetric' | 'asymmetric')[];
  rotationPolicy: {
    maxAge: number; // days
    gracePeriod: number; // days for old key validity
    batchSize?: number; // number of keys to rotate at once
  };
  notifications?: {
    webhook?: string;
    email?: string[];
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export interface KeyMetadata {
  id: string;
  type: 'symmetric' | 'asymmetric';
  created: Date;
  rotated: Date;
  version: number;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
  algorithm: string;
  keySize: number;
  usage: string[];
}

export interface RotationJob {
  id: string;
  keyId: string;
  scheduled: Date;
  started?: Date;
  completed?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export class KeyRotationManager {
  private secretsManager: SecretsManager;
  private symmetricEncryption: SymmetricEncryption;
  private asymmetricEncryption: AsymmetricEncryption;
  private redis?: Redis;
  private rotationJobs: Map<string, RotationJob> = new Map();
  private cronJob?: cron.ScheduledTask;

  constructor(
    private config: KeyRotationConfig,
    secretsConfig: SecretManagerConfig
  ) {
    this.secretsManager = new SecretsManager(secretsConfig);
    this.symmetricEncryption = new SymmetricEncryption();
    this.asymmetricEncryption = new AsymmetricEncryption();

    if (config.redis) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
        maxRetriesPerRequest: 3,
      });
    }
  }

  async initialize(): Promise<boolean> {
    try {
      await this.secretsManager.initialize();
      
      // Schedule rotation job
      this.cronJob = cron.schedule(this.config.schedule, async () => {
        await this.runRotationCycle();
      }, {
        timezone: 'UTC',
      });

      logger.securityEvent('ROTATION_MANAGER_INIT', {
        schedule: this.config.schedule,
        keyTypes: this.config.keyTypes,
      });

      return true;
    } catch (error) {
      logger.securityEvent('ROTATION_MANAGER_INIT', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }, false);
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.start();
      logger.info('Key rotation scheduler started');
    }
  }

  async stop(): Promise<void> {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Key rotation scheduler stopped');
    }
  }

  async runRotationCycle(): Promise<void> {
    logger.info('Starting key rotation cycle');
    
    try {
      const keysToRotate = await this.identifyKeysForRotation();
      logger.info(`Found ${keysToRotate.length} keys requiring rotation`);

      const batchSize = this.config.rotationPolicy.batchSize || 10;
      for (let i = 0; i < keysToRotate.length; i += batchSize) {
        const batch = keysToRotate.slice(i, i + batchSize);
        await this.processBatch(batch);
      }

      await this.cleanupExpiredKeys();
      logger.info('Key rotation cycle completed');
    } catch (error) {
      logger.error('Key rotation cycle failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async identifyKeysForRotation(): Promise<KeyMetadata[]> {
    const keys: KeyMetadata[] = [];
    const maxAgeMs = this.config.rotationPolicy.maxAge * 24 * 60 * 60 * 1000;
    
    try {
      const keyList = await this.secretsManager.listSecrets({ pattern: 'key:.*' });
      
      for (const keyPath of keyList) {
        const metadataPath = keyPath.replace('key:', 'key-metadata:');
        const metadataJson = await this.secretsManager.getSecret(metadataPath);
        
        if (metadataJson) {
          const metadata = safeParse(metadataJson) as KeyMetadata;
          const keyAge = Date.now() - metadata.rotated.getTime();
          
          if (keyAge > maxAgeMs && metadata.status === 'active') {
            keys.push(metadata);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to identify keys for rotation', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    return keys;
  }

  private async processBatch(keys: KeyMetadata[]): Promise<void> {
    const rotationPromises = keys.map(key => this.rotateKey(key));
    await Promise.allSettled(rotationPromises);
  }

  async rotateKey(keyMetadata: KeyMetadata): Promise<boolean> {
    const jobId = `rotation-${keyMetadata.id}-${Date.now()}`;
    const job: RotationJob = {
      id: jobId,
      keyId: keyMetadata.id,
      scheduled: new Date(),
      started: new Date(),
      status: 'running',
    };

    this.rotationJobs.set(jobId, job);
    
    try {
      // Acquire distributed lock
      const lockAcquired = await this.acquireRotationLock(keyMetadata.id);
      if (!lockAcquired) {
        job.status = 'failed';
        job.error = 'Failed to acquire rotation lock';
        return false;
      }

      logger.keyOperationEvent('ROTATION_START', keyMetadata.id);

      // Generate new key
      const newKey = await this.generateNewKey(keyMetadata.type, keyMetadata.algorithm);
      if (!newKey) {
        throw new Error('Failed to generate new key');
      }

      // Store new key with incremented version
      const newMetadata: KeyMetadata = {
        ...keyMetadata,
        version: keyMetadata.version + 1,
        rotated: new Date(),
        status: 'active',
      };

      const newKeyPath = `key:${keyMetadata.id}:v${newMetadata.version}`;
      const newMetadataPath = `key-metadata:${keyMetadata.id}:v${newMetadata.version}`;

      await this.secretsManager.setSecret(newKeyPath, newKey);
      await this.secretsManager.setSecret(newMetadataPath, JSON.stringify(newMetadata));

      // Mark old key as deprecated
      const oldMetadata = { ...keyMetadata, status: 'deprecated' as const };
      const oldMetadataPath = `key-metadata:${keyMetadata.id}:v${keyMetadata.version}`;
      await this.secretsManager.setSecret(oldMetadataPath, JSON.stringify(oldMetadata));

      // Update current key pointer
      const currentKeyPath = `key:${keyMetadata.id}:current`;
      await this.secretsManager.setSecret(currentKeyPath, newKeyPath);

      // Schedule old key for deletion after grace period
      await this.scheduleKeyDeletion(keyMetadata, this.config.rotationPolicy.gracePeriod);

      job.status = 'completed';
      job.completed = new Date();

      logger.keyOperationEvent('ROTATION_COMPLETE', keyMetadata.id);

      // Send notification
      await this.sendRotationNotification(keyMetadata, newMetadata);

      return true;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';

      logger.keyOperationEvent('ROTATION_FAILED', keyMetadata.id, false);
      logger.error('Key rotation failed', {
        keyId: keyMetadata.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    } finally {
      await this.releaseRotationLock(keyMetadata.id);
      this.rotationJobs.set(jobId, job);
    }
  }

  private async generateNewKey(type: 'symmetric' | 'asymmetric', algorithm: string): Promise<string> {
    try {
      if (type === 'symmetric') {
        return this.symmetricEncryption.generateKey();
      } else {
        const keyPair = this.asymmetricEncryption.generateKeyPair();
        return safeStringify(keyPair);
      }
    } catch (error) {
      logger.error('Key generation failed', { type, algorithm, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private async acquireRotationLock(keyId: string): Promise<boolean> {
    if (!this.redis) {
      return true; // No distributed locking without Redis
    }

    try {
      const lockKey = `rotation-lock:${keyId}`;
      const lockValue = `${Date.now()}-${Math.random()}`;
      const lockTtl = 300; // 5 minutes

      const result = await this.redis.set(lockKey, lockValue, 'EX', lockTtl, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to acquire rotation lock', { keyId, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  private async releaseRotationLock(keyId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const lockKey = `rotation-lock:${keyId}`;
      await this.redis.del(lockKey);
    } catch (error) {
      logger.error('Failed to release rotation lock', { keyId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async scheduleKeyDeletion(keyMetadata: KeyMetadata, gracePeriodDays: number): Promise<void> {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + gracePeriodDays);

    const deletionJob = {
      keyId: keyMetadata.id,
      version: keyMetadata.version,
      scheduledDeletion: deletionDate,
    };

    const deletionPath = `key-deletion:${keyMetadata.id}:v${keyMetadata.version}`;
    await this.secretsManager.setSecret(deletionPath, safeStringify(deletionJob));

    logger.info('Key deletion scheduled', {
      keyId: keyMetadata.id,
      version: keyMetadata.version,
      scheduledDeletion: deletionDate,
    });
  }

  private async cleanupExpiredKeys(): Promise<void> {
    try {
      const deletionJobs = await this.secretsManager.listSecrets({ pattern: 'key-deletion:.*' });
      
      for (const jobPath of deletionJobs) {
        const jobJson = await this.secretsManager.getSecret(jobPath);
        if (jobJson) {
          const job = safeParse(jobJson);
          const scheduledDeletion = new Date(job.scheduledDeletion);
          
          if (scheduledDeletion <= new Date()) {
            await this.deleteExpiredKey(job);
            await this.secretsManager.deleteSecret(jobPath);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup expired keys', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async deleteExpiredKey(deletionJob: any): Promise<void> {
    try {
      const keyPath = `key:${deletionJob.keyId}:v${deletionJob.version}`;
      const metadataPath = `key-metadata:${deletionJob.keyId}:v${deletionJob.version}`;

      await this.secretsManager.deleteSecret(keyPath);
      await this.secretsManager.deleteSecret(metadataPath);

      logger.keyOperationEvent('KEY_DELETED', deletionJob.keyId);
      logger.info('Expired key deleted', {
        keyId: deletionJob.keyId,
        version: deletionJob.version,
      });
    } catch (error) {
      logger.error('Failed to delete expired key', {
        keyId: deletionJob.keyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async sendRotationNotification(oldKey: KeyMetadata, newKey: KeyMetadata): Promise<void> {
    if (!this.config.notifications) {
      return;
    }

    const notification = {
      event: 'key_rotated',
      timestamp: new Date(),
      keyId: oldKey.id,
      oldVersion: oldKey.version,
      newVersion: newKey.version,
      keyType: oldKey.type,
    };

    try {
      if (this.config.notifications.webhook) {
        // Send webhook notification
        await fetch(this.config.notifications.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification),
        });
      }

      logger.info('Rotation notification sent', {
        keyId: oldKey.id,
        webhook: !!this.config.notifications.webhook,
      });
    } catch (error) {
      logger.error('Failed to send rotation notification', {
        keyId: oldKey.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async manualRotation(keyId: string): Promise<boolean> {
    try {
      const metadataPath = `key-metadata:${keyId}`;
      const metadataJson = await this.secretsManager.getSecret(metadataPath);
      
      if (!metadataJson) {
        throw new Error('Key metadata not found');
      }

      const metadata = safeParse(metadataJson) as KeyMetadata;
      return await this.rotateKey(metadata);
    } catch (error) {
      logger.error('Manual rotation failed', { keyId, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async getRotationStatus(): Promise<{
    activeJobs: RotationJob[];
    pendingRotations: number;
    lastRotationCycle?: Date;
  }> {
    const activeJobs = Array.from(this.rotationJobs.values())
      .filter(job => job.status === 'running' || job.status === 'pending');

    const keysToRotate = await this.identifyKeysForRotation();

    return {
      activeJobs,
      pendingRotations: keysToRotate.length,
    };
  }

  async close(): Promise<void> {
    await this.stop();
    
    if (this.redis) {
      await this.redis.disconnect();
    }
    
    await this.secretsManager.close();
    logger.info('Key rotation manager closed');
  }
}

export function createKeyRotationManager(
  rotationConfig: KeyRotationConfig,
  secretsConfig: SecretManagerConfig
): KeyRotationManager {
  return new KeyRotationManager(rotationConfig, secretsConfig);
}