import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { SymmetricEncryption, EncryptedData } from './encryption';
import { getAuditLogger } from './audit-logger';
import { Redis } from 'ioredis';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

const logger = getAuditLogger('session-manager');

export interface SessionConfig {
  secret: string;
  maxAge: number; // milliseconds
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
  rolling?: boolean; // refresh expiry on access
  encryption?: {
    enabled: boolean;
    algorithm?: 'AES-GCM' | 'AES-CBC';
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
}

export interface SessionData {
  id: string;
  userId?: string;
  data: Record<string, any>;
  created: Date;
  lastAccessed: Date;
  expires: Date;
  ip?: string;
  userAgent?: string;
  csrfToken?: string;
  fingerprint?: string;
}

export interface CookieOptions {
  maxAge: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
}

const DEFAULT_CONFIG: Required<Omit<SessionConfig, 'secret' | 'domain' | 'redis'>> = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  rolling: true,
  encryption: {
    enabled: true,
    algorithm: 'AES-GCM',
  },
};

export class SessionManager {
  private config: SessionConfig;
  private encryption?: SymmetricEncryption;
  private redis?: Redis;
  private sessions: Map<string, SessionData> = new Map();

  constructor(config: SessionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.encryption?.enabled) {
      this.encryption = new SymmetricEncryption({
        algorithm: this.config.encryption.algorithm || 'AES-GCM',
      });
    }

    if (this.config.redis) {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db || 0,
        keyPrefix: this.config.redis.keyPrefix || 'session:',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });
    }

    logger.securityEvent('SESSION_MANAGER_INIT', {
      maxAge: this.config.maxAge,
      secure: this.config.secure,
      encryption: this.config.encryption?.enabled,
      redis: !!this.config.redis,
    });
  }

  async createSession(userId?: string, initialData: Record<string, any> = {}): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expires = new Date(now.getTime() + this.config.maxAge);
    
    const session: SessionData = {
      id: sessionId,
      userId,
      data: initialData,
      created: now,
      lastAccessed: now,
      expires,
      csrfToken: this.generateCsrfToken(),
    };

    await this.storeSession(session);

    logger.auditEvent({
      action: 'SESSION_CREATE',
      userId,
      success: true,
      metadata: { sessionId },
    });

    return session;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.loadSession(sessionId);
      
      if (!session) {
        logger.auditEvent({
          action: 'SESSION_ACCESS',
          success: false,
          metadata: { sessionId, reason: 'not_found' },
        });
        return null;
      }

      // Check expiry
      if (session.expires <= new Date()) {
        await this.destroySession(sessionId);
        logger.auditEvent({
          action: 'SESSION_ACCESS',
          userId: session.userId,
          success: false,
          metadata: { sessionId, reason: 'expired' },
        });
        return null;
      }

      // Update last accessed and potentially expiry
      if (this.config.rolling) {
        session.lastAccessed = new Date();
        session.expires = new Date(Date.now() + this.config.maxAge);
        await this.storeSession(session);
      }

      logger.auditEvent({
        action: 'SESSION_ACCESS',
        userId: session.userId,
        success: true,
        metadata: { sessionId },
      });

      return session;
    } catch (error) {
      logger.auditEvent({
        action: 'SESSION_ACCESS',
        success: false,
        metadata: { sessionId, error: error.message },
      });
      return null;
    }
  }

  async updateSession(sessionId: string, data: Partial<Record<string, any>>): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      session.data = { ...session.data, ...data };
      session.lastAccessed = new Date();

      await this.storeSession(session);

      logger.auditEvent({
        action: 'SESSION_UPDATE',
        userId: session.userId,
        success: true,
        metadata: { sessionId, updatedKeys: Object.keys(data) },
      });

      return true;
    } catch (error) {
      logger.auditEvent({
        action: 'SESSION_UPDATE',
        success: false,
        metadata: { sessionId, error: error.message },
      });
      return false;
    }
  }

  async destroySession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.loadSession(sessionId);
      const userId = session?.userId;

      // Remove from storage
      if (this.redis) {
        await this.redis.del(sessionId);
      } else {
        this.sessions.delete(sessionId);
      }

      logger.auditEvent({
        action: 'SESSION_DESTROY',
        userId,
        success: true,
        metadata: { sessionId },
      });

      return true;
    } catch (error) {
      logger.auditEvent({
        action: 'SESSION_DESTROY',
        success: false,
        metadata: { sessionId, error: error.message },
      });
      return false;
    }
  }

  async destroyAllUserSessions(userId: string): Promise<number> {
    let destroyedCount = 0;

    try {
      if (this.redis) {
        // Search for user sessions in Redis
        const pattern = `${this.config.redis?.keyPrefix || 'session:'}*`;
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          const sessionData = await this.redis.get(key);
          if (sessionData) {
            const session = this.deserializeSession(sessionData);
            if (session.userId === userId) {
              await this.redis.del(key);
              destroyedCount++;
            }
          }
        }
      } else {
        // Search in memory store
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.userId === userId) {
            this.sessions.delete(sessionId);
            destroyedCount++;
          }
        }
      }

      logger.auditEvent({
        action: 'SESSION_DESTROY_ALL',
        userId,
        success: true,
        metadata: { destroyedCount },
      });
    } catch (error) {
      logger.auditEvent({
        action: 'SESSION_DESTROY_ALL',
        userId,
        success: false,
        metadata: { error: error.message },
      });
    }

    return destroyedCount;
  }

  async cleanExpiredSessions(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    try {
      if (this.redis) {
        // Redis handles TTL automatically, but we can check manually
        const pattern = `${this.config.redis?.keyPrefix || 'session:'}*`;
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          const sessionData = await this.redis.get(key);
          if (sessionData) {
            const session = this.deserializeSession(sessionData);
            if (session.expires <= now) {
              await this.redis.del(key);
              cleanedCount++;
            }
          }
        }
      } else {
        // Clean memory store
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.expires <= now) {
            this.sessions.delete(sessionId);
            cleanedCount++;
          }
        }
      }

      logger.info('Expired sessions cleaned', { cleanedCount });
    } catch (error) {
      logger.error('Failed to clean expired sessions', { error: error.message });
    }

    return cleanedCount;
  }

  generateSessionToken(sessionId: string): string {
    const payload = {
      sessionId,
      timestamp: Date.now(),
      signature: this.signSessionId(sessionId),
    };

    const token = Buffer.from(safeStringify(payload)).toString('base64');
    
    if (this.encryption) {
      const encrypted = this.encryption.encrypt(token, this.config.secret);
      return typeof encrypted === 'string' ? encrypted : safeStringify(encrypted);
    }

    return token;
  }

  parseSessionToken(token: string): string | null {
    try {
      let decodedToken = token;

      if (this.encryption) {
        if (token.startsWith('{')) {
          // Encrypted data object
          const encrypted = JSON.parse(token) as EncryptedData;
          decodedToken = this.encryption.decrypt(encrypted, this.config.secret);
        } else {
          // Plain encrypted string
          decodedToken = this.encryption.decrypt(token as any, this.config.secret);
        }
      }

      const payload = JSON.parse(Buffer.from(decodedToken, 'base64').toString());
      
      // Verify signature
      const expectedSignature = this.signSessionId(payload.sessionId);
      if (!timingSafeEqual(
        Buffer.from(payload.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        logger.auditEvent({
          action: 'TOKEN_VERIFY',
          success: false,
          metadata: { reason: 'invalid_signature' },
        });
        return null;
      }

      return payload.sessionId;
    } catch (error) {
      logger.auditEvent({
        action: 'TOKEN_PARSE',
        success: false,
        metadata: { error: error.message },
      });
      return null;
    }
  }

  getCookieOptions(): CookieOptions {
    return {
      maxAge: this.config.maxAge,
      secure: this.config.secure,
      httpOnly: this.config.httpOnly,
      sameSite: this.config.sameSite,
      domain: this.config.domain,
      path: this.config.path,
    };
  }

  generateCsrfToken(): string {
    return randomBytes(32).toString('hex');
  }

  validateCsrfToken(session: SessionData, providedToken: string): boolean {
    if (!session.csrfToken || !providedToken) {
      return false;
    }

    try {
      return timingSafeEqual(
        Buffer.from(session.csrfToken, 'hex'),
        Buffer.from(providedToken, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  generateFingerprint(userAgent: string, ip: string, acceptLanguage?: string): string {
    const data = `${userAgent}:${ip}:${acceptLanguage || ''}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  private signSessionId(sessionId: string): string {
    return createHash('sha256')
      .update(sessionId + this.config.secret)
      .digest('hex');
  }

  private async storeSession(session: SessionData): Promise<void> {
    const serialized = this.serializeSession(session);
    
    if (this.redis) {
      const ttl = Math.ceil((session.expires.getTime() - Date.now()) / 1000);
      await this.redis.setex(session.id, ttl, serialized);
    } else {
      this.sessions.set(session.id, session);
    }
  }

  private async loadSession(sessionId: string): Promise<SessionData | null> {
    if (this.redis) {
      const serialized = await this.redis.get(sessionId);
      return serialized ? this.deserializeSession(serialized) : null;
    } else {
      return this.sessions.get(sessionId) || null;
    }
  }

  private serializeSession(session: SessionData): string {
    return safeStringify(session, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
  }

  private deserializeSession(serialized: string): SessionData {
    return safeParse(serialized, (key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  }> {
    let totalSessions = 0;
    let activeSessions = 0;
    let expiredSessions = 0;
    const now = new Date();

    try {
      if (this.redis) {
        const pattern = `${this.config.redis?.keyPrefix || 'session:'}*`;
        const keys = await this.redis.keys(pattern);
        totalSessions = keys.length;

        for (const key of keys) {
          const sessionData = await this.redis.get(key);
          if (sessionData) {
            const session = this.deserializeSession(sessionData);
            if (session.expires > now) {
              activeSessions++;
            } else {
              expiredSessions++;
            }
          }
        }
      } else {
        totalSessions = this.sessions.size;
        for (const session of this.sessions.values()) {
          if (session.expires > now) {
            activeSessions++;
          } else {
            expiredSessions++;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get session stats', { error: error.message });
    }

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
    };
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
    this.sessions.clear();
    logger.info('Session manager closed');
  }
}

export function createSessionManager(config: SessionConfig): SessionManager {
  return new SessionManager(config);
}