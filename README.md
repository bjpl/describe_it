# Describe It - Spanish Learning through Visual Intelligence

A comprehensive Next.js 14 application that combines visual learning with AI-powered language education, helping users learn Spanish through interactive image descriptions, Q&A sessions, and vocabulary extraction.

## 🌟 Features

### Core Functionality

- **Multi-style Image Descriptions**: Generate descriptions in 5 different styles (Narrativo, Poético, Académico, Conversacional, Infantil)
- **Interactive Q&A System**: Context-aware questions with difficulty levels and confidence scoring
- **Smart Phrase Extraction**: Categorized vocabulary extraction with learning features
- **Session Management**: Track progress, export data, and maintain learning history
- **Real-time Collaboration**: Live updates and shared learning sessions

### Technical Features

- **Next.js 14 App Router** with TypeScript strict mode
- **Supabase Integration** for auth, database, and real-time features
- **Vercel KV** for Redis caching and session management
- **OpenAI GPT-4** for AI-powered content generation
- **Unsplash API** for high-quality image search
- **React Query** for data fetching and caching
- **Zustand** for state management
- **Radix UI** for accessible components
- **Tailwind CSS** for styling

## 🚀 Quick Start

> Last deployed: December 9, 2024 - Cache cleared and fixed runtime errors

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
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Unsplash
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Vercel KV (will be auto-configured on Vercel)
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
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

For detailed security information, see [Security Documentation](docs/SECURITY.md).

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
- **[Contributing Guide](CONTRIBUTING.md)** - Code standards, workflow, and best practices
- **[Troubleshooting](docs/guides/troubleshooting.md)** - Common issues and solutions

### Developer Resources
- **[API Documentation](docs/api/api-documentation.md)** - Complete REST API reference
- **[Architecture Overview](docs/architecture/ARCHITECTURE.md)** - System design and patterns
- **[Security Guide](docs/setup/SECURITY.md)** - Security measures and compliance
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

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

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
