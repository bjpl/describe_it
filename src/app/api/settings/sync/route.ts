import { NextRequest, NextResponse } from "next/server";

/**
 * Sync API keys from client settings
 * Simplified version without cookies for now
 */
export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json();
    
    // For now, just return success
    // Cookie handling can be added once build is stable
    
    return NextResponse.json({
      success: true,
      message: 'API keys received'
    });
  } catch (error) {
    console.error('Settings sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync settings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return empty keys for now
  return NextResponse.json({
    apiKeys: {
      unsplash: null,
      openai: null
    }
  });
}