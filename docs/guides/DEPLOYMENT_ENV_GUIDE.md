# Environment Configuration & Deployment Guide

This guide explains how to configure environment variables for secure deployment.

## Quick Start

### 1. Development Setup
```bash
# Copy example file
cp .env.example .env.local

# Edit with your development keys
# Run validation
npm run validate:env:dev
```

### 2. Production Setup
```bash
# Copy production template
cp .env.production .env.production.local

# Replace ALL placeholder values
# Run validation
npm run validate:env:prod
```

## Security Keys Generation

Generate secure keys for production:

```bash
# API Secret Key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT Secret (32 bytes)  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret (16 bytes)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Critical Production Variables

### Required for Security
- `API_SECRET_KEY` - 32+ character secure random string
- `JWT_SECRET` - 32+ character secure random string  
- `SESSION_SECRET` - 16+ character secure random string
- `ALLOWED_ORIGINS` - Your production domains only
- `NODE_ENV=production`

### API Services
- `OPENAI_API_KEY` - Your OpenAI API key (starts with sk-)
- `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` - Unsplash public key
- `UNSPLASH_ACCESS_KEY` - Unsplash server key

### Database (Optional)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key

## Environment File Hierarchy

The application loads environment variables in this order:
1. `.env.production` (production only)
2. `.env.local` (all environments except test)
3. `.env` (default)

## Security Checklist

### Before Production Deployment

- [ ] All API keys are real production values (no placeholders)
- [ ] `ALLOWED_ORIGINS` contains only production domains
- [ ] `DEBUG_ENDPOINT_ENABLED=false` or unset
- [ ] Security keys are 32+ characters and randomly generated
- [ ] Rate limiting is configured appropriately
- [ ] Environment validation passes: `npm run validate:env:prod`

### After Deployment

- [ ] Test all API endpoints work correctly
- [ ] Verify CORS is working properly
- [ ] Check error monitoring is active
- [ ] Monitor rate limiting effectiveness
- [ ] Ensure no debug information is leaked

## Validation Commands

```bash
# Validate current environment
npm run validate:env

# Validate development setup
npm run validate:env:dev

# Validate production setup  
npm run validate:env:prod
```

## Common Issues

### Validation Errors

**"Contains placeholder value"**
- Replace `your-openai-api-key` with real key
- Replace `your-production-domains.com` with actual domains

**"Invalid format"**
- OpenAI keys must start with `sk-`
- URLs must include `http://` or `https://`

**"Too short"**
- Security keys must be 32+ characters
- Use crypto.randomBytes() to generate

### CORS Issues

**"localhost in production"**
- Remove localhost from ALLOWED_ORIGINS
- Add your actual production domains

**"No Access-Control-Allow-Origin"**
- Verify ALLOWED_ORIGINS includes requesting domain
- Check spelling and protocol (http vs https)

## Best Practices

### Key Management
- Use different keys for development/staging/production
- Rotate keys regularly (quarterly)
- Never commit .env files to git
- Use secure key storage in CI/CD

### Monitoring
- Enable error reporting (Sentry)
- Monitor API usage and costs
- Set up alerts for rate limiting
- Track security events

### Backup
- Backup environment configurations securely
- Document key sources and permissions
- Have rollback procedures ready

## Deployment Platforms

### Vercel
```bash
# Set environment variables via CLI
vercel env add API_SECRET_KEY production
vercel env add JWT_SECRET production
```

### Docker
```bash
# Use secrets for sensitive data
docker run -e API_SECRET_KEY_FILE=/run/secrets/api_key myapp
```

### Traditional Hosting
- Use secure environment variable management
- Never store secrets in plain text files
- Consider HashiCorp Vault or similar

## Support

If you encounter issues:
1. Run `npm run validate:env:prod` to identify problems
2. Check this guide for common solutions
3. Review `.env.example` for required variables
4. Ensure all placeholder values are replaced