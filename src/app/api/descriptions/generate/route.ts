import { NextRequest, NextResponse } from "next/server";
import { openAIService } from "@/lib/api/openai";
import { z } from "zod";

export const runtime = "nodejs";

// Request schema validation
const generateDescriptionSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  style: z.enum([
    "narrativo",
    "poetico",
    "academico",
    "conversacional",
    "infantil",
  ]),
  language: z.enum(["es", "en"]).default("es"),
  maxLength: z.coerce.number().int().min(50).max(1000).default(300),
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const params = generateDescriptionSchema.parse(body);

    // Generate description using OpenAI service (with demo fallback)
    const description = await openAIService.generateDescription(params);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: description,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          demoMode: !process.env.OPENAI_API_KEY,
        },
      },
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // 1 hour cache
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
        },
      },
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          },
        },
      );
    }

    // Handle other errors
    console.error("Description generation error:", error);

    // Provide a fallback demo description even on complete failure
    const fallbackDescription = {
      style: "narrativo" as const,
      text: "Esta es una imagen interesante que muestra elementos visuales únicos. Los colores y la composición crean una experiencia visual atractiva que invita a la contemplación.",
      language: "es",
      wordCount: 25,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: fallbackDescription,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
          fallback: true,
          demoMode: true,
          error: "API temporarily unavailable, using fallback",
        },
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "X-Response-Time": `${responseTime.toFixed(2)}ms`,
          "X-Fallback": "true",
        },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json(
    {
      service: "Description Generation API",
      status: "healthy",
      version: "1.0.0",
      capabilities: {
        styles: [
          "narrativo",
          "poetico",
          "academico",
          "conversacional",
          "infantil",
        ],
        languages: ["es", "en"],
        demoMode: !process.env.OPENAI_API_KEY,
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: corsHeaders,
    },
  );
}
