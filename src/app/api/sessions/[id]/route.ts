import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { updateSessionSchema, type UpdateSessionRequest } from '@/lib/validations/sessions';
import { withAuthAndRateLimit, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET - Get specific session
async function getSessionHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    const { data: session, error } = await supabaseService.getClient()
      .from('sessions')
      .select(`
        *,
        descriptions!descriptions_session_id_fkey (
          id, spanish_text, english_translation, style, difficulty_score, is_completed
        ),
        phrases!phrases_session_id_fkey (
          id, spanish_text, english_translation, category, is_user_selected, is_mastered
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session belongs to user
    if (session.user_id !== req.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: session,
      message: 'Session retrieved successfully'
    });

  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update specific session
async function updateSessionHandler(req: AuthenticatedRequest, validData: UpdateSessionRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Check if session exists and belongs to user
    const { data: existingSession, error: fetchError } = await supabaseService.getClient()
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (existingSession.user_id !== req.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate accuracy if questions data is provided
    const updates: any = {
      ...validData,
      updated_at: new Date().toISOString(),
    };

    if (validData.questions_answered && validData.questions_correct) {
      updates.accuracy_percentage = Math.round((validData.questions_correct / validData.questions_answered) * 100);
    }

    // Set completion time if status is being set to completed
    if (validData.status === 'completed' && !validData.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const updatedSession = await supabaseService.updateSession(id, updates);

    // If session is being completed, update user progress
    if (validData.status === 'completed') {
      try {
        // Calculate daily progress
        await supabaseService.getClient()
          .rpc('calculate_daily_progress', {
            user_uuid: req.user.id,
            target_date: new Date().toISOString().split('T')[0]
          });

        // Update user's total points and streak
        if (validData.points_earned) {
          const { data: userData } = await supabaseService.getClient()
            .from('users')
            .select('total_points, streak_count, last_active_at')
            .eq('id', req.user.id)
            .single();

          if (userData) {
            const today = new Date().toISOString().split('T')[0];
            const lastActive = userData.last_active_at ? userData.last_active_at.split('T')[0] : null;
            const isConsecutiveDay = lastActive === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            await supabaseService.getClient()
              .from('users')
              .update({
                total_points: userData.total_points + validData.points_earned,
                streak_count: isConsecutiveDay ? userData.streak_count + 1 : 1,
                last_active_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', req.user.id);
          }
        }
      } catch (progressError) {
        console.error('Progress update error:', progressError);
        // Continue with session update even if progress update fails
      }
    }

    // Store session update in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        const action = validData.status === 'completed' ? 'session_completed' : 
                      validData.status === 'paused' ? 'session_paused' : 'session_updated';
        
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            session_id: id,
            action,
            metadata: { 
              status: validData.status,
              points_earned: validData.points_earned || 0,
              duration_minutes: validData.duration_minutes || 0,
              timestamp: new Date().toISOString() 
            }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data: updatedSession,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific session
async function deleteSessionHandler(req: AuthenticatedRequest, context: RouteContext) {
  try {
    const { id } = context.params;

    // Check if session exists and belongs to user
    const { data: existingSession, error: fetchError } = await supabaseService.getClient()
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (existingSession.user_id !== req.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete related data first (cascade should handle this, but being explicit)
    await Promise.all([
      supabaseService.getClient().from('descriptions').delete().eq('session_id', id),
      supabaseService.getClient().from('questions').delete().eq('session_id', id),
      supabaseService.getClient().from('phrases').delete().eq('session_id', id),
    ]);

    // Delete the session
    const { error: deleteError } = await supabaseService.getClient()
      .from('sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuthAndRateLimit('api')(getSessionHandler);

export const PUT = withAuthAndRateLimit('api')(
  (req: AuthenticatedRequest, context: RouteContext) =>
    withValidation(updateSessionSchema, (req, validData) => 
      updateSessionHandler(req, validData, context)
    )(req)
);

export const DELETE = withAuthAndRateLimit('api')(deleteSessionHandler);