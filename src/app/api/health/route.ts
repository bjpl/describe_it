import { NextRequest, NextResponse } from 'next/server';
import { healthCheckService } from '@/lib/api/healthCheck';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';

    if (detailed) {
      // Full health check with actual API calls
      const healthStatus = await healthCheckService.checkAllServices();
      
      return NextResponse.json(healthStatus, {
        status: healthStatus.overall.healthy ? 200 : 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30',
          'X-Demo-Mode': healthStatus.services.some(s => s.demoMode) ? 'true' : 'false',
          'X-Overall-Health': healthStatus.overall.status
        }
      });
    } else {
      // Quick status check
      const quickStatus = healthCheckService.getQuickStatus();
      
      return NextResponse.json({
        status: 'ok',
        healthy: quickStatus.healthy,
        demo: quickStatus.demoMode,
        configuredServices: quickStatus.configuredServices,
        message: quickStatus.demoMode 
          ? 'Running in DEMO mode - app works perfectly without API keys!'
          : `All ${quickStatus.configuredServices} services configured`,
        timestamp: new Date().toISOString()
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30',
          'X-Demo-Mode': quickStatus.demoMode ? 'true' : 'false'
        }
      });
    }

  } catch (error) {
    console.error('Health check endpoint error:', error);
    
    return NextResponse.json({
      status: 'error',
      healthy: false,
      demo: true,
      message: 'Health check failed - running in demo mode',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'X-Demo-Mode': 'true'
      }
    });
  }
}

// Options for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}