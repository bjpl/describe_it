/**
 * Test Cleanup Utilities
 * Provides automatic cleanup of test data
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CleanupOptions {
  tables?: string[];
  preserveData?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Test Cleanup Manager
 * Tracks created records and cleans them up after tests
 */
export class TestCleanupManager {
  private createdIds: Map<string, Set<string>> = new Map();
  private db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  /**
   * Track a created record for cleanup
   */
  track(table: string, id: string): void {
    if (!this.createdIds.has(table)) {
      this.createdIds.set(table, new Set());
    }
    this.createdIds.get(table)!.add(id);
  }

  /**
   * Track multiple records
   */
  trackMany(table: string, ids: string[]): void {
    ids.forEach((id) => this.track(table, id));
  }

  /**
   * Get tracked IDs for a table
   */
  getTrackedIds(table: string): string[] {
    return Array.from(this.createdIds.get(table) || []);
  }

  /**
   * Execute cleanup for all tracked records
   */
  async cleanup(options: CleanupOptions = {}): Promise<void> {
    const { tables, preserveData = false, onError } = options;

    if (preserveData) {
      this.createdIds.clear();
      return;
    }

    // Delete in reverse dependency order
    const defaultTables = [
      'export_history',
      'questions_answers',
      'descriptions',
      'user_progress',
      'learning_sessions',
      'vocabulary',
      'users',
    ];

    const tablesToClean = tables || defaultTables;

    for (const table of tablesToClean) {
      const ids = this.getTrackedIds(table);
      if (ids.length > 0) {
        try {
          await this.cleanupTable(table, ids);
        } catch (error) {
          if (onError) {
            onError(error as Error);
          } else {
            console.error(`Failed to cleanup table ${table}:`, error);
          }
        }
      }
    }

    this.createdIds.clear();
  }

  /**
   * Clean up a specific table
   */
  private async cleanupTable(table: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await this.db.from(table).delete().in('id', ids);

    if (error) {
      throw new Error(`Failed to cleanup ${table}: ${error.message}`);
    }
  }

  /**
   * Reset cleanup manager
   */
  reset(): void {
    this.createdIds.clear();
  }

  /**
   * Get cleanup statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [table, ids] of this.createdIds.entries()) {
      stats[table] = ids.size;
    }
    return stats;
  }
}

/**
 * Automatic cleanup hook for vitest
 */
export function useTestCleanup(
  db: SupabaseClient,
  options: CleanupOptions = {}
): TestCleanupManager {
  const manager = new TestCleanupManager(db);

  // Cleanup after each test
  afterEach(async () => {
    await manager.cleanup(options);
  });

  return manager;
}

/**
 * Cleanup all data from specified tables
 */
export async function cleanupAllData(
  db: SupabaseClient,
  tables?: string[]
): Promise<void> {
  const defaultTables = [
    'export_history',
    'questions_answers',
    'descriptions',
    'user_progress',
    'learning_sessions',
    'vocabulary',
    'users',
  ];

  const tablesToClean = tables || defaultTables;

  for (const table of tablesToClean) {
    const { error } = await db.from(table).delete().neq('id', '');

    if (error) {
      console.error(`Failed to cleanup table ${table}:`, error);
    }
  }
}

/**
 * Factory function for creating cleanup manager
 */
export function createCleanupManager(db: SupabaseClient): TestCleanupManager {
  return new TestCleanupManager(db);
}
