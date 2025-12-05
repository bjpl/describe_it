/**
 * API Types
 *
 * Generic API request/response wrappers and common API-related types.
 */

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
  timestamp?: string;
  path?: string;
}

export interface ApiMetadata {
  timestamp: string;
  request_id?: string;
  version?: string;
  duration_ms?: number;
  rate_limit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_at: string;
}

// ============================================================================
// PAGINATED RESPONSE
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  error?: string | null;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_more: boolean;
  has_previous: boolean;
}

export interface PaginationRequest {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// SEARCH & FILTER
// ============================================================================

export interface SearchRequest {
  query: string;
  filters?: Record<string, any>;
  sort?: SortOptions;
  pagination?: PaginationRequest;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between';
  value: any;
}

// ============================================================================
// FILE UPLOAD
// ============================================================================

export interface FileUploadRequest {
  file: File | Blob;
  filename: string;
  content_type?: string;
  folder?: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  id: string;
  url: string;
  public_url?: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchRequest<T> {
  operations: Array<{
    operation: 'create' | 'update' | 'delete';
    data: T;
    id?: string;
  }>;
  options?: {
    continue_on_error?: boolean;
    validate_first?: boolean;
  };
}

export interface BatchResponse<T> {
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: Record<string, ServiceHealthStatus>;
  uptime_seconds?: number;
}

export interface ServiceHealthStatus {
  status: 'up' | 'down' | 'degraded';
  latency_ms?: number;
  error?: string;
  last_check?: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface WebhookPayload<T = any> {
  event: string;
  timestamp: string;
  data: T;
  signature?: string;
  delivery_id?: string;
}

export interface WebhookResponse {
  acknowledged: boolean;
  processed_at?: string;
  error?: string;
}

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

export interface ApiClientConfig {
  base_url: string;
  api_key?: string;
  timeout_ms?: number;
  retry?: {
    max_attempts: number;
    delay_ms: number;
    backoff_factor?: number;
  };
  headers?: Record<string, string>;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  timeout_ms?: number;
  retry?: boolean;
  cache?: boolean;
  cache_ttl_seconds?: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, any>;
    validation_errors?: ValidationError[];
  };
  status: number;
  timestamp: string;
  path: string;
  request_id?: string;
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer';
  expires_in?: number;
  expires_at?: string;
}

export interface AuthRequest {
  email?: string;
  password?: string;
  provider?: 'email' | 'google' | 'github';
  token?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  tokens: AuthTokens;
  session?: {
    id: string;
    expires_at: string;
  };
}
