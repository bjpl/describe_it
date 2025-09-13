/**
 * Security Authentication Module
 * Implements secure authentication mechanisms for API endpoints
 */

import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';

export interface AuthResult {
  authenticated: boolean;
  reason?: string;
  userId?: string;
  permissions?: string[];
}

export class SecurityAuthenticator {
  private readonly prodSecret = process.env.API_SECRET_KEY;
  private readonly devSecret = process.env.DEV_API_KEY || 'dev-secret-key';
  private readonly jwtSecret = process.env.JWT_SECRET;
  
  constructor() {
    if (process.env.NODE_ENV === 'production' && !this.prodSecret) {
      console.warn('[SECURITY] Production API secret not configured - this is a security risk');
    }
  }

  /**
   * Authenticate debug endpoint access
   * Uses multiple authentication factors in production
   */
  async authenticateDebugAccess(request: NextRequest): Promise<AuthResult> {
    // Block completely in production without proper setup
    if (process.env.NODE_ENV === 'production') {
      if (!this.prodSecret) {
        return {
          authenticated: false,
          reason: 'Debug endpoint disabled in production without proper authentication'
        };
      }

      // Require multiple authentication factors in production
      const authHeader = request.headers.get('Authorization');
      const secretParam = request.nextUrl.searchParams.get('debug_token');
      const ipAddress = this.getClientIP(request);

      // Check IP allowlist in production
      const allowedIPs = (process.env.DEBUG_ALLOWED_IPS || '').split(',').filter(ip => ip.trim());
      if (allowedIPs.length > 0 && !allowedIPs.includes(ipAddress)) {
        return {
          authenticated: false,
          reason: 'IP address not in allowlist for debug access'
        };
      }

      // Verify authentication token
      if (!authHeader || !authHeader.startsWith('Bearer ') || !secretParam) {
        return {
          authenticated: false,
          reason: 'Missing authentication credentials'
        };
      }

      const token = authHeader.substring(7);
      if (!this.verifyDebugToken(token, secretParam)) {
        return {
          authenticated: false,
          reason: 'Invalid authentication token'
        };
      }

      return {
        authenticated: true,
        permissions: ['debug:read'],
        userId: 'debug-user'
      };
    }

    // Development environment - still require some authentication
    const devToken = request.nextUrl.searchParams.get('dev_token');
    if (devToken !== this.devSecret) {
      return {
        authenticated: false,
        reason: 'Invalid development token'
      };
    }

    return {
      authenticated: true,
      permissions: ['debug:read'],
      userId: 'dev-user'
    };
  }

  /**
   * Authenticate API access with JWT or API key
   */
  async authenticateAPIAccess(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get('Authorization');
    const apiKey = request.headers.get('X-API-Key');

    // Try JWT authentication first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtResult = await this.verifyJWT(token);
      if (jwtResult.authenticated) {
        return jwtResult;
      }
    }

    // Try API key authentication
    if (apiKey) {
      return this.verifyAPIKey(apiKey);
    }

    return {
      authenticated: false,
      reason: 'No valid authentication provided'
    };
  }

  /**
   * Verify debug token using HMAC
   */
  private verifyDebugToken(token: string, challenge: string): boolean {
    if (!this.prodSecret) return false;

    try {
      const expectedToken = createHmac('sha256', this.prodSecret)
        .update(challenge + ':debug')
        .digest('hex');

      const tokenBuffer = Buffer.from(token, 'hex');
      const expectedBuffer = Buffer.from(expectedToken, 'hex');

      return tokenBuffer.length === expectedBuffer.length && 
             timingSafeEqual(tokenBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Verify JWT token
   */
  private async verifyJWT(token: string): Promise<AuthResult> {
    if (!this.jwtSecret) {
      return {
        authenticated: false,
        reason: 'JWT verification not configured'
      };
    }

    try {
      // Use the proper jsonwebtoken library for secure JWT verification
      const decodedPayload = jwt.verify(token, this.jwtSecret) as any;

      // Token is valid if we reach here (verify throws on invalid/expired tokens)
      return {
        authenticated: true,
        userId: decodedPayload.sub || decodedPayload.userId,
        permissions: decodedPayload.permissions || []
      };
    } catch (error) {
      let reason = 'JWT token verification failed';
      
      if (error instanceof jwt.TokenExpiredError) {
        reason = 'JWT token expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        reason = 'Invalid JWT token';
      } else if (error instanceof jwt.NotBeforeError) {
        reason = 'JWT token not yet valid';
      }
      
      return {
        authenticated: false,
        reason
      };
    }
  }

  /**
   * Verify API key
   */
  private verifyAPIKey(apiKey: string): AuthResult {
    const validAPIKeys = (process.env.VALID_API_KEYS || '').split(',').filter(k => k.trim());
    
    if (validAPIKeys.length === 0) {
      return {
        authenticated: false,
        reason: 'API key authentication not configured'
      };
    }

    if (validAPIKeys.includes(apiKey)) {
      return {
        authenticated: true,
        userId: `api-key-${apiKey.substring(0, 8)}`,
        permissions: ['api:access']
      };
    }

    return {
      authenticated: false,
      reason: 'Invalid API key'
    };
  }

  /**
   * Get client IP address with proxy support
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP.trim();
    }

    // Fallback for development/testing
    return '127.0.0.1';
  }

  /**
   * Generate debug token for testing
   */
  generateDebugToken(challenge: string): string | null {
    if (!this.prodSecret) return null;

    return createHmac('sha256', this.prodSecret)
      .update(challenge + ':debug')
      .digest('hex');
  }
}

// Export singleton instance
export const authenticator = new SecurityAuthenticator();