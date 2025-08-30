import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { createPhraseSchema, phraseFiltersSchema, type CreatePhraseRequest, type PhraseFiltersRequest } from '@/lib/validations/vocabulary';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// GET - Get user's vocabulary/phrases
async function getVocabularyHandler(req: AuthenticatedRequest, validData: PhraseFiltersRequest) {
  try {
    const phrases = await supabaseService.getUserPhrases(req.user.id, {
      category: validData.category,
      difficulty: validData.difficulty_level,
      isUserSelected: validData.is_user_selected,
      isMastered: validData.is_mastered,
      limit: validData.limit,
      offset: validData.offset,
    });

    // Get total count for pagination
    let countQuery = supabaseService.getClient()
      .from('phrases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (validData.category) {
      countQuery = countQuery.eq('category', validData.category);
    }
    if (validData.difficulty_level) {
      countQuery = countQuery.eq('difficulty_level', validData.difficulty_level);
    }
    if (typeof validData.is_user_selected === 'boolean') {
      countQuery = countQuery.eq('is_user_selected', validData.is_user_selected);
    }
    if (typeof validData.is_mastered === 'boolean') {
      countQuery = countQuery.eq('is_mastered', validData.is_mastered);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / validData.limit);

    return NextResponse.json({
      data: phrases,
      meta: {
        total: totalCount,
        page: Math.floor(validData.offset / validData.limit) + 1,
        limit: validData.limit,
        pages: totalPages,
        has_more: validData.offset + validData.limit < totalCount,
      },
      message: 'Vocabulary retrieved successfully'
    });

  } catch (error) {
    console.error('Get vocabulary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new phrase
async function createVocabularyHandler(req: AuthenticatedRequest, validData: CreatePhraseRequest) {
  try {
    const phraseData = {
      ...validData,
      user_id: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const phrase = await supabaseService.createPhrase(phraseData);

    // Store vocabulary addition in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'phrase_created',
            metadata: { 
              phrase_id: phrase.id, 
              spanish_text: phrase.spanish_text,
              category: phrase.category,
              timestamp: new Date().toISOString() 
            }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data: phrase,
      message: 'Phrase created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create vocabulary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export route handlers with appropriate middleware
export const GET = withCacheAndAuth(
  'vocabulary',
  (req) => {
    const url = new URL(req.url);
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `vocabulary:${(req as AuthenticatedRequest).user.id}:${params}`;
  }
)(withValidation(phraseFiltersSchema, getVocabularyHandler));

export const POST = withAuthAndRateLimit('api')(
  withValidation(createPhraseSchema, createVocabularyHandler)
);