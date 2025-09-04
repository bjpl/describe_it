import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PhraseExtractor } from "@/lib/services/phraseExtractor";

// Input validation schema
const phraseExtractionSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  descriptionText: z
    .string()
    .min(10, "Description must be at least 10 characters"),
  style: z
    .enum(["narrativo", "poetico", "academico", "conversacional", "infantil"])
    .optional()
    .default("conversacional"),
  targetLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional()
    .default("intermediate"),
  maxPhrases: z.coerce.number().int().min(1).max(25).optional().default(15),
  categories: z
    .array(
      z.enum([
        "sustantivos",
        "verbos",
        "adjetivos",
        "adverbios",
        "frasesClaves",
      ]),
    )
    .optional(),
});

export const runtime = "nodejs";

// Mock implementation - replace with actual AI service
const extractPhrases = async (
  imageUrl: string,
  targetLevel: string,
  maxPhrases: number,
) => {
  // This is a mock implementation
  // In production, you would integrate with OpenAI Vision API, Claude, or similar service

  const mockPhrases = {
    beginner: [
      {
        phrase: "fresh fruit",
        definition:
          "Fruit that is recently picked and not processed or preserved",
        partOfSpeech: "noun phrase",
        context: "The market sells fresh fruit every morning",
      },
      {
        phrase: "busy market",
        definition: "A marketplace with many people and lots of activity",
        partOfSpeech: "adjective + noun",
        context: "We visited the busy market to buy vegetables",
      },
      {
        phrase: "colorful display",
        definition: "An arrangement of items that shows many bright colors",
        partOfSpeech: "adjective + noun",
        context: "The colorful display of fruits attracted many customers",
      },
      {
        phrase: "wooden crate",
        definition: "A box made of wood used for storing or transporting goods",
        partOfSpeech: "adjective + noun",
        context: "The apples were stored in wooden crates",
      },
      {
        phrase: "daily shopping",
        definition: "The regular activity of buying things you need each day",
        partOfSpeech: "adjective + gerund",
        context: "Daily shopping at the local market is a tradition here",
      },
    ],
    intermediate: [
      {
        phrase: "bustling marketplace",
        definition:
          "A very busy and active place where people buy and sell goods",
        partOfSpeech: "adjective + noun",
        context:
          "The bustling marketplace was filled with vendors and shoppers",
      },
      {
        phrase: "vibrant atmosphere",
        definition:
          "An environment that is full of energy, activity, and bright colors",
        partOfSpeech: "adjective + noun",
        context:
          "The market had a vibrant atmosphere with music and lively conversations",
      },
      {
        phrase: "seasonal produce",
        definition:
          "Fruits and vegetables that are naturally available during certain times of the year",
        partOfSpeech: "adjective + noun",
        context: "The vendor specializes in seasonal produce from local farms",
      },
      {
        phrase: "haggling over prices",
        definition:
          "The practice of negotiating to get a better price for something",
        partOfSpeech: "gerund phrase",
        context:
          "Haggling over prices is common practice in traditional markets",
      },
      {
        phrase: "artisanal goods",
        definition:
          "Products made by hand using traditional methods, often unique or of high quality",
        partOfSpeech: "adjective + noun",
        context:
          "The market featured many artisanal goods from local craftspeople",
      },
    ],
    advanced: [
      {
        phrase: "cornucopia of flavors",
        definition: "An abundant variety of tastes and culinary experiences",
        partOfSpeech: "noun phrase",
        context:
          "The international food market offered a cornucopia of flavors from around the world",
      },
      {
        phrase: "entrepreneurial spirit",
        definition:
          "The mindset and attitude of someone who takes initiative in business ventures",
        partOfSpeech: "adjective + noun",
        context:
          "The young vendors displayed remarkable entrepreneurial spirit in their market stalls",
      },
      {
        phrase: "sustainable agriculture",
        definition:
          "Farming practices that maintain soil health and environmental balance for future generations",
        partOfSpeech: "adjective + noun",
        context:
          "Many vendors promoted products from sustainable agriculture initiatives",
      },
      {
        phrase: "cultural authenticity",
        definition:
          "The genuine representation of traditional customs and practices of a particular culture",
        partOfSpeech: "adjective + noun",
        context:
          "The market maintained its cultural authenticity despite modern influences",
      },
      {
        phrase: "economic microcosm",
        definition:
          "A small-scale representation of larger economic principles and relationships",
        partOfSpeech: "adjective + noun",
        context:
          "The local market serves as an economic microcosm of supply and demand dynamics",
      },
    ],
  };

  // Simulate API delay
  await new Promise((resolve) =>
    setTimeout(resolve, 1200 + Math.random() * 2000),
  );

  const levelPhrases = mockPhrases[targetLevel as keyof typeof mockPhrases];
  const selectedPhrases = levelPhrases.slice(
    0,
    Math.min(maxPhrases, levelPhrases.length),
  );

  return selectedPhrases.map((phrase, index) => ({
    id: `phrase_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    imageId: imageUrl, // In production, this would be a proper image ID
    phrase: phrase.phrase,
    definition: phrase.definition,
    partOfSpeech: phrase.partOfSpeech,
    difficulty: targetLevel,
    context: phrase.context,
    createdAt: new Date(),
  }));
};

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const {
      imageUrl,
      descriptionText,
      style,
      targetLevel,
      maxPhrases,
      categories,
    } = phraseExtractionSchema.parse(body);

    // Extract categorized phrases using new service
    const categorizedPhrases = await PhraseExtractor.extractCategorizedPhrases({
      description: descriptionText,
      imageUrl,
      targetLevel,
      maxPhrases,
      categories,
    });

    // Flatten for backwards compatibility with existing PhrasesPanel
    const flattenedPhrases = Object.values(categorizedPhrases)
      .flat()
      .map((phrase) => ({
        id: phrase.id,
        phrase: phrase.phrase,
        definition: phrase.definition,
        partOfSpeech: phrase.partOfSpeech,
        difficulty: phrase.difficulty,
        context: phrase.context,
        category: phrase.category,
        gender: phrase.gender,
        article: phrase.article,
        conjugation: phrase.conjugation,
        createdAt: phrase.createdAt,
      }));

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        phrases: flattenedPhrases,
        categorizedPhrases,
        metadata: {
          extractionMethod: "enhanced_categorized",
          totalPhrases: flattenedPhrases.length,
          categoryCounts: Object.entries(categorizedPhrases).reduce(
            (acc, [category, phrases]) => {
              acc[category] = phrases.length;
              return acc;
            },
            {} as Record<string, number>,
          ),
          targetLevel,
          style,
          responseTime: `${responseTime}ms`,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache",
          "X-Response-Time": `${responseTime}ms`,
          "X-Phrases-Count": flattenedPhrases.length.toString(),
          "X-Categories": Object.keys(categorizedPhrases).join(","),
        },
      },
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
          timestamp: new Date().toISOString(),
        },
        {
          status: 400,
          headers: {
            "X-Response-Time": `${responseTime}ms`,
          },
        },
      );
    }

    console.error("Phrase extraction error:", error);

    return NextResponse.json(
      {
        error: "Failed to extract phrases",
        message:
          "An error occurred while processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        retry: true,
      },
      {
        status: 500,
        headers: {
          "Retry-After": "30",
          "X-Response-Time": `${responseTime}ms`,
        },
      },
    );
  }
}
