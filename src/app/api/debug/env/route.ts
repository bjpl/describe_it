import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Only show in development or with a secret query param
  const secret = request.nextUrl.searchParams.get('secret');
  
  if (process.env.NODE_ENV !== 'development' && secret !== 'check-env-vars') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasUnsplashKey: {
      NEXT_PUBLIC: !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY,
      SERVER: !!process.env.UNSPLASH_ACCESS_KEY,
      keyLengths: {
        NEXT_PUBLIC: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY?.length || 0,
        SERVER: process.env.UNSPLASH_ACCESS_KEY?.length || 0
      }
    },
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasSupabase: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    timestamp: new Date().toISOString()
  });
}