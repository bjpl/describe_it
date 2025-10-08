/**
 * API Security Module
 * Handles secure API key management, rate limiting, and request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { env, isDevelopment } from '@/config/env';
import { securityLogger } from '@/lib/logger';

// Rate limiting configuration
const RATE_LIMITS = {
  openai: {
    requests: env?.OPENAI_RATE_LIMIT_PER_MINUTE ?? 60,
    window: 60 * 1000, // 1 minute
  },
  unsplash: {
    requests: 50,
    window: 60 * 60 * 1000, // 1 hour
  },
  general: {
    requests: 100,
    window: 15 * 60 * 1000, // 15 minutes
  },
};

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 */
export function rateLimit(
  key: string,
  limit: { requests: number; window: number }
): { success: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.window,
    });
    return { success: true };
  }

  if (entry.count >= limit.requests) {
    // Rate limit exceeded
    return { success: false, resetTime: entry.resetTime };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  return { success: true };
}

/**
 * Get client identifier for rate limiting
 */
export function getClientId(request: NextRequest): string {
  // In development, use a fixed identifier
  if (isDevelopment()) {
    return 'dev-client';
  }

  // Use IP address or user agent hash
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return `${ip}-${Buffer.from(userAgent).toString('base64').slice(0, 8)}`;
}

/**
 * Validate API request
 */
export function validateApiRequest(request: NextRequest): {
  isValid: boolean;
  error?: string;
} {
  // Check content type for POST/PUT requests
  if (request.method === 'POST' || request.method === 'PUT') {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        isValid: false,
        error: 'Content-Type must be application/json',
      };
    }
  }

  // Validate origin in production
  if (!isDevelopment) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    if (origin && host && !origin.includes(host)) {
      return {
        isValid: false,
        error: 'Invalid origin',
      };
    }
  }

  return { isValid: true };
}

/**
 * API Security middleware wrapper
 */
export function withApiSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: 'openai' | 'unsplash' | 'general';
    requireAuth?: boolean;
  } = {}
) {
  return async (request: NextRequest) => {
    // Validate request
    const validation = validateApiRequest(request);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Apply rate limiting
    if (options.rateLimit) {
      const clientId = getClientId(request);
      const limit = RATE_LIMITS[options.rateLimit];
      const rateLimitKey = `${options.rateLimit}-${clientId}`;
      
      const rateLimitResult = rateLimit(rateLimitKey, limit);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            resetTime: rateLimitResult.resetTime 
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)),
            }
          }
        );
      }
    }

    // Add security headers
    const response = await handler(request);
    
    // Add security headers to response
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    if (!isDevelopment) {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
  };
}

/**
 * Secure API key management
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager;
  
  private constructor() {}
  
  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  /**
   * Get OpenAI API key securely
   */
  getOpenAIKey(): string | null {
    if (!env?.OPENAI_API_KEY) {
      securityLogger.warn('OpenAI API key not configured - demo mode active');
      return null;
    }
    
    return env.OPENAI_API_KEY;
  }

  /**
   * Get Unsplash API key securely
   */
  getUnsplashKey(): string | null {
    if (!env?.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
      securityLogger.warn('Unsplash API key not configured - demo mode active');
      return null;
    }
    
    return env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  }

  /**
   * Validate API key format
   */
  validateKeyFormat(key: string, type: 'openai' | 'unsplash'): boolean {
    if (!key) return false;
    
    switch (type) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'unsplash':
        return key.length === 43 || key.length === 32; // API key or Access key
      default:
        return false;
    }
  }

  /**
   * Mask API key for logging
   */
  maskKey(key: string): string {
    if (!key || key.length < 8) return '***';
    return key.slice(0, 4) + '***' + key.slice(-4);
  }
}

// Export singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();

/**
 * CORS configuration for API routes
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': isDevelopment() ? '*' : 'same-origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Input sanitization
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Error logging without exposing sensitive information
 */
export function logSecureError(error: any, context: string): void {
  const sanitizedError = {
    message: error.message || 'Unknown error',
    code: error.code || 'UNKNOWN',
    status: error.status || 500,
    context,
    timestamp: new Date().toISOString(),
  };

  // Don't log full error details in production
  if (isDevelopment()) {
    securityLogger.error('Secure Error Log:', sanitizedError, error.stack);
  } else {
    securityLogger.error('Secure Error Log:', sanitizedError);
  }
}

const apiSecurity = {
  rateLimit,
  withApiSecurity,
  apiKeyManager,
  corsHeaders,
  handleCorsPreflight,
  sanitizeInput,
  logSecureError,
};

export default apiSecurity;