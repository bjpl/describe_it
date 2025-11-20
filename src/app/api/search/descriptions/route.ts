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
    const userId = searchParams.get('userId');

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    // Build the query
    let dbQuery = supabase
      .from('saved_descriptions')
      .select('*')
      .or(`text.ilike.%${query}%,language.ilike.%${query}%,difficulty.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter by user if provided
    if (userId) {
      dbQuery = dbQuery.eq('user_id', userId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      logger.error('Search error:', { error });
      return NextResponse.json(
        { error: 'Failed to search descriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: data || [],
      count: data?.length || 0,
      query
    });
  } catch (error) {
    logger.error('Search descriptions error:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
