import { NextRequest, NextResponse } from "next/server";
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { apiLogger } from '@/lib/logger';

/**
 * Sync API keys from client settings
 * Simplified version without cookies for now
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const parsed = safeParse<{ apiKeys?: unknown }>(body, {});
    const apiKeys = parsed?.apiKeys;
    
    // For now, just return success
    // Cookie handling can be added once build is stable
    
    return NextResponse.json({
      success: true,
      message: 'API keys received'
    });
  } catch (error) {
    apiLogger.error('Settings sync error:', error);
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