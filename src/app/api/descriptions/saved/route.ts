import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

// Validation schemas
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const saveDescriptionSchema = z.object({
  image_id: z.string().min(1),
  image_url: z.string().url().optional().nullable(),
  style: z.enum(['narrativo', 'poetico', 'academico', 'conversacional', 'infantil']),
  description_english: z.string().min(1),
  description_spanish: z.string().min(1),
  user_rating: z.number().int().min(1).max(5).optional(),
});

export const runtime = "nodejs";

/**
 * GET /api/descriptions/saved - Get saved descriptions
 */
async function handleGetSavedDescriptions(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const { limit, offset } = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    const descriptions = await DatabaseService.getSavedDescriptions(userId, limit);

    // Apply offset manually (DatabaseService doesn't support offset)
    const paginatedDescriptions = descriptions.slice(offset, offset + limit);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: paginatedDescriptions,
        pagination: {
          total: descriptions.length,
          offset,
          limit,
          hasMore: offset + limit < descriptions.length,
        },
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId,
        },
      },
      {
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "Cache-Control": "private, max-age=300",
        },
      }
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        },
        {
          status: 400,
          headers: {
            "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          },
        }
      );
    }

    apiLogger.error("Failed to get saved descriptions:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve saved descriptions",
        message: "An error occurred. Please try again.",
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        },
      }
    );
  }
}

/**
 * POST /api/descriptions/saved - Save a new description
 */
async function handleSaveDescription(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validatedData = saveDescriptionSchema.parse(body);

    const descriptionData = {
      ...validatedData,
      user_id: userId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    };

    const savedDescription = await DatabaseService.saveDescription(descriptionData);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: savedDescription,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId,
        },
      },
      {
        status: 201,
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        },
      }
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        {
          status: 400,
          headers: {
            "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          },
        }
      );
    }

    apiLogger.error("Failed to save description:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save description",
        message: "An error occurred while saving. Please try again.",
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        },
      }
    );
  }
}

// Export authenticated handlers
export const GET = withBasicAuth(handleGetSavedDescriptions, {
  requiredFeatures: ["basic_descriptions"],
});

export const POST = withBasicAuth(handleSaveDescription, {
  requiredFeatures: ["basic_descriptions"],
});
