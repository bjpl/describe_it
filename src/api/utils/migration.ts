/**
 * API Version Migration Utilities
 * Handles data transformation between API versions
 */

import { ApiVersion, MigrationContext } from '../types/version';
import { apiLogger } from '@/lib/logger';

/**
 * Migration transformer function
 */
export type MigrationTransformer<TInput = any, TOutput = any> = (
  data: TInput,
  context: MigrationContext
) => TOutput | Promise<TOutput>;

/**
 * Migration registry
 */
interface MigrationRegistry {
  [key: string]: MigrationTransformer;
}

const migrations: MigrationRegistry = {};

/**
 * Register a migration transformer
 */
export function registerMigration(
  from: ApiVersion,
  to: ApiVersion,
  transformer: MigrationTransformer
): void {
  const key = `${from}->${to}`;
  migrations[key] = transformer;
  apiLogger.info('Migration registered', { from, to });
}

/**
 * Get migration transformer
 */
export function getMigration(
  from: ApiVersion,
  to: ApiVersion
): MigrationTransformer | null {
  const key = `${from}->${to}`;
  return migrations[key] || null;
}

/**
 * Migrate data between versions
 */
export async function migrateData<TInput = any, TOutput = any>(
  data: TInput,
  fromVersion: ApiVersion,
  toVersion: ApiVersion
): Promise<TOutput> {
  if (fromVersion === toVersion) {
    return data as unknown as TOutput;
  }

  const direction = fromVersion < toVersion ? 'upgrade' : 'downgrade';
  const context: MigrationContext = {
    fromVersion,
    toVersion,
    data,
    direction,
  };

  const transformer = getMigration(fromVersion, toVersion);

  if (!transformer) {
    apiLogger.warn('No migration transformer found', {
      fromVersion,
      toVersion,
    });
    return data as unknown as TOutput;
  }

  try {
    apiLogger.info('Migrating data', { fromVersion, toVersion, direction });
    const result = await transformer(data, context);
    return result;
  } catch (error) {
    apiLogger.error('Migration failed', {
      fromVersion,
      toVersion,
      error,
    });
    throw new Error(`Failed to migrate from ${fromVersion} to ${toVersion}`);
  }
}

/**
 * Batch migrate multiple items
 */
export async function batchMigrateData<TInput = any, TOutput = any>(
  items: TInput[],
  fromVersion: ApiVersion,
  toVersion: ApiVersion
): Promise<TOutput[]> {
  return Promise.all(
    items.map((item) => migrateData<TInput, TOutput>(item, fromVersion, toVersion))
  );
}

// ============================================================================
// Built-in Migration Transformers
// ============================================================================

/**
 * V1 to V2 Migration: Vocabulary List
 */
export interface V1VocabularyList {
  id: string;
  name: string;
  description?: string;
  language: string;
  difficulty_level: number;
  created_at: string;
  updated_at: string;
}

export interface V2VocabularyList {
  id: string;
  name: string;
  description: string | null;
  metadata: {
    language: string;
    difficultyLevel: number;
    tags?: string[];
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  _links: {
    self: string;
    items: string;
  };
}

registerMigration('v1', 'v2', (data: V1VocabularyList): V2VocabularyList => {
  return {
    id: data.id,
    name: data.name,
    description: data.description || null,
    metadata: {
      language: data.language,
      difficultyLevel: data.difficulty_level,
      tags: [],
    },
    timestamps: {
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    _links: {
      self: `/api/v2/vocabulary/lists/${data.id}`,
      items: `/api/v2/vocabulary/lists/${data.id}/items`,
    },
  };
});

/**
 * V2 to V1 Migration: Vocabulary List (backward compatibility)
 */
registerMigration('v2', 'v1', (data: V2VocabularyList): V1VocabularyList => {
  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    language: data.metadata.language,
    difficulty_level: data.metadata.difficultyLevel,
    created_at: data.timestamps.createdAt,
    updated_at: data.timestamps.updatedAt,
  };
});

/**
 * V1 to V2 Migration: Pagination Response
 */
export interface V1PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface V2PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    offset?: number;
    limit: number;
    cursor?: string;
    hasMore: boolean;
    _links: {
      self: string;
      first: string;
      prev?: string;
      next?: string;
      last: string;
    };
  };
}

/**
 * Helper: Create migration chain
 * Allows migrating through multiple versions
 */
export async function migrateChain<T = any>(
  data: T,
  versions: ApiVersion[]
): Promise<any> {
  let result = data;

  for (let i = 0; i < versions.length - 1; i++) {
    result = await migrateData(result, versions[i], versions[i + 1]);
  }

  return result;
}

/**
 * Helper: Auto-detect and migrate
 */
export function createAutoMigrator(targetVersion: ApiVersion) {
  return async <T = any>(
    data: T,
    sourceVersion: ApiVersion
  ): Promise<any> => {
    return migrateData(data, sourceVersion, targetVersion);
  };
}
