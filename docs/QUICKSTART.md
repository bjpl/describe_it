# Describe-It Developer Quickstart

A rapid onboarding guide for developers to get the Describe-It Spanish learning application running locally in minutes.

## Prerequisites

**Required:**

- Node.js 20.11.0+ (check: `node --version`)
- npm 10.0.0+ (check: `npm --version`)

**Optional:**

- Docker Desktop (for containerized deployment)
- Git (for version control)

## Quick Setup (5 Minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/describe_it.git
cd describe_it

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env.local

# Generate required security keys
node -e "console.log('API_SECRET_KEY=' + require('crypto').randomBytes(32).toString('hex'))" >> .env.local
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> .env.local
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(16).toString('hex'))" >> .env.local
```

Edit `.env.local` and add your API keys:

```bash
# Required API Keys
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Get API Keys:**

- Anthropic: https://console.anthropic.com/settings/keys
- Unsplash: https://unsplash.com/developers
- Supabase: https://supabase.com/dashboard (create free project)

### 3. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** - your app is now running!

## Testing

### Run All Tests

```bash
# Unit tests (watch mode)
npm run test

# Unit tests (single run)
npm run test:run

# With coverage report
npm run test:coverage
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# Quick smoke tests
npm run test:smoke
```

### Test UI

```bash
# Interactive test UI (Vitest)
npm run test:ui
```

## Build and Deploy

### Local Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start

# Visit http://localhost:3000
```

### Docker Deployment

```bash
# Development environment
npm run deploy:docker:dev

# Production environment
npm run deploy:docker

# Or use docker-compose directly
docker-compose up --build
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Project Structure

```
describe-it/
├── src/
│   ├── app/                 # Next.js 15 App Router
│   │   ├── api/             # API routes
│   │   ├── auth/            # Authentication pages
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── ImageSearch/     # Unsplash integration
│   │   ├── ImageViewer/     # Image display
│   │   ├── DescriptionTabs/ # AI-generated descriptions
│   │   └── QuestionAnswerPanel/ # Interactive Q&A
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core libraries
│   │   ├── api/             # API clients (Anthropic, Unsplash)
│   │   ├── database/        # Supabase utilities
│   │   └── store/           # Zustand state management
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── tests/                   # Test suites
│   ├── unit/                # Unit tests (Vitest)
│   ├── integration/         # Integration tests
│   └── e2e/                 # E2E tests (Playwright)
├── docs/                    # Documentation
├── config/                  # Configuration files
└── scripts/                 # Build and utility scripts
```

## Key Technologies

**Frontend:**

- Next.js 15.5 (App Router)
- React 19 with TypeScript 5.9
- Tailwind CSS + Radix UI
- Framer Motion (animations)

**Backend:**

- Next.js API Routes
- Supabase (PostgreSQL + Auth)
- Anthropic Claude Sonnet 4.5 (AI)
- Unsplash API (images)

**State Management:**

- TanStack Query 5.90 (server state)
- Zustand 4.4 (client state)

**Testing:**

- Vitest 3.2 (unit/integration)
- Playwright 1.55 (E2E)
- Testing Library (React)

**Monitoring:**

- Sentry 10.26 (error tracking)
- Web Vitals (performance)

## Common Development Tasks

### Database Operations

```bash
# Verify database connection
npm run db:verify

# Deploy migrations
npm run db:deploy

# Generate TypeScript types from database
npm run db:types
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Format code
npm run format
```

### Performance

```bash
# Run performance tests
npm run test:perf

# Monitor web vitals
npm run monitor:vitals

# Bundle analysis
npm run analyze
```

### Health Checks

```bash
# Check application health
npm run health

# Security audit
npm run security:audit

# Check for outdated dependencies
npm run deps:check
```

## Environment Variables

### Required for Core Features

```bash
# AI-powered descriptions
ANTHROPIC_API_KEY=sk-ant-xxx

# Image search
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=xxx

# Database and authentication
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# Security
API_SECRET_KEY=xxx
JWT_SECRET=xxx
SESSION_SECRET=xxx
```

### Optional Features

```bash
# Error monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Redis caching
REDIS_URL=redis://localhost:6379

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
```

See `.env.example` for complete configuration options.

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

### Module Not Found Errors

```bash
# Clear cache and reinstall
npm run clean
npm run reinstall
```

### Database Connection Issues

```bash
# Test Supabase connection
npm run test:supabase

# Verify environment variables
npm run validate:env
```

### TypeScript Errors

```bash
# Clean build artifacts
npm run clean

# Regenerate types
npm run db:types
npm run typecheck
```

### Test Failures

```bash
# Run tests in watch mode to debug
npm run test:watch

# Check specific test file
npm run test tests/path/to/test.ts
```

## Development Workflow

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code with TypeScript strict mode
   - Add tests for new features
   - Update documentation as needed

3. **Verify Quality**

   ```bash
   npm run lint
   npm run typecheck
   npm run test:run
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## Next Steps

**Essential Reading:**

- [Architecture Guide](architecture/ARCHITECTURE.md) - System design and patterns
- [API Documentation](api/api-documentation.md) - REST API reference
- [Contributing Guide](guides/CONTRIBUTING.md) - Development standards

**Feature Implementation:**

- [GOAP Quick Start](goap-quick-start.md) - Implementation planning
- [Service Layer Guide](SERVICE_LAYER_GUIDE.md) - Backend architecture
- [Testing Guide](testing/testing-summary.md) - Testing approach

**Production Deployment:**

- [Production Checklist](deployment/DEPLOYMENT_CHECKLIST.md)
- [Docker Guide](DOCKER_DEPLOYMENT.md)
- [Security Documentation](security/)

## Getting Help

**Documentation:**

- `/docs` - Comprehensive documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI agent instructions

**Resources:**

- GitHub Issues: Report bugs and feature requests
- Pull Requests: Contribute to the project
- Discussions: Ask questions and share ideas

**Live Demo:**

- Production: https://describe-it.vercel.app
- Staging: Contact maintainers for access

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start prod server

# Testing
npm run test             # Unit tests (watch)
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Quality
npm run lint             # Lint code
npm run typecheck        # Type checking
npm run format           # Format code

# Database
npm run db:verify        # Test connection
npm run db:deploy        # Run migrations
npm run db:types         # Generate types

# Docker
npm run deploy:docker:dev  # Dev environment
npm run deploy:docker      # Production

# Monitoring
npm run health           # Health check
npm run perf:monitor     # Performance
```

---

**Ready to Code?** Start with `npm run dev` and visit http://localhost:3000

For detailed documentation, see `/docs` directory or read the full [README.md](../README.md).
