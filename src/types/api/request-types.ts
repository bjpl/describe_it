/**
 * API request types
 */

import type { JsonValue, UnknownObject } from '../core/json-types';
import type { FeatureFlags } from '../core/utility-types';

/**
 * Generic API request types
 */
export interface ApiRequest<T = UnknownObject> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers: RequestHeaders;
  query: QueryParameters;
  body: T;
  metadata: RequestMetadata;
}

export interface RequestHeaders {
  'content-type'?: string;
  'authorization'?: string;
  'user-agent'?: string;
  'x-api-key'?: string;
  'x-request-id'?: string;
  'x-correlation-id'?: string;
  'x-forwarded-for'?: string;
  'accept'?: string;
  'accept-language'?: string;
  'cache-control'?: string;
  [key: string]: string | undefined;
}

export type QueryParameters = Record<string, string | string[] | number | boolean | undefined>;

export interface RequestMetadata {
  request_id: string;
  correlation_id?: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  source: 'web' | 'mobile' | 'api' | 'internal';
  version: string;
  feature_flags: FeatureFlags;
}

/**
 * Request body types for common operations
 */
export interface RequestBody {
  [key: string]: JsonValue;
}

export interface CreateRequestBody extends RequestBody {
  id?: string;
}

export interface UpdateRequestBody extends RequestBody {
  id: string;
}

export interface BulkRequestBody {
  operations: BulkOperation[];
  transaction: boolean;
  continue_on_error: boolean;
}

export interface BulkOperation {
  type: 'create' | 'update' | 'delete';
  id?: string;
  data: UnknownObject;
  metadata?: UnknownObject;
}
