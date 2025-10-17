/**
 * Cache Integration Examples
 * Shows how to integrate caching with existing API routes
 */

import { CacheManager, CacheTTL, CacheInvalidation } from './cache';
import { NextRequest, NextResponse } from 'next/server';

// Example 1: Cache user progress
export const userProgressCache = new CacheManager('user-progress');

export async function getCachedUserProgress(userId: string) {
  return userProgressCache.getOrSet(
    async () => {
      // Fetch from database
      const { DatabaseService } = await import('./supabase');
      return DatabaseService.getUserProgress(userId);
    },
    CacheTTL.USER_PROGRESS,
    userId
  );
}

export async function invalidateUserProgress(userId: string) {
  await CacheInvalidation.invalidateUserProgress(userId);
}

// Example 2: Cache vocabulary lists
export const vocabularyListCache = new CacheManager('vocabulary-lists');

export async function getCachedVocabularyList(userId: string, listId: string) {
  return vocabularyListCache.getOrSet(
    async () => {
      const { DatabaseService } = await import('./supabase');
      return DatabaseService.getVocabularyItems(listId);
    },
    CacheTTL.VOCABULARY_LIST,
    userId,
    listId
  );
}

export async function invalidateVocabularyList(userId: string, listId: string) {
  await CacheInvalidation.invalidateVocabularyList(userId, listId);
}

// Example 3: Cache descriptions with smart invalidation
export const descriptionCacheManager = new CacheManager('descriptions');

export async function getCachedDescription(imageUrl: string, style: string, language: string) {
  const cacheKey = `${imageUrl}:${style}:${language}`;

  return descriptionCacheManager.getOrSet(
    async () => {
      // This would be populated when descriptions are generated
      return null;
    },
    CacheTTL.DESCRIPTION,
    cacheKey
  );
}

export async function cacheDescription(
  imageUrl: string,
  style: string,
  language: string,
  description: string
) {
  const cacheKey = `${imageUrl}:${style}:${language}`;
  await descriptionCacheManager.set(description, CacheTTL.DESCRIPTION, cacheKey);
}

// Example 4: Session data caching
export const sessionDataCache = new CacheManager('session');

export async function getCachedSessionData(sessionId: string) {
  return sessionDataCache.getOrSet(
    async () => {
      const { DatabaseService } = await import('./supabase');
      return DatabaseService.getSession(sessionId);
    },
    CacheTTL.SESSION,
    sessionId
  );
}

// Example 5: Batch cache invalidation
export async function invalidateAllUserCaches(userId: string) {
  await Promise.all([
    CacheInvalidation.invalidateUserProgress(userId),
    CacheInvalidation.invalidateUserVocabulary(userId),
    CacheInvalidation.invalidateSession(userId),
  ]);
}

// Example 6: Smart cache warming on login
export async function warmUserCaches(userId: string) {
  // Pre-load commonly accessed data
  await Promise.all([
    getCachedUserProgress(userId),
    // Could add more cache warming here
  ]);
}

// Example 7: Cache middleware for API routes
export function withCaching<T>(
  cacheKey: string | ((...args: unknown[]) => string),
  ttl: number,
  handler: (...args: unknown[]) => Promise<T>
) {
  return async (...args: unknown[]): Promise<T> => {
    const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey;
    const cache = new CacheManager('api');

    // Try cache first
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute handler
    const result = await handler(...args);

    // Cache result
    await cache.set(result, ttl, key);

    return result;
  };
}
