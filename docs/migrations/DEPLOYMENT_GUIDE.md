# Database Migration Deployment Guide

## Overview

This guide covers deploying Supabase database migrations for the Describe It Spanish learning application.

## Prerequisites

- Supabase project created
- Environment variables configured in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Database Schema

### Core Tables

1. **users** - Extended user profiles for Spanish learners
   - Profile information
   - Learning preferences
   - Spanish proficiency level
   - Theme and language settings

2. **sessions** - Learning session tracking
   - Session timing and duration
   - Performance metrics (Q&A accuracy, engagement)
   - Content processed (images, descriptions, vocabulary)

3. **images** - Image metadata and attribution
   - Unsplash integration
   - Usage tracking
   - Content suitability ratings

4. **vocabulary_lists** - Word collections
   - Organized by theme/difficulty
   - Public/private sharing
   - Completion statistics

5. **vocabulary_items** - Individual Spanish words/phrases
   - Comprehensive linguistic data
   - Conjugation information (for verbs)
   - Pronunciation (IPA)
   - Context sentences
   - Memory aids and cultural notes

6. **learning_progress** - Spaced repetition tracking
   - Individual word mastery levels
   - Review scheduling (SM-2 algorithm)
   - Performance analytics
   - Error pattern tracking

7. **saved_descriptions** - AI-generated content
   - Bilingual descriptions
   - Associated vocabulary
   - Q&A pairs
   - User ratings and feedback

8. **qa_responses** - Question-answer tracking
   - Response accuracy
   - Timing metrics
   - Difficulty levels
   - Grammar/vocabulary concepts tested

9. **user_settings** - Comprehensive preferences
   - UI/UX settings
   - Learning goals
   - Notification preferences
   - Export settings

10. **user_interactions** - Analytics tracking
    - User behavior patterns
    - Feature usage
    - Session context

11. **learning_analytics** - Aggregated metrics
    - Daily/weekly/monthly summaries
    - Progress trends
    - Goal achievement tracking

### Analytics Tables

12. **analytics_events** - Event tracking
13. **system_alerts** - Monitoring alerts
14. **performance_metrics** - Performance data
15. **error_logs** - Error tracking
16. **user_sessions** - Session metadata
17. **api_usage_logs** - API monitoring
18. **feature_usage_stats** - Feature analytics

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

Use the deployment script:

```bash
chmod +x scripts/deploy-migrations.sh
./scripts/deploy-migrations.sh
```

Choose option 1 for automatic deployment.

### Method 2: Manual Deployment

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to SQL Editor
4. Run migrations in order:

```sql
-- 1. Initial schema (core tables, enums, indexes)
-- Copy from: supabase/migrations/001_initial_schema.sql

-- 2. Seed data (sample vocabulary, images)
-- Copy from: supabase/migrations/002_seed_data.sql

-- 3. Advanced features (functions, views, triggers)
-- Copy from: supabase/migrations/003_advanced_features.sql

-- 4. Analytics tables
-- Copy from: supabase/migrations/20251007000000_create_analytics_events.sql
```

### Method 3: Supabase CLI

```bash
# Initialize Supabase (if not done)
npx supabase init

# Link to remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

## Migration Order

**IMPORTANT:** Migrations must be run in this exact order:

1. `001_initial_schema.sql` - Creates base tables and enums
2. `002_seed_data.sql` - Populates initial data
3. `003_advanced_features.sql` - Adds functions and views
4. `20251007000000_create_analytics_events.sql` - Analytics infrastructure

## Verification

After deployment, verify the database:

```bash
node scripts/verify-database.js
```

Expected output:

```
✓ Database connection established
✓ All 18 tables verified
✓ Sample data present
✓ RLS policies enabled
Success rate: 100%
```

## Database Features

### Enums

```sql
spanish_level          -- beginner, intermediate, advanced
session_type           -- description, qa, vocabulary, mixed
description_style      -- narrativo, poetico, academico, etc.
part_of_speech         -- noun, verb, adjective, etc.
difficulty_level       -- beginner, intermediate, advanced
learning_phase         -- new, learning, review, mastered
qa_difficulty          -- facil, medio, dificil
vocabulary_category    -- basic, intermediate, advanced, custom
spanish_gender         -- masculino, femenino, neutro
theme_preference       -- light, dark, auto
language_preference    -- en, es
export_format          -- json, csv, pdf
```

### Key Functions

```sql
calculate_next_review(ease_factor, response_quality, interval_days)
-- Implements SM-2 spaced repetition algorithm

update_vocabulary_list_statistics(list_id)
-- Updates vocabulary list stats

calculate_user_streak(user_id)
-- Calculates learning streak in days

get_vocabulary_due_for_review(user_id, limit_items)
-- Gets vocabulary items needing review

recommend_difficulty_level(user_id, category_filter)
-- Recommends appropriate difficulty based on performance

export_user_data(user_id)
-- GDPR-compliant data export

cleanup_old_sessions()
-- Removes sessions older than 90 days

update_vocabulary_statistics()
-- Updates vocabulary rankings and statistics
```

### Views

```sql
user_learning_dashboard
-- Complete user learning overview

vocabulary_learning_insights
-- Vocabulary difficulty and learning patterns

session_analytics
-- Session performance metrics

daily_analytics_summary
-- Daily aggregated analytics

feature_usage_summary
-- Feature usage statistics

error_summary
-- Error tracking and patterns

api_performance_summary
-- API endpoint performance
```

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- Users can only access their own data
- Public content is accessible to all
- Shared vocabulary lists respect permissions
- Anonymous access for images
- Admin users have full access

### Triggers

```sql
update_updated_at_column()
-- Auto-updates updated_at timestamps

update_vocabulary_list_stats()
-- Maintains vocabulary list word counts

calculate_session_duration()
-- Auto-calculates session duration

log_user_changes()
-- Logs security-relevant user changes
```

## Sample Data

After migration, the database includes:

### Vocabulary Lists (5 lists)

- **Primeras Palabras** - Basic essentials (hola, gracias, sí, no)
- **Colores y Formas** - Colors and shapes (rojo, azul, círculo)
- **Casa y Familia** - Home and family (madre, padre, casa)
- **Comida y Bebida** - Food and drinks (agua, pan, café)
- **Verbos Comunes** - Common verbs (ser, estar, tener, hacer)

### Sample Images (3 images)

- Mountain landscape
- Cafe interior
- Family dining

## Testing

### Connection Test

```bash
npm run db:test
```

### Manual Tests

```javascript
import { supabase } from '@/lib/supabase/client';

// Test query
const { data, error } = await supabase.from('vocabulary_items').select('*').limit(5);
```

## Troubleshooting

### Connection Issues

**Error:** "Failed to connect to database"

**Solutions:**

1. Check environment variables in `.env.local`
2. Verify Supabase project is active
3. Check API keys are correct
4. Ensure network connectivity

### Migration Errors

**Error:** "relation already exists"

**Solution:** Table already created. Safe to skip or drop and recreate.

**Error:** "permission denied"

**Solution:** Use service role key for migrations.

**Error:** "syntax error"

**Solution:** Ensure migrations run in correct order.

### RLS Issues

**Error:** "row-level security policy"

**Solution:**

- Ensure user is authenticated
- Check RLS policies allow the operation
- Use service role key for admin operations

## Rollback

If needed, rollback migrations:

```sql
-- Drop all tables (CAUTION: DESTRUCTIVE)
DROP TABLE IF EXISTS learning_analytics CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS qa_responses CASCADE;
DROP TABLE IF EXISTS saved_descriptions CASCADE;
DROP TABLE IF EXISTS learning_progress CASCADE;
DROP TABLE IF EXISTS vocabulary_items CASCADE;
DROP TABLE IF EXISTS vocabulary_lists CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop analytics tables
DROP TABLE IF EXISTS feature_usage_stats CASCADE;
DROP TABLE IF EXISTS api_usage_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;

-- Drop enums
DROP TYPE IF EXISTS export_format CASCADE;
DROP TYPE IF EXISTS language_preference CASCADE;
DROP TYPE IF EXISTS theme_preference CASCADE;
DROP TYPE IF EXISTS spanish_gender CASCADE;
DROP TYPE IF EXISTS vocabulary_category CASCADE;
DROP TYPE IF EXISTS qa_difficulty CASCADE;
DROP TYPE IF EXISTS learning_phase CASCADE;
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS part_of_speech CASCADE;
DROP TYPE IF EXISTS description_style CASCADE;
DROP TYPE IF EXISTS session_type CASCADE;
DROP TYPE IF EXISTS spanish_level CASCADE;
```

## Next Steps

After successful deployment:

1. **Enable Authentication**

   ```bash
   # Configure Supabase Auth providers
   ```

2. **Set Up Edge Functions** (optional)

   ```bash
   npx supabase functions deploy
   ```

3. **Configure Storage** (for user images)

   ```bash
   # Set up storage buckets in Supabase dashboard
   ```

4. **Set Up Realtime** (for live updates)

   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE vocabulary_items;
   ```

5. **Configure Backups**
   - Enable automated backups in Supabase dashboard
   - Set retention period
   - Test restore procedure

## Maintenance

### Regular Tasks

**Daily:**

- Monitor error logs
- Check system alerts

**Weekly:**

- Review analytics
- Check performance metrics
- Update vocabulary statistics

**Monthly:**

- Run cleanup functions
- Archive old analytics
- Review RLS policies

### Scheduled Functions

```sql
-- Run daily at 2 AM
SELECT cron.schedule('cleanup-sessions', '0 2 * * *',
  'SELECT cleanup_old_sessions();');

-- Run daily at 3 AM
SELECT cron.schedule('update-vocab-stats', '0 3 * * *',
  'SELECT update_vocabulary_statistics();');

-- Run weekly to cleanup analytics
SELECT cron.schedule('cleanup-analytics', '0 4 * * 0',
  'SELECT cleanup_old_analytics(90);');
```

## Security Considerations

1. **API Keys:** Never commit keys to version control
2. **RLS Policies:** Always verify user permissions
3. **Service Role:** Use only in backend/migrations
4. **Data Export:** Implement rate limiting
5. **Sensitive Data:** Encrypt at application level

## Performance Optimization

1. **Indexes:** Already created for common queries
2. **Caching:** Implement at application level
3. **Connection Pooling:** Configure Supabase pooler
4. **Query Optimization:** Use EXPLAIN ANALYZE

## Support

- **Documentation:** See `/docs/database/`
- **Issues:** Check GitHub issues
- **Community:** Supabase Discord
- **Database Logs:** Supabase dashboard > Database > Logs

---

**Last Updated:** 2025-01-27
**Version:** 1.0.0
**Database Schema Version:** 001-003 + Analytics
