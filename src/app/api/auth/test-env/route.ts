import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Check what environment variables are available
  const env = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlStart: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
    nodeEnv: process.env.NODE_ENV,
  };
  
  return NextResponse.json({
    message: 'Environment check',
    env,
    timestamp: new Date().toISOString()
  });
}