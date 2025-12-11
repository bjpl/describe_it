# Describe It API Documentation

**Last Updated:** December 11, 2025
**Status:** Production Ready

## Overview

The Describe It API provides comprehensive language learning functionality through image-based content generation. This RESTful API enables image search, AI-powered description generation, interactive Q&A creation, phrase extraction, vocabulary management, progress tracking, and multi-format data export.

## Base URL

- **Production:** `https://describe-it.vercel.app/api`
- **Development:** `http://localhost:3000/api`

## Key Features

- 🖼️ **Image Search** - Unsplash integration with demo fallback
- 🧠 **AI Descriptions** - Multi-language, multi-style content generation
- ❓ **Q&A Generation** - Interactive learning content
- 📝 **Phrase Extraction** - Smart categorization and difficulty levels
- 📚 **Vocabulary Management** - Persistent storage with spaced repetition
- 📊 **Progress Tracking** - Detailed analytics and achievements
- 📤 **Export System** - Multiple formats (JSON, CSV, PDF, Anki, Quizlet)
- 🏥 **Health Monitoring** - Real-time system status

## Authentication

Most endpoints support **demo mode** and work without authentication. API keys can be provided via:

- Query parameter: `?api_key=your_key`
- Header: `X-API-Key: your_key`

### API Keys

- **Unsplash API Key** - For real image search (optional)
- **OpenAI API Key** - For AI content generation (optional)
- **Supabase Keys** - For persistent storage (optional)

All services gracefully fallback to demo mode when API keys are unavailable.

## Rate Limiting

| Endpoint Type | Rate Limit    | Window |
| ------------- | ------------- | ------ |
| Image Search  | 50 requests   | 1 hour |
| AI Generation | 100 requests  | 1 hour |
| Export        | 10 requests   | 1 hour |
| General       | 1000 requests | 1 hour |

Rate limit headers are included in responses:

- `X-Rate-Limit-Remaining`
- `Retry-After` (when limited)

## Response Format

All API responses follow a consistent structure:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "metadata": {
    "responseTime": "125.45ms",
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req-uuid-123",
    "demoMode": false,
    "version": "2.0.0"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "User-friendly error message",
  "details": "Additional error details",
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req-uuid-123",
  "retry": true
}
```

## Endpoints

### 1. Image Search

Search for images using the Unsplash API or curated demo images.

**Endpoint:** `GET /images/search`

**Parameters:**

- `query` (required) - Search term (1-100 characters)
- `page` (optional) - Page number (default: 1)
- `per_page` (optional) - Results per page (1-30, default: 20)
- `orientation` (optional) - `landscape`, `portrait`, `squarish`
- `color` (optional) - Color filter
- `orderBy` (optional) - `relevant`, `latest`, `oldest`, `popular`
- `api_key` (optional) - Your Unsplash access key

**Example Request:**

```bash
GET /api/images/search?query=mountain%20landscape&page=1&per_page=10&orientation=landscape
```

**Example Response:**

```json
{
  "images": [
    {
      "id": "abc123",
      "urls": {
        "small": "https://images.unsplash.com/photo-123/400x300",
        "regular": "https://images.unsplash.com/photo-123/1080x720",
        "full": "https://images.unsplash.com/photo-123/2000x1500"
      },
      "alt_description": "A beautiful mountain landscape at sunset",
      "user": {
        "name": "John Photographer",
        "username": "johnphoto"
      },
      "width": 2000,
      "height": 1500,
      "color": "#4A90E2",
      "likes": 245,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1250,
  "totalPages": 63,
  "currentPage": 1,
  "hasNextPage": true
}
```

**Headers:**

- `X-Cache: HIT|MISS|STALE-ERROR|ERROR-FALLBACK`
- `X-Demo-Mode: true|false`
- `ETag: "cache-identifier"`
- `Cache-Control: public, max-age=300, stale-while-revalidate=600`

### 2. Description Generation

Generate AI-powered descriptions in multiple languages and styles.

**Endpoint:** `POST /descriptions/generate`

**Request Body:**

```json
{
  "imageUrl": "https://images.unsplash.com/photo-123",
  "style": "conversacional",
  "maxLength": 200,
  "customPrompt": "Focus on the emotional impact"
}
```

**Styles:**

- `narrativo` - Storytelling approach
- `poetico` - Poetic and artistic
- `academico` - Educational and formal
- `conversacional` - Casual and friendly
- `infantil` - Child-appropriate language

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "1704123456789_en",
      "imageId": "https://images.unsplash.com/photo-123",
      "style": "conversacional",
      "content": "This captivating landscape showcases rolling mountains bathed in golden sunlight...",
      "language": "english",
      "createdAt": "2024-01-01T12:00:00Z"
    },
    {
      "id": "1704123456790_es",
      "imageId": "https://images.unsplash.com/photo-123",
      "style": "conversacional",
      "content": "Este paisaje cautivador muestra montañas ondulantes bañadas en luz dorada...",
      "language": "spanish",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "metadata": {
    "responseTime": "2.8s",
    "demoMode": false,
    "requestId": "req-123"
  }
}
```

**Security Features:**

- Request size validation (50KB limit)
- Security header validation
- Rate limiting protection
- Content-Type restrictions

### 3. Q&A Generation

Generate question and answer pairs from descriptions for interactive learning.

**Endpoint:** `POST /qa/generate`

**Request Body:**

```json
{
  "description": "Una hermosa montaña con nieve en la cima y árboles verdes en la base.",
  "language": "es",
  "count": 5
}
```

**Parameters:**

- `description` (required) - Text to generate Q&A from (min 10 chars)
- `language` (optional) - `es` or `en` (default: `es`)
- `count` (optional) - Number of Q&A pairs (1-10, default: 5)

**Example Response:**

```json
{
  "questions": [
    {
      "id": "qa-1",
      "question": "¿Qué se puede ver en la cima de la montaña?",
      "answer": "Se puede ver nieve en la cima de la montaña.",
      "difficulty": "beginner",
      "type": "comprehension",
      "language": "es"
    },
    {
      "id": "qa-2",
      "question": "¿De qué color son los árboles en la base?",
      "answer": "Los árboles en la base son verdes.",
      "difficulty": "beginner",
      "type": "detail",
      "language": "es"
    }
  ],
  "metadata": {
    "count": 2,
    "language": "es",
    "generatedAt": "2024-01-01T12:00:00Z",
    "source": "openai-gpt-4"
  }
}
```

**Question Types:**

- `comprehension` - Understanding questions
- `detail` - Specific detail questions
- `inference` - Inferential questions
- `analysis` - Analytical questions

### 4. Phrase Extraction

Extract and categorize key phrases with definitions and context.

**Endpoint:** `POST /phrases/extract`

**Request Body:**

```json
{
  "imageUrl": "https://images.unsplash.com/photo-123",
  "descriptionText": "Una montaña majestuosa se alza contra el cielo azul",
  "style": "conversacional",
  "targetLevel": "intermediate",
  "maxPhrases": 10,
  "categories": ["sustantivos", "adjetivos", "verbos"]
}
```

**Parameters:**

- `imageUrl` (required) - Associated image URL
- `descriptionText` (required) - Text to extract from (min 10 chars)
- `style` (optional) - Description style (default: `conversacional`)
- `targetLevel` (optional) - `beginner`, `intermediate`, `advanced`
- `maxPhrases` (optional) - Maximum phrases (1-25, default: 15)
- `categories` (optional) - Specific categories to extract

**Categories:**

- `sustantivos` - Nouns
- `verbos` - Verbs
- `adjetivos` - Adjectives
- `adverbios` - Adverbs
- `frasesClaves` - Key phrases

**Example Response:**

```json
{
  "phrases": [
    {
      "id": "phrase_1704123456_1_abc123",
      "phrase": "montaña majestuosa",
      "definition": "A magnificent or impressive mountain",
      "partOfSpeech": "noun phrase",
      "difficulty": "intermediate",
      "context": "Una montaña majestuosa domina el paisaje",
      "category": "sustantivos",
      "gender": "femenino",
      "article": "la",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "categorizedPhrases": {
    "sustantivos": [
      {
        "phrase": "montaña",
        "definition": "Large natural elevation of land",
        "gender": "femenino",
        "article": "la"
      }
    ],
    "adjetivos": [
      {
        "phrase": "majestuosa",
        "definition": "Having impressive beauty or dignity"
      }
    ]
  },
  "metadata": {
    "extractionMethod": "enhanced_categorized",
    "totalPhrases": 8,
    "categoryCounts": {
      "sustantivos": 3,
      "adjetivos": 2,
      "verbos": 3
    },
    "targetLevel": "intermediate",
    "responseTime": "1.2s"
  }
}
```

### 5. Vocabulary Management

Save and retrieve vocabulary items with intelligent categorization.

#### Save Vocabulary

**Endpoint:** `POST /vocabulary/save`

**Single Item:**

```json
{
  "userId": "user123",
  "vocabulary": {
    "id": "vocab-1",
    "phrase": "montaña",
    "definition": "A large natural elevation of the earth's surface",
    "category": "geography",
    "difficulty": "beginner",
    "partOfSpeech": "noun",
    "gender": "femenino",
    "article": "la",
    "examples": ["La montaña es muy alta", "Subimos la montaña"],
    "tags": ["nature", "landscape"]
  },
  "collectionName": "nature-vocabulary",
  "metadata": {
    "source": "phrase-extraction",
    "confidence": 0.95
  }
}
```

**Bulk Save:**

```json
{
  "userId": "user123",
  "vocabularyItems": [
    {
      "phrase": "río",
      "definition": "A natural watercourse",
      "category": "geography",
      "difficulty": "beginner"
    },
    {
      "phrase": "bosque",
      "definition": "A large area covered with trees",
      "category": "geography",
      "difficulty": "beginner"
    }
  ],
  "collectionName": "nature-collection"
}
```

#### Retrieve Vocabulary

**Endpoint:** `GET /vocabulary/save`

**Parameters:**

- `userId` (optional) - User identifier (default: "anonymous")
- `collectionName` (optional) - Filter by collection
- `category` (optional) - Filter by category
- `difficulty` (optional) - Filter by difficulty level
- `tags` (optional) - Filter by tags (multiple values)
- `limit` (optional) - Items per page (1-100, default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `sortBy` (optional) - Sort field (default: `createdAt`)
- `sortOrder` (optional) - `asc` or `desc` (default: `desc`)

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "vocab-1",
      "phrase": "montaña",
      "definition": "A large natural elevation",
      "category": "geography",
      "difficulty": "beginner",
      "userId": "user123",
      "collectionName": "nature-vocabulary",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "metadata": {
        "reviewCount": 3,
        "masteryLevel": 0.7,
        "lastReviewed": "2024-01-05T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "offset": 0,
    "limit": 50,
    "hasMore": true
  },
  "stats": {
    "totalItems": 150,
    "difficultyCounts": {
      "beginner": 75,
      "intermediate": 60,
      "advanced": 15
    },
    "categoryCounts": {
      "geography": 45,
      "nature": 38,
      "weather": 22
    }
  }
}
```

### 6. Progress Tracking

Track learning progress with detailed analytics and achievements.

#### Track Progress Event

**Endpoint:** `POST /progress/track`

**Request Body:**

```json
{
  "userId": "user123",
  "sessionId": "session-456",
  "eventType": "vocabulary_learned",
  "eventData": {
    "vocabularyId": "vocab-789",
    "difficulty": "intermediate",
    "category": "nature",
    "timeSpent": 45,
    "confidence": 0.8,
    "score": 0.9,
    "attempts": 2,
    "correct": true
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Event Types:**

- `vocabulary_learned` - New vocabulary acquired
- `vocabulary_reviewed` - Vocabulary reviewed
- `vocabulary_mastered` - Vocabulary mastered
- `qa_answered` - Question answered
- `qa_correct` - Correct answer given
- `qa_incorrect` - Incorrect answer given
- `phrase_learned` - New phrase learned
- `session_started` - Learning session began
- `session_completed` - Learning session finished
- `goal_achieved` - Learning goal reached

#### Retrieve Progress Data

**Endpoint:** `GET /progress/track`

**Parameters:**

- `userId` (optional) - User identifier
- `sessionId` (optional) - Specific session
- `eventType` (optional) - Filter by event types
- `aggregation` (optional) - `daily`, `weekly`, `monthly`
- `dateFrom` / `dateTo` (optional) - Date range

**Example Response:**

```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "totalEvents": 245,
    "firstActivity": "2024-01-01T10:00:00Z",
    "lastActivity": "2024-01-15T16:30:00Z",
    "streaks": {
      "current": 7,
      "longest": 14
    },
    "categories": {
      "geography": 85,
      "nature": 65,
      "weather": 45
    },
    "difficulties": {
      "beginner": 120,
      "intermediate": 90,
      "advanced": 35
    },
    "achievements": [
      {
        "id": "first_word",
        "title": "First Steps",
        "unlockedAt": "2024-01-01T10:15:00Z"
      },
      {
        "id": "streak_7",
        "title": "Week Warrior",
        "unlockedAt": "2024-01-08T14:20:00Z"
      }
    ],
    "scores": {
      "total": 195.5,
      "count": 245,
      "average": 0.798
    },
    "timeSpent": 14400
  }
}
```

### 7. User Settings

Manage comprehensive user preferences and configuration.

#### Save Settings

**Endpoint:** `POST /settings/save`

**Request Body:**

```json
{
  "userId": "user123",
  "settings": {
    "language": {
      "primary": "es",
      "secondary": "en",
      "learningDirection": "primary_to_secondary"
    },
    "difficulty": {
      "preferred": "intermediate",
      "adaptive": true,
      "autoAdjust": false
    },
    "content": {
      "style": "conversacional",
      "maxPhrases": 12,
      "maxQuestions": 8,
      "includeTranslations": true,
      "questionTypes": ["multiple_choice", "open_ended", "fill_blank"]
    },
    "interface": {
      "theme": "dark",
      "fontSize": "large",
      "animations": true,
      "showProgress": true
    },
    "privacy": {
      "saveProgress": true,
      "analytics": false,
      "dataRetention": 180
    }
  }
}
```

#### Retrieve Settings

**Endpoint:** `GET /settings/save`

**Parameters:**

- `userId` (optional) - User identifier
- `section` (optional) - Specific section only
- `includeDefaults` (optional) - Include default values (default: true)

#### Reset Settings

**Endpoint:** `DELETE /settings/save`

**Parameters:**

- `userId` (required) - User identifier
- `section` (optional) - Specific sections to reset

### 8. Data Export

Export user data in multiple formats for backup and integration.

**Endpoint:** `POST /export/generate`

**Request Body:**

```json
{
  "userId": "user123",
  "exportType": "json",
  "contentType": "vocabulary",
  "filters": {
    "difficulty": "intermediate",
    "category": "nature",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-15",
    "includeMetadata": true,
    "includeProgress": false
  },
  "formatting": {
    "template": "detailed",
    "includeDefinitions": true,
    "includeExamples": true,
    "includeTranslations": false,
    "language": "es"
  }
}
```

**Export Types:**

- `json` - JSON format for programmatic use
- `csv` - CSV for spreadsheet applications
- `txt` - Plain text format
- `pdf` - PDF document (returns HTML for conversion)
- `anki` - Anki flashcard format
- `quizlet` - Quizlet import format

**Content Types:**

- `vocabulary` - Vocabulary items only
- `phrases` - Extracted phrases only
- `qa` - Question and answer pairs
- `progress` - Learning progress data
- `all` - All content types

**Example Response:**

```json
{
  "success": true,
  "data": {
    "data": "{ \"vocabulary\": [...] }",
    "filename": "vocabulary_export_1704123456789.json",
    "contentType": "application/json",
    "size": 15420,
    "downloadUrl": "/api/export/download/vocabulary_export_1704123456789.json"
  },
  "metadata": {
    "exportType": "json",
    "contentType": "vocabulary",
    "fromCache": false,
    "responseTime": "234ms"
  }
}
```

**Download Export:**

```bash
GET /api/export/generate?filename=export_123.json&format=attachment
```

### 9. System Health

Monitor system health and service status.

#### Detailed Health Check

**Endpoint:** `GET /health`

**Parameters:**

- `detailed` (optional) - Perform comprehensive checks (default: false)

**Example Response:**

```json
{
  "status": "ok",
  "healthy": true,
  "demo": false,
  "message": "All services configured",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": [
    {
      "name": "Unsplash API",
      "configured": true,
      "demoMode": false,
      "status": "healthy",
      "responseTime": "45ms",
      "reason": "Connected to Unsplash API",
      "lastCheck": "2024-01-01T12:00:00Z"
    },
    {
      "name": "OpenAI API",
      "configured": true,
      "demoMode": false,
      "status": "healthy",
      "responseTime": "120ms",
      "reason": "Connected to OpenAI API"
    },
    {
      "name": "Supabase Database",
      "configured": false,
      "demoMode": true,
      "status": "degraded",
      "reason": "Using localStorage storage"
    }
  ],
  "overall": {
    "healthy": true,
    "status": "operational"
  }
}
```

#### Quick Status Check

**Endpoint:** `GET /status`

Returns service configuration status without performing API calls.

## Error Handling

The API uses standard HTTP status codes and provides detailed error information:

### HTTP Status Codes

- `200` - Success
- `201` - Created (for POST requests)
- `304` - Not Modified (cached response)
- `400` - Bad Request (validation errors)
- `403` - Forbidden (security/CORS errors)
- `404` - Not Found
- `413` - Request Too Large
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Response Examples

**Validation Error (400):**

```json
{
  "success": false,
  "error": "Invalid request parameters",
  "errors": [
    {
      "field": "query",
      "message": "String must contain at least 1 character(s)",
      "code": "too_small"
    }
  ],
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req-123"
}
```

**Rate Limit Error (429):**

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "timestamp": "2024-01-01T12:00:00Z",
  "retry": true
}
```

**Server Error with Fallback (500):**

```json
{
  "success": true,
  "data": {
    "images": [
      /* fallback demo images */
    ]
  },
  "metadata": {
    "fallback": true,
    "demoMode": true,
    "error": "Service temporarily unavailable"
  }
}
```

## Caching Strategy

The API implements intelligent caching to improve performance and reduce external API calls:

### Cache Headers

- `Cache-Control` - Caching directives
- `ETag` - Entity tag for cache validation
- `If-None-Match` - Client cache validation
- `X-Cache` - Cache status (HIT/MISS/STALE-ERROR/ERROR-FALLBACK)

### Cache Levels

1. **Browser Cache** - Client-side caching with ETag validation
2. **Memory Cache** - In-memory caching for frequently accessed data
3. **Session Cache** - User session-specific caching
4. **KV Cache** - Persistent key-value storage (when available)

### Cache TTL

| Content Type | Memory TTL | Session TTL | KV TTL   |
| ------------ | ---------- | ----------- | -------- |
| Image Search | 5 minutes  | 15 minutes  | 1 hour   |
| Descriptions | 1 hour     | 2 hours     | 24 hours |
| Vocabulary   | 1 hour     | 30 minutes  | 30 days  |
| Settings     | 2 hours    | 1 hour      | 1 year   |
| Progress     | 5 minutes  | 30 minutes  | 90 days  |

## CORS Support

The API supports Cross-Origin Resource Sharing (CORS) with comprehensive security:

### Allowed Origins

- Development: `http://localhost:3000`, `http://127.0.0.1:3000`
- Production: Your deployed domain
- Additional origins via environment configuration

### Allowed Methods

- `GET` - Data retrieval
- `POST` - Data creation/modification
- `PUT` - Data updates
- `DELETE` - Data deletion
- `OPTIONS` - Preflight requests
- `HEAD` - Metadata requests

### Security Headers

All responses include security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`

## Demo Mode

All endpoints gracefully fallback to demo mode when external APIs are unavailable:

### Demo Features

- **Curated Images** - High-quality demo images from Picsum/Lorem Picsum
- **Sample Descriptions** - Pre-generated multilingual descriptions
- **Mock Q&A** - Educational question-answer pairs
- **Demo Phrases** - Categorized phrase examples
- **Simulated Progress** - Realistic progress tracking

### Demo Indicators

- `X-Demo-Mode: true` header
- `demoMode: true` in response metadata
- Demo-specific IDs (prefixed with "demo-")

## SDK and Integration

### TypeScript Types

```typescript
// Available in src/types/api/
export interface ImageSearchResponse {
  images: Image[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
}

export interface Description {
  id: string;
  imageId: string;
  style: DescriptionStyle;
  content: string;
  language: 'english' | 'spanish';
  createdAt: string;
}

export interface VocabularyItem {
  id: string;
  phrase: string;
  definition: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  // ... additional properties
}
```

### API Client

```typescript
// Available in src/lib/api/client.ts
import { ApiClient } from '@/lib/api/client';

const client = new ApiClient({
  baseUrl: 'https://describe-it.vercel.app/api',
  apiKey: 'your-api-key', // optional
});

// Search images
const images = await client.searchImages({
  query: 'mountain landscape',
  page: 1,
  per_page: 10,
});

// Generate descriptions
const descriptions = await client.generateDescriptions({
  imageUrl: 'https://example.com/image.jpg',
  style: 'conversacional',
});

// Save vocabulary
const saved = await client.saveVocabulary({
  userId: 'user123',
  vocabulary: {
    phrase: 'montaña',
    definition: 'A large natural elevation',
  },
});
```

## Best Practices

### Performance Optimization

1. **Use ETags** - Implement client-side cache validation
2. **Batch Requests** - Use bulk endpoints when available
3. **Pagination** - Implement proper pagination for large datasets
4. **Compression** - Enable gzip compression for responses
5. **CDN Caching** - Cache static responses at CDN level

### Error Handling

1. **Graceful Degradation** - Handle demo mode appropriately
2. **Retry Logic** - Implement exponential backoff for retries
3. **Timeout Handling** - Set appropriate request timeouts
4. **Fallback Content** - Prepare fallback content for failures

### Security

1. **API Keys** - Store API keys securely (environment variables)
2. **HTTPS Only** - Always use HTTPS in production
3. **Rate Limiting** - Implement client-side rate limiting
4. **Input Validation** - Validate all user inputs
5. **CORS** - Configure CORS properly for your domain

### Data Management

1. **Local Storage** - Cache frequently used data locally
2. **Sync Strategy** - Implement data synchronization logic
3. **Offline Support** - Handle offline scenarios gracefully
4. **Data Export** - Regular data backups using export endpoints

## Support and Resources

- **OpenAPI Spec**: Available at `/docs/api/openapi.yaml`
- **Postman Collection**: Available at `/docs/api/postman-collection.json`
- **Type Definitions**: Available in `/src/types/api/`
- **Example Code**: Available in `/examples/`

For additional support or questions about the API, please refer to the project documentation or open an issue in the repository.
