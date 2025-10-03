/**
 * Analytics API Endpoint
 * Handles analytics event collection and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import { createClient } from '@supabase/supabase-js';
import { AnalyticsEvent, validateEvent } from '@/lib/analytics/events';
import { captureError } from '@/lib/monitoring/sentry';
import { 
  analyticsTrackSchema,
  validateSecurityHeaders,
  validateRequestSize,
  createErrorResponse,
  createSuccessResponse
} from '@/lib/schemas/api-validation';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';

interface AnalyticsRequestBody {
  events: AnalyticsEvent[];
}

export async function POST(request: NextRequest) {
  apiLogger.info('[Analytics] Endpoint called');
  
  try {
    // Security validation
    const securityCheck = validateSecurityHeaders(request.headers);
    if (!securityCheck.valid) {
      return createErrorResponse(
        "Security validation failed",
        403,
        [{ field: "security", message: securityCheck.reason || "Security check failed" }]
      );
    }

    // Parse and validate request size
    const requestText = await request.text();
    
    if (!validateRequestSize(requestText, 100 * 1024)) { // 100KB limit for analytics
      return createErrorResponse("Request too large", 413);
    }

    const body = safeParse(requestText);
    if (!body) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    
    // Enhanced validation for analytics events array
    if (!body.events || !Array.isArray(body.events)) {
      return createErrorResponse(
        'Invalid request body. Expected events array.',
        400,
        [{ field: "events", message: "Events must be provided as an array" }]
      );
    }

    // Validate each event using our analytics schema
    const validatedEvents = [];
    const validationErrors = [];

    for (let i = 0; i < body.events.length; i++) {
      try {
        // Transform event to match our schema and validate
        const event = body.events[i];
        const validatedEvent = analyticsTrackSchema.parse({
          event: event.eventName || event.event,
          properties: event.properties || {},
          timestamp: event.timestamp,
          userId: event.userId,
          sessionId: event.sessionId,
        });
        
        validatedEvents.push({
          ...event,
          eventName: validatedEvent.event,
          properties: validatedEvent.properties,
          timestamp: validatedEvent.timestamp || new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push({
            index: i,
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            }))
          });
        }
      }
    }

    // Check if we have any valid events after validation
    if (validatedEvents.length === 0) {
      return createErrorResponse(
        'No valid events provided',
        400,
        validationErrors.length > 0 ? [
          { field: "events", message: `${validationErrors.length} validation errors found`, code: "VALIDATION_ERRORS" }
        ] : [
          { field: "events", message: "All events failed validation" }
        ]
      );
    }

    // Use existing validation as fallback for compatibility
    const validEvents = validatedEvents.filter(validateEvent);

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      apiLogger.warn('[Analytics] Supabase not configured, using in-memory storage');
      // Log events to console in development mode
      if (process.env.NODE_ENV === 'development') {
        apiLogger.info('[Analytics] Events received:', validEvents);
      }
      
      return createSuccessResponse({
        processed: validEvents.length,
        skipped: body.events.length - validEvents.length,
        storage: 'in-memory',
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
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
          apiLogger.warn('[Analytics] Table analytics_events does not exist, using fallback');
          
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            apiLogger.info('[Analytics] Events that would be stored:', eventsToStore);
          }
          
          return createSuccessResponse({
            processed: validEvents.length,
            skipped: body.events.length - validEvents.length,
            storage: 'fallback',
            message: 'Analytics table not configured, events processed but not persisted',
            validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
          });
        }
        
        // Check for rate limiting
        if (dbError.message?.includes('quota') || dbError.message?.includes('rate')) {
          apiLogger.warn('[Analytics] Rate limited, using fallback');
          
          return createSuccessResponse({
            processed: validEvents.length,
            skipped: body.events.length - validEvents.length,
            storage: 'rate-limited',
            validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
          });
        }
        
        // Other database errors
        apiLogger.error('[Analytics] Database error:', dbError);
        
        return createSuccessResponse({
          processed: validEvents.length,
          skipped: body.events.length - validEvents.length,
          storage: 'error',
          warning: 'Events processed but storage failed',
          validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        });
      }
    } catch (fetchError: any) {
      apiLogger.error('[Analytics] Network error:', fetchError);
      
      // Return success to prevent client from accumulating events
      return createSuccessResponse({
        processed: validEvents.length,
        skipped: body.events.length - validEvents.length,
        storage: 'network-error',
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      });
    }

    // Process real-time alerts only if database is available
    // Disabled for now to prevent additional errors
    // await processRealTimeAlerts(validEvents);

    return createSuccessResponse({
      processed: validEvents.length,
      skipped: body.events.length - validEvents.length,
      storage: 'supabase',
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    });

  } catch (error) {
    apiLogger.error('Analytics API error:', error);
    captureError(error as Error, {
      endpoint: '/api/analytics',
      method: 'POST',
    });

    return createErrorResponse(
      'Internal server error',
      500,
      [{ field: "server", message: error instanceof Error ? error.message : "Unexpected error occurred" }]
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
    apiLogger.error('Error checking API error rate:', error);
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
        apiLogger.error('Failed to store alert:', error);
      }
    }

    // In production, you would also send notifications here
    // e.g., email, Slack, PagerDuty, etc.
    apiLogger.warn(`ALERT [${alert.type}]: ${alert.message}`);

  } catch (error) {
    apiLogger.error('Failed to trigger alert:', error);
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
  return createSuccessResponse({
    message: 'Analytics API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      POST: '/api/analytics - Submit analytics events',
      GET: '/api/analytics - Health check'
    }
  });
}