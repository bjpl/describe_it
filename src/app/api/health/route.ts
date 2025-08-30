import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};
  let overall = 'healthy';

  try {
    // Check Supabase connection
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        const { error } = await supabase.from('profiles').select('count').limit(1).single();
        
        checks.database = {
          status: error ? 'unhealthy' : 'healthy',
          responseTime: Date.now() - startTime,
          error: error?.message
        };
        
        if (error) overall = 'degraded';
      } catch (err) {
        checks.database = {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
        overall = 'unhealthy';
      }
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      missing: missingEnvVars
    };
    
    if (missingEnvVars.length > 0) overall = 'unhealthy';

    // Check external API connectivity
    try {
      const openaiCheck = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000)
      });
      
      checks.openai = {
        status: openaiCheck.ok ? 'healthy' : 'unhealthy',
        statusCode: openaiCheck.status
      };
      
      if (!openaiCheck.ok) overall = 'degraded';
    } catch (err) {
      checks.openai = {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Connection failed'
      };
      overall = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    
    const response = {
      status: overall,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime,
      checks
    };

    const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 207 : 503;
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}