import { securityLogger } from '@/lib/logger';

/**
 * Environment Configuration and Security Settings
 * Manages environment-specific security configurations
 */

export interface SecurityConfig {
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
    methods: string[];
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  authentication: {
    debugEndpoint: {
      enabled: boolean;
      requiredInProduction: boolean;
    };
    apiKeys: {
      enabled: boolean;
      validKeys: string[];
    };
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    includeStack: boolean;
    includeSensitiveData: boolean;
  };
}

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: SecurityConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private loadConfiguration(): SecurityConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      cors: {
        allowedOrigins: isDevelopment 
          ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
          : (process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || []),
        credentials: !isProduction, // Only allow credentials in non-production
        methods: ['GET', 'POST', 'OPTIONS', 'HEAD']
      },
      rateLimit: {
        enabled: true,
        windowMs: isDevelopment ? 60000 : 15000, // 1 minute in dev, 15 seconds in prod
        maxRequests: isDevelopment ? 1000 : 100
      },
      authentication: {
        debugEndpoint: {
          enabled: isDevelopment || !!process.env.DEBUG_ENDPOINT_ENABLED,
          requiredInProduction: isProduction
        },
        apiKeys: {
          enabled: !!process.env.VALID_API_KEYS,
          validKeys: (process.env.VALID_API_KEYS?.split(',').filter(Boolean) || [])
        }
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || (isDevelopment ? 'debug' : 'warn'),
        includeStack: isDevelopment,
        includeSensitiveData: false // Never include sensitive data
      }
    };
  }

  getConfig(): SecurityConfig {
    return { ...this.config }; // Return a copy to prevent mutations
  }

  getCorsOrigins(): string[] {
    return [...this.config.cors.allowedOrigins];
  }

  isDebugEnabled(): boolean {
    return this.config.authentication.debugEndpoint.enabled;
  }

  isRateLimitEnabled(): boolean {
    return this.config.rateLimit.enabled;
  }

  getLogLevel(): string {
    return this.config.logging.level;
  }

  // Validate environment configuration
  validateConfiguration(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const isProduction = process.env.NODE_ENV === 'production';

    // Check production-specific requirements
    if (isProduction) {
      if (!process.env.API_SECRET_KEY) {
        issues.push('API_SECRET_KEY is required in production');
      }

      if (this.config.cors.allowedOrigins.length === 0) {
        issues.push('ALLOWED_ORIGINS must be configured in production');
      }

      if (this.config.authentication.debugEndpoint.enabled && !process.env.DEBUG_ALLOWED_IPS) {
        issues.push('DEBUG_ALLOWED_IPS should be configured if debug endpoint is enabled in production');
      }

      if (!process.env.JWT_SECRET) {
        issues.push('JWT_SECRET is recommended for production API authentication');
      }
    }

    // Check CORS configuration
    for (const origin of this.config.cors.allowedOrigins) {
      try {
        new URL(origin);
      } catch {
        issues.push(`Invalid CORS origin: ${origin}`);
      }
    }

    // Check rate limiting
    if (this.config.rateLimit.maxRequests <= 0) {
      issues.push('Rate limit maxRequests must be positive');
    }

    if (this.config.rateLimit.windowMs <= 0) {
      issues.push('Rate limit windowMs must be positive');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Get security headers based on environment
  getSecurityHeaders(request?: { headers: Headers }): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    // Add CSP in production
    if (process.env.NODE_ENV === 'production') {
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.unsplash.com",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
    }

    // Add HSTS in production with HTTPS
    if (process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }

    return headers;
  }
}

// Export singleton instance
export const environmentConfig = EnvironmentConfig.getInstance();

// Validate configuration on load
const validation = environmentConfig.validateConfiguration();
if (!validation.valid) {
  securityLogger.warn('[SECURITY] Environment configuration issues:', validation.issues);
  
  // In production, these should be treated as errors
  if (process.env.NODE_ENV === 'production') {
    securityLogger.error('[SECURITY] Critical configuration issues in production environment');
    // In a real application, you might want to exit the process
    // process.exit(1);
  }
}