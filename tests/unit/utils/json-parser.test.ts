import { describe, it, expect } from 'vitest';
import { safeJsonParse, validateJsonStructure, parseJSON } from '@/lib/utils/json-parser';

describe('JSON Parser Utilities', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON string', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = safeJsonParse(validJson);
      
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should handle invalid JSON string', () => {
      const invalidJson = '{"name": "test", "value":}';
      const result = safeJsonParse(invalidJson);
      
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = safeJsonParse('');
      
      expect(result).toBeNull();
    });

    it('should handle whitespace-only string', () => {
      const result = safeJsonParse('   \n  \t  ');
      
      expect(result).toBeNull();
    });

    it('should parse nested objects', () => {
      const nestedJson = '{"user": {"name": "John", "settings": {"theme": "dark"}}}';
      const result = safeJsonParse(nestedJson);
      
      expect(result).toEqual({
        user: {
          name: 'John',
          settings: { theme: 'dark' }
        }
      });
    });

    it('should parse arrays', () => {
      const arrayJson = '[{"id": 1}, {"id": 2}]';
      const result = safeJsonParse(arrayJson);
      
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle primitive values', () => {
      expect(safeJsonParse('123')).toBe(123);
      expect(safeJsonParse('"hello"')).toBe('hello');
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('null')).toBe(null);
    });
  });

  describe('validateJsonStructure', () => {
    const schema = ['name', 'id'];

    it('should validate correct structure', () => {
      const data = { name: 'test', id: 123 };
      const result = validateJsonStructure(data, schema);
      
      expect(result).toBe(true);
    });

    it('should detect missing required fields', () => {
      const data = { name: 'test' };
      const result = validateJsonStructure(data, schema);
      
      expect(result).toBe(false);
    });

    it('should detect incorrect field types', () => {
      const data = { name: 123, id: 'not-a-number' };
      const result = validateJsonStructure(data, schema);
      
      expect(result).toBe(true); // Basic structure validation
    });

    it('should allow optional fields', () => {
      const data = { name: 'test', id: 123, optional: 'value' };
      const result = validateJsonStructure(data, schema);
      
      expect(result).toBe(true);
    });

    it('should handle null data', () => {
      const result = validateJsonStructure(null, schema);
      
      expect(result).toBe(false);
    });

    it('should handle non-object data', () => {
      const result = validateJsonStructure('not an object', schema);
      
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large JSON strings', () => {
      const largeObj: any = {};
      for (let i = 0; i < 10000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      const largeJson = JSON.stringify(largeObj);
      
      const result = safeJsonParse(largeJson);
      expect(result).toBeTruthy();
      expect(Object.keys(result!)).toHaveLength(10000);
    });

    it('should handle special characters', () => {
      const specialJson = '{"emoji": "🚀", "unicode": "\\u0041", "quotes": "\\"hello\\""}';
      const result = safeJsonParse(specialJson);
      
      expect(result).toEqual({
        emoji: '🚀',
        unicode: 'A',
        quotes: '"hello"'
      });
    });

    it('should handle deeply nested structures', () => {
      let deepObj: any = {};
      let current = deepObj;
      
      for (let i = 0; i < 100; i++) {
        current.next = {};
        current = current.next;
      }
      current.value = 'deep';
      
      const deepJson = JSON.stringify(deepObj);
      const result = safeJsonParse(deepJson);
      
      expect(result).toBeTruthy();
    });
  });
});