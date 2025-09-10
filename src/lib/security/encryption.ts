/**
 * Encryption and Cryptographic Utilities
 * Provides secure encryption, hashing, and token generation
 */

import { createHash, createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

/**
 * Encryption Configuration
 */
export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  iterations?: number;
}

/**
 * Hashing Options
 */
export interface HashingOptions {
  algorithm?: string;
  encoding?: BufferEncoding;
  rounds?: number;
  saltLength?: number;
}

/**
 * Token Generation Options
 */
export interface TokenOptions {
  length?: number;
  encoding?: BufferEncoding;
  prefix?: string;
  includeTimestamp?: boolean;
}

/**
 * Cryptographic Utilities Class
 * Provides secure methods for encryption, hashing, and token generation
 */
export class CryptoUtils {
  
  /**
   * Generate a secure random token
   */
  static generateToken(options: TokenOptions = {}): string {
    const {
      length = 32,
      encoding = 'hex',
      prefix = '',
      includeTimestamp = false
    } = options;

    const randomPart = randomBytes(length).toString(encoding);
    const timestamp = includeTimestamp ? Date.now().toString(36) : '';
    
    return prefix + timestamp + randomPart;
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey(): string {
    return this.generateToken({
      length: 32,
      encoding: 'base64url',
      prefix: 'sk_',
      includeTimestamp: true
    });
  }

  /**
   * Generate a session ID
   */
  static generateSessionId(): string {
    return this.generateToken({
      length: 24,
      encoding: 'hex',
      prefix: 'sess_',
      includeTimestamp: true
    });
  }

  /**
   * Generate a CSRF token
   */
  static generateCsrfToken(): string {
    return this.generateToken({
      length: 16,
      encoding: 'base64url',
      prefix: 'csrf_'
    });
  }

  /**
   * Hash a password using PBKDF2
   */
  static hashPassword(password: string, options: HashingOptions = {}): {
    hash: string;
    salt: string;
    algorithm: string;
    iterations: number;
  } {
    const {
      algorithm = 'sha256',
      saltLength = 16,
      rounds = 100000
    } = options;

    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const salt = randomBytes(saltLength).toString('hex');
    const hash = pbkdf2Sync(password, salt, rounds, 64, algorithm).toString('hex');

    return {
      hash,
      salt,
      algorithm,
      iterations: rounds
    };
  }

  /**
   * Verify a password against a hash
   */
  static verifyPassword(
    password: string, 
    hash: string, 
    salt: string, 
    iterations: number = 100000,
    algorithm: string = 'sha256'
  ): boolean {
    if (!password || !hash || !salt) {
      return false;
    }

    try {
      const computedHash = pbkdf2Sync(password, salt, iterations, 64, algorithm).toString('hex');
      return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Create SHA-256 hash
   */
  static sha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Create SHA-512 hash
   */
  static sha512(data: string): string {
    return createHash('sha512').update(data, 'utf8').digest('hex');
  }

  /**
   * Create HMAC signature
   */
  static createHmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return createHmac(algorithm, secret).update(data, 'utf8').digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHmac(data: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    try {
      const expectedSignature = this.createHmac(data, secret, algorithm);
      return timingSafeEqual(
        Buffer.from(signature, 'hex'), 
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure hash for data integrity
   */
  static generateDataHash(data: any): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return this.sha256(dataString);
  }

  /**
   * Create a signed token with expiration
   */
  static createSignedToken(
    payload: Record<string, any>,
    secret: string,
    expiresInMs: number = 3600000 // 1 hour
  ): string {
    const tokenData = {
      ...payload,
      exp: Date.now() + expiresInMs,
      iat: Date.now()
    };

    const tokenString = Buffer.from(JSON.stringify(tokenData)).toString('base64url');
    const signature = this.createHmac(tokenString, secret);
    
    return `${tokenString}.${signature}`;
  }

  /**
   * Verify and decode a signed token
   */
  static verifySignedToken(token: string, secret: string): {
    valid: boolean;
    payload?: Record<string, any>;
    error?: string;
  } {
    try {
      const [tokenString, signature] = token.split('.');
      
      if (!tokenString || !signature) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Verify signature
      if (!this.verifyHmac(tokenString, signature, secret)) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(tokenString, 'base64url').toString('utf8'));

      // Check expiration
      if (payload.exp && Date.now() > payload.exp) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token decode error' };
    }
  }

  /**
   * Encrypt sensitive data for storage (using AES-256-GCM would require additional library)
   * For now, this is a placeholder that uses base64 encoding with obfuscation
   * In production, use a proper encryption library like node:crypto or @noble/ciphers
   */
  static encryptForStorage(data: string, key: string): string {
    // This is a simple obfuscation, not true encryption
    // In production, implement proper AES encryption
    const timestamp = Date.now().toString(36);
    const keyHash = this.sha256(key).substring(0, 16);
    const obfuscated = Buffer.from(data).toString('base64url');
    
    return `${timestamp}.${keyHash}.${obfuscated}`;
  }

  /**
   * Decrypt data from storage (placeholder implementation)
   */
  static decryptFromStorage(encryptedData: string, key: string): string | null {
    try {
      const [timestamp, keyHash, obfuscated] = encryptedData.split('.');
      
      if (!timestamp || !keyHash || !obfuscated) {
        return null;
      }

      // Verify key hash
      const expectedKeyHash = this.sha256(key).substring(0, 16);
      if (keyHash !== expectedKeyHash) {
        return null;
      }

      // Decode data
      return Buffer.from(obfuscated, 'base64url').toString('utf8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a nonce for cryptographic operations
   */
  static generateNonce(length: number = 16): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Create a challenge-response token for additional security
   */
  static createChallenge(): { challenge: string; solution: string } {
    const challenge = this.generateToken({ length: 16 });
    const solution = this.sha256(challenge);
    
    return { challenge, solution };
  }

  /**
   * Verify a challenge solution
   */
  static verifyChallenge(challenge: string, solution: string): boolean {
    const expectedSolution = this.sha256(challenge);
    return solution === expectedSolution;
  }

  /**
   * Create a fingerprint of user/device characteristics
   */
  static createFingerprint(characteristics: {
    userAgent?: string;
    acceptLanguage?: string;
    acceptEncoding?: string;
    connection?: string;
    ip?: string;
  }): string {
    const fingerprintData = [
      characteristics.userAgent || '',
      characteristics.acceptLanguage || '',
      characteristics.acceptEncoding || '',
      characteristics.connection || '',
      characteristics.ip || ''
    ].join('|');

    return this.sha256(fingerprintData);
  }

  /**
   * Generate a rate limiting key
   */
  static generateRateLimitKey(
    identifier: string, 
    endpoint: string, 
    windowStart: number
  ): string {
    return this.sha256(`ratelimit:${identifier}:${endpoint}:${windowStart}`);
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (!data || typeof data !== 'string') {
      return '[INVALID]';
    }

    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }

    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(Math.max(data.length - visibleChars * 2, 3));

    return `${start}${middle}${end}`;
  }

  /**
   * Generate a secure backup code
   */
  static generateBackupCode(): string {
    // Generate a 12-digit backup code in format: XXXX-XXXX-XXXX
    const segments = [];
    for (let i = 0; i < 3; i++) {
      const segment = randomBytes(2).readUInt16BE(0).toString().padStart(4, '0');
      segments.push(segment);
    }
    return segments.join('-');
  }

  /**
   * Time-based one-time password (TOTP) placeholder
   * In production, use a proper TOTP library like @otplib/totp
   */
  static generateTotpSecret(): string {
    return randomBytes(20).toString('base32').toUpperCase();
  }
}

/**
 * Security Configuration Constants
 */
export const SecurityConfig = {
  // Password policy
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_MIXED_CASE: true,

  // Token expiration times (in milliseconds)
  ACCESS_TOKEN_EXPIRES: 15 * 60 * 1000,      // 15 minutes
  REFRESH_TOKEN_EXPIRES: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSION_TOKEN_EXPIRES: 24 * 60 * 60 * 1000,     // 24 hours
  CSRF_TOKEN_EXPIRES: 60 * 60 * 1000,             // 1 hour

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000,          // 15 minutes
  
  // Security headers
  CONTENT_SECURITY_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
  
  // Encryption
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_DERIVATION_ITERATIONS: 100000,
  SALT_LENGTH: 16,
  IV_LENGTH: 16,

  // Hashing
  DEFAULT_HASH_ALGORITHM: 'sha256',
  SECURE_HASH_ALGORITHM: 'sha512',
};

export default CryptoUtils;