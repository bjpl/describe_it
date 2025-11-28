# Docker Deployment Guide

Production-ready Docker configuration for Describe It Next.js application.

## Overview

This repository includes optimized Docker configurations for:

- **Development**: Hot reload with volume mounting
- **Production**: Multi-stage build with security hardening
- **Monitoring**: Prometheus, Grafana, Redis metrics

## Quick Start

### Development

```bash
# 1. Copy environment file
cp .env.example .env.local

# 2. Start development environment
docker-compose up

# 3. Access application
# App: http://localhost:3000
# Redis Commander: http://localhost:8081 (optional, use --profile tools)
```

### Production

```bash
# 1. Copy production environment file
cp .env.production.example .env.production

# 2. Generate security keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Update .env.production with your keys and API credentials

# 4. Build and start production stack
docker-compose -f docker-compose.production.yml up -d

# 5. Access services
# App: http://localhost:3000
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

## Architecture

### Multi-Stage Production Build

```
┌─────────────────────────────────────────────────────────┐
│ STAGE 1: Dependencies                                   │
│ - Install production dependencies                       │
│ - Frozen lockfile for reproducibility                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STAGE 2: Builder                                        │
│ - Copy source code                                      │
│ - Run Next.js build with standalone output             │
│ - Generate optimized production bundle                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ STAGE 3: Production Runtime                            │
│ - Minimal Alpine base (Node 20.11.0)                   │
│ - Install sharp for image optimization                 │
│ - Copy standalone output only                          │
│ - Non-root user (nextjs:nodejs)                        │
│ - Dumb-init for proper signal handling                 │
└─────────────────────────────────────────────────────────┘
```

## Docker Files

### Dockerfile (Production)

- **Base Image**: `node:20.11.0-alpine`
- **Output**: Next.js standalone (~150MB)
- **Security**: Non-root user, read-only filesystem, health checks
- **Optimization**: Multi-stage build, layer caching, sharp pre-installed

### Dockerfile.dev (Development)

- **Base Image**: `node:20.11.0-alpine`
- **Features**: Hot reload, volume mounting, dev dependencies
- **Purpose**: Local development with fast iteration

### docker-compose.yml (Development)

- Next.js app with hot reload
- Redis cache
- Redis Commander (optional)
- Volume mounts for live code updates

### docker-compose.production.yml (Production)

- Next.js app (production build)
- Redis cache with persistence
- Nginx reverse proxy
- Prometheus monitoring
- Grafana dashboards
- Redis exporter
- Node exporter
- Resource limits and health checks

## Environment Variables

### Required Production Variables

```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...

# Security Keys (generate with crypto.randomBytes)
API_SECRET_KEY=...
JWT_SECRET=...
SESSION_SECRET=...

# Redis
REDIS_PASSWORD=...

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

See `.env.production.example` for complete list.

## Commands

### Development

```bash
# Start development environment
docker-compose up

# Start with Redis Commander
docker-compose --profile tools up

# Rebuild and start
docker-compose up --build

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v
```

### Production

```bash
# Build production image
docker-compose -f docker-compose.production.yml build

# Start production stack
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f app

# Scale application (not recommended, use load balancer instead)
docker-compose -f docker-compose.production.yml up -d --scale app=3

# Stop production stack
docker-compose -f docker-compose.production.yml down

# Update configuration without downtime
docker-compose -f docker-compose.production.yml up -d --no-deps app
```

### Maintenance

```bash
# Check health status
docker-compose -f docker-compose.production.yml ps

# Inspect logs
docker logs describe-it-app

# Execute commands in container
docker exec -it describe-it-app sh

# View resource usage
docker stats

# Prune unused images and volumes
docker system prune -a
```

## Security Best Practices

### 1. Non-Root User

All containers run as non-root users:

- App: `nextjs:nodejs` (UID 1001)
- System containers: Built-in non-root users

### 2. Read-Only Filesystem

Production containers use read-only root filesystem with explicit tmpfs mounts:

```yaml
read_only: true
tmpfs:
  - /tmp
  - /app/logs
```

### 3. Security Options

```yaml
security_opt:
  - no-new-privileges:true
```

### 4. Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

### 5. Health Checks

All services include health checks:

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 90s
```

### 6. Secrets Management

- Never commit `.env.production`
- Use Docker secrets or environment variable injection
- Rotate keys regularly

## Monitoring

### Prometheus Metrics

Access: http://localhost:9090

Available metrics:

- Next.js application metrics
- Redis cache metrics
- Node.js process metrics
- System resource metrics

### Grafana Dashboards

Access: http://localhost:3001
Default credentials: admin / (set in GRAFANA_PASSWORD)

Pre-configured dashboards:

- Application performance
- Redis cache statistics
- System resource usage
- Request rate and latency

### Health Endpoints

```bash
# Application health
curl http://localhost:3000/api/health

# Redis health
docker exec describe-it-redis redis-cli ping

# Prometheus health
curl http://localhost:9090/-/healthy

# Grafana health
curl http://localhost:3001/api/health
```

## Performance Optimization

### Image Optimization

- Sharp installed in production for fast image processing
- AVIF and WebP format support
- Automatic image optimization

### Caching Strategy

- Redis for API response caching
- Next.js built-in caching
- Static asset caching via Nginx
- CDN-ready with proper cache headers

### Network Optimization

- Nginx reverse proxy with compression
- HTTP/2 support
- Connection pooling
- Keep-alive connections

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Check environment variables
docker exec describe-it-app env

# Verify health status
docker inspect describe-it-app | grep -A 10 Health
```

### Build failures

```bash
# Clean build cache
docker builder prune -a

# Remove all images and rebuild
docker-compose down --rmi all
docker-compose build --no-cache
```

### Permission issues

```bash
# Fix ownership (development)
sudo chown -R $(whoami):$(whoami) .

# Reset volumes
docker-compose down -v
```

### Memory issues

```bash
# Increase Docker memory limit (Docker Desktop)
# Settings > Resources > Memory > 4GB+

# Monitor resource usage
docker stats
```

## CI/CD Integration

### GitHub Actions Example

See `.github/workflows/docker-deploy.yml` for automated:

- Docker image building
- Security scanning
- Container registry push
- Production deployment

### Manual Deployment

```bash
# 1. Build image with tag
docker build -t describe-it:v1.0.0 .

# 2. Tag for registry
docker tag describe-it:v1.0.0 your-registry/describe-it:v1.0.0

# 3. Push to registry
docker push your-registry/describe-it:v1.0.0

# 4. Pull and run on production server
ssh production-server
docker pull your-registry/describe-it:v1.0.0
docker-compose -f docker-compose.production.yml up -d
```

## Production Checklist

- [ ] All environment variables set in `.env.production`
- [ ] Security keys generated with crypto.randomBytes
- [ ] Redis password set to strong value
- [ ] Grafana admin password changed
- [ ] SSL certificates configured in Nginx
- [ ] Firewall rules configured
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place
- [ ] Log rotation configured
- [ ] Resource limits tested under load

## Support

For issues or questions:

- GitHub Issues: [Repository Issues](https://github.com/your-org/describe-it/issues)
- Documentation: [Main README](../README.md)
- Security: See [SECURITY.md](../SECURITY.md)
