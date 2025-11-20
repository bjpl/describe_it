/**
 * API Versioning System
 * Main export file for all versioning components
 */

// Types
export * from './types/version';

// Versioning utilities
export * from './versioning/negotiator';
export * from './versioning/utils';

// Middleware
export * from './middleware/versionRouter';
export * from './middleware/deprecationWarning';

// Migration utilities
export * from './utils/migration';

// Re-export commonly used functions
export {
  negotiateVersion,
  extractVersionFromUrl,
  extractVersionFromAcceptHeader,
  extractVersionFromCustomHeader,
  isSupportedVersion,
  isVersionDeprecated,
  getDeprecationInfo,
} from './versioning/negotiator';

export {
  createVersionRouter,
  versionedEndpoint,
} from './middleware/versionRouter';

export {
  withDeprecationWarnings,
  isSunsettingSoon,
  createSunsetWarning,
} from './middleware/deprecationWarning';

export {
  migrateData,
  batchMigrateData,
  registerMigration,
  getMigration,
  migrateChain,
  createAutoMigrator,
} from './utils/migration';

export {
  getVersionFeatures,
  hasFeature,
  createVersionedResponse,
  createVersionedError,
  getVersionedContentType,
  parseVersionFromContentType,
  createHateoasLinks,
  addPaginationLinks,
  offsetToCursor,
  cursorToOffset,
  areVersionsCompatible,
  getUpgradePath,
} from './versioning/utils';
