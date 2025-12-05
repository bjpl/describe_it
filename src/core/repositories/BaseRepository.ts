/**
 * BaseRepository - Abstract Data Access Layer
 *
 * Provides common CRUD operations and database interaction patterns.
 * All repositories should extend this base class.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse, PaginationRequest, PaginationMeta } from '../types';

export interface QueryOptions extends PaginationRequest {
  select?: string;
  filters?: Record<string, any>;
  order_by?: string;
  order?: 'asc' | 'desc';
}

export interface RepositoryConfig {
  tableName: string;
  primaryKey?: string;
}

/**
 * Base repository providing common database operations
 */
export abstract class BaseRepository<TEntity, TInsert = Partial<TEntity>, TUpdate = Partial<TEntity>> {
  protected readonly tableName: string;
  protected readonly primaryKey: string;
  protected readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient, config: RepositoryConfig) {
    this.supabase = supabase;
    this.tableName = config.tableName;
    this.primaryKey = config.primaryKey || 'id';
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<ApiResponse<TEntity>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq(this.primaryKey, id)
        .single();

      if (error) {
        return {
          success: false,
          data: null,
          error: {
            code: error.code || 'DATABASE_ERROR',
            message: error.message,
            details: error.details ? { details: error.details } : undefined,
            status: 500,
            timestamp: new Date().toISOString(),
          },
        };
      }

      return {
        success: true,
        data: data as TEntity,
        error: null,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Find all records with optional filtering and pagination
   */
  async findAll(options: QueryOptions = {}): Promise<ApiResponse<TEntity[]>> {
    try {
      let query = this.supabase.from(this.tableName).select(options.select || '*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      const orderBy = options.order_by || options.sort_by || 'created_at';
      const order = options.order || options.sort_order || 'desc';
      query = query.order(orderBy, { ascending: order === 'asc' });

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || ((options.page || 1) - 1) * options.limit;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: (data as TEntity[]) || [],
        error: null,
        metadata: this.buildMetadata(count || 0, options),
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new record
   */
  async create(data: TInsert): Promise<ApiResponse<TEntity>> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data as any)
        .select()
        .single();

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: result as TEntity,
        error: null,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Create multiple records in batch
   */
  async createMany(items: TInsert[]): Promise<ApiResponse<TEntity[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(items as any[])
        .select();

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: (data as TEntity[]) || [],
        error: null,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: TUpdate): Promise<ApiResponse<TEntity>> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update(data as any)
        .eq(this.primaryKey, id)
        .select()
        .single();

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: result as TEntity,
        error: null,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq(this.primaryKey, id);

      if (error) {
        return {
          success: false,
          data: null,
          error: {
            code: error.code || 'DELETE_ERROR',
            message: error.message,
            status: 500,
            timestamp: new Date().toISOString(),
          },
        };
      }

      return {
        success: true,
        data: true,
        error: null,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Count records with optional filtering
   */
  async count(filters?: Record<string, any>): Promise<ApiResponse<number>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        return this.handleDatabaseError(error);
      }

      return {
        success: true,
        data: count || 0,
        error: null,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result.success && result.data !== null;
  }

  /**
   * Build pagination metadata
   */
  protected buildMetadata(totalCount: number, options: QueryOptions): { pagination?: PaginationMeta } {
    if (!options.limit) {
      return {};
    }

    const page = options.page || 1;
    const limit = options.limit;
    const offset = options.offset || (page - 1) * limit;
    const pages = Math.ceil(totalCount / limit);

    return {
      pagination: {
        total: totalCount,
        page,
        limit,
        pages,
        has_more: page < pages,
        offset,
      },
    };
  }

  /**
   * Handle database errors
   */
  protected handleDatabaseError(error: any): ApiResponse<any> {
    return {
      success: false,
      data: null,
      error: {
        code: error.code || 'DATABASE_ERROR',
        message: error.message || 'Database operation failed',
        details: error.details ? { details: error.details } : undefined,
        status: 500,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Handle generic errors
   */
  protected handleError(error: any): ApiResponse<any> {
    return {
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.stack ? { stack: error.stack } : undefined,
        status: 500,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
