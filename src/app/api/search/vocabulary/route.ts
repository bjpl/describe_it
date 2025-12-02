import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { featureFlags } from '@/lib/vector/config';
import { vectorSearchService } from '@/lib/vector/services/search';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// RRF fusion constant
const RRF_K = 60;

interface VocabularyItem {
  id: string;
  phrase: string;
  definition?: string;
  example?: string;
  category?: string;
  difficulty?: string;
  user_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const difficulty = searchParams.get('difficulty');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const useSemanticSearch = searchParams.get('semantic') !== 'false'; // Default to true
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!query.trim() && !difficulty && !category) {
      return NextResponse.json({ results: [], searchMode: 'none' });
    }

    // Determine if we should use hybrid search
    const useHybrid = useSemanticSearch && query.trim() && featureFlags.useVectorSearch();

    let results: VocabularyItem[] = [];
    let searchMode: 'sql' | 'semantic' | 'hybrid' = 'sql';

    if (useHybrid) {
      // Perform hybrid RRF search combining SQL and vector results
      try {
        const [sqlResults, vectorResults] = await Promise.all([
          performSqlSearch(supabase, query, difficulty, category, userId, limit),
          performVectorSearch(query, difficulty, category, limit),
        ]);

        results = fuseResultsRRF(sqlResults, vectorResults, limit);
        searchMode = 'hybrid';

        logger.info('[VocabularySearch] Hybrid search completed', {
          query: query.substring(0, 50),
          sqlCount: sqlResults.length,
          vectorCount: vectorResults.length,
          fusedCount: results.length,
        });
      } catch (error) {
        // Fallback to SQL-only on vector search failure
        logger.warn('[VocabularySearch] Vector search failed, falling back to SQL', { error });
        results = await performSqlSearch(supabase, query, difficulty, category, userId, limit);
        searchMode = 'sql';
      }
    } else {
      // Standard SQL search
      results = await performSqlSearch(supabase, query, difficulty, category, userId, limit);
      searchMode = 'sql';
    }

    // Group by category for better organization
    const groupedResults = results.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, VocabularyItem[]>);

    const latency = Date.now() - startTime;

    return NextResponse.json({
      results,
      grouped: groupedResults,
      count: results.length,
      query,
      filters: {
        difficulty,
        category
      },
      meta: {
        searchMode,
        vectorEnabled: featureFlags.useVectorSearch(),
        latencyMs: latency,
      }
    }, {
      headers: {
        'X-Search-Mode': searchMode,
        'X-Response-Time': `${latency}ms`,
      }
    });
  } catch (error) {
    logger.error('Search vocabulary error:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Perform traditional SQL-based search
 */
async function performSqlSearch(
  supabase: SupabaseClient,
  query: string,
  difficulty: string | null,
  category: string | null,
  userId: string | null,
  limit: number
): Promise<VocabularyItem[]> {
  let dbQuery = supabase
    .from('vocabulary_items')
    .select('*');

  if (query.trim()) {
    dbQuery = dbQuery.or(
      `phrase.ilike.%${query}%,definition.ilike.%${query}%,example.ilike.%${query}%,category.ilike.%${query}%`
    );
  }

  if (difficulty && difficulty !== 'all') {
    dbQuery = dbQuery.eq('difficulty', difficulty);
  }

  if (category && category.trim()) {
    dbQuery = dbQuery.ilike('category', `%${category}%`);
  }

  if (userId) {
    dbQuery = dbQuery.eq('user_id', userId);
  }

  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data, error } = await dbQuery;

  if (error) {
    logger.error('SQL search error:', { error });
    throw error;
  }

  return (data || []) as VocabularyItem[];
}

/**
 * Perform vector semantic search
 */
async function performVectorSearch(
  query: string,
  difficulty: string | null,
  category: string | null,
  limit: number
): Promise<VocabularyItem[]> {
  const filters = [];

  if (difficulty && difficulty !== 'all') {
    filters.push({
      field: 'difficulty',
      operator: 'eq' as const,
      value: difficulty,
    });
  }

  if (category && category.trim()) {
    filters.push({
      field: 'category',
      operator: 'contains' as const,
      value: category,
    });
  }

  const results = await vectorSearchService.searchVocabulary(query, {
    limit,
    threshold: 0.6, // Lower threshold for vocabulary search
    filters,
  });

  // Transform vector results to match VocabularyItem structure
  return results.map(result => ({
    id: result.id,
    phrase: result.metadata.word,
    definition: result.metadata.definition as string | undefined,
    category: (result.metadata as Record<string, unknown>).category as string | undefined,
    difficulty: (result.metadata as Record<string, unknown>).difficulty as string | undefined,
    language: result.metadata.language as string | undefined,
    _score: result.score, // Include similarity score for debugging
  })) as VocabularyItem[];
}

/**
 * Fuse SQL and vector results using Reciprocal Rank Fusion (RRF)
 */
function fuseResultsRRF(
  sqlResults: VocabularyItem[],
  vectorResults: VocabularyItem[],
  limit: number,
  sqlWeight: number = 0.4,
  vectorWeight: number = 0.6
): VocabularyItem[] {
  const scores = new Map<string, { score: number; item: VocabularyItem }>();

  // Score SQL results
  sqlResults.forEach((item, rank) => {
    const rrfScore = sqlWeight * (1 / (RRF_K + rank + 1));
    scores.set(item.id, { score: rrfScore, item });
  });

  // Add vector results with RRF scoring
  vectorResults.forEach((item, rank) => {
    const rrfScore = vectorWeight * (1 / (RRF_K + rank + 1));
    const existing = scores.get(item.id);

    if (existing) {
      // Combine scores for items found in both
      existing.score += rrfScore;
      // Prefer SQL item data as it's more complete
    } else {
      scores.set(item.id, { score: rrfScore, item });
    }
  });

  // Sort by combined score and return top results
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
