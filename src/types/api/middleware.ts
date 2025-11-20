/**
 * API middleware types
 */

import type { UserData, SessionData } from '../database/models';
import type { FeatureFlags } from '../core/utility-types';
import type { ApiRequest, ApiResponse, RateLimitInfo } from './';

/**
 * Middleware types
 */
export interface MiddlewareContext {
  request: ApiRequest;
  response?: Partial<ApiResponse>;
  user?: UserData;
  session?: SessionData;
  metadata: MiddlewareMetadata;
}

export interface MiddlewareMetadata {
  execution_time: number;
  middleware_chain: string[];
  security_checks: SecurityCheck[];
  rate_limit_status: RateLimitInfo;
  feature_flags: FeatureFlags;
}

export interface SecurityCheck {
  type: 'authentication' | 'authorization' | 'input_validation' | 'rate_limiting' | 'csrf' | 'xss';
  passed: boolean;
  details?: string;
  timestamp: string;
}

export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;
