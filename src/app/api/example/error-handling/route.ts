/**
 * Example API Route demonstrating comprehensive error handling
 * This route showcases different types of errors and how they are handled
 * by our centralized error management system
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, ValidationError, AuthenticationError, DatabaseError, ExternalServiceError } from '@/lib/middleware/errorMiddleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Request validation schema
const RequestSchema = z.object({
  operation: z.enum(['success', 'validation_error', 'auth_error', 'db_error', 'network_error', 'timeout', 'crash']),
  delay: z.number().min(0).max(10000).optional(),
  message: z.string().optional(),
  userId: z.string().optional(),
});

// Simulate async operations
const simulateAsyncOperation = (delay: number = 0): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};

// Simulate database operation
const simulateDatabaseOperation = async (shouldFail: boolean = false): Promise<{ id: string; data: any }> => {
  await simulateAsyncOperation(100);
  
  if (shouldFail) {
    throw new DatabaseError('Failed to execute database query', 'SELECT');
  }
  
  return {
    id: `record_${Date.now()}`,
    data: { success: true, timestamp: new Date().toISOString() }
  };
};

// Simulate external API call
const simulateExternalApiCall = async (shouldFail: boolean = false): Promise<{ status: string; data: any }> => {
  await simulateAsyncOperation(200);
  
  if (shouldFail) {
    throw new ExternalServiceError('External API call failed', 'PaymentService', 503);
  }
  
  return {
    status: 'success',
    data: { processed: true, timestamp: new Date().toISOString() }
  };
};

// Main handler function
async function handleRequest(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Log the incoming request
    logger.info(`API Call: ${request.method} ${request.url}`, {
      userAgent: request.headers.get('user-agent'),
      requestId: request.headers.get('x-request-id'),
    });

    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Validate request
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid request parameters',
        validationResult.error.issues[0]?.path[0] as string,
        validationResult.error.issues[0]?.message
      );
    }

    const { operation, delay = 0, message, userId } = validationResult.data;

    // Add user context to logger
    if (userId) {
      logger.info('Processing request for user', { userId, operation });
    }

    // Simulate processing delay
    if (delay > 0) {
      await simulateAsyncOperation(delay);
    }

    // Handle different operation types
    let result: any;

    switch (operation) {
      case 'success':
        // Successful operation
        const dbResult = await simulateDatabaseOperation();
        const apiResult = await simulateExternalApiCall();
        
        result = {
          operation: 'success',
          message: message || 'Operation completed successfully',
          data: {
            database: dbResult,
            externalApi: apiResult,
          },
          metadata: {
            processingTime: Date.now() - startTime,
            userId,
          }
        };
        break;

      case 'validation_error':
        throw new ValidationError(
          message || 'Validation failed for required field',
          'email',
          'invalid-email-format'
        );

      case 'auth_error':
        throw new AuthenticationError(
          message || 'Authentication token is invalid or expired'
        );

      case 'db_error':
        await simulateDatabaseOperation(true);
        break;

      case 'network_error':
        await simulateExternalApiCall(true);
        break;

      case 'timeout':
        // Simulate a timeout scenario
        await new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout: Operation took too long to complete'));
          }, 100);
        });
        break;

      case 'crash':
        // Simulate an unexpected crash
        throw new Error(message || 'Unexpected system error occurred');

      default:
        throw new ValidationError('Unknown operation type', 'operation', operation);
    }

    // Log successful response
    const duration = Date.now() - startTime;
    logger.info(`API Response: ${request.method} ${request.url} - 200`, {
      requestId: request.headers.get('x-request-id'),
      duration,
      userId,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      result,
      meta: {
        requestId: request.headers.get('x-request-id'),
        timestamp: new Date().toISOString(),
        processingTime: duration,
      }
    }, { 
      status: 200,
      headers: {
        'X-Processing-Time': duration.toString(),
        'X-Request-ID': request.headers.get('x-request-id') || 'unknown',
      }
    });

  } catch (error) {
    // Log the error with context
    const duration = Date.now() - startTime;
    logger.error('API request failed', error as Error, {
      requestId: request.headers.get('x-request-id'),
      method: request.method,
      url: request.url,
      duration,
      userAgent: request.headers.get('user-agent'),
    });

    // Re-throw to be handled by error middleware
    throw error;
  }
}

// Export the wrapped handler with error middleware
export const GET = withErrorHandling(async (request: NextRequest) => {
  return handleRequest(request);
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  return handleRequest(request);
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  return handleRequest(request);
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  return handleRequest(request);
});

// Additional endpoints to demonstrate specific error scenarios

// Health check endpoint
export const HEAD = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  
  // Simple health check
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    responseTime: Date.now() - startTime,
  };

  logger.info('Health check performed', {
    requestId: request.headers.get('x-request-id'),
    responseTime: health.responseTime,
  });

  return NextResponse.json(health, {
    status: 200,
    headers: {
      'X-Health-Status': 'healthy',
      'X-Response-Time': health.responseTime.toString(),
    }
  });
});

// Batch operation endpoint (demonstrates handling multiple potential failures)
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    const body = await request.json().catch(() => ({}));
    const { operations = [] } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      throw new ValidationError('Operations array is required and cannot be empty', 'operations');
    }

    if (operations.length > 10) {
      throw new ValidationError('Too many operations in batch (max 10)', 'operations', operations.length);
    }

    const results = [];
    const errors = [];

    // Process each operation
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      try {
        // Validate individual operation
        const opResult = RequestSchema.safeParse(operation);
        if (!opResult.success) {
          throw new ValidationError(`Invalid operation at index ${i}`, `operations[${i}]`);
        }

        // Execute the operation (simplified)
        const result = await simulateDatabaseOperation(
          opResult.data.operation === 'db_error'
        );
        
        results.push({
          index: i,
          success: true,
          result,
        });

      } catch (error) {
        errors.push({
          index: i,
          success: false,
          error: {
            message: (error as Error).message,
            type: (error as Error).constructor.name,
          },
        });

        // Log individual operation error
        logger.warn('Batch operation failed', {
          batchIndex: i,
          operation,
          error: (error as Error).message,
        });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.length;
    const errorCount = errors.length;

    // Log batch completion
    logger.info('Batch operation completed', {
      requestId: request.headers.get('x-request-id'),
      totalOperations: operations.length,
      successCount,
      errorCount,
      duration,
    });

    // Return batch results
    return NextResponse.json({
      success: errorCount === 0,
      summary: {
        total: operations.length,
        succeeded: successCount,
        failed: errorCount,
        processingTime: duration,
      },
      results,
      errors,
      meta: {
        requestId: request.headers.get('x-request-id'),
        timestamp: new Date().toISOString(),
      }
    }, {
      status: errorCount === 0 ? 200 : 207, // 207 Multi-Status for partial success
      headers: {
        'X-Batch-Success-Rate': `${(successCount / operations.length * 100).toFixed(1)}%`,
        'X-Processing-Time': duration.toString(),
      }
    });

  } catch (error) {
    // Re-throw for error middleware to handle
    throw error;
  }
});