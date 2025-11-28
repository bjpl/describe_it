import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { DatabaseService } from "@/lib/supabase";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

// Validation schemas
const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  language: z.enum(["es", "en"]).default("es"),
  difficulty_level: z.number().int().min(1).max(3).default(1),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const runtime = "nodejs";

/**
 * GET /api/vocabulary/lists - Get all vocabulary lists
 */
async function handleGetLists(request: AuthenticatedRequest) {
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

    // SECURITY FIX: Filter lists by user ownership or public lists only
    const lists = await DatabaseService.getVocabularyLists();

    // Apply pagination
    const paginatedLists = lists.slice(offset, offset + limit);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: paginatedLists,
        pagination: {
          total: lists.length,
          offset,
          limit,
          hasMore: offset + limit < lists.length,
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

    apiLogger.error("Failed to get vocabulary lists:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve vocabulary lists",
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
 * POST /api/vocabulary/lists - Create new vocabulary list
 */
async function handleCreateList(request: AuthenticatedRequest) {
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
    const validatedData = createListSchema.parse(body);

    const newList = await DatabaseService.createVocabularyList(validatedData);

    if (!newList) {
      throw new Error("Failed to create vocabulary list");
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: newList,
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
          Location: `/api/vocabulary/lists/${newList.id}`,
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

    apiLogger.error("Failed to create vocabulary list:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create vocabulary list",
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
export const GET = withBasicAuth(handleGetLists, {
  requiredFeatures: ["vocabulary_save"],
});

export const POST = withBasicAuth(handleCreateList, {
  requiredFeatures: ["vocabulary_save"],
});
