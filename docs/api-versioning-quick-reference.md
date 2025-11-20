# API Versioning Quick Reference

## Quick Start

### Specify Version (Choose One)

```bash
# 1. URL Path (Recommended)
GET /api/v2/vocabulary/lists

# 2. Custom Header
curl -H "X-API-Version: v2" /api/vocabulary/lists

# 3. Accept Header
curl -H "Accept: application/vnd.describeit.v2+json" /api/vocabulary/lists

# 4. Query Parameter
GET /api/vocabulary/lists?version=v2
```

## Create Versioned Endpoint

```typescript
import { createVersionRouter } from '@/api';

export const GET = createVersionRouter({
  v1: handleV1,
  v2: handleV2,
});
```

## Common Tasks

### Migrate Data
```typescript
import { migrateData } from '@/api/utils/migration';

const v2Data = await migrateData(v1Data, 'v1', 'v2');
```

### Check Feature
```typescript
import { hasFeature } from '@/api/versioning/utils';

if (hasFeature('v2', 'pagination.cursor')) {
  // Use cursor pagination
}
```

### Detect Version
```typescript
import { negotiateVersion } from '@/api/versioning/negotiator';

const { version, isDeprecated } = negotiateVersion(request);
```

## Version Comparison

| Feature | V1 | V2 |
|---------|----|----|
| Pagination | Offset | Cursor |
| HATEOAS | ❌ | ✅ |
| OAuth2 | ❌ | ✅ |
| ETags | ❌ | ✅ |
| Status | Deprecated | Current |
| Sunset | 2025-06-01 | - |

## Response Formats

### V1
```json
{
  "success": true,
  "data": {
    "id": "1",
    "difficulty_level": 2,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "pagination": {
    "offset": 0,
    "limit": 50
  }
}
```

### V2
```json
{
  "success": true,
  "data": {
    "id": "1",
    "metadata": {
      "difficultyLevel": 2
    },
    "timestamps": {
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "_links": {
      "self": "/api/v2/lists/1"
    }
  },
  "pagination": {
    "cursor": "abc123",
    "_links": {
      "next": "/api/v2/lists?cursor=abc123"
    }
  }
}
```

## Deprecation Headers

```http
Deprecation: true
Sunset: Thu, 01 Jun 2025 00:00:00 GMT
Warning: 299 - "API version v1 is deprecated"
Link: </docs/migration/v1-to-v2>; rel="deprecation"
X-API-Version: v1
X-API-Latest-Version: v2
```

## File Locations

```
/src/api/
├── types/version.ts           # Types
├── versioning/negotiator.ts   # Negotiation
├── middleware/versionRouter.ts # Router
└── utils/migration.ts         # Migration

/docs/
└── api-versioning-guide.md    # Full guide

/tests/api/
└── versioning.test.ts         # Tests
```

## Common Imports

```typescript
// All-in-one
import {
  createVersionRouter,
  negotiateVersion,
  migrateData,
  hasFeature,
} from '@/api';

// Specific
import { createVersionRouter } from '@/api/middleware/versionRouter';
import { migrateData } from '@/api/utils/migration';
```

## Migration Checklist

- [ ] Update URLs to /api/v2/
- [ ] Change `difficulty_level` → `metadata.difficultyLevel`
- [ ] Change `created_at` → `timestamps.createdAt`
- [ ] Update pagination (offset → cursor)
- [ ] Use HATEOAS links
- [ ] Handle structured errors

## Need Help?

- Full Guide: `/docs/api-versioning-guide.md`
- Examples: `/src/api/examples/`
- Tests: `/tests/api/versioning.test.ts`
