-- Migration: 009_create_additional_indexes.sql
-- Description: Create additional indexes for performance optimization
-- Created: 2025-08-28

-- Additional performance indexes based on common query patterns

-- Cross-table relationship indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_images 
    ON public.sessions(user_id) 
    WHERE status = 'completed' AND images_viewed > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_descriptions_session_image 
    ON public.descriptions(session_id, image_id) 
    WHERE is_completed = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_description_answered 
    ON public.questions(description_id) 
    WHERE is_answered = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phrases_description_selected 
    ON public.phrases(description_id) 
    WHERE is_user_selected = TRUE;

-- Analytics and reporting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_analytics 
    ON public.users(learning_level, subscription_status, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_analytics 
    ON public.sessions(started_at, session_type, status, accuracy_percentage)
    WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_descriptions_analytics 
    ON public.descriptions(created_at, complexity_level, is_completed, quality_score)
    WHERE quality_score > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_analytics 
    ON public.questions(answered_at, question_type, difficulty_level, is_correct)
    WHERE is_answered = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phrases_analytics 
    ON public.phrases(created_at, category, difficulty_level, is_mastered)
    WHERE is_user_selected = TRUE;

-- User activity tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_activity 
    ON public.sessions(user_id, started_at DESC) 
    WHERE status IN ('completed', 'active');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_learning_streak 
    ON public.sessions(user_id, DATE(started_at)) 
    WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_tracking 
    ON public.user_progress(user_id, progress_type, progress_date DESC)
    WHERE progress_type IN ('daily', 'weekly');

-- Content recommendation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_images_recommendation 
    ON public.images(difficulty_level, success_rate DESC, usage_count ASC)
    WHERE is_active = TRUE AND content_rating = 'safe';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_descriptions_recommendation 
    ON public.descriptions(complexity_level, style, quality_score DESC)
    WHERE is_completed = TRUE AND quality_score >= 7;

-- Search and filtering indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_images_search_filters 
    ON public.images(search_query, difficulty_level, is_active) 
    WHERE is_active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phrases_vocabulary_search 
    ON public.phrases(category, difficulty_level, word_type)
    WHERE is_user_selected = TRUE;

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_performance 
    ON public.sessions(duration_minutes, accuracy_percentage, points_earned)
    WHERE status = 'completed' AND duration_minutes > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_response_time 
    ON public.questions(response_time_seconds, difficulty_level, is_correct)
    WHERE is_answered = TRUE AND response_time_seconds > 0;

-- Data export and backup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_cleanup 
    ON public.export_history(export_status, expires_at)
    WHERE export_status = 'completed';

-- Partial indexes for specific business logic
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_premium 
    ON public.users(subscription_status, total_points DESC)
    WHERE subscription_status != 'free';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_abandoned 
    ON public.sessions(user_id, started_at DESC)
    WHERE status = 'abandoned' AND duration_minutes < 5;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_descriptions_low_quality 
    ON public.descriptions(quality_score, ai_model, created_at)
    WHERE quality_score < 5;

-- Covering indexes for frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_stats_covering 
    ON public.sessions(user_id, status) 
    INCLUDE (points_earned, accuracy_percentage, duration_minutes, started_at)
    WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phrases_user_vocab_covering 
    ON public.phrases(user_id, category) 
    INCLUDE (spanish_text, english_translation, difficulty_level, is_mastered)
    WHERE is_user_selected = TRUE;

-- Function-based indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_activity_score 
    ON public.users((total_points + (streak_count * 10)))
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_efficiency 
    ON public.sessions((points_earned::DECIMAL / NULLIF(duration_minutes, 0)))
    WHERE status = 'completed' AND duration_minutes > 0 AND points_earned > 0;

-- Temporal partitioning preparation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_monthly_partition 
    ON public.sessions(DATE_TRUNC('month', started_at), user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_monthly_partition 
    ON public.user_progress(DATE_TRUNC('month', progress_date), user_id);

-- GIN indexes for advanced search capabilities
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_descriptions_multilingual_search 
    ON public.descriptions USING GIN(
        to_tsvector('spanish', spanish_text) || 
        to_tsvector('english', english_translation)
    );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phrases_contextual_search 
    ON public.phrases USING GIN(
        to_tsvector('spanish', 
            COALESCE(spanish_text, '') || ' ' || 
            COALESCE(context_sentence_spanish, '') || ' ' ||
            array_to_string(COALESCE(tags, '{}'), ' ')
        )
    );

-- Comments for documentation
COMMENT ON INDEX idx_sessions_user_images IS 'Optimizes queries for user sessions with image interactions';
COMMENT ON INDEX idx_descriptions_analytics IS 'Supports analytics queries on description performance';
COMMENT ON INDEX idx_user_learning_streak IS 'Optimizes streak calculation queries';
COMMENT ON INDEX idx_images_recommendation IS 'Supports content recommendation algorithms';
COMMENT ON INDEX idx_sessions_efficiency IS 'Function-based index for learning efficiency calculations';
COMMENT ON INDEX idx_descriptions_multilingual_search IS 'Advanced full-text search across Spanish and English content';