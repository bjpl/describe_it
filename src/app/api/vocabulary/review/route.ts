import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { z } from 'zod';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

const reviewFiltersSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  category: z.enum(['vocabulary', 'expression', 'idiom', 'phrase', 'grammar_pattern', 'collocation', 'verb_conjugation', 'cultural_reference']).optional(),
});

type ReviewFiltersRequest = z.infer<typeof reviewFiltersSchema>;

// GET - Get phrases for spaced repetition review
async function getReviewPhrasesHandler(req: AuthenticatedRequest, validData: ReviewFiltersRequest) {
  try {
    // Get phrases that need review based on spaced repetition algorithm
    let query = supabaseService.getClient()
      .from('phrases')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_user_selected', true)
      .eq('is_mastered', false)
      .not('last_studied_at', 'is', null);

    // Apply filters
    if (validData.difficulty_level) {
      query = query.eq('difficulty_level', validData.difficulty_level);
    }

    if (validData.category) {
      query = query.eq('category', validData.category);
    }

    // Calculate which phrases are due for review
    // This is a simplified version - a real implementation would use more sophisticated spaced repetition algorithms
    const now = new Date();
    const phrases = await query
      .order('last_studied_at', { ascending: true })
      .limit(validData.limit * 2); // Get extra to filter by due date

    if (phrases.error) {
      throw new Error(phrases.error.message);
    }

    // Filter phrases that are due for review based on study count and time elapsed
    const dueForReview = phrases.data?.filter(phrase => {
      if (!phrase.last_studied_at) return true;
      
      const lastStudied = new Date(phrase.last_studied_at);
      const daysSinceStudied = Math.floor((now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24));
      
      // Simple spaced repetition intervals based on study count
      let interval = 1;
      if (phrase.study_count >= 1) interval = 3;
      if (phrase.study_count >= 3) interval = 7;
      if (phrase.study_count >= 5) interval = 14;
      if (phrase.study_count >= 8) interval = 30;
      
      // Adjust interval based on accuracy
      const accuracy = phrase.study_count > 0 ? phrase.correct_count / phrase.study_count : 0;
      if (accuracy < 0.6) interval = Math.max(1, Math.floor(interval * 0.5));
      else if (accuracy > 0.8) interval = Math.floor(interval * 1.5);
      
      return daysSinceStudied >= interval;
    }) || [];

    // Limit to requested amount
    const reviewPhrases = dueForReview.slice(0, validData.limit);

    // Get user's vocabulary statistics for context
    const { data: statsData } = await supabaseService.getClient()
      .rpc('get_user_vocabulary_stats', {
        user_uuid: req.user.id,
        category_filter: validData.category || null
      });

    const stats = statsData?.[0] || {
      total_phrases: 0,
      selected_phrases: 0,
      mastered_phrases: 0,
      mastery_percentage: 0,
      avg_study_count: 0,
    };

    return NextResponse.json({
      data: reviewPhrases,
      meta: {
        total_due: dueForReview.length,
        returned: reviewPhrases.length,
        vocabulary_stats: stats,
      },
      message: 'Review phrases retrieved successfully'
    });

  } catch (error) {
    console.error('Get review phrases error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withCacheAndAuth(
  'vocabulary',
  (req) => {
    const url = new URL(req.url);
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `vocabulary_review:${(req as AuthenticatedRequest).user.id}:${params}`;
  }
)(withValidation(reviewFiltersSchema, getReviewPhrasesHandler));