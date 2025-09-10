import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const envDebug = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_UNSPLASH_ACCESS_KEY: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ? {
        length: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.length,
        first4: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.substring(0, 4),
        last4: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.substring(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.length - 4),
      } : null,
      UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY ? {
        length: process.env.UNSPLASH_ACCESS_KEY.length,
        first4: process.env.UNSPLASH_ACCESS_KEY.substring(0, 4),
        last4: process.env.UNSPLASH_ACCESS_KEY.substring(process.env.UNSPLASH_ACCESS_KEY.length - 4),
      } : null,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "ok",
      environment: envDebug,
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}