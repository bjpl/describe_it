import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Log error to Vercel logs for debugging
    console.error('[ERROR REPORT API] Received error:', {
      timestamp: new Date().toISOString(),
      error: errorData,
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'referer': request.headers.get('referer'),
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
      }
    });

    // In a real application, you would send this to your error tracking service
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    
    return NextResponse.json({ 
      success: true, 
      message: 'Error reported successfully',
      errorId: errorData.eventId 
    });
  } catch (error) {
    console.error('[ERROR REPORT API] Failed to process error report:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process error report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}