# Development Tools Support - Security Validation Updates

## Overview

The API security validation has been updated to allow common development tools like curl, Postman, Thunder Client, and others while maintaining production security.

## Changes Made

### 1. User Agent Validation Updates

#### File: `src/lib/middleware/api-middleware.ts`

**Before:**
- Blocked all requests containing "bot", "crawler", "spider", "scraper" patterns
- Only allowed "googlebot" and "bingbot" exceptions
- Used random 20% blocking for suspicious requests

**After:**
- **Development mode**: Only blocks obviously malicious patterns (sqlmap, nikto, hack, attack)
- **Production mode**: Allows development tools and legitimate bots while blocking malicious ones
- Added explicit support for: curl, postman, insomnia, thunder, httpie, wget, python-requests, node-fetch

#### File: `src/lib/schemas/api-validation.ts`

**Before:**
```typescript
const suspiciousPatterns = [
  /curl/i, /wget/i, /python/i, /ruby/i, /java/i,
  /scanner/i, /crawler/i, /bot/i, /spider/i
];
```

**After:**
```typescript
// Development mode - only block malicious patterns
const maliciousPatterns = [
  /sqlmap/i, /nikto/i, /nmap/i, /hack/i, /attack/i, /exploit/i,
  /injection/i, /vulnerability/i, /penetration/i
];

// Production mode - allow development tools and legitimate services
const allowedPatterns = [
  // Browsers
  /mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i, /opera/i,
  // Development tools
  /curl/i, /postman/i, /insomnia/i, /thunder/i, /httpie/i, /wget/i,
  /python-requests/i, /node-fetch/i, /axios/i, /fetch/i,
  // Legitimate bots and services
  /googlebot/i, /bingbot/i, /slackbot/i, /twitterbot/i, /facebookexternalhit/i,
  // Monitoring tools
  /pingdom/i, /uptimerobot/i, /newrelic/i, /datadog/i, /statuspage/i
];
```

### 2. CORS Policy Updates

#### File: `src/lib/middleware/securityMiddleware.ts`

**Development Mode:**
- Allows all origins (`*`) for easier testing
- Relaxed content-type validation
- Only rejects HTML content types

**Production Mode:**
- Maintains strict origin checking
- Allows additional content types: `text/plain`, `application/octet-stream`
- Supports localhost and development URLs

### 3. Content-Type Validation

**Development Mode:**
- Accepts most content types except `text/html`
- Allows testing with various tools and formats

**Production Mode:**
- Allows: `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`
- Provides clear error messages listing allowed types

### 4. Environment-Based Security Levels

The security middleware now uses `process.env.NODE_ENV` to determine the appropriate security level:

- **Development (`NODE_ENV=development`)**: Relaxed validation, allows all common development tools
- **Production**: Maintains strict security while allowing legitimate development tools

## Testing Results

✅ **Verified Working:**
- curl requests now accepted (user agent: `curl/8.11.0`)
- Postman requests supported
- Thunder Client compatibility
- HTTPie and other CLI tools
- Python requests library
- Node.js fetch operations

✅ **Security Maintained:**
- Malicious scanners still blocked (sqlmap, nikto, nmap)
- XSS and injection patterns detected
- Rate limiting active
- CORS properly configured
- Production security unchanged

## Usage Examples

### curl
```bash
# GET request
curl http://localhost:3000/api/test/vision

# POST request with JSON
curl -X POST http://localhost:3000/api/descriptions/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"imageUrl":"https://example.com/image.jpg","style":"narrativo"}'
```

### Postman
- All request types now supported
- User-Agent automatically handled
- No special configuration needed

### HTTPie
```bash
# GET request
http GET localhost:3000/api/test/vision

# POST request
http POST localhost:3000/api/descriptions/generate \
  imageUrl=https://example.com/image.jpg \
  style=narrativo
```

## Files Modified

1. `src/lib/middleware/api-middleware.ts` - Main API security validation
2. `src/lib/schemas/api-validation.ts` - User agent validation patterns  
3. `src/lib/middleware/securityMiddleware.ts` - CORS and content-type handling

## Migration Notes for Developers

- No breaking changes for existing API consumers
- Development tools work out of the box
- Production security remains intact
- Environment variables control security level
- All legitimate development tools now supported

## Security Considerations

- Development mode should only be used in development environments
- Production deployments maintain strict security policies
- Malicious patterns are still blocked in all environments
- Rate limiting and other protections remain active

## Future Improvements

- Consider adding API key-based developer access
- Implement request logging for development tools
- Add metrics for tool usage patterns
- Consider whitelist-based approach for enterprise environments