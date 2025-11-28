# Database Migrations Documentation

Complete guide to deploying and managing the Supabase database for the Describe It Spanish learning application.

## Quick Navigation

- **[Quick Start Guide](QUICK_START.md)** - Deploy in 3 steps
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Comprehensive deployment instructions
- **[Migration Summary](MIGRATION_SUMMARY.md)** - Complete schema documentation

## Quick Deploy

```bash
# 1. Deploy all migrations
npm run db:deploy

# 2. Verify everything works
npm run db:verify

# 3. Start the app
npm run dev
```

## What Gets Deployed

### Database Tables (18 total)

**Core Learning System:**

- `users` - User profiles and preferences
- `sessions` - Learning session tracking
- `vocabulary_lists` - Word collections by theme
- `vocabulary_items` - Individual Spanish words (26 sample words)
- `learning_progress` - Spaced repetition tracking
- `saved_descriptions` - AI-generated content
- `qa_responses` - Question-answer tracking

**Settings & Configuration:**

- `user_settings` - User preferences
- `images` - Image metadata and attribution

**Analytics & Monitoring:**

- `user_interactions` - Behavior tracking
- `learning_analytics` - Progress metrics
- `analytics_events` - Event tracking
- `system_alerts` - Monitoring alerts
- `performance_metrics` - Performance data
- `error_logs` - Error tracking
- `user_sessions` - Session metadata
- `api_usage_logs` - API monitoring
- `feature_usage_stats` - Feature analytics

### Custom Types (12 enums)

- Spanish proficiency levels
- Session types
- Difficulty levels
- Learning phases
- Part of speech
- And more...

### Functions (10+)

- Spaced repetition algorithm (SM-2)
- User streak calculation
- Difficulty recommendations
- Data export (GDPR-compliant)
- Statistics updates
- Cleanup utilities

### Views (7)

- Learning dashboards
- Analytics summaries
- Performance metrics
- Error tracking

### Sample Data

- 5 vocabulary lists (26 Spanish words)
- 3 sample images
- Default settings template

## Migration Files

Located in `supabase/migrations/`:

| Order | File                                         | Purpose                      | Tables    |
| ----- | -------------------------------------------- | ---------------------------- | --------- |
| 1     | `001_initial_schema.sql`                     | Core tables and structure    | 11        |
| 2     | `002_seed_data.sql`                          | Sample vocabulary and images | Data only |
| 3     | `003_advanced_features.sql`                  | Functions, views, triggers   | 7 views   |
| 4     | `20251007000000_create_analytics_events.sql` | Analytics infrastructure     | 7         |

**Important:** Migrations must run in this exact order.

## Deployment Methods

### Option 1: Automatic (Recommended)

```bash
npm run db:deploy
```

Runs the deployment script which:

- Checks environment variables
- Connects to Supabase
- Runs migrations in correct order
- Verifies successful deployment

### Option 2: Manual

1. Open Supabase Dashboard SQL Editor
2. Copy and run each migration file in order
3. Verify tables were created

### Option 3: Supabase CLI

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Prerequisites

### Required Environment Variables

In `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Required Tools

- Node.js 20.11.0+
- npm 10.0.0+
- Supabase account and project

## Verification

After deployment, verify everything works:

```bash
npm run db:verify
```

Expected output:

```
✓ Database connection established
✓ All 18 tables verified
✓ Found 5 vocabulary lists
  - Primeras Palabras: 6 words
  - Colores y Formas: 5 words
  - Casa y Familia: 5 words
  - Comida y Bebida: 5 words
  - Verbos Comunes: 5 words
✓ Sample data present
✓ RLS policies enabled
Success rate: 100%
```

## Next Steps

After successful deployment:

1. **Test the Application**

   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

2. **Explore Vocabulary**
   - Navigate to Vocabulary section
   - Search for Spanish words
   - Filter by difficulty/category

3. **Enable User Authentication**
   - Configure Supabase Auth providers
   - Set up email/password or OAuth

---

**Ready to deploy?** Run `npm run db:deploy` to get started!

For detailed instructions, see [QUICK_START.md](QUICK_START.md)
