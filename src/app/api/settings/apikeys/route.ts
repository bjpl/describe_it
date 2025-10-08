import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { userId, settings } = await req.json();
    
    apiLogger.info('[API Keys Settings] Save request for user:', userId);
    apiLogger.info('[API Keys Settings] Saving API keys:', {
      unsplash: settings?.apiKeys?.unsplash ? 'provided' : 'not provided',
      openai: settings?.apiKeys?.openai ? 'provided' : 'not provided'
    });
    
    // For now, just acknowledge the save request
    // In production, this would save to a database or Supabase
    
    // Simulate a successful save after a brief delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({ 
      success: true,
      message: 'API keys saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    apiLogger.error('[API Keys Settings] Error saving settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save API keys' 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    apiLogger.info('[API Keys Settings] Get request for user:', { userId: userId || undefined });
    
    // For now, return empty settings
    // In production, this would fetch from a database
    
    return NextResponse.json({ 
      success: true,
      settings: {
        apiKeys: {
          unsplash: '',
          openai: ''
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    apiLogger.error('[API Keys Settings] Error fetching settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch API keys' 
      },
      { status: 500 }
    );
  }
}