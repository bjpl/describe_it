/**
 * V1 API Example: Vocabulary Lists
 * Traditional REST API with offset pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';

// V1 Request/Response Types
export interface V1ListVocabularyQuery {
  limit?: number;
  offset?: number;
}

export interface V1VocabularyList {
  id: string;
  name: string;
  description?: string;
  language: string;
  difficulty_level: number;
  created_at: string;
  updated_at: string;
}

export interface V1ListVocabularyResponse {
  success: boolean;
  data: V1VocabularyList[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  metadata?: {
    responseTime: string;
    timestamp: string;
  };
}

// V1 Validation Schemas
const v1QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const v1CreateListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  language: z.enum(['es', 'en']).default('es'),
  difficulty_level: z.number().int().min(1).max(3).default(1),
});

/**
 * V1 GET Handler: List vocabulary lists
 */
export async function handleV1GetLists(
  request: NextRequest
): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const { limit, offset } = v1QuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    // Mock data for example
    const mockLists: V1VocabularyList[] = [
      {
        id: '1',
        name: 'Spanish Basics',
        description: 'Essential Spanish vocabulary',
        language: 'es',
        difficulty_level: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Advanced English',
        description: 'Advanced English vocabulary',
        language: 'en',
        difficulty_level: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const paginatedLists = mockLists.slice(offset, offset + limit);
    const responseTime = performance.now() - startTime;

    const response: V1ListVocabularyResponse = {
      success: true,
      data: paginatedLists,
      pagination: {
        total: mockLists.length,
        offset,
        limit,
        hasMore: offset + limit < mockLists.length,
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${responseTime.toFixed(2)}ms`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    apiLogger.error('V1 API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred processing your request',
      },
      { status: 500 }
    );
  }
}

/**
 * V1 POST Handler: Create vocabulary list
 */
export async function handleV1CreateList(
  request: NextRequest
): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const validatedData = v1CreateListSchema.parse(body);

    // Mock creation
    const newList: V1VocabularyList = {
      id: Date.now().toString(),
      ...validatedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const responseTime = performance.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: newList,
        metadata: {
          responseTime: `${responseTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          Location: `/api/v1/vocabulary/lists/${newList.id}`,
        },
      }
    );
  } catch (error) {
    apiLogger.error('V1 API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred processing your request',
      },
      { status: 500 }
    );
  }
}
