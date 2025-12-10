// Core domain layer exports

// Types - primary type definitions
export * from './types';

// Errors - explicit exports to avoid conflicts with types
export {
  // Error classes
  AppError,
  ValidationError as ValidationErrorClass,
  NotFoundError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  isAppError,
  handleError,
} from './errors';

// Result type and utilities
export type { Result } from './errors';
export {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrapOr,
  unwrap,
  fromPromise,
  all,
  tryCatch,
  tryCatchAsync,
} from './errors';

// API handler types (Next.js route handler specific - prefixed to avoid conflicts)
export type {
  ApiResponse as ApiHandlerResponse,
  ApiSuccessResponse as ApiHandlerSuccessResponse,
  ApiErrorResponse as ApiHandlerErrorResponse,
} from './errors';

// API handler utilities
export {
  createSuccessResponse,
  createErrorResponse,
  extractRequestContext,
  withErrorHandling,
  withResultHandling,
  validateRequestBody,
  validateQueryParams,
  withCORS,
  checkRateLimit,
} from './errors';

// Logger utilities
export type { LogLevel, ErrorContext, LogEntry } from './errors';
export { logger, withErrorLogging } from './errors';

// Repositories - explicit exports to avoid QueryOptions conflict with types/api
export {
  BaseRepository,
  VocabularyRepository,
  DescriptionRepository,
  SessionRepository,
} from './repositories';
export type {
  RepositoryConfig,
  VocabularySearchFilters,
  DescriptionFilters,
  SessionFilters,
} from './repositories';

// Services - explicit exports to avoid conflicts with types
export {
  UserService,
  SessionService,
  ProgressService,
  SettingsService,
  VocabularyService,
} from './services';
export type {
  ProgressFilters,
  SettingsData,
} from './services';
