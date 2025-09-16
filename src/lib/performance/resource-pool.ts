import { EventEmitter } from 'events';

export interface PooledResource {
  id: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  isHealthy: boolean;
}

export interface ResourcePoolConfig<T> {
  minSize: number;
  maxSize: number;
  acquireTimeoutMs: number;
  createTimeoutMs: number;
  destroyTimeoutMs: number;
  idleTimeoutMs: number;
  maxUsageCount: number;
  healthCheckInterval: number;
  factory: ResourceFactory<T>;
  validator?: (resource: T) => Promise<boolean>;
}

export interface ResourceFactory<T> {
  create(): Promise<T>;
  destroy(resource: T): Promise<void>;
  validate(resource: T): Promise<boolean>;
  reset?(resource: T): Promise<void>;
}

export interface PoolStats {
  size: number;
  available: number;
  borrowed: number;
  created: number;
  destroyed: number;
  errors: number;
  waitingCount: number;
  averageCreateTime: number;
  averageAcquireTime: number;
}

export class ResourcePool<T extends PooledResource> extends EventEmitter {
  private config: ResourcePoolConfig<T>;
  private available: T[] = [];
  private borrowed = new Set<T>();
  private pending: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private stats: PoolStats = {
    size: 0,
    available: 0,
    borrowed: 0,
    created: 0,
    destroyed: 0,
    errors: 0,
    waitingCount: 0,
    averageCreateTime: 0,
    averageAcquireTime: 0,
  };

  private healthCheckTimer?: NodeJS.Timeout;
  private createTimes: number[] = [];
  private acquireTimes: number[] = [];

  constructor(config: ResourcePoolConfig<T>) {
    super();
    this.config = config;
    this.startHealthCheck();
    this.warmUp();
  }

  private async warmUp(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.config.minSize; i++) {
      promises.push(this.createResource().catch(error => {
        this.emit('error', error);
        this.stats.errors++;
      }));
    }

    await Promise.allSettled(promises);
  }

  private async createResource(): Promise<T> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Resource creation timeout')), this.config.createTimeoutMs)
      );

      const resource = await Promise.race([
        this.config.factory.create(),
        timeoutPromise,
      ]);

      const createTime = Date.now() - startTime;
      this.createTimes.push(createTime);
      if (this.createTimes.length > 100) {
        this.createTimes = this.createTimes.slice(-50);
      }

      this.stats.averageCreateTime = this.createTimes.reduce((a, b) => a + b, 0) / this.createTimes.length;
      this.stats.created++;
      
      this.available.push(resource);
      this.updateStats();
      
      this.emit('resource:created', resource);
      
      // Check if anyone is waiting for a resource
      this.processPendingRequests();
      
      return resource;

    } catch (error) {
      this.stats.errors++;
      this.emit('error', new Error(`Failed to create resource: ${error}`));
      throw error;
    }
  }

  private async destroyResource(resource: T): Promise<void> {
    try {
      this.available = this.available.filter(r => r !== resource);
      this.borrowed.delete(resource);

      const timeoutPromise = new Promise<void>((resolve) =>
        setTimeout(resolve, this.config.destroyTimeoutMs)
      );

      await Promise.race([
        this.config.factory.destroy(resource),
        timeoutPromise,
      ]);

      this.stats.destroyed++;
      this.updateStats();
      
      this.emit('resource:destroyed', resource);

    } catch (error) {
      this.stats.errors++;
      this.emit('error', new Error(`Failed to destroy resource: ${error}`));
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    const resourcesToDestroy: T[] = [];

    // Check available resources
    for (const resource of this.available) {
      const isIdle = now - resource.lastUsed.getTime() > this.config.idleTimeoutMs;
      const isOverUsed = resource.usageCount > this.config.maxUsageCount;
      const isUnhealthy = !resource.isHealthy;

      // Check if resource should be removed
      if (isIdle && this.available.length > this.config.minSize) {
        resourcesToDestroy.push(resource);
      } else if (isOverUsed || isUnhealthy) {
        resourcesToDestroy.push(resource);
      } else if (this.config.validator) {
        try {
          const isValid = await this.config.validator(resource);
          if (!isValid) {
            resource.isHealthy = false;
            resourcesToDestroy.push(resource);
          }
        } catch (error) {
          resource.isHealthy = false;
          resourcesToDestroy.push(resource);
          this.emit('validation:error', { resource, error });
        }
      }
    }

    // Destroy unhealthy/idle resources
    for (const resource of resourcesToDestroy) {
      await this.destroyResource(resource);
    }

    // Ensure minimum pool size
    const shortage = this.config.minSize - this.available.length;
    if (shortage > 0) {
      for (let i = 0; i < shortage; i++) {
        this.createResource().catch(error => {
          this.emit('error', error);
        });
      }
    }

    this.emit('health:check', {
      destroyed: resourcesToDestroy.length,
      created: Math.max(0, shortage),
      stats: this.getStats(),
    });
  }

  private processPendingRequests(): void {
    while (this.pending.length > 0 && this.available.length > 0) {
      const request = this.pending.shift()!;
      const resource = this.available.shift()!;
      
      clearTimeout(request.timeout);
      this.borrowed.add(resource);
      resource.lastUsed = new Date();
      resource.usageCount++;
      
      this.updateStats();
      request.resolve(resource);
    }
  }

  private updateStats(): void {
    this.stats.size = this.available.length + this.borrowed.size;
    this.stats.available = this.available.length;
    this.stats.borrowed = this.borrowed.size;
    this.stats.waitingCount = this.pending.length;
  }

  async acquire(): Promise<T> {
    const startTime = Date.now();

    return new Promise<T>((resolve, reject) => {
      // Check if resource is immediately available
      if (this.available.length > 0) {
        const resource = this.available.shift()!;
        this.borrowed.add(resource);
        resource.lastUsed = new Date();
        resource.usageCount++;
        
        const acquireTime = Date.now() - startTime;
        this.acquireTimes.push(acquireTime);
        if (this.acquireTimes.length > 100) {
          this.acquireTimes = this.acquireTimes.slice(-50);
        }
        this.stats.averageAcquireTime = this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length;
        
        this.updateStats();
        this.emit('resource:acquired', resource);
        resolve(resource);
        return;
      }

      // Try to create new resource if below max size
      if (this.stats.size < this.config.maxSize) {
        this.createResource()
          .then(() => {
            // Resource was created and should be processed by processPendingRequests
          })
          .catch(error => {
            this.emit('error', error);
          });
      }

      // Queue the request
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.resolve === resolve);
        if (index !== -1) {
          this.pending.splice(index, 1);
          this.updateStats();
          reject(new Error('Resource acquisition timeout'));
        }
      }, this.config.acquireTimeoutMs);

      this.pending.push({ resolve, reject, timeout });
      this.updateStats();
      
      this.emit('resource:queued', { waitingCount: this.pending.length });
    });
  }

  async release(resource: T): Promise<void> {
    if (!this.borrowed.has(resource)) {
      throw new Error('Resource was not borrowed from this pool');
    }

    this.borrowed.delete(resource);
    resource.lastUsed = new Date();

    // Reset resource if factory supports it
    if (this.config.factory.reset) {
      try {
        await this.config.factory.reset(resource);
      } catch (error) {
        resource.isHealthy = false;
        this.emit('reset:error', { resource, error });
      }
    }

    // Validate resource health
    if (this.config.validator && resource.isHealthy) {
      try {
        resource.isHealthy = await this.config.validator(resource);
      } catch (error) {
        resource.isHealthy = false;
        this.emit('validation:error', { resource, error });
      }
    }

    // Return to pool or destroy if unhealthy
    if (resource.isHealthy && resource.usageCount <= this.config.maxUsageCount) {
      this.available.push(resource);
      this.processPendingRequests();
    } else {
      await this.destroyResource(resource);
    }

    this.updateStats();
    this.emit('resource:released', resource);
  }

  async use<R>(operation: (resource: T) => Promise<R>): Promise<R> {
    const resource = await this.acquire();
    try {
      return await operation(resource);
    } finally {
      await this.release(resource);
    }
  }

  getStats(): PoolStats {
    return { ...this.stats };
  }

  async drain(): Promise<void> {
    // Reject all pending requests
    for (const request of this.pending) {
      clearTimeout(request.timeout);
      request.reject(new Error('Pool is draining'));
    }
    this.pending = [];

    // Wait for all borrowed resources to be returned
    return new Promise<void>((resolve) => {
      const checkBorrowed = () => {
        if (this.borrowed.size === 0) {
          resolve();
        } else {
          setTimeout(checkBorrowed, 100);
        }
      };
      checkBorrowed();
    });
  }

  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    await this.drain();

    // Destroy all available resources
    const destroyPromises = this.available.map(resource => this.destroyResource(resource));
    await Promise.allSettled(destroyPromises);

    this.available = [];
    this.updateStats();
    this.emit('pool:destroyed');
  }

  // Health monitoring methods
  isHealthy(): boolean {
    const stats = this.getStats();
    return stats.errors < stats.created * 0.1 && // Less than 10% error rate
           stats.available > 0 && // Has available resources
           stats.waitingCount < this.config.maxSize; // Not overloaded
  }

  getHealthScore(): number {
    const stats = this.getStats();
    const errorRate = stats.created > 0 ? stats.errors / stats.created : 0;
    const utilization = stats.size > 0 ? stats.borrowed / stats.size : 0;
    const waitingPressure = stats.waitingCount / this.config.maxSize;

    // Calculate health score (0-100)
    let score = 100;
    score -= errorRate * 50; // Reduce by error rate
    score -= Math.max(0, utilization - 0.8) * 100; // Penalize high utilization
    score -= Math.min(waitingPressure * 50, 30); // Penalize waiting requests

    return Math.max(0, Math.min(100, score));
  }
}

// Example: HTTP Client Pool
export interface PooledHttpClient extends PooledResource {
  client: any; // Your HTTP client instance
  maxConcurrentRequests: number;
  activeRequests: number;
}

export class HttpClientFactory implements ResourceFactory<PooledHttpClient> {
  private clientConfig: any;

  constructor(clientConfig: any) {
    this.clientConfig = clientConfig;
  }

  async create(): Promise<PooledHttpClient> {
    // Replace with your actual HTTP client creation
    const client = {}; // new HttpClient(this.clientConfig);
    
    return {
      id: `http_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      isHealthy: true,
      client,
      maxConcurrentRequests: 10,
      activeRequests: 0,
    };
  }

  async destroy(resource: PooledHttpClient): Promise<void> {
    // Cleanup HTTP client
    if (resource.client?.destroy) {
      await resource.client.destroy();
    }
  }

  async validate(resource: PooledHttpClient): Promise<boolean> {
    try {
      // Perform health check on HTTP client
      // Example: Make a lightweight request
      return resource.isHealthy && resource.activeRequests < resource.maxConcurrentRequests;
    } catch {
      return false;
    }
  }

  async reset(resource: PooledHttpClient): Promise<void> {
    // Reset client state if needed
    resource.activeRequests = 0;
  }
}

// Utility function to create resource pools
export function createResourcePool<T extends PooledResource>(
  config: ResourcePoolConfig<T>
): ResourcePool<T> {
  return new ResourcePool(config);
}