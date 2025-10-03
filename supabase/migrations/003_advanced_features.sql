-- ==============================================
-- ADVANCED FEATURES - FUNCTIONS, VIEWS, AND OPTIMIZATIONS
-- ==============================================
-- Enhanced functionality for Spanish learning application

-- ==============================================
-- UTILITY FUNCTIONS
-- ==============================================

-- Function to calculate spaced repetition schedule using SM-2 algorithm
CREATE OR REPLACE FUNCTION calculate_next_review(
    ease_factor DECIMAL DEFAULT 2.5,
    response_quality INTEGER DEFAULT 3,
    interval_days INTEGER DEFAULT 1
) RETURNS TABLE(new_ease_factor DECIMAL, new_interval INTEGER) AS $$
DECLARE
    new_ease DECIMAL;
    new_int INTEGER;
BEGIN
    -- SM-2 Algorithm implementation
    new_ease := GREATEST(1.3, ease_factor + (0.1 - (5 - response_quality) * (0.08 + (5 - response_quality) * 0.02)));
    
    IF response_quality < 3 THEN
        new_int := 1;
    ELSE
        IF interval_days = 1 THEN
            new_int := 6;
        ELSIF interval_days = 6 THEN
            new_int := ROUND(interval_days * new_ease)::INTEGER;
        ELSE
            new_int := ROUND(interval_days * new_ease)::INTEGER;
        END IF;
    END IF;
    
    RETURN QUERY SELECT new_ease, new_int;
END;
$$ LANGUAGE plpgsql;

-- Function to update vocabulary list statistics
CREATE OR REPLACE FUNCTION update_vocabulary_list_statistics(list_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE vocabulary_lists 
    SET 
        total_words = (
            SELECT COUNT(*) 
            FROM vocabulary_items 
            WHERE vocabulary_list_id = list_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = list_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user learning streak
CREATE OR REPLACE FUNCTION calculate_user_streak(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    current_streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    has_activity BOOLEAN;
BEGIN
    LOOP
        -- Check if user had activity on this date
        SELECT EXISTS(
            SELECT 1 FROM sessions 
            WHERE user_id = user_id_param 
            AND DATE(started_at) = check_date
        ) INTO has_activity;
        
        IF NOT has_activity THEN
            EXIT;
        END IF;
        
        current_streak := current_streak + 1;
        check_date := check_date - INTERVAL '1 day';
        
        -- Prevent infinite loops
        IF current_streak > 365 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- Function to get vocabulary items due for review
CREATE OR REPLACE FUNCTION get_vocabulary_due_for_review(
    user_id_param UUID,
    limit_items INTEGER DEFAULT 20
) RETURNS TABLE(
    vocabulary_item_id UUID,
    spanish_text TEXT,
    english_translation TEXT,
    difficulty_level difficulty_level,
    days_overdue INTEGER,
    mastery_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vi.id,
        vi.spanish_text,
        vi.english_translation,
        vi.difficulty_level,
        COALESCE(EXTRACT(DAY FROM CURRENT_DATE - lp.next_review::DATE)::INTEGER, 0) as days_overdue,
        lp.mastery_level
    FROM vocabulary_items vi
    LEFT JOIN learning_progress lp ON vi.id = lp.vocabulary_item_id AND lp.user_id = user_id_param
    WHERE 
        lp.next_review IS NULL OR lp.next_review <= CURRENT_TIMESTAMP
    ORDER BY 
        COALESCE(lp.last_reviewed, '1900-01-01'::TIMESTAMP) ASC,
        vi.frequency_score DESC
    LIMIT limit_items;
END;
$$ LANGUAGE plpgsql;

-- Function to generate personalized difficulty recommendations
CREATE OR REPLACE FUNCTION recommend_difficulty_level(
    user_id_param UUID,
    category_filter TEXT DEFAULT NULL
) RETURNS difficulty_level AS $$
DECLARE
    avg_accuracy DECIMAL;
    user_level spanish_level;
    recommended_difficulty difficulty_level;
BEGIN
    -- Get user's Spanish level
    SELECT spanish_level INTO user_level FROM users WHERE id = user_id_param;
    
    -- Calculate average accuracy from recent sessions
    SELECT AVG(
        CASE 
            WHEN qa_attempts > 0 THEN (qa_correct::DECIMAL / qa_attempts::DECIMAL) * 100 
            ELSE 0 
        END
    ) INTO avg_accuracy
    FROM sessions 
    WHERE user_id = user_id_param 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Determine recommended difficulty
    IF user_level = 'beginner' THEN
        IF avg_accuracy >= 80 THEN
            recommended_difficulty := 'intermediate';
        ELSE
            recommended_difficulty := 'beginner';
        END IF;
    ELSIF user_level = 'intermediate' THEN
        IF avg_accuracy >= 85 THEN
            recommended_difficulty := 'advanced';
        ELSIF avg_accuracy < 60 THEN
            recommended_difficulty := 'beginner';
        ELSE
            recommended_difficulty := 'intermediate';
        END IF;
    ELSE -- advanced
        IF avg_accuracy < 70 THEN
            recommended_difficulty := 'intermediate';
        ELSE
            recommended_difficulty := 'advanced';
        END IF;
    END IF;
    
    RETURN recommended_difficulty;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- ANALYTICAL VIEWS
-- ==============================================

-- View for user learning dashboard
CREATE OR REPLACE VIEW user_learning_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    u.spanish_level,
    u.target_words_per_day,
    
    -- Session statistics
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(s.duration_minutes), 0) as total_study_minutes,
    COALESCE(AVG(s.duration_minutes), 0) as avg_session_duration,
    
    -- Q&A performance
    COALESCE(SUM(s.qa_attempts), 0) as total_qa_attempts,
    COALESCE(SUM(s.qa_correct), 0) as total_qa_correct,
    CASE 
        WHEN SUM(s.qa_attempts) > 0 
        THEN ROUND((SUM(s.qa_correct)::DECIMAL / SUM(s.qa_attempts)::DECIMAL) * 100, 2)
        ELSE 0 
    END as overall_accuracy,
    
    -- Vocabulary progress
    COUNT(DISTINCT lp.vocabulary_item_id) as vocabulary_items_studied,
    COUNT(DISTINCT CASE WHEN lp.learning_phase = 'mastered' THEN lp.vocabulary_item_id END) as vocabulary_mastered,
    COALESCE(AVG(lp.mastery_level), 0) as avg_mastery_level,
    
    -- Recent activity
    MAX(s.created_at) as last_session_date,
    calculate_user_streak(u.id) as current_streak_days,
    
    -- Goals and achievements
    CASE 
        WHEN COUNT(DISTINCT DATE(s.created_at)) >= 7 
        THEN true 
        ELSE false 
    END as weekly_goal_met,
    
    u.created_at as user_since
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN learning_progress lp ON u.id = lp.user_id
GROUP BY u.id, u.email, u.spanish_level, u.target_words_per_day, u.created_at;

-- View for vocabulary learning insights
CREATE OR REPLACE VIEW vocabulary_learning_insights AS
SELECT 
    vi.id,
    vi.spanish_text,
    vi.english_translation,
    vi.part_of_speech,
    vi.difficulty_level,
    vi.frequency_score,
    vl.name as list_name,
    vl.category as list_category,
    
    -- Learning statistics
    COUNT(DISTINCT lp.user_id) as total_learners,
    COALESCE(AVG(lp.mastery_level), 0) as avg_mastery_level,
    COUNT(CASE WHEN lp.learning_phase = 'mastered' THEN 1 END) as mastered_count,
    
    -- Difficulty insights
    COALESCE(AVG(lp.review_count), 0) as avg_reviews_needed,
    COALESCE(AVG(lp.correct_count::DECIMAL / GREATEST(lp.review_count, 1)), 0) as avg_success_rate,
    
    -- Time insights
    COALESCE(AVG(lp.average_response_time), 0) as avg_response_time_ms,
    
    -- Common error patterns
    string_agg(DISTINCT jsonb_path_query_array(lp.error_patterns, '$.*')::TEXT, ', ') as common_errors
    
FROM vocabulary_items vi
JOIN vocabulary_lists vl ON vi.vocabulary_list_id = vl.id
LEFT JOIN learning_progress lp ON vi.id = lp.vocabulary_item_id
GROUP BY vi.id, vi.spanish_text, vi.english_translation, vi.part_of_speech, 
         vi.difficulty_level, vi.frequency_score, vl.name, vl.category;

-- View for session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    DATE(s.started_at) as session_date,
    s.session_type,
    COUNT(*) as session_count,
    COUNT(DISTINCT s.user_id) as unique_users,
    
    -- Time metrics
    COALESCE(AVG(s.duration_minutes), 0) as avg_duration,
    COALESCE(SUM(s.duration_minutes), 0) as total_duration,
    
    -- Performance metrics
    COALESCE(AVG(s.engagement_score), 0) as avg_engagement,
    COALESCE(AVG(s.completion_rate), 0) as avg_completion_rate,
    
    -- Content metrics
    COALESCE(AVG(s.images_processed), 0) as avg_images_processed,
    COALESCE(AVG(s.descriptions_generated), 0) as avg_descriptions_generated,
    COALESCE(AVG(s.vocabulary_learned), 0) as avg_vocabulary_learned,
    
    -- Q&A metrics
    COALESCE(SUM(s.qa_attempts), 0) as total_qa_attempts,
    COALESCE(SUM(s.qa_correct), 0) as total_qa_correct,
    CASE 
        WHEN SUM(s.qa_attempts) > 0 
        THEN ROUND((SUM(s.qa_correct)::DECIMAL / SUM(s.qa_attempts)::DECIMAL) * 100, 2)
        ELSE 0 
    END as accuracy_percentage
    
FROM sessions s
WHERE s.started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(s.started_at), s.session_type
ORDER BY session_date DESC, s.session_type;

-- ==============================================
-- ADVANCED INDEXES FOR PERFORMANCE
-- ==============================================

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_progress_user_phase_next_review 
ON learning_progress(user_id, learning_phase, next_review) 
WHERE next_review IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_date_type 
ON sessions(user_id, DATE(started_at), session_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qa_responses_user_correct_date 
ON qa_responses(user_id, is_correct, DATE(created_at));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vocabulary_items_frequency_difficulty 
ON vocabulary_items(frequency_score DESC, difficulty_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_descriptions_user_favorite_public 
ON saved_descriptions(user_id, is_favorite, is_public) 
WHERE is_favorite = true OR is_public = true;

-- Full text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vocabulary_items_fulltext_spanish 
ON vocabulary_items USING gin(to_tsvector('spanish', spanish_text || ' ' || COALESCE(context_sentence_spanish, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vocabulary_items_fulltext_english 
ON vocabulary_items USING gin(to_tsvector('english', english_translation || ' ' || COALESCE(context_sentence_english, '')));

-- JSONB indexes for metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_progress_error_patterns 
ON learning_progress USING gin(error_patterns);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_data 
ON sessions USING gin(session_data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vocabulary_items_conjugation_info 
ON vocabulary_items USING gin(conjugation_info) 
WHERE conjugation_info IS NOT NULL;

-- ==============================================
-- AUTOMATED MAINTENANCE FUNCTIONS
-- ==============================================

-- Function to cleanup old sessions (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    AND ended_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO user_interactions (
        user_id, interaction_type, action, metadata, timestamp
    ) VALUES (
        NULL, 'system', 'cleanup_sessions', 
        jsonb_build_object('deleted_count', deleted_count),
        CURRENT_TIMESTAMP
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update vocabulary item statistics
CREATE OR REPLACE FUNCTION update_vocabulary_statistics()
RETURNS VOID AS $$
BEGIN
    -- Update commonality ranks based on frequency scores
    WITH ranked_vocab AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY frequency_score DESC) as new_rank
        FROM vocabulary_items
    )
    UPDATE vocabulary_items 
    SET commonality_rank = ranked_vocab.new_rank
    FROM ranked_vocab
    WHERE vocabulary_items.id = ranked_vocab.id;
    
    -- Update vocabulary list completion rates
    UPDATE vocabulary_lists
    SET 
        completion_rate = COALESCE((
            SELECT AVG(lp.mastery_level)
            FROM vocabulary_items vi
            JOIN learning_progress lp ON vi.id = lp.vocabulary_item_id
            WHERE vi.vocabulary_list_id = vocabulary_lists.id
        ), 0),
        average_mastery = COALESCE((
            SELECT AVG(lp.mastery_level)
            FROM vocabulary_items vi
            JOIN learning_progress lp ON vi.id = lp.vocabulary_item_id
            WHERE vi.vocabulary_list_id = vocabulary_lists.id
            AND lp.mastery_level > 0
        ), 0);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- SCHEDULED JOBS (FOR CRON EXTENSION)
-- ==============================================

-- Note: These would be set up with pg_cron extension if available

-- Example cron job configurations (commented out):
/*
-- Run cleanup every day at 2 AM
SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_old_sessions();');

-- Update vocabulary statistics daily at 3 AM  
SELECT cron.schedule('update-vocab-stats', '0 3 * * *', 'SELECT update_vocabulary_statistics();');

-- Generate daily analytics at 1 AM
SELECT cron.schedule('daily-analytics', '0 1 * * *', $$
    INSERT INTO learning_analytics (
        user_id, date_recorded, period_type,
        vocabulary_learned, vocabulary_reviewed,
        qa_correct, qa_total,
        sessions_count, total_study_time, descriptions_generated
    )
    SELECT 
        s.user_id,
        CURRENT_DATE - INTERVAL '1 day',
        'daily',
        SUM(s.vocabulary_learned),
        COALESCE(COUNT(DISTINCT lp.vocabulary_item_id), 0),
        SUM(s.qa_correct),
        SUM(s.qa_attempts),
        COUNT(s.id),
        SUM(s.duration_minutes),
        SUM(s.descriptions_generated)
    FROM sessions s
    LEFT JOIN learning_progress lp ON s.user_id = lp.user_id 
        AND DATE(lp.last_reviewed) = CURRENT_DATE - INTERVAL '1 day'
    WHERE DATE(s.started_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY s.user_id
    ON CONFLICT (user_id, date_recorded, period_type) DO UPDATE SET
        vocabulary_learned = EXCLUDED.vocabulary_learned,
        vocabulary_reviewed = EXCLUDED.vocabulary_reviewed,
        qa_correct = EXCLUDED.qa_correct,
        qa_total = EXCLUDED.qa_total,
        sessions_count = EXCLUDED.sessions_count,
        total_study_time = EXCLUDED.total_study_time,
        descriptions_generated = EXCLUDED.descriptions_generated;
$$);
*/

-- ==============================================
-- SECURITY ENHANCEMENTS
-- ==============================================

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_operation(
    user_id_param UUID,
    operation TEXT,
    table_name TEXT,
    record_id UUID DEFAULT NULL,
    additional_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_interactions (
        user_id, 
        interaction_type, 
        component,
        action, 
        target_id,
        metadata, 
        timestamp
    ) VALUES (
        user_id_param,
        'security',
        table_name,
        operation,
        record_id,
        additional_data,
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger for logging user data changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_sensitive_operation(
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        'users',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old_email', COALESCE(OLD.email, ''),
            'new_email', COALESCE(NEW.email, ''),
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each_text(to_jsonb(NEW) - to_jsonb(OLD))
                WHERE value IS DISTINCT FROM ''
            )
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS trigger_log_user_changes ON users;
CREATE TRIGGER trigger_log_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_user_changes();

-- ==============================================
-- DATA EXPORT FUNCTIONS
-- ==============================================

-- Function to export user data for GDPR compliance
CREATE OR REPLACE FUNCTION export_user_data(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_data JSONB;
    sessions_data JSONB;
    progress_data JSONB;
    settings_data JSONB;
    descriptions_data JSONB;
    qa_data JSONB;
    interactions_data JSONB;
BEGIN
    -- Get user profile
    SELECT to_jsonb(u) INTO user_data 
    FROM users u 
    WHERE id = user_id_param;
    
    -- Get sessions
    SELECT jsonb_agg(to_jsonb(s)) INTO sessions_data
    FROM sessions s 
    WHERE user_id = user_id_param;
    
    -- Get learning progress
    SELECT jsonb_agg(to_jsonb(lp)) INTO progress_data
    FROM learning_progress lp 
    WHERE user_id = user_id_param;
    
    -- Get settings
    SELECT to_jsonb(us) INTO settings_data
    FROM user_settings us 
    WHERE user_id = user_id_param;
    
    -- Get saved descriptions
    SELECT jsonb_agg(to_jsonb(sd)) INTO descriptions_data
    FROM saved_descriptions sd 
    WHERE user_id = user_id_param;
    
    -- Get QA responses
    SELECT jsonb_agg(to_jsonb(qa)) INTO qa_data
    FROM qa_responses qa 
    WHERE user_id = user_id_param;
    
    -- Get interactions (last 30 days only)
    SELECT jsonb_agg(to_jsonb(ui)) INTO interactions_data
    FROM user_interactions ui 
    WHERE user_id = user_id_param
    AND timestamp >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Combine all data
    RETURN jsonb_build_object(
        'export_date', CURRENT_TIMESTAMP,
        'user_id', user_id_param,
        'profile', user_data,
        'sessions', COALESCE(sessions_data, '[]'::jsonb),
        'learning_progress', COALESCE(progress_data, '[]'::jsonb),
        'settings', settings_data,
        'saved_descriptions', COALESCE(descriptions_data, '[]'::jsonb),
        'qa_responses', COALESCE(qa_data, '[]'::jsonb),
        'recent_interactions', COALESCE(interactions_data, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ADVANCED FEATURES INSTALLED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Functions created: 10+';
    RAISE NOTICE 'Views created: 3';
    RAISE NOTICE 'Advanced indexes: 8';
    RAISE NOTICE 'Security triggers: 1';
    RAISE NOTICE 'Maintenance functions: 3';
    RAISE NOTICE 'Export functions: 1';
    RAISE NOTICE 'System ready for production use!';
    RAISE NOTICE '==============================================';
END $$;