/**
 * FormField Validation Hook Tests
 * Tests useFormValidation hook with comprehensive validation rules (25+ tests)
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '@/components/ui/FormField';

describe('useFormValidation Hook', () => {
  const initialValues = {
    username: '',
    email: '',
    password: '',
  };

  const rules = {
    username: {
      required: 'Username is required',
      minLength: { value: 3, message: 'Minimum 3 characters' },
      maxLength: { value: 20, message: 'Maximum 20 characters' },
    },
    email: {
      required: true,
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: 'Invalid email format',
      },
    },
    password: {
      required: true,
      minLength: { value: 8, message: 'Minimum 8 characters' },
      custom: (value: string) => {
        if (!/[A-Z]/.test(value)) return 'Must contain uppercase';
        if (!/[0-9]/.test(value)) return 'Must contain number';
        return undefined;
      },
    },
  };

  describe('Initialization (5 tests)', () => {
    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      expect(result.current.values).toEqual(initialValues);
    });

    it('should have empty errors initially', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      expect(result.current.errors).toEqual({});
    });

    it('should have empty touched initially', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      expect(result.current.touched).toEqual({});
    });

    it('should be valid initially', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      expect(result.current.isValid).toBe(true);
    });

    it('should not be touched initially', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      expect(result.current.isFormTouched).toBe(false);
    });
  });

  describe('Required Validation (5 tests)', () => {
    it('should validate required fields', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBe('Username is required');
    });

    it('should pass with non-empty value', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', 'test');
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBeUndefined();
    });

    it('should use custom required message', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBe('Username is required');
    });

    it('should use default required message', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          initialValues,
          rules: { email: { required: true } },
        })
      );

      act(() => {
        result.current.validate('email');
      });

      expect(result.current.errors.email).toBe('email is required');
    });

    it('should trim whitespace for required check', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', '   ');
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBe('Username is required');
    });
  });

  describe('Length Validation (5 tests)', () => {
    it('should validate minimum length', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', 'ab');
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBe('Minimum 3 characters');
    });

    it('should validate maximum length', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', 'a'.repeat(21));
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBe('Maximum 20 characters');
    });

    it('should pass with valid length', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', 'test');
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBeUndefined();
    });

    it('should accept minimum exact length', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', 'abc');
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBeUndefined();
    });

    it('should accept maximum exact length', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('username', 'a'.repeat(20));
        result.current.validate('username');
      });

      expect(result.current.errors.username).toBeUndefined();
    });
  });

  describe('Pattern Validation (5 tests)', () => {
    it('should validate pattern match', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('email', 'invalid');
        result.current.validate('email');
      });

      expect(result.current.errors.email).toBe('Invalid email format');
    });

    it('should pass with valid pattern', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('email', 'test@example.com');
        result.current.validate('email');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should handle complex patterns', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('email', 'user.name+tag@example.co.uk');
        result.current.validate('email');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should be case insensitive for email', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('email', 'TEST@EXAMPLE.COM');
        result.current.validate('email');
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should reject invalid email formats', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      const invalidEmails = ['test', 'test@', '@example.com', 'test @example.com'];

      invalidEmails.forEach((email) => {
        act(() => {
          result.current.setValue('email', email);
          result.current.validate('email');
        });

        expect(result.current.errors.email).toBe('Invalid email format');
      });
    });
  });

  describe('Custom Validation (5 tests)', () => {
    it('should validate custom rule', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('password', 'lowercase123');
        result.current.validate('password');
      });

      expect(result.current.errors.password).toBe('Must contain uppercase');
    });

    it('should pass all custom rules', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('password', 'Password123');
        result.current.validate('password');
      });

      expect(result.current.errors.password).toBeUndefined();
    });

    it('should return first failing custom rule', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('password', 'password');
        result.current.validate('password');
      });

      expect(result.current.errors.password).toBe('Must contain uppercase');
    });

    it('should validate number requirement', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('password', 'Password');
        result.current.validate('password');
      });

      expect(result.current.errors.password).toBe('Must contain number');
    });

    it('should handle undefined return as valid', () => {
      const { result } = renderHook(() =>
        useFormValidation({ initialValues, rules })
      );

      act(() => {
        result.current.setValue('password', 'ValidPass123');
        result.current.validate('password');
      });

      expect(result.current.errors.password).toBeUndefined();
    });
  });
});
