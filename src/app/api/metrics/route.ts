/**
 * Prometheus metrics endpoint
 * Provides metrics scraping endpoint for Prometheus monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetrics, recordApiRequest } from '@/lib/monitoring/prometheus';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get metrics from Prometheus registry
    const metrics = await getMetrics();
    
    const duration = (Date.now() - startTime) / 1000;
    recordApiRequest('GET', '/api/metrics', 200, duration);

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    apiLogger.error('Failed to generate metrics:', error);
    
    const duration = (Date.now() - startTime) / 1000;
    recordApiRequest('GET', '/api/metrics', 500, duration);

    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

// Health check for the metrics endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}