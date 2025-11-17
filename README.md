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

Describe It is a comprehensive Next.js 15.5 application designed for Spanish language learners. The platform utilizes AI-powered image analysis to generate contextual descriptions in multiple styles, enabling users to improve their language skills through visual learning, interactive comprehension exercises, and vocabulary building.

**Current Version:** 0.1.0
**Status:** Active Production
**Deployment:** Vercel

## Features

### Core Functionality
- Multi-style image descriptions in five formats: Narrativo, Poético, Académico, Conversacional, and Infantil
- Interactive Q&A system with context-aware questions, difficulty levels, and confidence scoring
- Smart phrase extraction with categorized vocabulary and integrated learning features
- Session management for progress tracking, data export, and learning history
- Real-time collaboration with live updates and shared learning sessions

### Technical Capabilities
- Built on Next.js 15.5 App Router with React 19 and TypeScript 5.9 strict mode
- AI integration via Anthropic Claude SDK 0.65.0 for image analysis and content generation
- Backend powered by Supabase 2.58.0 for authentication, database, and real-time features
- Production monitoring with Sentry 10.17.0 for error tracking
- Data management using TanStack Query 5.90 for caching and Zustand for state
- Unsplash API integration for high-quality image search
- Accessible UI components built with Radix UI
- Styled with Tailwind CSS

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or pnpm
- Supabase account
- OpenAI API key
- Unsplash API key
- Vercel account (for deployment)

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/bjpl/describe_it.git
cd describe_it
npm install
```

Configure environment variables:

```bash
cp docs/setup/.env.local.example .env.local
```

Update `.env.local` with required API keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-proj-your-key
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-key
UNSPLASH_ACCESS_KEY=your-unsplash-key
```

Generate security keys:

```bash
node -e "console.log('API_SECRET_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(16).toString('hex'))"
```

Run database migrations:

```bash
npx supabase migration up
```

## Usage

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

Build for production:

```bash
npm run build
npm run start
```

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

### Vercel Deployment

Push code to GitHub and import the project in Vercel:

1. Visit vercel.com/new
2. Import GitHub repository
3. Configure environment variables in Vercel dashboard
4. Set up Vercel KV for caching (optional)
5. Set up Vercel Blob Storage for file uploads (optional)

Deploy:

```bash
vercel --prod
```

### Supabase Configuration

Create a Supabase project and configure:

1. Run migrations from `src/lib/database/migrations/`
2. Enable Row Level Security on all tables
3. Configure OAuth providers (Google, GitHub)
4. Set redirect URLs for authentication

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
