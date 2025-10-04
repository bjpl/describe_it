# Setup Guide - Spanish Learning App

## 🚀 Quick Start (No API Keys Required!)

This app works perfectly **without any API keys** - it will automatically run in **Demo Mode** with:
- ✅ 20+ curated high-quality images
- ✅ Pre-generated descriptions in 5 different styles
- ✅ Spanish Q&A pairs for learning
- ✅ Vocabulary extraction and categorization
- ✅ Progress tracking with localStorage
- ✅ All learning features fully functional

### Getting Started

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd describe_it
   npm install
   ```

2. **Start the App**
   ```bash
   npm run dev
   ```

3. **Check Status**
   Visit [http://localhost:3000/api/status](http://localhost:3000/api/status) to see which features are enabled

That's it! The app is now running in demo mode with full functionality.

---

## 🔑 Adding API Keys (Optional)

Want to use real APIs instead of demo data? Follow these steps:

### Step 1: Environment Setup

```bash
# Copy the example file
cp .env.example .env.local
```

### Step 2: Get API Keys (Choose What You Want)

#### 🖼️ Unsplash API (Free Images)
- **Why?** Access to millions of high-quality images instead of demo images
- **Free Tier:** 50 requests/hour
- **Setup:**
  1. Go to [https://unsplash.com/developers](https://unsplash.com/developers)
  2. Create account and "New Application"
  3. Copy the "Access Key"
  4. Add to `.env.local`: `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_key_here`

#### 🤖 OpenAI API (AI Descriptions)
- **Why?** Generate custom descriptions instead of pre-made ones
- **Cost:** Pay-per-use (~$0.001-0.02 per description)
- **Setup:**
  1. Go to [https://platform.openai.com](https://platform.openai.com)
  2. Create account and add payment method
  3. Go to "API Keys" and create new key
  4. Add to `.env.local`: `OPENAI_API_KEY=your_key_here`

#### 🗄️ Supabase Database (Cloud Storage)
- **Why?** Store progress in cloud instead of browser localStorage
- **Free Tier:** 2 GB storage, 50 MB database
- **Setup:**
  1. Go to [https://supabase.com](https://supabase.com)
  2. Create new project (takes ~2 minutes)
  3. Go to Settings > API
  4. Add to `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

### Step 3: Restart and Verify

```bash
# Restart the development server
npm run dev

# Check status
curl http://localhost:3000/api/status
```

---

## 📊 Feature Matrix

| Feature | Demo Mode | With APIs |
|---------|-----------|-----------|
| **Images** | 20 curated images | Millions via Unsplash |
| **Descriptions** | 5 pre-generated styles | Custom AI-generated |
| **Q&A Pairs** | Pre-made questions | AI-generated from images |
| **Vocabulary** | Pre-extracted phrases | AI-extracted from descriptions |
| **Progress** | localStorage | Cloud database |
| **Offline** | ✅ Fully functional | ❌ Requires internet |
| **Cost** | 🆓 Completely free | 💰 Pay for API usage |

---

## 🎛️ Configuration Options

### Demo Mode Controls

```bash
# Force demo mode even with API keys
ENABLE_DEMO_MODE=true

# Auto-enable demo mode when keys missing (default)
DEMO_MODE_AUTO=true
```

### Rate Limiting

```bash
# Unsplash requests per hour
UNSPLASH_RATE_LIMIT_PER_HOUR=1000

# OpenAI requests per minute  
OPENAI_RATE_LIMIT_PER_MINUTE=3000
```

### Cache Settings

```bash
# Cache duration in seconds
DEFAULT_CACHE_TTL=3600

# Maximum cache size
MAX_CACHE_SIZE=1000
```

---

## 🔍 Monitoring & Status

### Status Endpoint

Check the status of all services:

```bash
curl http://localhost:3000/api/status
```

**Example Response:**
```json
{
  "status": "ok",
  "health": "healthy",
  "demo": true,
  "services": [
    {
      "name": "Unsplash API",
      "enabled": false,
      "configured": false,
      "healthy": false,
      "demoMode": true,
      "reason": "API key not configured - using curated demo images"
    },
    {
      "name": "OpenAI API", 
      "enabled": false,
      "configured": false,
      "healthy": false,
      "demoMode": true,
      "reason": "API key not configured - using pre-generated content"
    }
  ],
  "features": {
    "unsplashService": false,
    "openaiService": false,
    "supabaseService": false,
    "demoMode": true
  }
}
```

### Health Check

Quick health check (returns 200/503):

```bash
curl -I http://localhost:3000/api/status
```

---

## 🚨 Troubleshooting

### Common Issues

1. **App won't start**
   - Check Node.js version (requires 16+)
   - Run `npm install` again
   - Clear cache: `rm -rf .next node_modules && npm install`

2. **API keys not working**
   - Verify `.env.local` file exists in project root
   - Check API key format (no quotes, no spaces)
   - Restart development server
   - Check `/api/status` endpoint

3. **Demo mode not working**
   - Check browser localStorage isn't full
   - Try incognito/private browsing
   - Check browser console for errors

### Getting Help

1. Check the `/api/status` endpoint first
2. Look at browser console for errors
3. Check server console output
4. Verify environment variables are set correctly

---

## 📈 Performance Tips

### For Development
- Use demo mode for fast iteration
- Cache is enabled by default
- Minimal API calls in demo mode

### For Production
- Add all API keys for best experience
- Enable monitoring (Sentry)
- Use Vercel deployment for optimal performance
- Consider rate limiting for high traffic

---

## 🎓 Learning Features

The app includes comprehensive Spanish learning tools:

### Description Styles
- **Narrativo**: Story-like descriptions
- **Poético**: Artistic, metaphorical language
- **Académico**: Technical, formal descriptions  
- **Conversacional**: Casual, everyday language
- **Infantil**: Simple language for beginners

### Q&A System
- **Fácil**: Basic comprehension questions
- **Medio**: Intermediate analysis questions
- **Difícil**: Advanced critical thinking questions

### Vocabulary Categories
- **Objetos**: Physical items and things
- **Acciones**: Verbs and activities
- **Lugares**: Locations and spaces
- **Colores**: Colors mentioned or implied
- **Emociones**: Feelings and emotions
- **Conceptos**: Abstract ideas and concepts

---

## 🔧 Advanced Configuration

See the full [Configuration Guide](./CONFIGURATION.md) for advanced options including:
- Custom caching strategies
- Security settings
- Monitoring setup
- Deployment configurations

---

**Need help?** Check the `/api/status` endpoint or open an issue in the repository.