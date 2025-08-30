import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { withAuthAndRateLimit, type AuthenticatedRequest } from '@/lib/api/middleware';

async function logoutHandler(req: AuthenticatedRequest) {
  try {
    const { error } = await supabaseService.getClient().auth.signOut();

    if (error) {
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 400 }
      );
    }

    // Update last_active_at
    await supabaseService.getClient()
      .from('users')
      .update({ 
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    // Store logout event in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/session-end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'logout',
            metadata: { timestamp: new Date().toISOString() }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuthAndRateLimit('auth')(logoutHandler);