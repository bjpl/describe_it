-- Migration: Add Missing Tables for Schema Alignment
-- Date: 2025-10-03
-- Description: Creates user_api_keys, user_progress, and export_history tables
--              to align database schema with application code expectations

-- ============================================================================
-- 1. USER_API_KEYS TABLE
-- ============================================================================
-- Purpose: Store user API keys securely (OpenAI, Unsplash, etc.)
-- Note: API keys should be encrypted at application layer before storage

CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- API Keys (store encrypted values)
  openai_api_key TEXT,
  unsplash_api_key TEXT,
  anthropic_api_key TEXT,

  -- Metadata
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user
  CONSTRAINT unique_user_api_keys UNIQUE (user_id)
);

-- Index for faster user lookups
CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys(user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_api_keys_updated_at();

-- ============================================================================
-- 2. USER_PROGRESS TABLE
-- ============================================================================
-- Purpose: Track overall user progress and statistics
-- Note: This complements learning_progress table which tracks vocabulary-specific progress

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Overall statistics
  total_descriptions INTEGER DEFAULT 0,
  total_images INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  total_vocabulary_learned INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,

  -- Time tracking
  total_time_spent_minutes INTEGER DEFAULT 0,

  -- Achievement tracking
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,

  -- Performance metrics
  average_accuracy DECIMAL(5,2) DEFAULT 0.0,
  average_completion_time_seconds INTEGER DEFAULT 0,

  -- Learning milestones
  mastered_words_count INTEGER DEFAULT 0,
  learning_words_count INTEGER DEFAULT 0,
  new_words_count INTEGER DEFAULT 0,

  -- Last activity
  last_activity_at TIMESTAMPTZ,
  last_description_at TIMESTAMPTZ,
  last_qa_session_at TIMESTAMPTZ,
  last_vocabulary_practice_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user
  CONSTRAINT unique_user_progress UNIQUE (user_id)
);

-- Index for faster user lookups
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);

-- Index for activity tracking
CREATE INDEX idx_user_progress_last_activity ON public.user_progress(last_activity_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_updated_at();

-- ============================================================================
-- 3. EXPORT_HISTORY TABLE
-- ============================================================================
-- Purpose: Track user data exports for audit and compliance

CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Export details
  export_type VARCHAR(50) NOT NULL, -- 'csv', 'json', 'anki', 'pdf'
  export_format VARCHAR(20) NOT NULL, -- specific format details

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

  -- Data exported
  records_count INTEGER DEFAULT 0,
  file_size_bytes BIGINT,
  file_url TEXT, -- S3/storage URL if applicable

  -- Export parameters
  filters JSONB, -- filters applied during export
  data JSONB, -- export metadata or small payloads

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Processing time
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_seconds INTEGER,

  -- Expiration (for temporary export files)
  expires_at TIMESTAMPTZ,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX idx_export_history_status ON public.export_history(status);
CREATE INDEX idx_export_history_created_at ON public.export_history(created_at DESC);
CREATE INDEX idx_export_history_export_type ON public.export_history(export_type);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_export_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_export_history_updated_at
  BEFORE UPDATE ON public.export_history
  FOR EACH ROW
  EXECUTE FUNCTION update_export_history_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- USER_API_KEYS RLS Policies
CREATE POLICY "Users can view their own API keys"
  ON public.user_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON public.user_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.user_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.user_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- USER_PROGRESS RLS Policies
CREATE POLICY "Users can view their own progress"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- EXPORT_HISTORY RLS Policies
CREATE POLICY "Users can view their own export history"
  ON public.export_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export history"
  ON public.export_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export history"
  ON public.export_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. INITIAL DATA MIGRATION (Optional)
-- ============================================================================
-- Create user_progress records for existing users who don't have one

INSERT INTO public.user_progress (user_id)
SELECT u.id
FROM public.users u
LEFT JOIN public.user_progress up ON u.id = up.user_id
WHERE up.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update user progress after session completion
CREATE OR REPLACE FUNCTION update_user_progress_from_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when session is completed
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at <> NEW.ended_at) THEN
    INSERT INTO public.user_progress (
      user_id,
      total_sessions,
      total_descriptions,
      total_images,
      total_questions_answered,
      total_vocabulary_learned,
      total_time_spent_minutes,
      last_activity_at
    )
    VALUES (
      NEW.user_id,
      1,
      NEW.descriptions_generated,
      NEW.images_processed,
      NEW.qa_attempts,
      NEW.vocabulary_learned,
      COALESCE(NEW.duration_minutes, 0),
      NEW.ended_at
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_sessions = user_progress.total_sessions + 1,
      total_descriptions = user_progress.total_descriptions + NEW.descriptions_generated,
      total_images = user_progress.total_images + NEW.images_processed,
      total_questions_answered = user_progress.total_questions_answered + NEW.qa_attempts,
      total_vocabulary_learned = user_progress.total_vocabulary_learned + NEW.vocabulary_learned,
      total_time_spent_minutes = user_progress.total_time_spent_minutes + COALESCE(NEW.duration_minutes, 0),
      last_activity_at = NEW.ended_at,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user_progress when sessions complete
CREATE TRIGGER trigger_update_user_progress_from_session
  AFTER INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION update_user_progress_from_session();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: user_api_keys, user_progress, export_history
-- RLS policies enabled
-- Triggers configured for automatic updates
-- Initial data migrated for existing users
