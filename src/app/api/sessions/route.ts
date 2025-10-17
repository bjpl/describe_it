import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

// Validation schemas
const createSessionSchema = z.object({
  session_type: z.enum(["practice", "flashcards", "quiz", "matching", "writing"]),
  duration_seconds: z.number().int().min(0).optional(),
  items_reviewed: z.number().int().min(0).optional().default(0),
  items_correct: z.number().int().min(0).optional().default(0),
  session_metadata: z.record(z.any()).optional(),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const runtime = "nodejs";

/**
 * GET /api/sessions - Get user sessions
 */
async function handleGetSessions(request: AuthenticatedRequest) {
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

    const sessions = await DatabaseService.getUserSessions(userId, limit);

    // Apply offset manually (DatabaseService doesn't support offset)
    const paginatedSessions = sessions.slice(offset, offset + limit);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: paginatedSessions,
        pagination: {
          total: sessions.length,
          offset,
          limit,
          hasMore: offset + limit < sessions.length,
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

    apiLogger.error("Failed to get sessions:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve sessions",
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
 * POST /api/sessions - Create new session
 */
async function handleCreateSession(request: AuthenticatedRequest) {
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
    const validatedData = createSessionSchema.parse(body);

    const newSession = await DatabaseService.createSession({
      user_id: userId,
      session_type: validatedData.session_type,
      started_at: new Date().toISOString(),
      status: 'active'
    } as any);

    if (!newSession) {
      throw new Error("Failed to create session");
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: newSession,
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
          Location: `/api/sessions/${newSession.id}`,
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

    apiLogger.error("Failed to create session:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create session",
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
export const GET = withBasicAuth(handleGetSessions, {
  requiredFeatures: ["vocabulary_save"],
});

export const POST = withBasicAuth(handleCreateSession, {
  requiredFeatures: ["vocabulary_save"],
});
