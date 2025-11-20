/**
 * API Version Types
 * Defines all types related to API versioning
 */

export type ApiVersion = 'v1' | 'v2';

export const SUPPORTED_VERSIONS: readonly ApiVersion[] = ['v1', 'v2'] as const;
export const DEFAULT_VERSION: ApiVersion = 'v1';
export const LATEST_VERSION: ApiVersion = 'v2';

/**
 * Version deprecation information
 */
export interface VersionDeprecation {
  version: ApiVersion;
  deprecatedAt: Date;
  sunsetAt: Date;
  message: string;
  migrationGuide?: string;
}

/**
 * Version negotiation result
 */
export interface VersionNegotiationResult {
  version: ApiVersion;
  source: 'header' | 'url' | 'content-type' | 'default';
  isDeprecated: boolean;
  deprecationInfo?: VersionDeprecation;
}

/**
 * API response metadata
 */
export interface ApiVersionMetadata {
  version: ApiVersion;
  deprecated?: boolean;
  sunset?: string;
  latestVersion?: ApiVersion;
  deprecationWarning?: string;
}

/**
 * Version-specific request context
 */
export interface VersionedRequest {
  version: ApiVersion;
  originalUrl: string;
  parsedVersion: VersionNegotiationResult;
}

/**
 * Migration utility context
 */
export interface MigrationContext {
  fromVersion: ApiVersion;
  toVersion: ApiVersion;
  data: any;
  direction: 'upgrade' | 'downgrade';
}

/**
 * Deprecated versions registry
 */
export const DEPRECATED_VERSIONS: Record<string, VersionDeprecation> = {
  v1: {
    version: 'v1',
    deprecatedAt: new Date('2025-01-01'),
    sunsetAt: new Date('2025-06-01'),
    message: 'API v1 is deprecated. Please migrate to v2 for enhanced features and better performance.',
    migrationGuide: '/docs/migration/v1-to-v2',
  },
};

/**
 * Version feature flags
 */
export interface VersionFeatures {
  pagination: {
    cursor: boolean;
    offset: boolean;
  };
  authentication: {
    oauth2: boolean;
    apiKey: boolean;
    jwt: boolean;
  };
  validation: {
    strictMode: boolean;
    additionalProperties: boolean;
  };
  response: {
    hypermedia: boolean;
    etags: boolean;
    compression: boolean;
  };
}

/**
 * Feature availability per version
 */
export const VERSION_FEATURES: Record<ApiVersion, VersionFeatures> = {
  v1: {
    pagination: {
      cursor: false,
      offset: true,
    },
    authentication: {
      oauth2: false,
      apiKey: true,
      jwt: true,
    },
    validation: {
      strictMode: false,
      additionalProperties: true,
    },
    response: {
      hypermedia: false,
      etags: false,
      compression: true,
    },
  },
  v2: {
    pagination: {
      cursor: true,
      offset: true,
    },
    authentication: {
      oauth2: true,
      apiKey: true,
      jwt: true,
    },
    validation: {
      strictMode: true,
      additionalProperties: false,
    },
    response: {
      hypermedia: true,
      etags: true,
      compression: true,
    },
  },
};
