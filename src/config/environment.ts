import { z } from 'zod';
import { devLog, devWarn, devError } from '@/lib/logger';

// Environment variable schema with optional values for demo mode
const envSchema = z.object({
  // Core Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  
  // API Keys (all optional for demo mode)
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Supabase (optional)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Vercel Storage (optional)
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  
  // Monitoring & Analytics (optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Deployment (optional)
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_ORG_ID: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
  
  // Security Scanning (optional)
  SNYK_TOKEN: z.string().optional(),
  SEMGREP_APP_TOKEN: z.string().optional(),
  
  // Notifications (optional)
  SLACK_WEBHOOK_URL: z.string().optional(),
  
  // Performance Monitoring (optional)
  LHCI_GITHUB_APP_TOKEN: z.string().optional(),
  
  // Rate Limiting Configuration
  UNSPLASH_RATE_LIMIT_PER_HOUR: z.coerce.number().default(1000),
  OPENAI_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(3000),
  
  // Cache Configuration
  DEFAULT_CACHE_TTL: z.coerce.number().default(3600),
  MAX_CACHE_SIZE: z.coerce.number().default(1000),
  
  // Feature Flags
  ENABLE_FEATURE_FLAGS: z.coerce.boolean().default(false),
  NEXT_TELEMETRY_DISABLED: z.coerce.number().default(1),
  
  // Demo Mode Configuration
  ENABLE_DEMO_MODE: z.coerce.boolean().default(false),
  DEMO_MODE_AUTO: z.coerce.boolean().default(true), // Auto-enable demo mode when keys missing
});

export type Environment = z.infer<typeof envSchema>;

// Parse and validate environment variables
export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  SNYK_TOKEN: process.env.SNYK_TOKEN,
  SEMGREP_APP_TOKEN: process.env.SEMGREP_APP_TOKEN,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  LHCI_GITHUB_APP_TOKEN: process.env.LHCI_GITHUB_APP_TOKEN,
  UNSPLASH_RATE_LIMIT_PER_HOUR: process.env.UNSPLASH_RATE_LIMIT_PER_HOUR,
  OPENAI_RATE_LIMIT_PER_MINUTE: process.env.OPENAI_RATE_LIMIT_PER_MINUTE,
  DEFAULT_CACHE_TTL: process.env.DEFAULT_CACHE_TTL,
  MAX_CACHE_SIZE: process.env.MAX_CACHE_SIZE,
  ENABLE_FEATURE_FLAGS: process.env.ENABLE_FEATURE_FLAGS,
  NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED,
  ENABLE_DEMO_MODE: process.env.ENABLE_DEMO_MODE,
  DEMO_MODE_AUTO: process.env.DEMO_MODE_AUTO,
});

// Feature flag configuration
export interface FeatureFlags {
  unsplashService: boolean;
  openaiService: boolean;
  supabaseService: boolean;
  vercelStorage: boolean;
  monitoring: boolean;
  analytics: boolean;
  notifications: boolean;
  demoMode: boolean;
}

// Calculate feature flags
const calculateFeatureFlags = (): FeatureFlags => {
  const unsplashService = Boolean(env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY && env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key_here');
  const openaiService = Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_openai_api_key_here');
  const supabaseService = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && 
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
    env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder_anon_key'
  );
  
  return {
    unsplashService,
    openaiService,
    supabaseService,
    vercelStorage: Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN && env.BLOB_READ_WRITE_TOKEN),
    monitoring: Boolean(env.SENTRY_DSN),
    analytics: Boolean(env.LHCI_GITHUB_APP_TOKEN),
    notifications: Boolean(env.SLACK_WEBHOOK_URL),
    demoMode: env.ENABLE_DEMO_MODE || (env.DEMO_MODE_AUTO && (!unsplashService || !openaiService)),
  };
};

// Determine which features are enabled based on available API keys
export const featureFlags: FeatureFlags = calculateFeatureFlags();

// Service status interface
export interface ServiceStatus {
  name: string;
  enabled: boolean;
  configured: boolean;
  healthy: boolean;
  demoMode: boolean;
  reason?: string;
}

// Get environment info for debugging
export const getEnvironmentInfo = () => ({
  nodeEnv: env.NODE_ENV,
  appUrl: env.NEXT_PUBLIC_APP_URL,
  features: featureFlags,
  demoMode: featureFlags.demoMode,
  timestamp: new Date().toISOString(),
});

// Validation helper
export const validateRequiredEnvVars = (requiredVars: (keyof Environment)[]) => {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    const isDemo = featureFlags.demoMode;
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    
    if (isDemo) {
      devWarn(`${message} - Running in demo mode`);
      return { valid: false, missing, demo: true };
    } else {
      devError(message);
      return { valid: false, missing, demo: false };
    }
  }
  
  return { valid: true, missing: [], demo: false };
};

// Service configuration helpers
export const getServiceConfig = (serviceName: keyof FeatureFlags) => ({
  enabled: featureFlags[serviceName],
  demoMode: featureFlags.demoMode && !featureFlags[serviceName],
});

export const isDemoMode = () => featureFlags.demoMode;
export const isProduction = () => env.NODE_ENV === 'production';
export const isDevelopment = () => env.NODE_ENV === 'development';

// Export env as default
export default env;