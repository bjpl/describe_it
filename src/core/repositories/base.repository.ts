import { SupabaseClient } from '@supabase/supabase-js';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryOptions {
  includeDeleted?: boolean;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string;

  constructor(protected supabase: SupabaseClient) {}

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as T;
  }

  async findAll(options?: RepositoryOptions): Promise<T[]> {
    let query = this.supabase.from(this.tableName).select('*');

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data } = await query;
    return (data as T[]) ?? [];
  }

  async create(data: Omit<T, keyof BaseEntity>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return created as T;
  }

  async update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updated as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async count(filter?: Record<string, any>): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count } = await query;
    return count ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const { count } = await this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('id', id);

    return (count ?? 0) > 0;
  }
}
