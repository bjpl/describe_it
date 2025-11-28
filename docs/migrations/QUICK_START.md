# Database Deployment - Quick Start Guide

## TL;DR - Deploy in 3 Steps

```bash
# 1. Deploy migrations
npm run db:deploy

# 2. Verify database
npm run db:verify

# 3. Start the app
npm run dev
```

## Detailed Instructions

### Step 1: Prerequisites

Ensure you have your `.env.local` file configured with Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 2: Choose Deployment Method

#### Option A: Automatic (Recommended)

```bash
npm run db:deploy
```

Select option 1 when prompted. This will:

- Run all migrations in correct order
- Create all tables, indexes, and functions
- Insert sample vocabulary data
- Set up analytics infrastructure

#### Option B: Manual Deployment

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to SQL Editor
3. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`
   - `supabase/migrations/003_advanced_features.sql`
   - `supabase/migrations/20251007000000_create_analytics_events.sql`

### Step 3: Verify Deployment

```bash
npm run db:verify
```

Expected output:

```
✓ Database connection established
✓ Table: users
✓ Table: sessions
✓ Table: vocabulary_items
...
✓ Found 5 vocabulary lists
  - Primeras Palabras: 6 words
  - Colores y Formas: 5 words
  - Casa y Familia: 5 words
  - Comida y Bebida: 5 words
  - Verbos Comunes: 5 words

Success rate: 100%
✓ Database verification complete!
```

### Step 4: Test the Application

```bash
npm run dev
```

Visit: http://localhost:3000

Navigate to the Vocabulary section to see the database in action.

## What Gets Created

### Tables (18 total)

- **Core:** users, sessions, images
- **Vocabulary:** vocabulary_lists, vocabulary_items, learning_progress
- **Content:** saved_descriptions, qa_responses
- **Settings:** user_settings
- **Analytics:** 9 analytics tables

### Enums (12 types)

Spanish proficiency levels, session types, difficulty levels, etc.

### Functions (10+)

Spaced repetition, statistics, cleanup, export functions

### Views (7)

Dashboard views, analytics summaries, performance metrics

### Sample Data

- 5 vocabulary lists
- 26 Spanish words/phrases
- 3 sample images
- Default settings template

## Troubleshooting

### "Migration failed"

- Ensure migrations run in correct order
- Check for existing tables (may need to drop first)
- Verify service role key has proper permissions

### "Connection refused"

- Check `.env.local` file exists and has correct values
- Verify Supabase project is active
- Check network connectivity

### "Table already exists"

- Tables were created in previous run
- Safe to continue if verification passes
- Or drop all tables and re-run

## Common Issues

### Issue: No sample data appearing

**Solution:**

```bash
# Re-run seed migration only
npx supabase db push --file supabase/migrations/002_seed_data.sql
```

### Issue: RLS policies blocking access

**Solution:**

- Ensure user is authenticated
- Check RLS policies in Supabase dashboard
- Use service role key for testing

### Issue: Functions not found

**Solution:**

```bash
# Re-run advanced features migration
npx supabase db push --file supabase/migrations/003_advanced_features.sql
```

## Next Steps

After successful deployment:

1. **Test Vocabulary System**
   - Navigate to Vocabulary section
   - Search for Spanish words
   - Filter by difficulty/category

2. **Enable User Authentication**
   - Set up Supabase Auth providers
   - Configure email/password or OAuth

3. **Create User Account**
   - Sign up through the app
   - Complete user profile
   - Set learning preferences

4. **Start Learning**
   - Browse vocabulary
   - Generate image descriptions
   - Take Q&A quizzes
   - Track your progress

## Useful Commands

```bash
# Deploy migrations
npm run db:deploy

# Verify database structure
npm run db:verify

# Test database connection
npm run db:test

# Reset database (WARNING: Deletes all data)
npm run db:reset

# Generate TypeScript types from database
npm run db:types
```

## Database Management

### View Tables

Go to: Supabase Dashboard > Table Editor

### Run SQL Queries

Go to: Supabase Dashboard > SQL Editor

### Monitor Performance

Go to: Supabase Dashboard > Database > Logs

### Configure RLS Policies

Go to: Supabase Dashboard > Authentication > Policies

## Support Resources

- **Full Documentation:** `docs/migrations/DEPLOYMENT_GUIDE.md`
- **Database Schema:** `supabase/migrations/001_initial_schema.sql`
- **API Reference:** `docs/api/DATABASE_API.md`
- **Troubleshooting:** Check database logs in Supabase dashboard

---

**Ready to deploy?** Run `npm run db:deploy` to get started!
