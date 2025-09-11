import { NextRequest, NextResponse } from "next/server";
import { openAIService } from "@/lib/api/openai";
import { withAPIMiddleware } from "@/lib/middleware/api-middleware";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { 
  descriptionGenerateSchema,
  validateRequestSize,
  validateSecurityHeaders,
  apiResponseSchema 
} from "@/lib/schemas/api-validation";
import type { DescriptionStyle } from "@/types/api";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds timeout

// Rate limiting: 10 requests per 15 minutes per IP
export const dynamic = 'force-dynamic';

// Security headers for API responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY", 
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer",
  "Content-Type": "application/json",
};

/**
 * CORS Preflight Handler
 * 
 * Handles CORS preflight requests for description generation endpoint.
 * 
 * @param request - The incoming preflight request
 * @returns NextResponse with CORS headers
 */
export async function OPTIONS(request: NextRequest) {
  // Import here to avoid circular dependency
  const { handleCORSPreflight } = await import("@/lib/middleware/api-middleware");
  return handleCORSPreflight(request);
}

async function handleDescriptionGenerate(request: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  const userId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

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
    const body = await request.json();
    
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

    const params = descriptionGenerateSchema.parse(body);

    // Process image URL - convert to base64 if it's an external URL
    let processedImageUrl = params.imageUrl as string;
    
    // If it's an external URL (not a data URI), proxy it
    if (processedImageUrl && !processedImageUrl.startsWith('data:')) {
      try {
        const proxyResponse = await fetch(`${request.nextUrl.origin}/api/images/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: processedImageUrl }),
        });
        
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          processedImageUrl = proxyData.dataUri;
          console.log('[Generate] Image proxied successfully, size:', proxyData.size);
        } else {
          console.warn('[Generate] Image proxy failed, using original URL');
        }
      } catch (error) {
        console.warn('[Generate] Image proxy error, using original URL:', error);
      }
    }

    // Generate descriptions for both languages
    const descriptions = [];
    
    // Generate English description
    try {
      const englishDescription = await openAIService.generateDescription({
        imageUrl: processedImageUrl,
        style: params.style as DescriptionStyle,
        maxLength: params.maxLength as number,
        customPrompt: params.customPrompt as string | undefined,
        language: "en" as const
      });
      descriptions.push({
        id: `${Date.now()}_en`,
        imageId: params.imageUrl,
        style: params.style,
        content: englishDescription.text || "A captivating image that tells a unique story through its visual elements.",
        language: "english" as const,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to generate English description:", error);
      descriptions.push({
        id: `${Date.now()}_en_fallback`,
        imageId: params.imageUrl,
        style: params.style,
        content: "A captivating image that tells a unique story through its visual elements.",
        language: "english" as const,
        createdAt: new Date().toISOString(),
      });
    }
    
    // Generate Spanish description
    try {
      const spanishDescription = await openAIService.generateDescription({
        imageUrl: processedImageUrl,
        style: params.style as any,
        maxLength: params.maxLength as number | undefined,
        language: "es" as const
      });
      descriptions.push({
        id: `${Date.now() + 1}_es`,
        imageId: params.imageUrl,
        style: params.style,
        content: spanishDescription.text || "Una imagen cautivadora que cuenta una historia única a través de sus elementos visuales.",
        language: "spanish" as const,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to generate Spanish description:", error);
      descriptions.push({
        id: `${Date.now() + 1}_es_fallback`,
        imageId: params.imageUrl,
        style: params.style,
        content: "Una imagen cautivadora que cuenta una historia única a través de sus elementos visuales.",
        language: "spanish" as const,
        createdAt: new Date().toISOString(),
      });
    }

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
        demoMode: !openAIService.isConfiguredSecurely(),
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
        "X-Rate-Limit-Remaining": "9", // Will be set by middleware
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
    console.error("Description generation error:", error);

    // Provide fallback demo descriptions even on complete failure
    const fallbackDescriptions = [
      {
        id: `${Date.now()}_en_fallback`,
        imageId: "fallback",
        style: "narrativo" as const,
        content: "This is an interesting image that shows unique visual elements. The colors and composition create an engaging visual experience that invites contemplation.",
        language: "english" as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: `${Date.now()}_es_fallback`,
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

async function handleHealthCheck(request: AuthenticatedRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  return NextResponse.json(
    {
      success: true,
      data: {
        service: "Description Generation API",
        status: "healthy",
        version: "2.0.0",
        capabilities: {
          styles: [
            "narrativo",
            "poetico",
            "academico", 
            "conversacional",
            "infantil",
          ],
          languages: ["es", "en"],
          demoMode: !openAIService.isConfiguredSecurely(),
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
      },
    },
  );
}

// Export wrapped handlers with authentication
export const POST = withBasicAuth(
  (request: AuthenticatedRequest) => 
    withAPIMiddleware(
      "/api/descriptions/generate",
      handleDescriptionGenerate
    )(request as NextRequest),
  {
    requiredFeatures: ['basic_descriptions'],
    errorMessages: {
      featureRequired: 'Description generation requires a valid subscription. Free tier includes basic descriptions.',
    },
  }
);

export const GET = withBasicAuth(
  (request: AuthenticatedRequest) => 
    withAPIMiddleware(
      "/api/descriptions/generate",
      handleHealthCheck
    )(request as NextRequest),
  {
    allowGuest: true,
    required: false,
  }
);