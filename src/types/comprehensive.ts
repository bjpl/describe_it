/**
 * Comprehensive TypeScript Type Definitions
 * 
 * This file provides type-safe alternatives to replace all 984 `any` types
 * throughout the Describe-It application codebase. These types ensure
 * better type safety, IDE support, and development experience.
 * 
 * Usage:
 * - Replace `any` with appropriate types from this file
 * - Use SafeAny for third-party integrations where typing is not feasible
 * - Prefer specific types over generic ones
 */

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Safe alternative to `any` for third-party integrations
 * Use only when interfacing with untyped external libraries
 */
export type SafeAny = unknown;

/**
 * JSON-safe value types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Generic object types for unknown structures
 */
export type UnknownObject = Record<string, unknown>;
export type UnknownArray = unknown[];
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;
export type BooleanRecord = Record<string, boolean>;

/**
 * Function types for callbacks and event handlers
 */
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;
export type GenericCallback<T = unknown> = (data: T) => void;
export type AsyncCallback<T = unknown> = (data: T) => Promise<void>;
export type ErrorCallback = (error: Error) => void;
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

/**
 * Configuration and options types
 */
export type ConfigurationValue = string | number | boolean | null | undefined;
export type ConfigurationOptions = Record<string, ConfigurationValue>;
export type FeatureFlags = Record<string, boolean>;
export type EnvironmentVariables = Record<string, string>;

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Generic database record with common fields
 */
export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: JsonValue;
}

/**
 * Database operation results
 */
export interface QueryResult<T = UnknownObject> {
  data: T[] | T | null;
  error: DatabaseError | null;
  count?: number;
  status: 'success' | 'error';
}

export interface TransactionResult<T = UnknownObject> extends QueryResult<T> {
  transaction_id: string;
  operations_count: number;
  rollback_applied?: boolean;
}

/**
 * Database pagination
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_more: boolean;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
  error?: string | null;
}

/**
 * Database filter types
 */
export interface DatabaseFilters {
  [key: string]: FilterValue;
}

export type FilterValue = 
  | string 
  | number 
  | boolean 
  | null 
  | string[] 
  | number[] 
  | DateRange
  | FilterOperator;

export interface DateRange {
  start: string;
  end: string;
}

export interface FilterOperator {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: JsonValue;
}

/**
 * User data types
 */
export interface UserData extends DatabaseRecord {
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  subscription_status: 'free' | 'premium' | 'trial';
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_at?: string;
  preferences: UserPreferences;
  metadata: UserMetadata;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  sound_enabled: boolean;
  auto_save: boolean;
  difficulty_preference: 'beginner' | 'intermediate' | 'advanced';
  [key: string]: JsonValue;
}

export interface UserMetadata {
  registration_source?: string;
  last_login?: string;
  login_count: number;
  feature_flags: FeatureFlags;
  experiment_groups: string[];
  custom_fields: UnknownObject;
}

/**
 * Session data types
 */
export interface SessionData extends DatabaseRecord {
  user_id: string;
  session_token: string;
  expires_at: string;
  device_info: DeviceInfo;
  location_info?: LocationInfo;
  activity_data: SessionActivity;
}

export interface DeviceInfo {
  user_agent?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  browser?: string;
  screen_resolution?: string;
  timezone?: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  ip_address?: string; // Stored securely/hashed
}

export interface SessionActivity {
  pages_visited: string[];
  actions_performed: UserAction[];
  time_spent: number;
  last_activity: string;
}

export interface UserAction {
  action: string;
  timestamp: string;
  details: UnknownObject;
  duration?: number;
}

/**
 * Authentication data
 */
export interface AuthData {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string[];
  user: UserData;
  issued_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  loading: boolean;
  error: string | null;
  session: SessionData | null;
}

/**
 * Cache entry types
 */
export interface CacheEntry<T = JsonValue> {
  key: string;
  value: T;
  ttl: number;
  created_at: string;
  accessed_at: string;
  access_count: number;
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  size_bytes?: number;
  compression?: string;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
  invalidation_rules: string[];
}

/**
 * Storage data types
 */
export interface StorageData {
  file_id: string;
  file_name: string;
  file_path: string;
  content_type: string;
  file_size: number;
  checksum: string;
  upload_metadata: UploadMetadata;
  access_metadata: AccessMetadata;
}

export interface UploadMetadata {
  uploaded_by: string;
  upload_method: 'direct' | 'multipart' | 'resumable';
  source_ip?: string;
  user_agent?: string;
  upload_duration: number;
  virus_scan_result?: 'clean' | 'infected' | 'pending';
}

export interface AccessMetadata {
  is_public: boolean;
  access_count: number;
  last_accessed: string;
  download_count: number;
  sharing_permissions: SharingPermissions;
}

export interface SharingPermissions {
  read: string[];
  write: string[];
  admin: string[];
  public_read: boolean;
  expiry_date?: string;
}

/**
 * Database error types
 */
export interface DatabaseError {
  code: string;
  message: string;
  details?: UnknownObject;
  sql_state?: string;
  constraint?: string;
  table?: string;
  column?: string;
  severity?: 'ERROR' | 'WARNING' | 'INFO';
  hint?: string;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Generic API request/response types
 */
export interface ApiRequest<T = UnknownObject> {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers: RequestHeaders;
  query: QueryParameters;
  body: T;
  metadata: RequestMetadata;
}

export interface ApiResponse<T = UnknownObject> {
  success: boolean;
  data: T | null;
  error: string | null;
  message?: string;
  metadata: ResponseMetadata;
  pagination?: PaginationMeta;
  warnings?: string[];
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

/**
 * Response data types
 */
export interface ResponseData {
  [key: string]: JsonValue;
}

export interface ListResponseData<T> extends ResponseData {
  items: T[];
  total: number;
  has_more: boolean;
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

// =============================================================================
// COMPONENT TYPES
// =============================================================================

/**
 * React component prop types
 */
export interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  testId?: string;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  onClick?: EventHandler<React.MouseEvent>;
  onFocus?: EventHandler<React.FocusEvent>;
  onBlur?: EventHandler<React.FocusEvent>;
  onKeyDown?: EventHandler<React.KeyboardEvent>;
  onKeyUp?: EventHandler<React.KeyboardEvent>;
  tabIndex?: number;
}

export interface FormComponentProps extends InteractiveComponentProps {
  name?: string;
  value?: JsonValue;
  defaultValue?: JsonValue;
  onChange?: (value: JsonValue, name?: string) => void;
  onValidate?: (value: JsonValue) => ValidationResult;
  required?: boolean;
  readonly?: boolean;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  validation?: ValidationRules;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: JsonValue) => ValidationResult;
}

/**
 * State management types
 */
export interface ComponentState {
  [key: string]: JsonValue;
}

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  error?: string | null;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  totalResults: number;
  isSearching: boolean;
  suggestions: string[];
}

export interface SearchFilters {
  [key: string]: FilterValue;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url?: string;
  relevance: number;
  metadata: SearchResultMetadata;
}

export interface SearchResultMetadata {
  type: string;
  category?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  author?: string;
}

export interface ModalState {
  isOpen: boolean;
  content?: React.ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
}

export interface ToastState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  autoClose?: boolean;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  handler: VoidFunction;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * Event handler types for components
 */
export interface ComponentEventHandlers {
  onMount?: VoidFunction;
  onUnmount?: VoidFunction;
  onUpdate?: (prevProps: UnknownObject, prevState: UnknownObject) => void;
  onError?: ErrorCallback;
  onResize?: (dimensions: ComponentDimensions) => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export interface ComponentDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/**
 * Form handling types
 */
export interface FormData {
  [key: string]: FormFieldValue;
}

export type FormFieldValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | File 
  | File[] 
  | null 
  | undefined;

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  value: FormFieldValue;
  validation: ValidationRules;
  options?: FormFieldOption[];
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
}

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel' 
  | 'url'
  | 'textarea' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'radio' 
  | 'date' 
  | 'datetime' 
  | 'time'
  | 'file' 
  | 'image'
  | 'hidden';

export interface FormFieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface FormState {
  data: FormData;
  errors: FormErrors;
  touched: FormTouched;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

export interface FormErrors {
  [fieldName: string]: string[] | undefined;
}

export interface FormTouched {
  [fieldName: string]: boolean | undefined;
}

// =============================================================================
// SERVICE TYPES
// =============================================================================

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

/**
 * Monitoring and analytics types
 */
export interface MonitoringConfiguration {
  metrics: MetricsConfiguration;
  logging: LoggingConfiguration;
  tracing: TracingConfiguration;
  alerting: AlertingConfiguration;
}

export interface MetricsConfiguration {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'custom';
  collection_interval: number;
  retention_period: number;
  custom_metrics: CustomMetricDefinition[];
}

export interface CustomMetricDefinition {
  name: string;
  type: 'counter' | 'histogram' | 'gauge' | 'summary';
  description: string;
  labels: string[];
  buckets?: number[];
}

export interface LoggingConfiguration {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  destination: 'console' | 'file' | 'remote';
  structured_logging: boolean;
  sensitive_field_masks: string[];
  retention_days: number;
}

export interface TracingConfiguration {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'custom';
  sampling_rate: number;
  max_spans: number;
  export_batch_size: number;
  export_timeout: number;
}

export interface AlertingConfiguration {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation_policies: EscalationPolicy[];
}

export interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  configuration: UnknownObject;
  enabled: boolean;
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  window: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  enabled: boolean;
}

export interface EscalationPolicy {
  name: string;
  steps: EscalationStep[];
  repeat_interval?: number;
}

export interface EscalationStep {
  delay: number;
  channels: string[];
  users?: string[];
  groups?: string[];
}

export interface MonitoringData {
  metrics: MetricData[];
  logs: LogEntry[];
  traces: TraceData[];
  alerts: AlertData[];
  health_checks: HealthCheckResult[];
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  labels: Record<string, string>;
  type: 'counter' | 'histogram' | 'gauge' | 'summary';
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  trace_id?: string;
  user_id?: string;
  request_id?: string;
  fields: UnknownObject;
}

export interface TraceData {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation_name: string;
  start_time: string;
  duration: number;
  status: 'ok' | 'error' | 'timeout';
  tags: Record<string, JsonValue>;
  logs: TraceLog[];
}

export interface TraceLog {
  timestamp: string;
  level: string;
  message: string;
  fields?: UnknownObject;
}

export interface AlertData {
  id: string;
  rule_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  message: string;
  labels: Record<string, string>;
  started_at: string;
  resolved_at?: string;
  escalation_level: number;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time: number;
  timestamp: string;
  details?: UnknownObject;
  error?: string;
}

/**
 * Security configuration
 */
export interface SecurityConfiguration {
  authentication: SecurityAuthConfig;
  authorization: SecurityAuthzConfig;
  encryption: EncryptionConfig;
  input_validation: ValidationConfig;
  rate_limiting: SecurityRateLimitConfig;
  audit_logging: AuditLoggingConfig;
}

export interface SecurityAuthConfig {
  required: boolean;
  methods: ('api_key' | 'bearer_token' | 'oauth2' | 'basic')[];
  token_validation: TokenValidationConfig;
  session_management: SessionManagementConfig;
}

export interface TokenValidationConfig {
  verify_signature: boolean;
  check_expiration: boolean;
  validate_issuer: boolean;
  validate_audience: boolean;
  clock_skew_tolerance: number;
}

export interface SessionManagementConfig {
  session_timeout: number;
  max_concurrent_sessions: number;
  session_rotation: boolean;
  secure_cookies: boolean;
  same_site_policy: 'strict' | 'lax' | 'none';
}

export interface SecurityAuthzConfig {
  enabled: boolean;
  default_policy: 'allow' | 'deny';
  role_based: boolean;
  resource_based: boolean;
  policy_engine: 'rbac' | 'abac' | 'opa';
}

export interface EncryptionConfig {
  data_at_rest: EncryptionSettings;
  data_in_transit: EncryptionSettings;
  key_management: KeyManagementConfig;
}

export interface EncryptionSettings {
  enabled: boolean;
  algorithm: string;
  key_length: number;
  rotation_period: number;
}

export interface KeyManagementConfig {
  provider: 'aws_kms' | 'azure_kv' | 'gcp_kms' | 'hashicorp_vault' | 'local';
  auto_rotation: boolean;
  backup_keys: number;
  key_derivation: KeyDerivationConfig;
}

export interface KeyDerivationConfig {
  algorithm: string;
  iterations: number;
  salt_length: number;
}

export interface ValidationConfig {
  input_sanitization: boolean;
  xss_protection: boolean;
  sql_injection_protection: boolean;
  max_input_size: number;
  allowed_file_types: string[];
  content_type_validation: boolean;
}

export interface SecurityRateLimitConfig extends RateLimitConfiguration {
  per_user_limits: boolean;
  ip_based_limits: boolean;
  suspicious_activity_detection: boolean;
  automated_blocking: boolean;
}

export interface AuditLoggingConfig {
  enabled: boolean;
  log_all_requests: boolean;
  log_sensitive_data: boolean;
  retention_period: number;
  compliance_format: 'sox' | 'pci_dss' | 'gdpr' | 'hipaa' | 'custom';
  real_time_monitoring: boolean;
}

// =============================================================================
// APPLICATION-SPECIFIC TYPES
// =============================================================================

/**
 * Image processing types
 */
export interface ImageData {
  id: string;
  url: string;
  alt_text?: string;
  width: number;
  height: number;
  format: ImageFormat;
  size_bytes: number;
  metadata: ImageMetadata;
}

export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'svg' | 'bmp' | 'tiff';

export interface ImageMetadata {
  captured_at?: string;
  camera_model?: string;
  photographer?: string;
  location?: ImageLocation;
  tags: string[];
  color_palette: ColorInfo[];
  dominant_colors: string[];
  brightness: number;
  contrast: number;
  quality_score: number;
}

export interface ImageLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  country?: string;
  city?: string;
}

export interface ColorInfo {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  percentage: number;
}

/**
 * Description generation types
 */
export interface DescriptionRequest {
  image_url: string;
  style: DescriptionStyle;
  max_length: number;
  language: LanguageCode;
  custom_prompt?: string;
  target_audience?: TargetAudience;
  context?: DescriptionContext;
}

export type DescriptionStyle = 
  | 'narrativo' 
  | 'poetico' 
  | 'academico' 
  | 'conversacional' 
  | 'infantil';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt';

export type TargetAudience = 
  | 'children' 
  | 'teenagers' 
  | 'adults' 
  | 'seniors' 
  | 'professionals' 
  | 'students';

export interface DescriptionContext {
  educational_level?: 'elementary' | 'middle' | 'high' | 'college' | 'professional';
  subject_area?: string;
  cultural_context?: string;
  accessibility_requirements?: AccessibilityRequirements;
}

export interface AccessibilityRequirements {
  screen_reader_optimized: boolean;
  simplified_language: boolean;
  high_contrast_descriptions: boolean;
  audio_friendly: boolean;
}

export interface GeneratedDescription {
  id: string;
  content: string;
  style: DescriptionStyle;
  language: LanguageCode;
  word_count: number;
  reading_level: ReadingLevel;
  quality_metrics: QualityMetrics;
  generated_at: string;
  model_info: ModelInfo;
}

export interface ReadingLevel {
  grade_level: number;
  complexity_score: number;
  vocabulary_difficulty: 'easy' | 'medium' | 'hard';
  sentence_complexity: 'simple' | 'compound' | 'complex';
}

export interface QualityMetrics {
  coherence_score: number;
  relevance_score: number;
  creativity_score: number;
  accuracy_score: number;
  engagement_score: number;
  overall_score: number;
}

export interface ModelInfo {
  model_name: string;
  model_version: string;
  provider: 'openai' | 'anthropic' | 'cohere' | 'custom';
  parameters: ModelParameters;
  processing_time: number;
  token_usage: TokenUsage;
}

export interface ModelParameters {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  [key: string]: JsonValue;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
}

/**
 * Question and Answer types
 */
export interface QAGeneration {
  description_id: string;
  question_count: number;
  difficulty_distribution: DifficultyDistribution;
  language: LanguageCode;
  question_types: QuestionType[];
  generated_questions: GeneratedQuestion[];
  quality_assessment: QAQualityAssessment;
}

export interface DifficultyDistribution {
  beginner: number;
  intermediate: number;
  advanced: number;
}

export type QuestionType = 
  | 'multiple_choice' 
  | 'true_false' 
  | 'short_answer' 
  | 'essay' 
  | 'fill_blank' 
  | 'matching';

export interface GeneratedQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  hints?: string[];
  tags: string[];
  learning_objectives: string[];
  time_limit?: number;
  points: number;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface QAQualityAssessment {
  clarity_score: number;
  difficulty_accuracy: number;
  answer_precision: number;
  educational_value: number;
  cultural_appropriateness: number;
  bias_score: number;
}

/**
 * Vocabulary extraction types
 */
export interface VocabularyExtraction {
  source_text: string;
  extraction_method: ExtractionMethod;
  target_level: DifficultyLevel;
  language: LanguageCode;
  categories: VocabularyCategory[];
  extracted_items: ExtractedVocabularyItem[];
  linguistic_analysis: LinguisticAnalysis;
}

export type ExtractionMethod = 'frequency' | 'difficulty' | 'context' | 'educational' | 'hybrid';

export type VocabularyCategory = 
  | 'nouns' 
  | 'verbs' 
  | 'adjectives' 
  | 'adverbs' 
  | 'phrases' 
  | 'idioms' 
  | 'technical_terms';

export interface ExtractedVocabularyItem {
  id: string;
  word: string;
  definition: string;
  part_of_speech: PartOfSpeech;
  category: VocabularyCategory;
  difficulty: DifficultyLevel;
  frequency_score: number;
  context_sentences: string[];
  translations: TranslationMap;
  pronunciation: PronunciationInfo;
  etymology?: EtymologyInfo;
  usage_notes: string[];
  related_words: RelatedWord[];
  examples: UsageExample[];
}

export type PartOfSpeech = 
  | 'noun' 
  | 'verb' 
  | 'adjective' 
  | 'adverb' 
  | 'preposition' 
  | 'conjunction' 
  | 'interjection' 
  | 'pronoun' 
  | 'determiner';

export type TranslationMap = Record<LanguageCode, string>;

export interface PronunciationInfo {
  ipa?: string;
  audio_url?: string;
  syllables: string[];
  stress_pattern: number[];
  phonetic_spelling?: string;
}

export interface EtymologyInfo {
  origin_language: string;
  root_words: string[];
  historical_development: string;
  first_recorded_use?: string;
}

export interface RelatedWord {
  word: string;
  relationship: WordRelationship;
  strength: number;
}

export type WordRelationship = 
  | 'synonym' 
  | 'antonym' 
  | 'hypernym' 
  | 'hyponym' 
  | 'meronym' 
  | 'holonym' 
  | 'derived';

export interface UsageExample {
  sentence: string;
  context: string;
  difficulty: DifficultyLevel;
  source?: string;
  translations: TranslationMap;
}

export interface LinguisticAnalysis {
  lexical_diversity: number;
  average_word_length: number;
  syllable_distribution: Record<number, number>;
  pos_distribution: Record<PartOfSpeech, number>;
  readability_scores: ReadabilityScores;
  language_detection: LanguageDetection;
}

export interface ReadabilityScores {
  flesch_kincaid: number;
  flesch_reading_ease: number;
  coleman_liau: number;
  automated_readability: number;
  average_score: number;
}

export interface LanguageDetection {
  detected_language: LanguageCode;
  confidence: number;
  alternative_languages: Array<{
    language: LanguageCode;
    confidence: number;
  }>;
}

/**
 * Export and import types
 */
export interface ExportConfiguration {
  format: ExportFormat;
  content_types: ContentType[];
  filters: ExportFilters;
  formatting_options: FormattingOptions;
  metadata_options: MetadataOptions;
}

export type ExportFormat = 'json' | 'csv' | 'xml' | 'yaml' | 'txt' | 'pdf' | 'html' | 'anki' | 'quizlet';

export type ContentType = 
  | 'vocabulary' 
  | 'descriptions' 
  | 'questions' 
  | 'progress' 
  | 'images' 
  | 'sessions' 
  | 'user_data';

export interface ExportFilters {
  date_range?: DateRange;
  difficulty_levels?: DifficultyLevel[];
  categories?: string[];
  languages?: LanguageCode[];
  user_ids?: string[];
  tags?: string[];
  custom_filters?: CustomFilter[];
}

export interface CustomFilter {
  field: string;
  operator: FilterOperator['operator'];
  value: JsonValue;
  case_sensitive?: boolean;
}

export interface FormattingOptions {
  include_headers: boolean;
  delimiter?: string;
  encoding?: string;
  date_format?: string;
  number_format?: string;
  text_encoding?: 'utf8' | 'utf16' | 'ascii';
  compression?: 'none' | 'gzip' | 'zip';
}

export interface MetadataOptions {
  include_timestamps: boolean;
  include_user_info: boolean;
  include_system_info: boolean;
  include_version_info: boolean;
  include_export_info: boolean;
  custom_metadata?: UnknownObject;
}

export interface ExportResult {
  export_id: string;
  status: ExportStatus;
  file_info: ExportFileInfo;
  statistics: ExportStatistics;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  error_info?: ExportError;
}

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface ExportFileInfo {
  filename: string;
  size_bytes: number;
  format: ExportFormat;
  content_type: string;
  checksum: string;
  download_url?: string;
  preview_url?: string;
}

export interface ExportStatistics {
  total_records: number;
  exported_records: number;
  filtered_records: number;
  error_records: number;
  processing_time: number;
  file_generation_time: number;
}

export interface ExportError {
  code: string;
  message: string;
  details?: UnknownObject;
  recoverable: boolean;
  retry_suggestion?: string;
}

/**
 * Import types
 */
export interface ImportConfiguration {
  source_format: ExportFormat;
  content_type: ContentType;
  mapping_rules: FieldMappingRule[];
  validation_rules: ImportValidationRule[];
  conflict_resolution: ConflictResolution;
  processing_options: ImportProcessingOptions;
}

export interface FieldMappingRule {
  source_field: string;
  target_field: string;
  transformation?: FieldTransformation;
  required: boolean;
  default_value?: JsonValue;
}

export interface FieldTransformation {
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  format?: string;
  pattern?: string;
  custom_function?: string;
}

export interface ImportValidationRule {
  field: string;
  rules: ValidationRules;
  error_handling: 'skip' | 'error' | 'warn' | 'default';
}

export interface ConflictResolution {
  strategy: 'skip' | 'update' | 'merge' | 'error';
  merge_strategy?: 'prefer_source' | 'prefer_target' | 'custom';
  custom_resolver?: string;
}

export interface ImportProcessingOptions {
  batch_size: number;
  parallel_processing: boolean;
  validate_before_import: boolean;
  create_backup: boolean;
  rollback_on_error: boolean;
  progress_reporting: boolean;
}

export interface ImportResult {
  import_id: string;
  status: ImportStatus;
  statistics: ImportStatistics;
  validation_results: ValidationResults;
  created_at: string;
  completed_at?: string;
  error_info?: ImportError;
}

export type ImportStatus = 'pending' | 'validating' | 'processing' | 'completed' | 'failed' | 'rolled_back';

export interface ImportStatistics {
  total_records: number;
  processed_records: number;
  created_records: number;
  updated_records: number;
  skipped_records: number;
  error_records: number;
  processing_time: number;
}

export interface ValidationResults {
  passed: number;
  failed: number;
  warnings: number;
  errors: ValidationError[];
  warnings_list: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: JsonValue;
  suggestion?: string;
}

export interface ImportError {
  code: string;
  message: string;
  details?: UnknownObject;
  affected_records?: number[];
  recovery_options?: string[];
}

// =============================================================================
// HELPER TYPES AND TYPE GUARDS
// =============================================================================

/**
 * Type guard functions for runtime type checking
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value as object).every(isJsonValue);
  }
  return false;
}

export function isUnknownObject(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDatabaseRecord(value: unknown): value is DatabaseRecord {
  return isUnknownObject(value) && 
         typeof value.id === 'string' &&
         typeof value.created_at === 'string' &&
         typeof value.updated_at === 'string';
}

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return isUnknownObject(value) && 
         typeof value.success === 'boolean' &&
         isUnknownObject(value.metadata);
}

export function isServiceError(value: unknown): value is ServiceError {
  return isUnknownObject(value) &&
         typeof value.code === 'string' &&
         typeof value.message === 'string' &&
         typeof value.severity === 'string' &&
         typeof value.recoverable === 'boolean';
}

/**
 * Utility types for type transformations
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object | undefined ? DeepRequired<NonNullable<T[P]>> : T[P];
};

// =============================================================================
// CONSTANTS AND DEFAULTS
// =============================================================================

/**
 * Default values for common configurations
 */
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

/**
 * Type validation schemas
 */
export const JSON_PRIMITIVES = ['string', 'number', 'boolean', 'null'] as const;
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const DESCRIPTION_STYLES = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'] as const;
export const LANGUAGE_CODES = ['en', 'es', 'fr', 'de', 'it', 'pt'] as const;
export const EXPORT_FORMATS = ['json', 'csv', 'xml', 'yaml', 'txt', 'pdf', 'html', 'anki', 'quizlet'] as const;

/**
 * Common regex patterns for validation
 */
export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  SEMVER: /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/,
} as const;

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

// Export everything from modules, resolving conflicts manually
export * from './api';
export * from './export';

// Export from unified (preferred version of VocabularyStats and Database)
export * from './unified';