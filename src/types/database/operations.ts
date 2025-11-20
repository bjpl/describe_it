/**
 * Database operation types
 */

import type { JsonValue, UnknownObject } from '../core/json-types';

/**
 * Database error types
 */
export interface DatabaseError {
  code: string;
  message: string;
  details?: UnknownObject;
  sql_state?: string;
  constraint?: string;
  table?: string;
  column?: string;
  severity?: 'ERROR' | 'WARNING' | 'INFO';
  hint?: string;
}

/**
 * Database operation results
 */
export interface QueryResult<T = UnknownObject> {
  data: T[] | T | null;
  error: DatabaseError | null;
  count?: number;
  status: 'success' | 'error';
}

export interface TransactionResult<T = UnknownObject> extends QueryResult<T> {
  transaction_id: string;
  operations_count: number;
  rollback_applied?: boolean;
}

/**
 * Database pagination
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_more: boolean;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
  error?: string | null;
}

/**
 * Database filter types
 */
export interface DatabaseFilters {
  [key: string]: FilterValue;
}

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | DateRange
  | FilterOperator;

export interface DateRange {
  start: string;
  end: string;
}

export interface FilterOperator {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: JsonValue;
}
