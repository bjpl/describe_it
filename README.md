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

- Row-level security on all database tables
- API rate limiting and caching
- Input validation with Zod
- XSS protection
- CORS configuration
- Environment variable validation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

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
