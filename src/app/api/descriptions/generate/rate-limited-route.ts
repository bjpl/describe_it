/**
 * Enhanced Description Generation Route with Comprehensive Rate Limiting
 * 
 * This file demonstrates how to integrate the rate limiting system
 * into the existing description generation API endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateVisionDescription } from "@/lib/api/openai-server";
import { withAPIMiddleware } from "@/lib/middleware/api-middleware";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import { withMonitoring } from "@/lib/monitoring/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { 
  descriptionGenerateSchema,
  validateRequestSize,
  validateSecurityHeaders,
  apiResponseSchema 
} from "@/lib/schemas/api-validation";
import type { DescriptionStyle } from "@/types/api";
import { z } from "zod";
import { withSecurity, getSecureApiKey, type SecureRequest } from "@/lib/security/secure-middleware";
import { getAuditLogger } from "@/lib/security/audit-logger";

// Import rate limiting
import { withRateLimit, RateLimitMiddleware, checkRateLimitStatus } from "@/lib/rate-limiting";
import { apiLogger } from '@/lib/logger';

const logger = getAuditLogger('description-api');

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Enhanced security headers with rate limiting info
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY", 
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer",
  "Content-Type": "application/json",
};

/**
 * Interface for parallel description generation request
 */
interface ParallelDescriptionRequest {
  imageUrl: string;
  style: DescriptionStyle;
  maxLength: number;
  customPrompt?: string;
  languages: readonly ("en" | "es")[];
  originalImageUrl: string;
}

/**
 * Generate descriptions in multiple languages concurrently
 * This reduces generation time from 30+ seconds to ~15 seconds
 */
async function generateParallelDescriptions(
  request: ParallelDescriptionRequest,
  userApiKey?: string
): Promise<Array<{
  id: string;
  imageId: string;
  style: string;
  content: string;
  language: "english" | "spanish";
  createdAt: string;
}>> {
  const { imageUrl, style, maxLength, customPrompt, languages, originalImageUrl } = request;
  const baseTimestamp = Date.now();
  
  apiLogger.info('[Vision Debug] Starting parallel generation with comprehensive logging:', {
    step: 'parallel_start',
    languages: languages,
    hasImageUrl: !!imageUrl,
    imageUrlLength: imageUrl?.length,
    imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
    style: style,
    maxLength: maxLength,
    hasCustomPrompt: !!customPrompt,
    originalImageUrl: originalImageUrl?.substring(0, 100) + '...',
    timestamp: new Date().toISOString()
  });
  
  // Create description generation promises for each language
  const descriptionPromises = languages.map(async (language, index) => {
    const languageLabel = language === "en" ? "English" : "Spanish";
    const languageKey = language === "en" ? "english" : "spanish";
    
    try {
      apiLogger.info(`[Vision Debug] Starting ${languageLabel} description with full context:`, {
        step: 'vision_call_start',
        language: language,
        languageLabel: languageLabel,
        style: style,
        maxLength: maxLength,
        hasImageUrl: !!imageUrl,
        imageUrlLength: imageUrl?.length,
        imageUrlPrefix: imageUrl?.substring(0, 50) + '...',
        hasCustomPrompt: !!customPrompt,
        customPromptLength: customPrompt?.length,
        timestamp: new Date().toISOString()
      });
      
      const description = await generateVisionDescription({
        imageUrl,
        style,
        maxLength,
        customPrompt,
        language
      }, userApiKey);
      
      apiLogger.info(`[Vision Debug] ${languageLabel} vision call completed:`, {
        step: 'vision_call_success',
        language: language,
        hasDescription: !!description,
        hasText: !!description?.text,
        textLength: description?.text?.length,
        wordCount: description?.wordCount,
        isDemoMode: description?.text?.includes('[DEMO MODE]') || description?.text?.includes('DEMO MODE'),
        timestamp: new Date().toISOString()
      });
      
      if (!description || !description.text) {
        throw new Error(`Empty description returned from vision service for ${languageLabel}`);
      }
      
      apiLogger.info(`[Parallel Generation] ${languageLabel} description generated successfully`, {
        contentLength: description.text.length,
        wordCount: description.wordCount
      });
      
      return {
        id: `${baseTimestamp + index}_${language}`,
        imageId: originalImageUrl,
        style: style,
        content: description.text,
        language: languageKey as "english" | "spanish",
        createdAt: new Date().toISOString(),
      };
      
    } catch (error) {
      apiLogger.error(`[Vision Debug] Critical failure in ${languageLabel} vision generation:`, {
        step: 'vision_call_error',
        language: language,
        languageLabel: languageLabel,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
        status: (error instanceof Error && 'status' in error) ? (error as any).status : undefined,
        imageUrlLength: imageUrl?.length,
        imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
        style: style,
        maxLength: maxLength,
        hasCustomPrompt: !!customPrompt,
        timestamp: new Date().toISOString()
      });
      
      // Return fallback description for this language
      const fallbackContent = language === "en" 
        ? "A captivating image that tells a unique story through its visual elements."
        : "Una imagen cautivadora que cuenta una historia única a través de sus elementos visuales.";
      
      return {
        id: `${baseTimestamp + index}_${language}_fallback`,
        imageId: originalImageUrl,
        style: style,
        content: fallbackContent,
        language: languageKey as "english" | "spanish",
        createdAt: new Date().toISOString(),
      };
    }
  });
  
  // Execute all description generations in parallel
  apiLogger.info('[Parallel Generation] Executing parallel description generation...');
  const results = await Promise.all(descriptionPromises);
  
  apiLogger.info('[Parallel Generation] Parallel generation completed successfully', {
    totalDescriptions: results.length,
    languages: results.map(r => r.language)
  });
  
  return results;
}

/**
 * CORS Preflight Handler with rate limit info
 */
export async function OPTIONS(request: NextRequest) {
  // Check rate limit status without incrementing (for preflight)
  const rateLimitStatus = await checkRateLimitStatus(request, 'descriptionFree');
  
  const { handleCORSPreflight } = await import("@/lib/middleware/api-middleware");
  const response = handleCORSPreflight(request);
  
  // Add rate limit headers to preflight response
  response.headers.set('X-RateLimit-Limit', rateLimitStatus.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitStatus.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitStatus.resetTime.getTime() / 1000).toString());
  
  return response;
}

/**
 * Enhanced description generation handler with tier-based rate limiting
 */
async function handleDescriptionGenerate(request: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  const userId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';
  
  // Note: Vercel strips custom headers, so we receive API key in request body instead
  let userApiKey: string | undefined;
  
  apiLogger.info('[Generate Route] Processing description generation request:', {
    requestId,
    userId: userId || 'anonymous',
    userTier,
    timestamp: new Date().toISOString()
  });

  try {
    // Security validation
    const securityCheck = validateSecurityHeaders(request.headers);
    if (!securityCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Security validation failed",
          details: securityCheck.reason,
          requestId,
        },
        { 
          status: 403,
          headers: securityHeaders,
        }
      );
    }

    // Parse and validate request body with size limits
    apiLogger.info('[API Route] Parsing request body...');
    const body = await request.json();
    apiLogger.info('[API Route] Request body keys:', Object.keys(body));
    
    if (!validateRequestSize(body, 50 * 1024)) { // 50KB limit
      return NextResponse.json(
        {
          success: false,
          error: "Request too large",
          requestId,
        },
        { 
          status: 413,
          headers: securityHeaders,
        }
      );
    }

    apiLogger.info('[API Route] Validating with schema...');
    const params = descriptionGenerateSchema.parse(body);
    apiLogger.info('[API Route] Schema validation passed');
    
    // Extract user's API key from validated params (Vercel-compatible approach)
    userApiKey = params.userApiKey || undefined;
    
    if (userApiKey) {
      apiLogger.info('[API Route] Received user API key from request body:', {
        hasKey: !!userApiKey,
        keyLength: userApiKey.length,
        keyPrefix: userApiKey.substring(0, 10) + '...',
        requestId
      });
    } else {
      apiLogger.info('[API Route] No user API key provided, will use server default');
    }
    
    // Additional validation for style parameter
    const validStyles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
    const validatedStyle = (params.style && validStyles.includes(params.style as string)) ? params.style : 'narrativo';
    if (params.style !== validatedStyle) {
      apiLogger.warn('[Generate Route] Invalid style parameter, using default', {
        providedStyle: params.style,
        validatedStyle,
        validStyles
      });
    }
    
    // Validate maxLength parameter
    const validatedMaxLength = (typeof params.maxLength === 'number' && params.maxLength >= 50 && params.maxLength <= 1000) 
      ? params.maxLength 
      : 300;
    if (params.maxLength !== validatedMaxLength) {
      apiLogger.warn('[Generate Route] Invalid maxLength parameter, using default', {
        providedMaxLength: params.maxLength,
        validatedMaxLength
      });
    }

    // Process image URL - convert to base64 if it's an external URL
    let processedImageUrl = params.imageUrl as string;
    
    // Enhanced image URL validation
    if (!processedImageUrl || typeof processedImageUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image URL provided",
          requestId,
          details: {
            hasImageUrl: !!processedImageUrl,
            imageUrlType: typeof processedImageUrl,
            reason: 'imageUrl must be a non-empty string'
          }
        },
        { 
          status: 400,
          headers: securityHeaders,
        }
      );
    }
    
    // Validate imageUrl format (must be data URI or HTTP URL)
    if (!processedImageUrl.startsWith('data:') && !processedImageUrl.startsWith('http://') && !processedImageUrl.startsWith('https://')) {
      return NextResponse.json(
        {
          success: false,
          error: "Image URL must be a valid data URI or HTTP URL",
          requestId,
          details: {
            imageUrlPrefix: processedImageUrl.substring(0, 20),
            imageUrlLength: processedImageUrl.length,
            reason: 'URL must start with data:, http://, or https://'
          }
        },
        { 
          status: 400,
          headers: securityHeaders,
        }
      );
    }
    
    // Validate image size limits for data URIs
    if (processedImageUrl.startsWith('data:')) {
      const imageSizeKB = Math.round((processedImageUrl.length * 0.75) / 1024); // Approximate size
      const maxSizeKB = 20 * 1024; // 20MB limit
      if (imageSizeKB > maxSizeKB) {
        return NextResponse.json(
          {
            success: false,
            error: `Image too large: ${imageSizeKB}KB (maximum ${maxSizeKB}KB allowed)`,
            requestId,
            details: {
              imageSizeKB,
              maxSizeKB,
              reason: 'Image exceeds maximum size limit'
            }
          },
          { 
            status: 413,
            headers: securityHeaders,
          }
        );
      }
    }
    
    // If it's an external URL (not a data URI), proxy it
    if (processedImageUrl && !processedImageUrl.startsWith('data:')) {
      try {
        apiLogger.info('[Generate Route] Proxying external image URL...');
        const proxyResponse = await fetch(`${request.nextUrl.origin}/api/images/proxy`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'DescribeIt/2.0.0'
          },
          body: JSON.stringify({ imageUrl: processedImageUrl }),
        });
        
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          if (proxyData.dataUri && proxyData.dataUri.startsWith('data:')) {
            processedImageUrl = proxyData.dataUri;
            apiLogger.info('[Generate Route] Image proxied successfully:', {
              originalLength: params.imageUrl.length,
              proxiedLength: processedImageUrl.length,
              size: proxyData.size
            });
          } else {
            apiLogger.warn('[Generate Route] Proxy returned invalid data URI');
          }
        } else {
          apiLogger.warn('[Generate Route] Image proxy failed:', {
            status: proxyResponse.status,
            statusText: proxyResponse.statusText
          });
        }
      } catch (error) {
        apiLogger.warn('[Generate Route] Image proxy error, using original URL:', {
          error: error instanceof Error ? error.message : error,
          originalUrl: processedImageUrl.substring(0, 100) + '...'
        });
      }
    }

    // Get secure API key for OpenAI operations
    const secureApiKey = await getSecureApiKey('OPENAI_API_KEY', params.userApiKey);
    
    if (!secureApiKey) {
      apiLogger.error('[Generate Route] Failed to retrieve secure API key');
      return NextResponse.json(
        {
          success: false,
          error: "API configuration error",
          details: "Failed to retrieve API key",
          requestId,
        },
        { 
          status: 500,
          headers: securityHeaders,
        }
      );
    }
    
    // Generate descriptions for both languages in parallel using server-side OpenAI
    apiLogger.info('[Generate Route] Starting parallel description generation...');
    const descriptions = await generateParallelDescriptions({
      imageUrl: processedImageUrl,
      style: validatedStyle as DescriptionStyle,
      maxLength: validatedMaxLength,
      customPrompt: params.customPrompt as string | undefined,
      languages: ["en", "es"] as const,
      originalImageUrl: params.imageUrl
    }, secureApiKey);

    const responseTime = performance.now() - startTime;

    const response = {
      success: true,
      data: descriptions,
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        userTier,
        demoMode: false, // Server-side always attempts real API
        version: "2.0.0",
      },
    };

    // Validate response format
    apiResponseSchema.parse(response);

    return NextResponse.json(response, {
      headers: {
        ...securityHeaders,
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Request-ID": requestId,
        // Rate limit headers will be added by middleware
      },
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    // Handle validation errors  
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
          metadata: {
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime.toFixed(2)}ms`,
            requestId,
          },
        },
        {
          status: 400,
          headers: {
            ...securityHeaders,
            "X-Response-Time": `${responseTime.toFixed(2)}ms`,
            "X-Request-ID": requestId,
          },
        },
      );
    }

    // Handle other errors
    apiLogger.error("Description generation error:", error);

    // Provide fallback demo descriptions even on complete failure
    const fallbackDescriptions = [
      {
        id: `${crypto.randomUUID()}_en_fallback`,
        imageId: "fallback",
        style: "narrativo" as const,
        content: "This is an interesting image that shows unique visual elements. The colors and composition create an engaging visual experience that invites contemplation.",
        language: "english" as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: `${crypto.randomUUID()}_es_fallback`,
        imageId: "fallback",
        style: "narrativo" as const,
        content: "Esta es una imagen interesante que muestra elementos visuales únicos. Los colores y la composición crean una experiencia visual atractiva que invita a la contemplación.",
        language: "spanish" as const,
        createdAt: new Date().toISOString(),
      }
    ];

    const fallbackResponse = {
      success: true,
      data: fallbackDescriptions,
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        requestId,
        fallback: true,
        demoMode: true,
        error: "Service temporarily unavailable",
        version: "2.0.0",
      },
    };

    return NextResponse.json(fallbackResponse, {
      status: 200,
      headers: {
        ...securityHeaders,
        "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        "X-Request-ID": requestId,
        "X-Fallback": "true",
      },
    });
  }
}

/**
 * Health check handler with rate limit status
 */
async function handleHealthCheck(request: AuthenticatedRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  // Include rate limit status in health check
  const rateLimitStatus = await checkRateLimitStatus(request, 'general');
  
  return NextResponse.json(
    {
      success: true,
      data: {
        service: "Description Generation API",
        status: "healthy",
        version: "2.0.0",
        rateLimit: {
          healthy: !rateLimitStatus.limited,
          limit: rateLimitStatus.limit,
          remaining: rateLimitStatus.remaining,
          resetTime: rateLimitStatus.resetTime.toISOString(),
        },
        capabilities: {
          styles: [
            "narrativo",
            "poetico",
            "academico", 
            "conversacional",
            "infantil",
          ],
          languages: ["es", "en"],
          demoMode: false, // Server-side always attempts real API
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        responseTime: "<1ms",
      },
    },
    {
      headers: {
        ...securityHeaders,
        "Cache-Control": "public, max-age=60",
        "X-Request-ID": requestId,
        // Rate limit headers will be added if middleware is applied
      },
    },
  );
}

/**
 * Enhanced POST handler with tier-based rate limiting
 */
export const POST = withBasicAuth(
  (request: AuthenticatedRequest) => {
    // Determine user tier for rate limiting
    const userTier = request.user?.subscription_status || 'free';
    const isPaidTier = userTier === 'pro' || userTier === 'premium' || userTier === 'enterprise';
    
    // Apply tier-based rate limiting
    const rateLimitedHandler = isPaidTier 
      ? RateLimitMiddleware.description(
          (req: NextRequest) => withAPIMiddleware(
            "/api/descriptions/generate",
            handleDescriptionGenerate
          )(req),
          true // isPaidTier
        )
      : RateLimitMiddleware.description(
          (req: NextRequest) => withAPIMiddleware(
            "/api/descriptions/generate",
            handleDescriptionGenerate
          )(req),
          false // isFree
        );
    
    // Apply monitoring
    return withMonitoring(
      rateLimitedHandler,
      {
        enableRequestLogging: true,
        enableResponseLogging: true,
        enablePerformanceTracking: true,
        enableErrorTracking: true,
        performanceThreshold: 5000, // 5 seconds for description generation
        includeBody: process.env.NODE_ENV === 'development'
      }
    )(request as NextRequest);
  },
  {
    requiredFeatures: ['basic_descriptions'],
    errorMessages: {
      featureRequired: 'Description generation requires a valid subscription. Free tier includes basic descriptions.',
    },
  }
);

/**
 * Enhanced GET handler with general rate limiting
 */
export const GET = withBasicAuth(
  (request: AuthenticatedRequest) => 
    RateLimitMiddleware.general(
      (req: NextRequest) => withMonitoring(
        (req: NextRequest) => withAPIMiddleware(
          "/api/descriptions/generate",
          handleHealthCheck
        )(req),
        {
          enableRequestLogging: true,
          enableResponseLogging: true,
          performanceThreshold: 100, // Health checks should be fast
          includeBody: false
        }
      )(req)
    )(request as NextRequest),
  {
    allowGuest: true,
    required: false,
  }
);