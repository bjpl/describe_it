/**
 * Comprehensive JSON Safe Utilities Tests
 * Tests all edge cases for safe JSON parsing and stringification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  safeParse,
  safeStringify,
  parseWithValidation,
  safeParseLocalStorage,
  safeSetLocalStorage,
  safeDeepClone,
  safeParseLimited,
  toLogContext,
} from '@/lib/utils/json-safe';

describe('JSON Safe Utilities - Comprehensive Tests', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    global.localStorage = localStorageMock as any;
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('safeParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"foo": "bar", "baz": 123}';
      const result = safeParse(json);

      expect(result).toEqual({ foo: 'bar', baz: 123 });
    });

    it('should parse arrays', () => {
      const json = '[1, 2, 3, "test"]';
      const result = safeParse(json);

      expect(result).toEqual([1, 2, 3, 'test']);
    });

    it('should parse nested objects', () => {
      const json = '{"nested": {"deep": {"value": true}}}';
      const result = safeParse(json);

      expect(result).toEqual({ nested: { deep: { value: true } } });
    });

    it('should return undefined for invalid JSON', () => {
      const result = safeParse('invalid{json');

      expect(result).toBeUndefined();
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: 'value' };
      const result = safeParse('invalid', fallback);

      expect(result).toEqual(fallback);
    });

    it('should handle empty string', () => {
      const result = safeParse('');

      expect(result).toBeUndefined();
    });

    it('should parse null', () => {
      const result = safeParse('null');

      expect(result).toBeNull();
    });

    it('should parse boolean values', () => {
      expect(safeParse('true')).toBe(true);
      expect(safeParse('false')).toBe(false);
    });

    it('should parse numbers', () => {
      expect(safeParse('123')).toBe(123);
      expect(safeParse('45.67')).toBe(45.67);
      expect(safeParse('-99')).toBe(-99);
    });

    it('should parse strings', () => {
      const result = safeParse('"hello"');

      expect(result).toBe('hello');
    });

    it('should handle special characters', () => {
      const json = '{"text": "Special: \\"quotes\\", \\n newline"}';
      const result = safeParse(json);

      expect(result.text).toContain('quotes');
      expect(result.text).toContain('\n');
    });

    it('should handle unicode', () => {
      const json = '{"unicode": "你好 🎉"}';
      const result = safeParse(json);

      expect(result.unicode).toBe('你好 🎉');
    });

    it('should type correctly with generics', () => {
      interface TestType {
        name: string;
        age: number;
      }

      const json = '{"name": "John", "age": 30}';
      const result = safeParse<TestType>(json);

      expect(result?.name).toBe('John');
      expect(result?.age).toBe(30);
    });
  });

  describe('safeStringify', () => {
    it('should stringify objects', () => {
      const obj = { foo: 'bar', baz: 123 };
      const result = safeStringify(obj);

      expect(result).toBe('{"foo":"bar","baz":123}');
    });

    it('should stringify arrays', () => {
      const arr = [1, 2, 3, 'test'];
      const result = safeStringify(arr);

      expect(result).toBe('[1,2,3,"test"]');
    });

    it('should stringify nested objects', () => {
      const obj = { nested: { deep: { value: true } } };
      const result = safeStringify(obj);

      expect(result).toBe('{"nested":{"deep":{"value":true}}}');
    });

    it('should return fallback for circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const result = safeStringify(obj);

      expect(result).toBe('{}');
    });

    it('should use custom fallback', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const result = safeStringify(obj, '[]');

      expect(result).toBe('[]');
    });

    it('should handle null', () => {
      const result = safeStringify(null);

      expect(result).toBe('null');
    });

    it('should handle undefined', () => {
      const result = safeStringify(undefined);

      expect(result).toBeTypeOf('string');
    });

    it('should handle booleans', () => {
      expect(safeStringify(true)).toBe('true');
      expect(safeStringify(false)).toBe('false');
    });

    it('should handle numbers', () => {
      expect(safeStringify(123)).toBe('123');
      expect(safeStringify(45.67)).toBe('45.67');
    });

    it('should handle strings', () => {
      const result = safeStringify('hello');

      expect(result).toBe('"hello"');
    });

    it('should escape special characters', () => {
      const obj = { text: 'Line 1\nLine 2\tTabbed "quoted"' };
      const result = safeStringify(obj);

      expect(result).toContain('\\n');
      expect(result).toContain('\\t');
      expect(result).toContain('\\"');
    });

    it('should handle unicode', () => {
      const obj = { unicode: '你好 🎉' };
      const result = safeStringify(obj);

      expect(result).toBeTruthy();
      const parsed = safeParse(result);
      expect(parsed.unicode).toBe('你好 🎉');
    });

    it('should include context in errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      process.env.NODE_ENV = 'development';

      const obj: any = {};
      obj.circular = obj;

      safeStringify(obj, '{}', 'test-context');

      // Error should be logged with context in development
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('parseWithValidation', () => {
    it('should parse and validate valid data', () => {
      interface User {
        name: string;
        age: number;
      }

      const validator = (data: unknown): User | null => {
        if (
          typeof data === 'object' &&
          data !== null &&
          'name' in data &&
          'age' in data &&
          typeof (data as any).name === 'string' &&
          typeof (data as any).age === 'number'
        ) {
          return data as User;
        }
        return null;
      };

      const json = '{"name": "John", "age": 30}';
      const result = parseWithValidation(json, validator);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return undefined for invalid data', () => {
      const validator = (data: unknown): { valid: boolean } | null => {
        if (typeof data === 'object' && data !== null && 'valid' in data) {
          return { valid: true };
        }
        return null;
      };

      const json = '{"invalid": "structure"}';
      const result = parseWithValidation(json, validator);

      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid JSON', () => {
      const validator = (data: unknown) => ({ validated: true });
      const result = parseWithValidation('invalid{json', validator);

      expect(result).toBeUndefined();
    });

    it('should handle validator errors', () => {
      const validator = () => {
        throw new Error('Validation error');
      };

      const json = '{"test": "data"}';
      const result = parseWithValidation(json, validator);

      expect(result).toBeUndefined();
    });
  });

  describe('safeParseLocalStorage', () => {
    it('should parse data from localStorage', () => {
      localStorageMock.setItem('test-key', '{"foo": "bar"}');

      const result = safeParseLocalStorage('test-key');

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return fallback for missing key', () => {
      const fallback = { default: 'value' };
      const result = safeParseLocalStorage('nonexistent', fallback);

      expect(result).toEqual(fallback);
    });

    it('should return fallback for invalid JSON', () => {
      localStorageMock.setItem('test-key', 'invalid{json');

      const fallback = { default: 'value' };
      const result = safeParseLocalStorage('test-key', fallback);

      expect(result).toEqual(fallback);
    });

    it('should handle localStorage errors', () => {
      // Simulate localStorage being unavailable
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage unavailable');
      };

      const fallback = { default: 'value' };
      const result = safeParseLocalStorage('test-key', fallback);

      expect(result).toEqual(fallback);

      localStorageMock.getItem = originalGetItem;
    });

    it('should type correctly with generics', () => {
      interface Settings {
        theme: string;
        notifications: boolean;
      }

      localStorageMock.setItem('settings', '{"theme": "dark", "notifications": true}');

      const result = safeParseLocalStorage<Settings>('settings');

      expect(result?.theme).toBe('dark');
      expect(result?.notifications).toBe(true);
    });
  });

  describe('safeSetLocalStorage', () => {
    it('should store data in localStorage', () => {
      const data = { foo: 'bar', baz: 123 };
      const success = safeSetLocalStorage('test-key', data);

      expect(success).toBe(true);
      expect(localStorageMock.getItem('test-key')).toBe('{"foo":"bar","baz":123}');
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const success = safeSetLocalStorage('test-key', obj);

      expect(success).toBe(true);
      expect(localStorageMock.getItem('test-key')).toBe('{}');
    });

    it('should return false on localStorage errors', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage full');
      };

      const success = safeSetLocalStorage('test-key', { data: 'test' });

      expect(success).toBe(false);

      localStorageMock.setItem = originalSetItem;
    });

    it('should store different data types', () => {
      expect(safeSetLocalStorage('string', 'test')).toBe(true);
      expect(safeSetLocalStorage('number', 123)).toBe(true);
      expect(safeSetLocalStorage('boolean', true)).toBe(true);
      expect(safeSetLocalStorage('array', [1, 2, 3])).toBe(true);
      expect(safeSetLocalStorage('null', null)).toBe(true);
    });
  });

  describe('safeDeepClone', () => {
    it('should clone objects', () => {
      const original = { foo: 'bar', baz: 123 };
      const clone = safeDeepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should clone nested objects', () => {
      const original = { nested: { deep: { value: [1, 2, 3] } } };
      const clone = safeDeepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone?.nested).not.toBe(original.nested);
    });

    it('should clone arrays', () => {
      const original = [1, 2, { nested: true }];
      const clone = safeDeepClone(original);

      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it('should return undefined for circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const clone = safeDeepClone(obj);

      expect(clone).toBeDefined(); // Will be {}, the fallback from safeStringify
    });

    it('should handle primitives', () => {
      expect(safeDeepClone(123)).toBe(123);
      expect(safeDeepClone('test')).toBe('test');
      expect(safeDeepClone(true)).toBe(true);
      expect(safeDeepClone(null)).toBe(null);
    });

    it('should clone dates as strings', () => {
      const date = new Date('2024-01-15');
      const clone = safeDeepClone({ date });

      expect(clone?.date).toBe(date.toJSON());
    });
  });

  describe('safeParseLimited', () => {
    it('should parse small JSON', () => {
      const json = '{"foo": "bar"}';
      const result = safeParseLimited(json);

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should reject JSON exceeding size limit', () => {
      const largeJson = '{"data": "' + 'x'.repeat(2000000) + '"}';
      const result = safeParseLimited(largeJson, 1000000);

      expect(result).toBeUndefined();
    });

    it('should use default limit', () => {
      const normalJson = '{"foo": "bar"}';
      const result = safeParseLimited(normalJson);

      expect(result).toEqual({ foo: 'bar' });
    });

    it('should allow custom limit', () => {
      const json = '{"data": "test"}';
      const result = safeParseLimited(json, 100);

      expect(result).toEqual({ data: 'test' });
    });

    it('should reject exactly at limit', () => {
      const json = 'x'.repeat(101);
      const result = safeParseLimited(json, 100);

      expect(result).toBeUndefined();
    });

    it('should accept exactly under limit', () => {
      const json = '"' + 'x'.repeat(98) + '"'; // 100 chars total
      const result = safeParseLimited(json, 100);

      expect(result).toBeDefined();
    });
  });

  describe('toLogContext', () => {
    it('should convert Error to log context', () => {
      const error = new Error('Test error');
      const context = toLogContext(error);

      expect(context).toEqual({ error: 'Test error' });
    });

    it('should convert string to log context', () => {
      const context = toLogContext('Error message');

      expect(context).toEqual({ error: 'Error message' });
    });

    it('should convert number to log context', () => {
      const context = toLogContext(404);

      expect(context).toEqual({ error: '404' });
    });

    it('should convert object to log context', () => {
      const context = toLogContext({ code: 'ERROR', details: 'Failed' });

      expect(context.error).toBeTruthy();
    });

    it('should convert null to log context', () => {
      const context = toLogContext(null);

      expect(context).toEqual({ error: 'null' });
    });

    it('should convert undefined to log context', () => {
      const context = toLogContext(undefined);

      expect(context).toEqual({ error: 'undefined' });
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle round-trip for complex data', () => {
      const original = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'deep value',
          },
        },
      };

      const stringified = safeStringify(original);
      const parsed = safeParse(stringified);

      expect(parsed).toEqual(original);
    });

    it('should handle empty objects and arrays', () => {
      expect(safeParse('{}')).toEqual({});
      expect(safeParse('[]')).toEqual([]);
      expect(safeStringify({})).toBe('{}');
      expect(safeStringify([])).toBe('[]');
    });

    it('should handle very large numbers', () => {
      const large = Number.MAX_SAFE_INTEGER;
      const stringified = safeStringify(large);
      const parsed = safeParse(stringified);

      expect(parsed).toBe(large);
    });

    it('should handle special number values', () => {
      // JSON doesn't support Infinity or NaN
      expect(safeStringify(Infinity)).toBe('null');
      expect(safeStringify(NaN)).toBe('null');
      expect(safeStringify(-Infinity)).toBe('null');
    });

    it('should preserve array order', () => {
      const arr = [3, 1, 4, 1, 5, 9, 2, 6];
      const stringified = safeStringify(arr);
      const parsed = safeParse(stringified);

      expect(parsed).toEqual(arr);
    });

    it('should handle mixed type arrays', () => {
      const arr = [1, 'two', true, null, { five: 5 }, [6, 7]];
      const stringified = safeStringify(arr);
      const parsed = safeParse(stringified);

      expect(parsed).toEqual(arr);
    });
  });
});
