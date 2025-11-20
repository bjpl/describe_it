/**
 * Type guard functions for runtime type checking
 */

import type { JsonValue, UnknownObject } from './json-types';
import type { ApiResponse } from '../api/response-types';
import type { DatabaseRecord } from '../database/models';
import type { ServiceError } from '../services/service-types';

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value as object).every(isJsonValue);
  }
  return false;
}

export function isUnknownObject(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDatabaseRecord(value: unknown): value is DatabaseRecord {
  return isUnknownObject(value) &&
         typeof value.id === 'string' &&
         typeof value.created_at === 'string' &&
         typeof value.updated_at === 'string';
}

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return isUnknownObject(value) &&
         typeof value.success === 'boolean' &&
         isUnknownObject(value.metadata);
}

export function isServiceError(value: unknown): value is ServiceError {
  return isUnknownObject(value) &&
         typeof value.code === 'string' &&
         typeof value.message === 'string' &&
         typeof value.severity === 'string' &&
         typeof value.recoverable === 'boolean';
}
