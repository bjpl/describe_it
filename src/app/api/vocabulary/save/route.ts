import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { z } from "zod";
import { descriptionCache } from "@/lib/cache";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";
import { apiLogger } from '@/lib/logger';
import { asLogContext } from '@/lib/utils/typeGuards';

// Type definitions from Zod schemas
type VocabularyItem = z.infer<typeof vocabularySaveSchema>["vocabulary"] & {
  id: string;
  userId: string;
  collectionName: string;
  createdAt: string;
  updatedAt: string;
  metadata?: z.infer<typeof vocabularySaveSchema>["metadata"] & {
    timestamp: string;
    saved: boolean;
    bulkImport?: boolean;
  };
};

type VocabularyFilters = z.infer<typeof vocabularyQuerySchema>;

type CollectionIndex = {
  items: Array<{
    id: string;
    phrase: string;
    category: string;
    difficulty: string;
    tags: string[];
    collectionName: string;
    createdAt: string;
    updatedAt: string;
  }>;
  collections: Record<
    string,
    {
      name: string;
      itemCount: number;
      lastUpdated: string;
    }
  >;
  lastUpdated: string;
};

type UserStats = {
  totalItems: number;
  difficultyCounts: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  categoryCounts: Record<string, number>;
  lastUpdated: string;
};

// Input validation schema
const vocabularySaveSchema = z.object({
  userId: z.string().optional().default("anonymous"),
  vocabulary: z.object({
    id: z.string(),
    phrase: z.string(),
    definition: z.string(),
    category: z.string(),
    partOfSpeech: z.string().optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    context: z.string().optional(),
    translation: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    imageUrl: z.string().url().optional(),
    gender: z.enum(["masculino", "femenino", "neutro"]).optional(),
    article: z.string().optional(),
    conjugation: z.string().optional(),
    examples: z.array(z.string()).optional().default([]),
  }),
  collectionName: z.string().optional().default("default"),
  metadata: z
    .object({
      source: z.string().optional(),
      timestamp: z.string().optional(),
      confidence: z.number().optional(),
      reviewCount: z.number().optional().default(0),
      lastReviewed: z.string().optional(),
      masteryLevel: z.number().min(0).max(1).optional().default(0),
    })
    .optional(),
});

const vocabularyBulkSaveSchema = z.object({
  userId: z.string().optional().default("anonymous"),
  vocabularyItems: z.array(vocabularySaveSchema.shape.vocabulary),
  collectionName: z.string().optional().default("default"),
  metadata: vocabularySaveSchema.shape.metadata.optional(),
});

const vocabularyQuerySchema = z.object({
  userId: z.string().optional().default("anonymous"),
  collectionName: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(["phrase", "difficulty", "createdAt", "masteryLevel"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const runtime = "nodejs";

// Storage service for vocabulary persistence using Supabase database
class VocabularyStorage {
  private cachePrefix = "vocabulary";
  private userPrefix = (userId: string) => `${this.cachePrefix}:user:${userId}`;
  private collectionPrefix = (userId: string, collection: string) =>
    `${this.userPrefix(userId)}:collection:${collection}`;

  async saveVocabulary(
    userId: string,
    vocabulary: any,
    collectionName: string,
    metadata?: any,
  ) {
    const { DatabaseService } = await import('@/lib/supabase');

    // First, ensure vocabulary list exists
    let listId: string;
    const existingLists = await DatabaseService.getVocabularyLists();
    const existingList = existingLists.find(list => list.name === collectionName);

    if (existingList) {
      listId = existingList.id;
    } else {
      const newList = await DatabaseService.createVocabularyList({
        name: collectionName,
        description: `Vocabulary collection: ${collectionName}`,
        category: 'general',
      });

      if (!newList) {
        throw new Error('Failed to create vocabulary list');
      }
      listId = newList.id;
    }

    // Map difficulty to number
    const difficultyMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3
    };

    // Save vocabulary item to database
    const vocabularyItem = await DatabaseService.addVocabularyItem({
      vocabulary_list_id: listId,
      spanish_text: vocabulary.phrase,
      english_translation: vocabulary.translation || vocabulary.definition,
      part_of_speech: vocabulary.partOfSpeech || 'other',
      difficulty_level: difficultyMap[vocabulary.difficulty] || 1,
      category: vocabulary.category,
      context_sentence_spanish: vocabulary.context,
      context_sentence_english: vocabulary.examples?.[0],
      usage_notes: vocabulary.notes
    });

    if (!vocabularyItem) {
      throw new Error('Failed to save vocabulary item to database');
    }

    return {
      id: vocabularyItem.id,
      ...vocabulary,
      userId,
      collectionName,
      createdAt: vocabularyItem.created_at,
      updatedAt: vocabularyItem.created_at,
      metadata: {
        ...metadata,
        timestamp: vocabularyItem.created_at,
        saved: true,
      },
    };
  }

  async saveBulkVocabulary(
    userId: string,
    vocabularyItems: any[],
    collectionName: string,
    metadata?: any,
  ) {
    const { DatabaseService } = await import('@/lib/supabase');

    // First, ensure vocabulary list exists
    let listId: string;
    const existingLists = await DatabaseService.getVocabularyLists();
    const existingList = existingLists.find(list => list.name === collectionName);

    if (existingList) {
      listId = existingList.id;
    } else {
      const newList = await DatabaseService.createVocabularyList({
        name: collectionName,
        description: `Vocabulary collection: ${collectionName}`,
        category: 'general',
      });

      if (!newList) {
        throw new Error('Failed to create vocabulary list');
      }
      listId = newList.id;
    }

    // Map difficulty to number
    const difficultyMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3
    };

    const results = [];
    const timestamp = new Date().toISOString();

    // Save all vocabulary items to database
    for (const vocabulary of vocabularyItems) {
      const vocabularyItem = await DatabaseService.addVocabularyItem({
        vocabulary_list_id: listId,
        spanish_text: vocabulary.phrase,
        english_translation: vocabulary.translation || vocabulary.definition,
        part_of_speech: vocabulary.partOfSpeech || 'other',
        difficulty_level: difficultyMap[vocabulary.difficulty] || 1,
        category: vocabulary.category,
        context_sentence_spanish: vocabulary.context,
        context_sentence_english: vocabulary.examples?.[0],
        usage_notes: vocabulary.notes
      });

      if (vocabularyItem) {
        results.push({
          id: vocabularyItem.id,
          ...vocabulary,
          userId,
          collectionName,
          createdAt: vocabularyItem.created_at,
          updatedAt: vocabularyItem.created_at,
          metadata: {
            ...metadata,
            timestamp: vocabularyItem.created_at,
            saved: true,
            bulkImport: true,
          },
        });
      }
    }

    return results;
  }

  async getVocabulary(userId: string, filters: any = {}) {
    const {
      collectionName,
      category,
      difficulty,
      tags,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = filters;

    try {
      const { DatabaseService } = await import('@/lib/supabase');

      // Get all vocabulary lists
      const lists = await DatabaseService.getVocabularyLists();

      // Filter by collection name if specified
      const targetLists = collectionName
        ? lists.filter(list => list.name === collectionName)
        : lists;

      if (targetLists.length === 0) {
        return {
          items: [],
          total: 0,
          offset,
          limit,
          hasMore: false,
        };
      }

      // Get items from all target lists
      let allItems: any[] = [];
      for (const list of targetLists) {
        const items = await DatabaseService.getVocabularyItems(list.id);

        // Transform database items to expected format
        const transformedItems = items.map(item => ({
          id: item.id,
          phrase: item.spanish_text,
          definition: item.english_translation,
          translation: item.english_translation,
          category: item.category,
          partOfSpeech: item.part_of_speech,
          difficulty: item.difficulty_level === 1 ? 'beginner' : item.difficulty_level === 2 ? 'intermediate' : 'advanced',
          context: item.context_sentence_spanish,
          notes: item.usage_notes,
          examples: item.context_sentence_english ? [item.context_sentence_english] : [],
          tags: [],
          collectionName: list.name,
          createdAt: item.created_at,
          updatedAt: item.created_at,
          userId,
        }));

        allItems = allItems.concat(transformedItems);
      }

      // Apply filters
      if (category) {
        allItems = allItems.filter(item => item.category === category);
      }

      if (difficulty) {
        allItems = allItems.filter(item => item.difficulty === difficulty);
      }

      if (tags && tags.length > 0) {
        allItems = allItems.filter(
          item => item.tags && item.tags.some((tag: string) => tags.includes(tag))
        );
      }

      // Sort items
      allItems.sort((a: any, b: any) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        if (sortBy === "createdAt" || sortBy === "updatedAt") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (sortOrder === "desc") {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });

      // Apply pagination
      const paginatedItems = allItems.slice(offset, offset + limit);

      return {
        items: paginatedItems,
        total: allItems.length,
        offset,
        limit,
        hasMore: offset + limit < allItems.length,
      };
    } catch (error) {
      apiLogger.warn("Failed to get vocabulary from database:", asLogContext(error));
      return {
        items: [],
        total: 0,
        offset,
        limit,
        hasMore: false,
      };
    }
  }

  async updateCollectionIndex(
    userId: string,
    collectionName: string,
    vocabularyId: string,
    vocabulary: any,
  ) {
    const indexKey = `${this.collectionPrefix(userId, collectionName)}:index`;

    try {
      const index: CollectionIndex = (await descriptionCache.get<CollectionIndex>(indexKey)) || {
        items: [],
        collections: {},
        lastUpdated: new Date().toISOString(),
      };

      // Remove existing item if it exists
      index.items = index.items.filter((item: any) => item.id !== vocabularyId);

      // Add updated item summary
      index.items.push({
        id: vocabularyId,
        phrase: vocabulary.phrase,
        category: vocabulary.category,
        difficulty: vocabulary.difficulty,
        tags: vocabulary.tags || [],
        collectionName,
        createdAt: vocabulary.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update collection metadata
      index.collections[collectionName] = {
        name: collectionName,
        itemCount: index.items.filter(
          (item: any) => item.collectionName === collectionName,
        ).length,
        lastUpdated: new Date().toISOString(),
      };

      index.lastUpdated = new Date().toISOString();

      await descriptionCache.set(index, 86400 * 30, indexKey);
    } catch (error) {
      apiLogger.warn("Failed to update collection index:", asLogContext(error));
    }
  }

  async updateUserStats(userId: string, difficulty: string, category: string) {
    const statsKey = `${this.userPrefix(userId)}:stats`;

    try {
      const stats: UserStats = (await descriptionCache.get<UserStats>(statsKey)) || {
        totalItems: 0,
        difficultyCounts: { beginner: 0, intermediate: 0, advanced: 0 },
        categoryCounts: {},
        lastUpdated: new Date().toISOString(),
      };

      stats.totalItems++;
      stats.difficultyCounts[
        difficulty as keyof typeof stats.difficultyCounts
      ]++;
      stats.categoryCounts[category] =
        (stats.categoryCounts[category] || 0) + 1;
      stats.lastUpdated = new Date().toISOString();

      await descriptionCache.set(stats, 86400 * 30, statsKey);
    } catch (error) {
      apiLogger.warn("Failed to update user stats:", asLogContext(error));
    }
  }

  async getUserStats(userId: string) {
    const statsKey = `${this.userPrefix(userId)}:stats`;
    return (
      (await descriptionCache.get(statsKey)) || {
        totalItems: 0,
        difficultyCounts: { beginner: 0, intermediate: 0, advanced: 0 },
        categoryCounts: {},
        lastUpdated: new Date().toISOString(),
      }
    );
  }
}

const vocabularyStorage = new VocabularyStorage();

// POST endpoint - Save vocabulary
async function handleVocabularySave(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  // Enforce user ID from auth context
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID required",
        message: "Authentication required to save vocabulary",
      },
      { status: 401 }
    );
  }

  try {
    const requestText = await request.text();
    const body = safeParse(requestText);
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };
    
    // Override any userId in the request body with authenticated user ID
    body.userId = userId;

    // Check if it's bulk save or single save
    if (body.vocabularyItems && Array.isArray(body.vocabularyItems)) {
      // Bulk save
      const { userId, vocabularyItems, collectionName, metadata } =
        vocabularyBulkSaveSchema.parse(body);

      const results = await vocabularyStorage.saveBulkVocabulary(
        userId,
        vocabularyItems,
        collectionName,
        metadata,
      );

      const responseTime = performance.now() - startTime;

      return NextResponse.json(
        {
          success: true,
          data: results,
          metadata: {
            count: results.length,
            userId,
            collectionName,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 201,
          headers: {
            "X-Response-Time": `${responseTime}ms`,
            "X-Items-Saved": results.length.toString(),
          },
        },
      );
    } else {
      // Single save
      const { userId, vocabulary, collectionName, metadata } =
        vocabularySaveSchema.parse(body);

      const result = await vocabularyStorage.saveVocabulary(
        userId,
        vocabulary,
        collectionName,
        metadata,
      );

      const responseTime = performance.now() - startTime;

      return NextResponse.json(
        {
          success: true,
          data: result,
          metadata: {
            userId,
            collectionName,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 201,
          headers: {
            "X-Response-Time": `${responseTime}ms`,
            Location: `/api/vocabulary/${result.id}`,
          },
        },
      );
    }
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

    apiLogger.error("Vocabulary save error:", asLogContext(error));

    return NextResponse.json(
      {
        error: "Failed to save vocabulary",
        message:
          "An error occurred while saving your vocabulary. Please try again.",
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

// GET endpoint - Retrieve vocabulary
async function handleVocabularyGet(request: AuthenticatedRequest) {
  const startTime = performance.now();
  const userId = request.user?.id;
  const userTier = request.user?.subscription_status || 'free';

  // Enforce user ID from auth context
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID required",
        message: "Authentication required to retrieve vocabulary",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = vocabularyQuerySchema.parse({
      userId: userId, // Use authenticated user ID
      collectionName: searchParams.get("collectionName") || undefined,
      category: searchParams.get("category") || undefined,
      difficulty: searchParams.get("difficulty") || undefined,
      tags: searchParams.getAll("tags"),
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    });

    const result = await vocabularyStorage.getVocabulary(
      filters.userId,
      filters,
    );
    const userStats = await vocabularyStorage.getUserStats(filters.userId);

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          offset: result.offset,
          limit: result.limit,
          hasMore: result.hasMore,
        },
        stats: userStats,
        metadata: {
          userId: filters.userId,
          filters: filters,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          "X-Response-Time": `${responseTime}ms`,
          "X-Total-Items": result.total.toString(),
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error) {
    const responseTime = performance.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
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

    apiLogger.error("Vocabulary retrieval error:", asLogContext(error));

    return NextResponse.json(
      {
        error: "Failed to retrieve vocabulary",
        message:
          "An error occurred while retrieving your vocabulary. Please try again.",
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


// Export authenticated handlers
export const POST = withBasicAuth(
  handleVocabularySave,
  {
    requiredFeatures: ['vocabulary_save'],
    errorMessages: {
      featureRequired: 'Vocabulary saving requires a valid subscription. Free tier includes basic vocabulary saving.',
    },
  }
);

export const GET = withBasicAuth(
  handleVocabularyGet,
  {
    requiredFeatures: ['vocabulary_save'],
    errorMessages: {
      featureRequired: 'Vocabulary access requires a valid subscription. Free tier includes basic vocabulary access.',
    },
  }
);
