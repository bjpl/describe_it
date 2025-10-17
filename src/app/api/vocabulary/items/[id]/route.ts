import { NextRequest, NextResponse } from "next/server";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import { apiLogger } from "@/lib/logger";
import { asLogContext } from "@/lib/utils/typeGuards";

// Validation schemas
const updateItemSchema = z.object({
  spanish_text: z.string().min(1).optional(),
  english_translation: z.string().min(1).optional(),
  part_of_speech: z
    .enum(["noun", "verb", "adjective", "adverb", "preposition", "other"])
    .optional(),
  difficulty_level: z.number().int().min(1).max(3).optional(),
  category: z.string().optional(),
  context_sentence_spanish: z.string().optional().nullable(),
  context_sentence_english: z.string().optional().nullable(),
  pronunciation_ipa: z.string().optional().nullable(),
  usage_notes: z.string().optional().nullable(),
  frequency_score: z.number().optional().nullable(),
});

export const runtime = "nodejs";

/**
 * GET /api/vocabulary/items/[id] - Get specific vocabulary item
 */
async function handleGetItem(
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

    const { data: item, error } = await supabaseAdmin
      .from("vocabulary_items")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      throw error;
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Vocabulary item not found" },
        { status: 404 }
      );
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: item,
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

    apiLogger.error("Failed to get vocabulary item:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve vocabulary item",
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
 * PUT /api/vocabulary/items/[id] - Update vocabulary item
 */
async function handleUpdateItem(
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
    const validatedData = updateItemSchema.parse(body);

    if (!supabaseAdmin) {
      throw new Error("Database not configured");
    }

    const { data: updatedItem, error } = await supabaseAdmin
      .from("vocabulary_items")
      .update(validatedData as any)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!updatedItem) {
      return NextResponse.json(
        { success: false, error: "Vocabulary item not found" },
        { status: 404 }
      );
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: updatedItem,
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

    apiLogger.error("Failed to update vocabulary item:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update vocabulary item",
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
 * DELETE /api/vocabulary/items/[id] - Delete vocabulary item
 */
async function handleDeleteItem(
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
      .from("vocabulary_items")
      .delete()
      .eq("id", params.id);

    if (error) {
      throw error;
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        message: "Vocabulary item deleted successfully",
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

    apiLogger.error("Failed to delete vocabulary item:", asLogContext(error));

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete vocabulary item",
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
export const GET = withBasicAuth(handleGetItem, {
  requiredFeatures: ["vocabulary_save"],
});

export const PUT = withBasicAuth(handleUpdateItem, {
  requiredFeatures: ["vocabulary_save"],
});

export const DELETE = withBasicAuth(handleDeleteItem, {
  requiredFeatures: ["vocabulary_save"],
});
