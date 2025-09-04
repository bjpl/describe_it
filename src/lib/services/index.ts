/**
 * Services Index - Central registry for all services
 * Provides unified access to all application services
 */

// Import all services
export { openaiService, OpenAIService } from './openaiService';
export { translationService, TranslationService } from './translationService';
export { vocabularyService } from './vocabularyService'; // Original service
export { enhancedVocabularyService, EnhancedVocabularyService } from './enhancedVocabularyService';
export { qaService, QAService } from './qaService';
export { progressService, ProgressService } from './progressService';
export { exportService, ExportService } from './exportService';

// Service health check interface
interface ServiceHealth {
  name: string;
  healthy: boolean;
  lastCheck: string;
  error?: string;
  responseTime?: number;
}

// Service registry for managing all services
export class ServiceRegistry {
  private services: Map<string, any> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();

  constructor() {
    this.registerServices();
  }

  private registerServices(): void {
    // Register all services
    this.services.set('openai', openaiService);
    this.services.set('translation', translationService);
    this.services.set('vocabulary', vocabularyService);
    this.services.set('enhancedVocabulary', enhancedVocabularyService);
    this.services.set('qa', qaService);
    this.services.set('progress', progressService);
    this.services.set('export', exportService);
  }

  /**
   * Get a service by name
   */
  public getService<T = any>(name: string): T | null {
    return this.services.get(name) || null;
  }

  /**
   * Check if a service is registered
   */
  public hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Perform health checks on all services
   */
  public async performHealthChecks(): Promise<ServiceHealth[]> {
    const healthChecks = [];
    const timestamp = new Date().toISOString();

    for (const [name, service] of this.services.entries()) {
      const startTime = Date.now();
      let health: ServiceHealth = {
        name,
        healthy: false,
        lastCheck: timestamp,
      };

      try {
        // Check if service has a health check method
        if (typeof service.healthCheck === 'function') {
          const result = await service.healthCheck();
          health.healthy = result.healthy || result === true;
          health.error = result.error;
        } else {
          // Fallback: check if service is available
          health.healthy = service !== null && service !== undefined;
        }
        
        health.responseTime = Date.now() - startTime;
      } catch (error) {
        health.healthy = false;
        health.error = error instanceof Error ? error.message : 'Health check failed';
        health.responseTime = Date.now() - startTime;
      }

      this.healthStatus.set(name, health);
      healthChecks.push(health);
    }

    return healthChecks;
  }

  /**
   * Get health status for a specific service
   */
  public getServiceHealth(name: string): ServiceHealth | null {
    return this.healthStatus.get(name) || null;
  }

  /**
   * Get overall system health
   */
  public getSystemHealth(): {
    healthy: boolean;
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    services: ServiceHealth[];
  } {
    const services = Array.from(this.healthStatus.values());
    const healthyServices = services.filter(s => s.healthy).length;
    
    return {
      healthy: healthyServices === services.length,
      totalServices: services.length,
      healthyServices,
      unhealthyServices: services.length - healthyServices,
      services,
    };
  }

  /**
   * Initialize all services (call any initialization methods)
   */
  public async initializeServices(): Promise<void> {
    const initPromises = [];

    for (const [name, service] of this.services.entries()) {
      if (typeof service.initialize === 'function') {
        console.log(`Initializing service: ${name}`);
        initPromises.push(
          service.initialize().catch((error: Error) => {
            console.warn(`Failed to initialize service ${name}:`, error.message);
          })
        );
      }
    }

    await Promise.all(initPromises);
  }

  /**
   * Cleanup all services
   */
  public async cleanup(): Promise<void> {
    const cleanupPromises = [];

    for (const [name, service] of this.services.entries()) {
      if (typeof service.cleanup === 'function') {
        console.log(`Cleaning up service: ${name}`);
        cleanupPromises.push(
          service.cleanup().catch((error: Error) => {
            console.warn(`Failed to cleanup service ${name}:`, error.message);
          })
        );
      }

      // Clear caches if available
      if (typeof service.clearCache === 'function') {
        try {
          service.clearCache();
        } catch (error) {
          console.warn(`Failed to clear cache for service ${name}:`, error);
        }
      }
    }

    await Promise.all(cleanupPromises);
  }

  /**
   * Get service statistics
   */
  public async getServiceStatistics(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [name, service] of this.services.entries()) {
      try {
        if (typeof service.getStats === 'function') {
          stats[name] = await service.getStats();
        } else if (typeof service.getCacheStats === 'function') {
          stats[name] = service.getCacheStats();
        } else {
          stats[name] = { available: true };
        }
      } catch (error) {
        stats[name] = { 
          error: error instanceof Error ? error.message : 'Failed to get stats',
          available: false 
        };
      }
    }

    return stats;
  }
}

// Create and export singleton registry
export const serviceRegistry = new ServiceRegistry();

// Convenience exports for commonly used services
export {
  openaiService as openai,
  translationService as translation,
  vocabularyService as vocabulary,
  enhancedVocabularyService as enhancedVocabulary,
  qaService as qa,
  progressService as progress,
  exportService as export,
};

// Default export
export default serviceRegistry;

// Types for external use
export type { ServiceHealth };

// Service configuration types
export interface ServiceConfig {
  retryAttempts?: number;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

// Common service interface
export interface BaseService {
  healthCheck?(): Promise<{ healthy: boolean; error?: string }> | boolean;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  clearCache?(): void;
  getStats?(): Promise<any> | any;
  getCacheStats?(): any;
}

/**
 * Service factory for creating configured services
 */
export class ServiceFactory {
  /**
   * Create a configured OpenAI service
   */
  static createOpenAIService(config?: ServiceConfig): OpenAIService {
    return new OpenAIService();
  }

  /**
   * Create a configured translation service
   */
  static createTranslationService(config?: ServiceConfig): TranslationService {
    return new TranslationService();
  }

  /**
   * Create a configured enhanced vocabulary service
   */
  static createEnhancedVocabularyService(config?: ServiceConfig): EnhancedVocabularyService {
    return new EnhancedVocabularyService();
  }

  /**
   * Create a configured Q&A service
   */
  static createQAService(config?: ServiceConfig): QAService {
    return new QAService();
  }

  /**
   * Create a configured progress service
   */
  static createProgressService(config?: ServiceConfig): ProgressService {
    return new ProgressService();
  }

  /**
   * Create a configured export service
   */
  static createExportService(config?: ServiceConfig): ExportService {
    return new ExportService();
  }
}

/**
 * Utility functions for service management
 */
export const ServiceUtils = {
  /**
   * Wait for all services to be healthy
   */
  async waitForHealthyServices(registry: ServiceRegistry, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const health = await registry.performHealthChecks();
      const allHealthy = health.every(s => s.healthy);
      
      if (allHealthy) {
        return true;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  },

  /**
   * Get services by category/type
   */
  getServicesByType(registry: ServiceRegistry, type: 'ai' | 'storage' | 'analysis' | 'export'): string[] {
    const typeMap = {
      ai: ['openai', 'translation'],
      storage: ['vocabulary', 'enhancedVocabulary', 'progress'],
      analysis: ['qa'],
      export: ['export'],
    };
    
    return typeMap[type] || [];
  },

  /**
   * Create service health report
   */
  createHealthReport(registry: ServiceRegistry): string {
    const systemHealth = registry.getSystemHealth();
    let report = `\n=== Service Health Report ===\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Overall Status: ${systemHealth.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n`;
    report += `Services: ${systemHealth.healthyServices}/${systemHealth.totalServices} healthy\n\n`;
    
    systemHealth.services.forEach(service => {
      const status = service.healthy ? '✅' : '❌';
      const responseTime = service.responseTime ? ` (${service.responseTime}ms)` : '';
      const error = service.error ? ` - ${service.error}` : '';
      
      report += `${status} ${service.name}${responseTime}${error}\n`;
    });
    
    return report;
  },
};