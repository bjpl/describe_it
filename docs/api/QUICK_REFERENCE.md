# API Quick Reference

## Base URLs
- **Production**: `https://describe-it-lovat.vercel.app/api`
- **Development**: `http://localhost:3000/api`

## Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/signup` | POST | No | Create new user account |
| `/auth/signin` | POST | No | Sign in existing user |

## Core Endpoints

### Descriptions
- **POST** `/descriptions/generate` - Generate AI descriptions (English + Spanish)
  - Body: `{ imageUrl, style, maxLength }`
  - Auth: Required

### Vocabulary
- **POST** `/vocabulary/save` - Save vocabulary items
  - Body: `{ vocabulary, collectionName }`
  - Auth: Required
- **GET** `/vocabulary/save?collectionName=&difficulty=` - Retrieve vocabulary
  - Auth: Required

### Images
- **GET** `/images/search?query=&per_page=` - Search Unsplash images
  - Auth: Required

### Q&A
- **POST** `/qa/generate` - Generate comprehension questions
  - Body: `{ description, language, count }`
  - Auth: Required

### Progress
- **POST** `/progress/track` - Track learning event
  - Body: `{ eventType, eventData }`
  - Auth: Required
- **GET** `/progress/track?sessionId=&aggregation=` - Get progress data
  - Auth: Required

## Quick Examples

### Sign Up
```bash
curl -X POST https://describe-it-lovat.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","firstName":"John","lastName":"Doe"}'
```

### Generate Description
```bash
curl -X POST https://describe-it-lovat.vercel.app/api/descriptions/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg","style":"narrativo","maxLength":300}'
```

### Save Vocabulary
```bash
curl -X POST https://describe-it-lovat.vercel.app/api/vocabulary/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vocabulary":{"id":"vocab_123","phrase":"el gato","definition":"The cat","category":"animals","difficulty":"beginner"},"collectionName":"spanish-basics"}'
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "responseTime": "150.25ms",
    "timestamp": "2025-01-01T12:00:00Z",
    "requestId": "uuid"
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "errors": [{"field": "fieldName", "message": "Specific error"}],
  "metadata": {"timestamp": "2025-01-01T12:00:00Z"}
}
```

## HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request processed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid parameters or JSON |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Insufficient permissions |
| 413 | Payload Too Large | Image or request too large (>20MB) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error (retry recommended) |

## Rate Limits

| Tier | Requests/Hour | Descriptions/Day |
|------|---------------|------------------|
| Free | 100 | 50 |
| Pro | 1000 | 500 |
| Enterprise | Unlimited | Unlimited |

## Need More Details?

- **Full API Guide**: See `API_GUIDE.md` for detailed documentation
- **OpenAPI Spec**: See `openapi.yaml` for complete API specification
- **Support**: brandon.lambert87@gmail.com
