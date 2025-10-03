import { createPool, Pool, PoolOptions } from 'generic-pool';
import OpenAI from 'openai';
import { performanceLogger } from '@/lib/logger';

export interface PooledClient extends OpenAI {
  _poolId: string;
  _lastUsed: Date;
  _requestCount: number;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  maxRetries: number;
  healthCheckInterval: number;
}

export class OpenAIConnectionPool {
  private pool: Pool<PooledClient>;
  private config: ConnectionPoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private apiKey: string;
  private baseURL?: string;

  constructor(
    apiKey: string,
    baseURL?: string,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.config = {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 10000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 300000, // 5 minutes
      reapIntervalMillis: 60000,  // 1 minute
      maxRetries: 3,
      healthCheckInterval: 30000, // 30 seconds
      ...config,
    };

    this.pool = this.createPool();
    this.startHealthCheck();
  }

  private createPool(): Pool<PooledClient> {
    const factory = {
      create: async (): Promise<PooledClient> => {
        const client = new OpenAI({
          apiKey: this.apiKey,
          baseURL: this.baseURL,
          timeout: 60000,
          maxRetries: this.config.maxRetries,
        }) as PooledClient;

        client._poolId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        client._lastUsed = new Date();
        client._requestCount = 0;

        // Test the connection
        await this.validateClient(client);
        
        return client;
      },

      destroy: async (client: PooledClient): Promise<void> => {
        // OpenAI client doesn't have explicit cleanup, but we can clear internal state
        try {
          // @ts-ignore - accessing internal properties for cleanup
          if (client._httpAgent) {
            client._httpAgent.destroy?.();
          }
        } catch (error) {
          performanceLogger.warn('Error during client cleanup:', error);
        }
      },

      validate: async (client: PooledClient): Promise<boolean> => {
        try {
          return await this.validateClient(client);
        } catch {
          return false;
        }
      },
    };

    return createPool<PooledClient>(factory, {
      min: this.config.min,
      max: this.config.max,
      acquireTimeoutMillis: this.config.acquireTimeoutMillis,
      createTimeoutMillis: this.config.createTimeoutMillis,
      destroyTimeoutMillis: this.config.destroyTimeoutMillis,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      reapIntervalMillis: this.config.reapIntervalMillis,
      autostart: true,
    });
  }

  private async validateClient(client: PooledClient): Promise<boolean> {
    try {
      // Simple validation - attempt to list models (lightweight operation)
      const response = await Promise.race([
        client.models.list({ limit: 1 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        ),
      ]);
      
      return Boolean(response);
    } catch (error) {
      performanceLogger.warn('Client validation failed:', error);
      return false;
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const poolStats = this.getStats();
        
        // Check if we need to warm up the pool
        if (poolStats.available < this.config.min) {
          await this.warmUp();
        }

        // Log pool statistics
        performanceLogger.info('Connection pool stats:', poolStats);
      } catch (error) {
        performanceLogger.error('Health check error:', error);
      }
    }, this.config.healthCheckInterval);
  }

  async acquire(): Promise<PooledClient> {
    const client = await this.pool.acquire();
    client._lastUsed = new Date();
    client._requestCount++;
    return client;
  }

  async release(client: PooledClient): Promise<void> {
    return this.pool.release(client);
  }

  async use<T>(operation: (client: PooledClient) => Promise<T>): Promise<T> {
    const client = await this.acquire();
    try {
      return await operation(client);
    } finally {
      await this.release(client);
    }
  }

  async warmUp(targetSize?: number): Promise<void> {
    const target = targetSize || this.config.min;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < target; i++) {
      promises.push(
        this.acquire()
          .then(client => this.release(client))
          .catch(error => performanceLogger.warn('Warm-up error:', error))
      );
    }

    await Promise.allSettled(promises);
  }

  getStats() {
    return {
      size: this.pool.size,
      available: this.pool.available,
      borrowed: this.pool.borrowed,
      invalid: this.pool.invalid,
      pending: this.pool.pending,
      max: this.pool.max,
      min: this.pool.min,
    };
  }

  async drain(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    await this.pool.drain();
  }

  async clear(): Promise<void> {
    await this.pool.clear();
  }

  async destroy(): Promise<void> {
    await this.drain();
    await this.clear();
  }
}

// Singleton pool manager
class PoolManager {
  private pools = new Map<string, OpenAIConnectionPool>();

  getPool(
    apiKey: string,
    baseURL?: string,
    config?: Partial<ConnectionPoolConfig>
  ): OpenAIConnectionPool {
    const poolKey = `${apiKey}_${baseURL || 'default'}`;
    
    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, new OpenAIConnectionPool(apiKey, baseURL, config));
    }
    
    return this.pools.get(poolKey)!;
  }

  async destroyAll(): Promise<void> {
    const promises = Array.from(this.pools.values()).map(pool => pool.destroy());
    await Promise.allSettled(promises);
    this.pools.clear();
  }

  getStats() {
    const stats: Record<string, any> = {};
    for (const [key, pool] of this.pools) {
      stats[key] = pool.getStats();
    }
    return stats;
  }
}

export const poolManager = new PoolManager();

// Convenience function for getting a client with connection pooling
export async function getPooledOpenAIClient(
  apiKey: string,
  baseURL?: string,
  config?: Partial<ConnectionPoolConfig>
): Promise<{ client: PooledClient; release: () => Promise<void> }> {
  const pool = poolManager.getPool(apiKey, baseURL, config);
  const client = await pool.acquire();
  
  return {
    client,
    release: () => pool.release(client),
  };
}

// Hook for Next.js to clean up pools on shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    performanceLogger.info('Shutting down OpenAI connection pools...');
    await poolManager.destroyAll();
  });

  process.on('SIGINT', async () => {
    performanceLogger.info('Shutting down OpenAI connection pools...');
    await poolManager.destroyAll();
  });
}