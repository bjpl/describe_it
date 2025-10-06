import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { 
  imageProxySchema,
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/schemas/api-validation';
import { z } from 'zod';

// Use Edge Runtime for better performance
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Edge runtime logger (development-only logging for edge runtime)
// Edge runtime does not support Winston logger, console is necessary here
const edgeLogger = {
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line custom-rules/require-logger, no-console
      console.warn(`[Image Proxy] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in production
    // eslint-disable-next-line custom-rules/require-logger, no-console
    console.error(`[Image Proxy] ${message}`, ...args);
  },
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line custom-rules/require-logger, no-console
      console.log(`[Image Proxy] ${message}`, ...args);
    }
  },
};

/**
 * Image proxy endpoint for OpenAI Vision API
 * Fetches images from external URLs and converts them to base64
 * This ensures OpenAI can access images from Unsplash and other sources
 */
export async function POST(request: NextRequest) {
  try {
    // Security validation
    const securityCheck = validateSecurityHeaders(request.headers);
    if (!securityCheck.valid) {
      return createErrorResponse(
        "Security validation failed",
        403,
        [{ field: "security", message: securityCheck.reason || "Security check failed" }]
      );
    }

    // Parse and validate request
    const requestText = await request.text();
    
    if (!validateRequestSize(requestText, 10 * 1024)) { // 10KB limit
      return createErrorResponse("Request too large", 413);
    }

    const body = safeParse(requestText);
    if (!body) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    
    // Validate with schema
    let validatedData;
    try {
      validatedData = imageProxySchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          "Invalid request parameters",
          400,
          error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          }))
        );
      }
      throw error;
    }

    const { imageUrl, maxWidth, maxHeight, quality } = validatedData;

    // Additional URL validation (schema already validates format)
    try {
      const url = new URL(imageUrl);
      // Only allow HTTPS URLs for security (except localhost for development)
      if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
        return createErrorResponse("Only HTTPS URLs are allowed", 400);
      }
    } catch {
      return createErrorResponse("Invalid URL format", 400);
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const imageResponse = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DescribeIt/1.0 (Image Description Service)',
        },
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        edgeLogger.error(`Failed to fetch image: ${imageResponse.status}`);
        return createErrorResponse(
          `Failed to fetch image: ${imageResponse.status}`,
          imageResponse.status
        );
      }

      // Check content type
      const contentType = imageResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return createErrorResponse("URL does not point to an image", 400);
      }

      // Convert to base64
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Check image size limits (20MB max)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (buffer.length > maxSize) {
        return createErrorResponse(
          `Image too large: ${Math.round(buffer.length / (1024 * 1024))}MB (max 20MB)`,
          413
        );
      }
      
      const base64 = buffer.toString('base64');
      const dataUri = `data:${contentType};base64,${base64}`;

      return createSuccessResponse({
        dataUri,
        contentType,
        size: buffer.length,
        sizeFormatted: `${Math.round(buffer.length / 1024)}KB`,
        dimensions: maxWidth || maxHeight ? { maxWidth, maxHeight } : undefined,
        quality: quality || 85,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return createErrorResponse("Image fetch timeout", 504);
      }

      edgeLogger.error('Image proxy error:', error);
      return createErrorResponse("Failed to process image", 500);
    }
  } catch (error) {
    edgeLogger.error('Image proxy error:', error);
    return createErrorResponse(
      "Internal server error",
      500,
      [{ field: "server", message: error instanceof Error ? error.message : "Unexpected error occurred" }]
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
