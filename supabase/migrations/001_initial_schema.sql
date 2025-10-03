-- ==============================================
-- DESCRIBE IT APP - COMPLETE DATABASE SCHEMA
-- ==============================================
-- Initial schema migration for Spanish learning app
-- Includes: users, sessions, vocabulary, QA, progress tracking, settings

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- ENUMS
-- ==============================================

-- User experience levels
CREATE TYPE spanish_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Session types
CREATE TYPE session_type AS ENUM ('description', 'qa', 'vocabulary', 'mixed');

-- Description styles
CREATE TYPE description_style AS ENUM ('narrativo', 'poetico', 'academico', 'conversacional', 'infantil', 'creativo', 'tecnico');

-- Part of speech categories
CREATE TYPE part_of_speech AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'article', 'pronoun', 'conjunction', 'interjection', 'other');

-- Difficulty levels
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Learning phases for vocabulary
CREATE TYPE learning_phase AS ENUM ('new', 'learning', 'review', 'mastered');

-- QA difficulty levels
CREATE TYPE qa_difficulty AS ENUM ('facil', 'medio', 'dificil');

-- Vocabulary categories
CREATE TYPE vocabulary_category AS ENUM ('basic', 'intermediate', 'advanced', 'custom', 'thematic');

-- Gender types for Spanish nouns
CREATE TYPE spanish_gender AS ENUM ('masculino', 'femenino', 'neutro');

-- Theme preferences
CREATE TYPE theme_preference AS ENUM ('light', 'dark', 'auto');

-- Language preferences
CREATE TYPE language_preference AS ENUM ('en', 'es');

-- Export formats
CREATE TYPE export_format AS ENUM ('json', 'csv', 'pdf');

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Users table - Extended user profiles for Spanish learners
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    spanish_level spanish_level NOT NULL DEFAULT 'beginner',
    is_authenticated BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    
    -- User preferences
    theme theme_preference DEFAULT 'light',
    language language_preference DEFAULT 'en',
    default_description_style description_style DEFAULT 'conversacional',
    
    -- Learning preferences
    target_words_per_day INTEGER DEFAULT 10,
    preferred_difficulty difficulty_level DEFAULT 'beginner',
    enable_notifications BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_username CHECK (username IS NULL OR (LENGTH(username) >= 3 AND username ~ '^[a-zA-Z0-9_]+$')),
    CONSTRAINT valid_full_name CHECK (full_name IS NULL OR LENGTH(full_name) >= 2),
    CONSTRAINT valid_words_per_day CHECK (target_words_per_day >= 1 AND target_words_per_day <= 100)
);

-- Learning sessions table - Track user learning sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type session_type NOT NULL,
    
    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Session metrics
    images_processed INTEGER DEFAULT 0,
    descriptions_generated INTEGER DEFAULT 0,
    qa_attempts INTEGER DEFAULT 0,
    qa_correct INTEGER DEFAULT 0,
    vocabulary_learned INTEGER DEFAULT 0,
    phrases_saved INTEGER DEFAULT 0,
    
    -- Session data (JSONB for flexibility)
    session_data JSONB DEFAULT '{}',
    
    -- Device and context info
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(50),
    
    -- Quality metrics
    engagement_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    completion_rate DECIMAL(3,2) DEFAULT 0.0,   -- 0.0 to 1.0
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
    CONSTRAINT valid_metrics CHECK (
        images_processed >= 0 AND
        descriptions_generated >= 0 AND
        qa_attempts >= 0 AND
        qa_correct >= 0 AND
        qa_correct <= qa_attempts AND
        vocabulary_learned >= 0 AND
        phrases_saved >= 0
    ),
    CONSTRAINT valid_scores CHECK (
        engagement_score >= 0.0 AND engagement_score <= 1.0 AND
        completion_rate >= 0.0 AND completion_rate <= 1.0
    )
);

-- Images table - Store processed images metadata
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unsplash_id VARCHAR(255) UNIQUE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    alt_description TEXT,
    
    -- Image metadata
    width INTEGER,
    height INTEGER,
    color VARCHAR(10),
    aspect_ratio DECIMAL(5,3),
    
    -- Attribution
    photographer_name VARCHAR(255),
    photographer_username VARCHAR(255),
    photographer_url TEXT,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    
    -- Quality and content flags
    is_suitable_for_learning BOOLEAN DEFAULT true,
    content_rating VARCHAR(10) DEFAULT 'safe', -- safe, moderate, restricted
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_dimensions CHECK (width > 0 AND height > 0),
    CONSTRAINT valid_color CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0),
    CONSTRAINT valid_content_rating CHECK (content_rating IN ('safe', 'moderate', 'restricted'))
);

-- ==============================================
-- VOCABULARY SYSTEM TABLES
-- ==============================================

-- Vocabulary lists/collections
CREATE TABLE vocabulary_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category vocabulary_category NOT NULL DEFAULT 'custom',
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 10),
    
    -- List metadata
    total_words INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    
    -- Ownership and sharing
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    shared_with UUID[], -- Array of user IDs
    
    -- Learning statistics
    completion_rate DECIMAL(5,2) DEFAULT 0.0, -- Percentage completed by creator
    average_mastery DECIMAL(5,2) DEFAULT 0.0, -- Average mastery level
    
    -- Metadata
    tags TEXT[],
    source_url TEXT,
    language_pair VARCHAR(10) DEFAULT 'es-en', -- Spanish to English
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_completion_rate CHECK (completion_rate >= 0.0 AND completion_rate <= 100.0),
    CONSTRAINT valid_average_mastery CHECK (average_mastery >= 0.0 AND average_mastery <= 100.0),
    CONSTRAINT valid_language_pair CHECK (language_pair ~ '^[a-z]{2}-[a-z]{2}$')
);

-- Vocabulary items - Individual words/phrases
CREATE TABLE vocabulary_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vocabulary_list_id UUID REFERENCES vocabulary_lists(id) ON DELETE CASCADE,
    
    -- Core vocabulary data
    spanish_text VARCHAR(500) NOT NULL,
    english_translation VARCHAR(500) NOT NULL,
    part_of_speech part_of_speech NOT NULL DEFAULT 'other',
    difficulty_level difficulty_level DEFAULT 'beginner',
    
    -- Spanish-specific attributes
    gender spanish_gender,
    article VARCHAR(10), -- el, la, los, las, un, una, unos, unas
    plural_form VARCHAR(500),
    conjugation_info JSONB, -- For verbs: infinitive, present, past, etc.
    
    -- Learning context
    category VARCHAR(100),
    subcategory VARCHAR(100),
    context_sentence_spanish TEXT,
    context_sentence_english TEXT,
    
    -- Pronunciation and phonetics
    pronunciation_ipa VARCHAR(255),
    pronunciation_audio_url TEXT,
    syllable_count INTEGER,
    stress_pattern VARCHAR(50),
    
    -- Usage and frequency
    usage_notes TEXT,
    frequency_score INTEGER DEFAULT 1 CHECK (frequency_score BETWEEN 1 AND 10),
    commonality_rank INTEGER, -- 1 = most common
    register VARCHAR(50) DEFAULT 'neutral', -- formal, informal, neutral, colloquial
    
    -- Related vocabulary
    synonyms TEXT[],
    antonyms TEXT[],
    related_words TEXT[],
    word_family TEXT[], -- Related words from same root
    
    -- Learning aids
    memory_hints TEXT[],
    cultural_notes TEXT,
    false_friends TEXT[], -- Common false cognates
    
    -- Image associations
    associated_image_urls TEXT[],
    emoji_representation VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_spanish_text CHECK (LENGTH(TRIM(spanish_text)) >= 1),
    CONSTRAINT valid_english_translation CHECK (LENGTH(TRIM(english_translation)) >= 1),
    CONSTRAINT valid_syllable_count CHECK (syllable_count IS NULL OR syllable_count > 0),
    CONSTRAINT valid_register CHECK (register IN ('formal', 'informal', 'neutral', 'colloquial', 'technical', 'literary'))
);

-- ==============================================
-- LEARNING PROGRESS TABLES
-- ==============================================

-- Individual learning progress for vocabulary items
CREATE TABLE learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vocabulary_item_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Progress metrics
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0, -- Consecutive correct answers
    
    -- Timing data
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    first_learned TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Adaptive learning
    difficulty_adjustment DECIMAL(3,2) DEFAULT 0.0, -- -1.0 to 1.0
    learning_phase learning_phase DEFAULT 'new',
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    
    -- Performance analytics
    average_response_time INTEGER, -- milliseconds
    error_patterns JSONB DEFAULT '{}', -- Common mistake types
    learning_velocity DECIMAL(5,2) DEFAULT 1.0, -- Progress rate multiplier
    
    -- Spaced repetition data
    ease_factor DECIMAL(3,2) DEFAULT 2.5 CHECK (ease_factor >= 1.3),
    interval_days INTEGER DEFAULT 1 CHECK (interval_days >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(user_id, vocabulary_item_id),
    
    -- Constraints
    CONSTRAINT valid_counts CHECK (
        review_count >= 0 AND
        correct_count >= 0 AND
        incorrect_count >= 0 AND
        correct_count <= review_count AND
        (correct_count + incorrect_count) <= review_count AND
        streak_count >= 0
    ),
    CONSTRAINT valid_adjustment CHECK (difficulty_adjustment BETWEEN -1.0 AND 1.0),
    CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    CONSTRAINT valid_response_time CHECK (average_response_time IS NULL OR average_response_time >= 0),
    CONSTRAINT valid_velocity CHECK (learning_velocity > 0.0)
);

-- ==============================================
-- CONTENT TABLES
-- ==============================================

-- Saved descriptions with enhanced metadata
CREATE TABLE saved_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    
    -- Core description data
    english_description TEXT NOT NULL,
    spanish_description TEXT NOT NULL,
    description_style description_style NOT NULL,
    
    -- Content metrics
    word_count_english INTEGER,
    word_count_spanish INTEGER,
    complexity_score DECIMAL(3,2), -- 0.0 to 1.0
    readability_score DECIMAL(3,2), -- 0.0 to 1.0
    
    -- Generated vocabulary and Q&A
    generated_vocabulary JSONB DEFAULT '[]',
    qa_pairs JSONB DEFAULT '[]',
    extracted_phrases JSONB DEFAULT '[]',
    
    -- User interaction
    is_favorite BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    personal_notes TEXT,
    
    -- Quality and feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    is_public BOOLEAN DEFAULT false,
    reported_issues JSONB DEFAULT '[]',
    
    -- AI generation metadata
    model_version VARCHAR(50),
    generation_params JSONB DEFAULT '{}',
    generation_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_word_counts CHECK (
        word_count_english IS NULL OR word_count_english > 0 AND
        word_count_spanish IS NULL OR word_count_spanish > 0
    ),
    CONSTRAINT valid_scores CHECK (
        complexity_score IS NULL OR (complexity_score >= 0.0 AND complexity_score <= 1.0) AND
        readability_score IS NULL OR (readability_score >= 0.0 AND readability_score <= 1.0)
    ),
    CONSTRAINT valid_generation_time CHECK (generation_time_ms IS NULL OR generation_time_ms >= 0)
);

-- Q&A responses with detailed tracking
CREATE TABLE qa_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    description_id UUID REFERENCES saved_descriptions(id) ON DELETE SET NULL,
    
    -- Q&A content
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer TEXT,
    
    -- Response analysis
    is_correct BOOLEAN,
    similarity_score DECIMAL(3,2), -- 0.0 to 1.0, semantic similarity
    confidence_level DECIMAL(3,2), -- 0.0 to 1.0
    
    -- Question metadata
    difficulty qa_difficulty DEFAULT 'medio',
    question_type VARCHAR(50), -- 'factual', 'inferential', 'analytical', 'creative'
    language_focus VARCHAR(100), -- Grammar, vocabulary, comprehension focus
    
    -- Response timing
    response_time_seconds INTEGER,
    hint_used BOOLEAN DEFAULT false,
    attempts_count INTEGER DEFAULT 1,
    
    -- Learning context
    vocabulary_items_tested UUID[], -- References to vocabulary_items
    grammar_concepts TEXT[], -- Grammar points tested
    cultural_elements TEXT[], -- Cultural aspects covered
    
    -- Feedback and explanation
    explanation TEXT,
    feedback_positive TEXT,
    feedback_improvement TEXT,
    additional_resources TEXT[],
    
    -- AI generation metadata
    question_generated_by VARCHAR(50) DEFAULT 'ai',
    model_version VARCHAR(50),
    generation_confidence DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_similarity CHECK (similarity_score IS NULL OR (similarity_score >= 0.0 AND similarity_score <= 1.0)),
    CONSTRAINT valid_confidence_level CHECK (confidence_level IS NULL OR (confidence_level >= 0.0 AND confidence_level <= 1.0)),
    CONSTRAINT valid_response_time CHECK (response_time_seconds IS NULL OR response_time_seconds >= 0),
    CONSTRAINT valid_attempts CHECK (attempts_count >= 1),
    CONSTRAINT valid_generation_confidence CHECK (generation_confidence IS NULL OR (generation_confidence >= 0.0 AND generation_confidence <= 1.0)),
    CONSTRAINT valid_question_type CHECK (question_type IN ('factual', 'inferential', 'analytical', 'creative', 'vocabulary', 'grammar', 'cultural'))
);

-- ==============================================
-- USER SETTINGS AND PREFERENCES
-- ==============================================

-- User settings with comprehensive preferences
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- UI/UX preferences
    theme theme_preference DEFAULT 'light',
    language language_preference DEFAULT 'en',
    font_size VARCHAR(20) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large', 'extra-large')),
    high_contrast BOOLEAN DEFAULT false,
    reduced_motion BOOLEAN DEFAULT false,
    
    -- Learning preferences
    default_description_style description_style DEFAULT 'conversacional',
    auto_save_descriptions BOOLEAN DEFAULT true,
    auto_save_vocabulary BOOLEAN DEFAULT true,
    auto_generate_qa BOOLEAN DEFAULT true,
    
    -- Notification preferences
    enable_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    reminder_frequency VARCHAR(20) DEFAULT 'daily' CHECK (reminder_frequency IN ('never', 'daily', 'weekly', 'custom')),
    reminder_time TIME DEFAULT '09:00:00',
    
    -- Privacy settings
    profile_public BOOLEAN DEFAULT false,
    share_progress BOOLEAN DEFAULT false,
    data_collection BOOLEAN DEFAULT true,
    
    -- Export and backup preferences
    default_export_format export_format DEFAULT 'json',
    max_history_items INTEGER DEFAULT 100 CHECK (max_history_items > 0),
    auto_backup BOOLEAN DEFAULT true,
    backup_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly', 'never')),
    
    -- Learning goals and targets
    daily_word_goal INTEGER DEFAULT 10 CHECK (daily_word_goal BETWEEN 1 AND 100),
    weekly_session_goal INTEGER DEFAULT 5 CHECK (weekly_session_goal BETWEEN 1 AND 50),
    preferred_session_length INTEGER DEFAULT 20 CHECK (preferred_session_length BETWEEN 5 AND 120), -- minutes
    
    -- Advanced features
    enable_experimental BOOLEAN DEFAULT false,
    enable_ai_suggestions BOOLEAN DEFAULT true,
    voice_enabled BOOLEAN DEFAULT false,
    offline_mode BOOLEAN DEFAULT false,
    
    -- Metadata
    settings_version INTEGER DEFAULT 1,
    last_modified_by VARCHAR(50) DEFAULT 'user',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- ANALYTICS AND TRACKING TABLES
-- ==============================================

-- User interaction tracking for analytics
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Interaction details
    interaction_type VARCHAR(100) NOT NULL,
    component VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    target_id UUID, -- Generic ID for the target of interaction
    
    -- Context data
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    
    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    
    -- Custom data
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

-- Learning analytics aggregation
CREATE TABLE learning_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    date_recorded DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Learning metrics
    vocabulary_learned INTEGER DEFAULT 0,
    vocabulary_reviewed INTEGER DEFAULT 0,
    qa_correct INTEGER DEFAULT 0,
    qa_total INTEGER DEFAULT 0,
    
    -- Session metrics
    sessions_count INTEGER DEFAULT 0,
    total_study_time INTEGER DEFAULT 0, -- minutes
    descriptions_generated INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_accuracy DECIMAL(5,2) DEFAULT 0.0,
    improvement_rate DECIMAL(5,2) DEFAULT 0.0,
    consistency_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Goals and achievements
    daily_goal_met BOOLEAN DEFAULT false,
    weekly_goal_met BOOLEAN DEFAULT false,
    streak_days INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(user_id, date_recorded, period_type),
    
    -- Constraints
    CONSTRAINT valid_analytics_counts CHECK (
        vocabulary_learned >= 0 AND
        vocabulary_reviewed >= 0 AND
        qa_correct >= 0 AND
        qa_total >= 0 AND
        qa_correct <= qa_total AND
        sessions_count >= 0 AND
        total_study_time >= 0 AND
        descriptions_generated >= 0
    ),
    CONSTRAINT valid_analytics_rates CHECK (
        average_accuracy >= 0.0 AND average_accuracy <= 100.0 AND
        consistency_score >= 0.0 AND consistency_score <= 1.0 AND
        streak_days >= 0
    )
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- User table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_spanish_level ON users(spanish_level);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Sessions table indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);

-- Images table indexes
CREATE INDEX idx_images_unsplash_id ON images(unsplash_id) WHERE unsplash_id IS NOT NULL;
CREATE INDEX idx_images_usage_count ON images(usage_count);
CREATE INDEX idx_images_suitable_learning ON images(is_suitable_for_learning);
CREATE INDEX idx_images_content_rating ON images(content_rating);

-- Vocabulary indexes
CREATE INDEX idx_vocabulary_lists_created_by ON vocabulary_lists(created_by);
CREATE INDEX idx_vocabulary_lists_category ON vocabulary_lists(category);
CREATE INDEX idx_vocabulary_lists_active ON vocabulary_lists(is_active);
CREATE INDEX idx_vocabulary_items_list_id ON vocabulary_items(vocabulary_list_id);
CREATE INDEX idx_vocabulary_items_difficulty ON vocabulary_items(difficulty_level);
CREATE INDEX idx_vocabulary_items_pos ON vocabulary_items(part_of_speech);
CREATE INDEX idx_vocabulary_items_frequency ON vocabulary_items(frequency_score);
CREATE INDEX idx_vocabulary_items_spanish_text ON vocabulary_items USING gin(to_tsvector('spanish', spanish_text));
CREATE INDEX idx_vocabulary_items_english_translation ON vocabulary_items USING gin(to_tsvector('english', english_translation));

-- Learning progress indexes
CREATE INDEX idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX idx_learning_progress_vocab_id ON learning_progress(vocabulary_item_id);
CREATE INDEX idx_learning_progress_user_vocab ON learning_progress(user_id, vocabulary_item_id);
CREATE INDEX idx_learning_progress_phase ON learning_progress(learning_phase);
CREATE INDEX idx_learning_progress_next_review ON learning_progress(next_review) WHERE next_review IS NOT NULL;
CREATE INDEX idx_learning_progress_mastery ON learning_progress(mastery_level);

-- Content table indexes
CREATE INDEX idx_saved_descriptions_user_id ON saved_descriptions(user_id);
CREATE INDEX idx_saved_descriptions_image_id ON saved_descriptions(image_id);
CREATE INDEX idx_saved_descriptions_style ON saved_descriptions(description_style);
CREATE INDEX idx_saved_descriptions_favorite ON saved_descriptions(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_saved_descriptions_public ON saved_descriptions(is_public) WHERE is_public = true;
CREATE INDEX idx_saved_descriptions_created_at ON saved_descriptions(created_at);

-- Q&A indexes
CREATE INDEX idx_qa_responses_user_id ON qa_responses(user_id);
CREATE INDEX idx_qa_responses_image_id ON qa_responses(image_id);
CREATE INDEX idx_qa_responses_description_id ON qa_responses(description_id);
CREATE INDEX idx_qa_responses_difficulty ON qa_responses(difficulty);
CREATE INDEX idx_qa_responses_correct ON qa_responses(is_correct) WHERE is_correct IS NOT NULL;
CREATE INDEX idx_qa_responses_created_at ON qa_responses(created_at);

-- Settings indexes
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Analytics indexes
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_session_id ON user_interactions(session_id);
CREATE INDEX idx_user_interactions_type_action ON user_interactions(interaction_type, action);
CREATE INDEX idx_user_interactions_timestamp ON user_interactions(timestamp);

CREATE INDEX idx_learning_analytics_user_id ON learning_analytics(user_id);
CREATE INDEX idx_learning_analytics_date ON learning_analytics(date_recorded);
CREATE INDEX idx_learning_analytics_user_date ON learning_analytics(user_id, date_recorded);

-- Composite indexes for common queries
CREATE INDEX idx_sessions_user_type_date ON sessions(user_id, session_type, started_at);
CREATE INDEX idx_vocabulary_list_difficulty_active ON vocabulary_items(vocabulary_list_id, difficulty_level) WHERE vocabulary_list_id IS NOT NULL;
CREATE INDEX idx_progress_user_phase_review ON learning_progress(user_id, learning_phase, next_review);

-- ==============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_lists_updated_at BEFORE UPDATE ON vocabulary_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at BEFORE UPDATE ON learning_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_descriptions_updated_at BEFORE UPDATE ON saved_descriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update vocabulary list stats
CREATE OR REPLACE FUNCTION update_vocabulary_list_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_words count in vocabulary_lists
    IF TG_OP = 'INSERT' THEN
        UPDATE vocabulary_lists 
        SET total_words = (
            SELECT COUNT(*) 
            FROM vocabulary_items 
            WHERE vocabulary_list_id = NEW.vocabulary_list_id
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.vocabulary_list_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE vocabulary_lists 
        SET total_words = (
            SELECT COUNT(*) 
            FROM vocabulary_items 
            WHERE vocabulary_list_id = OLD.vocabulary_list_id
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.vocabulary_list_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply vocabulary stats trigger
CREATE TRIGGER update_vocabulary_list_stats_trigger
    AFTER INSERT OR DELETE ON vocabulary_items
    FOR EACH ROW EXECUTE FUNCTION update_vocabulary_list_stats();

-- Function to update session metrics
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply session duration trigger
CREATE TRIGGER calculate_session_duration_trigger
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    WHEN (NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL)
    EXECUTE FUNCTION calculate_session_duration();

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Vocabulary lists policies
CREATE POLICY "Users can view accessible vocabulary lists" ON vocabulary_lists
    FOR SELECT USING (
        is_public = true OR 
        created_by = auth.uid() OR 
        auth.uid() = ANY(shared_with)
    );

CREATE POLICY "Users can create own vocabulary lists" ON vocabulary_lists
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own vocabulary lists" ON vocabulary_lists
    FOR UPDATE USING (auth.uid() = created_by);

-- Learning progress policies
CREATE POLICY "Users can view own learning progress" ON learning_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own learning progress" ON learning_progress
    FOR ALL USING (auth.uid() = user_id);

-- Saved descriptions policies
CREATE POLICY "Users can view accessible descriptions" ON saved_descriptions
    FOR SELECT USING (
        is_public = true OR 
        user_id = auth.uid() OR 
        user_id IS NULL
    );

CREATE POLICY "Users can manage own descriptions" ON saved_descriptions
    FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

-- QA responses policies
CREATE POLICY "Users can view accessible qa responses" ON qa_responses
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage own qa responses" ON qa_responses
    FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

-- Settings policies
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own interactions" ON user_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interactions" ON user_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics" ON learning_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own analytics" ON learning_analytics
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for images (no sensitive user data)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Images are publicly readable" ON images
    FOR SELECT USING (true);

-- Vocabulary items inherit permissions from their lists
ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view vocabulary items from accessible lists" ON vocabulary_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lists vl 
            WHERE vl.id = vocabulary_list_id 
            AND (vl.is_public = true OR vl.created_by = auth.uid() OR auth.uid() = ANY(vl.shared_with))
        )
    );

CREATE POLICY "Users can manage vocabulary items in own lists" ON vocabulary_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lists vl 
            WHERE vl.id = vocabulary_list_id 
            AND vl.created_by = auth.uid()
        )
    );

-- ==============================================
-- INITIAL DATA SETUP
-- ==============================================

-- Insert default vocabulary lists
INSERT INTO vocabulary_lists (
    id, name, description, category, difficulty_level, 
    is_active, is_public, total_words
) VALUES
(
    uuid_generate_v4(),
    'Básico - Primeras Palabras',
    'Vocabulario esencial para principiantes en español',
    'basic',
    1,
    true,
    true,
    0
),
(
    uuid_generate_v4(),
    'Colores y Formas',
    'Aprende los colores básicos y las formas geométricas',
    'thematic',
    2,
    true,
    true,
    0
),
(
    uuid_generate_v4(),
    'Casa y Familia',
    'Vocabulario relacionado con la casa y los miembros de la familia',
    'thematic',
    2,
    true,
    true,
    0
);

-- ==============================================
-- COMMENTS AND DOCUMENTATION
-- ==============================================

COMMENT ON DATABASE postgres IS 'Describe It - Spanish Learning Application Database';

-- Table comments
COMMENT ON TABLE users IS 'User profiles and preferences for Spanish learners';
COMMENT ON TABLE sessions IS 'Learning session tracking with detailed metrics';
COMMENT ON TABLE images IS 'Processed images metadata with usage tracking';
COMMENT ON TABLE vocabulary_lists IS 'Collections of vocabulary organized by theme/difficulty';
COMMENT ON TABLE vocabulary_items IS 'Individual Spanish words/phrases with comprehensive linguistic data';
COMMENT ON TABLE learning_progress IS 'Individual user progress for vocabulary items with spaced repetition';
COMMENT ON TABLE saved_descriptions IS 'AI-generated descriptions saved by users';
COMMENT ON TABLE qa_responses IS 'Question-answer pairs with detailed response tracking';
COMMENT ON TABLE user_settings IS 'Comprehensive user preferences and configuration';
COMMENT ON TABLE user_interactions IS 'User interaction tracking for analytics';
COMMENT ON TABLE learning_analytics IS 'Aggregated learning metrics and progress analytics';

-- Column comments for key fields
COMMENT ON COLUMN vocabulary_items.conjugation_info IS 'JSONB storing verb conjugation data: {"infinitive": "hablar", "present": {"yo": "hablo", "tú": "hablas"}, "past": {...}}';
COMMENT ON COLUMN vocabulary_items.frequency_score IS 'Word frequency score 1-10, where 10 is most common';
COMMENT ON COLUMN vocabulary_items.commonality_rank IS 'Overall ranking by usage frequency, 1 = most common word';
COMMENT ON COLUMN learning_progress.ease_factor IS 'Spaced repetition ease factor (SM-2 algorithm)';
COMMENT ON COLUMN learning_progress.error_patterns IS 'JSONB tracking common mistake patterns: {"confusion_with": ["word1", "word2"], "error_types": ["gender", "conjugation"]}';
COMMENT ON COLUMN saved_descriptions.generated_vocabulary IS 'JSONB array of extracted vocabulary with context';
COMMENT ON COLUMN qa_responses.vocabulary_items_tested IS 'Array of vocabulary item UUIDs that this question tests';

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DESCRIBE IT DATABASE SCHEMA CREATED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: 11';
    RAISE NOTICE 'Indexes created: 35+';
    RAISE NOTICE 'Triggers created: 6';
    RAISE NOTICE 'RLS policies: 20+';
    RAISE NOTICE 'Ready for Spanish learning application!';
    RAISE NOTICE '==============================================';
END $$;