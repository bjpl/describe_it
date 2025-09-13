import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { generateVisionDescription } from "@/lib/api/openai-server";

export async function POST(request: NextRequest) {
  console.log('[Simple Test] POST request received');
  
  try {
    const requestText = await request.text();
    const body = safeParse(requestText);
    
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };
    console.log('[Simple Test] Request body keys:', Object.keys(body));
    console.log('[Simple Test] UserApiKey present:', !!body.userApiKey);
    console.log('[Simple Test] UserApiKey length:', body.userApiKey?.length);
    
    // Simple validation
    if (!body.imageUrl || !body.style) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields"
      }, { status: 400 });
    }
    
    console.log('[Simple Test] Calling vision description...');
    const description = await generateVisionDescription({
      imageUrl: body.imageUrl,
      style: body.style,
      language: 'en',
      maxLength: 300
    }, body.userApiKey);
    
    console.log('[Simple Test] Vision description result:', {
      hasText: !!description.text,
      textLength: description.text?.length,
      isDemoMode: description.text?.includes('[DEMO MODE]')
    });
    
    return NextResponse.json({
      success: true,
      data: [{
        id: Date.now().toString(),
        imageId: body.imageUrl,
        style: body.style,
        content: description.text,
        language: 'english',
        createdAt: new Date().toISOString()
      }],
      metadata: {
        demoMode: description.text?.includes('[DEMO MODE]') || false
      }
    });
    
  } catch (error) {
    console.error('[Simple Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Simple test endpoint is working",
    timestamp: new Date().toISOString()
  });
}