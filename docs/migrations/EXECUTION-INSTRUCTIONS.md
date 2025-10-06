# Database Migration Execution Instructions

## CRITICAL: Execute via Supabase SQL Editor

The PostgreSQL connection requires the database password (NOT the Service Role Key).
The easiest and most reliable method is to use the **Supabase SQL Editor**.

## Step-by-Step Execution

### Method 1: Supabase SQL Editor (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/arjrpdccaczbybbrchvc
   - Navigate to: **SQL Editor** (left sidebar)

2. **Execute STEP 1: Create ENUMs**
   - Click: **New Query**
   - Copy contents of: `docs/migrations/STEP-1-create-enums-only.sql`
   - Paste into SQL Editor
   - Click: **Run** (or press Ctrl+Enter)
   - Wait for: **12 success messages** in the output

   **Expected Output:**
   ```
   NOTICE: Created spanish_level ENUM
   NOTICE: Created session_type ENUM
   NOTICE: Created description_style ENUM
   NOTICE: Created part_of_speech ENUM
   NOTICE: Created difficulty_level ENUM
   NOTICE: Created learning_phase ENUM
   NOTICE: Created qa_difficulty ENUM
   NOTICE: Created vocabulary_category ENUM
   NOTICE: Created spanish_gender ENUM
   NOTICE: Created theme_preference ENUM
   NOTICE: Created language_preference ENUM
   NOTICE: Created export_format ENUM
   NOTICE: STEP 1 COMPLETE: All 12 ENUM types created!
   ```

3. **Verify ENUMs Created**
   - Copy contents of: `docs/migrations/VERIFY-ENUMS.sql`
   - Paste into SQL Editor
   - Click: **Run**
   - Should see: **12 rows** with enum types

4. **Execute STEP 2: Create Tables**
   - Copy contents of: `docs/safe-migration-001-complete.sql`
   - Paste into SQL Editor
   - Click: **Run**
   - Wait for completion (may take 30-60 seconds)

5. **Verify Tables Created**
   - Run this query:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
   ```
   - Should see at least: users, user_settings, api_keys, sessions, etc.

### Method 2: Supabase CLI (Alternative)

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref arjrpdccaczbybbrchvc

# Run STEP 1
supabase db execute --file docs/migrations/STEP-1-create-enums-only.sql

# Verify
supabase db execute --file docs/migrations/VERIFY-ENUMS.sql

# Run STEP 2
supabase db execute --file docs/safe-migration-001-complete.sql
```

### Method 3: Direct PostgreSQL Connection

If you have the database password:

```bash
# Get connection string from Supabase Dashboard:
# Settings > Database > Connection string > Direct connection

psql "postgresql://postgres:[PASSWORD]@db.arjrpdccaczbybbrchvc.supabase.co:5432/postgres" \
  -f docs/migrations/STEP-1-create-enums-only.sql

psql "postgresql://postgres:[PASSWORD]@db.arjrpdccaczbybbrchvc.supabase.co:5432/postgres" \
  -f docs/safe-migration-001-complete.sql
```

## Migration Files (In Order)

1. **STEP-1-create-enums-only.sql** - Creates 12 ENUM types (REQUIRED FIRST)
2. **VERIFY-ENUMS.sql** - Verifies ENUMs created successfully
3. **safe-migration-001-complete.sql** - Creates all 18 tables
4. **CHECK-EXISTING-TABLES.sql** - Checks what tables already exist

## Verification Queries

After migration, run these queries to verify:

```sql
-- 1. Count ENUMs (should be 12)
SELECT COUNT(DISTINCT typname) as total_enums
FROM pg_type
WHERE typname IN (
  'spanish_level', 'session_type', 'description_style', 'part_of_speech',
  'difficulty_level', 'learning_phase', 'qa_difficulty', 'vocabulary_category',
  'spanish_gender', 'theme_preference', 'language_preference', 'export_format'
);

-- 2. List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 3. Check extensions
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- 4. Verify table structure (example)
\d users
\d user_settings
\d api_keys
```

## Common Issues

### Issue: "type already exists"
**Solution:** The scripts are idempotent. Re-running is safe.

### Issue: "column does not exist"
**Solution:** Run STEP-1 first to create ENUMs before tables.

### Issue: "relation already exists"
**Solution:** Tables already created. Check with `\dt` command.

### Issue: "password authentication failed"
**Solution:** Service Role Key is not the database password. Use Supabase SQL Editor instead.

## Rollback (If Needed)

To drop everything and start fresh:

```sql
-- WARNING: This drops ALL tables!
-- Copy from: docs/migrations/DROP-ALL-OLD-TABLES.sql

-- Drop all tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
-- ... (see full file)

-- Drop all ENUMs
DROP TYPE IF EXISTS spanish_level CASCADE;
DROP TYPE IF EXISTS session_type CASCADE;
-- ... (see full file)
```

## Success Criteria

After successful migration, you should have:

- ✅ 12 ENUM types created
- ✅ 2 Extensions enabled (uuid-ossp, pgcrypto)
- ✅ 18+ tables created
- ✅ No errors in Supabase logs
- ✅ App can query `users` table

## Next Steps

After migration completes:

1. Test database connectivity from app
2. Run seed data migration (if needed)
3. Test user authentication
4. Verify API endpoints work
5. Document any issues found

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard > Logs
2. Verify connection: Dashboard > Settings > Database
3. Review migration files for syntax errors
4. Contact Supabase support if blocked

---

**Last Updated:** 2025-10-06
**Status:** READY FOR EXECUTION
**Method:** Supabase SQL Editor (Recommended)
