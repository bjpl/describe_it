import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { createSessionSchema, sessionFiltersSchema, type CreateSessionRequest, type SessionFiltersRequest } from '@/lib/validations/sessions';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// GET - Get user sessions
async function getSessionsHandler(req: AuthenticatedRequest, validData: SessionFiltersRequest) {
  try {
    const sessions = await supabaseService.getUserSessions(
      req.user.id,
      validData.limit,
      validData.offset
    );

    // Apply additional filters if provided
    let filteredSessions = sessions;
    
    if (validData.session_type) {
      filteredSessions = filteredSessions.filter(s => s.session_type === validData.session_type);
    }
    
    if (validData.status) {
      filteredSessions = filteredSessions.filter(s => s.status === validData.status);
    }
    
    if (validData.date_from) {
      const fromDate = new Date(validData.date_from);
      filteredSessions = filteredSessions.filter(s => new Date(s.started_at) >= fromDate);
    }
    
    if (validData.date_to) {
      const toDate = new Date(validData.date_to);
      filteredSessions = filteredSessions.filter(s => new Date(s.started_at) <= toDate);
    }

    // Apply sorting
    filteredSessions.sort((a, b) => {
      const aValue = a[validData.sort_by] || 0;
      const bValue = b[validData.sort_by] || 0;
      
      if (validData.sort_order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Calculate session statistics
    const stats = {
      total_sessions: filteredSessions.length,
      active_sessions: filteredSessions.filter(s => s.status === 'active').length,
      completed_sessions: filteredSessions.filter(s => s.status === 'completed').length,
      average_duration: filteredSessions.length > 0 
        ? filteredSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / filteredSessions.length 
        : 0,
      total_points: filteredSessions.reduce((sum, s) => sum + s.points_earned, 0),
      average_accuracy: filteredSessions.length > 0 
        ? filteredSessions.reduce((sum, s) => sum + s.accuracy_percentage, 0) / filteredSessions.length 
        : 0,
    };

    return NextResponse.json({
      data: filteredSessions,
      meta: {
        total: filteredSessions.length,
        page: Math.floor(validData.offset / validData.limit) + 1,
        limit: validData.limit,
        has_more: validData.offset + validData.limit < filteredSessions.length,
        stats,
      },
      message: 'Sessions retrieved successfully'
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new session
async function createSessionHandler(req: AuthenticatedRequest, validData: CreateSessionRequest) {
  try {
    const sessionData = {
      user_id: req.user.id,
      session_type: validData.session_type,
      status: 'active' as const,
      started_at: new Date().toISOString(),
      duration_minutes: 0,
      images_viewed: 0,
      descriptions_completed: 0,
      questions_answered: 0,
      questions_correct: 0,
      phrases_selected: 0,
      points_earned: 0,
      accuracy_percentage: 0,
      session_data: {},
      device_info: validData.device_info || {},
      ip_address: req.ip || req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const session = await supabaseService.createSession(sessionData);

    // Store session creation in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/session-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            session_id: session.id,
            session_type: session.session_type,
            action: 'session_created',
            metadata: { 
              timestamp: new Date().toISOString(),
              device_info: validData.device_info,
            }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data: session,
      message: 'Session created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withCacheAndAuth(
  'sessions',
  (req) => {
    const url = new URL(req.url);
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `sessions:${(req as AuthenticatedRequest).user.id}:${params}`;
  }
)(withValidation(sessionFiltersSchema, getSessionsHandler));

export const POST = withAuthAndRateLimit('api')(
  withValidation(createSessionSchema, createSessionHandler)
);