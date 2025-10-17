# Describe It API Guide

Complete guide for integrating with the Describe It API - AI-powered image descriptions and language learning platform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Common Use Cases](#common-use-cases)
4. [Endpoint Reference](#endpoint-reference)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)

## Quick Start

### Base URL

```
Production: https://describe-it-lovat.vercel.app/api
Development: http://localhost:3000/api
```

### Authentication

All API requests (except signup/signin) require authentication via:
- **Bearer Token**: Include `Authorization: Bearer {access_token}` header
- **Session Cookie**: Automatically managed by browsers

### Basic Request Example

```bash
curl -X POST https://describe-it-lovat.vercel.app/api/descriptions/generate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "style": "narrativo",
    "maxLength": 300
  }'
```

## Authentication

### Sign Up

Create a new user account to access the API.

**Endpoint:** `POST /auth/signup`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "e32caa0c-9720-492d-9f6f-fb3860f4b563",
    "email": "user@example.com",
    "emailConfirmed": false
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": 1735689600
  },
  "message": "Please check your email to confirm your account"
}
```

### Sign In

Authenticate an existing user.

**Endpoint:** `POST /auth/signin`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signed in successfully!",
  "user": {
    "id": "e32caa0c-9720-492d-9f6f-fb3860f4b563",
    "email": "user@example.com",
    "emailConfirmed": true,
    "lastSignIn": "2025-01-01T12:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": 1735689600
  }
}
```

### Using Authentication Tokens

Include the access token in all authenticated requests:

```bash
curl -X GET https://describe-it-lovat.vercel.app/api/vocabulary/save \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

Or use session cookies (automatically handled by browsers):

```javascript
fetch('https://describe-it-lovat.vercel.app/api/vocabulary/save', {
  credentials: 'include'  // Include cookies
})
```

## Common Use Cases

### 1. Generate Image Descriptions

Generate AI-powered descriptions in multiple languages.

```bash
curl -X POST https://describe-it-lovat.vercel.app/api/descriptions/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/mountain.jpg",
    "style": "narrativo",
    "maxLength": 300
  }'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1735689600000_en",
      "imageId": "https://example.com/mountain.jpg",
      "style": "narrativo",
      "content": "A serene mountain landscape...",
      "language": "english",
      "createdAt": "2025-01-01T12:00:00Z"
    },
    {
      "id": "1735689600001_es",
      "imageId": "https://example.com/mountain.jpg",
      "style": "narrativo",
      "content": "Un paisaje montañoso sereno...",
      "language": "spanish",
      "createdAt": "2025-01-01T12:00:00Z"
    }
  ],
  "metadata": {
    "responseTime": "15234.56ms",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 2. Save Vocabulary Items

Save vocabulary to user's collection.

```bash
curl -X POST https://describe-it-lovat.vercel.app/api/vocabulary/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vocabulary": {
      "id": "vocab_123",
      "phrase": "el gato",
      "definition": "The cat",
      "category": "animals",
      "difficulty": "beginner",
      "examples": ["El gato está en la casa"]
    },
    "collectionName": "spanish-basics"
  }'
```

### 3. Search Images

Search for images using Unsplash integration.

```bash
curl -X GET "https://describe-it-lovat.vercel.app/api/images/search?query=mountain&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Generate Q&A Pairs

Create comprehension questions from descriptions.

```bash
curl -X POST https://describe-it-lovat.vercel.app/api/qa/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A serene mountain landscape...",
    "language": "en",
    "count": 5
  }'
```

### 5. Track Learning Progress

Record learning events for analytics.

```bash
curl -X POST https://describe-it-lovat.vercel.app/api/progress/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "vocabulary_learned",
    "eventData": {
      "vocabularyId": "vocab_123",
      "category": "animals",
      "difficulty": "beginner",
      "timeSpent": 45,
      "masteryLevel": 0.7
    }
  }'
```

## Endpoint Reference

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/signup` | POST | No | Create new user account |
| `/auth/signin` | POST | No | Sign in existing user |

### Description Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/descriptions/generate` | POST | Yes | Generate AI image descriptions |
| `/descriptions/generate` | GET | No | Health check for description service |

### Vocabulary Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/vocabulary/save` | POST | Yes | Save vocabulary items (single or bulk) |
| `/vocabulary/save` | GET | Yes | Retrieve vocabulary items with filters |

### Image Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/images/search` | GET | Yes | Search for images via Unsplash |
| `/images/proxy` | POST | Yes | Proxy external image to base64 |

### Q&A Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/qa/generate` | POST | Yes | Generate Q&A pairs from description |
| `/qa/generate` | GET | No | Get Q&A API information |

### Progress Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/progress/track` | POST | Yes | Track learning event |
| `/progress/track` | GET | Yes | Get user progress data |

## Error Handling

### Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message",
      "code": "error_code"
    }
  ],
  "metadata": {
    "timestamp": "2025-01-01T12:00:00Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Common Error Codes

| Status | Code | Description | Solution |
|--------|------|-------------|----------|
| 400 | `BAD_REQUEST` | Invalid request parameters | Check request format and required fields |
| 401 | `UNAUTHORIZED` | Authentication required | Include valid access token |
| 403 | `FORBIDDEN` | Access denied | Check permissions and subscription tier |
| 413 | `PAYLOAD_TOO_LARGE` | Request payload too large | Reduce image size or request body |
| 429 | `RATE_LIMITED` | Too many requests | Wait before retrying (check Retry-After header) |
| 500 | `INTERNAL_ERROR` | Server error | Retry after waiting period |

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/descriptions/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl: 'https://example.com/image.jpg',
      style: 'narrativo'
    })
  });

  const data = await response.json();

  if (!data.success) {
    if (response.status === 401) {
      // Handle authentication error
      redirectToLogin();
    } else if (response.status === 429) {
      // Handle rate limiting
      const retryAfter = response.headers.get('Retry-After');
      await delay(retryAfter * 1000);
      return retry();
    } else {
      // Handle other errors
      console.error('API Error:', data.error);
      showErrorToUser(data.error);
    }
  }

  return data;
} catch (error) {
  console.error('Network error:', error);
  throw error;
}
```

## Rate Limiting

### Default Limits

| Tier | Requests/Hour | Descriptions/Day | Image Searches/Hour |
|------|---------------|------------------|---------------------|
| Free | 100 | 50 | 50 |
| Pro | 1000 | 500 | 500 |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Rate Limit Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1735689600
Retry-After: 60
```

### Handling Rate Limits

```javascript
function checkRateLimit(response) {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const reset = parseInt(response.headers.get('X-RateLimit-Reset'));

  if (remaining < 10) {
    const resetDate = new Date(reset * 1000);
    console.warn(`Approaching rate limit. Resets at ${resetDate}`);
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After'));
    throw new RateLimitError(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}
```

## Best Practices

### 1. Authentication

- Store access tokens securely (not in localStorage for sensitive apps)
- Implement token refresh logic before expiration
- Use HTTPS only in production
- Handle authentication errors gracefully

### 2. Image Handling

- Compress images before uploading (max 20MB)
- Use base64 data URIs for small images
- Proxy external URLs through `/images/proxy` for CORS issues
- Cache image descriptions to reduce API calls

### 3. Performance Optimization

- Implement request caching where appropriate
- Use pagination for large datasets
- Batch vocabulary saves when possible
- Enable gzip compression for requests/responses

### 4. Error Handling

- Implement exponential backoff for retries
- Log errors with request IDs for debugging
- Provide user-friendly error messages
- Handle network errors separately from API errors

### 5. Security

- Never expose API keys in client-side code
- Validate all user inputs before sending
- Use environment variables for sensitive data
- Implement CSRF protection for state-changing operations

## Code Examples

### JavaScript/TypeScript

```typescript
class DescribeItClient {
  private baseURL = 'https://describe-it-lovat.vercel.app/api';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async generateDescription(imageUrl: string, style: string = 'narrativo') {
    const response = await fetch(`${this.baseURL}/descriptions/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageUrl, style, maxLength: 300 })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async saveVocabulary(vocabulary: any, collectionName: string) {
    const response = await fetch(`${this.baseURL}/vocabulary/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vocabulary, collectionName })
    });

    return await response.json();
  }

  async searchImages(query: string, perPage: number = 20) {
    const params = new URLSearchParams({ query, per_page: perPage.toString() });
    const response = await fetch(`${this.baseURL}/images/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return await response.json();
  }
}

// Usage
const client = new DescribeItClient('your_access_token');
const description = await client.generateDescription('https://example.com/image.jpg');
```

### Python

```python
import requests
from typing import Dict, Any

class DescribeItClient:
    def __init__(self, token: str):
        self.base_url = 'https://describe-it-lovat.vercel.app/api'
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def generate_description(self, image_url: str, style: str = 'narrativo') -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/descriptions/generate',
            headers=self.headers,
            json={
                'imageUrl': image_url,
                'style': style,
                'maxLength': 300
            }
        )
        response.raise_for_status()
        return response.json()

    def save_vocabulary(self, vocabulary: Dict[str, Any], collection_name: str) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/vocabulary/save',
            headers=self.headers,
            json={
                'vocabulary': vocabulary,
                'collectionName': collection_name
            }
        )
        response.raise_for_status()
        return response.json()

    def search_images(self, query: str, per_page: int = 20) -> Dict[str, Any]:
        response = requests.get(
            f'{self.base_url}/images/search',
            headers=self.headers,
            params={'query': query, 'per_page': per_page}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = DescribeItClient('your_access_token')
description = client.generate_description('https://example.com/image.jpg')
```

### cURL Examples

**Generate Description:**
```bash
curl -X POST https://describe-it-lovat.vercel.app/api/descriptions/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "style": "narrativo",
    "maxLength": 300
  }'
```

**Search Images:**
```bash
curl -X GET "https://describe-it-lovat.vercel.app/api/images/search?query=mountain&per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Save Vocabulary:**
```bash
curl -X POST https://describe-it-lovat.vercel.app/api/vocabulary/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vocabulary": {
      "id": "vocab_123",
      "phrase": "el gato",
      "definition": "The cat",
      "category": "animals",
      "difficulty": "beginner"
    },
    "collectionName": "spanish-basics"
  }'
```

## Support

For questions, issues, or feature requests:

- Email: brandon.lambert87@gmail.com
- GitHub Issues: https://github.com/yourusername/describe-it/issues
- API Status: https://describe-it-lovat.vercel.app/api/health

## Changelog

### Version 2.0.0 (Current)
- Migrated to Claude Sonnet 4.5 for improved descriptions
- Added parallel description generation (2x faster)
- Enhanced vocabulary management with Supabase database
- Improved progress tracking and analytics
- Added comprehensive error handling
- Updated authentication with Supabase

### Version 1.0.0
- Initial release with OpenAI GPT-4 Vision
- Basic vocabulary management
- Image search integration
- Q&A generation