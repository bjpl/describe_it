/**
 * Cache and storage types
 */

import type { JsonValue } from '../core/json-types';

/**
 * Cache entry types
 */
export interface CacheEntry<T = JsonValue> {
  key: string;
  value: T;
  ttl: number;
  created_at: string;
  accessed_at: string;
  access_count: number;
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  size_bytes?: number;
  compression?: string;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
  invalidation_rules: string[];
}
