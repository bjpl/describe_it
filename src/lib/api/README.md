# Type-Safe API Client

A comprehensive, type-safe API client for the Describe It application with Result-based error handling, request/response interceptors, and full TypeScript support.

## Features

- **Full Type Safety**: No `any` types, complete TypeScript inference
- **Result Pattern**: Functional error handling inspired by Rust's `Result<T, E>`
- **Request/Response Interceptors**: Extensible middleware for requests and responses
- **Automatic Retries**: Configurable exponential backoff retry logic
- **AbortController Support**: Request cancellation via AbortSignal
- **Validation**: Built-in request/response validation with custom rules
- **Modular Architecture**: Separate API modules for vocabulary, descriptions, sessions

## Quick Start

```typescript
import { createTypeSafeClient, isOk } from '@/lib/api';

// Create client instance
const api = createTypeSafeClient({
  base_url: '/api',
  api_key: 'your-api-key', // Optional
  timeout_ms: 30000,
  retry: {
    max_attempts: 3,
    delay_ms: 1000,
    backoff_factor: 2,
  },
});

// Use Result-based error handling
const result = await api.vocabulary.list({ page: 1, limit: 20 });

if (isOk(result)) {
  console.log('Vocabulary items:', result.data.data);
  console.log('Pagination:', result.data.pagination);
} else {
  console.error('Error:', result.error.message);
  console.error('Code:', result.error.code);
}
```

## API Modules

### Vocabulary API

```typescript
// List vocabulary with filters
const vocabResult = await api.vocabulary.list({
  user_id: 'user-123',
  difficulty_level: 5,
  category: 'verbs',
  page: 1,
  limit: 20,
  sort_by: 'mastery_level',
  sort_order: 'desc'
});

// Get single item
const itemResult = await api.vocabulary.get('vocab-id-123');

// Create new vocabulary
const createResult = await api.vocabulary.create({
  spanish_text: 'hablar',
  english_translation: 'to speak',
  category: 'verbs',
  difficulty_level: 3,
  part_of_speech: 'verb',
  context_sentence_spanish: 'Me gusta hablar español',
});

// Update vocabulary
const updateResult = await api.vocabulary.update('vocab-id-123', {
  mastery_level: 8,
  user_notes: 'Common verb, easy to remember',
});

// Delete vocabulary
const deleteResult = await api.vocabulary.delete('vocab-id-123');

// Search vocabulary
const searchResult = await api.vocabulary.search({
  query: 'speak',
  user_id: 'user-123',
  limit: 10,
});

// Bulk create
const bulkResult = await api.vocabulary.bulkCreate({
  items: [
    { spanish_text: 'hablar', english_translation: 'to speak', ... },
    { spanish_text: 'comer', english_translation: 'to eat', ... },
  ],
});
```

### Descriptions API

```typescript
// Generate AI-powered description
const genResult = await api.descriptions.generate({
  image_url: 'https://example.com/image.jpg',
  style: 'narrativo',
  difficulty_level: 'intermediate',
  language: 'es',
});

// List descriptions
const listResult = await api.descriptions.list({
  user_id: 'user-123',
  is_completed: true,
  page: 1,
  limit: 10,
});

// Create description
const createResult = await api.descriptions.create({
  image_id: 'img-123',
  style: 'poetico',
  content_spanish: '...',
  content_english: '...',
  difficulty_level: 'advanced',
});

// Update description
const updateResult = await api.descriptions.update('desc-id-123', {
  is_completed: true,
  user_rating: 5,
});
```

### Sessions API

```typescript
// Create learning session
const sessionResult = await api.sessions.create({
  user_id: 'user-123',
  session_type: 'flashcards',
});

// Update session progress
const progressResult = await api.sessions.update('session-id-123', {
  total_items: 20,
  correct_answers: 15,
  incorrect_answers: 5,
  time_spent_seconds: 300,
});

// Complete session
const completeResult = await api.sessions.complete('session-id-123', {
  total_items: 20,
  correct_answers: 15,
  incorrect_answers: 5,
  time_spent_seconds: 300,
});

// Get active sessions
const activeResult = await api.sessions.getActiveSessions('user-123');

// Get session statistics
const statsResult = await api.sessions.getStats('user-123');
```

## Result Pattern

The client uses a Result pattern for type-safe error handling:

```typescript
import { isOk, isErr, unwrap, unwrapOr, map } from '@/lib/api';

const result = await api.vocabulary.get('id-123');

// Type guard checking
if (isOk(result)) {
  const vocab = result.data; // Type: VocabularyItem
  console.log(vocab.spanish_text);
}

if (isErr(result)) {
  const error = result.error; // Type: ApiError
  console.error(error.message);
}

// Unwrap (throws if error)
const vocab = unwrap(result);

// Unwrap with default
const vocab = unwrapOr(result, defaultVocab);

// Map successful results
const spanishText = map(result, vocab => vocab.spanish_text);
```

## Interceptors

Add custom behavior to requests and responses:

```typescript
import { createTypeSafeClient } from '@/lib/api';

const api = createTypeSafeClient();

// Add authentication header
api.addRequestInterceptor((config) => {
  config.headers['Authorization'] = `Bearer ${getToken()}`;
  return config;
});

// Log all responses
api.addResponseInterceptor((response, data) => {
  console.log('Response:', response.status, data);
  return data;
});

// Transform errors
api.addErrorInterceptor((error) => {
  if (error.status === 401) {
    // Handle auth error
    redirectToLogin();
  }
  return error;
});
```

## Validation

Validate request data before sending:

```typescript
import { validate, rules } from '@/lib/api';

const schema = {
  spanish_text: [
    rules.required('Spanish text'),
    rules.minLength(1, 'Spanish text'),
    rules.maxLength(100, 'Spanish text'),
  ],
  difficulty_level: [
    rules.required('Difficulty level'),
    rules.min(1, 'Difficulty level'),
    rules.max(10, 'Difficulty level'),
  ],
};

const result = validate(data, schema);

if (isOk(result)) {
  // Data is valid
  await api.vocabulary.create(result.data);
} else {
  // Validation errors
  console.error(result.error.details?.errors);
}
```

## Cancellation

Cancel in-flight requests:

```typescript
const controller = new AbortController();

const result = await api.vocabulary.list(
  { page: 1 },
  { signal: controller.signal }
);

// Cancel the request
controller.abort();
```

## Error Handling

All errors follow a consistent structure:

```typescript
interface ApiError {
  code: string;           // Error code (e.g., 'VALIDATION_ERROR')
  message: string;        // Human-readable message
  details?: Record<string, unknown>;  // Additional error details
  status?: number;        // HTTP status code
  timestamp?: string;     // When error occurred
  path?: string;         // API endpoint path
}
```

Common error codes:
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Auth token invalid/missing
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Request timeout
- `NETWORK_ERROR` - Network connectivity issue
- `SERVER_ERROR` - Internal server error

## TypeScript Types

All types are fully exported:

```typescript
import type {
  // Main client
  TypeSafeApiClient,
  TypeSafeClientConfig,

  // Result pattern
  Result,
  ApiErrorResult,

  // Vocabulary
  VocabularyListParams,
  CreateVocabularyDTO,
  UpdateVocabularyDTO,

  // Descriptions
  DescriptionListParams,
  GenerateDescriptionDTO,

  // Sessions
  SessionEntity,
  SessionListParams,
  CreateSessionDTO,

  // Validation
  ValidationRule,
  Schema,

  // Core types
  VocabularyItem,
  Description,
  DifficultyLevel,
  PartOfSpeech,
} from '@/lib/api';
```

## Configuration

Default configuration can be overridden:

```typescript
const api = createTypeSafeClient({
  base_url: '/api',              // API base URL
  api_key: 'key',               // Optional API key
  timeout_ms: 30000,            // Request timeout
  retry: {
    max_attempts: 3,            // Number of retry attempts
    delay_ms: 1000,             // Initial retry delay
    backoff_factor: 2,          // Exponential backoff factor
  },
  headers: {                    // Default headers
    'X-Custom-Header': 'value',
  },
});

// Update configuration later
api.updateConfig({
  timeout_ms: 60000,
});

// Set API key
api.setApiKey('new-api-key');
```

## Architecture

```
src/lib/api/
├── result.ts              # Result type and utilities
├── client-base.ts         # Base HTTP client with interceptors
├── endpoints.ts           # API endpoint definitions
├── validation.ts          # Request/response validation
├── vocabulary.ts          # Vocabulary API module
├── descriptions.ts        # Descriptions API module
├── sessions.ts            # Sessions API module
├── api-client.ts          # Main client aggregator
└── index.ts              # Barrel export
```

## Migration from Legacy Client

The new client is exported alongside the legacy client:

```typescript
// Legacy client (still available)
import { legacyApiClient } from '@/lib/api';

// New type-safe client
import { typeSafeClient } from '@/lib/api';
```

Gradual migration is recommended:
1. Use new client for new features
2. Migrate existing code module by module
3. Remove legacy client once migration complete

## Best Practices

1. **Always use Result pattern**: Check `isOk(result)` before accessing data
2. **Validate user input**: Use validation schemas for forms
3. **Handle errors gracefully**: Provide user-friendly error messages
4. **Use TypeScript inference**: Let TypeScript infer types from API calls
5. **Leverage interceptors**: Add cross-cutting concerns (auth, logging) via interceptors
6. **Configure retries**: Enable retries for transient failures
7. **Use AbortController**: Cancel requests when components unmount

## Examples

See `examples/` directory for complete examples:
- Form validation with vocabulary creation
- Pagination with description lists
- Session management with progress tracking
- Error handling patterns
- React hooks integration
