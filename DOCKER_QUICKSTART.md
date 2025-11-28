# Docker Quick Start Guide

Get Describe It running with Docker in under 5 minutes.

## Prerequisites

- Docker 24.0+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose 2.0+ (included with Docker Desktop)
- Node.js 20+ (for setup script)

## Development Setup (Fastest)

```bash
# 1. Clone repository (if not already done)
git clone <repository-url>
cd describe_it

# 2. Run automated setup
./scripts/docker-setup.sh dev

# 3. Access application
# → http://localhost:3000
```

That's it! The app is running with hot reload.

## Manual Development Setup

```bash
# 1. Copy environment file
cp .env.example .env.local

# 2. Start Docker containers
docker-compose up

# 3. Access application
# App: http://localhost:3000
# Redis: localhost:6379
```

## Production Setup

```bash
# 1. Run automated production setup
./scripts/docker-setup.sh prod

# 2. Edit .env.production
# - Add your API keys (Anthropic, Supabase, Unsplash)
# - Update NEXT_PUBLIC_APP_URL
# - Configure domain settings

# 3. Start production stack
docker-compose -f docker-compose.production.yml up -d

# 4. Access services
# App: http://localhost:3000
# Grafana: http://localhost:3001 (admin/[password from .env])
# Prometheus: http://localhost:9090
```

## What's Included

### Development Stack

- ✅ Next.js 15.5 with hot reload
- ✅ Redis cache
- ✅ Redis Commander (optional GUI)
- ✅ Source code volume mounting
- ✅ Debug logging

### Production Stack

- ✅ Next.js 15.5 (optimized standalone build)
- ✅ Redis cache with persistence
- ✅ Nginx reverse proxy
- ✅ Prometheus monitoring
- ✅ Grafana dashboards
- ✅ Health checks
- ✅ Resource limits
- ✅ Security hardening

## Common Commands

### Development

```bash
# Start
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Restart with fresh build
docker-compose up --build
```

### Production

```bash
# Start
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f app

# Restart app only (no downtime)
docker-compose -f docker-compose.production.yml up -d --no-deps app

# Stop
docker-compose -f docker-compose.production.yml down
```

## Environment Variables

### Required for Development

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
```

### Required for Production

All development variables plus:

```bash
API_SECRET_KEY=...  # Generate with crypto.randomBytes
JWT_SECRET=...      # Generate with crypto.randomBytes
SESSION_SECRET=...  # Generate with crypto.randomBytes
REDIS_PASSWORD=...  # Strong password
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Generate keys with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Troubleshooting

### Port already in use

```bash
# Check what's using port 3000
lsof -i :3000

# Stop containers using the port
docker-compose down
```

### Build errors

```bash
# Clean everything and rebuild
docker-compose down -v
docker builder prune -a
docker-compose build --no-cache
docker-compose up
```

### Can't connect to Redis

```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec describe-it-redis-dev redis-cli ping
# Should return: PONG
```

### Permission errors (Linux)

```bash
# Fix file ownership
sudo chown -R $(whoami):$(whoami) .

# Restart Docker daemon
sudo systemctl restart docker
```

## Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"..."}

# Redis health
docker exec describe-it-redis-dev redis-cli ping
# Expected: PONG

# All services status
docker ps
```

## File Structure

```
describe_it/
├── Dockerfile                      # Production multi-stage build
├── Dockerfile.dev                  # Development with hot reload
├── docker-compose.yml              # Development stack
├── docker-compose.production.yml   # Production stack
├── .dockerignore                   # Build optimization
├── .env.production.example         # Production env template
├── scripts/
│   └── docker-setup.sh            # Automated setup script
└── docs/
    ├── DOCKER_DEPLOYMENT.md       # Full deployment guide
    └── DOCKER_SUMMARY.md          # Technical overview
```

## Next Steps

1. **Development**: Start coding! Changes auto-reload.
2. **Production**: Configure SSL, domain, monitoring alerts
3. **CI/CD**: Set up GitHub Actions for automated deployments
4. **Monitoring**: Explore Grafana dashboards at :3001

## Full Documentation

- 📖 [Complete Deployment Guide](docs/DOCKER_DEPLOYMENT.md)
- 📋 [Technical Summary](docs/DOCKER_SUMMARY.md)
- 🔄 [GitHub Actions CI/CD](.github/workflows/docker-deploy.yml)
- 🛠️ [Setup Script](scripts/docker-setup.sh)

## Support

Issues? Check:

1. [Troubleshooting Guide](docs/DOCKER_DEPLOYMENT.md#troubleshooting)
2. [GitHub Issues](https://github.com/your-org/describe-it/issues)
3. Docker logs: `docker-compose logs -f`

---

**Ready to deploy?** → See [DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)
