import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
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

    if (!query.trim() && !difficulty && !category) {
      return NextResponse.json({ results: [] });
    }

    // Build the base query
    let dbQuery = supabase
      .from('vocabulary_items')
      .select('*');

    // Add text search if query provided
    if (query.trim()) {
      dbQuery = dbQuery.or(
        `phrase.ilike.%${query}%,definition.ilike.%${query}%,example.ilike.%${query}%,category.ilike.%${query}%`
      );
    }

    // Add filters
    if (difficulty && difficulty !== 'all') {
      dbQuery = dbQuery.eq('difficulty', difficulty);
    }

    if (category && category.trim()) {
      dbQuery = dbQuery.ilike('category', `%${category}%`);
    }

    if (userId) {
      dbQuery = dbQuery.eq('user_id', userId);
    }

    // Order and limit
    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .limit(100);

    const { data, error } = await dbQuery;

    if (error) {
      logger.error('Search error:', { error });
      return NextResponse.json(
        { error: 'Failed to search vocabulary' },
        { status: 500 }
      );
    }

    // Group by category for better organization
    const groupedResults = (data || []).reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, typeof data>);

    return NextResponse.json({
      results: data || [],
      grouped: groupedResults,
      count: data?.length || 0,
      query,
      filters: {
        difficulty,
        category
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
