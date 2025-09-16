import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Supabase URL not configured' });
  }
  
  try {
    // Test a simple GET request to Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      }
    });
    
    return NextResponse.json({
      status: 'success',
      supabaseUrl,
      responseStatus: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      corsAllowed: response.headers.get('access-control-allow-origin'),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      supabaseUrl
    });
  }
}