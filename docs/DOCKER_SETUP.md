# Docker Setup Guide - Describe It

Production-ready Docker configuration for the Describe It Next.js 15.5 application.

## Overview

The Docker setup includes:
- **Multi-stage Dockerfile**: Optimized for production with minimal image size
- **docker-compose.yml**: Development environment with hot reload
- **docker-compose.prod.yml**: Production deployment with resource limits
- **.dockerignore**: Excludes unnecessary files from build context

## Architecture

### Multi-Stage Build

```
┌─────────────────────────────────────────────────────────┐
│ Stage 1: deps (Dependencies)                            │
│ - Base: node:20-alpine                                  │
│ - Install production dependencies only                  │
│ - Uses npm ci for reproducible builds                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Stage 2: builder (Build Application)                    │
│ - Install all dependencies (including dev)              │
│ - Build Next.js with standalone output                  │
│ - Accept build args for environment variables           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Stage 3: runner (Production Runtime)                    │
│ - Minimal runtime image (~150MB)                        │
│ - Non-root user (nextjs:nodejs)                         │
│ - Sharp for image optimization                          │
│ - Health check endpoint                                 │
│ - dumb-init for proper signal handling                  │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Development

```bash
# Start development environment with Redis
docker-compose up

# Start without Redis Commander
docker-compose up app redis

# View logs
docker-compose logs -f app

# Rebuild after dependency changes
docker-compose up --build
```

### Production

```bash
# Build and start production container
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop and remove containers
docker-compose -f docker-compose.prod.yml down
```

## Configuration

### Environment Variables

Create a `.env.local` file for development:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# API Keys
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_key
UNSPLASH_SECRET_KEY=your_unsplash_secret

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Sentry (optional)
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
SENTRY_DSN=your_dsn
SENTRY_AUTH_TOKEN=your_token
NEXT_PUBLIC_SENTRY_DSN=your_public_dsn

# Security
API_SECRET_KEY=your_api_secret
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

### Build Arguments

The Dockerfile accepts build arguments for public environment variables:

```bash
docker build \
  --build-arg SENTRY_ORG=your_org \
  --build-arg SENTRY_PROJECT=your_project \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -t describe-it:latest .
```

## Features

### Security

- Non-root user (UID 1001, GID 1001)
- Minimal attack surface (Alpine Linux)
- No hardcoded secrets
- Security headers configured in Next.js
- Regular security updates in base image

### Performance

- Multi-stage build reduces image size
- Next.js standalone output (~50% smaller)
- Sharp for optimized image processing
- Layer caching for faster builds
- Resource limits in production

### Reliability

- Health checks on `/api/health` endpoint
- dumb-init handles signals properly
- Automatic restart policies
- Logging with rotation
- Graceful shutdown handling

### Development Experience

- Hot reload with volume mounts
- Redis for caching
- Redis Commander for debugging
- Environment variable injection
- Full source code access

## Image Size Optimization

```
Before: ~1.2GB (full node:20 image)
After:  ~150MB (multi-stage Alpine build)
Reduction: 87.5%
```

Techniques used:
1. Alpine Linux base (5MB vs 180MB)
2. Multi-stage build (separate build/runtime)
3. Standalone output (only necessary files)
4. npm ci with --omit=dev
5. Clean npm cache
6. Exclude dev files via .dockerignore

## Health Checks

The container includes a health check that:
- Runs every 30 seconds
- Allows 60 seconds for startup
- Fails after 3 consecutive failures
- Checks the `/api/health` endpoint

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

## Resource Limits (Production)

```yaml
deploy:
  resources:
    limits:
      cpus: '2'          # Maximum 2 CPU cores
      memory: 2G         # Maximum 2GB RAM
    reservations:
      cpus: '0.5'        # Guaranteed 0.5 CPU cores
      memory: 512M       # Guaranteed 512MB RAM
```

Adjust based on your workload and available resources.

## Logging

Production logs are configured with rotation:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # Max 10MB per log file
    max-file: "3"      # Keep 3 log files
```

View logs:
```bash
# All logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
```

## Networking

### Development
- Port 3000: Next.js application
- Port 6379: Redis (optional)
- Port 8081: Redis Commander (optional)
- Network: describe-it-dev-network

### Production
- Port 3000: Next.js application
- Network: describe-it-prod-network

## Volumes

### Development
```yaml
volumes:
  - .:/app                    # Source code (hot reload)
  - /app/node_modules         # Exclude node_modules
  - /app/.next                # Exclude build output
  - ./logs:/app/logs          # Logs directory
```

### Production
No volumes mounted (immutable container).

## Troubleshooting

### Build Issues

**Problem**: Build fails with "Cannot find module"
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
```

**Problem**: Permission denied errors
```bash
# Ensure proper ownership
sudo chown -R $USER:$USER .
```

### Runtime Issues

**Problem**: Application not starting
```bash
# Check logs
docker-compose logs -f app

# Check health status
docker inspect describe-it-dev | grep Health -A 10
```

**Problem**: Out of memory
```bash
# Increase memory limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 4G  # Increase as needed
```

### Redis Connection Issues

**Problem**: Cannot connect to Redis
```bash
# Verify Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build \
            --build-arg NEXT_PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_URL }} \
            --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }} \
            -t describe-it:latest .

      - name: Run tests
        run: docker run describe-it:latest npm test

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_TOKEN }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker tag describe-it:latest registry.example.com/describe-it:latest
          docker push registry.example.com/describe-it:latest
```

## Best Practices

1. **Never commit secrets**: Use environment variables
2. **Pin versions**: Use specific Node.js versions
3. **Use .dockerignore**: Reduce build context size
4. **Layer caching**: Order commands from least to most frequently changed
5. **Health checks**: Always implement health endpoints
6. **Non-root user**: Run as unprivileged user
7. **Resource limits**: Set appropriate limits for production
8. **Logging**: Configure log rotation
9. **Monitoring**: Use Sentry or similar for error tracking
10. **Security updates**: Regularly update base images

## Maintenance

### Update Dependencies
```bash
# Update package.json
npm update

# Rebuild Docker image
docker-compose build --no-cache
```

### Update Base Image
```bash
# Pull latest Node.js Alpine image
docker pull node:20-alpine

# Rebuild
docker-compose build --pull
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup
docker system prune -a --volumes
```

## Performance Tuning

### Build Performance
```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker-compose build
```

### Runtime Performance
- Enable Redis caching
- Use Vercel KV for distributed caching
- Configure proper resource limits
- Monitor with Sentry and web vitals

## Security Scanning

```bash
# Scan image for vulnerabilities
docker scan describe-it:latest

# Using Trivy
trivy image describe-it:latest
```

## Support

For issues or questions:
- GitHub Issues: [repository]/issues
- Documentation: /docs
- Health Check: http://localhost:3000/api/health

## License

MIT License - See LICENSE file for details
