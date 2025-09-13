/**
 * Admin password reset endpoint (REMOVE IN PRODUCTION)
 * Temporary endpoint to reset password without email
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword, adminKey } = safeParse(await request.text(), {});
    
    // Simple admin key check (CHANGE THIS IN PRODUCTION)
    if (adminKey !== 'describe-admin-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only allow for specific email during development
    if (email !== 'brandon.lambert87@gmail.com') {
      return NextResponse.json({ error: 'Email not allowed' }, { status: 403 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Update user password using service role
    const { data, error } = await supabase.auth.admin.updateUserById(
      'e32caa0c-9720-492d-9f6f-fb3860f4b563', // Your user ID from Supabase
      { password: newPassword }
    );
    
    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully! You can now sign in with your new password.' 
    });
    
  } catch (error: any) {
    console.error('Admin reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}