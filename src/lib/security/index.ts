// Export all security components
export * from './vault-client';
export * from './secrets-manager';
export * from './encryption';
export * from './key-rotation';
export * from './session-manager';
export * from './audit-logger';

// Security configuration types
export interface SecurityConfig {
  vault?: {
    enabled: boolean;
    endpoint: string;
    token?: string;
    roleId?: string;
    secretId?: string;
    namespace?: string;
  };
  encryption?: {
    enabled: boolean;
    algorithm?: 'AES-GCM' | 'AES-CBC';
    keySize?: 128 | 192 | 256;
  };
  keyRotation?: {
    enabled: boolean;
    schedule: string;
    maxAge: number;
    gracePeriod: number;
  };
  sessions?: {
    maxAge: number;
    secure: boolean;
    rolling: boolean;
  };
  audit?: {
    enabled: boolean;
    level: string;
    filename?: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  vault: {
    enabled: false,
    endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
    token: process.env.VAULT_TOKEN,
    roleId: process.env.VAULT_ROLE_ID,
    secretId: process.env.VAULT_SECRET_ID,
    namespace: process.env.VAULT_NAMESPACE,
  },
  encryption: {
    enabled: true,
    algorithm: 'AES-GCM',
    keySize: 256,
  },
  keyRotation: {
    enabled: false,
    schedule: '0 2 * * 0', // Weekly at 2 AM Sunday
    maxAge: 90, // 90 days
    gracePeriod: 7, // 7 days
  },
  sessions: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    rolling: true,
  },
  audit: {
    enabled: true,
    level: 'info',
    filename: 'security-audit.log',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

// Security middleware types for Next.js API routes
export interface SecureRequest extends Request {
  session?: import('./session-manager').SessionData;
  user?: {
    id: string;
    email?: string;
    roles?: string[];
  };
  audit?: (action: string, metadata?: Record<string, any>) => void;
}

export interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requireRoles?: string[];
  enableCsrf?: boolean;
  enableRateLimit?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

// API key validation interface
export interface ApiKeyValidation {
  isValid: boolean;
  provider?: 'openai' | 'anthropic' | 'google';
  usage?: {
    remaining?: number;
    limit?: number;
    resetDate?: Date;
  };
  permissions?: string[];
}

// Zero-trust model interfaces
export interface ZeroTrustRequest {
  userId?: string;
  sessionId?: string;
  clientFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: 'web' | 'mobile' | 'api';
}

export interface ZeroTrustValidation {
  trust: 'full' | 'partial' | 'none';
  reasons: string[];
  requiresAdditionalAuth?: boolean;
  allowedOperations?: string[];
}

// Security event types
export interface SecurityEvent {
  type: 'auth' | 'access' | 'key_operation' | 'vault_operation' | 'session' | 'encryption';
  action: string;
  userId?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Secure proxy configuration
export interface ProxyConfig {
  target: string;
  timeout: number;
  retries: number;
  keyValidation: boolean;
  encryption: boolean;
  auditLogging: boolean;
}