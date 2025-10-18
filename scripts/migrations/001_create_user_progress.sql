-- =====================================================
-- MIGRATION 001: CREATE USER_PROGRESS TABLE
-- =====================================================
-- Purpose: Track user overall progress metrics and achievements
-- Blocked TODOs: 14 TODOs currently using fallback learning_progress table
-- Created: 2025-10-17
-- Dependencies: users table (FK constraint)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE USER_PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Overall progress metrics
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,

  -- Learning milestones
  current_level TEXT CHECK (current_level IN ('beginner', 'intermediate', 'advanced', 'expert')) DEFAULT 'beginner',
  level_progress INTEGER DEFAULT 0 CHECK (level_progress >= 0 AND level_progress <= 100),

  -- Achievement tracking
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Activity tracking
  last_session_date TIMESTAMP WITH TIME ZONE,
  last_streak_update TIMESTAMP WITH TIME ZONE,
  daily_goal_minutes INTEGER DEFAULT 15,
  weekly_goal_days INTEGER DEFAULT 3,

  -- Performance metrics
  average_accuracy NUMERIC(5,2) DEFAULT 0.00 CHECK (average_accuracy >= 0 AND average_accuracy <= 100),
  words_learned_count INTEGER DEFAULT 0,
  words_mastered_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure one progress record per user
  UNIQUE(user_id)
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Primary lookup index
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
  ON public.user_progress(user_id);

-- Performance query indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_current_level
  ON public.user_progress(current_level);

CREATE INDEX IF NOT EXISTS idx_user_progress_total_points
  ON public.user_progress(total_points DESC);

CREATE INDEX IF NOT EXISTS idx_user_progress_current_streak
  ON public.user_progress(current_streak DESC);

-- Activity tracking index
CREATE INDEX IF NOT EXISTS idx_user_progress_last_session
  ON public.user_progress(last_session_date DESC);

-- Achievement search index
CREATE INDEX IF NOT EXISTS idx_user_progress_achievements
  ON public.user_progress USING gin(achievements_unlocked);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only view their own progress
CREATE POLICY "Users can view own progress"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress record
CREATE POLICY "Users can insert own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
  ON public.user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to initialize user progress on user creation
CREATE OR REPLACE FUNCTION initialize_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_progress (
    user_id,
    current_level,
    daily_goal_minutes,
    weekly_goal_days
  ) VALUES (
    NEW.id,
    COALESCE(NEW.spanish_level, 'beginner'),
    15,
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create progress record when user signs up
CREATE TRIGGER create_user_progress_on_signup
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_progress();

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_session TIMESTAMP WITH TIME ZONE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Get current progress
  SELECT last_session_date, current_streak, longest_streak
  INTO v_last_session, v_current_streak, v_longest_streak
  FROM public.user_progress
  WHERE user_id = p_user_id;

  -- Calculate new streak
  IF v_last_session IS NULL THEN
    -- First session
    v_current_streak := 1;
  ELSIF DATE(v_last_session) = CURRENT_DATE THEN
    -- Same day, no change
    RETURN;
  ELSIF DATE(v_last_session) = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak broken
    v_current_streak := 1;
  END IF;

  -- Update longest streak if needed
  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  -- Update progress
  UPDATE public.user_progress
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_session_date = timezone('utc'::text, now()),
    last_streak_update = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add points and check level up
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_total_points INTEGER;
  v_old_level TEXT;
  v_new_level TEXT;
  v_level_up BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Get current progress
  SELECT total_points, current_level
  INTO v_total_points, v_old_level
  FROM public.user_progress
  WHERE user_id = p_user_id;

  -- Add points
  v_total_points := v_total_points + p_points;

  -- Determine new level based on points
  v_new_level := CASE
    WHEN v_total_points >= 10000 THEN 'expert'
    WHEN v_total_points >= 5000 THEN 'advanced'
    WHEN v_total_points >= 1000 THEN 'intermediate'
    ELSE 'beginner'
  END;

  -- Check if level changed
  v_level_up := v_new_level != v_old_level;

  -- Update progress
  UPDATE public.user_progress
  SET
    total_points = v_total_points,
    current_level = v_new_level,
    level_progress = CASE
      WHEN v_new_level = 'beginner' THEN (v_total_points * 100) / 1000
      WHEN v_new_level = 'intermediate' THEN ((v_total_points - 1000) * 100) / 4000
      WHEN v_new_level = 'advanced' THEN ((v_total_points - 5000) * 100) / 5000
      ELSE 100
    END,
    updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'total_points', v_total_points,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. MIGRATE EXISTING USERS
-- =====================================================

-- Create progress records for existing users who don't have one
INSERT INTO public.user_progress (
  user_id,
  current_level,
  daily_goal_minutes,
  weekly_goal_days
)
SELECT
  u.id,
  COALESCE(u.spanish_level, 'beginner'),
  15,
  3
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_progress up WHERE up.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'MIGRATION 001 COMPLETED SUCCESSFULLY! ✓';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Created: user_progress table';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Overall progress tracking';
  RAISE NOTICE '  ✓ Achievement system';
  RAISE NOTICE '  ✓ Streak tracking';
  RAISE NOTICE '  ✓ Level progression';
  RAISE NOTICE '  ✓ Row Level Security enabled';
  RAISE NOTICE '  ✓ Auto-initialization for new users';
  RAISE NOTICE '  ✓ Helper functions for streak and points';
  RAISE NOTICE '=======================================================';
END $$;
