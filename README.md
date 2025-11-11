# Describe It - Spanish Learning through Visual Intelligence

**Version:** 0.1.0 | **Status:** ACTIVE - 10 commits in last 30 days

A comprehensive Next.js 15.5 application that combines visual learning with AI-powered language education, helping users learn Spanish through interactive image descriptions, Q&A sessions, and vocabulary extraction.

## 🌟 Features

### Core Functionality

- **Multi-style Image Descriptions**: Generate descriptions in 5 different styles (Narrativo, Poético, Académico, Conversacional, Infantil)
- **Interactive Q&A System**: Context-aware questions with difficulty levels and confidence scoring
- **Smart Phrase Extraction**: Categorized vocabulary extraction with learning features
- **Session Management**: Track progress, export data, and maintain learning history
- **Real-time Collaboration**: Live updates and shared learning sessions

### Technical Features

- **Next.js 15.5 App Router** with React 19 and TypeScript 5.9 strict mode
- **Anthropic Claude SDK 0.65.0** for AI-powered image analysis and content generation
- **Supabase 2.58.0** for auth, database, and real-time features
- **Sentry 10.17.0** for production monitoring and error tracking
- **TanStack Query 5.90** for data fetching and caching
- **Zustand** for state management
- **Unsplash API** for high-quality image search
- **Radix UI** for accessible components
- **Tailwind CSS** for styling

## 🚀 Quick Start

**Deployment Status:** Production-ready on Vercel
**Recent Activity:** Database migrations, Plans A/B/C completion, Build/test infrastructure fixes

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account
- OpenAI API key
- Unsplash API key
- Vercel account (for deployment)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/describe-it.git
cd describe-it
```

2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp docs/setup/.env.local.example .env.local
```

4. Configure environment variables in `.env.local`:

Follow the comprehensive setup instructions below to configure all required environment variables.

### 🔧 Environment Configuration

#### Required Environment Variables

**For core functionality, you need these API keys:**

| Service | Variable | Required | Get From |
|---------|----------|----------|----------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` | ✅ | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | ✅ | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| **OpenAI** | `OPENAI_API_KEY` | ✅ | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **Unsplash** | `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | ✅ | [Unsplash Developers](https://unsplash.com/developers) |
| **Unsplash** | `UNSPLASH_ACCESS_KEY` | ✅ | Same as above (for server-side) |

#### Optional but Recommended

| Service | Variable | Purpose | Get From |
|---------|----------|---------|----------|
| **Vercel KV** | `KV_REST_API_URL` | Redis caching | [Vercel Dashboard](https://vercel.com/dashboard/stores) → Storage |
| **Vercel KV** | `KV_REST_API_TOKEN` | Redis auth | [Vercel Dashboard](https://vercel.com/dashboard/stores) → Storage |

#### Security Configuration (Auto-generated)

Generate these security keys using the Node.js commands provided:

```bash
# Generate API secret (32 bytes)
node -e "console.log('API_SECRET_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret (32 bytes)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret (16 bytes)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(16).toString('hex'))"
```

#### Quick Setup Example

Create your `.env.local` file with the following structure:

```bash
# Copy from docs/setup/.env.local.example
cp docs/setup/.env.local.example .env.local
```

Then edit `.env.local` with your actual values:

```env
# Required API Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your-unsplash-access-key
UNSPLASH_ACCESS_KEY=your-unsplash-access-key

# Security Keys (generate with commands above)
API_SECRET_KEY=your-generated-32-byte-hex-key
JWT_SECRET=your-generated-32-byte-hex-key
SESSION_SECRET=your-generated-16-byte-hex-key

# Optional: Vercel KV (for better caching)
KV_REST_API_URL=https://your-kv-instance.kv.vercel-storage.com
KV_REST_API_TOKEN=your-kv-token
```

#### Environment Files Overview

The project uses multiple environment files for different purposes:

- **`docs/setup/.env.local.example`** - Template with all variables and documentation
- **`.env.local`** - Your local development configuration (not committed)
- **`.env.production`** - Production configuration (not committed)
- **`.env.example`** - Comprehensive template with all options

#### Typed Environment Access

The project includes typed environment configuration at `src/lib/config/env.ts` which:

- ✅ Validates all required variables at startup
- ✅ Provides TypeScript types for all environment variables
- ✅ Separates client-side and server-side variables for security
- ✅ Includes helper functions for feature flags and arrays
- ✅ Prevents accidental exposure of secrets to the client

Usage example:

```typescript
import { env, clientEnv, serverEnv, getFeatureFlag } from '@/lib/config/env';

// Client-side (safe to use anywhere)
const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;

// Server-side only (API routes, server components)
const openaiKey = serverEnv.OPENAI_API_KEY;

// Feature flags
const isImageSearchEnabled = getFeatureFlag('ENABLE_IMAGE_SEARCH');
```

5. Run database migrations:

```bash
npx supabase migration up
```

6. Start development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📦 Project Structure

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
│   │   ├── QuestionAnswerPanel/ # Q&A interface
│   │   └── PhraseExtractor/  # Vocabulary extraction
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core libraries
│   │   ├── api/            # API integrations
│   │   ├── database/       # Database utilities
│   │   └── store/          # State management
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── public/                 # Static assets
└── ...config files
```

## 🔧 Development

### Running Tests

**Testing Framework:** Vitest + Playwright

```bash
npm run test           # Unit tests with Vitest
npm run test:e2e       # E2E tests with Playwright
```

### Linting & Formatting

```bash
npm run lint           # ESLint
npm run typecheck      # TypeScript checking
npm run format         # Prettier formatting
```

### Building for Production

```bash
npm run build
npm run start
```

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import project in Vercel:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure environment variables in Vercel dashboard

3. Set up Vercel KV:
   - In Vercel dashboard, go to Storage
   - Create new KV database
   - Environment variables will be auto-added

4. Set up Vercel Blob Storage:
   - In Storage tab, create Blob store
   - Token will be auto-added to environment

5. Deploy:

```bash
vercel --prod
```

### Supabase Setup

1. Create new Supabase project at [supabase.com](https://supabase.com)

2. Run migrations in Supabase SQL editor:
   - Copy contents from `src/lib/database/migrations/`
   - Execute in order (001 to 010)

3. Enable Row Level Security:
   - Go to Authentication → Policies
   - Enable RLS on all tables

4. Set up Auth:
   - Configure OAuth providers (Google, GitHub)
   - Set redirect URLs

## 📊 Database Schema

### Core Tables

- **users**: User profiles and preferences
- **sessions**: Learning session tracking
- **images**: Unsplash image metadata
- **descriptions**: AI-generated descriptions
- **questions**: Q&A for comprehension
- **phrases**: Extracted vocabulary
- **user_progress**: Learning analytics
- **export_history**: Data export tracking

## 🔐 Security

Describe It implements comprehensive security measures to protect user data and ensure safe operation:

### Authentication & Authorization
- **JWT-based Authentication** via Supabase Auth
- **OAuth Integration** with Google and GitHub
- **Row-Level Security (RLS)** on all database tables
- **Role-based Access Control** for different user types

### API Security
- **Rate Limiting** to prevent abuse (configurable per endpoint)
- **Input Validation** with Zod schemas for type-safe API requests
- **CORS Configuration** with environment-specific origins
- **Request Sanitization** to prevent XSS attacks

### Data Protection
- **Encryption at Rest** (Supabase managed)
- **TLS 1.3** for all data in transit
- **Environment Variable Validation** to prevent misconfiguration
- **Audit Logging** for security events and user actions

### Security Headers
- **Content Security Policy (CSP)** to prevent XSS
- **Subresource Integrity (SRI)** for external scripts
- **Security Headers** (X-Frame-Options, X-Content-Type-Options, etc.)

For detailed security information, see [Security Documentation](docs/security/).

## 📊 Performance & Monitoring

### Web Vitals Monitoring
- **Core Web Vitals** tracking (LCP, FID, CLS, TTFB)
- **Real-time Performance Metrics** with automatic alerting
- **Custom Metrics** for API response times and user interactions
- **Bundle Size Analysis** with automated optimization suggestions

### Caching Strategy
- **Multi-layer Caching**: Browser → CDN → Application → Database
- **React Query** for intelligent server state management
- **Vercel KV (Redis)** for session and API response caching
- **Optimistic Updates** for better user experience

### Performance Features
- **Image Optimization** with Next.js Image component
- **Code Splitting** for faster initial loads
- **Lazy Loading** for components and routes
- **Service Worker** for offline functionality

## 🏗️ Architecture

The application follows a modern, scalable architecture:

### System Design
- **Layered Architecture** with clear separation of concerns
- **Microservices Pattern** for external integrations
- **Event-Driven Architecture** for real-time updates
- **Repository Pattern** for data access abstraction

### State Management
- **Zustand** for client-side application state
- **React Query** for server state and caching
- **React Context** for component-level state sharing
- **Local/Session Storage** for persistence

### Key Architectural Decisions
- [ADR-001: Architecture Overview](docs/adr/001-architecture-overview.md)
- [ADR-002: AI Integration Strategy](docs/adr/002-ai-integration-strategy.md)
- [ADR-003: Database Design](docs/adr/003-database-design.md)

For comprehensive architecture information, see [Architecture Documentation](docs/ARCHITECTURE.md).

## 📚 Documentation

**📖 [Complete Documentation Hub](docs/README.md)** - Organized documentation portal with navigation and search

### Quick Start Guides
- **[Setup Guide](docs/setup/SETUP.md)** - Get started in minutes (works without API keys!)
- **[Contributing Guide](docs/guides/CONTRIBUTING.md)** - Code standards, workflow, and best practices
- **[Troubleshooting](docs/guides/troubleshooting.md)** - Common issues and solutions

### Developer Resources
- **[API Documentation](docs/api/api-documentation.md)** - Complete REST API reference
- **[Architecture Overview](docs/architecture/ARCHITECTURE.md)** - System design and patterns
- **[Security Guide](docs/security/)** - Security measures and compliance
- **[State Management](docs/architecture/STATE_MANAGEMENT.md)** - State architecture and patterns

### Operations & Deployment
- **[Deployment Guide](docs/deployment/deployment-guide.md)** - Production deployment instructions
- **[Environment Configuration](docs/setup/environment-configuration.md)** - Configuration and environment setup

### Architecture Decision Records (ADRs)
- [ADR-001: Architecture Overview](docs/architecture/adr/001-architecture-overview.md)
- [ADR-002: AI Integration Strategy](docs/architecture/adr/002-ai-integration-strategy.md)
- [ADR-003: Database Design](docs/architecture/adr/003-database-design.md)

### Development & Testing
- **[Development Roadmap](docs/development/DEVELOPMENT_ROADMAP.md)** - Feature roadmap and planning
- **[Component Examples](docs/development/component-examples.md)** - React component patterns
- **[Testing Summary](docs/testing/testing-summary.md)** - Testing approach and coverage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/guides/CONTRIBUTING.md) for detailed information on:

### Getting Started
- **Development Setup** - Environment configuration and dependencies
- **Code Standards** - TypeScript, React, and API guidelines
- **Testing Requirements** - Unit, integration, and E2E test expectations
- **Commit Conventions** - Standardized commit message format

### Development Workflow
1. **Fork the repository** and create a feature branch
2. **Follow code standards** as outlined in the contributing guide
3. **Write comprehensive tests** for new functionality
4. **Submit a pull request** with clear description and tests
5. **Code review process** with maintainer feedback

### Areas for Contribution
- **🐛 Bug fixes** - Help improve stability and reliability
- **✨ New features** - Expand learning capabilities and tools
- **📖 Documentation** - Improve guides and API documentation
- **🎨 UI/UX** - Enhance user experience and accessibility
- **⚡ Performance** - Optimize loading times and responsiveness
- **🌐 Internationalization** - Add support for more languages

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Unsplash for image API
- Supabase for backend infrastructure
- Vercel for hosting and edge functions
- Radix UI for accessible components

## 📧 Support

For issues and questions:

- Create an issue on GitHub
- Contact: your-email@example.com

---

Built with ❤️ using Next.js, Supabase, and AI
