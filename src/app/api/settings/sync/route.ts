import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Sync API keys from client settings to server-side cookies
 * This allows the server to access user-configured API keys
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json();
    
    // Store API keys in HTTP-only cookies for security
    const cookieStore = await cookies();
    
    // Set Unsplash key (expires in 30 days)
    if (apiKeys.unsplash) {
      cookieStore.set('unsplash_key', apiKeys.unsplash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }
    
    // Set OpenAI key (expires in 30 days)
    if (apiKeys.openai) {
      cookieStore.set('openai_key', apiKeys.openai, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'API keys synced successfully'
    });
  } catch (error) {
    console.error('Failed to sync API keys:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync settings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check if keys are synced
  const cookieStore = await cookies();
  
  return NextResponse.json({
    hasUnsplash: cookieStore.has('unsplash_key'),
    hasOpenAI: cookieStore.has('openai_key'),
  });
}