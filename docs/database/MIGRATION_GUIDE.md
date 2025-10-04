# Database Migration Guide

## Overview

This project uses **Supabase migrations** as the canonical database schema management system. All database changes must be made through Supabase migration files.

## Quick Start

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase (if not already done)
supabase login
```

### Local Development

#### 1. Start Local Supabase
```bash
# Initialize Supabase (first time only)
supabase init

# Start local Supabase instance
supabase start
```

#### 2. Apply Migrations
```bash
# Reset database and apply all migrations
supabase db reset

# This will:
# - Drop existing database
# - Create fresh schema
# - Apply all migrations in order
# - Run seed data
```

#### 3. Create New Migration
```bash
# Create a new migration file
supabase migration new <descriptive_name>

# Example:
supabase migration new add_user_preferences
```

## Migration Structure

### Current Migrations

```
supabase/migrations/
├── 001_initial_schema.sql          # Core tables, ENUMs, indexes
├── 002_seed_data.sql               # Sample vocabulary and settings
├── 003_advanced_features.sql       # Functions, views, analytics
└── 20250111_create_analytics_tables.sql  # Analytics extensions
```

### Migration File Format

Migrations follow the pattern: `<timestamp>_<description>.sql`

Example:
```sql
-- Migration: 20250102_add_user_preferences
-- Description: Add user preference fields for notification settings

-- Add new columns
ALTER TABLE users
ADD COLUMN notification_email BOOLEAN DEFAULT true,
ADD COLUMN notification_push BOOLEAN DEFAULT true;

-- Create index
CREATE INDEX idx_users_notifications
ON users(notification_email, notification_push);

-- Update RLS policies if needed
CREATE POLICY "Users can update their notification preferences"
ON users FOR UPDATE
USING (auth.uid() = id);
```

## Best Practices

### 1. Always Include RLS Policies

Every table MUST have Row Level Security enabled:

```sql
-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own records" ON my_table
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records" ON my_table
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON my_table
    FOR UPDATE USING (auth.uid() = user_id);
```

### 2. Add Appropriate Indexes

Always index:
- Foreign keys
- Frequently queried columns
- Columns used in WHERE clauses
- Columns used in ORDER BY

```sql
-- Single column index
CREATE INDEX idx_table_column ON table_name(column_name);

-- Composite index
CREATE INDEX idx_table_multi ON table_name(col1, col2);

-- Partial index
CREATE INDEX idx_table_active ON table_name(status)
WHERE status = 'active';

-- Full-text search
CREATE INDEX idx_table_fulltext ON table_name
USING gin(to_tsvector('english', content));
```

### 3. Use Transactions

Wrap complex migrations in transactions:

```sql
BEGIN;

-- Your migration steps
ALTER TABLE users ADD COLUMN new_field TEXT;
UPDATE users SET new_field = 'default';
ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;

COMMIT;
```

### 4. Include Rollback Instructions

Document how to rollback:

```sql
-- Migration: Add user preferences
-- Rollback: Run the following if you need to revert
/*
ALTER TABLE users DROP COLUMN notification_email;
ALTER TABLE users DROP COLUMN notification_push;
DROP INDEX idx_users_notifications;
*/
```

### 5. Test Migrations Locally

Always test before deploying:

```bash
# Reset to clean state
supabase db reset

# Verify schema
supabase db diff

# Test queries
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"
```

## Common Migration Patterns

### Adding a New Table

```sql
-- Create ENUM if needed
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Create table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status user_status DEFAULT 'active',
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id),
    CHECK(LENGTH(bio) <= 500)
);

-- Add indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
```

### Adding a Column

```sql
-- Add column
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add constraint
ALTER TABLE users ADD CONSTRAINT valid_timezone
CHECK (timezone ~ '^[A-Za-z]+/[A-Za-z_]+$');

-- Backfill existing data if needed
UPDATE users SET timezone = 'America/New_York' WHERE timezone IS NULL;

-- Make NOT NULL if required
ALTER TABLE users ALTER COLUMN timezone SET NOT NULL;

-- Add index if queried frequently
CREATE INDEX idx_users_timezone ON users(timezone);
```

### Creating a Function

```sql
CREATE OR REPLACE FUNCTION calculate_user_score(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(points), 0)
    INTO total_score
    FROM user_activities
    WHERE user_id = user_id_param
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';

    RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION calculate_user_score TO authenticated;

-- Add comment
COMMENT ON FUNCTION calculate_user_score IS 'Calculate user score from last 30 days of activities';
```

### Creating a View

```sql
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.id,
    u.email,
    COUNT(DISTINCT s.id) as session_count,
    SUM(s.duration_minutes) as total_minutes,
    AVG(s.engagement_score) as avg_engagement
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.email;

-- Add comment
COMMENT ON VIEW user_activity_summary IS 'User activity metrics for last 30 days';
```

## Deployment

### Staging Environment

```bash
# Link to staging project
supabase link --project-ref <staging-ref>

# Apply migrations
supabase db push

# Verify deployment
supabase db diff --linked
```

### Production Environment

```bash
# Link to production project
supabase link --project-ref <production-ref>

# Review pending migrations
supabase db diff

# Apply migrations (with backup!)
supabase db push

# Verify deployment
supabase db diff --linked
```

### Rollback Procedure

If a migration causes issues:

```bash
# Method 1: Revert to specific version
supabase db reset --version <timestamp>

# Method 2: Create rollback migration
supabase migration new rollback_<issue>

# Edit the rollback migration to undo changes
# Then apply it
supabase db push
```

## Troubleshooting

### Migration Fails

```bash
# Check migration logs
supabase db inspect

# Test migration locally
supabase db reset

# Fix issues and retry
supabase db push
```

### Schema Drift Detection

```bash
# Compare local and remote schemas
supabase db diff

# Generate migration from differences
supabase db diff --use-migra --schema public > new_migration.sql
```

### Performance Issues

```bash
# Analyze query performance
EXPLAIN ANALYZE SELECT ...;

# Check index usage
SELECT * FROM pg_stat_user_indexes;

# Find missing indexes
SELECT * FROM pg_stat_user_tables;
```

## Migration Checklist

Before creating a migration:

- [ ] Describe the change clearly in migration name
- [ ] Include comments explaining why the change is needed
- [ ] Add RLS policies for new tables
- [ ] Create appropriate indexes
- [ ] Add constraints for data integrity
- [ ] Include rollback instructions
- [ ] Test locally with `supabase db reset`
- [ ] Verify no breaking changes
- [ ] Update related documentation
- [ ] Review with team before deploying

After deploying:

- [ ] Verify migration applied successfully
- [ ] Test affected functionality
- [ ] Monitor performance metrics
- [ ] Check error logs
- [ ] Update changelog

## Resources

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

## Support

For questions or issues:
1. Check this guide first
2. Review existing migrations for examples
3. Consult PostgreSQL documentation
4. Ask in team Slack channel
5. Create issue in project repository
