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
    const criticalEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const optionalEnvVars = [
      'OPENAI_API_KEY',
      'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY'
    ];

    const missingCritical = criticalEnvVars.filter(envVar => !process.env[envVar]);
    const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
    
    checks.environment = {
      status: missingCritical.length === 0 ? 'healthy' : 'unhealthy',
      missing: {
        critical: missingCritical,
        optional: missingOptional
      },
      demoMode: {
        openai: !process.env.OPENAI_API_KEY,
        unsplash: !process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
      }
    };
    
    if (missingCritical.length > 0) overall = 'degraded';

    // Check external API connectivity (only if API keys are present)
    if (process.env.OPENAI_API_KEY) {
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
    } else {
      checks.openai = {
        status: 'demo',
        message: 'API key not configured - using demo mode'
      };
    }

    // Check Unsplash API connectivity (only if API key is present)
    if (process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashCheck = await fetch('https://api.unsplash.com/me', {
          headers: {
            'Authorization': `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`,
          },
          signal: AbortSignal.timeout(5000)
        });
        
        checks.unsplash = {
          status: unsplashCheck.ok ? 'healthy' : 'unhealthy',
          statusCode: unsplashCheck.status
        };
      
        if (!unsplashCheck.ok) overall = 'degraded';
      } catch (err) {
        checks.unsplash = {
          status: 'unhealthy',
          error: err instanceof Error ? err.message : 'Connection failed'
        };
        overall = 'degraded';
      }
    } else {
      checks.unsplash = {
        status: 'demo',
        message: 'API key not configured - using demo mode'
      };
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