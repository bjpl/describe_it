import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/security/rateLimiter';
import { inputValidator } from '@/lib/security/inputValidation';
import { authenticator } from '@/lib/security/authentication';
import { safeParse } from '@/lib/utils/json-safe';
import {
  errorReportSchema,
  validateSecurityHeaders,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/schemas/api-validation';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Security headers
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-cache, no-store, must-revalidate"
};

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  const ip = forwarded?.split(',')[0]?.trim() || realIP || '127.0.0.1';
  return `${ip}:${userAgent.substring(0, 50)}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getClientIdentifier(request);
  const requestId = crypto.randomUUID();
  
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter.isRateLimited('error-report', identifier);
    
    if (rateLimitResult.limited) {
      apiLogger.warn(`[SECURITY] Error report rate limit exceeded for ${identifier}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          requestId
        },
        { 
          status: 429,
          headers: {
            ...securityHeaders,
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      apiLogger.warn(`[SECURITY] Invalid content type from ${identifier}: ${contentType}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Content-Type must be application/json',
          requestId
        },
        { status: 400, headers: securityHeaders }
      );
    }

    // Parse and validate payload size
    let errorData: any;
    try {
      const text = await request.text();
      
      // Check payload size (max 50KB)
      if (text.length > 50000) {
        apiLogger.warn(`[SECURITY] Oversized error report from ${identifier}: ${text.length} bytes`);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error report too large (max 50KB)',
            requestId
          },
          { status: 413, headers: securityHeaders }
        );
      }

      errorData = safeParse(text);
    } catch (parseError) {
      apiLogger.warn(`[SECURITY] Invalid JSON from ${identifier}:`, asLogContext(parseError));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON payload',
          requestId
        },
        { status: 400, headers: securityHeaders }
      );
    }

    // Enhanced validation using Zod schema
    let validatedData;
    try {
      validatedData = errorReportSchema.parse(errorData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        apiLogger.warn(`[SECURITY] Zod validation failed from ${identifier}:`, error.errors);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid error report format',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            requestId
          },
          { status: 400, headers: securityHeaders }
        );
      }
      throw error;
    }

    // Fallback to existing validation for compatibility
    const validation = inputValidator.validateErrorReport(errorData);
    if (!validation.success) {
      apiLogger.warn(`[SECURITY] Legacy validation failed from ${identifier}: ${validation.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          requestId
        },
        { status: 400, headers: securityHeaders }
      );
    }

    // Use validated data from Zod schema
    const sanitizedData = { ...validatedData, ...validation.sanitizedData };
    
    // Additional security checks
    if (sanitizedData.url) {
      try {
        const urlObj = new URL(sanitizedData.url);
        // Only allow same origin or HTTPS URLs
        if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
          apiLogger.warn(`[SECURITY] Suspicious URL protocol from ${identifier}: ${urlObj.protocol}`);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid URL protocol',
              requestId
            },
            { status: 400, headers: securityHeaders }
          );
        }
      } catch (urlError) {
        apiLogger.warn(`[SECURITY] Invalid URL from ${identifier}:`, asLogContext(urlError));
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid URL format',
            requestId
          },
          { status: 400, headers: securityHeaders }
        );
      }
    }

    // Generate secure error ID
    const errorId = `err_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    
    // Log sanitized error data securely
    apiLogger.error('[ERROR REPORT] Received sanitized error:', {
      errorId,
      requestId,
      timestamp: new Date().toISOString(),
      level: sanitizedData.level,
      message: (sanitizedData.message || '').substring(0, 200), // Truncate for logs
      url: sanitizedData.url,
      userAgent: sanitizedData.userAgent?.substring(0, 100),
      clientIdentifier: identifier.substring(0, 50),
      hasStack: !!sanitizedData.stack,
      hasMetadata: !!sanitizedData.metadata,
      responseTime: Date.now() - startTime
    });

    // Store in secure error tracking system (placeholder)
    // In production, integrate with Sentry, LogRocket, etc.
    // await errorTrackingService.report(sanitizedData, errorId);
    
    // Add CORS headers to response
    const origin = request.headers.get('origin');
    const responseHeaders = {
      ...securityHeaders,
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      'X-Response-Time': `${Date.now() - startTime}ms`
    } as Record<string, string>;

    // Add CORS headers for successful requests
    if (origin) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      let allowedOrigins: string[];
      
      if (isDevelopment) {
        allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
      } else {
        const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
        allowedOrigins = [
          'https://describe-it-lovat.vercel.app',
          ...envOrigins
        ];
      }

      // Check if origin is allowed (same logic as OPTIONS handler)
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin === origin) return true;
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '[^.]*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        if (origin.match(/^https:\/\/describe-[a-zA-Z0-9-]+\.vercel\.app$/)) {
          return allowedOrigins.includes('https://describe-*.vercel.app') ||
                 allowedOrigins.includes('https://*.vercel.app');
        }
        return false;
      });

      if ((isDevelopment && origin.includes('localhost')) || (!isDevelopment && isAllowed)) {
        responseHeaders['Access-Control-Allow-Origin'] = origin;
        responseHeaders['Access-Control-Allow-Credentials'] = 'true';
        responseHeaders['Vary'] = 'Origin';
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Error reported successfully',
        errorId,
        requestId
      },
      {
        status: 200,
        headers: responseHeaders
      }
    );
    
  } catch (error) {
    apiLogger.error(`[SECURITY] Error report processing failed for ${identifier}:`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process error report',
        requestId
      },
      { 
        status: 500,
        headers: {
          ...securityHeaders,
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}

// Enhanced CORS preflight handler with Vercel deployment support
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Define allowed origins with proper Vercel support
  let allowedOrigins: string[];
  if (isDevelopment) {
    allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  } else {
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
    allowedOrigins = [
      'https://describe-it-lovat.vercel.app',
      ...envOrigins
    ];
  }
  
  // Enhanced origin matching function
  function isOriginAllowed(requestOrigin: string, allowed: string[]): boolean {
    return allowed.some(allowedOrigin => {
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
        return allowedOrigins.includes('https://describe-*.vercel.app') ||
               allowedOrigins.includes('https://*.vercel.app');
      }
      
      return false;
    });
  }
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };

  // Set CORS headers based on origin validation
  if (isDevelopment && origin?.includes('localhost')) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  } else if (!isDevelopment && origin && isOriginAllowed(origin, allowedOrigins)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  } else if (!origin) {
    // Allow same-origin requests
    corsHeaders['Access-Control-Allow-Origin'] = allowedOrigins[0] || 'null';
  } else {
    // Reject unauthorized origins
    apiLogger.warn(`[SECURITY] CORS preflight rejected for origin: ${origin}`);
    corsHeaders['Access-Control-Allow-Origin'] = 'null';
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      ...securityHeaders,
      ...corsHeaders
    }
  });
}

// Disable other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: securityHeaders }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: securityHeaders }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: securityHeaders }
  );
}