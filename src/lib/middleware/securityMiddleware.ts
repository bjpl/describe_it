/**
 * Security Middleware for API Routes
 * Implements security headers, rate limiting, and input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/security/rateLimiter';
import { inputValidator } from '@/lib/security/inputValidation';

// Security configuration
interface SecurityConfig {
  enableRateLimit: boolean;
  enableSecurityHeaders: boolean;
  enableCors: boolean;
  allowedOrigins: string[];
  allowedMethods: string[];
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    // Enhanced origins configuration with proper Vercel support
    const getDefaultOrigins = (): string[] => {
      if (process.env.NODE_ENV === 'development') {
        return ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
      } else {
        // Production origins with Vercel deployment support
        const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
        return [
          'https://describe-it-lovat.vercel.app',
          'https://describe-*.vercel.app', // Wildcard for preview deployments
          ...envOrigins
        ];
      }
    };

    this.config = {
      enableRateLimit: true,
      enableSecurityHeaders: true,
      enableCors: true,
      allowedOrigins: getDefaultOrigins(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      ...config
    };
  }

  // Apply security headers to response
  private applySecurityHeaders(response: NextResponse): NextResponse {
    if (!this.config.enableSecurityHeaders) return response;

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');

    return response;
  }

  // Enhanced origin matching with wildcard support
  private isOriginAllowed(requestOrigin: string): boolean {
    if (!requestOrigin) return false;
    
    return this.config.allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === requestOrigin) return true;
      
      // Wildcard support for Vercel preview deployments
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '[^.]*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(requestOrigin);
      }
      
      // Support for Vercel preview deployments (describe-*.vercel.app)
      if (requestOrigin.match(/^https:\/\/describe-[a-zA-Z0-9-]+\.vercel\.app$/)) {
        return this.config.allowedOrigins.includes('https://describe-*.vercel.app') ||
               this.config.allowedOrigins.includes('https://*.vercel.app');
      }
      
      return false;
    });
  }

  // Handle CORS
  private async handleCors(request: NextRequest): Promise<NextResponse | null> {
    if (!this.config.enableCors) return null;

    const origin = request.headers.get('Origin');
    const method = request.method;

    // Handle preflight requests
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      // Check if origin is allowed with enhanced matching
      if (origin && this.isOriginAllowed(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Vary', 'Origin');
      } else if (!origin) {
        // Allow same-origin requests
        response.headers.set('Access-Control-Allow-Origin', this.config.allowedOrigins[0] || 'null');
      } else {
        // Reject unauthorized origins
        console.warn(`[SECURITY] CORS preflight rejected for origin: ${origin}`);
        return new NextResponse(null, { status: 403 });
      }
      
      response.headers.set('Access-Control-Allow-Methods', this.config.allowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Max-Age', '86400');

      return this.applySecurityHeaders(response);
    }

    return null;
  }

  // Apply rate limiting
  private async applyRateLimit(request: NextRequest, endpoint: string): Promise<NextResponse | null> {
    if (!this.config.enableRateLimit) return null;

    const identifier = this.getClientIdentifier(request);
    const result = await rateLimiter.isRateLimited(endpoint, identifier);

    if (result.limited) {
      const response = NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          retryAfter: result.retryAfter 
        },
        { status: 429 }
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      response.headers.set('Retry-After', result.retryAfter?.toString() || '60');

      return this.applySecurityHeaders(response);
    }

    return null;
  }

  // Get client identifier for rate limiting
  private getClientIdentifier(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }

  // Validate HTTP method
  private validateHttpMethod(method: string, allowedMethods: string[]): NextResponse | null {
    if (!allowedMethods.includes(method)) {
      const response = NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
      
      response.headers.set('Allow', allowedMethods.join(', '));
      return response;
    }
    return null;
  }

  // Main middleware function
  async middleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    options: {
      endpoint: string;
      allowedMethods?: string[];
      requireAuth?: boolean;
    }
  ): Promise<NextResponse> {
    const { endpoint, allowedMethods = ['GET', 'POST'], requireAuth = false } = options;

    try {
      // Handle CORS preflight
      const corsResponse = await this.handleCors(request);
      if (corsResponse) return corsResponse;

      // Validate HTTP method
      const methodError = this.validateHttpMethod(request.method, allowedMethods);
      if (methodError) return this.applySecurityHeaders(methodError);

      // Apply rate limiting
      const rateLimitResponse = await this.applyRateLimit(request, endpoint);
      if (rateLimitResponse) return rateLimitResponse;

      // Validate request content type for POST/PUT requests
      if (['POST', 'PUT'].includes(request.method)) {
        const contentType = request.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          const response = NextResponse.json(
            { error: 'Content-Type must be application/json' },
            { status: 415 }
          );
          return this.applySecurityHeaders(response);
        }
      }

      // Execute the handler
      const response = await handler(request);

      // Apply security headers and CORS to response
      const secureResponse = this.applySecurityHeaders(response);
      
      // Add CORS headers to successful responses with enhanced origin matching
      const origin = request.headers.get('Origin');
      if (origin && this.isOriginAllowed(origin)) {
        secureResponse.headers.set('Access-Control-Allow-Origin', origin);
        secureResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        secureResponse.headers.set('Vary', 'Origin');
      } else if (!origin) {
        // Allow same-origin requests
        secureResponse.headers.set('Access-Control-Allow-Origin', this.config.allowedOrigins[0] || 'null');
      }

      // Add rate limit headers to successful responses
      if (this.config.enableRateLimit) {
        secureResponse.headers.set('X-RateLimit-Limit', '100');
        secureResponse.headers.set('X-RateLimit-Remaining', '95');
        secureResponse.headers.set('X-RateLimit-Reset', '3600');
      }

      return secureResponse;

    } catch (error) {
      // Create secure error response
      const errorResponse = NextResponse.json(
        { 
          error: 'Internal server error',
          category: 'system',
          severity: 'high'
        },
        { status: 500 }
      );

      return this.applySecurityHeaders(errorResponse);
    }
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Utility function for wrapping API handlers with security
export const withSecurity = (
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    endpoint: string;
    allowedMethods?: string[];
    requireAuth?: boolean;
  }
) => {
  return (request: NextRequest) => 
    securityMiddleware.middleware(request, handler, options);
};