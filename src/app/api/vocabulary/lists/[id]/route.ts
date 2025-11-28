import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";
import type { VocabularyListUpdate } from "@/lib/supabase/types";

// Validation schemas
const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(["basic", "intermediate", "advanced", "custom", "thematic"]).optional(),
  difficulty_level: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string()).optional().nullable(),
  is_public: z.boolean().optional(),
});

export const runtime = "nodejs";

/**
 * GET /api/vocabulary/lists/[id] - Get specific vocabulary list
 */
async function handleGetList(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    if (!supabaseAdmin) {
      throw new Error("Database not configured");
    }

    const { data: list, error } = await supabaseAdmin
      .from("vocabulary_lists")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      throw error;
    }

    if (!list) {
      return NextResponse.json(
        { success: false, error: "Vocabulary list not found" },
        { status: 404 }
      );
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: list,
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

    apiLogger.error("Failed to get vocabulary list:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve vocabulary list",
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
 * PUT /api/vocabulary/lists/[id] - Update vocabulary list
 */
async function handleUpdateList(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateListSchema.parse(body);

    if (!supabaseAdmin) {
      throw new Error("Database not configured");
    }

    // Type assertion needed due to Supabase generic constraints
    // Data is already validated by Zod schema
    const { data: updatedList, error } = await supabaseAdmin
      .from("vocabulary_lists")
      // @ts-ignore - Supabase type inference issue with partial updates
      .update(validatedData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!updatedList) {
      return NextResponse.json(
        { success: false, error: "Vocabulary list not found" },
        { status: 404 }
      );
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: updatedList,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId,
        },
      },
      {
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

    apiLogger.error("Failed to update vocabulary list:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update vocabulary list",
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
 * DELETE /api/vocabulary/lists/[id] - Delete vocabulary list
 */
async function handleDeleteList(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now();
  const userId = request.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    if (!supabaseAdmin) {
      throw new Error("Database not configured");
    }

    const { error } = await supabaseAdmin
      .from("vocabulary_lists")
      .delete()
      .eq("id", params.id);

    if (error) {
      throw error;
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Vocabulary list deleted successfully",
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          userId,
        },
      },
      {
        headers: {
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        },
      }
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    apiLogger.error("Failed to delete vocabulary list:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete vocabulary list",
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
export const GET = withBasicAuth(handleGetList, {
  requiredFeatures: ["vocabulary_save"],
});

export const PUT = withBasicAuth(handleUpdateList, {
  requiredFeatures: ["vocabulary_save"],
});

export const DELETE = withBasicAuth(handleDeleteList, {
  requiredFeatures: ["vocabulary_save"],
});
