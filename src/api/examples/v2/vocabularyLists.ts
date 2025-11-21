/**
 * V2 API Example: Vocabulary Lists
 * Modern REST API with cursor pagination and HATEOAS
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';
import { createHateoasLinks, offsetToCursor, cursorToOffset } from '../../versioning/utils';

// V2 Request/Response Types
export interface V2ListVocabularyQuery {
  limit?: number;
  cursor?: string;
}

export interface V2VocabularyList {
  id: string;
  name: string;
  description: string | null;
  metadata: {
    language: string;
    difficultyLevel: number;
    tags: string[];
    itemCount?: number;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  _links: {
    self: string;
    items: string;
    update?: string;
    delete?: string;
  };
}

export interface V2ListVocabularyResponse {
  success: boolean;
  data: V2VocabularyList[];
  pagination: {
    total: number;
    limit: number;
    cursor?: string;
    hasMore: boolean;
    _links: {
      self: string;
      first: string;
      prev?: string;
      next?: string;
      last?: string;
    };
  };
  _links: {
    self: string;
    create: string;
  };
}

// V2 Validation Schemas
const v2QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

const v2CreateListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  metadata: z.object({
    language: z.enum(['es', 'en', 'fr', 'de']).default('es'),
    difficultyLevel: z.number().int().min(1).max(5).default(1),
    tags: z.array(z.string()).optional().default([]),
  }).optional(),
});

/**
 * V2 GET Handler: List vocabulary lists with cursor pagination
 */
export async function handleV2GetLists(
  request: NextRequest
): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = v2QuerySchema.parse({
      limit: searchParams.get('limit'),
      cursor: searchParams.get('cursor'),
    });

    // Parse cursor for offset
    const offset = query.cursor
      ? cursorToOffset(query.cursor).offset
      : 0;

    // Mock data for example
    const mockLists: V2VocabularyList[] = [
      {
        id: '1',
        name: 'Spanish Basics',
        description: 'Essential Spanish vocabulary for beginners',
        metadata: {
          language: 'es',
          difficultyLevel: 1,
          tags: ['beginner', 'spanish', 'basics'],
          itemCount: 50,
        },
        timestamps: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        _links: {
          self: '/api/v2/vocabulary/lists/1',
          items: '/api/v2/vocabulary/lists/1/items',
          update: '/api/v2/vocabulary/lists/1',
          delete: '/api/v2/vocabulary/lists/1',
        },
      },
      {
        id: '2',
        name: 'Advanced English',
        description: 'Advanced English vocabulary for professionals',
        metadata: {
          language: 'en',
          difficultyLevel: 4,
          tags: ['advanced', 'english', 'professional'],
          itemCount: 120,
        },
        timestamps: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        _links: {
          self: '/api/v2/vocabulary/lists/2',
          items: '/api/v2/vocabulary/lists/2/items',
          update: '/api/v2/vocabulary/lists/2',
          delete: '/api/v2/vocabulary/lists/2',
        },
      },
    ];

    const paginatedLists = mockLists.slice(offset, offset + query.limit);
    const hasMore = offset + query.limit < mockLists.length;
    const nextCursor = hasMore
      ? offsetToCursor(offset + query.limit, query.limit)
      : undefined;

    const responseTime = performance.now() - startTime;
    const baseUrl = '/api/v2/vocabulary/lists';

    const response: V2ListVocabularyResponse = {
      success: true,
      data: paginatedLists,
      pagination: {
        total: mockLists.length,
        limit: query.limit,
        cursor: query.cursor,
        hasMore,
        _links: {
          self: query.cursor ? `${baseUrl}?cursor=${query.cursor}` : baseUrl,
          first: baseUrl,
          ...(nextCursor && {
            next: `${baseUrl}?cursor=${nextCursor}`,
          }),
        },
      },
      _links: {
        self: baseUrl,
        create: baseUrl,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/vnd.describeit.v2+json',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'Cache-Control': 'private, max-age=300',
        ETag: `"${Buffer.from(JSON.stringify(response)).toString('base64').slice(0, 16)}"`,
      },
    });
  } catch (error) {
    apiLogger.error('V2 API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred processing your request',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * V2 POST Handler: Create vocabulary list with enhanced metadata
 */
export async function handleV2CreateList(
  request: NextRequest
): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const validatedData = v2CreateListSchema.parse(body);

    // Mock creation
    const id = Date.now().toString();
    const newList: V2VocabularyList = {
      id,
      name: validatedData.name,
      description: validatedData.description || null,
      metadata: {
        language: validatedData.metadata?.language || 'es',
        difficultyLevel: validatedData.metadata?.difficultyLevel || 1,
        tags: validatedData.metadata?.tags || [],
        itemCount: 0,
      },
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      _links: {
        self: `/api/v2/vocabulary/lists/${id}`,
        items: `/api/v2/vocabulary/lists/${id}/items`,
        update: `/api/v2/vocabulary/lists/${id}`,
        delete: `/api/v2/vocabulary/lists/${id}`,
      },
    };

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: newList,
        _links: {
          self: `/api/v2/vocabulary/lists/${id}`,
          collection: '/api/v2/vocabulary/lists',
        },
      },
      {
        status: 201,
        headers: {
          'Content-Type': 'application/vnd.describeit.v2+json',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          Location: `/api/v2/vocabulary/lists/${id}`,
        },
      }
    );
  } catch (error) {
    apiLogger.error('V2 API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred processing your request',
        },
      },
      { status: 500 }
    );
  }
}
