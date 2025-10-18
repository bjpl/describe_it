import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiLogger, dbLogger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface ReviewPayload {
  itemId: string;
  quality: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const body: ReviewPayload = await request.json();

    const {
      itemId,
      quality,
      easeFactor,
      interval,
      repetitions,
      nextReviewDate,
    } = body;

    // Update vocabulary item with new review data
    const { error: updateError } = await supabase
      .from('user_vocabulary')
      .update({
        ease_factor: easeFactor,
        interval,
        repetitions,
        next_review_date: nextReviewDate,
        last_review_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    // Record review in history
    const { error: historyError } = await supabase
      .from('review_history')
      .insert({
        user_id: userId,
        vocabulary_id: itemId,
        quality,
        ease_factor: easeFactor,
        interval,
        created_at: new Date().toISOString(),
      });

    if (historyError) {
      dbLogger.error('Failed to record review history', historyError, { context: 'vocabulary-review' });
    }

    // Update daily progress
    const today = new Date().toISOString().split('T')[0];
    const points = quality >= 3 ? 10 : 5; // Award points based on quality

    const { data: existingProgress } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingProgress) {
      await supabase
        .from('daily_progress')
        .update({
          points: existingProgress.points + points,
          reviews: existingProgress.reviews + 1,
        })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabase.from('daily_progress').insert({
        user_id: userId,
        date: today,
        points,
        reviews: 1,
        words_learned: 0,
      });
    }

    // Update user progress totals
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userProgress) {
      await supabase
        .from('user_progress')
        .update({
          total_points: userProgress.total_points + points,
          total_reviews: userProgress.total_reviews + 1,
        })
        .eq('user_id', userId);
    } else {
      await supabase.from('user_progress').insert({
        user_id: userId,
        total_points: points,
        total_reviews: 1,
        current_streak: 1,
      });
    }

    return NextResponse.json({
      success: true,
      pointsEarned: points,
    });
  } catch (error) {
    apiLogger.error('Error saving review', error instanceof Error ? error : new Error(String(error)), { endpoint: '/api/vocabulary/review' });
    return NextResponse.json(
      { error: 'Failed to save review' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user';

    // Get vocabulary items due for review
    const now = new Date().toISOString();

    const { data: dueItems, error } = await supabase
      .from('user_vocabulary')
      .select('*')
      .eq('user_id', userId)
      .or(`next_review_date.is.null,next_review_date.lte.${now}`)
      .order('next_review_date', { ascending: true })
      .limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      items: dueItems || [],
      count: dueItems?.length || 0,
    });
  } catch (error) {
    apiLogger.error('Error fetching review items', error instanceof Error ? error : new Error(String(error)), { endpoint: '/api/vocabulary/review' });
    return NextResponse.json(
      { error: 'Failed to fetch review items' },
      { status: 500 }
    );
  }
}
