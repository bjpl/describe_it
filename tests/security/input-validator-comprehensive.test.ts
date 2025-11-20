/**
 * Comprehensive InputValidator Tests
 * Tests all validation methods including XSS, SQL injection, and file upload security
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InputValidator, inputValidator, type ValidationResult } from '@/lib/security/inputValidation';

describe('InputValidator - Comprehensive Security Tests', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const result = validator.sanitizeHTML('<script>alert("xss")</script>Hello');
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should remove all HTML tags', () => {
      const html = '<div><p>Test</p><span>Content</span></div>';
      const result = validator.sanitizeHTML(html);
      expect(result).toBe('TestContent');
    });

    it('should remove dangerous characters', () => {
      const dangerous = '<>"\'"test';
      const result = validator.sanitizeHTML(dangerous);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
    });

    it('should remove javascript: protocol', () => {
      const malicious = 'javascript:alert("xss")';
      const result = validator.sanitizeHTML(malicious);
      expect(result.toLowerCase()).not.toContain('javascript:');
    });

    it('should handle case-insensitive javascript protocol', () => {
      const tests = ['JavaScript:alert(1)', 'JAVASCRIPT:alert(1)', 'JaVaScRiPt:alert(1)'];
      tests.forEach(test => {
        const result = validator.sanitizeHTML(test);
        expect(result.toLowerCase()).not.toContain('javascript:');
      });
    });

    it('should preserve safe text', () => {
      const safe = 'Hello World 123';
      const result = validator.sanitizeHTML(safe);
      expect(result).toBe('Hello World 123');
    });

    it('should handle empty string', () => {
      const result = validator.sanitizeHTML('');
      expect(result).toBe('');
    });

    it('should handle unicode and emojis', () => {
      const unicode = 'Hello 你好 🎉';
      const result = validator.sanitizeHTML(unicode);
      expect(result).toContain('Hello');
      expect(result).toContain('你好');
      expect(result).toContain('🎉');
    });

    it('should remove event handlers', () => {
      const malicious = '<img src=x onerror=alert(1)>';
      const result = validator.sanitizeHTML(malicious);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('<img');
    });

    it('should remove iframe tags', () => {
      const malicious = '<iframe src="evil.com"></iframe>';
      const result = validator.sanitizeHTML(malicious);
      expect(result).not.toContain('iframe');
    });
  });

  describe('sanitizeSQL', () => {
    it('should remove quotes', () => {
      const sql = "test'value\"test";
      const result = validator.sanitizeSQL(sql);
      expect(result).not.toContain("'");
      expect(result).not.toContain('"');
    });

    it('should remove backslashes', () => {
      const sql = 'test\\value';
      const result = validator.sanitizeSQL(sql);
      expect(result).not.toContain('\\');
    });

    it('should remove trailing semicolons', () => {
      const sql = 'SELECT * FROM users;';
      const result = validator.sanitizeSQL(sql);
      expect(result).not.toMatch(/;\s*$/);
    });

    it('should remove SQL comments', () => {
      const sql = "SELECT * FROM users -- comment";
      const result = validator.sanitizeSQL(sql);
      expect(result).not.toContain('--');
      expect(result).not.toContain('comment');
    });

    it('should remove multi-line comments', () => {
      const sql = 'SELECT * /* comment */ FROM users';
      const result = validator.sanitizeSQL(sql);
      expect(result).not.toContain('/*');
      expect(result).not.toContain('*/');
    });

    it('should handle SQL injection attempts', () => {
      const injections = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM passwords --",
      ];

      injections.forEach(injection => {
        const result = validator.sanitizeSQL(injection);
        expect(result).not.toContain("'");
        expect(result).not.toContain('--');
      });
    });

    it('should trim whitespace', () => {
      const sql = '  test  ';
      const result = validator.sanitizeSQL(sql);
      expect(result).toBe('test');
    });

    it('should handle empty string', () => {
      const result = validator.sanitizeSQL('');
      expect(result).toBe('');
    });
  });

  describe('validateErrorReport', () => {
    it('should validate correct error report', () => {
      const payload = {
        message: 'Test error',
        stack: 'Error stack trace',
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
        metadata: { key: 'value' },
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should require message field', () => {
      const payload = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain('message');
    });

    it('should enforce message max length', () => {
      const payload = {
        message: 'x'.repeat(1001),
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should validate URL format', () => {
      const payload = {
        message: 'Test error',
        url: 'not-a-valid-url',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(false);
    });

    it('should validate timestamp format', () => {
      const payload = {
        message: 'Test error',
        url: 'https://example.com',
        timestamp: 'invalid-timestamp',
        level: 'error' as const,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(false);
    });

    it('should validate level enum', () => {
      const validLevels = ['error', 'warning', 'info'];

      validLevels.forEach(level => {
        const payload = {
          message: 'Test',
          url: 'https://example.com',
          timestamp: new Date().toISOString(),
          level: level as 'error' | 'warning' | 'info',
        };

        const result = validator.validateErrorReport(payload);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid level', () => {
      const payload = {
        message: 'Test',
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        level: 'invalid' as any,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(false);
    });

    it('should sanitize message HTML', () => {
      const payload = {
        message: '<script>alert("xss")</script>Error',
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(true);
      expect(result.sanitizedData?.message).not.toContain('<script>');
    });

    it('should limit metadata size', () => {
      const largeMetadata = { data: 'x'.repeat(10001) };
      const payload = {
        message: 'Test',
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
        metadata: largeMetadata,
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(false);
    });

    it('should sanitize metadata values', () => {
      const payload = {
        message: 'Test',
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        level: 'error' as const,
        metadata: {
          safe: 'value',
          html: '<script>xss</script>',
          number: 123,
          boolean: true,
          object: { nested: 'value' },
        },
      };

      const result = validator.validateErrorReport(payload);
      expect(result.success).toBe(true);
      expect(result.sanitizedData?.metadata?.safe).toBe('value');
      expect(result.sanitizedData?.metadata?.html).not.toContain('<script>');
      expect(result.sanitizedData?.metadata?.number).toBe(123);
      expect(result.sanitizedData?.metadata?.boolean).toBe(true);
      expect(result.sanitizedData?.metadata?.object).toBe('[SANITIZED_OBJECT]');
    });
  });

  describe('validateDebugParams', () => {
    it('should validate correct debug params', () => {
      const params = new URLSearchParams({
        debug_token: 'abc123token',
        format: 'json',
        include: 'logs,metrics',
      });

      const result = validator.validateDebugParams(params);
      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('json');
    });

    it('should default format to json', () => {
      const params = new URLSearchParams({ debug_token: 'abc123token' });

      const result = validator.validateDebugParams(params);
      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('json');
    });

    it('should validate debug token length', () => {
      const shortToken = new URLSearchParams({ debug_token: 'short' });
      const result = validator.validateDebugParams(shortToken);
      expect(result.success).toBe(false);

      const longToken = new URLSearchParams({ debug_token: 'a'.repeat(129) });
      const result2 = validator.validateDebugParams(longToken);
      expect(result2.success).toBe(false);
    });

    it('should validate debug token characters', () => {
      const invalidToken = new URLSearchParams({ debug_token: 'invalid<>token' });
      const result = validator.validateDebugParams(invalidToken);
      expect(result.success).toBe(false);
    });

    it('should parse include parameter', () => {
      const params = new URLSearchParams({ include: 'logs,metrics,errors' });

      const result = validator.validateDebugParams(params);
      expect(result.success).toBe(true);
      expect(result.data?.include).toEqual(['logs', 'metrics', 'errors']);
    });

    it('should validate include characters', () => {
      const params = new URLSearchParams({ include: 'valid,invalid<script>,okay' });
      const result = validator.validateDebugParams(params);
      expect(result.success).toBe(false);
    });

    it('should accept text format', () => {
      const params = new URLSearchParams({ format: 'text' });
      const result = validator.validateDebugParams(params);
      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('text');
    });
  });

  describe('validateAPIInput', () => {
    it('should validate safe input', () => {
      const payload = { foo: 'bar', baz: 123 };
      const result = validator.validateAPIInput(payload);
      expect(result.success).toBe(true);
    });

    it('should enforce payload size limit', () => {
      const large = { data: 'x'.repeat(1000000) };
      const result = validator.validateAPIInput(large, 10000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should detect script tags', () => {
      const malicious = '<script>alert("xss")</script>';
      const result = validator.validateAPIInput(malicious);
      expect(result.success).toBe(false);
      expect(result.error).toContain('malicious');
    });

    it('should detect javascript protocol', () => {
      const malicious = 'javascript:alert(1)';
      const result = validator.validateAPIInput(malicious);
      expect(result.success).toBe(false);
    });

    it('should detect event handlers', () => {
      const malicious = 'onclick=alert(1)';
      const result = validator.validateAPIInput(malicious);
      expect(result.success).toBe(false);
    });

    it('should detect SQL injection attempts', () => {
      const malicious = '; DROP TABLE users;';
      const result = validator.validateAPIInput(malicious);
      expect(result.success).toBe(false);
    });

    it('should sanitize object properties', () => {
      const payload = {
        safe: 'value',
        html: '<div>content</div>',
        nested: {
          deep: '<script>xss</script>',
        },
      };

      const result = validator.validateAPIInput(payload);
      expect(result.success).toBe(true);
      expect(result.sanitizedData?.html).not.toContain('<div>');
      expect(result.sanitizedData?.nested?.deep).not.toContain('<script>');
    });

    it('should sanitize array items', () => {
      const payload = ['<script>xss</script>', 'safe', '<div>html</div>'];

      const result = validator.validateAPIInput(payload);
      expect(result.success).toBe(true);
      expect(result.sanitizedData?.[0]).not.toContain('<script>');
      expect(result.sanitizedData?.[2]).not.toContain('<div>');
    });

    it('should sanitize object keys', () => {
      const payload = {
        'valid_key': 'value',
        'invalid<>key': 'value',
        'toolongkeythatexceedssixtyfourcharacterslimitandshouldbeskipped': 'value',
      };

      const result = validator.validateAPIInput(payload);
      expect(result.success).toBe(true);
      expect(result.sanitizedData).toHaveProperty('valid_key');
      expect(result.sanitizedData).toHaveProperty('invalidkey');
      expect(result.sanitizedData).not.toHaveProperty(
        'toolongkeythatexceedssixtyfourcharacterslimitandshouldbeskipped'
      );
    });

    it('should preserve primitive types', () => {
      const payload = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
      };

      const result = validator.validateAPIInput(payload);
      expect(result.success).toBe(true);
      expect(result.sanitizedData?.number).toBe(123);
      expect(result.sanitizedData?.boolean).toBe(true);
      expect(result.sanitizedData?.null).toBeNull();
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct file', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validator.validateFileUpload(file, ['text/plain'], 10000);
      expect(result.success).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
      const file = new File(['x'.repeat(10001)], 'large.txt', { type: 'text/plain' });
      const result = validator.validateFileUpload(file, ['text/plain'], 10000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject disallowed file type', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validator.validateFileUpload(file, ['text/plain', 'image/png'], 10000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should validate filename characters', () => {
      const invalidNames = [
        'test<script>.txt',
        'test".txt',
        "test'.txt",
        'test/path.txt',
        'test\\path.txt',
      ];

      invalidNames.forEach(name => {
        const file = new File(['content'], name, { type: 'text/plain' });
        const result = validator.validateFileUpload(file, ['text/plain'], 10000);
        expect(result.success).toBe(false);
        expect(result.error).toContain('invalid characters');
      });
    });

    it('should reject directory traversal in filename', () => {
      const file = new File(['content'], '../../../etc/passwd', { type: 'text/plain' });
      const result = validator.validateFileUpload(file, ['text/plain'], 10000);
      expect(result.success).toBe(false);
    });

    it('should accept valid filenames', () => {
      const validNames = ['test.txt', 'file-name.pdf', 'image_2024.png', 'data.123.json'];

      validNames.forEach(name => {
        const file = new File(['content'], name, { type: 'text/plain' });
        const result = validator.validateFileUpload(file, ['text/plain'], 10000);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(inputValidator).toBeInstanceOf(InputValidator);
    });

    it('should have all methods', () => {
      expect(typeof inputValidator.sanitizeHTML).toBe('function');
      expect(typeof inputValidator.sanitizeSQL).toBe('function');
      expect(typeof inputValidator.validateErrorReport).toBe('function');
      expect(typeof inputValidator.validateDebugParams).toBe('function');
      expect(typeof inputValidator.validateAPIInput).toBe('function');
      expect(typeof inputValidator.validateFileUpload).toBe('function');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very long strings efficiently', () => {
      const long = 'a'.repeat(100000);
      const start = Date.now();
      validator.sanitizeHTML(long);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle deeply nested objects', () => {
      const deep: any = { level: 1 };
      let current = deep;
      for (let i = 2; i <= 100; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      const result = validator.validateAPIInput(deep);
      expect(result.success).toBe(true);
    });

    it('should handle large arrays', () => {
      const largeArray = Array(1000).fill('test');
      const result = validator.validateAPIInput(largeArray, 100000);
      expect(result.success).toBe(true);
    });

    it('should handle mixed content safely', () => {
      const mixed = {
        safe: 'normal text',
        html: '<div>content</div>',
        script: '<script>alert(1)</script>',
        sql: "'; DROP TABLE users; --",
        array: ['<b>test</b>', 'safe', { nested: '<i>html</i>' }],
      };

      const result = validator.validateAPIInput(mixed, 10000);
      expect(result.success).toBe(true);
      expect(result.sanitizedData).toBeDefined();
    });
  });
});
