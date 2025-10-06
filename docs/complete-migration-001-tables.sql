-- ==============================================
-- COMPLETE MIGRATION 001 - CREATE MISSING TABLES
-- ==============================================
-- This creates all tables from migration 001 that don't exist yet
-- Safe to run - uses IF NOT EXISTS for all tables
-- Run this AFTER fix-missing-enums.sql

-- First, make sure ENUMs exist (run fix-missing-enums.sql first!)

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Users table (probably exists, but safe to run)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  spanish_level spanish_level DEFAULT 'beginner',
  preferred_description_style description_style DEFAULT 'conversacional',
  native_language VARCHAR(50) DEFAULT 'en',
  learning_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  total_sessions INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_streak_date DATE,
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Learning sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  items_studied INTEGER DEFAULT 0,
  items_correct INTEGER DEFAULT 0,
  items_incorrect INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2),
  difficulty_level difficulty_level,
  session_data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary items
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spanish_word VARCHAR(255) NOT NULL,
  english_translation VARCHAR(255) NOT NULL,
  part_of_speech part_of_speech,
  gender spanish_gender,
  difficulty_level difficulty_level DEFAULT 'beginner',
  category vocabulary_category DEFAULT 'basic',
  usage_examples JSONB DEFAULT '[]',
  pronunciation_guide VARCHAR(255),
  related_words JSONB DEFAULT '[]',
  image_url TEXT,
  audio_url TEXT,
  frequency_rank INTEGER,
  is_common BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'
);

-- Learning progress (THIS IS THE ONE YOU'RE MISSING!)
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_item_id UUID REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  learning_phase learning_phase DEFAULT 'new',
  times_seen INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  mastery_level DECIMAL(5,2) DEFAULT 0.0,
  last_reviewed_at TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  review_interval INTEGER DEFAULT 1,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  consecutive_correct INTEGER DEFAULT 0,
  error_patterns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vocabulary_item_id)
);

-- Descriptions
CREATE TABLE IF NOT EXISTS descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  user_description TEXT,
  ai_description TEXT,
  description_style description_style,
  difficulty_level difficulty_level,
  key_phrases JSONB DEFAULT '[]',
  grammar_points JSONB DEFAULT '[]',
  vocabulary_used JSONB DEFAULT '[]',
  feedback JSONB DEFAULT '{}',
  score DECIMAL(5,2),
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Questions and answers
CREATE TABLE IF NOT EXISTS questions_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  question TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  difficulty qa_difficulty,
  is_correct BOOLEAN,
  hints_used INTEGER DEFAULT 0,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  theme theme_preference DEFAULT 'auto',
  language language_preference DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  daily_goal_minutes INTEGER DEFAULT 30,
  reminder_time TIME,
  auto_advance BOOLEAN DEFAULT true,
  show_hints BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(100),
  points INTEGER DEFAULT 0,
  category VARCHAR(100),
  requirement_type VARCHAR(100),
  requirement_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Verify tables were created
SELECT
    table_name,
    'Created successfully' as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'learning_sessions', 'vocabulary_items', 'learning_progress',
        'descriptions', 'questions_answers', 'user_settings',
        'achievements', 'user_achievements'
    )
ORDER BY table_name;
