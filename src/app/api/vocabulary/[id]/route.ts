import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { updatePhraseSchema, type UpdatePhraseRequest } from '@/lib/validations/vocabulary';
import { withAuthAndRateLimit, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET - Get specific phrase
async function getPhraseHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    const phrase = await supabaseService.getPhrase(id);

    if (!phrase) {
      return NextResponse.json(
        { error: 'Phrase not found' },
        { status: 404 }
      );
    }

    // Check if phrase belongs to user
    if (phrase.user_id !== req.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: phrase,
      message: 'Phrase retrieved successfully'
    });

  } catch (error) {
    console.error('Get phrase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update specific phrase
async function updatePhraseHandler(req: AuthenticatedRequest, validData: UpdatePhraseRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Check if phrase exists and belongs to user
    const existingPhrase = await supabaseService.getPhrase(id);
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

    const updates = {
      ...validData,
      updated_at: new Date().toISOString(),
    };

    const updatedPhrase = await supabaseService.updatePhrase(id, updates);

    // Store phrase update in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'phrase_updated',
            metadata: { 
              phrase_id: id, 
              changes: Object.keys(validData),
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
      message: 'Phrase updated successfully'
    });

  } catch (error) {
    console.error('Update phrase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific phrase
async function deletePhraseHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Check if phrase exists and belongs to user
    const existingPhrase = await supabaseService.getPhrase(id);
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

    await supabaseService.deletePhrase(id);

    // Store phrase deletion in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'phrase_deleted',
            metadata: { 
              phrase_id: id, 
              spanish_text: existingPhrase.spanish_text,
              timestamp: new Date().toISOString() 
            }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      message: 'Phrase deleted successfully'
    });

  } catch (error) {
    console.error('Delete phrase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export route handlers with appropriate middleware
export const GET = withAuthAndRateLimit('api')(getPhraseHandler);

export const PUT = withAuthAndRateLimit('api')(
  (req: AuthenticatedRequest, context: RouteContext) =>
    withValidation(updatePhraseSchema, (req, validData) => 
      updatePhraseHandler(req, validData, context)
    )(req)
);

export const DELETE = withAuthAndRateLimit('api')(deletePhraseHandler);