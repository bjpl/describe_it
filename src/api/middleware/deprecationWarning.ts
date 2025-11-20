/**
 * Deprecation Warning Middleware
 * Adds deprecation warnings to API responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { negotiateVersion } from '../versioning/negotiator';
import { LATEST_VERSION } from '../types/version';
import { apiLogger } from '@/lib/logger';

/**
 * Deprecation warning options
 */
export interface DeprecationOptions {
  /**
   * Include deprecation headers
   */
  includeHeaders?: boolean;

  /**
   * Include deprecation in response body
   */
  includeInBody?: boolean;

  /**
   * Log deprecation access
   */
  logAccess?: boolean;

  /**
   * Custom deprecation message
   */
  customMessage?: string;
}

/**
 * Add deprecation warnings to response
 */
export function withDeprecationWarnings(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: DeprecationOptions = {}
) {
  const {
    includeHeaders = true,
    includeInBody = false,
    logAccess = true,
    customMessage,
  } = options;

  return async function deprecationMiddleware(
    request: NextRequest
  ): Promise<NextResponse> {
    const negotiation = negotiateVersion(request);
    const { version, isDeprecated, deprecationInfo } = negotiation;

    // Execute handler
    const response = await handler(request);

    // If version is not deprecated, return as-is
    if (!isDeprecated || !deprecationInfo) {
      return response;
    }

    // Log deprecation access
    if (logAccess) {
      apiLogger.warn('Deprecated API version accessed', {
        version,
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('User-Agent'),
        deprecationInfo,
      });
    }

    // Clone response to modify
    const clonedResponse = new NextResponse(response.body, response);

    // Add deprecation headers
    if (includeHeaders) {
      clonedResponse.headers.set('Deprecation', 'true');
      clonedResponse.headers.set(
        'Sunset',
        deprecationInfo.sunsetAt.toUTCString()
      );
      clonedResponse.headers.set('X-API-Version', version);
      clonedResponse.headers.set('X-API-Latest-Version', LATEST_VERSION);

      const warningMessage =
        customMessage ||
        `API version ${version} is deprecated. ${deprecationInfo.message}`;

      clonedResponse.headers.set('Warning', `299 - "${warningMessage}"`);

      if (deprecationInfo.migrationGuide) {
        clonedResponse.headers.set(
          'Link',
          `<${deprecationInfo.migrationGuide}>; rel="deprecation"; type="text/html"`
        );
      }
    }

    // Add deprecation to response body
    if (includeInBody) {
      try {
        const body = await response.json();
        const modifiedBody = {
          ...body,
          _deprecation: {
            deprecated: true,
            version,
            deprecatedAt: deprecationInfo.deprecatedAt.toISOString(),
            sunsetAt: deprecationInfo.sunsetAt.toISOString(),
            message: deprecationInfo.message,
            migrationGuide: deprecationInfo.migrationGuide,
            latestVersion: LATEST_VERSION,
          },
        };

        return NextResponse.json(modifiedBody, {
          status: response.status,
          headers: clonedResponse.headers,
        });
      } catch {
        // If response is not JSON, return as-is
        return clonedResponse;
      }
    }

    return clonedResponse;
  };
}

/**
 * Check if a version will sunset soon
 */
export function isSunsettingSoon(sunsetDate: Date, daysThreshold = 30): boolean {
  const now = new Date();
  const daysUntilSunset =
    (sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilSunset <= daysThreshold && daysUntilSunset > 0;
}

/**
 * Create sunset warning message
 */
export function createSunsetWarning(sunsetDate: Date): string {
  const now = new Date();
  const daysUntilSunset = Math.ceil(
    (sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilSunset <= 0) {
    return 'This API version has been sunset and may be removed at any time.';
  } else if (daysUntilSunset <= 7) {
    return `This API version will be sunset in ${daysUntilSunset} days.`;
  } else if (daysUntilSunset <= 30) {
    return `This API version will be sunset in ${daysUntilSunset} days.`;
  } else {
    const weeks = Math.ceil(daysUntilSunset / 7);
    return `This API version will be sunset in approximately ${weeks} weeks.`;
  }
}
