/**
 * API Versioning Utilities
 * Helper functions for working with API versions
 */

import { ApiVersion, VERSION_FEATURES, VersionFeatures } from '../types/version';
import { NextResponse } from 'next/server';

/**
 * Get features available in a version
 */
export function getVersionFeatures(version: ApiVersion): VersionFeatures {
  return VERSION_FEATURES[version];
}

/**
 * Check if a feature is available in a version
 */
export function hasFeature(
  version: ApiVersion,
  featurePath: string
): boolean {
  const features = getVersionFeatures(version);
  const parts = featurePath.split('.');

  let current: any = features;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return current === true;
}

/**
 * Create version-specific response
 */
export function createVersionedResponse<T>(
  data: T,
  version: ApiVersion,
  options: {
    status?: number;
    headers?: Record<string, string>;
    includeVersion?: boolean;
  } = {}
): NextResponse {
  const { status = 200, headers = {}, includeVersion = true } = options;

  const responseHeaders: Record<string, string> = {
    ...headers,
    'Content-Type': 'application/json',
  };

  if (includeVersion) {
    responseHeaders['X-API-Version'] = version;
  }

  return NextResponse.json(data, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create error response with version info
 */
export function createVersionedError(
  message: string,
  version: ApiVersion,
  options: {
    code?: string;
    status?: number;
    details?: any;
  } = {}
): NextResponse {
  const { code = 'UNKNOWN_ERROR', status = 500, details } = options;

  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
      },
      version,
    },
    {
      status,
      headers: {
        'X-API-Version': version,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Generate version-specific content type
 */
export function getVersionedContentType(version: ApiVersion): string {
  return `application/vnd.describeit.${version}+json`;
}

/**
 * Parse version from content type
 */
export function parseVersionFromContentType(
  contentType: string
): ApiVersion | null {
  const match = contentType.match(/application\/vnd\.[\w-]+\.(v\d+)\+json/);
  return match ? (match[1] as ApiVersion) : null;
}

/**
 * Create HATEOAS links for v2
 */
export interface HateoasLink {
  href: string;
  rel: string;
  method?: string;
  type?: string;
}

export function createHateoasLinks(
  resourcePath: string,
  version: ApiVersion = 'v2'
): Record<string, HateoasLink> {
  if (version === 'v1') {
    return {}; // v1 doesn't support HATEOAS
  }

  const baseUrl = `/api/${version}`;

  return {
    self: {
      href: `${baseUrl}${resourcePath}`,
      rel: 'self',
      method: 'GET',
    },
  };
}

/**
 * Add pagination links (v2 cursor-based)
 */
export function addPaginationLinks(
  baseUrl: string,
  currentCursor: string | null,
  hasMore: boolean
): Record<string, HateoasLink> {
  const links: Record<string, HateoasLink> = {
    self: {
      href: currentCursor ? `${baseUrl}?cursor=${currentCursor}` : baseUrl,
      rel: 'self',
    },
    first: {
      href: baseUrl,
      rel: 'first',
    },
  };

  if (hasMore && currentCursor) {
    links.next = {
      href: `${baseUrl}?cursor=${currentCursor}`,
      rel: 'next',
    };
  }

  return links;
}

/**
 * Transform offset pagination to cursor-based (v1 to v2)
 */
export function offsetToCursor(offset: number, limit: number): string {
  return Buffer.from(`${offset}:${limit}`).toString('base64');
}

/**
 * Transform cursor to offset pagination (v2 to v1)
 */
export function cursorToOffset(cursor: string): { offset: number; limit: number } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [offset, limit] = decoded.split(':').map(Number);
    return { offset, limit };
  } catch {
    return { offset: 0, limit: 50 };
  }
}

/**
 * Validate version compatibility
 */
export function areVersionsCompatible(
  clientVersion: ApiVersion,
  serverVersion: ApiVersion
): boolean {
  // Same version is always compatible
  if (clientVersion === serverVersion) {
    return true;
  }

  // v1 is backward compatible with v2 (server can serve v1 responses)
  if (clientVersion === 'v1' && serverVersion === 'v2') {
    return true;
  }

  return false;
}

/**
 * Get version upgrade path
 */
export function getUpgradePath(
  from: ApiVersion,
  to: ApiVersion
): ApiVersion[] {
  const versions: ApiVersion[] = ['v1', 'v2'];
  const fromIndex = versions.indexOf(from);
  const toIndex = versions.indexOf(to);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return [];
  }

  return versions.slice(fromIndex, toIndex + 1);
}
