# Environment Configuration Guide

This application includes a comprehensive environment variable validation system that ensures proper configuration and provides graceful fallbacks.

## 🚀 Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your API keys (optional):**
   ```bash
   # Edit .env.local with your preferred editor
   nano .env.local
   ```

3. **Validate your configuration:**
   ```bash
   npm run validate:env
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

## 📊 Environment Status

The application provides several endpoints for monitoring environment status:

- **Basic Status:** `GET /api/env-status`
- **Detailed Status:** `GET /api/env-status?detailed=true`
- **Health Check:** `GET /api/env-status?health=true`

## 🎭 Demo Mode

The application automatically enables demo mode when API keys are missing:

- **Unsplash API:** Uses curated demo images
- **OpenAI API:** Uses pre-generated content
- **Supabase:** Uses localStorage
- **Vercel Storage:** Uses memory cache

Demo mode ensures the application works perfectly without any external dependencies.

## 🔧 Core Configuration

### Required Variables

- `NODE_ENV`: Application environment (development, test, production, staging)
- `NEXT_PUBLIC_APP_URL`: Public application URL

### Optional API Keys

- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`: Unsplash API for images
- `OPENAI_API_KEY`: OpenAI API for AI-generated content (must start with 'sk-')

### Database (Optional)

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side)

## 🔒 Security Configuration

### Production Requirements

For production deployments, configure these security variables:

```env
JWT_SECRET=your-64-character-secret-here
SESSION_SECRET=your-64-character-secret-here  
ENCRYPTION_KEY=your-64-character-secret-here
```

Generate secure secrets:
```bash
openssl rand -base64 32
```

## 🚨 Validation Features

The environment validation system includes:

### Startup Validation
- Automatic validation on application start
- Detailed error messages with suggestions
- Production vs development handling

### Format Validation
- URL format checking
- API key format validation (OpenAI keys must start with 'sk-')
- Minimum length requirements for secrets
- Port range validation (1-65535)

### Error Handling
- Graceful fallbacks to demo mode
- Detailed logging with recommendations
- Environment-specific behavior

## 📋 Validation Script

Run the validation script to check your configuration:

```bash
npm run validate:env
```

The script checks:
- Node.js version compatibility
- Required environment variables
- API key formats
- URL validity
- Security configuration for production

## 🏗️ Development vs Production

### Development Mode
- Warnings for missing variables
- Demo mode enabled automatically
- Debug logging available
- Detailed error messages

### Production Mode
- Validation errors cause startup failure
- Security secrets are required
- Error tracking should be configured
- Optimized logging

## 🔍 Troubleshooting

### Common Issues

1. **"Environment validation failed"**
   - Check your .env.local file exists
   - Verify variable formats (URLs, API keys)
   - Run `npm run validate:env` for details

2. **"OpenAI API key invalid format"**
   - OpenAI keys must start with 'sk-'
   - Ensure no extra spaces or quotes

3. **"Missing required environment variables in production"**
   - Set JWT_SECRET, SESSION_SECRET, ENCRYPTION_KEY
   - Each must be at least 32 characters

### Debug Mode

Enable debug mode for detailed logging:

```env
ENABLE_DEBUG_MODE=true
NODE_ENV=development
```

## 📖 Configuration Examples

### Minimal Setup (Demo Mode)
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development with APIs
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-key
```

### Production Setup
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-key
JWT_SECRET=your-64-character-secret-here
SESSION_SECRET=your-64-character-secret-here
ENCRYPTION_KEY=your-64-character-secret-here
SENTRY_DSN=https://your-sentry-dsn
```

## 🔗 Additional Resources

- [Environment Variables (.env.example)](../.env.example)
- [Validation Script (scripts/validate-env.js)](../scripts/validate-env.js)
- [Core Configuration (src/config/env.ts)](../src/config/env.ts)
- [Startup Validation (src/lib/startup-validation.ts)](../src/lib/startup-validation.ts)

## 🆘 Support

If you encounter issues with environment configuration:

1. Check the validation output: `npm run validate:env`
2. Review the environment status: `http://localhost:3000/api/env-status?detailed=true`
3. Verify your .env.local file matches .env.example format
4. Check the application logs for detailed error messages

The application is designed to be forgiving - when in doubt, it will enable demo mode to keep things working while you configure your environment.