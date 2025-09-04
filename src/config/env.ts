import { z } from 'zod';
// Structured logging import removed for production build optimization

// =============================================================================
// Environment Variable Schema & Validation
// =============================================================================

/**
 * Comprehensive environment variable validation with proper TypeScript types,
 * graceful error handling, and detailed validation messages.
 */

// Custom validation helpers
const createUrlValidator = (required = false) => {
  const base = z.string().url('Must be a valid URL');
  return required ? base : base.optional();
};

const createPortValidator = () => z.coerce.number().int().min(1).max(65535);

const createBooleanValidator = (defaultValue = false) => 
  z.coerce.boolean().default(defaultValue);

const createNumberValidator = (min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue?: number) => {
  const base = z.coerce.number().int().min(min).max(max);
  return defaultValue !== undefined ? base.default(defaultValue) : base.optional();
};

// =============================================================================
// Core Environment Schema
// =============================================================================

const envSchema = z.object({
  // -------------------------------------------------------------------------
  // Core Application Settings
  // -------------------------------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production', 'staging'])
    .default('development')
    .describe('Application environment'),
    
  PORT: createPortValidator()
    .default(3000)
    .describe('Server port number'),
    
  NEXT_PUBLIC_APP_URL: z.string()
    .url('Must be a valid URL')
    .default('http://localhost:3000')
    .describe('Public application URL'),

  // -------------------------------------------------------------------------
  // External API Keys (Optional for Demo Mode)
  // -------------------------------------------------------------------------
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: z.string()
    .min(1, 'Must not be empty')
    .optional()
    .describe('Unsplash API access key for image search'),
    
  OPENAI_API_KEY: z.string()
    .min(1, 'Must not be empty')
    .regex(/^sk-/, 'Must be a valid OpenAI API key starting with sk-')
    .optional()
    .describe('OpenAI API key for AI-generated content'),

  // -------------------------------------------------------------------------
  // Database Configuration (Supabase)
  // -------------------------------------------------------------------------
  NEXT_PUBLIC_SUPABASE_URL: createUrlValidator()
    .describe('Supabase project URL'),
    
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string()
    .min(1, 'Must not be empty')
    .optional()
    .describe('Supabase anonymous key'),
    
  SUPABASE_SERVICE_ROLE_KEY: z.string()
    .min(1, 'Must not be empty')
    .optional()
    .describe('Supabase service role key (server-side only)'),

  // -------------------------------------------------------------------------
  // Vercel Storage Configuration
  // -------------------------------------------------------------------------
  KV_REST_API_URL: createUrlValidator()
    .describe('Vercel KV database URL'),
    
  KV_REST_API_TOKEN: z.string()
    .min(1, 'Must not be empty')
    .optional()
    .describe('Vercel KV database token'),
    
  BLOB_READ_WRITE_TOKEN: z.string()
    .min(1, 'Must not be empty')
    .optional()
    .describe('Vercel Blob storage token'),

  // -------------------------------------------------------------------------
  // Monitoring & Error Tracking
  // -------------------------------------------------------------------------
  SENTRY_DSN: createUrlValidator()
    .describe('Sentry DSN for error tracking'),
    
  SENTRY_ORG: z.string().optional()
    .describe('Sentry organization slug'),
    
  SENTRY_PROJECT: z.string().optional()
    .describe('Sentry project slug'),
    
  SENTRY_AUTH_TOKEN: z.string().optional()
    .describe('Sentry authentication token'),
    
  SENTRY_ENVIRONMENT: z.string().optional()
    .describe('Sentry environment name'),

  // -------------------------------------------------------------------------
  // Deployment Configuration
  // -------------------------------------------------------------------------
  VERCEL_TOKEN: z.string().optional()
    .describe('Vercel deployment token'),
    
  VERCEL_ORG_ID: z.string().optional()
    .describe('Vercel organization ID'),
    
  VERCEL_PROJECT_ID: z.string().optional()
    .describe('Vercel project ID'),
    
  VERCEL_GIT_COMMIT_SHA: z.string().optional()
    .describe('Git commit SHA from Vercel'),

  // -------------------------------------------------------------------------
  // Security & Code Analysis
  // -------------------------------------------------------------------------
  SNYK_TOKEN: z.string().optional()
    .describe('Snyk security scanning token'),
    
  SEMGREP_APP_TOKEN: z.string().optional()
    .describe('Semgrep security analysis token'),

  // -------------------------------------------------------------------------
  // Notifications & Webhooks
  // -------------------------------------------------------------------------
  SLACK_WEBHOOK_URL: createUrlValidator()
    .describe('Slack webhook URL for notifications'),
    
  DISCORD_WEBHOOK_URL: createUrlValidator()
    .describe('Discord webhook URL for notifications'),

  // -------------------------------------------------------------------------
  // Performance Monitoring
  // -------------------------------------------------------------------------
  LHCI_GITHUB_APP_TOKEN: z.string().optional()
    .describe('Lighthouse CI GitHub app token'),
    
  NEW_RELIC_LICENSE_KEY: z.string().optional()
    .describe('New Relic license key'),
    
  DATADOG_API_KEY: z.string().optional()
    .describe('Datadog API key'),

  // -------------------------------------------------------------------------
  // Rate Limiting Configuration
  // -------------------------------------------------------------------------
  UNSPLASH_RATE_LIMIT_PER_HOUR: createNumberValidator(1, 10000, 1000)
    .describe('Unsplash API rate limit per hour'),
    
  OPENAI_RATE_LIMIT_PER_MINUTE: createNumberValidator(1, 10000, 60)
    .describe('OpenAI API rate limit per minute'),
    
  API_RATE_LIMIT_WINDOW: createNumberValidator(1, 3600, 900)
    .describe('API rate limiting window in seconds'),

  // -------------------------------------------------------------------------
  // Caching Configuration
  // -------------------------------------------------------------------------
  DEFAULT_CACHE_TTL: createNumberValidator(1, 86400, 3600)
    .describe('Default cache TTL in seconds'),
    
  MAX_CACHE_SIZE: createNumberValidator(1, 10000, 1000)
    .describe('Maximum cache size (number of items)'),
    
  REDIS_URL: createUrlValidator()
    .describe('Redis connection URL for caching'),

  // -------------------------------------------------------------------------
  // Feature Flags & Toggles
  // -------------------------------------------------------------------------
  ENABLE_DEMO_MODE: createBooleanValidator(false)
    .describe('Force enable demo mode'),
    
  DEMO_MODE_AUTO: createBooleanValidator(true)
    .describe('Auto-enable demo mode when API keys missing'),
    
  ENABLE_FEATURE_FLAGS: createBooleanValidator(false)
    .describe('Enable feature flags system'),
    
  ENABLE_ANALYTICS: createBooleanValidator(true)
    .describe('Enable analytics tracking'),
    
  ENABLE_DEBUG_MODE: createBooleanValidator(false)
    .describe('Enable debug logging and features'),
    
  MAINTENANCE_MODE: createBooleanValidator(false)
    .describe('Enable maintenance mode'),

  // -------------------------------------------------------------------------
  // Build & Runtime Configuration
  // -------------------------------------------------------------------------
  NEXT_TELEMETRY_DISABLED: z.coerce.number().default(1)
    .describe('Disable Next.js telemetry'),
    
  ANALYZE: createBooleanValidator(false)
    .describe('Enable bundle analyzer'),
    
  BUILD_ID: z.string().optional()
    .describe('Custom build identifier'),
    
  CUSTOM_BUILD_ID: z.string().optional()
    .describe('Custom build ID for deployment'),

  // -------------------------------------------------------------------------
  // Security Configuration
  // -------------------------------------------------------------------------
  JWT_SECRET: z.string()
    .min(32, 'JWT secret must be at least 32 characters')
    .optional()
    .describe('JWT signing secret'),
    
  SESSION_SECRET: z.string()
    .min(32, 'Session secret must be at least 32 characters')
    .optional()
    .describe('Session encryption secret'),
    
  ENCRYPTION_KEY: z.string()
    .min(32, 'Encryption key must be at least 32 characters')
    .optional()
    .describe('Application encryption key'),

  // -------------------------------------------------------------------------
  // Testing Configuration
  // -------------------------------------------------------------------------
  CI: createBooleanValidator(false)
    .describe('Running in CI environment'),
    
  TEST_DATABASE_URL: z.string().optional()
    .describe('Test database connection URL'),
    
  E2E_BASE_URL: z.string().optional()
    .describe('Base URL for E2E tests'),
});

// =============================================================================
// Type Definitions
// =============================================================================

export type Environment = z.infer<typeof envSchema>;

export interface ValidationResult {
  success: boolean;
  data?: Environment;
  errors?: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  required: boolean;
}

export interface EnvironmentInfo {
  nodeEnv: string;
  appUrl: string;
  buildId?: string;
  timestamp: string;
  services: ServiceStatus[];
  demoMode: boolean;
  maintenanceMode: boolean;
}

export interface ServiceStatus {
  name: string;
  category: 'core' | 'external' | 'storage' | 'monitoring' | 'security';
  enabled: boolean;
  configured: boolean;
  healthy: boolean;
  demoMode: boolean;
  required: boolean;
  reason?: string;
}

// =============================================================================
// Environment Validation & Loading
// =============================================================================

let _env: Environment | null = null;
let _validationResult: ValidationResult | null = null;

/**
 * Validates environment variables and returns detailed results
 */
function validateEnvironment(): ValidationResult {
  try {
    const data = envSchema.parse(process.env);
    return {
      success: true,
      data,
      warnings: generateWarnings(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          value: issue.path.reduce((obj: any, key) => obj?.[key], process.env as any),
          required: !issue.path.some(p => envSchema.shape[p as keyof typeof envSchema.shape]?.isOptional()),
        })),
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: `Unexpected validation error: ${error}`,
        required: false,
      }],
    };
  }
}

/**
 * Generates warnings for potentially misconfigured values
 */
function generateWarnings(env: Environment): string[] {
  const warnings: string[] = [];
  
  // Development environment warnings
  if (env.NODE_ENV === 'development') {
    if (env.NEXT_PUBLIC_APP_URL.includes('localhost') && !env.NEXT_PUBLIC_APP_URL.includes(':3000')) {
      warnings.push('App URL uses localhost but not the default port 3000');
    }
  }
  
  // Production environment warnings
  if (env.NODE_ENV === 'production') {
    if (!env.SENTRY_DSN) {
      warnings.push('No error tracking configured for production');
    }
    if (env.ENABLE_DEBUG_MODE) {
      warnings.push('Debug mode is enabled in production');
    }
    if (!env.JWT_SECRET) {
      warnings.push('No JWT secret configured for production');
    }
  }
  
  // API key warnings
  if (!env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY && !env.OPENAI_API_KEY) {
    warnings.push('No external API keys configured - running in full demo mode');
  }
  
  // Security warnings
  if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
    warnings.push('JWT secret should be at least 64 characters for better security');
  }
  
  return warnings;
}

/**
 * Safely loads and validates environment variables
 */
export function loadEnvironment(): ValidationResult {
  if (_validationResult) {
    return _validationResult;
  }
  
  _validationResult = validateEnvironment();
  
  if (_validationResult.success) {
    _env = _validationResult.data!;
  }
  
  return _validationResult;
}

/**
 * Gets validated environment variables (throws if not valid)
 */
export function getEnvironment(): Environment {
  if (!_env) {
    const result = loadEnvironment();
    if (!result.success) {
      throw new Error(`Environment validation failed: ${result.errors?.map(e => e.message).join(', ')}`);
    }
    _env = result.data!;
  }
  
  return _env;
}

/**
 * Safely gets environment variables with fallback
 */
export function safeGetEnvironment(): Environment | null {
  try {
    return getEnvironment();
  } catch {
    return null;
  }
}

/**
 * Validates required environment variables for a specific feature
 */
export function validateRequiredVars(
  requiredVars: (keyof Environment)[],
  featureName = 'feature'
): { valid: boolean; missing: string[]; warnings: string[] } {
  const env = safeGetEnvironment();
  if (!env) {
    return { valid: false, missing: requiredVars as string[], warnings: [] };
  }
  
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const varName of requiredVars) {
    const value = env[varName];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    warnings.push(`${featureName} requires: ${missing.join(', ')}`);
  }
  
  return { valid: missing.length === 0, missing, warnings };
}

// =============================================================================
// Service Configuration & Status
// =============================================================================

/**
 * Gets service status for all configured services
 */
export function getServiceStatuses(): ServiceStatus[] {
  const env = safeGetEnvironment();
  if (!env) return [];
  
  return [
    // Core services
    {
      name: 'Next.js Application',
      category: 'core',
      enabled: true,
      configured: true,
      healthy: true,
      demoMode: false,
      required: true,
    },
    
    // External APIs
    {
      name: 'Unsplash Images',
      category: 'external',
      enabled: Boolean(env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
      configured: Boolean(env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
      healthy: Boolean(env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY),
      demoMode: !env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY,
      required: false,
      reason: env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ? undefined : 'Using demo images',
    },
    
    {
      name: 'OpenAI GPT',
      category: 'external',
      enabled: Boolean(env.OPENAI_API_KEY),
      configured: Boolean(env.OPENAI_API_KEY),
      healthy: Boolean(env.OPENAI_API_KEY),
      demoMode: !env.OPENAI_API_KEY,
      required: false,
      reason: env.OPENAI_API_KEY ? undefined : 'Using pre-generated content',
    },
    
    // Storage services
    {
      name: 'Supabase Database',
      category: 'storage',
      enabled: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      configured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      healthy: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      demoMode: !Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      required: false,
      reason: (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? undefined : 'Using local storage',
    },
    
    {
      name: 'Vercel Storage',
      category: 'storage',
      enabled: Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN),
      configured: Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN),
      healthy: Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN),
      demoMode: !Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN),
      required: false,
      reason: (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) ? undefined : 'Using memory cache',
    },
    
    // Monitoring services
    {
      name: 'Sentry Error Tracking',
      category: 'monitoring',
      enabled: Boolean(env.SENTRY_DSN),
      configured: Boolean(env.SENTRY_DSN),
      healthy: Boolean(env.SENTRY_DSN),
      demoMode: !env.SENTRY_DSN,
      required: false,
      reason: env.SENTRY_DSN ? undefined : 'Error tracking disabled',
    },
  ];
}

/**
 * Gets comprehensive environment information
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  const env = safeGetEnvironment();
  const services = getServiceStatuses();
  
  return {
    nodeEnv: env?.NODE_ENV || 'unknown',
    appUrl: env?.NEXT_PUBLIC_APP_URL || 'unknown',
    buildId: env?.CUSTOM_BUILD_ID || env?.BUILD_ID,
    timestamp: new Date().toISOString(),
    services,
    demoMode: isDemoMode(),
    maintenanceMode: env?.MAINTENANCE_MODE || false,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isDemoMode(): boolean {
  const env = safeGetEnvironment();
  if (!env) return true;
  
  return env.ENABLE_DEMO_MODE || 
         (env.DEMO_MODE_AUTO && (!env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || !env.OPENAI_API_KEY));
}

export function isProduction(): boolean {
  const env = safeGetEnvironment();
  return env?.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  const env = safeGetEnvironment();
  return env?.NODE_ENV === 'development';
}

export function isTestEnvironment(): boolean {
  const env = safeGetEnvironment();
  return env?.NODE_ENV === 'test';
}

export function isMaintenanceMode(): boolean {
  const env = safeGetEnvironment();
  return env?.MAINTENANCE_MODE || false;
}

// =============================================================================
// Initialization & Startup Validation
// =============================================================================

/**
 * Validates environment on application startup
 * Call this early in your application lifecycle
 */
export function validateOnStartup(): void {
  const result = loadEnvironment();
  
  if (!result.success) {
    devError('❌ Environment validation failed:');
    result.errors?.forEach(error => {
      devError(`  • ${error.field}: ${error.message}`);
    });
    
    if (result.errors?.some(e => e.required)) {
      devError('\n🚫 Required environment variables are missing. Application cannot start.');
      process.exit(1);
    } else {
      devWarn('\n⚠️  Non-critical environment variables are missing. Continuing in demo mode.');
    }
  }
  
  if (result.warnings && result.warnings.length > 0) {
    devWarn('\n⚠️  Environment warnings:');
    result.warnings.forEach(warning => {
      devWarn(`  • ${warning}`);
    });
  }
  
  if (result.success && result.data) {
    const demoMode = isDemoMode();
    devLog(`✅ Environment validated successfully (${result.data.NODE_ENV})`);
    if (demoMode) {
      devLog('🎭 Running in demo mode - some features will use mock data');
    }
  }
}

// =============================================================================
// Exports
// =============================================================================

// Initialize environment on module load
const result = loadEnvironment();

// Export the environment (will be null if validation fails)
export const env = result.success ? result.data! : null;

// Export validation result for inspection
export const validationResult = result;

// Default export for convenience
export default env;