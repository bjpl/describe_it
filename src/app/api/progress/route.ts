import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

// Validation schemas
const updateProgressSchema = z.object({
  vocabulary_item_id: z.string().uuid(),
  mastery_level: z.number().min(0).max(1).optional(),
  times_reviewed: z.number().int().min(0).optional(),
  correct_count: z.number().int().min(0).optional(),
  incorrect_count: z.number().int().min(0).optional(),
  last_review_score: z.number().min(0).max(100).optional(),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const runtime = "nodejs";

/**
 * GET /api/progress - Get user learning progress
 */
async function handleGetProgress(request: AuthenticatedRequest) {
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

    const progress = await DatabaseService.getLearningProgress(userId, limit);

    // Apply offset manually (DatabaseService doesn't support offset)
    const paginatedProgress = progress.slice(offset, offset + limit);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: paginatedProgress,
        pagination: {
          total: progress.length,
          offset,
          limit,
          hasMore: offset + limit < progress.length,
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
          "Cache-Control": "private, max-age=60",
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

    apiLogger.error("Failed to get learning progress:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve learning progress",
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
 * POST /api/progress - Update learning progress
 */
async function handleUpdateProgress(request: AuthenticatedRequest) {
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
    const validatedData = updateProgressSchema.parse(body);

    const updatedProgress = await DatabaseService.updateLearningProgress(
      userId,
      validatedData.vocabulary_item_id,
      {
        mastery_level: validatedData.mastery_level,
        times_reviewed: validatedData.times_reviewed,
        times_correct: validatedData.correct_count,
        last_reviewed: new Date().toISOString(),
      }
    );

    if (!updatedProgress) {
      throw new Error("Failed to update learning progress");
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: updatedProgress,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId,
        },
      },
      {
        status: 200,
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
          error: "Invalid request parameters",
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

    apiLogger.error("Failed to update learning progress:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update learning progress",
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

// Export authenticated handlers
export const GET = withBasicAuth(handleGetProgress, {
  requiredFeatures: ["vocabulary_save"],
});

export const POST = withBasicAuth(handleUpdateProgress, {
  requiredFeatures: ["vocabulary_save"],
});
