# API Documentation

This document provides comprehensive documentation for all API endpoints in the Describe It application.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Image Search](#image-search)
- [Response Formats](#response-formats)
- [Examples](#examples)

## Overview

The Describe It API provides endpoints for health monitoring and image search functionality. All endpoints return JSON responses and support CORS for cross-origin requests.

**Base URL**: `https://your-domain.com/api`

## Authentication

Currently, the API does not require authentication for public endpoints. However, the image search functionality depends on external service (Unsplash) API keys configured server-side.

## Rate Limiting

Rate limiting is implemented at the service level:
- Health checks: No rate limiting
- Image search: Depends on Unsplash API limits (5000 requests/hour in demo mode)

Rate limit information is included in response headers:
- `X-Rate-Limit-Remaining`: Number of requests remaining
- `X-Response-Time`: Response time in milliseconds

## Error Handling

All errors return a consistent format:

```json
{
  "error": "Error description",
  "details": ["Detailed error information"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200`: Success
- `207`: Multi-Status (partial success, e.g., degraded health)
- `400`: Bad Request (validation errors)
- `429`: Rate limit exceeded
- `500`: Internal Server Error
- `503`: Service Unavailable

## Endpoints

### Health Check

Monitor the health status of the application and its dependencies.

#### Endpoint
```
GET /api/health
```

#### Parameters
None

#### Response

**Success (200 OK)**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.5,
  "version": "2.0",
  "services": {
    "cache": {
      "status": "healthy",
      "responseTime": 15
    },
    "unsplash": {
      "status": "healthy",
      "responseTime": 120
    },
    "logging": {
      "status": "healthy",
      "responseTime": 8
    }
  },
  "performance": {
    "memory": {
      "used": "45MB",
      "total": "128MB",
      "percentage": 35
    },
    "responseTime": 143.25
  },
  "environment": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "buildId": "abc123"
  }
}
```

**Degraded Service (207 Multi-Status)**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "cache": {
      "status": "unhealthy",
      "error": "Connection timeout",
      "responseTime": 5000
    },
    "unsplash": {
      "status": "healthy",
      "responseTime": 120
    },
    "logging": {
      "status": "healthy",
      "responseTime": 8
    }
  }
}
```

#### Headers
- `X-Health-Status`: Overall health status
- `X-Response-Time`: Response time in milliseconds
- `X-Build-ID`: Application build identifier
- `Cache-Control`: `no-cache, no-store, must-revalidate`

#### Status Meanings
- `healthy`: All services operational
- `degraded`: Some services experiencing issues
- `unhealthy`: Critical services down

#### Service Status Values
- `healthy`: Service operational
- `unhealthy`: Service experiencing issues
- `demo`: Service running in demo mode (for Unsplash)

### Image Search

Search for images using the Unsplash API with fallback to demo data.

#### Endpoint
```
GET /api/images/search
OPTIONS /api/images/search (CORS preflight)
HEAD /api/images/search (Prefetch support)
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search term (1-100 characters) |
| `page` | integer | No | 1 | Page number (≥1) |
| `per_page` | integer | No | 20 | Results per page (1-30) |
| `orientation` | string | No | - | Image orientation: `landscape`, `portrait`, `squarish` |
| `color` | string | No | - | Color filter (e.g., `blue`, `red`, `green`) |
| `orderBy` | string | No | `relevant` | Sort order: `relevant`, `latest`, `oldest`, `popular` |

#### Response

**Success (200 OK)**
```json
{
  "images": [
    {
      "id": "abc123",
      "created_at": "2023-12-01T10:30:00Z",
      "updated_at": "2023-12-01T10:30:00Z",
      "width": 1920,
      "height": 1080,
      "color": "#4A90E2",
      "blur_hash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      "description": "Beautiful mountain landscape at sunrise",
      "alt_description": "Snow-capped mountain peak with golden sunrise",
      "likes": 156,
      "liked_by_user": false,
      "urls": {
        "raw": "https://images.unsplash.com/photo-abc123?ixid=...",
        "full": "https://images.unsplash.com/photo-abc123?q=85&fm=jpg&crop=entropy&cs=srgb&ixlib=rb-4.0.3",
        "regular": "https://images.unsplash.com/photo-abc123?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
        "small": "https://images.unsplash.com/photo-abc123?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max",
        "thumb": "https://images.unsplash.com/photo-abc123?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max",
        "small_s3": "https://s3.us-west-2.amazonaws.com/images.unsplash.com/small/photo-abc123"
      },
      "links": {
        "self": "https://api.unsplash.com/photos/abc123",
        "html": "https://unsplash.com/photos/abc123",
        "download": "https://unsplash.com/photos/abc123/download",
        "download_location": "https://api.unsplash.com/photos/abc123/download"
      },
      "user": {
        "id": "user123",
        "username": "photographer_joe",
        "name": "Joe Mountain",
        "first_name": "Joe",
        "last_name": "Mountain",
        "instagram_username": "joe_mountain",
        "twitter_username": "joe_mountain",
        "portfolio_url": "https://joemountain.com",
        "bio": "Professional landscape photographer with 10 years of experience",
        "location": "Yosemite, CA",
        "total_likes": 5420,
        "total_photos": 234,
        "accepted_tos": true,
        "profile_image": {
          "small": "https://images.unsplash.com/profile-user123?ixlib=rb-4.0.3&crop=faces&fit=crop&w=32&h=32",
          "medium": "https://images.unsplash.com/profile-user123?ixlib=rb-4.0.3&crop=faces&fit=crop&w=64&h=64",
          "large": "https://images.unsplash.com/profile-user123?ixlib=rb-4.0.3&crop=faces&fit=crop&w=128&h=128"
        },
        "links": {
          "self": "https://api.unsplash.com/users/photographer_joe",
          "html": "https://unsplash.com/@photographer_joe",
          "photos": "https://api.unsplash.com/users/photographer_joe/photos",
          "likes": "https://api.unsplash.com/users/photographer_joe/likes",
          "portfolio": "https://unsplash.com/@photographer_joe/portfolio"
        }
      },
      "canonicalUrl": "https://images.unsplash.com/photo-abc123?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max",
      "isDuplicate": false
    }
  ],
  "total": 15420,
  "totalPages": 771,
  "currentPage": 1,
  "hasNextPage": true
}
```

**Validation Error (400 Bad Request)**
```json
{
  "error": "Invalid parameters",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 1 character(s)",
      "path": ["query"]
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Service Error with Fallback (500 Internal Server Error)**
```json
{
  "images": [
    {
      "id": "fallback-error",
      "description": "Fallback image due to API error",
      "alt_description": "Error fallback: Beautiful landscape",
      "urls": {
        "regular": "https://picsum.photos/1080/720?seed=fallback",
        "small": "https://picsum.photos/400/300?seed=fallback",
        "thumb": "https://picsum.photos/200/150?seed=fallback"
      },
      "user": {
        "username": "fallback_user",
        "name": "Fallback User"
      }
    }
  ],
  "total": 1,
  "totalPages": 1,
  "currentPage": 1,
  "hasNextPage": false
}
```

#### Headers

**Success Response Headers:**
- `Access-Control-Allow-Origin`: `*`
- `Access-Control-Allow-Methods`: `GET, HEAD, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, If-None-Match`
- `Cache-Control`: `public, max-age=300, stale-while-revalidate=600`
- `X-Cache`: `MISS` or `HIT`
- `X-Response-Time`: Response time in milliseconds
- `X-Rate-Limit-Remaining`: Remaining API calls
- `X-Demo-Mode`: `true` if running in demo mode, `false` otherwise

**Error Response Headers:**
- CORS headers (same as success)
- `X-Response-Time`: Response time in milliseconds
- `X-Error`: `true` for fallback responses
- `X-Cache`: `ERROR-FALLBACK` for service error fallbacks

## Response Formats

### Image Object Structure

Each image in the response contains:

```typescript
interface ProcessedImage {
  id: string
  created_at: string
  updated_at: string
  width: number
  height: number
  color: string
  blur_hash: string
  description: string | null
  alt_description: string | null
  likes: number
  liked_by_user: boolean
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
    small_s3: string
  }
  links: {
    self: string
    html: string
    download: string
    download_location: string
  }
  user: {
    id: string
    username: string
    name: string
    first_name: string
    last_name: string
    instagram_username: string | null
    twitter_username: string | null
    portfolio_url: string | null
    bio: string | null
    location: string | null
    total_likes: number
    total_photos: number
    accepted_tos: boolean
    profile_image: {
      small: string
      medium: string
      large: string
    }
    links: {
      self: string
      html: string
      photos: string
      likes: string
      portfolio: string
    }
  }
  canonicalUrl: string
  isDuplicate: boolean
}
```

## Examples

### Health Check Examples

#### Basic Health Check
```bash
curl -X GET "https://your-domain.com/api/health"
```

#### Health Check with Response Time Monitoring
```bash
curl -X GET "https://your-domain.com/api/health" \
  -w "Response Time: %{time_total}s\n"
```

### Image Search Examples

#### Basic Search
```bash
curl -X GET "https://your-domain.com/api/images/search?query=nature"
```

#### Advanced Search with Filters
```bash
curl -X GET "https://your-domain.com/api/images/search" \
  -G \
  -d "query=mountain landscape" \
  -d "orientation=landscape" \
  -d "color=blue" \
  -d "per_page=10" \
  -d "page=1" \
  -d "orderBy=popular"
```

#### Pagination Example
```bash
# Get first page
curl -X GET "https://your-domain.com/api/images/search?query=sunset&page=1&per_page=20"

# Get second page
curl -X GET "https://your-domain.com/api/images/search?query=sunset&page=2&per_page=20"
```

#### CORS Preflight Check
```bash
curl -X OPTIONS "https://your-domain.com/api/images/search" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"
```

#### JavaScript/Fetch Examples

**Health Check:**
```javascript
const healthCheck = async () => {
  try {
    const response = await fetch('/api/health')
    const data = await response.json()
    
    if (response.ok) {
      console.log('System Status:', data.status)
      console.log('Services:', data.services)
    } else {
      console.error('Health check failed:', data.error)
    }
  } catch (error) {
    console.error('Network error:', error)
  }
}
```

**Image Search:**
```javascript
const searchImages = async (query, page = 1) => {
  try {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: '20',
      orientation: 'landscape'
    })
    
    const response = await fetch(`/api/images/search?${params}`)
    const data = await response.json()
    
    if (response.ok) {
      console.log(`Found ${data.total} images`)
      console.log(`Page ${data.currentPage} of ${data.totalPages}`)
      return data.images
    } else {
      console.error('Search failed:', data.error)
      return []
    }
  } catch (error) {
    console.error('Network error:', error)
    return []
  }
}

// Usage
searchImages('nature photography')
  .then(images => {
    images.forEach(image => {
      console.log(`${image.description} by ${image.user.name}`)
    })
  })
```

#### Error Handling Examples

**Handling Validation Errors:**
```javascript
const searchWithValidation = async (query) => {
  if (!query || query.length === 0) {
    console.error('Query cannot be empty')
    return
  }
  
  if (query.length > 100) {
    console.error('Query too long (max 100 characters)')
    return
  }
  
  try {
    const response = await fetch(`/api/images/search?query=${encodeURIComponent(query)}`)
    const data = await response.json()
    
    if (response.status === 400) {
      console.error('Validation errors:', data.details)
      return
    }
    
    return data
  } catch (error) {
    console.error('Request failed:', error)
  }
}
```

**Handling Service Errors:**
```javascript
const searchWithFallback = async (query) => {
  try {
    const response = await fetch(`/api/images/search?query=${encodeURIComponent(query)}`)
    const data = await response.json()
    
    // Check if we got fallback data due to service error
    const isError = response.headers.get('X-Error') === 'true'
    const isDemo = response.headers.get('X-Demo-Mode') === 'true'
    
    if (isError) {
      console.warn('Using fallback data due to service error')
    } else if (isDemo) {
      console.info('Running in demo mode')
    }
    
    return data
  } catch (error) {
    console.error('Complete request failure:', error)
    return { images: [], total: 0, totalPages: 0, currentPage: 1, hasNextPage: false }
  }
}
```

## Best Practices

1. **Always handle errors gracefully** - Both endpoints provide fallback responses
2. **Use appropriate caching** - Health endpoint has no-cache headers, image search supports caching
3. **Monitor rate limits** - Check `X-Rate-Limit-Remaining` header
4. **Validate input client-side** - Reduce server load by validating before sending requests
5. **Use pagination efficiently** - Don't request more than needed with `per_page`
6. **Handle CORS properly** - Use OPTIONS preflight for complex requests
7. **Monitor performance** - Use `X-Response-Time` header for performance tracking
8. **Respect demo mode limitations** - Fallback gracefully when `X-Demo-Mode` is true

## Testing

Run the comprehensive test suite:

```bash
npm test tests/api/
```

Individual test files:
```bash
npm test tests/api/health.test.ts
npm test tests/api/images-search.test.ts
```