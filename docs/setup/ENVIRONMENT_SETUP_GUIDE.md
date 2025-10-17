# Complete Environment Variables Setup Guide

## 🚨 CRITICAL: Environment Variables Configuration

This guide covers ALL environment variables needed for the describe-it application to work properly in all environments.

## 📋 Required Environment Variables

### 1. **Unsplash API (Image Search)**

The application needs **BOTH** of these variables for Unsplash to work:

```env
# Public key (accessible in browser)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY

# Server-side key (same value, but for server-side fallback)
UNSPLASH_ACCESS_KEY=DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY
```

**Why both?** 
- `NEXT_PUBLIC_` prefix makes it available in the browser
- Non-prefixed version is for server-side API routes
- The code checks both locations for maximum compatibility

### 2. **OpenAI API (AI Descriptions)**

```env
OPENAI_API_KEY=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
```

### 3. **Supabase (Database & Auth)**

```env
NEXT_PUBLIC_SUPABASE_URL=https://arjrpdccaczbybbrchvc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1ODQ4MzQsImV4cCI6MjA3MjE2MDgzNH0.pRI087i7y7wJx7DJx69kN3rxZEwvV0gBVCyfapXbH5c
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU4NDgzNCwiZXhwIjoyMDcyMTYwODM0fQ.ZoeFLYhKnFshoIcDdJiIOdrOSAoFtyGjx3gG_aKGl7c
```

### 4. **Application URLs**

```env
# For Production
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# For Development
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXTAUTH_URL=http://localhost:3000
```

## 🛠️ Setup Instructions

### Local Development (.env.local)

1. Create a `.env.local` file in your project root
2. Copy ALL the variables above into it
3. Save the file
4. Restart your development server

### Vercel Production Setup

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project

2. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Add each variable ONE BY ONE:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | `DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY` | Production, Preview, Development |
   | `UNSPLASH_ACCESS_KEY` | `DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY` | Production, Preview, Development |
   | `OPENAI_API_KEY` | `sk-proj-sYrr...` (full key) | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://arjrpdccaczbybbrchvc.supabase.co` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (full key) | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (full key) | Production, Preview, Development |
   | `NEXT_PUBLIC_APP_URL` | Your production URL | Production |
   | `NEXTAUTH_URL` | Your production URL | Production |

3. **IMPORTANT: After adding all variables:**
   - Click "Save" for each variable
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Select "Redeploy"
   - Wait for deployment to complete

### Supabase Configuration

No additional setup needed if using the provided keys. If you want your own Supabase instance:

1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role key → `SUPABASE_SERVICE_ROLE_KEY`

## 🔍 Debugging Unsplash Connection

### Check if Variables are Loaded

Visit: `http://localhost:3000/api/debug/env` (or your production URL)

You should see:
```json
{
  "hasUnsplashKey": true,
  "hasOpenAIKey": true,
  "hasSupabaseUrl": true
}
```

### Test Image Search API

Visit: `http://localhost:3000/api/images/search?query=mountain`

Success response should include:
```json
{
  "images": [...],
  "totalPages": 334,
  "currentPage": 1
}
```

### Common Issues & Solutions

#### Issue: "Unsplash API key not configured. Using demo mode."

**Solution:** 
- Ensure BOTH `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` and `UNSPLASH_ACCESS_KEY` are set
- Check for typos in variable names
- Restart your server after adding variables

#### Issue: Images not loading in production

**Solution:**
- Verify all variables are added in Vercel dashboard
- Redeploy after adding variables
- Check browser console for errors
- Verify the API key is valid: 
  ```bash
  curl "https://api.unsplash.com/search/photos?query=test&client_id=YOUR_KEY"
  ```

#### Issue: 401 Unauthorized from Unsplash

**Solution:**
- The API key may be invalid or expired
- Get a new key from https://unsplash.com/developers
- Update both environment variables

## 📦 Complete .env.local Template

```env
# Unsplash API - BOTH variables needed!
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY
UNSPLASH_ACCESS_KEY=DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY

# OpenAI API
OPENAI_API_KEY=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

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://arjrpdccaczbybbrchvc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1ODQ4MzQsImV4cCI6MjA3MjE2MDgzNH0.pRI087i7y7wJx7DJx69kN3rxZEwvV0gBVCyfapXbH5c
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyanJwZGNjYWN6YnliYnJjaHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU4NDgzNCwiZXhwIjoyMDcyMTYwODM0fQ.ZoeFLYhKnFshoIcDdJiIOdrOSAoFtyGjx3gG_aKGl7c

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Feature flags
ENABLE_DEMO_MODE=false
DEMO_MODE_AUTO=false
```

## ✅ Verification Checklist

- [ ] Created `.env.local` file with all variables
- [ ] Both Unsplash keys are present (NEXT_PUBLIC_ and regular)
- [ ] OpenAI key is set
- [ ] Supabase URLs and keys are set
- [ ] Restarted development server
- [ ] Added all variables to Vercel dashboard
- [ ] Redeployed after adding Vercel variables
- [ ] Tested `/api/debug/env` endpoint
- [ ] Tested `/api/images/search?query=test` endpoint
- [ ] Images load correctly in the application

## 🆘 Still Having Issues?

1. **Check the logs:**
   - Browser console (F12 → Console)
   - Server logs (terminal or Vercel Functions logs)
   - Look for `[UnsplashService]` or `[API]` prefixed messages

2. **Verify the API key works:**
   ```bash
   curl -I "https://api.unsplash.com/search/photos?query=test&client_id=DPM5yTFbvoZW0imPQWe5pAXAxbEMhhBZE1GllByUPzY"
   ```
   Should return `HTTP/1.1 200 OK`

3. **Force a clean rebuild:**
   ```bash
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

4. **In Vercel:**
   - Clear build cache: Settings → Functions → Clear Cache
   - Redeploy with cleared cache

---

**Last Updated:** January 2025
**Keys Status:** Working and tested