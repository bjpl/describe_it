// Performance Optimization Library
// Central exports for all performance-related modules

// Connection pooling
export {
  OpenAIConnectionPool,
  poolManager,
  getPooledOpenAIClient,
  type PooledClient,
  type ConnectionPoolConfig,
} from './connection-pool';

// Request batching
export {
  BatchProcessor,
  VisionDescriptionBatchProcessor,
  createVisionBatchProcessor,
  type BatchRequest,
  type BatchProcessorConfig,
  type VisionDescriptionRequest,
  type VisionDescriptionResponse,
  type BatchMetrics,
} from './batch-processor';

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitBreakerRegistry,
  createCircuitBreaker,
  withCircuitBreaker,
  CircuitBreakerState,
  type CircuitBreakerConfig,
  type CircuitBreakerMetrics,
} from './circuit-breaker';

// Resource pooling
export {
  ResourcePool,
  createResourcePool,
  HttpClientFactory,
  type PooledResource,
  type ResourcePoolConfig,
  type ResourceFactory,
  type PoolStats,
} from './resource-pool';

// Performance monitoring
export {
  PerformanceMonitor,
  getPerformanceMonitor,
  createPerformanceMiddleware,
  timed,
  type PerformanceMetric,
  type TimerMetric,
  type HistogramData,
  type PerformanceReport,
} from './performance-monitor';

// Cache exports
export {
  RedisCache,
  getCache,
  CacheWarmer,
  createCacheWarmer,
  type CacheConfig,
  type CacheEntry,
  type CacheStats,
} from '../cache/redis-cache';

// Performance utilities and helpers
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  private constructor() {}
  
  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Initialize all performance optimizations
  public async initialize(config: {
    redis?: any;
    openai?: any;
    monitoring?: boolean;
  } = {}): Promise<void> {
    try {
      // Initialize monitoring
      if (config.monitoring !== false) {
        const monitor = getPerformanceMonitor({
          enableSystemMetrics: true,
          reportingIntervalMs: 60000,
        });
        console.log('Performance monitoring initialized');
      }

      // Initialize cache if Redis config provided
      if (config.redis) {
        const cache = getCache(config.redis);
        console.log('Redis cache initialized');
      }

      // Initialize connection pools if OpenAI config provided
      if (config.openai?.apiKey) {
        const pool = poolManager.getPool(config.openai.apiKey, config.openai.baseURL);
        await pool.warmUp();
        console.log('OpenAI connection pool initialized');
      }

      console.log('All performance optimizations initialized successfully');
    } catch (error) {
      console.error('Failed to initialize performance optimizations:', error);
      throw error;
    }
  }

  // Health check for all performance components
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
  }> {
    const components: Record<string, any> = {};
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check performance monitor
      const monitor = getPerformanceMonitor();
      components.monitor = monitor.getHealthStatus();
      
      if (components.monitor.status !== 'healthy') {
        overallHealth = 'degraded';
      }
    } catch (error) {
      components.monitor = { status: 'unhealthy', error: error.message };
      overallHealth = 'unhealthy';
    }

    try {
      // Check connection pools
      components.pools = poolManager.getStats();
      
      // Check if any pools are unhealthy
      for (const [poolName, stats] of Object.entries(components.pools)) {
        if (stats.available === 0 && stats.borrowed === 0) {
          overallHealth = 'degraded';
        }
      }
    } catch (error) {
      components.pools = { status: 'unhealthy', error: error.message };
      overallHealth = 'unhealthy';
    }

    try {
      // Check circuit breakers
      components.circuits = circuitBreakerRegistry.getHealthStatus();
      
      if (components.circuits.unhealthy.length > 0) {
        overallHealth = 'degraded';
      }
    } catch (error) {
      components.circuits = { status: 'unhealthy', error: error.message };
      overallHealth = 'unhealthy';
    }

    try {
      // Check cache if available
      const cache = getCache();
      components.cache = await cache.getStats();
      
      if (components.cache.hitRate < 0.5) { // Less than 50% hit rate
        overallHealth = 'degraded';
      }
    } catch (error) {
      components.cache = { status: 'unavailable', error: error.message };
      // Cache is optional, don't fail overall health
    }

    return {
      status: overallHealth,
      components,
    };
  }

  // Get comprehensive performance metrics
  public async getMetrics(): Promise<{
    timestamp: Date;
    performance: any;
    pools: any;
    circuits: any;
    cache?: any;
  }> {
    const monitor = getPerformanceMonitor();
    
    return {
      timestamp: new Date(),
      performance: monitor.generateReport(),
      pools: poolManager.getStats(),
      circuits: circuitBreakerRegistry.getMetrics(),
      cache: await getCache().getStats().catch(() => null),
    };
  }

  // Cleanup all resources
  public async cleanup(): Promise<void> {
    try {
      // Cleanup pools
      await poolManager.destroyAll();
      
      // Cleanup cache
      const cache = getCache();
      await cache.disconnect();
      
      // Cleanup monitor
      const monitor = getPerformanceMonitor();
      monitor.destroy();
      
      console.log('Performance optimizations cleaned up successfully');
    } catch (error) {
      console.error('Error during performance cleanup:', error);
    }
  }
}

// Convenience function to get the global optimizer instance
export function getPerformanceOptimizer(): PerformanceOptimizer {
  return PerformanceOptimizer.getInstance();
}

// Performance configuration defaults
export const PERFORMANCE_DEFAULTS = {
  connectionPool: {
    min: 2,
    max: 10,
    acquireTimeoutMs: 30000,
    idleTimeoutMs: 300000,
  },
  batchProcessor: {
    batchSize: 5,
    maxBatchWaitMs: 200,
    maxConcurrentBatches: 2,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    errorThresholdPercentage: 50,
  },
  cache: {
    defaultTTL: 3600,
    maxRetries: 3,
    keyPrefix: 'describe_it:',
  },
  monitoring: {
    reportingIntervalMs: 60000,
    maxMetricsHistory: 1000,
    enableSystemMetrics: true,
  },
};

// Performance decorators and utilities
export function withPerformanceTracking(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const timerId = monitor.startTimer(name);
      
      try {
        const result = await originalMethod.apply(this, args);
        monitor.endTimer(timerId);
        monitor.incrementCounter(`${name}.success`);
        return result;
      } catch (error) {
        monitor.endTimer(timerId);
        monitor.incrementCounter(`${name}.error`);
        throw error;
      }
    };

    return descriptor;
  };
}

// Utility to wrap any function with caching
export function withCaching<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator: (...args: Parameters<T>) => string;
    ttl?: number;
    tags?: string[];
  }
): T {
  return (async (...args: Parameters<T>) => {
    const cache = getCache();
    const key = options.keyGenerator(...args);
    
    // Try cache first
    const cached = await cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    await cache.set(key, result, options.ttl, options.tags);
    
    return result;
  }) as T;
}

// Utility to wrap any function with circuit breaker
export function withResilience<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  config?: Partial<CircuitBreakerConfig>
): T {
  const breaker = circuitBreakerRegistry.register(name, fn, config);
  return ((...args: Parameters<T>) => breaker.execute(...args)) as T;
}