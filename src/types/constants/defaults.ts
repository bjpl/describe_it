/**
 * Default values for common configurations
 */

import type { PaginationMeta } from '../database/operations';
import type { RequestHeaders } from '../api/request-types';
import type { ServiceTimeouts } from '../services/configuration';
import type { RetryStrategy } from '../services/service-types';
import type { RateLimitConfiguration } from '../services/configuration';

export const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 20,
  pages: 0,
  has_more: false,
  offset: 0,
};

export const DEFAULT_REQUEST_HEADERS: Partial<RequestHeaders> = {
  'content-type': 'application/json',
  'accept': 'application/json',
};

export const DEFAULT_SERVICE_TIMEOUTS: ServiceTimeouts = {
  request_timeout: 30000,
  database_timeout: 5000,
  external_api_timeout: 10000,
  cache_timeout: 1000,
  queue_timeout: 15000,
};

export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  max_attempts: 3,
  base_delay: 1000,
  max_delay: 10000,
  backoff_multiplier: 2,
  jitter: true,
};

export const DEFAULT_RATE_LIMIT: RateLimitConfiguration = {
  requests_per_second: 10,
  requests_per_minute: 100,
  requests_per_hour: 1000,
  requests_per_day: 10000,
  burst_capacity: 20,
  window_size: 60000,
};
