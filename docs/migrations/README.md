# Database Migrations

This directory contains all database migration scripts for the Describe It application.

## Migration Naming Convention

```
<number>_<description>.sql
<number>_<description>_rollback.sql
```

Example:
- `001_add_missing_tables.sql` - Forward migration
- `001_add_missing_tables_rollback.sql` - Rollback script

## Migration Log

| # | Date | Description | Status | Author |
|---|------|-------------|--------|--------|
| 001 | 2025-10-03 | Add missing tables (user_api_keys, user_progress, export_history) | Ready | System |

## Running Migrations

### Using Supabase CLI

```bash
# Apply migration
supabase db push

# Or manually
supabase db execute --file migrations/001_add_missing_tables.sql
```

### Using PostgreSQL CLI

```bash
# Apply migration
psql -h <host> -U <user> -d <database> -f migrations/001_add_missing_tables.sql

# Rollback if needed
psql -h <host> -U <user> -d <database> -f migrations/001_add_missing_tables_rollback.sql
```

### Via Supabase Dashboard

1. Go to SQL Editor
2. Paste migration script
3. Run script
4. Verify in Table Editor

## Pre-Migration Checklist

Before running any migration:

1. **Backup Database**
   ```bash
   supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test in Staging**
   - Apply to staging environment first
   - Run full test suite
   - Verify functionality

3. **Review Migration**
   - Check SQL syntax
   - Verify rollback script exists
   - Ensure idempotency (IF NOT EXISTS, etc.)
   - Review security policies

4. **Update Type Definitions**
   ```bash
   npm run generate:types
   npm run typecheck
   ```

## Post-Migration Tasks

1. **Verify Migration**
   ```sql
   -- Check tables exist
   \dt

   -- Check RLS policies
   \d+ table_name

   -- Verify data
   SELECT COUNT(*) FROM table_name;
   ```

2. **Regenerate Types**
   ```bash
   npm run generate:types
   ```

3. **Run Tests**
   ```bash
   npm run test
   npm run test:integration
   ```

4. **Monitor Performance**
   - Check query plans
   - Monitor table sizes
   - Verify index usage

## Rollback Procedure

If migration fails:

```bash
# 1. Stop application
pm2 stop describe-it

# 2. Run rollback script
psql -h <host> -U <user> -d <database> -f migrations/001_add_missing_tables_rollback.sql

# 3. Restore from backup if needed
psql -h <host> -U <user> -d <database> < backup_file.sql

# 4. Restart application
pm2 start describe-it
```

## Best Practices

### Migration Script Guidelines

1. **Always include IF EXISTS/IF NOT EXISTS**
   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   DROP TABLE IF EXISTS table_name;
   ```

2. **Use Transactions (when possible)**
   ```sql
   BEGIN;
   -- migration steps
   COMMIT;
   ```

3. **Include Rollback Script**
   - Every migration should have a rollback
   - Test rollback before production

4. **Add Comments**
   ```sql
   -- Purpose: Add user_api_keys table
   -- Date: 2025-10-03
   -- Author: System
   ```

5. **Verify Permissions**
   - Ensure RLS policies are correct
   - Test with different user roles

### Type Generation

After schema changes:

```bash
# Generate types from Supabase
supabase gen types typescript --local > src/types/database.generated.ts

# Or use project script
npm run generate:types

# Verify types
npm run typecheck
```

### Testing Migrations

```sql
-- Test table creation
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Test RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Test indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- Test triggers
SELECT * FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## Common Issues

### Issue: Type mismatch after migration

**Solution:**
```bash
npm run generate:types
npm run typecheck
```

### Issue: RLS blocking queries

**Solution:**
```sql
-- Check policies
\d+ table_name

-- Test as specific user
SET LOCAL ROLE user_id;
SELECT * FROM table_name;
```

### Issue: Migration already applied

**Solution:**
- Migrations use `IF NOT EXISTS` clauses
- Safe to re-run
- Check table existence first

### Issue: Foreign key constraint violation

**Solution:**
```sql
-- Disable triggers temporarily
ALTER TABLE table_name DISABLE TRIGGER ALL;

-- Migrate data

-- Re-enable triggers
ALTER TABLE table_name ENABLE TRIGGER ALL;
```

## Security Notes

1. **Never commit production credentials**
2. **Always use RLS policies**
3. **Encrypt sensitive data** (API keys, etc.)
4. **Audit migration access**
5. **Use separate staging database**

## Support

- Documentation: `/docs/migrations/`
- Database Schema: [Supabase Dashboard]
- Type Definitions: `/src/types/database.generated.ts`
- Issues: [GitHub Issues]

## Migration History

See individual migration documentation in this directory:

- [Migration 001: Schema Alignment](./001-schema-alignment.md)
