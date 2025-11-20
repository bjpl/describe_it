/**
 * API Version Negotiator
 * Handles version negotiation from multiple sources
 */

import { NextRequest } from 'next/server';
import {
  ApiVersion,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  DEPRECATED_VERSIONS,
  VersionNegotiationResult,
} from '../types/version';
import { apiLogger } from '@/lib/logger';

/**
 * Extract version from URL path
 * @example /api/v1/users -> 'v1'
 * @example /api/v2/products -> 'v2'
 */
export function extractVersionFromUrl(url: string): ApiVersion | null {
  const match = url.match(/\/api\/(v\d+)\//);
  if (!match) return null;

  const version = match[1] as string;
  return SUPPORTED_VERSIONS.includes(version as ApiVersion)
    ? (version as ApiVersion)
    : null;
}

/**
 * Extract version from Accept header
 * @example Accept: application/vnd.myapi.v1+json
 * @example Accept: application/vnd.myapi.v2+json
 */
export function extractVersionFromAcceptHeader(
  acceptHeader: string | null
): ApiVersion | null {
  if (!acceptHeader) return null;

  const match = acceptHeader.match(/application\/vnd\.[\w-]+\.(v\d+)\+json/);
  if (!match) return null;

  const version = match[1] as string;
  return SUPPORTED_VERSIONS.includes(version as ApiVersion)
    ? (version as ApiVersion)
    : null;
}

/**
 * Extract version from custom header
 * @example X-API-Version: v1
 * @example Api-Version: v2
 */
export function extractVersionFromCustomHeader(
  request: NextRequest
): ApiVersion | null {
  const customHeader =
    request.headers.get('X-API-Version') ||
    request.headers.get('Api-Version');

  if (!customHeader) return null;

  return SUPPORTED_VERSIONS.includes(customHeader as ApiVersion)
    ? (customHeader as ApiVersion)
    : null;
}

/**
 * Extract version from query parameter
 * @example /api/users?version=v1
 */
export function extractVersionFromQuery(url: string): ApiVersion | null {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const version = urlObj.searchParams.get('version');

    if (!version) return null;

    return SUPPORTED_VERSIONS.includes(version as ApiVersion)
      ? (version as ApiVersion)
      : null;
  } catch {
    return null;
  }
}

/**
 * Negotiate API version from request
 * Priority order:
 * 1. Custom header (X-API-Version)
 * 2. URL path (/api/v1/...)
 * 3. Accept header (application/vnd.myapi.v1+json)
 * 4. Query parameter (?version=v1)
 * 5. Default version
 */
export function negotiateVersion(
  request: NextRequest
): VersionNegotiationResult {
  const url = request.url;
  const acceptHeader = request.headers.get('Accept');

  // Priority 1: Custom header
  const headerVersion = extractVersionFromCustomHeader(request);
  if (headerVersion) {
    return createNegotiationResult(headerVersion, 'header');
  }

  // Priority 2: URL path
  const urlVersion = extractVersionFromUrl(url);
  if (urlVersion) {
    return createNegotiationResult(urlVersion, 'url');
  }

  // Priority 3: Accept header
  const acceptVersion = extractVersionFromAcceptHeader(acceptHeader);
  if (acceptVersion) {
    return createNegotiationResult(acceptVersion, 'content-type');
  }

  // Priority 4: Query parameter
  const queryVersion = extractVersionFromQuery(url);
  if (queryVersion) {
    return createNegotiationResult(queryVersion, 'url');
  }

  // Priority 5: Default version
  apiLogger.info('No version specified, using default', {
    url,
    defaultVersion: DEFAULT_VERSION,
  });

  return createNegotiationResult(DEFAULT_VERSION, 'default');
}

/**
 * Create version negotiation result
 */
function createNegotiationResult(
  version: ApiVersion,
  source: VersionNegotiationResult['source']
): VersionNegotiationResult {
  const deprecationInfo = DEPRECATED_VERSIONS[version];
  const isDeprecated = !!deprecationInfo;

  if (isDeprecated) {
    apiLogger.warn('Deprecated API version accessed', {
      version,
      source,
      deprecationInfo,
    });
  }

  return {
    version,
    source,
    isDeprecated,
    deprecationInfo,
  };
}

/**
 * Validate if version is supported
 */
export function isSupportedVersion(version: string): version is ApiVersion {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion);
}

/**
 * Check if version is deprecated
 */
export function isVersionDeprecated(version: ApiVersion): boolean {
  return !!DEPRECATED_VERSIONS[version];
}

/**
 * Get deprecation info for a version
 */
export function getDeprecationInfo(version: ApiVersion) {
  return DEPRECATED_VERSIONS[version] || null;
}
