import { openAIService } from '../services/openaiService';
import { optimizedSupabase } from './optimizedSupabase';
import { vercelKvCache } from './vercel-kv';
import { env, featureFlags } from '../../config/environment';

export interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  error?: string;
  responseTime?: number;
  lastChecked?: string;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  configured: boolean;
  demoMode: boolean;
}

export interface SystemHealth {
  overall: HealthStatus;
  services: ServiceHealth[];
  timestamp: string;
  environment: string;
}

class HealthCheckService {
  private cache = new Map<string, { result: HealthStatus; expires: number }>();
  private cacheTimeout = 30000; // 30 seconds

  /**
   * Check OpenAI API health
   */
  async checkOpenAI(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!featureFlags.openaiService) {
        return {
          healthy: true,
          status: 'healthy',
          responseTime: 0,
          error: 'Running in demo mode'
        };
      }

      const result = await openAIService.healthCheck();
      
      return {
        healthy: result.healthy,
        status: result.healthy ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        error: result.healthy ? undefined : result.error,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check Supabase database health
   */
  async checkSupabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!featureFlags.supabaseService) {
        return {
          healthy: true,
          status: 'healthy',
          responseTime: 0,
          error: 'Using localStorage (demo mode)'
        };
      }

      const connectionStatus = optimizedSupabase.getConnectionStatus();
      
      if (!connectionStatus.isConnected) {
        return {
          healthy: false,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'Database not connected',
          lastChecked: new Date().toISOString()
        };
      }

      // Test a simple query
      const result = await optimizedSupabase.select('user_preferences', 'count', {
        timeout: 5000,
        cacheable: false
      });

      const responseTime = Date.now() - startTime;
      
      return {
        healthy: !result.error,
        status: !result.error ? 'healthy' : 'unhealthy',
        responseTime,
        error: result.error?.message,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check Vercel KV cache health
   */
  async checkVercelKV(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!featureFlags.vercelStorage) {
        return {
          healthy: true,
          status: 'healthy',
          responseTime: 0,
          error: 'Using memory cache (demo mode)'
        };
      }

      const result = await vercelKvCache.healthCheck();
      
      return {
        healthy: result,
        status: result ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        error: result ? undefined : 'Cache health check failed',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Cache connection failed',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Check Unsplash API health
   */
  async checkUnsplash(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!featureFlags.unsplashService) {
        return {
          healthy: true,
          status: 'healthy',
          responseTime: 0,
          error: 'Using demo images'
        };
      }

      const accessKey = env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
      if (!accessKey) {
        return {
          healthy: false,
          status: 'unhealthy',
          responseTime: 0,
          error: 'API key not configured'
        };
      }

      // Simple API test
      const response = await fetch('https://api.unsplash.com/stats/total', {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          healthy: false,
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          lastChecked: new Date().toISOString()
        };
      }

      return {
        healthy: true,
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'API connection failed',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Cached health check for a service
   */
  private async cachedCheck(
    serviceName: string,
    checkFunction: () => Promise<HealthStatus>
  ): Promise<HealthStatus> {
    const cached = this.cache.get(serviceName);
    
    if (cached && Date.now() < cached.expires) {
      return cached.result;
    }

    const result = await checkFunction();
    this.cache.set(serviceName, {
      result,
      expires: Date.now() + this.cacheTimeout
    });

    return result;
  }

  /**
   * Check all services
   */
  async checkAllServices(): Promise<SystemHealth> {
    const startTime = Date.now();

    const checks = await Promise.allSettled([
      this.cachedCheck('openai', () => this.checkOpenAI()),
      this.cachedCheck('supabase', () => this.checkSupabase()),
      this.cachedCheck('vercel-kv', () => this.checkVercelKV()),
      this.cachedCheck('unsplash', () => this.checkUnsplash()),
    ]);

    const services: ServiceHealth[] = [
      {
        name: 'OpenAI API',
        status: checks[0].status === 'fulfilled' ? checks[0].value : {
          healthy: false,
          status: 'unhealthy',
          error: 'Health check failed'
        },
        configured: featureFlags.openaiService,
        demoMode: !featureFlags.openaiService
      },
      {
        name: 'Supabase Database',
        status: checks[1].status === 'fulfilled' ? checks[1].value : {
          healthy: false,
          status: 'unhealthy',
          error: 'Health check failed'
        },
        configured: featureFlags.supabaseService,
        demoMode: !featureFlags.supabaseService
      },
      {
        name: 'Vercel KV Cache',
        status: checks[2].status === 'fulfilled' ? checks[2].value : {
          healthy: false,
          status: 'unhealthy',
          error: 'Health check failed'
        },
        configured: featureFlags.vercelStorage,
        demoMode: !featureFlags.vercelStorage
      },
      {
        name: 'Unsplash API',
        status: checks[3].status === 'fulfilled' ? checks[3].value : {
          healthy: false,
          status: 'unhealthy',
          error: 'Health check failed'
        },
        configured: featureFlags.unsplashService,
        demoMode: !featureFlags.unsplashService
      }
    ];

    // Determine overall health
    const healthyServices = services.filter(s => s.status.healthy);
    const unhealthyServices = services.filter(s => !s.status.healthy && !s.demoMode);

    let overallStatus: HealthStatus['status'];
    let overallHealthy: boolean;

    if (unhealthyServices.length === 0) {
      overallStatus = 'healthy';
      overallHealthy = true;
    } else if (unhealthyServices.length < services.length) {
      overallStatus = 'degraded';
      overallHealthy = false;
    } else {
      overallStatus = 'unhealthy';
      overallHealthy = false;
    }

    return {
      overall: {
        healthy: overallHealthy,
        status: overallStatus,
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      },
      services,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    };
  }

  /**
   * Quick health check (cached results only)
   */
  getQuickStatus(): {
    healthy: boolean;
    demoMode: boolean;
    configuredServices: number;
  } {
    return {
      healthy: true, // App always works in demo mode
      demoMode: featureFlags.demoMode,
      configuredServices: [
        featureFlags.openaiService,
        featureFlags.supabaseService,
        featureFlags.vercelStorage,
        featureFlags.unsplashService
      ].filter(Boolean).length
    };
  }

  /**
   * Clear health check cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const healthCheckService = new HealthCheckService();