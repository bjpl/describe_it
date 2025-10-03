/**
 * Rate Limiting Utilities
 * 
 * Utility functions for testing, monitoring, and managing rate limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, RateLimitConfigs } from './rate-limiter';
import { checkRateLimitStatus } from './middleware';
import { logger } from '@/lib/logger';

/**
 * Rate limit testing utilities
 */
export class RateLimitTester {
  private rateLimiter = getRateLimiter();

  /**
   * Simulate multiple requests to test rate limiting
   */
  async simulateRequests(
    identifier: string,
    count: number,
    configName: keyof typeof RateLimitConfigs = 'general',
    delayMs: number = 100
  ): Promise<{
    successful: number;
    rateLimited: number;
    results: Array<{ success: boolean; remaining: number; timestamp: Date }>;
  }> {
    const config = RateLimitConfigs[configName];
    const results = [];
    let successful = 0;
    let rateLimited = 0;

    for (let i = 0; i < count; i++) {
      try {
        // Create mock request
        const mockRequest = this.createMockRequest(identifier);
        const result = await this.rateLimiter.checkRateLimit(mockRequest, config);

        results.push({
          success: result.success,
          remaining: result.remaining,
          timestamp: new Date(),
        });

        if (result.success) {
          successful++;
        } else {
          rateLimited++;
        }

        // Add delay between requests
        if (delayMs > 0 && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        logger.error('Error in simulateRequests:', error);
        results.push({
          success: false,
          remaining: 0,
          timestamp: new Date(),
        });
        rateLimited++;
      }
    }

    return { successful, rateLimited, results };
  }

  /**
   * Test exponential backoff behavior
   */
  async testExponentialBackoff(
    identifier: string,
    violationCount: number = 3
  ): Promise<{
    baseWindowMs: number;
    backoffWindows: number[];
    resetSuccessful: boolean;
  }> {
    const { ExponentialBackoff } = await import('./rate-limiter');
    const baseWindowMs = RateLimitConfigs.auth.windowMs;
    const backoffWindows = [];

    // Simulate violations
    for (let i = 0; i < violationCount; i++) {
      const backoff = ExponentialBackoff.calculateBackoff(identifier, baseWindowMs);
      backoffWindows.push(backoff);
      
      // Simulate time passing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Test reset
    ExponentialBackoff.resetViolations(identifier);
    const resetBackoff = ExponentialBackoff.calculateBackoff(identifier, baseWindowMs);
    const resetSuccessful = resetBackoff === baseWindowMs;

    return {
      baseWindowMs,
      backoffWindows,
      resetSuccessful,
    };
  }

  /**
   * Create a mock NextRequest for testing
   */
  private createMockRequest(identifier: string): NextRequest {
    const [userId, ip] = identifier.split(':');
    
    const mockHeaders = new Headers();
    mockHeaders.set('x-user-id', userId || 'test-user');
    mockHeaders.set('x-forwarded-for', ip || '192.168.1.1');
    mockHeaders.set('user-agent', 'Test/1.0');

    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: mockHeaders,
    });
  }

  /**
   * Benchmark rate limiter performance
   */
  async benchmarkPerformance(
    requestCount: number = 1000,
    concurrency: number = 10
  ): Promise<{
    totalTime: number;
    averageTime: number;
    requestsPerSecond: number;
    successRate: number;
  }> {
    const startTime = Date.now();
    const promises = [];
    let successfulRequests = 0;

    // Create concurrent request batches
    for (let batch = 0; batch < Math.ceil(requestCount / concurrency); batch++) {
      const batchPromises = [];
      
      for (let i = 0; i < concurrency && (batch * concurrency + i) < requestCount; i++) {
        const identifier = `bench-user-${batch}-${i}:192.168.1.${(batch % 254) + 1}`;
        const mockRequest = this.createMockRequest(identifier);
        
        batchPromises.push(
          this.rateLimiter.checkRateLimit(mockRequest, RateLimitConfigs.general)
            .then(result => {
              if (result.success) successfulRequests++;
              return result;
            })
            .catch(error => {
              logger.warn('Benchmark request failed:', error);
              return { success: false };
            })
        );
      }
      
      promises.push(Promise.all(batchPromises));
      
      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / requestCount;
    const requestsPerSecond = Math.round((requestCount / totalTime) * 1000);
    const successRate = successfulRequests / requestCount;

    return {
      totalTime,
      averageTime,
      requestsPerSecond,
      successRate,
    };
  }
}

/**
 * Rate limit monitoring utilities
 */
export class RateLimitMonitor {
  private rateLimiter = getRateLimiter();

  /**
   * Get comprehensive rate limit statistics
   */
  async getComprehensiveStats(): Promise<{
    system: {
      redisAvailable: boolean;
      memoryEntries: number;
      uptime: number;
    };
    configs: Record<string, {
      windowMs: number;
      maxRequests: number;
      description: string;
    }>;
    performance: {
      lastBenchmark?: any;
    };
  }> {
    const systemStats = await this.rateLimiter.getStats();
    
    const configDescriptions = {
      auth: 'Authentication endpoints - prevents brute force attacks',
      descriptionFree: 'Description generation for free tier users',
      descriptionPaid: 'Description generation for paid tier users',
      general: 'General API endpoints',
      strict: 'Sensitive operations with enhanced protection',
      burst: 'Burst protection for high-frequency requests',
    };

    const configs = Object.entries(RateLimitConfigs).reduce((acc, [key, config]) => {
      acc[key] = {
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        description: configDescriptions[key as keyof typeof configDescriptions] || 'Custom configuration',
      };
      return acc;
    }, {} as any);

    return {
      system: systemStats,
      configs,
      performance: {
        lastBenchmark: null, // Could store last benchmark results
      },
    };
  }

  /**
   * Monitor rate limit violations in real-time
   */
  async startViolationMonitoring(
    callback: (violation: {
      identifier: string;
      endpoint: string;
      timestamp: Date;
      limit: number;
      attempts: number;
    }) => void
  ): Promise<() => void> {
    // This would typically integrate with your logging system
    // For now, we'll create a simple monitoring setup
    
    const violations = new Set<string>();
    
    const checkInterval = setInterval(async () => {
      try {
        // Monitor for patterns that indicate violations
        // This is a simplified implementation
        const stats = await this.getComprehensiveStats();
        
        // In a real implementation, you'd integrate with your logging system
        // to detect and report violations
        
      } catch (error) {
        logger.error('Rate limit monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds

    // Return cleanup function
    return () => {
      clearInterval(checkInterval);
    };
  }

  /**
   * Generate rate limit health report
   */
  async generateHealthReport(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    statistics: any;
  }> {
    const stats = await this.getComprehensiveStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check Redis availability
    if (!stats.system.redisAvailable) {
      issues.push('Redis is not available - using memory fallback');
      recommendations.push('Ensure Redis is running and accessible for distributed rate limiting');
    }

    // Check memory usage
    if (stats.system.memoryEntries > 10000) {
      issues.push(`High memory usage: ${stats.system.memoryEntries} entries`);
      recommendations.push('Consider Redis for better memory management');
    }

    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 2) {
      overall = 'critical';
    } else if (issues.length > 0) {
      overall = 'warning';
    }

    return {
      overall,
      issues,
      recommendations,
      statistics: stats,
    };
  }
}

/**
 * Rate limit administration utilities
 */
export class RateLimitAdmin {
  private rateLimiter = getRateLimiter();

  /**
   * Reset rate limits for a specific identifier
   */
  async resetUserRateLimit(
    userId: string,
    ip: string = 'all',
    configName: keyof typeof RateLimitConfigs = 'general'
  ): Promise<boolean> {
    const identifier = ip === 'all' ? userId : `${userId}:${ip}`;
    const mockRequest = new NextRequest('http://localhost:3000/api/admin/reset', {
      method: 'POST',
      headers: new Headers({
        'x-user-id': userId,
        'x-forwarded-for': ip === 'all' ? '0.0.0.0' : ip,
      }),
    });

    const config = RateLimitConfigs[configName];
    return await this.rateLimiter.resetRateLimit(mockRequest, config);
  }

  /**
   * Temporarily whitelist an IP address or user
   */
  async createTemporaryWhitelist(
    identifier: string,
    durationMinutes: number = 60
  ): Promise<{
    success: boolean;
    expiresAt: Date;
    whitelistId: string;
  }> {
    // This would typically integrate with your admin system
    // For now, we'll simulate the functionality
    
    const whitelistId = `whitelist_${Date.now()}_${Math.random()}`;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    // In a real implementation, you'd store this in your admin database
    logger.info(`[Admin] Created temporary whitelist for ${identifier} until ${expiresAt}`);
    
    return {
      success: true,
      expiresAt,
      whitelistId,
    };
  }

  /**
   * Get rate limit violations report
   */
  async getViolationsReport(
    timeRangeHours: number = 24
  ): Promise<{
    totalViolations: number;
    uniqueIdentifiers: number;
    topViolators: Array<{
      identifier: string;
      violations: number;
      lastViolation: Date;
    }>;
    violationsByEndpoint: Record<string, number>;
  }> {
    // This would typically query your logging/audit system
    // For now, we'll return a mock report structure
    
    return {
      totalViolations: 0,
      uniqueIdentifiers: 0,
      topViolators: [],
      violationsByEndpoint: {},
    };
  }
}

/**
 * Export singleton instances
 */
export const rateLimitTester = new RateLimitTester();
export const rateLimitMonitor = new RateLimitMonitor();
export const rateLimitAdmin = new RateLimitAdmin();

/**
 * Utility functions for Next.js API routes
 */
export const RateLimitUtils = {
  /**
   * Create a simple rate limit status endpoint
   */
  createStatusEndpoint: () => async (request: NextRequest) => {
    const stats = await rateLimitMonitor.getComprehensiveStats();
    const health = await rateLimitMonitor.generateHealthReport();
    
    return NextResponse.json({
      success: true,
      data: {
        status: health.overall,
        statistics: stats,
        health: health,
        timestamp: new Date().toISOString(),
      },
    });
  },

  /**
   * Create a rate limit testing endpoint (development only)
   */
  createTestEndpoint: () => async (request: NextRequest) => {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Test endpoint only available in development' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const count = parseInt(url.searchParams.get('count') || '10');
    const configName = url.searchParams.get('config') || 'general';
    
    const results = await rateLimitTester.simulateRequests(
      'test-user:192.168.1.1',
      count,
      configName as keyof typeof RateLimitConfigs
    );

    return NextResponse.json({
      success: true,
      data: results,
    });
  },

  /**
   * Create an admin endpoint for rate limit management
   */
  createAdminEndpoint: () => async (request: NextRequest) => {
    // Check admin authorization
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { method } = request;
    const url = new URL(request.url);
    
    switch (method) {
      case 'GET':
        // Get violations report
        const report = await rateLimitAdmin.getViolationsReport();
        return NextResponse.json({ success: true, data: report });
      
      case 'POST':
        // Reset user rate limit
        const { userId, ip } = await request.json();
        const resetResult = await rateLimitAdmin.resetUserRateLimit(userId, ip);
        return NextResponse.json({ success: resetResult });
      
      case 'PUT':
        // Create temporary whitelist
        const { identifier, durationMinutes } = await request.json();
        const whitelistResult = await rateLimitAdmin.createTemporaryWhitelist(
          identifier,
          durationMinutes
        );
        return NextResponse.json({ success: true, data: whitelistResult });
      
      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
    }
  },
} as const;