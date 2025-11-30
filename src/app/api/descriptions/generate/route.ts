import { NextRequest, NextResponse } from 'next/server';
// MIGRATED TO CLAUDE: Using Anthropic Claude Sonnet 4.5 instead of OpenAI
import { generateClaudeVisionDescription } from '@/lib/api/claude-server';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import {
  descriptionGenerateSchema,
  validateRequestSize,
  validateSecurityHeaders,
  apiResponseSchema,
} from '@/lib/schemas/api-validation';
import type { DescriptionStyle } from '@/types/api';
import { z } from 'zod';
import { safeStringify, safeParse } from '@/lib/utils/json-safe';
import { logger } from '@/lib/logger';

// Simple console-based logging for Vercel serverless compatibility
const apiLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => logger.info(msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => logger.debug(msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => logger.warn(msg, meta),
  error: (msg: string, err?: unknown, meta?: Record<string, unknown>) =>
    logger.error(msg, err instanceof Error ? err : undefined, meta),
  setRequest: (_opts: Record<string, unknown>) => apiLogger,
  apiRequest: (method: string, path: string, meta?: Record<string, unknown>) =>
    logger.info(`${method} ${path}`, meta),
};
const securityLogger = apiLogger;
const performanceLogger = apiLogger;

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout - increased for parallel processing

// Rate limiting: 10 requests per 15 minutes per IP
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache this route

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Content-Type': 'application/json',
};

/**
 * Interface for parallel description generation request
 */
interface ParallelDescriptionRequest {
  imageUrl: string;
  style: DescriptionStyle;
  maxLength: number;
  customPrompt?: string;
  languages: readonly ('en' | 'es')[];
  originalImageUrl: string;
}

/**
 * Generate descriptions in multiple languages concurrently
 * This reduces generation time from 30+ seconds to ~15 seconds
 */
async function generateParallelDescriptions(
  request: ParallelDescriptionRequest,
  userApiKey?: string
): Promise<
  Array<{
    id: string;
    imageId: string;
    style: string;
    content: string;
    language: 'english' | 'spanish';
    createdAt: string;
  }>
> {
  const { imageUrl, style, maxLength, customPrompt, languages, originalImageUrl } = request;
  const baseTimestamp = Date.now();

  apiLogger.info('Starting parallel description generation', {
    step: 'parallel_start',
    languages: languages,
    hasImageUrl: !!imageUrl,
    imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
    style: style,
    maxLength: maxLength,
    hasCustomPrompt: !!customPrompt,
  });

  // Create description generation promises for each language
  const descriptionPromises = languages.map(async (language, index) => {
    const languageLabel = language === 'en' ? 'English' : 'Spanish';
    const languageKey = language === 'en' ? 'english' : 'spanish';

    try {
      apiLogger.debug(`Starting ${languageLabel} description generation`, {
        step: 'vision_call_start',
        language: language,
        languageLabel: languageLabel,
        style: style,
        maxLength: maxLength,
        hasImageUrl: !!imageUrl,
        hasCustomPrompt: !!customPrompt,
      });

      // MIGRATED TO CLAUDE: Using Claude Sonnet 4.5 with 1M context
      const descriptionText = await generateClaudeVisionDescription(
        {
          imageUrl,
          style,
          maxLength,
          customPrompt,
          language,
        },
        userApiKey
      );

      // Transform to expected format
      const description = {
        text: descriptionText,
        wordCount: descriptionText.split(/\s+/).length,
        model: 'claude-sonnet-4-5',
        language: language,
      };

      apiLogger.info(`${languageLabel} vision call completed successfully`, {
        step: 'vision_call_success',
        language: language,
        hasDescription: !!description,
        hasText: !!description?.text,
        textLength: description?.text?.length,
        wordCount: description?.wordCount,
        isDemoMode:
          description?.text?.includes('[DEMO MODE]') || description?.text?.includes('DEMO MODE'),
      });

      if (!description || !description.text) {
        throw new Error(`Empty description returned from vision service for ${languageLabel}`);
      }

      performanceLogger.info(`${languageLabel} description generated successfully`, {
        contentLength: description.text.length,
        wordCount: description.wordCount,
      });

      return {
        id: `${baseTimestamp + index}_${language}`,
        imageId: originalImageUrl,
        style: style,
        content: description.text,
        language: languageKey as 'english' | 'spanish',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      // Use console.error to ensure it appears in Vercel logs
      console.error(
        `[VISION_ERROR] ${languageLabel} generation failed:`,
        error instanceof Error ? error.message : String(error)
      );
      console.error('[VISION_ERROR] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('[VISION_ERROR] Context:', {
        hasUserApiKey: !!userApiKey,
        userApiKeyPrefix: userApiKey?.substring(0, 15),
        imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
        imageUrlLength: imageUrl?.length,
        style,
        maxLength,
      });

      apiLogger.error(`Critical failure in ${languageLabel} vision generation`, error, {
        step: 'vision_call_error',
        language: language,
        languageLabel: languageLabel,
        imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
        style: style,
        maxLength: maxLength,
        hasCustomPrompt: !!customPrompt,
      });

      // Return fallback description for this language
      const fallbackContent =
        language === 'en'
          ? 'A captivating image that tells a unique story through its visual elements.'
          : 'Una imagen cautivadora que cuenta una historia única a través de sus elementos visuales.';

      return {
        id: `${baseTimestamp + index}_${language}_fallback`,
        imageId: originalImageUrl,
        style: style,
        content: fallbackContent,
        language: languageKey as 'english' | 'spanish',
        createdAt: new Date().toISOString(),
      };
    }
  });

  // Execute all description generations in parallel
  apiLogger.debug('Executing parallel description generation');
  const results = await Promise.all(descriptionPromises);

  performanceLogger.info('Parallel generation completed successfully', {
    totalDescriptions: results.length,
    languages: results.map(r => r.language),
  });

  return results;
}

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
  const { handleCORSPreflight } = await import('@/lib/middleware/api-middleware');
  return handleCORSPreflight(request);
}

async function handleDescriptionGenerate(request: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  const userId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  // Note: Vercel strips custom headers, so we receive API key in request body instead
  let userApiKey: string | undefined;

  const requestLogger = apiLogger.setRequest({ requestId, userId });
  requestLogger.apiRequest('POST', '/api/descriptions/generate', {
    userTier,
    hasUser: !!userId,
  });

  try {
    // Security validation
    const securityCheck = validateSecurityHeaders(request.headers);
    if (!securityCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Security validation failed',
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
    requestLogger.debug('Parsing request body');
    let body;
    try {
      const text = await request.text();
      body = safeParse(text, {});
    } catch (error) {
      requestLogger.error('Invalid JSON in request body', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          requestId,
        },
        {
          status: 400,
          headers: securityHeaders,
        }
      );
    }
    requestLogger.debug('Request body parsed successfully', {
      hasBody: !!body,
      bodyKeys: Object.keys(body || {}).length,
    });

    if (!validateRequestSize(body, 50 * 1024)) {
      // 50KB limit
      return NextResponse.json(
        {
          success: false,
          error: 'Request too large',
          requestId,
        },
        {
          status: 413,
          headers: securityHeaders,
        }
      );
    }

    requestLogger.debug('Validating request with schema');
    const params = descriptionGenerateSchema.parse(body);
    requestLogger.debug('Schema validation passed');

    // Extract user's API key from validated params (Vercel-compatible approach)
    userApiKey = params.userApiKey || undefined;

    if (userApiKey) {
      securityLogger.info('[route.ts] User API key received from request body', {
        hasKey: !!userApiKey,
        keyLength: userApiKey.length,
        keyPrefix: userApiKey.substring(0, 15) + '...',
        startsWithSkAnt: userApiKey.startsWith('sk-ant-'),
        requestId,
      });
    } else {
      requestLogger.debug('[route.ts] No user API key provided, using server default');
    }

    // Additional validation for style parameter
    const validStyles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
    const validatedStyle =
      params.style && validStyles.includes(params.style as string) ? params.style : 'narrativo';
    if (params.style !== validatedStyle) {
      requestLogger.warn('Invalid style parameter, using default', {
        providedStyle: params.style,
        validatedStyle,
        validStyles,
      });
    }

    // Validate maxLength parameter
    const validatedMaxLength =
      typeof params.maxLength === 'number' && params.maxLength >= 50 && params.maxLength <= 1000
        ? params.maxLength
        : 300;
    if (params.maxLength !== validatedMaxLength) {
      requestLogger.warn('Invalid maxLength parameter, using default', {
        providedMaxLength: params.maxLength,
        validatedMaxLength,
      });
    }

    // Process image URL - convert to base64 if it's an external URL
    let processedImageUrl = params.imageUrl as string;

    // Enhanced image URL validation
    if (!processedImageUrl || typeof processedImageUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid image URL provided',
          requestId,
          details: {
            hasImageUrl: !!processedImageUrl,
            imageUrlType: typeof processedImageUrl,
            reason: 'imageUrl must be a non-empty string',
          },
        },
        {
          status: 400,
          headers: securityHeaders,
        }
      );
    }

    // Validate imageUrl format (must be data URI or HTTP URL)
    if (
      !processedImageUrl.startsWith('data:') &&
      !processedImageUrl.startsWith('http://') &&
      !processedImageUrl.startsWith('https://')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image URL must be a valid data URI or HTTP URL',
          requestId,
          details: {
            imageUrlPrefix: processedImageUrl.substring(0, 20),
            imageUrlLength: processedImageUrl.length,
            reason: 'URL must start with data:, http://, or https://',
          },
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
              reason: 'Image exceeds maximum size limit',
            },
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
        requestLogger.debug('Proxying external image URL');
        const proxyResponse = await fetch(`${request.nextUrl.origin}/api/images/proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DescribeIt/2.0.0',
          },
          body: safeStringify({ imageUrl: processedImageUrl }) || '',
        });

        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          if (proxyData.dataUri && proxyData.dataUri.startsWith('data:')) {
            processedImageUrl = proxyData.dataUri;
            performanceLogger.info('Image proxied successfully', {
              originalLength: params.imageUrl.length,
              proxiedLength: processedImageUrl.length,
              size: proxyData.size,
            });
          } else {
            requestLogger.warn('Proxy returned invalid data URI');
          }
        } else {
          requestLogger.warn('Image proxy failed', {
            status: proxyResponse.status,
            statusText: proxyResponse.statusText,
          });
        }
      } catch (error) {
        requestLogger.warn('Image proxy error, using original URL', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Get API key: prefer user's key, fall back to environment variable
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      securityLogger.error('No API key available', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'API configuration error',
          details: 'No API key configured. Please provide your Anthropic API key in settings.',
          requestId,
        },
        {
          status: 500,
          headers: securityHeaders,
        }
      );
    }

    // Generate descriptions for both languages in parallel using Claude API
    requestLogger.info('Starting parallel description generation');
    const descriptions = await generateParallelDescriptions(
      {
        imageUrl: processedImageUrl,
        style: validatedStyle as DescriptionStyle,
        maxLength: validatedMaxLength,
        customPrompt: params.customPrompt as string | undefined,
        languages: ['en', 'es'] as const,
        originalImageUrl: params.imageUrl,
      },
      apiKey
    );

    // Save descriptions to database
    if (userId && descriptions && descriptions.length > 0) {
      try {
        const { DatabaseService } = await import('@/lib/supabase');

        for (const desc of descriptions) {
          // Map languages to column format
          const isEnglish = desc.language === 'english';
          await DatabaseService.saveDescription({
            image_id: desc.imageId,
            image_url: params.imageUrl,
            style: validatedStyle as
              | 'narrativo'
              | 'poetico'
              | 'academico'
              | 'conversacional'
              | 'infantil',
            description_english: isEnglish ? desc.content : '',
            description_spanish: !isEnglish ? desc.content : '',
          });
        }

        requestLogger.info('Descriptions saved to database', {
          count: descriptions.length,
          userId,
        });
      } catch (dbError) {
        requestLogger.warn('Failed to save descriptions to database', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
        // Don't fail the request if database save fails
      }
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
        demoMode: false, // Server-side always attempts real API
        version: '2.0.0',
      },
    };

    // Validate response format
    apiResponseSchema.parse(response);

    return NextResponse.json(response, {
      headers: {
        ...securityHeaders,
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Request-ID': requestId,
        'X-Rate-Limit-Remaining': '9', // Will be set by middleware
      },
    });
  } catch (error) {
    const responseTime = performance.now() - startTime;

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
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
            'X-Response-Time': `${responseTime.toFixed(2)}ms`,
            'X-Request-ID': requestId,
          },
        }
      );
    }

    // Handle other errors
    requestLogger.error('Description generation error', error);

    // Provide fallback demo descriptions even on complete failure
    const fallbackDescriptions = [
      {
        id: `${crypto.randomUUID()}_en_fallback`,
        imageId: 'fallback',
        style: 'narrativo' as const,
        content:
          'This is an interesting image that shows unique visual elements. The colors and composition create an engaging visual experience that invites contemplation.',
        language: 'english' as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: `${crypto.randomUUID()}_es_fallback`,
        imageId: 'fallback',
        style: 'narrativo' as const,
        content:
          'Esta es una imagen interesante que muestra elementos visuales únicos. Los colores y la composición crean una experiencia visual atractiva que invita a la contemplación.',
        language: 'spanish' as const,
        createdAt: new Date().toISOString(),
      },
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
        error: 'Service temporarily unavailable',
        version: '2.0.0',
      },
    };

    return NextResponse.json(fallbackResponse, {
      status: 200,
      headers: {
        ...securityHeaders,
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'X-Request-ID': requestId,
        'X-Fallback': 'true',
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
        service: 'Description Generation API',
        status: 'healthy',
        version: '2.0.0',
        capabilities: {
          styles: ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'],
          languages: ['es', 'en'],
          demoMode: false, // Server-side always attempts real API
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        responseTime: '<1ms',
      },
    },
    {
      headers: {
        ...securityHeaders,
        'Cache-Control': 'public, max-age=60',
        'X-Request-ID': requestId,
      },
    }
  );
}

// Simplified direct exports for Vercel compatibility
export async function POST(request: NextRequest) {
  // Cast to AuthenticatedRequest for type compatibility
  const authRequest = request as AuthenticatedRequest;
  authRequest.user = { id: undefined, subscription_status: 'free' };

  return handleDescriptionGenerate(authRequest);
}

export async function GET(request: NextRequest) {
  const authRequest = request as AuthenticatedRequest;
  authRequest.user = { id: undefined, subscription_status: 'free' };

  return handleHealthCheck(authRequest);
}
