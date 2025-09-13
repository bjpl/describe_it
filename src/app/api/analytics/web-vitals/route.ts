import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from '@/lib/utils/json-safe';

interface WebVitalData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  url: string;
  timestamp: number;
  userAgent?: string;
  connection?: string;
}

export async function POST(request: NextRequest) {
  try {
    const requestText = await request.text();
    const data = safeParse(requestText);
    
    if (!data) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    };

    // Validate required fields
    if (!data.name || typeof data.value !== 'number' || !data.id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vital received:', {
        metric: data.name,
        value: Math.round(data.value),
        rating: data.rating,
        url: data.url,
      });
    }

    // In production, you could send to external analytics services
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external analytics
      await Promise.allSettled([
        // Vercel Analytics (if configured)
        sendToVercelAnalytics(data),
        
        // Google Analytics (if configured)
        sendToGoogleAnalytics(data),
        
        // Custom analytics storage (if configured)
        sendToCustomAnalytics(data),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing web vitals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendToVercelAnalytics(data: WebVitalData) {
  // Vercel Analytics integration
  // This would be handled by the Vercel Analytics script on the frontend
  // but we can log server-side for additional tracking
  console.log('Vercel Analytics:', data.name, data.value);
}

async function sendToGoogleAnalytics(data: WebVitalData) {
  const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
  
  if (!GA_MEASUREMENT_ID) return;

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeStringify({
          client_id: data.id,
          events: [
            {
              name: 'web_vital',
              params: {
                metric_name: data.name,
                metric_value: Math.round(data.value),
                metric_rating: data.rating,
                page_location: data.url,
                custom_parameter_1: data.connection || 'unknown',
              },
            },
          ],
        }, '{}', 'google-analytics-payload'),
      }
    );

    if (!response.ok) {
      console.warn('Failed to send to Google Analytics:', response.status);
    }
  } catch (error) {
    console.warn('Google Analytics error:', error);
  }
}

async function sendToCustomAnalytics(data: WebVitalData) {
  // Custom analytics storage (e.g., database, external service)
  // This is where you'd implement your custom analytics storage
  
  // Example: Store in Vercel KV or external database
  try {
    // If using Vercel KV
    if (process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      
      const key = `web-vitals:${new Date().toISOString().split('T')[0]}:${data.name}`;
      await kv.lpush(key, safeStringify({
        ...data,
        timestamp: Date.now(),
      }, '{}', `web-vitals-storage-${key}`));
      
      // Set expiration to 30 days
      await kv.expire(key, 30 * 24 * 60 * 60);
    }
  } catch (error) {
    console.warn('Custom analytics error:', error);
  }
}

// GET endpoint to retrieve analytics data (for internal dashboards)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const days = parseInt(searchParams.get('days') || '7');

    // Basic authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ANALYTICS_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Retrieve data from storage
    const data = await retrieveAnalyticsData(metric, days);

    return NextResponse.json({
      success: true,
      data,
      period: `${days} days`,
      metric: metric || 'all',
    });
  } catch (error) {
    console.error('Error retrieving analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function retrieveAnalyticsData(metric?: string | null, days: number = 7) {
  try {
    if (process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const keys = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (metric) {
          keys.push(`web-vitals:${dateStr}:${metric}`);
        } else {
          // Get all metrics for the date
          const allKeys = await kv.keys(`web-vitals:${dateStr}:*`);
          keys.push(...allKeys);
        }
      }

      const results = [];
      for (const key of keys) {
        try {
          const values = await kv.lrange(key, 0, -1);
          results.push(
            ...values
              .map((v: string) => safeParse(v, null, `web-vitals-retrieval-${key}`))
              .filter(Boolean)
          );
        } catch (error) {
          console.warn(`Error retrieving key ${key}:`, error);
        }
      }

      return results;
    }

    return [];
  } catch (error) {
    console.warn('Error retrieving analytics data:', error);
    return [];
  }
}