/**
 * Session-Scoped Cache Strategy
 * Manages cache data scoped to user sessions with automatic cleanup
 */

import { logger } from "@/lib/logger";
import type { CacheOptions } from "./memory-cache";

interface SessionEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  sessionId: string;
  lastAccessed: number;
}

interface SessionMetadata {
  sessionId: string;
  userId?: string;
  createdAt: number;
  lastActivity: number;
  itemCount: number;
  expiresAt: number;
}

export interface SessionCacheConfig {
  defaultSessionTTL: number; // Session TTL in seconds
  defaultItemTTL: number; // Item TTL in seconds
  maxSessionSize: number; // Max items per session
  maxTotalSize: number; // Max total items across all sessions
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

/**
 * Session-scoped cache for user-specific data
 */
export class SessionCacheStrategy<T = any> {
  private cache = new Map<string, SessionEntry<T>>();
  private sessions = new Map<string, SessionMetadata>();
  private config: Required<SessionCacheConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionCacheConfig> = {}) {
    this.config = {
      defaultSessionTTL: config.defaultSessionTTL ?? 3600, // 1 hour
      defaultItemTTL: config.defaultItemTTL ?? 1800, // 30 minutes
      maxSessionSize: config.maxSessionSize ?? 100,
      maxTotalSize: config.maxTotalSize ?? 10000,
      cleanupInterval: config.cleanupInterval ?? 5 * 60 * 1000, // 5 minutes
    };

    this.startCleanupTimer();
  }

  /**
   * Create or update session
   */
  createSession(sessionId: string, userId?: string, ttl?: number): void {
    const now = Date.now();
    const sessionTTL = ttl ?? this.config.defaultSessionTTL;

    this.sessions.set(sessionId, {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      itemCount: 0,
      expiresAt: now + sessionTTL * 1000,
    });

    logger.debug(`Session created: ${sessionId}`);
  }

  /**
   * Get value from session cache
   */
  async get<V = T>(sessionId: string, key: string): Promise<V | null> {
    const fullKey = this.makeKey(sessionId, key);
    const entry = this.cache.get(fullKey);

    if (!entry || entry.sessionId !== sessionId) {
      return null;
    }

    const now = Date.now();

    // Check item expiration
    if (now - entry.timestamp > entry.ttl * 1000) {
      await this.delete(sessionId, key);
      return null;
    }

    // Check session expiration
    const session = this.sessions.get(sessionId);
    if (!session || now > session.expiresAt) {
      await this.clearSession(sessionId);
      return null;
    }

    // Update access time
    entry.lastAccessed = now;
    session.lastActivity = now;

    return entry.data as unknown as V;
  }

  /**
   * Set value in session cache
   */
  async set<V = T>(
    sessionId: string,
    key: string,
    value: V,
    options: CacheOptions = {}
  ): Promise<void> {
    // Ensure session exists
    if (!this.sessions.has(sessionId)) {
      this.createSession(sessionId);
    }

    const session = this.sessions.get(sessionId)!;
    const fullKey = this.makeKey(sessionId, key);
    const now = Date.now();
    const ttl = options.ttl ?? this.config.defaultItemTTL;

    // Check session size limit
    if (!this.cache.has(fullKey) && session.itemCount >= this.config.maxSessionSize) {
      // Evict oldest item in session
      await this.evictOldestInSession(sessionId);
    }

    // Check total cache size
    if (!this.cache.has(fullKey) && this.cache.size >= this.config.maxTotalSize) {
      await this.evictOldestGlobal();
    }

    const isNew = !this.cache.has(fullKey);

    const entry: SessionEntry<V> = {
      data: value,
      timestamp: now,
      ttl,
      sessionId,
      lastAccessed: now,
    };

    this.cache.set(fullKey, entry as any);

    if (isNew) {
      session.itemCount++;
    }

    session.lastActivity = now;
  }

  /**
   * Delete value from session cache
   */
  async delete(sessionId: string, key: string): Promise<boolean> {
    const fullKey = this.makeKey(sessionId, key);
    const existed = this.cache.delete(fullKey);

    if (existed) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.itemCount = Math.max(0, session.itemCount - 1);
      }
    }

    return existed;
  }

  /**
   * Check if key exists in session
   */
  async has(sessionId: string, key: string): Promise<boolean> {
    const fullKey = this.makeKey(sessionId, key);
    const entry = this.cache.get(fullKey);

    if (!entry || entry.sessionId !== sessionId) {
      return false;
    }

    const now = Date.now();

    // Check expiration
    if (now - entry.timestamp > entry.ttl * 1000) {
      await this.delete(sessionId, key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys for a session
   */
  async getSessionKeys(sessionId: string): Promise<string[]> {
    const prefix = `${sessionId}:`;
    const keys: string[] = [];

    for (const fullKey of this.cache.keys()) {
      if (fullKey.startsWith(prefix)) {
        const key = fullKey.substring(prefix.length);
        if (await this.has(sessionId, key)) {
          keys.push(key);
        }
      }
    }

    return keys;
  }

  /**
   * Get all data for a session
   */
  async getSessionData(sessionId: string): Promise<Record<string, any>> {
    const keys = await this.getSessionKeys(sessionId);
    const data: Record<string, any> = {};

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(sessionId, key);
        if (value !== null) {
          data[key] = value;
        }
      })
    );

    return data;
  }

  /**
   * Clear all data for a session
   */
  async clearSession(sessionId: string): Promise<number> {
    const keys = await this.getSessionKeys(sessionId);
    await Promise.all(keys.map((key) => this.delete(sessionId, key)));

    this.sessions.delete(sessionId);

    logger.debug(`Session cleared: ${sessionId} (${keys.length} items)`);

    return keys.length;
  }

  /**
   * Destroy a session (alias for clearSession)
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.clearSession(sessionId);
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string): SessionMetadata | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionMetadata[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      (session) => now <= session.expiresAt
    );
  }

  /**
   * Extend session expiration
   */
  extendSession(sessionId: string, additionalSeconds: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.expiresAt += additionalSeconds * 1000;
    session.lastActivity = Date.now();

    return true;
  }

  /**
   * Renew session (reset expiration to default)
   */
  renewSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = Date.now();
    session.expiresAt = now + this.config.defaultSessionTTL * 1000;
    session.lastActivity = now;

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const activeSessions = this.getActiveSessions();

    return {
      totalItems: this.cache.size,
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      avgItemsPerSession:
        activeSessions.length > 0
          ? activeSessions.reduce((sum, s) => sum + s.itemCount, 0) / activeSessions.length
          : 0,
      maxSessionSize: this.config.maxSessionSize,
      maxTotalSize: this.config.maxTotalSize,
      utilizationRate: this.cache.size / this.config.maxTotalSize,
    };
  }

  /**
   * Cleanup expired sessions and items
   */
  async cleanup(): Promise<{ sessions: number; items: number }> {
    const now = Date.now();
    let expiredSessions = 0;
    let expiredItems = 0;

    // Clean expired sessions
    const sessionsToDelete: string[] = [];
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        sessionsToDelete.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDelete) {
      expiredItems += await this.clearSession(sessionId);
      expiredSessions++;
    }

    // Clean expired items in active sessions
    const itemsToDelete: string[] = [];
    for (const [fullKey, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        itemsToDelete.push(fullKey);
      }
    }

    for (const fullKey of itemsToDelete) {
      const [sessionId, key] = this.parseKey(fullKey);
      await this.delete(sessionId, key);
      expiredItems++;
    }

    if (expiredSessions > 0 || expiredItems > 0) {
      logger.info(
        `Session cache cleanup: ${expiredSessions} sessions, ${expiredItems} items`
      );
    }

    return { sessions: expiredSessions, items: expiredItems };
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Private methods

  private makeKey(sessionId: string, key: string): string {
    return `${sessionId}:${key}`;
  }

  private parseKey(fullKey: string): [string, string] {
    const colonIndex = fullKey.indexOf(":");
    if (colonIndex === -1) {
      return ["", fullKey];
    }
    return [fullKey.substring(0, colonIndex), fullKey.substring(colonIndex + 1)];
  }

  private async evictOldestInSession(sessionId: string): Promise<void> {
    const prefix = `${sessionId}:`;
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [fullKey, entry] of this.cache) {
      if (fullKey.startsWith(prefix) && entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = fullKey;
      }
    }

    if (oldestKey) {
      const [sid, key] = this.parseKey(oldestKey);
      await this.delete(sid, key);
    }
  }

  private async evictOldestGlobal(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [fullKey, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = fullKey;
      }
    }

    if (oldestKey) {
      const [sessionId, key] = this.parseKey(oldestKey);
      await this.delete(sessionId, key);
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((err) => {
        logger.error("Session cache cleanup error:", err);
      });
    }, this.config.cleanupInterval);
  }
}

// Singleton instance
export const sessionCache = new SessionCacheStrategy({
  defaultSessionTTL: parseInt(process.env.SESSION_CACHE_TTL || "3600"),
  defaultItemTTL: parseInt(process.env.SESSION_ITEM_TTL || "1800"),
  maxSessionSize: parseInt(process.env.MAX_SESSION_CACHE_SIZE || "100"),
  maxTotalSize: parseInt(process.env.MAX_TOTAL_SESSION_CACHE || "10000"),
});

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    sessionCache.stop();
  });
}
