import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { descriptionCache } from "@/lib/cache";
import { withBasicAuth } from "@/lib/middleware/withAuth";
import type { AuthenticatedRequest } from "@/lib/middleware/auth";

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

// Storage service for vocabulary persistence
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
    const vocabularyId = vocabulary.id;
    const timestamp = new Date().toISOString();

    const vocabularyItem = {
      ...vocabulary,
      id: vocabularyId,
      userId,
      collectionName,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        ...metadata,
        timestamp,
        saved: true,
      },
    };

    // Save individual vocabulary item
    const itemKey = `${this.collectionPrefix(userId, collectionName)}:item:${vocabularyId}`;
    await descriptionCache.set(itemKey, vocabularyItem, {
      kvTTL: 86400 * 30, // 30 days
      memoryTTL: 3600, // 1 hour
      sessionTTL: 1800, // 30 minutes
    });

    // Update collection index
    await this.updateCollectionIndex(
      userId,
      collectionName,
      vocabularyId,
      vocabulary,
    );

    // Update user statistics
    await this.updateUserStats(
      userId,
      vocabulary.difficulty,
      vocabulary.category,
    );

    return vocabularyItem;
  }

  async saveBulkVocabulary(
    userId: string,
    vocabularyItems: any[],
    collectionName: string,
    metadata?: any,
  ) {
    const results = [];
    const timestamp = new Date().toISOString();

    for (const vocabulary of vocabularyItems) {
      const vocabularyItem = {
        ...vocabulary,
        id:
          vocabulary.id ||
          `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        collectionName,
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: {
          ...metadata,
          timestamp,
          saved: true,
          bulkImport: true,
        },
      };

      const itemKey = `${this.collectionPrefix(userId, collectionName)}:item:${vocabularyItem.id}`;
      await descriptionCache.set(itemKey, vocabularyItem, {
        kvTTL: 86400 * 30, // 30 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 1800, // 30 minutes
      });

      results.push(vocabularyItem);
    }

    // Update collection index with all items
    for (const item of results) {
      await this.updateCollectionIndex(userId, collectionName, item.id, item);
      await this.updateUserStats(userId, item.difficulty, item.category);
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
      // Get collection index
      const indexKey = collectionName
        ? `${this.collectionPrefix(userId, collectionName)}:index`
        : `${this.userPrefix(userId)}:index`;

      const index = (await descriptionCache.get(indexKey)) || { items: [] };
      let items = index.items || [];

      // Apply filters
      if (category) {
        items = items.filter((item: any) => item.category === category);
      }

      if (difficulty) {
        items = items.filter((item: any) => item.difficulty === difficulty);
      }

      if (tags && tags.length > 0) {
        items = items.filter(
          (item: any) =>
            item.tags && item.tags.some((tag: string) => tags.includes(tag)),
        );
      }

      // Sort items
      items.sort((a: any, b: any) => {
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
      const paginatedItems = items.slice(offset, offset + limit);

      // Fetch full details for paginated items
      const fullItems = [];
      for (const item of paginatedItems) {
        const itemKey = `${this.collectionPrefix(userId, item.collectionName)}:item:${item.id}`;
        const fullItem = await descriptionCache.get(itemKey);
        if (fullItem) {
          fullItems.push(fullItem);
        }
      }

      return {
        items: fullItems,
        total: items.length,
        offset,
        limit,
        hasMore: offset + limit < items.length,
      };
    } catch (error) {
      console.warn("Failed to get vocabulary from cache:", error);
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
      const index = (await descriptionCache.get(indexKey)) || {
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

      await descriptionCache.set(indexKey, index, {
        kvTTL: 86400 * 30, // 30 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 1800, // 30 minutes
      });
    } catch (error) {
      console.warn("Failed to update collection index:", error);
    }
  }

  async updateUserStats(userId: string, difficulty: string, category: string) {
    const statsKey = `${this.userPrefix(userId)}:stats`;

    try {
      const stats = (await descriptionCache.get(statsKey)) || {
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

      await descriptionCache.set(statsKey, stats, {
        kvTTL: 86400 * 30, // 30 days
        memoryTTL: 3600, // 1 hour
        sessionTTL: 1800, // 30 minutes
      });
    } catch (error) {
      console.warn("Failed to update user stats:", error);
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
    const body = await request.json();
    
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

    console.error("Vocabulary save error:", error);

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

    console.error("Vocabulary retrieval error:", error);

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
