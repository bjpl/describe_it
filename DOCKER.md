# Docker Quick Start - Describe It

Quick reference for Docker commands and common operations.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

## Common Commands

### Development

```bash
# Start all services (app + Redis + Redis Commander)
docker-compose up

# Start in background
docker-compose up -d

# Start specific services only
docker-compose up app redis

# Rebuild and start
docker-compose up --build

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app sh
docker-compose exec app npm run lint
```

### Production

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View status
docker-compose -f docker-compose.prod.yml ps

# View logs (last 100 lines, follow)
docker-compose -f docker-compose.prod.yml logs --tail=100 -f

# Restart application
docker-compose -f docker-compose.prod.yml restart app

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Update and restart (zero downtime)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build app
```

## Build Commands

```bash
# Build production image
docker build -t describe-it:latest .

# Build with specific args
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -t describe-it:prod .

# Build without cache
docker build --no-cache -t describe-it:latest .

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t describe-it:latest .
```

## Debugging

```bash
# Shell into running container
docker-compose exec app sh

# Shell into stopped container
docker-compose run --rm app sh

# Check health status
docker inspect describe-it-dev --format='{{json .State.Health}}'

# View container stats
docker stats describe-it-dev

# View container processes
docker top describe-it-dev
```

## Maintenance

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup
docker system prune -a --volumes

# View disk usage
docker system df
```

## Troubleshooting

### Issue: Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: Container won't start
```bash
# Check logs
docker-compose logs app

# Try running without daemon mode
docker-compose up

# Check health
docker inspect describe-it-dev | grep -A 10 Health
```

### Issue: Out of disk space
```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

## Environment Setup

1. Copy environment template:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your values:
```bash
nano .env.local
# or
code .env.local
```

3. Start services:
```bash
docker-compose up
```

## Health Check

Test application health:
```bash
# From host
curl http://localhost:3000/api/health

# From inside container
docker-compose exec app curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-08T12:00:00.000Z"
}
```

## Redis Operations (Development)

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# View all keys
docker-compose exec redis redis-cli keys '*'

# Flush cache
docker-compose exec redis redis-cli flushall

# Monitor Redis commands
docker-compose exec redis redis-cli monitor

# Access Redis Commander
# Open browser: http://localhost:8081
```

## Performance Monitoring

```bash
# Real-time container stats
docker stats describe-it-dev

# Memory usage
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" describe-it-dev

# CPU usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" describe-it-dev
```

## Backup & Restore

### Backup Container State
```bash
# Export container
docker export describe-it-dev > describe-it-backup.tar

# Save image
docker save describe-it:latest > describe-it-image.tar
```

### Restore
```bash
# Import container
docker import describe-it-backup.tar describe-it:restored

# Load image
docker load < describe-it-image.tar
```

## Security Scanning

```bash
# Scan image for vulnerabilities
docker scan describe-it:latest

# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image describe-it:latest
```

## CI/CD Integration

### Test in CI
```bash
# Build
docker build -t describe-it:test .

# Run tests
docker run --rm describe-it:test npm test

# Run linting
docker run --rm describe-it:test npm run lint
```

## Tips & Best Practices

1. **Use `.env.local`** for local development secrets
2. **Run `docker-compose down -v`** to reset Redis cache
3. **Check logs** with `-f` flag for real-time updates
4. **Use `--build`** flag after dependency changes
5. **Monitor resources** with `docker stats`
6. **Clean up regularly** with `docker system prune`
7. **Use health checks** to verify application state
8. **Test locally** before deploying to production
9. **Version your images** with tags
10. **Document environment variables** in `.env.example`

## Quick Reference Card

| Task | Command |
|------|---------|
| Start dev | `docker-compose up` |
| Start prod | `docker-compose -f docker-compose.prod.yml up -d` |
| Stop | `docker-compose down` |
| Logs | `docker-compose logs -f app` |
| Shell | `docker-compose exec app sh` |
| Rebuild | `docker-compose up --build` |
| Clean | `docker system prune -a` |
| Health | `curl http://localhost:3000/api/health` |

## Support

- Full documentation: [docs/DOCKER_SETUP.md](docs/DOCKER_SETUP.md)
- GitHub Issues: Report bugs and request features
- Health endpoint: http://localhost:3000/api/health
