# Vercel Deployment Guide

**Status:** Production Deployed
**Last Updated:** December 11, 2025
**Live URL:** https://describe-it.vercel.app

## Current Deployment

The application is deployed and running on Vercel. This guide covers the configuration and deployment process.

### Optimized vercel.json

```json
{
  "framework": "nextjs",
  "functions": {
    "src/app/api/descriptions/generate/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/qa/generate/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/phrases/extract/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/images/search/route.ts": {
      "maxDuration": 10
    },
    "src/app/api/health/route.ts": {
      "maxDuration": 5
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Environment Variables Required

Create these in your Vercel dashboard:

#### Core APIs

- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`
- `OPENAI_API_KEY`

#### Database

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Vercel Storage (if using)

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `BLOB_READ_WRITE_TOKEN`

### Deployment Steps

1. **Prepare Repository**

   ```bash
   git add .
   git commit -m "Optimize for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables

3. **Deploy**
   - Vercel will automatically detect Next.js
   - Build should complete successfully with optimized config

### Performance Optimizations

1. **Next.js Config**: Optimized bundle splitting and caching
2. **Image Optimization**: Configured for multiple formats and sizes
3. **Function Timeouts**: Set appropriate limits for different API routes
4. **Security Headers**: Added comprehensive security headers

### Free Tier Considerations

- Function timeout limited to 10s (upgraded accounts get 60s)
- No cron jobs (Pro feature)
- Single region deployment
- Bandwidth limits apply

### Monitoring

Use Vercel Analytics to monitor:

- Core Web Vitals
- Function performance
- Error rates
- Traffic patterns
