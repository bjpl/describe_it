import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Verify Key Route] Full request analysis:', {
      // Check headers (likely stripped by Vercel)
      headers: {
        hasXOpenAIAPIKey: !!request.headers.get('X-OpenAI-API-Key'),
        hasAuthorization: !!request.headers.get('Authorization'),
        hasOpenAIAPIKey: !!request.headers.get('OpenAI-API-Key'),
      },
      // Check body (this should work on Vercel)
      body: {
        hasUserApiKey: !!body.userApiKey,
        keyLength: body.userApiKey?.length,
        keyPrefix: body.userApiKey?.substring(0, 10) + '...',
      },
      // Server environment
      server: {
        hasEnvKey: !!process.env.OPENAI_API_KEY,
        envKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
      }
    });
    
    // Test OpenAI API with the provided key
    const userKey = body.userApiKey;
    const finalKey = userKey || process.env.OPENAI_API_KEY;
    
    if (!finalKey) {
      return NextResponse.json({
        success: false,
        error: "No API key available",
        source: "none"
      });
    }
    
    // Test the key with OpenAI
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${finalKey}`
      }
    });
    
    const isValid = testResponse.ok;
    const source = userKey ? 'user' : 'server';
    
    return NextResponse.json({
      success: true,
      keyReceived: !!userKey,
      keySource: source,
      keyValid: isValid,
      keyPrefix: finalKey.substring(0, 10) + '...',
      message: userKey 
        ? "User API key received in request body successfully!" 
        : "No user key provided, using server default"
    });
    
  } catch (error) {
    console.error('[Verify Key Route] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}