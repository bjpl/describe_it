/**
 * Input Validation and Sanitization Security Module
 * Provides comprehensive input validation and sanitization
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  sanitizedData?: T;
}

export class InputValidator {
  
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHTML(input: string): string {
    // First remove javascript: protocol
    let sanitized = input.replace(/javascript:/gi, '');
    
    // Then use DOMPurify to sanitize HTML
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
    
    return sanitized;
  }

  /**
   * Sanitize SQL-like input to prevent injection
   */
  sanitizeSQL(input: string): string {
    return input
      .replace(/['"\\]/g, '') // Remove quotes and backslashes
      .replace(/;\s*$/g, '') // Remove trailing semicolons
      .replace(/--.*$/gm, '') // Remove SQL comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim();
  }

  /**
   * Sanitize and validate error report payload
   */
  validateErrorReport(payload: unknown): ValidationResult<{
    message: string;
    stack?: string;
    url: string;
    userAgent?: string;
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    metadata?: Record<string, any>;
  }> {
    const errorReportSchema = z.object({
      message: z.string()
        .min(1, 'Error message is required')
        .max(1000, 'Error message too long')
        .transform(msg => this.sanitizeHTML(msg)),
      stack: z.string()
        .max(5000, 'Stack trace too long')
        .optional()
        .transform(stack => stack ? this.sanitizeHTML(stack) : undefined),
      url: z.string()
        .url('Invalid URL')
        .max(2048, 'URL too long'),
      userAgent: z.string()
        .max(500, 'User agent too long')
        .optional()
        .transform(ua => ua ? this.sanitizeHTML(ua) : undefined),
      timestamp: z.string()
        .datetime('Invalid timestamp format'),
      level: z.enum(['error', 'warning', 'info']),
      metadata: z.record(z.any())
        .optional()
        .refine(
          (metadata) => {
            if (!metadata) return true;
            // Limit metadata size
            const serialized = JSON.stringify(metadata);
            return serialized.length <= 10000;
          },
          'Metadata too large'
        )
        .transform(metadata => {
          if (!metadata) return undefined;
          // Sanitize metadata values
          const sanitized: Record<string, any> = {};
          for (const [key, value] of Object.entries(metadata)) {
            if (typeof value === 'string') {
              sanitized[key] = this.sanitizeHTML(value);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
              sanitized[key] = value;
            } else {
              sanitized[key] = '[SANITIZED_OBJECT]';
            }
          }
          return sanitized;
        })
    });

    try {
      const result = errorReportSchema.parse(payload);
      return {
        success: true,
        data: result,
        sanitizedData: result
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors[0]?.message || 'Unknown error'}`
        };
      }
      return {
        success: false,
        error: 'Unknown validation error'
      };
    }
  }

  /**
   * Validate debug endpoint parameters
   */
  validateDebugParams(searchParams: URLSearchParams): ValidationResult<{
    debug_token?: string;
    format?: 'json' | 'text';
    include?: string[];
  }> {
    const debugParamsSchema = z.object({
      debug_token: z.string()
        .min(8, 'Debug token too short')
        .max(128, 'Debug token too long')
        .regex(/^[a-zA-Z0-9]+$/, 'Debug token contains invalid characters')
        .optional(),
      format: z.enum(['json', 'text']).default('json'),
      include: z.string()
        .transform(str => str.split(',').map(s => s.trim()).filter(Boolean))
        .refine(
          arr => arr.every(item => /^[a-zA-Z0-9_-]+$/.test(item)),
          'Include parameter contains invalid characters'
        )
        .optional()
    });

    try {
      const params = Object.fromEntries(searchParams.entries());
      const result = debugParamsSchema.parse(params);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Invalid parameters: ${error.errors[0]?.message || 'Unknown error'}`
        };
      }
      return {
        success: false,
        error: 'Parameter validation failed'
      };
    }
  }

  /**
   * Validate and sanitize user input for API requests
   */
  validateAPIInput(payload: unknown, maxSize: number = 1000000): ValidationResult<any> {
    // Check payload size
    const serialized = JSON.stringify(payload);
    if (serialized.length > maxSize) {
      return {
        success: false,
        error: `Payload too large (${serialized.length} bytes, max ${maxSize})`
      };
    }

    // Check for common injection patterns
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /;\s*(drop|delete|truncate|insert|update|create|alter)\s+/gi,
      /<iframe[^>]+src=['"]javascript:/gi
    ];

    if (typeof payload === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(payload)) {
          return {
            success: false,
            error: 'Payload contains potentially malicious content'
          };
        }
      }
    }

    // Recursively sanitize object properties
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return this.sanitizeHTML(obj);
      }
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeObject(item));
        }
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize key names too
          const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
          if (cleanKey.length > 0 && cleanKey.length <= 64) {
            sanitized[cleanKey] = sanitizeObject(value);
          }
        }
        return sanitized;
      }
      return obj;
    };

    const sanitizedPayload = sanitizeObject(payload);

    return {
      success: true,
      data: payload,
      sanitizedData: sanitizedPayload
    };
  }

  /**
   * Validate file upload parameters
   */
  validateFileUpload(file: File, allowedTypes: string[], maxSize: number): ValidationResult<File> {
    // Check file size
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File too large (${file.size} bytes, max ${maxSize})`
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type not allowed (${file.type})`
      };
    }

    // Check filename for security
    const filename = file.name;
    if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename.includes('..')) {
      return {
        success: false,
        error: 'Filename contains invalid characters'
      };
    }

    return {
      success: true,
      data: file
    };
  }
}

// Export singleton instance
export const inputValidator = new InputValidator();