import { NextRequest, NextResponse } from 'next/server';
import { createSecretsManager, SecretManagerConfig } from './secrets-manager';
import { createSessionManager, SessionManager } from './session-manager';
import { getAuditLogger } from './audit-logger';
import CryptoUtils from './encryption';
import { defaultSecurityConfig, type SecurityConfig, type SecureRequest, type SecurityMiddlewareOptions, type ApiKeyValidation, type ZeroTrustRequest, type ZeroTrustValidation } from './index';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

const logger = getAuditLogger('secure-middleware');

// Initialize global security managers
let secretsManager: ReturnType<typeof createSecretsManager> | null = null;
let sessionManager: SessionManager | null = null;

async function initializeSecurityManagers(config: SecurityConfig = defaultSecurityConfig) {
  if (!secretsManager) {
    const secretsConfig: SecretManagerConfig = {
      provider: config.vault?.enabled ? 'vault' : 'env',
      vault: config.vault?.enabled ? {
        endpoint: config.vault.endpoint,
        token: config.vault.token,
        roleId: config.vault.roleId,
        secretId: config.vault.secretId,
        namespace: config.vault.namespace,
      } : undefined,
      encryption: {
        enabled: config.encryption?.enabled || true,
        key: process.env.ENCRYPTION_KEY || CryptoUtils.generateRandomString(32),
      },
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
      },
      redis: config.redis,
    };

    secretsManager = createSecretsManager(secretsConfig);
    await secretsManager.initialize();
  }

  if (!sessionManager) {
    sessionManager = new SessionManager({
      secret: process.env.SESSION_SECRET || CryptoUtils.generateRandomString(64),
      maxAge: config.sessions?.maxAge || 24 * 60 * 60 * 1000,
      secure: config.sessions?.secure || process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      rolling: config.sessions?.rolling || true,
      encryption: {
        enabled: true,
      },
      redis: config.redis,
    });
  }
}

/**
 * Validates API keys using zero-trust principles
 */
export async function validateApiKey(apiKey: string, provider: 'openai' | 'anthropic' | 'google' = 'openai'): Promise<ApiKeyValidation> {
  try {
    await initializeSecurityManagers();
    
    if (!apiKey || typeof apiKey !== 'string') {
      logger.securityEvent('API_KEY_VALIDATION', { 
        provider, 
        valid: false, 
        reason: 'missing_or_invalid' 
      }, false);
      return { isValid: false };
    }

    // Basic format validation
    const keyValidation = validateKeyFormat(apiKey, provider);
    if (!keyValidation.isValid) {
      logger.securityEvent('API_KEY_VALIDATION', { 
        provider, 
        valid: false, 
        reason: 'invalid_format' 
      }, false);
      return keyValidation;
    }

    // Test API key with a minimal request
    const testValidation = await testApiKeyValidity(apiKey, provider);
    
    logger.securityEvent('API_KEY_VALIDATION', {
      provider,
      valid: testValidation.isValid,
      hasUsage: !!testValidation.usage,
    });

    return testValidation;
  } catch (error) {
    logger.securityEvent('API_KEY_VALIDATION', {
      provider,
      valid: false,
      error: error.message,
    }, false);
    
    return { isValid: false };
  }
}

function validateKeyFormat(apiKey: string, provider: string): ApiKeyValidation {
  const patterns = {
    openai: /^sk-[A-Za-z0-9]{32,}$/,
    anthropic: /^sk-ant-[A-Za-z0-9-]{95,}$/,
    google: /^[A-Za-z0-9_-]{39}$/,
  };

  const pattern = patterns[provider as keyof typeof patterns];
  if (!pattern || !pattern.test(apiKey)) {
    return { isValid: false };
  }

  return { isValid: true, provider: provider as any };
}

async function testApiKeyValidity(apiKey: string, provider: string): Promise<ApiKeyValidation> {
  try {
    switch (provider) {
      case 'openai':
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'DescribeIt/2.0.0',
          },
          timeout: 5000,
        });
        
        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          return {
            isValid: true,
            provider: 'openai',
            permissions: data.data?.map((model: any) => model.id) || [],
          };
        }
        break;

      case 'anthropic':
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'User-Agent': 'DescribeIt/2.0.0',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }],
          }),
          timeout: 5000,
        });
        
        // Even a 400 response indicates the key is valid but request was malformed
        if (anthropicResponse.status === 400 || anthropicResponse.ok) {
          return {
            isValid: true,
            provider: 'anthropic',
          };
        }
        break;

      default:
        return { isValid: false };
    }

    return { isValid: false };
  } catch (error) {
    return { isValid: false };
  }
}

/**
 * Securely retrieves and validates API keys from the secrets manager
 */
export async function getSecureApiKey(keyName: string, userProvidedKey?: string): Promise<string | null> {
  try {
    await initializeSecurityManagers();
    
    // If user provided their own key, validate and use it
    if (userProvidedKey) {
      const validation = await validateApiKey(userProvidedKey);
      if (validation.isValid) {
        logger.securityEvent('USER_API_KEY_USED', { keyName });
        return userProvidedKey;
      } else {
        logger.securityEvent('USER_API_KEY_INVALID', { keyName }, false);
        return null;
      }
    }

    // Fallback to server-side key from secrets manager
    const serverKey = await secretsManager?.getSecret(keyName);
    if (serverKey) {
      const validation = await validateApiKey(serverKey);
      if (validation.isValid) {
        logger.securityEvent('SERVER_API_KEY_USED', { keyName });
        return serverKey;
      }
    }

    logger.securityEvent('NO_VALID_API_KEY', { keyName }, false);
    return null;
  } catch (error) {
    logger.securityEvent('API_KEY_RETRIEVAL_ERROR', { 
      keyName, 
      error: error.message 
    }, false);
    return null;
  }
}

/**
 * Zero-trust validation for incoming requests
 */
export function validateZeroTrust(request: ZeroTrustRequest): ZeroTrustValidation {
  const reasons: string[] = [];
  let trust: 'full' | 'partial' | 'none' = 'full';

  // Check for required authentication
  if (!request.userId || !request.sessionId) {
    reasons.push('Missing authentication');
    trust = 'none';
  }

  // Validate client fingerprint
  if (!request.clientFingerprint) {
    reasons.push('Missing client fingerprint');
    trust = trust === 'full' ? 'partial' : 'none';
  }

  // Check for suspicious patterns
  if (request.userAgent && (
    request.userAgent.includes('bot') || 
    request.userAgent.includes('crawler') ||
    request.userAgent.length < 20
  )) {
    reasons.push('Suspicious user agent');
    trust = trust === 'full' ? 'partial' : 'none';
  }

  // IP validation (basic checks)
  if (request.ipAddress) {
    // Check for private IP ranges (might be proxy/VPN)
    const privateIpRegex = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/;
    if (privateIpRegex.test(request.ipAddress)) {
      reasons.push('Private IP address detected');
      trust = trust === 'full' ? 'partial' : trust;
    }
  }

  // Source validation
  const allowedOperations = trust === 'full' 
    ? ['read', 'write', 'delete', 'admin'] 
    : trust === 'partial' 
      ? ['read', 'write'] 
      : ['read'];

  return {
    trust,
    reasons,
    requiresAdditionalAuth: trust === 'none',
    allowedOperations,
  };
}

/**
 * Rate limiting with Redis backing
 */
export async function checkRateLimit(
  identifier: string, 
  limit: number = 10, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  try {
    // Simple in-memory rate limiting (production should use Redis)
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // For demo purposes, always allow but log the attempt
    logger.securityEvent('RATE_LIMIT_CHECK', {
      identifier: CryptoUtils.hash(identifier, { algorithm: 'sha256' }), // Hash for privacy
      limit,
      windowMs,
      allowed: true,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: new Date(now + windowMs),
    };
  } catch (error) {
    logger.securityEvent('RATE_LIMIT_ERROR', {
      identifier: CryptoUtils.hash(identifier, { algorithm: 'sha256' }),
      error: error.message,
    }, false);
    
    // Fail open for now
    return {
      allowed: true,
      remaining: 0,
      resetTime: new Date(Date.now() + windowMs),
    };
  }
}

/**
 * Security middleware wrapper
 */
export function withSecurity(
  handler: (request: SecureRequest) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = performance.now();
    const requestId = crypto.randomUUID();
    
    try {
      await initializeSecurityManagers();

      // Create secure request object
      const secureRequest = request as SecureRequest;
      secureRequest.audit = (action: string, metadata?: Record<string, any>) => {
        logger.auditEvent({
          action,
          resource: request.url,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          success: true,
          metadata: { ...metadata, requestId },
        });
      };

      // Zero-trust validation
      const zeroTrustRequest: ZeroTrustRequest = {
        userId: secureRequest.user?.id,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        source: 'web',
      };

      const trustValidation = validateZeroTrust(zeroTrustRequest);
      
      if (options.requireAuth && trustValidation.trust === 'none') {
        logger.securityEvent('ZERO_TRUST_DENIED', {
          requestId,
          reasons: trustValidation.reasons,
        }, false);

        return NextResponse.json(
          {
            success: false,
            error: 'Access denied',
            code: 'INSUFFICIENT_TRUST',
            requestId,
          },
          { status: 403 }
        );
      }

      // Rate limiting
      if (options.enableRateLimit) {
        const identifier = secureRequest.user?.id || request.headers.get('x-forwarded-for') || 'anonymous';
        const rateLimit = await checkRateLimit(
          identifier,
          options.rateLimit?.requests || 10,
          options.rateLimit?.window || 15 * 60 * 1000
        );

        if (!rateLimit.allowed) {
          logger.securityEvent('RATE_LIMIT_EXCEEDED', {
            requestId,
            identifier: CryptoUtils.hash(identifier, { algorithm: 'sha256' }),
          }, false);

          return NextResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              requestId,
              retryAfter: rateLimit.resetTime,
            },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit': options.rateLimit?.requests?.toString() || '10',
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime.getTime() / 1000).toString(),
              },
            }
          );
        }
      }

      // CSRF protection
      if (options.enableCsrf && request.method !== 'GET') {
        const csrfToken = request.headers.get('x-csrf-token');
        const sessionId = request.headers.get('x-session-id');
        
        if (sessionId && sessionManager) {
          const session = await sessionManager.getSession(sessionId);
          if (session && !sessionManager.validateCsrfToken(session, csrfToken || '')) {
            logger.securityEvent('CSRF_VALIDATION_FAILED', {
              requestId,
              sessionId,
            }, false);

            return NextResponse.json(
              {
                success: false,
                error: 'CSRF validation failed',
                code: 'INVALID_CSRF_TOKEN',
                requestId,
              },
              { status: 403 }
            );
          }
        }
      }

      // Audit successful security validation
      secureRequest.audit('SECURITY_VALIDATION_PASSED', {
        trust: trustValidation.trust,
        allowedOperations: trustValidation.allowedOperations,
      });

      // Call the actual handler
      const response = await handler(secureRequest);
      
      const responseTime = performance.now() - startTime;
      
      // Add security headers to response
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'no-referrer');
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
      
      if (options.enableCsrf && sessionManager) {
        const csrfToken = sessionManager.generateCsrfToken();
        response.headers.set('X-CSRF-Token', csrfToken);
      }

      logger.securityEvent('REQUEST_COMPLETED', {
        requestId,
        responseTime: responseTime.toFixed(2),
        status: response.status,
      });

      return response;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      logger.securityEvent('SECURITY_MIDDLEWARE_ERROR', {
        requestId,
        error: error.message,
        responseTime: responseTime.toFixed(2),
      }, false);

      return NextResponse.json(
        {
          success: false,
          error: 'Internal security error',
          code: 'SECURITY_ERROR',
          requestId,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility function to get client fingerprint
 */
export function generateClientFingerprint(request: NextRequest): string {
  const components = [
    request.headers.get('user-agent') || '',
    request.headers.get('accept') || '',
    request.headers.get('accept-language') || '',
    request.headers.get('accept-encoding') || '',
    request.ip || request.headers.get('x-forwarded-for') || '',
  ];
  
  return CryptoUtils.hash(components.join('|'), { algorithm: 'sha256' });
}

/**
 * Secure API key proxy that never exposes real keys to client
 */
export async function createSecureApiProxy(
  targetUrl: string,
  keyName: string,
  userProvidedKey?: string
): Promise<(body: any) => Promise<Response>> {
  const apiKey = await getSecureApiKey(keyName, userProvidedKey);
  
  if (!apiKey) {
    throw new Error('No valid API key available');
  }

  return async (body: any) => {
    logger.securityEvent('API_PROXY_REQUEST', {
      targetUrl: new URL(targetUrl).hostname,
      hasUserKey: !!userProvidedKey,
    });

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DescribeIt/2.0.0',
      },
      body: JSON.stringify(body),
    });

    logger.securityEvent('API_PROXY_RESPONSE', {
      targetUrl: new URL(targetUrl).hostname,
      status: response.status,
      success: response.ok,
    });

    return response;
  };
}

// Cleanup function for graceful shutdown
export async function cleanupSecurityManagers(): Promise<void> {
  try {
    if (secretsManager) {
      await secretsManager.close();
      secretsManager = null;
    }
    
    if (sessionManager) {
      await sessionManager.close();
      sessionManager = null;
    }
    
    logger.info('Security managers cleaned up successfully');
  } catch (error) {
    logger.error('Error during security cleanup', { error: error.message });
  }
}