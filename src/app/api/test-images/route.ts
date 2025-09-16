import { NextRequest, NextResponse } from "next/server";

// Simple isolated test endpoint to identify blocking operations
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("[TEST] Starting test endpoint at", new Date().toISOString());
    
    // Test demo data without any external dependencies
    const demoImages = [
      {
        id: "test-1",
        urls: {
          small: "https://picsum.photos/400/300?random=1",
          regular: "https://picsum.photos/800/600?random=1",
          full: "https://picsum.photos/1200/900?random=1",
        },
        alt_description: "Test image 1",
        description: "Demo test image",
        user: { name: "Test User", username: "test" },
        width: 800,
        height: 600,
        color: "#4A90E2",
        likes: 10,
        created_at: new Date().toISOString(),
      },
      {
        id: "test-2",
        urls: {
          small: "https://picsum.photos/400/300?random=2",
          regular: "https://picsum.photos/800/600?random=2",
          full: "https://picsum.photos/1200/900?random=2",
        },
        alt_description: "Test image 2",
        description: "Demo test image 2",
        user: { name: "Test User 2", username: "test2" },
        width: 800,
        height: 600,
        color: "#E74C3C",
        likes: 5,
        created_at: new Date().toISOString(),
      },
    ];

    const response = {
      images: demoImages,
      totalPages: 1,
      currentPage: 1,
      total: 2,
      hasNextPage: false,
      testInfo: {
        endpoint: "test-images",
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        message: "Test endpoint working correctly"
      }
    };

    console.log("[TEST] Returning response:", response.testInfo);

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Content-Type": "application/json",
        "X-Response-Time": `${Date.now() - startTime}ms`,
        "X-Test-Endpoint": "true"
      },
    });
    
  } catch (error) {
    console.error("[TEST] Error in test endpoint:", error);
    
    return NextResponse.json({
      error: "Test endpoint failed",
      message: error instanceof Error ? error.message : "Unknown error",
      responseTime: Date.now() - startTime
    }, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    });
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}