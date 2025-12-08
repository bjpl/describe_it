/**
 * Database Test Helper Utilities
 * Provides utilities for database operations in tests
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class DatabaseHelper {
  constructor(private db: SupabaseClient) {}

  /**
   * Truncate a single table
   */
  async truncate(table: string): Promise<void> {
    const { error } = await this.db.from(table).delete().neq('id', '');

    if (error) {
      throw new Error(`Failed to truncate table ${table}: ${error.message}`);
    }
  }

  /**
   * Truncate multiple tables in dependency order
   */
  async truncateAll(tables?: string[]): Promise<void> {
    const defaultTables = [
      'export_history',
      'questions_answers',
      'descriptions',
      'user_progress',
      'learning_sessions',
      'vocabulary',
      'users',
    ];

    const tablesToTruncate = tables || defaultTables;

    for (const table of tablesToTruncate) {
      await this.truncate(table);
    }
  }

  /**
   * Count records in a table
   */
  async count(table: string, filters?: Record<string, any>): Promise<number> {
    let query = this.db.from(table).select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count records in ${table}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Check if record exists
   */
  async exists(table: string, filters: Record<string, any>): Promise<boolean> {
    let query = this.db.from(table).select('id').limit(1);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check existence in ${table}: ${error.message}`);
    }

    return data !== null && data.length > 0;
  }

  /**
   * Insert test data
   */
  async insert<T = any>(table: string, data: T | T[]): Promise<T[]> {
    const records = Array.isArray(data) ? data : [data];

    const { data: inserted, error } = await this.db
      .from(table)
      .insert(records)
      .select();

    if (error) {
      throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }

    return inserted || [];
  }

  /**
   * Update test data
   */
  async update<T = any>(
    table: string,
    filters: Record<string, any>,
    updates: Partial<T>
  ): Promise<T[]> {
    let query = this.db.from(table).update(updates);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.select();

    if (error) {
      throw new Error(`Failed to update ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete test data
   */
  async delete(table: string, filters: Record<string, any>): Promise<void> {
    let query = this.db.from(table).delete();

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to delete from ${table}: ${error.message}`);
    }
  }

  /**
   * Find records
   */
  async find<T = any>(
    table: string,
    filters?: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      ascending?: boolean;
    }
  ): Promise<T[]> {
    let query = this.db.from(table).select('*');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.ascending ?? true,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find records in ${table}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find a single record
   */
  async findOne<T = any>(table: string, filters: Record<string, any>): Promise<T | null> {
    let query = this.db.from(table).select('*').limit(1);

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find record in ${table}: ${error.message}`);
    }

    return data;
  }

  /**
   * Execute raw SQL (for advanced use cases)
   */
  async executeSQL(sql: string, params?: any[]): Promise<any> {
    const { data, error } = await this.db.rpc('execute_sql', {
      query: sql,
      params: params || [],
    });

    if (error) {
      throw new Error(`Failed to execute SQL: ${error.message}`);
    }

    return data;
  }

  /**
   * Seed database with test data
   */
  async seed(fixtures: Record<string, any[]>): Promise<void> {
    for (const [table, records] of Object.entries(fixtures)) {
      await this.insert(table, records);
    }
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient {
    return this.db;
  }
}

/**
 * Factory function for creating database helper
 */
export function createDatabaseHelper(db: SupabaseClient): DatabaseHelper {
  return new DatabaseHelper(db);
}
