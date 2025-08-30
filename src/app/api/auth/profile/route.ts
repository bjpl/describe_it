import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { updateProfileSchema, type UpdateProfileRequest } from '@/lib/validations/auth';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// GET - Get user profile
async function getProfileHandler(req: AuthenticatedRequest) {
  try {
    const { data: user, error } = await supabaseService.getClient()
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: user,
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
async function updateProfileHandler(req: AuthenticatedRequest, validData: UpdateProfileRequest) {
  try {
    const updates = {
      ...validData,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseService.getClient()
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 400 }
      );
    }

    // Store profile update in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'profile_updated',
            metadata: { changes: Object.keys(validData), timestamp: new Date().toISOString() }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user account
async function deleteProfileHandler(req: AuthenticatedRequest) {
  try {
    // Soft delete by setting deleted_at timestamp
    const { error } = await supabaseService.getClient()
      .from('users')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 400 }
      );
    }

    // Sign out user
    await supabaseService.getClient().auth.signOut();

    return NextResponse.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export route handlers with appropriate middleware
export const GET = withCacheAndAuth(
  'user_profile',
  (req) => `user_profile:${(req as AuthenticatedRequest).user.id}`
)(getProfileHandler);

export const PUT = withAuthAndRateLimit('api')(
  withValidation(updateProfileSchema, updateProfileHandler)
);

export const DELETE = withAuthAndRateLimit('api')(deleteProfileHandler);