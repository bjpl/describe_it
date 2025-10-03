import { EventEmitter } from 'events';
import { performanceLogger } from '@/lib/logger';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
  expectedResponseTimeMs: number;
  volumeThreshold: number;
  errorThresholdPercentage: number;
  slowCallThresholdMs: number;
  slowCallRateThreshold: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  failureRate: number;
  averageResponseTime: number;
  slowCallRate: number;
  uptime: number;
}

export class CircuitBreaker<T extends any[], R> extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private resetTimer?: NodeJS.Timeout;
  private metrics: number[] = []; // Response times
  private slowCalls = 0;
  private readonly startTime = Date.now();

  constructor(
    private operation: (...args: T) => Promise<R>,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    
    this.config = {
      failureThreshold: 5,
      resetTimeoutMs: 60000, // 1 minute
      monitoringPeriodMs: 10000, // 10 seconds
      expectedResponseTimeMs: 3000, // 3 seconds
      volumeThreshold: 10, // Minimum calls before opening circuit
      errorThresholdPercentage: 50, // 50% error rate
      slowCallThresholdMs: 5000, // 5 seconds is considered slow
      slowCallRateThreshold: 50, // 50% slow call rate
      ...config,
    };

    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    setInterval(() => {
      this.cleanOldMetrics();
      this.evaluateCircuitState();
    }, this.config.monitoringPeriodMs);
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - this.config.monitoringPeriodMs;
    // Keep only recent metrics for accurate windowed calculations
    this.metrics = this.metrics.slice(-100); // Keep last 100 measurements
  }

  private evaluateCircuitState(): void {
    const totalCalls = this.successCount + this.failureCount;
    
    if (totalCalls < this.config.volumeThreshold) {
      return; // Not enough volume to make decisions
    }

    const failureRate = (this.failureCount / totalCalls) * 100;
    const slowCallRate = (this.slowCalls / totalCalls) * 100;

    // Open circuit if failure rate or slow call rate exceeds thresholds
    if (
      this.state === CircuitBreakerState.CLOSED &&
      (failureRate >= this.config.errorThresholdPercentage ||
       slowCallRate >= this.config.slowCallRateThreshold)
    ) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state = CircuitBreakerState.OPEN;
    this.emit('circuit:opened', this.getMetrics());
    
    performanceLogger.warn(`Circuit breaker opened - Failure rate: ${this.getFailureRate()}%`);

    // Set timer to attempt reset
    this.resetTimer = setTimeout(() => {
      this.state = CircuitBreakerState.HALF_OPEN;
      this.emit('circuit:half-opened', this.getMetrics());
      performanceLogger.info('Circuit breaker half-opened - Testing if service recovered');
    }, this.config.resetTimeoutMs);
  }

  private closeCircuit(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.slowCalls = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    this.emit('circuit:closed', this.getMetrics());
    performanceLogger.info('Circuit breaker closed - Service recovered');
  }

  async execute(...args: T): Promise<R> {
    if (this.state === CircuitBreakerState.OPEN) {
      const error = new Error('Circuit breaker is OPEN');
      this.emit('circuit:rejected', error);
      throw error;
    }

    const startTime = Date.now();
    this.totalRequests++;

    try {
      const result = await Promise.race([
        this.operation(...args),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Operation timeout')),
            this.config.expectedResponseTimeMs * 2
          )
        ),
      ]);

      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);

      // If we're in half-open state and the call succeeded, close the circuit
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.closeCircuit();
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(responseTime);

      // If we're in half-open state and the call failed, open the circuit again
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.openCircuit();
      }

      throw error;
    }
  }

  private recordSuccess(responseTime: number): void {
    this.successCount++;
    this.lastSuccessTime = new Date();
    this.metrics.push(responseTime);

    if (responseTime > this.config.slowCallThresholdMs) {
      this.slowCalls++;
    }

    this.emit('operation:success', { responseTime, state: this.state });
  }

  private recordFailure(responseTime: number): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.metrics.push(responseTime);

    this.emit('operation:failure', { responseTime, state: this.state });

    // Open circuit if threshold exceeded
    if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.openCircuit();
    }
  }

  private getFailureRate(): number {
    const total = this.successCount + this.failureCount;
    return total > 0 ? (this.failureCount / total) * 100 : 0;
  }

  private getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    return this.metrics.reduce((sum, time) => sum + time, 0) / this.metrics.length;
  }

  private getSlowCallRate(): number {
    const total = this.successCount + this.failureCount;
    return total > 0 ? (this.slowCalls / total) * 100 : 0;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      failureRate: this.getFailureRate(),
      averageResponseTime: this.getAverageResponseTime(),
      slowCallRate: this.getSlowCallRate(),
      uptime: Date.now() - this.startTime,
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  // Manual controls
  forceOpen(): void {
    this.openCircuit();
  }

  forceClose(): void {
    this.closeCircuit();
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.slowCalls = 0;
    this.totalRequests = 0;
    this.metrics = [];
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    this.state = CircuitBreakerState.CLOSED;
    this.emit('circuit:reset', this.getMetrics());
  }

  destroy(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.removeAllListeners();
  }
}

// Factory function for creating circuit breakers
export function createCircuitBreaker<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker<T, R> {
  return new CircuitBreaker(operation, config);
}

// Circuit breaker registry for managing multiple breakers
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker<any, any>>();

  register<T extends any[], R>(
    name: string,
    operation: (...args: T) => Promise<R>,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker<T, R> {
    const breaker = new CircuitBreaker(operation, config);
    this.breakers.set(name, breaker);
    return breaker;
  }

  get<T extends any[], R>(name: string): CircuitBreaker<T, R> | undefined {
    return this.breakers.get(name);
  }

  getAll(): Map<string, CircuitBreaker<any, any>> {
    return new Map(this.breakers);
  }

  getMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  getHealthStatus(): {
    healthy: string[];
    unhealthy: string[];
    degraded: string[];
  } {
    const healthy: string[] = [];
    const unhealthy: string[] = [];
    const degraded: string[] = [];

    for (const [name, breaker] of this.breakers) {
      const metrics = breaker.getMetrics();
      
      if (breaker.isOpen()) {
        unhealthy.push(name);
      } else if (breaker.isHalfOpen() || metrics.failureRate > 20) {
        degraded.push(name);
      } else {
        healthy.push(name);
      }
    }

    return { healthy, unhealthy, degraded };
  }

  remove(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.destroy();
      return this.breakers.delete(name);
    }
    return false;
  }

  clear(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Utility function to wrap any async function with circuit breaker
export function withCircuitBreaker<T extends any[], R>(
  name: string,
  operation: (...args: T) => Promise<R>,
  config?: Partial<CircuitBreakerConfig>
): (...args: T) => Promise<R> {
  const breaker = circuitBreakerRegistry.register(name, operation, config);
  return (...args: T) => breaker.execute(...args);
}