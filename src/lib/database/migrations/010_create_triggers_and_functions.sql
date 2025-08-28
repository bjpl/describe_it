-- Migration: 010_create_triggers_and_functions.sql
-- Description: Create additional triggers and utility functions
-- Created: 2025-08-28

-- Create comprehensive logging function for audit trail
CREATE OR REPLACE FUNCTION public.create_audit_log(
    table_name TEXT,
    operation TEXT,
    row_id UUID,
    old_data JSONB DEFAULT NULL,
    new_data JSONB DEFAULT NULL,
    user_id_param UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert audit log entry (would require separate audit table in production)
    INSERT INTO public.user_progress (
        user_id,
        progress_type,
        metadata
    ) VALUES (
        COALESCE(user_id_param, auth.uid()),
        'audit_log',
        jsonb_build_object(
            'table_name', table_name,
            'operation', operation,
            'row_id', row_id,
            'old_data', old_data,
            'new_data', new_data,
            'timestamp', NOW(),
            'user_agent', current_setting('request.headers', true)::JSONB->>'user-agent'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate learning session data
CREATE OR REPLACE FUNCTION public.validate_session_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate session duration is reasonable (max 8 hours)
    IF NEW.duration_minutes > 480 THEN
        RAISE EXCEPTION 'Session duration cannot exceed 8 hours';
    END IF;
    
    -- Validate accuracy percentage calculations
    IF NEW.questions_answered > 0 AND NEW.questions_correct > NEW.questions_answered THEN
        RAISE EXCEPTION 'Correct answers cannot exceed total answers';
    END IF;
    
    -- Validate points earned are reasonable
    IF NEW.points_earned < 0 OR NEW.points_earned > (NEW.descriptions_completed * 50) THEN
        RAISE EXCEPTION 'Points earned is outside reasonable range';
    END IF;
    
    -- Auto-complete session if goals met
    IF NEW.status = 'active' AND NEW.descriptions_completed >= 5 THEN
        NEW.status = 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session validation
CREATE TRIGGER validate_session_data_trigger
    BEFORE INSERT OR UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.validate_session_data();

-- Create function to maintain user learning statistics
CREATE OR REPLACE FUNCTION public.maintain_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get current user stats
    SELECT * INTO user_record FROM public.users WHERE id = NEW.user_id;
    
    -- Update learning level based on total points
    IF user_record.total_points >= 10000 AND user_record.learning_level != 'advanced' THEN
        UPDATE public.users 
        SET learning_level = 'advanced' 
        WHERE id = NEW.user_id;
    ELSIF user_record.total_points >= 1000 AND user_record.learning_level = 'beginner' THEN
        UPDATE public.users 
        SET learning_level = 'intermediate' 
        WHERE id = NEW.user_id;
    END IF;
    
    -- Check for achievement unlocks
    PERFORM public.check_achievements(NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintaining user statistics
CREATE TRIGGER maintain_user_stats_trigger
    AFTER UPDATE ON public.sessions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION public.maintain_user_stats();

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_achievements(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    new_achievements TEXT[] := '{}';
    user_stats RECORD;
    existing_achievements TEXT[];
BEGIN
    -- Get user statistics
    SELECT 
        u.total_points,
        u.streak_count,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') as total_sessions,
        COUNT(DISTINCT d.id) FILTER (WHERE d.is_completed = TRUE) as total_descriptions,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_mastered = TRUE) as mastered_phrases,
        AVG(s.accuracy_percentage) FILTER (WHERE s.status = 'completed') as avg_accuracy
    INTO user_stats
    FROM public.users u
    LEFT JOIN public.sessions s ON u.id = s.user_id
    LEFT JOIN public.descriptions d ON u.id = d.user_id
    LEFT JOIN public.phrases p ON u.id = p.user_id
    WHERE u.id = user_uuid
    GROUP BY u.id, u.total_points, u.streak_count;
    
    -- Get existing achievements
    SELECT COALESCE(
        array_agg(DISTINCT unnest) FILTER (WHERE unnest IS NOT NULL), 
        '{}'::TEXT[]
    ) INTO existing_achievements
    FROM (
        SELECT unnest(achievements_unlocked) 
        FROM public.user_progress 
        WHERE user_id = user_uuid
    ) t;
    
    -- Check various achievement conditions
    
    -- Points milestones
    IF user_stats.total_points >= 100 AND NOT 'first_century' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'first_century');
    END IF;
    
    IF user_stats.total_points >= 1000 AND NOT 'points_master' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'points_master');
    END IF;
    
    -- Streak achievements
    IF user_stats.streak_count >= 7 AND NOT 'week_warrior' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'week_warrior');
    END IF;
    
    IF user_stats.streak_count >= 30 AND NOT 'month_master' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'month_master');
    END IF;
    
    -- Session achievements
    IF user_stats.total_sessions >= 10 AND NOT 'session_starter' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'session_starter');
    END IF;
    
    -- Accuracy achievements
    IF user_stats.avg_accuracy >= 90 AND NOT 'accuracy_ace' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'accuracy_ace');
    END IF;
    
    -- Vocabulary achievements
    IF user_stats.mastered_phrases >= 50 AND NOT 'vocab_virtuoso' = ANY(existing_achievements) THEN
        new_achievements := array_append(new_achievements, 'vocab_virtuoso');
    END IF;
    
    -- Insert achievement records if any new achievements
    IF array_length(new_achievements, 1) > 0 THEN
        INSERT INTO public.user_progress (
            user_id,
            progress_type,
            achievements_unlocked,
            metadata
        ) VALUES (
            user_uuid,
            'achievement',
            new_achievements,
            jsonb_build_object(
                'unlocked_at', NOW(),
                'total_achievements', array_length(existing_achievements, 1) + array_length(new_achievements, 1)
            )
        );
    END IF;
    
    RETURN new_achievements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate personalized recommendations
CREATE OR REPLACE FUNCTION public.generate_recommendations(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    recommendations JSONB := '{}'::jsonb;
    user_stats RECORD;
    weak_areas TEXT[];
BEGIN
    -- Analyze user performance
    SELECT 
        u.learning_level,
        AVG(s.accuracy_percentage) as avg_accuracy,
        AVG(s.duration_minutes) as avg_duration,
        COUNT(DISTINCT d.style) as styles_tried,
        mode() WITHIN GROUP (ORDER BY d.complexity_level) as preferred_complexity
    INTO user_stats
    FROM public.users u
    LEFT JOIN public.sessions s ON u.id = s.user_id AND s.status = 'completed'
    LEFT JOIN public.descriptions d ON s.id = d.session_id
    WHERE u.id = user_uuid
    GROUP BY u.id, u.learning_level;
    
    -- Identify weak areas
    WITH question_performance AS (
        SELECT 
            q.difficulty_level,
            q.question_type,
            AVG(CASE WHEN q.is_correct THEN 1 ELSE 0 END) as success_rate
        FROM public.questions q
        WHERE q.user_id = user_uuid AND q.is_answered = TRUE
        GROUP BY q.difficulty_level, q.question_type
        HAVING AVG(CASE WHEN q.is_correct THEN 1 ELSE 0 END) < 0.7
    )
    SELECT array_agg(difficulty_level || '_' || question_type)
    INTO weak_areas
    FROM question_performance;
    
    -- Build recommendations
    recommendations := jsonb_build_object(
        'next_difficulty', CASE 
            WHEN user_stats.avg_accuracy > 85 THEN 'increase'
            WHEN user_stats.avg_accuracy < 60 THEN 'decrease'
            ELSE 'maintain'
        END,
        'recommended_session_length', CASE
            WHEN user_stats.avg_duration < 10 THEN 'Try longer sessions for better retention'
            WHEN user_stats.avg_duration > 45 THEN 'Consider shorter, more frequent sessions'
            ELSE 'Current session length is good'
        END,
        'style_diversity', CASE
            WHEN user_stats.styles_tried < 3 THEN 'Try different description styles to improve versatility'
            ELSE 'Good variety in learning styles'
        END,
        'weak_areas', COALESCE(weak_areas, '{}'),
        'focus_areas', CASE
            WHEN 'intermediate_vocabulary' = ANY(COALESCE(weak_areas, '{}')) THEN 
                '["vocabulary_building", "context_understanding"]'::jsonb
            WHEN 'advanced_grammar' = ANY(COALESCE(weak_areas, '{}')) THEN
                '["grammar_patterns", "complex_sentences"]'::jsonb
            ELSE '["general_practice"]'::jsonb
        END
    );
    
    RETURN recommendations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TABLE (
    table_name TEXT,
    rows_affected INTEGER
) AS $$
DECLARE
    cleanup_results RECORD;
BEGIN
    -- Clean up old abandoned sessions (older than 7 days)
    DELETE FROM public.sessions 
    WHERE status = 'abandoned' 
    AND started_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleanup_results.rows_affected = ROW_COUNT;
    table_name := 'sessions';
    rows_affected := cleanup_results.rows_affected;
    RETURN NEXT;
    
    -- Clean up old export history (older than 90 days)
    DELETE FROM public.export_history 
    WHERE export_status = 'expired' 
    AND updated_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS cleanup_results.rows_affected = ROW_COUNT;
    table_name := 'export_history';
    rows_affected := cleanup_results.rows_affected;
    RETURN NEXT;
    
    -- Archive old progress records (older than 1 year) to separate table
    -- In production, you might move these to an archive table instead of deleting
    DELETE FROM public.user_progress 
    WHERE progress_type = 'daily' 
    AND progress_date < CURRENT_DATE - INTERVAL '1 year';
    
    GET DIAGNOSTICS cleanup_results.rows_affected = ROW_COUNT;
    table_name := 'user_progress';
    rows_affected := cleanup_results.rows_affected;
    RETURN NEXT;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for batch progress calculation
CREATE OR REPLACE FUNCTION public.batch_calculate_progress()
RETURNS VOID AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Calculate daily progress for all active users
    FOR user_record IN 
        SELECT DISTINCT u.id 
        FROM public.users u
        JOIN public.sessions s ON u.id = s.user_id
        WHERE s.started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND u.deleted_at IS NULL
    LOOP
        PERFORM public.calculate_daily_progress(user_record.id);
        PERFORM public.calculate_period_progress(user_record.id, 'weekly');
        
        -- Calculate monthly progress on the first of each month
        IF EXTRACT(DAY FROM CURRENT_DATE) = 1 THEN
            PERFORM public.calculate_period_progress(user_record.id, 'monthly');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate and sanitize user input
CREATE OR REPLACE FUNCTION public.sanitize_user_input()
RETURNS TRIGGER AS $$
BEGIN
    -- Sanitize text fields to prevent XSS
    IF TG_TABLE_NAME = 'descriptions' THEN
        NEW.spanish_text := TRIM(regexp_replace(NEW.spanish_text, '<[^>]*>', '', 'g'));
        NEW.english_translation := TRIM(regexp_replace(NEW.english_translation, '<[^>]*>', '', 'g'));
    ELSIF TG_TABLE_NAME = 'questions' THEN
        NEW.question_text := TRIM(regexp_replace(NEW.question_text, '<[^>]*>', '', 'g'));
        NEW.user_response := TRIM(regexp_replace(COALESCE(NEW.user_response, ''), '<[^>]*>', '', 'g'));
    ELSIF TG_TABLE_NAME = 'phrases' THEN
        NEW.spanish_text := TRIM(regexp_replace(NEW.spanish_text, '<[^>]*>', '', 'g'));
        NEW.english_translation := TRIM(regexp_replace(NEW.english_translation, '<[^>]*>', '', 'g'));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for input sanitization
CREATE TRIGGER sanitize_descriptions_input
    BEFORE INSERT OR UPDATE ON public.descriptions
    FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

CREATE TRIGGER sanitize_questions_input
    BEFORE INSERT OR UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

CREATE TRIGGER sanitize_phrases_input
    BEFORE INSERT OR UPDATE ON public.phrases
    FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_input();

-- Grant permissions for utility functions
GRANT EXECUTE ON FUNCTION public.check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recommendations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.create_audit_log IS 'Creates audit trail entries for database operations';
COMMENT ON FUNCTION public.validate_session_data IS 'Validates learning session data for consistency';
COMMENT ON FUNCTION public.check_achievements IS 'Checks and awards achievements based on user progress';
COMMENT ON FUNCTION public.generate_recommendations IS 'Generates personalized learning recommendations';
COMMENT ON FUNCTION public.cleanup_old_data IS 'Removes old data to maintain database performance';
COMMENT ON FUNCTION public.sanitize_user_input IS 'Sanitizes user input to prevent XSS attacks';