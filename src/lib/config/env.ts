/**
 * Environment Configuration with Type Safety
 * 
 * This module provides typed access to environment variables and validates
 * that all required configuration is present. It separates client-side and
 * server-side variables to prevent accidental exposure of secrets.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Client-side environment variables (available in browser)
 * Only variables with NEXT_PUBLIC_ prefix should be included here
 */
export interface ClientEnv {
  // App Configuration
  NEXT_PUBLIC_APP_URL: string;
  
  // External Services (Public Keys Only)
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Server-side environment variables (secure, not exposed to browser)
 */
export interface ServerEnv {
  // Security Configuration
  API_SECRET_KEY: string;
  JWT_SECRET: string;
  SESSION_SECRET: string;
  VALID_API_KEYS?: string;
  DEV_API_KEY?: string;
  
  // External Services (Private Keys)
  UNSPLASH_ACCESS_KEY: string;
  OPENAI_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Database & Caching
  REDIS_URL?: string;
  KV_REST_API_URL?: string;
  KV_REST_API_TOKEN?: string;
  DATABASE_URL?: string;
  
  // CORS & Security
  ALLOWED_ORIGINS: string;
  CSP_ALLOWED_DOMAINS?: string;
  TRUSTED_PROXY_IPS?: string;
  
  // Feature Flags
  ENABLE_DEMO_MODE?: string;
  DEMO_MODE_AUTO?: string;
  ENABLE_IMAGE_SEARCH?: string;
  ENABLE_AI_TRANSLATION?: string;
  ENABLE_SETTINGS_SYNC?: string;
  ENABLE_ERROR_REPORTING?: string;
  ENABLE_PERFORMANCE_METRICS?: string;
  ENABLE_A_B_TESTING?: string;
  ENABLE_BETA_FEATURES?: string;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  API_RATE_LIMIT_MAX_REQUESTS?: string;
  IMAGE_SEARCH_RATE_LIMIT?: string;
  
  // Logging & Monitoring
  LOG_LEVEL?: string;
  ERROR_REPORTING_LEVEL?: string;
  ENABLE_STRUCTURED_LOGGING?: string;
  ENABLE_AUDIT_LOGGING?: string;
  ENABLE_PERFORMANCE_MONITORING?: string;
  DEBUG_ENDPOINT_ENABLED?: string;
  DEBUG_ALLOWED_IPS?: string;
  
  // OpenAI Configuration
  OPENAI_MODEL?: string;
  OPENAI_MAX_TOKENS?: string;
  OPENAI_TEMPERATURE?: string;
  
  // Cache Configuration
  MAX_CACHE_SIZE?: string;
  DEFAULT_CACHE_TTL?: string;
  CACHE_WRITE_THROUGH?: string;
  ENABLE_MEMORY_CACHE_FALLBACK?: string;
  
  // SSL/TLS
  FORCE_HTTPS?: string;
  ENABLE_HSTS?: string;
  HSTS_MAX_AGE?: string;
  ENABLE_SECURITY_HEADERS?: string;
  
  // Monitoring & Observability
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  ANALYTICS_ID?: string;
  ENABLE_ANALYTICS?: string;
  HEALTH_CHECK_TIMEOUT?: string;
  ENABLE_DEEP_HEALTH_CHECKS?: string;
}

/**
 * Combined environment interface
 */
export interface Env extends ClientEnv, ServerEnv {}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates that a required environment variable exists
 */
function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Gets an optional environment variable with type conversion
 */
function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

/**
 * Converts string to boolean with proper defaults
 */
function getBooleanEnv(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Converts string to number with validation
 */
function getNumberEnv(key: string, fallback?: number): number | undefined {
  const value = process.env[key];
  if (!value) return fallback;
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return num;
}

// =============================================================================
// CLIENT-SIDE ENVIRONMENT
// =============================================================================

/**
 * Client-side environment variables (safe to expose to browser)
 * These are available on both client and server
 */
export const clientEnv: ClientEnv = {
  NEXT_PUBLIC_APP_URL: requireEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: requireEnv('NEXT_PUBLIC_UNSPLASH_ACCESS_KEY'),
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
};

// =============================================================================
// SERVER-SIDE ENVIRONMENT
// =============================================================================

/**
 * Server-side environment variables (secure, never exposed to browser)
 * These are only available on the server
 */
export const serverEnv: ServerEnv = {
  // Security Configuration
  API_SECRET_KEY: requireEnv('API_SECRET_KEY'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  VALID_API_KEYS: getEnv('VALID_API_KEYS'),
  DEV_API_KEY: getEnv('DEV_API_KEY'),
  
  // External Services
  UNSPLASH_ACCESS_KEY: requireEnv('UNSPLASH_ACCESS_KEY'),
  OPENAI_API_KEY: requireEnv('OPENAI_API_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  
  // Database & Caching
  REDIS_URL: getEnv('REDIS_URL'),
  KV_REST_API_URL: getEnv('KV_REST_API_URL'),
  KV_REST_API_TOKEN: getEnv('KV_REST_API_TOKEN'),
  DATABASE_URL: getEnv('DATABASE_URL'),
  
  // CORS & Security
  ALLOWED_ORIGINS: requireEnv('ALLOWED_ORIGINS', 'http://localhost:3000'),
  CSP_ALLOWED_DOMAINS: getEnv('CSP_ALLOWED_DOMAINS'),
  TRUSTED_PROXY_IPS: getEnv('TRUSTED_PROXY_IPS', '127.0.0.1,::1'),
  
  // Feature Flags
  ENABLE_DEMO_MODE: getEnv('ENABLE_DEMO_MODE', 'false'),
  DEMO_MODE_AUTO: getEnv('DEMO_MODE_AUTO', 'true'),
  ENABLE_IMAGE_SEARCH: getEnv('ENABLE_IMAGE_SEARCH', 'true'),
  ENABLE_AI_TRANSLATION: getEnv('ENABLE_AI_TRANSLATION', 'true'),
  ENABLE_SETTINGS_SYNC: getEnv('ENABLE_SETTINGS_SYNC', 'true'),
  ENABLE_ERROR_REPORTING: getEnv('ENABLE_ERROR_REPORTING', 'true'),
  ENABLE_PERFORMANCE_METRICS: getEnv('ENABLE_PERFORMANCE_METRICS', 'true'),
  ENABLE_A_B_TESTING: getEnv('ENABLE_A_B_TESTING', 'false'),
  ENABLE_BETA_FEATURES: getEnv('ENABLE_BETA_FEATURES', 'false'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnv('RATE_LIMIT_WINDOW_MS', '15000'),
  RATE_LIMIT_MAX_REQUESTS: getEnv('RATE_LIMIT_MAX_REQUESTS', '100'),
  API_RATE_LIMIT_MAX_REQUESTS: getEnv('API_RATE_LIMIT_MAX_REQUESTS', '50'),
  IMAGE_SEARCH_RATE_LIMIT: getEnv('IMAGE_SEARCH_RATE_LIMIT', '20'),
  
  // Logging & Monitoring
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  ERROR_REPORTING_LEVEL: getEnv('ERROR_REPORTING_LEVEL', 'info'),
  ENABLE_STRUCTURED_LOGGING: getEnv('ENABLE_STRUCTURED_LOGGING', 'false'),
  ENABLE_AUDIT_LOGGING: getEnv('ENABLE_AUDIT_LOGGING', 'false'),
  ENABLE_PERFORMANCE_MONITORING: getEnv('ENABLE_PERFORMANCE_MONITORING', 'true'),
  DEBUG_ENDPOINT_ENABLED: getEnv('DEBUG_ENDPOINT_ENABLED', 'false'),
  DEBUG_ALLOWED_IPS: getEnv('DEBUG_ALLOWED_IPS', '127.0.0.1'),
  
  // OpenAI Configuration
  OPENAI_MODEL: getEnv('OPENAI_MODEL', 'gpt-4o-mini'),
  OPENAI_MAX_TOKENS: getEnv('OPENAI_MAX_TOKENS', '1000'),
  OPENAI_TEMPERATURE: getEnv('OPENAI_TEMPERATURE', '0.7'),
  
  // Cache Configuration
  MAX_CACHE_SIZE: getEnv('MAX_CACHE_SIZE', '1000'),
  DEFAULT_CACHE_TTL: getEnv('DEFAULT_CACHE_TTL', '3600'),
  CACHE_WRITE_THROUGH: getEnv('CACHE_WRITE_THROUGH', 'true'),
  ENABLE_MEMORY_CACHE_FALLBACK: getEnv('ENABLE_MEMORY_CACHE_FALLBACK', 'true'),
  
  // SSL/TLS
  FORCE_HTTPS: getEnv('FORCE_HTTPS', 'false'),
  ENABLE_HSTS: getEnv('ENABLE_HSTS', 'false'),
  HSTS_MAX_AGE: getEnv('HSTS_MAX_AGE', '31536000'),
  ENABLE_SECURITY_HEADERS: getEnv('ENABLE_SECURITY_HEADERS', 'true'),
  
  // Monitoring & Observability
  SENTRY_DSN: getEnv('SENTRY_DSN'),
  SENTRY_ENVIRONMENT: getEnv('SENTRY_ENVIRONMENT', process.env.NODE_ENV || 'development'),
  ANALYTICS_ID: getEnv('ANALYTICS_ID'),
  ENABLE_ANALYTICS: getEnv('ENABLE_ANALYTICS', 'false'),
  HEALTH_CHECK_TIMEOUT: getEnv('HEALTH_CHECK_TIMEOUT', '5000'),
  ENABLE_DEEP_HEALTH_CHECKS: getEnv('ENABLE_DEEP_HEALTH_CHECKS', 'false'),
};

// =============================================================================
// COMBINED ENVIRONMENT
// =============================================================================

/**
 * Combined environment object with all variables
 * Use this for server-side code that needs access to all environment variables
 */
export const env: Env = {
  ...clientEnv,
  ...serverEnv,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if we're in development mode
 */
export const isDevelopment = () => clientEnv.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = () => clientEnv.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = () => clientEnv.NODE_ENV === 'test';

/**
 * Check if we're running on the server
 */
export const isServer = typeof window === 'undefined';

/**
 * Check if we're running on the client
 */
export const isClient = typeof window !== 'undefined';

/**
 * Get feature flag value as boolean
 */
export const getFeatureFlag = (flagName: keyof Pick<ServerEnv, 
  'ENABLE_DEMO_MODE' | 'DEMO_MODE_AUTO' | 'ENABLE_IMAGE_SEARCH' | 
  'ENABLE_AI_TRANSLATION' | 'ENABLE_SETTINGS_SYNC' | 'ENABLE_ERROR_REPORTING' |
  'ENABLE_PERFORMANCE_METRICS' | 'ENABLE_A_B_TESTING' | 'ENABLE_BETA_FEATURES'
>): boolean => {
  const value = serverEnv[flagName];
  return value === 'true' || value === '1';
};

/**
 * Get allowed origins as array
 */
export const getAllowedOrigins = (): string[] => {
  return serverEnv.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
};

/**
 * Get valid API keys as array
 */
export const getValidApiKeys = (): string[] => {
  if (!serverEnv.VALID_API_KEYS) return [];
  return serverEnv.VALID_API_KEYS.split(',').map(key => key.trim());
};

/**
 * Get trusted proxy IPs as array
 */
export const getTrustedProxyIPs = (): string[] => {
  if (!serverEnv.TRUSTED_PROXY_IPS) return [];
  return serverEnv.TRUSTED_PROXY_IPS.split(',').map(ip => ip.trim());
};

/**
 * Get debug allowed IPs as array
 */
export const getDebugAllowedIPs = (): string[] => {
  if (!serverEnv.DEBUG_ALLOWED_IPS) return [];
  return serverEnv.DEBUG_ALLOWED_IPS.split(',').map(ip => ip.trim());
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates environment configuration on startup
 * Call this in your app initialization to catch configuration errors early
 */
export const validateEnvironment = (): void => {
  const errors: string[] = [];
  
  // Check required client variables
  try {
    clientEnv;
  } catch (error) {
    errors.push(`Client environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Check required server variables (only on server)
  if (isServer) {
    try {
      serverEnv;
    } catch (error) {
      errors.push(`Server environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Additional validation
  if (isProduction() && getBooleanEnv('DEBUG_ENDPOINT_ENABLED', false)) {
    errors.push('DEBUG_ENDPOINT_ENABLED should be false in production');
  }
  
  if (isProduction() && serverEnv.LOG_LEVEL === 'debug') {
    errors.push('LOG_LEVEL should not be debug in production');
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

// Default export for convenience
const envConfig = {
  client: clientEnv,
  server: serverEnv,
  all: env,
  isDevelopment,
  isProduction,
  isTest,
  isServer,
  isClient,
  getFeatureFlag,
  getAllowedOrigins,
  getValidApiKeys,
  getTrustedProxyIPs,
  getDebugAllowedIPs,
  validateEnvironment,
};

export default envConfig;