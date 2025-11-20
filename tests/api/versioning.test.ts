/**
 * API Versioning Tests
 * Comprehensive test suite for API versioning functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  negotiateVersion,
  extractVersionFromUrl,
  extractVersionFromAcceptHeader,
  extractVersionFromCustomHeader,
  isSupportedVersion,
  isVersionDeprecated,
  getDeprecationInfo,
} from '@/api/versioning/negotiator';
import {
  migrateData,
  registerMigration,
  batchMigrateData,
} from '@/api/utils/migration';
import {
  getVersionFeatures,
  hasFeature,
  offsetToCursor,
  cursorToOffset,
  areVersionsCompatible,
  getUpgradePath,
} from '@/api/versioning/utils';
import { createVersionRouter } from '@/api/middleware/versionRouter';

// ============================================================================
// Version Negotiation Tests
// ============================================================================

describe('Version Negotiation', () => {
  describe('extractVersionFromUrl', () => {
    it('should extract version from URL path', () => {
      expect(extractVersionFromUrl('/api/v1/users')).toBe('v1');
      expect(extractVersionFromUrl('/api/v2/products')).toBe('v2');
      expect(extractVersionFromUrl('/api/users')).toBeNull();
    });

    it('should return null for invalid versions', () => {
      expect(extractVersionFromUrl('/api/v3/users')).toBeNull();
      expect(extractVersionFromUrl('/api/v0/users')).toBeNull();
    });
  });

  describe('extractVersionFromAcceptHeader', () => {
    it('should extract version from Accept header', () => {
      expect(
        extractVersionFromAcceptHeader('application/vnd.describeit.v1+json')
      ).toBe('v1');
      expect(
        extractVersionFromAcceptHeader('application/vnd.describeit.v2+json')
      ).toBe('v2');
    });

    it('should return null for invalid Accept headers', () => {
      expect(extractVersionFromAcceptHeader('application/json')).toBeNull();
      expect(extractVersionFromAcceptHeader(null)).toBeNull();
    });
  });

  describe('extractVersionFromCustomHeader', () => {
    it('should extract version from X-API-Version header', () => {
      const request = new NextRequest('http://localhost/api/users', {
        headers: { 'X-API-Version': 'v2' },
      });
      expect(extractVersionFromCustomHeader(request)).toBe('v2');
    });

    it('should extract version from Api-Version header', () => {
      const request = new NextRequest('http://localhost/api/users', {
        headers: { 'Api-Version': 'v1' },
      });
      expect(extractVersionFromCustomHeader(request)).toBe('v1');
    });

    it('should return null when no version header present', () => {
      const request = new NextRequest('http://localhost/api/users');
      expect(extractVersionFromCustomHeader(request)).toBeNull();
    });
  });

  describe('negotiateVersion', () => {
    it('should prioritize custom header over URL', () => {
      const request = new NextRequest('http://localhost/api/v1/users', {
        headers: { 'X-API-Version': 'v2' },
      });
      const result = negotiateVersion(request);

      expect(result.version).toBe('v2');
      expect(result.source).toBe('header');
    });

    it('should use URL when no header present', () => {
      const request = new NextRequest('http://localhost/api/v2/users');
      const result = negotiateVersion(request);

      expect(result.version).toBe('v2');
      expect(result.source).toBe('url');
    });

    it('should detect deprecated versions', () => {
      const request = new NextRequest('http://localhost/api/v1/users');
      const result = negotiateVersion(request);

      expect(result.version).toBe('v1');
      expect(result.isDeprecated).toBe(true);
      expect(result.deprecationInfo).toBeDefined();
    });

    it('should fall back to default version', () => {
      const request = new NextRequest('http://localhost/api/users');
      const result = negotiateVersion(request);

      expect(result.version).toBe('v1');
      expect(result.source).toBe('default');
    });
  });

  describe('Version Validation', () => {
    it('should validate supported versions', () => {
      expect(isSupportedVersion('v1')).toBe(true);
      expect(isSupportedVersion('v2')).toBe(true);
      expect(isSupportedVersion('v3')).toBe(false);
    });

    it('should identify deprecated versions', () => {
      expect(isVersionDeprecated('v1')).toBe(true);
      expect(isVersionDeprecated('v2')).toBe(false);
    });

    it('should return deprecation info', () => {
      const info = getDeprecationInfo('v1');

      expect(info).toBeDefined();
      expect(info?.version).toBe('v1');
      expect(info?.deprecatedAt).toBeInstanceOf(Date);
      expect(info?.sunsetAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Migration Tests
// ============================================================================

describe('Data Migration', () => {
  beforeEach(() => {
    // Register test migrations
    registerMigration('v1', 'v2', (data) => ({
      ...data,
      metadata: {
        language: data.language,
        difficultyLevel: data.difficulty_level,
      },
      timestamps: {
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }));

    registerMigration('v2', 'v1', (data) => ({
      ...data,
      language: data.metadata.language,
      difficulty_level: data.metadata.difficultyLevel,
      created_at: data.timestamps.createdAt,
      updated_at: data.timestamps.updatedAt,
    }));
  });

  describe('migrateData', () => {
    it('should migrate v1 to v2', async () => {
      const v1Data = {
        id: '1',
        name: 'Test',
        language: 'es',
        difficulty_level: 2,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const v2Data = await migrateData(v1Data, 'v1', 'v2');

      expect(v2Data.metadata.language).toBe('es');
      expect(v2Data.metadata.difficultyLevel).toBe(2);
      expect(v2Data.timestamps.createdAt).toBe('2025-01-01T00:00:00Z');
    });

    it('should migrate v2 to v1', async () => {
      const v2Data = {
        id: '1',
        name: 'Test',
        metadata: {
          language: 'en',
          difficultyLevel: 3,
        },
        timestamps: {
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      };

      const v1Data = await migrateData(v2Data, 'v2', 'v1');

      expect(v1Data.language).toBe('en');
      expect(v1Data.difficulty_level).toBe(3);
      expect(v1Data.created_at).toBe('2025-01-01T00:00:00Z');
    });

    it('should return same data for same version', async () => {
      const data = { id: '1', name: 'Test' };
      const result = await migrateData(data, 'v1', 'v1');

      expect(result).toEqual(data);
    });
  });

  describe('batchMigrateData', () => {
    it('should migrate multiple items', async () => {
      const v1Items = [
        {
          id: '1',
          language: 'es',
          difficulty_level: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          language: 'en',
          difficulty_level: 2,
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
      ];

      const v2Items = await batchMigrateData(v1Items, 'v1', 'v2');

      expect(v2Items).toHaveLength(2);
      expect(v2Items[0].metadata.language).toBe('es');
      expect(v2Items[1].metadata.language).toBe('en');
    });
  });
});

// ============================================================================
// Version Features Tests
// ============================================================================

describe('Version Features', () => {
  describe('getVersionFeatures', () => {
    it('should return v1 features', () => {
      const features = getVersionFeatures('v1');

      expect(features.pagination.cursor).toBe(false);
      expect(features.pagination.offset).toBe(true);
      expect(features.authentication.oauth2).toBe(false);
      expect(features.response.hypermedia).toBe(false);
    });

    it('should return v2 features', () => {
      const features = getVersionFeatures('v2');

      expect(features.pagination.cursor).toBe(true);
      expect(features.pagination.offset).toBe(true);
      expect(features.authentication.oauth2).toBe(true);
      expect(features.response.hypermedia).toBe(true);
    });
  });

  describe('hasFeature', () => {
    it('should check feature availability', () => {
      expect(hasFeature('v1', 'pagination.cursor')).toBe(false);
      expect(hasFeature('v2', 'pagination.cursor')).toBe(true);
      expect(hasFeature('v1', 'pagination.offset')).toBe(true);
      expect(hasFeature('v2', 'response.hypermedia')).toBe(true);
    });
  });
});

// ============================================================================
// Pagination Utils Tests
// ============================================================================

describe('Pagination Utilities', () => {
  describe('offsetToCursor / cursorToOffset', () => {
    it('should convert offset to cursor and back', () => {
      const cursor = offsetToCursor(50, 25);
      const { offset, limit } = cursorToOffset(cursor);

      expect(offset).toBe(50);
      expect(limit).toBe(25);
    });

    it('should handle invalid cursors gracefully', () => {
      const { offset, limit } = cursorToOffset('invalid-cursor');

      expect(offset).toBe(0);
      expect(limit).toBe(50);
    });
  });
});

// ============================================================================
// Version Compatibility Tests
// ============================================================================

describe('Version Compatibility', () => {
  describe('areVersionsCompatible', () => {
    it('should check version compatibility', () => {
      expect(areVersionsCompatible('v1', 'v1')).toBe(true);
      expect(areVersionsCompatible('v2', 'v2')).toBe(true);
      expect(areVersionsCompatible('v1', 'v2')).toBe(true);
      expect(areVersionsCompatible('v2', 'v1')).toBe(false);
    });
  });

  describe('getUpgradePath', () => {
    it('should return upgrade path', () => {
      const path = getUpgradePath('v1', 'v2');

      expect(path).toEqual(['v1', 'v2']);
    });

    it('should return empty for invalid paths', () => {
      expect(getUpgradePath('v2', 'v1')).toEqual([]);
      expect(getUpgradePath('v1', 'v1')).toEqual([]);
    });
  });
});

// ============================================================================
// Version Router Tests
// ============================================================================

describe('Version Router', () => {
  it('should route to correct version handler', async () => {
    const v1Handler = async () =>
      new Response(JSON.stringify({ version: 'v1' }));
    const v2Handler = async () =>
      new Response(JSON.stringify({ version: 'v2' }));

    const router = createVersionRouter({
      v1: v1Handler,
      v2: v2Handler,
    });

    const request = new NextRequest('http://localhost/api/v2/test');
    const response = await router(request);
    const data = await response.json();

    expect(data.version).toBe('v2');
  });

  it('should add version headers', async () => {
    const handler = async () =>
      new Response(JSON.stringify({ data: 'test' }));

    const router = createVersionRouter({
      v1: handler,
    }, {
      includeVersionHeaders: true,
    });

    const request = new NextRequest('http://localhost/api/v1/test');
    const response = await router(request);

    expect(response.headers.get('X-API-Version')).toBe('v1');
    expect(response.headers.get('X-Response-Time')).toBeDefined();
  });

  it('should handle unsupported versions', async () => {
    const router = createVersionRouter({
      v1: async () => new Response('OK'),
    });

    const request = new NextRequest('http://localhost/api/v3/test');
    const response = await router(request);

    expect(response.status).toBe(400);
  });
});
