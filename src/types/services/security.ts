/**
 * Security configuration types
 */

import type { RateLimitConfiguration } from './configuration';

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
