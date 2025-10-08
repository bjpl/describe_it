/**
 * Data Sanitization Security Utilities
 * Provides comprehensive sanitization to prevent XSS, injection attacks, and data corruption
 */

import DOMPurify from 'isomorphic-dompurify';
import { securityLogger, type LogContext } from '@/lib/logger';

/**
 * Sanitization options interface
 */
interface SanitizationOptions {
  allowHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
  stripWhitespace?: boolean;
  preserveLineBreaks?: boolean;
}

/**
 * Data Sanitizer Class
 * Provides methods to clean and sanitize various types of data
 */
export class DataSanitizer {
  
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const {
      allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
      allowedAttributes = ['href', 'target'],
      maxLength = 10000,
      stripWhitespace = false
    } = options;

    // Truncate if too long
    let sanitized = input.length > maxLength ? input.substring(0, maxLength) : input;

    // Use DOMPurify to sanitize HTML
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttributes,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout'],
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SAFE_FOR_TEMPLATES: true
    });

    // Strip excessive whitespace if requested
    if (stripWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }

    return sanitized;
  }

  /**
   * Sanitize plain text content
   */
  static sanitizeText(
    input: string,
    options: SanitizationOptions = {}
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const {
      maxLength = 5000,
      stripWhitespace = true,
      preserveLineBreaks = false
    } = options;

    let sanitized = input;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove potential script injections
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Handle whitespace
    if (preserveLineBreaks) {
      // Normalize line breaks but preserve them
      sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (stripWhitespace) {
        // Remove extra spaces but keep line breaks
        sanitized = sanitized.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n');
      }
    } else {
      // Convert line breaks to spaces
      sanitized = sanitized.replace(/[\r\n]+/g, ' ');
      if (stripWhitespace) {
        sanitized = sanitized.replace(/\s+/g, ' ');
      }
    }

    // Trim and truncate
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'unnamed_file';
    }

    let sanitized = filename;

    // Remove path traversal attempts
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    // Replace spaces and special chars with underscores
    sanitized = sanitized.replace(/[\s\-]+/g, '_');

    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, '_');

    // Ensure it doesn't start/end with dots or underscores
    sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');

    // Limit length
    if (sanitized.length > 100) {
      const ext = sanitized.match(/\.[^.]*$/)?.[0] || '';
      const name = sanitized.substring(0, 100 - ext.length);
      sanitized = name + ext;
    }

    // Ensure it's not empty
    if (!sanitized) {
      return 'unnamed_file';
    }

    return sanitized.toLowerCase();
  }

  /**
   * Sanitize URL to prevent malicious redirects
   */
  static sanitizeUrl(url: string, allowedDomains?: string[]): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const urlObj = new URL(url);

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }

      // Check against allowed domains if provided
      if (allowedDomains && allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => {
          return urlObj.hostname === domain || 
                 urlObj.hostname.endsWith('.' + domain);
        });
        
        if (!isAllowed) {
          return null;
        }
      }

      // Sanitize the URL string
      const sanitized = urlObj.toString();

      // Remove any javascript: or data: schemes that might have slipped through
      if (/javascript:|data:|vbscript:/i.test(sanitized)) {
        return null;
      }

      return sanitized;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const sanitized = email.toLowerCase().trim();

    // Basic email regex validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      return null;
    }

    // Check for potentially malicious content
    if (/[<>'"&]/.test(sanitized)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    let sanitized = query;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove SQL injection patterns
    sanitized = sanitized.replace(/['"`;]/g, '');
    sanitized = sanitized.replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '');

    // Remove script injections
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Limit length
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200).trim();
    }

    return sanitized;
  }

  /**
   * Sanitize JSON data recursively
   */
  static sanitizeJsonData(data: any, options: SanitizationOptions = {}): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeText(data, options);
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJsonData(item, options));
    }

    if (typeof data === 'object') {
      const sanitizedObj: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Sanitize the key
        const sanitizedKey = this.sanitizeText(key, { maxLength: 100, stripWhitespace: true });
        
        if (sanitizedKey) {
          sanitizedObj[sanitizedKey] = this.sanitizeJsonData(value, options);
        }
      }
      
      return sanitizedObj;
    }

    return null;
  }

  /**
   * Sanitize API parameters
   */
  static sanitizeApiParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Sanitize parameter name
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      
      if (!sanitizedKey) {
        continue;
      }

      // Sanitize parameter value based on type
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(value);
      } else if (typeof value === 'number') {
        // Ensure it's a valid number and within reasonable bounds
        if (isFinite(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER) {
          sanitized[sanitizedKey] = value;
        }
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value
          .filter(item => typeof item === 'string' || typeof item === 'number')
          .map(item => typeof item === 'string' ? this.sanitizeText(item) : item)
          .slice(0, 100); // Limit array size
      }
    }

    return sanitized;
  }

  /**
   * Sanitize user input for database storage
   */
  static sanitizeForDatabase(data: any): any {
    return this.sanitizeJsonData(data, {
      allowHtml: false,
      maxLength: 10000,
      stripWhitespace: true,
      preserveLineBreaks: true
    });
  }

  /**
   * Sanitize data for API response
   */
  static sanitizeForApiResponse(data: any): any {
    return this.sanitizeJsonData(data, {
      allowHtml: false,
      maxLength: 50000,
      stripWhitespace: false,
      preserveLineBreaks: true
    });
  }

  /**
   * Remove sensitive information from logs
   */
  static sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'apikey', 'api_key',
      'authorization', 'auth', 'cookie', 'session', 'csrf',
      'ssn', 'social_security', 'credit_card', 'bank_account'
    ];

    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (obj && typeof obj === 'object') {
        const sanitizedObj: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
          
          if (isSensitive) {
            sanitizedObj[key] = '[REDACTED]';
          } else {
            sanitizedObj[key] = sanitize(value);
          }
        }
        
        return sanitizedObj;
      }

      return obj;
    };

    return sanitize(data);
  }

  /**
   * Batch sanitize multiple values
   */
  static batchSanitize(
    data: Record<string, any>,
    sanitizers: Record<string, (value: any) => any>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sanitizers[key]) {
        try {
          result[key] = sanitizers[key](value);
        } catch (error: unknown) {
          // Log error and use fallback sanitization
          const logContext: LogContext = error instanceof Error ? { error: error.message } : { error: String(error) };
          securityLogger.warn(`Failed to sanitize ${key}:`, logContext);
          result[key] = this.sanitizeText(String(value));
        }
      } else {
        // Use default text sanitization
        result[key] = typeof value === 'string' 
          ? this.sanitizeText(value) 
          : value;
      }
    }

    return result;
  }
}

/**
 * Common sanitization configurations
 */
export const SanitizationConfigs = {
  // For user-generated content that allows some formatting
  userContent: {
    allowHtml: true,
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: [],
    maxLength: 10000,
    stripWhitespace: false,
    preserveLineBreaks: true
  },

  // For plain text content
  plainText: {
    allowHtml: false,
    maxLength: 5000,
    stripWhitespace: true,
    preserveLineBreaks: false
  },

  // For search queries
  searchQuery: {
    allowHtml: false,
    maxLength: 200,
    stripWhitespace: true,
    preserveLineBreaks: false
  },

  // For comments and descriptions
  description: {
    allowHtml: false,
    maxLength: 2000,
    stripWhitespace: false,
    preserveLineBreaks: true
  },

  // For titles and names
  title: {
    allowHtml: false,
    maxLength: 100,
    stripWhitespace: true,
    preserveLineBreaks: false
  }
};

export default DataSanitizer;