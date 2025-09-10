import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "@/lib/security/authentication";
import { rateLimiter } from "@/lib/security/rateLimiter";
import { inputValidator } from "@/lib/security/inputValidation";

// Force dynamic rendering and add security headers
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Security headers for debug endpoint
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  const ip = forwarded?.split(',')[0]?.trim() || realIP || '127.0.0.1';
  return `${ip}:${userAgent.substring(0, 50)}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const identifier = getClientIdentifier(request);
  
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter.isRateLimited('debug', identifier);
    
    if (rateLimitResult.limited) {
      console.warn(`[SECURITY] Debug endpoint rate limit exceeded for ${identifier}`);
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            ...securityHeaders,
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    // Validate input parameters
    const paramValidation = inputValidator.validateDebugParams(request.nextUrl.searchParams);
    if (!paramValidation.success) {
      console.warn(`[SECURITY] Invalid debug parameters from ${identifier}: ${paramValidation.error}`);
      return NextResponse.json(
        { error: paramValidation.error },
        { status: 400, headers: securityHeaders }
      );
    }

    // Authenticate access
    const authResult = await authenticator.authenticateDebugAccess(request);
    if (!authResult.authenticated) {
      console.warn(`[SECURITY] Unauthorized debug access attempt from ${identifier}: ${authResult.reason}`);
      return NextResponse.json(
        { error: 'Access denied', reason: authResult.reason },
        { status: 403, headers: securityHeaders }
      );
    }

    console.info(`[SECURITY] Authorized debug access for user ${authResult.userId} from ${identifier}`);

    // Generate secure response with minimal information disclosure
    const responseData = {
      environment: process.env.NODE_ENV,
      serviceStatus: {
        unsplash: {
          configured: !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || !!process.env.UNSPLASH_ACCESS_KEY,
          publicKeyLength: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY?.length || 0,
          serverKeyLength: process.env.UNSPLASH_ACCESS_KEY?.length || 0
        },
        openai: {
          configured: !!process.env.OPENAI_API_KEY
        },
        supabase: {
          configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      },
      security: {
        rateLimitRemaining: rateLimitResult.remaining,
        rateLimitReset: rateLimitResult.resetTime
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        responseTime: Date.now() - startTime,
        authenticatedUser: authResult.userId
      }
    };

    return NextResponse.json(responseData, {
      headers: {
        ...securityHeaders,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error(`[SECURITY] Debug endpoint error for ${identifier}:`, error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId: crypto.randomUUID()
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

// Disable other HTTP methods
export async function POST() {
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