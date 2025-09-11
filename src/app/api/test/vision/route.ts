import { NextRequest, NextResponse } from "next/server";
import { openAIService } from "@/lib/api/openai";
import { apiKeyProvider } from "@/lib/api/keyProvider";

export async function GET(request: NextRequest) {
  // Test the current state of the OpenAI service
  
  // 1. Check API key provider
  const config = apiKeyProvider.getServiceConfig('openai');
  
  // 2. Check OpenAI service state
  const isConfigured = openAIService.isConfiguredSecurely();
  
  // 3. Try to get the actual API key from localStorage
  let localStorageKeys = {};
  if (typeof window !== 'undefined') {
    try {
      const backup = localStorage.getItem('api-keys-backup');
      if (backup) {
        localStorageKeys = JSON.parse(backup);
      }
    } catch (e) {
      // Server-side, can't access localStorage
    }
  }
  
  // 4. Test a simple vision call
  let visionTestResult = null;
  let visionError = null;
  
  try {
    // Force refresh the service
    openAIService.refreshService();
    
    // Try a test description
    const testImage = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";
    const result = await openAIService.generateDescription({
      imageUrl: testImage,
      style: "narrativo",
      language: "en",
      maxLength: 100
    });
    visionTestResult = {
      success: true,
      isDemo: result.text?.includes("demo") || result.text?.includes("captivating"),
      textPreview: result.text?.substring(0, 100)
    };
  } catch (error: any) {
    visionError = {
      message: error.message,
      code: error.code,
      isDemoMode: error.message?.includes("demo")
    };
  }
  
  const response = {
    timestamp: new Date().toISOString(),
    apiKeyProvider: {
      hasKey: !!config.apiKey,
      keyLength: config.apiKey?.length || 0,
      keyPrefix: config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'none',
      isValid: config.isValid,
      isDemo: config.isDemo,
      source: config.source
    },
    openAIService: {
      isConfigured: isConfigured,
      hasClient: !!(openAIService as any).client,
      isValidApiKey: !!(openAIService as any).isValidApiKey,
      isDemoMode: (openAIService as any).isDemoMode?.() || false
    },
    localStorageCheck: localStorageKeys,
    visionTest: visionTestResult,
    visionError: visionError,
    environment: {
      hasOpenAIEnvKey: !!process.env.OPENAI_API_KEY,
      envKeyLength: process.env.OPENAI_API_KEY?.length || 0
    }
  };
  
  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function POST(request: NextRequest) {
  // Test with a specific image URL
  try {
    const body = await request.json();
    const { imageUrl, style = "narrativo" } = body;
    
    // Force refresh
    openAIService.refreshService();
    
    // Get current state
    const config = apiKeyProvider.getServiceConfig('openai');
    
    // Try to generate description
    const result = await openAIService.generateDescription({
      imageUrl,
      style,
      language: "en",
      maxLength: 150
    });
    
    return NextResponse.json({
      success: true,
      serviceState: {
        hasKey: !!config.apiKey,
        isValid: config.isValid,
        isDemo: config.isDemo,
        isDemoMode: (openAIService as any).isDemoMode?.()
      },
      result: {
        style: result.style,
        language: result.language,
        wordCount: result.wordCount,
        textPreview: result.text?.substring(0, 200),
        isLikelyDemo: result.text?.includes("captivating") || result.text?.includes("unique story")
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      }
    }, { status: 500 });
  }
}