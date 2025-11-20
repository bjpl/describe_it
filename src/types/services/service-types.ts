/**
 * Service layer types
 */

import type { UnknownObject } from '../core/json-types';

/**
 * Generic service response types
 */
export interface ServiceResponse<T = UnknownObject> {
  success: boolean;
  data: T | null;
  error: ServiceError | null;
  metadata: ServiceMetadata;
  warnings?: string[];
  debug_info?: DebugInfo;
}

export interface ServiceError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retry_strategy?: RetryStrategy;
  context?: ServiceErrorContext;
}

export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'external_service'
  | 'database'
  | 'network'
  | 'timeout'
  | 'system'
  | 'unknown';

export interface RetryStrategy {
  max_attempts: number;
  base_delay: number;
  max_delay: number;
  backoff_multiplier: number;
  jitter: boolean;
}

export interface ServiceErrorContext {
  operation: string;
  parameters?: UnknownObject;
  upstream_errors?: ServiceError[];
  trace_id?: string;
  user_id?: string;
  session_id?: string;
}

export interface ServiceMetadata {
  service_name: string;
  version: string;
  operation: string;
  execution_time: number;
  timestamp: string;
  trace_id?: string;
  span_id?: string;
  dependencies?: ServiceDependency[];
}

export interface ServiceDependency {
  service: string;
  operation: string;
  status: 'success' | 'error' | 'timeout';
  response_time: number;
  error?: string;
}

export interface DebugInfo {
  query_count?: number;
  cache_hits?: number;
  memory_usage?: number;
  cpu_time?: number;
  warnings?: string[];
  performance_metrics?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  database_time: number;
  external_api_time: number;
  processing_time: number;
  serialization_time: number;
  validation_time: number;
}
