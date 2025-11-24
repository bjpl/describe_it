# API Versioning Guide

## Overview

This application implements a comprehensive API versioning system that supports multiple API versions simultaneously, allowing clients to migrate at their own pace while maintaining backward compatibility.

## Features

- Multiple version negotiation strategies (URL, headers, content-type)
- Automatic deprecation warnings with sunset dates
- Built-in migration utilities for data transformation
- HATEOAS support in v2
- Cursor-based pagination in v2
- Comprehensive error handling
- TypeScript type safety

## Supported Versions

| Version | Status | Deprecated | Sunset Date | Features                                        |
| ------- | ------ | ---------- | ----------- | ----------------------------------------------- |
| v1      | Active | Yes        | 2025-06-01  | Offset pagination, basic REST                   |
| v2      | Active | No         | -           | Cursor pagination, HATEOAS, enhanced validation |

## Version Negotiation

The API supports multiple ways to specify the desired version:

### 1. URL Path (Recommended)

```bash
GET /api/v1/vocabulary/lists
GET /api/v2/vocabulary/lists
```

### 2. Custom Header

```bash
curl -H "X-API-Version: v2" https://api.example.com/vocabulary/lists
curl -H "Api-Version: v1" https://api.example.com/vocabulary/lists
```

### 3. Accept Header (Content Negotiation)

```bash
curl -H "Accept: application/vnd.describeit.v2+json" \
  https://api.example.com/vocabulary/lists
```

### 4. Query Parameter

```bash
GET /api/vocabulary/lists?version=v2
```

### Priority Order

1. Custom header (`X-API-Version`)
2. URL path (`/api/v1/...`)
3. Accept header (`application/vnd.describeit.v2+json`)
4. Query parameter (`?version=v2`)
5. Default version (v1)

## Version Differences

### Pagination

**V1 - Offset-based:**

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "offset": 0,
    "limit": 50,
    "hasMore": true
  }
}
```

**V2 - Cursor-based:**

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "cursor": "eyJvZmZzZXQiOjUwfQ==",
    "hasMore": true,
    "_links": {
      "self": "/api/v2/vocabulary/lists",
      "first": "/api/v2/vocabulary/lists",
      "next": "/api/v2/vocabulary/lists?cursor=eyJvZmZzZXQiOjUwfQ=="
    }
  }
}
```

### Response Format

**V1 - Simple:**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Spanish Basics",
    "language": "es",
    "difficulty_level": 1,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**V2 - Structured with HATEOAS:**

```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Spanish Basics",
    "metadata": {
      "language": "es",
      "difficultyLevel": 1,
      "tags": ["beginner"]
    },
    "timestamps": {
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    "_links": {
      "self": "/api/v2/vocabulary/lists/1",
      "items": "/api/v2/vocabulary/lists/1/items"
    }
  }
}
```

### Error Handling

**V1 - Basic:**

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "Validation failed"
}
```

**V2 - Structured:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [...]
  }
}
```

## Deprecation Warnings

When using a deprecated API version, the response includes:

### Headers

```http
Deprecation: true
Sunset: Thu, 01 Jun 2025 00:00:00 GMT
Warning: 299 - "API version v1 is deprecated. Please migrate to v2."
Link: </docs/migration/v1-to-v2>; rel="deprecation"
X-API-Version: v1
X-API-Latest-Version: v2
```

### Response Body (Optional)

```json
{
  "success": true,
  "data": [...],
  "_deprecation": {
    "deprecated": true,
    "version": "v1",
    "deprecatedAt": "2025-01-01T00:00:00Z",
    "sunsetAt": "2025-06-01T00:00:00Z",
    "message": "API v1 is deprecated. Please migrate to v2.",
    "migrationGuide": "/docs/migration/v1-to-v2",
    "latestVersion": "v2"
  }
}
```

## Migration Guide: V1 to V2

### Step 1: Update API URLs

**Before (V1):**

```javascript
const response = await fetch('/api/v1/vocabulary/lists');
```

**After (V2):**

```javascript
const response = await fetch('/api/v2/vocabulary/lists');
```

### Step 2: Update Response Handling

**Before (V1):**

```javascript
const data = await response.json();
const lists = data.data;
const nextOffset = data.pagination.offset + data.pagination.limit;
```

**After (V2):**

```javascript
const data = await response.json();
const lists = data.data;
const nextCursor = data.pagination.cursor;
// Use HATEOAS links
const nextUrl = data.pagination._links.next;
```

### Step 3: Update Data Structure Access

**Before (V1):**

```javascript
const difficulty = list.difficulty_level;
const createdAt = list.created_at;
```

**After (V2):**

```javascript
const difficulty = list.metadata.difficultyLevel;
const createdAt = list.timestamps.createdAt;
```

### Step 4: Use HATEOAS Links

**V2 Only:**

```javascript
// Navigate using hypermedia links
const itemsUrl = list._links.items;
const items = await fetch(itemsUrl).then(r => r.json());
```

## Usage Examples

### Creating a Versioned Endpoint

```typescript
// src/app/api/vocabulary/lists/route.ts
import { createVersionRouter } from '@/api/middleware/versionRouter';
import { handleV1GetLists } from '@/api/examples/v1/vocabularyLists';
import { handleV2GetLists } from '@/api/examples/v2/vocabularyLists';

export const GET = createVersionRouter(
  {
    v1: handleV1GetLists,
    v2: handleV2GetLists,
  },
  {
    includeDeprecationWarnings: true,
    includeVersionHeaders: true,
    logVersionNegotiation: true,
  }
);
```

### Using Migration Utilities

```typescript
import { migrateData, registerMigration } from '@/api/utils/migration';

// Register custom migration
registerMigration('v1', 'v2', data => {
  return {
    ...data,
    metadata: {
      language: data.language,
      difficultyLevel: data.difficulty_level,
    },
    timestamps: {
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
});

// Use migration
const v2Data = await migrateData(v1Data, 'v1', 'v2');
```

### Version-Aware Client

```typescript
import { negotiateVersion } from '@/api/versioning/negotiator';

async function fetchWithVersion(url: string, version: 'v1' | 'v2') {
  const response = await fetch(url, {
    headers: {
      'X-API-Version': version,
      Accept: `application/vnd.describeit.${version}+json`,
    },
  });

  const apiVersion = response.headers.get('X-API-Version');
  const isDeprecated = response.headers.get('Deprecation') === 'true';

  if (isDeprecated) {
    console.warn('Using deprecated API version:', apiVersion);
    const sunsetDate = response.headers.get('Sunset');
    console.warn('Sunset date:', sunsetDate);
  }

  return response.json();
}
```

## Best Practices

### 1. Always Specify Version

Don't rely on the default version. Always explicitly specify the version you want:

```typescript
// Good
fetch('/api/v2/vocabulary/lists');

// Avoid
fetch('/api/vocabulary/lists'); // Uses default v1
```

### 2. Handle Deprecation Warnings

Monitor deprecation headers and plan migrations:

```typescript
if (response.headers.get('Deprecation') === 'true') {
  const sunset = new Date(response.headers.get('Sunset'));
  const daysUntilSunset = Math.ceil((sunset - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntilSunset < 30) {
    console.error('API version will sunset soon!');
  }
}
```

### 3. Use Type Guards

```typescript
function isV1Response(data: any): data is V1Response {
  return 'difficulty_level' in data && 'created_at' in data;
}

function isV2Response(data: any): data is V2Response {
  return 'metadata' in data && 'timestamps' in data;
}
```

### 4. Implement Graceful Degradation

```typescript
async function fetchLists() {
  try {
    // Try v2 first
    return await fetchWithVersion('/api/vocabulary/lists', 'v2');
  } catch (error) {
    // Fall back to v1
    console.warn('V2 failed, falling back to v1');
    return await fetchWithVersion('/api/vocabulary/lists', 'v1');
  }
}
```

## Testing

### Test Version Negotiation

```typescript
import { negotiateVersion } from '@/api/versioning/negotiator';

test('negotiates version from URL', () => {
  const request = new Request('http://localhost/api/v2/users');
  const result = negotiateVersion(request);

  expect(result.version).toBe('v2');
  expect(result.source).toBe('url');
});
```

### Test Migration

```typescript
import { migrateData } from '@/api/utils/migration';

test('migrates v1 to v2', async () => {
  const v1Data = {
    id: '1',
    difficulty_level: 2,
    created_at: '2025-01-01T00:00:00Z',
  };

  const v2Data = await migrateData(v1Data, 'v1', 'v2');

  expect(v2Data.metadata.difficultyLevel).toBe(2);
  expect(v2Data.timestamps.createdAt).toBe('2025-01-01T00:00:00Z');
});
```

## Support

For questions or issues with API versioning:

- Review this documentation
- Check deprecation headers in responses
- Consult the migration guide
- Review example implementations in `/src/api/examples/`

## Changelog

### v2.0.0 (Current)

- Cursor-based pagination
- HATEOAS support
- Enhanced validation
- Structured error responses
- Better TypeScript support

### v1.0.0 (Deprecated)

- Offset-based pagination
- Basic REST API
- Simple error handling
- Backward compatibility maintained until 2025-06-01
