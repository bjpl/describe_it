/**
 * Service configuration types
 */

import type { UnknownObject } from '../core/json-types';
import type { RetryStrategy } from './service-types';
import type { MonitoringConfiguration } from './monitoring';
import type { SecurityConfiguration } from './security';

/**
 * Configuration types
 */
export interface ServiceConfiguration {
  service_name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: ServiceFeatures;
  limits: ServiceLimits;
  timeouts: ServiceTimeouts;
  dependencies: ServiceDependencyConfig[];
  monitoring: MonitoringConfiguration;
  security: SecurityConfiguration;
}

export interface ServiceFeatures {
  [featureName: string]: {
    enabled: boolean;
    config?: UnknownObject;
    rollout_percentage?: number;
    user_segments?: string[];
  };
}

export interface ServiceLimits {
  max_request_size: number;
  max_response_size: number;
  max_concurrent_requests: number;
  rate_limit: RateLimitConfiguration;
  quota_limits: QuotaConfiguration;
}

export interface RateLimitConfiguration {
  requests_per_second: number;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  burst_capacity: number;
  window_size: number;
}

export interface QuotaConfiguration {
  daily_requests: number;
  monthly_requests: number;
  storage_bytes: number;
  bandwidth_bytes: number;
  reset_schedule: string;
}

export interface ServiceTimeouts {
  request_timeout: number;
  database_timeout: number;
  external_api_timeout: number;
  cache_timeout: number;
  queue_timeout: number;
}

export interface ServiceDependencyConfig {
  name: string;
  type: 'database' | 'api' | 'queue' | 'cache' | 'storage';
  endpoint: string;
  authentication: AuthenticationConfig;
  retry_policy: RetryStrategy;
  circuit_breaker: CircuitBreakerConfig;
  health_check: HealthCheckConfig;
}

export interface AuthenticationConfig {
  type: 'none' | 'api_key' | 'bearer_token' | 'oauth2' | 'basic';
  credentials?: UnknownObject;
  token_refresh?: TokenRefreshConfig;
}

export interface TokenRefreshConfig {
  auto_refresh: boolean;
  refresh_threshold: number;
  max_refresh_attempts: number;
}

export interface CircuitBreakerConfig {
  failure_threshold: number;
  timeout_threshold: number;
  half_open_max_calls: number;
  half_open_success_threshold: number;
  reset_timeout: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  endpoint: string;
  interval: number;
  timeout: number;
  healthy_threshold: number;
  unhealthy_threshold: number;
}
