# CORS & Security Headers Deployment Guide

## Overview

This guide details the comprehensive CORS and security configuration implemented to resolve API failures in production.

## ✅ Issues Fixed

### 1. CORS Configuration
- **Problem**: Missing CORS headers in `next.config.js`
- **Solution**: Added comprehensive CORS headers for API routes with proper origin validation
- **Impact**: Enables cross-origin requests from allowed domains

### 2. API Route Headers
- **Problem**: Inconsistent CORS handling across API routes
- **Solution**: Centralized CORS utility with proper preflight handling
- **Impact**: Consistent CORS behavior across all endpoints

### 3. Production Environment
- **Problem**: Missing wildcard support for Vercel preview deployments
- **Solution**: Enhanced origin validation with regex patterns
- **Impact**: Supports both production and preview deployments

### 4. Preflight Requests
- **Problem**: Incomplete OPTIONS method handling
- **Solution**: Comprehensive preflight response with security validation
- **Impact**: Proper CORS preflight handling with detailed logging

## 🔧 Key Configuration Files

### 1. `next.config.js`
```javascript
// Enhanced CORS headers for API routes
source: "/api/:path*",
headers: [
  {
    key: "Access-Control-Allow-Methods",
    value: "GET, POST, PUT, DELETE, HEAD, OPTIONS",
  },
  {
    key: "Access-Control-Allow-Headers", 
    value: "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, If-None-Match, X-API-Key",
  },
  // ... additional security headers
]
```

### 2. `src/lib/utils/cors.ts`
```javascript
// Centralized CORS utility with Vercel support
export function getAllowedOrigins(): string[] {
  return [
    'https://describe-it-lovat.vercel.app',
    'https://describe-*.vercel.app', // Wildcard for previews
    'https://*.vercel.app'
  ];
}
```

### 3. `src/app/api/images/search/route.ts`
```javascript
// Enhanced OPTIONS handler
export async function OPTIONS(request: NextRequest) {
  const { isValid, headers } = validateCorsRequest(request);
  
  if (!isValid && origin) {
    return new NextResponse(null, { status: 403 });
  }
  
  return createCorsPreflightResponse(origin, config);
}
```

## 🌐 Environment Variables

### Production Settings (`.env.production`)
```bash
# CORS Configuration
ALLOWED_ORIGINS=https://describe-it-lovat.vercel.app,https://describe-*.vercel.app

# Security Settings
NODE_ENV=production
FORCE_HTTPS=true
ENABLE_SECURITY_HEADERS=true
```

### Vercel Environment Variables
Set these in your Vercel dashboard:

1. **ALLOWED_ORIGINS**
   - Value: `https://describe-it-lovat.vercel.app,https://describe-*.vercel.app`
   - Environment: Production, Preview

2. **NEXT_PUBLIC_APP_URL**
   - Value: `https://describe-it-lovat.vercel.app`
   - Environment: Production

## 🔒 Security Features

### 1. Origin Validation
- Strict whitelist of allowed origins
- Wildcard support for Vercel preview deployments
- Regex pattern matching for dynamic subdomains

### 2. Comprehensive Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer
Access-Control-Expose-Headers: X-Cache, X-Response-Time, X-Rate-Limit-Remaining, ETag
```

### 3. Enhanced Logging
- CORS request logging with origin tracking
- Security event monitoring
- Failed request analysis

## 🧪 Testing

### Local Development
```bash
# Test preflight request
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3000/api/images/search -v

# Expected: 200 OK with CORS headers
```

### Production
```bash
# Test with production origin
curl -H "Origin: https://describe-it-lovat.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://describe-it-lovat.vercel.app/api/images/search -v

# Expected: 200 OK with CORS headers
```

## 🚀 Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] CORS origins updated for your domain
- [ ] Security headers enabled
- [ ] HTTPS redirect configured
- [ ] Preview deployment CORS tested
- [ ] Production API endpoints tested
- [ ] Browser network tab verified (no CORS errors)

## 📊 Expected Improvements

### Before Fix
- ❌ CORS preflight failures
- ❌ API requests blocked by browser
- ❌ Console errors in production
- ❌ Limited security headers

### After Fix
- ✅ Proper CORS preflight responses
- ✅ Cross-origin requests allowed for whitelisted domains
- ✅ Clean browser console
- ✅ Comprehensive security headers
- ✅ Support for Vercel preview deployments
- ✅ Enhanced security logging

## 🔍 Monitoring

### Key Metrics to Watch
1. **CORS Errors**: Should be zero for legitimate requests
2. **403 Responses**: Monitor for potential attacks or misconfigurations
3. **Preflight Success Rate**: Should be 100% for allowed origins
4. **Security Header Coverage**: Verify all responses include security headers

### Logs to Monitor
- `[SECURITY] CORS preflight request`
- `[SECURITY] CORS preflight rejected`
- `[CORS] Production request allowed from`

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Error Despite Allowed Origin**
   - Check exact origin format (https vs http, trailing slashes)
   - Verify environment variable is properly set
   - Check browser developer tools for actual origin sent

2. **Preview Deployment Issues** 
   - Ensure wildcard pattern `https://describe-*.vercel.app` is in ALLOWED_ORIGINS
   - Test with specific preview URL

3. **Missing Security Headers**
   - Verify next.config.js headers configuration
   - Check API route implementation
   - Ensure middleware is properly applied

## 📝 Additional Notes

- CORS configuration is environment-aware (development vs production)
- Wildcard support enables seamless Vercel preview deployments
- Security headers are applied globally via next.config.js
- API-specific headers added via route handlers
- Comprehensive logging aids in debugging and monitoring

For support or questions, check the implementation in the following files:
- `next.config.js` - Global headers configuration
- `src/lib/utils/cors.ts` - CORS utility functions
- `src/app/api/*/route.ts` - API route implementations