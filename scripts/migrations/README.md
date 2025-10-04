# Database Migrations

This directory contains SQL migration files for the Describe It application database.

## Migration Structure

Each migration consists of two files:
- `XXX_migration_name.sql` - The forward migration (applies changes)
- `XXX_migration_name_rollback.sql` - The rollback migration (reverts changes)

## Available Migrations

### 001_create_missing_tables.sql
**Date:** 2025-10-03
**Status:** Ready to apply
**Purpose:** Creates 11 missing database tables for runtime stability

**Tables Created:**
1. `images` - Image metadata and storage
2. `descriptions` - Image descriptions in English and Spanish
3. `phrases` - Extracted phrases for learning
4. `qa_items` - Question and answer pairs
5. `answer_validations` - Answer validation history
6. `session_progress` - Detailed session progress tracking
7. `qa_responses` - User Q&A responses
8. `user_settings` - User preferences and settings
9. `user_preferences` - Additional user preferences
10. `user_data` - General-purpose user data storage
11. `image_history` - User interaction tracking

**Features:**
- Row Level Security (RLS) policies
- Foreign key constraints
- Performance indexes
- Full-text search indexes
- Automatic timestamp updates
- Helper views for analytics

## How to Apply Migrations

### Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the contents of the migration file
5. Paste into the SQL editor
6. Click "Run" to execute
7. Verify success message in output

### Using Supabase CLI

```bash
# Connect to your Supabase project
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migration
supabase db push --file scripts/migrations/001_create_missing_tables.sql
```

### Using psql (Direct Database Connection)

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migration
\i scripts/migrations/001_create_missing_tables.sql
```

## How to Rollback Migrations

### Using Supabase Dashboard

1. Navigate to SQL Editor
2. Open the corresponding `*_rollback.sql` file
3. Copy contents and paste into SQL editor
4. Review carefully (this will delete data!)
5. Click "Run" to execute rollback

### Using psql

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f scripts/migrations/001_create_missing_tables_rollback.sql
```

## Verification Checklist

After applying migration 001, verify:

- [ ] All 11 tables created successfully
- [ ] RLS policies are enabled (check with `SELECT * FROM pg_policies`)
- [ ] Indexes created (check with `\di` in psql)
- [ ] Views created (`image_statistics`, `user_qa_performance`)
- [ ] No errors in Supabase logs
- [ ] Application can connect to new tables
- [ ] Test basic CRUD operations on each table

### Quick Verification Query

Run this query to verify all tables exist:

```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'images', 'descriptions', 'phrases', 'qa_items',
    'answer_validations', 'session_progress', 'qa_responses',
    'user_settings', 'user_preferences', 'user_data', 'image_history'
  )
ORDER BY table_name;
```

Expected result: 11 rows

### Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN (
  'images', 'descriptions', 'phrases', 'qa_items',
  'answer_validations', 'session_progress', 'qa_responses',
  'user_settings', 'user_preferences', 'user_data', 'image_history'
)
ORDER BY tablename, policyname;
```

Expected result: Multiple policies per table

## Testing After Migration

### 1. Test Image Table
```sql
-- Insert test image
INSERT INTO public.images (source_url, alt_text, source_platform)
VALUES ('https://example.com/test.jpg', 'Test image', 'unsplash')
RETURNING *;

-- Verify
SELECT * FROM public.images LIMIT 1;

-- Clean up
DELETE FROM public.images WHERE alt_text = 'Test image';
```

### 2. Test Descriptions Table
```sql
-- Insert test description (requires an image_id)
INSERT INTO public.descriptions (image_id, english_text, spanish_text)
VALUES (
  (SELECT id FROM public.images LIMIT 1),
  'A beautiful sunset',
  'Una hermosa puesta de sol'
)
RETURNING *;
```

### 3. Test Q&A Items
```sql
-- Insert test Q&A
INSERT INTO public.qa_items (question, answer, difficulty, category)
VALUES (
  '¿Qué es esto?',
  'Una puesta de sol',
  'facil',
  'nature'
)
RETURNING *;
```

## Troubleshooting

### Error: "relation already exists"
The table already exists. Check if migration was already applied:
```sql
SELECT * FROM public.images LIMIT 1;
```

### Error: "permission denied"
Ensure you're connected as a user with CREATE TABLE permissions (usually postgres user).

### Error: "foreign key constraint violation"
The referenced table doesn't exist. Apply migrations in order:
1. Base schema (setup-database.sql)
2. Analytics tables (setup-supabase-tables.sql)
3. This migration (001_create_missing_tables.sql)

### RLS Policies Blocking Access
If authenticated users can't access data:
```sql
-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE public.images DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
```

## Dependencies

This migration requires:
1. ✅ `setup-database.sql` applied (creates users, sessions, vocabulary tables)
2. ✅ `update_updated_at_column()` function exists (from setup-database.sql)
3. ✅ Supabase auth schema (auth.users table)

## Notes

- All tables use UUIDs for primary keys
- All tables have `created_at` and `updated_at` timestamps
- All tables have RLS enabled for security
- Foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
- Indexes are created for all foreign keys and common query patterns
- Full-text search indexes use appropriate language (Spanish/English)

## Future Migrations

When creating new migrations:
1. Increment the number (002, 003, etc.)
2. Use descriptive names
3. Always create a rollback file
4. Update this README
5. Test thoroughly before applying to production
6. Document any dependencies or prerequisites

## Support

For issues with migrations:
1. Check Supabase logs for detailed error messages
2. Verify prerequisites are met
3. Test on development/staging environment first
4. Review the migration SQL for syntax errors
5. Contact the development team if issues persist
