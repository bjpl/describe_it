/**
 * Common validation patterns and constants
 */

/**
 * Type validation schemas
 */
export const JSON_PRIMITIVES = ['string', 'number', 'boolean', 'null'] as const;
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const DESCRIPTION_STYLES = ['narrativo', 'poetico', 'academico', 'conversacional', 'infantil'] as const;
export const LANGUAGE_CODES = ['en', 'es', 'fr', 'de', 'it', 'pt'] as const;
export const EXPORT_FORMATS = ['json', 'csv', 'xml', 'yaml', 'txt', 'pdf', 'html', 'anki', 'quizlet'] as const;

/**
 * Common regex patterns for validation
 */
export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  SEMVER: /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/,
} as const;
