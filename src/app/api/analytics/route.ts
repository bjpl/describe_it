/**
 * Analytics API Endpoint
 * Handles analytics event collection and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AnalyticsEvent, validateEvent } from '@/lib/analytics/events';
import { captureError } from '@/lib/monitoring/sentry';

interface AnalyticsRequestBody {
  events: AnalyticsEvent[];
}

export async function POST(request: NextRequest) {
  console.log('[Analytics] Endpoint called');
  
  try {
    const body: AnalyticsRequestBody = await request.json();
    
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected events array.' },
        { status: 400 }
      );
    }

    // Validate all events
    const validEvents = body.events.filter(validateEvent);
    
    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid events provided' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Analytics] Supabase not configured, using in-memory storage');
      // Log events to console in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Events received:', validEvents);
      }
      
      return NextResponse.json({
        success: true,
        processed: validEvents.length,
        skipped: body.events.length - validEvents.length,
        storage: 'in-memory',
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Transform events for database storage
    const eventsToStore = validEvents.map(event => ({
      event_name: event.eventName,
      event_data: event,
      session_id: event.sessionId,
      user_id: event.userId || null,
      user_tier: event.userTier || 'free',
      timestamp: new Date(event.timestamp).toISOString(),
      properties: event.properties || {},
    }));

    // Try to store in Supabase with graceful fallback
    try {
      const { error: dbError } = await supabase
        .from('analytics_events')
        .insert(eventsToStore);

      if (dbError) {
        // Check if it's a table not found error
        if (dbError.message?.includes('relation') && dbError.message?.includes('does not exist')) {
          console.warn('[Analytics] Table analytics_events does not exist, using fallback');
          
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics] Events that would be stored:', eventsToStore);
          }
          
          return NextResponse.json({
            success: true,
            processed: validEvents.length,
            skipped: body.events.length - validEvents.length,
            storage: 'fallback',
            message: 'Analytics table not configured, events processed but not persisted',
          });
        }
        
        // Check for rate limiting
        if (dbError.message?.includes('quota') || dbError.message?.includes('rate')) {
          console.warn('[Analytics] Rate limited, using fallback');
          
          return NextResponse.json({
            success: true,
            processed: validEvents.length,
            skipped: body.events.length - validEvents.length,
            storage: 'rate-limited',
          });
        }
        
        // Other database errors
        console.error('[Analytics] Database error:', dbError);
        
        return NextResponse.json({
          success: true,  // Return success to prevent client retries
          processed: validEvents.length,
          skipped: body.events.length - validEvents.length,
          storage: 'error',
          warning: 'Events processed but storage failed',
        });
      }
    } catch (fetchError: any) {
      console.error('[Analytics] Network error:', fetchError);
      
      // Return success to prevent client from accumulating events
      return NextResponse.json({
        success: true,
        processed: validEvents.length,
        skipped: body.events.length - validEvents.length,
        storage: 'network-error',
      });
    }

    // Process real-time alerts only if database is available
    // Disabled for now to prevent additional errors
    // await processRealTimeAlerts(validEvents);

    return NextResponse.json({
      success: true,
      processed: validEvents.length,
      skipped: body.events.length - validEvents.length,
      storage: 'supabase',
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    captureError(error as Error, {
      endpoint: '/api/analytics',
      method: 'POST',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process real-time alerts based on incoming events
 */
async function processRealTimeAlerts(events: AnalyticsEvent[]) {
  for (const event of events) {
    // Check for critical errors
    if (event.eventName === 'error_occurred' && 
        event.properties?.severity === 'critical') {
      await triggerAlert({
        type: 'critical_error',
        message: `Critical error: ${event.properties.errorMessage}`,
        event,
      });
    }

    // Check for high API error rates
    if (event.eventName === 'api_error') {
      await checkApiErrorRate(event);
    }

    // Check for performance issues
    if (event.eventName === 'api_response_time' && 
        event.properties?.duration > 5000) {
      await triggerAlert({
        type: 'performance_degradation',
        message: `Slow API response: ${event.properties.duration}ms`,
        event,
      });
    }

    // Check for memory issues
    if (event.eventName === 'memory_usage' && 
        event.properties?.percentage > 90) {
      await triggerAlert({
        type: 'memory_warning',
        message: `High memory usage: ${event.properties.percentage}%`,
        event,
      });
    }
  }
}

/**
 * Check API error rate and trigger alerts if threshold exceeded
 */
async function checkApiErrorRate(errorEvent: AnalyticsEvent) {
  try {
    // Skip if Supabase is not configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Get recent API events (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentEvents, error } = await supabase
      .from('analytics_events')
      .select('event_name, properties')
      .gte('timestamp', fiveMinutesAgo)
      .in('event_name', ['api_request', 'api_error']);

    if (error || !recentEvents) {
      return;
    }

    const totalRequests = recentEvents.filter(e => e.event_name === 'api_request').length;
    const errorRequests = recentEvents.filter(e => e.event_name === 'api_error').length;
    
    if (totalRequests > 10) { // Only check if we have sufficient data
      const errorRate = (errorRequests / totalRequests) * 100;
      
      if (errorRate > 10) { // 10% error rate threshold
        await triggerAlert({
          type: 'high_error_rate',
          message: `High API error rate: ${errorRate.toFixed(1)}% (${errorRequests}/${totalRequests})`,
          event: errorEvent,
        });
      }
    }
  } catch (error) {
    console.error('Error checking API error rate:', error);
  }
}

/**
 * Trigger alert (could be email, Slack, etc.)
 */
async function triggerAlert(alert: {
  type: string;
  message: string;
  event: AnalyticsEvent;
}) {
  try {
    // Skip database storage if not configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Store alert in database
      const { error } = await supabase
        .from('system_alerts')
        .insert({
          alert_type: alert.type,
          message: alert.message,
          event_data: alert.event,
          severity: getSeverity(alert.type),
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to store alert:', error);
      }
    }

    // In production, you would also send notifications here
    // e.g., email, Slack, PagerDuty, etc.
    console.warn(`ALERT [${alert.type}]: ${alert.message}`);

  } catch (error) {
    console.error('Failed to trigger alert:', error);
  }
}

/**
 * Determine alert severity based on type
 */
function getSeverity(alertType: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    critical_error: 'critical',
    performance_degradation: 'high',
    high_error_rate: 'high',
    memory_warning: 'medium',
    api_limit_warning: 'medium',
  };

  return severityMap[alertType] || 'low';
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Analytics API is running',
    timestamp: new Date().toISOString(),
  });
}