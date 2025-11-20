/**
 * API Version Router Middleware
 * Routes requests to appropriate version handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { negotiateVersion } from '../versioning/negotiator';
import { ApiVersion, LATEST_VERSION } from '../types/version';
import { apiLogger } from '@/lib/logger';

/**
 * Version-specific handler type
 */
export type VersionHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Version handlers registry
 */
export interface VersionHandlers {
  v1?: VersionHandler;
  v2?: VersionHandler;
  default?: VersionHandler;
}

/**
 * Version router options
 */
export interface VersionRouterOptions {
  /**
   * Add deprecation warnings to response headers
   */
  includeDeprecationWarnings?: boolean;

  /**
   * Add version info to response headers
   */
  includeVersionHeaders?: boolean;

  /**
   * Log version negotiation
   */
  logVersionNegotiation?: boolean;

  /**
   * Fallback to latest version if requested version not found
   */
  fallbackToLatest?: boolean;
}

/**
 * Create version router middleware
 */
export function createVersionRouter(
  handlers: VersionHandlers,
  options: VersionRouterOptions = {}
) {
  const {
    includeDeprecationWarnings = true,
    includeVersionHeaders = true,
    logVersionNegotiation = true,
    fallbackToLatest = false,
  } = options;

  return async function versionRouter(
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    const startTime = performance.now();

    // Negotiate version from request
    const negotiation = negotiateVersion(request);
    const { version, source, isDeprecated, deprecationInfo } = negotiation;

    if (logVersionNegotiation) {
      apiLogger.info('API version negotiated', {
        version,
        source,
        url: request.url,
        method: request.method,
      });
    }

    // Get handler for version
    let handler = handlers[version];

    // Fallback logic
    if (!handler) {
      if (fallbackToLatest && handlers[LATEST_VERSION]) {
        apiLogger.warn('Version handler not found, falling back to latest', {
          requestedVersion: version,
          fallbackVersion: LATEST_VERSION,
        });
        handler = handlers[LATEST_VERSION];
      } else if (handlers.default) {
        apiLogger.warn('Version handler not found, using default', {
          requestedVersion: version,
        });
        handler = handlers.default;
      } else {
        return NextResponse.json(
          {
            error: 'Version Not Supported',
            message: `API version '${version}' is not supported`,
            supportedVersions: Object.keys(handlers).filter((k) => k !== 'default'),
          },
          { status: 400 }
        );
      }
    }

    try {
      // Execute version-specific handler
      const response = await handler(request, context);

      // Add version headers
      if (includeVersionHeaders) {
        response.headers.set('X-API-Version', version);
        response.headers.set('X-API-Version-Source', source);
      }

      // Add deprecation warnings
      if (includeDeprecationWarnings && isDeprecated && deprecationInfo) {
        response.headers.set('Deprecation', 'true');
        response.headers.set(
          'Sunset',
          deprecationInfo.sunsetAt.toUTCString()
        );
        response.headers.set(
          'Warning',
          `299 - "API version ${version} is deprecated. ${deprecationInfo.message}"`
        );

        if (deprecationInfo.migrationGuide) {
          response.headers.set('Link', `<${deprecationInfo.migrationGuide}>; rel="deprecation"`);
        }
      }

      // Add response time
      const responseTime = performance.now() - startTime;
      response.headers.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);

      return response;
    } catch (error) {
      const responseTime = performance.now() - startTime;

      apiLogger.error('Version handler error', {
        version,
        error,
        url: request.url,
        method: request.method,
      });

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'An error occurred processing your request',
        },
        {
          status: 500,
          headers: {
            'X-API-Version': version,
            'X-Response-Time': `${responseTime.toFixed(2)}ms`,
          },
        }
      );
    }
  };
}

/**
 * Helper to create a versioned endpoint
 */
export function versionedEndpoint(handlers: VersionHandlers, options?: VersionRouterOptions) {
  const router = createVersionRouter(handlers, options);

  return {
    GET: (request: NextRequest, context?: any) => router(request, context),
    POST: (request: NextRequest, context?: any) => router(request, context),
    PUT: (request: NextRequest, context?: any) => router(request, context),
    PATCH: (request: NextRequest, context?: any) => router(request, context),
    DELETE: (request: NextRequest, context?: any) => router(request, context),
  };
}
