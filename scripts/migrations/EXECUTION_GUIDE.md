# Database Migration Execution Guide

## Overview
This guide provides step-by-step instructions for executing all 3 database migrations in Supabase SQL Editor.

**Migrations to Execute:**
1. `001_create_user_progress.sql` - User progress tracking system
2. `002_create_export_history.sql` - Export history and tracking
3. `003_create_user_api_keys.sql` - Encrypted API key storage

## Prerequisites

**Required:**
- Access to Supabase Dashboard
- Database with `users` table already created
- `update_updated_at_column()` function exists (common in Supabase)

**Security Setup for Migration 003:**
- Encryption key configuration required
- See "Step 4: Security Configuration" below

## Execution Instructions

### Step 1: Access Supabase SQL Editor

1. Log in to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `describe_it`
3. Navigate to: **SQL Editor** (left sidebar)
4. Click: **New Query**

### Step 2: Execute Migration 001 - User Progress

**Copy and paste the following SQL:**

```sql
-- =====================================================
-- MIGRATION 001: CREATE USER_PROGRESS TABLE
-- =====================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  current_level TEXT CHECK (current_level IN ('beginner', 'intermediate', 'advanced', 'expert')) DEFAULT 'beginner',
  level_progress INTEGER DEFAULT 0 CHECK (level_progress >= 0 AND level_progress <= 100),
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_session_date TIMESTAMP WITH TIME ZONE,
  last_streak_update TIMESTAMP WITH TIME ZONE,
  daily_goal_minutes INTEGER DEFAULT 15,
  weekly_goal_days INTEGER DEFAULT 3,
  average_accuracy NUMERIC(5,2) DEFAULT 0.00 CHECK (average_accuracy >= 0 AND average_accuracy <= 100),
  words_learned_count INTEGER DEFAULT 0,
  words_mastered_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_current_level ON public.user_progress(current_level);
CREATE INDEX IF NOT EXISTS idx_user_progress_total_points ON public.user_progress(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_current_streak ON public.user_progress(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_session ON public.user_progress(last_session_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_achievements ON public.user_progress USING gin(achievements_unlocked);

-- RLS Policies
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.user_progress FOR DELETE USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper Functions
CREATE OR REPLACE FUNCTION initialize_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, current_level, daily_goal_minutes, weekly_goal_days)
  VALUES (NEW.id, COALESCE(NEW.spanish_level, 'beginner'), 15, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_progress_on_signup
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_progress();

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_session TIMESTAMP WITH TIME ZONE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_session_date, current_streak, longest_streak
  INTO v_last_session, v_current_streak, v_longest_streak
  FROM public.user_progress WHERE user_id = p_user_id;

  IF v_last_session IS NULL THEN
    v_current_streak := 1;
  ELSIF DATE(v_last_session) = CURRENT_DATE THEN
    RETURN;
  ELSIF DATE(v_last_session) = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  UPDATE public.user_progress
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_session_date = timezone('utc'::text, now()),
      last_streak_update = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_user_points(p_user_id UUID, p_points INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_total_points INTEGER;
  v_old_level TEXT;
  v_new_level TEXT;
  v_level_up BOOLEAN := false;
BEGIN
  SELECT total_points, current_level INTO v_total_points, v_old_level
  FROM public.user_progress WHERE user_id = p_user_id;

  v_total_points := v_total_points + p_points;
  v_new_level := CASE
    WHEN v_total_points >= 10000 THEN 'expert'
    WHEN v_total_points >= 5000 THEN 'advanced'
    WHEN v_total_points >= 1000 THEN 'intermediate'
    ELSE 'beginner'
  END;

  v_level_up := v_new_level != v_old_level;

  UPDATE public.user_progress
  SET total_points = v_total_points,
      current_level = v_new_level,
      level_progress = CASE
        WHEN v_new_level = 'beginner' THEN (v_total_points * 100) / 1000
        WHEN v_new_level = 'intermediate' THEN ((v_total_points - 1000) * 100) / 4000
        WHEN v_new_level = 'advanced' THEN ((v_total_points - 5000) * 100) / 5000
        ELSE 100
      END,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'total_points', v_total_points,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up
  );
END;
$$ LANGUAGE plpgsql;

-- Migrate existing users
INSERT INTO public.user_progress (user_id, current_level, daily_goal_minutes, weekly_goal_days)
SELECT u.id, COALESCE(u.spanish_level, 'beginner'), 15, 3
FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_progress up WHERE up.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
```

**Click:** RUN (or press Ctrl+Enter)

**Expected Output:**
```
✓ CREATE TABLE
✓ CREATE INDEX (6x)
✓ ALTER TABLE
✓ CREATE POLICY (4x)
✓ CREATE TRIGGER (2x)
✓ CREATE FUNCTION (3x)
✓ INSERT (migrated existing users)
```

**Verification Query:**
```sql
-- Check table exists
SELECT COUNT(*) as user_count FROM public.user_progress;

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'user_progress';

-- Check functions
SELECT proname FROM pg_proc WHERE proname LIKE '%user%progress%';
```

### Step 3: Execute Migration 002 - Export History

**Copy and paste the following SQL:**

```sql
-- =====================================================
-- MIGRATION 002: CREATE EXPORT_HISTORY TABLE
-- =====================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'csv', 'json', 'anki', 'docx', 'txt')),
  export_format TEXT NOT NULL CHECK (export_format IN ('vocabulary', 'descriptions', 'progress', 'full_backup')),
  content_type TEXT NOT NULL DEFAULT 'vocabulary',
  items_count INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  file_name TEXT NOT NULL,
  file_path TEXT,
  download_url TEXT,
  export_filters JSONB DEFAULT '{}'::jsonb,
  export_options JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')) DEFAULT 'pending',
  error_message TEXT,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  processing_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON public.export_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_history_status ON public.export_history(status);
CREATE INDEX IF NOT EXISTS idx_export_history_export_type ON public.export_history(export_type);
CREATE INDEX IF NOT EXISTS idx_export_history_export_format ON public.export_history(export_format);
CREATE INDEX IF NOT EXISTS idx_export_history_expires_at ON public.export_history(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_export_history_user_created ON public.export_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_history_filters ON public.export_history USING gin(export_filters);

-- RLS
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export history" ON public.export_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create exports" ON public.export_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exports" ON public.export_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exports" ON public.export_history FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_export_history_updated_at
  BEFORE UPDATE ON public.export_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper Functions
CREATE OR REPLACE FUNCTION track_export_download(p_export_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.export_history
  SET download_count = download_count + 1,
      last_downloaded_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_export_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.export_history
  WHERE expires_at IS NOT NULL
    AND expires_at < timezone('utc'::text, now())
    AND status IN ('completed', 'failed');
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_export_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_exports', COUNT(*),
    'completed_exports', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed_exports', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending_exports', COUNT(*) FILTER (WHERE status IN ('pending', 'processing')),
    'total_downloads', COALESCE(SUM(download_count), 0),
    'total_items_exported', COALESCE(SUM(items_count), 0),
    'total_file_size_mb', ROUND(COALESCE(SUM(file_size_bytes), 0)::numeric / 1048576, 2),
    'last_export_at', MAX(created_at)
  )
  INTO v_stats
  FROM public.export_history
  WHERE user_id = p_user_id;
  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- View
CREATE OR REPLACE VIEW public.user_export_summary AS
SELECT
  u.id as user_id, u.email,
  COUNT(eh.id) as total_exports,
  COUNT(*) FILTER (WHERE eh.status = 'completed') as completed_exports,
  COUNT(*) FILTER (WHERE eh.created_at > timezone('utc'::text, now()) - INTERVAL '30 days') as exports_last_30_days,
  COALESCE(SUM(eh.download_count), 0) as total_downloads,
  COALESCE(SUM(eh.items_count), 0) as total_items_exported,
  ROUND(COALESCE(SUM(eh.file_size_bytes), 0)::numeric / 1048576, 2) as total_size_mb,
  MAX(eh.created_at) as last_export_at
FROM public.users u
LEFT JOIN public.export_history eh ON u.id = eh.user_id
GROUP BY u.id, u.email;

COMMIT;
```

**Click:** RUN

**Expected Output:**
```
✓ CREATE TABLE
✓ CREATE INDEX (8x)
✓ ALTER TABLE
✓ CREATE POLICY (4x)
✓ CREATE TRIGGER
✓ CREATE FUNCTION (3x)
✓ CREATE VIEW
```

**Verification Query:**
```sql
SELECT COUNT(*) as export_count FROM public.export_history;
SELECT * FROM pg_policies WHERE tablename = 'export_history';
```

### Step 4: Security Configuration (BEFORE Migration 003)

**CRITICAL: Set up encryption key for API key storage**

**Option A: Set database-level encryption key (RECOMMENDED)**

```sql
-- Set custom encryption key (REQUIRED for production)
-- Replace 'YOUR-SUPER-SECURE-RANDOM-KEY-HERE' with a strong 32+ character key
ALTER DATABASE postgres SET app.encryption_key = 'YOUR-SUPER-SECURE-RANDOM-KEY-HERE';

-- Verify it's set
SELECT name, setting FROM pg_settings WHERE name = 'app.encryption_key';
```

**Generate Secure Key:**
```bash
# Generate a secure random key (run locally)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Use default key (DEVELOPMENT ONLY)**
- Migration will use default key: `default-encryption-key-CHANGE-ME`
- **NOT SECURE FOR PRODUCTION**
- Must change before storing real API keys

### Step 5: Execute Migration 003 - API Keys

**Copy and paste the following SQL:**

```sql
-- =====================================================
-- MIGRATION 003: CREATE USER_API_KEYS TABLE
-- =====================================================
BEGIN;

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (service_name IN ('anthropic', 'openai', 'google', 'custom')),
  key_name TEXT NOT NULL,
  encrypted_api_key BYTEA NOT NULL,
  encryption_method TEXT NOT NULL DEFAULT 'pgcrypto_aes256',
  key_prefix TEXT,
  key_status TEXT NOT NULL CHECK (key_status IN ('active', 'inactive', 'expired', 'revoked')) DEFAULT 'active',
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  daily_request_limit INTEGER,
  daily_requests_used INTEGER DEFAULT 0,
  daily_limit_reset_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  rotation_reminder_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN DEFAULT true,
  last_validation_at TIMESTAMP WITH TIME ZONE,
  validation_error TEXT,
  created_from_ip TEXT,
  last_used_from_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, service_name, key_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_service_name ON public.user_api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_status ON public.user_api_keys(key_status);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_is_valid ON public.user_api_keys(is_valid);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_expires_at ON public.user_api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_service_active ON public.user_api_keys(user_id, service_name, key_status) WHERE key_status = 'active';

-- RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys" ON public.user_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create API keys" ON public.user_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON public.user_api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.user_api_keys FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Encryption Functions
CREATE OR REPLACE FUNCTION encrypt_api_key(p_api_key TEXT, p_encryption_key TEXT DEFAULT current_setting('app.encryption_key', true))
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(p_api_key, COALESCE(p_encryption_key, 'default-encryption-key-CHANGE-ME'), 'compress-algo=1, cipher-algo=aes256');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_api_key(p_encrypted_key BYTEA, p_encryption_key TEXT DEFAULT current_setting('app.encryption_key', true))
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(p_encrypted_key, COALESCE(p_encryption_key, 'default-encryption-key-CHANGE-ME'));
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Functions
CREATE OR REPLACE FUNCTION store_api_key(p_user_id UUID, p_service_name TEXT, p_key_name TEXT, p_api_key TEXT, p_expires_days INTEGER DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_key_id UUID;
  v_key_prefix TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_key_prefix := SUBSTRING(p_api_key FROM 1 FOR 8);
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := timezone('utc'::text, now()) + (p_expires_days || ' days')::INTERVAL;
  END IF;

  INSERT INTO public.user_api_keys (user_id, service_name, key_name, encrypted_api_key, key_prefix, expires_at)
  VALUES (p_user_id, p_service_name, p_key_name, encrypt_api_key(p_api_key), v_key_prefix, v_expires_at)
  ON CONFLICT (user_id, service_name, key_name)
  DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, key_prefix = EXCLUDED.key_prefix, expires_at = EXCLUDED.expires_at, key_status = 'active', is_valid = true, updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_api_key(p_user_id UUID, p_service_name TEXT, p_key_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_encrypted_key BYTEA;
  v_key_status TEXT;
  v_is_valid BOOLEAN;
BEGIN
  SELECT encrypted_api_key, key_status, is_valid INTO v_encrypted_key, v_key_status, v_is_valid
  FROM public.user_api_keys
  WHERE user_id = p_user_id AND service_name = p_service_name AND (p_key_name IS NULL OR key_name = p_key_name) AND key_status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF v_encrypted_key IS NULL OR v_key_status != 'active' OR v_is_valid = false THEN
    RETURN NULL;
  END IF;

  RETURN decrypt_api_key(v_encrypted_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe View
CREATE OR REPLACE VIEW public.user_api_keys_safe AS
SELECT id, user_id, service_name, key_name, key_prefix, key_status, last_used_at, usage_count, total_tokens_used, daily_request_limit, daily_requests_used, expires_at, is_valid, created_at, updated_at
FROM public.user_api_keys;

COMMIT;
```

**Click:** RUN

**Expected Output:**
```
✓ CREATE EXTENSION
✓ CREATE TABLE
✓ CREATE INDEX (6x)
✓ ALTER TABLE
✓ CREATE POLICY (4x)
✓ CREATE TRIGGER
✓ CREATE FUNCTION (4x)
✓ CREATE VIEW
```

**Verification Query:**
```sql
SELECT COUNT(*) as key_count FROM public.user_api_keys;
SELECT * FROM pg_policies WHERE tablename = 'user_api_keys';
SELECT proname FROM pg_proc WHERE proname LIKE '%api_key%';
```

## Post-Migration Verification

### Run Complete System Check

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_progress', 'export_history', 'user_api_keys');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('user_progress', 'export_history', 'user_api_keys');

-- Check all policies
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('user_progress', 'export_history', 'user_api_keys')
ORDER BY tablename, cmd;

-- Check indexes
SELECT tablename, indexname FROM pg_indexes
WHERE tablename IN ('user_progress', 'export_history', 'user_api_keys')
ORDER BY tablename;

-- Test helper functions
SELECT proname, pronargs FROM pg_proc
WHERE proname IN (
  'update_user_streak', 'add_user_points', 'track_export_download',
  'cleanup_expired_exports', 'encrypt_api_key', 'decrypt_api_key',
  'store_api_key', 'get_api_key'
);
```

**Expected Results:**
- 3 tables created
- All 3 tables have RLS enabled (rowsecurity = true)
- 12 policies total (4 per table)
- Multiple indexes per table
- 8 helper functions created

## Testing Basic Operations

### Test User Progress

```sql
-- Insert test progress (replace with real user_id)
INSERT INTO public.user_progress (user_id, current_level)
VALUES ('YOUR-USER-ID-HERE', 'beginner');

-- Update streak
SELECT update_user_streak('YOUR-USER-ID-HERE');

-- Add points
SELECT add_user_points('YOUR-USER-ID-HERE', 100);

-- Check result
SELECT * FROM public.user_progress WHERE user_id = 'YOUR-USER-ID-HERE';
```

### Test Export History

```sql
-- Create export record
INSERT INTO public.export_history (user_id, export_type, export_format, file_name, status)
VALUES ('YOUR-USER-ID-HERE', 'pdf', 'vocabulary', 'vocabulary_export.pdf', 'completed');

-- Get stats
SELECT get_user_export_stats('YOUR-USER-ID-HERE');
```

### Test API Key Storage (SECURE)

```sql
-- Store test key (uses encryption)
SELECT store_api_key(
  'YOUR-USER-ID-HERE',
  'anthropic',
  'my-test-key',
  'sk-ant-test-key-12345',
  30
);

-- View keys (encrypted data hidden)
SELECT * FROM public.user_api_keys_safe WHERE user_id = 'YOUR-USER-ID-HERE';

-- Retrieve key (decrypted)
SELECT get_api_key('YOUR-USER-ID-HERE', 'anthropic');
```

## Rollback Instructions (If Needed)

### Rollback Migration 003

```sql
DROP VIEW IF EXISTS public.user_api_keys_safe;
DROP FUNCTION IF EXISTS get_api_key;
DROP FUNCTION IF EXISTS store_api_key;
DROP FUNCTION IF EXISTS decrypt_api_key;
DROP FUNCTION IF EXISTS encrypt_api_key;
DROP FUNCTION IF EXISTS cleanup_expired_api_keys;
DROP FUNCTION IF EXISTS revoke_api_key;
DROP FUNCTION IF EXISTS track_api_key_usage;
DROP FUNCTION IF EXISTS get_user_api_key_stats;
DROP TABLE IF EXISTS public.user_api_keys;
DROP EXTENSION IF EXISTS pgcrypto;
```

### Rollback Migration 002

```sql
DROP VIEW IF EXISTS public.user_export_summary;
DROP FUNCTION IF EXISTS get_user_export_stats;
DROP FUNCTION IF EXISTS cleanup_expired_exports;
DROP FUNCTION IF EXISTS track_export_download;
DROP FUNCTION IF EXISTS create_export_record;
DROP FUNCTION IF EXISTS update_export_status;
DROP TABLE IF EXISTS public.export_history;
```

### Rollback Migration 001

```sql
DROP FUNCTION IF EXISTS add_user_points;
DROP FUNCTION IF EXISTS update_user_streak;
DROP FUNCTION IF EXISTS initialize_user_progress;
DROP TABLE IF EXISTS public.user_progress;
```

## Troubleshooting

### Error: "function update_updated_at_column() does not exist"

**Solution:** Create the function first:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Error: "relation users does not exist"

**Solution:** Ensure users table exists. Check with:

```sql
SELECT * FROM information_schema.tables WHERE table_name = 'users';
```

### Error: "setting app.encryption_key not found"

**Solution:** Either:
1. Set encryption key: `ALTER DATABASE postgres SET app.encryption_key = 'your-key';`
2. Let it use default (development only)

### Migration runs but no data appears

**Check RLS policies:**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
```

## Security Checklist

After completing all migrations:

- [ ] Migration 001 completed successfully
- [ ] Migration 002 completed successfully
- [ ] Migration 003 completed successfully
- [ ] Encryption key set (for production)
- [ ] All RLS policies enabled
- [ ] All indexes created
- [ ] Helper functions working
- [ ] Test operations successful
- [ ] Verification queries passed
- [ ] Encryption key stored in secure vault (not in code)
- [ ] Default encryption key changed (if using production)

## Next Steps

1. **Run verification script:** `node scripts/verify-migrations.js`
2. **Test with application:** Update API endpoints to use new tables
3. **Monitor performance:** Check query performance with indexes
4. **Setup backup:** Configure regular database backups
5. **Security audit:** Review RLS policies and encryption setup

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard > Logs
2. Review verification queries output
3. Run troubleshooting commands above
4. Check migration files for detailed comments
