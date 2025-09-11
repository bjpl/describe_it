import { NextRequest, NextResponse } from "next/server";

// Use Edge Runtime for better performance
export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Image proxy endpoint for OpenAI Vision API
 * Fetches images from external URLs and converts them to base64
 * This ensures OpenAI can access images from Unsplash and other sources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      const url = new URL(imageUrl);
      // Only allow HTTPS URLs for security
      if (url.protocol !== 'https:') {
        return NextResponse.json(
          { error: "Only HTTPS URLs are allowed" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const imageResponse = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DescribeIt/1.0 (Image Description Service)',
        },
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        console.error(`Failed to fetch image: ${imageResponse.status}`);
        return NextResponse.json(
          { error: `Failed to fetch image: ${imageResponse.status}` },
          { status: imageResponse.status }
        );
      }

      // Check content type
      const contentType = imageResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return NextResponse.json(
          { error: "URL does not point to an image" },
          { status: 400 }
        );
      }

      // Convert to base64
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const dataUri = `data:${contentType};base64,${base64}`;

      return NextResponse.json({
        success: true,
        dataUri,
        contentType,
        size: buffer.length,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: "Image fetch timeout" },
          { status: 504 }
        );
      }

      console.error('Image proxy error:', error);
      return NextResponse.json(
        { error: "Failed to process image" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}