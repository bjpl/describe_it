/**
 * Request/Response Validation
 *
 * Validates API requests and responses against expected schemas.
 */

import { Result, ok, err, createApiError } from './result';
import type { ApiError } from './result';

/**
 * Validation rule function
 */
export type ValidationRule<T = unknown> = (value: T) => string | null;

/**
 * Schema definition for validation
 */
export type Schema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

/**
 * Validation error details
 */
export interface ValidationErrorDetails {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Common validation rules
 */
export const rules = {
  required: (fieldName: string): ValidationRule => (value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  minLength: (min: number, fieldName: string): ValidationRule<string> => (value: string) => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number, fieldName: string): ValidationRule<string> => (value: string) => {
    if (value && value.length > max) {
      return `${fieldName} must be at most ${max} characters`;
    }
    return null;
  },

  min: (min: number, fieldName: string): ValidationRule<number> => (value: number) => {
    if (value !== undefined && value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return null;
  },

  max: (max: number, fieldName: string): ValidationRule<number> => (value: number) => {
    if (value !== undefined && value > max) {
      return `${fieldName} must be at most ${max}`;
    }
    return null;
  },

  email: (fieldName: string): ValidationRule<string> => (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${fieldName} must be a valid email address`;
    }
    return null;
  },

  url: (fieldName: string): ValidationRule<string> => (value: string) => {
    if (value) {
      try {
        new URL(value);
      } catch {
        return `${fieldName} must be a valid URL`;
      }
    }
    return null;
  },

  oneOf: <T>(values: T[], fieldName: string): ValidationRule<T> => (value: T) => {
    if (value !== undefined && !values.includes(value)) {
      return `${fieldName} must be one of: ${values.join(', ')}`;
    }
    return null;
  },

  pattern: (regex: RegExp, fieldName: string, message?: string): ValidationRule<string> => (value: string) => {
    if (value && !regex.test(value)) {
      return message || `${fieldName} format is invalid`;
    }
    return null;
  },

  custom: <T>(fn: (value: T) => boolean, message: string): ValidationRule<T> => (value: T) => {
    if (value !== undefined && !fn(value)) {
      return message;
    }
    return null;
  },
};

/**
 * Validate data against schema
 */
export function validate<T extends Record<string, unknown>>(
  data: T,
  schema: Schema<T>
): Result<T, ApiError> {
  const errors: ValidationErrorDetails[] = [];

  for (const [field, validationRules] of Object.entries(schema)) {
    const value = data[field as keyof T];
    const fieldRules = validationRules as ValidationRule[];

    if (fieldRules) {
      for (const rule of fieldRules) {
        const error = rule(value);
        if (error) {
          errors.push({
            field,
            message: error,
            value,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return err(
      createApiError(
        'VALIDATION_ERROR',
        'Validation failed',
        { errors },
        400
      )
    );
  }

  return ok(data);
}

/**
 * Validate array of items
 */
export function validateArray<T extends Record<string, unknown>>(
  items: T[],
  schema: Schema<T>
): Result<T[], ApiError> {
  const allErrors: Array<{ index: number; errors: ValidationErrorDetails[] }> = [];

  items.forEach((item, index) => {
    const result = validate(item, schema);
    if (!result.success && result.error.details?.errors) {
      allErrors.push({
        index,
        errors: result.error.details.errors as ValidationErrorDetails[],
      });
    }
  });

  if (allErrors.length > 0) {
    return err(
      createApiError(
        'VALIDATION_ERROR',
        `Validation failed for ${allErrors.length} item(s)`,
        { errors: allErrors },
        400
      )
    );
  }

  return ok(items);
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        item && typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
