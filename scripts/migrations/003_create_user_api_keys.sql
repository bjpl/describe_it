-- =====================================================
-- MIGRATION 003: CREATE USER_API_KEYS TABLE
-- =====================================================
-- Purpose: Securely store user API keys with encryption
-- Current Status: API key management completely disabled
-- Created: 2025-10-17
-- Dependencies: users table (FK constraint), pgcrypto extension
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENABLE PGCRYPTO EXTENSION FOR ENCRYPTION
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 2. CREATE USER_API_KEYS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- API key information
  service_name TEXT NOT NULL CHECK (service_name IN ('anthropic', 'openai', 'google', 'custom')),
  key_name TEXT NOT NULL,

  -- Encrypted API key storage
  -- Note: Keys are encrypted using pgcrypto
  encrypted_api_key BYTEA NOT NULL,
  encryption_method TEXT NOT NULL DEFAULT 'pgcrypto_aes256',

  -- Key metadata
  key_prefix TEXT, -- First 8 chars for identification (e.g., "sk-ant-...")
  key_status TEXT NOT NULL CHECK (key_status IN ('active', 'inactive', 'expired', 'revoked')) DEFAULT 'active',

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,

  -- Rate limiting and quotas
  daily_request_limit INTEGER,
  daily_requests_used INTEGER DEFAULT 0,
  daily_limit_reset_at TIMESTAMP WITH TIME ZONE,

  -- Expiration and rotation
  expires_at TIMESTAMP WITH TIME ZONE,
  rotation_reminder_at TIMESTAMP WITH TIME ZONE,

  -- Validation
  is_valid BOOLEAN DEFAULT true,
  last_validation_at TIMESTAMP WITH TIME ZONE,
  validation_error TEXT,

  -- Security metadata
  created_from_ip TEXT,
  last_used_from_ip TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure unique key names per user per service
  UNIQUE(user_id, service_name, key_name)
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id
  ON public.user_api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_service_name
  ON public.user_api_keys(service_name);

-- Status queries
CREATE INDEX IF NOT EXISTS idx_user_api_keys_status
  ON public.user_api_keys(key_status);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_is_valid
  ON public.user_api_keys(is_valid);

-- Expiration management
CREATE INDEX IF NOT EXISTS idx_user_api_keys_expires_at
  ON public.user_api_keys(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_rotation_reminder
  ON public.user_api_keys(rotation_reminder_at)
  WHERE rotation_reminder_at IS NOT NULL;

-- Composite index for active keys lookup
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_service_active
  ON public.user_api_keys(user_id, service_name, key_status)
  WHERE key_status = 'active';

-- Last used tracking
CREATE INDEX IF NOT EXISTS idx_user_api_keys_last_used
  ON public.user_api_keys(last_used_at DESC NULLS LAST);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only view their own API keys
CREATE POLICY "Users can view own API keys"
  ON public.user_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create API keys"
  ON public.user_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own API keys"
  ON public.user_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
  ON public.user_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE ENCRYPTION/DECRYPTION FUNCTIONS
-- =====================================================

-- Function to encrypt API key
-- Note: In production, use a secure key management system
-- This uses a database-level encryption key for demonstration
CREATE OR REPLACE FUNCTION encrypt_api_key(
  p_api_key TEXT,
  p_encryption_key TEXT DEFAULT current_setting('app.encryption_key', true)
)
RETURNS BYTEA AS $$
BEGIN
  -- Use AES-256 encryption with pgcrypto
  RETURN pgp_sym_encrypt(
    p_api_key,
    COALESCE(p_encryption_key, 'default-encryption-key-CHANGE-ME'),
    'compress-algo=1, cipher-algo=aes256'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt API key
CREATE OR REPLACE FUNCTION decrypt_api_key(
  p_encrypted_key BYTEA,
  p_encryption_key TEXT DEFAULT current_setting('app.encryption_key', true)
)
RETURNS TEXT AS $$
BEGIN
  -- Decrypt using pgcrypto
  RETURN pgp_sym_decrypt(
    p_encrypted_key,
    COALESCE(p_encryption_key, 'default-encryption-key-CHANGE-ME')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to securely store API key
CREATE OR REPLACE FUNCTION store_api_key(
  p_user_id UUID,
  p_service_name TEXT,
  p_key_name TEXT,
  p_api_key TEXT,
  p_expires_days INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_key_id UUID;
  v_key_prefix TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Extract key prefix for identification (first 8 chars)
  v_key_prefix := SUBSTRING(p_api_key FROM 1 FOR 8);

  -- Calculate expiration if specified
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := timezone('utc'::text, now()) + (p_expires_days || ' days')::INTERVAL;
  END IF;

  -- Insert encrypted key
  INSERT INTO public.user_api_keys (
    user_id,
    service_name,
    key_name,
    encrypted_api_key,
    key_prefix,
    expires_at,
    rotation_reminder_at
  ) VALUES (
    p_user_id,
    p_service_name,
    p_key_name,
    encrypt_api_key(p_api_key),
    v_key_prefix,
    v_expires_at,
    CASE
      WHEN v_expires_at IS NOT NULL
      THEN v_expires_at - INTERVAL '7 days'
      ELSE NULL
    END
  )
  ON CONFLICT (user_id, service_name, key_name)
  DO UPDATE SET
    encrypted_api_key = EXCLUDED.encrypted_api_key,
    key_prefix = EXCLUDED.key_prefix,
    expires_at = EXCLUDED.expires_at,
    rotation_reminder_at = EXCLUDED.rotation_reminder_at,
    key_status = 'active',
    is_valid = true,
    updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_key_id;

  RETURN v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to retrieve decrypted API key
CREATE OR REPLACE FUNCTION get_api_key(
  p_user_id UUID,
  p_service_name TEXT,
  p_key_name TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_encrypted_key BYTEA;
  v_key_status TEXT;
  v_is_valid BOOLEAN;
BEGIN
  -- Get the encrypted key
  SELECT encrypted_api_key, key_status, is_valid
  INTO v_encrypted_key, v_key_status, v_is_valid
  FROM public.user_api_keys
  WHERE
    user_id = p_user_id
    AND service_name = p_service_name
    AND (p_key_name IS NULL OR key_name = p_key_name)
    AND key_status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if key exists and is valid
  IF v_encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_key_status != 'active' OR v_is_valid = false THEN
    RETURN NULL;
  END IF;

  -- Decrypt and return
  RETURN decrypt_api_key(v_encrypted_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track API key usage
CREATE OR REPLACE FUNCTION track_api_key_usage(
  p_key_id UUID,
  p_tokens_used BIGINT DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_api_keys
  SET
    last_used_at = timezone('utc'::text, now()),
    usage_count = usage_count + 1,
    total_tokens_used = total_tokens_used + p_tokens_used,
    daily_requests_used = CASE
      WHEN daily_limit_reset_at IS NULL OR daily_limit_reset_at < timezone('utc'::text, now())
      THEN 1
      ELSE daily_requests_used + 1
    END,
    daily_limit_reset_at = CASE
      WHEN daily_limit_reset_at IS NULL OR daily_limit_reset_at < timezone('utc'::text, now())
      THEN (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
      ELSE daily_limit_reset_at
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke API key
CREATE OR REPLACE FUNCTION revoke_api_key(
  p_user_id UUID,
  p_key_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_api_keys
  SET
    key_status = 'revoked',
    is_valid = false,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_key_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user API key statistics
CREATE OR REPLACE FUNCTION get_user_api_key_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_keys', COUNT(*),
    'active_keys', COUNT(*) FILTER (WHERE key_status = 'active'),
    'expired_keys', COUNT(*) FILTER (WHERE expires_at < timezone('utc'::text, now())),
    'total_usage', COALESCE(SUM(usage_count), 0),
    'total_tokens', COALESCE(SUM(total_tokens_used), 0),
    'keys_by_service', jsonb_object_agg(
      service_name,
      COUNT(*)
    ),
    'last_used', MAX(last_used_at)
  )
  INTO v_stats
  FROM public.user_api_keys
  WHERE user_id = p_user_id
  GROUP BY user_id;

  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Mark expired keys as expired
  UPDATE public.user_api_keys
  SET
    key_status = 'expired',
    is_valid = false,
    updated_at = timezone('utc'::text, now())
  WHERE
    expires_at IS NOT NULL
    AND expires_at < timezone('utc'::text, now())
    AND key_status = 'active';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREATE VIEW FOR API KEY MANAGEMENT
-- =====================================================

-- View that shows API key information without exposing encrypted keys
CREATE OR REPLACE VIEW public.user_api_keys_safe AS
SELECT
  id,
  user_id,
  service_name,
  key_name,
  key_prefix,
  key_status,
  last_used_at,
  usage_count,
  total_tokens_used,
  daily_request_limit,
  daily_requests_used,
  daily_limit_reset_at,
  expires_at,
  rotation_reminder_at,
  is_valid,
  last_validation_at,
  validation_error,
  created_at,
  updated_at
FROM public.user_api_keys;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'MIGRATION 003 COMPLETED SUCCESSFULLY! ✓';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Created: user_api_keys table';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Encrypted API key storage (AES-256)';
  RAISE NOTICE '  ✓ Support for multiple services';
  RAISE NOTICE '  ✓ Usage tracking and rate limiting';
  RAISE NOTICE '  ✓ Key expiration and rotation reminders';
  RAISE NOTICE '  ✓ Row Level Security enabled';
  RAISE NOTICE '  ✓ Secure encryption/decryption functions';
  RAISE NOTICE '  ✓ API key management helpers';
  RAISE NOTICE '  ✓ Safe view without encrypted data';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT SECURITY NOTES:';
  RAISE NOTICE '  ⚠  Set custom encryption key in production:';
  RAISE NOTICE '     ALTER DATABASE your_db SET app.encryption_key = ''your-secure-key'';';
  RAISE NOTICE '  ⚠  Store encryption key in secure vault (not in code)';
  RAISE NOTICE '  ⚠  Rotate encryption keys periodically';
  RAISE NOTICE '=======================================================';
END $$;
