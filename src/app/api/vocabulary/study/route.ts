import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { markStudiedSchema, spacedRepetitionUpdateSchema, type MarkStudiedRequest, type SpacedRepetitionUpdateRequest } from '@/lib/validations/vocabulary';
import { withAuthAndRateLimit, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// POST - Mark phrase as studied
async function markStudiedHandler(req: AuthenticatedRequest, validData: MarkStudiedRequest) {
  try {
    const { phrase_id, was_correct, response_time_ms, session_id } = validData;

    // Check if phrase exists and belongs to user
    const existingPhrase = await supabaseService.getPhrase(phrase_id);
    if (!existingPhrase) {
      return NextResponse.json(
        { error: 'Phrase not found' },
        { status: 404 }
      );
    }

    if (existingPhrase.user_id !== req.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update phrase study statistics
    const updatedPhrase = await supabaseService.markPhraseAsStudied(phrase_id, was_correct);

    // Update session if provided
    if (session_id) {
      const { data: session } = await supabaseService.getClient()
        .from('sessions')
        .select('questions_answered, questions_correct')
        .eq('id', session_id)
        .single();

      if (session) {
        await supabaseService.updateSession(session_id, {
          questions_answered: session.questions_answered + 1,
          questions_correct: session.questions_correct + (was_correct ? 1 : 0),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Store study activity in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'phrase_studied',
            metadata: { 
              phrase_id, 
              was_correct,
              response_time_ms,
              session_id,
              timestamp: new Date().toISOString() 
            }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data: updatedPhrase,
      message: 'Study progress recorded successfully'
    });

  } catch (error) {
    console.error('Mark studied error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuthAndRateLimit('api')(
  withValidation(markStudiedSchema, markStudiedHandler)
);