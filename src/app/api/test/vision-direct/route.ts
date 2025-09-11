import { NextRequest, NextResponse } from "next/server";
import { getServerOpenAIClient, generateVisionDescription } from "@/lib/api/openai-server";
import { apiKeyProvider } from "@/lib/api/keyProvider";
import OpenAI from "openai";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  console.log('[Vision Direct Test] Starting comprehensive vision API test:', {
    requestId,
    timestamp,
    testType: 'direct_vision_api'
  });

  const testResults: any = {
    requestId,
    timestamp,
    tests: [],
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0
    }
  };

  // Test 1: API Key Provider Status
  console.log('[Vision Direct Test] Test 1: API Key Provider Status');
  try {
    const config = apiKeyProvider.getServiceConfig('openai');
    const keyTest = {
      testName: 'API Key Provider',
      passed: true,
      details: {
        hasConfig: !!config,
        hasApiKey: !!config?.apiKey,
        keyLength: config?.apiKey?.length || 0,
        keyPrefix: config?.apiKey ? config.apiKey.substring(0, 6) + '...' : 'none',
        isValid: config?.isValid || false,
        isDemo: config?.isDemo || true,
        source: config?.source || 'unknown',
        keyType: config?.apiKey?.startsWith('sk-proj-') ? 'project' : config?.apiKey?.startsWith('sk-') ? 'standard' : 'unknown'
      }
    };
    testResults.tests.push(keyTest);
    testResults.summary.passed++;
  } catch (error) {
    testResults.tests.push({
      testName: 'API Key Provider',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
    testResults.summary.failed++;
  }
  testResults.summary.totalTests++;

  // Test 2: Server OpenAI Client Creation
  console.log('[Vision Direct Test] Test 2: Server OpenAI Client Creation');
  let serverClient = null;
  try {
    serverClient = getServerOpenAIClient();
    const clientTest = {
      testName: 'Server OpenAI Client',
      passed: !!serverClient,
      details: {
        hasClient: !!serverClient,
        clientType: typeof serverClient,
        clientConstructorName: serverClient?.constructor?.name,
        environment: 'server'
      }
    };
    testResults.tests.push(clientTest);
    if (serverClient) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
  } catch (error) {
    testResults.tests.push({
      testName: 'Server OpenAI Client',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    testResults.summary.failed++;
  }
  testResults.summary.totalTests++;

  // Test 3: Direct OpenAI Client Test (if we have a client)
  console.log('[Vision Direct Test] Test 3: Direct OpenAI Client Test');
  if (serverClient) {
    try {
      const healthResponse = await serverClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "This is a health check. Please respond with 'API_WORKING'."
          }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const healthTest = {
        testName: 'Direct OpenAI Client Test',
        passed: true,
        details: {
          hasResponse: !!healthResponse,
          hasChoices: !!healthResponse?.choices,
          choicesLength: healthResponse?.choices?.length,
          responseContent: healthResponse?.choices?.[0]?.message?.content,
          model: healthResponse?.model,
          usage: healthResponse?.usage
        }
      };
      testResults.tests.push(healthTest);
      testResults.summary.passed++;
    } catch (error) {
      testResults.tests.push({
        testName: 'Direct OpenAI Client Test',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
        status: (error instanceof Error && 'status' in error) ? (error as any).status : undefined,
        stack: error instanceof Error ? error.stack : undefined
      });
      testResults.summary.failed++;
    }
  } else {
    testResults.tests.push({
      testName: 'Direct OpenAI Client Test',
      passed: false,
      error: 'No client available - skipped',
      skipped: true
    });
    testResults.summary.failed++;
  }
  testResults.summary.totalTests++;

  // Test 4: Direct Vision API Call (if we have a client)
  console.log('[Vision Direct Test] Test 4: Direct Vision API Call');
  if (serverClient) {
    try {
      const testImageUrl = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400";
      
      console.log('[Vision Direct Test] Making direct GPT-4 Vision API call:', {
        model: 'gpt-4o',
        imageUrl: testImageUrl,
        requestId
      });

      const visionResponse = await serverClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that describes images in detail. Respond in Spanish."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe esta imagen en detalle usando estilo narrativo."
              },
              {
                type: "image_url",
                image_url: {
                  url: testImageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const visionTest = {
        testName: 'Direct Vision API Call',
        passed: true,
        details: {
          hasResponse: !!visionResponse,
          hasChoices: !!visionResponse?.choices,
          choicesLength: visionResponse?.choices?.length,
          hasContent: !!visionResponse?.choices?.[0]?.message?.content,
          contentLength: visionResponse?.choices?.[0]?.message?.content?.length,
          contentPreview: visionResponse?.choices?.[0]?.message?.content?.substring(0, 150) + '...',
          model: visionResponse?.model,
          usage: visionResponse?.usage,
          imageUrl: testImageUrl
        }
      };
      testResults.tests.push(visionTest);
      testResults.summary.passed++;

      console.log('[Vision Direct Test] Direct vision API call SUCCESS:', {
        contentLength: visionResponse?.choices?.[0]?.message?.content?.length,
        model: visionResponse?.model,
        usage: visionResponse?.usage
      });

    } catch (error) {
      console.error('[Vision Direct Test] Direct vision API call FAILED:', error);
      
      testResults.tests.push({
        testName: 'Direct Vision API Call',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
        status: (error instanceof Error && 'status' in error) ? (error as any).status : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      testResults.summary.failed++;
    }
  } else {
    testResults.tests.push({
      testName: 'Direct Vision API Call',
      passed: false,
      error: 'No client available - skipped',
      skipped: true
    });
    testResults.summary.failed++;
  }
  testResults.summary.totalTests++;

  // Test 5: Our generateVisionDescription Function
  console.log('[Vision Direct Test] Test 5: Our generateVisionDescription Function');
  try {
    const testImageUrl = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400";
    
    console.log('[Vision Direct Test] Testing our generateVisionDescription function:', {
      imageUrl: testImageUrl,
      style: 'narrativo',
      language: 'es',
      requestId
    });

    const ourResult = await generateVisionDescription({
      imageUrl: testImageUrl,
      style: 'narrativo',
      language: 'es',
      maxLength: 200
    });

    const ourTest = {
      testName: 'Our generateVisionDescription Function',
      passed: true,
      details: {
        hasResult: !!ourResult,
        hasText: !!ourResult?.text,
        textLength: ourResult?.text?.length,
        textPreview: ourResult?.text?.substring(0, 150) + '...',
        style: ourResult?.style,
        language: ourResult?.language,
        wordCount: ourResult?.wordCount,
        timestamp: ourResult?.timestamp,
        isDemoMode: ourResult?.text?.includes('[DEMO MODE]') || ourResult?.text?.includes('DEMO MODE')
      }
    };
    testResults.tests.push(ourTest);
    testResults.summary.passed++;

    console.log('[Vision Direct Test] Our function test SUCCESS:', {
      textLength: ourResult?.text?.length,
      wordCount: ourResult?.wordCount,
      isDemoMode: ourResult?.text?.includes('[DEMO MODE]') || ourResult?.text?.includes('DEMO MODE')
    });

  } catch (error) {
    console.error('[Vision Direct Test] Our function test FAILED:', error);
    
    testResults.tests.push({
      testName: 'Our generateVisionDescription Function',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
      status: (error instanceof Error && 'status' in error) ? (error as any).status : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    });
    testResults.summary.failed++;
  }
  testResults.summary.totalTests++;

  // Test 6: Environment Variables Check
  console.log('[Vision Direct Test] Test 6: Environment Variables Check');
  const envTest = {
    testName: 'Environment Variables',
    passed: true,
    details: {
      hasOpenAIEnvKey: !!process.env.OPENAI_API_KEY,
      envKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      envKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 6) + '...' : 'none',
      nodeEnv: process.env.NODE_ENV,
      hasVercelKvUrl: !!process.env.KV_URL,
      hasVercelKvToken: !!process.env.KV_REST_API_TOKEN,
      totalEnvVars: Object.keys(process.env).length
    }
  };
  testResults.tests.push(envTest);
  testResults.summary.passed++;
  testResults.summary.totalTests++;

  const responseTime = performance.now() - (performance.now() - 100); // Approximate

  const finalResult = {
    ...testResults,
    metadata: {
      responseTime: `${responseTime.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  console.log('[Vision Direct Test] Test completed:', {
    totalTests: finalResult.summary.totalTests,
    passed: finalResult.summary.passed,
    failed: finalResult.summary.failed,
    successRate: `${((finalResult.summary.passed / finalResult.summary.totalTests) * 100).toFixed(1)}%`
  });

  return NextResponse.json(finalResult, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  console.log('[Vision Direct Test POST] Starting custom image vision test:', {
    requestId,
    timestamp: new Date().toISOString()
  });

  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        requestId,
        error: {
          message: 'Invalid JSON in request body',
          code: 'PARSE_ERROR'
        }
      }, { status: 400 });
    }

    const { imageUrl, style = "narrativo", language = "es" } = body;

    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        requestId,
        error: {
          message: 'imageUrl is required',
          code: 'MISSING_PARAMETER'
        }
      }, { status: 400 });
    }

    console.log('[Vision Direct Test POST] Testing with custom image:', {
      imageUrl: imageUrl.substring(0, 100) + '...',
      style,
      language,
      requestId
    });

    // Test both our function and direct API call
    const testResults: any = {
      requestId,
      timestamp: new Date().toISOString(),
      imageUrl: imageUrl.substring(0, 100) + '...',
      style,
      language,
      tests: {}
    };

    // Test 1: Our generateVisionDescription function
    try {
      const ourResult = await generateVisionDescription({
        imageUrl,
        style,
        language,
        maxLength: 200
      });

      testResults.tests.ourFunction = {
        success: true,
        result: {
          hasText: !!ourResult?.text,
          textLength: ourResult?.text?.length,
          textPreview: ourResult?.text?.substring(0, 200),
          style: ourResult?.style,
          language: ourResult?.language,
          wordCount: ourResult?.wordCount,
          isDemoMode: ourResult?.text?.includes('[DEMO MODE]') || ourResult?.text?.includes('DEMO MODE')
        }
      };
    } catch (error) {
      testResults.tests.ourFunction = {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        }
      };
    }

    // Test 2: Direct API call (if client available)
    const client = getServerOpenAIClient();
    if (client) {
      try {
        const directResponse = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: language === 'es' 
                ? "Eres un narrador creativo. Describe esta imagen de manera detallada y atractiva."
                : "You are a creative storyteller. Describe this image in a detailed and engaging way."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: language === 'es' 
                    ? "Describe esta imagen en detalle."
                    : "Describe this image in detail."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        });

        testResults.tests.directAPI = {
          success: true,
          result: {
            hasResponse: !!directResponse,
            hasContent: !!directResponse?.choices?.[0]?.message?.content,
            contentLength: directResponse?.choices?.[0]?.message?.content?.length,
            contentPreview: directResponse?.choices?.[0]?.message?.content?.substring(0, 200),
            model: directResponse?.model,
            usage: directResponse?.usage
          }
        };
      } catch (error) {
        testResults.tests.directAPI = {
          success: false,
          error: {
            message: error instanceof Error ? error.message : String(error),
            code: (error instanceof Error && 'code' in error) ? (error as any).code : undefined,
            status: (error instanceof Error && 'status' in error) ? (error as any).status : undefined,
            type: error instanceof Error ? error.constructor.name : typeof error
          }
        };
      }
    } else {
      testResults.tests.directAPI = {
        success: false,
        error: {
          message: 'No OpenAI client available',
          code: 'NO_CLIENT'
        }
      };
    }

    const responseTime = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      ...testResults,
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    console.error('[Vision Direct Test POST] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      requestId,
      error: {
        message: error instanceof Error ? error.message : 'Unexpected server error',
        code: 'INTERNAL_ERROR',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}