/**
 * Example: Versioned Endpoint Implementation
 * Demonstrates how to use the versioning middleware
 */

import { NextRequest } from 'next/server';
import { createVersionRouter } from '../middleware/versionRouter';
import { withDeprecationWarnings } from '../middleware/deprecationWarning';
import { handleV1GetLists, handleV1CreateList } from './v1/vocabularyLists';
import { handleV2GetLists, handleV2CreateList } from './v2/vocabularyLists';

/**
 * Versioned GET endpoint
 * Supports both v1 and v2
 */
export const GET = createVersionRouter(
  {
    v1: (request: NextRequest) => {
      return withDeprecationWarnings(handleV1GetLists, {
        includeHeaders: true,
        includeInBody: false,
        logAccess: true,
      })(request);
    },
    v2: handleV2GetLists,
  },
  {
    includeDeprecationWarnings: true,
    includeVersionHeaders: true,
    logVersionNegotiation: true,
    fallbackToLatest: false,
  }
);

/**
 * Versioned POST endpoint
 * Supports both v1 and v2
 */
export const POST = createVersionRouter(
  {
    v1: (request: NextRequest) => {
      return withDeprecationWarnings(handleV1CreateList, {
        includeHeaders: true,
        includeInBody: false,
        logAccess: true,
      })(request);
    },
    v2: handleV2CreateList,
  },
  {
    includeDeprecationWarnings: true,
    includeVersionHeaders: true,
    logVersionNegotiation: true,
    fallbackToLatest: false,
  }
);

/**
 * Alternative: Simplified versioned endpoint
 * Uses default options
 */
export const createSimpleVersionedEndpoint = () => {
  return createVersionRouter({
    v1: handleV1GetLists,
    v2: handleV2GetLists,
    default: handleV2GetLists, // Default to latest version
  });
};
