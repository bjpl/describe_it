# Describe It

A Spanish learning application that combines visual learning with AI-powered language education through interactive image descriptions, Q&A sessions, and vocabulary extraction.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Performance](#performance)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

Describe It is a Next.js 15.5 application designed for Spanish language learners. The platform uses AI-powered image analysis to generate contextual descriptions in multiple styles, helping users improve their language skills through visual learning, interactive exercises, and vocabulary building.

**Version:** 1.0.0
**Status:** Production Ready
**Deployment:** https://describe-it.vercel.app

### Core Features

- Search and select images from Unsplash
- Generate AI descriptions in 5 Spanish styles
- Toggle between Spanish and English translations
- Practice with interactive Q&A questions
- Extract and study vocabulary phrases
- Save session data and export reports
- User authentication and profile management

### Future Roadmap

- Real-time collaboration
- Spaced repetition system
- Audio pronunciation features
- Enhanced analytics dashboard
- Additional language support

## Features

### Core Functionality

- **Multi-style AI Descriptions**: Generate image descriptions in five distinct Spanish styles (Narrativo, Poético, Académico, Conversacional, and Infantil)
- **Interactive Q&A System**: Practice comprehension with context-aware questions and immediate feedback
- **Smart Vocabulary Extraction**: Automatically extract and categorize key phrases and vocabulary from descriptions
- **Image Search**: Browse and search high-quality images via Unsplash API integration
- **Session Management**: Track learning progress, save sessions, and export data
- **Multi-language Support**: Toggle between Spanish and English descriptions

### Technical Implementation

- **Frontend**: Next.js 15.5 App Router with React 19 and TypeScript 5.9 (strict mode)
- **AI**: Anthropic Claude SDK 0.70.1 for intelligent image analysis and content generation
- **Backend**: Supabase 2.84.0 (authentication, PostgreSQL database, storage)
- **State Management**: TanStack Query 5.90 for server state, Zustand 4.4 for client state
- **Monitoring**: Sentry 10.26.0 for error tracking and performance monitoring
- **UI Components**: Radix UI with Tailwind CSS and Framer Motion animations
- **Performance**: Multi-layer caching, code splitting, and optimistic updates

## Live Demo

**Deployed Application:** [View Live Demo](https://describe-it.vercel.app)

This project demonstrates full-stack Next.js 15.5 development with AI integration and production-grade architecture. The implementation showcases modern React patterns, TypeScript strict mode, multi-layered caching strategies, and comprehensive security implementations.

## Roadmap

### Planned Features

- **Real-time Collaboration**: Multi-user sessions with live updates and shared progress
- **Spaced Repetition System**: Intelligent review scheduling for vocabulary retention
- **Audio Pronunciation**: Text-to-speech for Spanish phrases and descriptions
- **User Progress Analytics**: Detailed learning metrics and achievement tracking
- **Custom Vocabulary Lists**: Create and manage personalized word collections
- **Offline Mode**: PWA support for learning without internet connection
- **Mobile App**: Native iOS and Android applications

### Under Consideration

- **Additional Languages**: Expand beyond Spanish (French, German, Italian)
- **Community Features**: Share descriptions and study materials
- **Gamification**: Streaks, badges, and learning challenges
- **AI Tutor Mode**: Conversational practice with AI feedback

## Technical Overview

**Key Technologies:**

- Next.js 15.5 App Router with React 19 and TypeScript 5.9
- Anthropic Claude SDK 0.70.1 for AI-powered image analysis
- Supabase 2.84.0 (Authentication, PostgreSQL, Storage)
- TanStack Query 5.90 for server state management
- Zustand 4.4 for client state management
- Radix UI for accessible components
- Tailwind CSS + Framer Motion for styling and animations
- Sentry 10.26.0 for production monitoring

**Implementation Highlights:**

- Multi-style AI-generated descriptions (5 distinct Spanish writing styles)
- Interactive Q&A system with context-aware questions
- Smart vocabulary extraction and categorization
- Comprehensive security: JWT auth, Row-Level Security, rate limiting, input validation
- Multi-layer caching: Browser → CDN → Application → Database
- Core Web Vitals monitoring with real-time metrics
- Production deployment on Vercel with Supabase backend

## Exploring the Code

The project structure demonstrates clean architecture and separation of concerns:

```
describe-it/
├── src/
│   ├── app/                  # Next.js app router
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   ├── api/              # API integrations (Anthropic, Unsplash)
│   │   ├── database/         # Database utilities and migrations
│   │   └── store/            # State management (Zustand)
│   ├── types/                # TypeScript definitions
│   └── utils/                # Utility functions
├── tests/                    # Vitest unit and Playwright E2E tests
└── docs/                     # Comprehensive documentation
```

**For Technical Review:**

Those interested in the implementation details can explore:

- `/src/app/api` directory for API route implementations
- `/src/lib/database/migrations` for database schema and RLS policies
- `/docs/security` for comprehensive security documentation
- `/docs/architecture` for system design patterns
- `/tests` directory for testing approach (Vitest + Playwright)

**Local Development** _(Optional for developers)_

<details>
<summary>Click to expand setup instructions</summary>

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Supabase account
- Anthropic API key
- Unsplash API key

### Setup

```bash
# Clone repository
git clone https://github.com/bjpl/describe_it.git
cd describe_it
npm install

# Configure environment variables
cp docs/setup/.env.local.example .env.local
# Update .env.local with your API keys

# Run database migrations
npx supabase migration up

# Start development server
npm run dev
```

The application will be available at http://localhost:3000.

### Build Commands

```bash
npm run build       # Build for production
npm run start       # Start production server
npm run test        # Run unit tests
npm run test:e2e    # Run E2E tests
npm run lint        # Lint and format code
npm run typecheck   # TypeScript type checking
```

</details>

## Project Structure

```
describe-it/
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/           # React components
│   │   ├── ImageSearch/      # Image search UI
│   │   ├── ImageViewer/      # Image display
│   │   ├── DescriptionTabs/  # Multi-style descriptions
│   │   ├── QuestionAnswerPanel/  # Q&A interface
│   │   └── PhraseExtractor/  # Vocabulary extraction
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Core libraries
│   │   ├── api/              # API integrations
│   │   ├── database/         # Database utilities
│   │   └── store/            # State management
│   ├── types/                # TypeScript definitions
│   └── utils/                # Utility functions
├── tests/                    # Test files
├── public/                   # Static assets
└── docs/                     # Documentation
```

## Development

### Testing

Run unit tests with Vitest:

```bash
npm run test
```

Run end-to-end tests with Playwright:

```bash
npm run test:e2e
```

### Code Quality

Linting and formatting:

```bash
npm run lint
npm run typecheck
npm run format
```

## Deployment

### Current Deployment Status

- **Platform**: Vercel (Production)
- **URL**: https://describe-it.vercel.app
- **Database**: Supabase (PostgreSQL)
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry

### Deploying Your Own Instance

#### 1. Vercel Setup

```bash
# Push to GitHub first
git push origin main

# Deploy to Vercel (or use Vercel dashboard)
vercel --prod
```

#### 2. Environment Variables (Required)

Configure in Vercel dashboard or `.env.local`:

```bash
# Anthropic (AI descriptions)
ANTHROPIC_API_KEY=your_anthropic_key

# Unsplash (image search)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_key

# Supabase (database & auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Sentry (error tracking - optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

#### 3. Supabase Configuration

1. Create new project at [supabase.com](https://supabase.com)
2. Run database migrations (see `/src/lib/database/migrations/`)
3. Enable Row Level Security on all tables
4. Configure authentication providers if needed
5. Copy project URL and anon key to environment variables

#### 4. Optional Enhancements

- **Vercel KV**: Enable Redis caching for improved performance
- **Vercel Blob**: Add file upload storage support
- **Custom Domain**: Configure in Vercel settings

## Security

The application implements comprehensive security measures:

- JWT-based authentication via Supabase Auth
- OAuth integration with Google and GitHub
- Row-Level Security (RLS) on all database tables
- Role-based access control
- Rate limiting to prevent abuse
- Input validation with Zod schemas
- CORS configuration with environment-specific origins
- Request sanitization to prevent XSS attacks
- Encryption at rest and TLS 1.3 for data in transit
- Content Security Policy (CSP)
- Security headers (X-Frame-Options, X-Content-Type-Options)

For detailed security information, see the [Security Documentation](docs/security/).

## Performance

### Monitoring

- Core Web Vitals tracking (LCP, FID, CLS, TTFB)
- Real-time performance metrics with automatic alerting
- Custom metrics for API response times and user interactions
- Bundle size analysis with automated optimization suggestions

### Caching

- Multi-layer caching: Browser → CDN → Application → Database
- React Query for intelligent server state management
- Vercel KV (Redis) for session and API response caching
- Optimistic updates for improved user experience

### Optimization

- Image optimization with Next.js Image component
- Code splitting for faster initial loads
- Lazy loading for components and routes
- Service worker for offline functionality

## Architecture

The application follows a modern, scalable architecture:

- Layered architecture with clear separation of concerns
- Microservices pattern for external integrations
- Event-driven architecture for real-time updates
- Repository pattern for data access abstraction
- Zustand for client-side application state
- React Query for server state and caching
- React Context for component-level state sharing

For comprehensive architecture information, see [Architecture Documentation](docs/ARCHITECTURE.md).

## Documentation

Complete documentation is available in the `/docs` directory:

- [Setup Guide](docs/setup/SETUP.md) - Quick start instructions
- [API Documentation](docs/api/api-documentation.md) - REST API reference
- [Contributing Guide](docs/guides/CONTRIBUTING.md) - Development workflow and standards
- [Troubleshooting](docs/guides/troubleshooting.md) - Common issues and solutions
- [Architecture Overview](docs/architecture/ARCHITECTURE.md) - System design and patterns
- [Deployment Guide](docs/deployment/deployment-guide.md) - Production deployment instructions
- [Testing Summary](docs/testing/testing-summary.md) - Testing approach and coverage

## Contributing

Contributions are welcome. Please review the [Contributing Guide](docs/guides/CONTRIBUTING.md) for:

- Development setup and environment configuration
- Code standards for TypeScript, React, and API development
- Testing requirements for unit, integration, and E2E tests
- Commit conventions and pull request process

Areas for contribution include bug fixes, new features, documentation improvements, UI/UX enhancements, performance optimizations, and internationalization.

## License

MIT License - see LICENSE file for details.

---

Built with Next.js, Supabase, and AI
