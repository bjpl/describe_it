/**
 * Example Security Configuration
 * 
 * Copy this file to config.ts and update with your actual values
 * Never commit actual secrets to version control
 */

import type { SecurityConfig } from './index';

export const securityConfig: SecurityConfig = {
  // HashiCorp Vault Configuration
  vault: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: process.env.VAULT_ENDPOINT || 'https://vault.your-domain.com',
    token: process.env.VAULT_TOKEN, // For development
    roleId: process.env.VAULT_ROLE_ID, // For production with AppRole
    secretId: process.env.VAULT_SECRET_ID, // For production with AppRole
    namespace: process.env.VAULT_NAMESPACE || 'admin',
  },

  // Encryption Configuration
  encryption: {
    enabled: true,
    algorithm: 'AES-GCM', // Most secure option
    keySize: 256, // 256-bit encryption
  },

  // Key Rotation Configuration
  keyRotation: {
    enabled: process.env.NODE_ENV === 'production',
    schedule: '0 2 * * 0', // Every Sunday at 2 AM UTC
    maxAge: 90, // Rotate keys every 90 days
    gracePeriod: 7, // Keep old keys valid for 7 days
  },

  // Session Management Configuration
  sessions: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    rolling: true, // Extend session on activity
  },

  // Audit Logging Configuration
  audit: {
    enabled: true,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    filename: 'security-audit.log',
  },

  // Redis Configuration (for distributed sessions and rate limiting)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

// Development-only configuration
export const developmentConfig: SecurityConfig = {
  ...securityConfig,
  vault: {
    enabled: false,
    endpoint: securityConfig.vault?.endpoint || 'http://localhost:8200',
    token: securityConfig.vault?.token,
    roleId: securityConfig.vault?.roleId,
    secretId: securityConfig.vault?.secretId,
    namespace: securityConfig.vault?.namespace,
  },
  keyRotation: {
    enabled: false,
    schedule: securityConfig.keyRotation?.schedule || '0 2 * * 0',
    maxAge: securityConfig.keyRotation?.maxAge || 90,
    gracePeriod: securityConfig.keyRotation?.gracePeriod || 7,
  },
  sessions: {
    maxAge: securityConfig.sessions?.maxAge || 24 * 60 * 60 * 1000,
    secure: false,
    rolling: securityConfig.sessions?.rolling ?? true,
  },
  audit: {
    enabled: securityConfig.audit?.enabled ?? true,
    level: 'debug',
    filename: securityConfig.audit?.filename,
  },
};

// Production-only configuration
export const productionConfig: SecurityConfig = {
  ...securityConfig,
  vault: {
    enabled: true,
    endpoint: securityConfig.vault?.endpoint || 'https://vault.production.com',
    token: securityConfig.vault?.token,
    roleId: securityConfig.vault?.roleId,
    secretId: securityConfig.vault?.secretId,
    namespace: securityConfig.vault?.namespace,
  },
  keyRotation: {
    enabled: true,
    schedule: securityConfig.keyRotation?.schedule || '0 2 * * 0',
    maxAge: securityConfig.keyRotation?.maxAge || 90,
    gracePeriod: securityConfig.keyRotation?.gracePeriod || 7,
  },
  sessions: {
    maxAge: 8 * 60 * 60 * 1000,
    secure: true,
    rolling: securityConfig.sessions?.rolling ?? true,
  },
  encryption: {
    enabled: true,
    algorithm: securityConfig.encryption?.algorithm || 'AES-GCM',
    keySize: securityConfig.encryption?.keySize || 256,
  },
};

// Configuration selector based on environment
export function getSecurityConfig(): SecurityConfig {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionConfig;
    case 'development':
      return developmentConfig;
    default:
      return securityConfig;
  }
}

// Validation function to ensure required configuration is present
export function validateSecurityConfig(config: SecurityConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vault validation
  if (config.vault?.enabled) {
    if (!config.vault.endpoint) {
      errors.push('Vault endpoint is required when Vault is enabled');
    }
    if (!config.vault.token && (!config.vault.roleId || !config.vault.secretId)) {
      errors.push('Either Vault token or AppRole credentials (roleId + secretId) are required');
    }
  }

  // Redis validation for production
  if (process.env.NODE_ENV === 'production') {
    if (config.redis && !config.redis.host) {
      errors.push('Redis host is required in production');
    }
    if (config.redis && !config.redis.password) {
      errors.push('Redis password is required in production');
    }
  }

  // Key rotation validation
  if (config.keyRotation?.enabled && !config.vault?.enabled) {
    errors.push('Key rotation requires Vault to be enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Environment variables template
export const REQUIRED_ENV_VARS = {
  // Core encryption (always required)
  ENCRYPTION_KEY: 'Base64-encoded 256-bit encryption key',
  SESSION_SECRET: 'Random string for session signing',

  // Vault configuration (production)
  VAULT_ENDPOINT: 'https://vault.your-domain.com',
  VAULT_TOKEN: 'hvs.your-vault-token (development only)',
  VAULT_ROLE_ID: 'your-role-id (production)',
  VAULT_SECRET_ID: 'your-secret-id (production)',
  VAULT_NAMESPACE: 'admin (optional)',

  // Redis configuration (production)
  REDIS_HOST: 'redis.your-domain.com',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: 'your-redis-password',
  REDIS_DB: '0',

  // Fallback API keys (when not using Vault)
  OPENAI_API_KEY: 'sk-your-openai-key',
  ANTHROPIC_API_KEY: 'sk-ant-your-anthropic-key',
  GOOGLE_API_KEY: 'your-google-api-key',
};

// Helper function to generate example environment file
export function generateEnvExample(): string {
  return Object.entries(REQUIRED_ENV_VARS)
    .map(([key, description]) => `# ${description}\n${key}=`)
    .join('\n\n');
}

// Helper function to check if all required environment variables are set
export function checkRequiredEnvVars(): { missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];

  for (const envVar of Object.keys(REQUIRED_ENV_VARS)) {
    if (process.env[envVar]) {
      present.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  return { missing, present };
}