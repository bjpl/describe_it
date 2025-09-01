import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic environment check without complex imports
    const env = process.env;
    
    const services = {
      unsplash: {
        configured: Boolean(env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY && env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key_here'),
        demoMode: !Boolean(env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY && env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY !== 'your_unsplash_access_key_here')
      },
      openai: {
        configured: Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_openai_api_key_here'),
        demoMode: !Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_openai_api_key_here')
      },
      supabase: {
        configured: Boolean(
          env.NEXT_PUBLIC_SUPABASE_URL && 
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder_anon_key'
        ),
        demoMode: !Boolean(
          env.NEXT_PUBLIC_SUPABASE_URL && 
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder_anon_key'
        )
      }
    };

    const overallDemoMode = services.unsplash.demoMode || services.openai.demoMode;

    const response = {
      status: 'ok',
      demo: overallDemoMode,
      timestamp: new Date().toISOString(),
      services: [
        {
          name: 'Unsplash API',
          configured: services.unsplash.configured,
          demoMode: services.unsplash.demoMode,
          reason: services.unsplash.demoMode ? 'Using curated demo images' : 'Connected to Unsplash API'
        },
        {
          name: 'OpenAI API',
          configured: services.openai.configured,
          demoMode: services.openai.demoMode,
          reason: services.openai.demoMode ? 'Using pre-generated descriptions' : 'Connected to OpenAI API'
        },
        {
          name: 'Supabase Database',
          configured: services.supabase.configured,
          demoMode: services.supabase.demoMode,
          reason: services.supabase.demoMode ? 'Using localStorage storage' : 'Connected to Supabase'
        }
      ],
      message: overallDemoMode ? 'Running in DEMO mode - app works perfectly without API keys!' : 'All services configured'
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
        'X-Demo-Mode': overallDemoMode ? 'true' : 'false'
      }
    });

  } catch (error) {
    console.error('Status endpoint error:', error);
    
    return NextResponse.json({
      status: 'error',
      demo: true,
      message: 'Status check failed - running in demo mode',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}