import { NextRequest, NextResponse } from "next/server";
import { openAIService } from "@/lib/api/openai";
import { QAGeneration } from "@/types/api";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, language = "es", count = 5 } = body;

    // Validate required fields
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required and must be a string" },
        { status: 400 },
      );
    }

    // Validate count parameter
    const parsedCount = parseInt(count);
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 10) {
      return NextResponse.json(
        { error: "Count must be a number between 1 and 10" },
        { status: 400 },
      );
    }

    // Validate language parameter
    if (!["es", "en"].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be "es" or "en"' },
        { status: 400 },
      );
    }

    logger.info(
      `Generating ${parsedCount} Q&A pairs in ${language}`,
      {
        component: "qa-api",
        count: parsedCount,
        language,
        descriptionLength: description.length,
      },
    );

    // Generate Q&A pairs using OpenAI service
    const qaData: QAGeneration[] = await openAIService.generateQA(
      description,
      language,
      parsedCount,
    );

    // Add metadata to response
    const response = {
      questions: qaData,
      metadata: {
        count: qaData.length,
        language,
        generatedAt: new Date().toISOString(),
        source: "openai-gpt-4",
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    logger.error("Error generating Q&A pairs", error, {
      component: "qa-api",
      language,
    });

    // Return appropriate error response
    const statusCode = error.status || 500;
    const errorMessage = error.message || "Failed to generate Q&A pairs";

    return NextResponse.json(
      {
        error: errorMessage,
        code: error.code || "QA_GENERATION_ERROR",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: statusCode },
    );
  }
}

export async function GET(request: NextRequest) {
  // Return API information for GET requests
  return NextResponse.json(
    {
      endpoint: "/api/qa/generate",
      method: "POST",
      description: "Generate Q&A pairs from image descriptions",
      parameters: {
        description: "string (required) - The image description text",
        language: 'string (optional) - "es" or "en", defaults to "es"',
        count: "number (optional) - Number of Q&A pairs (1-10), defaults to 5",
      },
      response: {
        questions: "QAGeneration[] - Array of question-answer pairs",
        metadata: "object - Generation metadata",
      },
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
