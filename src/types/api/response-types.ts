/**
 * API response types
 */

import type { JsonValue, UnknownObject } from '../core/json-types';
import type { PaginationMeta } from '../database/operations';

/**
 * Generic API response types
 */
export interface ApiResponse<T = UnknownObject> {
  success: boolean;
  data: T | null;
  error: string | null;
  message?: string;
  metadata: ResponseMetadata;
  pagination?: PaginationMeta;
  warnings?: string[];
}

export interface ResponseMetadata {
  request_id: string;
  response_time: number;
  timestamp: string;
  version: string;
  server_id?: string;
  rate_limit?: RateLimitInfo;
  cache_info?: CacheInfo;
  deprecation_warning?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_time: string;
  retry_after?: number;
}

export interface CacheInfo {
  hit: boolean;
  ttl: number;
  age: number;
  key: string;
  tags: string[];
}

/**
 * Response data types
 */
export interface ResponseData {
  [key: string]: JsonValue;
}

export interface ListResponseData<T> {
  items: T[];
  total: number;
  has_more: boolean;
  [key: string]: JsonValue | T[];
}

export interface CreateResponseData extends ResponseData {
  id: string;
  created_at: string;
}

export interface UpdateResponseData extends ResponseData {
  id: string;
  updated_at: string;
  changes_applied: string[];
}

export interface DeleteResponseData extends ResponseData {
  id: string;
  deleted_at: string;
  soft_delete: boolean;
}

/**
 * API Error types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetails;
  timestamp: string;
  request_id: string;
  path: string;
  method: string;
  status_code: number;
  retry_after?: number;
  error_id?: string;
}

export interface ErrorDetails {
  field_errors?: FieldError[];
  validation_errors?: ValidationError[];
  system_info?: SystemErrorInfo;
  user_message?: string;
  developer_message?: string;
  help_url?: string;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
  value?: JsonValue;
  constraint?: string;
}

export interface ValidationError {
  rule: string;
  message: string;
  path: string;
  value?: JsonValue;
  expected?: JsonValue;
}

export interface SystemErrorInfo {
  service: string;
  component: string;
  error_type: string;
  correlation_id: string;
  trace_id?: string;
  upstream_errors?: string[];
}
