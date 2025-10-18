# Database Migration Scripts

## Overview

This directory contains SQL migration scripts to add missing database tables that are currently causing feature degradation in the Spanish learning application.

## Missing Tables

1. **user_progress** - User overall progress tracking (14 TODOs blocked)
2. **export_history** - Export feature tracking (feature disabled)
3. **user_api_keys** - API key management (feature disabled)

## Migration Files

### Forward Migrations
- `001_create_user_progress.sql` - Create user_progress table with RLS
- `002_create_export_history.sql` - Create export_history table with RLS
- `003_create_user_api_keys.sql` - Create user_api_keys table with encryption

### Rollback Scripts
- `001_rollback_user_progress.sql` - Remove user_progress table
- `002_rollback_export_history.sql` - Remove export_history table
- `003_rollback_user_api_keys.sql` - Remove user_api_keys table

## Prerequisites

1. Access to Supabase SQL Editor
2. Database connection with admin privileges
3. Existing tables: `users`, `sessions`, `learning_progress`

## Execution Instructions

### Option 1: Supabase SQL Editor (Recommended)

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of each migration file in order
5. Execute each migration

**Execution Order:**
```sql
-- Step 1: Run user_progress migration
-- Copy contents of 001_create_user_progress.sql and run

-- Step 2: Run export_history migration
-- Copy contents of 002_create_export_history.sql and run

-- Step 3: Run user_api_keys migration
-- Copy contents of 003_create_user_api_keys.sql and run
```

### Option 2: Command Line (psql)

```bash
# Connect to your Supabase database
psql "postgresql://[user]:[password]@[host]:5432/postgres"

# Run migrations in order
\i scripts/migrations/001_create_user_progress.sql
\i scripts/migrations/002_create_export_history.sql
\i scripts/migrations/003_create_user_api_keys.sql
```

## Rollback Instructions

If you need to rollback any migration:

```sql
-- Rollback in reverse order
\i scripts/migrations/003_rollback_user_api_keys.sql
\i scripts/migrations/002_rollback_export_history.sql
\i scripts/migrations/001_rollback_user_progress.sql
```

**WARNING**: Rollback will permanently delete all data in these tables!

## Migration Details

### 001: user_progress Table

**Purpose**: Track user overall progress, achievements, and streaks

**Features**:
- Total points and level progression
- Streak tracking (current and longest)
- Achievement system with badges
- Study goals and activity metrics
- Auto-initialization on user signup
- Helper functions for streak updates and point management

**Schema**:
```sql
- id (UUID, PK)
- user_id (UUID, FK to users)
- total_points, current_streak, longest_streak
- achievements_unlocked (JSONB)
- badges_earned (TEXT[])
- current_level, level_progress
- average_accuracy, words_learned_count
- created_at, updated_at
```

**Functions**:
- `initialize_user_progress()` - Auto-create on signup
- `update_user_streak(user_id)` - Update daily streak
- `add_user_points(user_id, points)` - Add points and check level-up

### 002: export_history Table

**Purpose**: Track user export activities and downloads

**Features**:
- Multiple export formats (PDF, CSV, JSON, Anki, DOCX, TXT)
- Download tracking and statistics
- Auto-expiration of old exports
- Processing status tracking
- User export summary view

**Schema**:
```sql
- id (UUID, PK)
- user_id (UUID, FK to users)
- export_type, export_format
- file_name, file_path, download_url
- status, items_count, file_size_bytes
- download_count, expires_at
- created_at, updated_at
```

**Functions**:
- `track_export_download(export_id)` - Track downloads
- `cleanup_expired_exports()` - Auto-cleanup
- `create_export_record(...)` - Create new export
- `get_user_export_stats(user_id)` - Get statistics

### 003: user_api_keys Table

**Purpose**: Securely store encrypted API keys

**Features**:
- AES-256 encryption using pgcrypto
- Support for multiple services (Anthropic, OpenAI, Google)
- Usage tracking and rate limiting
- Key expiration and rotation reminders
- Secure encryption/decryption functions

**Schema**:
```sql
- id (UUID, PK)
- user_id (UUID, FK to users)
- service_name, key_name
- encrypted_api_key (BYTEA)
- key_status, is_valid
- usage_count, total_tokens_used
- expires_at, rotation_reminder_at
- created_at, updated_at
```

**Functions**:
- `encrypt_api_key(key, encryption_key)` - Encrypt key
- `decrypt_api_key(encrypted, encryption_key)` - Decrypt key
- `store_api_key(...)` - Securely store key
- `get_api_key(user_id, service)` - Retrieve key
- `track_api_key_usage(key_id, tokens)` - Track usage

**Security Notes**:
- Set custom encryption key in production:
  ```sql
  ALTER DATABASE your_db SET app.encryption_key = 'your-secure-key';
  ```
- Store encryption key in secure vault (AWS Secrets Manager, etc.)
- Rotate encryption keys periodically
- Never expose encrypted keys in application logs

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- Users can only view/modify their own data
- Access controlled via `auth.uid() = user_id`
- No cross-user data access
- Admin queries require elevated privileges

## Verification Steps

After running migrations, verify success:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_progress', 'export_history', 'user_api_keys');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_progress', 'export_history', 'user_api_keys');

-- Test user_progress initialization
SELECT COUNT(*) FROM user_progress;
```

## Post-Migration Tasks

1. **Update Application Code**:
   - Remove fallback logic for learning_progress
   - Enable export functionality
   - Enable API key management UI

2. **Set Encryption Key** (CRITICAL for production):
   ```sql
   ALTER DATABASE your_db SET app.encryption_key = 'generate-secure-key-here';
   ```

3. **Configure Cleanup Jobs**:
   - Schedule `cleanup_expired_exports()` daily
   - Schedule `cleanup_expired_api_keys()` daily

## Changelog

- **2025-10-17**: Initial migration scripts created
