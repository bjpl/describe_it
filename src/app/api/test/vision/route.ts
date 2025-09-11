import { NextRequest, NextResponse } from "next/server";
import { generateVisionDescription, getServerOpenAIClient } from "@/lib/api/openai-server";
import { apiKeyProvider } from "@/lib/api/keyProvider";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  console.log('[Vision Test] Starting vision service test:', {
    requestId,
    timestamp,
    url: request.url
  });
  
  let config, serverClient, isConfigured;
  
  try {
    // 1. Check API key provider
    config = apiKeyProvider.getServiceConfig('openai');
  } catch (error) {
    console.error('[Vision Test] Failed to get API key config:', error);
    config = { apiKey: '', isValid: false, isDemo: true, source: 'none' };
  }
  
  try {
    // 2. Check OpenAI service state (server-side)
    serverClient = getServerOpenAIClient();
    isConfigured = !!serverClient;
  } catch (error) {
    console.error('[Vision Test] Failed to get server OpenAI client:', error);
    serverClient = null;
    isConfigured = false;
  }
  
  // 3. LocalStorage is not available server-side, so we skip this
  const localStorageKeys = {}; // Server-side can't access localStorage
  
  // 4. Test a simple vision call with comprehensive error handling
  let visionTestResult = null;
  let visionError = null;
  
  try {
    console.log('[Vision Test] Testing vision description generation...');
    // Try a test description with server-side function
    const testImage = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400";
    const result = await generateVisionDescription({
      imageUrl: testImage,
      style: "narrativo",
      language: "en",
      maxLength: 100
    });
    
    if (!result) {
      throw new Error('generateVisionDescription returned null/undefined');
    }
    
    visionTestResult = {
      success: true,
      isDemo: result.text?.includes("DEMO MODE") || result.text?.includes("captivating"),
      textPreview: result.text?.substring(0, 100),
      fullResult: {
        style: result.style,
        language: result.language,
        wordCount: result.wordCount,
        timestamp: result.timestamp
      }
    };
    
    console.log('[Vision Test] Vision test completed successfully:', {
      isDemo: visionTestResult.isDemo,
      textLength: result.text?.length,
      wordCount: result.wordCount
    });
  } catch (error: unknown) {
    console.error('[Vision Test] Vision test failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
      status: error instanceof Error && 'status' in error ? (error as any).status : undefined
    });
    
    visionError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error instanceof Error && 'code' in error) ? (error as any).code : 'UNKNOWN_ERROR',
      status: (error instanceof Error && 'status' in error) ? (error as any).status : 500,
      isDemoMode: error instanceof Error ? error.message.includes('demo') : false,
      type: error instanceof Error ? error.constructor.name : 'Error'
    };
  }
  
  const responseTime = performance.now() - (performance.now() - 50); // Approximate
  
  const response = {
    success: true,
    requestId,
    timestamp,
    apiKeyProvider: {
      hasKey: !!config?.apiKey,
      keyLength: config?.apiKey?.length || 0,
      keyPrefix: config?.apiKey ? config.apiKey.substring(0, 6) + '...' : 'none',
      isValid: config?.isValid || false,
      isDemo: config?.isDemo || true,
      source: config?.source || 'unknown'
    },
    openAIService: {
      isConfigured: isConfigured,
      hasClient: !!serverClient,
      isValidApiKey: !!serverClient,
      isDemoMode: !serverClient
    },
    localStorageCheck: localStorageKeys,
    visionTest: visionTestResult,
    visionError: visionError,
    environment: {
      hasOpenAIEnvKey: !!process.env.OPENAI_API_KEY,
      envKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV
    },
    metadata: {
      responseTime: `${responseTime.toFixed(2)}ms`,
      version: '2.0.0'
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
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  console.log('[Vision Test POST] Starting custom image test:', {
    requestId,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Vision Test POST] Failed to parse request body:', parseError);
      return NextResponse.json({
        success: false,
        requestId,
        error: {
          message: 'Invalid JSON in request body',
          code: 'PARSE_ERROR',
          type: 'ValidationError'
        }
      }, { status: 400 });
    }
    
    const { imageUrl, style = "narrativo" } = body;
    
    // Comprehensive validation for imageUrl
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({
        success: false,
        requestId,
        error: {
          message: 'imageUrl is required and must be a string',
          code: 'MISSING_PARAMETER',
          type: 'ValidationError',
          details: {
            hasImageUrl: !!imageUrl,
            imageUrlType: typeof imageUrl
          }
        }
      }, { status: 400 });
    }
    
    // Validate imageUrl format (must be data URI or HTTP URL)
    if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return NextResponse.json({
        success: false,
        requestId,
        error: {
          message: 'imageUrl must be a valid data URI or HTTP URL',
          code: 'INVALID_URL_FORMAT',
          type: 'ValidationError',
          details: {
            imageUrlPrefix: imageUrl.substring(0, 20),
            imageUrlLength: imageUrl.length
          }
        }
      }, { status: 400 });
    }
    
    // Validate style parameter
    const validStyles = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'];
    const validatedStyle = (style && validStyles.includes(style)) ? style : 'narrativo';
    if (style !== validatedStyle) {
      console.warn('[Vision Test POST] Invalid style parameter, using default', {
        providedStyle: style,
        validatedStyle,
        validStyles
      });
    }
    
    // Validate image size limits for data URIs
    if (imageUrl.startsWith('data:')) {
      const imageSizeKB = Math.round((imageUrl.length * 0.75) / 1024); // Approximate size
      const maxSizeKB = 20 * 1024; // 20MB limit
      if (imageSizeKB > maxSizeKB) {
        return NextResponse.json({
          success: false,
          requestId,
          error: {
            message: `Image too large: ${imageSizeKB}KB (max ${maxSizeKB}KB)`,
            code: 'IMAGE_TOO_LARGE',
            type: 'ValidationError',
            details: {
              imageSizeKB,
              maxSizeKB
            }
          }
        }, { status: 413 });
      }
    }
    
    // Get current state with error handling
    let config, serverClient;
    
    try {
      config = apiKeyProvider.getServiceConfig('openai');
    } catch (configError) {
      console.error('[Vision Test POST] Failed to get config:', configError);
      config = { apiKey: '', isValid: false, isDemo: true, source: 'none' };
    }
    
    try {
      serverClient = getServerOpenAIClient();
    } catch (clientError) {
      console.error('[Vision Test POST] Failed to get server client:', clientError);
      serverClient = null;
    }
    
    // Try to generate description with server-side function
    let result;
    try {
      console.log('[Vision Test POST] Generating description for custom image...', {
        imageUrl: imageUrl.substring(0, 100) + '...',
        originalStyle: style,
        validatedStyle
      });
      
      result = await generateVisionDescription({
        imageUrl,
        style: validatedStyle,
        language: "en",
        maxLength: 150
      });
      
      if (!result) {
        throw new Error('generateVisionDescription returned null/undefined');
      }
    } catch (generateError) {
      console.error('[Vision Test POST] Description generation failed:', generateError);
      
      return NextResponse.json({
        success: false,
        requestId,
        serviceState: {
          hasKey: !!config?.apiKey,
          isValid: config?.isValid || false,
          isDemo: config?.isDemo || true,
          isDemoMode: !serverClient
        },
        error: {
          message: generateError instanceof Error ? generateError.message : 'Unknown generation error',
          code: (generateError instanceof Error && 'code' in generateError) ? (generateError as any).code : 'GENERATION_ERROR',
          type: generateError instanceof Error ? generateError.constructor.name : 'Error'
        },
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
      }, { status: 500 });
    }
    
    const responseTime = performance.now() - startTime;
    
    console.log('[Vision Test POST] Test completed successfully:', {
      requestId,
      responseTime: `${responseTime.toFixed(2)}ms`,
      resultLength: result.text?.length,
      wordCount: result.wordCount
    });
    
    return NextResponse.json({
      success: true,
      requestId,
      serviceState: {
        hasKey: !!config?.apiKey,
        keyLength: config?.apiKey?.length || 0,
        isValid: config?.isValid || false,
        isDemo: config?.isDemo || true,
        isDemoMode: !serverClient,
        source: config?.source || 'unknown'
      },
      result: {
        style: result.style,
        language: result.language,
        wordCount: result.wordCount,
        textPreview: result.text?.substring(0, 200),
        fullText: result.text,
        isLikelyDemo: result.text?.includes("DEMO MODE") || result.text?.includes("captivating") || result.text?.includes("unique story"),
        timestamp: result.timestamp
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    const responseTime = performance.now() - startTime;
    
    console.error('[Vision Test POST] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      responseTime: `${responseTime.toFixed(2)}ms`
    });
    
    return NextResponse.json({
      success: false,
      requestId,
      error: {
        message: error instanceof Error ? error.message : 'Unexpected server error',
        code: (error instanceof Error && 'code' in error) ? (error as any).code : 'INTERNAL_ERROR',
        type: error instanceof Error ? error.constructor.name : 'Error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}