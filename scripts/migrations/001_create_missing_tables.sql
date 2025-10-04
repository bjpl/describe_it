-- =====================================================
-- MIGRATION: Create Missing Database Tables
-- Version: 001
-- Date: 2025-10-03
-- Description: Creates all missing tables for runtime stability
-- =====================================================
-- This migration adds tables that are referenced in code but missing from schema:
-- - images: Image metadata and storage
-- - descriptions: Image descriptions and translations
-- - phrases: Extracted phrases from descriptions
-- - qa_items: Question and answer pairs
-- - answer_validations: Q&A answer validation history
-- - session_progress: Detailed session progress tracking
-- - qa_responses: User responses to Q&A items
-- - user_settings: User preferences and settings
-- - user_preferences: Additional user preference data
-- - user_data: General user data storage
-- - image_history: Image viewing and interaction history

-- =====================================================
-- 1. IMAGES TABLE
-- =====================================================
-- Stores image metadata, URLs, and processing information

CREATE TABLE IF NOT EXISTS public.images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- Image source and URLs
  source_url TEXT NOT NULL,
  thumbnail_url TEXT,
  full_url TEXT,

  -- Image metadata
  alt_text TEXT,
  title TEXT,
  photographer TEXT,
  source_platform TEXT DEFAULT 'unsplash',
  external_id TEXT, -- ID from source platform (Unsplash, etc.)

  -- Image properties
  width INTEGER,
  height INTEGER,
  format TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  description_generated BOOLEAN DEFAULT false,
  qa_generated BOOLEAN DEFAULT false,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  description_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,

  -- Additional metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for images table
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_external_id ON public.images(external_id);
CREATE INDEX IF NOT EXISTS idx_images_source_platform ON public.images(source_platform);
CREATE INDEX IF NOT EXISTS idx_images_processed ON public.images(processed);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images(created_at);
CREATE INDEX IF NOT EXISTS idx_images_tags ON public.images USING gin(tags);

-- RLS for images
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all images" ON public.images
  FOR SELECT USING (true);

CREATE POLICY "Users can insert images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. DESCRIPTIONS TABLE
-- =====================================================
-- Stores image descriptions in multiple languages

CREATE TABLE IF NOT EXISTS public.descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  -- Description content
  english_text TEXT NOT NULL,
  spanish_text TEXT NOT NULL,

  -- Description metadata
  style TEXT CHECK (style IN ('conversacional', 'académico', 'creativo', 'técnico', 'narrativo')) DEFAULT 'conversacional',
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10) DEFAULT 5,
  word_count INTEGER,

  -- AI generation metadata
  generated_by TEXT DEFAULT 'openai',
  model_used TEXT,
  generation_time_ms INTEGER,
  confidence_score DECIMAL(3, 2),

  -- Quality metrics
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),

  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- Extracted data
  vocabulary_items JSONB DEFAULT '[]'::jsonb,
  key_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status flags
  is_favorite BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for descriptions table
CREATE INDEX IF NOT EXISTS idx_descriptions_user_id ON public.descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_descriptions_image_id ON public.descriptions(image_id);
CREATE INDEX IF NOT EXISTS idx_descriptions_session_id ON public.descriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_descriptions_style ON public.descriptions(style);
CREATE INDEX IF NOT EXISTS idx_descriptions_difficulty ON public.descriptions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_descriptions_is_favorite ON public.descriptions(is_favorite);
CREATE INDEX IF NOT EXISTS idx_descriptions_created_at ON public.descriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_descriptions_spanish_text ON public.descriptions USING gin(to_tsvector('spanish', spanish_text));
CREATE INDEX IF NOT EXISTS idx_descriptions_english_text ON public.descriptions USING gin(to_tsvector('english', english_text));

-- RLS for descriptions
ALTER TABLE public.descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own descriptions" ON public.descriptions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own descriptions" ON public.descriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own descriptions" ON public.descriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own descriptions" ON public.descriptions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. PHRASES TABLE
-- =====================================================
-- Stores extracted phrases from descriptions

CREATE TABLE IF NOT EXISTS public.phrases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description_id UUID REFERENCES public.descriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- Phrase content
  spanish_text TEXT NOT NULL,
  english_translation TEXT NOT NULL,

  -- Context
  context_sentence_spanish TEXT,
  context_sentence_english TEXT,

  -- Classification
  phrase_type TEXT CHECK (phrase_type IN ('idiom', 'colloquial', 'formal', 'technical', 'common')) DEFAULT 'common',
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10) DEFAULT 5,

  -- Learning metrics
  usage_frequency INTEGER DEFAULT 1,
  practice_count INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),

  -- Additional data
  grammatical_notes TEXT,
  cultural_notes TEXT,
  related_phrases JSONB DEFAULT '[]'::jsonb,

  -- Status
  is_saved BOOLEAN DEFAULT true,
  is_mastered BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for phrases table
CREATE INDEX IF NOT EXISTS idx_phrases_description_id ON public.phrases(description_id);
CREATE INDEX IF NOT EXISTS idx_phrases_user_id ON public.phrases(user_id);
CREATE INDEX IF NOT EXISTS idx_phrases_phrase_type ON public.phrases(phrase_type);
CREATE INDEX IF NOT EXISTS idx_phrases_difficulty ON public.phrases(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_phrases_spanish_text ON public.phrases USING gin(to_tsvector('spanish', spanish_text));

-- RLS for phrases
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phrases" ON public.phrases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phrases" ON public.phrases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phrases" ON public.phrases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phrases" ON public.phrases
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. QA_ITEMS TABLE
-- =====================================================
-- Stores question and answer pairs

CREATE TABLE IF NOT EXISTS public.qa_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  description_id UUID REFERENCES public.descriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- Q&A content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  -- Classification
  difficulty TEXT CHECK (difficulty IN ('facil', 'medio', 'dificil')) DEFAULT 'medio',
  category TEXT NOT NULL DEFAULT 'general',
  language TEXT CHECK (language IN ('es', 'en')) DEFAULT 'es',

  -- Question type
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'fill_blank', 'matching')) DEFAULT 'short_answer',

  -- Multiple choice options (if applicable)
  options JSONB DEFAULT '[]'::jsonb,
  correct_option_index INTEGER,

  -- Quality metrics
  confidence DECIMAL(3, 2),
  validated BOOLEAN DEFAULT false,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),

  -- Usage statistics
  times_asked INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  average_response_time_ms INTEGER,

  -- AI generation metadata
  source TEXT DEFAULT 'openai',
  model_used TEXT,
  generation_time_ms INTEGER,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Status flags
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for qa_items table
CREATE INDEX IF NOT EXISTS idx_qa_items_image_id ON public.qa_items(image_id);
CREATE INDEX IF NOT EXISTS idx_qa_items_description_id ON public.qa_items(description_id);
CREATE INDEX IF NOT EXISTS idx_qa_items_user_id ON public.qa_items(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_items_difficulty ON public.qa_items(difficulty);
CREATE INDEX IF NOT EXISTS idx_qa_items_category ON public.qa_items(category);
CREATE INDEX IF NOT EXISTS idx_qa_items_language ON public.qa_items(language);
CREATE INDEX IF NOT EXISTS idx_qa_items_question_type ON public.qa_items(question_type);
CREATE INDEX IF NOT EXISTS idx_qa_items_is_active ON public.qa_items(is_active);
CREATE INDEX IF NOT EXISTS idx_qa_items_created_at ON public.qa_items(created_at);

-- RLS for qa_items
ALTER TABLE public.qa_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all active qa_items" ON public.qa_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can insert qa_items" ON public.qa_items
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own qa_items" ON public.qa_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own qa_items" ON public.qa_items
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. ANSWER_VALIDATIONS TABLE
-- =====================================================
-- Stores answer validation history

CREATE TABLE IF NOT EXISTS public.answer_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qa_item_id UUID REFERENCES public.qa_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  -- Answer details
  user_answer TEXT NOT NULL,
  expected_answer TEXT NOT NULL,

  -- Validation results
  is_correct BOOLEAN NOT NULL,
  confidence DECIMAL(3, 2),
  score INTEGER CHECK (score >= 0 AND score <= 100),

  -- Detailed analysis
  exact_match BOOLEAN DEFAULT false,
  semantic_match BOOLEAN DEFAULT false,
  keyword_match BOOLEAN DEFAULT false,

  -- Feedback
  feedback TEXT,
  suggestions JSONB DEFAULT '[]'::jsonb,
  grammar_issues JSONB DEFAULT '[]'::jsonb,

  -- Performance metrics
  response_time_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,

  -- AI validation metadata
  validated_by TEXT DEFAULT 'openai',
  model_used TEXT,
  validation_time_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for answer_validations table
CREATE INDEX IF NOT EXISTS idx_answer_validations_qa_item_id ON public.answer_validations(qa_item_id);
CREATE INDEX IF NOT EXISTS idx_answer_validations_user_id ON public.answer_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_answer_validations_session_id ON public.answer_validations(session_id);
CREATE INDEX IF NOT EXISTS idx_answer_validations_is_correct ON public.answer_validations(is_correct);
CREATE INDEX IF NOT EXISTS idx_answer_validations_created_at ON public.answer_validations(created_at);

-- RLS for answer_validations
ALTER TABLE public.answer_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answer_validations" ON public.answer_validations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answer_validations" ON public.answer_validations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================
-- 6. SESSION_PROGRESS TABLE
-- =====================================================
-- Detailed session progress tracking (extends base sessions table)

CREATE TABLE IF NOT EXISTS public.session_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- Session type and metadata
  session_type TEXT CHECK (session_type IN ('study', 'quiz', 'review', 'exploration')) DEFAULT 'study',
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',

  -- Time tracking
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Activity metrics
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  incorrect_answers INTEGER DEFAULT 0,
  accuracy DECIMAL(5, 2),

  -- Content covered
  topics_studied TEXT[] DEFAULT ARRAY[]::TEXT[],
  images_viewed TEXT[] DEFAULT ARRAY[]::TEXT[],
  vocabulary_learned TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Performance metrics
  average_response_time_ms INTEGER,
  total_hints_used INTEGER DEFAULT 0,
  total_retries INTEGER DEFAULT 0,

  -- Experience and rewards
  experience_gained INTEGER DEFAULT 0,
  badges_earned JSONB DEFAULT '[]'::jsonb,
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,

  -- Device and context
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  user_agent TEXT,
  location TEXT,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Unique constraint to prevent duplicate session progress
  UNIQUE(session_id)
);

-- Indexes for session_progress table
CREATE INDEX IF NOT EXISTS idx_session_progress_session_id ON public.session_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_user_id ON public.session_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_session_type ON public.session_progress(session_type);
CREATE INDEX IF NOT EXISTS idx_session_progress_start_time ON public.session_progress(start_time);
CREATE INDEX IF NOT EXISTS idx_session_progress_difficulty ON public.session_progress(difficulty_level);

-- RLS for session_progress
ALTER TABLE public.session_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session_progress" ON public.session_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session_progress" ON public.session_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own session_progress" ON public.session_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 7. QA_RESPONSES TABLE
-- =====================================================
-- User responses to Q&A items (alternative to answer_validations)

CREATE TABLE IF NOT EXISTS public.qa_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qa_item_id UUID REFERENCES public.qa_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  -- Response data
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),

  -- Timing
  response_time_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,
  hints_used INTEGER DEFAULT 0,

  -- Feedback
  feedback TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for qa_responses table
CREATE INDEX IF NOT EXISTS idx_qa_responses_qa_item_id ON public.qa_responses(qa_item_id);
CREATE INDEX IF NOT EXISTS idx_qa_responses_user_id ON public.qa_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_responses_session_id ON public.qa_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_qa_responses_is_correct ON public.qa_responses(is_correct);
CREATE INDEX IF NOT EXISTS idx_qa_responses_created_at ON public.qa_responses(created_at);

-- RLS for qa_responses
ALTER TABLE public.qa_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own qa_responses" ON public.qa_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qa_responses" ON public.qa_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. USER_SETTINGS TABLE
-- =====================================================
-- User preferences and application settings

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,

  -- Display preferences
  theme TEXT CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'auto',
  language TEXT CHECK (language IN ('en', 'es')) DEFAULT 'en',
  font_size TEXT CHECK (font_size IN ('small', 'medium', 'large')) DEFAULT 'medium',

  -- Learning preferences
  preferred_difficulty TEXT CHECK (preferred_difficulty IN ('facil', 'medio', 'dificil')) DEFAULT 'medio',
  description_style TEXT CHECK (description_style IN ('conversacional', 'académico', 'creativo', 'técnico', 'narrativo')) DEFAULT 'conversacional',
  auto_translate BOOLEAN DEFAULT true,
  show_hints BOOLEAN DEFAULT true,

  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  daily_reminder BOOLEAN DEFAULT true,
  reminder_time TIME,

  -- Privacy settings
  profile_public BOOLEAN DEFAULT false,
  show_progress BOOLEAN DEFAULT true,
  share_statistics BOOLEAN DEFAULT false,

  -- Learning goals
  daily_goal_minutes INTEGER DEFAULT 15,
  weekly_goal_minutes INTEGER DEFAULT 105,
  target_words_per_week INTEGER DEFAULT 50,

  -- Additional settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for user_settings table
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 9. USER_PREFERENCES TABLE
-- =====================================================
-- Additional user preference data (alternative/complement to user_settings)

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,

  -- UI preferences
  interface_language TEXT DEFAULT 'en',
  content_language TEXT DEFAULT 'es',
  color_scheme TEXT DEFAULT 'auto',

  -- Content preferences
  preferred_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  avoided_topics TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Learning style
  learning_mode TEXT CHECK (learning_mode IN ('visual', 'auditory', 'reading', 'kinesthetic', 'mixed')) DEFAULT 'mixed',
  pace TEXT CHECK (pace IN ('slow', 'moderate', 'fast')) DEFAULT 'moderate',

  -- Advanced settings
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for user_preferences table
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- RLS for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 10. USER_DATA TABLE
-- =====================================================
-- General user data storage for flexible data persistence

CREATE TABLE IF NOT EXISTS public.user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,

  -- Data classification
  data_type TEXT NOT NULL,
  data_key TEXT NOT NULL,

  -- Data storage
  data_value JSONB NOT NULL,

  -- Metadata
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,

  -- Access control
  is_public BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Unique constraint for data keys per user
  UNIQUE(user_id, data_type, data_key)
);

-- Indexes for user_data table
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_data_type ON public.user_data(data_type);
CREATE INDEX IF NOT EXISTS idx_user_data_data_key ON public.user_data(data_key);

-- RLS for user_data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_data" ON public.user_data
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own user_data" ON public.user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_data" ON public.user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_data" ON public.user_data
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 11. IMAGE_HISTORY TABLE
-- =====================================================
-- Tracks user interactions with images

CREATE TABLE IF NOT EXISTS public.image_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,

  -- Interaction type
  action TEXT CHECK (action IN ('view', 'describe', 'favorite', 'share', 'save', 'export')) NOT NULL,

  -- Context
  context JSONB DEFAULT '{}'::jsonb,

  -- Duration (for view actions)
  duration_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for image_history table
CREATE INDEX IF NOT EXISTS idx_image_history_user_id ON public.image_history(user_id);
CREATE INDEX IF NOT EXISTS idx_image_history_image_id ON public.image_history(image_id);
CREATE INDEX IF NOT EXISTS idx_image_history_session_id ON public.image_history(session_id);
CREATE INDEX IF NOT EXISTS idx_image_history_action ON public.image_history(action);
CREATE INDEX IF NOT EXISTS idx_image_history_created_at ON public.image_history(created_at);

-- RLS for image_history
ALTER TABLE public.image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image_history" ON public.image_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image_history" ON public.image_history
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =====================================================
-- 12. TRIGGER FUNCTIONS FOR NEW TABLES
-- =====================================================

-- Apply updated_at trigger to all new tables
CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON public.images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_descriptions_updated_at
    BEFORE UPDATE ON public.descriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phrases_updated_at
    BEFORE UPDATE ON public.phrases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_items_updated_at
    BEFORE UPDATE ON public.qa_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_progress_updated_at
    BEFORE UPDATE ON public.session_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON public.user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. HELPFUL VIEWS
-- =====================================================

-- Image statistics view
CREATE OR REPLACE VIEW public.image_statistics AS
SELECT
    i.id as image_id,
    i.source_url,
    i.photographer,
    COUNT(DISTINCT d.id) as description_count,
    COUNT(DISTINCT q.id) as qa_count,
    COUNT(DISTINCT ih.id) as total_interactions,
    MAX(ih.created_at) as last_interaction,
    i.view_count,
    i.created_at
FROM public.images i
LEFT JOIN public.descriptions d ON i.id = d.image_id
LEFT JOIN public.qa_items q ON i.id = q.image_id
LEFT JOIN public.image_history ih ON i.id = ih.image_id
GROUP BY i.id, i.source_url, i.photographer, i.view_count, i.created_at;

-- User Q&A performance view
CREATE OR REPLACE VIEW public.user_qa_performance AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(DISTINCT av.id) as total_answers,
    SUM(CASE WHEN av.is_correct THEN 1 ELSE 0 END) as correct_answers,
    ROUND(AVG(CASE WHEN av.is_correct THEN 100 ELSE 0 END), 2) as accuracy_percentage,
    ROUND(AVG(av.score), 2) as average_score,
    ROUND(AVG(av.response_time_ms), 0) as avg_response_time_ms,
    COUNT(DISTINCT qi.category) as categories_practiced,
    MAX(av.created_at) as last_practice
FROM public.users u
LEFT JOIN public.answer_validations av ON u.id = av.user_id
LEFT JOIN public.qa_items qi ON av.qa_item_id = qi.id
GROUP BY u.id, u.email;

-- =====================================================
-- 14. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.images IS 'Stores image metadata, URLs, and processing status';
COMMENT ON TABLE public.descriptions IS 'Stores AI-generated descriptions in English and Spanish';
COMMENT ON TABLE public.phrases IS 'Stores extracted phrases from descriptions for learning';
COMMENT ON TABLE public.qa_items IS 'Stores question and answer pairs for practice';
COMMENT ON TABLE public.answer_validations IS 'Stores detailed answer validation history';
COMMENT ON TABLE public.session_progress IS 'Tracks detailed session progress and metrics';
COMMENT ON TABLE public.qa_responses IS 'Stores user responses to Q&A items';
COMMENT ON TABLE public.user_settings IS 'Stores user preferences and application settings';
COMMENT ON TABLE public.user_preferences IS 'Stores additional user preference data';
COMMENT ON TABLE public.user_data IS 'General-purpose user data storage';
COMMENT ON TABLE public.image_history IS 'Tracks user interactions with images';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'MIGRATION 001 COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Created 11 new tables:';
    RAISE NOTICE '  ✓ images (image metadata and storage)';
    RAISE NOTICE '  ✓ descriptions (image descriptions)';
    RAISE NOTICE '  ✓ phrases (extracted phrases)';
    RAISE NOTICE '  ✓ qa_items (question and answer pairs)';
    RAISE NOTICE '  ✓ answer_validations (answer validation history)';
    RAISE NOTICE '  ✓ session_progress (detailed session tracking)';
    RAISE NOTICE '  ✓ qa_responses (user Q&A responses)';
    RAISE NOTICE '  ✓ user_settings (user preferences)';
    RAISE NOTICE '  ✓ user_preferences (additional preferences)';
    RAISE NOTICE '  ✓ user_data (general data storage)';
    RAISE NOTICE '  ✓ image_history (interaction tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '  ✓ Row Level Security (RLS) policies';
    RAISE NOTICE '  ✓ Foreign key relationships';
    RAISE NOTICE '  ✓ Performance indexes';
    RAISE NOTICE '  ✓ Full-text search indexes';
    RAISE NOTICE '  ✓ Automatic timestamp updates';
    RAISE NOTICE '  ✓ Helpful views for analytics';
    RAISE NOTICE '';
    RAISE NOTICE 'Runtime stability improved!';
    RAISE NOTICE '=======================================================';
END $$;
