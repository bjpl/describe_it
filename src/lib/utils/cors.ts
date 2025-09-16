/**
 * Centralized CORS utility for consistent origin handling across all API routes
 */

// Type definitions
export interface CorsHeaders {
  'Access-Control-Allow-Origin'?: string;
  'Access-Control-Allow-Credentials'?: string;
  'Access-Control-Allow-Methods'?: string;
  'Access-Control-Allow-Headers'?: string;
  'Access-Control-Max-Age'?: string;
  'Vary'?: string;
}

export interface CorsConfig {
  allowCredentials?: boolean;
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}

/**
 * Get allowed origins based on environment with Vercel deployment support
 */
export function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'https://localhost:3000' // Support HTTPS in development
    ];
  }
  
  // Production origins with comprehensive Vercel support
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const productionOrigins = [
    'https://describe-it-lovat.vercel.app',
    'https://describe-*.vercel.app', // Wildcard for preview deployments
    'https://*.vercel.app' // Broader Vercel support
  ];
  
  if (envOrigins) {
    const customOrigins = envOrigins.split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
      .filter(origin => {
        // Validate origin format
        try {
          new URL(origin);
          return true;
        } catch {
          console.warn(`[CORS] Invalid origin format: ${origin}`);
          return false;
        }
      });
    return [...new Set([...productionOrigins, ...customOrigins])];
  }
  
  // Add app URL if specified
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_APP_URL);
      productionOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
    } catch {
      console.warn(`[CORS] Invalid NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    }
  }
  
  return [...new Set(productionOrigins)];
}

/**
 * Check if an origin is allowed with comprehensive wildcard support
 */
export function isOriginAllowed(requestOrigin: string, allowedOrigins: string[] = getAllowedOrigins()): boolean {
  if (!requestOrigin) return false;
  
  // Validate origin format
  try {
    new URL(requestOrigin);
  } catch {
    console.warn(`[CORS] Invalid request origin format: ${requestOrigin}`);
    return false;
  }
  
  return allowedOrigins.some(allowedOrigin => {
    // Exact match
    if (allowedOrigin === requestOrigin) return true;
    
    // Wildcard support for Vercel deployments
    if (allowedOrigin.includes('*')) {
      // More robust wildcard pattern matching
      const escapedPattern = allowedOrigin
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\*/g, '[a-zA-Z0-9-]*'); // Replace * with alphanumeric pattern
      
      const regex = new RegExp(`^${escapedPattern}$`);
      return regex.test(requestOrigin);
    }
    
    // Explicit support for Vercel preview deployments
    if (requestOrigin.match(/^https:\/\/[a-zA-Z0-9-]+(-[a-zA-Z0-9-]*)*\.vercel\.app$/)) {
      return allowedOrigins.some(allowed => 
        allowed === 'https://describe-*.vercel.app' ||
        allowed === 'https://*.vercel.app' ||
        allowed.includes('*.vercel.app')
      );
    }
    
    return false;
  });
}

/**
 * Generate CORS headers for a request with enhanced security
 */
export function getCorsHeaders(
  requestOrigin: string | null,
  config: CorsConfig = {}
): CorsHeaders {
  const {
    allowCredentials = true,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'If-None-Match',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-API-Key'
    ],
    maxAge = 86400
  } = config;

  const headers: CorsHeaders = {
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': maxAge.toString(),
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
  };

  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = getAllowedOrigins();

  // Enhanced origin handling with security logging
  if (isDevelopment && requestOrigin?.includes('localhost')) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    if (allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    console.log(`[CORS] Development request from: ${requestOrigin}`);
  } else if (!isDevelopment && requestOrigin && isOriginAllowed(requestOrigin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    if (allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    console.log(`[CORS] Production request allowed from: ${requestOrigin}`);
  } else if (!requestOrigin) {
    // Handle same-origin requests
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0] || 'null';
    console.log(`[CORS] Same-origin request (no origin header)`);
  } else {
    // Reject unauthorized origins with detailed logging
    headers['Access-Control-Allow-Origin'] = 'null';
    
    console.warn(`[SECURITY] CORS request rejected`, {
      origin: requestOrigin,
      allowedOrigins,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  }

  return headers;
}

/**
 * Create a CORS preflight response
 */
export function createCorsPreflightResponse(requestOrigin: string | null, config?: CorsConfig): Response {
  const headers = getCorsHeaders(requestOrigin, config);
  
  // If origin is not allowed, return 403
  if (headers['Access-Control-Allow-Origin'] === 'null' && requestOrigin) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 200,
    headers: headers as HeadersInit
  });
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(response: Response, requestOrigin: string | null, config?: CorsConfig): Response {
  const corsHeaders = getCorsHeaders(requestOrigin, config);
  
  // Create new response with CORS headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) {
      newResponse.headers.set(key, value);
    }
  });

  return newResponse;
}

/**
 * Validate CORS request and get headers
 */
export function validateCorsRequest(request: Request): {
  isValid: boolean;
  headers: CorsHeaders;
  origin: string | null;
} {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  const isValid = headers['Access-Control-Allow-Origin'] !== 'null';

  return {
    isValid,
    headers,
    origin
  };
}

// Rate limit configuration for different origins
export function getRateLimitForOrigin(origin: string | null): {
  maxRequests: number;
  windowMs: number;
} {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // More permissive limits for development
  if (isDevelopment) {
    return {
      maxRequests: 1000,
      windowMs: 15 * 60 * 1000 // 15 minutes
    };
  }

  // Production rate limits
  if (origin && isOriginAllowed(origin)) {
    return {
      maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') // 15 minutes
    };
  }

  // Stricter limits for unknown origins
  return {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000 // 15 minutes
  };
}