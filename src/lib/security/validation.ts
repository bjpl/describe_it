/**
 * Input Validation Security Utilities
 * Provides comprehensive validation to prevent injection attacks and data corruption
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Basic validation schemas
export const emailSchema = z.string().email('Invalid email format').min(5).max(254);

export const urlSchema = z.string().url('Invalid URL format').max(2048);

export const userIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'User ID contains invalid characters');

export const apiKeySchema = z.string().min(10).max(200).regex(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters');

export const sqlInjectionPatterns = [
  /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute|truncate|grant|revoke)\s/i,
  /('|(\\')|(;)|(\*)|(%)|(--)|(\/\*)/,
  /\b(or|and)\s+[\d\w]+\s*=\s*[\d\w]+/i,
  /\b(script|javascript|vbscript|onload|onerror|onclick)/i
];

export const xssPatterns = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /<meta[^>]*>/gi
];

export const pathTraversalPatterns = [
  /\.\./,
  /[\/\\]\.\./,
  /\0/,
  /\x00/,
  /%2e%2e/i,
  /%2f/i,
  /%5c/i
];

/**
 * Input Validation Class
 * Provides methods to validate and sanitize various types of input
 */
export class InputValidator {
  /**
   * Check for SQL injection attempts
   */
  static isSqlInjection(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    
    return sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS attempts
   */
  static isXssAttempt(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for path traversal attempts
   */
  static isPathTraversal(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    
    return pathTraversalPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Comprehensive security validation
   */
  static isSecurityThreat(input: string): {
    isThreat: boolean;
    threatTypes: string[];
    input: string;
  } {
    if (!input || typeof input !== 'string') {
      return { isThreat: false, threatTypes: [], input };
    }

    const threatTypes: string[] = [];

    if (this.isSqlInjection(input)) {
      threatTypes.push('sql_injection');
    }

    if (this.isXssAttempt(input)) {
      threatTypes.push('xss');
    }

    if (this.isPathTraversal(input)) {
      threatTypes.push('path_traversal');
    }

    return {
      isThreat: threatTypes.length > 0,
      threatTypes,
      input
    };
  }

  /**
   * Validate and sanitize API endpoint parameters
   */
  static validateApiInput(input: any, schema: z.ZodSchema): {
    isValid: boolean;
    data?: any;
    errors?: string[];
    securityThreats?: string[];
  } {
    try {
      // First check for security threats if input is string
      if (typeof input === 'string') {
        const securityCheck = this.isSecurityThreat(input);
        if (securityCheck.isThreat) {
          return {
            isValid: false,
            errors: [`Security threat detected: ${securityCheck.threatTypes.join(', ')}`],
            securityThreats: securityCheck.threatTypes
          };
        }
      }

      // Validate with schema
      const result = schema.safeParse(input);
      
      if (!result.success) {
        return {
          isValid: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }

      return {
        isValid: true,
        data: result.data
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate file upload parameters
   */
  static validateFileUpload(filename: string, mimeType: string, size: number): {
    isValid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Check filename for security threats
    const filenameCheck = this.isSecurityThreat(filename);
    if (filenameCheck.isThreat) {
      errors.push(`Filename contains security threats: ${filenameCheck.threatTypes.join(', ')}`);
    }

    // Validate file extension
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|txt|json|csv)$/i;
    if (!allowedExtensions.test(filename)) {
      errors.push('File type not allowed');
    }

    // Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/json', 'text/csv'
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      errors.push('MIME type not allowed');
    }

    // Validate file size (10MB max)
    if (size > 10 * 1024 * 1024) {
      errors.push('File size too large (max 10MB)');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate search parameters
   */
  static validateSearchParams(params: Record<string, any>): {
    isValid: boolean;
    sanitizedParams?: Record<string, any>;
    errors?: string[];
  } {
    const errors: string[] = [];
    const sanitizedParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Validate key
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        errors.push(`Invalid parameter name: ${key}`);
        continue;
      }

      // Check value for security threats
      if (typeof value === 'string') {
        const securityCheck = this.isSecurityThreat(value);
        if (securityCheck.isThreat) {
          errors.push(`Security threat in ${key}: ${securityCheck.threatTypes.join(', ')}`);
          continue;
        }

        // Sanitize string value
        sanitizedParams[key] = DOMPurify.sanitize(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedParams[key] = value;
      } else if (Array.isArray(value)) {
        // Validate and sanitize array elements
        const sanitizedArray = value
          .filter(item => typeof item === 'string' && !this.isSecurityThreat(item).isThreat)
          .map(item => DOMPurify.sanitize(item));
        
        sanitizedParams[key] = sanitizedArray;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedParams: errors.length === 0 ? sanitizedParams : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate user-generated content
   */
  static validateUserContent(content: string, maxLength: number = 10000): {
    isValid: boolean;
    sanitizedContent?: string;
    errors?: string[];
  } {
    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        errors: ['Content is required and must be a string']
      };
    }

    const errors: string[] = [];

    // Check length
    if (content.length > maxLength) {
      errors.push(`Content exceeds maximum length of ${maxLength} characters`);
    }

    // Check for security threats
    const securityCheck = this.isSecurityThreat(content);
    if (securityCheck.isThreat) {
      errors.push(`Content contains security threats: ${securityCheck.threatTypes.join(', ')}`);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    // Sanitize content
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: []
    });

    return {
      isValid: true,
      sanitizedContent
    };
  }

  /**
   * Validate environment configuration values
   */
  static validateEnvConfig(config: Record<string, any>): {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for sensitive data exposure
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'api_key'];
    
    for (const [key, value] of Object.entries(config)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        if (typeof value === 'string') {
          // Check if it looks like a placeholder or default value
          const placeholderPatterns = [
            'your_', 'placeholder', 'example', 'test_', 'demo_', 'changeme',
            'password123', 'secret123', 'key123'
          ];
          
          if (placeholderPatterns.some(pattern => value.toLowerCase().includes(pattern))) {
            warnings.push(`Sensitive key "${key}" appears to have placeholder value`);
          }

          // Check for weak values
          if (value.length < 16) {
            warnings.push(`Sensitive key "${key}" has potentially weak value (too short)`);
          }
        }
      }

      // Check for hardcoded URLs in production
      if (typeof value === 'string' && value.includes('localhost')) {
        warnings.push(`Key "${key}" contains localhost reference - ensure this is intended for production`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Common validation schemas for API endpoints
 */
export const ApiValidationSchemas = {
  // User data validation
  userId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid user ID format'),
  
  // Content validation
  userContent: z.string().min(1).max(10000),
  shortText: z.string().min(1).max(500),
  longText: z.string().min(1).max(5000),
  
  // Search parameters
  searchQuery: z.string().min(1).max(200),
  sortOrder: z.enum(['asc', 'desc']),
  pageSize: z.number().int().min(1).max(100),
  pageOffset: z.number().int().min(0),
  
  // File parameters
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
  mimeType: z.string().regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9._-]+$/, 'Invalid MIME type'),
  
  // API keys and tokens
  apiKey: z.string().min(10).max(200),
  accessToken: z.string().min(20).max(500),
  
  // URLs and endpoints
  imageUrl: z.string().url().max(2048),
  callbackUrl: z.string().url().max(1000),
  
  // Language and locale
  languageCode: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code'),
  
  // Difficulty levels
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  
  // Categories
  category: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid category format'),
};

/**
 * Rate limiting validation
 */
export const RateLimitConfig = {
  // Default rate limits per endpoint type
  api: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  auth: { windowMs: 15 * 60 * 1000, max: 5 },   // 5 requests per 15 minutes
  upload: { windowMs: 60 * 1000, max: 10 },     // 10 uploads per minute
  search: { windowMs: 60 * 1000, max: 60 },     // 60 searches per minute
};

/**
 * Security headers configuration
 */
export const SecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-src 'none';"
};

export default InputValidator;